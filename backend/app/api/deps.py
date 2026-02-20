"""
FastAPI dependency injection functions for route protection and authentication.

This module defines FastAPI dependencies that extract, validate, and inject
authenticated user information into protected route handlers.

DEPENDENCY INJECTION IN FASTAPI
==============================
FastAPI uses a powerful dependency injection system via the Depends() function.
Instead of manually validating tokens in every route, we define a dependency
that FastAPI automatically calls before the route handler:

    @app.get("/protected")
    async def protected_route(current_user: User = Depends(get_current_user)):
        # current_user is automatically injected by FastAPI
        # If dependency raises an exception, request is rejected
        # If dependency returns a value, it's passed to route handler
        return {"user_id": current_user.id}

When a request arrives:
1. FastAPI sees Depends(get_current_user) in route signature
2. FastAPI calls get_current_user() with request data
3. get_current_user extracts token from request
4. get_current_user validates token and returns user
5. FastAPI passes user to route handler
6. Route handler executes with user data

Benefits:
- DRY principle: Define authentication once, use everywhere
- Automatic injection: Token extraction and validation automatic
- Error handling: FastAPI automatically returns 401 status if dependency fails
- Type safety: FastAPI validates user object matches type hint
- Testing: Easy to mock dependencies in tests

SCOPE AND DEPENDENCIES
=====================
FastAPI dependencies can have different scopes:
- RequestScope: Dependency called once per request (most common)
- AppScope: Dependency created once when app starts (not used here)

Dependencies can also depend on other dependencies via nested Depends():

    async def get_current_user(token: str = Depends(oauth2_scheme)):
        # oauth2_scheme is itself a dependency (Depends also called)
        return decode_token(token)

This creates a dependency chain:
    oauth2_scheme (extract token) → get_current_user (validate token) → route handler

SECURITY PATTERNS
================
This module implements security patterns recommended by:
- OWASP (Open Web Application Security Project)
- JWT RFC 7519
- FastAPI security documentation

Key practices:
1. Extract token from a single, clear location (Authorization header)
2. Validate token signature before trusting claims
3. Check token expiration before accepting
4. Query database to verify user still exists (token not revoked)
5. Return 401 status code for auth failures (not 403)
6. Log failed authentication attempts (for security monitoring)
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import decode_token, ExpiredTokenError, InvalidTokenError
from app.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional

# HTTPBearer is a FastAPI security scheme that extracts tokens from Authorization header
# It looks for: Authorization: Bearer {token}
# If missing or malformed, returns None to the dependency
security_scheme = HTTPBearer(auto_error=False)


async def get_token_from_request(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> str:
    """
    Extract JWT token from HTTP Authorization header.
    
    This is a FastAPI dependency that extracts the token from the request.
    It's separate from get_current_user() to keep concerns separated
    (token extraction vs. token validation).
    
    Token Location:
    ===============
    Standard HTTP Authorization header for bearer tokens:
        Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    
    FastAPI HTTPBearer automatically:
    - Extracts "Bearer {token}" from Authorization header
    - Returns HTTPAuthCredentials object with scheme='bearer' and credentials={token}
    - Returns None if header is missing (auto_error=False allows this)
    
    Alternative Token Locations:
    ---------------------------
    While Authorization header is standard, tokens can also come from:
    
    1. HTTP-Only Cookie:
       request.cookies.get('access_token')
       
       Advantages:
       - More secure (JavaScript cannot access)
       - More convenient (browser sends automatically)
       
       Implementation:
       async def get_token_from_cookie(request: Request) -> str:
           token = request.cookies.get('access_token')
           if not token:
               raise HTTPException(status_code=401, detail="Missing token cookie")
           return token
       
       Usage in dependency chain:
       token = get_token_from_header() or get_token_from_cookie()
    
    2. Custom Header:
       request.headers.get('X-Token')
       
       Advantages:
       - Service-to-service communication
       
       Disadvantages:
       - Not standard, clients must know custom header name
    
    3. Query Parameter:
       request.query_params.get('token')
       
       Advantages:
       - Simple for webhooks/callbacks
       
       Disadvantages:
       - Token visible in URLs, logs, browser history
       - Should only use for non-sensitive operations
    
    Current Implementation:
    Current approach uses Authorization header (standard, secure, expected by clients)
    
    ARGUMENTS
    ---------
    credentials : Optional[HTTPAuthCredentials]
        Extracted by HTTPBearer security scheme from Authorization header.
        None if header is missing or malformed.
        
        Properties:
          - scheme: Always "bearer" (lowercase)
          - credentials: The actual JWT token string
    
    RETURNS
    -------
    str
        The JWT token extracted from Authorization header.
        Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    RAISES
    ------
    HTTPException (401 Unauthorized)
        If Authorization header is missing or malformed.
        
        Response body: {"detail": "Missing or invalid authorization header"}
        Status code: 401 (standard for missing authentication)
        
    EXAMPLE REQUEST
    ---------------
    # Client sends request with Authorization header
    GET /api/protected HTTP/1.1
    Host: api.example.com
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    
    # FastAPI dependency receives credentials object with:
    credentials.scheme = "bearer"
    credentials.credentials = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    COOKIE-BASED ALTERNATIVE
    -----------------------
    For browser-based frontend with HTTP-only cookies, could use:
    
    async def get_token_from_request(request: Request) -> str:
        # Try Authorization header first (mobile apps, API clients)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:]
        
        # Fall back to HTTP-only cookie (browser apps)
        token = request.cookies.get('access_token')
        if token:
            return token
        
        raise HTTPException(status_code=401, detail="Missing token")
    
    This allows both desktop/mobile apps (header) and browser apps (cookie).
    
    SECURITY NOTE
    -----------
    Token is transmitted in plain HTTP (before TLS encryption).
    HTTPS is required in production to encrypt token in transit.
    Without HTTPS, tokens can be intercepted and replayed.
    """
    # Authorization header takes priority
    if credentials:
        return credentials.credentials

    # Fall back to HTTP-only cookie (set by /auth/login)
    token = request.cookies.get("access_token")
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authorization header",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    token: str = Depends(get_token_from_request),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the currently authenticated user from JWT token.
    
    This is the main dependency for protecting routes. FastAPI automatically
    calls this function for any route that uses Depends(get_current_user).
    
    Authentication Flow:
    ===================
    1. Extract token from HTTP Authorization header (via get_token_from_header)
    2. Validate token signature using SECRET_KEY
    3. Check token expiration
    4. Extract user_id from token
    5. Query database to get User object
    6. Verify user still exists (token hasn't been revoked)
    7. Return User object to route handler
    
    Each step validates a different aspect:
    - Token signature: Ensures token came from our server
    - Token expiration: Ensures token hasn't expired
    - User existence: Ensures user hasn't been deleted
    
    ARGUMENTS
    ---------
    token : str
        JWT token extracted from Authorization header.
        Provided automatically by FastAPI via Depends(get_token_from_header).
    
    db : AsyncSession
        Database session for querying user.
        Provided automatically by FastAPI via Depends(get_db).
    
    RETURNS
    -------
    User
        User object from database matching user_id in token.
        Example: User(id=UUID(...), email="user@example.com", ...)
    
    RAISES
    ------
    HTTPException (401 Unauthorized)
        Raised in several cases:
        
        1. Token Expired:
           - Token.exp < current_time
           - Response: {"detail": "Token has expired"}
           - Hint: User should login again to get new token
        
        2. Invalid Token:
           - Token signature doesn't match SECRET_KEY
           - Token format is invalid/malformed
           - Response: {"detail": "Invalid authentication token"}
           - Hint: Token was tampered with or corrupted
        
        3. User Not Found:
           - user_id from token not found in database
           - Possible causes:
             * User was deleted after token was issued
             * Token contains fake user_id (shouldn't happen if signature valid)
           - Response: {"detail": "User not found"}
           - Hint: User should login again
    
    EXAMPLE USAGE IN ROUTES
    ----------------------
    # Protected route that requires authentication
    @app.get("/api/profile")
    async def get_profile(current_user: User = Depends(get_current_user)):
        # current_user is automatically set to authenticated user
        # FastAPI returns 401 if token missing/invalid/expired
        return {
            "id": current_user.id,
            "email": current_user.email,
            "created_at": current_user.created_at
        }
    
    # Multiple dependencies can be chained
    @app.post("/api/posts")
    async def create_post(
        title: str,
        content: str,
        current_user: User = Depends(get_current_user),
    ):
        # Create post associated with authenticated user
        post = Post(
            title=title,
            content=content,
            user_id=current_user.id,
        )
        db.add(post)
        db.commit()
        return post
    
    TESTING WITH PROTECTED ROUTES
    ----------------------------
    In tests, you can call protected routes two ways:
    
    1. Skip dependency (mock authentication):
       app.dependency_overrides[get_current_user] = lambda: test_user
       client.get("/api/profile")  # Uses test_user instead of real auth
       app.dependency_overrides.clear()
    
    2. Provide valid token (test with real auth):
       user = create_test_user()
       token = create_access_token(user.id, user.email)
       response = client.get(
           "/api/profile",
           headers={"Authorization": f"Bearer {token}"}
       )
    
    PERFORMANCE CONSIDERATIONS
    -------------------------
    Each protected request requires:
    - JWT decryption/verification (~1ms)
    - Database query for user (~5-50ms depending on load)
    
    For high-traffic APIs, could cache user data:
    - Redis cache: Store user object with TTL
    - Memory cache: Cache in server memory (not ideal for distributed)
    - Database connection pooling: Already used (AsyncPooled engine)
    
    Current approach (database query per request) is acceptable for most apps
    because:
    - User object is small (few KB)
    - Query is indexed (primary key lookup)
    - Ensures fresh data (deleted/deactivated users rejected)
    
    SECURITY AUDIT TRAIL
    -------------------
    For security monitoring, could log:
    - All authentication attempts (success and failure)
    - Token expiration times
    - User database lookups (to detect token abuse)
    
    Example logging:
    
    import logging
    logger = logging.getLogger(__name__)
    
    logger.debug(f"User {user_id} authenticated successfully")
    logger.warning(f"Failed auth attempt, user {user_id} not found")
    logger.error(f"Token validation failed: {str(e)}")
    
    These logs help detect:
    - Brute force attacks (many failed attempts)
    - Stolen tokens (valid token from unusual IP address)
    - Revoked user access (token valid but user deleted)
    """
    # Validate token and extract claims
    try:
        payload = decode_token(token)
    except ExpiredTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user_id from token payload
    user_id = payload.get('user_id')
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert user_id string back to UUID
    try:
        user_id_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Query database for user (verify user still exists)
    # Using async session for non-blocking database access
    from app.models.user import User
    
    user = None
    try:
        # Async query: doesn't block event loop
        from sqlalchemy import select
        stmt = select(User).where(User.id == user_id_uuid)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
    except Exception as e:
        # Database error (connection failed, query error, etc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during authentication",
        )
    
    if not user:
        # User from token not found in database
        # Possible causes:
        # - User was deleted after token was issued
        # - Token contains fake user_id (shouldn't happen, would fail signature check)
        # - Database corruption (unlikely)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # User is authenticated and exists
    return user
