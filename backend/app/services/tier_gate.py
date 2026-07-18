"""
PrepXMentor Tier Gate Service
Enforces free tier limits: 3 explanations/day, 5 MCQ sessions/day.
Pro users have unlimited access.
"""

from datetime import date
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import User

FREE_EXPLAIN_LIMIT = 3
FREE_MCQ_LIMIT = 5


def _reset_if_new_day(user: User, db: Session):
    """Reset daily counters if it's a new day."""
    today = date.today()
    last_reset = user.last_reset_date if isinstance(user.last_reset_date, __import__('datetime').date) else (user.last_reset_date.date() if user.last_reset_date else None)

    if last_reset != today:
        user.daily_explain_count = 0
        user.daily_mcq_count = 0
        user.last_reset_date = today
        db.commit()


def check_explain_limit(user: User, db: Session):
    """
    Raises 403 if free user has exceeded daily explain limit.
    Increments counter on success.
    """
    if user.plan == "pro":
        return

    _reset_if_new_day(user, db)

    if user.daily_explain_count >= FREE_EXPLAIN_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EXPLAIN_LIMIT_REACHED",
                "message": f"Free plan allows {FREE_EXPLAIN_LIMIT} explanations per day.",
                "limit": FREE_EXPLAIN_LIMIT,
                "used": user.daily_explain_count,
                "upgrade_url": "/upgrade",
            }
        )

    user.daily_explain_count += 1
    db.commit()


def check_mcq_limit(user: User, db: Session):
    """
    Raises 403 if free user has exceeded daily MCQ limit.
    Increments counter on success.
    """
    if user.plan == "pro":
        return

    _reset_if_new_day(user, db)

    if user.daily_mcq_count >= FREE_MCQ_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "MCQ_LIMIT_REACHED",
                "message": f"Free plan allows {FREE_MCQ_LIMIT} MCQ sessions per day.",
                "limit": FREE_MCQ_LIMIT,
                "used": user.daily_mcq_count,
                "upgrade_url": "/upgrade",
            }
        )

    user.daily_mcq_count += 1
    db.commit()
