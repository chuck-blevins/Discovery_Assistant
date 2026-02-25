"""
Tests for analysis schemas and route registration.

Follows the same structural pattern as test_data_sources.py — validates
schemas and route registration without requiring a live DB or Claude API.
"""

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError


# ============================================================================
# SCHEMA TESTS — InsightResponse
# ============================================================================

class TestInsightResponseSchema:
    def test_valid_finding_insight(self):
        from app.schemas.analysis import InsightResponse
        mock_insight = type("Insight", (), {
            "id": uuid.uuid4(),
            "type": "finding",
            "text": "4/5 sources confirm the problem exists",
            "citation": "interview-001.txt:line 42",
            "confidence": 0.85,
            "source_count": 4,
            "created_at": datetime.now(timezone.utc),
        })()
        resp = InsightResponse.model_validate(mock_insight)
        assert resp.type == "finding"
        assert resp.citation == "interview-001.txt:line 42"
        assert resp.confidence == 0.85
        assert resp.source_count == 4

    def test_gap_insight_with_null_citation(self):
        from app.schemas.analysis import InsightResponse
        mock_insight = type("Insight", (), {
            "id": uuid.uuid4(),
            "type": "gap",
            "text": "Decision drivers not yet understood",
            "citation": None,
            "confidence": None,
            "source_count": 0,
            "created_at": datetime.now(timezone.utc),
        })()
        resp = InsightResponse.model_validate(mock_insight)
        assert resp.type == "gap"
        assert resp.citation is None
        assert resp.confidence is None
        assert resp.source_count == 0

    def test_contradiction_insight(self):
        from app.schemas.analysis import InsightResponse
        mock_insight = type("Insight", (), {
            "id": uuid.uuid4(),
            "type": "contradiction",
            "text": "One source suggests the problem is not urgent",
            "citation": "notes.md:line 15",
            "confidence": 0.4,
            "source_count": 1,
            "created_at": datetime.now(timezone.utc),
        })()
        resp = InsightResponse.model_validate(mock_insight)
        assert resp.type == "contradiction"

    def test_invalid_type_raises_validation_error(self):
        from app.schemas.analysis import InsightResponse
        mock_insight = type("Insight", (), {
            "id": uuid.uuid4(),
            "type": "unknown-type",
            "text": "Some text",
            "citation": None,
            "confidence": None,
            "source_count": 0,
            "created_at": datetime.now(timezone.utc),
        })()
        with pytest.raises(ValidationError):
            InsightResponse.model_validate(mock_insight)

    def test_insight_response_excludes_analysis_id_from_api(self):
        """InsightResponse must not expose analysis_id (internal FK)."""
        from app.schemas.analysis import InsightResponse
        assert "analysis_id" not in InsightResponse.model_fields

    def test_real_insight_model_serializes_to_response(self):
        """Schema validates against ORM Insight-like object (id, type, text, citation, confidence, source_count)."""
        from app.schemas.analysis import InsightResponse
        # Object with same attributes an ORM Insight would have when serialized (analysis_id present on ORM but excluded by schema)
        obj = type("Insight", (), {
            "id": uuid.uuid4(),
            "type": "finding",
            "text": "Validated",
            "citation": "f:1",
            "confidence": 0.9,
            "source_count": 2,
            "created_at": datetime.now(timezone.utc),
        })()
        resp = InsightResponse.model_validate(obj)
        assert resp.id == obj.id
        assert resp.type == obj.type
        assert not hasattr(resp, "analysis_id") or getattr(resp, "analysis_id", None) is None


# ============================================================================
# SCHEMA TESTS — AnalysisResponse
# ============================================================================

