"""Analysis API endpoints.

Routes:
  GET  /projects/{project_id}/analyze/stream  - SSE streaming analysis
  POST /projects/{project_id}/analyze          - Non-streaming analysis
  GET  /projects/{project_id}/analyses         - List analyses
  GET  /analyses/{analysis_id}                 - Get analysis detail
"""

import json
import logging
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.analysis import AnalysisResponse
from app.services import (
    analysis_service,
    audit_service,
    client_service,
    claude_service,
    data_source_service,
    project_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyses"])

_ANALYSIS_COOLDOWN_SECONDS = 60


# ── Ownership helpers ─────────────────────────────────────────────────────────


async def _verify_project_ownership(
    db: AsyncSession,
    project_id: uuid.UUID,
    current_user: User,
):
    """Fetch project and verify client ownership. 404 if not found or not owned."""
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project, client


async def _verify_analysis_ownership(
    db: AsyncSession,
    analysis_id: uuid.UUID,
    current_user: User,
):
    """Fetch analysis and verify ownership via analysis→project→client chain. 404 if not owned."""
    analysis = await analysis_service.get_analysis(db, analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    project = await project_service.get_project(db, analysis.project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    return analysis


# ── SSE helper ────────────────────────────────────────────────────────────────


def _sse(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


# ── GET /projects/{project_id}/analyze/stream ─────────────────────────────────


@router.get(
    "/projects/{project_id}/analyze/stream",
    summary="Stream analysis progress for a project via Server-Sent Events",
)
async def stream_analysis(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """SSE endpoint — streams progress events, result, and done/error signal."""
    project, client_obj = await _verify_project_ownership(db, project_id, current_user)

    if await analysis_service.has_recent_analysis(db, project_id, _ANALYSIS_COOLDOWN_SECONDS):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"An analysis was run recently. Please wait {_ANALYSIS_COOLDOWN_SECONDS} seconds before running another.",
        )

    data_sources = await data_source_service.list_data_sources(db, project_id)
    if not data_sources:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No data sources found. Upload data before analyzing.",
        )

    # Snapshot all needed data before the injected session closes
    objective = project.objective
    target_segments = list(project.target_segments)
    assumed_problem = client_obj.assumed_problem if client_obj else None
    user_id = current_user.id
    project_id_val = project_id
    sources = [(ds.file_name, ds.raw_text or "") for ds in data_sources]

    async def event_generator() -> AsyncGenerator[str, None]:
        from app.db import async_session_maker  # local import to avoid circular

        async with async_session_maker() as gen_db:
            try:
                yield _sse({"type": "progress", "stage": "Loading data sources", "pct": 10})
                yield _sse({"type": "progress", "stage": "Parsing documents", "pct": 30})
                yield _sse({"type": "progress", "stage": "Analyzing with Claude", "pct": 50})

                result = await claude_service.run_analysis(
                    objective=objective,
                    assumed_problem=assumed_problem,
                    target_segments=target_segments,
                    data_sources=sources,
                )

                yield _sse({"type": "progress", "stage": "Extracting insights", "pct": 80})

                analysis = await analysis_service.create_analysis(
                    db=gen_db,
                    project_id=project_id_val,
                    objective=objective,
                    confidence_score=result["confidence_score"],
                    raw_response=result["raw_response"],
                    tokens_used=result["tokens_used"],
                    cost_usd=result["cost_usd"],
                    insights_data=result["insights"],
                )

                yield _sse({"type": "progress", "stage": "Saving results", "pct": 95})

                await project_service.update_project_confidence(
                    gen_db, project_id_val, result["confidence_score"]
                )

                await audit_service.log(
                    gen_db,
                    user_id,
                    "analysis.created",
                    "analysis",
                    analysis.id,
                    {
                        "project_id": str(project_id_val),
                        "confidence_score": result["confidence_score"],
                    },
                )

                insights_payload = [
                    {
                        "id": str(ins.id),
                        "type": ins.type,
                        "text": ins.text,
                        "citation": ins.citation,
                        "confidence": ins.confidence,
                        "source_count": ins.source_count,
                    }
                    for ins in analysis.insights
                ]

                yield _sse(
                    {
                        "type": "result",
                        "analysis_id": str(analysis.id),
                        "confidence_score": result["confidence_score"],
                        "insights": insights_payload,
                        "cost": {
                            "tokens": result["tokens_used"],
                            "usd": result["cost_usd"],
                        },
                    }
                )
                yield _sse({"type": "done"})

            except Exception as exc:
                logger.error(
                    "Analysis stream error for project %s: %s",
                    project_id_val,
                    exc,
                    exc_info=True,
                )
                yield _sse({"type": "error", "message": "Analysis failed. Please try again."})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── POST /projects/{project_id}/analyze ──────────────────────────────────────


@router.post(
    "/projects/{project_id}/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Run analysis (non-streaming fallback)",
)
async def run_analysis(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalysisResponse:
    """Trigger analysis and wait for the full result (no streaming)."""
    project, client_obj = await _verify_project_ownership(db, project_id, current_user)

    if await analysis_service.has_recent_analysis(db, project_id, _ANALYSIS_COOLDOWN_SECONDS):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"An analysis was run recently. Please wait {_ANALYSIS_COOLDOWN_SECONDS} seconds before running another.",
        )

    data_sources = await data_source_service.list_data_sources(db, project_id)
    if not data_sources:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No data sources found. Upload data before analyzing.",
        )

    assumed_problem = client_obj.assumed_problem if client_obj else None
    sources = [(ds.file_name, ds.raw_text or "") for ds in data_sources]

    result = await claude_service.run_analysis(
        objective=project.objective,
        assumed_problem=assumed_problem,
        target_segments=list(project.target_segments),
        data_sources=sources,
    )

    analysis = await analysis_service.create_analysis(
        db=db,
        project_id=project_id,
        objective=project.objective,
        confidence_score=result["confidence_score"],
        raw_response=result["raw_response"],
        tokens_used=result["tokens_used"],
        cost_usd=result["cost_usd"],
        insights_data=result["insights"],
    )

    await project_service.update_project_confidence(
        db, project_id, result["confidence_score"]
    )

    await audit_service.log(
        db,
        current_user.id,
        "analysis.created",
        "analysis",
        analysis.id,
        {
            "project_id": str(project_id),
            "confidence_score": result["confidence_score"],
        },
    )

    return AnalysisResponse.model_validate(analysis)


# ── GET /projects/{project_id}/analyses ──────────────────────────────────────


@router.get(
    "/projects/{project_id}/analyses",
    response_model=list[AnalysisResponse],
    summary="List analyses for a project",
)
async def list_analyses(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AnalysisResponse]:
    await _verify_project_ownership(db, project_id, current_user)
    analyses = await analysis_service.list_analyses(db, project_id)
    return [AnalysisResponse.model_validate(a) for a in analyses]


# ── GET /analyses/{analysis_id} ──────────────────────────────────────────────


@router.get(
    "/analyses/{analysis_id}",
    response_model=AnalysisResponse,
    summary="Get a single analysis with insights",
)
async def get_analysis(
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalysisResponse:
    analysis = await _verify_analysis_ownership(db, analysis_id, current_user)
    return AnalysisResponse.model_validate(analysis)
