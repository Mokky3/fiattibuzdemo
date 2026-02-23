from datetime import datetime, timezone, timedelta
from typing import Optional
import random
import string
import os

from fastapi import APIRouter, Depends, HTTPException, Body, status, BackgroundTasks
from pydantic import BaseModel, EmailStr, root_validator
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

from app.db.session import get_db
from app.common.models.user import User, UserStatus
from app.common.auth.auth_service import AuthService, get_current_user
from app.services.email_reset_pass import send_email
from app.services.sms_notification_service import sms_notification_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Password reset code expiration (15 minutes)
PASSWORD_RESET_CODE_EXPIRE_MINUTES = 15

class ForgotPasswordRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    @root_validator(skip_on_failure=True)
    def validate_contact_info(cls, values):
        """Ensure at least one of email or phone is provided."""
        email = values.get('email')
        phone = values.get('phone')
        
        # Normalize empty strings to None
        if email and isinstance(email, str) and email.strip() == '':
            email = None
        if phone and isinstance(phone, str) and phone.strip() == '':
            phone = None
        
        if not email and not phone:
            raise ValueError('Either email or phone number must be provided')
        
        return values

class ResetPasswordRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    code: str
    new_password: str
    
    @root_validator(skip_on_failure=True)
    def validate_contact_info(cls, values):
        """Ensure at least one of email or phone is provided."""
        email = values.get('email')
        phone = values.get('phone')
        
        # Normalize empty strings to None
        if email and isinstance(email, str) and email.strip() == '':
            email = None
        if phone and isinstance(phone, str) and phone.strip() == '':
            phone = None
        
        if not email and not phone:
            raise ValueError('Either email or phone number must be provided')
        
        return values

class PasswordResetResponse(BaseModel):
    message: str

class EmailValidationResponse(BaseModel):
    exists: bool
    message: str

class CodeValidationRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    code: str
    
    @root_validator(skip_on_failure=True)
    def validate_contact_info(cls, values):
        """Ensure at least one of email or phone is provided."""
        email = values.get('email')
        phone = values.get('phone')
        
        # Normalize empty strings to None
        if email and isinstance(email, str) and email.strip() == '':
            email = None
        if phone and isinstance(phone, str) and phone.strip() == '':
            phone = None
        
        if not email and not phone:
            raise ValueError('Either email or phone number must be provided')
        
        return values

class CodeValidationResponse(BaseModel):
    valid: bool
    message: str

# In-memory storage for password reset codes (in production, use Redis or database)
password_reset_codes = {}

def generate_reset_code() -> str:
    """Generate a 6-digit numeric code for password reset."""
    return ''.join(random.choices(string.digits, k=6))

def create_reset_code(user_id: str, email: Optional[str] = None, phone: Optional[str] = None) -> str:
    """Create a password reset code for a user."""
    code = generate_reset_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_CODE_EXPIRE_MINUTES)
    
    password_reset_codes[code] = {
        "user_id": user_id,
        "email": email,
        "phone": phone,
        "expires_at": expires_at,
        "used": False
    }
    
    return code

def verify_reset_code(code: str, email: Optional[str] = None, phone: Optional[str] = None) -> Optional[str]:
    """Verify a password reset code and return user_id if valid."""
    if code not in password_reset_codes:
        return None
    
    code_data = password_reset_codes[code]
    
    # Check if code is expired
    if datetime.now(timezone.utc) > code_data["expires_at"]:
        # Remove expired code
        del password_reset_codes[code]
        return None
    
    # Check if code is already used
    if code_data["used"]:
        return None
    
    # Check if email or phone matches
    if email:
        stored_email = code_data.get("email")
        if not stored_email or stored_email.lower() != email.lower():
            return None
    elif phone:
        stored_phone = code_data.get("phone")
        if not stored_phone or stored_phone.strip() != phone.strip():
            return None
    else:
        return None
    
    return code_data["user_id"]

def mark_code_as_used(code: str):
    """Mark a password reset code as used."""
    if code in password_reset_codes:
        password_reset_codes[code]["used"] = True

