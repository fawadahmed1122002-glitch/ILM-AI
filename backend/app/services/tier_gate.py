"""
PrepXMentor Tier Gate Service
Enforces free tier limits: 3 explanations/day, 5 MCQ sessions/day.

"Unlimited" is no longer a global plan-wide toggle -- a user with an
active paid product gets unlimited access ONLY for subjects covered by
that product (see app.core.products). Outside their product's subject
scope, free-tier daily limits still apply even to a paying customer.
"""
import logging
from datetime import date, datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session, object_session
from app.models.user import User
from app.models.payment import Payment
from app.core.products import subjects_for_product

logger = logging.getLogger(__name__)

FREE_EXPLAIN_LIMIT = 3
FREE_MCQ_LIMIT = 5
FREE_CHAT_LIMIT = 10


def _reset_if_new_day(user: User, db: Session):
    """Reset daily counters if it's a new day."""
    today = date.today()
    last_reset = user.last_reset_date if isinstance(user.last_reset_date, __import__('datetime').date) else (user.last_reset_date.date() if user.last_reset_date else None)
    if last_reset != today:
        user.daily_explain_count = 0
        user.daily_mcq_count = 0
        user.daily_chat_count = 0
        user.last_reset_date = today
        db.commit()


def _subscription_currently_valid(user: User) -> bool:
    """
    True only if the user's latest completed payment has a valid_until
    still in the future. Once valid_until has passed the user is treated
    as free regardless of plan or product_id. If the expiry can't be
    determined (no completed payments, or no DB session on the object),
    fail open so we never silently downgrade a paying student.
    """
    db = object_session(user)
    if db is None:
        return True
    latest = (
        db.query(Payment)
        .filter(Payment.user_id == user.id, Payment.status == "completed")
        .order_by(Payment.valid_until.desc())
        .first()
    )
    if latest is None or latest.valid_until is None:
        return True
    now = datetime.now(timezone.utc)
    expires = latest.valid_until
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > now


def _has_unlimited_access(user: User, subject: str) -> bool:
    """
    True only if the user has an active paid product, that product covers
    the requested subject, AND the user's email is verified. An unverified
    user stays at free-tier limits even with an active paid product.

    Inconsistent state guard: plan='pro' with NO product_id (e.g. a plan
    flipped by raw SQL, bypassing grant_product()) must never silently
    drop a paying student to free limits. Log loudly and fall back to
    the legacy_full_access subject set while the data gets repaired.
    """
    if user.plan != "pro":
        return False
    if not _subscription_currently_valid(user):
        return False
    if not user.is_email_verified:
        return False
    if not user.product_id:
        logger.warning(
            "⚠️  PLAN_PRODUCT_MISMATCH: user %s (%s) has "
            "plan='pro' but no product_id -- falling back to "
            "legacy_full_access subjects. Fix the data via "
            "POST /admin/users/{user_id}/plan.",
            user.id, user.email,
        )
        return subject in subjects_for_product("legacy_full_access")
    allowed_subjects = subjects_for_product(user.product_id)
    return subject in allowed_subjects


def check_explain_limit(user: User, db: Session, subject: str):
    """
    Raises 403 if the user lacks unlimited access for this subject and
    has exceeded the free daily explain limit. Increments counter on
    success (free-tier usage, or paid-but-out-of-scope usage, both count).
    """
    if _has_unlimited_access(user, subject):
        return
    _reset_if_new_day(user, db)
    if user.daily_explain_count >= FREE_EXPLAIN_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EXPLAIN_LIMIT_REACHED",
                "message": f"Free plan allows {FREE_EXPLAIN_LIMIT} explanations per day. "
                           f"Upgrade to unlock unlimited access for {subject}.",
                "limit": FREE_EXPLAIN_LIMIT,
                "used": user.daily_explain_count,
                "upgrade_url": "/upgrade",
            }
        )
    user.daily_explain_count += 1
    db.commit()


def check_mcq_limit(user: User, db: Session, subject: str):
    """
    Raises 403 if the user lacks unlimited access for this subject and
    has exceeded the free daily MCQ limit.
    """
    if _has_unlimited_access(user, subject):
        return
    _reset_if_new_day(user, db)
    if user.daily_mcq_count >= FREE_MCQ_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "MCQ_LIMIT_REACHED",
                "message": f"Free plan allows {FREE_MCQ_LIMIT} MCQ sessions per day. "
                           f"Upgrade to unlock unlimited access for {subject}.",
                "limit": FREE_MCQ_LIMIT,
                "used": user.daily_mcq_count,
                "upgrade_url": "/upgrade",
            }
        )
    user.daily_mcq_count += 1
    db.commit()


def check_chat_limit(user: User, db: Session, subject: str):
    """
    Raises 403 if the user lacks unlimited access for this subject and
    has exceeded the free daily study-chat message limit. Increments
    counter on success (free-tier usage, or paid-but-out-of-scope usage,
    both count).
    """
    if _has_unlimited_access(user, subject):
        return
    _reset_if_new_day(user, db)
    if user.daily_chat_count >= FREE_CHAT_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "CHAT_LIMIT_REACHED",
                "message": f"Free plan allows {FREE_CHAT_LIMIT} study chat messages per day. "
                           f"Upgrade to unlock unlimited access for {subject}.",
                "limit": FREE_CHAT_LIMIT,
                "used": user.daily_chat_count,
                "upgrade_url": "/upgrade",
            }
        )
    user.daily_chat_count += 1
    db.commit()

FREE_MOCK_TEST_LIMIT = 1


def check_mock_test_limit(user: User, db: Session):
    """
    Mock tests are gated differently from explain/MCQ: a full-length test
    spans multiple subjects, so subject-scoped product access doesn't
    apply cleanly here. Pro + verified email + unexpired subscription =
    unlimited mock tests. Free, unverified, or expired = 1 mock test
    total (lifetime, not daily). Expired attempts (time ran out, never
    submitted) don't count against the free allotment, so an abandoned
    test doesn't lock a student out forever.
    """
    from app.models.mock_test import MockTest

    if user.plan == "pro" and user.is_email_verified and _subscription_currently_valid(user):
        return

    # Atomic check-and-hold: lock the user row (SELECT FOR UPDATE, held
    # until the caller's commit) so two concurrent /start requests cannot
    # both read count 0 and both insert. The second transaction blocks on
    # the lock, then sees the first's row.
    db.query(User).filter(User.id == user.id).with_for_update().one()
    existing_count = (
        db.query(MockTest)
        .filter(MockTest.user_id == user.id, MockTest.status != "expired")
        .count()
    )
    if existing_count >= FREE_MOCK_TEST_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "MOCK_TEST_LIMIT_REACHED",
                "message": f"Free plan allows {FREE_MOCK_TEST_LIMIT} mock test. "
                           f"Upgrade to unlock unlimited mock tests.",
                "limit": FREE_MOCK_TEST_LIMIT,
                "used": existing_count,
                "upgrade_url": "/upgrade",
            }
        )
