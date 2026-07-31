import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class DocumentUploadResponse(BaseModel):
    id: uuid.UUID
    subject: str
    chapter_number: int
    chapter_title: str
    status: str
    chunk_count: int
    created_at: datetime
    class Config:
        from_attributes = True


class PendingMcqResponse(BaseModel):
    id: uuid.UUID
    subject: str
    chapter_number: int
    topic: Optional[str] = None
    difficulty: str
    question_text: str
    question_text_ur: Optional[str] = None
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: Optional[str] = None
    class Config:
        from_attributes = True


class McqRejectRequest(BaseModel):
    reason: str


class AdminPlanChangeRequest(BaseModel):
    plan: str  # "free" or "pro"
    method: str  # "jazzcash", "easypaisa", "manual"
    amount: float
    transaction_ref: Optional[str] = None
    product_id: Optional[str] = None  # e.g. "ecat", "mdcat", "engineering_bundle" -- if omitted, falls back to legacy_full_access


class PaymentRecordResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    currency: str
    method: str
    status: str
    transaction_ref: Optional[str] = None
    plan: Optional[str] = None
    product_id: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True