def create_reset_email_html(user_name: str, reset_code: str) -> str:
    """Create HTML email template for password reset with code."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset Code - FIATTIB Medical Center</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #5DC692;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 8px 8px;
            }}
            .code {{
                background-color: #5DC692;
                color: white;
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                letter-spacing: 8px;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>FIATTIB Medical Center</h1>
            <h2>Password Reset Code</h2>
        </div>
        <div class="content">
            <p>Hello {user_name},</p>
            <p>We received a request to reset your password for your FIATTIB Medical Center account.</p>
            <p>Use the following code to reset your password:</p>
            <div class="code">{reset_code}</div>
            <p><strong>This code will expire in 15 minutes for security reasons.</strong></p>
            <p>Enter this code in the password reset form along with your new password.</p>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from FIATTIB Medical Center. Please do not reply to this email.</p>
        </div>
    </body>
    </html>
    """

@router.post("/auth/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(
    request: ForgotPasswordRequest = Body(...),
    db: Session = Depends(get_db),
    bg: BackgroundTasks = BackgroundTasks()
):
    """
    Send password reset code to user via email or SMS.
    Always returns success message for security (don't reveal if account exists).
    """
    print(f"[RESET] Forgot password request for email: {request.email}, phone: {request.phone}")
    
    # Find user by email or phone
    user = None
    if request.email:
        # Debug SMTP settings
        print(f"[SMTP] Host: {os.getenv('SMTP_HOST', 'localhost')}")
        print(f"[SMTP] Port: {os.getenv('SMTP_PORT', '1025')}")
        print(f"[SMTP] From: {os.getenv('SMTP_FROM', 'FIATTIB <dev@fiattib.test>')}")
        
        # Find user by email - use exact case-insensitive match
        user = db.query(User).filter(
            func.lower(User.email) == request.email.lower()
        ).first()
    elif request.phone:
        # Find user by phone
        user = db.query(User).filter(
            User.phone == request.phone.strip()
        ).first()
    
    print(f"[RESET] User found: {user is not None}")
    if user:
        print(f"[RESET] User details - ID: {user.id}, Email: {user.email}, Phone: {user.phone}, Active: {user.is_active}, Status: {user.status}")
    
    if user:
        # Generate reset code with both email and phone
        reset_code = create_reset_code(
            str(user.id), 
            email=user.email if user.email else None,
            phone=user.phone if user.phone else None
        )
        
        # Get user name
        user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "User"
        
        # Send via email if available
        if user.email:
            try:
                # Create email content
                email_html = create_reset_email_html(user_name, reset_code)
                
                print(f"[RESET] About to send code {reset_code} to {user.email}")
                
                # Send email using background task for better UX
                bg.add_task(
                    send_email,
                    user.email,
                    "Password Reset Code - FIATTIB Medical Center",
                    email_html
                )
                print(f"[RESET] Email task added to background for {user.email}")
            except Exception as e:
                print(f"[RESET] Failed to add email task for {user.email}: {e}")
                logger.error(f"Failed to send password reset email: {e}")
        
        # Send via SMS if phone available and email not sent
        if user.phone and not user.email:
            try:
                sms_message = f"FIATTIB: Your password reset code is {reset_code}. Valid for 15 minutes. Do not share this code."
                print(f"[RESET] About to send code {reset_code} to {user.phone}")
                
                # Send SMS using background task (async function)
                async def send_sms_task():
                    try:
                        await sms_notification_service.send_sms(user.phone, sms_message)
                        print(f"[RESET] SMS sent successfully to {user.phone}")
                    except Exception as e:
                        print(f"[RESET] Failed to send SMS to {user.phone}: {e}")
                        logger.error(f"Failed to send password reset SMS: {e}")
                
                bg.add_task(send_sms_task)
                print(f"[RESET] SMS task added to background for {user.phone}")
            except Exception as e:
                print(f"[RESET] Failed to add SMS task for {user.phone}: {e}")
                logger.error(f"Failed to send password reset SMS: {e}")
        
        # If user has both email and phone, prefer email but also send SMS as backup
        if user.email and user.phone:
            try:
                sms_message = f"FIATTIB: Your password reset code is {reset_code}. Valid for 15 minutes. Do not share this code."
                
                async def send_sms_backup_task():
                    try:
                        await sms_notification_service.send_sms(user.phone, sms_message)
                        print(f"[RESET] SMS backup sent successfully to {user.phone}")
                    except Exception as e:
                        print(f"[RESET] Failed to send SMS backup to {user.phone}: {e}")
                        logger.error(f"Failed to send password reset SMS backup: {e}")
                
                bg.add_task(send_sms_backup_task)
                print(f"[RESET] SMS backup task added to background for {user.phone}")
            except Exception as e:
                print(f"[RESET] Failed to add SMS backup task: {e}")
                # Don't fail if SMS backup fails
    
    # Always return success message (don't reveal if account exists)
    contact_method = "email" if request.email else "phone number"
    return PasswordResetResponse(
        message=f"If an account with that {contact_method} exists, a password reset code has been sent."
    )

