"""Artifact generation and listing (Story 6-2)."""

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.analysis import Analysis
from app.models.artifact import Artifact
from app.models.project import Project
from app.services import persona_service, icp_service

ARTIFACT_TYPES = (
    "interview_script",
    "survey_template",
    "persona_template",
    "icp_summary",
    "positioning_statement",
)

# Safe for Content-Disposition and filesystem: alphanumeric, hyphen, underscore, period only.
_FILENAME_UNSAFE_RE = re.compile(r"[^\w\-.]")


def _safe_filename(project_name: str, max_len: int = 50) -> str:
    """Return a safe filename segment from project name (no path chars, no quotes)."""
    safe = _FILENAME_UNSAFE_RE.sub("_", project_name or "project").strip("._") or "project"
    return safe[:max_len]


def _metadata_footer(
    project_name: str,
    confidence_score: float | None,
    sources_count: int | None,
    generated_at: datetime,
) -> str:
    """Append metadata footer to artifact content."""
    conf_str = f"{confidence_score * 100:.0f}%" if confidence_score is not None else "—"
    src_str = str(sources_count) if sources_count is not None else "—"
    return f"\n\n---\nGenerated: {generated_at.isoformat()} | Project: {project_name} | Confidence: {conf_str} | Sources: {src_str}\n"


def _build_interview_script(
    analysis: Analysis,
    project: Project,
    generated_at: datetime,
) -> str:
    rec = analysis.recommendations or {}
    body = (rec.get("interview_script_md") or "").replace("\\n", "\n").strip()
    if not body:
        body = "# Interview script\n\nPre-filled for this project objective. Add questions and notes below.\n"
    return body + _metadata_footer(
        project.name,
        analysis.confidence_score,
        len(analysis.insights) if analysis.insights else None,
        generated_at,
    )


def _build_survey_template(
    analysis: Analysis,
    project: Project,
    generated_at: datetime,
) -> str:
    rec = analysis.recommendations or {}
    body = (rec.get("survey_template_md") or "").replace("\\n", "\n").strip()
    if not body:
        body = "# Survey template\n\nSuggested questions for this objective.\n"
    return body + _metadata_footer(
        project.name,
        analysis.confidence_score,
        len(analysis.insights) if analysis.insights else None,
        generated_at,
    )


def _build_persona_template_md(persona, project_name: str, generated_at: datetime) -> str:
    """Format persona as markdown."""
    lines = [f"# Persona — {project_name}", ""]
    fields = [
        ("name_title", "Name / Title"),
        ("goals", "Goals"),
        ("pain_points", "Pain Points"),
        ("decision_drivers", "Decision Drivers"),
        ("false_beliefs", "False Beliefs"),
        ("job_to_be_done", "Job to Be Done"),
        ("usage_patterns", "Usage Patterns"),
        ("objections", "Objections"),
        ("success_metrics", "Success Metrics"),
    ]
    for attr, label in fields:
        val = getattr(persona, attr, None)
        if val and str(val).strip():
            lines.append(f"## {label}")
            lines.append("")
            lines.append(str(val).strip())
            lines.append("")
    conf = getattr(persona, "confidence_score", None)
    return "\n".join(lines) + _metadata_footer(project_name, conf, None, generated_at)


def _build_icp_summary_md(icp, project_name: str, generated_at: datetime) -> str:
    """Format ICP as markdown."""
    dims = [
        ("company_size", "Company Size"),
        ("industries", "Industries"),
        ("geography", "Geography"),
        ("revenue", "Revenue"),
        ("tech_stack", "Tech Stack"),
        ("use_case_fit", "Use Case Fit"),
        ("buying_process", "Buying Process"),
        ("budget", "Budget"),
        ("maturity", "Maturity"),
        ("custom", "Custom"),
    ]
    lines = [f"# ICP Summary — {project_name}", ""]
    for attr, label in dims:
        val = getattr(icp, attr, None)
        if val and str(val).strip():
            lines.append(f"## {label}")
            lines.append("")
            lines.append(str(val).strip())
            lines.append("")
    conf = getattr(icp, "confidence_score", None)
    return "\n".join(lines) + _metadata_footer(project_name, conf, None, generated_at)


