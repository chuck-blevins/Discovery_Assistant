"""
Unit tests for client_service and audit_service using AsyncMock.

Tests business logic in isolation — no live DB required.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ============================================================================
# CLIENT SERVICE — toggle_archive
# ============================================================================

class TestToggleArchive:
    """Test the archive state machine."""

    @pytest.mark.asyncio
    async def test_active_becomes_archived(self):
        from app.services.client_service import toggle_archive

        db = AsyncMock()
        client = MagicMock()
        client.status = "active"
        client.archived_at = None

        result = await toggle_archive(db, client)

        assert client.status == "archived"
        assert client.archived_at is not None
        db.commit.assert_awaited_once()
        db.refresh.assert_awaited_once_with(client)

    @pytest.mark.asyncio
    async def test_archived_becomes_active(self):
        from app.services.client_service import toggle_archive

        db = AsyncMock()
        client = MagicMock()
        client.status = "archived"
        client.archived_at = datetime.now(timezone.utc)

        await toggle_archive(db, client)

        assert client.status == "active"
        assert client.archived_at is None

    @pytest.mark.asyncio
    async def test_updated_at_set(self):
        from app.services.client_service import toggle_archive

        db = AsyncMock()
        client = MagicMock()
        client.status = "active"
        client.updated_at = None

        await toggle_archive(db, client)

        assert client.updated_at is not None


# ============================================================================
# CLIENT SERVICE — update_client
# ============================================================================

class TestUpdateClient:
    @pytest.mark.asyncio
    async def test_applies_name_change(self):
        from app.schemas.client import ClientUpdate
        from app.services.client_service import update_client

        db = AsyncMock()
        client = MagicMock()
        client.name = "Old Name"

        await update_client(db, client, ClientUpdate(name="New Name"))

        assert client.name == "New Name"
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_skips_none_fields(self):
        from app.schemas.client import ClientUpdate
        from app.services.client_service import update_client

        db = AsyncMock()
        client = MagicMock()
        client.description = "Keep this"

        # name=None should not overwrite description
        await update_client(db, client, ClientUpdate(description=None))

        # description was not in the update payload (exclude_none), so no setattr for it
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_updated_at_advances(self):
        from app.schemas.client import ClientUpdate
        from app.services.client_service import update_client

        db = AsyncMock()
        client = MagicMock()
        before = datetime(2020, 1, 1, tzinfo=timezone.utc)
        client.updated_at = before

        await update_client(db, client, ClientUpdate(name="Changed"))

        assert client.updated_at != before


# ============================================================================
# CLIENT SERVICE — delete_client
# ============================================================================

class TestDeleteClient:
    @pytest.mark.asyncio
    async def test_delete_calls_db_delete(self):
        from app.services.client_service import delete_client

        db = AsyncMock()
        client = MagicMock()

        await delete_client(db, client)

        db.delete.assert_awaited_once_with(client)
        db.commit.assert_awaited_once()


# ============================================================================
# AUDIT SERVICE
# ============================================================================

class TestAuditService:
    @pytest.mark.asyncio
    async def test_log_creates_entry(self):
        from app.services.audit_service import log

        db = AsyncMock()
        user_id = uuid.uuid4()
        entity_id = uuid.uuid4()

        await log(db, user_id, "client.created", "client", entity_id, {"name": "Acme"})

        db.add.assert_called_once()
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_log_swallows_db_exception(self):
        from app.services.audit_service import log

        db = AsyncMock()
        db.commit.side_effect = Exception("DB down")
        user_id = uuid.uuid4()

        # Should NOT raise
        await log(db, user_id, "client.created", "client")

    @pytest.mark.asyncio
    async def test_log_without_entity_id(self):
        from app.services.audit_service import log

        db = AsyncMock()
        user_id = uuid.uuid4()

        await log(db, user_id, "client.deleted", "client")

        db.add.assert_called_once()
