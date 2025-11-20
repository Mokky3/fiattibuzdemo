from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.common.models.user import User, UserStatus, UserActivity
from app.common.auth.auth_service import AuthService, ACCESS_TOKEN_EXPIRE_MINUTES


class LoginRequest(BaseModel):
    email: str
    password: str


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
    """Unified login for all portals by email/password.
    Returns an access token and basic user payload.
    """
    email_or_username = (payload.email or "").strip()
    user: Optional[User] = None
    if "@" in email_or_username:
        user = db.query(User).filter(User.email.ilike(email_or_username)).first()
    else:
        # try username fallback when a non-email was provided
        user = db.query(User).filter(User.username.ilike(email_or_username)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please check your email/username and try again.")
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
    
    db.commit()

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


