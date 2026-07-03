from pydantic import BaseModel, field_validator


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
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 500:
            raise ValueError("Query must be under 500 characters")
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
    question_en: str
    question_ur: str
    opt_a: str
    opt_b: str
    opt_c: str
    opt_d: str
    correct: str
    explanation_en: str
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
        v = v.strip()
        if not v:
            raise ValueError("Topic cannot be empty")
        if len(v) > 500:
            raise ValueError("Topic must be under 500 characters")
        return v

class McqResponse(BaseModel):
    mcqs: list[McqItem]
    subject: str
    topic: str
    count: int