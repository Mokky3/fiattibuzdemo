from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Time
from sqlalchemy.orm import relationship
from datetime import datetime  # Add this import
from app.db.database import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))  # Changed to reference users table
    doctor_id = Column(Integer, ForeignKey("users.id"))   # Changed to reference users table
    appointment_date = Column(Date)  # Separate date field
    appointment_time = Column(Time)  # Separate time field  
    reason = Column(String(255))
    notes = Column(String(500), nullable=True)  # Added notes field
    status = Column(String(50), default="upcoming")  # Added status field
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - using string references to avoid circular imports
    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_appointments")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_appointments")