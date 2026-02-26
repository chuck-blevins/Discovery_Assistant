"""Pydantic schemas for analysis endpoints."""

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

# Strength-of-support for problem-validation (Epic 2/3): derived from confidence_score
StrengthOfSupport = Literal["strong", "emerging", "weak"]


class ValueDriverItem(BaseModel):
    text: str
    frequency_count: int


class PositioningResultResponse(BaseModel):
    """Positioning discovery result (Story 5-1). Returned when objective was 'positioning'."""

    value_drivers: list[ValueDriverItem] = []
    alternative_angles: list[str] = []
    recommended_interviews: list[str] = []
    confidence_score: Optional[float] = None


class InsightResponse(BaseModel):
    """A single insight extracted from analysis. analysis_id omitted to avoid leaking internal FK."""

    id: uuid.UUID
    type: Literal["finding", "contradiction", "gap"]
    text: str
    citation: Optional[str]
    confidence: Optional[float]
    source_count: int

    model_config = ConfigDict(from_attributes=True)


class RecommendationsResponse(BaseModel):
    """Next-step recommendations (Story 6-1). Optional on analysis."""

    action_items: list[str] = []
    interview_script_md: Optional[str] = None
    survey_template_md: Optional[str] = None
    can_create_next_project: bool = False
    suggested_next_objective: Optional[str] = None


class AnalysisResponse(BaseModel):
    """Returned from analysis endpoints — raw_response excluded to keep responses lean."""

    id: uuid.UUID
    project_id: uuid.UUID
    objective: str
    confidence_score: Optional[float]
    strength_of_support: Optional[StrengthOfSupport] = None  # Epic 2/3: strong | emerging | weak
    tokens_used: Optional[int]
    cost_usd: Optional[float]
    insights: list[InsightResponse] = []
    positioning_result: Optional[PositioningResultResponse] = None
    recommendations: Optional[RecommendationsResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
