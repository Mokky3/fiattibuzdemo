from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date, time
from enum import Enum
from decimal import Decimal

# ================================
# Lab Result Interpretation Schemas
# ================================

class InterpretationSeverityEnum(str, Enum):
    NORMAL = "normal"
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"

class LabInterpretation(BaseModel):
    """AI-powered or doctor's interpretation of lab results"""
    result_id: str
    interpretation_type: str = Field(..., regex=r'^(automated|doctor|ai_assisted)$')
# Lab Order Schemas
# ================================

class LabTestCategoryEnum(str, Enum):
    HEMATOLOGY = "hematology"
    CHEMISTRY = "chemistry"
    MICROBIOLOGY = "microbiology"
    IMMUNOLOGY = "immunology"
    ENDOCRINOLOGY = "endocrinology"
    TOXICOLOGY = "toxicology"
    MOLECULAR = "molecular"
    CYTOLOGY = "cytology"
    HISTOPATHOLOGY = "histopathology"
    GENETICS = "genetics"
    COAGULATION = "coagulation"
    CARDIAC_MARKERS = "cardiac_markers"
    TUMOR_MARKERS = "tumor_markers"
    URINALYSIS = "urinalysis"
    OTHER = "other"

class LabOrderStatusEnum(str, Enum):
    PENDING = "pending"
    COLLECTED = "collected"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

class SpecimenTypeEnum(str, Enum):
    BLOOD = "blood"
    SERUM = "serum"
    PLASMA = "plasma"
    URINE = "urine"
    STOOL = "stool"
    SPUTUM = "sputum"
    CSF = "csf"  # Cerebrospinal fluid
    SALIVA = "saliva"
    TISSUE = "tissue"
    SWAB = "swab"
    FLUID = "fluid"
    OTHER = "other"

