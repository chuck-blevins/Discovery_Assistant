"""Pydantic schemas for persona endpoints (Story 5-2)."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PersonaResponse(BaseModel):
    """Persona card for persona-buildout projects. completion_pct and staleness_decay_pct are computed on read."""

    id: uuid.UUID
    project_id: uuid.UUID
    confidence_score: Optional[float] = None
    name_title: Optional[str] = None
    goals: Optional[str] = None
    pain_points: Optional[str] = None
    decision_drivers: Optional[str] = None
    false_beliefs: Optional[str] = None
    job_to_be_done: Optional[str] = None
    usage_patterns: Optional[str] = None
    objections: Optional[str] = None
    success_metrics: Optional[str] = None
    field_quality: Optional[dict[str, str]] = None  # field name -> "low"|"medium"|"high"
    completion_pct: float  # 0.0-1.0, populated fields / 9
    staleness_decay_pct: float  # 0.0-1.0, decay fraction (e.g. 0.05 per month)
    last_analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
