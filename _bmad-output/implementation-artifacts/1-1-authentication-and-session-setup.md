# Story 1.1: Authentication & Session Setup

**Status:** ready-for-dev

**Epic:** Week 1 (Foundation & Authentication)  
**Stories in This Epic:** 1-1 (this), 1-2 (health-check), 1-3 (docker-setup)  
**Sprint Duration:** Week 1 (5 business days)

---

## Story

As a single-user consultant (Chuck),
I want to sign up with email/password and login securely,
so that my projects and research data are protected and persistable across sessions.

---

## Acceptance Criteria

1. **User signup endpoint exists and validates input**
   - `POST /auth/signup` with payload `{email, password}`
   - Email must be RFC 5322 compliant (practical subset: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}`)
   - Password must be 8+ characters AND contain at least 1 number
   - Duplicate email rejected with 409 Conflict
   - Success returns 201 Created with user object (email, created_at, but NOT password)
   - Password stored as bcrypt hash (cost factor 12+)

2. **User login endpoint exists and returns JWT token**
   - `POST /auth/login` with payload `{email, password}`
   - Valid credentials return 200 OK + JWT token in response body
   - JWT token: HS256 signature, user_id + email claims, 30-day expiry
   - Invalid credentials return 401 Unauthorized (generic message, no user enum)
   - User not found returns 401 (not 404 - security principle)

3. **JWT tokens stored in HTTP-only secure cookies**
   - Cookie name: `access_token`
   - HttpOnly flag: YES (prevents JS access)
   - Secure flag: YES (HTTPS only in production)
   - SameSite: "Lax" (CSRF protection)
   - Max-Age: 30 days (2,592,000 seconds)
   - Path: "/" (all routes)

4. **Session validation endpoint exists**
   - `GET /auth/validate` with Authorization header: `Bearer {token}`
   - Valid token returns 200 + user object
   - Expired/invalid token returns 401 Unauthorized
   - Used by frontend to verify session on page load

5. **Logout endpoint clears session**
   - `POST /auth/logout`
   - Returns 200 OK + message "Logged out"
   - Clears `access_token` cookie (Set-Cookie with Max-Age=0)

6. **Health check endpoint (no auth required)**
   - `GET /health` returns 200 OK with `{status: "ok"}`
   - Used by Docker health checks
   - No authentication required

7. **Protected routes enforce authentication**
   - All endpoints except `/auth/signup`, `/auth/login`, `/health` require valid JWT
   - Missing/invalid token returns 401 Unauthorized
   - Expired token returns 401 with message "Token expired"

8. **Database: Users table created and migrated**
   - Table: `users` with fields: id (UUID), email (unique), password_hash, created_at, updated_at
   - Alembic migration file: `backend/alembic/versions/001_init_users.py`
   - Migration can run fresh: `alembic upgrade head` on clean DB creates table
   - Rollback works: `alembic downgrade -1` removes table

9. **Frontend: Login page fully functional**
   - Route: `/login`
   - Form fields: Email input, Password input, "Remember me" checkbox
   - Submit button triggers `POST /auth/login`
   - On success: Store token (in memory or localStorage), redirect to `/dashboard`
   - On error: Display error message (invalid credentials, network error, etc.)
   - "Sign Up" link to `/signup` if no account
   - Responsive design (works on mobile + desktop)

10. **Frontend: Sign Up page fully functional**
    - Route: `/signup`
    - Form fields: Email input, Password input, Password confirmation, terms checkbox (optional)
    - Submit button triggers `POST /auth/signup`
    - Password validation shown inline (8+ chars, 1+ number)
    - On success: Auto-login (call `/auth/login`), redirect to `/dashboard`
    - On error: Display error message (duplicate email, validation, network, etc.)
    - "Login" link to `/login` if already have account
    - Responsive design

11. **Frontend: Route guard protects authenticated pages**
    - All routes except `/login`, `/signup`, `/health` require valid JWT
    - On app load: Call `GET /auth/validate` to check session
    - Valid session: Continue to requested route
    - Invalid/missing session: Redirect to `/login`
    - Loading state while validating (show spinner/skeleton)

12. **Frontend: Logout functionality**
    - User menu/header includes logout button
    - Click logout → `POST /auth/logout` → clear local session → redirect to `/login`
    - After logout, accessing `/dashboard` redirects to `/login`

13. **All tests pass (comprehensive coverage)**
    - Unit tests for auth service functions: signup, login, validate, logout
    - Integration tests for each API endpoint with mocked DB
    - E2E tests for signup flow (form → validation → API → redirect)
    - E2E tests for login flow (form → API → redirect)
    - E2E tests for protected route redirect (no session → login)
    - Test coverage: 80%+ for auth module

14. **Error handling and edge cases**
    - Expired tokens: validate endpoint returns 401, frontend redirects to login
    - Network failures: Frontend shows retry option
    - Concurrent requests: Prevent double-submissions (disable button during submit)
    - Case-insensitive email: Normalize email to lowercase before storing/querying

---

## Tasks / Subtasks

### Task 1: Backend - Database & Alembic Setup (DB foundation)
- [ ] Task 1.1: Create Alembic migration for users table
  - [ ] Create migration file: `backend/alembic/versions/001_init_users.py`
  - [ ] Define users table schema (id, email, password_hash, created_at, updated_at)
  - [ ] Add unique constraint on email
  - [ ] Add indexes on email (for login query performance)
  - [ ] Migration is idempotent: running twice doesn't fail

### Task 2: Backend - User Model & Hashing (ORM model)
- [ ] Task 2.1: Create SQLAlchemy User model
  - [ ] File: `backend/app/models/user.py`
  - [ ] Fields: id (UUID), email (String, unique), password_hash (String), created_at, updated_at
  - [ ] Add __repr__ for debugging (shows email, not password)
  
- [ ] Task 2.2: Implement password hashing utility
  - [ ] File: `backend/app/utils/security.py`
  - [ ] Function: `hash_password(password: str) -> str` using bcrypt (cost 12+)
  - [ ] Function: `verify_password(password: str, hash: str) -> bool`
  - [ ] Tests: Verify hash is deterministic, cross-check works, wrong password fails

### Task 3: Backend - JWT Token Management (session logic)
- [ ] Task 3.1: Implement JWT token creation
  - [ ] File: `backend/app/utils/security.py`
  - [ ] Function: `create_access_token(user_id: UUID, email: str) -> str`
  - [ ] Payload: user_id, email, exp (30 days from now)
  - [ ] Algorithm: HS256
  - [ ] Secret from environment: `SECRET_KEY` env var
  
- [ ] Task 3.2: Implement JWT token validation
  - [ ] File: `backend/app/utils/security.py`
  - [ ] Function: `decode_token(token: str) -> dict` returns {user_id, email} or raises exception
  - [ ] Handle expired tokens: raise ExpiredTokenError
  - [ ] Handle invalid tokens: raise InvalidTokenError

- [ ] Task 3.3: Implement dependency for route protection
  - [ ] File: `backend/app/api/deps.py`
  - [ ] Function: `get_current_user(token: str = Depends(...)) -> User`
  - [ ] Extracts token from Authorization header OR cookie
  - [ ] Validates token, queries user from DB, returns User object
  - [ ] Raises 401 if invalid/expired/missing

### Task 4: Backend - Auth API Endpoints (REST contract)
- [ ] Task 4.1: Implement `/auth/signup` endpoint
  - [ ] File: `backend/app/api/routes/auth.py`
  - [ ] Route: `POST /auth/signup`
  - [ ] Input: RequestBody with email (str), password (str)
  - [ ] Validate email format (RFC 5322 subset)
  - [ ] Validate password (8+ chars, 1+ number)
  - [ ] Hash password
  - [ ] Insert user into DB, catch integrity error for duplicate email
  - [ ] Return 201 Created with user object (id, email, created_at)
  - [ ] Return 409 Conflict if email already exists
  - [ ] Return 422 Unprocessable Entity for validation errors

- [ ] Task 4.2: Implement `/auth/login` endpoint
  - [ ] Route: `POST /auth/login`
  - [ ] Input: RequestBody with email (str), password (str)
  - [ ] Query user by email, return 401 if not found
  - [ ] Verify password hash, return 401 if mismatch
  - [ ] Create JWT token
  - [ ] Set HttpOnly cookie: `access_token` with 30-day expiry
  - [ ] Return 200 OK with response body: {access_token, token_type: "bearer", user: {id, email}}
  - [ ] Notes: Cookie is set automatically by FastAPI response; also return in body for flexibility

- [ ] Task 4.3: Implement `/auth/validate` endpoint
  - [ ] Route: `GET /auth/validate`
  - [ ] Uses dependency: `get_current_user` (enforces JWT validation)
  - [ ] Return 200 OK with user object: {id, email, created_at}
  - [ ] Automatically returns 401 if token invalid/expired (via dependency)

- [ ] Task 4.4: Implement `/auth/logout` endpoint
  - [ ] Route: `POST /auth/logout`
  - [ ] Clear `access_token` cookie (Set-Cookie with Max-Age=0)
  - [ ] Return 200 OK with message: "Logged out successfully"

- [ ] Task 4.5: Implement `/health` endpoint (no auth)
  - [ ] Route: `GET /health`
  - [ ] Return 200 OK with {status: "ok"}
  - [ ] No authentication required
  - [ ] Used by Docker health checks

### Task 5: Backend - Environment & Configuration (setup)
- [ ] Task 5.1: Create .env.example with required secrets
  - [ ] File: `backend/.env.example`
  - [ ] Variables: DATABASE_URL, SECRET_KEY, CLAUDE_API_KEY, etc.
  - [ ] README note: Copy to .env.local and fill in values

- [ ] Task 5.2: Update main.py to include auth routes
  - [ ] File: `backend/main.py`
  - [ ] Include auth router
  - [ ] Register CORS middleware for frontend origin
  - [ ] Startup event: Run DB migrations (optional; can be manual)

### Task 6: Frontend - Login Page (UI component)
- [ ] Task 6.1: Create login page component
  - [ ] File: `frontend/src/pages/LoginPage.tsx`
  - [ ] Layout: Centered card with logo, form, links
  - [ ] Form fields: Email input, Password input
  - [ ] "Remember me" checkbox (state tracked, passed to API)
  - [ ] Submit button: Calls `/auth/login` on click
  - [ ] Error display: Shows API error messages (credential failure, network error)
  - [ ] Loading state: Disable button during request, show spinner
  - [ ] Success: Store token in memory (or localStorage with remember-me), redirect to `/dashboard`
  - [ ] Links: "Sign Up" → `/signup`, "Forgot password?" → placeholder
  - [ ] Responsive: Works on mobile (320px) and desktop (1200px+)

- [ ] Task 6.2: Create HTTP client for auth API calls
  - [ ] File: `frontend/src/api/client.ts`
  - [ ] Function: `signup(email, password)` → POST /auth/signup
  - [ ] Function: `login(email, password, rememberMe)` → POST /auth/login
  - [ ] Function: `logout()` → POST /auth/logout
  - [ ] Function: `validateSession()` → GET /auth/validate
  - [ ] All functions handle errors and return typed responses
  - [ ] Base URL: From env var `VITE_API_URL` (default localhost:8000)

### Task 7: Frontend - Sign Up Page (UI component)
- [ ] Task 7.1: Create signup page component
  - [ ] File: `frontend/src/pages/SignUpPage.tsx`
  - [ ] Form fields: Email input, Password input, Confirm password input
  - [ ] Password validation: Show real-time feedback (8+ chars? 1+ number? Match?)
  - [ ] Submit button: Calls `/auth/signup`, then auto-login
  - [ ] Error display: Shows API errors
  - [ ] Loading state: Button disabled, spinner shown
  - [ ] Success: Auto-call login, store token, redirect to `/dashboard`
  - [ ] Links: "Already have account?" → `/login`
  - [ ] Responsive design

### Task 8: Frontend - Route Guard & Protected Component (auth wrapper)
- [ ] Task 8.1: Create ProtectedRoute wrapper component
  - [ ] File: `frontend/src/components/ProtectedRoute.tsx`
  - [ ] On route access: Call `validateSession()` to check JWT
  - [ ] Valid session: Render child component
  - [ ] Invalid/expired: Redirect to `/login`
  - [ ] Loading state: Show spinner while validating
  - [ ] Works in React Router (e.g., `<ProtectedRoute><Dashboard /></ProtectedRoute>`)

- [ ] Task 8.2: Integrate ProtectedRoute into main router
  - [ ] File: `frontend/src/App.tsx` or `frontend/src/router.ts`
  - [ ] Route `/dashboard` (and all future routes): Use ProtectedRoute
  - [ ] Route `/login`, `/signup`: No protection (allow unauthenticated)
  - [ ] Default route: Redirect unauthenticated to `/login`, authenticated to `/dashboard`

### Task 9: Frontend - Logout & Header (user menu)
- [ ] Task 9.1: Create Header component with logout
  - [ ] File: `frontend/src/components/Header.tsx`
  - [ ] Display current user email (from context or state)
  - [ ] Logout button in user menu/dropdown
  - [ ] On click: Call `logout()`, clear local session, redirect to `/login`
  - [ ] Show on all protected pages

### Task 10: Backend - Comprehensive Tests (Red-Green-Refactor)
- [ ] Task 10.1: Unit tests for password hashing
  - [ ] File: `backend/tests/test_security.py`
  - [ ] Test: Hash produces different output each time (salt)
  - [ ] Test: Verify accepts correct password, rejects wrong password
  - [ ] Test: Verify fails gracefully on malformed hash
  - [ ] Coverage: 100% of security.py

- [ ] Task 10.2: Unit tests for JWT functions
  - [ ] File: `backend/tests/test_security.py`
  - [ ] Test: Create token with valid payload, decode works
  - [ ] Test: Expired token raises ExpiredTokenError
  - [ ] Test: Invalid token raises InvalidTokenError
  - [ ] Test: Token has correct claims (user_id, email, exp)
  - [ ] Coverage: 100%

- [ ] Task 10.3: Integration tests for auth endpoints
  - [ ] File: `backend/tests/test_auth_endpoints.py`
  - [ ] Test POST /auth/signup: Valid input → 201, duplicate email → 409, validation error → 422
  - [ ] Test POST /auth/login: Valid → 200 + token, invalid → 401, user not found → 401
  - [ ] Test GET /auth/validate: Valid token → 200 + user, invalid → 401
  - [ ] Test POST /auth/logout: Always → 200, cookie cleared
  - [ ] Test GET /health: Always → 200, no auth required
  - [ ] Test protected route without token: → 401
  - [ ] Test protected route with expired token: → 401
  - [ ] Coverage: 80%+ of auth module

- [ ] Task 10.4: E2E tests for signup flow (Playwright or Cypress)
  - [ ] File: `frontend/tests/e2e/signup.spec.ts`
  - [ ] Test: Fill form (valid email, valid password), submit, redirect to dashboard
  - [ ] Test: Fill form (duplicate email), submit, show error
  - [ ] Test: Fill form (invalid password), submit, show validation error
  - [ ] Test: Link to login works
  - [ ] Cross-browser: Chrome (minimum)

- [ ] Task 10.5: E2E tests for login flow
  - [ ] File: `frontend/tests/e2e/login.spec.ts`
  - [ ] Test: Signup first, logout, login again → dashboard
  - [ ] Test: Wrong password → error shown
  - [ ] Test: Remember me checkbox → token persists (if using localStorage)
  - [ ] Test: Link to signup works

- [ ] Task 10.6: E2E tests for protected routes
  - [ ] File: `frontend/tests/e2e/protected-routes.spec.ts`
  - [ ] Test: Unauthenticated access to `/dashboard` → redirect to `/login`
  - [ ] Test: After login, `/dashboard` loads
  - [ ] Test: Logout → redirect to `/login`
  - [ ] Test: Token expiry → next request on `/dashboard` → redirect to `/login`

---

## Dev Notes

### Architecture Compliance

**Reference:** [01-data-model-and-architecture.md](01-data-model-and-architecture.md)

- **Tech Stack:** FastAPI (backend), React 18 (frontend), PostgreSQL (database), SQLAlchemy ORM
- **Database Schema:** Users table (id UUID PK, email UNIQUE, password_hash, created_at, updated_at)
- **Authentication Pattern:** JWT + HTTP-only cookies, 30-day session
- **API Style:** RESTful, JSON request/response bodies
- **Testing:** pytest for backend, Playwright/Cypress for frontend

### Framework & Library Requirements

**Backend:**
- FastAPI 0.100+
- SQLAlchemy 2.0+
- Pydantic V2 for validation
- python-bcrypt or passlib for password hashing (bcrypt cost 12+)
- python-jose or PyJWT for JWT handling
- python-multipart for form data (automatic with FastAPI)
- databases (async) package for DB connection pooling

**Frontend:**
- React 18.2+
- TypeScript 5.0+
- React Router v6+ for route management
- axios or fetch API for HTTP calls
- Tailwind CSS for styling (from specification)
- Headless UI for accessible form components

**Development:**
- pytest + pytest-asyncio (backend)
- pytest-cov for coverage reports
- Playwright or Cypress for E2E (choose one)
- Docker Compose for local dev (see 03-hosting-and-infrastructure.md)

### File Structure

**New files to create:**
```
backend/
  ├── app/
  │   ├── __init__.py
  │   ├── models/
  │   │   ├── __init__.py
  │   │   └── user.py                 ← Task 2.1
  │   ├── api/
  │   │   ├── __init__.py
  │   │   ├── deps.py                 ← Task 3.3 (route protection)
  │   │   └── routes/
  │   │       ├── __init__.py
  │   │       └── auth.py             ← Task 4 (endpoints)
  │   └── utils/
  │       ├── __init__.py
  │       └── security.py             ← Task 2.2 + 3.1 + 3.2 (hashing, JWT)
  ├── alembic/
  │   └── versions/
  │       └── 001_init_users.py       ← Task 1.1 (migration)
  ├── tests/
  │   ├── __init__.py
  │   ├── test_security.py            ← Task 10.1 + 10.2
  │   └── test_auth_endpoints.py      ← Task 10.3
  ├── main.py                         ← Task 5.2 (update to add routes)
  ├── .env.example                    ← Task 5.1
  └── requirements.txt                ← Add new dependencies

