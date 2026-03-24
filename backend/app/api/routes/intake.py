"""Client intake scope endpoint.

Routes:
  POST /intake-scope  — Generate AI scope hypothesis for a new client engagement
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.intake import IntakeScopeRequest, IntakeScopeResponse
from app.services import settings_service, claude_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["intake"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
UserDep = Annotated[User, Depends(get_current_user)]


@router.post("/intake-scope", response_model=IntakeScopeResponse, status_code=status.HTTP_200_OK)
async def generate_intake_scope(
    body: IntakeScopeRequest,
    db: DbDep,
    current_user: UserDep,
) -> IntakeScopeResponse:
    """Generate an AI scope hypothesis from client context.

    Returns engagement summary, ICP hypothesis tags, discovery questions, and
    suggested engagement type. Requires a Claude API key configured in Settings > LLM Config.
    """
    llm = await settings_service.get_llm_settings(db, current_user.id)
    if not llm["api_key_is_set"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Claude API key is not configured. Add it in Settings > LLM Config.",
        )

    system_prompt = await settings_service.get_prompt_text(db, current_user.id, "client_intake")

    try:
        result = await claude_service.run_intake_scope(
            company_name=body.company_name,
            context=body.context,
            win_definition=body.win_definition,
            system_prompt=system_prompt,
            model=llm["model"],
            api_key=llm["_raw_api_key"],
            timeout=float(llm["timeout_seconds"]),
        )
    except ValueError as exc:
        logger.warning("Intake scope Claude response malformed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI response was malformed: {exc}",
        )
    except Exception as exc:
        logger.exception("Intake scope Claude call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI call failed: {exc}",
        )

    return IntakeScopeResponse(
        engagement_summary=result["engagement_summary"],
        icp_hypothesis=result["icp_hypothesis"],
        discovery_questions=result["discovery_questions"],
        suggested_engagement_type=result["suggested_engagement_type"],
    )
