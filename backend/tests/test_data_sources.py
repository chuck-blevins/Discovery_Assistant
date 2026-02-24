"""
Tests for data source schemas, route registration, and app integration.

Follows the same structural pattern as test_projects.py — validates
schemas, route registration, and function existence without requiring a live DB.
"""

import uuid
from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError


# ============================================================================
# SCHEMA TESTS — DataSourcePasteCreate
# ============================================================================

class TestDataSourcePasteCreateSchema:
    def test_valid_minimal(self):
        from app.schemas.data_source import DataSourcePasteCreate
        req = DataSourcePasteCreate(raw_text="Interview notes here")
        assert req.raw_text == "Interview notes here"
        assert req.source_type == "paste"
        assert req.file_name == "paste"

    def test_valid_with_all_metadata(self):
        from app.schemas.data_source import DataSourcePasteCreate
        req = DataSourcePasteCreate(
            raw_text="Survey responses...",
            file_name="survey-round-1",
            collected_date=date(2026, 1, 15),
            creator_name="Chuck",
            purpose="Interview Round 1",
        )
        assert req.creator_name == "Chuck"
        assert req.collected_date == date(2026, 1, 15)
        assert req.purpose == "Interview Round 1"

    def test_raw_text_required(self):
        from app.schemas.data_source import DataSourcePasteCreate
        with pytest.raises(ValidationError):
            DataSourcePasteCreate()

    def test_empty_raw_text_rejected(self):
        from app.schemas.data_source import DataSourcePasteCreate
        with pytest.raises(ValidationError):
            DataSourcePasteCreate(raw_text="   ")

    def test_source_type_must_be_paste(self):
        from app.schemas.data_source import DataSourcePasteCreate
        with pytest.raises(ValidationError):
            DataSourcePasteCreate(source_type="file", raw_text="some text")

    def test_source_type_default_is_paste(self):
        from app.schemas.data_source import DataSourcePasteCreate
        req = DataSourcePasteCreate(raw_text="text")
        assert req.source_type == "paste"


# ============================================================================
# SCHEMA TESTS — DataSourceResponse
# ============================================================================

class TestDataSourceResponseSchema:
    def test_orm_mode_serialization(self):
        from app.schemas.data_source import DataSourceResponse
        mock_ds = type("DS", (), {
            "id": uuid.uuid4(),
            "project_id": uuid.uuid4(),
            "source_type": "file",
            "file_name": "interview.pdf",
            "file_path": "proj-1/ds-1/interview.pdf",
            "content_type": "application/pdf",
            "collected_date": date(2026, 1, 10),
            "creator_name": "Alice",
            "purpose": "Round 1",
            "created_at": datetime.now(timezone.utc),
        })()
        resp = DataSourceResponse.model_validate(mock_ds)
        assert resp.file_name == "interview.pdf"
        assert resp.source_type == "file"

    def test_raw_text_not_in_response(self):
        from app.schemas.data_source import DataSourceResponse
        # DataSourceResponse must NOT expose raw_text
        assert not hasattr(DataSourceResponse.model_fields, "raw_text")
        assert "raw_text" not in DataSourceResponse.model_fields

    def test_optional_fields_can_be_none(self):
        from app.schemas.data_source import DataSourceResponse
        mock_ds = type("DS", (), {
            "id": uuid.uuid4(),
            "project_id": uuid.uuid4(),
            "source_type": "paste",
            "file_name": "paste",
            "file_path": None,
            "content_type": None,
            "collected_date": None,
            "creator_name": None,
            "purpose": None,
            "created_at": datetime.now(timezone.utc),
        })()
        resp = DataSourceResponse.model_validate(mock_ds)
        assert resp.file_path is None
        assert resp.creator_name is None


# ============================================================================
# SCHEMA TESTS — DataSourcePreviewResponse
# ============================================================================

class TestDataSourcePreviewResponseSchema:
    def test_preview_fields_present(self):
        from app.schemas.data_source import DataSourcePreviewResponse
        preview = DataSourcePreviewResponse(
            id=uuid.uuid4(),
            file_name="notes.txt",
            raw_text_preview="First 500 chars of text...",
        )
        assert preview.file_name == "notes.txt"
        assert preview.raw_text_preview == "First 500 chars of text..."

    def test_empty_preview_allowed(self):
        from app.schemas.data_source import DataSourcePreviewResponse
        preview = DataSourcePreviewResponse(
            id=uuid.uuid4(),
            file_name="empty.pdf",
            raw_text_preview="",
        )
        assert preview.raw_text_preview == ""


# ============================================================================
# ROUTE REGISTRATION TESTS
# ============================================================================

class TestDataSourceRouteRegistration:
    def _get_route_map(self):
        from app.api.routes.data_sources import router
        return {(m, r.path) for r in router.routes for m in r.methods}

    def test_upload_route_registered(self):
        routes = self._get_route_map()
        assert ("POST", "/projects/{project_id}/data-sources/upload") in routes

    def test_paste_route_registered(self):
        routes = self._get_route_map()
        assert ("POST", "/projects/{project_id}/data-sources/paste") in routes

    def test_list_route_registered(self):
        routes = self._get_route_map()
        assert ("GET", "/projects/{project_id}/data-sources") in routes

    def test_preview_route_registered(self):
        routes = self._get_route_map()
        assert ("GET", "/data-sources/{data_source_id}/preview") in routes

    def test_delete_route_registered(self):
        routes = self._get_route_map()
        assert ("DELETE", "/data-sources/{data_source_id}") in routes

    def test_router_has_data_sources_tag(self):
        from app.api.routes.data_sources import router
        assert "data-sources" in router.tags
