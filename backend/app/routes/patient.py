from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from datetime import datetime, date, timedelta
from typing import List, Optional
import logging

from app.db.database import get_db
from pydantic import BaseModel, field_validator, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patients", tags=["Patients"])

# Import email and SMS services with better error handling
try:
    from app.utils.email_service import send_invitation_email
    from app.utils.sms_service import send_invitation_sms
    EMAIL_SMS_AVAILABLE = True
except ImportError:
    logger.warning("Email/SMS services not available")
    EMAIL_SMS_AVAILABLE = False

# Pydantic models for patients (enhanced with proper validation)
class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    date_of_birth: str = Field(..., description="YYYY-MM-DD format")
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    blood_group: Optional[str] = Field(None, pattern="^(A|B|AB|O)[+-]?$")
    rh_factor: Optional[str] = Field(None, pattern="^(Positive|Negative)$")
    height: Optional[str] = Field(None, max_length=10)
    weight: Optional[str] = Field(None, max_length=10)
    bmi: Optional[str] = Field(None, max_length=10)
    phone_number: Optional[str] = Field(None, pattern=r"^\+998\d{9}$")
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    address: Optional[str] = Field(None, max_length=500)
    temporary_address: Optional[str] = Field(None, max_length=500)
    work_place: Optional[str] = Field(None, max_length=200)
    occupation: Optional[str] = Field(None, max_length=100)

class PatientCreate(PatientBase):
    pinfl: str = Field(..., pattern=r"^\d{14}$", description="14-digit PINFL")
    
    @field_validator('date_of_birth')
    @classmethod
    def validate_date_of_birth(cls, v):
        try:
            birth_date = datetime.strptime(v, "%Y-%m-%d").date()
            if birth_date >= date.today():
                raise ValueError('Date of birth must be in the past')
            return v
        except ValueError as e:
            if "does not match format" in str(e):
                raise ValueError('Date must be in YYYY-MM-DD format')
            raise

class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    date_of_birth: Optional[str] = Field(None, description="YYYY-MM-DD format")
    gender: Optional[str] = Field(None, pattern="^(Male|Female|Other)$")
    blood_group: Optional[str] = Field(None, pattern="^(A|B|AB|O)[+-]?$")
    rh_factor: Optional[str] = Field(None, pattern="^(Positive|Negative)$")
    height: Optional[str] = Field(None, max_length=10)
    weight: Optional[str] = Field(None, max_length=10)
    bmi: Optional[str] = Field(None, max_length=10)
    phone_number: Optional[str] = Field(None, pattern=r"^\+998\d{9}$")
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    address: Optional[str] = Field(None, max_length=500)
    temporary_address: Optional[str] = Field(None, max_length=500)
    work_place: Optional[str] = Field(None, max_length=200)
    occupation: Optional[str] = Field(None, max_length=100)

class PatientResponse(BaseModel):
    id: int
    patient_code: str
    first_name: str
    last_name: str
    date_of_birth: str
    age: str
    gender: str
    blood_group: str
    rh_factor: str
    height: str
    weight: str
    bmi: str
    phone_number: str
    email: str
    address: str
    temporary_address: str
    work_place: str
    occupation: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Registration form schema (for reception registration)
class PatientRegistrationForm(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: date
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    phone_number: str = Field(..., pattern=r"^\+998\d{9}$")
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    address: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=20)
    pinfl: str = Field(..., pattern=r"^\d{14}$")
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if not v or v.strip() == "":
            raise ValueError('Full name cannot be empty')
        return v.strip().title()
    
    @field_validator('date_of_birth')
    @classmethod
    def validate_date_of_birth(cls, v):
        if v >= date.today():
            raise ValueError('Date of birth must be in the past')
        return v

class PatientListResponse(BaseModel):
    patients: List[PatientResponse]
    total: int
    page: int
    size: int
    pages: int

class InvitationRequest(BaseModel):
    patient_id: int

class InvitationResponse(BaseModel):
    message: str
    invitation_token: str
    expires_at: str

