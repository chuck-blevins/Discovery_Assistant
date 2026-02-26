"""
Tests for project management schemas, routes, and app integration.

Follows the same structural pattern as test_clients.py — validates
schemas, route registration, and function existence without requiring a live DB.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError


# ============================================================================
# SCHEMA TESTS — ProjectCreate
# ============================================================================

class TestProjectCreateSchema:
    def test_valid_minimal(self):
        from app.schemas.project import ProjectCreate
        req = ProjectCreate(
            name="Sprint 1",
            objective="problem-validation",
            assumed_problem="Teams lose time tracking RFPs",
        )
        assert req.name == "Sprint 1"
        assert req.target_segments == []
        assert req.assumed_problem == "Teams lose time tracking RFPs"

    def test_problem_validation_requires_assumed_problem(self):
        from app.schemas.project import ProjectCreate
        with pytest.raises(ValidationError, match="assumed_problem"):
            ProjectCreate(name="Sprint 1", objective="problem-validation")

    def test_problem_validation_rejects_empty_assumed_problem(self):
        from app.schemas.project import ProjectCreate
        with pytest.raises(ValidationError, match="assumed_problem"):
            ProjectCreate(
                name="Sprint 1",
                objective="problem-validation",
                assumed_problem="   ",
            )

    def test_other_objectives_allow_none_assumed_problem(self):
        from app.schemas.project import ProjectCreate
        for obj in ("positioning", "persona-buildout", "icp-refinement"):
            req = ProjectCreate(name="Test", objective=obj)
            assert req.assumed_problem is None

    def test_valid_with_segments(self):
        from app.schemas.project import ProjectCreate
        req = ProjectCreate(
            name="ICP Study",
            objective="icp-refinement",
            target_segments=["SMB", "Enterprise"],
        )
        assert req.target_segments == ["SMB", "Enterprise"]

    def test_name_required(self):
        from app.schemas.project import ProjectCreate
        with pytest.raises(ValidationError):
            ProjectCreate(objective="problem-validation")

    def test_objective_required(self):
        from app.schemas.project import ProjectCreate
        with pytest.raises(ValidationError):
            ProjectCreate(name="Research Sprint")

    def test_empty_name_rejected(self):
        from app.schemas.project import ProjectCreate
        with pytest.raises(ValidationError):
            ProjectCreate(
                name="   ",
                objective="problem-validation",
                assumed_problem="Some hypothesis",
            )

    def test_name_is_stripped(self):
        from app.schemas.project import ProjectCreate
        req = ProjectCreate(name="  Trimmed  ", objective="positioning")
        assert req.name == "Trimmed"

    def test_invalid_objective_rejected(self):
        from app.schemas.project import ProjectCreate
        with pytest.raises(ValidationError):
            ProjectCreate(name="Research", objective="not-valid")

    def test_all_valid_objectives_accepted(self):
        from app.schemas.project import VALID_OBJECTIVES, ProjectCreate
        for obj in VALID_OBJECTIVES:
            kwargs = {"name": "Test", "objective": obj}
            if obj == "problem-validation":
                kwargs["assumed_problem"] = "Hypothesis for this project"
            req = ProjectCreate(**kwargs)
            assert req.objective == obj


# ============================================================================
# SCHEMA TESTS — ProjectUpdate
# ============================================================================

class TestProjectUpdateSchema:
    def test_all_optional(self):
        from app.schemas.project import ProjectUpdate
        req = ProjectUpdate()
        assert req.name is None
        assert req.objective is None
        assert req.target_segments is None

    def test_partial_update_name(self):
        from app.schemas.project import ProjectUpdate
        req = ProjectUpdate(name="New Name")
        assert req.name == "New Name"
        assert req.objective is None

    def test_empty_name_rejected(self):
        from app.schemas.project import ProjectUpdate
        with pytest.raises(ValidationError):
            ProjectUpdate(name="")

    def test_none_name_allowed(self):
        from app.schemas.project import ProjectUpdate
        req = ProjectUpdate(name=None)
        assert req.name is None

    def test_invalid_objective_rejected(self):
        from app.schemas.project import ProjectUpdate
        with pytest.raises(ValidationError):
            ProjectUpdate(objective="bad-value")

    def test_none_objective_allowed(self):
        from app.schemas.project import ProjectUpdate
        req = ProjectUpdate(objective=None)
        assert req.objective is None

    def test_update_segments(self):
        from app.schemas.project import ProjectUpdate
        req = ProjectUpdate(target_segments=["Fintech"])
        assert req.target_segments == ["Fintech"]


# ============================================================================
# SCHEMA TESTS — ProjectResponse
# ============================================================================

class TestProjectResponseSchema:
    def test_from_dict_minimal(self):
        from app.schemas.project import ProjectResponse
        now = datetime.now(timezone.utc)
        resp = ProjectResponse(
            id=uuid.uuid4(),
            client_id=uuid.uuid4(),
            name="Sprint 1",
            objective="problem-validation",
            target_segments=["SMB"],
            assumed_problem="Some hypothesis",
            status="active",
            created_at=now,
            updated_at=now,
        )
        assert resp.name == "Sprint 1"
        assert resp.status == "active"
        assert resp.assumed_problem == "Some hypothesis"
        assert resp.confidence_score is None
        assert resp.archived_at is None

    def test_with_confidence_score(self):
        from app.schemas.project import ProjectResponse
        now = datetime.now(timezone.utc)
        resp = ProjectResponse(
            id=uuid.uuid4(),
            client_id=uuid.uuid4(),
            name="Sprint 1",
            objective="problem-validation",
            target_segments=[],
            assumed_problem=None,
            status="active",
            confidence_score=0.75,
            last_analyzed_at=now,
            created_at=now,
            updated_at=now,
        )
        assert resp.confidence_score == 0.75
        assert resp.last_analyzed_at is not None

    def test_archived_project(self):
        from app.schemas.project import ProjectResponse
        now = datetime.now(timezone.utc)
        resp = ProjectResponse(
            id=uuid.uuid4(),
            client_id=uuid.uuid4(),
            name="Old Sprint",
            objective="positioning",
            target_segments=[],
            status="archived",
            created_at=now,
            updated_at=now,
            archived_at=now,
        )
        assert resp.status == "archived"
        assert resp.archived_at is not None


# ============================================================================
# ROUTE REGISTRATION TESTS
# ============================================================================

class TestProjectsRouterRegistration:
    def test_router_exists(self):
        from app.api.routes.projects import router
        assert router is not None

    def test_post_create_registered(self):
        from app.api.routes.projects import router
        found = any(
            "POST" in r.methods and "client_id" in r.path and "projects" in r.path
            for r in router.routes
        )
        assert found, "POST /clients/{client_id}/projects not registered"

    def test_get_list_registered(self):
        from app.api.routes.projects import router
        found = any(
            "GET" in r.methods and "client_id" in r.path
            for r in router.routes
        )
        assert found, "GET /clients/{client_id}/projects not registered"

    def test_get_by_id_registered(self):
        from app.api.routes.projects import router
        found = any(
            "GET" in r.methods and "project_id" in r.path
            for r in router.routes
        )
        assert found, "GET /projects/{project_id} not registered"

    def test_put_update_registered(self):
        from app.api.routes.projects import router
        found = any(
            "PUT" in r.methods and "project_id" in r.path
            for r in router.routes
        )
        assert found, "PUT /projects/{project_id} not registered"

    def test_patch_archive_registered(self):
        from app.api.routes.projects import router
        found = any(
            "PATCH" in r.methods and "archive" in r.path
            for r in router.routes
        )
        assert found, "PATCH /projects/{project_id}/archive not registered"

    def test_delete_registered(self):
        from app.api.routes.projects import router
        found = any(
            "DELETE" in r.methods and "project_id" in r.path
            for r in router.routes
        )
        assert found, "DELETE /projects/{project_id} not registered"


# ============================================================================
# APP INTEGRATION TESTS
# ============================================================================

class TestProjectsInApp:
    def test_projects_router_included(self):
        from app.main import app
        routes_found = any("/projects" in str(r.path) for r in app.routes)
        assert routes_found, "Project routes not found in FastAPI app"


# ============================================================================
# ENDPOINT FUNCTION EXISTENCE TESTS
# ============================================================================

class TestProjectEndpointFunctions:
    def test_create_project_exists(self):
        from app.api.routes.projects import create_project
        assert callable(create_project)

    def test_list_projects_exists(self):
        from app.api.routes.projects import list_projects
        assert callable(list_projects)

    def test_get_project_exists(self):
        from app.api.routes.projects import get_project
        assert callable(get_project)

    def test_update_project_exists(self):
        from app.api.routes.projects import update_project
        assert callable(update_project)

    def test_toggle_archive_exists(self):
        from app.api.routes.projects import toggle_archive
        assert callable(toggle_archive)

    def test_delete_project_exists(self):
        from app.api.routes.projects import delete_project
        assert callable(delete_project)


# ============================================================================
# ROUTE ERROR HANDLING TESTS
# ============================================================================

class TestProjectRouteErrorHandling:
    @pytest.mark.asyncio
    async def test_create_project_returns_409_on_duplicate_name(self):
        """Duplicate project name in same client → 409 Conflict, not 500."""
        from sqlalchemy.exc import IntegrityError
        from fastapi import HTTPException
        from app.api.routes.projects import create_project
        from app.schemas.project import ProjectCreate

        mock_db = AsyncMock()
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        data = ProjectCreate(
            name="Sprint 1",
            objective="problem-validation",
            assumed_problem="Hypothesis",
        )

        with patch("app.api.routes.projects.client_service.get_client", new_callable=AsyncMock) as mock_get_client, \
             patch("app.api.routes.projects.project_service.create_project", new_callable=AsyncMock) as mock_create:
            mock_get_client.return_value = MagicMock()
            mock_create.side_effect = IntegrityError("", {}, Exception())

            with pytest.raises(HTTPException) as exc_info:
                await create_project(uuid.uuid4(), data, mock_db, mock_user)

        assert exc_info.value.status_code == 409
        assert "already exists" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_project_returns_409_on_duplicate_name(self):
        """Renaming a project to an existing name in same client → 409 Conflict, not 500."""
        from sqlalchemy.exc import IntegrityError
        from fastapi import HTTPException
        from app.api.routes.projects import update_project
        from app.schemas.project import ProjectUpdate

        mock_db = AsyncMock()
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        mock_project = MagicMock()
        mock_project.client_id = uuid.uuid4()
        data = ProjectUpdate(name="Existing Sprint")

        with patch("app.api.routes.projects.project_service.get_project", new_callable=AsyncMock) as mock_get_project, \
             patch("app.api.routes.projects.client_service.get_client", new_callable=AsyncMock) as mock_get_client, \
             patch("app.api.routes.projects.project_service.update_project", new_callable=AsyncMock) as mock_update:
            mock_get_project.return_value = mock_project
            mock_get_client.return_value = MagicMock()
            mock_update.side_effect = IntegrityError("", {}, Exception())

            with pytest.raises(HTTPException) as exc_info:
                await update_project(uuid.uuid4(), data, mock_db, mock_user)

        assert exc_info.value.status_code == 409
        assert "already exists" in exc_info.value.detail
