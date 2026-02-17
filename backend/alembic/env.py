"""Alembic environment configuration."""
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the backend directory to Python path so we can import app
backend_dir = str(Path(__file__).parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the Base metadata from app
from app.db import Base

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password123@localhost:5432/discovery_app")
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Set target metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    \"\"\"
    OFFLINE MODE - Generate migration SQL without connecting to database
    
    FOR NON-TECHNICAL REVIEWERS:
    - Generates SQL scripts without connecting to actual database
    - Good for: Security audits, code review, firewalled environments
    
    Use cases:
    - Production: Generate SQL, review, then execute
    - Security teams: Review all SQL before changes
    - Firewalled DBs: Generate script, transfer securely
    \"\"\"
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    \"\"\"
    ONLINE MODE - Connect to database and apply migrations directly
    
    FOR NON-TECHNICAL REVIEWERS:
    - Connects to actual database
    - Automatically creates/updates all tables (users, projects, etc.)
    - Used in development, testing, and automated deployments
    - Instant feedback - see migrations applied immediately
    
    How it works:
    1. Opens connection to PostgreSQL database
    2. Reads all migration files
    3. Determines which migrations haven't been applied yet
    4. Executes migration SQL against the database
    5. Closes connection gracefully
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
