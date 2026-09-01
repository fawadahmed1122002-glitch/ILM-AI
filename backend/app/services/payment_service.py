# backend/app/services/payment_service.py
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.payment import Payment
from app.core.products import get_product, price_for_product

PRO_PLAN_DURATION_DAYS = 30
ALLOWED_METHODS = ["jazzcash", "easypaisa", "manual", "safepay"]


def _is_completed_ref_conflict(exc: IntegrityError) -> bool:
    """True if this IntegrityError is a violation of the partial unique
    index uq_payments_completed_transaction_ref (migration 009) -- i.e.
    a completed payment with this transaction_ref already exists."""
    diag = getattr(getattr(exc, "orig", None), "diag", None)
    constraint = getattr(diag, "constraint_name", None)
    if constraint:
        return constraint == "uq_payments_completed_transaction_ref"
    return "uq_payments_completed_transaction_ref" in str(exc)


def grant_product(
    db: Session,
    user_id: uuid.UUID,
    product_id: str,
    method: str,
    amount: float | None = None,
    transaction_ref: str | None = None,
) -> Payment:
    """
    Grants a specific product to a user (REPLACE model -- overwrites any
    previously active product_id, matches the "one active product at a
    time" decision) and writes an audit entry to the payments table.

    Shared by the manual admin route (/admin/users/{id}/plan) and the
    automated Safepay webhook path -- both call this so grant logic can't
    drift between the two entry points.

    amount is optional -- if not provided, uses the product's catalog
    price (price_for_product). Passing amount explicitly is still
    supported for manual admin grants where the real amount paid outside
    the system might differ from the catalog price (e.g. a discount).
    """
    if method not in ALLOWED_METHODS:
        raise ValueError(f"Method must be one of: {', '.join(ALLOWED_METHODS)}")

    product = get_product(product_id)
    if not product:
        raise ValueError(f"Unknown product_id: {product_id}")

    resolved_amount = amount if amount is not None else price_for_product(product_id)
    if resolved_amount is None or resolved_amount < 0:
        raise ValueError("Amount cannot be negative or unresolved")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")

    # Idempotency guard: a replayed webhook with the same transaction_ref
    # must not create a duplicate payment or extend the subscription.
    if transaction_ref:
        existing = (
            db.query(Payment)
            .filter(
                Payment.transaction_ref == transaction_ref,
                Payment.status == "completed",
            )
            .first()
        )
        if existing:
            return existing

    # REPLACE model: this overwrites any previously active product.
    user.plan = "pro"
    user.product_id = product_id

    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=PRO_PLAN_DURATION_DAYS)

    payment = Payment(
        user_id=user.id,
        amount=resolved_amount,
        currency="PKR",
        method=method,
        status="completed",
        transaction_ref=transaction_ref,
        plan="pro",
        product_id=product_id,
        valid_from=now,
        valid_until=valid_until,
    )
    db.add(payment)
    try:
        db.commit()
    except IntegrityError as exc:
        # DB-level backstop for the idempotency guard above: two concurrent
        # webhooks with the same transaction_ref can both pass the SELECT
        # check, but the partial unique index lets only one INSERT win.
        # The rollback also reverts the user.plan/product_id changes made
        # in this session, so the loser grants nothing -- then we return
        # the winning payment, same contract as the app-level check.
        db.rollback()
        if transaction_ref and _is_completed_ref_conflict(exc):
            existing = (
                db.query(Payment)
                .filter(
                    Payment.transaction_ref == transaction_ref,
                    Payment.status == "completed",
                )
                .first()
            )
            if existing:
                return existing
        raise
    db.refresh(payment)

    return payment


def grant_pro_plan(
    db: Session,
    user_id: uuid.UUID,
    amount: float,
    method: str,
    transaction_ref: str | None = None,
) -> Payment:
    """
    DEPRECATED, kept for backward compatibility only. Grants the
    'legacy_full_access' product -- same behavior as before the product
    model existed (unlimited access to everything). New code should call
    grant_product() with a real product_id instead.
    """
    return grant_product(
        db=db,
        user_id=user_id,
        product_id="legacy_full_access",
        method=method,
        amount=amount,
        transaction_ref=transaction_ref,
    )