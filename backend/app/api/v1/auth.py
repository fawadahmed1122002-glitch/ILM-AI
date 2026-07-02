from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.user_repo import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    if repo.email_exists(payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = repo.create(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
    )
    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        full_name=user.full_name,
        plan=user.plan,
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
        plan=user.plan,
    )


@router.get("/me", response_model=TokenResponse)
def me(db: Session = Depends(get_db)):
    """Placeholder — protected by get_current_user in next step."""
    pass