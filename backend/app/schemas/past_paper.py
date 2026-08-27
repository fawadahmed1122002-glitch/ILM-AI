import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PastPaperListItem(BaseModel):
    id: uuid.UUID
    exam_type: str
    university: str
    year: int
    total_questions: int
    duration_minutes: int
    status: str

    class Config:
        from_attributes = True


class PastPaperQuestionOut(BaseModel):
    question_id: uuid.UUID
    question_number: int
    subject_tag: Optional[str] = None
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str

    class Config:
        from_attributes = True


class PastPaperStartResponse(BaseModel):
    attempt_id: uuid.UUID
    paper_id: uuid.UUID
    exam_type: str
    university: str
    year: int
    question_count: int
    duration_minutes: int
    started_at: datetime
    questions: list[PastPaperQuestionOut]


class PastPaperDetailQuestion(PastPaperQuestionOut):
    selected_option: Optional[str] = None


class PastPaperAttemptDetailResponse(BaseModel):
    attempt_id: uuid.UUID
    paper_id: uuid.UUID
    exam_type: str
    university: str
    year: int
    question_count: int
    duration_minutes: int
    status: str
    started_at: datetime
    questions: list[PastPaperDetailQuestion]


class PastPaperAnswerSaveRequest(BaseModel):
    question_id: uuid.UUID
    selected_option: str


class PastPaperSubmitResponse(BaseModel):
    attempt_id: uuid.UUID
    paper_id: uuid.UUID
    score: int
    correct_count: int
    question_count: int
    time_taken_seconds: int
    submitted_at: datetime


class PastPaperResultQuestion(BaseModel):
    question_id: uuid.UUID
    question_number: int
    subject_tag: Optional[str] = None
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    selected_option: Optional[str] = None
    is_correct: Optional[bool] = None


class PastPaperResultsResponse(BaseModel):
    attempt_id: uuid.UUID
    paper_id: uuid.UUID
    exam_type: str
    university: str
    year: int
    question_count: int
    score: Optional[int] = None
    correct_count: Optional[int] = None
    time_taken_seconds: Optional[int] = None
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    questions: list[PastPaperResultQuestion]
