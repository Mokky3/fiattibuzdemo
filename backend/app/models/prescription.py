from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    medication = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    instructions = Column(String)
    date_prescribed = Column(DateTime, default=datetime.utcnow)

    patient = relationship(
        "User",
        back_populates="prescriptions",
        foreign_keys=[patient_id]
    )
    doctor = relationship("User", foreign_keys=[doctor_id])
