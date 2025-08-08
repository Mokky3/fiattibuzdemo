from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import random

# TODO: Import these when created
# from app.db.session import get_db
# from app.common.auth.auth_utils import get_current_admin_user
# from app.common.schemas.logs import (
#     SystemLog,
#     LogFilter,
#     LogStats
# )
# from app.crud.logs import logs as logs_crud

router = APIRouter()

# Helper function to generate mock logs
def generate_mock_logs(days_back: int = 7):
    """Generate realistic system logs"""
    
    logs = []
    
    # Define log templates
    log_templates = [
        # Login logs
        {
            "type": "Login",
            "actions": [
                "User logged in successfully",
                "User login failed - incorrect password",
                "User login failed - account locked",
                "User logged out",
                "Session expired"
            ],
            "users": ["Dr. Ahmad Karimov", "Nurse Madina Yakubova", "Aziza Nazarova", "Dr. Rustam Aliyev", 
                     "Botir Saidov", "Shahlo Rahimova", "Admin User", "System Admin"]
        },
        # Action logs
        {
            "type": "Action",
            "actions": [
                "Updated patient record",
                "Created new appointment",
                "Viewed patient history",
                "Generated report",
                "Updated clinic settings",
                "Added new user",
                "Modified user permissions",
                "Exported data",
                "Updated profile information",
                "Scheduled appointment",
                "Cancelled appointment",
                "Processed payment"
            ],
            "users": ["Dr. Ahmad Karimov", "Nurse Madina Yakubova", "Aziza Nazarova", "Dr. Rustam Aliyev",
                     "Shahlo Rahimova", "Admin User"]
        },
        # Error logs
        {
            "type": "Error",
            "actions": [
                "Failed to save patient data - database error",
                "API request failed - timeout",
                "File upload failed - invalid format",
                "Report generation failed - insufficient data",
                "Email sending failed - SMTP error",
                "Data validation error",
                "Permission denied - unauthorized access",
                "Database connection lost",
                "External service unavailable"
            ],
            "users": ["System", "Dr. Ahmad Karimov", "Nurse Madina Yakubova", "API Service", "Background Worker"]
        },
        # System logs
        {
            "type": "System",
            "actions": [
                "Database backup completed",
                "System maintenance started",
                "System maintenance completed",
                "Scheduled task executed",
                "Email notifications sent",
                "Data synchronization completed",
                "Cache cleared",
                "System update installed",
                "Security scan completed",
                "Performance optimization run"
            ],
            "users": ["System", "Cron Job", "Background Worker", "Admin Service"]
        }
    ]
    
    # Generate logs for the past N days
    log_id = 1
    current_time = datetime.now()
    
    for day in range(days_back):
        # Generate 20-50 logs per day
        logs_per_day = random.randint(20, 50)
        
        for _ in range(logs_per_day):
            # Random time within the day
            hours_offset = random.randint(0, 23)
            minutes_offset = random.randint(0, 59)
            seconds_offset = random.randint(0, 59)
            
            log_time = current_time - timedelta(
                days=day,
                hours=hours_offset,
                minutes=minutes_offset,
                seconds=seconds_offset
            )
            
            # Select random log type
            log_template = random.choice(log_templates)
            log_type = log_template["type"]
            action = random.choice(log_template["actions"])
            user = random.choice(log_template["users"])
            
            # Determine status based on type
            if log_type == "Error":
                status = "Failed"
            elif log_type == "Login" and "failed" in action.lower():
                status = "Failed"
            else:
                # 95% success rate for non-error logs
                status = "Success" if random.random() > 0.05 else "Failed"
            
            # Add additional context for some logs
            if "patient" in action.lower():
                patient_ids = ["P001", "P002", "P003", "P004", "P005"]
                action += f" (ID: {random.choice(patient_ids)})"
            elif "appointment" in action.lower():
                action += f" (ID: APT-{random.randint(1000, 9999)})"
            elif "report" in action.lower():
                report_types = ["Monthly", "Weekly", "Patient Summary", "Financial", "Activity"]
                action += f" - {random.choice(report_types)}"
            
            logs.append({
                "id": f"log-{uuid.uuid4().hex[:8]}",
                "time": log_time.strftime("%Y-%m-%d %H:%M:%S"),
                "user": user,
                "action": action,
                "status": status,
                "type": log_type,
                "ip_address": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "details": {
                    "session_id": f"session-{uuid.uuid4().hex[:16]}",
                    "request_id": f"req-{uuid.uuid4().hex[:16]}",
                    "duration_ms": random.randint(50, 5000) if status == "Success" else random.randint(5000, 30000)
                }
            })
    
    # Sort logs by time (newest first)
    logs.sort(key=lambda x: x["time"], reverse=True)
    
    return logs

# Mock data - generate logs once
MOCK_LOGS = generate_mock_logs(7)