# Prescription models
class PrescriptionBase(BaseModel):
    medication_name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field(..., min_length=1, max_length=100)
    duration: Optional[str] = Field(None, max_length=100)
    instructions: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field("active", pattern="^(active|inactive|completed)$")

class PrescriptionCreate(PrescriptionBase):
    patient_id: int

class PrescriptionResponse(PrescriptionBase):
    id: int
    patient_id: int
    doctor_id: int
    doctor_name: str
    prescribed_date: str
    created_at: datetime

    class Config:
        from_attributes = True

# Medical History/Reports models
class ReportResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    doctor_name: str
    date: str
    time: str
    problem: str
    description: str
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None

    class Config:
        from_attributes = True

# Helper functions
def calculate_age(birth_date: date) -> str:
    """Calculate age from birth date"""
    try:
        today = date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return f"{age} y.o."
    except Exception:
        return "Unknown"

def generate_patient_code(patient_id: int) -> str:
    """Generate patient code from ID"""
    return f"#{str(patient_id).zfill(3)}"

def split_full_name(full_name: str) -> tuple:
    """Split full name into first and last name"""
    if not full_name:
        return "", ""
    name_parts = full_name.split()
    first_name = name_parts[0] if name_parts else ""
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
    return first_name, last_name

# Routes

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify routes are working"""
    return {
        "message": "Patient routes are working!",
        "timestamp": datetime.now().isoformat(),
        "status": "success"
    }

@router.get("/test-db")
async def test_database(db: Session = Depends(get_db)):
    """Test database connection and Patient model"""
    try:
        # Test basic database connection
        db.execute("SELECT 1")
        
        # Try to import Patient model
        try:
            from app.models.patient import Patient
            
            # Check if we can query the Patient table
            try:
                count = db.query(Patient).count()
                
                # Get first patient if exists
                first_patient = db.query(Patient).first()
                patient_info = None
                if first_patient:
                    patient_info = {
                        "id": first_patient.id,
                        "full_name": getattr(first_patient, 'full_name', 'N/A'),
                        "phone": getattr(first_patient, 'phone', 'N/A'),
                        "status": getattr(first_patient, 'status', 'N/A'),
                        "created_at": str(getattr(first_patient, 'created_at', 'N/A'))
                    }
                
                # Check what fields are available on the Patient model
                patient_fields = []
                if first_patient:
                    patient_fields = [attr for attr in dir(first_patient) 
                                    if not attr.startswith('_') and not callable(getattr(first_patient, attr))]
                
                return {
                    "status": "success",
                    "message": "Database and Patient model working",
                    "patient_count": count,
                    "table_exists": True,
                    "first_patient": patient_info,
                    "available_fields": patient_fields[:20]  # Limit to first 20 fields
                }
                
            except Exception as table_error:
                return {
                    "status": "warning",
                    "message": "Database works but Patient table issue",
                    "error": str(table_error),
                    "table_exists": False
                }
                
        except ImportError as import_error:
            return {
                "status": "error", 
                "message": "Patient model import failed",
                "error": str(import_error),
                "model_exists": False
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": "Database connection failed",
            "error": str(e)
        }

@router.post("/register", status_code=201)
async def register_patient(
    patient_data: PatientRegistrationForm,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Register a new patient using the registration form"""
    try:
        # Log the incoming data for debugging
        logger.info(f"Attempting to register patient: {patient_data.full_name}")
        logger.info(f"Data: {patient_data.model_dump()}")
        
        from app.models.patient import Patient
        
        # Check if patient already exists (more robust checking)
        existing_checks = []
        
        # Check PINFL
        if patient_data.pinfl:
            pinfl_check = db.query(Patient).filter(Patient.pinfl == patient_data.pinfl).first()
            if pinfl_check:
                raise HTTPException(status_code=409, detail="Patient with this PINFL already exists")
        
        # Check phone
        if patient_data.phone_number:
            phone_check = db.query(Patient).filter(Patient.phone == patient_data.phone_number).first()
            if phone_check:
                raise HTTPException(status_code=409, detail="Patient with this phone number already exists")
        
        # Check email if provided
        if patient_data.email:
            email_check = db.query(Patient).filter(Patient.email == patient_data.email).first()
            if email_check:
                raise HTTPException(status_code=409, detail="Patient with this email already exists")
        
        # Create new patient with proper field mapping
        new_patient = Patient()
        
        # Set required fields
        new_patient.full_name = patient_data.full_name
        new_patient.birth_date = patient_data.date_of_birth
        new_patient.gender = patient_data.gender
        new_patient.phone = patient_data.phone_number
        new_patient.pinfl = patient_data.pinfl
        new_patient.status = "active"
        new_patient.created_at = datetime.utcnow()
        new_patient.updated_at = datetime.utcnow()
        
        # Set optional fields
        if patient_data.email:
            new_patient.email = patient_data.email
        if patient_data.address:
            new_patient.address = patient_data.address
        if patient_data.emergency_contact:
            new_patient.emergency_contact = patient_data.emergency_contact
        
        # Add additional fields if they exist in the model
        try:
            # These might not exist in your model, so we use try/except
            if hasattr(new_patient, 'patient_id'):
                new_patient.patient_id = generate_patient_code(1)  # Will be updated after commit
        except Exception as field_error:
            logger.warning(f"Could not set optional field: {str(field_error)}")
        
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)
        
        # Update patient_id if it exists and wasn't set
        try:
            if hasattr(new_patient, 'patient_id') and not new_patient.patient_id:
                new_patient.patient_id = generate_patient_code(new_patient.id)
                db.commit()
                db.refresh(new_patient)
        except Exception as update_error:
            logger.warning(f"Could not update patient_id: {str(update_error)}")
        
        # Generate response
        patient_code = getattr(new_patient, 'patient_id', None) or generate_patient_code(new_patient.id)
        
        logger.info(f"Patient registered successfully: {patient_code}")
        
        return {
            "message": "Patient registered successfully",
            "patient_id": new_patient.id,
            "patient_code": patient_code,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering patient: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        
        # Provide more specific error information
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Patient with this information already exists")
        elif "not null" in str(e).lower():
            raise HTTPException(status_code=400, detail="Missing required fields")
        else:
            raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.get("/", response_model=List[PatientResponse])
async def get_all_patients(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=1000, description="Page size"),
    skip: Optional[int] = Query(None, ge=0, description="Number of records to skip (alternative to page)"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Maximum number of records to return (alternative to size)"),
    search: Optional[str] = Query(None, description="Search by name, phone, or patient code"),
    db: Session = Depends(get_db)
):
    """Get all patients with optional search"""
    try:
        from app.models.patient import Patient
        
        # Handle both pagination styles
        if skip is not None and limit is not None:
            # Use skip/limit directly
            actual_skip = skip
            actual_limit = limit
        else:
            # Convert page/size to skip/limit
            actual_skip = (page - 1) * size
            actual_limit = size
        
        query = db.query(Patient).filter(Patient.status == "active")
        
        # Handle search parameter (including empty string)
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Patient.full_name.ilike(search_term),
                    Patient.phone.like(search_term),
                    Patient.patient_id.like(search_term) if hasattr(Patient, 'patient_id') else False,
                    Patient.email.ilike(search_term) if search_term else False
                )
            )
        
        patients = query.order_by(desc(Patient.created_at)).offset(actual_skip).limit(actual_limit).all()
        
        result = []
        for patient in patients:
            try:
                first_name, last_name = split_full_name(patient.full_name)
                
                result.append(PatientResponse(
                    id=patient.id,
                    patient_code=getattr(patient, 'patient_id', None) or generate_patient_code(patient.id),
                    first_name=first_name,
                    last_name=last_name,
                    date_of_birth=patient.birth_date.strftime("%d.%m.%Y") if patient.birth_date else "Unknown",
                    age=calculate_age(patient.birth_date) if patient.birth_date else "Unknown",
                    gender=patient.gender or "Unknown",
                    blood_group=getattr(patient, 'blood_group', '') or '',
                    rh_factor=getattr(patient, 'rh_factor', '') or '',
                    height=getattr(patient, 'height', '') or '',
                    weight=getattr(patient, 'weight', '') or '',
                    bmi=getattr(patient, 'bmi', '') or '',
                    phone_number=patient.phone or '',
                    email=patient.email or '',
                    address=patient.address or '',
                    temporary_address=getattr(patient, 'temporary_address', '') or '',
                    work_place=getattr(patient, 'work_place', '') or '',
                    occupation=getattr(patient, 'occupation', '') or '',
                    created_at=patient.created_at or datetime.utcnow(),
                    updated_at=patient.updated_at or datetime.utcnow()
                ))
            except Exception as patient_error:
                logger.warning(f"Error processing patient {patient.id}: {str(patient_error)}")
                continue
        
        return result
        
    except ImportError as e:
        logger.error(f"Patient model import error: {str(e)}")
        # Return mock data if Patient model doesn't exist
        return [
            PatientResponse(
                id=1,
                patient_code="#001",
                first_name="John",
                last_name="Doe",
                date_of_birth="01.01.1990",
                age="34 y.o.",
                gender="Male",
                blood_group="O+",
                rh_factor="Positive",
                height="175 cm",
                weight="70 kg",
                bmi="22.9",
                phone_number="+998901234567",
                email="john.doe@email.com",
                address="123 Main St, Tashkent",
                temporary_address="",
                work_place="Tech Company",
                occupation="Software Engineer",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        ]
    except Exception as e:
        logger.error(f"Error getting patients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving patients: {str(e)}")

# Simple endpoint for debugging
@router.get("/simple")
async def get_patients_simple(db: Session = Depends(get_db)):
    """Simple endpoint to test patient retrieval"""
    try:
        from app.models.patient import Patient
        
        patients = db.query(Patient).limit(5).all()
        
        result = []
        for patient in patients:
            result.append({
                "id": patient.id,
                "full_name": getattr(patient, 'full_name', 'Unknown'),
                "phone": getattr(patient, 'phone', 'Unknown'),
                "status": getattr(patient, 'status', 'Unknown')
            })
        
        return {
            "status": "success", 
            "count": len(result),
            "patients": result
        }
        
    except ImportError:
        return {
            "status": "error",
            "message": "Patient model not found",
            "patients": []
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": str(e),
            "patients": []
        }

@router.get("/search")
async def search_patients(
    full_name: Optional[str] = Query(None),
    date_of_birth: Optional[date] = Query(None),
    birth_date: Optional[date] = Query(None),  # Support both field names
    pinfl: Optional[str] = Query(None),
    phone_number: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),  # Support both field names
    passport_number: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Search for a patient using multiple criteria"""
    try:
        from app.models.patient import Patient
        
        # Map frontend field names to backend field names
        birth_date_final = date_of_birth or birth_date
        phone_final = phone_number or phone
        
        if not any([full_name, birth_date_final, pinfl, phone_final, passport_number]):
            raise HTTPException(
                status_code=400, 
                detail="At least one search parameter is required"
            )
        
        query = db.query(Patient).filter(Patient.status == "active")
        filters = []
        
        if full_name:
            filters.append(Patient.full_name.ilike(f"%{full_name}%"))
        if birth_date_final:
            filters.append(Patient.birth_date == birth_date_final)
        if pinfl:
            filters.append(Patient.pinfl == pinfl)
        if phone_final:
            filters.append(Patient.phone == phone_final)
        if passport_number and hasattr(Patient, 'passport_number'):
            filters.append(Patient.passport_number == passport_number)
        
        patient = query.filter(and_(*filters)).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="No patient found with the provided criteria")
        
        first_name, last_name = split_full_name(patient.full_name)
        
        return {
            "id": patient.id,
            "patient_code": getattr(patient, 'patient_id', None) or generate_patient_code(patient.id),
            "full_name": patient.full_name,
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": patient.birth_date.strftime("%d.%m.%Y") if patient.birth_date else "Unknown",
            "phone": patient.phone,
            "email": patient.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching patients: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during search")

@router.get("/by-phone/{phone}")
async def get_patient_by_phone(
    phone: str,
    db: Session = Depends(get_db)
):
    """Get patient by phone number"""
    try:
        from app.models.patient import Patient
        
        patient = db.query(Patient).filter(
            and_(
                Patient.phone == phone,
                Patient.status == "active"
            )
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        first_name, last_name = split_full_name(patient.full_name)
        
        return {
            "id": patient.id,
            "patient_code": getattr(patient, 'patient_id', None) or generate_patient_code(patient.id),
            "first_name": first_name,
            "last_name": last_name,
            "full_name": patient.full_name,
            "date_of_birth": patient.birth_date.strftime("%d.%m.%Y") if patient.birth_date else "Unknown",
            "phone": patient.phone,
            "email": patient.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching patient by phone: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/by-pinfl/{pinfl}")
async def get_patient_by_pinfl(
    pinfl: str,
    db: Session = Depends(get_db)
):
    """Get patient by PINFL"""
    try:
        from app.models.patient import Patient
        
        patient = db.query(Patient).filter(
            and_(
                Patient.pinfl == pinfl,
                Patient.status == "active"
            )
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        first_name, last_name = split_full_name(patient.full_name)
        
        return {
            "id": patient.id,
            "patient_code": getattr(patient, 'patient_id', None) or generate_patient_code(patient.id),
            "first_name": first_name,
            "last_name": last_name,
            "full_name": patient.full_name,
            "date_of_birth": patient.birth_date.strftime("%d.%m.%Y") if patient.birth_date else "Unknown",
            "phone": patient.phone,
            "email": patient.email,
            "pinfl": patient.pinfl
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching patient by PINFL: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: int, db: Session = Depends(get_db)):
    """Get a specific patient by ID"""
    try:
        from app.models.patient import Patient
        
        patient = db.query(Patient).filter(
            and_(
                Patient.id == patient_id,
                Patient.status == "active"
            )
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        first_name, last_name = split_full_name(patient.full_name)
        
        return PatientResponse(
            id=patient.id,
            patient_code=getattr(patient, 'patient_id', None) or generate_patient_code(patient.id),
            first_name=first_name,
            last_name=last_name,
            date_of_birth=patient.birth_date.strftime("%d.%m.%Y") if patient.birth_date else "Unknown",
            age=calculate_age(patient.birth_date) if patient.birth_date else "Unknown",
            gender=patient.gender or "Unknown",
            blood_group=getattr(patient, 'blood_group', '') or '',
            rh_factor=getattr(patient, 'rh_factor', '') or '',
            height=getattr(patient, 'height', '') or '',
            weight=getattr(patient, 'weight', '') or '',
            bmi=getattr(patient, 'bmi', '') or '',
            phone_number=patient.phone or '',
            email=patient.email or '',
            address=patient.address or '',
            temporary_address=getattr(patient, 'temporary_address', '') or '',
            work_place=getattr(patient, 'work_place', '') or '',
            occupation=getattr(patient, 'occupation', '') or '',
            created_at=patient.created_at or datetime.utcnow(),
            updated_at=patient.updated_at or datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient {patient_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving patient")

@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db)
):
    """Update patient information"""
    try:
        from app.models.patient import Patient
        
        patient = db.query(Patient).filter(
            and_(
                Patient.id == patient_id,
                Patient.status == "active"
            )
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Update patient fields
        update_data = patient_update.model_dump(exclude_unset=True)
        
        # Handle name updates
        if patient_update.first_name or patient_update.last_name:
            name_parts = []
            if patient_update.first_name:
                name_parts.append(patient_update.first_name)
            if patient_update.last_name:
                name_parts.append(patient_update.last_name)
            patient.full_name = " ".join(name_parts)
        
        # Handle date of birth
        if patient_update.date_of_birth:
            try:
                patient.birth_date = datetime.strptime(patient_update.date_of_birth, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Update other fields
        for field, value in update_data.items():
            if field not in ['first_name', 'last_name', 'date_of_birth'] and value is not None:
                if field == 'phone_number':
                    setattr(patient, 'phone', value)
                elif hasattr(patient, field):
                    setattr(patient, field, value)
        
        patient.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(patient)
        
        return await get_patient(patient_id, db)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating patient {patient_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating patient")

@router.delete("/{patient_id}")
async def deactivate_patient(patient_id: int, db: Session = Depends(get_db)):
    """Deactivate patient (soft delete)"""
    try:
        from app.models.patient import Patient
        
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient.status = "inactive"
        patient.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Patient deactivated: {getattr(patient, 'patient_id', patient.id)}")
        
        return {"message": "Patient deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deactivating patient {patient_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deactivating patient")

@router.post("/{patient_id}/activate")
async def activate_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
    """Activate patient"""
    try:
        from app.models.patient import Patient
        
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient.status = "active"
        patient.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Patient activated: {getattr(patient, 'patient_id', patient.id)}")
        
        return {"message": "Patient activated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error activating patient {patient_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/statistics/overview")
async def get_patient_statistics(db: Session = Depends(get_db)):
    """Get patient statistics"""
    try:
        from app.models.patient import Patient
        
        total_patients = db.query(Patient).count()
        active_patients = db.query(Patient).filter(Patient.status == "active").count()
        inactive_patients = db.query(Patient).filter(Patient.status == "inactive").count()
        
        # Patients registered today
        today = datetime.now().date()
        today_patients = (
            db.query(Patient)
            .filter(func.date(Patient.created_at) == today)
            .count()
        )
        
        # Gender distribution
        male_count = db.query(Patient).filter(Patient.gender == "Male").count()
        female_count = db.query(Patient).filter(Patient.gender == "Female").count()
        other_count = db.query(Patient).filter(Patient.gender == "Other").count()
        
        return {
            "total_patients": total_patients,
            "active_patients": active_patients,
            "inactive_patients": inactive_patients,
            "today_registrations": today_patients,
            "gender_distribution": {
                "male": male_count,
                "female": female_count,
                "other": other_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/recent")
async def get_recent_patients(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get recently registered patients"""
    try:
        from app.models.patient import Patient
        
        patients = (
            db.query(Patient)
            .filter(Patient.status == "active")
            .order_by(desc(Patient.created_at))
            .limit(limit)
            .all()
        )
        
        result = []
        for patient in patients:
            first_name, last_name = split_full_name(patient.full_name)
            
            result.append({
                "id": patient.id,
                "patient_code": getattr(patient, 'patient_id', None) or generate_patient_code(patient.id),
                "first_name": first_name,
                "last_name": last_name,
                "full_name": patient.full_name,
                "date_of_birth": patient.birth_date.strftime("%d.%m.%Y") if patient.birth_date else "Unknown",
                "phone": patient.phone,
                "email": patient.email,
                "created_at": patient.created_at
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching recent patients: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Prescription endpoints
@router.get("/{patient_id}/prescriptions", response_model=List[PrescriptionResponse])
async def get_patient_prescriptions(patient_id: int, db: Session = Depends(get_db)):
    """Get all prescriptions for a patient"""
    try:
        from app.models.patient import Patient
        
        # Check if patient exists
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        try:
            from app.models.prescription import Prescription
            from app.models.user import User
            
            # Get prescriptions for this patient
            prescriptions = db.query(Prescription).filter(
                Prescription.patient_id == patient_id
            ).order_by(desc(Prescription.created_at)).all()
            
            result = []
            for prescription in prescriptions:
                # Get doctor name
                doctor_name = "Unknown Doctor"
                try:
                    if hasattr(prescription, 'doctor_id') and prescription.doctor_id:
                        doctor = db.query(User).filter(User.id == prescription.doctor_id).first()
                        if doctor:
                            doctor_name = getattr(doctor, 'name', None) or getattr(doctor, 'username', 'Unknown Doctor')
                except Exception as e:
                    logger.warning(f"Could not fetch doctor info: {str(e)}")
                
                result.append(PrescriptionResponse(
                    id=prescription.id,
                    patient_id=patient_id,
                    doctor_id=getattr(prescription, 'doctor_id', 0) or 0,
                    doctor_name=doctor_name,
                    medication_name=getattr(prescription, 'medication_name', 'Unknown Medication'),
                    dosage=getattr(prescription, 'dosage', 'Unknown'),
                    frequency=getattr(prescription, 'frequency', 'Unknown'),
                    duration=getattr(prescription, 'duration', None),
                    instructions=getattr(prescription, 'instructions', ''),
                    status=getattr(prescription, 'status', 'active'),
                    prescribed_date=prescription.created_at.strftime("%d.%m.%Y") if prescription.created_at else "Unknown",
                    created_at=prescription.created_at or datetime.utcnow()
                ))
            
            return result
            
        except ImportError:
            # If prescription model doesn't exist, return empty list
            logger.warning("Prescription model not available")
            return []
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prescriptions for patient {patient_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving patient prescriptions")

@router.post("/{patient_id}/prescriptions", response_model=PrescriptionResponse)
async def create_prescription(
    patient_id: int,
    prescription: PrescriptionBase,
    db: Session = Depends(get_db)
):
    """Create a new prescription for a patient"""
    try:
        from app.models.patient import Patient
        
        # Check if patient exists
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        try:
            from app.models.prescription import Prescription
            
            # Create new prescription
            new_prescription = Prescription(
                patient_id=patient_id,
                doctor_id=1,  # TODO: Get from current user session
                medication_name=prescription.medication_name,
                dosage=prescription.dosage,
                frequency=prescription.frequency,
                duration=prescription.duration,
                instructions=prescription.instructions,
                status=prescription.status,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(new_prescription)
            db.commit()
            db.refresh(new_prescription)
            
            return PrescriptionResponse(
                id=new_prescription.id,
                patient_id=patient_id,
                doctor_id=new_prescription.doctor_id,
                doctor_name="Current Doctor",  # TODO: Get from user session
                medication_name=prescription.medication_name,
                dosage=prescription.dosage,
                frequency=prescription.frequency,
                duration=prescription.duration,
                instructions=prescription.instructions,
                status=prescription.status,
                prescribed_date=datetime.utcnow().strftime("%d.%m.%Y"),
                created_at=datetime.utcnow()
            )
            
        except ImportError:
            raise HTTPException(status_code=501, detail="Prescription functionality not available")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating prescription: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating prescription")

# Medical History/Reports endpoints
@router.get("/{patient_id}/reports", response_model=List[ReportResponse])
async def get_patient_reports(patient_id: int, db: Session = Depends(get_db)):
    """Get all reports/medical history for a patient"""
    try:
        from app.models.patient import Patient
        
        # Check if patient exists
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        try:
            from app.models.medical_history import MedicalHistory
            from app.models.user import User
            
            # Get medical histories for this patient
            histories = db.query(MedicalHistory).filter(
                MedicalHistory.patient_id == patient_id
            ).order_by(desc(MedicalHistory.created_at)).all()
            
            result = []
            for history in histories:
                # Get doctor name
                doctor_name = "Unknown Doctor"
                try:
                    if hasattr(history, 'doctor_id') and history.doctor_id:
                        doctor = db.query(User).filter(User.id == history.doctor_id).first()
                        if doctor:
                            doctor_name = getattr(doctor, 'name', None) or getattr(doctor, 'username', 'Unknown Doctor')
                except Exception as e:
                    logger.warning(f"Could not fetch doctor info: {str(e)}")
                
                result.append(ReportResponse(
                    id=history.id,
                    patient_id=patient_id,
                    doctor_id=getattr(history, 'doctor_id', 0) or 0,
                    doctor_name=doctor_name,
                    date=history.created_at.strftime("%d.%m.%Y") if history.created_at else "Unknown",
                    time=history.created_at.strftime("%H:%M") if history.created_at else "Unknown",
                    problem=getattr(history, 'problem', "Medical Report"),
                    description=history.description or "No description available",
                    diagnosis=getattr(history, 'diagnosis', None),
                    treatment=getattr(history, 'treatment', None)
                ))
            
            return result
            
        except ImportError:
            # If medical_history model doesn't exist, return empty list
            logger.warning("MedicalHistory model not available")
            return []
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reports for patient {patient_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving patient reports")

# Invitation endpoints
@router.post("/invite")
async def invite_patient(
    invitation_data: InvitationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send invitation to patient"""
    try:
        from app.models.patient import Patient
        
        # Check if patient exists
        patient = db.query(Patient).filter(Patient.id == invitation_data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        try:
            from app.models.patient import PatientInvitation
            
            # Check if there's already a valid invitation
            existing_invitation = db.query(PatientInvitation).filter(
                and_(
                    PatientInvitation.patient_id == invitation_data.patient_id,
                    PatientInvitation.used == False,
                    PatientInvitation.expires_at > datetime.utcnow()
                )
            ).first()
            
            if existing_invitation:
                invitation_token = existing_invitation.invitation_token
                expires_at = existing_invitation.expires_at
            else:
                # Create new invitation
                new_invitation = PatientInvitation(
                    patient_id=invitation_data.patient_id,
                    created_at=datetime.utcnow()
                )
                db.add(new_invitation)
                db.commit()
                db.refresh(new_invitation)
                
                invitation_token = new_invitation.invitation_token
                expires_at = new_invitation.expires_at
            
        except ImportError:
            # If PatientInvitation model doesn't exist, generate mock response
            import uuid
            invitation_token = str(uuid.uuid4())
            expires_at = datetime.utcnow() + timedelta(days=7)
        
        # Send notifications if services are available
        if EMAIL_SMS_AVAILABLE:
            # Send email invitation if email exists
            if patient.email:
                background_tasks.add_task(
                    send_invitation_email,
                    patient.email,
                    patient.full_name,
                    invitation_token
                )
            
            # Send SMS invitation
            if patient.phone:
                background_tasks.add_task(
                    send_invitation_sms,
                    patient.phone,
                    patient.full_name,
                    invitation_token
                )
        
        logger.info(f"Invitation sent to patient: {getattr(patient, 'patient_id', patient.id)}")
        
        return InvitationResponse(
            message="Invitation sent successfully",
            invitation_token=invitation_token,
            expires_at=expires_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending invitation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while sending invitation")

# Advanced search endpoint
@router.post("/advanced-search")
async def advanced_search_patients(
    search_criteria: dict,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Advanced search with multiple criteria"""
    try:
        from app.models.patient import Patient
        
        query = db.query(Patient).filter(Patient.status == "active")
        
        # Build dynamic filters based on provided criteria
        filters = []
        
        for field, value in search_criteria.items():
            if value and hasattr(Patient, field):
                if field in ['full_name', 'email']:
                    filters.append(getattr(Patient, field).ilike(f"%{value}%"))
                else:
                    filters.append(getattr(Patient, field) == value)
        
        if filters:
            query = query.filter(and_(*filters))
        
        patients = query.order_by(desc(Patient.created_at)).offset(skip).limit(limit).all()
        total_count = query.count()
        
        result = []
        for patient in patients:
            first_name, last_name = split_full_name(patient.full_name)
            
            result.append({
                "id": patient.id,
                "patient_code": getattr(patient, 'patient_id', None) or generate_patient_code(patient.id),
                "first_name": first_name,
                "last_name": last_name,
                "full_name": patient.full_name,
                "date_of_birth": patient.birth_date.strftime("%d.%m.%Y") if patient.birth_date else "Unknown",
                "phone": patient.phone,
                "email": patient.email,
                "gender": patient.gender,
                "address": patient.address
            })
        
        return {
            "patients": result,
            "total": total_count,
            "page": (skip // limit) + 1,
            "size": limit,
            "pages": (total_count + limit - 1) // limit
        }
        
    except Exception as e:
        logger.error(f"Error in advanced search: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during search")