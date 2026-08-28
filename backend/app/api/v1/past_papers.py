"""
Past Papers router.

Serves archived official entry-test papers (e.g. ECAT 2015, UET Lahore)
exactly as printed: questions stay in their original order with their
original subject sections, and each attempt is timed by the paper's own
duration. Unlike /mock-tests there is no question sampling or shuffling —
students practice on the real paper layout.

Papers move through draft -> verified -> published; students only ever
see verified or published papers.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.past_paper import PastPaper
from app.models.past_paper_question import PastPaperQuestion
from app.models.past_paper_attempt import PastPaperAttempt
from app.models.past_paper_answer import PastPaperAnswer
from app.schemas.past_paper import (
    PastPaperListItem,
    PastPaperQuestionOut,
    PastPaperStartResponse,
    PastPaperDetailQuestion,
    PastPaperAttemptDetailResponse,
    PastPaperAnswerSaveRequest,
    PastPaperSubmitResponse,
    PastPaperResultQuestion,
    PastPaperResultsResponse,
)

router = APIRouter(prefix="/past-papers", tags=["past-papers"])

STUDENT_VISIBLE_STATUSES = ["verified", "published"]


def _get_owned_attempt(
    db: Session, attempt_id: uuid.UUID, user: User
) -> PastPaperAttempt:
    attempt = (
        db.query(PastPaperAttempt)
        .filter(PastPaperAttempt.id == attempt_id)
        .first()
    )
    # Same 404-for-foreign-resource pattern as mock_tests (no ownership leak)
    if not attempt or attempt.user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Attempt not found"},
        )
    return attempt


def _get_paper_or_404(db: Session, paper_id: uuid.UUID) -> PastPaper:
    paper = db.query(PastPaper).filter(PastPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Past paper not found"},
        )
    return paper


def check_and_expire_abandoned_attempts(db: Session) -> int:
    """
    Marks in-progress past paper attempts whose paper duration has already
    elapsed as 'expired' -- covers students who closed the browser
    mid-paper and never submitted. Mirrors the mock-test sweep: an
    abandoned attempt must not block retaking that paper forever. Runs as
    a single SQL UPDATE. Returns the number of attempts expired. Active-
    paper timer enforcement (answer-save cutoff, submission grading) is
    untouched.
    """
    expired_count = db.execute(text(
        "UPDATE past_paper_attempts a SET status = 'expired' "
        "FROM past_papers p "
        "WHERE a.paper_id = p.id AND a.status = 'in_progress' "
        "AND a.started_at + p.duration_minutes * interval '1 minute' <= now()"
    )).rowcount
    if expired_count:
        db.commit()
    return expired_count


@router.get("", response_model=list[PastPaperListItem])
def list_past_papers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Student-facing list: only verified/published papers, newest first."""
    papers = (
        db.query(PastPaper)
        .filter(PastPaper.status.in_(STUDENT_VISIBLE_STATUSES))
        .order_by(PastPaper.year.desc(), PastPaper.exam_type)
        .all()
    )
    return papers


