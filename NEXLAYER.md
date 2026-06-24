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
An AI-powered product discovery platform designed for consulting workflows to manage clients through ICP definition, persona buildout, and research analysis.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Python | language | unknown | backend/Dockerfile |
| PostgreSQL | database | 15 | docker-compose.yml |
| MinIO | infra | latest | docker-compose.yml |
| TypeScript | language | unknown | tsconfig.json |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- backend/ — Python API for business logic and AI orchestration
- frontend/ — User interface for client and project management
- docs/ — Application documentation and user guides
- sboms/ — Software Bill of Materials
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
| `backend` | `ACCESS_TOKEN_EXPIRE_MINUTES` | _(set via Nexlayer dashboard)_ | secret |
| `backend` | `DATABASE_HOST` | `"db"` | plain |
| `backend` | `DATABASE_PORT` | `"5432"` | plain |
| `backend` | `DATABASE_URL` | `"postgresql://app:secret@${postgres:5432}/app"` | inter-pod |
| `backend` | `POSTGRES_DB` | `"discovery_app"` | plain |
| `backend` | `POSTGRES_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |
| `backend` | `POSTGRES_USER` | `"postgres"` | plain |
| `backend` | `SECRET_KEY` | _(set via Nexlayer dashboard)_ | secret |
| `backend` | `SMTP_HOST` | `"localhost"` | plain |
| `backend` | `SMTP_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |
| `backend` | `SMTP_PORT` | `"1025"` | plain |
| `backend` | `SMTP_USER` | `""` | plain |
| `frontend` | `API_URL` | `"http://${backend:8000}"` | inter-pod |
| `frontend` | `NEXT_PUBLIC_API_URL` | `"http://${backend:8000}"` | inter-pod |
| `frontend` | `VITE_API_URL` | `"http://${backend:8000}"` | inter-pod |
| `postgres` | `POSTGRES_DB` | `"app"` | plain |
| `postgres` | `POSTGRES_PASSWORD` | _(set via Nexlayer dashboard)_ | secret |
| `postgres` | `POSTGRES_USER` | `"app"` | plain |

### Secrets Required

Set these in the Nexlayer dashboard before deploying:

- `ACCESS_TOKEN_EXPIRE_MINUTES` (`backend` pod)
- `POSTGRES_PASSWORD` (`backend` pod)
- `SECRET_KEY` (`backend` pod)
- `SMTP_PASSWORD` (`backend` pod)
- `POSTGRES_PASSWORD` (`postgres` pod)

### nexlayer.yaml

```yaml
application:
  name: fine-peak-discovery_assistant
  pods:
    - name: backend
      image: "registry.nexlayer.io/user_01krc13rb1z2ng6b0bdm6h6wab/discovery_assistant-backend:19efaa9dcdc"
      path: /api
      servicePorts:
        - 8000
      vars:
        ACCESS_TOKEN_EXPIRE_MINUTES: "60"
        DATABASE_HOST: "db"
        DATABASE_PORT: "5432"
        DATABASE_URL: "postgresql://app:secret@${postgres:5432}/app"
        POSTGRES_DB: "discovery_app"
        POSTGRES_PASSWORD: "postgres"
        POSTGRES_USER: "postgres"
        SECRET_KEY: "replace-this-with-a-secure-random-string"
        SMTP_HOST: "localhost"
        SMTP_PASSWORD: ""
        SMTP_PORT: "1025"
        SMTP_USER: ""
    - name: frontend
      image: "registry.nexlayer.io/user_01krc13rb1z2ng6b0bdm6h6wab/discovery_assistant-frontend:19efaa9dcdc"
      path: /
      servicePorts:
        - 3000
      vars:
        API_URL: "http://${backend:8000}"
        NEXT_PUBLIC_API_URL: "http://${backend:8000}"
        VITE_API_URL: "http://${backend:8000}"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_DB: "app"
        POSTGRES_PASSWORD: "secret"
        POSTGRES_USER: "app"
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
**Last deployed:** 2026-06-24T17:33:56Z  
**Live URL:** https://flamboyant-goshawk-fine-peak-discovery-assistant.cloud.nexlayer.ai  
**Runtime:** multi · **Port:** 8000  
**Deploy branch:** main  

```yaml
application:
  name: fine-peak-discovery_assistant
  pods:
    - name: backend
      image: "registry.nexlayer.io/user_01krc13rb1z2ng6b0bdm6h6wab/discovery_assistant-backend:19efaa9dcdc"
      path: /api
      servicePorts:
        - 8000
      vars:
        ACCESS_TOKEN_EXPIRE_MINUTES: "60"
        DATABASE_HOST: "db"
        DATABASE_PORT: "5432"
        DATABASE_URL: "postgresql://app:secret@${postgres:5432}/app"
        POSTGRES_DB: "discovery_app"
        POSTGRES_PASSWORD: "postgres"
        POSTGRES_USER: "postgres"
        SECRET_KEY: "replace-this-with-a-secure-random-string"
        SMTP_HOST: "localhost"
        SMTP_PASSWORD: ""
        SMTP_PORT: "1025"
        SMTP_USER: ""
    - name: frontend
      image: "registry.nexlayer.io/user_01krc13rb1z2ng6b0bdm6h6wab/discovery_assistant-frontend:19efaa9dcdc"
      path: /
      servicePorts:
        - 3000
      vars:
        API_URL: "http://${backend:8000}"
        NEXT_PUBLIC_API_URL: "http://${backend:8000}"
        VITE_API_URL: "http://${backend:8000}"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_DB: "app"
        POSTGRES_PASSWORD: "secret"
        POSTGRES_USER: "app"
```
<!-- nexlayer:end -->

## Build History
<!-- nexlayer:section agent-managed=build_history -->
| Date | Status | Notes |
|------|--------|-------|
| 2026-06-24T17:25:25Z | analyzed | initial repo analysis |
| 2026-06-24T17:33:56Z | success | deployed https://flamboyant-goshawk-fine-peak-discovery-assistant.cloud.nexlayer.ai |
<!-- nexlayer:end -->
