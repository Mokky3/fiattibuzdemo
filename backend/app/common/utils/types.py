import uuid
from sqlalchemy.types import TypeDecorator, CHAR
try:
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
except Exception:  # pragma: no cover
    PG_UUID = None  # type: ignore


class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type.

    Uses PostgreSQL's UUID type when available, otherwise stores as CHAR(36).
    Accepts and returns uuid.UUID instances in Python code.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and PG_UUID is not None:
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return str(value)
        # Coerce any stringy value to a valid UUID format
        return str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        return None if value is None else uuid.UUID(str(value))


