from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import random

# TODO: Import these when created
# from app.db.session import get_db
# from app.common.auth.auth_utils import get_current_admin_user
# from app.common.schemas.user import (
#     UserStats,
#     UserActivity,
#     UserPerformance
# )
# from app.crud.user import user as user_crud

router = APIRouter()

# Helper function to generate mock data based on role
def generate_role_based_stats(user_role: str, user_id: str):
    """Generate role-specific statistics"""
    
    if user_role == "Doctor":
        return {
            "stats": {
                "appointments": {
                    "total": 1247,
                    "thisMonth": 89,
                    "completed": 1156,
                    "trend": 12.5
                },
                "prescriptions": {
                    "total": 3456,
                    "thisMonth": 234,
                    "trend": 8.3
                },
                "patients": {
                    "total": 342,
                    "active": 87,
                    "new": 12,
                    "trend": 5.2
                },
                "revenue": {
                    "total": 125000,
                    "thisMonth": 8500,
                    "trend": 15.7
                }
            },
            "performance": {
                "punctuality": 94,
                "patientSatisfaction": 4.6,
                "responseTime": 12,
                "completionRate": 98
            },
            "weeklyActivity": [
                {"day": "Mon", "appointments": 18, "hours": 9},
                {"day": "Tue", "appointments": 22, "hours": 10},
                {"day": "Wed", "appointments": 20, "hours": 9.5},
                {"day": "Thu", "appointments": 24, "hours": 11},
                {"day": "Fri", "appointments": 19, "hours": 9},
                {"day": "Sat", "appointments": 8, "hours": 4},
                {"day": "Sun", "appointments": 0, "hours": 0}
            ]
        }
    
    elif user_role == "Nurse":
        return {
            "stats": {
                "vitalsTaken": {
                    "total": 4567,
                    "thisMonth": 342,
                    "trend": 6.8
                },
                "shifts": {
                    "total": 156,
                    "thisMonth": 22,
                    "overtime": 8,
                    "trend": 3.2
                },
                "patients": {
                    "total": 892,
                    "assisted": 234,
                    "critical": 45,
                    "trend": 9.1
                },
                "emergencies": {
                    "response": 98,
                    "thisMonth": 12,
                    "trend": -2.3
                }
            },
            "performance": {
                "punctuality": 97,
                "efficiency": 95,
                "teamwork": 4.8,
                "accuracy": 99
            },
            "weeklyActivity": [
                {"day": "Mon", "patients": 45, "hours": 8},
                {"day": "Tue", "patients": 52, "hours": 9},
                {"day": "Wed", "patients": 48, "hours": 8.5},
                {"day": "Thu", "patients": 55, "hours": 10},
                {"day": "Fri", "patients": 43, "hours": 8},
                {"day": "Sat", "patients": 38, "hours": 8},
                {"day": "Sun", "patients": 0, "hours": 0}
            ]
        }
    
    elif user_role == "Patient":
        return {
            "stats": {
                "appointments": {
                    "total": 24,
                    "completed": 22,
                    "upcoming": 2,
                    "missed": 1
                },
                "treatments": {
                    "ongoing": 2,
                    "completed": 5,
                    "total": 7
                },
                "visits": {
                    "total": 45,
                    "thisYear": 8,
                    "emergency": 2
                },
                "prescriptions": {
                    "total": 18,
                    "active": 3,
                    "completed": 15
                }
            },
            "health": {
                "bloodPressure": "120/80",
                "heartRate": "72 bpm",
                "weight": "Stable",
                "overallHealth": "Good"
            },
            "recentActivity": [
                {
                    "type": "Checkup",
                    "doctor": "Dr. Ahmad Karimov",
                    "date": "Jan 5, 2025",
                    "status": "Completed"
                },
                {
                    "type": "Blood Test",
                    "doctor": "Lab - Botir Saidov",
                    "date": "Jan 3, 2025",
                    "status": "Normal"
                },
                {
                    "type": "Prescription",
                    "doctor": "Dr. Ahmad Karimov",
                    "date": "Dec 28, 2024",
                    "status": "Filled"
                }
            ]
        }
    
    else:  # Generic stats for other roles
        return {
            "stats": {
                "tasksCompleted": random.randint(100, 1000),
                "hoursWorked": random.randint(500, 2000),
                "efficiency": random.randint(85, 99),
                "systemUsage": random.randint(70, 95)
            },
            "performance": {
                "punctuality": random.randint(90, 99),
                "productivity": random.randint(85, 98),
                "accuracy": random.randint(92, 99),
                "teamwork": round(random.uniform(4.0, 5.0), 1)
            }
        }

