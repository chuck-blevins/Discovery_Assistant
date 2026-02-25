"""Persona ORM model — one per project for persona-buildout objective (Story 5-2)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Persona(Base):
    __tablename__ = "personas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    confidence_score: Mapped[float | None] = mapped_column(Float(), nullable=True)
    name_title: Mapped[str | None] = mapped_column(Text(), nullable=True)
    goals: Mapped[str | None] = mapped_column(Text(), nullable=True)
    pain_points: Mapped[str | None] = mapped_column(Text(), nullable=True)
    decision_drivers: Mapped[str | None] = mapped_column(Text(), nullable=True)
    false_beliefs: Mapped[str | None] = mapped_column(Text(), nullable=True)
    job_to_be_done: Mapped[str | None] = mapped_column(Text(), nullable=True)
    usage_patterns: Mapped[str | None] = mapped_column(Text(), nullable=True)
    objections: Mapped[str | None] = mapped_column(Text(), nullable=True)
    success_metrics: Mapped[str | None] = mapped_column(Text(), nullable=True)
    field_quality: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    last_analyzed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Persona(id={self.id}, project_id={self.project_id})>"
