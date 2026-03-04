"""Analysis API endpoints.

Routes:
  GET  /projects/{project_id}/analyze/stream  - SSE streaming analysis
  POST /projects/{project_id}/analyze          - Non-streaming analysis
  GET  /projects/{project_id}/analyses         - List analyses
  GET  /analyses/{analysis_id}                 - Get analysis detail
"""

import asyncio
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
from app.utils.strength import confidence_to_strength
from app.schemas.artifact import ArtifactSummaryResponse
from app.services import (
    analysis_service,
    artifact_service,
    audit_service,
    client_service,
    claude_service,
    data_source_service,
    icp_service,
    persona_service,
    project_service,
    settings_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyses"])

_ANALYSIS_COOLDOWN_SECONDS = 60

# Objectives that have a dedicated analyze flow; others return 422
_VALID_ANALYSIS_OBJECTIVES = frozenset({
    "problem-validation",
    "positioning",
    "persona-buildout",
    "icp-refinement",
})

# Per-project locks to prevent TOCTOU: two concurrent requests both pass cooldown then both run.
_project_locks: dict[uuid.UUID, asyncio.Lock] = {}
_project_locks_guard = asyncio.Lock()


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


async def _acquire_project_analysis_lock(project_id: uuid.UUID) -> asyncio.Lock:
    """Return the lock for this project (create if needed). Caller must release after use."""
    async with _project_locks_guard:
        if project_id not in _project_locks:
            _project_locks[project_id] = asyncio.Lock()
        return _project_locks[project_id]


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
    # Story 1-1: prefer project-level assumed_problem for problem-validation, fall back to client
    assumed_problem = project.assumed_problem or (
        client_obj.assumed_problem if client_obj else None
    )
    user_id = current_user.id
    project_id_val = project_id
    sources = [(ds.file_name, ds.raw_text or "") for ds in data_sources]

    if objective not in _VALID_ANALYSIS_OBJECTIVES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported project objective for analysis.",
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        from app.db import AsyncSessionLocal  # local import to avoid circular

        lock = await _acquire_project_analysis_lock(project_id_val)
        async with lock:
            async with AsyncSessionLocal() as gen_db:
                try:
                    yield _sse({"type": "progress", "stage": "Loading data sources", "pct": 10})
                    yield _sse({"type": "progress", "stage": "Parsing documents", "pct": 30})
                    yield _sse({"type": "progress", "stage": "Analyzing with Claude", "pct": 50})

                    # Load effective LLM settings (DB overrides env)
                    llm = await settings_service.get_llm_settings(gen_db, user_id)
                    llm_kwargs = {
                        "model": llm["model"],
                        "api_key": llm["_raw_api_key"],
                        "timeout": float(llm["timeout_seconds"]),
                    }

                    # Map objective to analysis_type key for prompt lookup
                    _obj_to_type = {
                        "positioning": "positioning",
                        "persona-buildout": "persona_buildout",
                        "icp-refinement": "icp_refinement",
                    }

                    if objective == "positioning":
                        prompt_text = await settings_service.get_prompt_text(gen_db, user_id, "positioning")
                        result = await claude_service.run_positioning_analysis(
                            objective=objective,
                            data_sources=sources,
                            system_prompt=prompt_text,
                            **llm_kwargs,
                        )
                        _pr = result["positioning_result"]
                        score_for_project = _pr["confidence_score"] if _pr.get("confidence_score") is not None else 0.0
                        analysis = await analysis_service.create_analysis(
                            db=gen_db,
                            project_id=project_id_val,
                            objective=objective,
                            confidence_score=score_for_project,
                            raw_response=result["raw_response"],
                            tokens_used=result["tokens_used"],
                            cost_usd=result["cost_usd"],
                            insights_data=[],
                            positioning_result=result["positioning_result"],
                        )
                        insights_payload = []
                        result_payload = {
                            "type": "result",
                            "analysis_id": str(analysis.id),
                            "confidence_score": score_for_project,
                            "insights": insights_payload,
                            "positioning_result": result["positioning_result"],
                            "cost": {
                                "tokens": result["tokens_used"],
                                "usd": result["cost_usd"],
                            },
                        }
                    elif objective == "persona-buildout":
                        prompt_text = await settings_service.get_prompt_text(gen_db, user_id, "persona_buildout")
                        result = await claude_service.run_persona_analysis(
                            objective=objective,
                            data_sources=sources,
                            system_prompt=prompt_text,
                            **llm_kwargs,
                        )
                        pd = result["persona_data"]
                        score_for_project = pd.get("confidence_score") if pd.get("confidence_score") is not None else 0.0
                        await persona_service.upsert_persona(gen_db, project_id_val, **pd)
                        analysis = await analysis_service.create_analysis(
                            db=gen_db,
                            project_id=project_id_val,
                            objective=objective,
                            confidence_score=score_for_project,
                            raw_response=result["raw_response"],
                            tokens_used=result["tokens_used"],
                            cost_usd=result["cost_usd"],
                            insights_data=[],
                            allow_empty_insights=True,
                        )
                        result_payload = {
                            "type": "result",
                            "analysis_id": str(analysis.id),
                            "confidence_score": score_for_project,
                            "insights": [],
                            "persona_updated": True,
                            "cost": {
                                "tokens": result["tokens_used"],
                                "usd": result["cost_usd"],
                            },
                        }
                    elif objective == "icp-refinement":
                        prompt_text = await settings_service.get_prompt_text(gen_db, user_id, "icp_refinement")
                        result = await claude_service.run_icp_analysis(
                            objective=objective,
                            data_sources=sources,
                            system_prompt=prompt_text,
                            **llm_kwargs,
                        )
                        idata = result["icp_data"]
                        score_for_project = idata.get("confidence_score") if idata.get("confidence_score") is not None else 0.0
                        await icp_service.upsert_icp(gen_db, project_id_val, **idata)
                        analysis = await analysis_service.create_analysis(
                            db=gen_db,
                            project_id=project_id_val,
                            objective=objective,
                            confidence_score=score_for_project,
                            raw_response=result["raw_response"],
                            tokens_used=result["tokens_used"],
                            cost_usd=result["cost_usd"],
                            insights_data=[],
                            allow_empty_insights=True,
                        )
                        result_payload = {
                            "type": "result",
                            "analysis_id": str(analysis.id),
                            "confidence_score": score_for_project,
                            "insights": [],
                            "icp_updated": True,
                            "cost": {
                                "tokens": result["tokens_used"],
                                "usd": result["cost_usd"],
                            },
                        }
                    else:
                        prompt_text = await settings_service.get_prompt_text(gen_db, user_id, "problem_validation")
                        result = await claude_service.run_analysis(
                            objective=objective,
                            assumed_problem=assumed_problem,
                            target_segments=target_segments,
                            data_sources=sources,
                            system_prompt=prompt_text,
                            **llm_kwargs,
                        )
                        score_for_project = result["confidence_score"]
                        yield _sse({"type": "progress", "stage": "Extracting insights", "pct": 80})
                        analysis = await analysis_service.create_analysis(
                            db=gen_db,
                            project_id=project_id_val,
                            objective=objective,
                            confidence_score=score_for_project,
                            raw_response=result["raw_response"],
                            tokens_used=result["tokens_used"],
                            cost_usd=result["cost_usd"],
                            insights_data=result["insights"],
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
                        result_payload = {
                            "type": "result",
                            "analysis_id": str(analysis.id),
                            "confidence_score": score_for_project,
                            "insights": insights_payload,
                            "cost": {
                                "tokens": result["tokens_used"],
                                "usd": result["cost_usd"],
                            },
                        }

                    # Story 6-1: generate next-step recommendations (optional; don't fail analysis)
                    try:
                        rec_prompt = await settings_service.get_prompt_text(gen_db, user_id, "recommendations")
                        rec = await claude_service.run_recommendations_generation(
                            project_name=project.name,
                            objective=objective,
                            confidence_score=score_for_project,
                            source_count=len(sources),
                            system_prompt=rec_prompt,
                            **llm_kwargs,
                        )
                        analysis.recommendations = rec
                        result_payload["recommendations"] = rec
                    except Exception as rec_exc:
                        logger.warning("Recommendations generation failed: %s", rec_exc)
                        analysis.recommendations = None

                    yield _sse({"type": "progress", "stage": "Saving results", "pct": 95})

                    await project_service.update_project_confidence(
                        gen_db, project_id_val, score_for_project, commit=False
                    )
                    await audit_service.log(
                        gen_db,
                        user_id,
                        "analysis.created",
                        "analysis",
                        analysis.id,
                        {
                            "project_id": str(project_id_val),
                            "confidence_score": score_for_project,
                        },
                        commit=False,
                    )
                    await gen_db.commit()

                    yield _sse(result_payload)
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

    if project.objective not in _VALID_ANALYSIS_OBJECTIVES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported project objective for analysis.",
        )

    # Story 1-1: prefer project-level assumed_problem for problem-validation, fall back to client
    assumed_problem = project.assumed_problem or (
        client_obj.assumed_problem if client_obj else None
    )
    sources = [(ds.file_name, ds.raw_text or "") for ds in data_sources]

    lock = await _acquire_project_analysis_lock(project_id)
    async with lock:
        try:
            llm = await settings_service.get_llm_settings(db, current_user.id)
            llm_kwargs = {
                "model": llm["model"],
                "api_key": llm["_raw_api_key"],
                "timeout": float(llm["timeout_seconds"]),
            }

            if project.objective == "positioning":
                prompt_text = await settings_service.get_prompt_text(db, current_user.id, "positioning")
                result = await claude_service.run_positioning_analysis(
                    objective=project.objective,
                    data_sources=sources,
                    system_prompt=prompt_text,
                    **llm_kwargs,
                )
                _pr = result["positioning_result"]
                score_for_project = _pr["confidence_score"] if _pr.get("confidence_score") is not None else 0.0
                analysis = await analysis_service.create_analysis(
                    db=db,
                    project_id=project_id,
                    objective=project.objective,
                    confidence_score=score_for_project,
                    raw_response=result["raw_response"],
                    tokens_used=result["tokens_used"],
                    cost_usd=result["cost_usd"],
                    insights_data=[],
                    positioning_result=result["positioning_result"],
                )
            elif project.objective == "persona-buildout":
                prompt_text = await settings_service.get_prompt_text(db, current_user.id, "persona_buildout")
                result = await claude_service.run_persona_analysis(
                    objective=project.objective,
                    data_sources=sources,
                    system_prompt=prompt_text,
                    **llm_kwargs,
                )
                pd = result["persona_data"]
                score_for_project = pd.get("confidence_score") if pd.get("confidence_score") is not None else 0.0
                await persona_service.upsert_persona(db, project_id, **pd)
                analysis = await analysis_service.create_analysis(
                    db=db,
                    project_id=project_id,
                    objective=project.objective,
                    confidence_score=score_for_project,
                    raw_response=result["raw_response"],
                    tokens_used=result["tokens_used"],
                    cost_usd=result["cost_usd"],
                    insights_data=[],
                    allow_empty_insights=True,
                )
            elif project.objective == "icp-refinement":
                prompt_text = await settings_service.get_prompt_text(db, current_user.id, "icp_refinement")
                result = await claude_service.run_icp_analysis(
                    objective=project.objective,
                    data_sources=sources,
                    system_prompt=prompt_text,
                    **llm_kwargs,
                )
                idata = result["icp_data"]
                score_for_project = idata.get("confidence_score") if idata.get("confidence_score") is not None else 0.0
                await icp_service.upsert_icp(db, project_id, **idata)
                analysis = await analysis_service.create_analysis(
                    db=db,
                    project_id=project_id,
                    objective=project.objective,
                    confidence_score=score_for_project,
                    raw_response=result["raw_response"],
                    tokens_used=result["tokens_used"],
                    cost_usd=result["cost_usd"],
                    insights_data=[],
                    allow_empty_insights=True,
                )
            else:
                prompt_text = await settings_service.get_prompt_text(db, current_user.id, "problem_validation")
                result = await claude_service.run_analysis(
                    objective=project.objective,
                    assumed_problem=assumed_problem,
                    target_segments=list(project.target_segments),
                    data_sources=sources,
                    system_prompt=prompt_text,
                    **llm_kwargs,
                )
                score_for_project = result["confidence_score"]
                analysis = await analysis_service.create_analysis(
                    db=db,
                    project_id=project_id,
                    objective=project.objective,
                    confidence_score=score_for_project,
                    raw_response=result["raw_response"],
                    tokens_used=result["tokens_used"],
                    cost_usd=result["cost_usd"],
                    insights_data=result["insights"],
                )

            # Story 6-1: generate next-step recommendations (optional; don't fail analysis)
            try:
                rec_prompt = await settings_service.get_prompt_text(db, current_user.id, "recommendations")
                rec = await claude_service.run_recommendations_generation(
                    project_name=project.name,
                    objective=project.objective,
                    confidence_score=score_for_project,
                    source_count=len(sources),
                    system_prompt=rec_prompt,
                    **llm_kwargs,
                )
                analysis.recommendations = rec
            except Exception as rec_exc:
                logger.warning("Recommendations generation failed: %s", rec_exc)
                analysis.recommendations = None

            await project_service.update_project_confidence(
                db, project_id, score_for_project, commit=False
            )
            await audit_service.log(
                db,
                current_user.id,
                "analysis.created",
                "analysis",
                analysis.id,
                {
                    "project_id": str(project_id),
                    "confidence_score": score_for_project,
                },
                commit=False,
            )
            await db.commit()
            await db.refresh(analysis)

        except (ValueError, json.JSONDecodeError) as e:
            await db.rollback()
            logger.warning("Analysis parsing failed for project %s: %s", project_id, e)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Analysis response could not be parsed. Please try again or check your data.",
            ) from e
        except Exception as e:
            await db.rollback()
            logger.exception("Analysis failed for project %s", project_id)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Analysis failed. The service may be temporarily unavailable. Your data was not changed. Please try again.",
            ) from e

    resp = AnalysisResponse.model_validate(analysis)
    resp.strength_of_support = confidence_to_strength(analysis.confidence_score)
    return resp


