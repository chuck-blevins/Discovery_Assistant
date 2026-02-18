"""
Password hashing and security utilities for user authentication.

This module provides cryptographic password hashing functions using bcrypt, which is
the industry-standard algorithm for secure password storage.

MODULE OVERVIEW
===============
Purpose:
  - Securely hash passwords before storing in database using bcrypt algorithm
  - Verify plaintext passwords against stored hashes during authentication
  - Prevent rainbow table attacks and brute force attacks with salt and cost factors

Why Bcrypt?
-----------
Bcrypt is one of the most secure password hashing algorithms available:

1. **Salting**: Each password gets a unique salt, so identical passwords produce
   different hashes. This prevents rainbow table attacks (pre-computed hash lookup tables).

2. **Cost Factor**: Bcrypt has a configurable "cost factor" (rounds) that makes
   hashing intentionally slow. Currently set to 12 rounds, which takes ~250ms.
   As computers get faster, we can increase rounds to stay secure.
   - More rounds = slower to compute (good for security, bad for attackers)
   - Cost 10 (2010s): ~10ms
   - Cost 12 (2020s+): ~250ms
   - Cost 14 (2030s?): ~1 second

3. **Timing-Safe Comparison**: The verify function uses constant-time comparison,
   preventing timing attacks where attackers measure how long verification takes
   to determine correct password characters.

4. **Adaptive**: As computers get faster, we can increase cost factor while
   keeping existing hashes valid (backward compatible).

SECURITY IMPLICATIONS
=====================

DO NOT:
  - Store plaintext passwords in database (obvious, but stating for clarity)
  - Use fast hashing (MD5, SHA-1, SHA-256) - these are too quick to compute
  - Manually compare hashes with == (vulnerable to timing attacks)
  - Use same salt for all passwords (this is done automatically by bcrypt)
  - Share passwords in logs or error messages

DO:
  - Use bcrypt.hashpw() for creating hashes
  - Use bcrypt.checkpw() for verifying passwords (never use ==)
  - Store hashes in VARCHAR(255) or TEXT columns
  - Add indexes on email column for login lookups
  - Log failed authentication attempts (with rate limiting)
  - Implement account lockout after N failed attempts

TECHNICAL IMPLEMENTATION NOTES
==============================

Bcrypt Hash Format:
  $2b$12$abcdefghijklmnopqrstu.vwxyz... 
  |  | |  |
  |  | |  +-- 22 character salt (base64-encoded)
  |  | +----- cost factor (12 = 2^12 iterations = 4096 rounds)
  |  +------- algorithm identifier (2b = original stable version)
  +---------- prefix ($)

Password Truncation:
  - Bcrypt (as implemented in Python) accepts passwords up to 72 bytes
  - Longer passwords are silently truncated (potential security concern)
  - For passwords longer than 72 bytes, consider SHA-256 hashing first
  - Common approach: hash(SHA256(password)) then bcrypt
  - Current implementation: Accept up to 1000 chars (file validation), truncate at bcrypt level

Timing Considerations:
  - This function takes ~250ms per call (intentional for security)
  - NEVER run synchronously in a web request (use task queue or async)
  - Current FastAPI setup uses async, which is correct
  - Long-running hashing doesn't block other requests

Unicode Support:
  - Bcrypt works with any byte sequence
  - Python handles UTF-8 encoding automatically
  - Supports passwords in any language/script (Russian, Chinese, emoji, etc.)
"""

import bcrypt
from typing import Tuple
from datetime import datetime, timedelta, timezone
from uuid import UUID
import os
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError

# Cost factor for bcrypt - determines number of computational rounds
# Higher = more secure but slower
# Current value: 12 = 2^12 = 4,096 iterations
# Verification takes ~250ms on modern CPU
# Increase to 13-14 as computers get faster (backward compatible)
BCRYPT_COST_FACTOR = 12

# ============================================================================
# JWT CONFIGURATION
# ============================================================================

# SECRET_KEY for signing JWT tokens (HS256 algorithm)
# SECURITY: Must be kept secret and have sufficient length (>= 32 characters)
# This value should come from environment variable in production
# Never commit actual secrets to version control
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production-12345678')

