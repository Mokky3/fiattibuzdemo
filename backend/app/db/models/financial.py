from sqlalchemy import Column, ForeignKey, text, Integer, Float, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, DATE, TEXT, TIMESTAMP, JSONB, BIGINT
from sqlalchemy.orm import relationship
from app.db.base_class import Base

# Note: Bill model is defined in app.common.models.financial
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Payment model is defined in app.common.models.financial
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: ChargeItem model is defined in app.common.models.financial
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: InsuranceClaim model is defined in app.common.models.lab_insurance
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: InsuranceAuthorization model is defined in app.common.models.lab_insurance
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: FinancialTransaction model is defined in app.common.models.financial
# Removed duplicate definition to avoid SQLAlchemy table conflict
