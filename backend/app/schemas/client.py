"""Pydantic schemas for client request/response models."""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class ClientCreate(BaseModel):
    name: str
    description: Optional[str] = None
    market_type: Optional[str] = None
    assumed_problem: Optional[str] = None
    assumed_solution: Optional[str] = None
    assumed_market: Optional[str] = None
    initial_notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    engagement_status: Optional[str] = None
    contract_value: Optional[float] = None
    billing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    agreed_hours: Optional[float] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    market_type: Optional[str] = None
    assumed_problem: Optional[str] = None
    assumed_solution: Optional[str] = None
    assumed_market: Optional[str] = None
    initial_notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    engagement_status: Optional[str] = None
    contract_value: Optional[float] = None
    billing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    agreed_hours: Optional[float] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be empty")
        return v.strip() if v is not None else v


class ClientNoteCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("content must not be empty")
        return v.strip()


class ClientNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    content: str
    created_at: datetime


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str] = None
    market_type: Optional[str] = None
    assumed_problem: Optional[str] = None
    assumed_solution: Optional[str] = None
    assumed_market: Optional[str] = None
    initial_notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    engagement_status: Optional[str] = None
    status: str
    contract_value: Optional[float] = None
    billing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    agreed_hours: Optional[float] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    stripe_customer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
