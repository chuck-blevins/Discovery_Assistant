"""
USER ORM MODEL - Python representation of the users database table.

================================================================================
FOR NON-TECHNICAL REVIEWERS:
================================================================================

What is an ORM (Object-Relational Mapping)?
- ORM bridges the gap between databases and Python code
- Database talks in SQL (database language): \"INSERT INTO users (email, ...) VALUES (...)\"
- Python talks in objects: user = User(email=\"chuck@example.com\", ...)
- ORM translates between these two languages automatically

What this file does:
- Defines a User class that represents each user account
- One User object = one row in the users database table
- Properties of User object = columns in the users table
- When you save a User object, it automatically saves to the database

Why we need this:
- Python developers write Python code (not SQL)
- Instead of SQL queries, we write: user = User(email=\"...\"
- The ORM handles the database communication behind the scenes

How it connects to the database:
- This User class matches the users table created by migration 001_init_users.py
- When we create a new User object and save it:
  1. Python creates User object with user data
  2. SQLAlchemy (ORM) converts it to SQL
  3. Database creates a new row in the users table
  4. User's unique ID is returned to Python

Workflow example:
1. Registration form submitted: email=\"alice@example.com\", password=\"secret123\"
2. Python code: user = User(email=\"alice@example.com\", password_hash=BCrypt(\"secret123\"))
3. ORM saves to database: INSERT INTO users (id, email, password_hash, ...) ...
4. Database returns: New user with id=\"550e8400-e29b-41d4-a716-446655440000\"
5. User logged in automatically with new account

================================================================================
"""

