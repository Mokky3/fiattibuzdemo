from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class MedicalHistory(Base):
    __tablename__ = "medical_histories"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    description = Column(Text)
    diagnosis = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    # ✅ Use actual column reference here, not a string
    patient = relationship(
        "User",
        back_populates="medical_history",
        foreign_keys=[patient_id]
)

    doctor = relationship("User", foreign_keys=[doctor_id])
