from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.query import ExplainRequest, ExplainResponse
from app.services.query_service import QueryService
from app.services.tier_gate import check_explain_limit, check_mcq_limit
from app.schemas.query import ExplainRequest, ExplainResponse, McqRequest, McqResponse

router = APIRouter(prefix="/query", tags=["query"])

from app.schemas.query import (
    ExplainRequest, ExplainResponse,
    McqRequest, McqResponse,
    McqSubmitRequest, McqSubmitResponse
)

@router.post("/mcq/submit", response_model=McqSubmitResponse)
def submit_mcqs(
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
def explain(
    payload: ExplainRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_explain_limit(current_user, db)
    result = QueryService.explain(
        query=payload.query,
        subject=payload.subject,
        user=current_user,
        db=db
    )
    return ExplainResponse(**result)
@router.post("/mcqs", response_model=McqResponse)
def get_mcqs(
    payload: McqRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_mcq_limit(current_user, db)
    result = QueryService.get_mcqs(
        topic=payload.topic,
        subject=payload.subject,
        user=current_user,
        db=db
    )
    return McqResponse(**result)

@router.get("/usage/me")
def get_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns current user's daily usage and limits."""
    from app.services.tier_gate import FREE_EXPLAIN_LIMIT, FREE_MCQ_LIMIT, _reset_if_new_day
    _reset_if_new_day(current_user, db)
    return {
        "plan": current_user.plan,
        "explain": {
            "used": current_user.daily_explain_count,
            "limit": None if current_user.plan == "pro" else FREE_EXPLAIN_LIMIT,
            "remaining": None if current_user.plan == "pro" else max(0, FREE_EXPLAIN_LIMIT - current_user.daily_explain_count),
        },
        "mcq": {
            "used": current_user.daily_mcq_count,
            "limit": None if current_user.plan == "pro" else FREE_MCQ_LIMIT,
            "remaining": None if current_user.plan == "pro" else max(0, FREE_MCQ_LIMIT - current_user.daily_mcq_count),
        }
    }
