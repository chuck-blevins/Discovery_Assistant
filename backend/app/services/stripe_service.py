"""Stripe API service — per-user key, invoice push, and webhook verification."""

import uuid
from typing import Any, Optional

import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.settings_services import get_stripe_secret_key, get_stripe_webhook_secret


def _stripe_client(api_key: str) -> stripe.StripeClient:
    return stripe.StripeClient(api_key)


async def _get_key(db: AsyncSession, user_id: uuid.UUID) -> str:
    key = await get_stripe_secret_key(db, user_id)
    if not key:
        raise ValueError("Stripe secret key not configured. Add it in Settings → Stripe.")
    return key


async def get_or_create_stripe_customer(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    client_name: str,
    contact_email: Optional[str],
    existing_stripe_customer_id: Optional[str],
) -> str:
    """Return existing Stripe customer ID or create a new one."""
    api_key = await _get_key(db, user_id)
    client = _stripe_client(api_key)

    if existing_stripe_customer_id:
        return existing_stripe_customer_id

    params: dict[str, Any] = {
        "name": client_name,
        "metadata": {"user_id": str(user_id)},
    }
    if contact_email:
        params["email"] = contact_email

    customer = client.customers.create(params)
    return customer.id


async def create_and_send_stripe_invoice(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    stripe_customer_id: str,
    line_items: list[dict],
    due_date_unix: Optional[int],
    notes: Optional[str],
    internal_invoice_id: uuid.UUID,
) -> dict:
    """
    Create a Stripe invoice with line items, finalize it, and send it.

    Returns a dict with stripe_invoice_id and stripe_invoice_url.
    """
    api_key = await _get_key(db, user_id)
    client = _stripe_client(api_key)

    # Create invoice
    invoice_params: dict[str, Any] = {
        "customer": stripe_customer_id,
        "collection_method": "send_invoice",
        "metadata": {
            "user_id": str(user_id),
            "internal_invoice_id": str(internal_invoice_id),
        },
    }
    if due_date_unix is not None:
        invoice_params["due_date"] = due_date_unix
    if notes:
        invoice_params["footer"] = notes

    stripe_invoice = client.invoices.create(invoice_params)
    stripe_invoice_id = stripe_invoice.id

    # Add line items — invoice_items.create() takes `amount` (total cents), not unit_amount
    for item in line_items:
        total_cents = int(round(item["quantity"] * item["unit_price_usd"] * 100))
        client.invoice_items.create({
            "customer": stripe_customer_id,
            "invoice": stripe_invoice_id,
            "description": item["description"],
            "amount": total_cents,
            "currency": "usd",
        })

    # Finalize and send
    client.invoices.finalize_invoice(stripe_invoice_id)
    client.invoices.send_invoice(stripe_invoice_id)

    # Retrieve updated invoice for URL
    updated = client.invoices.retrieve(stripe_invoice_id)
    return {
        "stripe_invoice_id": stripe_invoice_id,
        "stripe_invoice_url": updated.hosted_invoice_url,
    }


async def list_products_with_prices(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[dict]:
    """
    Return active products with their active prices.
    Each entry: { id, name, prices: [{ id, unit_amount, currency, nickname }] }
    """
    api_key = await _get_key(db, user_id)
    client = _stripe_client(api_key)

    products_page = client.products.list(params={"active": True, "limit": 100})
    prices_page = client.prices.list(params={"active": True, "limit": 100})

    # Index prices by product id
    prices_by_product: dict[str, list[dict]] = {}
    for price in prices_page.data:
        prod_id = price.product if isinstance(price.product, str) else price.product.id
        prices_by_product.setdefault(prod_id, []).append({
            "id": price.id,
            "unit_amount": price.unit_amount,
            "currency": price.currency,
            "nickname": price.nickname,
        })

    result = []
    for product in products_page.data:
        result.append({
            "id": product.id,
            "name": product.name,
            "prices": prices_by_product.get(product.id, []),
        })

    return result


async def verify_webhook_signature(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: bytes,
    sig_header: str,
) -> dict:
    """Verify Stripe webhook signature and return the parsed event."""
    webhook_secret = await get_stripe_webhook_secret(db, user_id)
    if not webhook_secret:
        raise ValueError("Stripe webhook secret not configured.")
    event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    return event