# Token expiration time (30 days in seconds)
# 30 days = 30 * 24 * 60 * 60 = 2,592,000 seconds
TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt algorithm.
    
    This function:
    1. Generates a random salt (included in output hash)
    2. Performs 2^cost_factor iterations of Blowfish cipher
    3. Returns the full hash (includes salt and cost factor)
    
    SECURITY: Each call produces a DIFFERENT hash for the same password due to
    random salt. Never use == to compare passwords; use verify_password() instead.
    
    PERFORMANCE: Takes ~250ms. Use async/await context or task queue in production.
    
    ARGUMENTS
    ---------
    password : str
        Plaintext password from user signup/password change form.
        Can contain any UTF-8 characters (unicode, emoji, special chars).
        Maximum ~1000 characters (truncated at 72 bytes by bcrypt).
    
    RETURNS
    -------
    str
        Bcrypt hash in format: $2b$12$[22-char-salt].[31-char-hash]
        Example: $2b$12$abcdefghijklmnopqrstu.vwxyzABCDEFGHIJKLMNOPQRSTU
        - Length: 60 characters
        - Store in VARCHAR(255) or TEXT column
        - Include in User.password_hash field
    
    RAISES
    ------
    ValueError
        If password is not a string or empty
    
    EXAMPLES
    --------
    # Signup flow
    plaintext_password = "MySecurePass123!"
    hashed = hash_password(plaintext_password)
    # Store hashed in database
    user = User(email="user@example.com", password_hash=hashed)
    db.add(user)
    db.commit()
    
    # Login flow uses verify_password(), not this function
    
    UNICODE EXAMPLES
    ----------------
    # Russian password
    hashed = hash_password("Мойпароль123")
    verify_password("Мойпароль123", hashed)  # True
    verify_password("мойпароль123", hashed)  # False (case-sensitive)
    
    # Chinese password with emoji
    hashed = hash_password("我的密码🔐")
    verify_password("我的密码🔐", hashed)  # True
    
    TECHNICAL NOTES
    ---------------
    - Bcrypt uses Blowfish cipher with 64-bit blocks
    - Cost factor = 12 means 2^12 = 4,096 iterations
    - Each iteration doubles computation time
    - Existing hashes remain valid if we increase cost factor
    - Passwords are UTF-8 encoded before hashing
    - Maximum effective password length: 72 bytes (after UTF-8 encoding)
      Example: 72-byte UTF-8 string might be <6 Japanese characters (each 3 bytes)
    """
    # Validate input
    if not isinstance(password, str):
        raise ValueError("Password must be a string")
    if not password:
        raise ValueError("Password cannot be empty")
    
    # Convert password to bytes using UTF-8 encoding
    # This handles all Unicode characters (Russian, Chinese, emoji, etc.)
    password_bytes = password.encode('utf-8')
    
    # Generate salt and hash using bcrypt
    # bcrypt.gensalt() generates random 16-byte salt, base64-encoded
    # bcrypt.hashpw() performs Blowfish hashing with cost_factor iterations
    salt = bcrypt.gensalt(rounds=BCRYPT_COST_FACTOR)
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Decode bytes to string for storage in database
    # Bcrypt hash is ASCII-safe, so UTF-8 decode always succeeds
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    
    This function uses constant-time comparison (prevents timing attacks) and should
    ALWAYS be used instead of == for password verification.
    
    SECURITY: Uses bcrypt.checkpw() which is timing-safe (takes same time regardless
    of where password differs), preventing timing attacks where attackers measure
    how long verification takes to guess password characters.
    
    PERFORMANCE: Takes ~250ms (same as hashing). Timing is constant regardless of
    password correctness. All failed attempts take same time (security feature).
    
    ARGUMENTS
    ---------
    password : str
        Plaintext password from user login form.
        Can contain any UTF-8 characters (unicode, emoji, special chars).
    
    password_hash : str
        Bcrypt hash from User.password_hash in database.
        Must be valid bcrypt format: $2a$... or $2b$... or $2x$... or $2y$...
    
    RETURNS
    -------
    bool
        True if password matches hash, False otherwise
        Returns False for any error (malformed hash, empty inputs, etc.)
        No exception raised for invalid inputs (graceful degradation)
    
    EXAMPLE
    -------
    # Login flow
    user = db.query(User).filter(User.email == "user@example.com").first()
    if user and verify_password("MySecurePass123!", user.password_hash):
        # Password correct - create session
        return create_session(user)
    else:
        # Password incorrect - reject login
        return error_response("Invalid email or password")
    
    TIMING SAFETY
    -------------
    This function uses bcrypt.checkpw() which is timing-safe:
    - Checks all password characters even after first mismatch found
    - Takes ~250ms regardless of where password differs from hash
    - Prevents timing attack: attackers can't guess character by character
    
    Example of timing attack (if using == comparison):
    "A..." == hash: 1ms (first char wrong, fails fast)
    "mypa..." == hash: 5ms (more chars correct before fail)
    Attacker can guess characters by measuring verification time.
    
    With bcrypt: always ~250ms regardless of correctness
    
    ERROR HANDLING
    --------------
    Function returns False for any error condition:
    - Malformed hash format
    - Empty inputs
    - Wrong hash algorithm version ($2c$ instead of $2b$, etc.)
    - Corrupted hash
    
    Does NOT raise exceptions (safe in web request context).
    
    TECHNICAL NOTES
    ---------------
    - bcrypt.checkpw(password_bytes, hash_bytes)
    - Extracts salt from hash
    - Recomputes hash with same salt
    - Compares using constant-time comparison
    - Identical to hashing, just uses extracted salt
    - Bcrypt specification prevents timing leaks
    """
    try:
        # Validate inputs
        if not isinstance(password, str):
            return False
        if not isinstance(password_hash, str):
            return False
        if not password_hash or not password_hash.startswith('$2'):
            return False
        
        # Convert password to bytes using UTF-8 encoding
        password_bytes = password.encode('utf-8')
        
        # Convert hash to bytes
        hash_bytes = password_hash.encode('utf-8')
        
        # Use bcrypt.checkpw() for timing-safe comparison
        # Returns True/False, never raises exception in normal conditions
        return bcrypt.checkpw(password_bytes, hash_bytes)
    
    except (ValueError, TypeError):
        # Malformed hash or invalid input type
        # Return False rather than raising exception
        return False
    except Exception:
        # Catch any other unexpected errors (bcrypt library changes, etc.)
        # Fail securely (return False) rather than raising to caller
        return False


