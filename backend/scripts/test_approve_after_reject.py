"""
Manual-test script for the approve-after-reject fix.

Flow: pick a verified MCQ -> reject it via the admin API -> verify it
disappears from student-facing counts and shows as rejected in the admin
bank/meta -> approve it -> verify it's back in student-facing counts and
shows as approved (not rejected) everywhere. Leaves data in its original
state (MCQ ends approved, as it started).

Run from backend/: .venv/bin/python scripts/test_approve_after_reject.py
"""

import json
import os
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.models.mcq_bank import McqBank

BASE = "http://localhost:8000/api/v1"
ADMIN_USER_ID = "3e31a3fd-7152-42ec-b3a6-ec6dc30aa467"  # fawad123009@gmail.com
STUDENT_USER_ID = "b97d3f16-1f69-4be3-ba5b-6b6abf3e4b7d"


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + urllib.parse.quote(path, safe="/?=&"), method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data=data) as resp:
        return json.loads(resp.read().decode())


def bank_ids_with_status(subject, status, admin_token):
    rows = call("GET", f"/admin/mcqs/bank?subject={subject}&status={status}", token=admin_token)
    return {r["id"] for r in rows}


def meta_counts(subject, admin_token):
    return call("GET", f"/admin/mcqs/bank/meta?subject={subject}", token=admin_token)["counts"]


def student_count(subject, student_token):
    out = call("GET", "/mock-tests/availability", token=student_token)
    return out["subjects"].get(subject, 0)


def check(label, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {label}{(' -- ' + detail) if detail else ''}")
    if not cond:
        raise SystemExit(f"FAILED at: {label}")


def main():
    admin_token = create_access_token(ADMIN_USER_ID)
    student_token = create_access_token(STUDENT_USER_ID)

    db = SessionLocal()
    try:
        mcq = (
            db.query(McqBank)
            .filter(McqBank.is_verified == True, McqBank.rejected_at.is_(None))
            .order_by(McqBank.created_at.desc())
            .first()
        )
        assert mcq, "no verified MCQ found to test with"
        mcq_id, subject = str(mcq.id), mcq.subject
        print(f"Test MCQ: {mcq_id} (subject={subject})")

        baseline_student = student_count(subject, student_token)
        baseline_meta = meta_counts(subject, admin_token)
        print(f"Baseline: student-facing count={baseline_student}, meta={baseline_meta}")

        # --- Step 1: reject ---
        print("\nStep 1: reject the MCQ")
        out = call("PATCH", f"/admin/mcqs/{mcq_id}/reject", admin_token,
                   {"reason": "audit-test-reject"})
        check("reject endpoint returns rejected", out.get("status") == "rejected", str(out))

        row = bank_ids_with_status(subject, "rejected", admin_token)
        check("admin bank lists it under status=rejected", mcq_id in row)
        check("admin bank no longer lists it under status=verified",
              mcq_id not in bank_ids_with_status(subject, "verified", admin_token))
        m = meta_counts(subject, admin_token)
        check("meta: rejected +1, verified -1",
              m["rejected"] == baseline_meta["rejected"] + 1
              and m["verified"] == baseline_meta["verified"] - 1,
              f"meta={m}")
        check("student-facing count dropped by 1",
              student_count(subject, student_token) == baseline_student - 1)

        # --- Step 2: approve after reject ---
        print("\nStep 2: approve the previously-rejected MCQ")
        out = call("PATCH", f"/admin/mcqs/{mcq_id}/approve", admin_token)
        check("approve endpoint returns approved", out.get("status") == "approved", str(out))

        with SessionLocal() as db2:
            fresh = db2.query(McqBank).filter(McqBank.id == mcq.id).first()
            check("DB: is_verified=True", fresh.is_verified is True)
            check("DB: rejected_at cleared (NULL)", fresh.rejected_at is None)
            check("DB: reject_reason cleared (NULL)", fresh.reject_reason is None)

        check("admin bank lists it under status=verified",
              mcq_id in bank_ids_with_status(subject, "verified", admin_token))
        check("admin bank no longer lists it under status=rejected",
              mcq_id not in bank_ids_with_status(subject, "rejected", admin_token))
        m = meta_counts(subject, admin_token)
        check("meta counts back to baseline",
              m["rejected"] == baseline_meta["rejected"]
              and m["verified"] == baseline_meta["verified"],
              f"meta={m} baseline={baseline_meta}")
        check("student-facing count restored",
              student_count(subject, student_token) == baseline_student)

        print("\nALL CHECKS PASSED")
    finally:
        db.close()


if __name__ == "__main__":
    main()
