"""
Unit tests for data_source_service using AsyncMock.

Tests business logic in isolation — no live DB required.
"""

import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ============================================================================
# create_data_source
# ============================================================================

class TestCreateDataSource:
    @pytest.mark.asyncio
    async def test_returns_data_source_with_correct_fields(self):
        from app.services.data_source_service import create_data_source

        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        project_id = uuid.uuid4()

        result = await create_data_source(
            db=db,
            project_id=project_id,
            source_type="paste",
            file_name="paste",
            raw_text="Some interview notes",
            file_path=None,
            collected_date=date(2026, 1, 15),
            creator_name="Chuck",
            purpose="Round 1",
        )

        assert result.project_id == project_id
        assert result.source_type == "paste"
        assert result.file_name == "paste"
        assert result.raw_text == "Some interview notes"
        assert result.file_path is None
        assert result.creator_name == "Chuck"
        assert isinstance(result.created_at, datetime)
        db.add.assert_called_once()
        db.commit.assert_called_once()
        db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_file_source_type_stored(self):
        from app.services.data_source_service import create_data_source

        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        result = await create_data_source(
            db=db,
            project_id=uuid.uuid4(),
            source_type="file",
            file_name="report.pdf",
            raw_text="PDF text content",
            file_path="proj-1/ds-1/report.pdf",
            content_type="application/pdf",
        )

        assert result.source_type == "file"
        assert result.file_name == "report.pdf"
        assert result.file_path == "proj-1/ds-1/report.pdf"
        assert result.content_type == "application/pdf"

    @pytest.mark.asyncio
    async def test_created_at_set_to_now(self):
        from app.services.data_source_service import create_data_source

        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        before = datetime.now(timezone.utc)
        result = await create_data_source(
            db=db,
            project_id=uuid.uuid4(),
            source_type="paste",
            file_name="paste",
            raw_text="text",
            file_path=None,
        )
        after = datetime.now(timezone.utc)

        assert before <= result.created_at <= after


# ============================================================================
# list_data_sources
# ============================================================================

class TestListDataSources:
    @pytest.mark.asyncio
    async def test_returns_list_for_project(self):
        from app.services.data_source_service import list_data_sources

        project_id = uuid.uuid4()
        mock_ds1 = MagicMock()
        mock_ds2 = MagicMock()

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_ds1, mock_ds2]

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_result)

        result = await list_data_sources(db, project_id)
        assert result == [mock_ds1, mock_ds2]

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_none(self):
        from app.services.data_source_service import list_data_sources

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_result)

        result = await list_data_sources(db, uuid.uuid4())
        assert result == []


# ============================================================================
# get_data_source
# ============================================================================

class TestGetDataSource:
    @pytest.mark.asyncio
    async def test_found_returns_data_source(self):
        from app.services.data_source_service import get_data_source

        mock_ds = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_ds

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_result)

        result = await get_data_source(db, uuid.uuid4())
        assert result is mock_ds

    @pytest.mark.asyncio
    async def test_not_found_returns_none(self):
        from app.services.data_source_service import get_data_source

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_result)

        result = await get_data_source(db, uuid.uuid4())
        assert result is None


# ============================================================================
# update_file_path
# ============================================================================

class TestUpdateFilePath:
    @pytest.mark.asyncio
    async def test_updates_file_path_and_commits(self):
        from app.services.data_source_service import update_file_path

        db = AsyncMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        ds = MagicMock()
        ds.file_path = None

        result = await update_file_path(db, ds, "proj-1/ds-1/file.txt")

        assert ds.file_path == "proj-1/ds-1/file.txt"
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(ds)


# ============================================================================
# delete_data_source
# ============================================================================

class TestDeleteDataSource:
    @pytest.mark.asyncio
    async def test_calls_db_delete_and_commit(self):
        from app.services.data_source_service import delete_data_source

        db = AsyncMock()
        db.delete = AsyncMock()
        db.commit = AsyncMock()

        mock_ds = MagicMock()
        await delete_data_source(db, mock_ds)

        db.delete.assert_called_once_with(mock_ds)
        db.commit.assert_called_once()
