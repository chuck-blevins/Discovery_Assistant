# Discovery_app — Local development

Quick reference for running the backend with Docker and migrations.

Prerequisites
- Docker and Docker Compose v2 installed
- (Optional) Python 3.14 venv for running tests locally

Setup
1. Copy the environment sample into a real env file:

   cp backend/.env.sample backend/.env

2. Edit `backend/.env` and set `SECRET_KEY` (do not commit this file).

Common commands (from repo root)
- Build and start services (detached):

  make start

- Run Alembic migrations (one-shot service):

  make migrate

- Stop and remove services:

  make stop

- Follow backend logs:

  make logs

- Run tests locally (requires dependencies installed in `backend`):

  make test

Notes
- The Docker image installs Python dependencies from `backend/requirements.txt`.
- `backend/requirements.txt` pins `SQLAlchemy==2.0.46` for Python 3.14 compatibility.
- `docker-compose.yml` includes a `migrate` service that runs `alembic upgrade head`.

If you want, I can also add a small `docs/dev.md` with more detail or set up a CI job to run migrations during deployment.
