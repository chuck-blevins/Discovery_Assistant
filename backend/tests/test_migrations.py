"""Test database migrations and project structure."""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = str(Path(__file__).parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


def test_migrations_directory_exists():
    """Verify alembic migrations directory exists."""
    migrations_dir = Path(__file__).parent.parent / "alembic" / "versions"
    assert migrations_dir.exists(), "alembic/versions directory should exist"
    assert migrations_dir.is_dir(), "alembic/versions should be a directory"


def test_initial_migration_exists():
    """Verify initial migration file exists."""
    migration_file = Path(__file__).parent.parent / "alembic" / "versions" / "001_init_users.py"
    assert migration_file.exists(), "001_init_users.py migration file should exist"
    assert migration_file.is_file(), "001_init_users.py should be a file"


def test_migration_has_upgrade_function():
    """Verify migration file contains upgrade function."""
    migration_file = Path(__file__).parent.parent / "alembic" / "versions" / "001_init_users.py"
    content = migration_file.read_text()
    
    assert "def upgrade()" in content, "Migration should have upgrade() function"
    assert "sa.Table" in content or "op.create_table" in content, "Migration should create tables"


def test_migration_has_downgrade_function():
    """Verify migration file contains downgrade function."""
    migration_file = Path(__file__).parent.parent / "alembic" / "versions" / "001_init_users.py"
    content = migration_file.read_text()
    
    assert "def downgrade()" in content, "Migration should have downgrade() function"


def test_users_table_schema_in_migration():
    """Verify users table schema is defined in migration."""
    migration_file = Path(__file__).parent.parent / "alembic" / "versions" / "001_init_users.py"
    content = migration_file.read_text()
    
    # Verify table is named 'users'
    assert "'users'" in content or '"users"' in content, "should create 'users' table"
    
    # Verify required columns
    required_columns = ["id", "email", "password_hash", "created_at", "updated_at"]
    for column in required_columns:
        assert column in content, f"Migration should include {column} column"


def test_user_model_exists():
    """Verify User ORM model file exists."""
    model_file = Path(__file__).parent.parent / "app" / "models" / "user.py"
    assert model_file.exists(), "app/models/user.py should exist"


def test_user_model_has_correct_structure():
    """Verify User model has correct class definition and columns."""
    model_file = Path(__file__).parent.parent / "app" / "models" / "user.py"
    content = model_file.read_text()
    
    # Verify class definition
    assert "class User" in content, "Should define User class"
    assert "__tablename__" in content, "Should define __tablename__"
    assert "'users'" in content or '"users"' in content, "Table name should be 'users'"
    
    # Verify required attributes
    required_attrs = ["id", "email", "password_hash", "created_at", "updated_at"]
    for attr in required_attrs:
        assert attr in content, f"User model should have {attr} attribute"


def test_models_init_exports_user():
    """Verify models/__init__.py exports User model."""
    init_file = Path(__file__).parent.parent / "app" / "models" / "__init__.py"
    content = init_file.read_text()
    
    assert "from app.models.user import User" in content, "Should import User in models/__init__.py"
    assert "User" in content, "Should export User in models/__init__.py"


def test_db_module_imports_models():
    """Verify app/db.py imports models for Alembic detection."""
    db_file = Path(__file__).parent.parent / "app" / "db.py"
    content = db_file.read_text()
    
    assert "from app import models" in content, "app/db.py should import models"
    assert "Base" in content, "app/db.py should define/use Base"


def test_alembic_env_uses_base_metadata():
    """Verify alembic/env.py uses Base.metadata for migrations."""
    env_file = Path(__file__).parent.parent / "alembic" / "env.py"
    content = env_file.read_text()
    
    assert "from app.db import Base" in content, "alembic/env.py should import Base from app.db"
    assert "target_metadata = Base.metadata" in content, "Should set target_metadata to Base.metadata"


def test_requirements_has_dependencies():
    """Verify requirements.txt includes necessary dependencies."""
    req_file = Path(__file__).parent.parent / "requirements.txt"
    content = req_file.read_text()
    
    required_packages = ["fastapi", "sqlalchemy", "alembic", "asyncpg", "pytest"]
    for package in required_packages:
        assert package in content.lower(), f"requirements.txt should include {package}"


def test_alembic_ini_exists():
    """Verify alembic.ini configuration file exists."""
    alembic_ini = Path(__file__).parent.parent / "alembic.ini"
    assert alembic_ini.exists(), "alembic.ini should exist"
    
    content = alembic_ini.read_text()
    assert "sqlalchemy.url" in content, "alembic.ini should define sqlalchemy.url"


def test_db_module_has_base_and_engine():
    """Verify app/db.py exports necessary components."""
    db_file = Path(__file__).parent.parent / "app" / "db.py"
    content = db_file.read_text()
    
    assert "Base = declarative_base()" in content, "Should create declarative base"
    assert "async_engine" in content, "Should create async_engine"
    assert "AsyncSessionLocal" in content, "Should create AsyncSessionLocal"
    assert "get_db" in content, "Should define get_db dependency function"
