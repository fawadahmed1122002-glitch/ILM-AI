import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ChatStartRequest(BaseModel):
    session_id: Optional[str] = None
    subject: str
    topic: str


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
