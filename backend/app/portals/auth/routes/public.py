from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status, Request
from pydantic import BaseModel, root_validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.common.models.user import User, UserStatus, UserActivity
from app.common.auth.auth_service import AuthService, ACCESS_TOKEN_EXPIRE_MINUTES


class LoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    
    @root_validator(skip_on_failure=True)
    def validate_identifier(cls, values):
        """Ensure at least one of email or phone is provided."""
        email = values.get('email')
        phone = values.get('phone')
        
        # Normalize empty strings to None
        if email and isinstance(email, str) and email.strip() == '':
            email = None
        if phone and isinstance(phone, str) and phone.strip() == '':
            phone = None
        
        # Support legacy 'email' field that might contain phone number
        if email and '@' not in email:
            # If email field contains something without @, treat it as phone
            values['phone'] = email.strip()
            values['email'] = None
            phone = values['phone']
        
        if not email and not phone:
            raise ValueError('Either email or phone number must be provided')
        
        return values


class UserPayload(BaseModel):
    id: str
    email: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPayload


router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
async def unified_login(
    request: Request,
    payload: LoginRequest = Body(...),
    db: Session = Depends(get_db),
):
    """Unified login for all portals by email/phone/username and password.
    Returns an access token and basic user payload.
    """
    user: Optional[User] = None
    
    try:
        # Try to find user by email, phone, or username
        if payload.email:
            email_or_username = payload.email.strip()
            if "@" in email_or_username:
                # It's an email
                user = db.query(User).filter(User.email.ilike(email_or_username)).first()
            else:
                # Might be username or phone number
                # Try username first
                user = db.query(User).filter(User.username.ilike(email_or_username)).first()
                # If not found, try phone number
                if not user:
                    user = db.query(User).filter(User.phone == email_or_username.strip()).first()
        elif payload.phone:
            # Find by phone number
            phone = payload.phone.strip()
            user = db.query(User).filter(User.phone == phone).first()
    except OperationalError as e:
        error_msg = str(e)
        if "could not translate host name" in error_msg or "Name or service not known" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Database connection failed. Please check your network connection and database configuration."
            )
        elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Unable to connect to the database. Please try again later or contact support."
            )
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Database error: {error_msg}"
            )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please check your email/phone/username and try again.")
    if not user.is_active or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Your account is inactive. Please contact support for assistance.")
    if not AuthService.verify_password(payload.password or "", user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Please check your password and try again.")

    # Update last_login timestamp
    user.last_login = datetime.now(timezone.utc)
    
    # Log login activity
    try:
        # Get client IP and user agent
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        # Create login activity record
        login_activity = UserActivity(
            id=uuid.uuid4(),
            user_id=user.id,
            activity_type="login",
            description="User logged in successfully",
            ip_address=client_ip,
            user_agent=user_agent,
            created_at=datetime.now(timezone.utc)
        )
        db.add(login_activity)
    except Exception as e:
        # Don't fail login if activity logging fails
        print(f"Failed to log login activity: {e}")
    
    try:
        db.commit()
    except OperationalError as e:
        error_msg = str(e)
        if "could not translate host name" in error_msg or "Name or service not known" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Database connection failed. Please check your network connection and database configuration."
            )
        elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Unable to connect to the database. Please try again later or contact support."
            )
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Database error during commit: {error_msg}"
            )

    access_token = AuthService.create_access_token({
        "sub": str(user.id),
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
    })

    user_payload = UserPayload(
        id=str(user.id),
        email=user.email,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
    )

    return LoginResponse(
        access_token=access_token,
        expires_in=int(ACCESS_TOKEN_EXPIRE_MINUTES) * 60,
        user=user_payload,
    )


