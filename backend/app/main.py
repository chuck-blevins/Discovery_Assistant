"""
FastAPI application factory and main entry point.

This module creates the FastAPI application, configures middleware,
registers routes, and sets up dependencies.

APPLICATION STRUCTURE
====================
FastAPI application with modular route organization:

  app = FastAPI()
  
  # Register auth router
  app.include_router(auth_router)
  
  # Can add more routers as features expand:
  # app.include_router(posts_router)
  # app.include_router(comments_router)
  # etc.

ROUTERS
=======
Routers are sub-applications that group related endpoints:
- Auth router: signup, login, validate, logout, health
- Future: Queries router, Analytics router, etc.

Benefits:
- Code organization (each feature in separate file)
- Prefix routes (/auth/signup, /auth/login, etc.)
- Tags for OpenAPI documentation (Swagger UI)
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

from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.auth import router as auth_router
from app.api.routes.clients import router as clients_router
from app.api.routes.projects import router as projects_router
from app.schemas.auth import HealthResponse

# Create FastAPI application
@asynccontextmanager
async def lifespan(app: FastAPI):
  print("🚀 Discovery App API starting up...")
  # Could initialize database connections, load configs, etc.
  yield
  print("🛑 Discovery App API shutting down...")


app = FastAPI(
  title="Discovery App API",
  description="AI-powered discovery platform for validating startup assumptions",
  version="0.1.0",
  lifespan=lifespan,
)

# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# CORS (Cross-Origin Request Sharing) Middleware
# Allows frontend on different domain to call backend API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React dev server
        "http://localhost:5173",       # Vite dev server  
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,            # Allow sending cookies/auth headers
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],               # Allow all headers
)

# ============================================================================
# ROUTE REGISTRATION
# ============================================================================

# Include authentication routes
# Routes will be: /auth/signup, /auth/login, /auth/validate, /auth/logout, /health
app.include_router(auth_router)

# Include client management routes
# Routes will be: /clients, /clients/{id}, /clients/{id}/archive
app.include_router(clients_router)

# Include project management routes (uses explicit full paths — no prefix needed)
# Routes: /clients/{id}/projects, /projects/{id}, /projects/{id}/archive
app.include_router(projects_router)

# Future routes:
# app.include_router(analytics_router)


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Health check endpoint for Docker and monitoring. No auth required."""
    return HealthResponse(status="ok")


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
        "docs": "/docs",
        "redoc": "/redoc"
    }


# ============================================================================
# STARTUP AND SHUTDOWN EVENTS
# ============================================================================

# Startup/shutdown are handled by the `lifespan` context manager above.
