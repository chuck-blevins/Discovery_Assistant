"""Pydantic schemas for project request/response models."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

VALID_OBJECTIVES = [
    "problem-validation",
    "positioning",
    "persona-buildout",
    "icp-refinement",
]


class ProjectCreate(BaseModel):
    name: str
    objective: str
    target_segments: list[str] = []

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()

    @field_validator("objective")
    @classmethod
    def objective_valid(cls, v: str) -> str:
        if v not in VALID_OBJECTIVES:
            raise ValueError(f"objective must be one of {VALID_OBJECTIVES}")
        return v


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    objective: Optional[str] = None
    target_segments: Optional[list[str]] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be empty")
        return v.strip() if v is not None else v

    @field_validator("objective")
    @classmethod
    def objective_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_OBJECTIVES:
            raise ValueError(f"objective must be one of {VALID_OBJECTIVES}")
        return v


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    name: str
    objective: str
    target_segments: list[str]
    status: str
    confidence_score: Optional[float] = None
    last_analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