class UrgencyEnum(str, Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    STAT = "stat"  # Immediate
    ASAP = "asap"  # As soon as possible

class LabTest(BaseModel):
    """Individual lab test definition"""
    code: str = Field(..., min_length=2, max_length=20, description="Lab test code (e.g., CBC, CRP)")
    name: str = Field(..., min_length=3, max_length=200, description="Test name")
    category: LabTestCategoryEnum
    specimen_type: SpecimenTypeEnum
    
    # Test details
    description: Optional[str] = Field(None, max_length=500)
    method: Optional[str] = Field(None, max_length=100, description="Testing methodology")
    reference_range: Optional[str] = Field(None, max_length=200)
    
    # Clinical info
    indications: List[str] = Field(default_factory=list)
    contraindications: List[str] = Field(default_factory=list)
    
    # Logistics
    turnaround_time_hours: Optional[int] = Field(None, ge=1, le=168)  # 1 hour to 1 week
    fasting_required: bool = Field(default=False)
    special_instructions: Optional[str] = Field(None, max_length=300)
    
    # Cost
    cost: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    
    # Availability
    is_active: bool = Field(default=True)
    requires_approval: bool = Field(default=False)

class LabOrderItem(BaseModel):
    """Individual test in a lab order"""
    test: LabTest
    urgency: UrgencyEnum = Field(default=UrgencyEnum.ROUTINE)
    clinical_info: Optional[str] = Field(None, max_length=500, description="Clinical indication for test")
    special_instructions: Optional[str] = Field(None, max_length=300)
    
    # Collection details
    collection_date: Optional[datetime] = None
    collection_notes: Optional[str] = Field(None, max_length=200)

class LabOrderBase(BaseModel):
    """Base lab order schema"""
    patient_id: str
    consultation_id: Optional[str] = None
    
    # Order details
    tests: List[LabOrderItem] = Field(..., min_items=1, max_items=50)
    
    # Clinical context
    clinical_diagnosis: Optional[str] = Field(None, max_length=300)
    relevant_history: Optional[str] = Field(None, max_length=500)
    current_medications: Optional[str] = Field(None, max_length=500)
    
    # Instructions
    general_instructions: Optional[str] = Field(None, max_length=1000)
    patient_preparation: Optional[str] = Field(None, max_length=500)
    
    # Scheduling
    preferred_collection_date: Optional[date] = None
    preferred_collection_time: Optional[time] = None
    
    # Communication
    notify_when_ready: bool = Field(default=True)
    copy_to_patient: bool = Field(default=False)
    additional_recipients: List[str] = Field(default_factory=list, description="Email addresses")

class LabOrderCreate(LabOrderBase):
    """Schema for creating new lab order"""
    priority: UrgencyEnum = Field(default=UrgencyEnum.ROUTINE)
    send_to_lab: bool = Field(default=True)
    lab_facility_id: Optional[str] = None

class LabOrderUpdate(BaseModel):
    """Schema for updating lab order"""
    tests: Optional[List[LabOrderItem]] = Field(None, min_items=1, max_items=50)
    clinical_diagnosis: Optional[str] = Field(None, max_length=300)
    relevant_history: Optional[str] = Field(None, max_length=500)
    current_medications: Optional[str] = Field(None, max_length=500)
    general_instructions: Optional[str] = Field(None, max_length=1000)
    patient_preparation: Optional[str] = Field(None, max_length=500)
    preferred_collection_date: Optional[date] = None
    preferred_collection_time: Optional[time] = None
    status: Optional[LabOrderStatusEnum] = None

class LabOrderResponse(LabOrderBase):
    """Schema for lab order response"""
    id: str
    order_number: str  # e.g., LAB-2025-001234
    doctor_id: str
    status: LabOrderStatusEnum
    
    # Patient info (embedded)
    patient_name: str
    patient_age: int
    patient_gender: str
    patient_mrn: Optional[str] = None  # Medical record number
    
    # Doctor info (embedded)
    doctor_name: str
    doctor_specialization: Optional[str] = None
    
    # Lab facility
    lab_facility_id: Optional[str] = None
    lab_facility_name: Optional[str] = None
    
    # System fields
    created_at: datetime
    updated_at: datetime
    ordered_at: datetime
    
    # Collection info
    collected_at: Optional[datetime] = None
    collected_by: Optional[str] = None
    
    # Results
    results_available: bool = Field(default=False)
    results_reviewed: bool = Field(default=False)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    
    # Notifications
    patient_notified: bool = Field(default=False)
    notification_sent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ================================
# Lab Result Schemas
# ================================

class ResultStatusEnum(str, Enum):
    NORMAL = "normal"
    ABNORMAL = "abnormal"
    CRITICAL = "critical"
    PENDING = "pending"
    CANCELLED = "cancelled"
    INCONCLUSIVE = "inconclusive"

class ReferenceRangeType(str, Enum):
    NUMERIC = "numeric"
    TEXT = "text"
    QUALITATIVE = "qualitative"

class NumericRange(BaseModel):
    """Numeric reference range"""
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: str = Field(..., max_length=20)
    age_specific: bool = Field(default=False)
    gender_specific: bool = Field(default=False)

class QualitativeRange(BaseModel):
    """Qualitative reference values"""
    normal_values: List[str] = Field(..., min_items=1)
    abnormal_indicators: List[str] = Field(default_factory=list)

class LabResultItem(BaseModel):
    """Individual test result"""
    test_code: str = Field(..., min_length=2, max_length=20)
    test_name: str = Field(..., min_length=3, max_length=200)
    
    # Result value
    value: Union[str, float, int] = Field(..., description="Test result value")
    unit: Optional[str] = Field(None, max_length=20)
    
    # Reference information
    reference_range: Optional[str] = Field(None, max_length=200)
    numeric_range: Optional[NumericRange] = None
    qualitative_range: Optional[QualitativeRange] = None
    
    # Status and flags
    status: ResultStatusEnum
    abnormal_flag: Optional[str] = Field(None, max_length=10, description="H, L, HH, LL, etc.")
    critical_flag: bool = Field(default=False)
    
    # Additional info
    notes: Optional[str] = Field(None, max_length=500)
    interpretation: Optional[str] = Field(None, max_length=1000)
    
    # Technical details
    method: Optional[str] = Field(None, max_length=100)
    instrument: Optional[str] = Field(None, max_length=100)
    
    # Timestamps
    result_date: datetime
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None

class LabResultBase(BaseModel):
    """Base lab result schema"""
    order_id: str
    patient_id: str
    
    # Results
    results: List[LabResultItem] = Field(..., min_items=1)
    
    # Overall assessment
    overall_status: ResultStatusEnum
    critical_results: bool = Field(default=False)
    
    # Laboratory info
    lab_facility_name: str = Field(..., min_length=2, max_length=200)
    lab_director: Optional[str] = Field(None, max_length=100)
    lab_technician: Optional[str] = Field(None, max_length=100)
    
    # Technical details
    specimen_id: Optional[str] = Field(None, max_length=50)
    collection_datetime: datetime
    received_datetime: Optional[datetime] = None
    processed_datetime: Optional[datetime] = None
    
    # Quality control
    quality_control_passed: bool = Field(default=True)
    quality_notes: Optional[str] = Field(None, max_length=500)
    
    # Comments
    lab_comments: Optional[str] = Field(None, max_length=1000)
    technician_notes: Optional[str] = Field(None, max_length=500)

class LabResultCreate(LabResultBase):
    """Schema for creating lab result"""
    pass

class LabResultResponse(LabResultBase):
    """Schema for lab result response"""
    id: str
    result_number: str  # e.g., RES-2025-001234
    
    # Patient info (embedded)
    patient_name: str
    patient_age: int
    patient_mrn: Optional[str] = None
    
    # Order info (embedded)
    order_number: str
    ordering_doctor: str
    
    # System fields
    created_at: datetime
    updated_at: datetime
    released_at: datetime
    
    # Review status
    reviewed_by_doctor: bool = Field(default=False)
    doctor_review_date: Optional[datetime] = None
    doctor_comments: Optional[str] = Field(None, max_length=1000)
    
    # Patient communication
    patient_notified: bool = Field(default=False)
    notification_method: Optional[str] = Field(None, max_length=50)
    
    class Config:
        from_attributes = True

# ================================
# Lab Facility & Integration Schemas
# ================================

class LabFacility(BaseModel):
    """Laboratory facility information"""
    id: str
    name: str = Field(..., min_length=2, max_length=200)
    address: str = Field(..., min_length=10, max_length=300)
    phone: str = Field(..., regex=r'^\+?[\d\s\-\(\)]{10,20}$')
    email: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # Accreditation
    clia_number: Optional[str] = Field(None, max_length=20, description="Clinical Laboratory Improvement Amendments")
    cap_accredited: bool = Field(default=False, description="College of American Pathologists")
    iso_certified: bool = Field(default=False)
    
    # Services
    available_tests: List[str] = Field(default_factory=list)
    specializations: List[LabTestCategoryEnum] = Field(default_factory=list)
    
    # Integration
    supports_electronic_orders: bool = Field(default=False)
    supports_electronic_results: bool = Field(default=False)
    integration_type: Optional[str] = Field(None, max_length=50)  # HL7, API, etc.
    
    # Hours and availability
    operating_hours: Dict[str, str] = Field(default_factory=dict)
    emergency_contact: Optional[str] = Field(None, max_length=100)
    
    # Performance metrics
    average_turnaround_hours: Optional[int] = Field(None, ge=1, le=168)
    quality_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    
    is_active: bool = Field(default=True)

# ================================
# Lab Analytics & Reports Schemas
# ================================

class LabOrderAnalytics(BaseModel):
    """Lab order analytics for doctor"""
    doctor_id: str
    period_start: date
    period_end: date
    
    # Order statistics
    total_orders: int
    total_tests: int
    total_patients: int
    
    # Most ordered tests
    most_ordered_tests: List[Dict[str, Any]]
    test_categories_breakdown: Dict[str, int]
    
    # Turnaround times
    average_turnaround_hours: float
    orders_by_urgency: Dict[str, int]
    
    # Results
    normal_results_percentage: float
    abnormal_results_percentage: float
    critical_results_count: int
    
    # Trends
    orders_trend: List[Dict[str, Any]]  # Daily/weekly order counts
    cost_analysis: Optional[Dict[str, float]] = None

class CriticalResultAlert(BaseModel):
    """Critical lab result alert"""
    result_id: str
    patient_id: str
    patient_name: str
    test_name: str
    critical_value: str
    reference_range: str
    
    # Alert details
    alert_level: str = Field(..., regex=r'^(high|critical|panic)$')
    alert_message: str = Field(..., min_length=10, max_length=300)
    
    # Timestamps
    result_datetime: datetime
    alert_generated_at: datetime = Field(default_factory=datetime.now)
    
    # Notification status
    doctor_notified: bool = Field(default=False)
    notification_sent_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

# ================================
# Lab Order Templates & Panels
# ================================

class LabPanel(BaseModel):
    """Predefined lab test panel"""
    id: str
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: LabTestCategoryEnum
    
    # Tests included
    tests: List[str] = Field(..., min_items=2, description="List of test codes")
    
    # Clinical context
    indications: List[str] = Field(default_factory=list)
    recommended_for: List[str] = Field(default_factory=list, description="Patient conditions/demographics")
    
    # Cost and logistics
    total_cost: Optional[Decimal] = Field(None, ge=0)
    estimated_turnaround_hours: Optional[int] = Field(None, ge=1)
    
    # Usage
    frequently_used: bool = Field(default=False)
    created_by: Optional[str] = None  # Doctor who created custom panel
    is_standard: bool = Field(default=True)  # Standard vs custom panel
    
    is_active: bool = Field(default=True)

class LabOrderTemplate(BaseModel):
    """Template for commonly ordered lab combinations"""
    id: str
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    
    # Template content
    panels: List[str] = Field(default_factory=list, description="Panel IDs")
    individual_tests: List[str] = Field(default_factory=list, description="Individual test codes")
    
    # Default settings
    default_urgency: UrgencyEnum = Field(default=UrgencyEnum.ROUTINE)
    default_instructions: Optional[str] = Field(None, max_length=500)
    
    # Usage and ownership
    created_by: str  # Doctor ID
    is_public: bool = Field(default=False)  # Available to other doctors
    usage_count: int = Field(default=0)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    last_used: Optional[datetime] = None
    
    is_active: bool = Field(default=True)

# )
    
    # Interpretation content
    summary: str = Field(..., min_length=10, max_length=1000)
    clinical_significance: Optional[str] = Field(None, max_length=1000)
    recommendations: List[str] = Field(default_factory=list)
    
    # Severity assessment
    overall_severity: InterpretationSeverityEnum
    requires_immediate_attention: bool = Field(default=False)
    
    # Follow-up recommendations
    suggested_follow_up: Optional[str] = Field(None, max_length=500)
    additional_tests_recommended: List[str] = Field(default_factory=list)
    
    # Metadata
    interpreted_by: Optional[str] = None  # Doctor ID if manual interpretation
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Review status
    reviewed: bool = Field(default=False)
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

# ================================
# Lab History & Trends Schemas
# ================================

class LabTrendPoint(BaseModel):
    """Single point in lab value trend"""
    test_date: date
    value: Union[float, str]
    reference_range: Optional[str] = None
    status: ResultStatusEnum
    order_id: str

class LabTrendAnalysis(BaseModel):
    """Trend analysis for a specific lab test"""
    patient_id: str
    test_code: str
    test_name: str
    
    # Trend data
    data_points: List[LabTrendPoint] = Field(..., min_items=2)
    date_range_start: date
    date_range_end: date
    
    # Analysis
    trend_direction: str = Field(..., regex=r'^(improving|worsening|stable|fluctuating)$')
