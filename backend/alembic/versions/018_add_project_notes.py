"""Add project_notes table.

Revision ID: 018_add_project_notes
Revises: 017_add_crm_phase1
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "018_add_project_notes"
down_revision = "017_add_crm_phase1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_project_notes_project_id", "project_notes", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_project_notes_project_id", table_name="project_notes")
    op.drop_table("project_notes")
