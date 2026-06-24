# Nexlayer — Discovery_Assistant

<!-- nexlayer:meta version=1 analyzed=2026-06-24T17:25:25Z repo=https://github.com/chuck-blevins/Discovery_Assistant branch=main -->

> **For AI agents (Claude Code, Cursor, Gemini CLI, Copilot):**
> This file is the **project context** for this Nexlayer deployment — tech stack, env vars, secrets, live URL.
> For full platform detail (nexlayer.yaml schema, Dockerfile rules, CI/CD, task recipes) read **`nexlayer.skills`** in this repo.
>
> **Critical rules (full detail in `nexlayer.skills`):**
> - Inter-pod refs: `${podName:port}` only — never `localhost` or bare hostnames
> - Docker Hub images: prefix with `mirror.gcr.io/library/` — bare tags fail on the cluster
> - Secrets: set in the Nexlayer dashboard — never commit to `nexlayer.yaml` or Dockerfile
>
> **This file:** `agent-managed` sections update automatically. `user-editable` sections (Local Development Setup, Nexlayer Deployment Plan, Build Notes) are yours — preserved across re-analysis.

## Project Summary
<!-- nexlayer:section agent-managed=project_summary -->
An AI-powered product discovery platform for consulting workflows that manages the lifecycle of ICP definition, persona buildout, and positioning through AI-assisted analysis of research data.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Python | language | Not specified | backend/Dockerfile |
| PostgreSQL | database | 15 | docker-compose.yml |
| MinIO | infra | latest | docker-compose.yml |
| FastAPI/Python Backend | framework | Not specified | docker-compose.yml |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- backend/ — Python API and business logic
- frontend/ — Client-side application
- docs/ — User guides and documentation
- nexlayer.yaml — Nexlayer platform configuration
<!-- nexlayer:end -->

## External Services Required
<!-- nexlayer:section agent-managed=external_deps -->
Services that must be configured separately (not deployed by Nexlayer):

- Anthropic Claude API (CLAUDE_API_KEY)
- LangSmith (LANGSMITH_API_KEY)
<!-- nexlayer:end -->

## Local Development Setup
<!-- nexlayer:section user-editable=local_setup -->
### Prerequisites

- Docker
- Docker Compose
- Python 3.10+
- Node.js

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
SECRET_KEY=your-secret
CLAUDE_API_KEY=your-key
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/discovery_app
STORAGE_ENDPOINT_URL=http://minio:9000
```

### Steps

1. `cp backend/.env.sample backend/.env` — Configure environment variables
2. `docker compose up --build` — Build and start all services including DB and MinIO

<!-- nexlayer:end -->

## Nexlayer Setup
<!-- nexlayer:section agent-managed=nexlayer_setup -->
### Pod Environment Variables

| Pod | Variable | Value | Kind |
|-----|----------|-------|------|
| `backend` | `DATABASE_URL` | `"postgresql+asyncpg://postgres:postgres@postgres.pod:5432/discovery_app"` | plain |
| `backend` | `STORAGE_ENDPOINT_URL` | `"http://minio.pod:9000"` | plain |
| `backend` | `S3_ENDPOINT_URL` | `"http://minio.pod:9000"` | plain |
| `backend` | `STORAGE_ACCESS_KEY` | `"minioadmin"` | plain |
| `backend` | `STORAGE_SECRET_KEY` | _(set via Nexlayer dashboard)_ | secret |
| `backend` | `AWS_ACCESS_KEY_ID` | `"minioadmin"` | plain |
| `backend` | `AWS_SECRET_ACCESS_KEY` | _(set via Nexlayer dashboard)_ | secret |
| `backend` | `STORAGE_BUCKET_NAME` | `"discovery-files"` | plain |
| `backend` | `S3_BUCKET_NAME` | `"discovery-app"` | plain |
| `backend` | `CORS_ORIGINS` | `"<% URL %>"` | plain |
| `postgres` | `POSTGRES_USER` | `postgres` | plain |
| `postgres` | `POSTGRES_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |
| `postgres` | `POSTGRES_DB` | `discovery_app` | plain |
| `discovery-assistant-postgres-data` | `size` | `10Gi` | plain |
| `discovery-assistant-postgres-data` | `mountPath` | `/var/lib/postgresql/data` | plain |
| `minio` | `command` | `"server /data --console-address :9001"` | plain |
| `minio` | `MINIO_ROOT_USER` | `minioadmin` | plain |
| `minio` | `MINIO_ROOT_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |
| `discovery-assistant-minio-data` | `size` | `10Gi` | plain |
| `discovery-assistant-minio-data` | `mountPath` | `/data` | plain |

### Secrets Required

Set these in the Nexlayer dashboard before deploying:

- `STORAGE_SECRET_KEY` (`backend` pod)
- `AWS_SECRET_ACCESS_KEY` (`backend` pod)
- `POSTGRES_PASSWORD` (`postgres` pod)
- `MINIO_ROOT_PASSWORD` (`minio` pod)

### nexlayer.yaml

```yaml
application:
  name: discovery-assistant
  pods:
    - name: backend
      image: "registry.nexlayer.io/user_01krc13rb1z2ng6b0bdm6h6wab/discovery_assistant:19efb81bc70"
      path: /
      servicePorts:
        - 8000
      vars:
        DATABASE_URL: "postgresql+asyncpg://postgres:postgres@postgres.pod:5432/discovery_app"
        STORAGE_ENDPOINT_URL: "http://minio.pod:9000"
        S3_ENDPOINT_URL: "http://minio.pod:9000"
        STORAGE_ACCESS_KEY: "minioadmin"
        STORAGE_SECRET_KEY: "minioadmin"
        AWS_ACCESS_KEY_ID: "minioadmin"
        AWS_SECRET_ACCESS_KEY: "minioadmin"
        STORAGE_BUCKET_NAME: "discovery-files"
        S3_BUCKET_NAME: "discovery-app"
        CORS_ORIGINS: "<% URL %>"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: discovery_app
      volumes:
        - name: discovery-assistant-postgres-data
          size: 10Gi
          mountPath: /var/lib/postgresql/data
    - name: minio
      image: mirror.gcr.io/library/minio/minio:latest
      servicePorts:
        - 9000
        - 9001
      command: "server /data --console-address :9001"
      vars:
        MINIO_ROOT_USER: minioadmin
        MINIO_ROOT_PASSWORD: minioadmin
      volumes:
        - name: discovery-assistant-minio-data
          size: 10Gi
          mountPath: /data
