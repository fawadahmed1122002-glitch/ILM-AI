import re
from pydantic import BaseModel, EmailStr, field_validator

VALID_TESTS = {"ECAT", "MDCAT", "NET", "FAST", "Other"}
PK_PHONE_RE = re.compile(r"^(?:\+92|0)3\d{9}$")

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None
    age: int | None = None
    interested_tests: list[str] | None = None

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

    @field_validator("interested_tests")
    @classmethod
    def validate_tests(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        invalid = set(v) - VALID_TESTS
        if invalid:
            raise ValueError(f"Invalid test(s): {', '.join(invalid)}. Must be one of: {', '.join(VALID_TESTS)}")
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
    