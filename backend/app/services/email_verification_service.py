"""
Email verification service.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import resend
from app.models.user import User
from app.models.email_verification import EmailVerification

TOKEN_EXPIRY_HOURS = 24

resend.api_key = os.environ.get("RESEND_API_KEY")

# Until a custom domain is verified in Resend, this MUST stay
# "onboarding@resend.dev" -- Resend's shared test sender, which can only
# deliver to the email address the Resend account itself was signed up
# with. Once a real domain (e.g. noreply@prepxmentor.pk) is verified in
# the Resend dashboard, set RESEND_SENDER_EMAIL to that address so real
# students can actually receive the email.
SENDER_EMAIL = os.environ.get("RESEND_SENDER_EMAIL", "onboarding@resend.dev")


def create_verification_token(user: User, db: Session) -> str:
    """
    Generates a new verification token for the user, stores it, and
    returns it. Any previous unused tokens for this user remain valid
    until they expire naturally (simplest approach for MVP -- avoids
    invalidating a token the user might already have open in their inbox
    if they request a resend).
    """
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)

    record = EmailVerification(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()

    return token


def verify_token(token: str, db: Session) -> tuple[bool, str]:
    """
    Validates a verification token. Returns (success, message).
    On success, marks the token used and sets user.is_email_verified = True.
    """
    record = db.query(EmailVerification).filter(EmailVerification.token == token).first()

    if not record:
        return False, "Invalid verification link."

    if record.used_at is not None:
        return False, "This verification link has already been used."

    if record.expires_at < datetime.now(timezone.utc):
        return False, "This verification link has expired. Please request a new one."

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        return False, "Account not found."

    record.used_at = datetime.now(timezone.utc)
    user.is_email_verified = True
    db.commit()

    return True, "Email verified successfully."


def send_verification_email(user: User, token: str) -> None:
    """
    Sends the verification email via Resend. Does NOT raise on failure --
    registration should succeed even if the email send fails (e.g. Resend
    is down, or the domain isn't verified yet for a non-test recipient).
    Failures are logged so they're visible in Railway logs, matching the
    same "log but don't block" pattern used for the Safepay webhook grant
    failures earlier in this project.
    """
    verify_url = f"{_get_frontend_url()}/verify-email?token={token}"

    try:
        resend.Emails.send({
            "from": f"PrepXMentor <{SENDER_EMAIL}>",
            "to": [user.email],
            "subject": "Verify your PrepXMentor account",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #0d9488;">Welcome to PrepXMentor!</h2>
                    <p>Hi {user.full_name},</p>
                    <p>Please verify your email address to unlock full access to your account.</p>
                    <p style="margin: 24px 0;">
                        <a href="{verify_url}"
                           style="background: #0d9488; color: white; padding: 12px 24px;
                                  border-radius: 8px; text-decoration: none; font-weight: 600;">
                            Verify My Email
                        </a>
                    </p>
                    <p style="color: #64748b; font-size: 13px;">
                        This link expires in {TOKEN_EXPIRY_HOURS} hours. If you didn't create a
                        PrepXMentor account, you can safely ignore this email.
                    </p>
                </div>
            """,
        })
        print(f"📧 Verification email sent to {user.email}")
    except Exception as e:
        print(f"⚠️  Failed to send verification email to {user.email}: {e}")


def _get_frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:3000")