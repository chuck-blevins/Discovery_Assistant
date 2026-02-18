SHELL := /bin/zsh

.PHONY: start stop migrate logs test shell

start:
	docker compose up --build -d

stop:
	docker compose down

migrate:
	# Runs Alembic migrations in a one-shot container
	docker compose run --rm migrate

logs:
	docker compose logs -f backend

test:
	# Run tests in the backend folder (assumes local venv or deps installed)
	cd backend && pytest -q

shell:
	# Open a shell inside the backend service
	docker compose run --rm backend /bin/sh
