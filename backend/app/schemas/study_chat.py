import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

# Display case, matching the subject metadata actually stored in ChromaDB
# and the subject lists used by the rest of the app (schemas/query.py,
# schemas/auth.py, admin.py, mock_tests.py). The persisted
# study_chat_threads.subject is passed straight through as the ChromaDB
# `where` filter in retrieve_top_chunks and as the tier-gate subject, so it
# must be byte-identical to those display-case values.
# "English" is deliberately absent: it has no ingested content yet.
VALID_SUBJECTS = {"Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"}

# Lookup from a case/whitespace-folded input to its canonical display form.
_CANONICAL_SUBJECTS = {s.strip().lower(): s for s in VALID_SUBJECTS}


class ChatStartRequest(BaseModel):
    session_id: Optional[str] = None
    subject: str = Field(max_length=100)
    topic: str = Field(max_length=100)

    @field_validator("subject")
    @classmethod
    def subject_must_be_valid(cls, v: str) -> str:
        # Accept the subject case-insensitively but RETURN the canonical
        # display-case spelling: the old version validated the folded form
        # while passing the original value through, so anything not typed
        # exactly as ChromaDB stores it (e.g. "Computer Science") either
        # 422'd or silently retrieved zero chunks.
        canonical = _CANONICAL_SUBJECTS.get(v.strip().lower())
        if canonical is None:
            raise ValueError(
                f"subject must be one of: {', '.join(sorted(VALID_SUBJECTS))}"
            )
        return canonical


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
