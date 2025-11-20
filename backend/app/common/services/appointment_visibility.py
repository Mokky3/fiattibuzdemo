"""
Appointment visibility service for managing appointment access across different user types.
This service ensures that appointments are visible to the appropriate users based on their roles.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.common.models.user import User
from app.common.enums import UserRole


class AppointmentVisibilityService:
    """Service for managing appointment visibility based on user roles and relationships."""
    
    @staticmethod
    def get_appointments_for_user(
        db: Session, 
        user: User, 
        user_role: UserRole,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get appointments visible to a specific user based on their role and relationships.
        
        Args:
            db: Database session
            user: The user requesting appointments
            user_role: The role of the user
            limit: Maximum number of appointments to return
            offset: Number of appointments to skip
            
        Returns:
            List of appointment dictionaries with full relationship data
        """
        
        if user_role == UserRole.DOCTOR:
            return AppointmentVisibilityService._get_doctor_appointments(db, user, limit, offset)
        elif user_role == UserRole.PATIENT:
            return AppointmentVisibilityService._get_patient_appointments(db, user, limit, offset)
        elif user_role == UserRole.RECEPTIONIST:
            return AppointmentVisibilityService._get_receptionist_appointments(db, user, limit, offset)
        elif user_role == UserRole.NURSE:
            return AppointmentVisibilityService._get_nurse_appointments(db, user, limit, offset)
        else:
            return []
    
    @staticmethod
    def _get_doctor_appointments(db: Session, user: User, limit: int, offset: int) -> List[Dict[str, Any]]:
        """Get appointments for a doctor."""
        query = text("""
            SELECT 
                a.id,
                a.appointment_date,
                a.duration_minutes,
                a.appointment_type,
                a.status,
                a.reason,
                a.notes,
                a.patient_id,
                a.doctor_id,
                a.hospital_id,
                u.first_name,
                u.last_name,
                u.email as patient_email,
                h.name as hospital_name,
                d.primary_specialization as doctor_specialization
            FROM ehr.appointments a
            LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
            LEFT JOIN core.users u ON p.user_id = u.id
            LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
            LEFT JOIN ehr.doctors d ON a.doctor_id = d.id
            WHERE a.doctor_id = (
                SELECT d.id FROM ehr.doctors d WHERE d.user_id = :user_id
            )
            ORDER BY a.appointment_date DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {
            "user_id": str(user.id),
            "limit": limit,
            "offset": offset
        })
        
        return AppointmentVisibilityService._format_appointment_results(result)
    
    @staticmethod
    def _get_patient_appointments(db: Session, user: User, limit: int, offset: int) -> List[Dict[str, Any]]:
        """Get appointments for a patient."""
        query = text("""
            SELECT 
                a.id,
                a.appointment_date,
                a.duration_minutes,
                a.appointment_type,
                a.status,
                a.reason,
                a.notes,
                a.patient_id,
                a.doctor_id,
                a.hospital_id,
                u.first_name,
                u.last_name,
                u.email as patient_email,
                h.name as hospital_name,
                d.primary_specialization as doctor_specialization
            FROM ehr.appointments a
            LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
            LEFT JOIN core.users u ON p.user_id = u.id
            LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
            LEFT JOIN ehr.doctors d ON a.doctor_id = d.id
            WHERE p.user_id = :user_id
            ORDER BY a.appointment_date DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {
            "user_id": str(user.id),
            "limit": limit,
            "offset": offset
        })
        
        return AppointmentVisibilityService._format_appointment_results(result)
    
    @staticmethod
    def _get_receptionist_appointments(db: Session, user: User, limit: int, offset: int) -> List[Dict[str, Any]]:
        """Get appointments visible to a receptionist (all appointments in their organization)."""
        query = text("""
            SELECT 
                a.id,
                a.appointment_date,
                a.duration_minutes,
                a.appointment_type,
                a.status,
                a.reason,
                a.notes,
                a.patient_id,
                a.doctor_id,
                a.hospital_id,
                u.first_name,
                u.last_name,
                u.email as patient_email,
                h.name as hospital_name,
                d.primary_specialization as doctor_specialization
            FROM ehr.appointments a
            LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
            LEFT JOIN core.users u ON p.user_id = u.id
            LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
            LEFT JOIN ehr.doctors d ON a.doctor_id = d.id
            WHERE h.organization_id = :organization_id
            ORDER BY a.appointment_date DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {
            "organization_id": str(user.organization_id),
            "limit": limit,
            "offset": offset
        })
        
        return AppointmentVisibilityService._format_appointment_results(result)
    
    @staticmethod
    def _get_nurse_appointments(db: Session, user: User, limit: int, offset: int) -> List[Dict[str, Any]]:
        """Get appointments visible to a nurse (appointments in their department/ward)."""
        query = text("""
            SELECT 
                a.id,
                a.appointment_date,
                a.duration_minutes,
                a.appointment_type,
                a.status,
                a.reason,
                a.notes,
                a.patient_id,
                a.doctor_id,
                a.hospital_id,
                u.first_name,
                u.last_name,
                u.email as patient_email,
                h.name as hospital_name,
                d.primary_specialization as doctor_specialization
            FROM ehr.appointments a
            LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
            LEFT JOIN core.users u ON p.user_id = u.id
            LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
            LEFT JOIN ehr.doctors d ON a.doctor_id = d.id
            WHERE h.organization_id = :organization_id
            ORDER BY a.appointment_date DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {
            "organization_id": str(user.organization_id),
            "limit": limit,
            "offset": offset
        })
        
        return AppointmentVisibilityService._format_appointment_results(result)
    
    @staticmethod
    def _format_appointment_results(result) -> List[Dict[str, Any]]:
        """Format appointment query results into a consistent format."""
        items = []
        for row in result:
            patient_name = "Unknown Patient"
            if row.first_name and row.last_name:
                patient_name = f"{row.first_name} {row.last_name}".strip()
            
            # Format time from appointment_date (which is a datetime)
            time_str = ""
            if row.appointment_date:
                if hasattr(row.appointment_date, 'strftime'):
                    time_str = row.appointment_date.strftime("%H:%M")
                else:
                    time_str = str(row.appointment_date)[:5] if len(str(row.appointment_date)) >= 5 else str(row.appointment_date)
            
            # Handle date formatting
            date_str = ""
            if row.appointment_date:
                if hasattr(row.appointment_date, 'isoformat'):
                    date_str = row.appointment_date.isoformat()
                else:
                    date_str = str(row.appointment_date)
            
            items.append({
                "id": str(row.id),
                "date": date_str,
                "time": time_str,
                "patient_name": patient_name,
                "patient_id": str(row.patient_id),
                "patient_email": row.patient_email or "",
                "doctor_id": str(row.doctor_id),
                "hospital_id": str(row.hospital_id),
                "appointment_type": row.appointment_type or "",
                "status": row.status or "",
                "description": row.notes or row.reason or "",
                "hospital_name": row.hospital_name or "Unknown Hospital",
                "doctor_specialization": row.doctor_specialization or "General Medicine",
                "duration_minutes": row.duration_minutes or 30
            })
        
        return items
    
    @staticmethod
    def get_appointment_count_for_user(
        db: Session, 
        user: User, 
        user_role: UserRole
    ) -> int:
        """Get the total count of appointments visible to a user."""
        
        if user_role == UserRole.DOCTOR:
            query = text("""
                SELECT COUNT(*) FROM ehr.appointments a
                WHERE a.doctor_id = (
                    SELECT d.id FROM ehr.doctors d WHERE d.user_id = :user_id
                )
            """)
        elif user_role == UserRole.PATIENT:
            query = text("""
                SELECT COUNT(*) FROM ehr.appointments a
                LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
                WHERE p.user_id = :user_id
            """)
        elif user_role in [UserRole.RECEPTIONIST, UserRole.NURSE]:
            query = text("""
                SELECT COUNT(*) FROM ehr.appointments a
                LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
                WHERE h.organization_id = :organization_id
            """)
        else:
            return 0
        
        if user_role in [UserRole.RECEPTIONIST, UserRole.NURSE]:
            result = db.execute(query, {"organization_id": str(user.organization_id)})
        else:
            result = db.execute(query, {"user_id": str(user.id)})
        
        return result.fetchone()[0]
