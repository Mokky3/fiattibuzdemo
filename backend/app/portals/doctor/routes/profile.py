# portals/doctor/routes/profile.py
from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import BaseModel, EmailStr
from .auth import get_current_doctor, DoctorUser

router = APIRouter(prefix="/api/doctor/profile", tags=["Doctor · Profile"])

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

class DoctorProfileResponse(BaseModel):
    """Response model that matches frontend expectations"""
    fullName: str
    email: EmailStr
    phone: str | None = None
    specialty: str | None = None
    licenseNumber: str | None = None
    organization: str | None = None
    bio: str | None = None
    address: str | None = None
    profileImage: str | None = None

# ─── mock record -------------------------------------------------
_PROFILE = DoctorProfile(
    full_name="Dr. Demo Khasanov",
    email="demo.khasanov@example.com",
    phone="+998 90 123-45-67",
    specialty="General Medicine",
    license_number="UZ-MD-123456",
    organization="Tashkent City Clinic",
    bio="Experienced general practitioner with 10+ years in family medicine and preventive care.",
    address="Tashkent, Uzbekistan"
)

def convert_to_frontend_format(profile: DoctorProfile) -> DoctorProfileResponse:
    """Convert backend snake_case to frontend camelCase"""
    return DoctorProfileResponse(
        fullName=profile.full_name,
        email=profile.email,
        phone=profile.phone,
        specialty=profile.specialty,
        licenseNumber=profile.license_number,
        organization=profile.organization,
        bio=profile.bio,
        address=profile.address,
        profileImage=profile.profile_image
    )

def convert_from_frontend_format(profile_data: dict) -> DoctorProfile:
    """Convert frontend camelCase to backend snake_case"""
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

@router.get("", response_model=DoctorProfileResponse)
async def get_profile(_: DoctorUser = Depends(get_current_doctor)):
    """Get doctor profile in frontend-friendly format"""
    return convert_to_frontend_format(_PROFILE)

@router.put("", response_model=DoctorProfileResponse)
async def update_profile(
    data: dict = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    """Update doctor profile"""
    global _PROFILE
    try:
        _PROFILE = convert_from_frontend_format(data)
        return convert_to_frontend_format(_PROFILE)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid profile data: {str(e)}")

@router.post("/upload-image")
async def upload_profile_image(
    image_data: dict = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    """Upload profile image (base64 data)"""
    global _PROFILE
    
    if "imageData" not in image_data:
        raise HTTPException(status_code=400, detail="No image data provided")
    
    # In a real implementation, you would:
    # 1. Validate the image data
    # 2. Save to cloud storage (AWS S3, Cloudinary, etc.)
    # 3. Store the URL in the database
    
    _PROFILE.profile_image = image_data["imageData"]
    
    return {
        "message": "Profile image uploaded successfully",
        "imageUrl": _PROFILE.profile_image
    }