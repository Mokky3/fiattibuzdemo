from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import random

# TODO: Import these when created
# from app.db.session import get_db
# from app.common.auth.auth_utils import get_current_admin_user
# from app.common.schemas.clinic import (
#     ClinicProfile,
#     ClinicProfileUpdate,
#     ClinicStats
# )
# from app.crud.clinic import clinic as clinic_crud

router = APIRouter()

# Mock data for development
MOCK_CLINICS = [
    {
        "id": "clinic-001",
        "name": "Main General Hospital",
        "city": "Tashkent",
        "address": "123 Medical Center Blvd, Tashkent 100000",
        "founded": "1995",
        "departments": ["Cardiology", "Pediatrics", "Emergency", "Radiology", "Dermatology", "Neurology"],
        "status": "Active",
        "doctors": 45,
        "patients": 1250,
        "createdAt": "2023-01-15T08:00:00Z",
        "lastUpdated": "2025-01-10T16:30:00Z"
    },
    {
        "id": "clinic-002",
        "name": "City Medical Center",
        "city": "Tashkent",
        "address": "456 Health Plaza, Tashkent 100100",
        "founded": "2005",
        "departments": ["General Medicine", "Surgery", "ICU", "Physical Therapy"],
        "status": "Active",
        "doctors": 32,
        "patients": 890,
        "createdAt": "2023-03-20T10:30:00Z",
        "lastUpdated": "2025-01-09T14:15:00Z"
    },
    {
        "id": "clinic-003",
        "name": "Regional Healthcare Complex",
        "city": "Samarkand",
        "address": "789 Regional Ave, Samarkand 140100",
        "founded": "2010",
        "departments": ["Emergency", "General Medicine", "Orthopedics"],
        "status": "Inactive",
        "doctors": 18,
        "patients": 420,
        "createdAt": "2023-06-10T12:00:00Z",
        "lastUpdated": "2024-12-15T11:45:00Z"
    }
]

@router.get("/clinics")
async def get_clinics(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get all clinics"""
    return MOCK_CLINICS

@router.get("/clinics/{clinic_id}")
async def get_clinic_profile(
    clinic_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get clinic profile by ID"""
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic

@router.put("/clinics/{clinic_id}")
async def update_clinic_profile(
    clinic_id: str,
    clinic_data: dict,  # TODO: Replace with ClinicProfileUpdate schema
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Update clinic profile"""
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Update clinic data
    clinic.update(clinic_data)
    clinic["lastUpdated"] = datetime.now().isoformat()
    return clinic

@router.post("/clinics")
async def create_clinic(
    clinic_data: dict,  # TODO: Replace with ClinicProfile schema
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Create new clinic"""
    new_clinic = {
        "id": f"clinic-{len(MOCK_CLINICS) + 1:03d}",
        **clinic_data,
        "status": "Active",
        "doctors": 0,
        "patients": 0,
        "createdAt": datetime.now().isoformat(),
        "lastUpdated": datetime.now().isoformat()
    }
    MOCK_CLINICS.append(new_clinic)
    return new_clinic

@router.delete("/clinics/{clinic_id}")
async def delete_clinic(
    clinic_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Delete clinic"""
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    MOCK_CLINICS.remove(clinic)
    return {"message": "Clinic deleted successfully", "clinic_id": clinic_id}

@router.get("/clinics/{clinic_id}/stats")
async def get_clinic_statistics(
    clinic_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get clinic statistics"""
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Mock statistics
    stats = {
        "clinic_id": clinic_id,
        "clinic_name": clinic["name"],
        "total_appointments": random.randint(500, 2000),
        "appointments_today": random.randint(20, 100),
        "appointments_this_week": random.randint(100, 500),
        "total_patients": clinic["patients"],
        "active_patients": random.randint(50, clinic["patients"]),
        "total_doctors": clinic["doctors"],
        "available_doctors": random.randint(10, clinic["doctors"]),
        "revenue_month": random.randint(50000, 200000),
        "revenue_year": random.randint(500000, 2000000),
        "average_rating": round(random.uniform(4.0, 5.0), 1),
        "patient_satisfaction": round(random.uniform(85, 98), 1),
        "department_stats": {
            dept: {
                "doctors": random.randint(2, 8),
                "patients": random.randint(20, 100),
                "appointments": random.randint(50, 200)
            }
            for dept in clinic["departments"]
        },
        "monthly_trends": {
            "appointments": [random.randint(80, 120) for _ in range(12)],
            "revenue": [random.randint(40000, 60000) for _ in range(12)],
            "patients": [random.randint(60, 90) for _ in range(12)]
        }
    }
    
    return stats

@router.get("/clinics/{clinic_id}/activity-log")
async def get_clinic_activity_log(
    clinic_id: str,
    skip: int = 0,
    limit: int = 50,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get clinic activity log"""
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Mock activity log
    activities = []
    for i in range(limit):
        activities.append({
            "id": f"activity-{i}",
            "timestamp": (datetime.now() - timedelta(hours=i)).isoformat(),
            "action": random.choice([
                "Patient Registration",
                "Appointment Created",
                "Medical Record Updated",
                "Prescription Issued",
                "Lab Test Ordered",
                "Payment Received",
                "Staff Login",
                "Report Generated"
            ]),
            "user": f"User-{random.randint(1, 50)}",
            "details": f"Activity {i} details for {clinic['name']}",
            "ip_address": f"192.168.1.{random.randint(1, 255)}"
        })
    
    return {
        "clinic_id": clinic_id,
        "activities": activities,
        "total": len(activities),
        "skip": skip,
        "limit": limit
    }

@router.patch("/clinics/{clinic_id}/status")
async def update_clinic_status(
    clinic_id: str,
    status_data: dict,  # {"status": "Active" | "Inactive" | "Maintenance"}
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Update clinic status"""
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    new_status = status_data.get("status")
    if new_status not in ["Active", "Inactive", "Maintenance"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    clinic["status"] = new_status
    clinic["lastUpdated"] = datetime.now().isoformat()
    return clinic