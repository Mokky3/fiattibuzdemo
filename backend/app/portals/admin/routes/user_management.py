from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import random

# TODO: Import these when created
# from app.db.session import get_db
# from app.common.auth.auth_utils import get_current_admin_user
# from app.common.schemas.user import (
#     UserList,
#     UserInvite,
#     UserStatusUpdate,
#     UserDelete,
#     InvitationResponse
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
        "clinic": "Main Hospital",
        "status": "Active",
        "note": "Senior Cardiologist with 15 years experience",
        "provider": "Main Hospital",
        "createdAt": "2023-06-15T10:30:00Z",
        "lastLogin": "2025-01-10T14:30:00Z"
    },
    {
        "id": "user-002",
        "name": "Nurse Madina Yakubova",
        "email": "madina.yakubova@mainhospital.uz",
        "phone": "+998 91 234 5678",
        "role": "Nurse",
        "clinic": "Main Hospital",
        "status": "Active",
        "note": "ICU specialist nurse",
        "provider": "Main Hospital",
        "createdAt": "2023-08-20T09:15:00Z",
        "lastLogin": "2025-01-10T08:45:00Z"
    },
    {
        "id": "user-003",
        "name": "Aziza Nazarova",
        "email": "aziza.nazarova@mainhospital.uz",
        "phone": "+998 93 345 6789",
        "role": "Receptionist",
        "clinic": "Main Hospital",
        "status": "Active",
        "note": "Front desk coordinator",
        "provider": "Main Hospital",
        "createdAt": "2024-01-10T11:20:00Z",
        "lastLogin": "2025-01-10T16:20:00Z"
    },
    {
        "id": "user-004",
        "name": "Dr. Rustam Aliyev",
        "email": "rustam.aliyev@cityclinic.uz",
        "phone": "+998 94 456 7890",
        "role": "Doctor",
        "clinic": "City Clinic",
        "status": "Active",
        "note": "Pediatrics department head",
        "provider": "City Clinic",
        "createdAt": "2023-05-12T14:00:00Z",
        "lastLogin": "2025-01-09T17:30:00Z"
    },
    {
        "id": "user-005",
        "name": "Botir Saidov",
        "email": "botir.saidov@mainhospital.uz",
        "phone": "+998 95 567 8901",
        "role": "Lab",
        "clinic": "Main Hospital",
        "status": "Active",
        "note": "Senior lab technician",
        "provider": "Main Hospital",
        "createdAt": "2024-03-25T10:45:00Z",
        "lastLogin": "2025-01-10T12:15:00Z"
    },
    {
        "id": "user-006",
        "name": "Shahlo Rahimova",
        "email": "shahlo.rahimova@mainhospital.uz",
        "phone": "+998 97 678 9012",
        "role": "Admin",
        "clinic": "Main Hospital",
        "status": "Active",
        "note": "System administrator",
        "provider": "Main Hospital",
        "createdAt": "2023-04-18T08:30:00Z",
        "lastLogin": "2025-01-10T09:00:00Z"
    },
    {
        "id": "user-007",
        "name": "Jamshid Tursunov",
        "email": "jamshid.patient@gmail.com",
        "phone": "+998 98 789 0123",
        "role": "Patient",
        "clinic": "Main Hospital",
        "status": "Active",
        "note": "Regular patient - Cardiology",
        "provider": "Main Hospital",
        "createdAt": "2024-05-20T15:30:00Z",
        "lastLogin": "2025-01-08T11:45:00Z"
    },
    {
        "id": "user-008",
        "name": "Dr. Gulnara Mirzayeva",
        "email": "gulnara.mirzayeva@cityclinic.uz",
        "phone": "+998 99 890 1234",
        "role": "Doctor",
        "clinic": "City Clinic",
        "status": "Inactive",
        "note": "Orthopedic surgeon - on leave",
        "provider": "City Clinic",
        "createdAt": "2023-09-05T13:20:00Z",
        "lastLogin": "2024-12-15T14:30:00Z"
    },
    {
        "id": "user-009",
        "name": "Nurse Dilnoza Karimova",
        "email": "dilnoza.karimova@westclinic.uz",
        "phone": "+998 90 901 2345",
        "role": "Nurse",
        "clinic": "West Clinic",
        "status": "Active",
        "note": "Emergency department nurse",
        "provider": "West Clinic",
        "createdAt": "2024-02-14T10:00:00Z",
        "lastLogin": "2025-01-10T15:45:00Z"
    },
    {
        "id": "user-010",
        "name": "Sardor Umarov",
        "email": "sardor.patient@mail.ru",
        "phone": "+998 91 012 3456",
        "role": "Patient",
        "clinic": "City Clinic",
        "status": "Active",
        "note": "Pediatric patient",
        "provider": "City Clinic",
        "createdAt": "2024-07-30T16:20:00Z",
        "lastLogin": "2025-01-05T10:30:00Z"
    },
    {
        "id": "user-011",
        "name": "Dr. Farrukh Khodjaev",
        "email": "farrukh.khodjaev@mainhospital.uz",
        "phone": "+998 93 123 4567",
        "role": "Doctor",
        "clinic": "Main Hospital",
        "status": "Suspended",
        "note": "General practitioner - license renewal pending",
        "provider": "Main Hospital",
        "createdAt": "2023-11-22T09:45:00Z",
        "lastLogin": "2024-12-20T11:00:00Z"
    },
    {
        "id": "user-012",
        "name": "Malika Ibragimova",
        "email": "malika.ibragimova@westclinic.uz",
        "phone": "+998 94 234 5678",
        "role": "Receptionist",
        "clinic": "West Clinic",
        "status": "Active",
        "note": "Night shift coordinator",
        "provider": "West Clinic",
        "createdAt": "2024-04-05T14:30:00Z",
        "lastLogin": "2025-01-10T07:20:00Z"
    }
]

