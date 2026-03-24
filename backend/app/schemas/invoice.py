"""Pydantic schemas for invoice request/response models."""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InvoiceLineItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price_usd: float
    time_session_id: Optional[uuid.UUID] = None

    @property
    def amount_usd(self) -> float:
        return self.quantity * self.unit_price_usd


class InvoiceLineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    description: str
    quantity: float
    unit_price_usd: float
    amount_usd: float
    time_session_id: Optional[uuid.UUID] = None
    created_at: datetime


class InvoiceCreate(BaseModel):
    due_date: Optional[date] = None
    notes: Optional[str] = None
    line_items: list[InvoiceLineItemCreate] = []


class InvoiceUpdate(BaseModel):
    due_date: Optional[date] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    user_id: uuid.UUID
    stripe_invoice_id: Optional[str] = None
    stripe_invoice_url: Optional[str] = None
    status: str
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    subtotal_usd: float
    notes: Optional[str] = None
    line_items: list[InvoiceLineItemResponse] = []
    created_at: datetime
    updated_at: datetime
