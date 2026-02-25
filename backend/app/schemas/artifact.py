"""Pydantic schemas for artifact endpoints (Story 6-2)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ArtifactSummaryResponse(BaseModel):
    """Summary of an artifact for list responses."""

    id: uuid.UUID
    artifact_type: str
    file_name: str
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)
