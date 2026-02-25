"""Persona management for persona-buildout objective (Story 5-2)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.persona import Persona

_PERSONA_FIELD_NAMES = [
    "name_title",
    "goals",
    "pain_points",
    "decision_drivers",
    "false_beliefs",
    "job_to_be_done",
    "usage_patterns",
    "objections",
    "success_metrics",
]


def completion_pct(persona: Persona) -> float:
    """Return fraction of 9 fields that are non-empty (0.0–1.0)."""
    count = 0
    for name in _PERSONA_FIELD_NAMES:
        val = getattr(persona, name, None)
        if val is not None and str(val).strip():
            count += 1
    return round(count / 9.0, 4) if count else 0.0


def staleness_decay_pct(last_analyzed_at: datetime | None) -> float:
    """Return decay as a fraction 0.0–1.0: 0.05 per month since last_analyzed_at, capped at 1.0."""
    if last_analyzed_at is None:
        return 0.0
    now = datetime.now(timezone.utc)
    if last_analyzed_at.tzinfo is None:
        last_analyzed_at = last_analyzed_at.replace(tzinfo=timezone.utc)
    delta = now - last_analyzed_at
    months = delta.total_seconds() / (30.0 * 24 * 3600)
    return round(min(1.0, months * 0.05), 4)


async def get_persona_by_project(
    db: AsyncSession, project_id: uuid.UUID
) -> Persona | None:
    """Return the persona for the project, or None if none exists."""
    stmt = select(Persona).where(Persona.project_id == project_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def upsert_persona(
    db: AsyncSession,
    project_id: uuid.UUID,
    *,
    confidence_score: float | None,
    name_title: str | None,
    goals: str | None,
    pain_points: str | None,
    decision_drivers: str | None,
    false_beliefs: str | None,
    job_to_be_done: str | None,
    usage_patterns: str | None,
    objections: str | None,
    success_metrics: str | None,
    field_quality: dict | None,
) -> Persona:
    """Create or update the persona for the project. Caller must commit."""
    now = datetime.now(timezone.utc)
    existing = await get_persona_by_project(db, project_id)
    if existing:
        existing.confidence_score = confidence_score
        existing.name_title = name_title
        existing.goals = goals
        existing.pain_points = pain_points
        existing.decision_drivers = decision_drivers
        existing.false_beliefs = false_beliefs
        existing.job_to_be_done = job_to_be_done
        existing.usage_patterns = usage_patterns
        existing.objections = objections
        existing.success_metrics = success_metrics
        existing.field_quality = field_quality
        existing.last_analyzed_at = now
        existing.updated_at = now
        await db.flush()
        return existing
    persona = Persona(
        project_id=project_id,
        confidence_score=confidence_score,
        name_title=name_title,
        goals=goals,
        pain_points=pain_points,
        decision_drivers=decision_drivers,
        false_beliefs=false_beliefs,
        job_to_be_done=job_to_be_done,
        usage_patterns=usage_patterns,
        objections=objections,
        success_metrics=success_metrics,
        field_quality=field_quality,
        last_analyzed_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(persona)
    await db.flush()
    return persona
