from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, MeResponse,
    VerifyEmailResponse, ResendVerificationRequest,
)
from app.db.session import get_db
from app.repositories.user_repo import UserRepository
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user
from app.core.academic_fields import tests_for_field
from app.services.email_verification_service import (
    create_verification_token, verify_token, send_verification_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    if repo.email_exists(payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    interested_tests = payload.interested_tests
    if not interested_tests and payload.field:
         interested_tests = tests_for_field(payload.field)
    user = repo.create(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        age=payload.age,
        interested_tests=interested_tests,
        subjects=payload.subjects,
        field=payload.field
    )

    # Send verification email. Failure to send does NOT block registration
    # -- the account is still created and usable at free-tier limits; the
    # user can request a resend later if this attempt fails silently
    # (e.g. Resend down, or domain not yet verified for this recipient).
    verification_token = create_verification_token(user, db)
    send_verification_email(user, verification_token)

    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        plan=user.plan,
        field=user.field,
        interested_tests=user.interested_tests,
        subjects=user.subjects,
        is_email_verified=user.is_email_verified,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    user = repo.get_by_email(payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        plan=user.plan,
        field=user.field,
        interested_tests=user.interested_tests,
        subjects=user.subjects,
        is_email_verified=user.is_email_verified,
    )


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's current state -- used by the
    frontend to refresh plan/profile info without requiring a full
    re-login (e.g. after a payment completes and plan flips to pro)."""
    return MeResponse(
        user_id=str(current_user.id),
        full_name=current_user.full_name,
        email=current_user.email,
        plan=current_user.plan,
        field=current_user.field,
        interested_tests=current_user.interested_tests,
        subjects=current_user.subjects,
        is_email_verified=current_user.is_email_verified,
    )


@router.get("/verify-email", response_model=VerifyEmailResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Public endpoint -- the link clicked from the verification email hits
    this route directly. No auth required since the token itself IS the
    proof of identity for this one action.
    """
    success, message = verify_token(token, db)
    return VerifyEmailResponse(success=success, message=message)


@router.post("/resend-verification", response_model=VerifyEmailResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """
    Public endpoint (not auth-gated) so a user who's stuck unverified and
    maybe having trouble logging in can still request a resend. Always
    returns a generic success-shaped message regardless of whether the
    email exists, to avoid leaking which emails are registered.
    """
    repo = UserRepository(db)
    user = repo.get_by_email(payload.email)

    if not user:
        # Same response whether or not the account exists -- don't leak
        # registered-email information to an unauthenticated caller.
        return VerifyEmailResponse(success=True, message="If that email is registered, a verification link has been sent.")

    if user.is_email_verified:
        return VerifyEmailResponse(success=True, message="This email is already verified.")

    verification_token = create_verification_token(user, db)
    send_verification_email(user, verification_token)

    return VerifyEmailResponse(success=True, message="If that email is registered, a verification link has been sent.")