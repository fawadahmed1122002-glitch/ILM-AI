import uuid
from sqlalchemy import Boolean, CHAR, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class PastPaperAnswer(Base):
    __tablename__ = "past_paper_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    attempt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("past_paper_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("past_paper_questions.id", ondelete="CASCADE"), nullable=False)
    selected_option: Mapped[str | None] = mapped_column(CHAR(1), nullable=True)  # 'A' | 'B' | 'C' | 'D'
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
