"""Pydantic schemas for analysis endpoints."""

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class InsightResponse(BaseModel):
    """A single insight extracted from analysis."""

    id: uuid.UUID
    analysis_id: uuid.UUID
    type: Literal["finding", "contradiction", "gap"]
    text: str
    citation: Optional[str]
    confidence: Optional[float]
    source_count: int

    model_config = ConfigDict(from_attributes=True)


class AnalysisResponse(BaseModel):
    """Returned from analysis endpoints — raw_response excluded to keep responses lean."""

    id: uuid.UUID
    project_id: uuid.UUID
    objective: str
    confidence_score: Optional[float]
    tokens_used: Optional[int]
    cost_usd: Optional[float]
    insights: list[InsightResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
