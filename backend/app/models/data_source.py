"""DataSource ORM model — maps to the data_sources table."""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(Text(), nullable=False)  # 'paste' | 'file'
    file_name: Mapped[str] = mapped_column(Text(), nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
    content_type: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
    raw_text: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
    collected_date: Mapped[date | None] = mapped_column(Date(), nullable=True, default=None)
    creator_name: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
    purpose: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<DataSource(id={self.id}, file_name={self.file_name!r})>"
