"""Reception portal – authentication and authorization
Provides JWT-based authentication for reception portal users.
Integrates with FHIR Practitioner resources for user data.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import jwt

# from db import fhir_repo  # TODO: implement FHIR repository

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ──────────────────────────────────────────────────────── Auth Configuration ──
JWT_SECRET = "your-secret-key-change-in-production"  # Move to environment variable
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ──────────────────────────────────────────────────────── Auth DTOs ──
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserInfo"

class UserInfo(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    role: str
    department: str
    practitioner_id: str
    clinic_name: Optional[str] = None
    start_date: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ReceptionistUser(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    role: str = "receptionist"
    department: str = "Reception"
    practitioner_id: str
    clinic_name: Optional[str] = None
    start_date: Optional[str] = None

# Update forward reference
LoginResponse.model_rebuild()

# ──────────────────────────────────────────────────────── User Storage ──
# In production, this would be a proper user database
_USERS: Dict[str, Dict[str, Any]] = {}
_USER_CREDENTIALS: Dict[str, str] = {}  # email -> password_hash

# Initialize with default reception user
default_user = {
    "user_id": "rec-001",
    "email": "sarah.roberts@fiattib.com",
    "first_name": "Sarah",
    "last_name": "Roberts",
    "role": "receptionist",
    "department": "Reception",
    "practitioner_id": "prac-rec-001",
    "clinic_name": "FIATTIB Medical Center",
    "start_date": "2020-03-15",
    "active": True,
    "created_at": datetime.now().isoformat()
}

_USERS["sarah.roberts@fiattib.com"] = default_user
_USER_CREDENTIALS["sarah.roberts@fiattib.com"] = pwd_context.hash("password123")  # Default password

# ──────────────────────────────────────────────────────── Helper Functions ──
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password."""
    return pwd_context.hash(password)

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user by email and password."""
    if email not in _USERS or email not in _USER_CREDENTIALS:
        return None
    
    user = _USERS[email]
    if not user.get("active", True):
        return None
    
    if not verify_password(password, _USER_CREDENTIALS[email]):
        return None
    
    return user

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> ReceptionistUser:
    """Get current authenticated user from JWT token."""
    payload = decode_token(credentials.credentials)
    email = payload.get("sub")
    
    if email not in _USERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = _USERS[email]
    return ReceptionistUser(**user_data)

async def get_current_receptionist(current_user: ReceptionistUser = Depends(get_current_user)) -> ReceptionistUser:
    """Get current user and verify they have receptionist role."""
    if current_user.role != "receptionist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Receptionist role required."
        )
    return current_user

def create_practitioner_resource(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create FHIR Practitioner resource for user."""
    return {
        "resourceType": "Practitioner",
        "id": user_data["practitioner_id"],
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Practitioner"],
            "lastUpdated": datetime.now(timezone.utc).isoformat()
        },
        "identifier": [{
            "system": "http://fiattib.com/employee-id",
            "value": user_data["user_id"]
        }],
        "active": user_data.get("active", True),
        "name": [{
            "use": "official",
            "family": user_data["last_name"],
            "given": [user_data["first_name"]]
        }],
        "telecom": [{
            "system": "email",
            "value": user_data["email"],
            "use": "work"
        }],
        "qualification": [{
            "code": {
                "coding": [{
                    "system": "http://snomed.info/sct",
                    "code": "224609009",
                    "display": "Receptionist"
                }]
            }
        }],
        "extension": [{
            "url": "http://fiattib.com/fhir/StructureDefinition/employee-info",
            "extension": [
                {"url": "department", "valueString": user_data["department"]},
                {"url": "startDate", "valueDate": user_data.get("start_date")},
                {"url": "clinicName", "valueString": user_data.get("clinic_name")}
            ]
        }]
    }

# ───────────────────────────────────────────────────────────── Auth Routes ─────────
@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Authenticate user and return JWT token."""
    user = authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    # Ensure FHIR Practitioner resource exists
    practitioner = fhir_repo.get("Practitioner", user["practitioner_id"])
    if not practitioner:
        practitioner = create_practitioner_resource(user)
        fhir_repo.save(user["practitioner_id"], practitioner)
    
    # Update last login
    user["last_login"] = datetime.now().isoformat()
    
    return LoginResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        user=UserInfo(**user)
    )

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: ReceptionistUser = Depends(get_current_user)):
    """Logout user (in a real app, you'd invalidate the token)."""
    # In a production app, you would:
    # 1. Add token to blacklist
    # 2. Update user's last_logout timestamp
    # 3. Clear any server-side session data
    
    user_data = _USERS.get(current_user.email)
    if user_data:
        user_data["last_logout"] = datetime.now().isoformat()
    
    return None

@router.get("/me", response_model=UserInfo)
async def get_current_user_info(current_user: ReceptionistUser = Depends(get_current_user)):
    """Get current user information."""
    return UserInfo(**current_user.dict())

@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: ReceptionistUser = Depends(get_current_user)
):
    """Change user password."""
    # Verify current password
    current_hash = _USER_CREDENTIALS.get(current_user.email)
    if not current_hash or not verify_password(password_data.current_password, current_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password (basic validation)
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Update password
    new_hash = get_password_hash(password_data.new_password)
    _USER_CREDENTIALS[current_user.email] = new_hash
    
    # Update user record
    user_data = _USERS.get(current_user.email)
    if user_data:
        user_data["password_changed_at"] = datetime.now().isoformat()

@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(current_user: ReceptionistUser = Depends(get_current_user)):
    """Refresh JWT token."""
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email, "role": current_user.role},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(**current_user.dict())
    )

