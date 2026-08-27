from pydantic import BaseModel, field_validator
from app.core.sanitize import sanitize_text, contains_injection_attempt


VALID_SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"]


class ExplainRequest(BaseModel):
    subject: str
    query: str

    @field_validator("subject")
    @classmethod
    def subject_must_be_valid(cls, v):
        if v not in VALID_SUBJECTS:
            raise ValueError(f"Subject must be one of: {', '.join(VALID_SUBJECTS)}")
        return v

    @field_validator("query")
    @classmethod
    def query_must_not_be_empty(cls, v):
        v = sanitize_text(v)
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 500:
            raise ValueError("Query must be under 500 characters")
        if contains_injection_attempt(v):
            raise ValueError("Query contains disallowed content. Please rephrase your question.")
        return v


class ExplainResponse(BaseModel):
    explanation: str
    normalized_query: str
    subject: str
    cached: bool = False

class McqOption(BaseModel):
    a: str
    b: str
    c: str
    d: str

class McqItem(BaseModel):
    id: str | None = None  # bank MCQ id; absent for live-generated sets
    question_en: str
    question_ur: str
    opt_a: str
    opt_b: str
    opt_c: str
    opt_d: str
    # NOTE: correct / explanation_en are intentionally NOT exposed here --
    # shipping answers with the questions let students read them before
    # answering. Grading happens server-side on /mcq/submit instead.
    difficulty: str

class McqRequest(BaseModel):
    subject: str
    topic: str

    @field_validator("subject")
    @classmethod
    def subject_must_be_valid(cls, v):
        if v not in VALID_SUBJECTS:
            raise ValueError(f"Subject must be one of: {', '.join(VALID_SUBJECTS)}")
        return v

    @field_validator("topic")
    @classmethod
    def topic_must_not_be_empty(cls, v):
        v = sanitize_text(v)
        if not v:
            raise ValueError("Topic cannot be empty")
        if len(v) > 500:
            raise ValueError("Topic must be under 500 characters")
        if contains_injection_attempt(v):
            raise ValueError("Topic contains disallowed content. Please rephrase your question.")
        return v

class McqResponse(BaseModel):
    mcqs: list[McqItem]
    subject: str
    topic: str
    count: int
    source: str = "live"

class McqSubmitItem(BaseModel):
    mcq_index: int
    mcq_id: str | None = None  # bank MCQ id; server recomputes is_correct from it
    selected_option: str
    is_correct: bool
    time_spent_ms: int | None = None

class McqSubmitRequest(BaseModel):
    subject: str
    topic: str
    answers: list[McqSubmitItem]

class McqGradedQuestion(BaseModel):
    """Per-question grading feedback, revealed only AFTER submission --
    the fetch endpoint intentionally withholds answers/explanations."""
    mcq_index: int
    is_correct: bool
    correct_option: str | None = None
    explanation_en: str | None = None

class McqSubmitResponse(BaseModel):
    total: int
    correct: int
    score_percent: float
    weak_topic: bool
    questions: list[McqGradedQuestion] = []
