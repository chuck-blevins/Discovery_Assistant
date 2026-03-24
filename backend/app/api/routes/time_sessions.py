"""Time session API endpoints.

Routes:
  POST   /clients/{client_id}/sessions        - Log a session
  GET    /clients/{client_id}/sessions        - List sessions
  DELETE /clients/{client_id}/sessions/{id}  - Delete a session
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.time_session import TimeSessionCreate, TimeSessionResponse
from app.services import time_session_service

router = APIRouter(tags=["time-sessions"])


@router.post(
    "/clients/{client_id}/sessions",
    response_model=TimeSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a work session",
)
async def create_session(
    client_id: uuid.UUID,
    data: TimeSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeSessionResponse:
    session = await time_session_service.create_session(db, current_user.id, client_id, data)
    return TimeSessionResponse.model_validate(session)


@router.get(
    "/clients/{client_id}/sessions",
    response_model=list[TimeSessionResponse],
    summary="List work sessions for a client",
)
async def list_sessions(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TimeSessionResponse]:
    sessions = await time_session_service.list_sessions(db, current_user.id, client_id)
    return [TimeSessionResponse.model_validate(s) for s in sessions]


@router.delete(
    "/clients/{client_id}/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a work session",
)
async def delete_session(
    client_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    deleted = await time_session_service.delete_session(db, current_user.id, session_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
