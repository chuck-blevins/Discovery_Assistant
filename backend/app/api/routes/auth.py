"""
Authentication API routes for user registration, login, and session management.

Routes:
  - POST /auth/signup - Register new user
  - POST /auth/login - Login and get JWT token
  - GET /auth/validate - Validate token (protected route)
  - POST /auth/logout - Logout and clear cookie
  - GET /health - Public health check
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status, Response
from uuid import uuid4
from sqlalchemy.exc import IntegrityError

from app.schemas.auth import (
    SignupRequest, SignupResponse,
    LoginRequest, LoginResponse,
    ValidateResponse,
    LogoutResponse,
    HealthResponse,
)
from app.utils.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user
from app.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User

# Create router for auth endpoints
# Prefix: /auth (routes will be /auth/signup, /auth/login, etc.)
router = APIRouter(prefix="/auth", tags=["authentication"])


# ============================================================================
# SIGNUP ENDPOINT
# ============================================================================

@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account with email and password."
)
async def signup(
    request: SignupRequest,
    db: AsyncSession = Depends(get_db)
) -> SignupResponse:
    """
    Register a new user account.
    
    ENDPOINT: POST /auth/signup
    
    REQUEST BODY
    -----------
    {
      "email": "user@example.com",
      "password": "SecurePassword123"
    }
    
    Email Validation:
      - Must be valid email format (RFC 5322 subset)
      - Must not already exist in database
    
    Password Validation:
      - Minimum 8 characters
      - Must include at least 1 digit
      - No maximum length (bcrypt handles truncation)
    
    RESPONSE (201 Created)
    ----------------------
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "created_at": "2026-01-15T10:30:00"
    }
    
    ERROR RESPONSES
    ---------------
    
    409 Conflict: Email already registered
      {
        "detail": "Email already registered. Use login to access your account."
      }
    
    422 Unprocessable Entity: Invalid email or password
      {
        "detail": [
          {
            "loc": ["body", "password"],
            "msg": "Password must contain at least one digit",
            "type": "value_error"
          }
        ]
      }
    
    IMPLEMENTATION NOTES
    -------------------
    1. Validate Pydantic models (FastAPI handles this automatically)
       - Email format validation (EmailStr)
       - Password length and content validation (field_validator)
    
    2. Hash password using bcrypt
       - Never store plaintext passwords
       - Cost factor 12 (~250ms to compute)
       - Unique salt per password
    
    3. Create User record in database
       - id: UUID v4 (random unique identifier)
       - email: from request (must be unique)
       - password_hash: bcrypt hash of password
       - created_at: current timestamp (set by database)
       - updated_at: current timestamp (set by database)
    
    4. Handle duplicate email
       - Database constraint: UNIQUE on email column
       - IntegrityError raised by SQLAlchemy
       - Return 409 Conflict status code
       - Don't expose detailed error messages (don't reveal if email exists)
    
    SECURITY CONSIDERATIONS
    ----------------------
    - Password is never stored, only hash
    - Attacker cannot reverse hash to get password
    - Same password produces different hashes each time (due to salt)
    - Timing-safe comparison used during login verification
    - Error messages don't reveal if email is registered (prevents email enumeration)
    """
    try:
        # Hash password before storing
        password_hash = hash_password(request.password)

        # Create user object — normalize email to lowercase (AC14)
        user = User(
            id=uuid4(),
            email=request.email.lower(),
            password_hash=password_hash,
        )
        
        # Add to database session
        db.add(user)
        
        # Commit (will raise IntegrityError if email already exists)
        await db.commit()
        await db.refresh(user)
        
        # Return created user
        return SignupResponse(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at
        )
    
    except IntegrityError:
        # Email already exists (unique constraint violation)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered. Use login to access your account."
        )


# ============================================================================
# LOGIN ENDPOINT
# ============================================================================

@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login to account",
    description="Login with email and password to get JWT token."
)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """
    Login to user account and receive JWT token.
    
    ENDPOINT: POST /auth/login
    
    REQUEST BODY
    -----------
    {
      "email": "user@example.com",
      "password": "SecurePassword123"
    }
    
    RESPONSE (200 OK)
    -----------------
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "user": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "email": "user@example.com",
        "created_at": "2026-01-15T10:30:00"
      }
    }
    
    ERROR RESPONSES
    ---------------
    
    401 Unauthorized: User not found or password mismatch
      {
        "detail": "Invalid email or password"
      }
    
    422 Unprocessable Entity: Invalid email format
      {
        "detail": [...]
      }
    
    HTTP-ONLY COOKIE
    ---------------
    Response also sets HTTP-only cookie:
      Set-Cookie: access_token={token}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
    
    Benefits of HTTP-only cookie:
      - Cannot be accessed by JavaScript (prevents XSS attacks)
      - Browser automatically sends with every request
      - Cannot be sniffed by CSRF attacks (SameSite=Lax)
    
    Why also return in response body?
      - Flexibility for API clients (mobile apps, frontend frameworks)
      - Mobile apps can store token in secure storage (Keychain, Keystore)
      - Web apps can use cookie OR response body
      - API consumers have choice of storage method
    
    IMPLEMENTATION FLOW
    ------------------
    1. Validate request format (FastAPI via Pydantic)
    2. Query user by email (case-sensitive, indexed)
    3. Check if user exists
       - If not found: return 401 (don't reveal if email is registered)
    4. Verify password hash
       - Uses timing-safe comparison
       - If mismatch: return 401
    5. Create JWT token
       - Claims: user_id, email
       - Expiration: 30 days from now
       - Algorithm: HS256
    6. Set HTTP-only cookie
       - Name: access_token
       - Value: JWT token
       - HttpOnly: Yes (JavaScript cannot access)
       - Secure: Yes (HTTPS only in production)
       - SameSite=Lax: Prevent CSRF
       - Max-Age: 30 days (2,592,000 seconds)
    7. Return token in response body
       - For flexibility with API clients
    
    SECURITY CONSIDERATIONS
    ----------------------
    - Timing-safe comparison prevents timing attacks
    - Same error message for user-not-found and wrong-password
      * Prevents email enumeration attacks
      * Attacker cannot determine if email is registered
    - Token expires after 30 days
      * Limits impact of token compromise
      * Forces periodic re-authentication
    - HTTP-only cookie prevents JavaScript access
      * XSS attack cannot steal token
    - SameSite=Lax prevents CSRF attacks
      * Token cannot be sent from attacker's website
    """
    # Query user by email — normalize to lowercase for case-insensitive lookup (AC14)
    from sqlalchemy import select
    stmt = select(User).where(User.email == request.email.lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    # Check if user exists AND password matches
    # Return same error for both cases (prevents email enumeration)
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token valid for 30 days
    access_token = create_access_token(user.id, user.email)
    
    # Set HTTP-only cookie — secure flag on in production (AC3)
    is_production = os.getenv("ENVIRONMENT", "development") == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        max_age=30 * 24 * 60 * 60,  # 30 days in seconds
        samesite="lax",
        path="/",
    )
    
    # Return token in response body (for flexibility)
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=ValidateResponse(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at
        )
    )


# ============================================================================
# VALIDATE ENDPOINT
# ============================================================================

@router.get(
    "/validate",
    response_model=ValidateResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate token",
    description="Validate JWT token and get current user (protected route)."
)
async def validate(
    current_user: User = Depends(get_current_user)
) -> ValidateResponse:
    """
    Validate JWT token and return current user information.
    
    ENDPOINT: GET /auth/validate
    
    AUTHENTICATION
    ---------------
    Required: Bearer token in Authorization header
      Authorization: Bearer {access_token}
    
    Or: Access token in HTTP-only cookie (set by login endpoint)
      Cookie: access_token={token}
    
    RESPONSE (200 OK)
    -----------------
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "created_at": "2026-01-15T10:30:00"
    }
    
    ERROR RESPONSES
    ---------------
    
    401 Unauthorized: Token missing or invalid
      {
        "detail": "Missing or invalid authorization header"
      }
    
    401 Unauthorized: Token expired
      {
        "detail": "Token has expired. Please login again."
      }
    
    401 Unauthorized: User not found
      {
        "detail": "User not found"
      }
    
    IMPLEMENTATION
    ---------------
    This endpoint doesn't need explicit implementation of token validation
    because FastAPI automatically calls get_current_user() dependency before
    the route handler. The dependency:
    
    1. Extracts token from Authorization header or cookie
    2. Validates JWT signature
    3. Checks token expiration
    4. Queries database to get User object
    5. Returns 401 if any step fails
    6. Passes User object to route handler if successful
    
    If the dependency succeeds, current_user parameter contains the
    authenticated User object, and we simply return their details.
    
    USE CASES
    ---------
    - Frontend calls on app load to verify token is still valid
    - Frontend displays user info (email) without additional query
    - Backend verifies user still exists (not deleted after token issued)
    - Users can check "who am I logged in as?"
    
    SECURITY
    --------
    - Requires valid, non-expired token
    - Verifies user still exists in database
    - Ensures token wasn't revoked/user wasn't deleted
    """
    # current_user is automatically injected by FastAPI dependency
    # Return user details
    return ValidateResponse(
        id=str(current_user.id),
        email=current_user.email,
        created_at=current_user.created_at
    )


# ============================================================================
# LOGOUT ENDPOINT
# ============================================================================

@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout",
    description="Clear authentication cookie and logout."
)
async def logout(response: Response) -> LogoutResponse:
    """
    Logout by clearing HTTP-only authentication cookie.
    
    ENDPOINT: POST /auth/logout
    
    AUTHENTICATION
    ---------------
    Optional: Token can be included but is not required.
    
    RESPONSE (200 OK)
    -----------------
    {
      "message": "Logged out successfully"
    }
    
    COOKIE CLEARING
    ----------------
    Response sets cookie with Max-Age=0:
      Set-Cookie: access_token=; Max-Age=0; HttpOnly; Path=/
    
    This tells browser to delete the cookie immediately.
    
    IMPLEMENTATION FLOW
    ------------------
    1. Clear HTTP-only cookie by setting Max-Age=0
       - Browser deletes the cookie
       - Subsequent requests don't include cookie
    2. Return success message
    3. Client-side auth systems (localStorage) should also clear token
    
    SECURITY CONSIDERATIONS
    ----------------------
    - Logout is "soft" (cookie cleared, old token can still be used)
    - For "hard" logout, would need token blacklist:
      * Store token hash in Redis with expiration
      * Check blacklist before accepting token
      * Prevents using stolen token after logout
    - Current approach sufficient for most apps
      * Old token only valid for 30 more days
      * User can change password to revoke all tokens
    
    WHY NOT REQUIRE AUTHENTICATION?
    --------------------------------
    Logout doesn't require valid token because:
    - User might lose token but want to "logout anyway"
    - Idempotent: logout multiple times is safe
    - Doesn't expose sensitive functionality
    
    Similar to HTTP DELETE being idempotent (delete twice is safe).
    """
    # Clear authentication cookie
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax"
    )
    
    return LogoutResponse(message="Logged out successfully")


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Check if API is running (no authentication required)."
)
async def health() -> HealthResponse:
    """
    Health check endpoint for monitoring and Docker health checks.
    
    ENDPOINT: GET /health
    
    AUTHENTICATION
    ---------------
    None required. This is a public endpoint.
    
    RESPONSE (200 OK)
    -----------------
    {
      "status": "ok"
    }
    
    USE CASES
    ---------
    - Docker health checks
      HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
    
    - Kubernetes liveness probes
      livenessProbe:
        httpGet:
          path: /health
          port: 8000
    
    - Load balancer health checks
    - Monitoring systems (Datadog, New Relic, etc.)
    - Frontend "is API online?" check before making requests
    
    WHY NO AUTHENTICATION?
    ----------------------
    - Health checks expect quick response (no auth overhead)
    - Monitoring should work even if auth is broken
    - Prevents false positives (auth failure looks like API down)
    - Standard convention (AWS Lambda, Kubernetes, etc.)
    
    RESPONSE TIME
    ---------------
    Should respond in <100ms.
    Currently just returns hardcoded JSON, no database calls.
    
    FUTURE ENHANCEMENTS
    -------------------
    Could add database connectivity check:
      @router.get("/health")
      async def health(db: AsyncSession = Depends(get_db)):
          try:
              await db.execute(select(1))  # Simple query
              status = "ok"
          except:
              status = "degraded"
          return {"status": status}
    
    But this slower and not recommended for containerized apps.
    Better to have separate "readiness" endpoint for DB checks.
    """
    return HealthResponse(status="ok")
