from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.query import ExplainRequest, ExplainResponse
from app.services.query_service import QueryService

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/explain", response_model=ExplainResponse)
def explain(
    payload: ExplainRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = QueryService.explain(
        query=payload.query,
        subject=payload.subject,
        user=current_user,
        db=db
    )
    return ExplainResponse(**result)