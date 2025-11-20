from sqlalchemy import Column, text
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, TEXT
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}

    user_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(TEXT, unique=True, nullable=False)
    full_name = Column(TEXT, nullable=False)
    role = Column(TEXT, nullable=False)
    specialty = Column(TEXT)
    license_number = Column(TEXT)
    organization = Column(TEXT)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    # Relationships
    patient = relationship("Patient", back_populates="user", uselist=False)
    appointments_as_doctor = relationship("Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor")
    lab_orders_ordered_by = relationship("LabOrder", foreign_keys="LabOrder.ordered_by", back_populates="ordered_by_user")
    prescriptions_as_doctor = relationship("Prescription", foreign_keys="Prescription.doctor_id", back_populates="doctor")
    prescriptions_prescribed_by = relationship("Prescription", foreign_keys="Prescription.prescribed_by", back_populates="prescribed_by_user")
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    messages_received = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient")
    notifications = relationship("Notification", back_populates="user")
    todos = relationship("Todo", back_populates="user")
    nurse_tasks = relationship("NurseTask", foreign_keys="NurseTask.nurse_id", back_populates="nurse")
    medication_events = relationship("MedicationAdministrationEvent", foreign_keys="MedicationAdministrationEvent.nurse_id", back_populates="nurse")
    blocked_time_slots = relationship("BlockedTimeSlot", foreign_keys="BlockedTimeSlot.doctor_id", back_populates="doctor")
    blocked_time_slots_created = relationship("BlockedTimeSlot", foreign_keys="BlockedTimeSlot.created_by", back_populates="created_by_user")
    patient_medications_prescribed = relationship("PatientMedication", foreign_keys="PatientMedication.prescribed_by", back_populates="prescribed_by_user")
    radiology_templates = relationship("RadiologyTemplate", back_populates="author")
    radiology_worklist_assignments = relationship("RadiologyWorklistAssignment", back_populates="assigned_radiologist")
    radiology_reports = relationship("RadiologyReport", back_populates="radiologist")
    audit_logs = relationship("AuditLog", back_populates="actor_user")
