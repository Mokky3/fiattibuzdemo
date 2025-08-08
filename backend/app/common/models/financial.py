# app/common/models/financial.py
"""Consolidated financial models for the EHR system."""
from sqlalchemy import Column, String, Date, DateTime, Float, Text, ForeignKey, Boolean, Integer, Enum, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base


class ChargeItemStatus(str, enum.Enum):
    PLANNED = "planned"
    BILLABLE = "billable"
    NOT_BILLABLE = "not_billable"
    ABORTED = "aborted"
    BILLED = "billed"
    ENTERED_IN_ERROR = "entered_in_error"
    UNKNOWN = "unknown"


class BillStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    WRITTEN_OFF = "written_off"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIAL_REFUND = "partial_refund"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    INSURANCE = "insurance"
    MOBILE_PAYMENT = "mobile_payment"
    CHECK = "check"
    OTHER = "other"


class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    INSURANCE = "insurance"
    PROMOTIONAL = "promotional"
    FINANCIAL_AID = "financial_aid"
    EMPLOYEE = "employee"


class ChargeItem(Base):
    """Service charges - converted from FHIR ChargeItem with billing extensions."""
    __tablename__ = "charge_items"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_charge_item_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("encounters.id"), nullable=True)
    appointment_id = Column(String(36), ForeignKey("appointments.id"), nullable=True)
    
    # Service details
    service_code = Column(String(50), nullable=False)  # CPT, HCPCS, or internal code
    service_name = Column(String(500), nullable=False)
    service_category = Column(String(100), nullable=True)
    code = Column(JSON, nullable=False)  # CodeableConcept with coding system
    
    # Status
    status = Column(Enum(ChargeItemStatus), default=ChargeItemStatus.PLANNED, nullable=False)
    
    # Occurrence
    occurrence_date = Column(DateTime(timezone=True), nullable=False)
    occurrence_period_start = Column(DateTime(timezone=True), nullable=True)
    occurrence_period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Quantity
    quantity = Column(Numeric(10, 2), default=1.0, nullable=False)
    quantity_unit = Column(String(20), nullable=True)
    
    # Pricing
    unit_price = Column(Numeric(15, 2), nullable=False)
    gross_amount = Column(Numeric(15, 2), nullable=False)  # quantity * unit_price
    factor_override = Column(Numeric(5, 2), nullable=True)  # Multiplier for special cases
    price_override = Column(Numeric(15, 2), nullable=True)
    override_reason = Column(Text, nullable=True)
    
    # Net calculation
    discount_amount = Column(Numeric(15, 2), default=0.0)
    tax_amount = Column(Numeric(15, 2), default=0.0)
    net_amount = Column(Numeric(15, 2), nullable=False)
    
    # Performer
    performer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    performing_organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    requesting_organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    
    # Cost center
    cost_center_id = Column(String(36), ForeignKey("hospital_departments.id"), nullable=True)
    
    # Body site (for procedures)
    body_site = Column(JSON, nullable=True)  # Array of CodeableConcept
    
    # Reason
    reason_codes = Column(JSON, nullable=True)  # Array of diagnosis codes
    
    # Product (for supplies/medications)
    product_reference = Column(String(255), nullable=True)  # Reference to medication/device
    product_code = Column(JSON, nullable=True)  # CodeableConcept
    
    # Account
    account_id = Column(String(36), ForeignKey("patient_accounts.id"), nullable=True)
    
    # Supporting information
    supporting_info = Column(JSON, nullable=True)  # References to other resources
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Entry information
    entered_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    entered_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Billing
    is_billed = Column(Boolean, default=False)
    billed_date = Column(DateTime(timezone=True), nullable=True)
    bill_id = Column(String(36), ForeignKey("bills.id"), nullable=True)
    
    # Part of another charge
    part_of_id = Column(String(36), ForeignKey("charge_items.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    encounter = relationship("Encounter")
    appointment = relationship("Appointment")
    performer = relationship("User", foreign_keys=[performer_id])
    performing_organization = relationship("Hospital", foreign_keys=[performing_organization_id])
    requesting_organization = relationship("Hospital", foreign_keys=[requesting_organization_id])
    cost_center = relationship("HospitalDepartment")
    account = relationship("PatientAccount")
    bill = relationship("Bill", back_populates="charge_items")
    enterer = relationship("User", foreign_keys=[entered_by])
    part_of = relationship("ChargeItem", remote_side=[id])
    
    # Modifiers
    modifiers = relationship("ChargeItemModifier", back_populates="charge_item", cascade="all, delete-orphan")


class ChargeItemModifier(Base):
    """Modifiers for charge items (e.g., discounts, adjustments)."""
    __tablename__ = "charge_item_modifiers"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    charge_item_id = Column(String(36), ForeignKey("charge_items.id"), nullable=False)
    
    # Modifier details
    modifier_type = Column(Enum(DiscountType), nullable=False)
    modifier_code = Column(String(50), nullable=True)
    description = Column(String(500), nullable=False)
    
    # Value
    percentage = Column(Numeric(5, 2), nullable=True)  # For percentage discounts
    amount = Column(Numeric(15, 2), nullable=True)  # For fixed amount discounts
    
    # Authorization
    authorized_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    authorization_date = Column(DateTime(timezone=True), server_default=func.now())
    authorization_reference = Column(String(100), nullable=True)
    
    # Reason
    reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    charge_item = relationship("ChargeItem", back_populates="modifiers")
    authorizer = relationship("User")


class PatientAccount(Base):
    """Patient financial account for tracking balances."""
    __tablename__ = "patient_accounts"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    
    # Account details
    account_number = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Type
    account_type = Column(String(50), default="patient")  # patient, insurance, guarantor
    
    # Status
    status = Column(String(20), default="active")  # active, inactive, closed
    
    # Guarantor (if different from patient)
    guarantor_name = Column(String(200), nullable=True)
    guarantor_relationship = Column(String(50), nullable=True)
    guarantor_phone = Column(String(20), nullable=True)
    guarantor_address = Column(Text, nullable=True)
    
    # Balance tracking
    total_charges = Column(Numeric(15, 2), default=0.0)
    total_adjustments = Column(Numeric(15, 2), default=0.0)
    total_payments = Column(Numeric(15, 2), default=0.0)
    current_balance = Column(Numeric(15, 2), default=0.0)
    
    # Credit management
    credit_limit = Column(Numeric(15, 2), nullable=True)
    payment_terms_days = Column(Integer, default=30)
    
    # Coverage period
    coverage_start = Column(Date, nullable=True)
    coverage_end = Column(Date, nullable=True)
    
    # Service period
    service_period_start = Column(Date, nullable=True)
    service_period_end = Column(Date, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    bills = relationship("Bill", back_populates="account")
    transactions = relationship("FinancialTransaction", back_populates="account")


class Bill(Base):
    """Patient bills/invoices."""
    __tablename__ = "bills"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    account_id = Column(String(36), ForeignKey("patient_accounts.id"), nullable=False)
    
    # Bill identification
    bill_number = Column(String(50), unique=True, nullable=False, index=True)
    bill_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    
    # Type
    bill_type = Column(String(50), nullable=False)  # service, pharmacy, lab, etc.
    
    # Period
    service_period_start = Column(Date, nullable=False)
    service_period_end = Column(Date, nullable=False)
    
    # Status
    status = Column(Enum(BillStatus), default=BillStatus.DRAFT, nullable=False)
    
    # Amounts
    total_charges = Column(Numeric(15, 2), nullable=False)
    total_discounts = Column(Numeric(15, 2), default=0.0)
    total_adjustments = Column(Numeric(15, 2), default=0.0)
    total_tax = Column(Numeric(15, 2), default=0.0)
    total_amount = Column(Numeric(15, 2), nullable=False)
    
    # Payments
    paid_amount = Column(Numeric(15, 2), default=0.0)
    balance_due = Column(Numeric(15, 2), nullable=False)
    
    # Insurance
    insurance_billed = Column(Boolean, default=False)
    insurance_billed_amount = Column(Numeric(15, 2), default=0.0)
    insurance_paid_amount = Column(Numeric(15, 2), default=0.0)
    insurance_adjustment = Column(Numeric(15, 2), default=0.0)
    patient_responsibility = Column(Numeric(15, 2), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    
    # Submission
    submitted_date = Column(Date, nullable=True)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Cancellation
    cancelled_date = Column(DateTime(timezone=True), nullable=True)
    cancelled_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Relationships
    patient = relationship("Patient")
    account = relationship("PatientAccount", back_populates="bills")
    charge_items = relationship("ChargeItem", back_populates="bill")
    payments = relationship("Payment", back_populates="bill")
    creator = relationship("User", foreign_keys=[created_by])
    submitter = relationship("User", foreign_keys=[submitted_by])
    canceller = relationship("User", foreign_keys=[cancelled_by])


class Payment(Base):
    """Payment transactions."""
    __tablename__ = "payments"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    bill_id = Column(String(36), ForeignKey("bills.id"), nullable=True)
    
    # Payment details
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    
    # Amount
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="UZS")
    
    # Method
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    
    # Status
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    
    # Reference numbers
    reference_number = Column(String(100), nullable=True)  # Check number, transaction ID
    authorization_code = Column(String(50), nullable=True)  # For card payments
    
    # Card details (masked)
    card_last_four = Column(String(4), nullable=True)
    card_type = Column(String(20), nullable=True)  # visa, mastercard, etc.
    
    # Bank details (for transfers)
    bank_name = Column(String(100), nullable=True)
    bank_reference = Column(String(100), nullable=True)
    
    # Payer (if different from patient)
    payer_name = Column(String(200), nullable=True)
    payer_relationship = Column(String(50), nullable=True)
    
    # Processing
    processed_date = Column(DateTime(timezone=True), nullable=True)
    processor_reference = Column(String(100), nullable=True)
    
    # Refund
    is_refunded = Column(Boolean, default=False)
    refunded_amount = Column(Numeric(15, 2), default=0.0)
    refund_date = Column(DateTime(timezone=True), nullable=True)
    refund_reason = Column(Text, nullable=True)
    
    # Receipt
    receipt_number = Column(String(50), unique=True, nullable=True)
    receipt_issued = Column(Boolean, default=False)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Entry
    received_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    bill = relationship("Bill", back_populates="payments")
    receiver = relationship("User")
    transactions = relationship("FinancialTransaction", back_populates="payment")


class FinancialTransaction(Base):
    """Detailed financial transaction ledger."""
    __tablename__ = "financial_transactions"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Account
    account_id = Column(String(36), ForeignKey("patient_accounts.id"), nullable=False)
    
    # Transaction details
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    transaction_type = Column(String(50), nullable=False)  # charge, payment, adjustment, refund
    
    # References
    charge_item_id = Column(String(36), ForeignKey("charge_items.id"), nullable=True)
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=True)
    
    # Amounts
    debit_amount = Column(Numeric(15, 2), default=0.0)
    credit_amount = Column(Numeric(15, 2), default=0.0)
    running_balance = Column(Numeric(15, 2), nullable=False)
    
    # Description
    description = Column(String(500), nullable=False)
    reference_number = Column(String(100), nullable=True)
    
    # Entry
    posted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    posted_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Reversal
    is_reversed = Column(Boolean, default=False)
    reversed_by_id = Column(String(36), ForeignKey("financial_transactions.id"), nullable=True)
    reversal_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    account = relationship("PatientAccount", back_populates="transactions")
    charge_item = relationship("ChargeItem")
    payment = relationship("Payment", back_populates="transactions")
    poster = relationship("User")
    reversed_by = relationship("FinancialTransaction", remote_side=[id])