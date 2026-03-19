"""Add onboarding_summaries table.

Revision ID: 016_add_onboarding_summaries
Revises: 015_add_client_contact_and_notes
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "016_add_onboarding_summaries"
down_revision = "015_add_client_contact_and_notes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "onboarding_summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("themes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("interest_points", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("gaps", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("last_analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_onboarding_summaries_project_id", "onboarding_summaries", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_onboarding_summaries_project_id", table_name="onboarding_summaries")
    op.drop_table("onboarding_summaries")
