"""Project management API endpoints.

Routes:
  POST   /clients/{client_id}/projects          - Create project
  GET    /clients/{client_id}/projects          - List projects (?include_archived=true)
  GET    /projects/{project_id}                 - Get single project
  PUT    /projects/{project_id}                 - Update project
  PATCH  /projects/{project_id}/archive         - Toggle archive
  DELETE /projects/{project_id}                 - Hard delete
"""

import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.icp import IcpResponse
from app.schemas.persona import PersonaResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services import (
    analysis_service,
    audit_service,
    client_service,
    icp_service,
    persona_service,
    project_service,
)

router = APIRouter(tags=["projects"])


def _project_to_response(project) -> ProjectResponse:
    """Convert ORM project to ProjectResponse, applying staleness decay."""
    response = ProjectResponse.model_validate(project)
    response.confidence_score = project_service.apply_staleness_decay(
        project.confidence_score, project.last_analyzed_at
    )
    return response


# ── POST /clients/{client_id}/projects ───────────────────────────────────────

@router.post(
    "/clients/{client_id}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project under a client",
)
async def create_project(
    client_id: uuid.UUID,
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    client = await client_service.get_client(db, client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    try:
        project = await project_service.create_project(db, client_id, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with that name already exists for this client",
        )
    asyncio.create_task(
        audit_service.log_in_new_session(
            current_user.id,
            "project.created",
            "project",
            project.id,
            {"name": project.name, "client_id": str(client_id)},
        )
    )
    return _project_to_response(project)


# ── GET /clients/{client_id}/projects ────────────────────────────────────────

@router.get(
    "/clients/{client_id}/projects",
    response_model=list[ProjectResponse],
    summary="List projects for a client",
)
async def list_projects(
    client_id: uuid.UUID,
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectResponse]:
    client = await client_service.get_client(db, client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    projects = await project_service.list_projects(db, client_id, include_archived)
    totals = await analysis_service.get_project_cost_totals(db, [p.id for p in projects])
    return [
        _project_to_response(p).model_copy(update={"total_cost_usd": totals.get(p.id, 0.0)})
        for p in projects
    ]


# ── GET /projects/{project_id}/persona ───────────────────────────────────────── (Story 5-2)

@router.get(
    "/projects/{project_id}/persona",
    response_model=PersonaResponse,
    summary="Get persona for a project (persona-buildout objective)",
)
async def get_project_persona(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PersonaResponse:
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    persona = await persona_service.get_persona_by_project(db, project_id)
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No persona for this project")
    completion = persona_service.completion_pct(persona)
    decay = persona_service.staleness_decay_pct(persona.last_analyzed_at)
    return PersonaResponse(
        id=persona.id,
        project_id=persona.project_id,
        confidence_score=persona.confidence_score,
        name_title=persona.name_title,
        goals=persona.goals,
        pain_points=persona.pain_points,
        decision_drivers=persona.decision_drivers,
        false_beliefs=persona.false_beliefs,
        job_to_be_done=persona.job_to_be_done,
        usage_patterns=persona.usage_patterns,
        objections=persona.objections,
        success_metrics=persona.success_metrics,
        field_quality=persona.field_quality,
        completion_pct=completion,
        staleness_decay_pct=decay,
        last_analyzed_at=persona.last_analyzed_at,
        created_at=persona.created_at,
        updated_at=persona.updated_at,
    )


# ── GET /projects/{project_id}/icp ───────────────────────────────────────────── (Story 5-3)

@router.get(
    "/projects/{project_id}/icp",
    response_model=IcpResponse,
    summary="Get ICP for a project (icp-refinement objective)",
)
async def get_project_icp(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IcpResponse:
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    icp = await icp_service.get_icp_by_project(db, project_id)
    if not icp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No ICP for this project")
    return IcpResponse.model_validate(icp)


# ── GET /projects/{project_id} ────────────────────────────────────────────────

@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Get a project by ID",
)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    # Verify ownership via client
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    totals = await analysis_service.get_project_cost_totals(db, [project.id])
    return _project_to_response(project).model_copy(
        update={"total_cost_usd": totals.get(project.id, 0.0)}
    )


# ── PUT /projects/{project_id} ────────────────────────────────────────────────

@router.put(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Update a project",
)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    changed_fields = list(data.model_dump(exclude_none=True).keys())
    try:
        project = await project_service.update_project(db, project, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with that name already exists for this client",
        )
    asyncio.create_task(
        audit_service.log_in_new_session(
            current_user.id,
            "project.updated",
            "project",
            project.id,
            {"changed_fields": changed_fields},
        )
    )
    return _project_to_response(project)


# ── PATCH /projects/{project_id}/archive ─────────────────────────────────────

@router.patch(
    "/projects/{project_id}/archive",
    response_model=ProjectResponse,
    summary="Toggle project archive status",
)
async def toggle_archive(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    audit_action = "project.archived" if project.status == "active" else "project.unarchived"
    project = await project_service.toggle_archive(db, project)
    asyncio.create_task(
        audit_service.log_in_new_session(
            current_user.id,
            audit_action,
            "project",
            project.id,
            {"name": project.name},
        )
    )
    return _project_to_response(project)


# ── DELETE /projects/{project_id} ────────────────────────────────────────────

@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    project_name = project.name
    client_id = project.client_id
    await project_service.delete_project(db, project)
    asyncio.create_task(
        audit_service.log_in_new_session(
            current_user.id,
            "project.deleted",
            "project",
            project_id,
            {"name": project_name, "client_id": str(client_id)},
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