def generate_activity_history(user_role: str, total_activities: int = 50):
    """Generate role-specific activity history"""
    
    activities = []
    
    # Define activity types by role
    activity_types_by_role = {
        "Doctor": [
            ("appointment", "Completed patient appointment", ["completed", "cancelled", "rescheduled"]),
            ("prescription", "Issued prescription", ["completed", "updated"]),
            ("consultation", "Virtual consultation", ["completed", "scheduled"]),
            ("report", "Medical report generated", ["completed"]),
            ("login", "System login", ["success"])
        ],
        "Nurse": [
            ("vitals", "Recorded patient vitals", ["completed"]),
            ("medication", "Administered medication", ["completed"]),
            ("shift", "Shift activity", ["started", "completed"]),
            ("emergency", "Emergency response", ["resolved"]),
            ("documentation", "Patient documentation", ["completed"]),
            ("handoff", "Patient handoff", ["completed"])
        ],
        "Patient": [
            ("appointment", "Medical appointment", ["completed", "scheduled", "cancelled"]),
            ("lab", "Lab test", ["completed", "scheduled"]),
            ("prescription", "Prescription activity", ["filled", "renewed"]),
            ("portal", "Patient portal access", ["login", "viewed"]),
            ("registration", "Registration update", ["updated"])
        ],
        "Receptionist": [
            ("appointment", "Scheduled appointment", ["scheduled", "rescheduled", "cancelled"]),
            ("registration", "Patient registration", ["completed", "updated"]),
            ("login", "System login", ["success"]),
            ("report", "Generated report", ["completed"])
        ],
        "Lab": [
            ("lab", "Lab test processed", ["completed", "pending"]),
            ("report", "Test report generated", ["completed"]),
            ("system", "System maintenance", ["completed"]),
            ("training", "Training session", ["completed"])
        ],
        "Admin": [
            ("system", "System configuration", ["updated", "completed"]),
            ("report", "Administrative report", ["generated"]),
            ("login", "System login", ["success"]),
            ("assessment", "System assessment", ["completed"])
        ]
    }
    
    activity_templates = activity_types_by_role.get(user_role, [
        ("system", "System activity", ["completed"]),
        ("login", "System login", ["success"])
    ])
    
    # Generate activities
    for i in range(total_activities):
        activity_type, action_template, statuses = random.choice(activity_templates)
        status = random.choice(statuses)
        
        # Generate timestamp (activities from last 30 days)
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        timestamp = datetime.now() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
        
        # Create detailed action and details based on type
        if activity_type == "appointment":
            patient_names = ["Ahmad K.", "Madina Y.", "Rustam A.", "Gulnara M.", "Jamshid T."]
            action = f"{action_template} with {random.choice(patient_names)}"
            details = f"Duration: {random.randint(15, 45)} minutes"
        elif activity_type == "prescription":
            medications = ["Amoxicillin", "Ibuprofen", "Metformin", "Lisinopril", "Omeprazole"]
            action = f"{action_template} - {random.choice(medications)}"
            details = f"Dosage: {random.randint(1, 3)} times daily"
        elif activity_type == "lab":
            tests = ["Blood count", "Glucose test", "Lipid panel", "Thyroid test", "Urinalysis"]
            action = f"{action_template} - {random.choice(tests)}"
            details = f"Sample ID: LAB{random.randint(1000, 9999)}"
        elif activity_type == "vitals":
            action = action_template
            details = f"BP: {random.randint(110, 130)}/{random.randint(70, 85)}, HR: {random.randint(65, 85)}"
        else:
            action = action_template
            details = f"Reference: {activity_type.upper()}-{random.randint(1000, 9999)}"
        
        activities.append({
            "id": f"activity-{uuid.uuid4().hex[:8]}",
            "type": activity_type,
            "action": action,
            "details": details,
            "status": status,
            "timestamp": timestamp.strftime("%b %d, %Y at %I:%M %p")
        })
    
    # Sort activities by timestamp (most recent first)
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return activities

