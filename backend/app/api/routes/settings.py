"""Settings routes — prompt templates and LLM configuration."""

import logging
import uuid
from typing import Annotated

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.schemas.settings import (
    LLMSettingsResponse,
    LLMSettingsUpdate,
    PromptTemplateResponse,
    PromptUpdate,
    StripeSettingsResponse,
    StripeSettingsUpdate,
)
from app.services import settings_service
from app.services import stripe_service

router = APIRouter(prefix="/settings", tags=["settings"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
UserDep = Annotated[User, Depends(get_current_user)]


# ── Prompts ───────────────────────────────────────────────────────────────────

@router.get("/prompts", response_model=list[PromptTemplateResponse])
async def list_prompts(db: DbDep, current_user: UserDep):
    rows = await settings_service.list_prompts(db, current_user.id)
    return rows


@router.put("/prompts/{analysis_type}", response_model=PromptTemplateResponse)
async def update_prompt(
    analysis_type: str, body: PromptUpdate, db: DbDep, current_user: UserDep
):
    if analysis_type not in settings_service.ANALYSIS_TYPES:
        raise HTTPException(status_code=404, detail="Unknown analysis type")
    row = await settings_service.update_prompt(db, current_user.id, analysis_type, body.system_prompt)
    return row


@router.post("/prompts/{analysis_type}/reset", response_model=PromptTemplateResponse)
async def reset_prompt(analysis_type: str, db: DbDep, current_user: UserDep):
    if analysis_type not in settings_service.ANALYSIS_TYPES:
        raise HTTPException(status_code=404, detail="Unknown analysis type")
    row = await settings_service.reset_prompt_to_default(db, current_user.id, analysis_type)
    return row


# ── LLM Configuration ─────────────────────────────────────────────────────────

@router.get("/llm", response_model=LLMSettingsResponse)
async def get_llm_settings(db: DbDep, current_user: UserDep):
    settings = await settings_service.get_llm_settings(db, current_user.id)
    return LLMSettingsResponse(
        model=settings["model"],
        timeout_seconds=settings["timeout_seconds"],
        api_key_masked=settings["api_key_masked"],
        api_key_is_set=settings["api_key_is_set"],
    )


@router.put("/llm", response_model=LLMSettingsResponse)
async def update_llm_settings(body: LLMSettingsUpdate, db: DbDep, current_user: UserDep):
    settings = await settings_service.update_llm_settings(
        db,
        current_user.id,
        model=body.model,
        timeout_seconds=body.timeout_seconds,
        api_key=body.api_key,
    )
    return LLMSettingsResponse(
        model=settings["model"],
        timeout_seconds=settings["timeout_seconds"],
        api_key_masked=settings["api_key_masked"],
        api_key_is_set=settings["api_key_is_set"],
    )


# ── Stripe Configuration ───────────────────────────────────────────────────────

@router.get("/stripe", response_model=StripeSettingsResponse)
async def get_stripe_settings(db: DbDep, current_user: UserDep):
    settings = await settings_service.get_stripe_settings(db, current_user.id)
    return StripeSettingsResponse(
        secret_key_masked=settings["secret_key_masked"],
        secret_key_is_set=settings["secret_key_is_set"],
        webhook_secret_is_set=settings["webhook_secret_is_set"],
        customer_portal_url=settings["customer_portal_url"],
    )


@router.put("/stripe", response_model=StripeSettingsResponse)
async def update_stripe_settings(body: StripeSettingsUpdate, db: DbDep, current_user: UserDep):
    settings = await settings_service.update_stripe_settings(
        db,
        current_user.id,
        secret_key=body.secret_key,
        webhook_secret=body.webhook_secret,
        customer_portal_url=body.customer_portal_url,
    )
    return StripeSettingsResponse(
        secret_key_masked=settings["secret_key_masked"],
        secret_key_is_set=settings["secret_key_is_set"],
        webhook_secret_is_set=settings["webhook_secret_is_set"],
        customer_portal_url=settings["customer_portal_url"],
    )


@router.get("/stripe/catalog", summary="List Stripe products and prices")
async def get_stripe_catalog(db: DbDep, current_user: UserDep) -> list[dict]:
    try:
        result = await stripe_service.list_products_with_prices(db, current_user.id)
        logger.info("Stripe catalog: %d products returned", len(result))
        return result
    except ValueError as exc:
        logger.warning("Stripe catalog error (config): %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Stripe catalog error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")