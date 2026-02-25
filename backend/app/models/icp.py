"""ICP ORM model — one per project for icp-refinement objective (Story 5-3)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Icp(Base):
    __tablename__ = "icps"

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
    company_size: Mapped[str | None] = mapped_column(Text(), nullable=True)
    industries: Mapped[str | None] = mapped_column(Text(), nullable=True)
    geography: Mapped[str | None] = mapped_column(Text(), nullable=True)
    revenue: Mapped[str | None] = mapped_column(Text(), nullable=True)
    tech_stack: Mapped[str | None] = mapped_column(Text(), nullable=True)
    use_case_fit: Mapped[str | None] = mapped_column(Text(), nullable=True)
    buying_process: Mapped[str | None] = mapped_column(Text(), nullable=True)
    budget: Mapped[str | None] = mapped_column(Text(), nullable=True)
    maturity: Mapped[str | None] = mapped_column(Text(), nullable=True)
    custom: Mapped[str | None] = mapped_column(Text(), nullable=True)
    dimension_confidence: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
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
        return f"<Icp(id={self.id}, project_id={self.project_id})>"
