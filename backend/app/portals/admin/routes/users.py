from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import random

# TODO: Import these when created
# from app.db.session import get_db
# from app.common.auth.auth_utils import get_current_admin_user
# from app.common.schemas.user import (
#     UserProfile,
#     UserProfileUpdate,
#     UserStats,
#     PasswordResetRequest,
#     PasswordResetResponse
# )
# from app.crud.user import user as user_crud

router = APIRouter()

# Mock data for development
MOCK_USERS = [
    {
        "id": "user-001",
        "name": "Dr. Ahmad Karimov",
        "email": "ahmad.karimov@mainhospital.uz",
        "phone": "+998 90 123 4567",
        "role": "Doctor",
        "clinicId": "clinic-001",
        "status": "Active",
        "createdAt": "2023-06-15T10:30:00Z",
        "lastLogin": "2025-01-10T14:30:00Z",
        "access": {
            "viewHistory": True,
            "prescribe": True,
            "editMedical": True,
            "accessAnalytics": True
        }
    },
    {
        "id": "user-002",
        "name": "Nurse Madina Yakubova",
        "email": "madina.yakubova@mainhospital.uz",
        "phone": "+998 91 234 5678",
        "role": "Nurse",
        "clinicId": "clinic-001",
        "status": "Active",
        "createdAt": "2023-08-20T09:15:00Z",
        "lastLogin": "2025-01-10T08:45:00Z",
        "access": {
            "viewHistory": True,
            "editMedical": True
        }
    },
    {
        "id": "user-003",
        "name": "Aziza Nazarova",
        "email": "aziza.nazarova@mainhospital.uz",
        "phone": "+998 93 345 6789",
        "role": "Receptionist",
        "clinicId": "clinic-001",
        "status": "Active",
        "createdAt": "2024-01-10T11:20:00Z",
        "lastLogin": "2025-01-10T16:20:00Z",
        "access": {
            "viewHistory": True
        }
    },
    {
        "id": "user-004",
        "name": "Dr. Rustam Aliyev",
        "email": "rustam.aliyev@cityclinic.uz",
        "phone": "+998 94 456 7890",
        "role": "Doctor",
        "clinicId": "clinic-002",
        "status": "Active",
        "createdAt": "2023-05-12T14:00:00Z",
        "lastLogin": "2025-01-09T17:30:00Z",
        "access": {
            "viewHistory": True,
            "prescribe": True,
            "editMedical": True,
            "accessAnalytics": False
        }
    },
    {
        "id": "user-005",
        "name": "Botir Saidov",
        "email": "botir.saidov@labtech.uz",
        "phone": "+998 95 567 8901",
        "role": "Lab",
        "clinicId": "clinic-001",
        "status": "Active",
        "createdAt": "2024-03-25T10:45:00Z",
        "lastLogin": "2025-01-10T12:15:00Z",
        "access": {
            "viewHistory": True,
            "accessAnalytics": True
        }
    }
]

@router.get("/users")
async def get_users(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get all users"""
    return MOCK_USERS

@router.get("/users/{user_id}")
async def get_user_profile(
    user_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get user profile by ID"""
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}")
async def update_user_profile(
    user_id: str,
    user_data: dict,  # TODO: Replace with UserProfileUpdate schema
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Update user profile"""
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user data
    user.update(user_data)
    return user

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Reset user password"""
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new password
    new_password = f"temp_{uuid.uuid4().hex[:8]}"
    
    return {
        "message": "Password reset successfully",
        "new_password": new_password,
        "user_id": user_id
    }

@router.get("/clinics")
async def get_clinics_list(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get list of clinics"""
    return [
        {"id": "clinic-001", "name": "Main Hospital", "city": "Tashkent"},
        {"id": "clinic-002", "name": "City Clinic", "city": "Tashkent"}
    ]

@router.get("/users/{user_id}/stats")
async def get_user_statistics(
    user_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get user statistics"""
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mock statistics
    stats = {
        "user_id": user_id,
        "total_appointments": random.randint(50, 200),
        "completed_appointments": random.randint(30, 150),
        "cancelled_appointments": random.randint(5, 20),
        "total_patients": random.randint(20, 100),
        "average_rating": round(random.uniform(4.0, 5.0), 1),
        "response_time_minutes": random.randint(10, 60),
        "last_activity": datetime.now().isoformat(),
        "monthly_stats": {
            "appointments": random.randint(10, 50),
            "patients": random.randint(5, 25),
            "revenue": random.randint(1000, 5000)
        },
        "weekly_stats": {
            "appointments": random.randint(3, 15),
            "patients": random.randint(2, 10),
            "revenue": random.randint(200, 1000)
        }
    }
    
    return stats

@router.get("/users/{user_id}/activity-log")
async def get_user_activity_log(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get user activity log"""
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mock activity log
    activities = []
    for i in range(limit):
        activities.append({
            "id": f"activity-{i}",
            "timestamp": (datetime.now() - timedelta(hours=i)).isoformat(),
            "action": random.choice([
                "Login",
                "View Patient",
                "Create Appointment",
                "Update Medical Record",
                "Send Message",
                "Generate Report"
            ]),
            "details": f"Activity {i} details",
            "ip_address": f"192.168.1.{random.randint(1, 255)}",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
    
    return {
        "user_id": user_id,
        "activities": activities,
        "total": len(activities),
        "skip": skip,
        "limit": limit
    }

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_data: dict,  # {"status": "Active" | "Inactive" | "Suspended"}
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Update user status"""
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = status_data.get("status")
    if new_status not in ["Active", "Inactive", "Suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    user["status"] = new_status
    return user

@router.post("/users/{user_id}/send-notification")
async def send_user_notification(
    user_id: str,
    notification_data: dict,  # {"type": "email|sms", "subject": str, "message": str}
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Send notification to user"""
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    notification_type = notification_data.get("type")
    if notification_type not in ["email", "sms"]:
        raise HTTPException(status_code=400, detail="Invalid notification type")
    
    return {
        "message": "Notification sent successfully",
        "user_id": user_id,
        "notification_type": notification_type,
        "subject": notification_data.get("subject"),
        "message": notification_data.get("message")
    }