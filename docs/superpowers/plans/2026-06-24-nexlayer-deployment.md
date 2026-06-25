# Nexlayer Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Discovery App deployable to Nexlayer from a single `nexlayer.yaml`, serving frontend (`/`) and backend (`/api`) on one domain, with production images built/pushed to GHCR by CI.

**Architecture:** Four Nexlayer pods — `frontend` (nginx static SPA, `path:/`), `backend` (FastAPI/uvicorn under a global `/api` prefix, `path:/api`), `postgres` (volume), `minio` (volume). Same-origin frontend+backend ⇒ no CORS. Pods talk over internal DNS (`postgres.pod:5432`, `minio.pod:9000`). Nexlayer pulls pre-built images, so CI builds and pushes both.

**Tech Stack:** FastAPI, async SQLAlchemy/asyncpg, boto3+MinIO, Vite/React 19, nginx, Docker, GitHub Actions (GHCR), Nexlayer.

**Spec:** `docs/superpowers/specs/2026-06-24-nexlayer-deployment-design.md`

---

## File Structure

**Backend (modify):**
- `backend/app/main.py` — wrap all routers in a parent `APIRouter(prefix="/api")`; move `/health` under it; set `docs_url`/`redoc_url`/`openapi_url` under `/api`.
- `backend/tests/test_http_integration.py` — update root-relative HTTP calls → `/api/...`; update the "health at root" comment/assertion.
- `backend/tests/test_settings.py` — HTTP calls `/settings/...` → `/api/settings/...` **and** the structural `app.routes` assertion (`"/settings/analysis-types"` → `"/api/settings/analysis-types"`).
- `backend/tests/test_intake_route.py` — HTTP calls `/intake-scope` → `/api/intake-scope` **and** the structural `app.routes` assertion (`"/intake-scope"` → `"/api/intake-scope"`).
- `backend/tests/test_auth_endpoints.py` — **no change** (it inspects the auth *sub-router's* relative `/health` path, which is unaffected by the `/api` prefix applied at registration).
- `docker-compose.yml` — backend healthcheck URL → `/api/health`.

**Frontend (create/modify):**
- `frontend/src/api/client.ts` — `BASE_URL` default → `/api`.
- `frontend/src/lib/api.ts` — `BASE_URL` default → `/api`.
- `frontend/src/tests/api/analyses.test.ts` — `BASE_URL` → `/api`.
- `frontend/vite.config.ts` — proxy `/api` → `http://localhost:8000`.
- `frontend/Dockerfile.prod` — **create**: multi-stage build → nginx.
- `frontend/nginx.conf` — **create**: static serving + SPA fallback.

**Deploy (create):**
- `nexlayer.yaml` — repo root manifest.
- `.github/workflows/build-images.yml` — build+push backend & frontend to GHCR.
- `README.md` — append a "Deploy to Nexlayer" section.

---

## Task 1: Backend global `/api` prefix

**Files:**
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_http_integration.py`, `backend/tests/test_settings.py`, `backend/tests/test_intake_route.py`

This is the core refactor. TDD here means: update the tests to assert the *new* `/api` behavior first (they will fail against the current root-relative app), then change `main.py` to make them pass.

**Two kinds of test assertions exist — handle both:**
- **HTTP-level** (`client.get("/...")` via `TestClient`) — these hit the full app path and MUST get the `/api` prefix.
- **Structural sub-router** (assertions that inspect a *sub-router's* `.routes`, e.g. `app.api.routes.auth.router.routes` or `if "health" in route.path`) — these check the router's *relative* path; the `/api` prefix is only applied at registration in `main.py`, so these stay UNCHANGED.
- **Structural app-level** (assertions over `app.routes` / `{r.path for r in app.routes}`) — these see the full path and MUST get the `/api` prefix.

- [ ] **Step 1: Update the affected tests to expect `/api`**

In `backend/tests/test_http_integration.py`, change the six HTTP calls and the health comment:
- `client.get("/auth/validate")` → `client.get("/api/auth/validate")` (both occurrences, ~lines 237, 243)
- `client.post("/auth/logout")` → `client.post("/api/auth/logout")` (both, ~281, 287)
- `client.get("/health")` → `client.get("/api/health")` (both, ~300, 307)
- The comment/assertion at ~line 294 ("must be at root /health, not /auth/health") → update to "must be at /api/health".

In `backend/tests/test_settings.py`:
- All `client.get("/settings/analysis-types")` → `client.get("/api/settings/analysis-types")` (5 occurrences).
- The **app-level** structural assertion `test_analysis_types_route_in_app` (~lines 88-90): `"/settings/analysis-types" in {r.path for r in app.routes}` → `"/api/settings/analysis-types"`.
- Do NOT touch the sibling sub-router assertions (~lines 76, 84) that inspect the settings router directly — they keep the relative path.

In `backend/tests/test_intake_route.py`:
- All `client.post("/intake-scope", ...)` → `client.post("/api/intake-scope", ...)` (3 occurrences).
- The **app-level** structural assertion `test_intake_router_in_app` (~lines 85-87): `"/intake-scope" in {r.path for r in app.routes}` → `"/api/intake-scope"`.
- Do NOT touch the sibling sub-router assertions (~lines 78, 82).

Do **not** edit `backend/tests/test_auth_endpoints.py` — it inspects the auth sub-router's relative `/health` path and stays green as-is.

Sanity sweep before implementing: `cd backend && grep -rn 'client\.\(get\|post\|put\|delete\|patch\)("/' tests && grep -rn 'app\.routes' tests` to confirm you've found every affected call site.

- [ ] **Step 2: Run the updated tests to verify they FAIL**

Run: `cd backend && pytest tests/test_http_integration.py tests/test_settings.py tests/test_intake_route.py tests/test_auth_endpoints.py -q`
Expected: FAIL — routes return 404 because the app still serves at root paths.

- [ ] **Step 3: Add the `/api` prefix in `main.py`**

In `backend/app/main.py`:

1. Set the FastAPI docs/openapi URLs under `/api` in the `FastAPI(...)` constructor:

```python
app = FastAPI(
    title="Discovery App API",
    description="AI-powered discovery platform for validating startup assumptions",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
```

2. Replace the block of `app.include_router(...)` calls with a single parent router, and move `/health` onto it. Keep the existing imports of the individual routers.

```python
from fastapi import APIRouter  # add to existing fastapi import

api_router = APIRouter(prefix="/api")

# Existing routers (each keeps its own prefix/paths; they compose under /api)
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
```

3. Remove the old top-level `@app.get("/health", ...)` definition (now on `api_router`). Leave the root `@app.get("/")` info endpoint as-is — it is harmless and the frontend pod owns the public `/` route.

4. Note the **second, pre-existing** health endpoint: `backend/app/api/routes/auth.py:480` defines `@router.get("/health")` on the auth router. After this refactor it resolves to `/api/auth/health`. Leave it as-is (harmless duplicate); do not remove it. This is expected — don't be confused by it during the Step 5 full-suite run.

- [ ] **Step 4: Run the updated tests to verify they PASS**

Run: `cd backend && pytest tests/test_http_integration.py tests/test_settings.py tests/test_intake_route.py tests/test_auth_endpoints.py -q`
Expected: PASS.

- [ ] **Step 5: Run the full backend suite to catch any other root-path assumptions**

Run: `cd backend && pytest -q`
Expected: PASS. If any other test references a root-relative route, update it to `/api/...` the same way and re-run.

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/tests/
git commit -m "feat(backend): serve all routes under /api prefix for single-origin deploy"
```

---

## Task 2: Local dev parity (compose healthcheck + Vite proxy)

**Files:**
- Modify: `docker-compose.yml`
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Update the backend healthcheck in `docker-compose.yml`**

Change the backend service healthcheck test from `/health` to `/api/health`:

```yaml
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s
```

- [ ] **Step 2: Update the Vite dev proxy in `frontend/vite.config.ts`**

Replace the `server.proxy` block so the dev server proxies `/api` to the backend (same base as production):

```ts
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
```

- [ ] **Step 3: Verify compose still boots and the healthcheck passes**

Run: `docker compose up --build -d backend db minio`
Then: `docker compose ps` — backend should become `healthy` within ~30s.
Also: `curl -fsS http://localhost:8000/api/health` → `{"status":"ok"}`.
Tear down: `docker compose down`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml frontend/vite.config.ts
git commit -m "chore: align local dev healthcheck and Vite proxy with /api base"
```

---

## Task 3: Frontend API base → `/api`

**Files:**
- Modify: `frontend/src/api/client.ts:1`
- Modify: `frontend/src/lib/api.ts:3`
- Test: `frontend/src/tests/api/analyses.test.ts:5`

Note: there is **no meaningful RED step** here. `frontend/src/tests/api/analyses.test.ts` mocks `BASE_URL` but never asserts any request URL against it (the `fetch`/stream mocks ignore the URL argument, and `api.get` assertions use relative paths), so changing the default does not flip a test. This task is a straightforward source change plus keeping the mock consistent; verification is "the suite stays green."

- [ ] **Step 1: Update both source defaults**

In `frontend/src/api/client.ts:1`:
```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
```
In `frontend/src/lib/api.ts:3`:
```ts
export const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
```

- [ ] **Step 2: Keep the test mock consistent**

In `frontend/src/tests/api/analyses.test.ts` line 5, change `BASE_URL: 'http://localhost:8000'` → `BASE_URL: '/api'` so the mock matches the new default. (This is for consistency; the test does not assert against it.)

- [ ] **Step 3: Run the frontend test suite to verify it stays green**

Run: `cd frontend && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/lib/api.ts frontend/src/tests/api/analyses.test.ts
git commit -m "feat(frontend): default API base to /api for same-origin deploy"
```

---

## Task 4: Frontend production image (build + nginx)

**Files:**
- Create: `frontend/Dockerfile.prod`
- Create: `frontend/nginx.conf`

No unit test here; verification is a successful image build + serving the SPA with deep-link fallback.

- [ ] **Step 1: Create `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Long-cache hashed assets
    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback: all other routes resolve to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Create `frontend/Dockerfile.prod`**

```dockerfile
# Build stage
FROM node:25-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Note: `frontend/.dockerignore` already excludes `node_modules` and `dist`, so the build stage installs fresh — good.

- [ ] **Step 3: Build the production image locally**

Run: `cd frontend && docker build -f Dockerfile.prod -t discovery-frontend:test .`
Expected: build succeeds; `npm run build` (tsc + vite build) completes without type errors.

- [ ] **Step 4: Smoke-test the container serves the SPA + deep links**

Run:
```bash
docker run -d --rm -p 8088:80 --name disc-fe-test discovery-frontend:test
curl -fsS http://localhost:8088/ | grep -qi '<div id="root"' && echo "root OK"
curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:8088/projects/some-deep-link   # expect 200 (SPA fallback)
docker stop disc-fe-test
```
Expected: root OK, and the deep link returns `200` (index.html), not 404.

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile.prod frontend/nginx.conf
git commit -m "feat(frontend): production nginx image with SPA fallback"
```

---

## Task 5: `nexlayer.yaml` manifest

**Files:**
- Create: `nexlayer.yaml` (repo root)

Confirm exact `secrets`/`volumes`/`command`/`registryLogin` syntax against the live schema at `https://app.nexlayer.io/schema` before finalizing. The shape below follows the documented model.

- [ ] **Step 1: Create `nexlayer.yaml`**

```yaml
application:
  name: discovery-app
  pods:
    - name: postgres
      image: postgres:15
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: <set-via-secret>
        POSTGRES_DB: discovery_app
      volumes:
        - name: pg-data
          size: 2Gi
          mountPath: /var/lib/postgresql/data

    - name: minio
      image: minio/minio:latest
      command: ["server", "/data", "--console-address", ":9001"]
      servicePorts:
        - 9000
        - 9001
      vars:
        MINIO_ROOT_USER: minioadmin
        MINIO_ROOT_PASSWORD: <set-via-secret>
      volumes:
        - name: minio-data
          size: 5Gi
          mountPath: /data

    - name: backend
      image: ghcr.io/<owner>/discovery-backend:latest
      path: /api
      servicePorts:
        - 8000
      vars:
        DATABASE_URL: postgresql://postgres:<set-via-secret>@postgres.pod:5432/discovery_app
        STORAGE_ENDPOINT_URL: http://minio.pod:9000
        STORAGE_BUCKET_NAME: discovery-files
        STORAGE_ACCESS_KEY: minioadmin
        STORAGE_SECRET_KEY: <set-via-secret>
        SECRET_KEY: <set-via-secret>
        CLAUDE_API_KEY: <set-via-secret>

    - name: frontend
      image: ghcr.io/<owner>/discovery-frontend:latest
      path: /
      servicePorts:
        - 80
```

Replace `<owner>` with the GitHub org/user. Move every `<set-via-secret>` value into Nexlayer's `secrets` mechanism (dashboard or CLI) rather than committing real values. If the GHCR packages are private, add `application.registryLogin` with `registry: ghcr.io`, `username`, and a `personalAccessToken`.

- [ ] **Step 2: Validate the manifest**

If the Nexlayer CLI is installed: `nexlayer validate nexlayer.yaml` (or the current equivalent). Otherwise lint YAML syntax: `python -c "import yaml,sys; yaml.safe_load(open('nexlayer.yaml')); print('yaml ok')"`.
Expected: no schema/syntax errors.

- [ ] **Step 3: Commit**

```bash
git add nexlayer.yaml
git commit -m "feat: add nexlayer.yaml deployment manifest"
```

---

## Task 6: CI — build & push images to GHCR

**Files:**
- Create: `.github/workflows/build-images.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Build & Push Images

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: discovery-backend
            context: .
            dockerfile: backend/Dockerfile
          - name: discovery-frontend
            context: frontend
            dockerfile: frontend/Dockerfile.prod
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push ${{ matrix.name }}
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.dockerfile }}
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/${{ matrix.name }}:latest
            ghcr.io/${{ github.repository_owner }}/${{ matrix.name }}:${{ github.sha }}
```

Note: backend build context is the repo root (`.`) because `backend/Dockerfile` does `COPY backend /app`; the frontend context is `frontend`.

- [ ] **Step 2: Validate workflow YAML syntax**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/build-images.yml')); print('workflow yaml ok')"`
Expected: `workflow yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build-images.yml
git commit -m "ci: build and push backend/frontend images to GHCR"
```

---

## Task 7: Deploy docs + push to trigger CI

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append a "Deploy to Nexlayer" section to `README.md`**

Document: (1) CI builds images to GHCR on push to `main`; (2) edit `nexlayer.yaml` `<owner>` and set secrets in Nexlayer; (3) run `nexlayer deploy nexlayer.yaml`; (4) **verification:** after deploy, `curl https://<domain>/api/health` should return `{"status":"ok"}`; (5) **fallback** if `/api/health` 404s (Nexlayer strips the path prefix): remove the real `/api` router prefix in `main.py` and instead pass `root_path="/api"` to `FastAPI(...)`, rebuild, redeploy.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Nexlayer deploy + /api verification steps"
```

- [ ] **Step 3: Push the branch and open a PR (do NOT merge without user direction)**

```bash
git push -u origin nexlayer-deploy
```
Then create a PR. After merge to `main`, the workflow builds and pushes both images; confirm the GHCR packages appear and tags are correct.

- [ ] **Step 4: Post-deploy verification (run by the user)**

After `nexlayer deploy`:
- `curl https://<domain>/api/health` → `{"status":"ok"}` (confirms the `/api` prefix routing assumption; otherwise apply the Task 7 Step 1 fallback).
- Load `https://<domain>/` → SPA renders; a deep link reloads without 404.
- Exercise one authenticated flow (login → create client) to confirm DB and same-origin API work.
- Upload a file to confirm MinIO storage works.

---

## Verification Checklist (acceptance criteria)

- [ ] All backend routes served under `/api`; `pytest -q` green.
- [ ] `/api/health` returns 200 in compose and in the deployed environment.
- [ ] Frontend prod image builds, serves SPA, deep links fall back to `index.html`.
- [ ] Frontend uses relative `/api` with no CORS config in production.
- [ ] `nexlayer.yaml` validates; secrets are not committed.
- [ ] CI pushes both images to GHCR on push to `main`.
- [ ] `docker compose up` still works for local dev (Vite dev server + `/api` proxy).
- [ ] Frontend test suite (`npm run test`) green.
