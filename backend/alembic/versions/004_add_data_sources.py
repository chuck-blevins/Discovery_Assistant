"""Add data_sources table.

Revision ID: 004_add_data_sources
Revises: 003_add_projects
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004_add_data_sources"
down_revision = "003_add_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── data_sources table ────────────────────────────────────────────────────
    op.create_table(
        "data_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("content_type", sa.Text(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("collected_date", sa.Date(), nullable=True),
        sa.Column("creator_name", sa.Text(), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_data_sources_project_id", "data_sources", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_data_sources_project_id", table_name="data_sources")
    op.drop_table("data_sources")
