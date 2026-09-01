from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.schemas.user import DiagnosticRequest, DiagnosticResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/me/diagnostic", response_model=DiagnosticResponse)
@limiter.limit("10/minute")
def save_diagnostic(
    request: Request,
    payload: DiagnosticRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Saves the registration diagnostic (target track selection + current
    class). Called right after signup from the /diagnostic screen, and
    reused by /settings so the choice is never one-time-only.

    Purely additive personalization data: tier-gating and subject-access
    logic never read these columns, and skipping the flow (never calling
    this endpoint) leaves them NULL without breaking anything.
    """
    current_user.target_tracks = payload.target_tracks
    current_user.current_class = payload.current_class
    current_user.diagnostic_completed_at = datetime.now(timezone.utc)
    current_user.updated_at = current_user.diagnostic_completed_at
    db.commit()
    db.refresh(current_user)
    return DiagnosticResponse(
        target_tracks=current_user.target_tracks or [],
        current_class=current_user.current_class,
        diagnostic_completed_at=current_user.diagnostic_completed_at,
    )
