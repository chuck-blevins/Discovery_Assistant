"""Fire-and-forget audit logging service."""

import sys
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def _write_audit(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    details: dict[str, Any] | None,
    *,
    commit: bool = True,
) -> None:
    """Write one audit log entry to the given session. Caller owns session lifecycle."""
    entry = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    if commit:
        await db.commit()
    else:
        await db.flush()


async def log(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    details: dict[str, Any] | None = None,
    *,
    commit: bool = True,
) -> None:
    """Write an audit log entry using the given session. Swallows exceptions."""
    try:
        await _write_audit(db, user_id, action, entity_type, entity_id, details, commit=commit)
    except Exception as exc:  # noqa: BLE001
        print(f"[audit_service] Failed to write audit log: {exc}", file=sys.stderr)


async def log_in_new_session(
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Write an audit log entry in a new DB session. Use for fire-and-forget (e.g. asyncio.create_task).
    Never pass the request-scoped session into a background task; it closes when the request ends.
    """
    from app.db import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            await _write_audit(session, user_id, action, entity_type, entity_id, details, commit=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[audit_service] Failed to write audit log: {exc}", file=sys.stderr)