def _build_positioning_statement_md(analysis: Analysis, project: Project, generated_at: datetime) -> str:
    """Format positioning_result as markdown."""
    pr = analysis.positioning_result or {}
    lines = [f"# Positioning — {project.name}", ""]
    vds = pr.get("value_drivers") or []
    if vds:
        lines.append("## Value drivers")
        lines.append("")
        for v in vds:
            text = v.get("text", "")
            cnt = v.get("frequency_count", 0)
            lines.append(f"- {text} ({cnt} source(s))")
        lines.append("")
    angles = pr.get("alternative_angles") or []
    if angles:
        lines.append("## Alternative angles")
        lines.append("")
        for a in angles:
            lines.append(f"- {a}")
        lines.append("")
    return "\n".join(lines) + _metadata_footer(
        project.name,
        analysis.confidence_score,
        len(analysis.insights) if analysis.insights else None,
        generated_at,
    )


async def list_artifacts_by_analysis(
    db: AsyncSession,
    analysis_id: uuid.UUID,
) -> list[Artifact]:
    """Return artifacts for an analysis, ordered by generated_at."""
    stmt = (
        select(Artifact)
        .where(Artifact.analysis_id == analysis_id)
        .order_by(Artifact.generated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_artifacts_for_analysis(
    db: AsyncSession,
    analysis_id: uuid.UUID,
) -> list[Artifact]:
    """Generate and persist artifacts for an analysis. Returns created artifacts."""
    stmt = (
        select(Analysis)
        .options(selectinload(Analysis.insights))
        .where(Analysis.id == analysis_id)
    )
    res = await db.execute(stmt)
    analysis = res.scalar_one_or_none()
    if not analysis:
        return []

    proj_stmt = select(Project).where(Project.id == analysis.project_id)
    proj_res = await db.execute(proj_stmt)
    project = proj_res.scalar_one_or_none()
    if not project:
        return []

    generated_at = datetime.now(timezone.utc)
    created: list[Artifact] = []

    # Interview script and survey template (from recommendations or placeholder)
    name_safe = _safe_filename(project.name)
    for art_type, file_suffix, builder in [
        ("interview_script", "interview-script", _build_interview_script),
        ("survey_template", "survey-template", _build_survey_template),
    ]:
        content = builder(analysis, project, generated_at)
        file_name = f"{file_suffix}-{name_safe}.md"
        art = Artifact(
            id=uuid.uuid4(),
            analysis_id=analysis_id,
            artifact_type=art_type,
            content=content,
            file_name=file_name,
            generated_at=generated_at,
        )
        db.add(art)
        created.append(art)

    # Persona template (if project has persona)
    persona = await persona_service.get_persona_by_project(db, analysis.project_id)
    if persona:
        content = _build_persona_template_md(persona, project.name, generated_at)
        art = Artifact(
            id=uuid.uuid4(),
            analysis_id=analysis_id,
            artifact_type="persona_template",
            content=content,
            file_name=f"persona-{name_safe}.md",
            generated_at=generated_at,
        )
        db.add(art)
        created.append(art)

    # ICP summary (if project has ICP)
    icp = await icp_service.get_icp_by_project(db, analysis.project_id)
    if icp:
        content = _build_icp_summary_md(icp, project.name, generated_at)
        art = Artifact(
            id=uuid.uuid4(),
            analysis_id=analysis_id,
            artifact_type="icp_summary",
            content=content,
            file_name=f"icp-summary-{name_safe}.md",
            generated_at=generated_at,
        )
        db.add(art)
        created.append(art)

    # Positioning statement (if analysis has positioning_result)
    if analysis.positioning_result:
        content = _build_positioning_statement_md(analysis, project, generated_at)
        art = Artifact(
            id=uuid.uuid4(),
            analysis_id=analysis_id,
            artifact_type="positioning_statement",
            content=content,
            file_name=f"positioning-{name_safe}.md",
            generated_at=generated_at,
        )
        db.add(art)
        created.append(art)

    await db.flush()
    return created


async def get_artifact(
    db: AsyncSession,
    artifact_id: uuid.UUID,
) -> Artifact | None:
    """Return artifact by id."""
    stmt = select(Artifact).where(Artifact.id == artifact_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
