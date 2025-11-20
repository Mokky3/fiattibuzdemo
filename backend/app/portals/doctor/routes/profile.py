# portals/doctor/routes/profile.py
from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import BaseModel, EmailStr
from app.portals.doctor.schemas.auth import DoctorProfile as SchemaDoctorProfile  # noqa: F401 (kept for future use)
from .auth import get_current_doctor, DoctorUser
from app.common.schemas.responses_enhanced import SuccessResponse
from app.common.schemas.user_enhanced import DoctorProfileResponse as SharedDoctorProfileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.user_settings import user_profile

router = APIRouter(prefix="/profile", tags=["Doctor · Profile"])

class DoctorProfile(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    specialty: str | None = None
    license_number: str | None = None
    organization: str | None = None
    bio: str | None = None
    address: str | None = None
    profile_image: str | None = None


def to_shared_response(profile: DoctorProfile) -> SharedDoctorProfileResponse:
    return SharedDoctorProfileResponse(
        fullName=profile.full_name,
        email=profile.email,
        phone=profile.phone,
        specialty=profile.specialty,
        licenseNumber=profile.license_number,
        organization=profile.organization,
        bio=profile.bio,
        address=profile.address,
        profileImage=profile.profile_image,
    )


def from_frontend_dict(profile_data: dict) -> DoctorProfile:
    return DoctorProfile(
        full_name=profile_data.get("fullName", ""),
        email=profile_data.get("email", ""),
        phone=profile_data.get("phone"),
        specialty=profile_data.get("specialty"),
        license_number=profile_data.get("licenseNumber"),
        organization=profile_data.get("organization"),
        bio=profile_data.get("bio"),
        address=profile_data.get("address"),
        profile_image=profile_data.get("profileImage")
    )

@router.get("", response_model=SuccessResponse[SharedDoctorProfileResponse])
async def get_profile(current: DoctorUser = Depends(get_current_doctor), db: Session = Depends(get_db)):
    """Get doctor profile from DB."""
    # Load User and UserProfile
    from app.common.models.user import User
    from app.common.models.doctor import Doctor
    user = db.query(User).filter(User.id == current.id).first()
    prof = user_profile.get_profile(db, user_id=current.id)
    doctor = db.query(Doctor).filter(Doctor.user_id == current.id).first()
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    profile = DoctorProfile(
        full_name=full_name or user.email,
        email=user.email,
        phone=user.phone,
        specialty=prof.specialty if prof else getattr(doctor, "primary_specialization", None),
        license_number=prof.license_number if prof else getattr(doctor, "license_number", None),
        organization=None,
        bio=prof.bio if prof else None,
        address=prof.address if prof else None,
        profile_image=user.profile_image_url,
    )
    return SuccessResponse(data=to_shared_response(profile), message="Profile retrieved")

@router.put("", response_model=SuccessResponse[SharedDoctorProfileResponse])
async def update_profile(
    data: dict = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Update doctor profile (User + UserProfile)."""
    try:
        parsed = from_frontend_dict(data)
        # Update core user fields
        core_updates = {}
        name_parts = parsed.full_name.split(" ", 1)
        if name_parts:
            core_updates["first_name"] = name_parts[0]
            core_updates["last_name"] = name_parts[1] if len(name_parts) > 1 else ""
        if parsed.phone is not None:
            core_updates["phone"] = parsed.phone
        if parsed.profile_image is not None:
            core_updates["profile_image_url"] = parsed.profile_image
        user_profile.update_user_core(db, user_id=current.id, user_data=core_updates)
        # Update extended profile
        profile_updates = {
            "specialty": parsed.specialty,
            "license_number": parsed.license_number,
            "bio": parsed.bio,
            "address": parsed.address,
        }
        user_profile.upsert_profile(db, user_id=current.id, profile_data=profile_updates)
        return SuccessResponse(data=to_shared_response(parsed), message="Profile updated")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid profile data: {str(e)}")

@router.post("/upload-image", response_model=SuccessResponse[dict])
async def upload_profile_image(
    image_data: dict = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Upload profile image (store URL in User.profile_image_url)."""
    if "imageData" not in image_data:
        raise HTTPException(status_code=400, detail="No image data provided")
    user_profile.update_user_core(db, user_id=current.id, user_data={"profile_image_url": image_data["imageData"]})
    return SuccessResponse(
        data={"imageUrl": image_data["imageData"]},
        message="Profile image uploaded successfully"
    )