@router.get("/admin/logs")
async def get_system_logs(
    type_filter: Optional[str] = Query(None, description="Filter by log type"),
    search: Optional[str] = Query(None, description="Search in user or action"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get system logs with filtering and pagination"""
    # TODO: Replace with actual implementation
    
    logs = MOCK_LOGS.copy()
    
    # Apply filters
    if type_filter and type_filter != "All":
        logs = [log for log in logs if log["type"] == type_filter]
    
    if search:
        search_lower = search.lower()
        logs = [
            log for log in logs
            if search_lower in log["user"].lower() or
               search_lower in log["action"].lower()
        ]
    
    if status:
        logs = [log for log in logs if log["status"] == status]
    
    if start_date:
        start_str = start_date.strftime("%Y-%m-%d")
        logs = [log for log in logs if log["time"] >= start_str]
    
    if end_date:
        end_str = (end_date + timedelta(days=1)).strftime("%Y-%m-%d")
        logs = [log for log in logs if log["time"] < end_str]
    
    # Get total count before pagination
    total = len(logs)
    
    # Apply pagination
    logs = logs[offset:offset + limit]
    
    # Return both the logs and metadata
    return logs  # Frontend expects just the array

@router.get("/admin/logs/stats")
async def get_logs_statistics(
    days: int = Query(7, description="Number of days to analyze"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get log statistics and analytics"""
    # TODO: Replace with actual implementation
    
    # Generate statistics from mock logs
    stats_logs = generate_mock_logs(days)
    
    # Calculate statistics
    total_logs = len(stats_logs)
    
    # Count by type
    type_counts = {}
    for log in stats_logs:
        log_type = log["type"]
        type_counts[log_type] = type_counts.get(log_type, 0) + 1
    
    # Count by status
    success_count = len([log for log in stats_logs if log["status"] == "Success"])
    failed_count = len([log for log in stats_logs if log["status"] == "Failed"])
    
    # Most active users
    user_activity = {}
    for log in stats_logs:
        user = log["user"]
        if user != "System" and user != "Cron Job" and user != "Background Worker":
            user_activity[user] = user_activity.get(user, 0) + 1
    
    most_active_users = sorted(user_activity.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Error patterns
    error_logs = [log for log in stats_logs if log["type"] == "Error"]
    error_patterns = {}
    for log in error_logs:
        error_type = log["action"].split(" - ")[1] if " - " in log["action"] else "Unknown"
        error_patterns[error_type] = error_patterns.get(error_type, 0) + 1
    
    # Activity by hour
    hourly_activity = {}
    for log in stats_logs:
        hour = datetime.strptime(log["time"], "%Y-%m-%d %H:%M:%S").hour
        hourly_activity[hour] = hourly_activity.get(hour, 0) + 1
    
    return {
        "totalLogs": total_logs,
        "period": f"{days} days",
        "logTypes": type_counts,
        "successRate": round((success_count / total_logs * 100) if total_logs > 0 else 0, 2),
        "failureRate": round((failed_count / total_logs * 100) if total_logs > 0 else 0, 2),
        "mostActiveUsers": [
            {"user": user, "actions": count}
            for user, count in most_active_users
        ],
        "errorPatterns": error_patterns,
        "hourlyActivity": hourly_activity,
        "averageLogsPerDay": round(total_logs / days, 2),
        "criticalErrors": len([log for log in error_logs if "database" in log["action"].lower() or "system" in log["action"].lower()])
    }

@router.get("/admin/logs/export")
async def export_logs(
    format: str = Query("csv", description="Export format: csv or json"),
    type_filter: Optional[str] = Query(None, description="Filter by log type"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Export logs to file"""
    # TODO: Replace with actual implementation
    
    # Apply same filters as get_logs
    logs = MOCK_LOGS.copy()
    
    if type_filter and type_filter != "All":
        logs = [log for log in logs if log["type"] == type_filter]
    
    if start_date:
        start_str = start_date.strftime("%Y-%m-%d")
        logs = [log for log in logs if log["time"] >= start_str]
    
    if end_date:
        end_str = (end_date + timedelta(days=1)).strftime("%Y-%m-%d")
        logs = [log for log in logs if log["time"] < end_str]
    
    # Generate export ID
    export_id = f"logs-export-{uuid.uuid4().hex[:8]}"
    
    return {
        "message": "Log export generated successfully",
        "exportId": export_id,
        "format": format,
        "downloadUrl": f"/api/admin/exports/{export_id}/download",
        "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat(),
        "recordCount": len(logs)
    }

@router.delete("/admin/logs")
async def clear_old_logs(
    days_to_keep: int = Query(30, ge=1, description="Keep logs from last N days"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Clear old logs (requires super admin permission)"""
    # TODO: Replace with actual implementation
    # Check if user is super admin
    
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    cutoff_str = cutoff_date.strftime("%Y-%m-%d")
    
    # Count logs to be deleted
    logs_to_delete = len([log for log in MOCK_LOGS if log["time"] < cutoff_str])
    
    # Remove old logs from mock data
    MOCK_LOGS[:] = [log for log in MOCK_LOGS if log["time"] >= cutoff_str]
    
    return {
        "message": f"Successfully cleared {logs_to_delete} old logs",
        "deletedCount": logs_to_delete,
        "cutoffDate": cutoff_str,
        "remainingLogs": len(MOCK_LOGS)
    }

@router.get("/admin/logs/realtime")
async def get_realtime_logs(
    last_id: Optional[str] = Query(None, description="Last log ID for polling"),
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get new logs since last ID (for real-time updates)"""
    # TODO: Replace with actual implementation
    
    # In a real implementation, this would return only new logs
    # For mock, return the 5 most recent logs
    recent_logs = MOCK_LOGS[:5]
    
    return {
        "logs": recent_logs,
        "hasMore": False,
        "lastId": recent_logs[0]["id"] if recent_logs else None
    }