```
<!-- nexlayer:end -->

## Nexlayer Deployment Plan
<!-- nexlayer:section user-editable=deployment_plan -->
### Pod Topology

| Pod | Image | Port | Role |
|-----|-------|------|------|
| db | mirror.gcr.io/library/postgres:15 | 5432 | database |
| minio | mirror.gcr.io/library/minio:latest | 9000 | infra |
| backend | chuck-blevins/discovery-assistant-backend:latest | 8000 | worker |
| frontend | chuck-blevins/discovery-assistant-frontend:latest | 5173 | web |

### Deployment notes

- Backend communicates with database via db.pod:5432
- Backend communicates with object storage via minio.pod:9000
- Frontend communicates with backend via backend.pod:8000
- All Docker Hub images are mirrored via mirror.gcr.io to comply with platform rules

<!-- nexlayer:end -->

## Build Notes
<!-- nexlayer:section user-editable=build_notes -->
<!-- Add notes for future builds here — preserved across re-analysis -->
<!-- nexlayer:end -->

## Nexlayer Configuration
<!-- nexlayer:section agent-managed=nexlayer_config -->
**Last deployed:** 2026-06-24T21:28:34Z  
**Live URL:** https://flamboyant-goshawk-discovery-assistant.cloud.nexlayer.ai  
**Runtime:**  · **Port:** auto-detected  
**Deploy branch:** nexlayer  

```yaml
application:
  name: discovery-assistant
  pods:
    - name: backend
      image: "registry.nexlayer.io/user_01krc13rb1z2ng6b0bdm6h6wab/discovery_assistant:19efb81bc70"
      path: /
      servicePorts:
        - 8000
      vars:
        DATABASE_URL: "postgresql+asyncpg://postgres:postgres@postgres.pod:5432/discovery_app"
        STORAGE_ENDPOINT_URL: "http://minio.pod:9000"
        S3_ENDPOINT_URL: "http://minio.pod:9000"
        STORAGE_ACCESS_KEY: "minioadmin"
        STORAGE_SECRET_KEY: "minioadmin"
        AWS_ACCESS_KEY_ID: "minioadmin"
        AWS_SECRET_ACCESS_KEY: "minioadmin"
        STORAGE_BUCKET_NAME: "discovery-files"
        S3_BUCKET_NAME: "discovery-app"
        CORS_ORIGINS: "<% URL %>"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: discovery_app
      volumes:
        - name: discovery-assistant-postgres-data
          size: 10Gi
          mountPath: /var/lib/postgresql/data
    - name: minio
      image: mirror.gcr.io/library/minio/minio:latest
      servicePorts:
        - 9000
        - 9001
      command: "server /data --console-address :9001"
      vars:
        MINIO_ROOT_USER: minioadmin
        MINIO_ROOT_PASSWORD: minioadmin
      volumes:
        - name: discovery-assistant-minio-data
          size: 10Gi
          mountPath: /data
```
<!-- nexlayer:end -->

## Build History
<!-- nexlayer:section agent-managed=build_history -->
| Date | Status | Notes |
|------|--------|-------|
| 2026-06-24T21:21:15Z | analyzed | initial repo analysis |
| 2026-06-24T21:28:34Z | success | deployed https://flamboyant-goshawk-discovery-assistant.cloud.nexlayer.ai |
<!-- nexlayer:end -->

