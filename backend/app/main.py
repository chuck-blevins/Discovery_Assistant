"""
FastAPI application factory and main entry point.

This module creates the FastAPI application, configures middleware,
registers routes, and sets up dependencies.

APPLICATION STRUCTURE
====================
FastAPI application with modular route organization. Every feature router is
composed under a single parent router with an `/api` prefix, then mounted on
the app. This keeps the whole backend under `/api/*` so the frontend and
backend can share one origin in production (same-origin, no CORS needed):

  app = FastAPI()

  api_router = APIRouter(prefix="/api")
  api_router.include_router(auth_router)      # → /api/auth/...
  api_router.include_router(clients_router)   # → /api/clients/...
  # ...more feature routers...

  app.include_router(api_router)

ROUTERS
=======
Routers are sub-applications that group related endpoints:
- Auth router: signup, login, validate, logout (→ /api/auth/...)
- Clients, projects, data sources, analyses, artifacts, settings,
  time sessions, invoices, webhooks, dashboard, intake (→ /api/...)
- `/health` lives on the parent api_router, so it resolves at /api/health

Benefits:
- Code organization (each feature in separate file)
- Single `/api` prefix → same-origin frontend + backend deploy (no CORS)
- Tags for OpenAPI documentation (Swagger UI at /api/docs)
- Can apply middleware/dependencies to groups of routes

MIDDLEWARE
==========
Middleware intercepts all requests/responses to apply cross-cutting concerns:
- CORS (Cross-Origin Request Sharing)
- Request logging  
- Error handling
- Authentication (can be per-route via dependencies instead)

FastAPI middleware stack order:
  Client Request
       ↓
  CORS Middleware (check origin)
       ↓
  Logging Middleware (start timer)
       ↓
  Route Handler / Dependencies
       ↓
  Logging Middleware (end timer, log)
       ↓
  CORS Middleware (add headers)
       ↓
  Client Response
"""

import logging
import os

from dotenv import load_dotenv
load_dotenv()  # no-op when env vars already set (e.g. via Docker); loads .env for local uvicorn runs

# LangSmith: ensure tracing is off unless explicitly enabled with a valid key (avoids 403 on ingest)
_tracing = (os.getenv("LANGSMITH_TRACING") or "").strip().lower()
if _tracing not in ("true", "1"):
    os.environ["LANGSMITH_TRACING"] = "false"
elif not (os.getenv("LANGSMITH_API_KEY") or "").strip():
    os.environ["LANGSMITH_TRACING"] = "false"

from fastapi import APIRouter, FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.auth import router as auth_router
from app.api.routes.clients import router as clients_router
from app.api.routes.projects import router as projects_router
from app.api.routes.data_sources import router as data_sources_router
from app.api.routes.analyses import router as analyses_router
from app.api.routes.artifacts import router as artifacts_router
from app.api.routes.settings import router as settings_router
from app.api.routes.time_sessions import router as time_sessions_router
from app.api.routes.invoices import router as invoices_router
from app.api.routes.webhooks import router as webhooks_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.intake import router as intake_router
from app.schemas.auth import HealthResponse
from app.services import storage_service

logger = logging.getLogger(__name__)

# Create FastAPI application
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Discovery App API starting up...")
    # Initialize object storage bucket (best-effort — tests may run without MinIO)
    bucket = os.getenv("STORAGE_BUCKET_NAME", "discovery-files")
    try:
        storage_service.ensure_bucket_exists(bucket)
    except Exception as exc:
        logger.warning("Storage bucket init failed (continuing without it): %s", exc)
    yield
    print("🛑 Discovery App API shutting down...")


app = FastAPI(
    title="Discovery App API",
    description="AI-powered discovery platform for validating startup assumptions",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# CORS (Cross-Origin Request Sharing) Middleware
# Allows frontend on different domain to call backend API.
# Set CORS_ORIGINS (comma-separated) in env for Docker/production.
_cors_origins = os.getenv("CORS_ORIGINS")
if _cors_origins:
    allow_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]
else:
    allow_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# ============================================================================
# ROUTE REGISTRATION
# ============================================================================

# Single parent router under /api — all sub-routers compose here so the
# frontend and backend share one origin in production (no CORS needed).
api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(clients_router)
api_router.include_router(projects_router)
api_router.include_router(data_sources_router)
api_router.include_router(analyses_router)
api_router.include_router(artifacts_router)
api_router.include_router(settings_router)
api_router.include_router(time_sessions_router)
api_router.include_router(invoices_router)
api_router.include_router(webhooks_router)
api_router.include_router(dashboard_router)
api_router.include_router(intake_router)


@api_router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Health check endpoint for Docker and monitoring. No auth required."""
    return HealthResponse(status="ok")


app.include_router(api_router)

# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/", tags=["root"])
async def read_root():
    """
    Root endpoint provides API information.
    
    ENDPOINT: GET /
    
    RESPONSE: 200 OK
      {
        "message": "Discovery App API",
        "version": "0.1.0",
        "docs": "/docs",
        "redoc": "/redoc"
      }
    """
    return {
        "message": "Discovery App API",
        "version": "0.1.0",
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }


# ============================================================================
# STARTUP AND SHUTDOWN EVENTS
# ============================================================================

# Startup/shutdown are handled by the `lifespan` context manager above.