@router.post("/auth/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    request: ResetPasswordRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Reset user password using reset code.
    """
    try:
        contact_info = request.email or request.phone
        print(f"[RESET_PASSWORD] Reset password request for: {contact_info}")
        print(f"[RESET_PASSWORD] Code: {request.code}")
        
        # Verify reset code
        user_id = verify_reset_code(request.code, email=request.email, phone=request.phone)
        if not user_id:
            print(f"[RESET_PASSWORD] Invalid or expired code for {contact_info}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset code"
            )
        
        print(f"[RESET_PASSWORD] Code valid for user: {user_id}")
        
        # Find user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"[RESET_PASSWORD] User not found: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate new password
        if len(request.new_password) < 8:
            print(f"[RESET_PASSWORD] Password too short: {len(request.new_password)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Hash new password
        new_password_hash = AuthService.get_password_hash(request.new_password)
        
        # Update user password
        user.password_hash = new_password_hash
        user.updated_at = datetime.now(timezone.utc)
        
        # Mark code as used
        mark_code_as_used(request.code)
        
        # Save changes
        db.commit()
        db.refresh(user)
        
        print(f"[RESET_PASSWORD] Password reset successful for user {user.email}")
        
        return PasswordResetResponse(
            message="Password has been reset successfully"
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"[RESET_PASSWORD] Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while resetting password"
        )

@router.post("/auth/change-password")
async def change_password(
    old_password: str = Body(..., embed=True),
    new_password: str = Body(..., embed=True),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user.
    """
    # Verify old password
    if not AuthService.verify_password(old_password, current_user.user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Hash new password
    new_password_hash = AuthService.get_password_hash(new_password)
    
    # Update user password
    current_user.user.password_hash = new_password_hash
    current_user.user.updated_at = datetime.now(timezone.utc)
    
    # Save changes
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/auth/validate-email", response_model=EmailValidationResponse)
async def validate_email(
    request: ForgotPasswordRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Validate if email or phone exists in the system.
    This endpoint can be used to provide better UX feedback.
    """
    contact_info = request.email or request.phone
    print(f"[VALIDATE] Contact validation request for: {contact_info}")
    
    # Find user by email or phone
    user = None
    if request.email:
        user = db.query(User).filter(
            func.lower(User.email) == request.email.lower()
        ).first()
    elif request.phone:
        user = db.query(User).filter(
            User.phone == request.phone.strip()
        ).first()
    
    exists = user is not None
    contact_type = "email" if request.email else "phone number"
    print(f"[VALIDATE] {contact_type.capitalize()} exists: {exists}")
    
    if exists:
        return EmailValidationResponse(
            exists=True,
            message=f"{contact_type.capitalize()} found in our system. You can proceed with password reset."
        )
    else:
        return EmailValidationResponse(
            exists=False,
            message=f"No account found with this {contact_type}. Please check your {contact_type} or contact support."
        )

@router.post("/auth/validate-reset-code", response_model=CodeValidationResponse)
async def validate_reset_code(
    request: CodeValidationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Validate a password reset code for an email or phone.
    """
    contact_info = request.email or request.phone
    print(f"[CODE_VALIDATE] Code validation request for: {contact_info}")
    
    # Verify reset code
    user_id = verify_reset_code(request.code, email=request.email, phone=request.phone)
    
    if user_id:
        print(f"[CODE_VALIDATE] Code is valid for user: {user_id}")
        return CodeValidationResponse(
            valid=True,
            message="Reset code is valid. You can now set your new password."
        )
    else:
        print(f"[CODE_VALIDATE] Code is invalid or expired")
        contact_type = "email" if request.email else "phone"
        return CodeValidationResponse(
            valid=False,
            message=f"Invalid or expired reset code. Please check your {contact_type} and try again."
        )

@router.post("/auth/_dev-send-email")
def dev_send_email(db: Session = Depends(get_db)):
    """Development endpoint to test SMTP independently."""
    html = "<h3>Dev test</h3><p>If you see this in Mailpit, SMTP works.</p>"
    try:
        send_email("kubaymurodov@gmail.com", "Mailpit Dev Test", html)
        print("[DEV] Test email sent successfully")
        return {"ok": True, "message": "Test email sent"}
    except Exception as e:
        print(f"[DEV] Test email failed: {e}")
        return {"ok": False, "error": str(e)}
