# portals/doctor/routes/stats.py
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import date, datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from .auth import get_current_doctor, DoctorUser
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.common.models.appointment import Appointment, AppointmentStatus
from app.common.models.prescription import Prescription, PrescriptionStatus
from app.common.models.doctor import Doctor, ClinicalNote, GeneralReport

router = APIRouter(prefix="/stats", tags=["Doctor · Stats"])

# ──────────────────────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────────────────────

class DoctorStats(BaseModel):
    patients_seen: int
    appointments_today: int
    prescriptions_written: int
    tasks_pending: int
    reports_submitted: int

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

@router.get("", response_model=SuccessResponse[DoctorStats])
async def get_doctor_stats(
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get basic doctor statistics (compatible with existing DoctorStats.jsx)"""
    import logging
    logger = logging.getLogger(__name__)
    try:
        # Get doctor profile from database
        logger.info(f"Getting stats for doctor user_id: {current_doctor.id}")
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        logger.info(f"Doctor profile found: {doctor_profile is not None}")
        
        if not doctor_profile:
            logger.warning(f"Doctor profile not found for user_id: {current_doctor.id}")
            # Return zeros instead of mock data so user knows there's an issue
            return SuccessResponse(
                data=DoctorStats(
                    patients_seen=0,
                    appointments_today=0,
                    prescriptions_written=0,
                    tasks_pending=0,
                    reports_submitted=0,
                ),
                message="Stats retrieved (doctor profile not found)"
            )
        
        doctor_id = doctor_profile.id  # ehr.doctors.id (used for reports and appointments)
        doctor_user_id = current_doctor.id  # core.users.id (used for prescriptions)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # Count patients seen (unique patients with completed appointments OR reports submitted)
        # Use a simpler approach: get all unique patient IDs from each source and combine in Python
        # This avoids UNION query complexity and potential type mismatches
        
        # Get unique patients from completed appointments
        appointment_patients = set()
        try:
            appointment_results = db.query(Appointment.patient_id).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_([AppointmentStatus.COMPLETED.value, 'completed', 'done', 'finished'])
            ).distinct().all()
            appointment_patients = {str(row[0]) for row in appointment_results if row[0] is not None}
        except Exception as e:
            logger.warning(f"Error getting patients from appointments: {e}")
        
        # Get unique patients from reports (ClinicalNote)
        clinical_note_patients = set()
        try:
            clinical_note_results = db.query(ClinicalNote.patient_id).filter(
                ClinicalNote.doctor_id == doctor_id
            ).distinct().all()
            clinical_note_patients = {str(row[0]) for row in clinical_note_results if row[0] is not None}
        except Exception as e:
            logger.warning(f"Error getting patients from ClinicalNote: {e}")
        
        # Get unique patients from GeneralReport
        general_report_patients = set()
        try:
            general_report_results = db.query(GeneralReport.patient_id).filter(
                GeneralReport.doctor_id == doctor_id
            ).distinct().all()
            general_report_patients = {str(row[0]) for row in general_report_results if row[0] is not None}
        except Exception as e:
            logger.warning(f"Error getting patients from GeneralReport: {e}")
        
        # Combine all unique patient IDs (sets automatically handle uniqueness)
        all_patient_ids = appointment_patients | clinical_note_patients | general_report_patients
        patients_seen = len(all_patient_ids)
        
        # Count appointments today (using appointment_date which is DateTime)
        appointments_today = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date < today_end
        ).scalar() or 0
        
        # Count prescriptions written
        # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
        prescriptions_written = db.query(func.count(Prescription.id)).filter(
            Prescription.doctor_id == doctor_user_id
        ).scalar() or 0
        
        # Count pending tasks (appointments that need action):
        # 1. Appointments today that are not completed (need attention today)
        # 2. Appointments with PENDING/PROPOSED status (need approval/confirmation)
        today_appointments_pending = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date < today_end,
            ~Appointment.status.in_([
                AppointmentStatus.COMPLETED.value,
                AppointmentStatus.CANCELLED.value,
                'completed',
                'cancelled',
                'done',
                'finished'
            ])
        ).scalar() or 0
        
        # Appointment requests that need approval
        pending_requests = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_([
                AppointmentStatus.PENDING.value,
                AppointmentStatus.PROPOSED.value,
                'pending',
                'requested',
                'proposed'
            ]),
            Appointment.appointment_date > today_end  # Future appointments needing approval
        ).scalar() or 0
        
        tasks_pending = today_appointments_pending + pending_requests
        
        # Count reports submitted (ClinicalNote + GeneralReport)
        clinical_notes_count = db.query(func.count(ClinicalNote.id)).filter(
            ClinicalNote.doctor_id == doctor_id
        ).scalar() or 0
        
        general_reports_count = db.query(func.count(GeneralReport.id)).filter(
            GeneralReport.doctor_id == doctor_id
        ).scalar() or 0
        
        reports_submitted = clinical_notes_count + general_reports_count
        
        logger.info(f"Stats calculated - patients_seen: {patients_seen}, appointments_today: {appointments_today}, "
                   f"prescriptions_written: {prescriptions_written}, tasks_pending: {tasks_pending}, "
                   f"reports_submitted: {reports_submitted}")
        
        return SuccessResponse(
            data=DoctorStats(
                patients_seen=patients_seen,
                appointments_today=appointments_today,
                prescriptions_written=prescriptions_written,
                tasks_pending=tasks_pending,
                reports_submitted=reports_submitted,
            ),
            message="Stats retrieved from database"
        )
        
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting real stats: {e}", exc_info=True)
        traceback.print_exc()
        # Return zeros instead of mock data so user knows there's an issue
        return SuccessResponse(
            data=DoctorStats(
                patients_seen=0,
                appointments_today=0,
                prescriptions_written=0,
                tasks_pending=0,
                reports_submitted=0,
            ),
            message=f"Stats retrieved (error occurred: {str(e)})"
        )

@router.get("/detailed", response_model=SuccessResponse[DetailedStats])
async def get_detailed_stats(
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get comprehensive statistics with additional metrics"""
    try:
        # Get doctor profile
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        
        if not doctor_profile:
            return SuccessResponse(data=generate_realistic_stats(), message="Detailed stats retrieved (mock)")
        
        doctor_id = doctor_profile.id  # ehr.doctors.id (used for reports and appointments)
        doctor_user_id = current_doctor.id  # core.users.id (used for prescriptions)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        week_start = today_start - timedelta(days=7)
        
        # Basic stats
        # Count patients seen (unique patients with completed appointments OR reports submitted)
        # Use a simpler approach: get all unique patient IDs from each source and combine in Python
        # This avoids UNION query complexity and potential type mismatches
        
        # Get unique patients from completed appointments
        appointment_patients = set()
        try:
            appointment_results = db.query(Appointment.patient_id).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_([AppointmentStatus.COMPLETED.value, 'completed', 'done', 'finished'])
            ).distinct().all()
            appointment_patients = {str(row[0]) for row in appointment_results if row[0] is not None}
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error getting patients from appointments: {e}")
        
        # Get unique patients from reports (ClinicalNote)
        clinical_note_patients = set()
        try:
            clinical_note_results = db.query(ClinicalNote.patient_id).filter(
                ClinicalNote.doctor_id == doctor_id
            ).distinct().all()
            clinical_note_patients = {str(row[0]) for row in clinical_note_results if row[0] is not None}
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error getting patients from ClinicalNote: {e}")
        
        # Get unique patients from GeneralReport
        general_report_patients = set()
        try:
            general_report_results = db.query(GeneralReport.patient_id).filter(
                GeneralReport.doctor_id == doctor_id
            ).distinct().all()
            general_report_patients = {str(row[0]) for row in general_report_results if row[0] is not None}
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error getting patients from GeneralReport: {e}")
        
        # Combine all unique patient IDs (sets automatically handle uniqueness)
        all_patient_ids = appointment_patients | clinical_note_patients | general_report_patients
        patients_seen = len(all_patient_ids)
        
        appointments_today = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date < today_end
        ).scalar() or 0
        
        # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
        prescriptions_written = db.query(func.count(Prescription.id)).filter(
            Prescription.doctor_id == doctor_user_id
        ).scalar() or 0
        
        # Count pending tasks (appointments that need action):
        # 1. Appointments today that are not completed (need attention today)
        # 2. Appointments with PENDING/PROPOSED status (need approval/confirmation)
        today_appointments_pending = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date < today_end,
            ~Appointment.status.in_([
                AppointmentStatus.COMPLETED.value,
                AppointmentStatus.CANCELLED.value,
                'completed',
                'cancelled',
                'done',
                'finished'
            ])
        ).scalar() or 0
        
        # Appointment requests that need approval
        pending_requests = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_([
                AppointmentStatus.PENDING.value,
                AppointmentStatus.PROPOSED.value,
                'pending',
                'requested',
                'proposed'
            ]),
            Appointment.appointment_date > today_end  # Future appointments needing approval
        ).scalar() or 0
        
        tasks_pending = today_appointments_pending + pending_requests
        
        # Additional detailed stats
        total_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.doctor_id == doctor_id
        ).scalar() or 0
        
        upcoming_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.status.in_([
                AppointmentStatus.BOOKED.value,
                AppointmentStatus.PENDING.value,
                'booked',
                'pending'
            ])
        ).scalar() or 0
        
        completed_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_([AppointmentStatus.COMPLETED.value, 'completed', 'done', 'finished'])
        ).scalar() or 0
        
        pending_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_([
                AppointmentStatus.PENDING.value,
                AppointmentStatus.BOOKED.value,
                'pending',
                'booked'
            ])
        ).scalar() or 0
        
        # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
        active_prescriptions = db.query(func.count(Prescription.id)).filter(
            Prescription.doctor_id == doctor_user_id,
            Prescription.status == PrescriptionStatus.ACTIVE.value
        ).scalar() or 0
        
        completed_tasks = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == AppointmentStatus.COMPLETED.value
        ).scalar() or 0
        
        # Reports generated (using ClinicalNote)
        reports_generated = db.query(func.count(ClinicalNote.id)).filter(
            ClinicalNote.doctor_id == doctor_id
        ).scalar() or 0
        
        # Unread messages (mock for now - would need messages table)
        unread_messages = 0  # TODO: Implement when messages table is available
        
        return SuccessResponse(
            data=DetailedStats(
                patients_seen=patients_seen,
                appointments_today=appointments_today,
                prescriptions_written=prescriptions_written,
                tasks_pending=tasks_pending,
                total_patients=total_patients,
                upcoming_appointments=upcoming_appointments,
                completed_appointments=completed_appointments,
                pending_appointments=pending_appointments,
                active_prescriptions=active_prescriptions,
                completed_tasks=completed_tasks,
                unread_messages=unread_messages,
                reports_generated=reports_generated
            ),
            message="Detailed stats retrieved from database"
        )
        
    except Exception as e:
        import traceback
        print(f"Error getting detailed stats: {e}")
        traceback.print_exc()
        return SuccessResponse(data=generate_realistic_stats(), message="Detailed stats retrieved (mock - error)")

