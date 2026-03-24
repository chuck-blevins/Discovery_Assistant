"""Stripe webhook receiver.

Route:
  POST /webhooks/stripe  - Receives Stripe events (no auth — verified by signature)

Routing strategy:
  1. Parse raw JSON to extract stripe_invoice_id
  2. Look up the internal invoice to find user_id
  3. Fetch that user's webhook secret and verify signature
  4. Update invoice status accordingly
"""

import json
import logging
import uuid

import stripe
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.invoice import Invoice
from app.services import invoice_service
from app.services.settings_services import get_stripe_webhook_secret

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhooks"])


@router.post(
    "/webhooks/stripe",
    status_code=status.HTTP_200_OK,
    summary="Stripe webhook receiver",
)
async def stripe_webhook(request: Request) -> dict:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        raw = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    event_type: str = raw.get("type", "")
    invoice_obj: dict = raw.get("data", {}).get("object", {})
    stripe_invoice_id: str | None = invoice_obj.get("id")

    if not stripe_invoice_id:
        return {"received": True}

    async with AsyncSessionLocal() as db:
        # Look up local invoice to find the user
        result = await db.execute(
            select(Invoice).where(Invoice.stripe_invoice_id == stripe_invoice_id)
        )
        local_invoice = result.scalar_one_or_none()

        user_id: uuid.UUID | None = local_invoice.user_id if local_invoice else None

        # Verify signature if we have the user's secret
        if user_id:
            webhook_secret = await get_stripe_webhook_secret(db, user_id)
            if webhook_secret:
                try:
                    stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
                except stripe.error.SignatureVerificationError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid Stripe signature",
                    )

        # Handle events
        if event_type == "invoice.paid":
            updated = await invoice_service.mark_invoice_paid(db, stripe_invoice_id)
            if updated:
                logger.info("Invoice %s marked paid", stripe_invoice_id)

        elif event_type == "invoice.voided":
            updated = await invoice_service.mark_invoice_void(db, stripe_invoice_id)
            if updated:
                logger.info("Invoice %s marked void", stripe_invoice_id)

    return {"received": True}
