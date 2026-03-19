"""Add contact fields and engagement_status to clients; add client_notes table.

Revision ID: 015_add_client_contact_and_notes
Revises: 014_add_settings_tables
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "015_add_client_contact_and_notes"
down_revision = "014_add_settings_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new contact columns to clients table
    op.add_column("clients", sa.Column("contact_name", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("contact_email", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("contact_phone", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("website", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("engagement_status", sa.String(20), nullable=True))

    # Create client_notes table
    op.create_table(
        "client_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_client_notes_client_id", "client_notes", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_client_notes_client_id", table_name="client_notes")
    op.drop_table("client_notes")
    op.drop_column("clients", "engagement_status")
    op.drop_column("clients", "website")
    op.drop_column("clients", "contact_phone")
    op.drop_column("clients", "contact_email")
    op.drop_column("clients", "contact_name")