class TestAnalysisResponseSchema:
    def test_orm_mode_serialization(self):
        from app.schemas.analysis import AnalysisResponse
        mock_analysis = type("Analysis", (), {
            "id": uuid.uuid4(),
            "project_id": uuid.uuid4(),
            "objective": "problem-validation",
            "confidence_score": 0.75,
            "tokens_used": 2000,
            "cost_usd": 0.03,
            "insights": [],
            "positioning_result": None,
            "created_at": datetime.now(timezone.utc),
        })()
        resp = AnalysisResponse.model_validate(mock_analysis)
        assert resp.objective == "problem-validation"
        assert resp.positioning_result is None
        assert resp.confidence_score == 0.75
        assert resp.tokens_used == 2000
        assert resp.insights == []

    def test_raw_response_not_in_schema(self):
        from app.schemas.analysis import AnalysisResponse
        # raw_response must NOT be exposed via AnalysisResponse
        assert "raw_response" not in AnalysisResponse.model_fields

    def test_null_confidence_allowed(self):
        from app.schemas.analysis import AnalysisResponse
        mock_analysis = type("Analysis", (), {
            "id": uuid.uuid4(),
            "project_id": uuid.uuid4(),
            "objective": "problem-validation",
            "confidence_score": None,
            "tokens_used": None,
            "cost_usd": None,
            "insights": [],
            "created_at": datetime.now(timezone.utc),
        })()
        resp = AnalysisResponse.model_validate(mock_analysis)
        assert resp.confidence_score is None

    def test_insights_list_populated(self):
        from app.schemas.analysis import AnalysisResponse, InsightResponse
        mock_insight = type("Insight", (), {
            "id": uuid.uuid4(),
            "type": "finding",
            "text": "Problem validated",
            "citation": "file.txt:line 1",
            "confidence": 0.9,
            "source_count": 3,
            "created_at": datetime.now(timezone.utc),
        })()
        mock_analysis = type("Analysis", (), {
            "id": uuid.uuid4(),
            "project_id": uuid.uuid4(),
            "objective": "problem-validation",
            "confidence_score": 0.80,
            "tokens_used": 1500,
            "cost_usd": 0.02,
            "insights": [mock_insight],
            "created_at": datetime.now(timezone.utc),
        })()
        resp = AnalysisResponse.model_validate(mock_analysis)
        assert len(resp.insights) == 1
        assert resp.insights[0].type == "finding"

    def test_positioning_result_serialized_when_present(self):
        from app.schemas.analysis import AnalysisResponse
        mock_analysis = type("Analysis", (), {
            "id": uuid.uuid4(),
            "project_id": uuid.uuid4(),
            "objective": "positioning",
            "confidence_score": 0.82,
            "tokens_used": 1000,
            "cost_usd": 0.02,
            "insights": [],
            "positioning_result": {
                "value_drivers": [{"text": "Speed", "frequency_count": 5}],
                "alternative_angles": ["B2B", "B2C"],
                "recommended_interviews": ["Product managers"],
                "confidence_score": 0.82,
            },
            "created_at": datetime.now(timezone.utc),
        })()
        resp = AnalysisResponse.model_validate(mock_analysis)
        assert resp.positioning_result is not None
        assert resp.positioning_result.value_drivers[0].text == "Speed"
        assert resp.positioning_result.alternative_angles == ["B2B", "B2C"]


# ============================================================================
# ROUTE REGISTRATION TESTS
# ============================================================================

class TestAnalysisRouteRegistration:
    def _get_route_map(self):
        from app.api.routes.analyses import router
        return {(m, r.path) for r in router.routes for m in r.methods}

    def test_stream_route_registered(self):
        routes = self._get_route_map()
        assert ("GET", "/projects/{project_id}/analyze/stream") in routes

    def test_non_streaming_analyze_route_registered(self):
        routes = self._get_route_map()
        assert ("POST", "/projects/{project_id}/analyze") in routes

    def test_list_analyses_route_registered(self):
        routes = self._get_route_map()
        assert ("GET", "/projects/{project_id}/analyses") in routes

    def test_get_analysis_route_registered(self):
        routes = self._get_route_map()
        assert ("GET", "/analyses/{analysis_id}") in routes

    def test_router_has_analyses_tag(self):
        from app.api.routes.analyses import router
        assert "analyses" in router.tags

    def test_no_duplicate_route_paths(self):
        from app.api.routes.analyses import router
        paths = [r.path for r in router.routes]
        assert len(paths) == len(set(paths)), "Duplicate route paths detected"


# ============================================================================
# APP INTEGRATION — analyses router registered in main app
# ============================================================================

class TestAnalysesRouterInApp:
    def _get_app_route_paths(self):
        from app.main import app
        return {r.path for r in app.routes}

    def test_stream_route_in_app(self):
        paths = self._get_app_route_paths()
        assert "/projects/{project_id}/analyze/stream" in paths

    def test_analyze_route_in_app(self):
        paths = self._get_app_route_paths()
        assert "/projects/{project_id}/analyze" in paths

    def test_list_analyses_route_in_app(self):
        paths = self._get_app_route_paths()
        assert "/projects/{project_id}/analyses" in paths

    def test_get_analysis_route_in_app(self):
        paths = self._get_app_route_paths()
        assert "/analyses/{analysis_id}" in paths
