"""Revenue dashboard endpoint.

Route:
  GET /dashboard/revenue  - Aggregated revenue numbers for the logged-in user
"""

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/revenue")
async def get_revenue_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    uid = current_user.id
    today = date.today()
    first_of_month = today.replace(day=1)

    # Pipeline: sum of contract_value for leads (engagement_status = 'lead')
    pipeline_result = await db.execute(
        select(func.coalesce(func.sum(Client.contract_value), 0.0)).where(
            Client.user_id == uid,
            Client.status == "active",
            Client.engagement_status == "lead",
        )
    )
    pipeline = float(pipeline_result.scalar())

    # Contracted: contract_value of active non-lead clients minus invoiced-to-date
    contracted_result = await db.execute(
        select(func.coalesce(func.sum(Client.contract_value), 0.0)).where(
            Client.user_id == uid,
            Client.status == "active",
            Client.engagement_status != "lead",
        )
    )
    contracted_raw = float(contracted_result.scalar())

    invoiced_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.subtotal_usd), 0.0)).where(
            Invoice.user_id == uid,
            Invoice.status.in_(("sent", "paid")),
        )
    )
    invoiced_total = float(invoiced_result.scalar())
    contracted = max(contracted_raw - invoiced_total, 0.0)

    # Outstanding: sent invoices not yet paid, with aging buckets
    outstanding_invoices_result = await db.execute(
        select(Invoice).where(
            Invoice.user_id == uid,
            Invoice.status == "sent",
        )
    )
    outstanding_invoices = list(outstanding_invoices_result.scalars().all())

    outstanding_total = sum(inv.subtotal_usd for inv in outstanding_invoices)
    aging_0_30 = 0.0
    aging_31_60 = 0.0
    aging_60_plus = 0.0
    for inv in outstanding_invoices:
        if inv.due_date:
            days_overdue = (today - inv.due_date).days
        else:
            days_overdue = (today - inv.created_at.date()).days
        if days_overdue <= 30:
            aging_0_30 += inv.subtotal_usd
        elif days_overdue <= 60:
            aging_31_60 += inv.subtotal_usd
        else:
            aging_60_plus += inv.subtotal_usd

    # Collected this month
    collected_month_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.subtotal_usd), 0.0)).where(
            Invoice.user_id == uid,
            Invoice.status == "paid",
            Invoice.paid_at >= datetime(first_of_month.year, first_of_month.month, 1, tzinfo=timezone.utc),
        )
    )
    collected_month = float(collected_month_result.scalar())

    # Collected YTD
    collected_ytd_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.subtotal_usd), 0.0)).where(
            Invoice.user_id == uid,
            Invoice.status == "paid",
            Invoice.paid_at >= datetime(today.year, 1, 1, tzinfo=timezone.utc),
        )
    )
    collected_ytd = float(collected_ytd_result.scalar())

    # Renewal alerts: clients with contract_end_date within 60 days
    cutoff = date(today.year, today.month + 2 if today.month <= 10 else (today.month - 10), 1 if today.month <= 10 else today.day)
    # Simpler: just compute 60 days out
    from datetime import timedelta
    cutoff = today + timedelta(days=60)

    renewals_result = await db.execute(
        select(Client.id, Client.name, Client.contract_end_date, Client.engagement_status).where(
            Client.user_id == uid,
            Client.status == "active",
            Client.contract_end_date.isnot(None),
            Client.contract_end_date <= cutoff,
            Client.contract_end_date >= today,
        ).order_by(Client.contract_end_date)
    )
    renewal_rows = renewals_result.all()
    renewal_alerts = [
        {
            "client_id": str(row.id),
            "client_name": row.name,
            "contract_end_date": row.contract_end_date.isoformat(),
            "days_remaining": (row.contract_end_date - today).days,
        }
        for row in renewal_rows
    ]

    return {
        "pipeline": pipeline,
        "contracted": contracted,
        "outstanding": outstanding_total,
        "outstanding_aging": {
            "0_30_days": aging_0_30,
            "31_60_days": aging_31_60,
            "60_plus_days": aging_60_plus,
        },
        "collected_month": collected_month,
        "collected_ytd": collected_ytd,
        "renewal_alerts": renewal_alerts,
    }
