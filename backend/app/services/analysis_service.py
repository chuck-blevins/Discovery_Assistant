"""Business logic for analysis management."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.analysis import Analysis
from app.models.insight import Insight

_VALID_INSIGHT_TYPES = {"finding", "contradiction", "gap"}


def _validate_insights(insights_data: list[dict], *, allow_empty: bool = False) -> None:
    """Raise ValueError if any insight dict fails structural validation."""
    if not insights_data and not allow_empty:
        raise ValueError(
            "Insights list cannot be empty. Claude is instructed to return 4-8 insights; "
            "empty list indicates upstream parsing or API failure."
        )
    for i, ins in enumerate(insights_data):
        ins_type = ins.get("type")
        if ins_type not in _VALID_INSIGHT_TYPES:
            raise ValueError(
                f"Insight[{i}] has invalid type {ins_type!r}. "
                f"Must be one of {sorted(_VALID_INSIGHT_TYPES)}."
            )
        if not str(ins.get("text", "")).strip():
            raise ValueError(f"Insight[{i}] has empty text.")
        if ins_type in ("finding", "contradiction") and not ins.get("citation"):
            raise ValueError(
                f"Insight[{i}] of type {ins_type!r} requires a non-null citation."
            )
        # confidence: must be None or float in [0.0, 1.0] for finding/contradiction; gap must be None
        conf = ins.get("confidence")
        if ins_type == "gap":
            if conf is not None:
                raise ValueError(
                    f"Insight[{i}] of type 'gap' must have confidence null, got {conf!r}."
                )
        else:
            if conf is not None:
                if not isinstance(conf, (int, float)):
                    raise ValueError(
                        f"Insight[{i}] confidence must be a number or null, got {type(conf).__name__}."
                    )
                c = float(conf)
                if not (0.0 <= c <= 1.0):
                    raise ValueError(
                        f"Insight[{i}] confidence must be in [0.0, 1.0], got {c}."
                    )


async def create_analysis(
    db: AsyncSession,
    project_id: uuid.UUID,
    objective: str,
    confidence_score: float,
    raw_response: str,
    tokens_used: int,
    cost_usd: float,
    insights_data: list[dict],
    *,
    positioning_result: dict | None = None,
    allow_empty_insights: bool = False,
) -> Analysis:
    """Create an analysis record with its insights. Caller must commit the session."""
    _validate_insights(
        insights_data,
        allow_empty=positioning_result is not None or allow_empty_insights,
    )

    analysis = Analysis(
        id=uuid.uuid4(),
        project_id=project_id,
        objective=objective,
        confidence_score=confidence_score,
        raw_response=raw_response,
        tokens_used=tokens_used,
        cost_usd=cost_usd,
        positioning_result=positioning_result,
        created_at=datetime.now(timezone.utc),
    )
    db.add(analysis)
    await db.flush()  # get analysis.id before creating insights

    for ins_data in insights_data:
        insight = Insight(
            id=uuid.uuid4(),
            analysis_id=analysis.id,
            type=ins_data.get("type", "finding"),
            text=ins_data.get("text", ""),
            citation=ins_data.get("citation"),
            confidence=ins_data.get("confidence"),
            source_count=int(ins_data.get("source_count", 0)),
            created_at=datetime.now(timezone.utc),
        )
        db.add(insight)

    await db.flush()
    # Re-query with selectinload so analysis.insights is populated (same transaction)
    stmt = (
        select(Analysis)
        .options(selectinload(Analysis.insights))
        .where(Analysis.id == analysis.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_analysis(
    db: AsyncSession,
    analysis_id: uuid.UUID,
) -> Analysis | None:
    """Return analysis with insights by id, or None if not found."""
    stmt = (
        select(Analysis)
        .options(selectinload(Analysis.insights))
        .where(Analysis.id == analysis_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_analyses(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> list[Analysis]:
    """Return analyses for a project ordered by created_at DESC, with insights loaded."""
    stmt = (
        select(Analysis)
        .options(selectinload(Analysis.insights))
        .where(Analysis.project_id == project_id)
        .order_by(Analysis.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def has_recent_analysis(
    db: AsyncSession,
    project_id: uuid.UUID,
    within_seconds: int = 60,
) -> bool:
    """Return True if an analysis was created for this project within the last N seconds."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=within_seconds)
    stmt = (
        select(Analysis.id)
        .where(Analysis.project_id == project_id)
        .where(Analysis.created_at >= cutoff)
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def get_project_cost_totals(
    db: AsyncSession,
    project_ids: list[uuid.UUID],
) -> dict[uuid.UUID, float]:
    """Return total cost_usd per project (sum of analyses). Story 6-3."""
    if not project_ids:
        return {}
    stmt = (
        select(Analysis.project_id, func.coalesce(func.sum(Analysis.cost_usd), 0).label("total"))
        .where(Analysis.project_id.in_(project_ids))
        .group_by(Analysis.project_id)
    )
    result = await db.execute(stmt)
    rows = result.all()
    by_id = {row.project_id: float(row.total) for row in rows}
    return {pid: by_id.get(pid, 0.0) for pid in project_ids}
