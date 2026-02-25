"""Fire-and-forget audit logging service."""

import sys
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


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
    """Write an audit log entry. Swallows all exceptions to never block callers."""
    try:
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
    except Exception as exc:  # noqa: BLE001
        print(f"[audit_service] Failed to write audit log: {exc}", file=sys.stderr)
