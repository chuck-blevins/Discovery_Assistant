"""Pydantic schemas for time session request/response models."""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class TimeSessionCreate(BaseModel):
    session_date: date
    hours: float
    description: Optional[str] = None
    project_id: Optional[uuid.UUID] = None

    @field_validator("hours")
    @classmethod
    def hours_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("hours must be greater than zero")
        return v


class TimeSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID
    session_date: date
    hours: float
    description: Optional[str] = None
    created_at: datetime