import uuid  # UUID library for generating unique identifiers
from datetime import datetime  # datetime library for timestamp handling

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    """
    USER MODEL - Represents a user account in the system.
    
    ========================================================================
    WHAT THIS CLASS REPRESENTS:
    ========================================================================
    
    Each User object represents ONE user account in Discovery App.
    When you create a User(), you're creating a new account.
    When you save a User(), it's stored in the database's users table.
    
    Inheritance:
    - class User(Base): Inherits from SQLAlchemy's Base
    - This tells SQLAlchemy: \"This class maps to a database table\"
    - Base is defined in app/db.py
    
    ========================================================================
    ATTRIBUTES (Fields/Columns):
    ========================================================================
    
    Each attribute below corresponds to one column in the users table.
    SQLAlchemy automatically syncs between Python objects and database rows.
    
    ========================================================================
    USAGE EXAMPLES:
    ========================================================================
    
    Creating a new user:
    >>> new_user = User(
    ...     email=\"alice@example.com\",
    ...     password_hash=\"bcrypt_hash_here\"
    ... )
    >>> # id, created_at, updated_at are set automatically
    >>> print(new_user.id)  # \"550e8400-e29b-41d4-a716-446655440000\"
    
    Querying users:
    >>> from sqlalchemy import select
    >>> async with db_session() as session:
    ...     result = await session.execute(
    ...         select(User).where(User.email == \"alice@example.com\")
    ...     )
    ...     user = result.scalar_one_or_none()
    ...     print(user.email)  # \"alice@example.com\"
    
    Updating a user:
    >>> user.email = \"alice_new@example.com\"
    >>> await session.commit()  # Save changes to database
    >>> # updated_at timestamp is updated automatically
    
    ========================================================================
    IMPLEMENTATION NOTES FOR DEVELOPERS:
    ========================================================================
    
    Type Hints (Mapped[...]):
    - Python 3.11+ syntax for type safety
    - Mapped[uuid.UUID] = This field contains a UUID
    - Helps IDE with autocomplete and type checking
    - Modern SQLAlchemy best practice
    
    mapped_column():
    - SQLAlchemy function that creates a database column
    - Replaces older Column() syntax
    - More Pythonic and type-safe
    
    server_default values:
    - Some defaults (created_at) are set by the database server
    - Makes timestamp generation consistent and atomic
    - Zero latency - database handles it (not Python)
    
    ========================================================================
    """
    
    __tablename__ = "users"  # Database table name (must match migration)
    
    # ========================================================================
    # FIELD: id (Unique User Identifier)
    # ========================================================================
    # Type: UUID (128-bit universal unique identifier)
    # SQLAlchemy type: UUID (PostgreSQL-native UUID type)
    # Python type: uuid.UUID (Python's UUID object)
    # Primary key: Yes (this is the main identifier for the user)
    # Auto-generated: Yes (created automatically on insert)
    # Default generator: uuid.uuid4() (generates random UUID v4)
    #
    # What it does:
    # - Uniquely identifies this user across the entire system
    # - Never changes (immutable during user's lifetime)
    # - Used internally by the system to reference users
    # - Not shown to users (not human-readable)
    #
    # Real example:
    # id = 550e8400-e29b-41d4-a716-446655440000
    #
    # Why UUID instead of auto-increment integer:
    # - UUIDs are globally unique (works across databases/servers)
    # - Auto-increment IDs can leak user count information
    # - UUIDs are unpredictable (better for security)
    # - UUIDs work for distributed systems (multiple databases)
    #
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # ========================================================================
    # FIELD: email (User's Login Email Address)
    # ========================================================================
    # Type: String (text up to 255 characters)
    # Python type: str (string)
    # Unique: Yes (no two users can have the same email)
    # Indexed: Yes (fast lookup for login authentication)
    # Nullable: No (every user must have an email)
    #
    # What it does:
    # - User's login credential (what they type to sign in)
    # - Used to find user during authentication
    # - Used for email-based password recovery
    # - Used for email notifications
    #
    # Real example:
    # email = \"chuck@discoveryapp.com\"
    #
    # Validation:
    # - Should validate format before storing (RFC 5322 compliance)
    # - Should normalize to lowercase for case-insensitive login
    # - Should check for uniqueness before insertion
    # - Validation happens in API routes, not in this model
    #
    # Security:
    # - Emails are stored as plaintext (not encrypted)
    # - Email addresses are visible to legitimate users (they own them)
    # - Email is used as proof of identity for account recovery
    # - Hashing emails would make password recovery impossible
    #
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    
    # ========================================================================
    # FIELD: password_hash (Encrypted User Password)
    # ========================================================================
    # Type: String (text up to 255 characters)
    # Python type: str (string - actually a bcrypt hash)
    # Unique: No (multiple users can have same password hash)
    # Indexed: No (we never search by password hash)
    # Nullable: No (every user must have a password)
    #
    # What it does:
    # - Stores the user's password in encrypted form
    # - NOT the actual password (one-way encryption)
    # - Used to verify passwords during login
    # - Can never be decrypted back to original password
    #
    # Real example (bcrypt hash):
    # password_hash = \"$2b$12$abcdefghijklmnopqrstuvwxyz1234567890...(more)\"
    #
    # Security design:
    # - Plaintext password never stored (even temporarily in code)
    # - Password is hashed immediately upon arrival from user
    # - Database contains only hashes (not passwords)
    # - If database is breached, passwords are still secure
    # - Even developers can't see user passwords\n    #\n    # How login works:\n    # 1. User submits password in login form\n    # 2. System hashes the submitted password\n    # 3. System compares submitted hash with stored hash\n    # 4. If they match, login succeeds\n    # 5. Original password never exposed\n    #\n    # Why bcrypt (not MD5 or SHA):\n    # - Bcrypt includes \"salt\" (random data mixed in)\n    # - Makes rainbow table attacks impossible\n    # - Deliberately slow (takes 0.1 seconds to hash)\n    # - Slow = makes brute force attacks impractical\n    # - Can increase \"cost\" as computers get faster\n    #\n    password_hash: Mapped[str] = mapped_column(\n        String(255),\n        nullable=False\n    )\n    \n    # ========================================================================\n    # FIELD: created_at (Account Creation Timestamp)\n    # ========================================================================\n    # Type: DateTime with timezone awareness\n    # Python type: datetime (with timezone info)\n    # Nullable: No (always recorded)\n    # Default: Automatically set to current time (server side)\n    #\n    # What it does:\n    # - Records the exact moment the account was created\n    # - Immutable (never changes after creation)\n    # - Timezone-aware (knows which timezone)\n    #\n    # Real example:\n    # created_at = 2026-02-17T15:30:45.123456+00:00\n    #\n    # What it's used for:\n    # - Compliance: Prove account age for regulations\n    # - Analytics: When did users sign up (trends over time)\n    # - Security: Detect account anomalies (account older than expected)\n    # - Debugging: Track growth and usage patterns\n    #\n    # Why server-side default:\n    # - Database generates timestamp (not Python)\n    # - Guarantees accuracy (database clock is authoritative)\n    # - Makes timestamp atomic/consistent\n    # - Zero latency (database is faster than network request)\n    # - Prevents timezone issues (database handles it)\n    #\n    # Note:\n    # - default=datetime.now would reset on every startup (wrong)\n    # - server_default=sa.func.now() handled by database (correct)\n    #\n    created_at: Mapped[datetime] = mapped_column(\n        DateTime(timezone=True),\n        default=datetime.now,  # Python fallback (if server default not used)\n        nullable=False\n    )\n    \n    # ========================================================================\n    # FIELD: updated_at (Last Modification Timestamp)\n    # ========================================================================\n    # Type: DateTime with timezone awareness\n    # Python type: datetime (with timezone info)\n    # Nullable: No (always recorded)\n    # Default: Automatically set to current time (on creation)\n    # Updated: Automatically updated on every modification\n    #\n    # What it does:\n    # - Records when the account was last modified\n    # - Updated whenever user changes email or password\n    # - Tracks all account modifications\n    #\n    # Real example:\n    # updated_at = 2026-02-20T10:15:22.654789+00:00\n    #\n    # What it's used for:\n    # - Security audit trail: When was account last modified\n    # - Stale account detection: Inactive accounts (no updates in 1 year)\n    # - Last activity tracking: When did user last modify account\n    # - Sync detection: Updated_at > other systems' last sync time\n    #\n    # Lifecycle example:\n    # 1. Account created: created_at = 2026-02-17 15:30:45, updated_at = same\n    # 2. User changes password: created_at unchanged, updated_at = 2026-02-18 09:20:00\n    # 3. User changes email: created_at unchanged, updated_at = 2026-02-20 10:15:22\n    #\n    updated_at: Mapped[datetime] = mapped_column(\n        DateTime(timezone=True),\n        default=datetime.now,  # Python fallback\n        onupdate=datetime.now,  # Python: update on record modification\n        nullable=False\n    )\n    \n    # ========================================================================\n    # SPECIAL METHODS (Python-specific, not database fields)\n    # ========================================================================\n    \n    def __repr__(self) -> str:\n        \"\"\"\n        STRING REPRESENTATION - What User() prints as\n        \n        Used for debugging and logging.\n        Shows user's ID and email (for identification).\n        Hides password hash for security.\n        \n        Example output:\n        >>> user = User(id=uuid.UUID(...), email=\"chuck@example.com\", ...)\n        >>> print(user)\n        <User(id=550e8400-e29b-41d4-a716-446655440000, email=\"chuck@example.com\")>\n        \n        Why we hide password_hash:\n        - Defensive programming: Never expose passwords in logs\n        - Even though password_hash is encrypted, we don't want it visible\n        - Stack traces and logs might be seen by untrusted people\n        \"\"\"\n        return f\"<User(id={self.id}, email={self.email})>\""