@router.post("/{paper_id}/start", response_model=PastPaperStartResponse)
@limiter.limit("20/minute")
def start_past_paper(
    paper_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Create an attempt and return the full question set in original order
    (mirrors mock_tests /start, which also returns all questions up front).
    Abandoned attempts (timer elapsed, never submitted) are expired first
    by check_and_expire_abandoned_attempts so they don't block a retake;
    an attempt still within its time window raises ATTEMPT_IN_PROGRESS
    instead of creating a duplicate row.
    """
    paper = _get_paper_or_404(db, paper_id)
    if paper.status not in STUDENT_VISIBLE_STATUSES:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Past paper not found"},
        )

    # Expire abandoned attempts (browser closed, timer ran out) before the
    # in-progress guard evaluates them -- same cleanup mock-tests /start
    # performs.
    check_and_expire_abandoned_attempts(db)

    existing = (
        db.query(PastPaperAttempt)
        .filter(
            PastPaperAttempt.user_id == user.id,
            PastPaperAttempt.paper_id == paper.id,
            PastPaperAttempt.status == "in_progress",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "ATTEMPT_IN_PROGRESS",
                "message": "You already have an attempt in progress for this paper",
                "attempt_id": str(existing.id),
            },
        )

    questions = (
        db.query(PastPaperQuestion)
        .filter(PastPaperQuestion.paper_id == paper.id)
        .order_by(PastPaperQuestion.question_number)
        .all()
    )
    if not questions:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INSUFFICIENT_QUESTIONS",
                "message": "This paper has no questions yet.",
            },
        )

    attempt = PastPaperAttempt(user_id=user.id, paper_id=paper.id)
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return PastPaperStartResponse(
        attempt_id=attempt.id,
        paper_id=paper.id,
        exam_type=paper.exam_type,
        university=paper.university,
        year=paper.year,
        question_count=len(questions),
        duration_minutes=paper.duration_minutes,
        started_at=attempt.started_at,
        questions=[
            PastPaperQuestionOut(
                question_id=q.id,
                question_number=q.question_number,
                subject_tag=q.subject_tag,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
            )
            for q in questions
        ],
    )


@router.get("/attempts/{attempt_id}", response_model=PastPaperAttemptDetailResponse)
def get_past_paper_attempt(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Resume-safe fetch: questions in original order plus any answers already
    saved via /answer, so a refresh mid-paper restores the student's place.
    Correct answers are never included here.
    """
    attempt = _get_owned_attempt(db, attempt_id, user)
    paper = _get_paper_or_404(db, attempt.paper_id)

    questions = (
        db.query(PastPaperQuestion)
        .filter(PastPaperQuestion.paper_id == paper.id)
        .order_by(PastPaperQuestion.question_number)
        .all()
    )
    saved = {
        a.question_id: a.selected_option
        for a in db.query(PastPaperAnswer)
        .filter(PastPaperAnswer.attempt_id == attempt.id)
        .all()
    }

    return PastPaperAttemptDetailResponse(
        attempt_id=attempt.id,
        paper_id=paper.id,
        exam_type=paper.exam_type,
        university=paper.university,
        year=paper.year,
        question_count=len(questions),
        duration_minutes=paper.duration_minutes,
        status=attempt.status,
        started_at=attempt.started_at,
        questions=[
            PastPaperDetailQuestion(
                question_id=q.id,
                question_number=q.question_number,
                subject_tag=q.subject_tag,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                selected_option=saved.get(q.id),
            )
            for q in questions
        ],
    )


@router.patch("/attempts/{attempt_id}/answer")
@limiter.limit("20/minute")
def save_past_paper_answer(
    attempt_id: uuid.UUID,
    request: Request,
    body: PastPaperAnswerSaveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Autosave a single answer without grading -- called as the student picks
    each option, so progress survives a refresh or crash. Grading happens
    only at final /submit. Upserts: re-answering overwrites the row.
    """
    attempt = _get_owned_attempt(db, attempt_id, user)
    if attempt.status == "completed":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "ALREADY_SUBMITTED",
                "message": "This past paper attempt has already been submitted",
            },
        )

    # Real-exam enforcement: no NEW answers after the paper's duration has
    # elapsed. Submission itself stays allowed past the cutoff (see /submit)
    # so whatever was autosaved before expiry still gets graded.
    paper = _get_paper_or_404(db, attempt.paper_id)
    deadline = attempt.started_at + timedelta(minutes=paper.duration_minutes)
    if datetime.now(timezone.utc) > deadline:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "TIME_EXPIRED",
                "message": "Time for this past paper has expired; no further answers can be saved",
            },
        )

    q = (
        db.query(PastPaperQuestion)
        .filter(
            PastPaperQuestion.id == body.question_id,
            PastPaperQuestion.paper_id == attempt.paper_id,
        )
        .first()
    )
    if not q:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "QUESTION_NOT_FOUND",
                "message": "Question not part of this paper",
            },
        )

    selected = body.selected_option.strip().upper()
    if selected not in ("A", "B", "C", "D"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_OPTION",
                "message": "selected_option must be one of: A, B, C, D",
            },
        )

    answer = (
        db.query(PastPaperAnswer)
        .filter(
            PastPaperAnswer.attempt_id == attempt.id,
            PastPaperAnswer.question_id == q.id,
        )
        .first()
    )
    if answer:
        answer.selected_option = selected
    else:
        db.add(
            PastPaperAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_option=selected,
            )
        )
    db.commit()

    return {"ok": True}


@router.post("/attempts/{attempt_id}/submit", response_model=PastPaperSubmitResponse)
@limiter.limit("20/minute")
def submit_past_paper_attempt(
    attempt_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Grade the attempt from its autosaved answers: each answer's is_correct
    is set by comparing against the question's correct_option, then score,
    submitted_at and time_taken_seconds are stamped on the attempt row.

    Deliberately NOT blocked by time expiry -- like a real exam, once time
    is up the student submits what they already saved; only NEW answers are
    rejected (see the TIME_EXPIRED guard in PATCH /answer).
    """
    attempt = _get_owned_attempt(db, attempt_id, user)
    if attempt.status == "completed":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "ALREADY_SUBMITTED",
                "message": "This past paper attempt has already been submitted",
            },
        )

    answers = (
        db.query(PastPaperAnswer)
        .filter(PastPaperAnswer.attempt_id == attempt.id)
        .all()
    )
    question_ids = [a.question_id for a in answers]
    questions_by_id = {
        q.id: q
        for q in db.query(PastPaperQuestion)
        .filter(PastPaperQuestion.id.in_(question_ids))
        .all()
    }

    paper = _get_paper_or_404(db, attempt.paper_id)
    question_count = (
        db.query(PastPaperQuestion)
        .filter(PastPaperQuestion.paper_id == paper.id)
        .count()
    )

    correct_count = 0
    for ans in answers:
        q = questions_by_id.get(ans.question_id)
        if not q or not ans.selected_option:
            continue
        is_correct = ans.selected_option.upper() == q.correct_option.upper()
        ans.is_correct = is_correct
        if is_correct:
            correct_count += 1

    submitted_at = datetime.now(timezone.utc)
    score = round((correct_count / question_count) * 100) if question_count else 0

    attempt.status = "completed"
    attempt.submitted_at = submitted_at
    attempt.score = score
    attempt.time_taken_seconds = int(
        (submitted_at - attempt.started_at).total_seconds()
    )

    db.commit()
    db.refresh(attempt)

    return PastPaperSubmitResponse(
        attempt_id=attempt.id,
        paper_id=paper.id,
        score=attempt.score,
        correct_count=correct_count,
        question_count=question_count,
        time_taken_seconds=attempt.time_taken_seconds,
        submitted_at=attempt.submitted_at,
    )


