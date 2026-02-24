"""Data source API endpoints.

Routes:
  POST   /projects/{project_id}/data-sources/upload  - Upload one or more files
  POST   /projects/{project_id}/data-sources/paste   - Paste raw text
  GET    /projects/{project_id}/data-sources         - List data sources
  GET    /data-sources/{data_source_id}/preview      - Preview raw text (first 500 chars)
  DELETE /data-sources/{data_source_id}              - Hard delete
"""

import asyncio
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.data_source import DataSource
from app.models.user import User
from app.schemas.data_source import DataSourcePasteCreate, DataSourcePreviewResponse, DataSourceResponse
from app.services import audit_service, client_service, data_source_service, file_parser, project_service, storage_service

router = APIRouter(tags=["data-sources"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB per file


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
    return project


async def _get_data_source_with_ownership(
    db: AsyncSession,
    data_source_id: uuid.UUID,
    current_user: User,
) -> DataSource:
    """Fetch data source and verify ownership through project→client chain. 404 if not found."""
    ds = await data_source_service.get_data_source(db, data_source_id)
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    project = await project_service.get_project(db, ds.project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    client = await client_service.get_client(db, project.client_id, current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    return ds


# ── POST /projects/{project_id}/data-sources/upload ──────────────────────────

@router.post(
    "/projects/{project_id}/data-sources/upload",
    response_model=list[DataSourceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload one or more files as data sources",
)
async def upload_files(
    project_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    collected_date: Optional[str] = Form(None),
    creator_name: Optional[str] = Form(None),
    purpose: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DataSourceResponse]:
    await _verify_project_ownership(db, project_id, current_user)

    # Parse optional date string
    parsed_date: Optional[date] = None
    if collected_date:
        try:
            parsed_date = date.fromisoformat(collected_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="collected_date must be a valid ISO date (YYYY-MM-DD)",
            )

    results: list[DataSourceResponse] = []
    # Track fully committed sources so they can be rolled back on mid-batch failure
    committed: list[DataSource] = []

    for f in files:
        filename = f.filename or "upload"
        file_bytes = await f.read()

        async def _rollback() -> None:
            for prev_ds in committed:
                if prev_ds.file_path:
                    await asyncio.to_thread(storage_service.delete_file, prev_ds.file_path)
                await data_source_service.delete_data_source(db, prev_ds)

        # Enforce per-file size limit
        if len(file_bytes) > MAX_UPLOAD_BYTES:
            await _rollback()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{filename}' exceeds maximum upload size of 10 MB",
            )

        content_type = f.content_type or "application/octet-stream"

        # Parse file to extract raw text
        try:
            raw_text = file_parser.parse_file(filename, file_bytes)
        except ValueError as exc:
            await _rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            )

        # Create DB record first to get data_source.id for the storage key
        ds = await data_source_service.create_data_source(
            db=db,
            project_id=project_id,
            source_type="file",
            file_name=filename,
            raw_text=raw_text,
            file_path=None,  # will be updated after storage upload
            content_type=content_type,
            collected_date=parsed_date,
            creator_name=creator_name,
            purpose=purpose,
        )

        # Upload original file to storage (off the event loop); update file_path on success
        storage_key = f"{project_id}/{ds.id}/{filename}"
        try:
            await asyncio.to_thread(storage_service.upload_file, file_bytes, storage_key, content_type)
            ds = await data_source_service.update_file_path(db, ds, storage_key)
        except Exception:
            # Storage upload failed — delete this file's DB record, roll back prior files
            await data_source_service.delete_data_source(db, ds)
            await _rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File storage failed. Please try again.",
            )

        committed.append(ds)
        asyncio.create_task(
            audit_service.log(
                db,
                current_user.id,
                "data_source.created",
                "data_source",
                ds.id,
                {"file_name": filename, "source_type": "file", "project_id": str(project_id)},
            )
        )
        results.append(DataSourceResponse.model_validate(ds))

    return results


# ── POST /projects/{project_id}/data-sources/paste ───────────────────────────

@router.post(
    "/projects/{project_id}/data-sources/paste",
    response_model=list[DataSourceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Paste raw text as a data source",
)
async def paste_text(
    project_id: uuid.UUID,
    data: DataSourcePasteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DataSourceResponse]:
    await _verify_project_ownership(db, project_id, current_user)

    ds = await data_source_service.create_data_source(
        db=db,
        project_id=project_id,
        source_type="paste",
        file_name=data.file_name or "paste",
        raw_text=data.raw_text,
        file_path=None,
        content_type=None,
        collected_date=data.collected_date,
        creator_name=data.creator_name,
        purpose=data.purpose,
    )

    asyncio.create_task(
        audit_service.log(
            db,
            current_user.id,
            "data_source.created",
            "data_source",
            ds.id,
            {"file_name": ds.file_name, "source_type": "paste", "project_id": str(project_id)},
        )
    )
    return [DataSourceResponse.model_validate(ds)]


# ── GET /projects/{project_id}/data-sources ──────────────────────────────────

@router.get(
    "/projects/{project_id}/data-sources",
    response_model=list[DataSourceResponse],
    summary="List data sources for a project",
)
async def list_data_sources(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DataSourceResponse]:
    await _verify_project_ownership(db, project_id, current_user)
    sources = await data_source_service.list_data_sources(db, project_id)
    return [DataSourceResponse.model_validate(s) for s in sources]


# ── GET /data-sources/{data_source_id}/preview ───────────────────────────────

@router.get(
    "/data-sources/{data_source_id}/preview",
    response_model=DataSourcePreviewResponse,
    summary="Preview first 500 chars of a data source's raw text",
)
async def preview_data_source(
    data_source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DataSourcePreviewResponse:
    ds = await _get_data_source_with_ownership(db, data_source_id, current_user)
    preview = (ds.raw_text or "")[:500]
    return DataSourcePreviewResponse(
        id=ds.id,
        file_name=ds.file_name,
        raw_text_preview=preview,
    )


# ── DELETE /data-sources/{data_source_id} ────────────────────────────────────

@router.delete(
    "/data-sources/{data_source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hard delete a data source",
)
async def delete_data_source(
    data_source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    ds = await _get_data_source_with_ownership(db, data_source_id, current_user)

    # Best-effort storage deletion (off the event loop; swallows errors internally)
    if ds.file_path:
        await asyncio.to_thread(storage_service.delete_file, ds.file_path)

    file_name = ds.file_name
    project_id = ds.project_id

    await data_source_service.delete_data_source(db, ds)

    asyncio.create_task(
        audit_service.log(
            db,
            current_user.id,
            "data_source.deleted",
            "data_source",
            data_source_id,
            {"file_name": file_name, "project_id": str(project_id)},
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
