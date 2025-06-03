from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.models.medical_history import MedicalHistory
from app.models.prescription import Prescription

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="doctor")

    medical_history = relationship(
        "MedicalHistory",
        back_populates="patient",
        foreign_keys=[MedicalHistory.patient_id]
    )

    prescriptions = relationship(
        "Prescription",
        back_populates="patient",
        foreign_keys=[Prescription.patient_id]
    )

    observations = relationship("ClinicalObservation", back_populates="patient")  # 👈 no import needed
