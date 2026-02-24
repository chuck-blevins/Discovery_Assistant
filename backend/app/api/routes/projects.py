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
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services import audit_service, client_service, project_service

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
        audit_service.log(
            db,
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
    return [_project_to_response(p) for p in projects]


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
    return _project_to_response(project)


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
        audit_service.log(
            db,
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
        audit_service.log(
            db,
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
        audit_service.log(
            db,
            current_user.id,
            "project.deleted",
            "project",
            project_id,
            {"name": project_name, "client_id": str(client_id)},
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
