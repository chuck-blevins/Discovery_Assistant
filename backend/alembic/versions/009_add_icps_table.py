"""Add icps table for icp-refinement objective (Story 5-3).

Revision ID: 009_add_icps_table
Revises: 008_add_personas_table
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "009_add_icps_table"
down_revision = "008_add_personas_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "icps",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("company_size", sa.Text(), nullable=True),
        sa.Column("industries", sa.Text(), nullable=True),
        sa.Column("geography", sa.Text(), nullable=True),
        sa.Column("revenue", sa.Text(), nullable=True),
        sa.Column("tech_stack", sa.Text(), nullable=True),
        sa.Column("use_case_fit", sa.Text(), nullable=True),
        sa.Column("buying_process", sa.Text(), nullable=True),
        sa.Column("budget", sa.Text(), nullable=True),
        sa.Column("maturity", sa.Text(), nullable=True),
        sa.Column("custom", sa.Text(), nullable=True),
        sa.Column("dimension_confidence", JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("last_analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_icps_project_id", "icps", ["project_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_icps_project_id", table_name="icps")
    op.drop_table("icps")
