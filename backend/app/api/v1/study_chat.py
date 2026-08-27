import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.study_chat_thread import StudyChatThread
from app.models.study_chat_message import StudyChatMessage
from app.rag.prompts import STUDY_CHAT_SYSTEM_PROMPT, build_study_chat_prompt
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import call_groq, normalize_query
from app.services.streak_service import update_streak
from app.schemas.study_chat import (
    ChatStartRequest, ChatStartResponse,
    ChatThreadResponse, ChatMessageOut,
    ChatSendRequest, ChatSendResponse,
)

router = APIRouter(prefix="/study/chat", tags=["study-chat"])

# How many previous turns are fed to retrieval + the LLM prompt.
RECENT_TURNS = 3


async def _normalize_pieces_concurrently(pieces: list[str]) -> list[str]:
    """Runs independent normalize_query round-trips in parallel; order-preserving."""
    return await asyncio.gather(*(asyncio.to_thread(normalize_query, p) for p in pieces))


def _get_owned_thread(db: Session, thread_id: uuid.UUID, user: User) -> StudyChatThread:
    """Ownership check returns 404 (not 403) so foreign ids don't leak existence."""
    thread = (
        db.query(StudyChatThread)
        .filter(StudyChatThread.id == thread_id, StudyChatThread.user_id == user.id)
        .first()
    )
    if not thread:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Chat thread not found"},
        )
    return thread


def _thread_messages(db: Session, thread_id: uuid.UUID) -> list[StudyChatMessage]:
    """Last 3 messages of the thread, fetched with ORDER BY created_at DESC
    LIMIT 3 and returned oldest-first to keep the caller's ordering contract."""
    rows = (
        db.query(StudyChatMessage)
        .filter(StudyChatMessage.thread_id == thread_id)
        .order_by(StudyChatMessage.created_at.desc())
        .limit(3)
        .all()
    )
    return rows[::-1]


def _thread_all_messages(db: Session, thread_id: uuid.UUID) -> list[StudyChatMessage]:
    """Full history, oldest-first -- for endpoints that render the whole thread."""
    return (
        db.query(StudyChatMessage)
        .filter(StudyChatMessage.thread_id == thread_id)
        .order_by(StudyChatMessage.created_at.asc())
        .all()
    )


