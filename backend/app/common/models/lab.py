"""Lab portal models: LabOrder, LabResult, LabReport."""
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, Boolean, Integer, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base


class LegacyLabOrder(Base):
    __tablename__ = "lab_orders_legacy"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    ordering_provider = Column(String(200), nullable=True)
    priority = Column(String(20), default="routine")  # routine|urgent|stat
    status = Column(String(20), default="pending")  # pending|in_progress|completed|cancelled
    samples = Column(JSON, nullable=True)  # [{type, container, collected_at}]
    tests = Column(JSON, nullable=False)  # [{code, name, method, unit, refRange}]
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="lab_orders")
    results = relationship("LegacyLabResult", back_populates="order", cascade="all, delete-orphan")


class LegacyLabResult(Base):
    __tablename__ = "lab_results_legacy"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(String(36), ForeignKey("lab_orders_legacy.id"), nullable=False)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    status = Column(String(20), default="pending")  # pending|completed|critical|abnormal
    collected_at = Column(DateTime(timezone=True), nullable=True)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
    released_at = Column(DateTime(timezone=True), nullable=True)
    analyzer = Column(String(100), nullable=True)
    values = Column(JSON, nullable=False)  # [{testCode, name, value, unit, flag, refRange}]
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    order = relationship("LegacyLabOrder", back_populates="results", cascade="all, delete-orphan")
    patient = relationship("Patient", back_populates="lab_results")


class LegacyLabReport(Base):
    __tablename__ = "lab_reports_legacy"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(String(36), ForeignKey("lab_orders_legacy.id"), nullable=False)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    report_date = Column(DateTime(timezone=True), server_default=func.now())
    title = Column(String(200), nullable=False)
    summary = Column(Text, nullable=True)
    metrics = Column(JSON, nullable=True)  # e.g., turnaround, sampleCount, etc.
    attachments = Column(JSON, nullable=True)  # [{name, url, type}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("LabOrder")
    patient = relationship("Patient")


