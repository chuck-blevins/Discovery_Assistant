"""Add artifacts table for Story 6-2.

Revision ID: 011_add_artifacts_table
Revises: 010_add_analyses_recommendations
Create Date: 2026-02-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "011_add_artifacts_table"
down_revision = "010_add_analyses_recommendations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "artifacts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("analysis_id", UUID(as_uuid=True), sa.ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("artifact_type", sa.String(64), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_artifacts_analysis_id", "artifacts", ["analysis_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_artifacts_analysis_id", table_name="artifacts")
    op.drop_table("artifacts")