def get_password_hash_info(password_hash: str) -> dict:
    """
    Extract metadata from a bcrypt hash (cost factor, algorithm version, salt).
    
    This is a utility function for debugging/logging, not needed for authentication.
    
    ARGUMENTS
    ---------
    password_hash : str
        Bcrypt hash string (e.g. "$2b$12$...")
    
    RETURNS
    -------
    dict with keys:
        - algorithm: Algorithm version ("2a", "2b", "2x", "2y")
        - cost_factor: Number of computation rounds (10-31)
        - salt: Extracted base64-encoded salt (22 characters)
    
    EXAMPLE
    -------
    hashed = hash_password("Password123")
    info = get_password_hash_info(hashed)
    # {"algorithm": "2b", "cost_factor": 12, "salt": "abcdefghijklmnopqrstu"}
    
    LOG SECURITY METRICS
    -------------------
    # Track if users have weak cost factors
    user = db.query(User).first()
    info = get_password_hash_info(user.password_hash)
    if info['cost_factor'] < 12:
        logger.warning(f"User {user.id} has weak cost factor {info['cost_factor']}")
    
    RETURNS EMPTY DICT ON ERROR
    ---------------------------
    Invalid hashes return {} rather than raising exception.
    """
    try:
        if not password_hash or not password_hash.startswith('$2'):
            return {}
        
        # Bcrypt format: $2b$12$salt...hash
        parts = password_hash.split('$')
        if len(parts) < 4:
            return {}
        
        algorithm = parts[1]  # "2a", "2b", "2x", "2y"
        cost_factor = int(parts[2])  # "12"
        salt = parts[3][:22]  # First 22 chars of base64 salt
        
        return {
            'algorithm': algorithm,
            'cost_factor': cost_factor,
            'salt': salt
        }
    except (ValueError, IndexError):
        return {}


