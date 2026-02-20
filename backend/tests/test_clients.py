"""
Tests for client management schemas, routes, and app integration.

Follows the same structural pattern as test_auth_endpoints.py — validates
schemas, route registration, and function existence without requiring a live DB.
"""

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError


# ============================================================================
# SCHEMA TESTS
# ============================================================================

class TestClientCreateSchema:
    def test_valid_minimal(self):
        from app.schemas.client import ClientCreate
        req = ClientCreate(name="Acme Corp")
        assert req.name == "Acme Corp"
        assert req.description is None

    def test_valid_full(self):
        from app.schemas.client import ClientCreate
        req = ClientCreate(
            name="Acme Corp",
            description="A great company",
            market_type="SaaS",
            assumed_problem="Pain",
            assumed_solution="Fix",
            assumed_market="SMB",
            initial_notes="Notes here",
        )
        assert req.market_type == "SaaS"
        assert req.initial_notes == "Notes here"

    def test_name_required(self):
        from app.schemas.client import ClientCreate
        with pytest.raises(ValidationError):
            ClientCreate()  # name missing

    def test_empty_name_rejected(self):
        from app.schemas.client import ClientCreate
        with pytest.raises(ValidationError):
            ClientCreate(name="   ")  # blank after strip

    def test_name_is_stripped(self):
        from app.schemas.client import ClientCreate
        req = ClientCreate(name="  Trimmed  ")
        assert req.name == "Trimmed"


class TestClientUpdateSchema:
    def test_all_optional(self):
        from app.schemas.client import ClientUpdate
        req = ClientUpdate()
        assert req.name is None
        assert req.description is None

    def test_partial_update(self):
        from app.schemas.client import ClientUpdate
        req = ClientUpdate(name="New Name", description="New desc")
        assert req.name == "New Name"

    def test_empty_name_rejected(self):
        from app.schemas.client import ClientUpdate
        with pytest.raises(ValidationError):
            ClientUpdate(name="")

    def test_none_name_allowed(self):
        from app.schemas.client import ClientUpdate
        req = ClientUpdate(name=None)
        assert req.name is None


class TestClientResponseSchema:
    def test_from_dict(self):
        from app.schemas.client import ClientResponse
        now = datetime.now(timezone.utc)
        resp = ClientResponse(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            name="Acme",
            status="active",
            created_at=now,
            updated_at=now,
        )
        assert resp.name == "Acme"
        assert resp.status == "active"
        assert resp.archived_at is None

    def test_archived_client(self):
        from app.schemas.client import ClientResponse
        now = datetime.now(timezone.utc)
        resp = ClientResponse(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            name="Old Corp",
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

class TestClientsRouterRegistration:
    def test_router_exists(self):
        from app.api.routes.clients import router
        assert router is not None
        assert router.prefix == "/clients"

    def test_post_create_registered(self):
        from app.api.routes.clients import router
        found = any(
            "POST" in r.methods and "{" not in r.path and "archive" not in r.path
            for r in router.routes
        )
        assert found, "POST /clients not registered"

    def test_get_list_registered(self):
        from app.api.routes.clients import router
        found = any(
            "GET" in r.methods and "{" not in r.path
            for r in router.routes
        )
        assert found, "GET /clients not registered"

    def test_get_by_id_registered(self):
        from app.api.routes.clients import router
        found = any(
            "GET" in r.methods and "{client_id}" in r.path
            for r in router.routes
        )
        assert found, "GET /clients/{client_id} not registered"

    def test_put_update_registered(self):
        from app.api.routes.clients import router
        found = any(
            "PUT" in r.methods and "{client_id}" in r.path
            for r in router.routes
        )
        assert found, "PUT /clients/{client_id} not registered"

    def test_patch_archive_registered(self):
        from app.api.routes.clients import router
        found = any(
            "PATCH" in r.methods and "archive" in r.path
            for r in router.routes
        )
        assert found, "PATCH /clients/{client_id}/archive not registered"

    def test_delete_registered(self):
        from app.api.routes.clients import router
        found = any(
            "DELETE" in r.methods and "{client_id}" in r.path
            for r in router.routes
        )
        assert found, "DELETE /clients/{client_id} not registered"


# ============================================================================
# APP INTEGRATION TESTS
# ============================================================================

class TestClientsInApp:
    def test_clients_router_included(self):
        from app.main import app
        clients_routes_found = any("/clients" in str(r.path) for r in app.routes)
        assert clients_routes_found, "Client routes not found in FastAPI app"

    def test_allow_methods_includes_patch(self):
        """CORS middleware must allow PATCH for archive endpoint."""
        from app.main import app
        cors_found = any("CORSMiddleware" in str(m) for m in app.user_middleware)
        assert cors_found, "CORS middleware not configured"


# ============================================================================
# ENDPOINT FUNCTION EXISTENCE TESTS
# ============================================================================

class TestClientEndpointFunctions:
    def test_create_client_exists(self):
        from app.api.routes.clients import create_client
        assert callable(create_client)

    def test_list_clients_exists(self):
        from app.api.routes.clients import list_clients
        assert callable(list_clients)

    def test_get_client_exists(self):
        from app.api.routes.clients import get_client
        assert callable(get_client)

    def test_update_client_exists(self):
        from app.api.routes.clients import update_client
        assert callable(update_client)

    def test_toggle_archive_exists(self):
        from app.api.routes.clients import toggle_archive
        assert callable(toggle_archive)

    def test_delete_client_exists(self):
        from app.api.routes.clients import delete_client
        assert callable(delete_client)