frontend/
  ├── src/
  │   ├── pages/
  │   │   ├── LoginPage.tsx           ← Task 6.1
  │   │   └── SignUpPage.tsx          ← Task 7.1
  │   ├── components/
  │   │   ├── ProtectedRoute.tsx      ← Task 8.1
  │   │   └── Header.tsx              ← Task 9.1
  │   ├── api/
  │   │   └── client.ts               ← Task 6.2
  │   ├── App.tsx or router.ts        ← Task 8.2 (update routing)
  │   └── main.tsx or index.tsx       ← Ensure includes App
  └── tests/
      └── e2e/
          ├── signup.spec.ts          ← Task 10.4
          ├── login.spec.ts           ← Task 10.5
          └── protected-routes.spec.ts ← Task 10.6
```

### Testing Standards

**Backend:**
- Use pytest fixtures for DB setup (temporary test DB)
- Mock external services (Claude API mocked in future stories)
- Each function has 1+ unit test + 1+ integration test
- E2E: Real HTTP requests to running service
- Coverage: Minimum 80% for story-related code

**Frontend:**
- Playwright/Cypress for E2E (recommended: Playwright, more reliable)
- Unit tests via Vitest or Jest (optional for MVP; focus on E2E)
- Mock API responses for component testing
- Test user interactions: click, type, submit, wait for redirect

### Key Technical Decisions

1. **Password Hashing:** bcrypt (industry standard, slow-by-design prevents brute-force)
2. **JWT Secret:** From `SECRET_KEY` environment variable (must be strong, 32+ chars)
3. **Token Expiry:** 30 days (longer for single-user MVP, can shorten later)
4. **Cookie Storage:** HttpOnly + Secure flags mandatory (prevents XSS, CSRF)
5. **Email Normalization:** Lowercase all emails before storing (prevents case-sensitivity bugs)
6. **Error Messages:** Generic "Invalid credentials" for security (no user enumeration)

### References

- **Feature Spec:** [02-feature-specification.md](02-feature-specification.md#feature-1-authentication--session-management)
- **Data Model:** [01-data-model-and-architecture.md](01-data-model-and-architecture.md#2-user)
- **Developer Brief:** [04-developer-brief.md](04-developer-brief.md#week-1-foundation--authentication)
- **Hosting/Dev Env:** [03-hosting-and-infrastructure.md](03-hosting-and-infrastructure.md#development-phase-free--local-docker)

---

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (Development Agent: Amelia)

### Debug Log References

(To be filled by dev agent during implementation)

### Completion Notes List

(Tasks completed during story execution)

### File List

**Backend Files:**
- backend/app/models/user.py
- backend/app/utils/security.py
- backend/app/api/deps.py
- backend/app/api/routes/auth.py
- backend/alembic/versions/001_init_users.py
- backend/main.py (updated)
- backend/.env.example
- backend/tests/test_security.py
- backend/tests/test_auth_endpoints.py
- backend/requirements.txt (updated)

**Frontend Files:**
- frontend/src/pages/LoginPage.tsx
- frontend/src/pages/SignUpPage.tsx
- frontend/src/components/ProtectedRoute.tsx
- frontend/src/components/Header.tsx
- frontend/src/api/client.ts
- frontend/src/App.tsx or router.ts (updated)
- frontend/tests/e2e/signup.spec.ts
- frontend/tests/e2e/login.spec.ts
- frontend/tests/e2e/protected-routes.spec.ts

### Change Log

(To be updated as story progresses)

---

## Status

**Current:** ready-for-dev  
**Priority:** P0 Critical (blocks all other features)  
**Dependencies:** None (foundation story)  
**Blocks:** 1-2 (health-check), 1-3 (docker-setup), all Week 2+ features  

**Estimated Effort:** 40 backend hours + 20 frontend hours + 15 test hours = ~75 hours total (~1 week for experienced dev)  
**Actual Effort:** (To be recorded by dev agent)

---

**Ready for developer to execute. Dev Agent: proceed with Task 1 (DB setup).**
