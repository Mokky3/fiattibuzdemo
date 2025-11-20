"""Test Orders and Referrals schemas for structured data validation."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TestOrderStatus(str, Enum):
    """Test order status enumeration."""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class TestType(str, Enum):
    """Test type enumeration."""
    LABORATORY = "lab"
    IMAGING = "imaging"
    PROCEDURE = "procedure"
    CARDIAC = "cardiac"
    NEUROLOGICAL = "neurological"


class Priority(str, Enum):
    """Priority enumeration."""
    STAT = "stat"
    URGENT = "urgent"
    ROUTINE = "routine"
    ELECTIVE = "elective"


class TestOrderData(BaseModel):
    """Test order data schema."""
    test_name: str = Field(..., description="Name of the test")
    test_type: TestType = Field(..., description="Type of test")
    test_code: Optional[str] = Field(None, description="LOINC or CPT code")
    test_description: Optional[str] = Field(None, description="Description of the test")
    clinical_indication: Optional[str] = Field(None, description="Clinical indication for the test")
    priority: Priority = Field(Priority.ROUTINE, description="Priority of the test")
    fasting_required: bool = Field(False, description="Whether fasting is required")
    special_instructions: Optional[str] = Field(None, description="Special instructions for the test")


class CreateTestOrderRequest(BaseModel):
    """Request to create a test order."""
    patient_id: str = Field(..., description="Patient ID")
    clinic_id: str = Field(..., description="Clinic ID")
    encounter_id: Optional[str] = Field(None, description="Associated encounter ID")
    general_report_id: Optional[str] = Field(None, description="Associated general report ID")
    test_data: TestOrderData = Field(..., description="Test order data")


class TestOrderResponse(BaseModel):
    """Test order response schema."""
    id: str = Field(..., description="Test order ID")
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    clinic_id: str = Field(..., description="Clinic ID")
    encounter_id: Optional[str] = Field(None, description="Encounter ID")
    general_report_id: Optional[str] = Field(None, description="General report ID")
    
    # Test information
    test_name: str = Field(..., description="Test name")
    test_type: str = Field(..., description="Test type")
    test_code: Optional[str] = Field(None, description="Test code")
    test_description: Optional[str] = Field(None, description="Test description")
    clinical_indication: Optional[str] = Field(None, description="Clinical indication")
    priority: str = Field(..., description="Priority")
    fasting_required: bool = Field(..., description="Fasting required")
    special_instructions: Optional[str] = Field(None, description="Special instructions")
    
    # Status and timing
    status: TestOrderStatus = Field(..., description="Test order status")
    ordered_at: datetime = Field(..., description="Order date")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled date")
    completed_at: Optional[datetime] = Field(None, description="Completion date")
    
    # Results
    result_data: Optional[Dict[str, Any]] = Field(None, description="Test results")
    result_file_path: Optional[str] = Field(None, description="Result file path")
    result_notes: Optional[str] = Field(None, description="Result notes")
    
    # FHIR integration
    fhir_service_request_id: Optional[str] = Field(None, description="FHIR ServiceRequest ID")
    fhir_diagnostic_report_id: Optional[str] = Field(None, description="FHIR DiagnosticReport ID")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class TestOrderSummary(BaseModel):
    """Test order summary for listing."""
    id: str = Field(..., description="Test order ID")
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    clinic_id: str = Field(..., description="Clinic ID")
    test_name: str = Field(..., description="Test name")
    test_type: str = Field(..., description="Test type")
    priority: str = Field(..., description="Priority")
    status: TestOrderStatus = Field(..., description="Status")
    ordered_at: datetime = Field(..., description="Order date")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled date")
    completed_at: Optional[datetime] = Field(None, description="Completion date")


class UpdateTestOrderRequest(BaseModel):
    """Request to update a test order."""
    test_data: Optional[TestOrderData] = Field(None, description="Updated test data")
    status: Optional[TestOrderStatus] = Field(None, description="Updated status")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled date")
    result_data: Optional[Dict[str, Any]] = Field(None, description="Test results")
    result_notes: Optional[str] = Field(None, description="Result notes")


class ReferralStatus(str, Enum):
    """Referral status enumeration."""
    PENDING = "pending"
    SENT = "sent"
    ACCEPTED = "accepted"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DECLINED = "declined"


class Urgency(str, Enum):
    """Urgency enumeration."""
    URGENT = "urgent"
    ROUTINE = "routine"
    ELECTIVE = "elective"


class ReferralData(BaseModel):
    """Referral data schema."""
    specialty: str = Field(..., description="Medical specialty")
    department: Optional[str] = Field(None, description="Department")
    referral_reason: str = Field(..., description="Reason for referral")
    clinical_summary: Optional[str] = Field(None, description="Clinical summary")
    urgency: Urgency = Field(Urgency.ROUTINE, description="Urgency of referral")
    referral_notes: Optional[str] = Field(None, description="Additional notes")
    follow_up_required: bool = Field(True, description="Whether follow-up is required")


class CreateReferralRequest(BaseModel):
    """Request to create a referral."""
    patient_id: str = Field(..., description="Patient ID")
    clinic_id: str = Field(..., description="Clinic ID")
    referred_to_doctor_id: Optional[str] = Field(None, description="Referred to doctor ID")
    referred_to_clinic_id: Optional[str] = Field(None, description="Referred to clinic ID")
    encounter_id: Optional[str] = Field(None, description="Associated encounter ID")
    general_report_id: Optional[str] = Field(None, description="Associated general report ID")
    referral_data: ReferralData = Field(..., description="Referral data")


class ReferralResponse(BaseModel):
    """Referral response schema."""
    id: str = Field(..., description="Referral ID")
    patient_id: str = Field(..., description="Patient ID")
    referring_doctor_id: str = Field(..., description="Referring doctor ID")
    referred_to_doctor_id: Optional[str] = Field(None, description="Referred to doctor ID")
    referring_clinic_id: str = Field(..., description="Referring clinic ID")
    referred_to_clinic_id: Optional[str] = Field(None, description="Referred to clinic ID")
    encounter_id: Optional[str] = Field(None, description="Encounter ID")
    general_report_id: Optional[str] = Field(None, description="General report ID")
    
    # Referral information
    specialty: str = Field(..., description="Medical specialty")
    department: Optional[str] = Field(None, description="Department")
    referral_reason: str = Field(..., description="Reason for referral")
    clinical_summary: Optional[str] = Field(None, description="Clinical summary")
    urgency: str = Field(..., description="Urgency")
    referral_notes: Optional[str] = Field(None, description="Referral notes")
    follow_up_required: bool = Field(..., description="Follow-up required")
    
    # Status and timing
    status: ReferralStatus = Field(..., description="Referral status")
    referral_date: datetime = Field(..., description="Referral date")
    appointment_date: Optional[datetime] = Field(None, description="Appointment date")
    completed_date: Optional[datetime] = Field(None, description="Completion date")
    
    # Communication
    response_notes: Optional[str] = Field(None, description="Response notes")
    
    # FHIR integration
    fhir_referral_request_id: Optional[str] = Field(None, description="FHIR ReferralRequest ID")
    fhir_appointment_id: Optional[str] = Field(None, description="FHIR Appointment ID")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class ReferralSummary(BaseModel):
    """Referral summary for listing."""
    id: str = Field(..., description="Referral ID")
    patient_id: str = Field(..., description="Patient ID")
    referring_doctor_id: str = Field(..., description="Referring doctor ID")
    referred_to_doctor_id: Optional[str] = Field(None, description="Referred to doctor ID")
    referring_clinic_id: str = Field(..., description="Referring clinic ID")
    referred_to_clinic_id: Optional[str] = Field(None, description="Referred to clinic ID")
    specialty: str = Field(..., description="Medical specialty")
    department: Optional[str] = Field(None, description="Department")
    urgency: str = Field(..., description="Urgency")
    status: ReferralStatus = Field(..., description="Status")
    referral_date: datetime = Field(..., description="Referral date")
    appointment_date: Optional[datetime] = Field(None, description="Appointment date")
    completed_date: Optional[datetime] = Field(None, description="Completion date")


class UpdateReferralRequest(BaseModel):
    """Request to update a referral."""
    referral_data: Optional[ReferralData] = Field(None, description="Updated referral data")
    status: Optional[ReferralStatus] = Field(None, description="Updated status")
    appointment_date: Optional[datetime] = Field(None, description="Appointment date")
    response_notes: Optional[str] = Field(None, description="Response notes")