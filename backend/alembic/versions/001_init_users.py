"""
Initial migration: Create users table (Version 001).

Revision ID: 001_init_users
Revises: (None - this is the first migration)
Create Date: 2026-02-17
Created for: User authentication and account management

================================================================================
FOR NON-TECHNICAL REVIEWERS:
================================================================================
A database migration is like version control for a database (similar to Git).
This file defines the FIRST change to our database structure.

WHAT THIS FILE DOES:
- Creates a 'users' table that stores user account information
- Defines 5 columns: id, email, password_hash, created_at, updated_at
- Sets up rules: emails must be unique, passwords encrypted, timestamps tracked

WHY WE NEED THIS:
- Every user account needs a secure place to store their information
- Passwords are encrypted (not stored in plain text) for security
- We track when accounts are created/modified for compliance & troubleshooting

HOW IT WORKS:
- upgrade(): Creates the users table (moving database forward)
- downgrade(): Removes the users table (rolling database back if needed)
- This reversibility makes it safe to test and debug database changes

WHEN IT RUNS:
- Automatically on application startup if the table doesn't exist
- Part of the database initialization sequence

NEXT STEPS IN MIGRATION CHAIN:
- 001_init_users.py ← YOU ARE HERE (First migration)
- 002_add_user_roles.py (will be created later)
- 003_add_user_profile.py (will be created later)
- ... and so on

================================================================================
"""

# ============================================================================
# IMPORTS: Tools we need to create/modify database structures
# ============================================================================
from alembic import op  # op = Alembic operations (create table, add column, etc.)
import sqlalchemy as sa  # sa = SQLAlchemy (Python's database library)
from sqlalchemy.dialects import postgresql  # PostgreSQL-specific types (like UUID)

# ============================================================================
# MIGRATION METADATA: Alembic tracking information
# ============================================================================
# These variables tell Alembic:
# - Which version this is: "001_init_users"
# - What came before: None (this is the first one)
# - What branch it's on: None (not using branches)
# - What it depends on: None (no dependencies)

