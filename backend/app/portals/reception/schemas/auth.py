# app/portals/reception/schemas/auth.py
"""Authentication and authorization schemas for reception portal."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator

from app.common.schemas.base import UserBase, UserRole, UserStatus


# ============================= Request Models =============================
class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)
    confirm_password: Optional[str] = None
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""
    email: EmailStr


class PasswordReset(BaseModel):
    """Password reset with token schema."""
    token: str
    new_password: str = Field(..., min_length=8)


class RegisterUserRequest(BaseModel):
    """User registration request schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    role: UserRole = UserRole.RECEPTIONIST
    department: Optional[str] = "Reception"
    clinic_name: Optional[str] = None
    start_date: Optional[str] = None
    phone: Optional[str] = None


# ============================= Response Models =============================
class UserInfo(UserBase):
    """User information response schema."""
    user_id: str
    department: str = "Reception"
    practitioner_id: str
    clinic_name: Optional[str] = None
    start_date: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Login response schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserInfo


class TokenValidationResponse(BaseModel):
    """Token validation response schema."""
    valid: bool
    user: Optional[UserInfo] = None
    permissions: List[str] = []
    
    class Config:
        from_attributes = True


class SessionInfo(BaseModel):
    """User session information schema."""
    session_id: str
    device: str
    ip_address: str
    location: Optional[str] = None
    last_activity: datetime
    is_current: bool = False


class AuthHealthCheck(BaseModel):
    """Authentication service health check response."""
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    total_users: int
    active_users: int
    version: str = "1.0.0"


# ============================= User Management =============================
class UserListItem(BaseModel):
    """User list item for admin views."""
    id: str
    name: str
    email: EmailStr
    role: UserRole
    department: Optional[str] = None
    status: UserStatus
    last_login: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    """User update request schema."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    active: Optional[bool] = None
    clinic_name: Optional[str] = None
    phone: Optional[str] = None


class UserActivityLog(BaseModel):
    """User activity log entry."""
    action: str
    timestamp: datetime
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None