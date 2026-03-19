"""Client ORM model — maps to the clients table."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    market_type: Mapped[str | None] = mapped_column(Text(), nullable=True)
    assumed_problem: Mapped[str | None] = mapped_column(Text(), nullable=True)
    assumed_solution: Mapped[str | None] = mapped_column(Text(), nullable=True)
    assumed_market: Mapped[str | None] = mapped_column(Text(), nullable=True)
    initial_notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(Text(), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(Text(), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(Text(), nullable=True)
    website: Mapped[str | None] = mapped_column(Text(), nullable=True)
    engagement_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.now, onupdate=datetime.now, nullable=False
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<Client(id={self.id}, name={self.name!r})>"
