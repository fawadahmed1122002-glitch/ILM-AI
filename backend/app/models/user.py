import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="student")
    plan: Mapped[str] = mapped_column(String(20), nullable=False, server_default="free")
    language_pref: Mapped[str] = mapped_column(String(10), server_default="both")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    daily_explain_count: Mapped[int] = mapped_column(server_default="0")
    daily_mcq_count: Mapped[int] = mapped_column(server_default="0")
    last_reset_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)