import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

VALID_SUBJECTS = {"biology", "chemistry", "physics", "computer_science", "mathematics"}


class ChatStartRequest(BaseModel):
    session_id: Optional[str] = None
    subject: str = Field(max_length=100)
    topic: str = Field(max_length=100)

    @field_validator("subject")
    @classmethod
    def subject_must_be_valid(cls, v: str) -> str:
        if v.strip().lower() not in VALID_SUBJECTS:
            raise ValueError(
                f"subject must be one of: {', '.join(sorted(VALID_SUBJECTS))}"
            )
        return v


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatStartResponse(BaseModel):
    thread_id: uuid.UUID
    subject: str
    topic: str
    created: bool
    messages: list[ChatMessageOut]


class ChatThreadResponse(BaseModel):
    thread_id: uuid.UUID
    subject: str
    topic: str
    messages: list[ChatMessageOut]


class ChatSendRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class ChatSendResponse(BaseModel):
    thread_id: uuid.UUID
    user_message_id: uuid.UUID
    message_id: uuid.UUID
    response: str
