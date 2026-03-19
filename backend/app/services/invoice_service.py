"""CRUD and Stripe push logic for invoices."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from app.services import stripe_service


async def _load_invoice(db: AsyncSession, invoice_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Invoice]:
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.line_items))
        .where(Invoice.id == invoice_id, Invoice.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_invoices(
    db: AsyncSession, user_id: uuid.UUID, client_id: uuid.UUID
) -> list[Invoice]:
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.line_items))
        .where(Invoice.client_id == client_id, Invoice.user_id == user_id)
        .order_by(Invoice.created_at.desc())
    )
    return list(result.scalars().all())


async def create_invoice(
    db: AsyncSession, user_id: uuid.UUID, client_id: uuid.UUID, data: InvoiceCreate
) -> Invoice:
    subtotal = sum(item.quantity * item.unit_price_usd for item in data.line_items)
    invoice = Invoice(
        client_id=client_id,
        user_id=user_id,
        due_date=data.due_date,
        notes=data.notes,
        subtotal_usd=subtotal,
        status="draft",
    )
    db.add(invoice)
    await db.flush()  # get invoice.id before adding line items

    for item in data.line_items:
        line = InvoiceLineItem(
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price_usd=item.unit_price_usd,
            amount_usd=item.quantity * item.unit_price_usd,
            time_session_id=item.time_session_id,
        )
        db.add(line)

    await db.commit()
    await db.refresh(invoice)
    return await _load_invoice(db, invoice.id, user_id)


async def update_invoice(
    db: AsyncSession, user_id: uuid.UUID, invoice_id: uuid.UUID, data: InvoiceUpdate
) -> Optional[Invoice]:
    invoice = await _load_invoice(db, invoice_id, user_id)
    if not invoice or invoice.status not in ("draft",):
        return None
    if data.due_date is not None:
        invoice.due_date = data.due_date
    if data.notes is not None:
        invoice.notes = data.notes
    await db.commit()
    await db.refresh(invoice)
    return await _load_invoice(db, invoice_id, user_id)


async def delete_invoice(
    db: AsyncSession, user_id: uuid.UUID, invoice_id: uuid.UUID
) -> bool:
    invoice = await _load_invoice(db, invoice_id, user_id)
    if not invoice or invoice.status not in ("draft",):
        return False
    await db.delete(invoice)
    await db.commit()
    return True


async def send_invoice_via_stripe(
    db: AsyncSession, user_id: uuid.UUID, invoice_id: uuid.UUID
) -> Optional[Invoice]:
    """Push a draft invoice to Stripe and mark it as 'sent'."""
    invoice = await _load_invoice(db, invoice_id, user_id)
    if not invoice or invoice.status != "draft":
        return None

    # Load client for Stripe customer details
    result = await db.execute(select(Client).where(Client.id == invoice.client_id))
    client = result.scalar_one_or_none()
    if not client:
        return None

    # Create or reuse Stripe customer
    stripe_customer_id = await stripe_service.get_or_create_stripe_customer(
        db,
        user_id,
        client_name=client.name,
        contact_email=client.contact_email,
        existing_stripe_customer_id=client.stripe_customer_id,
    )

    # Persist the customer ID if it was newly created
    if client.stripe_customer_id != stripe_customer_id:
        client.stripe_customer_id = stripe_customer_id
        await db.flush()

    # Build line items for Stripe
    stripe_items = [
        {
            "description": li.description,
            "quantity": li.quantity,
            "unit_price_usd": li.unit_price_usd,
        }
        for li in invoice.line_items
    ]

    # Convert due_date to unix timestamp if present
    due_date_unix: Optional[int] = None
    if invoice.due_date:
        due_date_unix = int(
            datetime.combine(invoice.due_date, datetime.min.time())
            .replace(tzinfo=timezone.utc)
            .timestamp()
        )

    stripe_result = await stripe_service.create_and_send_stripe_invoice(
        db,
        user_id,
        stripe_customer_id=stripe_customer_id,
        line_items=stripe_items,
        due_date_unix=due_date_unix,
        notes=invoice.notes,
        internal_invoice_id=invoice.id,
    )

    invoice.stripe_invoice_id = stripe_result["stripe_invoice_id"]
    invoice.stripe_invoice_url = stripe_result["stripe_invoice_url"]
    invoice.status = "sent"
    await db.commit()
    await db.refresh(invoice)
    return await _load_invoice(db, invoice_id, user_id)


async def mark_invoice_paid(
    db: AsyncSession, stripe_invoice_id: str
) -> Optional[Invoice]:
    """Called by webhook handler to mark an invoice paid."""
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.line_items))
        .where(Invoice.stripe_invoice_id == stripe_invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        return None
    invoice.status = "paid"
    invoice.paid_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(invoice)
    return invoice


async def mark_invoice_void(
    db: AsyncSession, stripe_invoice_id: str
) -> Optional[Invoice]:
    """Called by webhook handler to void an invoice."""
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.line_items))
        .where(Invoice.stripe_invoice_id == stripe_invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        return None
    invoice.status = "void"
    await db.commit()
    await db.refresh(invoice)
    return invoice
