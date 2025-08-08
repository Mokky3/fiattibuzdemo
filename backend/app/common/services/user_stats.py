# backend/app/services/user_stats.py
"""User statistics service"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.models.admin import User, UserActivity, UserStatistics
import random

class UserStatisticsService:
    """Service for calculating and managing user statistics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_doctor_stats(self, user_id: int) -> Dict:
        """Calculate comprehensive statistics for doctors"""
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
        
        # Appointments
        total_appointments = self.db.query(UserActivity).filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "appointment",
            UserActivity.status.in_(["completed", "scheduled"])
        ).count()
        
        appointments_this_month = self.db.query(UserActivity).filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "appointment",
            UserActivity.timestamp >= start_of_month
        ).count()
        
        appointments_last_month = self.db.query(UserActivity).filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "appointment",
            UserActivity.timestamp >= start_of_last_month,
            UserActivity.timestamp < start_of_month
        ).count()
        
        appointments_trend = self._calculate_trend(appointments_this_month, appointments_last_month)
        
        # Prescriptions
        total_prescriptions = self.db.query(UserActivity).filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "prescription"
        ).count()
        
        prescriptions_this_month = self.db.query(UserActivity).filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "prescription",
            UserActivity.timestamp >= start_of_month
        ).count()
        
        prescriptions_last_month = self.db.query(UserActivity).filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "prescription",
            UserActivity.timestamp >= start_of_last_month,
            UserActivity.timestamp < start_of_month
        ).count()
        
        prescriptions_trend = self._calculate_trend(prescriptions_this_month, prescriptions_last_month)
        
        # Mock data for other stats
        total_patients = random.randint(50, 150)
        active_patients = int(total_patients * 0.7)
        new_patients = random.randint(5, 20)
        patients_trend = random.uniform(-20, 30)
        
        # Revenue (mock)
        avg_consultation_fee = 250000  # UZS
        total_revenue = total_appointments * avg_consultation_fee
        revenue_this_month = appointments_this_month * avg_consultation_fee
        revenue_last_month = appointments_last_month * avg_consultation_fee
        revenue_trend = self._calculate_trend(revenue_this_month, revenue_last_month)
        
        # Consultations
        total_consultations = self.db.query(UserActivity).filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "consultation"
        ).count()
        
        avg_duration = 25  # minutes (mock)
        satisfaction = round(random.uniform(4.3, 5.0), 1)
        
        return {
            "appointments": {
                "total": total_appointments,
                "thisMonth": appointments_this_month,
                "lastMonth": appointments_last_month,
                "trend": appointments_trend
            },
            "prescriptions": {
                "total": total_prescriptions,
                "thisMonth": prescriptions_this_month,
                "lastMonth": prescriptions_last_month,
                "trend": prescriptions_trend
            },
            "patients": {
                "total": total_patients,
                "active": active_patients,
                "new": new_patients,
                "trend": patients_trend
            },
            "consultations": {
                "total": total_consultations,
                "avgDuration": avg_duration,
                "satisfaction": satisfaction
            },
            "revenue": {
                "total": total_revenue,
                "thisMonth": revenue_this_month,
                "lastMonth": revenue_last_month,
                "trend": revenue_trend
            }
        }
    
    def calculate_nurse_stats(self, user_id: int) -> Dict:
        """Calculate comprehensive statistics for nurses"""
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        
        # Mock data - in production, this would come from actual records
        return {
            "vitalsTaken": {
                "total": random.randint(200, 400),
                "thisMonth": random.randint(30, 60),
                "lastMonth": random.randint(40, 60),
                "trend": random.uniform(-15, 15)
            },
            "shifts": {
                "total": random.randint(50, 100),
                "thisMonth": random.randint(8, 15),
                "overtime": random.randint(0, 5),
                "trend": random.uniform(-10, 20)
            },
            "patients": {
                "total": random.randint(100, 200),
                "assisted": random.randint(30, 60),
                "critical": random.randint(5, 15),
                "trend": random.uniform(-5, 25)
            },
            "emergencies": {
                "total": random.randint(10, 30),
                "thisMonth": random.randint(2, 6),
                "response": random.randint(90, 99),
                "trend": random.uniform(10, 30)
            },
            "medications": {
                "administered": random.randint(150, 300),
                "thisMonth": random.randint(25, 50),
                "errors": 0
            }
        }
    
    def calculate_patient_stats(self, user_id: int) -> Dict:
        """Calculate comprehensive statistics for patients"""
        # Mock data - in production, this would come from actual records
        return {
            "appointments": {
                "total": 8,
                "completed": 7,
                "cancelled": 1,
                "upcoming": 2
            },
            "treatments": {
                "total": random.randint(5, 20),
                "ongoing": random.randint(1, 5),
                "completed": random.randint(5, 15)
            },
            "prescriptions": {
                "total": 5,
                "active": 2,
                "filled": random.randint(10, 20)
            },
            "vitals": {
                "last": (datetime.utcnow() - timedelta(days=random.randint(5, 30))).strftime("%Y-%m-%d"),
                "bp": f"{random.randint(110, 130)}/{random.randint(70, 85)}",
                "heartRate": random.randint(65, 80),
                "weight": random.randint(60, 90)
            },
            "visits": {
                "total": 8,
                "thisYear": 6,
                "emergency": random.randint(0, 2)
            }
        }
    
    def calculate_performance_metrics(self, user_id: int, role: str) -> Dict:
        """Calculate performance metrics for staff"""
        if role in ["Doctor", "doctor"]:
            return {
                "punctuality": random.randint(88, 98),
                "patientSatisfaction": round(random.uniform(4.2, 5.0), 1),
                "responseTime": random.randint(8, 20),
                "completionRate": random.randint(92, 99)
            }
        elif role in ["Nurse", "nurse"]:
            return {
                "punctuality": random.randint(92, 100),
                "efficiency": random.randint(85, 98),
                "teamwork": round(random.uniform(4.5, 5.0), 1),
                "accuracy": random.randint(96, 100)
            }
        return {}
    
    def get_weekly_activity(self, user_id: int, role: str) -> List[Dict]:
        """Get weekly activity breakdown"""
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        weekly_data = []
        
        for i, day in enumerate(days):
            if role in ["Doctor", "doctor"]:
                weekly_data.append({
                    "day": day,
                    "appointments": random.randint(0, 10) if i < 5 else 0,
                    "hours": 8 if i < 5 else 0
                })
            elif role in ["Nurse", "nurse"]:
                weekly_data.append({
                    "day": day,
                    "patients": random.randint(10, 20) if i < 5 else 0,
                    "hours": 12 if i < 5 else 0
                })
        
        return weekly_data
    
    def get_health_overview(self, user_id: int) -> Dict:
        """Get health overview for patients"""
        return {
            "bloodPressure": random.choice(["Normal", "Elevated", "High"]),
            "heartRate": random.choice(["Normal", "Low", "High"]),
            "weight": random.choice(["Stable", "Increasing", "Decreasing"]),
            "overallHealth": random.choice(["Excellent", "Good", "Fair", "Poor"])
        }
    
    def get_recent_patient_activity(self, user_id: int) -> List[Dict]:
        """Get recent activity for patients"""
        activities = []
        activity_types = [
            ("Checkup", "Dr. A. Aliyev", "Completed"),
            ("Lab Results", "Lab Tech", "Normal"),
            ("Prescription", "Dr. A. Aliyev", "Filled"),
            ("Consultation", "Dr. A. Aliyev", "Completed")
        ]
        
        for i in range(4):
            activity_type, doctor, status = random.choice(activity_types)
            date = datetime.utcnow() - timedelta(days=i*5)
            
            activities.append({
                "date": date.strftime("%Y-%m-%d"),
                "type": activity_type,
                "doctor": doctor,
                "status": status
            })
        
        return activities
    
    def _calculate_trend(self, current: float, previous: float) -> float:
        """Calculate percentage trend"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)