@router.get("/validate", response_model=Dict[str, Any])
async def validate_token(current_user: ReceptionistUser = Depends(get_current_user)):
    """Validate current token and return user info."""
    return {
        "valid": True,
        "user": UserInfo(**current_user.dict()),
        "permissions": ["read:appointments", "write:appointments", "read:patients", "write:patients", "read:messages", "write:messages"]
    }

# ──────────────────────────────────────────────────────── Admin Routes ──
@router.post("/register", response_model=UserInfo, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: Dict[str, Any] = Body(...),
    current_user: ReceptionistUser = Depends(get_current_user)  # Only authenticated users can create others
):
    """Register a new user (admin function)."""
    required_fields = ["email", "password", "first_name", "last_name", "role"]
    for field in required_fields:
        if field not in user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    email = user_data["email"]
    if email in _USERS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )
    
    # Create user record
    user_id = f"user-{uuid4().hex[:8]}"
    practitioner_id = f"prac-{uuid4().hex[:8]}"
    
    new_user = {
        "user_id": user_id,
        "email": email,
        "first_name": user_data["first_name"],
        "last_name": user_data["last_name"],
        "role": user_data["role"],
        "department": user_data.get("department", "Reception"),
        "practitioner_id": practitioner_id,
        "clinic_name": user_data.get("clinic_name", "FIATTIB Medical Center"),
        "start_date": user_data.get("start_date", datetime.now().strftime("%Y-%m-%d")),
        "active": True,
        "created_at": datetime.now().isoformat(),
        "created_by": current_user.user_id
    }
    
    # Hash password
    password_hash = get_password_hash(user_data["password"])
    
    # Save user
    _USERS[email] = new_user
    _USER_CREDENTIALS[email] = password_hash
    
    # Create FHIR Practitioner resource
    practitioner = create_practitioner_resource(new_user)
    fhir_repo.save(practitioner_id, practitioner)
    
    return UserInfo(**new_user)

@router.get("/users", response_model=List[UserInfo])
async def list_users(
    active_only: bool = Query(True),
    role_filter: Optional[str] = Query(None),
    current_user: ReceptionistUser = Depends(get_current_user)
):
    """List all users (admin function)."""
    users = []
    
    for user_data in _USERS.values():
        if active_only and not user_data.get("active", True):
            continue
        
        if role_filter and user_data.get("role") != role_filter:
            continue
        
        users.append(UserInfo(**user_data))
    
    return users

