"""Business logic for onboarding summary management."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.onboarding_summary import OnboardingSummary


async def get_onboarding_summary(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> OnboardingSummary | None:
    """Return the onboarding summary for a project, or None if it doesn't exist."""
    result = await db.execute(
        select(OnboardingSummary).where(OnboardingSummary.project_id == project_id)
    )
    return result.scalar_one_or_none()


async def upsert_onboarding_summary(
    db: AsyncSession,
    project_id: uuid.UUID,
    themes: list,
    interest_points: list,
    gaps: list,
    summary: str,
    confidence_score: float,
) -> OnboardingSummary:
    """Create or update the onboarding summary for a project."""
    now = datetime.now(timezone.utc)
    existing = await get_onboarding_summary(db, project_id)
    if existing:
        existing.themes = themes
        existing.interest_points = interest_points
        existing.gaps = gaps
        existing.summary = summary
        existing.confidence_score = confidence_score
        existing.last_analyzed_at = now
        existing.updated_at = now
        await db.flush()
        return existing

    row = OnboardingSummary(
        id=uuid.uuid4(),
        project_id=project_id,
        themes=themes,
        interest_points=interest_points,
        gaps=gaps,
        summary=summary,
        confidence_score=confidence_score,
        last_analyzed_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    await db.flush()
    return row
