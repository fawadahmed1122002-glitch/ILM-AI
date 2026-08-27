"""Backfill past_paper_questions.answer_source from the source JSON export.

Usage (from backend/):
    .venv/bin/python scripts/backfill_answer_source.py <paper_id> <path/to/questions.json>

Matches rows by (paper_id, question_number) and copies each JSON row's
"answer_source" value. Single transaction; aborts if any JSON question
number has no matching DB row (or vice versa).
"""
import argparse
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # backend/

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import PastPaperQuestion


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paper_id")
    parser.add_argument("json_path")
    args = parser.parse_args()
    paper_id = uuid.UUID(args.paper_id)

    with open(args.json_path, encoding="utf-8") as f:
        data = json.load(f)
    sources = {
        int(q["question_number"]): q.get("answer_source")
        for q in data["questions"]
    }

    db = SessionLocal()
    try:
        rows = db.scalars(
            select(PastPaperQuestion).where(
                PastPaperQuestion.paper_id == paper_id
            )
        ).all()
        if not rows:
            sys.exit(f"ERROR: no questions found for paper_id={paper_id}")

        db_numbers = {r.question_number for r in rows}
        json_numbers = set(sources)
        if db_numbers != json_numbers:
            sys.exit(
                "ERROR: question_number mismatch — "
                f"only in DB: {sorted(db_numbers - json_numbers)}, "
                f"only in JSON: {sorted(json_numbers - db_numbers)}"
            )

        updated = 0
        for r in rows:
            r.answer_source = sources[r.question_number]
            updated += 1
        db.commit()
        print(f"Backfilled answer_source on {updated} rows "
              f"for paper_id={paper_id}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
