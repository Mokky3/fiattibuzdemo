from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from enum import Enum
from decimal import Decimal

# ================================
# Medication & Prescription Schemas
# ================================

class MedicationFormEnum(str, Enum):
    TABLET = "tablet"
    CAPSULE = "capsule"
    SYRUP = "syrup"
    INJECTION = "injection"
    CREAM = "cream"
    OINTMENT = "ointment"
    DROPS = "drops"
    INHALER = "inhaler"
    PATCH = "patch"
    SUPPOSITORY = "suppository"
    POWDER = "powder"
    SOLUTION = "solution"
    GEL = "gel"
    LOTION = "lotion"

class RouteEnum(str, Enum):
    ORAL = "oral"
    TOPICAL = "topical"
    INTRAVENOUS = "intravenous"
    INTRAMUSCULAR = "intramuscular"
    SUBCUTANEOUS = "subcutaneous"
    INHALATION = "inhalation"
    RECTAL = "rectal"
    VAGINAL = "vaginal"
    OPHTHALMIC = "ophthalmic"
    OTIC = "otic"
    NASAL = "nasal"
    SUBLINGUAL = "sublingual"
    TRANSDERMAL = "transdermal"

class FrequencyEnum(str, Enum):
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    EVERY_6_HOURS = "every_6_hours"
    EVERY_8_HOURS = "every_8_hours"
    EVERY_12_HOURS = "every_12_hours"
    AS_NEEDED = "as_needed"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class PrescriptionStatusEnum(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DISCONTINUED = "discontinued"
    PAUSED = "paused"
    PENDING = "pending"

class Medication(BaseModel):
    """Base medication information"""
    name: str = Field(..., min_length=2, max_length=200, description="Generic or brand name")
    brand_name: Optional[str] = Field(None, max_length=200)
    generic_name: Optional[str] = Field(None, max_length=200)
    
    # Drug classification
    drug_class: Optional[str] = Field(None, max_length=100)
    atc_code: Optional[str] = Field(None, max_length=20, description="Anatomical Therapeutic Chemical code")
    
    # Physical properties
    form: MedicationFormEnum
    strength: str = Field(..., max_length=50, description="e.g., 500mg, 10mg/ml")
    strength_unit: str = Field(..., max_length=20, description="mg, ml, mcg, etc.")
    
    # Administration
    route: RouteEnum
    
    # Safety information
    is_controlled: bool = Field(default=False)
    requires_prescription: bool = Field(default=True)
    pregnancy_category: Optional[str] = Field(None, max_length=5, description="A, B, C, D, X")
    
    # Additional info
    manufacturer: Optional[str] = Field(None, max_length=100)
    ndc_number: Optional[str] = Field(None, max_length=20, description="National Drug Code")
    
    # Clinical info
    indications: List[str] = Field(default_factory=list)
    contraindications: List[str] = Field(default_factory=list)
    side_effects: List[str] = Field(default_factory=list)
    interactions: List[str] = Field(default_factory=list)

class Dosage(BaseModel):
    """Dosage instructions"""
    dose: str = Field(..., min_length=1, max_length=50, description="e.g., 1, 2.5, 1/2")
    dose_unit: str = Field(..., max_length=20, description="tablet, ml, mg, etc.")
    frequency: FrequencyEnum
    custom_frequency: Optional[str] = Field(None, max_length=100, description="Custom frequency if not standard")
    
    # Timing
    timing_instructions: Optional[str] = Field(None, max_length=200, description="e.g., with food, before meals")
    start_date: date
    end_date: Optional[date] = None
    duration_days: Optional[int] = Field(None, ge=1, le=365)
    
    # Special instructions
    as_needed: bool = Field(default=False)
    as_needed_reason: Optional[str] = Field(None, max_length=200, description="Reason for as-needed use")
    max_dose_per_day: Optional[str] = Field(None, max_length=50, description="Maximum daily dose if as-needed")
    
    # Administration details
    special_instructions: Optional[str] = Field(None, max_length=500)
    taper_instructions: Optional[str] = Field(None, max_length=300, description="Tapering schedule if applicable")

class PrescriptionItem(BaseModel):
    """Individual prescription item"""
    medication: Medication
    dosage: Dosage
    
    # Quantity
    quantity: int = Field(..., ge=1, le=1000, description="Number of units to dispense")
    quantity_unit: str = Field(..., max_length=20, description="tablets, ml, inhalers, etc.")
    days_supply: Optional[int] = Field(None, ge=1, le=365)
    
    # Refills
    refills_allowed: int = Field(default=0, ge=0, le=12)
    refills_remaining: int = Field(default=0, ge=0, le=12)
    
    # Substitution
    generic_substitution_allowed: bool = Field(default=True)
    
    # Clinical reasoning
    indication: str = Field(..., min_length=3, max_length=200, description="Reason for prescribing")
    notes: Optional[str] = Field(None, max_length=500)

class PrescriptionBase(BaseModel):
    """Base prescription schema"""
    patient_id: str
    consultation_id: Optional[str] = None  # Link to consultation if applicable
    
    # Prescription details
    items: List[PrescriptionItem] = Field(..., min_items=1, max_items=20)
    
    # Instructions
    general_instructions: Optional[str] = Field(None, max_length=1000)
    pharmacy_notes: Optional[str] = Field(None, max_length=500)
    
    # Validity
    valid_until: date
    
    # Follow-up
    follow_up_required: bool = Field(default=False)
    follow_up_date: Optional[date] = None
    follow_up_instructions: Optional[str] = Field(None, max_length=500)

class PrescriptionCreate(PrescriptionBase):
    """Schema for creating new prescription"""
    send_to_pharmacy: bool = Field(default=False)
    pharmacy_id: Optional[str] = None
    priority: str = Field(default="normal", regex=r'^(normal|urgent|stat)')

class PrescriptionUpdate(BaseModel):
    """Schema for updating prescription"""
    items: Optional[List[PrescriptionItem]] = Field(None, min_items=1, max_items=20)
    general_instructions: Optional[str] = Field(None, max_length=1000)
    pharmacy_notes: Optional[str] = Field(None, max_length=500)
    valid_until: Optional[date] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[date] = None
    follow_up_instructions: Optional[str] = Field(None, max_length=500)
    status: Optional[PrescriptionStatusEnum] = None

class PrescriptionResponse(PrescriptionBase):
    """Schema for prescription response"""
    id: str
    prescription_number: str  # e.g., RX-2025-001234
    doctor_id: str
    status: PrescriptionStatusEnum
    
    # Patient info (embedded)
    patient_name: str
    patient_age: int
    patient_phone: str
    
    # Doctor info (embedded)
    doctor_name: str
    doctor_license: Optional[str] = None
    doctor_dea: Optional[str] = None  # DEA number if applicable
    
    # Pharmacy info
    pharmacy_id: Optional[str] = None
    pharmacy_name: Optional[str] = None
    sent_to_pharmacy_at: Optional[datetime] = None
    
    # System fields
    created_at: datetime
    updated_at: datetime
    prescribed_at: datetime
    
    # Digital signature
    is_signed: bool = Field(default=False)
    signed_at: Optional[datetime] = None
    digital_signature: Optional[str] = None
    
    # Dispensing tracking
    dispensed_at: Optional[datetime] = None
    dispensed_by: Optional[str] = None  # Pharmacist
    
    class Config:
        from_attributes = True

class PrescriptionList(BaseModel):
    """Schema for prescription list with pagination"""
    prescriptions: List[PrescriptionResponse]
    total: int
    page: int
    size: int
    total_pages: int

# ================================
# Medication History Schemas
# ================================

class CurrentMedication(BaseModel):
    """Current medication patient is taking"""
    medication_name: str = Field(..., min_length=2, max_length=200)
    dosage: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field(..., min_length=1, max_length=100)
    start_date: Optional[date] = None
    prescribing_doctor: Optional[str] = Field(None, max_length=100)
    indication: Optional[str] = Field(None, max_length=200)
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(None, max_length=300)

class MedicationHistory(BaseModel):
    """Patient's medication history"""
    patient_id: str
    current_medications: List[CurrentMedication] = Field(default_factory=list)
    discontinued_medications: List[CurrentMedication] = Field(default_factory=list)
    
    # Drug allergies and adverse reactions
    drug_allergies: List[str] = Field(default_factory=list)
    adverse_reactions: List[Dict[str, str]] = Field(default_factory=list)
    
    # Last updated
    last_updated: datetime
    updated_by: str  # Doctor/staff ID

class MedicationHistoryUpdate(BaseModel):
    """Update medication history"""
    current_medications: Optional[List[CurrentMedication]] = None
    discontinued_medications: Optional[List[CurrentMedication]] = None
    drug_allergies: Optional[List[str]] = None
    adverse_reactions: Optional[List[Dict[str, str]]] = None

# ================================
# Drug Interaction & Safety Schemas
# ================================

class InteractionSeverityEnum(str, Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    CONTRAINDICATED = "contraindicated"

class DrugInteraction(BaseModel):
    """Drug interaction warning"""
    drug1: str
    drug2: str
    interaction_type: str = Field(..., max_length=100)
    severity: InteractionSeverityEnum
    description: str = Field(..., min_length=10, max_length=500)
    clinical_effect: str = Field(..., min_length=5, max_length=300)
    management: Optional[str] = Field(None, max_length=300)

class AllergyAlert(BaseModel):
    """Allergy alert for prescription"""
    allergen: str
    medication: str
    severity: str
    alert_message: str = Field(..., min_length=10, max_length=200)

class SafetyCheck(BaseModel):
    """Safety check results for prescription"""
    prescription_id: str
    drug_interactions: List[DrugInteraction] = Field(default_factory=list)
    allergy_alerts: List[AllergyAlert] = Field(default_factory=list)
    contraindications: List[str] = Field(default_factory=list)
    pregnancy_warnings: List[str] = Field(default_factory=list)
    age_warnings: List[str] = Field(default_factory=list)
    renal_warnings: List[str] = Field(default_factory=list)
    hepatic_warnings: List[str] = Field(default_factory=list)
    
    overall_risk: str = Field(..., regex=r'^(low|moderate|high|critical)')
    requires_approval: bool = Field(default=False)
    checked_at: datetime = Field(default_factory=datetime.now)

# ================================
# Pharmacy Integration Schemas
# ================================

class Pharmacy(BaseModel):
    """Pharmacy information"""
    id: str
    name: str = Field(..., min_length=2, max_length=200)
    address: str = Field(..., min_length=10, max_length=300)
    phone: str = Field(..., regex=r'^\+?[\d\s\-\(\)]{10,20}')
    email: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    
    # Integration details
    accepts_electronic_prescriptions: bool = Field(default=False)
    integration_id: Optional[str] = None
    api_endpoint: Optional[str] = None
    
    # Operating hours
    hours_monday: Optional[str] = Field(None, max_length=50)
    hours_tuesday: Optional[str] = Field(None, max_length=50)
    hours_wednesday: Optional[str] = Field(None, max_length=50)
    hours_thursday: Optional[str] = Field(None, max_length=50)
    hours_friday: Optional[str] = Field(None, max_length=50)
    hours_saturday: Optional[str] = Field(None, max_length=50)
    hours_sunday: Optional[str] = Field(None, max_length=50)
    
    is_active: bool = Field(default=True)

class ElectronicPrescription(BaseModel):
    """Electronic prescription for pharmacy transmission"""
    prescription_id: str
    pharmacy_id: str
    transmission_data: Dict[str, Any]
    sent_at: datetime
    confirmation_number: Optional[str] = None
    status: str = Field(..., regex=r'^(sent|received|processing|dispensed|rejected)')
    
class PrescriptionRefill(BaseModel):
    """Prescription refill request"""
    prescription_id: str
    requested_by: str  # patient_id or pharmacy_id
    refill_number: int = Field(..., ge=1, le=12)
    request_date: datetime = Field(default_factory=datetime.now)
    approved: Optional[bool] = None
    approved_by: Optional[str] = None  # doctor_id
    approved_at: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)

# ================================
# Reports & Analytics Schemas
# ================================

class PrescriptionAnalytics(BaseModel):
    """Prescription analytics for doctor"""
    doctor_id: str
    period_start: date
    period_end: date
    
    # Counts
    total_prescriptions: int
    total_patients: int
    total_medications: int
    
    # Most prescribed
    most_prescribed_drugs: List[Dict[str, Any]]
    most_common_indications: List[Dict[str, str]]
    
    # Safety metrics
    interaction_alerts: int
    allergy_alerts: int
    contraindication_warnings: int
    
    # Compliance
    electronic_prescriptions_percentage: float
    signed_prescriptions_percentage: float

# ================================
# Validators
# ================================

@validator('valid_until')
def validate_prescription_validity(cls, v):
    """Validate prescription validity date"""
    if v and v <= date.today():
        raise ValueError('Prescription validity date must be in the future')
    if v and (v - date.today()).days > 365:
        raise ValueError('Prescription validity cannot exceed 1 year')
    return v

@validator('refills_remaining')
def validate_refills_remaining(cls, v, values):
    """Ensure refills remaining doesn't exceed allowed"""
    if 'refills_allowed' in values and v > values['refills_allowed']:
        raise ValueError('Refills remaining cannot exceed refills allowed')
    return v

@validator('quantity')
def validate_quantity(cls, v, values):
    """Validate prescription quantity is reasonable"""
    if v and 'days_supply' in values and values['days_supply']:
        # Basic check - can be enhanced based on medication type
        if v > values['days_supply'] * 10:  # Arbitrary limit
            raise ValueError('Quantity seems unusually high for days supply')
    return v

# Apply validators to relevant classes
PrescriptionBase.__validators__['validate_prescription_validity'] = validator('valid_until', allow_reuse=True)(validate_prescription_validity)
PrescriptionItem.__validators__['validate_refills_remaining'] = validator('refills_remaining', allow_reuse=True)(validate_refills_remaining)
PrescriptionItem.__validators__['validate_quantity'] = validator('quantity', allow_reuse=True)(validate_quantity)