@router.get("/attempts/{attempt_id}/results", response_model=PastPaperResultsResponse)
def get_past_paper_results(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Score + per-question breakdown with correct answers revealed."""
    attempt = _get_owned_attempt(db, attempt_id, user)

    if attempt.status != "completed":
        raise HTTPException(status_code=400, detail="Test not yet completed")

    paper = _get_paper_or_404(db, attempt.paper_id)

    questions = (
        db.query(PastPaperQuestion)
        .filter(PastPaperQuestion.paper_id == paper.id)
        .order_by(PastPaperQuestion.question_number)
        .all()
    )
    answers_by_question = {
        a.question_id: a
        for a in db.query(PastPaperAnswer)
        .filter(PastPaperAnswer.attempt_id == attempt.id)
        .all()
    }

    correct_count = sum(1 for a in answers_by_question.values() if a.is_correct)

    return PastPaperResultsResponse(
        attempt_id=attempt.id,
        paper_id=paper.id,
        exam_type=paper.exam_type,
        university=paper.university,
        year=paper.year,
        question_count=len(questions),
        score=attempt.score,
        correct_count=correct_count if attempt.status == "completed" else None,
        time_taken_seconds=attempt.time_taken_seconds,
        status=attempt.status,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        questions=[
            PastPaperResultQuestion(
                question_id=q.id,
                question_number=q.question_number,
                subject_tag=q.subject_tag,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                correct_option=q.correct_option,
                selected_option=(
                    answers_by_question[q.id].selected_option
                    if q.id in answers_by_question
                    else None
                ),
                is_correct=(
                    answers_by_question[q.id].is_correct
                    if q.id in answers_by_question
                    else None
                ),
            )
            for q in questions
        ],
    )
