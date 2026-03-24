"""
Tests for settings routes — analysis-types endpoint and ANALYSIS_TYPES/ANALYSIS_TYPE_METADATA.

Covers: route registration, GET /settings/analysis-types (unauthenticated → 401,
authenticated → 200 with client_intake included).
"""

import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app
from app.models.user import User


# ============================================================================
# Helpers
# ============================================================================

def _make_user() -> MagicMock:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    return user


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


# ============================================================================
# ANALYSIS_TYPES list correctness
# ============================================================================

class TestAnalysisTypesList:
    def test_client_intake_in_analysis_types(self):
        from app.services.settings_services import ANALYSIS_TYPES
        assert "client_intake" in ANALYSIS_TYPES

    def test_all_types_have_metadata(self):
        from app.services.settings_services import ANALYSIS_TYPES, ANALYSIS_TYPE_METADATA
        for t in ANALYSIS_TYPES:
            assert t in ANALYSIS_TYPE_METADATA, f"Missing metadata for {t!r}"
            assert "label" in ANALYSIS_TYPE_METADATA[t]
            assert "description" in ANALYSIS_TYPE_METADATA[t]

    def test_analysis_types_and_defaults_match(self):
        """ANALYSIS_TYPES and _get_defaults() must have the same keys — atomicity check."""
        from app.services.settings_services import ANALYSIS_TYPES, _get_defaults
        defaults = _get_defaults()
        assert set(ANALYSIS_TYPES) == set(defaults.keys()), (
            "ANALYSIS_TYPES and _get_defaults() are out of sync — "
            "they must always be updated together"
        )

    def test_client_intake_in_defaults(self):
        from app.services.settings_services import _get_defaults
        defaults = _get_defaults()
        assert "client_intake" in defaults
        assert len(defaults["client_intake"]) > 50  # non-trivial prompt


# ============================================================================
# Route registration
# ============================================================================

class TestAnalysisTypesRouteRegistration:
    def test_analysis_types_route_registered(self):
        from app.api.routes.settings import router
        paths = {r.path for r in router.routes}
        assert "/settings/analysis-types" in paths

    def test_analysis_types_route_is_get(self):
        from app.api.routes.settings import router
        methods = {
            m
            for r in router.routes
            for m in r.methods
            if r.path == "/settings/analysis-types"
        }
        assert "GET" in methods

    def test_analysis_types_route_in_app(self):
        paths = {r.path for r in app.routes}
        assert "/settings/analysis-types" in paths


# ============================================================================
# HTTP-level tests
# ============================================================================

class TestAnalysisTypesUnauthenticated:
    def test_unauthenticated_returns_401(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.get("/settings/analysis-types")
        assert resp.status_code == 401


class TestAnalysisTypesAuthenticated:
    def test_returns_200(self):
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        with TestClient(app) as client:
            resp = client.get("/settings/analysis-types")
        assert resp.status_code == 200

    def test_client_intake_in_list(self):
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        with TestClient(app) as client:
            resp = client.get("/settings/analysis-types")
        values = [t["value"] for t in resp.json()]
        assert "client_intake" in values

    def test_each_type_has_value_label_description(self):
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        with TestClient(app) as client:
            resp = client.get("/settings/analysis-types")
        for item in resp.json():
            assert "value" in item
            assert "label" in item
            assert "description" in item
            assert len(item["description"]) > 10

    def test_client_intake_description_mentions_intake(self):
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        with TestClient(app) as client:
            resp = client.get("/settings/analysis-types")
        intake = next((t for t in resp.json() if t["value"] == "client_intake"), None)
        assert intake is not None
        assert "intake" in intake["description"].lower() or "wizard" in intake["description"].lower()
