#!/bin/sh
# Run migrations then start the API. Used as Docker entrypoint.
set -e
cd /app

echo "Waiting for database..."
# Give Postgres a moment after healthcheck passes (accepting connections can lag slightly)
sleep 3
until alembic upgrade head; do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done
echo "Migrations complete."

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
