"""Settings service — manages per-user prompt templates and LLM configuration."""

import os
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.app_settings import AppSettings
from app.models.prompt_template import PromptTemplate


# ── Prompt defaults ───────────────────────────────────────────────────────────

def _get_defaults() -> dict[str, str]:
    """Lazy-import prompt constants to avoid circular imports at module load."""
    from app.services.claude_service import (
        PROBLEM_VALIDATION_SYSTEM_PROMPT,
        POSITIONING_SYSTEM_PROMPT,
        PERSONA_SYSTEM_PROMPT,
        ICP_SYSTEM_PROMPT,
        ONBOARDING_SYSTEM_PROMPT,
        RECOMMENDATIONS_SYSTEM_PROMPT,
    )
    return {
        "problem_validation": PROBLEM_VALIDATION_SYSTEM_PROMPT,
        "positioning": POSITIONING_SYSTEM_PROMPT,
        "persona_buildout": PERSONA_SYSTEM_PROMPT,
        "icp_refinement": ICP_SYSTEM_PROMPT,
        "onboarding": ONBOARDING_SYSTEM_PROMPT,
        "recommendations": RECOMMENDATIONS_SYSTEM_PROMPT,
    }


ANALYSIS_TYPES = [
    "problem_validation",
    "positioning",
    "persona_buildout",
    "icp_refinement",
    "onboarding",
    "recommendations",
]


# ── Prompt template CRUD ──────────────────────────────────────────────────────

async def get_or_create_prompt(
    db: AsyncSession, user_id: uuid.UUID, analysis_type: str
) -> PromptTemplate:
    result = await db.execute(
        select(PromptTemplate).where(
            PromptTemplate.user_id == user_id,
            PromptTemplate.analysis_type == analysis_type,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        return row
    defaults = _get_defaults()
    row = PromptTemplate(
        user_id=user_id,
        analysis_type=analysis_type,
        system_prompt=defaults[analysis_type],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def list_prompts(db: AsyncSession, user_id: uuid.UUID) -> list[PromptTemplate]:
    rows = []
    for at in ANALYSIS_TYPES:
        rows.append(await get_or_create_prompt(db, user_id, at))
    return rows


async def update_prompt(
    db: AsyncSession, user_id: uuid.UUID, analysis_type: str, system_prompt: str
) -> PromptTemplate:
    row = await get_or_create_prompt(db, user_id, analysis_type)
    row.system_prompt = system_prompt
    await db.commit()
    await db.refresh(row)
    return row


async def reset_prompt_to_default(
    db: AsyncSession, user_id: uuid.UUID, analysis_type: str
) -> PromptTemplate:
    defaults = _get_defaults()
    return await update_prompt(db, user_id, analysis_type, defaults[analysis_type])


async def get_prompt_text(
    db: AsyncSession, user_id: uuid.UUID, analysis_type: str
) -> str:
    row = await get_or_create_prompt(db, user_id, analysis_type)
    return row.system_prompt


# ── LLM settings ─────────────────────────────────────────────────────────────

_LLM_KEYS = ("claude_model", "claude_request_timeout", "claude_api_key")


async def _get_setting(
    db: AsyncSession, user_id: uuid.UUID, key: str
) -> Optional[str]:
    result = await db.execute(
        select(AppSettings.value).where(
            AppSettings.user_id == user_id,
            AppSettings.key == key,
        )
    )
    return result.scalar_one_or_none()


async def _upsert_setting(
    db: AsyncSession, user_id: uuid.UUID, key: str, value: str
) -> None:
    stmt = pg_insert(AppSettings).values(
        id=uuid.uuid4(),
        user_id=user_id,
        key=key,
        value=value,
    ).on_conflict_do_update(
        constraint="uq_app_settings_user_key",
        set_={"value": value},
    )
    await db.execute(stmt)
    await db.commit()


def _mask_api_key(key: str) -> str:
    return key[:12] + "...****" if len(key) > 12 else "...****"


async def get_llm_settings(db: AsyncSession, user_id: uuid.UUID) -> dict:
    from app.services.claude_service import CLAUDE_MODEL, _CLAUDE_TIMEOUT

    db_model = await _get_setting(db, user_id, "claude_model")
    db_timeout = await _get_setting(db, user_id, "claude_request_timeout")
    db_api_key = await _get_setting(db, user_id, "claude_api_key")

    env_key = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    raw_key = db_api_key or env_key

    return {
        "model": db_model or CLAUDE_MODEL,
        "timeout_seconds": int(db_timeout) if db_timeout else int(_CLAUDE_TIMEOUT),
        "api_key_masked": _mask_api_key(raw_key) if raw_key else None,
        "api_key_is_set": bool(raw_key),
        "_raw_api_key": raw_key,
    }


async def update_llm_settings(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    model: Optional[str] = None,
    timeout_seconds: Optional[int] = None,
    api_key: Optional[str] = None,
) -> dict:
    if model:
        await _upsert_setting(db, user_id, "claude_model", model)
    if timeout_seconds is not None:
        await _upsert_setting(db, user_id, "claude_request_timeout", str(timeout_seconds))
    if api_key:
        await _upsert_setting(db, user_id, "claude_api_key", api_key)
    return await get_llm_settings(db, user_id)


# ── Stripe settings ───────────────────────────────────────────────────────────

async def get_stripe_secret_key(db: AsyncSession, user_id: uuid.UUID) -> Optional[str]:
    """Return the user's Stripe secret key, or None if not configured."""
    return await _get_setting(db, user_id, "stripe_secret_key")


async def get_stripe_webhook_secret(db: AsyncSession, user_id: uuid.UUID) -> Optional[str]:
    """Return the user's Stripe webhook signing secret, or None if not configured."""
    return await _get_setting(db, user_id, "stripe_webhook_secret")


async def get_stripe_settings(db: AsyncSession, user_id: uuid.UUID) -> dict:
    secret_key = await _get_setting(db, user_id, "stripe_secret_key")
    webhook_secret = await _get_setting(db, user_id, "stripe_webhook_secret")
    customer_portal_url = await _get_setting(db, user_id, "stripe_customer_portal_url")
    return {
        "secret_key_masked": _mask_api_key(secret_key) if secret_key else None,
        "secret_key_is_set": bool(secret_key),
        "webhook_secret_is_set": bool(webhook_secret),
        "customer_portal_url": customer_portal_url,
        "_raw_secret_key": secret_key,
    }


async def update_stripe_settings(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    secret_key: Optional[str] = None,
    webhook_secret: Optional[str] = None,
    customer_portal_url: Optional[str] = None,
) -> dict:
    if secret_key:
        await _upsert_setting(db, user_id, "stripe_secret_key", secret_key)
    if webhook_secret:
        await _upsert_setting(db, user_id, "stripe_webhook_secret", webhook_secret)
    if customer_portal_url is not None:
        await _upsert_setting(db, user_id, "stripe_customer_portal_url", customer_portal_url)
    return await get_stripe_settings(db, user_id)