"""Pydantic schemas for the client intake scope endpoint."""

from pydantic import BaseModel, Field


class IntakeScopeRequest(BaseModel):
    company_name: str = Field(..., min_length=1, description="Client company name")
    context: str = Field(default="", description="Free-form context about the client and engagement")
    win_definition: str = Field(default="", description="What a successful outcome looks like")


class IntakeScopeResponse(BaseModel):
    engagement_summary: str
    icp_hypothesis: list[str]
    discovery_questions: list[str]
    suggested_engagement_type: str
