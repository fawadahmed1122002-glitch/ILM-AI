# backend/app/api/v1/internal.py
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.payment_service import grant_pro_plan, grant_product
from app.core.products import PRODUCT_CATALOG
from app.schemas.admin import PaymentRecordResponse

router = APIRouter(prefix="/internal", tags=["internal"])

INTERNAL_SERVICE_SECRET = os.environ.get("INTERNAL_SERVICE_SECRET")


def verify_internal_secret(x_internal_secret: str = Header(...)):
    if not INTERNAL_SERVICE_SECRET:
        raise HTTPException(status_code=500, detail="INTERNAL_SERVICE_SECRET not configured on server")
    if x_internal_secret != INTERNAL_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid internal service secret")


class InternalGrantPlanRequest(BaseModel):
    user_id: str
    amount: float | None = None
    product_id: str | None = None
    transaction_ref: str | None = None


@router.post("/grant-pro-plan", response_model=PaymentRecordResponse)
def internal_grant_pro_plan(
    payload: InternalGrantPlanRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_secret),
):
    """
    Called ONLY by the Next.js Safepay webhook handler, server-to-server,
    authenticated via a shared secret header. If product_id is given and
    valid, delegates to grant_product(); otherwise falls back to the
    legacy grant_pro_plan() (assigns "legacy_full_access") for backward
    compatibility with any caller that predates the product model.
    """
    try:
        if payload.product_id and payload.product_id in PRODUCT_CATALOG:
            payment = grant_product(
                db=db,
                user_id=uuid.UUID(payload.user_id),
                product_id=payload.product_id,
                amount=payload.amount,
                method="safepay",
                transaction_ref=payload.transaction_ref,
            )
        else:
            if payload.amount is None:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "MISSING_AMOUNT", "message": "amount is required when product_id is missing/unknown"},
                )
            payment = grant_pro_plan(
                db=db,
                user_id=uuid.UUID(payload.user_id),
                amount=payload.amount,
                method="safepay",
                transaction_ref=payload.transaction_ref,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"code": "GRANT_FAILED", "message": str(e)})

    return payment
