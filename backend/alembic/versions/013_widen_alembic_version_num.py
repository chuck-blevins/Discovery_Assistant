"""Widen alembic_version.version_num to VARCHAR(64).

Alembic defaults to 32 chars; long revision IDs (e.g. 012_add_assumed_problem_to_projects)
can exceed that. This migration allows longer IDs going forward.

Revision ID: 013_widen_alembic_version
Revises: 012_assumed_problem
Create Date: 2026-02-26

"""
from alembic import op

revision = "013_widen_alembic_version"
down_revision = "012_assumed_problem"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(32)"
    )
