"""ICP management for icp-refinement objective (Story 5-3)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.icp import Icp

_ICP_DIMENSION_NAMES = [
    "company_size",
    "industries",
    "geography",
    "revenue",
    "tech_stack",
    "use_case_fit",
    "buying_process",
    "budget",
    "maturity",
    "custom",
]


async def get_icp_by_project(db: AsyncSession, project_id: uuid.UUID) -> Icp | None:
    """Return the ICP for the project, or None if none exists."""
    stmt = select(Icp).where(Icp.project_id == project_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def upsert_icp(
    db: AsyncSession,
    project_id: uuid.UUID,
    *,
    confidence_score: float | None,
    company_size: str | None = None,
    industries: str | None = None,
    geography: str | None = None,
    revenue: str | None = None,
    tech_stack: str | None = None,
    use_case_fit: str | None = None,
    buying_process: str | None = None,
    budget: str | None = None,
    maturity: str | None = None,
    custom: str | None = None,
    dimension_confidence: dict | None = None,
) -> Icp:
    """Create or update the ICP for the project. Caller must commit."""
    now = datetime.now(timezone.utc)
    dimension_values = {
        "company_size": company_size,
        "industries": industries,
        "geography": geography,
        "revenue": revenue,
        "tech_stack": tech_stack,
        "use_case_fit": use_case_fit,
        "buying_process": buying_process,
        "budget": budget,
        "maturity": maturity,
        "custom": custom,
    }
    existing = await get_icp_by_project(db, project_id)
    if existing:
        existing.confidence_score = confidence_score
        for name in _ICP_DIMENSION_NAMES:
            setattr(existing, name, dimension_values.get(name))
        existing.dimension_confidence = dimension_confidence
        existing.last_analyzed_at = now
        existing.updated_at = now
        await db.flush()
        return existing
    icp = Icp(
        project_id=project_id,
        confidence_score=confidence_score,
        company_size=company_size,
        industries=industries,
        geography=geography,
        revenue=revenue,
        tech_stack=tech_stack,
        use_case_fit=use_case_fit,
        buying_process=buying_process,
        budget=budget,
        maturity=maturity,
        custom=custom,
        dimension_confidence=dimension_confidence,
        last_analyzed_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(icp)
    await db.flush()
    return icp
