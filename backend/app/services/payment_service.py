# backend/app/services/payment_service.py

import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.payment import Payment

PRO_PLAN_DURATION_DAYS = 30
ALLOWED_METHODS = ["jazzcash", "easypaisa", "manual", "safepay"]


def grant_pro_plan(
    db: Session,
    user_id: uuid.UUID,
    amount: float,
    method: str,
    transaction_ref: str | None = None,
) -> Payment:
    """
    Flips a user to Pro and writes an audit entry to the payments table.
    Shared by the manual admin route (/admin/users/{id}/plan) and the
    automated Safepay webhook path -- both call this exact function so
    plan-grant logic can't drift between the two entry points.
    """
    if method not in ALLOWED_METHODS:
        raise ValueError(f"Method must be one of: {', '.join(ALLOWED_METHODS)}")
    if amount < 0:
        raise ValueError("Amount cannot be negative")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")

    user.plan = "pro"

    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=PRO_PLAN_DURATION_DAYS)

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency="PKR",
        method=method,
        status="completed",
        transaction_ref=transaction_ref,
        plan="pro",
        valid_from=now,
        valid_until=valid_until,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment