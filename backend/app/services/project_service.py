"""Business logic for project management."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


async def create_project(
    db: AsyncSession,
    client_id: uuid.UUID,
    data: ProjectCreate,
) -> Project:
    """Create and persist a new project."""
    project = Project(
        id=uuid.uuid4(),
        client_id=client_id,
        name=data.name,
        objective=data.objective,
        target_segments=data.target_segments,
        status="active",
        confidence_score=None,
        last_analyzed_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def list_projects(
    db: AsyncSession,
    client_id: uuid.UUID,
    include_archived: bool = False,
) -> list[Project]:
    """Return projects for client. Excludes archived unless include_archived=True."""
    stmt = select(Project).where(Project.client_id == client_id)
    if not include_archived:
        stmt = stmt.where(Project.status == "active")
    stmt = stmt.order_by(Project.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_project(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> Project | None:
    """Return project by id, or None if not found."""
    stmt = select(Project).where(Project.id == project_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_project(
    db: AsyncSession,
    project: Project,
    data: ProjectUpdate,
) -> Project:
    """Apply non-None fields from data to project, commit, and return refreshed."""
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return project


async def toggle_archive(
    db: AsyncSession,
    project: Project,
) -> Project:
    """Toggle archive status. active→archived or archived→active."""
    if project.status == "active":
        project.status = "archived"
        project.archived_at = datetime.now(timezone.utc)
    else:
        project.status = "active"
        project.archived_at = None
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(
    db: AsyncSession,
    project: Project,
) -> None:
    """Hard-delete a project."""
    await db.delete(project)
    await db.commit()


async def update_project_confidence(
    db: AsyncSession,
    project_id: uuid.UUID,
    confidence_score: float,
    *,
    commit: bool = True,
) -> Project | None:
    """Update project.confidence_score and last_analyzed_at after a successful analysis."""
    project = await get_project(db, project_id)
    if not project:
        return None
    project.confidence_score = confidence_score
    project.last_analyzed_at = datetime.now(timezone.utc)
    project.updated_at = datetime.now(timezone.utc)
    if commit:
        await db.commit()
        await db.refresh(project)
    else:
        await db.flush()
    return project


def apply_staleness_decay(
    confidence_score: float | None,
    last_analyzed_at: datetime | None,
) -> float | None:
    """Compute confidence with -5%/month staleness decay. Pure function, no DB I/O.

    Returns:
        None if never analyzed (confidence_score or last_analyzed_at is None).
        Decayed float clamped to [0.0, 0.95] otherwise.
    """
    if confidence_score is None or last_analyzed_at is None:
        return confidence_score
    now = datetime.now(timezone.utc)
    # Ensure last_analyzed_at is timezone-aware for comparison
    if last_analyzed_at.tzinfo is None:
        last_analyzed_at = last_analyzed_at.replace(tzinfo=timezone.utc)
    months_elapsed = (now - last_analyzed_at).days / 30.0
    decayed = confidence_score - (0.05 * months_elapsed)
    return max(0.0, min(0.95, decayed))
