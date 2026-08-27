#!/usr/bin/env python3
"""
Per-chapter regeneration loop for MCQs with Urdu-script options.

For each (subject, chapter) group from data/mcq_cleanup/urdu_flagged_rows.csv:
  1. Soft-reject every flagged MCQ id (PATCH /admin/mcqs/{id}/reject).
     Rejected rows are excluded from every student-facing path
     (mock tests, study bank, coverage, pending review).
  2. Regenerate the whole chapter (POST /admin/mcqs/generate?force=true).
     New rows land as is_verified=False in the pending-review queue.
  3. Re-audit the chapter (active rows only) and confirm 0 flagged.

Requires the backend running on BASE. Admin JWT is minted locally for
the admin user in the DB (no password needed).
"""
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from dotenv import load_dotenv

load_dotenv(BACKEND_DIR / ".env")

from app.core.security import create_access_token  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.mcq_bank import McqBank  # noqa: E402
from app.models.user import User  # noqa: E402

BASE = os.getenv("API_BASE", "http://127.0.0.1:8000/api/v1")
CSV_PATH = BACKEND_DIR.parent / "data" / "mcq_cleanup" / "urdu_flagged_rows.csv"
REJECT_REASON = "Urdu-script options (U+0600-U+06FF) -- chapter regenerated"
SLEEP_BETWEEN_CHAPTERS = int(os.getenv("REGEN_SLEEP", "20"))  # Groq TPM headroom
URDU_RE = re.compile("[\u0600-\u06FF]")


def api(method: str, path: str, token: str, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}",
        method=method,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=240) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except json.JSONDecodeError:
            return e.code, {}


def active_flagged_count(subject: str, chapter: int) -> int:
    """Unicode audit scoped to one chapter, active rows only."""
    db = SessionLocal()
    try:
        rows = (
            db.query(McqBank)
            .filter(
                McqBank.subject == subject,
                McqBank.chapter_number == chapter,
                McqBank.rejected_at.is_(None),
            )
            .all()
        )
        return sum(
            1
            for m in rows
            if any(
                opt and URDU_RE.search(opt)
                for opt in (m.option_a, m.option_b, m.option_c, m.option_d)
            )
        )
    finally:
        db.close()


def main() -> None:
    # --- admin token (minted locally, no password) ---
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            sys.exit("No admin user found in DB.")
        admin_email = admin.email
        token = create_access_token(str(admin.id))
    finally:
        db.close()
    print(f"Admin: {admin_email} | API base: {BASE}\n")

    # --- group flagged ids by (subject, chapter) ---
    with CSV_PATH.open() as f:
        groups: dict[tuple[str, int], list[str]] = defaultdict(list)
        for row in csv.DictReader(f):
            groups[(row["subject"], int(row["chapter"]))].append(row["id"])
    ordered = sorted(groups.items(), key=lambda kv: (kv[0][0], kv[0][1]))
    print(f"{len(ordered)} chapter groups, {sum(len(v) for v in groups.values())} flagged ids\n")

    results = []
    for idx, ((subject, chapter), ids) in enumerate(ordered, 1):
        print(f"[{idx}/{len(ordered)}] {subject} ch.{chapter}: {len(ids)} flagged ids")

        # 1. reject flagged rows
        rejected_ok = 0
        for mcq_id in ids:
            status, _ = api("PATCH", f"/admin/mcqs/{mcq_id}/reject", token, {"reason": REJECT_REASON})
            if status == 200:
                rejected_ok += 1
            else:
                print(f"    !! reject {mcq_id} -> HTTP {status}")

        # 2. regenerate chapter (1 retry with backoff for rate limits)
        generated, gen_note = None, ""
        for attempt in (1, 2):
            status, body = api(
                "POST",
                f"/admin/mcqs/generate?subject={subject}&chapter_number={chapter}&force=true",
                token,
            )
            if status == 200:
                generated = body.get("generated", 0)
                if body.get("parse_error"):
                    gen_note = f"parse_error: {body['parse_error'][:80]}"
                if body.get("invalid"):
                    gen_note += f" invalid={body['invalid']}"
                break
            gen_note = f"HTTP {status}: {json.dumps(body.get('detail', body))[:120]}"
            print(f"    !! generate attempt {attempt} failed ({gen_note}); retrying in 60s")
            time.sleep(60)

        # 3. scoped re-audit
        flagged_after = active_flagged_count(subject, chapter)
        mark = "OK" if flagged_after == 0 and generated else "CHECK"
        print(f"    rejected={rejected_ok}/{len(ids)} generated={generated} flagged_after={flagged_after} [{mark}]")

        results.append({
            "subject": subject,
            "chapter": chapter,
            "old_flagged": len(ids),
            "rejected": rejected_ok,
            "regenerated": generated if generated is not None else "-",
            "new_flagged": flagged_after,
            "note": gen_note.strip(),
        })
        if idx < len(ordered):
            time.sleep(SLEEP_BETWEEN_CHAPTERS)

    # --- summary ---
    print("\n" + "=" * 78)
    print(f"{'subject':<11} {'ch':>3} {'old':>4} {'rej':>4} {'regen':>5} {'new':>4}  note")
    print("-" * 78)
    for r in results:
        print(f"{r['subject']:<11} {r['chapter']:>3} {r['old_flagged']:>4} {r['rejected']:>4} "
              f"{str(r['regenerated']):>5} {r['new_flagged']:>4}  {r['note']}")
    total_regen = sum(r["regenerated"] for r in results if isinstance(r["regenerated"], int))
    print("-" * 78)
    print(f"TOTAL: {len(results)} chapters | {sum(r['old_flagged'] for r in results)} rejected"
          f" | {total_regen} regenerated | {sum(r['new_flagged'] for r in results)} still flagged")


if __name__ == "__main__":
    main()
