"""
Tests for artifact_service (Story 6-2): _safe_filename, create_artifacts_for_analysis.

create_artifacts_for_analysis uses mocked DB and persona/icp services.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.artifact_service import (
    _safe_filename,
    create_artifacts_for_analysis,
)


# ============================================================================
# _safe_filename
# ============================================================================

class TestSafeFilename:
    def test_normal_name_unchanged(self):
        assert _safe_filename("My Project") == "My_Project"

    def test_spaces_replaced_with_underscore(self):
        assert _safe_filename("a b c") == "a_b_c"

    def test_slashes_replaced(self):
        assert _safe_filename("Client/Project") == "Client_Project"

    def test_quotes_replaced(self):
        # Quotes and spaces become _; trailing _ stripped
        assert _safe_filename('Project "Beta"') == "Project__Beta"

    def test_empty_fallback(self):
        assert _safe_filename("") == "project"
        assert _safe_filename("   ") == "project"

    def test_truncates_to_max_len(self):
        assert len(_safe_filename("a" * 100)) == 50
        assert _safe_filename("a" * 100, max_len=10) == "a" * 10

    def test_only_unsafe_chars_fallback(self):
        assert _safe_filename("///") == "project"


# ============================================================================
# create_artifacts_for_analysis (mocked DB)
# ============================================================================

@pytest.fixture
def mock_analysis_with_project():
    """Minimal analysis and project for artifact creation (no persona, icp, positioning)."""
    pid = uuid.uuid4()
    aid = uuid.uuid4()
    analysis = MagicMock()
    analysis.id = aid
    analysis.project_id = pid
    analysis.recommendations = {
        "interview_script_md": "# Script",
        "survey_template_md": "# Survey",
    }
    analysis.confidence_score = 0.75
    analysis.insights = []
    analysis.positioning_result = None
    project = MagicMock()
    project.id = pid
    project.name = "Test/Project"
    return aid, analysis, project


@pytest.mark.asyncio
class TestCreateArtifactsForAnalysis:
    async def test_returns_empty_when_analysis_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await create_artifacts_for_analysis(mock_db, uuid.uuid4())
        assert result == []

    async def test_creates_interview_and_survey_artifacts_with_safe_filename(
        self, mock_analysis_with_project
    ):
        aid, analysis, project = mock_analysis_with_project
        mock_db = AsyncMock()
        # First execute: select Analysis
        mock_analysis_result = MagicMock()
        mock_analysis_result.scalar_one_or_none.return_value = analysis
        # Second execute: select Project
        mock_project_result = MagicMock()
        mock_project_result.scalar_one_or_none.return_value = project
        mock_db.execute = AsyncMock(side_effect=[mock_analysis_result, mock_project_result])
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()

        with patch(
            "app.services.artifact_service.persona_service.get_persona_by_project",
            new_callable=AsyncMock,
            return_value=None,
        ), patch(
            "app.services.artifact_service.icp_service.get_icp_by_project",
            new_callable=AsyncMock,
            return_value=None,
        ):
            created = await create_artifacts_for_analysis(mock_db, aid)

        assert len(created) == 2
        types = {a.artifact_type for a in created}
        assert types == {"interview_script", "survey_template"}
        for art in created:
            assert "/" not in art.file_name
            assert '"' not in art.file_name
            assert art.file_name.endswith(".md")
            assert art.analysis_id == aid
