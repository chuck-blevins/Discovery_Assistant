# Nexlayer Deployment — Design Spec

**Date:** 2026-06-24
**Status:** Approved (design); pending implementation plan
**Goal:** Refactor the Discovery App so it can be deployed to Nexlayer from a single `nexlayer.yaml` manifest, with production-grade container images built and pushed by CI.

---

## 1. Context

Discovery App is a full-stack application currently wired for local `docker compose` development:

- **Backend** — FastAPI (Python 3.14), async SQLAlchemy + asyncpg over PostgreSQL, object storage via boto3 against MinIO (dev) / S3 (prod). Alembic migrations run on container start via `backend/scripts/docker-entrypoint.sh`, then `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Routers are registered in `backend/app/main.py` using **explicit full paths** (e.g. `/projects/{id}/data-sources/upload`), not a uniform prefix. The MinIO bucket auto-creates on startup in the FastAPI `lifespan` handler.
- **Frontend** — Vite/React 19 SPA (React Router 7). API base URL comes from `import.meta.env.VITE_API_URL ?? 'http://localhost:8000'`, used in `frontend/src/api/client.ts` and `frontend/src/lib/api.ts`. The Docker image currently runs the **Vite dev server** (not a production build).
- **Infra (compose)** — `postgres:15`, `minio/minio`, backend, frontend, plus a one-off `migrate` profile.

### Nexlayer deployment model (verified from docs)

- Nexlayer **pulls pre-built images** from a registry (Docker Hub public or GHCR). It does **not** build from source. Private images use `application.registryLogin`.
- A single `nexlayer.yaml` defines all `pods`. Each pod: `name`, `image`, `path` (public URL route), `servicePorts`, `vars` (env), `volumes` (`name`/`size`/`mountPath`), `secrets`, and (where supported) `command`.
- Pods reach each other over internal DNS: `<pod-name>.pod:<port>` (e.g. `postgres.pod:5432`, `minio.pod:9000`).
- Public traffic is routed on **one domain by path**: e.g. frontend at `path: /`, backend at `path: /api`.
- **Open question (unresolved in docs):** whether Nexlayer **strips** the matched `path` prefix before forwarding to the pod. See §6 risk + verification.

---

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Stateful services | **Postgres + MinIO as Nexlayer pods** with persistent volumes | Self-contained, mirrors compose, no external accounts. Acceptable for this app's scale (single-replica volumes). |
| Deliverable | **`nexlayer.yaml` + production Dockerfiles + GHCR CI**, deploy-ready | User runs `nexlayer deploy`; the agent cannot deploy on their behalf. |
| Frontend ↔ backend wiring | **Native Nexlayer path routing** — frontend `/`, backend `/api`, same origin | Eliminates CORS, absolute URLs, and build-time API-URL coupling. |
| Image registry | **GHCR** | Repo already lives on GitHub; GHCR auth is built into GitHub Actions. |

---

## 3. Architecture

```
                    ┌─────────────── public domain ───────────────┐
   browser ──/────▶  frontend pod  (nginx, static React build, :80)
           ──/api─▶  backend pod   (FastAPI / uvicorn, :8000)
                          │                       │
                     postgres.pod:5432       minio.pod:9000
                     (volume: pg-data)       (volume: minio-data)
```

Four pods:

1. **frontend** — `path: /`, nginx serving the production Vite build with SPA fallback.
2. **backend** — `path: /api`, FastAPI under uvicorn; reaches Postgres and MinIO via internal pod DNS.
3. **postgres** — `postgres:15`, persistent volume at `/var/lib/postgresql/data`.
4. **minio** — `minio/minio:latest`, persistent volume at `/data`.

Same origin for frontend + backend ⇒ no CORS, no absolute API URL, no build-time API-URL coupling.

---

## 4. Component changes

### 4.1 Backend — global `/api` prefix

- In `backend/app/main.py`, introduce a single parent router `api_router = APIRouter(prefix="/api")`, include every existing sub-router into it (auth, clients, projects, data_sources, analyses, artifacts, settings, time_sessions, invoices, webhooks, dashboard, intake), then `app.include_router(api_router)`.
- Move `/health` (and the root `/` info endpoint, if kept) under the prefix → `/api/health`. Concrete edit point: the `docker-compose.yml` backend healthcheck currently hits `http://localhost:8000/health` and must change to `/api/health` (the entrypoint script itself does not reference `/health`).
- The SSE streaming endpoint (`analyze/stream`) must inherit the prefix like every other route — verify it still streams behind the prefix.
- Individual route files are **not** edited (they keep their explicit full paths); only `main.py` registration changes.
- `CORS_ORIGINS` handling stays in place (harmless), but is unnecessary in the Nexlayer single-origin deployment.

### 4.2 Backend — image & runtime

- Existing `backend/Dockerfile` (root build context, `python:3.14-slim`) is already production-shaped and is reused for the GHCR image.
- Existing `backend/scripts/docker-entrypoint.sh` (run Alembic migrations, then uvicorn on `0.0.0.0:8000`) is reused unchanged.
- Env/secrets consumed from the manifest: `DATABASE_URL`, `STORAGE_ENDPOINT_URL`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET_NAME`, `SECRET_KEY`, `CLAUDE_API_KEY`.

### 4.3 Frontend — production build + nginx

- New **production Dockerfile** (multi-stage): build stage runs `npm ci && npm run build`; runtime stage is nginx serving `dist/`.
- nginx config: serve hashed static assets with caching; **SPA fallback** `try_files $uri /index.html` so React Router deep links resolve.
- `BASE_URL` in `frontend/src/api/client.ts` and `frontend/src/lib/api.ts` defaults to **`/api`** (relative, same origin) instead of `http://localhost:8000`.
- Tests that hardcode `http://localhost:8000` (`frontend/src/tests/api/analyses.test.ts`, and the `BASE_URL` defaults) are updated to the new base.
- **Local dev parity:** `docker-compose.yml` keeps the Vite dev server for the frontend. Because dev and prod must share the same `/api` base, this depends on the §4.1 prefix refactor: the dev frontend calls `/api/...`, the Vite `server.proxy` gains an `/api` rule pointing at `http://localhost:8000` (replacing the current `/auth`-only rule), and the dev backend serves `/api/*` exactly as in prod. The planner must keep the `/api` base consistent across dev proxy, prod, and tests.

