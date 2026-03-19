"""Invoice API endpoints.

Routes:
  POST   /clients/{client_id}/invoices           - Create draft invoice
  GET    /clients/{client_id}/invoices           - List invoices
  GET    /invoices/{invoice_id}                  - Get single invoice
  PUT    /invoices/{invoice_id}                  - Update draft invoice
  DELETE /invoices/{invoice_id}                  - Delete draft invoice
  POST   /invoices/{invoice_id}/send             - Push to Stripe and send
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoiceUpdate
from app.services import invoice_service

router = APIRouter(tags=["invoices"])


@router.post(
    "/clients/{client_id}/invoices",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a draft invoice",
)
async def create_invoice(
    client_id: uuid.UUID,
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    invoice = await invoice_service.create_invoice(db, current_user.id, client_id, data)
    return InvoiceResponse.model_validate(invoice)


@router.get(
    "/clients/{client_id}/invoices",
    response_model=list[InvoiceResponse],
    summary="List invoices for a client",
)
async def list_invoices(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InvoiceResponse]:
    invoices = await invoice_service.list_invoices(db, current_user.id, client_id)
    return [InvoiceResponse.model_validate(inv) for inv in invoices]


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Get a single invoice",
)
async def get_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    from app.services.invoice_service import _load_invoice
    invoice = await _load_invoice(db, invoice_id, current_user.id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceResponse.model_validate(invoice)


@router.put(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Update a draft invoice",
)
async def update_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    invoice = await invoice_service.update_invoice(db, current_user.id, invoice_id, data)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found or cannot be edited (not in draft status)",
        )
    return InvoiceResponse.model_validate(invoice)


@router.delete(
    "/invoices/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a draft invoice",
)
async def delete_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    deleted = await invoice_service.delete_invoice(db, current_user.id, invoice_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found or cannot be deleted (not in draft status)",
        )


@router.post(
    "/invoices/{invoice_id}/send",
    response_model=InvoiceResponse,
    summary="Send invoice via Stripe",
)
async def send_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    try:
        invoice = await invoice_service.send_invoice_via_stripe(db, current_user.id, invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc}",
        )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found or not in draft status",
        )
    return InvoiceResponse.model_validate(invoice)
