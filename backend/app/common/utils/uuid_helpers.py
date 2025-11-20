"""UUID helper functions for safe UUID handling."""
from uuid import UUID
from typing import Union


def as_uuid(v: Union[str, UUID]) -> UUID:
    """Convert string or UUID to UUID object."""
    return v if isinstance(v, UUID) else UUID(str(v))


def uuid_hex(v: Union[str, UUID]) -> str:
    """Get dashless canonical form of UUID."""
    return as_uuid(v).hex


def uuid_str(v: Union[str, UUID]) -> str:
    """Get dashed canonical form of UUID."""
    return str(as_uuid(v))


def safe_uuid_str(v: Union[str, UUID, None]) -> str:
    """Safely convert UUID to string, handling None values."""
    if v is None:
        return ""
    return uuid_str(v)
