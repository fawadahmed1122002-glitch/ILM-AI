import logging

from fastapi import HTTPException
from app.rag.llm_client import LLMGenerationError
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.products import subjects_for_product
from app.models.user import User
from app.services.query_service import QueryService
from app.services.tier_gate import check_explain_limit, check_mcq_limit
from app.schemas.query import (
    ExplainRequest, ExplainResponse,
    McqRequest, McqResponse,
    McqSubmitRequest, McqSubmitResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/mcq/submit", response_model=McqSubmitResponse)
@limiter.limit("20/minute")
def submit_mcqs(
    request: Request,
    payload: McqSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = QueryService.submit_mcqs(
        subject=payload.subject,
        topic=payload.topic,
        answers=payload.answers,
        user=current_user,
        db=db
    )
    return McqSubmitResponse(**result)


@router.get("/progress/me")
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return QueryService.get_progress(user=current_user, db=db)


@router.get("/progress/weak-topics")
def get_weak_topics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = QueryService.get_progress(user=current_user, db=db)
    return {"weak_topics": progress["weak_topics"]}


@router.post("/explain", response_model=ExplainResponse)
@limiter.limit("20/minute")
def explain(
    request: Request,
    payload: ExplainRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    before = current_user.daily_explain_count
    check_explain_limit(current_user, db, subject=payload.subject)
    # Did the gate actually charge this user? (unlimited users pass
    # through without an increment). Captured so a failed generation
    # below can refund exactly what was charged.
    charged = current_user.daily_explain_count != before
    try:
        result = QueryService.explain(
            query=payload.query,
            subject=payload.subject,
            user=current_user,
            db=db
        )
    except LLMGenerationError:
        # Failed generation must not consume free-tier quota: refund the
        # gate's pre-increment.
        if charged:
            db.rollback()
            if current_user.daily_explain_count > 0:
                current_user.daily_explain_count -= 1
                db.commit()
        raise HTTPException(
            status_code=503,
            detail={
                "code": "EXPLANATION_QUALITY_CHECK_FAILED",
                "message": "We couldn't generate a reliable explanation for this topic right now. Please try again in a moment.",
            },
        )
    except Exception:
        if charged:
            db.rollback()
            if current_user.daily_explain_count > 0:
                current_user.daily_explain_count -= 1
                db.commit()
        raise
    return ExplainResponse(**result)


@router.post("/mcqs", response_model=McqResponse)
@limiter.limit("20/minute")
def get_mcqs(
    request: Request,
    payload: McqRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    before = current_user.daily_mcq_count
    check_mcq_limit(current_user, db, subject=payload.subject)
    charged = current_user.daily_mcq_count != before
    try:
        result = QueryService.get_mcqs(
            topic=payload.topic,
            subject=payload.subject,
            user=current_user,
            db=db
        )
    except Exception:
        # Failed generation (live path) must not consume free-tier quota.
        if charged:
            db.rollback()
            if current_user.daily_mcq_count > 0:
                current_user.daily_mcq_count -= 1
                db.commit()
        raise
    return McqResponse(**result)


@router.get("/usage/me")
def get_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns current user's daily usage and limits, plus which subjects
    are unlimited under the user's active product (if any)."""
    from app.services.tier_gate import FREE_EXPLAIN_LIMIT, FREE_MCQ_LIMIT, _reset_if_new_day
    from app.core.products import PRODUCT_CATALOG
    _reset_if_new_day(current_user, db)
    # Mirror the tier gate: pro + verified with no product_id is an
    # inconsistent state -- fall back to legacy subjects (same as
    # _has_unlimited_access) and flag it so the frontend can surface it.
    plan_product_mismatch = (
        current_user.plan == "pro"
        and current_user.is_email_verified
        and not current_user.product_id
    )
    if current_user.plan != "pro" or not current_user.is_email_verified:
        unlimited_subjects = []
    elif plan_product_mismatch:
        logger.warning(
            "PLAN_PRODUCT_MISMATCH: user %s (%s) has plan='pro' but no "
            "product_id -- usage/me falling back to legacy_full_access subjects.",
            current_user.id,
            current_user.email,
        )
        unlimited_subjects = PRODUCT_CATALOG["legacy_full_access"]["subjects"]
    else:
        unlimited_subjects = subjects_for_product(current_user.product_id)
    return {
        "plan": current_user.plan,
        "product_id": current_user.product_id,
        "plan_product_mismatch": plan_product_mismatch,
        "unlimited_subjects": unlimited_subjects,
        "explain": {
            "used": current_user.daily_explain_count,
            "limit": FREE_EXPLAIN_LIMIT,
            "remaining": max(0, FREE_EXPLAIN_LIMIT - current_user.daily_explain_count),
            "note": "limit/remaining only apply to subjects OUTSIDE unlimited_subjects",
        },
        "mcq": {
            "used": current_user.daily_mcq_count,
            "limit": FREE_MCQ_LIMIT,
            "remaining": max(0, FREE_MCQ_LIMIT - current_user.daily_mcq_count),
            "note": "limit/remaining only apply to subjects OUTSIDE unlimited_subjects",
        }
    }


@router.get("/analytics/me")
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return QueryService.get_analytics(user=current_user, db=db)