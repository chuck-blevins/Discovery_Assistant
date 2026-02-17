"""
DATABASE CONFIGURATION AND ENGINE SETUP

================================================================================
FOR NON-TECHNICAL REVIEWERS:
================================================================================

What does this file do?

1. CREATES THE DATABASE CONNECTION
   - Connects Python application to PostgreSQL database
   - Like picking up a phone to call a specific person
   - Once connected, we can query data, insert records, update records, delete records

2. MANAGES DATABASE SESSIONS
   - A \"session\" is a conversation with the database
   - Each API request gets its own session
   - Session auto-closes when request finishes
   - Like opening/closing a phone call

3. PROVIDES THE BASE FOR ALL DATABASE MODELS
   - All tables (User, Project, etc.) inherit from \"Base\"
   - Base is the parent class for all data models
   - When Alembic runs, it looks at Base.metadata to find all tables

Why this architecture?
- ASYNC (asynchronous): Can handle many requests simultaneously
- CONNECTION POOLING: Reuses database connections (faster, cheaper)
- TYPE SAFETY: Python knows what data types to expect
- DEPENDENCY INJECTION: FastAPI automatically provides sessions to routes

Flow of a typical request:
1. User makes HTTP request to API endpoint
2. FastAPI creates a new database session
3. Endpoint receives session via dependency injection (get_db)
4. Endpoint queries/updates database using session
5. Session closes (changes committed or rolled back)
6. HTTP response sent to user

===============================================================================
"""

import os  # For reading environment variables
from typing import AsyncGenerator  # For async functions that yield

from sqlalchemy import create_engine  # Non-async engine factory (unused, kept for reference)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base  # Declarative base class

# ============================================================================
# DATABASE URL CONFIGURATION
# ============================================================================
# Environment variable: DATABASE_URL
# Default (local development): PostgreSQL on localhost
# Format: postgresql://username:password@host:port/database
#
# For production, set via environment variable:
# $ export DATABASE_URL=\"postgresql://user:pass@prod-server.com/proddb\"
#
# LOCAL DEVELOPMENT DEFAULT:
# - Host: localhost (your local machine)
# - Port: 5432 (PostgreSQL default port)
# - User: postgres (PostgreSQL admin user)
# - Password: password123 (dev password - NEVER use in production!)
# - Database: discovery_app (our database name)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password123@localhost:5432/discovery_app"
)

# ============================================================================
# CONVERT TO ASYNC URL (For async database operations)
# ============================================================================
# PostgreSQL has two Python drivers:
# 1. psycopg2: Synchronous (old style, one request at a time)
# 2. asyncpg: Asynchronous (new style, many requests simultaneously)
#
# We're using asyncpg for better performance
# asyncpg requires the \"postgresql+asyncpg://\" URL scheme
# This line converts \"postgresql://\" to \"postgresql+asyncpg://\"
#
# Example transformation:
# IN:  postgresql://postgres:password123@localhost:5432/discovery_app
# OUT: postgresql+asyncpg://postgres:password123@localhost:5432/discovery_app
#
# The asyncpg driver is much faster than psycopg2 for async applications

ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# ============================================================================
# ASYNC ENGINE - The database connection manager
# ============================================================================
# What is an \"engine\"?
# - Manages the connection pool (group of reusable database connections)
# - Handles connection lifecycle (create, reuse, close)
# - Executes SQL statements
#
# Configuration parameters:
# - echo=False: Don't print SQL queries to console (set True for debugging)
# - future=True: Use SQLAlchemy 2.0 style (modern, recommended)
# - pool_pre_ping=True: Test connection before using it (ensures connection alive)
#
# Connection pooling benefit:
# Without pooling:
#   1. Request arrives
#   2. Create new connection (slow, ~100ms)
#   3. Execute query (fast, ~10ms)
#   4. Close connection
#   Total: ~110ms
#
# With pooling:
#   1. Request arrives
#   2. Reuse existing connection (instant, ~1ms)
#   3. Execute query (fast, ~10ms)
#   4. Return connection to pool(~1ms)
#   Total: ~12ms (10x faster!)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,  # Set to True to debug SQL queries
    future=True,  # Use modern SQLAlchemy 2.0 behavior
    pool_pre_ping=True,  # Test connection before using
)

