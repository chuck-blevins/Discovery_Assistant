"""
Tests for the client intake scope route.

Covers route registration, schema validation, authentication enforcement,
API key pre-check (422), happy path (mocked Claude), and malformed response (500).
"""

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.db import get_db
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


def _llm_settings(api_key_is_set: bool = True, raw_key: str | None = "sk-test") -> dict:
    return {
        "model": "claude-sonnet-4-6",
        "timeout_seconds": 60,
        "api_key_masked": "sk-test...****" if api_key_is_set else None,
        "api_key_is_set": api_key_is_set,
        "_raw_api_key": raw_key if api_key_is_set else None,
    }


def _db_with_llm(api_key_is_set: bool = True) -> AsyncMock:
    """Return a mock db session wired to return an appropriate LLM settings result."""
    mock_db = MagicMock()
    mock_db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db.close = AsyncMock()

    async def override():
        yield mock_db

    return override


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def _apply_auth_override():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    return user


# ============================================================================
# Route registration
# ============================================================================

class TestIntakeRouteRegistration:
    def test_intake_scope_route_registered(self):
        from app.api.routes.intake import router
        paths = {r.path for r in router.routes}
        assert "/intake-scope" in paths

    def test_intake_scope_route_is_post(self):
        from app.api.routes.intake import router
        methods = {m for r in router.routes for m in r.methods if r.path == "/intake-scope"}
        assert "POST" in methods

    def test_intake_router_in_app(self):
        paths = {r.path for r in app.routes}
        assert "/intake-scope" in paths

    def test_router_has_intake_tag(self):
        from app.api.routes.intake import router
        assert "intake" in router.tags


# ============================================================================
# Schema validation
# ============================================================================

class TestIntakeScopeRequestSchema:
    def test_minimal_valid(self):
        from app.schemas.intake import IntakeScopeRequest
        req = IntakeScopeRequest(company_name="Acme Corp")
        assert req.company_name == "Acme Corp"
        assert req.context == ""
        assert req.win_definition == ""

    def test_full_valid(self):
        from app.schemas.intake import IntakeScopeRequest
        req = IntakeScopeRequest(
            company_name="Acme Corp",
            context="B2B SaaS, Series A",
            win_definition="Clear ICP and messaging",
        )
        assert req.context == "B2B SaaS, Series A"
        assert req.win_definition == "Clear ICP and messaging"

    def test_missing_company_name_raises(self):
        from pydantic import ValidationError
        from app.schemas.intake import IntakeScopeRequest
        with pytest.raises(ValidationError):
            IntakeScopeRequest()

    def test_empty_company_name_raises(self):
        from pydantic import ValidationError
        from app.schemas.intake import IntakeScopeRequest
        with pytest.raises(ValidationError):
            IntakeScopeRequest(company_name="")


class TestIntakeScopeResponseSchema:
    def test_valid_response(self):
        from app.schemas.intake import IntakeScopeResponse
        resp = IntakeScopeResponse(
            engagement_summary="Summary",
            icp_hypothesis=["B2B SaaS", "VP Product"],
            discovery_questions=["What is your biggest pain?"],
            suggested_engagement_type="discovery",
        )
        assert resp.engagement_summary == "Summary"
        assert len(resp.icp_hypothesis) == 2
        assert len(resp.discovery_questions) == 1


# ============================================================================
# HTTP-level tests (unauthenticated)
# ============================================================================

class TestIntakeScopeUnauthenticated:
    def test_unauthenticated_returns_401(self):
        # No auth override set — real get_current_user will reject
        app.dependency_overrides[get_db] = _db_with_llm()
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post("/intake-scope", json={"company_name": "Acme"})
        assert resp.status_code == 401


# ============================================================================
# HTTP-level tests (authenticated, mocked services)
# ============================================================================

_VALID_INTAKE_RESULT = {
    "engagement_summary": "Acme Corp is a B2B SaaS company seeking product-market fit.",
    "icp_hypothesis": ["B2B SaaS", "VP Product buyer", "Series A-B"],
    "discovery_questions": ["What is your biggest activation blocker?", "Who is your current best customer?"],
    "suggested_engagement_type": "discovery",
    "tokens_used": 800,
    "cost_usd": 0.01,
    "raw_response": "{}",
}


class TestIntakeScopeMissingApiKey:
    def test_missing_api_key_returns_422_with_helpful_message(self):
        _apply_auth_override()
        app.dependency_overrides[get_db] = _db_with_llm(api_key_is_set=False)

        with (
            patch("app.api.routes.intake.settings_service.get_llm_settings", new=AsyncMock(return_value=_llm_settings(api_key_is_set=False))),
            TestClient(app) as client,
        ):
            resp = client.post("/intake-scope", json={"company_name": "Acme"})

        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert "API key" in detail or "LLM Config" in detail


class TestIntakeScopeHappyPath:
    def test_happy_path_returns_200_with_all_fields(self):
        _apply_auth_override()
        app.dependency_overrides[get_db] = _db_with_llm()

        with (
            patch("app.api.routes.intake.settings_service.get_llm_settings", new=AsyncMock(return_value=_llm_settings())),
            patch("app.api.routes.intake.settings_service.get_prompt_text", new=AsyncMock(return_value="system prompt")),
            patch("app.api.routes.intake.claude_service.run_intake_scope", new=AsyncMock(return_value=_VALID_INTAKE_RESULT)),
            TestClient(app) as client,
        ):
            resp = client.post(
                "/intake-scope",
                json={"company_name": "Acme", "context": "B2B SaaS", "win_definition": "Grow ARR"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["engagement_summary"] == _VALID_INTAKE_RESULT["engagement_summary"]
        assert body["icp_hypothesis"] == _VALID_INTAKE_RESULT["icp_hypothesis"]
        assert body["discovery_questions"] == _VALID_INTAKE_RESULT["discovery_questions"]
        assert body["suggested_engagement_type"] == _VALID_INTAKE_RESULT["suggested_engagement_type"]


class TestIntakeScopeClaudeMalformedJson:
    def test_malformed_claude_response_returns_500(self):
        _apply_auth_override()
        app.dependency_overrides[get_db] = _db_with_llm()

        with (
            patch("app.api.routes.intake.settings_service.get_llm_settings", new=AsyncMock(return_value=_llm_settings())),
            patch("app.api.routes.intake.settings_service.get_prompt_text", new=AsyncMock(return_value="system prompt")),
            patch("app.api.routes.intake.claude_service.run_intake_scope", new=AsyncMock(side_effect=ValueError("missing required keys: {'engagement_summary'}"))),
            TestClient(app) as client,
        ):
            resp = client.post("/intake-scope", json={"company_name": "Acme"})

        assert resp.status_code == 500
        assert "malformed" in resp.json()["detail"].lower()