revision = "001_init_users"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    CREATE THE USERS TABLE (upgrade / move forward to version 001)
    
    This function runs when the database needs to be initialized or upgraded.
    It creates the 'users' table that will store all user account data.
    
    ========================================================================
    SCHEMA DEFINITION - What data goes in the users table
    ========================================================================
    
    The table has 5 columns (fields):
    
    1. id (User Identifier)
       - Type: UUID (Universal Unique Identifier - a 128-bit unique number)
       - Unique: Yes (no two users share an id)
       - Purpose: Primary key - the main way we identify each user
       - Why UUID: Guaranteed unique across the entire system (databases, servers, etc.)
       - Auto-generated: Yes (created automatically when user signs up)
       - Real example: "550e8400-e29b-41d4-a716-446655440000"
    
    2. email (Login Email Address)
       - Type: String up to 255 characters
       - Unique: Yes (no duplicate emails allowed)
       - Purpose: How users log in (e.g., \"chuck@discoveryapp.com\")
       - Indexed: Yes (fast lookup for login authentication)
       - Never empty: No (every user must have an email)
       - Real example: \"user@example.com\"
    
    3. password_hash (Encrypted Password)
       - Type: String up to 255 characters  
       - Unique: No (multiple users can have same password hash if passwords are same)
       - Purpose: Store password securely using one-way encryption (hash)
       - Security: Cannot be decrypted back to original password (one-way hash)
       - Purpose: Verify user's password during login without storing plaintext
       - Real example: \"$2b$12$abcdefghijklmnopqrstuvwxyz...\" (bcrypt hash)
    
    4. created_at (Account Creation Timestamp)
       - Type: DateTime (date + time) with timezone
       - Purpose: Record when account was created
       - Auto-generated: Yes (set automatically on signup)
       - Timezone-aware: Yes (stores timezone info for global apps)
       - Used for: Compliance, analytics, account age verification
       - Real example: \"2026-02-17 15:30:45+00:00\"
    
    5. updated_at (Last Modification Timestamp)
       - Type: DateTime (date + time) with timezone  
       - Purpose: Record when account was last updated
       - Auto-updated: Yes (updated every time user modifies account)
       - Timezone-aware: Yes (stores timezone info)
       - Used for: Detecting stale accounts, last activity tracking
       - Real example: \"2026-03-01 10:15:22+00:00\"
    
    ========================================================================
    CONSTRAINTS: Rules that ensure data quality and security
    ========================================================================
    
    Primary Key (id):
    - Makes 'id' the unique identifier for each row
    - Database optimizes lookups on this field
    - Enforces: No two users can have same id
    
    Unique Constraint (email):
    - Enforces: No two users can have same email address
    - Prevents: Duplicate account registrations
    - Result: Database automatically rejects duplicate email attempts
    
    Index on email (ix_users_email):
    - Creates a sorted lookup table (like a book's index)
    - Without index: Searching 1 million emails scans all 1 million rows (slow)
    - With index: Searching 1 million emails uses pre-sorted index (fast)
    - Impact: Login authentication speed is critical for UX
    
    Server defaults (created_at, updated_at):
    - Database automatically sets timestamp to current time
    - Developer doesn't need to calculate timestamps manually
    - Ensures: Consistent, timezone-aware timestamps
    """
    
    # Create the users table with all columns and constraints
    op.create_table(
        "users",  # Table name in database
        
        # COLUMN 1: id (User Identifier)
        # - postgresql.UUID(as_uuid=True): UUID type specific to PostgreSQL
        # - as_uuid=True: Python will work with it as UUID objects (not strings)
        # - primary_key=True: This is the main identifier for each row
        # - nullable=False: Every user MUST have an id (never empty)
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            primary_key=True
        ),
        
        # COLUMN 2: email (Login Email Address)
        # - sa.String(255): Text field, max 255 characters
        # - unique=True: No duplicate emails allowed
        # - index=True: Create fast lookup index on this field
        # - nullable=False: Email is required (never empty)
        sa.Column(
            "email",
            sa.String(255),
            nullable=False,
            unique=True,
            index=True
        ),
        
        # COLUMN 3: password_hash (Encrypted Password)
        # - sa.String(255): Text field, max 255 characters (bcrypt hashes fit in this)
        # - nullable=False: Password is required on signup
        # - NOT unique: Multiple users can have same password hash (if passwords match)
        # - NOT indexed: We don't search by password hash (would be insecure)
        sa.Column(
            "password_hash",
            sa.String(255),
            nullable=False
        ),
        
        # COLUMN 4: created_at (Account Creation Timestamp)
        # - sa.DateTime(timezone=True): Date and time with timezone awareness
        # - server_default=sa.func.now(): Database sets this to current time
        # - nullable=False: Timestamp is always recorded
        # - Impact: Zero latency (database handles timestamp, not Python app)
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False
        ),
        
        # COLUMN 5: updated_at (Last Modification Timestamp)
        # - sa.DateTime(timezone=True): Date and time with timezone awareness
        # - server_default=sa.func.now(): Database sets this to current time initially
        # - nullable=False: Timestamp is always recorded
        # - Note: Python code will update this when user modifies their account
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False
        ),
    )
    
    # Create unique index on email for fast login verification
    # This is a database optimization: searching 1M users by email in milliseconds
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    """
    REMOVE THE USERS TABLE (downgrade / revert to version 0)
    
    This function runs when rolling back the database to a previous version.
    It removes the users table - this is DESTRUCTIVE and PERMANENT.
    
    ========================================================================
    WARNING: DATA LOSS
    ========================================================================
    
    When this function runs:
    - The users table is deleted
    - ALL user data is permanently removed
    - ALL user accounts are destroyed
    
    When to use this:
    - Local development: Testing migration reversibility ✓
    - Testing environment: Resetting test data ✓
    - Production: NEVER (catastrophic data loss) ✗
    
    For non-technical reviewers:
    - Think of downgrade as \"UNDO\" for the database
    - Like pressing Ctrl+Z in a document
    - Except it's permanent - no recovery (unless you have backups)
    
    In production, downgrading requires:
    - Full backup before attempting
    - Maintenance window (users can't access app)
    - Database recovery plan ready
    - Never done casually or without planning
    """
    
    # Drop (delete) the users table from the database
    op.drop_table("users")
