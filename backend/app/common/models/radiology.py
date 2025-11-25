"""Radiology models (studies, reports, templates, worklist assignment)."""
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, Boolean, Integer, Float, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base, UUIDColumn


class RadiologyStudy(Base):
    __tablename__ = "radiology_studies"
    __table_args__ = {"schema": "ehr"}

    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    accession_number = Column(String(50), unique=True, index=True, nullable=True)
    patient_id = UUIDColumn(ForeignKey("ehr.patients.patient_id"), nullable=False)
    mrn = Column(String(50), nullable=True)
    patient_name = Column(String(200), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(1), nullable=True)
    dob = Column(Date, nullable=True)

    order_date = Column(DateTime(timezone=True), nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    modality = Column(String(20), nullable=True)
    body_part = Column(String(100), nullable=True)
    study_description = Column(String(500), nullable=True)
    indication = Column(Text, nullable=True)
    priority = Column(String(20), nullable=True)  # STAT/Urgent/Routine
    status = Column(String(20), nullable=False, default="IMPORTED_NO_REPORT")  # scheduled/in_progress/completed/cancelled/IMPORTED_NO_REPORT
    ordering_physician = Column(String(200), nullable=True)
    technologist = Column(String(200), nullable=True)
    location = Column(String(200), nullable=True)
    room = Column(String(100), nullable=True)
    contrast = Column(Boolean, default=False)
    preparation = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    insurance = Column(String(200), nullable=True)
    authorization = Column(String(200), nullable=True)
    cpt_code = Column(String(50), nullable=True)

    # Orthanc / DICOM fields
    orthanc_study_id = Column(String(255), nullable=False, index=True)
    study_instance_uid = Column(String(255), nullable=False, index=True)
    source = Column(String(50), nullable=True)  # 'internal', 'external_cd', 'external_clinic'
    study_date = Column(Date, nullable=True)
    uploaded_by = UUIDColumn(ForeignKey("core.users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient")
    report = relationship("RadiologyReport", back_populates="study", uselist=False)


class WorklistAssignment(Base):
    __tablename__ = "radiology_worklist_assignments"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    study_id = Column(String(36), ForeignKey("ehr.radiology_studies.id"), nullable=False)
    assigned_radiologist_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    reading_status = Column(String(20), nullable=False, default="unread")  # unread/reading/preliminary/final
    critical_flag = Column(Boolean, default=False)
    tags = Column(JSON, nullable=True)  # [str]
    preliminary_findings = Column(Text, nullable=True)

    image_count = Column(Integer, default=0)
    series_count = Column(Integer, default=0)
    study_size = Column(String(50), nullable=True)

    protocol_name = Column(String(200), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Derived/UI fields
    turnaround_time = Column(String(50), nullable=True)
    estimated_read_time = Column(String(50), nullable=True)

    # Relationships
    study = relationship("RadiologyStudy")
    radiologist = relationship("User")


class RadiologyReport(Base):
    __tablename__ = "radiology_reports"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    study_id = Column(String(36), ForeignKey("ehr.radiology_studies.id"), nullable=False, unique=True)
    radiologist_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    report_date = Column(DateTime(timezone=True), server_default=func.now())
    findings = Column(Text, nullable=False)
    impression = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=True)

    # Metadata
    is_critical = Column(Boolean, default=False)
    status = Column(String(20), default="final")

    # Relationships
    study = relationship("RadiologyStudy", back_populates="report")
    radiologist = relationship("User")


class RadiologyTemplate(Base):
    __tablename__ = "radiology_templates"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(200), nullable=False)
    modality = Column(String(20), nullable=False)
    body_part = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    author_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    created_date = Column(Date, nullable=False)
    last_modified = Column(Date, nullable=False)
    usage_count = Column(Integer, default=0)
    is_private = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)

    content = Column(JSON, nullable=False)  # {findings, impression, recommendations}
    tags = Column(JSON, nullable=True)  # [str]

    author = relationship("User")


