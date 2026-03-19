"""Pydantic schemas for project request/response models."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class QuickViewQuote(BaseModel):
    """One quote (supporting or contradicting) for Epic 3 quick view."""

    text: str
    citation: Optional[str] = None

VALID_OBJECTIVES = [
    "problem-validation",
    "positioning",
    "persona-buildout",
    "icp-refinement",
    "onboarding",
]


class ProjectCreate(BaseModel):
    name: str
    objective: str
    target_segments: list[str] = []
    assumed_problem: Optional[str] = None

    @model_validator(mode="after")
    def assumed_problem_required_for_problem_validation(self):
        if self.objective == "problem-validation":
            if not self.assumed_problem or not str(self.assumed_problem).strip():
                raise ValueError("assumed_problem is required when objective is problem-validation")
        return self

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
    assumed_problem: Optional[str] = None

    @model_validator(mode="after")
    def assumed_problem_required_for_problem_validation(self):
        # When updating to or keeping objective as problem-validation, assumed_problem must be non-empty
        obj = self.objective
        ap = self.assumed_problem
        if obj == "problem-validation" and ap is not None and not str(ap).strip():
            raise ValueError("assumed_problem cannot be empty when objective is problem-validation")
        return self

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
    assumed_problem: Optional[str] = None
    assumed_problem_truncated: Optional[str] = None  # Epic 3: quick view (e.g. first 80 chars)
    status: str
    confidence_score: Optional[float] = None
    strength_of_support: Optional[str] = None  # Epic 2/3: "strong" | "emerging" | "weak" from latest problem-validation
    supporting_quotes: list[QuickViewQuote] = []  # Epic 3: up to 2 from latest problem-validation (type=finding)
    contradicting_quote: Optional[QuickViewQuote] = None  # Epic 3: one from latest problem-validation (type=contradiction)
    last_analyzed_at: Optional[datetime] = None
    total_cost_usd: Optional[float] = None  # Story 6-3: sum of analyses.cost_usd
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
