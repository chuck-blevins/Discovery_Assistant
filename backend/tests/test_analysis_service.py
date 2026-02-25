"""
Unit tests for analysis_service — _validate_insights, create_analysis, list_analyses, has_recent_analysis.

No live DB required for _validate_insights tests. create_analysis/list_analyses/has_recent_analysis
require a DB or async mock; tests use pytest and can be run with a test DB if available.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.analysis_service import (
    _validate_insights,
    create_analysis,
    get_project_cost_totals,
)


# ============================================================================
# _validate_insights (pure logic — no DB)
# ============================================================================

class TestValidateInsights:
    def test_empty_list_raises(self):
        with pytest.raises(ValueError, match="cannot be empty"):
            _validate_insights([])

    def test_empty_list_allowed_when_allow_empty_true(self):
        _validate_insights([], allow_empty=True)

    def test_valid_finding_passes(self):
        _validate_insights([
            {"type": "finding", "text": "Evidence", "citation": "f:line 1", "confidence": 0.8, "source_count": 1},
        ])

    def test_valid_contradiction_passes(self):
        _validate_insights([
            {"type": "contradiction", "text": "Conflict", "citation": "f:line 2", "confidence": 0.3, "source_count": 1},
        ])

    def test_valid_gap_with_null_confidence_passes(self):
        _validate_insights([
            {"type": "gap", "text": "Missing info", "citation": None, "confidence": None, "source_count": 0},
        ])

    def test_invalid_type_raises(self):
        with pytest.raises(ValueError, match="invalid type"):
            _validate_insights([
                {"type": "invalid", "text": "x", "citation": None, "confidence": None, "source_count": 0},
            ])

    def test_empty_text_raises(self):
        with pytest.raises(ValueError, match="empty text"):
            _validate_insights([
                {"type": "gap", "text": "   ", "citation": None, "confidence": None, "source_count": 0},
            ])

    def test_finding_without_citation_raises(self):
        with pytest.raises(ValueError, match="requires a non-null citation"):
            _validate_insights([
                {"type": "finding", "text": "Evidence", "citation": None, "confidence": 0.8, "source_count": 1},
            ])

    def test_contradiction_without_citation_raises(self):
        with pytest.raises(ValueError, match="requires a non-null citation"):
            _validate_insights([
                {"type": "contradiction", "text": "Conflict", "citation": None, "confidence": 0.3, "source_count": 1},
            ])

    def test_gap_with_non_null_confidence_raises(self):
        with pytest.raises(ValueError, match="gap.*confidence null"):
            _validate_insights([
                {"type": "gap", "text": "Missing", "citation": None, "confidence": 0.5, "source_count": 0},
            ])

    def test_confidence_out_of_range_high_raises(self):
        with pytest.raises(ValueError, match="in \\[0.0, 1.0\\]"):
            _validate_insights([
                {"type": "finding", "text": "x", "citation": "f:1", "confidence": 1.5, "source_count": 1},
            ])

    def test_confidence_out_of_range_negative_raises(self):
        with pytest.raises(ValueError, match="in \\[0.0, 1.0\\]"):
            _validate_insights([
                {"type": "finding", "text": "x", "citation": "f:1", "confidence": -0.1, "source_count": 1},
            ])

    def test_confidence_boundary_0_and_1_pass(self):
        _validate_insights([
            {"type": "finding", "text": "a", "citation": "f:1", "confidence": 0.0, "source_count": 1},
            {"type": "finding", "text": "b", "citation": "f:2", "confidence": 1.0, "source_count": 1},
        ])

    def test_multiple_valid_insights_pass(self):
        _validate_insights([
            {"type": "finding", "text": "Yes", "citation": "a:1", "confidence": 0.9, "source_count": 2},
            {"type": "contradiction", "text": "No", "citation": "b:2", "confidence": 0.2, "source_count": 1},
            {"type": "gap", "text": "Unknown", "citation": None, "confidence": None, "source_count": 0},
        ])


# ============================================================================
# create_analysis, list_analyses, has_recent_analysis — integration-style with mocked session
# ============================================================================

@pytest.fixture
def mock_db():
    """AsyncSession mock that captures add/flush and returns a committed state."""
    session = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.execute = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.mark.asyncio
class TestCreateAnalysisRequiresCommitByCaller:
    """create_analysis no longer commits; caller must commit. These tests verify it does not call commit."""

    async def test_create_analysis_does_not_commit(self, mock_db):
        """Caller is responsible for commit; create_analysis must not commit."""
        from app.models.analysis import Analysis

        mock_analysis = MagicMock(spec=Analysis)
        mock_analysis.id = uuid.uuid4()
        mock_analysis.insights = []
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = mock_analysis
        mock_db.execute.return_value = mock_result

        await create_analysis(
            mock_db,
            project_id=uuid.uuid4(),
            objective="test",
            confidence_score=0.75,
            raw_response="{}",
            tokens_used=100,
            cost_usd=0.01,
            insights_data=[
                {"type": "finding", "text": "T", "citation": "f:1", "confidence": 0.8, "source_count": 1},
            ],
        )

        mock_db.commit.assert_not_called()
        mock_db.flush.assert_called()


# ============================================================================
# get_project_cost_totals (Story 6-3)
# ============================================================================

@pytest.mark.asyncio
class TestGetProjectCostTotals:
    """get_project_cost_totals returns sum of cost_usd per project."""

    async def test_empty_project_ids_returns_empty_dict(self, mock_db):
        result = await get_project_cost_totals(mock_db, [])
        assert result == {}

    async def test_returns_total_per_project(self, mock_db):
        pid1 = uuid.uuid4()
        pid2 = uuid.uuid4()
        mock_row1 = MagicMock()
        mock_row1.project_id = pid1
        mock_row1.total = 12.34
        mock_result = MagicMock()
        mock_result.all.return_value = [mock_row1]
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await get_project_cost_totals(mock_db, [pid1, pid2])
        assert result[pid1] == 12.34
        assert result[pid2] == 0.0

    async def test_multiple_projects_with_totals(self, mock_db):
        pid1 = uuid.uuid4()
        pid2 = uuid.uuid4()
        mock_row1 = MagicMock()
        mock_row1.project_id = pid1
        mock_row1.total = 1.5
        mock_row2 = MagicMock()
        mock_row2.project_id = pid2
        mock_row2.total = 2.25
        mock_result = MagicMock()
        mock_result.all.return_value = [mock_row1, mock_row2]
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await get_project_cost_totals(mock_db, [pid1, pid2])
        assert result[pid1] == 1.5
        assert result[pid2] == 2.25
