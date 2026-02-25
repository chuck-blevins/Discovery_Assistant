"""Add recommendations JSONB to analyses (Story 6-1).

Revision ID: 010_add_analyses_recommendations
Revises: 009_add_icps_table
Create Date: 2026-02-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "010_add_analyses_recommendations"
down_revision = "009_add_icps_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("recommendations", JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analyses", "recommendations")
