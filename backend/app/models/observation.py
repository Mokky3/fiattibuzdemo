from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
from app.models.enums import ObservationType

class ClinicalObservation(Base):
    __tablename__ = "clinical_observations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    type = Column(SqlEnum(ObservationType), nullable=False)
    value = Column(String, nullable=False)
    unit = Column(String, nullable=True)
    observed_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("User", back_populates="observations")  # 👈 class name in string