# ============================================================================
# CUSTOM EXCEPTIONS FOR JWT HANDLING
# ============================================================================

class TokenError(Exception):
    """Base exception for token-related errors."""
    pass


class ExpiredTokenError(TokenError):
    """Exception raised when a JWT token has expired."""
    pass


class InvalidTokenError(TokenError):
    """Exception raised when a JWT token is invalid (malformed, tampered, etc)."""
    pass


# ============================================================================
# JWT TOKEN FUNCTIONS
# ============================================================================

def create_access_token(user_id: UUID, email: str) -> str:
    """
    Create a JWT access token for a user.
    
    This function generates a signed JWT token containing user claims (user_id, email)
    with an expiration time of 30 days. The token is signed using HS256 algorithm
    with SECRET_KEY.
    
    JWT (JSON Web Token) Overview:
    =============================
    JWT is a compact, URL-safe token format for securely transmitting claims between
    parties. It consists of three parts separated by dots:
    
      header.payload.signature
      
    Where:
      - header: Algorithm and token type (e.g., {"alg": "HS256", "typ": "JWT"})
      - payload: Claims/data bundled in the token (e.g., user_id, email, exp)
      - signature: Cryptographic signature over header and payload using SECRET_KEY
    
    Token Example:
      eyJhbGcik6IkhzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzNDU2Nzg5MCIsImVt
      YWlsIjoidXNlckBleGFtcGxlLmNvbSIsImV4cCI6MTcxMTAxNjAwMH0.signature123456...
    
    Algorithm: HS256 (HMAC with SHA-256)
    ===================================
    HS256 uses a shared secret (SECRET_KEY) to both sign and verify tokens:
    
      1. During token creation:
         - Encode header and payload to base64url
         - Create signature = HMAC-SHA256(header.payload, SECRET_KEY)
         - Return header.payload.signature
      
      2. During token verification:
         - Decode payload and extract claims
         - Recreate signature from header.payload with SECRET_KEY
         - Compare new signature with original signature
         - If same, token is valid and not tampered with
    
    Security Implications:
      - Only someone with SECRET_KEY can create valid tokens
      - Anyone with SECRET_KEY can verify tokens
      - If SECRET_KEY is compromised, attacker can forge tokens
      - SECRET_KEY must be > 32 characters for HS256 (256 bits)
    
    Token Expiration:
    ================
    Tokens include an 'exp' (expiration) claim set to 30 days from creation.
    When verifying, the token is rejected if:
      - Current time > token.exp (token has expired)
      - Clock skew > token tolerance (system clocks too far apart, rare)
    
    Benefits of expiration:
      - Limits impact of token compromise (attacker can only use for 30 days)
      - Forces periodic re-authentication (users must login every 30 days)
      - Allows revoking tokens implicitly (stop accepting old ones)
    
    ARGUMENTS
    ---------
    user_id : UUID
        Unique identifier for the user (from User.id in database).
        Converted to string in JWT payload (UUIDs can't be JSON-serialized directly).
    
    email : str
        User email address (from User.email in database).
        Included in token for quick claim access without database lookup.
    
    RETURNS
    -------
    str
        JWT token in format: "header.payload.signature"
        Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWJjZGVm..."
        
        Token can be:
        - Sent in HTTP Authorization header: "Authorization: Bearer {token}"
        - Stored in HTTP-only cookie: "Set-Cookie: access_token={token}; HttpOnly"
        - Used for subsequent authenticated requests
    
    EXAMPLE: SIGNUP FLOW
    -------------------
    # User submits signup form with email and password
    email = "newuser@example.com"
    password = "SecurePassword123"
    
    # Validate email format, check if already registered, etc.
    if user_exists(email):
        raise error("Email already registered")
    
    # Hash password and create user in database
    password_hash = hash_password(password)
    user = User(email=email, password_hash=password_hash)
    db.add(user)
    db.commit()  # Get user.id from database
    
    # Create JWT token for the new user
    access_token = create_access_token(user.id, user.email)
    
    # Return token to client
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
    
    EXAMPLE: LOGIN FLOW
    ------------------
    # User submits login form with email and password
    email = "user@example.com"
    password = "SecurePassword123"
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    
    # Verify password matches stored hash
    if not user or not verify_password(password, user.password_hash):
        raise error("Invalid email or password")
    
    # Create JWT token for logged-in user
    access_token = create_access_token(user.id, user.email)
    
    # Return token in response (and/or HTTP-only cookie)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.to_dict()
    }
    
    TOKEN STORAGE SECURITY
    ---------------------
    Browser-side token storage options:
    
    1. HTTP-Only Cookie (RECOMMENDED for mobile/browser apps)
       - Secure: Cannot be accessed by JavaScript (prevents XSS attacks)
       - Automatic: Browser sends cookie with every request
       - Drawback: Only works for same-domain requests
       - Implementation: Set-Cookie: access_token={token}; HttpOnly; Secure; SameSite=Lax
    
    2. LocalStorage
       - Risk: XSS attacks can steal tokens via JavaScript
       - Advantage: Available across all domains
       - Use case: Third-party services that need cross-domain tokens
       - Mitigation: Implement strict CSP, sanitize user input
    
    3. SessionStorage
       - Similar to LocalStorage but cleared when browser closes
       - Still vulnerable to XSS attacks
    
    Current Discovery App Implementation:
    - Uses HTTP-only cookies for security (no JavaScript access)
    - Frontend sends cookie automatically with requests
    - Reduces XSS attack surface
    
    TIMING NOTES
    -----------
    - Token creation is fast (~1ms, just crypto operations)
    - No database calls needed
    - Safe to execute synchronously in request handlers
    - Can be rate-limited if needed (login attempts)
    """
    try:
        # Calculate expiration time (30 days from now) as timezone-aware UTC
        expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
        
        # Prepare token payload with claims
        # Claims are properties/attributes of the token that contain user information
        payload = {
            'user_id': str(user_id),  # Convert UUID to string (JSON-serializable)
            'email': email,
            'exp': expire  # Expiration time (datetime for python-jose)
        }
        
        # Encode payload to JWT (signed with SECRET_KEY)
        # python-jose handles:
        # 1. Converting datetime to Unix timestamp for 'exp'
        # 2. JSON-encoding the payload
        # 3. Encoding to base64url
        # 4. Computing HMAC-SHA256 signature
        encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        
        return encoded_jwt
    
    except Exception as e:
        raise InvalidTokenError(f"Failed to create token: {str(e)}")


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.
    
    This function verifies the token signature using SECRET_KEY and extracts
    the claims (user_id, email, exp). Raises exceptions if token is invalid,
    expired, or tampered with.
    
    Token Verification Process:
    ==========================
    1. Split token into parts: header.payload.signature
    2. Base64url-decode header and payload
    3. Parse JSON from header and payload
    4. Recreate signature using SECRET_KEY and HS256 algorithm
    5. Compare recreated signature with original signature
       - If mismatch: Token was tampered with, raise InvalidTokenError
       - If match: Token is authentic and comes from our server
    6. Check expiration time (exp claim)
       - If exp < current time: Token has expired, raise ExpiredTokenError
       - If exp > current time: Token is still valid
    7. Extract and return claims from payload
    
    Why Signature Verification is Important:
    ========================================
    Without signature verification:
      - Attacker could base64-decode token
      - Attacker could modify payload (change user_id to admin)
      - Attacker could re-encode and use modified token
      - Server would accept forged token
    
    With HS256 signature:
      - Attacker can modify payload easily (base64 is not encrypted)
      - But attacker doesn't have SECRET_KEY
      - Without SECRET_KEY, attacker cannot recreate valid signature
      - Server rejects token because signature doesn't match
      - Forged tokens are rejected
    
    NOTE: This is why SECRET_KEY must be kept secret!
    If SECRET_KEY is compromised:
      - Attacker can forge valid tokens for any user
      - Solution: Rotate SECRET_KEY and invalidate all issued tokens
    
    ARGUMENTS
    ---------
    token : str
        JWT token string in format "header.payload.signature"
        Obtained from:
        - Authorization header: "Authorization: Bearer {token}"
        - HTTP-only cookie: request.cookies.get('access_token')
        - Custom header: "X-Token: {token}"
    
    RETURNS
    -------
    dict with keys:
        - user_id: UUID string (convert back to UUID if needed)
        - email: User email address
        - exp: Expiration time as Unix timestamp (float)
        
        Example: {
            'user_id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'email': 'user@example.com',
            'exp': 1711016000
        }
    
    RAISES
    ------
    ExpiredTokenError
        Raised if token.exp < current_time (token has expired)
        Include expiration time in exception for debugging
    
    InvalidTokenError
        Raised if:
        - Token format is invalid (not 3 parts separated by dots)
        - Signature doesn't match SECRET_KEY (token was tampered)
        - Token contains invalid JSON
        - Algorithm doesn't match HS256
        - Missing required claims (user_id, email)
    
    EXAMPLE: PROTECTED ENDPOINT
    --------------------------
    # In a protected endpoint, extract token and decode it
    async def get_current_user(token: str = Depends(oauth2_scheme)):
        try:
            payload = decode_token(token)
        except ExpiredTokenError:
            raise HTTPException(
                status_code=401,
                detail="Token has expired. Please login again."
            )
        except InvalidTokenError:
            raise HTTPException(
                status_code=401,
                detail="Invalid token. Please login again."
            )
        
        # Token is valid, extract user_id
        user_id = payload.get('user_id')
        email = payload.get('email')
        
        # Optionally: Query database to get fresh user data
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    
    EXAMPLE: EXTRACT FROM REQUEST
    ----------------------------
    # In FastAPI routes, extract token from Authorization header
    @app.get("/protected")
    async def protected_route(request: Request):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Missing token")
        
        token = auth_header[7:]  # Remove "Bearer " prefix
        
        try:
            payload = decode_token(token)
            user_id = payload['user_id']
            return {"user_id": user_id}
        except ExpiredTokenError:
            raise HTTPException(status_code=401, detail="Token expired")
        except InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    TIMING CONSIDERATIONS
    --------------------
    - Token decoding is fast (~1ms for crypto verification)
    - Signature verification time is constant (doesn't leak info about validation)
    - No side-channel information leaks
    - Safe to call on every protected request
    
    CLOCK SKEW HANDLING
    ------------------
    In distributed systems, server clocks may be slightly out of sync:
      - Server A issues token with exp = 1711016000
      - Server B receives token 5 seconds later
      - Server B clock is slightly behind (off by 2 seconds)
      - Server B thinks it's still 1711015998
      - Token appears to be valid (exp=1711016000 > current=1711015998)
    
    python-jose handles this automatically with default 0-second leeway.
    For production deployment with clock skew, could add:
      jwt.decode(..., options={'leeway': 10})  # 10 second tolerance
    
    But this reduces security (tokens valid 10 extra seconds after expiry).
    Better solution: Use NTP to keep server clocks synchronized.
    """
    try:
        # Validate token format before attempting decode
        if not token or not isinstance(token, str):
            raise InvalidTokenError("Token must be a non-empty string")
        
        if token.count('.') != 2:
            raise InvalidTokenError("Token must have 3 parts (header.payload.signature)")
        
        # Decode JWT and verify signature using SECRET_KEY
        # python-jose handles:
        # 1. Verifying HS256 signature matches SECRET_KEY
        # 2. Parsing JSON payload
        # 3. Validating required claims
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=['HS256']
        )
        
        # Extract required claims
        user_id = payload.get('user_id')
        email = payload.get('email')
        
        # Validate required claims are present
        if not user_id or not email:
            raise InvalidTokenError("Token missing required claims (user_id, email)")
        
        return payload
    
    except ExpiredSignatureError:
        raise ExpiredTokenError("Token has expired")
    except JWTError as e:
        raise InvalidTokenError(f"Invalid token: {str(e)}")
    except InvalidTokenError:
        # Re-raise our custom InvalidTokenError
        raise
    except Exception as e:
        raise InvalidTokenError(f"Failed to decode token: {str(e)}")
