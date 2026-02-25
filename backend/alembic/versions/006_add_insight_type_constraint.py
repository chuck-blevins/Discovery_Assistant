"""Add CHECK constraint on insights.type column.

Revision ID: 006_add_insight_type_constraint
Revises: 005_add_analyses_and_insights
Create Date: 2026-02-24
"""

from alembic import op

revision = "006_add_insight_type_constraint"
down_revision = "005_add_analyses_and_insights"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE insights ADD CONSTRAINT insights_type_check "
        "CHECK (type IN ('finding', 'contradiction', 'gap'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE insights DROP CONSTRAINT insights_type_check")
