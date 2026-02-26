"""
Unit tests for project_service and client delete guard using AsyncMock.

Tests business logic in isolation — no live DB required.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest


# ============================================================================
# apply_staleness_decay
# ============================================================================

class TestApplyStalenessDecay:
    def test_none_score_returns_none(self):
        from app.services.project_service import apply_staleness_decay
        result = apply_staleness_decay(None, datetime.now(timezone.utc))
        assert result is None

    def test_none_last_analyzed_returns_score_unchanged(self):
        from app.services.project_service import apply_staleness_decay
        result = apply_staleness_decay(0.8, None)
        assert result == 0.8

    def test_no_decay_analyzed_today(self):
        from app.services.project_service import apply_staleness_decay
        result = apply_staleness_decay(0.7, datetime.now(timezone.utc))
        # months_elapsed ≈ 0, decay ≈ 0
        assert result == pytest.approx(0.7, abs=0.01)

    def test_decay_after_one_month(self):
        from app.services.project_service import apply_staleness_decay
        analyzed = datetime.now(timezone.utc) - timedelta(days=30)
        result = apply_staleness_decay(0.9, analyzed)
        # months_elapsed = 1.0, decayed = 0.9 - 0.05 = 0.85
        assert result == pytest.approx(0.85, abs=0.01)

    def test_floor_at_zero(self):
        from app.services.project_service import apply_staleness_decay
        # 24 months ago → decay = 24 * 0.05 = 1.2, score 0.1 - 1.2 = -1.1 → clamped 0.0
        analyzed = datetime.now(timezone.utc) - timedelta(days=720)
        result = apply_staleness_decay(0.1, analyzed)
        assert result == 0.0

    def test_ceiling_at_095(self):
        from app.services.project_service import apply_staleness_decay
        # Score above 0.95 gets clamped down to 0.95 even with no decay
        result = apply_staleness_decay(1.0, datetime.now(timezone.utc))
        assert result == pytest.approx(0.95, abs=0.01)

    def test_handles_naive_datetime(self):
        from app.services.project_service import apply_staleness_decay
        # Should not raise even if last_analyzed_at is naive
        naive_dt = datetime(2025, 1, 1)  # no tzinfo
        result = apply_staleness_decay(0.8, naive_dt)
        assert result is not None
        assert 0.0 <= result <= 0.95


# ============================================================================
# create_project
# ============================================================================

class TestCreateProject:
    @pytest.mark.asyncio
    async def test_create_sets_status_active(self):
        from app.schemas.project import ProjectCreate
        from app.services.project_service import create_project

        db = AsyncMock()
        client_id = uuid.uuid4()
        data = ProjectCreate(
            name="Sprint 1",
            objective="problem-validation",
            assumed_problem="Teams lose time on RFPs",
        )

        project = await create_project(db, client_id, data)

        assert project.name == "Sprint 1"
        assert project.status == "active"
        assert project.client_id == client_id
        assert project.assumed_problem == "Teams lose time on RFPs"
        assert project.confidence_score is None

    @pytest.mark.asyncio
    async def test_create_commits_and_refreshes(self):
        from app.schemas.project import ProjectCreate
        from app.services.project_service import create_project

        db = AsyncMock()
        data = ProjectCreate(name="Sprint 2", objective="positioning")

        await create_project(db, uuid.uuid4(), data)

        db.add.assert_called_once()
        db.commit.assert_awaited_once()
        db.refresh.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_create_stores_target_segments(self):
        from app.schemas.project import ProjectCreate
        from app.services.project_service import create_project

        db = AsyncMock()
        data = ProjectCreate(
            name="ICP Study",
            objective="icp-refinement",
            target_segments=["SMB", "Enterprise"],
        )

        project = await create_project(db, uuid.uuid4(), data)

        assert project.target_segments == ["SMB", "Enterprise"]

    @pytest.mark.asyncio
    async def test_create_stores_assumed_problem(self):
        from app.schemas.project import ProjectCreate
        from app.services.project_service import create_project

        db = AsyncMock()
        data = ProjectCreate(
            name="PV Project",
            objective="problem-validation",
            assumed_problem="Customers need faster onboarding",
        )

        project = await create_project(db, uuid.uuid4(), data)

        assert project.assumed_problem == "Customers need faster onboarding"


# ============================================================================
# list_projects
# ============================================================================

class TestListProjects:
    @pytest.mark.asyncio
    async def test_returns_list_from_db(self):
        from app.services.project_service import list_projects

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute.return_value = mock_result

        result = await list_projects(db, uuid.uuid4())

        assert result == []
        db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_include_archived_executes_query(self):
        from app.services.project_service import list_projects

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute.return_value = mock_result

        await list_projects(db, uuid.uuid4(), include_archived=True)

        db.execute.assert_awaited_once()


# ============================================================================
# toggle_archive (project)
# ============================================================================

class TestToggleArchiveProject:
    @pytest.mark.asyncio
    async def test_active_becomes_archived(self):
        from app.services.project_service import toggle_archive

        db = AsyncMock()
        project = MagicMock()
        project.status = "active"
        project.archived_at = None

        await toggle_archive(db, project)

        assert project.status == "archived"
        assert project.archived_at is not None
        db.commit.assert_awaited_once()
        db.refresh.assert_awaited_once_with(project)

    @pytest.mark.asyncio
    async def test_archived_becomes_active(self):
        from app.services.project_service import toggle_archive

        db = AsyncMock()
        project = MagicMock()
        project.status = "archived"
        project.archived_at = datetime.now(timezone.utc)

        await toggle_archive(db, project)

        assert project.status == "active"
        assert project.archived_at is None

    @pytest.mark.asyncio
    async def test_updated_at_set(self):
        from app.services.project_service import toggle_archive

        db = AsyncMock()
        project = MagicMock()
        project.status = "active"
        project.updated_at = None

        await toggle_archive(db, project)

        assert project.updated_at is not None


# ============================================================================
# update_project
# ============================================================================

class TestUpdateProject:
    @pytest.mark.asyncio
    async def test_applies_name_change(self):
        from app.schemas.project import ProjectUpdate
        from app.services.project_service import update_project

        db = AsyncMock()
        project = MagicMock()
        project.name = "Old Name"

        await update_project(db, project, ProjectUpdate(name="New Name"))

        assert project.name == "New Name"
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_skips_none_fields(self):
        from app.schemas.project import ProjectUpdate
        from app.services.project_service import update_project

        db = AsyncMock()
        project = MagicMock()

        # objective=None → excluded from update, so setattr never called for it
        await update_project(db, project, ProjectUpdate(name="Changed"))

        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_updated_at_advances(self):
        from app.schemas.project import ProjectUpdate
        from app.services.project_service import update_project

        db = AsyncMock()
        project = MagicMock()
        before = datetime(2020, 1, 1, tzinfo=timezone.utc)
        project.updated_at = before

        await update_project(db, project, ProjectUpdate(name="Changed"))

        assert project.updated_at != before


# ============================================================================
# delete_project
# ============================================================================

class TestDeleteProject:
    @pytest.mark.asyncio
    async def test_delete_calls_db_delete(self):
        from app.services.project_service import delete_project

        db = AsyncMock()
        project = MagicMock()

        await delete_project(db, project)

        db.delete.assert_awaited_once_with(project)
        db.commit.assert_awaited_once()


# ============================================================================
# client delete guard (client_service.delete_client)
# ============================================================================

class TestClientDeleteGuard:
    @pytest.mark.asyncio
    async def test_raises_when_projects_exist(self):
        from app.services.client_service import delete_client

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = MagicMock()  # project found
        db.execute.return_value = mock_result
        client = MagicMock()

        with pytest.raises(ValueError, match="existing projects"):
            await delete_client(db, client)

    @pytest.mark.asyncio
    async def test_succeeds_when_no_projects(self):
        from app.services.client_service import delete_client

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # no projects
        db.execute.return_value = mock_result
        client = MagicMock()

        await delete_client(db, client)  # should not raise

        db.delete.assert_awaited_once_with(client)
        db.commit.assert_awaited_once()
