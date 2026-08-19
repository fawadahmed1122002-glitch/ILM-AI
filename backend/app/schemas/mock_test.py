import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MockTestStartRequest(BaseModel):
    test_type: str  # "subject" | "full_ecat" | "full_mdcat"
    subject: Optional[str] = None  # required when test_type == "subject"


class MockTestQuestionOut(BaseModel):
    mcq_id: uuid.UUID
    question_order: int
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

    class Config:
        from_attributes = True


class MockTestStartResponse(BaseModel):
    id: uuid.UUID
    test_type: str
    subject: Optional[str] = None
    question_count: int
    time_limit_minutes: int
    started_at: datetime
    questions: list[MockTestQuestionOut]


class MockTestAnswerIn(BaseModel):
    mcq_id: uuid.UUID
    selected_option: str
    time_spent_ms: Optional[int] = None


class MockTestSubmitRequest(BaseModel):
    answers: list[MockTestAnswerIn]


class MockTestSubmitResponse(BaseModel):
    id: uuid.UUID
    score: int
    correct_count: int
    question_count: int
    submitted_at: datetime


class MockTestResultQuestion(BaseModel):
    mcq_id: uuid.UUID
    question_order: int
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
    selected_option: Optional[str] = None
    is_correct: Optional[bool] = None


class MockTestResultsResponse(BaseModel):
    id: uuid.UUID
    test_type: str
    subject: Optional[str] = None
    question_count: int
    score: Optional[int] = None
    correct_count: Optional[int] = None
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    questions: list[MockTestResultQuestion]


class MockTestListItem(BaseModel):
    id: uuid.UUID
    test_type: str
    subject: Optional[str] = None
    question_count: int
    score: Optional[int] = None
    correct_count: Optional[int] = None
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MockTestDetailQuestion(BaseModel):
    mcq_id: uuid.UUID
    question_order: int
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
    selected_option: Optional[str] = None


class MockTestDetailResponse(BaseModel):
    id: uuid.UUID
    test_type: str
    subject: Optional[str] = None
    question_count: int
    time_limit_minutes: int
    status: str
    started_at: datetime
    questions: list[MockTestDetailQuestion]


class MockTestAnswerSaveRequest(BaseModel):
    mcq_id: uuid.UUID
    selected_option: str
    time_spent_ms: Optional[int] = None
