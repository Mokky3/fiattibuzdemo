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
    """Create a UUID column that works with both PostgreSQL and SQLite."""
    # For now, always use String for SQLite compatibility
    # In production with PostgreSQL, you can change this to use UUID
    return Column(String(36), *args, **kwargs)