def _analysis_to_response(analysis) -> AnalysisResponse:
    """Build AnalysisResponse with strength_of_support derived from confidence_score."""
    r = AnalysisResponse.model_validate(analysis)
    r.strength_of_support = confidence_to_strength(analysis.confidence_score)
    return r


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
    return [_analysis_to_response(a) for a in analyses]


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
    return _analysis_to_response(analysis)


# ── POST /analyses/{analysis_id}/generate-artifacts (Story 6-2) ───────────────


@router.post(
    "/analyses/{analysis_id}/generate-artifacts",
    response_model=list[ArtifactSummaryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate artifacts for an analysis",
)
async def generate_artifacts(
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ArtifactSummaryResponse]:
    """Generate and persist artifacts (interview script, survey, persona, ICP, positioning) for this analysis."""
    await _verify_analysis_ownership(db, analysis_id, current_user)
    created = await artifact_service.create_artifacts_for_analysis(db, analysis_id)
    await db.commit()
    return [ArtifactSummaryResponse.model_validate(a) for a in created]


# ── GET /analyses/{analysis_id}/artifacts (Story 6-2) ────────────────────────


@router.get(
    "/analyses/{analysis_id}/artifacts",
    response_model=list[ArtifactSummaryResponse],
    summary="List artifacts for an analysis",
)
async def list_artifacts(
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ArtifactSummaryResponse]:
    """Return artifact summaries for this analysis (for download buttons)."""
    await _verify_analysis_ownership(db, analysis_id, current_user)
    artifacts = await artifact_service.list_artifacts_by_analysis(db, analysis_id)
    return [ArtifactSummaryResponse.model_validate(a) for a in artifacts]
