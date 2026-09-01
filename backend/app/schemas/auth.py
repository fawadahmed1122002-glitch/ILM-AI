import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.academic_fields import VALID_FIELDS

VALID_TESTS = {"ECAT", "MDCAT", "NET", "FAST", "Other"}
VALID_SUBJECTS = {"Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"}
PK_PHONE_RE = re.compile(r"^(?:\+92|0)3\d{9}$")


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    phone: str | None = None
    age: int | None = None
    subjects: list[str] | None = None
    interested_tests: list[str] | None = None
    # `field` kept for backward compatibility with the old single-field
    # picker. No longer shown on the registration form -- new signups use
    # explicit `subjects` + `interested_tests` multi-select instead. If a
    # legacy caller still sends `field`, it's still validated and stored,
    # but it no longer drives subject access on its own (see
    # subjectsForField() on the frontend, which now checks `subjects` first).
    field: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        cleaned = v.replace(" ", "").replace("-", "")
        if not PK_PHONE_RE.match(cleaned):
            raise ValueError("Phone must be a valid Pakistani mobile number, e.g. 03001234567 or +923001234567")
        # Normalize to +92 format for consistent storage
        if cleaned.startswith("0"):
            cleaned = "+92" + cleaned[1:]
        return cleaned

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int | None) -> int | None:
        if v is None:
            return None
        if not (13 <= v <= 60):
            raise ValueError("Age must be between 13 and 60")
        return v

    @field_validator("subjects")
    @classmethod
    def validate_subjects(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        if len(v) == 0:
            raise ValueError("Select at least one subject")
        invalid = set(v) - VALID_SUBJECTS
        if invalid:
            raise ValueError(f"Invalid subject(s): {', '.join(invalid)}. Must be one of: {', '.join(sorted(VALID_SUBJECTS))}")
        return v

    @field_validator("interested_tests")
    @classmethod
    def validate_tests(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        if len(v) == 0:
            raise ValueError("Select at least one entry test")
        invalid = set(v) - VALID_TESTS
        if invalid:
            raise ValueError(f"Invalid test(s): {', '.join(invalid)}. Must be one of: {', '.join(VALID_TESTS)}")
        return v

    @field_validator("field")
    @classmethod
    def validate_field(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if v not in VALID_FIELDS:
            raise ValueError(f"Invalid field: {v}. Must be one of: {', '.join(sorted(VALID_FIELDS))}")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str
    plan: str
    field: str | None = None
    subjects: list[str] | None = None
    interested_tests: list[str] | None = None
    is_email_verified: bool = False
    # Registration diagnostic (track selection) -- NULL for users who
    # skipped the flow or registered before it existed. Personalization
    # only, never affects tier-gating.
    target_tracks: list[str] | None = None
    current_class: str | None = None
    diagnostic_completed_at: datetime | None = None
    # Only meaningful on /auth/register: False when the signup verification
    # email could not be sent, so the frontend can prompt a resend instead
    # of the student waiting for an email that never went out.
    verification_email_sent: bool = True


class MeResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    plan: str
    field: str | None = None
    subjects: list[str] | None = None
    interested_tests: list[str] | None = None
    is_email_verified: bool = False
    target_tracks: list[str] | None = None
    current_class: str | None = None
    diagnostic_completed_at: datetime | None = None


class VerifyEmailResponse(BaseModel):
    success: bool
    message: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr