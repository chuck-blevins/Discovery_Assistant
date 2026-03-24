"""Add CRM Phase 1: contract fields, time_sessions, invoices, invoice_line_items.

Revision ID: 017_add_crm_phase1
Revises: 016_add_onboarding_summaries
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "017_add_crm_phase1"
down_revision = "016_add_onboarding_summaries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Contract fields on clients ─────────────────────────────────────────────
    op.add_column("clients", sa.Column("contract_value", sa.Float(), nullable=True))
    op.add_column("clients", sa.Column("billing_type", sa.String(20), nullable=True))
    op.add_column("clients", sa.Column("hourly_rate", sa.Float(), nullable=True))
    op.add_column("clients", sa.Column("agreed_hours", sa.Float(), nullable=True))
    op.add_column("clients", sa.Column("contract_start_date", sa.Date(), nullable=True))
    op.add_column("clients", sa.Column("contract_end_date", sa.Date(), nullable=True))
    op.add_column("clients", sa.Column("stripe_customer_id", sa.Text(), nullable=True))

    # ── time_sessions ──────────────────────────────────────────────────────────
    op.create_table(
        "time_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_time_sessions_client_id", "time_sessions", ["client_id"])
    op.create_index("ix_time_sessions_user_id", "time_sessions", ["user_id"])

    # ── invoices ───────────────────────────────────────────────────────────────
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_invoice_id", sa.Text(), nullable=True, unique=True),
        sa.Column("stripe_invoice_url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("subtotal_usd", sa.Float(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_invoices_client_id", "invoices", ["client_id"])
    op.create_index("ix_invoices_user_id", "invoices", ["user_id"])

    # ── invoice_line_items ─────────────────────────────────────────────────────
    op.create_table(
        "invoice_line_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False, server_default="1"),
        sa.Column("unit_price_usd", sa.Float(), nullable=False),
        sa.Column("amount_usd", sa.Float(), nullable=False),
        sa.Column("time_session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["time_session_id"], ["time_sessions.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_invoice_line_items_invoice_id", "invoice_line_items", ["invoice_id"])


def downgrade() -> None:
    op.drop_index("ix_invoice_line_items_invoice_id", table_name="invoice_line_items")
    op.drop_table("invoice_line_items")

    op.drop_index("ix_invoices_user_id", table_name="invoices")
    op.drop_index("ix_invoices_client_id", table_name="invoices")
    op.drop_table("invoices")

    op.drop_index("ix_time_sessions_user_id", table_name="time_sessions")
    op.drop_index("ix_time_sessions_client_id", table_name="time_sessions")
    op.drop_table("time_sessions")

    op.drop_column("clients", "stripe_customer_id")
    op.drop_column("clients", "contract_end_date")
    op.drop_column("clients", "contract_start_date")
    op.drop_column("clients", "agreed_hours")
    op.drop_column("clients", "hourly_rate")
    op.drop_column("clients", "billing_type")
    op.drop_column("clients", "contract_value")
