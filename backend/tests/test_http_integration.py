"""
Real HTTP integration tests for auth endpoints.

Uses FastAPI TestClient with DB dependency overrides so every test
exercises the actual request/response cycle — routing, middleware,
Pydantic validation, JWT creation, and cookie handling — without
requiring a live database.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.main import app
from app.models.user import User
from app.utils.security import create_access_token, hash_password


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(email: str = "test@example.com", password: str = "Password123") -> MagicMock:
    """Return a MagicMock that looks like an ORM User instance."""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = email.lower()
    user.password_hash = hash_password(password)
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    return user


def _db_override(
    execute_return=None,
    commit_side_effect=None,
):
    """
    Build a FastAPI dependency override for `get_db`.

    execute_return  – value returned by result.scalar_one_or_none()
    commit_side_effect – exception to raise on commit (e.g. IntegrityError)
    """
    mock_db = MagicMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock(side_effect=commit_side_effect)
    mock_db.rollback = AsyncMock()
    mock_db.close = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = execute_return
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def _refresh(obj):
        """Simulate server-side defaults that the real DB would populate."""
        now = datetime.now(timezone.utc)
        if hasattr(obj, "created_at") and obj.created_at is None:
            obj.created_at = now
        if hasattr(obj, "updated_at") and obj.updated_at is None:
            obj.updated_at = now

    mock_db.refresh = AsyncMock(side_effect=_refresh)

    async def override():
        yield mock_db

    return override


@pytest.fixture(autouse=True)
def _clear_overrides():
    """Ensure dependency overrides are cleaned up after every test."""
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# POST /auth/signup
# ---------------------------------------------------------------------------

class TestSignupHTTP:
    def test_valid_signup_returns_201_without_password(self):
        app.dependency_overrides[get_db] = _db_override()
        with TestClient(app) as client:
            resp = client.post(
                "/auth/signup",
                json={"email": "new@example.com", "password": "Password123"},
            )
        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == "new@example.com"
        assert "id" in body
        assert "created_at" in body
        assert "password" not in body
        assert "password_hash" not in body

    def test_email_normalised_to_lowercase(self):
        app.dependency_overrides[get_db] = _db_override()
        with TestClient(app) as client:
            resp = client.post(
                "/auth/signup",
                json={"email": "User@Example.COM", "password": "Password123"},
            )
        assert resp.status_code == 201
        assert resp.json()["email"] == "user@example.com"

    def test_duplicate_email_returns_409(self):
        app.dependency_overrides[get_db] = _db_override(
            commit_side_effect=IntegrityError(None, None, Exception("unique constraint"))
        )
        with TestClient(app) as client:
            resp = client.post(
                "/auth/signup",
                json={"email": "dupe@example.com", "password": "Password123"},
            )
        assert resp.status_code == 409

    def test_short_password_returns_422(self):
        app.dependency_overrides[get_db] = _db_override()
        with TestClient(app) as client:
            resp = client.post(
                "/auth/signup",
                json={"email": "user@example.com", "password": "short"},
            )
        assert resp.status_code == 422

    def test_password_without_digit_returns_422(self):
        app.dependency_overrides[get_db] = _db_override()
        with TestClient(app) as client:
            resp = client.post(
                "/auth/signup",
                json={"email": "user@example.com", "password": "NoDigitsHere"},
            )
        assert resp.status_code == 422

    def test_invalid_email_returns_422(self):
        app.dependency_overrides[get_db] = _db_override()
        with TestClient(app) as client:
            resp = client.post(
                "/auth/signup",
                json={"email": "notanemail", "password": "Password123"},
            )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

class TestLoginHTTP:
    def test_valid_login_returns_200_with_token_and_cookie(self):
        user = _make_user()
        app.dependency_overrides[get_db] = _db_override(execute_return=user)
        with TestClient(app) as client:
            resp = client.post(
                "/auth/login",
                json={"email": user.email, "password": "Password123"},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert body["user"]["email"] == user.email
        # Cookie must be set
        assert "access_token" in resp.cookies

    def test_wrong_password_returns_401(self):
        user = _make_user()
        app.dependency_overrides[get_db] = _db_override(execute_return=user)
        with TestClient(app) as client:
            resp = client.post(
                "/auth/login",
                json={"email": user.email, "password": "WrongPassword999"},
            )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    def test_unknown_user_returns_401(self):
        app.dependency_overrides[get_db] = _db_override(execute_return=None)
        with TestClient(app) as client:
            resp = client.post(
                "/auth/login",
                json={"email": "nobody@example.com", "password": "Password123"},
            )
        assert resp.status_code == 401

    def test_wrong_password_and_unknown_user_same_message(self):
        """No user-enumeration: both failure modes return identical detail."""
        user = _make_user()

        app.dependency_overrides[get_db] = _db_override(execute_return=user)
        with TestClient(app) as client:
            wrong_pass = client.post(
                "/auth/login",
                json={"email": user.email, "password": "WrongPassword999"},
            )

        app.dependency_overrides[get_db] = _db_override(execute_return=None)
        with TestClient(app) as client:
            no_user = client.post(
                "/auth/login",
                json={"email": "ghost@example.com", "password": "Password123"},
            )

        assert wrong_pass.json()["detail"] == no_user.json()["detail"]


# ---------------------------------------------------------------------------
# GET /auth/validate
# ---------------------------------------------------------------------------

class TestValidateHTTP:
    def test_valid_bearer_token_returns_200(self):
        user = _make_user()
        token = create_access_token(user.id, user.email)
        app.dependency_overrides[get_db] = _db_override(execute_return=user)
        with TestClient(app) as client:
            resp = client.get(
                "/auth/validate",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 200
        assert resp.json()["email"] == user.email

    def test_valid_cookie_token_returns_200(self):
        """Cookie-based auth must work (ProtectedRoute relies on this)."""
        user = _make_user()
        token = create_access_token(user.id, user.email)
        app.dependency_overrides[get_db] = _db_override(execute_return=user)
        with TestClient(app, cookies={"access_token": token}) as client:
            resp = client.get("/auth/validate")
        assert resp.status_code == 200
        assert resp.json()["email"] == user.email

    def test_missing_token_returns_401(self):
        with TestClient(app) as client:
            resp = client.get("/auth/validate")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self):
        app.dependency_overrides[get_db] = _db_override()
        with TestClient(app) as client:
            resp = client.get(
                "/auth/validate",
                headers={"Authorization": "Bearer not.a.valid.token"},
            )
        assert resp.status_code == 401

    def test_expired_token_returns_401(self):
        from jose import jwt as jose_jwt
        from app.utils.security import SECRET_KEY

        payload = {
            "user_id": str(uuid.uuid4()),
            "email": "x@x.com",
            "exp": 1,  # Unix epoch 1 — definitely expired
        }
        expired_token = jose_jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        app.dependency_overrides[get_db] = _db_override()
        with TestClient(app) as client:
            resp = client.get(
                "/auth/validate",
                headers={"Authorization": f"Bearer {expired_token}"},
            )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

class TestLogoutHTTP:
    def test_logout_returns_200(self):
        with TestClient(app) as client:
            resp = client.post("/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Logged out successfully"

    def test_logout_clears_access_token_cookie(self):
        with TestClient(app, cookies={"access_token": "sometoken"}) as client:
            resp = client.post("/auth/logout")
        assert resp.status_code == 200
        # After logout the cookie value should be empty/cleared
        assert resp.cookies.get("access_token", "") == ""


# ---------------------------------------------------------------------------
# GET /health  (AC6 — must be at root /health, not /auth/health)
# ---------------------------------------------------------------------------

class TestHealthHTTP:
    def test_health_returns_200_ok(self):
        with TestClient(app) as client:
            resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_health_requires_no_auth(self):
        """No Authorization header — must still return 200."""
        with TestClient(app) as client:
            resp = client.get("/health")
        assert resp.status_code == 200
