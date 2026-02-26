"""Add assumed_problem to projects (Story 1.1 — project-level hypothesis for problem-validation).

Revision ID: 012_assumed_problem
Revises: 011_add_artifacts_table
Create Date: 2026-02-26

"""
from alembic import op
import sqlalchemy as sa

revision = "012_assumed_problem"
down_revision = "011_add_artifacts_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("assumed_problem", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("projects", "assumed_problem")
