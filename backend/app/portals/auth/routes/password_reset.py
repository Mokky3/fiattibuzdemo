from datetime import datetime, timezone, timedelta
from typing import Optional
import random
import string
import os

from fastapi import APIRouter, Depends, HTTPException, Body, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.common.models.user import User, UserStatus
from app.common.auth.auth_service import AuthService, get_current_user
from app.services.email_reset_pass import send_email

router = APIRouter()

# Password reset code expiration (15 minutes)
PASSWORD_RESET_CODE_EXPIRE_MINUTES = 15

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str

class EmailValidationResponse(BaseModel):
    exists: bool
    message: str

class CodeValidationRequest(BaseModel):
    email: EmailStr
    code: str

class CodeValidationResponse(BaseModel):
    valid: bool
    message: str

# In-memory storage for password reset codes (in production, use Redis or database)
password_reset_codes = {}

def generate_reset_code() -> str:
    """Generate a 6-digit numeric code for password reset."""
    return ''.join(random.choices(string.digits, k=6))

def create_reset_code(user_id: str, email: str) -> str:
    """Create a password reset code for a user."""
    code = generate_reset_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_CODE_EXPIRE_MINUTES)
    
    password_reset_codes[code] = {
        "user_id": user_id,
        "email": email,
        "expires_at": expires_at,
        "used": False
    }
    
    return code

def verify_reset_code(code: str, email: str) -> Optional[str]:
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
    
    # Check if email matches
    if code_data["email"].lower() != email.lower():
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
        <title>Password Reset Code - AKFA MEDLINE</title>
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
            <h1>AKFA MEDLINE</h1>
            <h2>Password Reset Code</h2>
        </div>
        <div class="content">
            <p>Hello {user_name},</p>
            <p>We received a request to reset your password for your AKFA MEDLINE account.</p>
            <p>Use the following code to reset your password:</p>
            <div class="code">{reset_code}</div>
            <p><strong>This code will expire in 15 minutes for security reasons.</strong></p>
            <p>Enter this code in the password reset form along with your new password.</p>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from AKFA MEDLINE. Please do not reply to this email.</p>
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
    Send password reset code to user via email.
    Always returns success message for security (don't reveal if email exists).
    """
    print(f"[RESET] Forgot password request for email: {request.email}")
    
    # Debug SMTP settings
    print(f"[SMTP] Host: {os.getenv('SMTP_HOST', 'localhost')}")
    print(f"[SMTP] Port: {os.getenv('SMTP_PORT', '1025')}")
    print(f"[SMTP] From: {os.getenv('SMTP_FROM', 'FIATTIB <dev@fiattib.test>')}")
    
    # Find user by email - use exact case-insensitive match
    user = db.query(User).filter(
        func.lower(User.email) == request.email.lower()
    ).first()
    
    print(f"[RESET] User found: {user is not None}")
    if user:
        print(f"[RESET] User details - ID: {user.id}, Email: {user.email}, Active: {user.is_active}, Status: {user.status}")
    
    if user:
        # Generate reset code
        reset_code = create_reset_code(str(user.id), user.email)
        
        # Get user name for email
        user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "User"
        
        # Create email content
        email_html = create_reset_email_html(user_name, reset_code)
        
        print(f"[RESET] About to send code {reset_code} to {user.email}")
        
        try:
            # Send email using background task for better UX
            bg.add_task(
                send_email,
                user.email,
                "Password Reset Code - AKFA MEDLINE",
                email_html
            )
            print(f"[RESET] Email task added to background for {user.email}")
        except Exception as e:
            print(f"[RESET] Failed to add email task for {user.email}: {e}")
            # Don't raise error - still return success for security
    
    # Always return success message (don't reveal if email exists)
    return PasswordResetResponse(
        message="If an account with that email exists, a password reset code has been sent."
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
        print(f"[RESET_PASSWORD] Reset password request for: {request.email}")
        print(f"[RESET_PASSWORD] Code: {request.code}")
        
        # Verify reset code
        user_id = verify_reset_code(request.code, request.email)
        if not user_id:
            print(f"[RESET_PASSWORD] Invalid or expired code for {request.email}")
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
    Validate if email exists in the system.
    This endpoint can be used to provide better UX feedback.
    """
    print(f"[VALIDATE] Email validation request for: {request.email}")
    
    # Find user by email - use exact case-insensitive match
    user = db.query(User).filter(
        func.lower(User.email) == request.email.lower()
    ).first()
    
    exists = user is not None
    print(f"[VALIDATE] Email exists: {exists}")
    
    if exists:
        return EmailValidationResponse(
            exists=True,
            message="Email found in our system. You can proceed with password reset."
        )
    else:
        return EmailValidationResponse(
            exists=False,
            message="No account found with this email address. Please check your email or contact support."
        )

@router.post("/auth/validate-reset-code", response_model=CodeValidationResponse)
async def validate_reset_code(
    request: CodeValidationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Validate a password reset code for an email.
    """
    print(f"[CODE_VALIDATE] Code validation request for: {request.email}")
    
    # Verify reset code
    user_id = verify_reset_code(request.code, request.email)
    
    if user_id:
        print(f"[CODE_VALIDATE] Code is valid for user: {user_id}")
        return CodeValidationResponse(
            valid=True,
            message="Reset code is valid. You can now set your new password."
        )
    else:
        print(f"[CODE_VALIDATE] Code is invalid or expired")
        return CodeValidationResponse(
            valid=False,
            message="Invalid or expired reset code. Please check your email and try again."
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