@router.post("/start", response_model=ChatStartResponse)
@limiter.limit("20/minute")
def start_chat(
    request: Request,
    payload: ChatStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get-or-create the persistent chat thread for (user, subject, topic).
    Safe under the UNIQUE (user_id, subject, topic) constraint via
    INSERT ... ON CONFLICT DO NOTHING; returns existing history if the
    thread already exists."""
    session_id = None
    if payload.session_id:
        try:
            session_id = uuid.UUID(payload.session_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_SESSION_ID", "message": "session_id must be a valid UUID"},
            )

    stmt = (
        pg_insert(StudyChatThread)
        .values(
            user_id=current_user.id,
            subject=payload.subject,
            topic=payload.topic,
            session_id=session_id,
        )
        .on_conflict_do_nothing(index_elements=["user_id", "subject", "topic"])
    )
    result = db.execute(stmt)
    db.commit()
    # rowcount == 1 -> this request inserted the thread (session_id was
    # linked on insert); 0 -> it already existed and we resume it.
    created = result.rowcount == 1

    thread = (
        db.query(StudyChatThread)
        .filter(
            StudyChatThread.user_id == current_user.id,
            StudyChatThread.subject == payload.subject,
            StudyChatThread.topic == payload.topic,
        )
        .first()
    )

    return ChatStartResponse(
        thread_id=thread.id,
        subject=thread.subject,
        topic=thread.topic,
        created=created,
        messages=[ChatMessageOut.model_validate(m) for m in _thread_all_messages(db, thread.id)],
    )


@router.get("/threads/{thread_id}", response_model=ChatThreadResponse)
def get_thread(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = _get_owned_thread(db, thread_id, current_user)
    return ChatThreadResponse(
        thread_id=thread.id,
        subject=thread.subject,
        topic=thread.topic,
        messages=[ChatMessageOut.model_validate(m) for m in _thread_all_messages(db, thread.id)],
    )


@router.post("/threads/{thread_id}/messages", response_model=ChatSendResponse)
@limiter.limit("20/minute")
def send_message(
    request: Request,
    thread_id: uuid.UUID,
    payload: ChatSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = _get_owned_thread(db, thread_id, current_user)

    # Last 2-3 turns of THIS thread (oldest-first), for both retrieval
    # and the prompt's RECENT CONVERSATION section.
    recent_turns = [
        (m.role, m.content)
        for m in _thread_messages(db, thread.id)[-RECENT_TURNS:]
    ]

    # Retrieval query = topic anchor + recent turn text + new question.
    # Follow-ups like "why?" or "explain the second part again" carry no
    # topical signal on their own, so we combine them with what came
    # before -- the new message alone would retrieve the wrong chunks.
    # Budgets are fixed BEFORE concatenating so the new question can
    # never be truncated off the end: turn_text keeps only the most
    # recent tail (600 chars) and the question's retrieval copy is
    # capped at 300 -- worst case 255+600+300+separators = 1158 < 1200.
    # (The FULL question still goes into the prompt and the saved
    # message; these caps only shape the embedding query.)
    # (retrieve_top_chunks normalizes Roman Urdu -> English internally.)
    # Only the student's OWN words feed retrieval -- assistant replies
    # can be long and topically wander, diluting the embedding query.
    # (The full both-roles history still reaches the LLM via the
    # prompt's RECENT CONVERSATION section.)
    # Each piece is normalized INDIVIDUALLY (Roman Urdu -> English):
    # normalize_query is built for short inputs and returns empty on
    # long mixed-language concatenations, which made the embedding query
    # match garbage. Normalizing per-piece keeps every input in its
    # working range.
    user_turns = [content for role, content in recent_turns if role == "user"]
    # All pieces are independent, so normalize them concurrently (one Groq
    # round-trip each) instead of serially: N calls cost ~1 round-trip of
    # wall time instead of N. asyncio.to_thread keeps the blocking
    # call_groq off the loop; gather preserves input order.
    pieces = [*user_turns, payload.content]
    normalized = asyncio.run(_normalize_pieces_concurrently(pieces))
    turn_parts = normalized[:-1]
    question_part = normalized[-1][:300]
    retrieval_query = (
        f"{thread.topic}. {' '.join(p for p in turn_parts if p)} {question_part}"
    )[:1200]

    chunks, metadatas, distances, _ = retrieve_top_chunks(
        query=retrieval_query, subject=thread.subject, top_k=5, already_normalized=True
    )
    # Guard: if normalization collapsed the query to nothing, fall back
    # to the topic anchor alone rather than embedding an empty string.
    if not retrieval_query.strip(". "):
        chunks, metadatas, distances, _ = retrieve_top_chunks(
            query=thread.topic, subject=thread.subject, top_k=5
        )
    context = format_context_string(chunks) if chunks else "(no relevant content retrieved)"

    user_message = build_study_chat_prompt(
        context=context,
        subject=thread.subject,
        topic=thread.topic,
        recent_turns=recent_turns,
        question=payload.content,
    )
    try:
        reply = call_groq(
            STUDY_CHAT_SYSTEM_PROMPT, user_message, temperature=0.3, max_tokens=600
        ).strip()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "STUDY_CHAT_GENERATION_FAILED",
                "message": "We couldn't generate a reply right now. Please try again in a moment.",
            },
        )

    # Grounding evidence for the assistant row (mirrors chunks used).
    chunks_used = [
        {
            "text": chunk[:400],
            "chapter": meta.get("chapter_name"),
            "distance": round(dist, 4),
        }
        for chunk, meta, dist in zip(chunks, metadatas, distances)
    ] or None

    user_msg = StudyChatMessage(
        thread_id=thread.id, role="user", content=payload.content
    )
    assistant_msg = StudyChatMessage(
        thread_id=thread.id,
        role="assistant",
        content=reply,
        chunks_used_json=chunks_used,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    update_streak(current_user, db)
    db.commit()
    # PKs are server-generated (uuid_generate_v4()), so refresh both
    # rows to read back their real ids.
    db.refresh(user_msg)
    db.refresh(assistant_msg)

    return ChatSendResponse(
        thread_id=thread.id,
        # Lets the frontend append the user bubble with its real
        # persisted id instead of a synthetic placeholder.
        user_message_id=user_msg.id,
        message_id=assistant_msg.id,
        response=reply,
    )
