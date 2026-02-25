"""Analysis ORM model — maps to the analyses table."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    objective: Mapped[str] = mapped_column(Text(), nullable=False)
    confidence_score: Mapped[float | None] = mapped_column(Float(), nullable=True)
    raw_response: Mapped[str | None] = mapped_column(Text(), nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    cost_usd: Mapped[float | None] = mapped_column(Float(), nullable=True)
    positioning_result: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    recommendations: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    insights: Mapped[list["Insight"]] = relationship(  # noqa: F821
        "Insight", back_populates="analysis", cascade="all, delete-orphan"
    )
    artifacts: Mapped[list["Artifact"]] = relationship(  # noqa: F821
        "Artifact", back_populates="analysis", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Analysis(id={self.id}, project_id={self.project_id}, confidence={self.confidence_score})>"
