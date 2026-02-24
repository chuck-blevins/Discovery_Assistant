"""Business logic for data source management."""

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_source import DataSource


async def create_data_source(
    db: AsyncSession,
    project_id: uuid.UUID,
    source_type: str,
    file_name: str,
    raw_text: Optional[str],
    file_path: Optional[str],
    content_type: Optional[str] = None,
    collected_date: Optional[date] = None,
    creator_name: Optional[str] = None,
    purpose: Optional[str] = None,
) -> DataSource:
    """Create and persist a new data source record."""
    ds = DataSource(
        id=uuid.uuid4(),
        project_id=project_id,
        source_type=source_type,
        file_name=file_name,
        raw_text=raw_text,
        file_path=file_path,
        content_type=content_type,
        collected_date=collected_date,
        creator_name=creator_name,
        purpose=purpose,
        created_at=datetime.now(timezone.utc),
    )
    db.add(ds)
    await db.commit()
    await db.refresh(ds)
    return ds


async def list_data_sources(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> list[DataSource]:
    """Return all data sources for a project, ordered by created_at DESC."""
    stmt = (
        select(DataSource)
        .where(DataSource.project_id == project_id)
        .order_by(DataSource.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_data_source(
    db: AsyncSession,
    data_source_id: uuid.UUID,
) -> DataSource | None:
    """Return a data source by id, or None if not found."""
    stmt = select(DataSource).where(DataSource.id == data_source_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_file_path(
    db: AsyncSession,
    data_source: DataSource,
    file_path: str,
) -> DataSource:
    """Update the file_path on a data source after successful storage upload."""
    data_source.file_path = file_path
    await db.commit()
    await db.refresh(data_source)
    return data_source


async def delete_data_source(
    db: AsyncSession,
    data_source: DataSource,
) -> None:
    """Hard-delete a data source record."""
    await db.delete(data_source)
    await db.commit()
