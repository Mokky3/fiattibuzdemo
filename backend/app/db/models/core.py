from sqlalchemy import Column, text
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, TEXT
from sqlalchemy.orm import relationship
from app.db.base_class import Base

# Note: User model is defined in app.common.models.user
# Removed duplicate definition to avoid SQLAlchemy table conflict
