# app/db/session.py
"""Database session configuration and management."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
import os
from typing import Generator

# Import Base from base_class to avoid conflicts
from app.db.base_class import Base

# Database URL from environment variable
# Use SQLite as fallback if PostgreSQL is not available
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg2
        SQLALCHEMY_DATABASE_URL = DATABASE_URL
    except ImportError:
        print("Warning: psycopg2 not found, falling back to SQLite")
        SQLALCHEMY_DATABASE_URL = "sqlite:///./ehr.db"
else:
    SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ehr.db")

# Create engine with connection pooling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # Use NullPool for better connection management in production
    poolclass=NullPool if os.getenv("ENVIRONMENT") == "production" else None,
    pool_pre_ping=True,  # Verify connections before using
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",  # SQL logging
    # SQLite specific configuration
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
)

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