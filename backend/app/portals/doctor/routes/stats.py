# portals/doctor/routes/stats.py
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import date, datetime, timezone, timedelta
from .auth import get_current_doctor, DoctorUser

router = APIRouter(prefix="/api/doctor/stats", tags=["Doctor · Stats"])

# ──────────────────────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────────────────────

class DoctorStats(BaseModel):
    patients_seen: int
    appointments_today: int
    prescriptions_written: int
    tasks_pending: int

class DetailedStats(BaseModel):
    patients_seen: int
    appointments_today: int
    prescriptions_written: int
    tasks_pending: int
    # Additional detailed stats
    total_patients: int
    upcoming_appointments: int
    completed_appointments: int
    pending_appointments: int
    active_prescriptions: int
    completed_tasks: int
    unread_messages: int
    reports_generated: int

class WeeklyStats(BaseModel):
    date: str
    appointments: int
    patients: int
    prescriptions: int

class MonthlyOverview(BaseModel):
    month: str
    total_appointments: int
    unique_patients: int
    prescriptions_written: int
    reports_generated: int
    average_daily_appointments: float

class StatsComparison(BaseModel):
    current_period: Dict[str, int]
    previous_period: Dict[str, int]
    percentage_change: Dict[str, float]
    period_type: str  # "week", "month", "year"

# ──────────────────────────────────────────────────────────────────────────────
# Mock Data Generation Functions
# ──────────────────────────────────────────────────────────────────────────────

def generate_realistic_stats() -> DetailedStats:
    """Generate realistic stats that might vary slightly each time"""
    import random
    
    today = date.today()
    
    # Base stats with some randomization
    base_patients = 156
    base_appointments_today = 8
    base_prescriptions = 89
    base_tasks = 12
    
    # Add some realistic variance
    patients_seen = base_patients + random.randint(-5, 15)
    appointments_today = max(0, base_appointments_today + random.randint(-2, 4))
    prescriptions_written = base_prescriptions + random.randint(-10, 25)
    tasks_pending = max(0, base_tasks + random.randint(-5, 8))
    
    return DetailedStats(
        patients_seen=patients_seen,
        appointments_today=appointments_today,
        prescriptions_written=prescriptions_written,
        tasks_pending=tasks_pending,
        total_patients=patients_seen + random.randint(20, 50),
        upcoming_appointments=appointments_today + random.randint(5, 15),
        completed_appointments=random.randint(140, 180),
        pending_appointments=random.randint(3, 12),
        active_prescriptions=prescriptions_written + random.randint(10, 30),
        completed_tasks=random.randint(45, 75),
        unread_messages=random.randint(2, 18),
        reports_generated=random.randint(25, 45)
    )

def generate_weekly_stats() -> List[WeeklyStats]:
    """Generate stats for the past 7 days"""
    import random
    
    weekly_data = []
    for i in range(7):
        stat_date = date.today() - timedelta(days=i)
        weekly_data.append(WeeklyStats(
            date=stat_date.isoformat(),
            appointments=random.randint(4, 12),
            patients=random.randint(3, 10),
            prescriptions=random.randint(2, 8)
        ))
    
    return list(reversed(weekly_data))  # Most recent last

def generate_monthly_overview() -> List[MonthlyOverview]:
    """Generate monthly overview for the past 6 months"""
    import random
    import calendar
    
    monthly_data = []
    for i in range(6):
        target_date = date.today().replace(day=1) - timedelta(days=i*30)
        month_name = calendar.month_name[target_date.month]
        
        total_appointments = random.randint(80, 150)
        monthly_data.append(MonthlyOverview(
            month=f"{month_name} {target_date.year}",
            total_appointments=total_appointments,
            unique_patients=random.randint(40, 80),
            prescriptions_written=random.randint(50, 100),
            reports_generated=random.randint(15, 35),
            average_daily_appointments=round(total_appointments / 30, 1)
        ))
    
    return list(reversed(monthly_data))  # Most recent last

def generate_comparison_stats(period: str = "month") -> StatsComparison:
    """Generate comparison stats for current vs previous period"""
    import random
    
    if period == "week":
        current = {
            "appointments": random.randint(35, 65),
            "patients": random.randint(25, 45),
            "prescriptions": random.randint(20, 40),
            "reports": random.randint(8, 15)
        }
        previous = {
            "appointments": random.randint(30, 60),
            "patients": random.randint(20, 40),
            "prescriptions": random.randint(15, 35),
            "reports": random.randint(6, 12)
        }
    else:  # month
        current = {
            "appointments": random.randint(120, 180),
            "patients": random.randint(80, 120),
            "prescriptions": random.randint(60, 100),
            "reports": random.randint(25, 45)
        }
        previous = {
            "appointments": random.randint(100, 160),
            "patients": random.randint(70, 110),
            "prescriptions": random.randint(50, 90),
            "reports": random.randint(20, 40)
        }
    
    # Calculate percentage changes
    percentage_change = {}
    for key in current:
        if previous[key] > 0:
            change = ((current[key] - previous[key]) / previous[key]) * 100
            percentage_change[key] = round(change, 1)
        else:
            percentage_change[key] = 100.0 if current[key] > 0 else 0.0
    
    return StatsComparison(
        current_period=current,
        previous_period=previous,
        percentage_change=percentage_change,
        period_type=period
    )

# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=DoctorStats)
async def get_doctor_stats(_: DoctorUser = Depends(get_current_doctor)):
    """Get basic doctor statistics (compatible with existing DoctorStats.jsx)"""
    detailed = generate_realistic_stats()
    
    return DoctorStats(
        patients_seen=detailed.patients_seen,
        appointments_today=detailed.appointments_today,
        prescriptions_written=detailed.prescriptions_written,
        tasks_pending=detailed.tasks_pending,
    )

@router.get("/detailed", response_model=DetailedStats)
async def get_detailed_stats(_: DoctorUser = Depends(get_current_doctor)):
    """Get comprehensive statistics with additional metrics"""
    return generate_realistic_stats()

@router.get("/weekly", response_model=List[WeeklyStats])
async def get_weekly_stats(
    weeks: Optional[int] = Query(1, description="Number of weeks to retrieve (1-4)"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get weekly statistics for charts and trends"""
    weeks = min(max(weeks, 1), 4)  # Limit between 1-4 weeks
    
    weekly_data = []
    for week_offset in range(weeks):
        week_start = date.today() - timedelta(days=(week_offset * 7) + 6)
        week_stats = generate_weekly_stats()
        weekly_data.extend(week_stats)
    
    return weekly_data[-7*weeks:]  # Return requested number of weeks

@router.get("/monthly", response_model=List[MonthlyOverview])
async def get_monthly_overview(
    months: Optional[int] = Query(6, description="Number of months to retrieve (1-12)"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get monthly overview statistics"""
    months = min(max(months, 1), 12)  # Limit between 1-12 months
    monthly_data = generate_monthly_overview()
    return monthly_data[-months:]

@router.get("/comparison", response_model=StatsComparison)
async def get_comparison_stats(
    period: Optional[str] = Query("month", description="Comparison period: week, month"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get comparison statistics between current and previous period"""
    if period not in ["week", "month"]:
        period = "month"
    
    return generate_comparison_stats(period)

@router.get("/dashboard-summary")
async def get_dashboard_summary(_: DoctorUser = Depends(get_current_doctor)):
    """Get summary stats optimized for dashboard display"""
    detailed = generate_realistic_stats()
    weekly = generate_weekly_stats()
    comparison = generate_comparison_stats("week")
    
    # Calculate trends
    recent_appointments = [day.appointments for day in weekly[-7:]]
    avg_appointments = sum(recent_appointments) / len(recent_appointments)
    
    # Today's specific metrics
    today_metrics = {
        "appointments_completed": max(0, detailed.appointments_today - 2),
        "appointments_remaining": max(0, 2),
        "next_appointment_time": "14:30",
        "productivity_score": min(100, int((detailed.appointments_today / 10) * 100))
    }
    
    return {
        "overview": {
            "patients_seen": detailed.patients_seen,
            "appointments_today": detailed.appointments_today,
            "prescriptions_written": detailed.prescriptions_written,
            "tasks_pending": detailed.tasks_pending,
            "unread_messages": detailed.unread_messages
        },
        "trends": {
            "weekly_avg_appointments": round(avg_appointments, 1),
            "week_over_week_change": comparison.percentage_change.get("appointments", 0),
            "busiest_day_this_week": max(weekly, key=lambda x: x.appointments).date,
            "total_week_appointments": sum(day.appointments for day in weekly)
        },
        "today": today_metrics,
        "quick_actions": {
            "pending_prescriptions": detailed.tasks_pending,
            "unread_messages": detailed.unread_messages,
            "upcoming_appointments": min(detailed.upcoming_appointments, 10)
        },
        "performance": {
            "patient_satisfaction": 4.7,  # Mock rating
            "average_consultation_time": "22 min",
            "on_time_percentage": 94.2
        },
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.get("/export")
async def export_stats(
    format: Optional[str] = Query("json", description="Export format: json, csv"),
    period: Optional[str] = Query("month", description="Period: week, month, year"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Export statistics in various formats"""
    detailed = generate_realistic_stats()
    weekly = generate_weekly_stats()
    monthly = generate_monthly_overview()
    
    export_data = {
        "doctor_id": "doc1",  # In real implementation, use current.id
        "export_date": datetime.now(timezone.utc).isoformat(),
        "period": period,
        "summary": detailed.dict(),
        "weekly_breakdown": [w.dict() for w in weekly],
        "monthly_overview": [m.dict() for m in monthly[-3:]]  # Last 3 months
    }
    
    if format.lower() == "csv":
        # In a real implementation, convert to CSV format
        return {"message": "CSV export functionality would be implemented here", "data": export_data}
    
    return export_data

@router.get("/real-time")
async def get_real_time_stats(_: DoctorUser = Depends(get_current_doctor)):
    """Get real-time statistics for live updates"""
    import random
    
    return {
        "current_time": datetime.now(timezone.utc).isoformat(),
        "active_consultations": random.choice([0, 1]),
        "waiting_patients": random.randint(0, 4),
        "today_progress": {
            "appointments_completed": random.randint(3, 8),
            "appointments_total": random.randint(8, 12),
            "completion_percentage": random.randint(60, 95)
        },
        "system_status": {
            "ehr_system": "online",
            "appointment_system": "online", 
            "prescription_system": "online",
            "messaging_system": "online"
        },
        "alerts": [
            {
                "type": "info",
                "message": "2 lab results ready for review",
                "priority": "medium"
            }
        ] if random.choice([True, False]) else []
    }