"""Pydantic schemas for ICP endpoints (Story 5-3)."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class IcpResponse(BaseModel):
    """ICP card for icp-refinement projects."""

    id: uuid.UUID
    project_id: uuid.UUID
    confidence_score: Optional[float] = None
    company_size: Optional[str] = None
    industries: Optional[str] = None
    geography: Optional[str] = None
    revenue: Optional[str] = None
    tech_stack: Optional[str] = None
    use_case_fit: Optional[str] = None
    buying_process: Optional[str] = None
    budget: Optional[str] = None
    maturity: Optional[str] = None
    custom: Optional[str] = None
    dimension_confidence: Optional[dict[str, str]] = None
    last_analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
