from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class PromptTemplateResponse(BaseModel):
    analysis_type: str
    system_prompt: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class PromptUpdate(BaseModel):
    system_prompt: str

    @field_validator("system_prompt")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("system_prompt must not be empty")
        return v


class LLMSettingsResponse(BaseModel):
    model: str
    timeout_seconds: int
    api_key_masked: Optional[str]
    api_key_is_set: bool


class LLMSettingsUpdate(BaseModel):
    model: Optional[str] = None
    timeout_seconds: Optional[int] = None
    api_key: Optional[str] = None