"""Simple patient registration endpoint without complex RBAC."""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.common.auth.auth_service import AuthenticatedUser, require_receptionist_access
from app.crud.patient import patient as patient_crud
from app.common.schemas.patient_enhanced import PatientCreate
from typing import Dict
from datetime import datetime

router = APIRouter(tags=["Reception · Simple Patient Registration"])

@router.post("/simple-register", response_model=Dict[str, str])
async def simple_register_patient(
    patient_data: dict = Body(...),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db)
):
    """Simple patient registration without complex RBAC."""
    try:
        # Handle full_name - split into first_name and last_name if provided
        first_name = patient_data.get('first_name') or ''
        last_name = patient_data.get('last_name') or ''
        
        # If full_name is provided but first_name/last_name are not, split it
        if not first_name and not last_name:
            full_name = patient_data.get('full_name') or ''
            if full_name and isinstance(full_name, str):
                full_name = full_name.strip()
                if full_name:
                    name_parts = full_name.split(maxsplit=1)
                    first_name = name_parts[0] if len(name_parts) > 0 else ''
                    last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Handle phone - map phone_number to phone
        phone = patient_data.get('phone') or patient_data.get('phone_number') or None
        if phone:
            if not isinstance(phone, str):
                phone = str(phone)
            phone = phone.strip()
            if not phone:
                phone = None  # Normalize empty strings to None
        
        # Handle email - make it optional if empty
        email = patient_data.get('email')
        if email and isinstance(email, str):
            email = email.strip()
            if not email:
                email = None  # Normalize empty strings to None
        else:
            email = None  # Make email optional if not provided
        
        # Handle emergency contact - map emergency_contact to emergency_contact_name
        emergency_contact_name = patient_data.get('emergency_contact_name') or patient_data.get('emergency_contact', '')
        emergency_contact_phone = patient_data.get('emergency_contact_phone', '')
        
        # Validate required fields
        if not first_name or not last_name:
            raise HTTPException(status_code=400, detail="First name and last name are required (or provide full_name)")
        
        # Validate that at least one of phone or email is provided
        if not phone and not email:
            raise HTTPException(status_code=400, detail="Either phone number or email address must be provided")
        
        if not patient_data.get('date_of_birth'):
            raise HTTPException(status_code=400, detail="Date of birth is required")
        
        if not patient_data.get('gender'):
            raise HTTPException(status_code=400, detail="Gender is required")
        
        # Normalize gender: PatientCreate schema expects "Male", "Female", "Other" (capitalized)
        # Database expects "male", "female", "other" (lowercase)
        gender_raw = patient_data.get('gender', '')
        if isinstance(gender_raw, str):
            gender_lower = gender_raw.lower().strip()
            # Map to valid capitalized values for PatientCreate schema
            gender_map_lower_to_capital = {
                "m": "Male",
                "f": "Female",
                "male": "Male",
                "female": "Female",
                "other": "Other",
            }
            gender_for_schema = gender_map_lower_to_capital.get(gender_lower, "Male")  # Default to "Male" if not recognized
        else:
            gender_for_schema = "Male"  # Default
        
        # Parse date_of_birth - handle string format
        date_of_birth = patient_data.get('date_of_birth')
        if isinstance(date_of_birth, str):
            try:
                date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
            except ValueError:
                try:
                    date_of_birth = datetime.strptime(date_of_birth, '%Y/%m/%d').date()
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Create patient with simple data
        patient_create = PatientCreate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            date_of_birth=date_of_birth,
            gender=gender_for_schema,
            address=patient_data.get('address', ''),
            emergency_contact_name=emergency_contact_name,
            emergency_contact_phone=emergency_contact_phone,
            insurance_provider=patient_data.get('insurance_provider', ''),
            insurance_number=patient_data.get('insurance_number', ''),
            clinic_id=current_user.clinic_id or 'default-clinic'
        )
        
        # Add clinic_id to patient_data so it gets set on the User's organization_id
        patient_data_dict = patient_create.dict()
        patient_data_dict["organization_id"] = current_user.clinic_id
        
        patient_result = patient_crud.create_patient(
            db=db, 
            patient_data=patient_data_dict,
            created_by=current_user.user_id
        )
        
        # Send profile creation notification
        try:
            from app.common.services.notification_service import send_profile_creation_notification
            patient_name = f"{first_name} {last_name}"
            await send_profile_creation_notification(
                phone_number=phone if phone else None,
                email=email if email else None,
                patient_name=patient_name
            )
        except Exception as e:
            # Log error but don't fail registration
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send profile creation notification: {str(e)}")
        
        return {
            "patient_id": str(patient_result.get("patient_id", "")),
            "status": "registered",
            "message": "Patient registered successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
