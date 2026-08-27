import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class PastPaper(Base):
    __tablename__ = "past_papers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    exam_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "ECAT"
    university: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. "UET Lahore"
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[str | None] = mapped_column(String(30), nullable=True)  # e.g. "Phase I"
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    source_pdf_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="draft")  # "draft" | "verified" | "published"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
