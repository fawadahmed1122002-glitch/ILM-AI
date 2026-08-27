"""Import a past-paper JSON export into past_papers / past_paper_questions.

Usage (from backend/):
    .venv/bin/python scripts/import_past_paper.py <path/to/questions.json> [--dry-run] [--force]

Prints the compiled INSERT statements before executing. All inserts run in a
single transaction; --dry-run stops after printing the SQL.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # backend/

from sqlalchemy import insert, select
from sqlalchemy.dialects import postgresql

from app.db.session import SessionLocal
from app.models import PastPaper, PastPaperQuestion

# Paper metadata per import spec (ECAT 2015, UET Lahore)
PAPER_FIELDS = {
    "exam_type": "ECAT",
    "university": "UET Lahore",
    "year": 2015,
    "total_questions": 100,
    "duration_minutes": 100,
    "source_pdf_filename": "ECAT_Past_Paper_2015.pdf",
    "status": "draft",
}

VALID_OPTIONS = {"A", "B", "C", "D"}


def load_questions(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    questions = data.get("questions")
    if not isinstance(questions, list) or not questions:
        sys.exit(f"ERROR: no 'questions' array found in {path}")
    return questions


def validate_and_map(questions: list[dict]) -> list[dict]:
    """Map JSON keys to past_paper_questions columns; abort on bad rows."""
    required = ["question_number", "question_text", "option_a", "option_b",
                "option_c", "option_d", "correct_option"]
    rows = []
    for i, q in enumerate(questions):
        missing = [k for k in required if q.get(k) in (None, "")]
        if missing:
            sys.exit(f"ERROR: row {i} (question {q.get('question_number')}) "
                     f"missing fields: {missing}")
        correct = str(q["correct_option"]).strip().upper()
        if correct not in VALID_OPTIONS:
            sys.exit(f"ERROR: row {i} has invalid correct_option "
                     f"{q['correct_option']!r} (expected A/B/C/D)")
        rows.append({
            "question_number": int(q["question_number"]),
            "question_text": str(q["question_text"]),
            "option_a": str(q["option_a"]),
            "option_b": str(q["option_b"]),
            "option_c": str(q["option_c"]),
            "option_d": str(q["option_d"]),
            "correct_option": correct,
            "subject_tag": q.get("subject_tag"),
            "verified": False,
        })
    return rows


def print_sql(rows: list[dict]) -> None:
    paper_stmt = insert(PastPaper).values(**PAPER_FIELDS)
    question_stmt = insert(PastPaperQuestion).values(
        paper_id="<paper.id from step 1>", **rows[0]
    )
    compile_kw = {"literal_binds": True}
    print("-- INSERT 1: one row into past_papers")
    print(paper_stmt.compile(dialect=postgresql.dialect(),
                             compile_kwargs=compile_kw), ";\n")
    print(f"-- INSERT 2: {len(rows)} rows into past_paper_questions")
    print("-- (statement below repeats once per row; sample values from row 1)")
    print(question_stmt.compile(dialect=postgresql.dialect(),
                                compile_kwargs=compile_kw), ";")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("json_path")
    parser.add_argument("--dry-run", action="store_true",
                        help="print SQL without executing")
    parser.add_argument("--force", action="store_true",
                        help="import even if this paper already exists")
    args = parser.parse_args()

    questions = load_questions(args.json_path)
    rows = validate_and_map(questions)
    print(f"Loaded {len(rows)} questions from {args.json_path}")

    print_sql(rows)

    if args.dry_run:
        print("\n[dry-run] no changes made")
        return

    db = SessionLocal()
    try:
        existing = db.scalar(
            select(PastPaper.id).where(
                PastPaper.exam_type == PAPER_FIELDS["exam_type"],
                PastPaper.university == PAPER_FIELDS["university"],
                PastPaper.year == PAPER_FIELDS["year"],
            )
        )
        if existing and not args.force:
            sys.exit(f"ERROR: paper already exists (id={existing}); "
                     f"use --force to import anyway")

        paper = PastPaper(**PAPER_FIELDS)
        db.add(paper)
        db.flush()  # populate paper.id

        db.add_all([PastPaperQuestion(paper_id=paper.id, **r) for r in rows])
        db.commit()
        print(f"\nCommitted: past_papers id={paper.id}, "
              f"{len(rows)} past_paper_questions rows")
    except SystemExit:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
