"""Add positioning_result JSONB to analyses.

Revision ID: 007_add_positioning_result
Revises: 006_add_insight_type_constraint
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "007_add_positioning_result"
down_revision = "006_add_insight_type_constraint"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("positioning_result", JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analyses", "positioning_result")
