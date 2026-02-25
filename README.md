# Discovery App — Local development

Run the API, Postgres, and MinIO with Docker.

**Prerequisites:** Docker and Docker Compose v2.

**Setup**

1. Copy the env sample and set required values:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and set at least:
   - `SECRET_KEY` (e.g. `openssl rand -hex 32`)
   - `CLAUDE_API_KEY` (for analysis features)

**Deploy with Docker (from repo root)**

```bash
make start
```

- **API:** http://localhost:8000 (docs: http://localhost:8000/docs)
- **MinIO console:** http://localhost:9001 (minioadmin / minioadmin)
- **Postgres:** localhost:5432, user `postgres`, password `postgres`, db `discovery_app`

The backend container runs migrations on startup, then starts uvicorn. No need to run `make migrate` unless you use the optional migrate service.

**Commands**

| Command   | Description                    |
|----------|---------------------------------|
| `make start`  | Build and start all services (detached) |
| `make stop`   | Stop and remove containers      |
| `make logs`   | Follow backend logs             |
| `make migrate`| Run migrations only (optional; profile `tools`) |
| `make shell`  | Shell into backend container    |
| `make test`   | Run pytest in backend (local venv) |

**Notes**

- Backend uses Python 3.12 in Docker. Storage (MinIO) is configured via compose; override `CORS_ORIGINS` in `backend/.env` if the frontend runs on a different origin.
- Frontend: run separately (`cd frontend && npm run dev`). Set `VITE_API_URL=http://localhost:8000` if needed.