### 4.4 `nexlayer.yaml`

A single manifest at repo root. Illustrative shape (exact `secrets`/`volumes`/`command` syntax confirmed against the live schema at `https://app.nexlayer.io/schema` during implementation):

```yaml
application:
  name: discovery-app
  pods:
    - name: postgres
      image: postgres:15
      servicePorts: [5432]
      vars:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: <secret>
        POSTGRES_DB: discovery_app
      volumes:
        - { name: pg-data, size: 2Gi, mountPath: /var/lib/postgresql/data }
    - name: minio
      image: minio/minio:latest
      command: ["server", "/data", "--console-address", ":9001"]
      servicePorts: [9000, 9001]
      vars:
        MINIO_ROOT_USER: minioadmin
        MINIO_ROOT_PASSWORD: <secret>
      volumes:
        - { name: minio-data, size: 5Gi, mountPath: /data }
    - name: backend
      image: ghcr.io/<owner>/discovery-backend:latest
      path: /api
      servicePorts: [8000]
      vars:
        DATABASE_URL: postgresql://postgres:<secret>@postgres.pod:5432/discovery_app
        STORAGE_ENDPOINT_URL: http://minio.pod:9000
        STORAGE_BUCKET_NAME: discovery-files
      secrets: [SECRET_KEY, CLAUDE_API_KEY, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, POSTGRES_PASSWORD]
    - name: frontend
      image: ghcr.io/<owner>/discovery-frontend:latest
      path: /
      servicePorts: [80]
```

Notes:
- `STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY` map to the MinIO root user/password and are supplied as secrets.
- Keep `STORAGE_BUCKET_NAME` consistent across the manifest, the backend default in `storage_service.py`/`main.py` (`discovery-files`), and any test fixtures — a value mismatch silently breaks uploads.
- `DATABASE_URL` uses the `postgresql://` scheme; `backend/app/db.py` already rewrites it to `postgresql+asyncpg://`.
- Private GHCR images require `application.registryLogin` (registry/username/personalAccessToken) — added if the packages are not made public.

### 4.5 CI — GHCR build & push

- New GitHub Actions workflow under `.github/workflows/`.
- Trigger: push to `main` (and optionally tags).
- Steps: log in to GHCR with the built-in `GITHUB_TOKEN`; build `discovery-backend` (root context, `backend/Dockerfile`) and `discovery-frontend` (new prod Dockerfile, `frontend/` context); push both tagged with the commit SHA and `latest`.
- Deploy remains manual: user runs `nexlayer deploy nexlayer.yaml`.

---

## 5. Data flow

1. Browser loads `/` → frontend pod serves the SPA.
2. SPA issues API calls to relative `/api/...` (same origin) → Nexlayer routes to the backend pod.
3. Backend reads/writes Postgres at `postgres.pod:5432` and objects at `minio.pod:9000`.
4. On backend start: Alembic migrations run, then the MinIO bucket is ensured in the `lifespan` handler.

---

## 6. Risks & verification

- **`/api` prefix stripping (primary risk).** Nexlayer docs don't state whether the matched `path` prefix is stripped before forwarding.
  - **Default:** implement a *real* `/api` router prefix (works if the full path `/api/...` is forwarded — the common ingress default).
  - **Verification:** after first deploy, hit `<domain>/api/health`. 200 ⇒ correct.
  - **Fallback (one-line):** if it 404s, the prefix is being stripped → remove the real prefix and set FastAPI `root_path="/api"` instead. Isolated to `main.py`.
- **Volume durability.** Single-replica pod volumes; no automated backups. Acceptable per the locked "self-contained" decision; managed DB/S3 is a future option.
- **Secrets syntax.** Confirm Nexlayer's exact `secrets:` declaration and how values are provided (dashboard/CLI) against the live schema before finalizing the manifest.
- **MinIO image command.** Confirm Nexlayer supports the `command`/entrypoint override needed to start MinIO in `server` mode; if not, use an image variant or wrapper that defaults to it.
- **SSE behind ingress.** Confirm the `analyze/stream` Server-Sent Events endpoint streams correctly through Nexlayer's router (no buffering that breaks streaming).

---

## 7. Out of scope (YAGNI)

- Managed Postgres / external S3 migration.
- Autoscaling, multiple replicas, HA.
- Custom domain / TLS configuration beyond Nexlayer defaults.
- External secret-manager integration beyond Nexlayer's native `secrets`.

---

## 8. Acceptance criteria

1. `nexlayer.yaml` exists at repo root and validates against Nexlayer's schema.
2. Production frontend Dockerfile builds the SPA and serves it via nginx with working deep-link fallback.
3. Backend serves all routes under `/api`; `/api/health` returns 200 in the deployed environment.
4. Frontend in production calls relative `/api` and functions with no CORS configuration.
5. CI builds and pushes both images to GHCR on push to `main`.
6. Local `docker compose up` still works for development (Vite dev server + `/api` proxy).
7. Existing backend and frontend test suites pass after the prefix/base-URL changes.
