"""
Manual-test script for the webhook idempotency constraint (migration 009).

Scenario 1: normal single payment -> grants correctly (one completed row,
            user.plan/product_id updated).
Scenario 2: two concurrent identical webhook calls (same transaction_ref,
            two sessions/threads) -> exactly ONE grant, both calls succeed.
Scenario 3: deterministic race that exercises the IntegrityError branch:
            thread A flushes an uncommitted completed INSERT for ref X,
            main thread calls grant_product(X) -- its SELECT misses the
            uncommitted row, its COMMIT blocks on the unique index, then
            gets the violation, rolls back and returns A's payment.

Cleanup: test payment rows are deleted and the user's original
plan/product_id are restored at the end.

Run from backend/: .venv/bin/python scripts/test_payment_idempotency.py
"""

import os
import sys
import threading
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.payment import Payment
from app.models.user import User
from app.services.payment_service import grant_product

USER_ID = uuid.UUID("b97d3f16-1f69-4be3-ba5b-6b6abf3e4b7d")  # existing test user
PRODUCT = "ecat"
REFS = [f"test-idem-{uuid.uuid4().hex[:8]}" for _ in range(3)]
created_refs = []


def check(label, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {label}{(' -- ' + detail) if detail else ''}")
    if not cond:
        raise SystemExit(f"FAILED at: {label}")


def rows_for_ref(ref):
    db = SessionLocal()
    try:
        return db.query(Payment).filter(Payment.transaction_ref == ref).all()
    finally:
        db.close()


def scenario_1_single_payment():
    ref = REFS[0]
    created_refs.append(ref)
    print(f"\nScenario 1: normal single payment (ref={ref})")
    db = SessionLocal()
    try:
        payment = grant_product(db, USER_ID, PRODUCT, "safepay", transaction_ref=ref)
        rows = rows_for_ref(ref)
        check("exactly one completed payment row created",
              len(rows) == 1 and rows[0].status == "completed")
        check("returned payment is the created row", rows[0].id == payment.id)
        user = db.query(User).filter(User.id == USER_ID).first()
        check("user granted pro plan", user.plan == "pro")
        check("user product_id set to product", user.product_id == PRODUCT)
        check("valid_until ~30 days out",
              (payment.valid_until - payment.valid_from).days == 30)
    finally:
        db.close()


def scenario_2_concurrent_webhooks():
    ref = REFS[1]
    created_refs.append(ref)
    print(f"\nScenario 2: two concurrent identical webhook calls (ref={ref})")
    results, errors = [None, None], [None, None]
    barrier = threading.Barrier(2)

    def worker(i):
        db = SessionLocal()
        try:
            barrier.wait()
            results[i] = grant_product(db, USER_ID, PRODUCT, "safepay",
                                       transaction_ref=ref)
        except Exception as exc:  # noqa: BLE001 -- report, don't crash
            errors[i] = exc
        finally:
            db.close()

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    check("neither call crashed", all(e is None for e in errors), str(errors))
    check("both calls returned a payment", all(r is not None for r in results))
    check("both calls returned the SAME payment", results[0].id == results[1].id,
          f"{results[0].id} vs {results[1].id}")
    rows = rows_for_ref(ref)
    check("exactly ONE completed payment row exists (no double grant)",
          len(rows) == 1 and rows[0].status == "completed")


def scenario_3_deterministic_constraint_race():
    ref = REFS[2]
    created_refs.append(ref)
    print(f"\nScenario 3: deterministic race hitting the unique index (ref={ref})")
    winner_id, loser_error = [None], [None]

    def winner():
        db = SessionLocal()
        try:
            p = Payment(user_id=USER_ID, amount=799, currency="PKR",
                        method="safepay", status="completed",
                        transaction_ref=ref, plan="pro", product_id=PRODUCT)
            db.add(p)
            db.flush()          # row is INSERTed but not yet committed
            winner_id[0] = p.id
            time.sleep(1.5)     # hold the insert while the loser commits
            db.commit()
        except Exception as exc:  # noqa: BLE001
            loser_error[0] = exc
            db.rollback()
        finally:
            db.close()

    t = threading.Thread(target=winner)
    t.start()
    time.sleep(0.4)  # winner has flushed; its row is invisible to new reads

    db = SessionLocal()
    try:
        # Loser's SELECT misses the uncommitted row -> proceeds to INSERT ->
        # COMMIT blocks on the unique index -> IntegrityError -> except branch
        # rolls back and returns the winner's payment.
        payment = grant_product(db, USER_ID, PRODUCT, "safepay", transaction_ref=ref)
    finally:
        db.close()
    t.join()

    check("winner thread committed fine", loser_error[0] is None, str(loser_error[0]))
    check("loser got the winner's payment back (no crash)",
          payment.id == winner_id[0], f"{payment.id} vs {winner_id[0]}")
    rows = rows_for_ref(ref)
    check("exactly ONE completed payment row exists", len(rows) == 1)


def cleanup(original):
    db = SessionLocal()
    try:
        db.query(Payment).filter(Payment.transaction_ref.in_(created_refs)).delete(
            synchronize_session=False)
        user = db.query(User).filter(User.id == USER_ID).first()
        user.plan, user.product_id = original
        db.commit()
        print(f"\nCleanup done: {len(created_refs)} test payment rows removed, "
              f"user restored to {original}.")
    finally:
        db.close()


def main():
    db = SessionLocal()
    original = None
    try:
        user = db.query(User).filter(User.id == USER_ID).first()
        original = (user.plan, user.product_id)
    finally:
        db.close()
    try:
        scenario_1_single_payment()
        scenario_2_concurrent_webhooks()
        scenario_3_deterministic_constraint_race()
        print("\nALL CHECKS PASSED")
    finally:
        cleanup(original)


if __name__ == "__main__":
    main()