@router.patch("/users/{user_id}", response_model=UserInfo)
async def update_user(
    user_id: str,
    updates: Dict[str, Any] = Body(...),
    current_user: ReceptionistUser = Depends(get_current_user)
):
    """Update user information (admin function)."""
    # Find user by user_id
    target_user = None
    target_email = None
    
    for email, user_data in _USERS.items():
        if user_data["user_id"] == user_id:
            target_user = user_data
            target_email = email
            break
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Apply updates
    allowed_updates = ["first_name", "last_name", "department", "active", "clinic_name"]
    for field, value in updates.items():
        if field in allowed_updates:
            target_user[field] = value
    
    target_user["updated_at"] = datetime.now().isoformat()
    target_user["updated_by"] = current_user.user_id
    
    # Update FHIR Practitioner resource
    practitioner = fhir_repo.get("Practitioner", target_user["practitioner_id"])
    if practitioner:
        # Update name
        if "first_name" in updates or "last_name" in updates:
            practitioner["name"] = [{
                "use": "official",
                "family": target_user["last_name"],
                "given": [target_user["first_name"]]
            }]
        
        # Update active status
        if "active" in updates:
            practitioner["active"] = updates["active"]
        
        # Update extensions
        extensions = practitioner.get("extension", [])
        for ext in extensions:
            if ext.get("url") == "http://fiattib.com/fhir/StructureDefinition/employee-info":
                for sub_ext in ext.get("extension", []):
                    if sub_ext.get("url") == "department" and "department" in updates:
                        sub_ext["valueString"] = updates["department"]
                    elif sub_ext.get("url") == "clinicName" and "clinic_name" in updates:
                        sub_ext["valueString"] = updates["clinic_name"]
        
        practitioner["meta"]["lastUpdated"] = datetime.now(timezone.utc).isoformat()
        fhir_repo.save(target_user["practitioner_id"], practitioner)
    
    return UserInfo(**target_user)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    permanent: bool = Query(False, description="Permanently delete vs deactivate"),
    current_user: ReceptionistUser = Depends(get_current_user)
):
    """Deactivate or delete user (admin function)."""
    # Find user by user_id
    target_user = None
    target_email = None
    
    for email, user_data in _USERS.items():
        if user_data["user_id"] == user_id:
            target_user = user_data
            target_email = email
            break
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-deletion
    if target_user["user_id"] == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    if permanent:
        # Permanent deletion
        del _USERS[target_email]
        del _USER_CREDENTIALS[target_email]
        
        # Delete FHIR Practitioner resource
        fhir_repo.delete("Practitioner", target_user["practitioner_id"])
    else:
        # Deactivation
        target_user["active"] = False
        target_user["deactivated_at"] = datetime.now().isoformat()
        target_user["deactivated_by"] = current_user.user_id
        
        # Update FHIR Practitioner resource
        practitioner = fhir_repo.get("Practitioner", target_user["practitioner_id"])
        if practitioner:
            practitioner["active"] = False
            practitioner["meta"]["lastUpdated"] = datetime.now(timezone.utc).isoformat()
            fhir_repo.save(target_user["practitioner_id"], practitioner)

# ──────────────────────────────────────────────────────── Password Reset ──
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

# Simple in-memory password reset tokens (use Redis or DB in production)
_RESET_TOKENS: Dict[str, Dict[str, Any]] = {}

@router.post("/password-reset-request", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(request: PasswordResetRequest):
    """Request password reset (sends token via email)."""
    if request.email not in _USERS:
        # Don't reveal if email exists
        return None
    
    # Generate reset token
    reset_token = uuid4().hex
    _RESET_TOKENS[reset_token] = {
        "email": request.email,
        "expires": (datetime.now() + timedelta(hours=1)).isoformat(),
        "used": False
    }
    
    # In production, send email with reset link
    print(f"Password reset token for {request.email}: {reset_token}")
    
    return None

@router.post("/password-reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(reset_data: PasswordReset):
    """Reset password using token."""
    # Validate token
    if reset_data.token not in _RESET_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    token_data = _RESET_TOKENS[reset_data.token]
    
    # Check if token is expired
    expires = datetime.fromisoformat(token_data["expires"])
    if datetime.now() > expires:
        del _RESET_TOKENS[reset_data.token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Check if token was already used
    if token_data["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has already been used"
        )
    
    # Validate new password
    if len(reset_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Update password
    email = token_data["email"]
    new_hash = get_password_hash(reset_data.new_password)
    _USER_CREDENTIALS[email] = new_hash
    
    # Mark token as used
    token_data["used"] = True
    
    # Update user record
    user_data = _USERS.get(email)
    if user_data:
        user_data["password_reset_at"] = datetime.now().isoformat()

# ──────────────────────────────────────────────────────── Session Management ──
@router.get("/sessions", response_model=List[Dict[str, Any]])
async def get_user_sessions(current_user: ReceptionistUser = Depends(get_current_user)):
    """Get active sessions for current user."""
    # In production, this would query actual session store
    # For now, return mock data
    return [
        {
            "session_id": "sess-current",
            "device": "Desktop - Chrome",
            "ip_address": "192.168.1.100",
            "location": "Tashkent, Uzbekistan",
            "last_activity": datetime.now().isoformat(),
            "is_current": True
        }
    ]

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: str,
    current_user: ReceptionistUser = Depends(get_current_user)
):
    """Revoke a specific session."""
    # In production, this would invalidate the session in your session store
    # and add tokens to blacklist
    pass

@router.delete("/sessions", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_all_sessions(current_user: ReceptionistUser = Depends(get_current_user)):
    """Revoke all sessions except current one."""
    # In production, this would invalidate all sessions for the user
    # except the current one
    pass

# ──────────────────────────────────────────────────────── Health Check ──
@router.get("/health")
async def auth_health_check():
    """Authentication service health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "total_users": len(_USERS),
        "active_users": len([u for u in _USERS.values() if u.get("active", True)]),
        "version": "1.0.0"
    }

# Export the dependency functions for use in other modules
__all__ = ["get_current_user", "get_current_receptionist", "ReceptionistUser"]