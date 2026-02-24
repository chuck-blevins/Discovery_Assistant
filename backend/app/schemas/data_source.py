"""Pydantic schemas for data source endpoints."""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class DataSourcePasteCreate(BaseModel):
    """Payload for JSON paste-mode upload."""

    source_type: str = "paste"
    raw_text: str
    file_name: Optional[str] = "paste"
    collected_date: Optional[date] = None
    creator_name: Optional[str] = None
    purpose: Optional[str] = None

    @field_validator("source_type")
    @classmethod
    def source_type_must_be_paste(cls, v: str) -> str:
        if v != "paste":
            raise ValueError('source_type must be "paste" for JSON uploads')
        return v

    @field_validator("raw_text")
    @classmethod
    def raw_text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("raw_text must not be empty")
        return v


class DataSourceResponse(BaseModel):
    """Returned from list and create endpoints — raw_text excluded to keep responses lean."""

    id: uuid.UUID
    project_id: uuid.UUID
    source_type: str
    file_name: str
    file_path: Optional[str]
    content_type: Optional[str]
    collected_date: Optional[date]
    creator_name: Optional[str]
    purpose: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DataSourcePreviewResponse(BaseModel):
    """Returned from preview endpoint — includes truncated raw_text."""

    id: uuid.UUID
    file_name: str
    raw_text_preview: str  # first 500 chars of raw_text, or ""
