"""
MCQ generation-to-bank service.

The review side (list_pending_mcqs, approve_mcq, reject_mcq, mcq-coverage)
already exists in app/api/v1/admin.py. This service is the one missing
piece: pulling real chapter content, running it through the existing
generate_mcqs() pipeline, and persisting the results into mcq_bank as
is_verified=False so the existing review endpoints have something to
review.

Uses ChromaDB metadata filtering (subject + chapter) to pull ALL chunks
for a chapter, rather than a semantic top-k search -- this gives genuinely
comprehensive chapter coverage for generation, not just topically-nearby
fragments.
"""

import chromadb
from sqlalchemy.orm import Session
from app.core.config import CHROMA_DB_PATH, COLLECTION_NAME
from app.models.document import Document
from app.models.mcq_bank import McqBank
from app.rag.retrieve import format_context_string
from app.rag.llm_client import generate_mcqs

_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
_collection = _client.get_or_create_collection(COLLECTION_NAME)


def generate_mcqs_for_chapter(subject: str, chapter_number: int, db: Session, force: bool = False) -> dict:
    """
    Generates MCQs for a specific ingested chapter and persists valid ones
    to mcq_bank as unverified (is_verified=False). Returns a summary dict.

    Raises ValueError if the chapter isn't found, isn't ready, or if MCQs
    already exist for this chapter and force=False (prevents accidental
    duplicate generation from a double-click or repeated request).
    """
    document = (
        db.query(Document)
        .filter(Document.subject == subject, Document.chapter_number == chapter_number)
        .first()
    )
    if not document:
        raise ValueError(f"No ingested document found for {subject} chapter {chapter_number}.")
    if document.status != "ready":
        raise ValueError(f"Chapter {chapter_number} for {subject} is not ready (status: {document.status}).")

    existing_count = (
        db.query(McqBank)
        .filter(McqBank.subject == subject, McqBank.chapter_number == chapter_number)
        .count()
    )
    if existing_count > 0 and not force:
        raise ValueError(
            f"MCQs already exist for {subject} chapter {chapter_number} "
            f"({existing_count} rows). Pass force=true to generate more anyway."
        )

    # Pull ALL chunks for this chapter via metadata filter -- not a
    # semantic search, since we want comprehensive chapter coverage for
    # generation, not just the top-k chunks nearest to some query.
    results = _collection.get(
        where={"$and": [{"subject": subject}, {"chapter": chapter_number}]},
    )
    chunks = results.get("documents", [])

    if not chunks:
        raise ValueError(f"No chunks found in ChromaDB for {subject} chapter {chapter_number}.")

    context = format_context_string(chunks)
    result = generate_mcqs(context=context, subject=subject, topic=document.chapter_title)

    if result["parse_error"]:
        return {
            "generated": 0,
            "invalid": 0,
            "parse_error": result["parse_error"],
            "document_id": str(document.id),
            "chapter_title": document.chapter_title,
        }

    saved_count = 0
    for mcq in result["valid_mcqs"]:
        row = McqBank(
            document_id=document.id,
            subject=subject,
            chapter_number=chapter_number,
            topic=document.chapter_title,
            question_text=mcq["question_en"],
            question_text_ur=mcq["question_ur"],
            option_a=mcq["opt_a"],
            option_b=mcq["opt_b"],
            option_c=mcq["opt_c"],
            option_d=mcq["opt_d"],
            correct_option=mcq["correct"],
            explanation=mcq["explanation_en"],
            # generate_mcqs() produces "Easy"/"Medium"/"Hard" (matches the
            # MCQ prompt spec) but the DB constraint requires lowercase --
            # map here rather than changing the prompt or the constraint.
            difficulty=mcq["difficulty"].lower(),
            is_verified=False,
        )
        db.add(row)
        saved_count += 1

    db.commit()

    return {
        "generated": saved_count,
        "invalid": len(result["invalid_mcqs"]),
        "invalid_reasons": [errs for _, errs in result["invalid_mcqs"]],
        "parse_error": None,
        "document_id": str(document.id),
        "chapter_title": document.chapter_title,
    }