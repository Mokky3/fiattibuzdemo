# app/db/session.py
"""Database session configuration and management."""
from sqlalchemy import create_engine
import logging
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
import os
from typing import Generator
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import Base from base_class to avoid conflicts
from app.db.base_class import Base

# Database URL from environment variable
# Use PostgreSQL if available, otherwise fallback to SQLite
DATABASE_URL = os.getenv("DATABASE_URL")
SQLALCHEMY_DATABASE_URL = None  # Initialize to avoid NameError

if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg2  # noqa: F401
        SQLALCHEMY_DATABASE_URL = DATABASE_URL
        print(f"[DB] Using PostgreSQL: {DATABASE_URL}")
    except ImportError:
        print("Warning: psycopg2 not found, falling back to SQLite")
        DATABASE_URL = None

if not SQLALCHEMY_DATABASE_URL:
    # Always point SQLite to the project root ehr.db to avoid cwd-dependent paths
    # Fiattib.Uz directory is three levels up from this file: session.py -> db -> app -> backend -> Fiattib.Uz
    project_root = Path(__file__).resolve().parents[3]
    sqlite_path = project_root / "ehr.db"
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{sqlite_path.as_posix()}"
    print(f"[DB] Using SQLite: {sqlite_path}")

# Create engine with connection pooling
# Enable loud SQL logging via env (default: false to reduce log noise)
# Force to false unless explicitly set to "true" in environment
_sql_echo_env = os.getenv("SQL_ECHO", "false")
_sql_echo_enabled = _sql_echo_env.lower() == "true"

# Configure engine based on database type
if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    # PostgreSQL configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,   # Recycle connections every hour
        echo=_sql_echo_enabled,  # SQL logging (disabled by default to reduce log noise)
        # PostgreSQL specific settings
        connect_args={
            "options": "-c timezone=UTC -c search_path=public,staging,ref,ops,ehr,core,financial"
        }
    )
else:
    # SQLite configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        # Use NullPool for better connection management in production
        poolclass=NullPool if os.getenv("ENVIRONMENT") == "production" else None,
        pool_pre_ping=True,  # Verify connections before using
        echo=_sql_echo_enabled,  # SQL logging (disabled by default to reduce log noise)
        # SQLite specific configuration
        connect_args={"check_same_thread": False}
    )

# Log engine URL and SQLite absolute path on import to prove the DB target
_logger = logging.getLogger("app.db.session")
try:
    _logger.info(f"[DB] SQL_ECHO setting: {_sql_echo_enabled} (env: {_sql_echo_env})")
    _logger.warning(f"[DB] Using URL: {engine.url}")
    if str(engine.url).startswith("sqlite"):
        import time
        db_path = str(engine.url).split("///", 1)[-1]
        if os.path.exists(db_path):
            st = os.stat(db_path)
            _logger.warning(
                f"[DB] SQLite path: {os.path.abspath(db_path)} size={st.st_size} mtime={time.ctime(st.st_mtime)}"
            )
        else:
            _logger.warning(f"[DB] SQLite path (non-existent yet): {os.path.abspath(db_path)}")
except Exception:
    pass

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Don't expire objects after commit
)

# Dependency to get DB session
def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency.
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Context manager for database operations
class DatabaseSession:
    """Context manager for database sessions."""
    
    def __enter__(self) -> Session:
        self.db = SessionLocal()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.db.rollback()
        self.db.close()

# Utility function for standalone operations
def get_db_session() -> Session:
    """Get a database session for standalone operations."""
    return SessionLocal()