"""Add personas table for persona-buildout objective (Story 5-2).

Revision ID: 008_add_personas_table
Revises: 007_add_positioning_result
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "008_add_personas_table"
down_revision = "007_add_positioning_result"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "personas",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("name_title", sa.Text(), nullable=True),
        sa.Column("goals", sa.Text(), nullable=True),
        sa.Column("pain_points", sa.Text(), nullable=True),
        sa.Column("decision_drivers", sa.Text(), nullable=True),
        sa.Column("false_beliefs", sa.Text(), nullable=True),
        sa.Column("job_to_be_done", sa.Text(), nullable=True),
        sa.Column("usage_patterns", sa.Text(), nullable=True),
        sa.Column("objections", sa.Text(), nullable=True),
        sa.Column("success_metrics", sa.Text(), nullable=True),
        sa.Column("field_quality", JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("last_analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_personas_project_id", "personas", ["project_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_personas_project_id", table_name="personas")
    op.drop_table("personas")
