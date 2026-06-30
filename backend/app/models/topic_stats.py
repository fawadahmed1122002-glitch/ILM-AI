import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, SmallInteger, Integer, Numeric, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class TopicStats(Base):
    __tablename__ = "topic_stats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    chapter_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    total_attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    # accuracy is a DB-generated column (STORED) - read-only from the ORM side
    accuracy: Mapped[Decimal] = mapped_column(Numeric(5, 2), insert_default=None)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))