"""
Pytest configuration for Discovery App backend.

This minimal conftest.py provides fixtures for structural validation tests
that don't require database connections. Full integration tests will extend
this with database setup when SQLAlchemy Python 3.14 compatibility is resolved.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment from .env
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    load_dotenv(env_file)

# Disable LangSmith tracing during tests so tests never export traces
os.environ['LANGSMITH_TRACING'] = 'false'

# Set default SECRET_KEY for tests
if not os.getenv('SECRET_KEY'):
    os.environ['SECRET_KEY'] = 'test-secret-key-minimum-32-chars'