@router.get("/admin/users")
async def get_users(
    search: Optional[str] = Query(None, description="Search term"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status"),
    clinic: Optional[str] = Query(None, description="Filter by clinic"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get list of all users with filtering"""
    # TODO: Replace with actual implementation
    
    users = MOCK_USERS.copy()
    
    # Apply filters
    if search:
        search_lower = search.lower()
        users = [
            u for u in users
            if search_lower in u["name"].lower() or
               search_lower in u["role"].lower() or
               search_lower in u["clinic"].lower()
        ]
    
    if role:
        users = [u for u in users if u["role"] == role]
    
    if status:
        users = [u for u in users if u["status"] == status]
    
    if clinic:
        users = [u for u in users if u["clinic"] == clinic]
    
    return users

@router.post("/admin/users/invite")
async def send_user_invitation(
    invitation_data: dict,  # TODO: Replace with UserInvite schema
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Send invitation to new user"""
    # TODO: Replace with actual implementation
    
    # Validate invitation data
    contact_email = invitation_data.get("email")
    contact_phone = invitation_data.get("phone")
    
    if not contact_email and not contact_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or phone number is required"
        )
    
    # Generate invitation token
    invitation_token = f"invite-{uuid.uuid4().hex[:16]}"
    
    # Mock sending invitation
    new_user_id = f"user-{uuid.uuid4().hex[:8]}"
    
    return {
        "message": "Invitation sent successfully",
        "userId": new_user_id,
        "invitationToken": invitation_token,
        "sentTo": contact_email or contact_phone,
        "role": invitation_data.get("role", "Doctor"),
        "clinic": invitation_data.get("clinic", "Main Hospital"),
        "expiresAt": (datetime.now() + timedelta(days=7)).isoformat()
    }

@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Delete a user"""
    # TODO: Replace with actual implementation
    
    # Find user
    user_index = next((i for i, u in enumerate(MOCK_USERS) if u["id"] == user_id), None)
    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove user from mock data
    deleted_user = MOCK_USERS.pop(user_index)
    
    return {
        "message": "User deleted successfully",
        "deletedUser": {
            "id": deleted_user["id"],
            "name": deleted_user["name"],
            "email": deleted_user["email"]
        }
    }

@router.patch("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_data: dict,  # {"status": "Active" | "Inactive" | "Suspended"}
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Update user status"""
    # TODO: Replace with actual implementation
    
    # Find and update user status
    for user in MOCK_USERS:
        if user["id"] == user_id:
            user["status"] = status_data["status"]
            return {
                "message": "User status updated successfully",
                "userId": user_id,
                "newStatus": status_data["status"],
                "updatedAt": datetime.now().isoformat()
            }
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

@router.get("/admin/users/stats/summary")
async def get_users_summary_stats(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get summary statistics for users"""
    # TODO: Replace with actual implementation
    
    total_users = len(MOCK_USERS)
    active_users = len([u for u in MOCK_USERS if u["status"] == "Active"])
    patients = len([u for u in MOCK_USERS if u["role"] == "Patient"])
    staff = total_users - patients
    
    # Count by role
    role_counts = {}
    for user in MOCK_USERS:
        role = user["role"]
        role_counts[role] = role_counts.get(role, 0) + 1
    
    # Count by clinic
    clinic_counts = {}
    for user in MOCK_USERS:
        clinic = user["clinic"]
        clinic_counts[clinic] = clinic_counts.get(clinic, 0) + 1
    
    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "inactiveUsers": len([u for u in MOCK_USERS if u["status"] == "Inactive"]),
        "suspendedUsers": len([u for u in MOCK_USERS if u["status"] == "Suspended"]),
        "patients": patients,
        "staff": staff,
        "roleBreakdown": role_counts,
        "clinicBreakdown": clinic_counts,
        "recentlyAdded": len([u for u in MOCK_USERS if datetime.fromisoformat(u["createdAt"].replace('Z', '+00:00')) > datetime.now(datetime.UTC) - timedelta(days=30)]),
        "lastUpdated": datetime.now().isoformat()
    }

@router.get("/admin/users/roles")
async def get_available_roles(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get list of available user roles"""
    # TODO: Replace with actual implementation
    
    return [
        {
            "role": "Doctor",
            "description": "Medical doctor with patient care responsibilities",
            "permissions": ["viewPatients", "prescribe", "editMedical", "accessAnalytics"]
        },
        {
            "role": "Nurse",
            "description": "Nursing staff with patient care support",
            "permissions": ["viewPatients", "editMedical"]
        },
        {
            "role": "Receptionist",
            "description": "Front desk and administrative support",
            "permissions": ["viewPatients", "scheduleAppointments"]
        },
        {
            "role": "Lab",
            "description": "Laboratory technician",
            "permissions": ["viewPatients", "accessAnalytics", "uploadResults"]
        },
        {
            "role": "Admin",
            "description": "System administrator",
            "permissions": ["viewPatients", "editMedical", "accessAnalytics", "manageUsers"]
        },
        {
            "role": "Patient",
            "description": "Patient user with limited access",
            "permissions": ["viewOwnRecords"]
        }
    ]

@router.get("/admin/users/clinics")
async def get_clinics_for_users(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get list of clinics for user assignment"""
    # TODO: Replace with actual implementation
    
    # Extract unique clinics from users
    clinics = list(set(u["clinic"] for u in MOCK_USERS))
    
    return [
        {
            "id": f"clinic-{i+1}",
            "name": clinic,
            "userCount": len([u for u in MOCK_USERS if u["clinic"] == clinic])
        }
        for i, clinic in enumerate(sorted(clinics))
    ]

@router.post("/admin/users/{user_id}/resend-invitation")
async def resend_invitation(
    user_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Resend invitation to user"""
    # TODO: Replace with actual implementation
    
    # Find user
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new invitation token
    invitation_token = f"invite-{uuid.uuid4().hex[:16]}"
    
    return {
        "message": "Invitation resent successfully",
        "userId": user_id,
        "sentTo": user["email"],
        "invitationToken": invitation_token,
        "expiresAt": (datetime.now() + timedelta(days=7)).isoformat()
    }

@router.get("/admin/users/export")
async def export_users(
    format: str = Query("csv", description="Export format: csv or xlsx"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Export users list"""
    # TODO: Replace with actual implementation
    
    # Mock export URL
    export_id = f"export-{uuid.uuid4().hex[:8]}"
    
    return {
        "message": "Export generated successfully",
        "exportId": export_id,
        "format": format,
        "downloadUrl": f"/api/admin/exports/{export_id}/download",
        "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat(),
        "recordCount": len(MOCK_USERS)
    }