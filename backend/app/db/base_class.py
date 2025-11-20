# app/db/base_class.py
"""Base class for all database models."""
from typing import Any
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
import uuid


@as_declarative()
class Base:
    """Base class for all database models."""
    id: Any
    __name__: str
    
    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()


def UUIDColumn(*args, **kwargs):
    """Create a UUID column that works with both PostgreSQL and SQLite.

    For PostgreSQL, use native UUID type.
    For SQLite, use String(36) with string UUIDs.
    """
    import os
    database_url = os.getenv("DATABASE_URL", "")
    
    if database_url.startswith("postgresql"):
        # Use native PostgreSQL UUID type
        return Column(UUID(as_uuid=True), *args, **kwargs)
    else:
        # Use String(36) for SQLite compatibility
        default_value = kwargs.get("default")
        if default_value is uuid.uuid4:
            # Replace with a callable that returns a string
            kwargs["default"] = lambda: str(uuid.uuid4())
        return Column(String(36), *args, **kwargs)