"""Artifact download endpoint (Story 6-2)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.services import (
    analysis_service,
    artifact_service,
    client_service,
    project_service,
)

router = APIRouter(tags=["artifacts"])


async def _verify_artifact_ownership(
    db: AsyncSession,
    artifact_id: uuid.UUID,
    current_user: User,
):
    """Load artifact and verify user owns it via analysis -> project -> client. 404 if not."""
    artifact = await artifact_service.get_artifact(db, artifact_id)
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")
    analysis = await analysis_service.get_analysis(db, artifact.analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")
    project = await project_service.get_project(db, analysis.project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")
    return artifact


@router.get(
    "/artifacts/{artifact_id}/download",
    summary="Download artifact as .md file",
)
async def download_artifact(
    artifact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return artifact content as markdown with Content-Disposition attachment."""
    artifact = await _verify_artifact_ownership(db, artifact_id, current_user)
    return PlainTextResponse(
        content=artifact.content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{artifact.file_name}"',
        },
    )