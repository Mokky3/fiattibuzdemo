from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="doctor")
    
    # Add these fields for dashboard compatibility
    name = Column(String(100), nullable=True)  # For display purposes
    email = Column(String(255), nullable=True)  # For messaging
    avatar = Column(String(1), nullable=True)  # For avatar display
    last_message = Column(String(500), nullable=True)  # For messages section
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Existing relationships
    medical_history = relationship(
        "MedicalHistory",
        back_populates="patient",
        foreign_keys="MedicalHistory.patient_id"
    )

    prescriptions = relationship(
        "Prescription",
        back_populates="patient", 
        foreign_keys="Prescription.patient_id"
    )

    observations = relationship("ClinicalObservation", back_populates="patient")
    
    # New appointment relationships
    patient_appointments = relationship(
        "Appointment",
        back_populates="patient",
        foreign_keys="Appointment.patient_id"
    )
    
    doctor_appointments = relationship(
        "Appointment", 
        back_populates="doctor",
        foreign_keys="Appointment.doctor_id"
    )