# ============================================================================
# ASYNC SESSION FACTORY - Creates database sessions for each request
# ============================================================================
# What is a \"session\"?
# - Represents one conversation with the database
# - All queries within a session use the same connection
# - Session groups related changes together (transaction)
# - After session closes, changes are automatically committed
#
# Configuration parameters:
# - async_engine: Which async engine to use
# - class_=AsyncSession: Use async-capable session
# - expire_on_commit=False: Keep objects valid after commit
#
# Lifecycle of a session:
# 1. Request arrives at API endpoint
# 2. Session created from factory (\"Establish connection\")
# 3. Endpoint gets session via get_db() dependency
# 4. Endpoint executes queries (\"Have conversation\")
# 5. Session closes (\"Hang up phone\")
# 6. Changes automatically committed to database

AsyncSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

# ============================================================================
# DECLARATIVE BASE - Parent class for all database models
# ============================================================================
# What is the \"Base\" class?
# - Parent class that all database models inherit from
# - Marks a class as a database table
# - When you create a User class: class User(Base)
# - SQLAlchemy knows to map it to a database table
#
# How it's used:
# class User(Base):
#     __tablename__ = \"users\"
#     id: Mapped[UUID] = mapped_column(...)
#     email: Mapped[str] = mapped_column(...)
#
# SQLAlchemy automatically:
# 1. Creates table metadata (column names, types, constraints)
# 2. Maps User.id to database column 'id'
# 3. Maps User.email to database column 'email'
# 4. Provides save/delete/query functionality
#
# Alembic uses Base.metadata to find all tables:
# - Alembic scans all Python files
# - Finds classes inheriting from Base
# - Uses them to generate migrations
# - Without Base, Alembic wouldn't know what tables exist!

Base = declarative_base()

# ============================================================================
# IMPORT ALL MODELS - Register them with Alembic
# ============================================================================
# THIS IS CRITICAL FOR MIGRATIONS
#
# Why import models here?
# - When Alembic runs, it imports this file (app/db.py)
# - The import statement below executes
# - That loads app.models.__init__
# - Which imports User model
# - Which adds User to Base.metadata
# - Alembic can now see the User table!
#
# If you don't import models here:
# - Alembic won't know about new tables
# - Migrations won't be generated
# - You'll lose database schema consistency

from app import models  # noqa: F401, E402


# ============================================================================
# DATABASE SESSION DEPENDENCY - For FastAPI endpoints
# ============================================================================
# What is dependency injection?
# - FastAPI automatically provides dependencies to endpoint functions
# - Instead of manually creating sessions, FastAPI handles it
# - Your endpoint just declares: async def endpoint(db: AsyncSession = Depends(get_db))
#
# How it works:
# 1. FastAPI sees: db: AsyncSession = Depends(get_db)
# 2. FastAPI calls get_db() to get a session
# 3. FastAPI passes session to your endpoint
# 4. Endpoint uses session (async with auto-management)
# 5. When endpoint finishes, get_db() cleans up
#
# Cleanup automatically:
# - Session closes (even if endpoint raises exception)
# - Changes committed to database
# - Connection returned to pool
#
# Example usage in an endpoint:
# @app.get(\"/users/{user_id}\")
# async def get_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
#     # db is a ready-to-use database session
#     user = await db.get(User, user_id)
#     return user

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    DATABASE SESSION DEPENDENCY FOR FASTAPI
    
    This function provides database sessions to FastAPI endpoints.
    
    FastAPI LIFECYCLE for each request:
    1. Request arrives at endpoint
    2. FastAPI sees: db: AsyncSession = Depends(get_db)
    3. FastAPI calls this function: get_db()
    4. \"async with\" creates a session
    5. \"yield\" gives session to endpoint
    6. Endpoint runs (can query/update database)
    7. When endpoint finishes, code after yield runs
    8. \"finally: await session.close()\" cleans up
    
    The try/finally ensures cleanup even if endpoint raises exception.
    This is critical - a leaked database connection locks resources!
    
    Usage in an endpoint:
    @app.get(\"/\")
    async def root(db: AsyncSession = Depends(get_db)):
        # db is passed automatically by FastAPI
        users = await db.execute(select(User))
        return {\"users\": users.scalars().all()}
    
    Parameters:
    - None (function doesn't take input parameters)
    
    Yields:
    - AsyncSession: A database session ready to use
    
    Type hint:
    - AsyncGenerator[AsyncSession, None]
    - AsyncGenerator = async function that yields values
    - AsyncSession = the type of value yielded
    - None = no return type (fastapi doesn't use return value)
    """
    async with AsyncSessionLocal() as session:  # Create a new session
        try:
            yield session  # Give session to endpoint
        finally:
            await session.close()  # Clean up (guaranteed to run)