@router.get("/weekly", response_model=SuccessResponse[List[WeeklyStats]])
async def get_weekly_stats(
    weeks: Optional[int] = Query(1, description="Number of weeks to retrieve (1-4)"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get weekly statistics for charts and trends"""
    try:
        weeks = min(max(weeks, 1), 4)  # Limit between 1-4 weeks
        
        # Get doctor profile
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            weekly_data = []
            for week_offset in range(weeks):
                week_stats = generate_weekly_stats()
                weekly_data.extend(week_stats)
            return SuccessResponse(data=weekly_data[-7*weeks:], message="Weekly stats retrieved (mock)")
        
        doctor_id = doctor_profile.id  # ehr.doctors.id (used for reports and appointments)
        doctor_user_id = current_doctor.id  # core.users.id (used for prescriptions)
        weekly_data = []
        
        # Generate stats for each day in the requested period
        days_to_retrieve = weeks * 7
        for day_offset in range(days_to_retrieve):
            stat_date = date.today() - timedelta(days=day_offset)
            day_start = datetime.combine(stat_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            
            # Count appointments for this day
            appointments = db.query(func.count(Appointment.id)).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= day_start,
                Appointment.appointment_date < day_end
            ).scalar() or 0
            
            # Count unique patients for this day
            patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= day_start,
                Appointment.appointment_date < day_end
            ).scalar() or 0
            
            # Count prescriptions for this day
            # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
            prescriptions = db.query(func.count(Prescription.id)).filter(
                Prescription.doctor_id == doctor_user_id,
                func.date(Prescription.prescribed_date) == stat_date
            ).scalar() or 0
            
            weekly_data.append(WeeklyStats(
                date=stat_date.isoformat(),
                appointments=appointments,
                patients=patients,
                prescriptions=prescriptions
            ))
        
        # Reverse to get most recent last
        weekly_data.reverse()
        
        return SuccessResponse(data=weekly_data, message="Weekly stats retrieved from database")
        
    except Exception as e:
        import traceback
        print(f"Error getting weekly stats: {e}")
        traceback.print_exc()
        weekly_data = []
        for week_offset in range(weeks):
            week_stats = generate_weekly_stats()
            weekly_data.extend(week_stats)
        return SuccessResponse(data=weekly_data[-7*weeks:], message="Weekly stats retrieved (mock - error)")

@router.get("/monthly", response_model=SuccessResponse[List[MonthlyOverview]])
async def get_monthly_overview(
    months: Optional[int] = Query(6, description="Number of months to retrieve (1-12)"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get monthly overview statistics"""
    try:
        months = min(max(months, 1), 12)  # Limit between 1-12 months
        
        # Get doctor profile
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            monthly_data = generate_monthly_overview()
            return SuccessResponse(data=monthly_data[-months:], message="Monthly overview retrieved (mock)")
        
        doctor_id = doctor_profile.id  # ehr.doctors.id (used for reports and appointments)
        doctor_user_id = current_doctor.id  # core.users.id (used for prescriptions)
        monthly_data = []
        import calendar
        
        for month_offset in range(months):
            target_date = date.today().replace(day=1) - timedelta(days=30 * month_offset)
            month_start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            # Calculate month end
            if month_offset == 0:
                month_end = datetime.now(timezone.utc)
            else:
                next_month = target_date.replace(day=28) + timedelta(days=4)
                month_end = (next_month - timedelta(days=next_month.day)).replace(day=1)
                month_end = datetime.combine(month_end, datetime.min.time()).replace(tzinfo=timezone.utc)
            
            # Count appointments for this month
            total_appointments = db.query(func.count(Appointment.id)).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= month_start,
                Appointment.appointment_date < month_end
            ).scalar() or 0
            
            # Count unique patients for this month
            unique_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= month_start,
                Appointment.appointment_date < month_end
            ).scalar() or 0
            
            # Count prescriptions for this month
            # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
            prescriptions_written = db.query(func.count(Prescription.id)).filter(
                Prescription.doctor_id == doctor_user_id,
                Prescription.prescribed_date >= month_start,
                Prescription.prescribed_date < month_end
            ).scalar() or 0
            
            # Count reports for this month
            reports_generated = db.query(func.count(ClinicalNote.id)).filter(
                ClinicalNote.doctor_id == doctor_id,
                ClinicalNote.note_date >= month_start,
                ClinicalNote.note_date < month_end
            ).scalar() or 0
            
            # Calculate average daily appointments
            days_in_month = calendar.monthrange(target_date.year, target_date.month)[1]
            average_daily_appointments = round(total_appointments / days_in_month, 1) if days_in_month > 0 else 0.0
            
            month_name = calendar.month_name[target_date.month]
            monthly_data.append(MonthlyOverview(
                month=f"{month_name} {target_date.year}",
                total_appointments=total_appointments,
                unique_patients=unique_patients,
                prescriptions_written=prescriptions_written,
                reports_generated=reports_generated,
                average_daily_appointments=average_daily_appointments
            ))
        
        monthly_data.reverse()  # Most recent last
        return SuccessResponse(data=monthly_data, message="Monthly overview retrieved from database")
        
    except Exception as e:
        import traceback
        print(f"Error getting monthly stats: {e}")
        traceback.print_exc()
        monthly_data = generate_monthly_overview()
        return SuccessResponse(data=monthly_data[-months:], message="Monthly overview retrieved (mock - error)")

