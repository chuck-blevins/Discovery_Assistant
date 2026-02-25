"""Add projects table.

Revision ID: 003_add_projects
Revises: 002_add_clients_and_audit_logs
Create Date: 2026-02-23
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003_add_projects"
down_revision = "002_add_clients_and_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── projects table ────────────────────────────────────────────────────────
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column(
            "target_segments",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("ARRAY[]::text[]"),
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
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
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("client_id", "name", name="uq_projects_client_name"),
    )
    op.create_index("ix_projects_client_id", "projects", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_projects_client_id", table_name="projects")
    op.drop_table("projects")
