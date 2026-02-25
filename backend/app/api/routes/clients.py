"""Client management API endpoints.

Routes:
  POST   /clients              - Create client
  GET    /clients              - List clients (active; ?include_archived=true for all)
  GET    /clients/{client_id}  - Get single client
  PUT    /clients/{client_id}  - Update client
  PATCH  /clients/{client_id}/archive - Toggle archive
  DELETE /clients/{client_id}  - Hard delete (guarded by project existence)
"""

import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.services import audit_service, client_service

router = APIRouter(prefix="/clients", tags=["clients"])


# ── POST /clients ─────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new client",
)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    try:
        client = await client_service.create_client(db, current_user.id, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A client with that name already exists",
        )
    asyncio.create_task(
        audit_service.log(
            db,
            current_user.id,
            "client.created",
            "client",
            client.id,
            {"name": client.name},
        )
    )
    return ClientResponse.model_validate(client)


# ── GET /clients ──────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[ClientResponse],
    summary="List clients",
)
async def list_clients(
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClientResponse]:
    clients = await client_service.list_clients(db, current_user.id, include_archived)
    return [ClientResponse.model_validate(c) for c in clients]


# ── GET /clients/{client_id} ──────────────────────────────────────────────────

@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Get a client by ID",
)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    client = await client_service.get_client(db, client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return ClientResponse.model_validate(client)


# ── PUT /clients/{client_id} ──────────────────────────────────────────────────

@router.put(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Update a client",
)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    client = await client_service.get_client(db, client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    try:
        client = await client_service.update_client(db, client, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A client with that name already exists",
        )
    changed_fields = list(data.model_dump(exclude_none=True).keys())
    asyncio.create_task(
        audit_service.log(
            db,
            current_user.id,
            "client.updated",
            "client",
            client.id,
            {"changed_fields": changed_fields},
        )
    )
    return ClientResponse.model_validate(client)


# ── PATCH /clients/{client_id}/archive ───────────────────────────────────────

@router.patch(
    "/{client_id}/archive",
    response_model=ClientResponse,
    summary="Toggle client archive status",
)
async def toggle_archive(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    client = await client_service.get_client(db, client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    audit_action = "client.archived" if client.status == "active" else "client.unarchived"
    client = await client_service.toggle_archive(db, client)
    asyncio.create_task(
        audit_service.log(
            db,
            current_user.id,
            audit_action,
            "client",
            client.id,
            {"name": client.name},
        )
    )
    return ClientResponse.model_validate(client)


# ── DELETE /clients/{client_id} ───────────────────────────────────────────────

@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a client",
)
async def delete_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    client = await client_service.get_client(db, client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    client_name = client.name
    try:
        await client_service.delete_client(db, client)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete client with existing projects",
        )
    asyncio.create_task(
        audit_service.log(
            db,
            current_user.id,
            "client.deleted",
            "client",
            client_id,
            {"name": client_name},
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