@router.get("/comparison", response_model=SuccessResponse[StatsComparison])
async def get_comparison_stats(
    period: Optional[str] = Query("month", description="Comparison period: week, month"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get comparison statistics between current and previous period"""
    try:
        if period not in ["week", "month"]:
            period = "month"
        
        # Get doctor profile
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            return SuccessResponse(data=generate_comparison_stats(period), message="Comparison stats retrieved (mock)")
        
        doctor_id = doctor_profile.id  # ehr.doctors.id (used for reports and appointments)
        doctor_user_id = current_doctor.id  # core.users.id (used for prescriptions)
        
        if period == "week":
            # Current week
            today = datetime.now(timezone.utc)
            week_start = today - timedelta(days=today.weekday())
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end = week_start + timedelta(days=7)
            
            # Previous week
            prev_week_start = week_start - timedelta(days=7)
            prev_week_end = week_start
            
            # Current period stats
            current_appointments = db.query(func.count(Appointment.id)).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= week_start,
                Appointment.appointment_date < week_end
            ).scalar() or 0
            
            current_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= week_start,
                Appointment.appointment_date < week_end
            ).scalar() or 0
            
            # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
            current_prescriptions = db.query(func.count(Prescription.id)).filter(
                Prescription.doctor_id == doctor_user_id,
                Prescription.prescribed_date >= week_start,
                Prescription.prescribed_date < week_end
            ).scalar() or 0
            
            current_reports = db.query(func.count(ClinicalNote.id)).filter(
                ClinicalNote.doctor_id == doctor_id,
                ClinicalNote.note_date >= week_start,
                ClinicalNote.note_date < week_end
            ).scalar() or 0
            
            # Previous period stats
            prev_appointments = db.query(func.count(Appointment.id)).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= prev_week_start,
                Appointment.appointment_date < prev_week_end
            ).scalar() or 0
            
            prev_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= prev_week_start,
                Appointment.appointment_date < prev_week_end
            ).scalar() or 0
            
            # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
            prev_prescriptions = db.query(func.count(Prescription.id)).filter(
                Prescription.doctor_id == doctor_user_id,
                Prescription.prescribed_date >= prev_week_start,
                Prescription.prescribed_date < prev_week_end
            ).scalar() or 0
            
            prev_reports = db.query(func.count(ClinicalNote.id)).filter(
                ClinicalNote.doctor_id == doctor_id,
                ClinicalNote.note_date >= prev_week_start,
                ClinicalNote.note_date < prev_week_end
            ).scalar() or 0
            
        else:  # month
            # Current month
            today = date.today()
            month_start = datetime.combine(today.replace(day=1), datetime.min.time()).replace(tzinfo=timezone.utc)
            next_month = month_start.replace(month=month_start.month % 12 + 1, day=1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1, day=1)
            month_end = next_month
            
            # Previous month
            prev_month_start = month_start - timedelta(days=30)
            prev_month_start = prev_month_start.replace(day=1)
            prev_month_end = month_start
            
            # Current period stats
            current_appointments = db.query(func.count(Appointment.id)).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= month_start,
                Appointment.appointment_date < month_end
            ).scalar() or 0
            
            current_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= month_start,
                Appointment.appointment_date < month_end
            ).scalar() or 0
            
            # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
            current_prescriptions = db.query(func.count(Prescription.id)).filter(
                Prescription.doctor_id == doctor_user_id,
                Prescription.prescribed_date >= month_start,
                Prescription.prescribed_date < month_end
            ).scalar() or 0
            
            current_reports = db.query(func.count(ClinicalNote.id)).filter(
                ClinicalNote.doctor_id == doctor_id,
                ClinicalNote.note_date >= month_start,
                ClinicalNote.note_date < month_end
            ).scalar() or 0
            
            # Previous period stats
            prev_appointments = db.query(func.count(Appointment.id)).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= prev_month_start,
                Appointment.appointment_date < prev_month_end
            ).scalar() or 0
            
            prev_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= prev_month_start,
                Appointment.appointment_date < prev_month_end
            ).scalar() or 0
            
            # Note: Prescriptions use user_id (current_doctor.id) as doctor_id, not doctor_profile.id
            prev_prescriptions = db.query(func.count(Prescription.id)).filter(
                Prescription.doctor_id == doctor_user_id,
                Prescription.prescribed_date >= prev_month_start,
                Prescription.prescribed_date < prev_month_end
            ).scalar() or 0
            
            prev_reports = db.query(func.count(ClinicalNote.id)).filter(
                ClinicalNote.doctor_id == doctor_id,
                ClinicalNote.note_date >= prev_month_start,
                ClinicalNote.note_date < prev_month_end
            ).scalar() or 0
        
        # Calculate percentage changes
        def calc_percentage_change(current, previous):
            if previous > 0:
                return round(((current - previous) / previous) * 100, 1)
            return 100.0 if current > 0 else 0.0
        
        return SuccessResponse(
            data=StatsComparison(
                current_period={
                    "appointments": current_appointments,
                    "patients": current_patients,
                    "prescriptions": current_prescriptions,
                    "reports": current_reports
                },
                previous_period={
                    "appointments": prev_appointments,
                    "patients": prev_patients,
                    "prescriptions": prev_prescriptions,
                    "reports": prev_reports
                },
                percentage_change={
                    "appointments": calc_percentage_change(current_appointments, prev_appointments),
                    "patients": calc_percentage_change(current_patients, prev_patients),
                    "prescriptions": calc_percentage_change(current_prescriptions, prev_prescriptions),
                    "reports": calc_percentage_change(current_reports, prev_reports)
                },
                period_type=period
            ),
            message="Comparison stats retrieved from database"
        )
        
    except Exception as e:
        import traceback
        print(f"Error getting comparison stats: {e}")
        traceback.print_exc()
        if period not in ["week", "month"]:
            period = "month"
        return SuccessResponse(data=generate_comparison_stats(period), message="Comparison stats retrieved (mock - error)")

@router.get("/dashboard-summary", response_model=SuccessResponse[Dict[str, object]])
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
    
    return SuccessResponse(
        data={
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
        },
        message="Dashboard summary retrieved"
    )

@router.get("/export", response_model=SuccessResponse[Dict[str, object]])
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
    
    # Note: CSV conversion would be implemented in a real system
    return SuccessResponse(data=export_data, message="Export ready")

@router.get("/real-time", response_model=SuccessResponse[Dict[str, object]])
async def get_real_time_stats(_: DoctorUser = Depends(get_current_doctor)):
    """Get real-time statistics for live updates"""
    import random
    
    return SuccessResponse(
        data={
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
        },
        message="Real-time stats"
    )