@router.get("/admin/users/{user_id}/stats")
async def get_user_statistics(
    user_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get comprehensive user statistics"""
    # TODO: Replace with actual implementation
    
    # Mock user data - in production, fetch from database
    mock_users = {
        "user-001": {"name": "Dr. Ahmad Karimov", "role": "Doctor"},
        "user-002": {"name": "Nurse Madina Yakubova", "role": "Nurse"},
        "user-003": {"name": "Aziza Nazarova", "role": "Receptionist"},
        "user-004": {"name": "Dr. Rustam Aliyev", "role": "Doctor"},
        "user-005": {"name": "Botir Saidov", "role": "Lab"},
        "user-006": {"name": "Shahlo Rahimova", "role": "Admin"},
        "user-007": {"name": "Jamshid Tursunov", "role": "Patient"},
        "user-008": {"name": "Dr. Gulnara Mirzayeva", "role": "Doctor"}
    }
    
    user_info = mock_users.get(user_id)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate role-based statistics
    stats_data = generate_role_based_stats(user_info["role"], user_id)
    
    return stats_data

@router.get("/admin/users/{user_id}")
async def get_user_info(
    user_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get user basic information"""
    # TODO: Replace with actual implementation
    
    # Mock user database
    mock_users = {
        "user-001": {
            "id": "user-001",
            "name": "Dr. Ahmad Karimov",
            "role": "Doctor",
            "clinic": "Main Hospital",
            "status": "Active",
            "joinDate": "Jun 15, 2023",
            "lastLogin": "Jan 10, 2025 at 2:30 PM",
            "email": "ahmad.karimov@mainhospital.uz",
            "phone": "+998 90 123 4567"
        },
        "user-002": {
            "id": "user-002",
            "name": "Nurse Madina Yakubova",
            "role": "Nurse",
            "clinic": "Main Hospital",
            "status": "Active",
            "joinDate": "Aug 20, 2023",
            "lastLogin": "Jan 10, 2025 at 8:45 AM",
            "email": "madina.yakubova@mainhospital.uz",
            "phone": "+998 91 234 5678"
        },
        "user-007": {
            "id": "user-007",
            "name": "Jamshid Tursunov",
            "role": "Patient",
            "clinic": "Main Hospital",
            "status": "Active",
            "joinDate": "May 20, 2024",
            "lastVisit": "Jan 8, 2025 at 11:45 AM",
            "email": "jamshid.patient@gmail.com",
            "phone": "+998 98 789 0123"
        }
    }
    
    # Add more mock users dynamically
    for i in range(3, 13):
        if i == 7:
            continue  # Skip user-007 as it's already defined
        
        roles = ["Doctor", "Nurse", "Receptionist", "Lab", "Admin", "Patient"]
        clinics = ["Main Hospital", "City Clinic", "West Clinic"]
        user_id_key = f"user-{i:03d}"
        
        mock_users[user_id_key] = {
            "id": user_id_key,
            "name": f"User {i}",
            "role": roles[i % len(roles)],
            "clinic": clinics[i % len(clinics)],
            "status": "Active" if i % 4 != 0 else "Inactive",
            "joinDate": f"Jan {i}, 2024",
            "lastLogin": f"Jan {10-i if i < 10 else 1}, 2025 at {i%12 or 12}:00 {'AM' if i < 12 else 'PM'}",
            "email": f"user{i}@hospital.uz",
            "phone": f"+998 9{i%10} {100+i} {1000+i}"
        }
    
    user = mock_users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.get("/admin/users/{user_id}/activity")
async def get_user_activity_history(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    filter: str = Query("all", description="Activity type filter"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get user activity history with pagination and filtering"""
    # TODO: Replace with actual implementation
    
    # Get user info to determine role
    mock_users = {
        "user-001": {"role": "Doctor"},
        "user-002": {"role": "Nurse"},
        "user-003": {"role": "Receptionist"},
        "user-004": {"role": "Doctor"},
        "user-005": {"role": "Lab"},
        "user-006": {"role": "Admin"},
        "user-007": {"role": "Patient"},
        "user-008": {"role": "Doctor"}
    }
    
    user_info = mock_users.get(user_id)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate activity history
    all_activities = generate_activity_history(user_info["role"], 100)
    
    # Apply filter if not "all"
    if filter != "all":
        filtered_activities = [a for a in all_activities if a["type"] == filter]
    else:
        filtered_activities = all_activities
    
    # Calculate pagination
    total = len(filtered_activities)
    start = (page - 1) * limit
    end = start + limit
    
    # Get paginated results
    paginated_activities = filtered_activities[start:end]
    
    return {
        "activities": paginated_activities,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit
    }

@router.get("/admin/users/{user_id}/performance-trends")
async def get_user_performance_trends(
    user_id: str,
    period: str = Query("monthly", description="Time period: daily, weekly, monthly"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get user performance trends over time"""
    # TODO: Replace with actual implementation
    
    # Generate mock trend data
    if period == "daily":
        data_points = 7
    elif period == "weekly":
        data_points = 4
    else:  # monthly
        data_points = 6
    
    trends = []
    for i in range(data_points):
        trends.append({
            "period": f"Period {i+1}",
            "efficiency": random.randint(85, 99),
            "satisfaction": round(random.uniform(4.0, 5.0), 1),
            "productivity": random.randint(80, 100),
            "quality": random.randint(90, 100)
        })
    
    return {
        "period": period,
        "trends": trends
    }

@router.post("/admin/users/{user_id}/export-stats")
async def export_user_statistics(
    user_id: str,
    export_options: dict = {},  # {"format": "pdf|xlsx", "includeCharts": bool}
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Export user statistics report"""
    # TODO: Replace with actual implementation
    
    export_format = export_options.get("format", "pdf")
    include_charts = export_options.get("includeCharts", True)
    
    # Generate export ID
    export_id = f"export-stats-{uuid.uuid4().hex[:8]}"
    
    return {
        "message": "Statistics export generated successfully",
        "exportId": export_id,
        "format": export_format,
        "includeCharts": include_charts,
        "downloadUrl": f"/api/admin/exports/{export_id}/download",
        "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat()
    }