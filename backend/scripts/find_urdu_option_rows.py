#!/usr/bin/env python3
"""
Read-only audit: find mcq_bank rows whose option_a..option_d contain
characters in the Unicode Arabic/Urdu block U+0600-U+06FF.

By default scans only ACTIVE rows (rejected_at IS NULL), since rejected
rows are excluded from every student-facing path. Pass --include-rejected
to scan the physical table including soft-deleted rows.

Writes: data/mcq_cleanup/urdu_flagged_rows.csv
Columns: id, subject, chapter, affected_columns

No writes/updates/deletes are issued against the database.
"""
import argparse
import csv
import os
import re
import sys
from collections import Counter
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ilmai_user:ilmai_dev_password@localhost/ilmai_db",
)
# Strip SQLAlchemy driver suffix so raw psycopg2 accepts the URL
DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")

OPTION_COLS = ["option_a", "option_b", "option_c", "option_d"]
URDU_RE = re.compile("[\u0600-\u06FF]")

OUT_DIR = Path(__file__).resolve().parents[2] / "data" / "mcq_cleanup"
OUT_CSV = OUT_DIR / "urdu_flagged_rows.csv"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--include-rejected",
        action="store_true",
        help="Scan the full physical table, including soft-deleted rows",
    )
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    try:
        cur = conn.cursor()
        query = f"SELECT id, subject, chapter_number, {', '.join(OPTION_COLS)} FROM mcq_bank"
        if not args.include_rejected:
            query += " WHERE rejected_at IS NULL"
        cur.execute(query)
        rows = cur.fetchall()
    finally:
        conn.close()

    flagged = []
    subject_counts = Counter()
    for row_id, subject, chapter, *options in rows:
        affected = [
            col for col, opt in zip(OPTION_COLS, options)
            if opt and URDU_RE.search(opt)
        ]
        if affected:
            flagged.append((row_id, subject, chapter, affected))
            subject_counts[subject] += 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "subject", "chapter", "affected_columns"])
        for row_id, subject, chapter, affected in flagged:
            writer.writerow([row_id, subject, chapter, ",".join(affected)])

    scope = "full table incl. rejected" if args.include_rejected else "active rows (rejected_at IS NULL)"
    print(f"Scope        : {scope}")
    print(f"Scanned rows : {len(rows)}")
    print(f"Flagged rows : {len(flagged)}")
    print(f"CSV written  : {OUT_CSV}")
    print("\nBreakdown by subject:")
    for subject, count in sorted(subject_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {subject:<20} {count}")


if __name__ == "__main__":
    main()
