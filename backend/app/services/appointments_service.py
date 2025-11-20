"""Centralized appointments service for all portals."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, Union
from uuid import UUID, uuid4
from enum import Enum

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.common.models.appointment import (
    Appointment, AppointmentStatus, AppointmentType, AppointmentPriority,
    AppointmentParticipant, ParticipantType
)
from app.common.models.patient import Patient
from app.common.models.doctor import Doctor
from app.common.models.hospital import Hospital
from app.common.models.user import User
from app.services.fhir_client import FHIRClient
from app.services.messaging_service import MessagingService


class AppointmentAction(str, Enum):
    CREATE = "create"
    CONFIRM = "confirm"
    DECLINE = "decline"
    COMPLETE = "complete"
    CANCEL = "cancel"
    RESCHEDULE = "reschedule"


class AppointmentCreateRequest(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    hospital_id: str
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    appointment_type: str
    duration_minutes: int = 30
    priority: str = "routine"
    description: Optional[str] = None
    notes: Optional[str] = None
    created_by: str


class AppointmentUpdateRequest(BaseModel):
    status: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    updated_by: str


class AvailabilityRequest(BaseModel):
    doctor_id: str
    date: str  # YYYY-MM-DD
    start_time: Optional[str] = None  # HH:MM
    end_time: Optional[str] = None  # HH:MM


class AvailabilitySlot(BaseModel):
    start_time: str
    end_time: str
    available: bool
    appointment_id: Optional[str] = None


class AppointmentsService:
    """Centralized service for appointment management across all portals."""
    
    def __init__(self, db: Session):
        self.db = db
        self.fhir_client = FHIRClient()
        self.messaging_service = MessagingService(db)
    
    async def create_appointment(self, request: AppointmentCreateRequest) -> Appointment:
        """Create a new appointment with validation and notifications."""
        # Validate doctor availability
        if request.doctor_id:
            is_available = await self.check_doctor_availability(
                request.doctor_id, 
                request.appointment_date, 
                request.appointment_time,
                request.duration_minutes
            )
            if not is_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Doctor not available at this time"
                )
        
        # Parse datetime
        appointment_datetime = datetime.strptime(
            f"{request.appointment_date}T{request.appointment_time}:00",
            "%Y-%m-%dT%H:%M:%S"
        ).replace(tzinfo=timezone.utc)
        
        end_datetime = appointment_datetime + timedelta(minutes=request.duration_minutes)
        
        # Create appointment
        appointment = Appointment(
            id=str(uuid4()),
            patient_id=request.patient_id,
            doctor_id=request.doctor_id,
            hospital_id=request.hospital_id,
            appointment_date=appointment_datetime.date(),
            start_time=appointment_datetime,
            end_time=end_datetime,
            minutes_duration=request.duration_minutes,
            appointment_type=self._map_appointment_type(request.appointment_type),
            status=AppointmentStatus.PENDING,
            priority=self._map_priority(request.priority),
            description=request.description,
            comment=request.notes,
            created_by=request.created_by,
            created_at=datetime.utcnow()
        )
        
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        
        # Create FHIR Appointment resource
        await self.fhir_client.create_appointment(appointment)
        
        # Send notifications
        await self._send_appointment_notifications(appointment, AppointmentAction.CREATE)
        
        return appointment
    
    async def confirm_appointment(self, appointment_id: str, user_id: str, reason: Optional[str] = None) -> Appointment:
        """Confirm an appointment."""
        appointment = self._get_appointment_with_validation(appointment_id, user_id)
        
        if appointment.status != AppointmentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appointment cannot be confirmed in current status"
            )
        
        appointment.status = AppointmentStatus.BOOKED
        appointment.confirmed_at = datetime.utcnow()
        appointment.confirmed_by = user_id
        
        self.db.commit()
        self.db.refresh(appointment)
        
        # Update FHIR resource
        await self.fhir_client.update_appointment(appointment)
        
        # Send notifications
        await self._send_appointment_notifications(appointment, AppointmentAction.CONFIRM, reason)
        
        return appointment
    
    async def decline_appointment(self, appointment_id: str, user_id: str, reason: str) -> Appointment:
        """Decline an appointment."""
        appointment = self._get_appointment_with_validation(appointment_id, user_id)
        
        if appointment.status not in [AppointmentStatus.PENDING, AppointmentStatus.BOOKED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appointment cannot be declined in current status"
            )
        
        appointment.status = AppointmentStatus.CANCELLED
        appointment.cancelled_at = datetime.utcnow()
        appointment.cancelled_by = user_id
        appointment.cancellation_reason = reason
        
        self.db.commit()
        self.db.refresh(appointment)
        
        # Update FHIR resource
        await self.fhir_client.update_appointment(appointment)
        
        # Send notifications
        await self._send_appointment_notifications(appointment, AppointmentAction.DECLINE, reason)
        
        return appointment
    
    async def complete_appointment(self, appointment_id: str, user_id: str) -> Appointment:
        """Mark appointment as completed."""
        appointment = self._get_appointment_with_validation(appointment_id, user_id)
        
        if appointment.status != AppointmentStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appointment must be in progress to be completed"
            )
        
        appointment.status = AppointmentStatus.COMPLETED
        appointment.completed_at = datetime.utcnow()
        appointment.completed_by = user_id
        
        self.db.commit()
        self.db.refresh(appointment)
        
        # Update FHIR resource
        await self.fhir_client.update_appointment(appointment)
        
        # Send notifications
        await self._send_appointment_notifications(appointment, AppointmentAction.COMPLETE)
        
        return appointment
    
    async def reschedule_appointment(self, appointment_id: str, request: AppointmentUpdateRequest) -> Appointment:
        """Reschedule an appointment."""
        appointment = self._get_appointment_with_validation(appointment_id, request.updated_by)
        
        if appointment.status not in [AppointmentStatus.PENDING, AppointmentStatus.BOOKED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appointment cannot be rescheduled in current status"
            )
        
        # Check new availability if doctor is specified
        if appointment.doctor_id and request.appointment_date and request.appointment_time:
            is_available = await self.check_doctor_availability(
                appointment.doctor_id,
                request.appointment_date,
                request.appointment_time,
                request.duration_minutes or appointment.minutes_duration
            )
            if not is_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Doctor not available at new time"
                )
        
        # Update appointment
        if request.appointment_date and request.appointment_time:
            new_datetime = datetime.strptime(
                f"{request.appointment_date}T{request.appointment_time}:00",
                "%Y-%m-%dT%H:%M:%S"
            ).replace(tzinfo=timezone.utc)
            
            appointment.appointment_date = new_datetime.date()
            appointment.start_time = new_datetime
            appointment.end_time = new_datetime + timedelta(minutes=request.duration_minutes or appointment.minutes_duration)
        
        if request.duration_minutes:
            appointment.minutes_duration = request.duration_minutes
        
        if request.description:
            appointment.description = request.description
        
        if request.notes:
            appointment.comment = request.notes
        
        appointment.status = AppointmentStatus.RESCHEDULED
        appointment.updated_by = request.updated_by
        appointment.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(appointment)
        
        # Update FHIR resource
        await self.fhir_client.update_appointment(appointment)
        
        # Send notifications
        await self._send_appointment_notifications(appointment, AppointmentAction.RESCHEDULE)
        
        return appointment
    
    async def check_doctor_availability(self, doctor_id: str, date: str, time: str, duration_minutes: int = 30) -> bool:
        """Check if doctor is available at specified time."""
        appointment_datetime = datetime.strptime(
            f"{date}T{time}:00",
            "%Y-%m-%dT%H:%M:%S"
        ).replace(tzinfo=timezone.utc)
        
        end_datetime = appointment_datetime + timedelta(minutes=duration_minutes)
        
        # Check for conflicting appointments
        conflicting_appointments = self.db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_datetime.date(),
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.BOOKED, AppointmentStatus.IN_PROGRESS]),
            Appointment.start_time < end_datetime,
            Appointment.end_time > appointment_datetime
        ).count()
        
        return conflicting_appointments == 0
    
    async def get_doctor_availability(self, request: AvailabilityRequest) -> List[AvailabilitySlot]:
        """Get available time slots for a doctor on a specific date."""
        date_obj = datetime.strptime(request.date, "%Y-%m-%d").date()
        
        # Default working hours (9 AM to 5 PM)
        start_time = request.start_time or "09:00"
        end_time = request.end_time or "17:00"
        
        start_hour, start_minute = map(int, start_time.split(":"))
        end_hour, end_minute = map(int, end_time.split(":"))
        
        # Generate 30-minute slots
        slots = []
        current_time = datetime.combine(date_obj, datetime.min.time().replace(hour=start_hour, minute=start_minute))
        end_datetime = datetime.combine(date_obj, datetime.min.time().replace(hour=end_hour, minute=end_minute))
        
        while current_time < end_datetime:
            slot_end = current_time + timedelta(minutes=30)
            
            # Check if slot is available
            conflicting_appointments = self.db.query(Appointment).filter(
                Appointment.doctor_id == request.doctor_id,
                Appointment.appointment_date == date_obj,
                Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.BOOKED, AppointmentStatus.IN_PROGRESS]),
                Appointment.start_time < slot_end,
                Appointment.end_time > current_time
            ).first()
            
            slots.append(AvailabilitySlot(
                start_time=current_time.strftime("%H:%M"),
                end_time=slot_end.strftime("%H:%M"),
                available=conflicting_appointments is None,
                appointment_id=conflicting_appointments.id if conflicting_appointments else None
            ))
            
            current_time = slot_end
        
        return slots
    
    def get_patient_appointments(self, patient_id: str, scope: str = "upcoming", limit: int = 50) -> List[Appointment]:
        """Get appointments for a patient."""
        query = self.db.query(Appointment).filter(Appointment.patient_id == patient_id)
        
        if scope == "upcoming":
            query = query.filter(
                Appointment.appointment_date >= datetime.utcnow().date(),
                Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.BOOKED])
            ).order_by(Appointment.start_time)
        elif scope == "past":
            query = query.filter(
                (Appointment.appointment_date < datetime.utcnow().date()) |
                Appointment.status.in_([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED])
            ).order_by(Appointment.start_time.desc())
        
        return query.limit(limit).all()
    
    def get_doctor_appointments(self, doctor_id: str, date: Optional[str] = None, status: Optional[str] = None) -> List[Appointment]:
        """Get appointments for a doctor."""
        query = self.db.query(Appointment).filter(Appointment.doctor_id == doctor_id)
        
        if date:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date == date_obj)
        
        if status:
            query = query.filter(Appointment.status == status)
        
        return query.order_by(Appointment.start_time).all()
    
    def _get_appointment_with_validation(self, appointment_id: str, user_id: str) -> Appointment:
        """Get appointment with validation."""
        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # TODO: Add ownership/access validation based on user role
        return appointment
    
    def _map_appointment_type(self, appointment_type: str) -> AppointmentType:
        """Map string appointment type to enum."""
        type_mapping = {
            "general_consultation": AppointmentType.GENERAL_CONSULTATION,
            "follow_up": AppointmentType.FOLLOW_UP,
            "emergency": AppointmentType.EMERGENCY,
            "routine_checkup": AppointmentType.ROUTINE_CHECKUP,
            "specialist_consultation": AppointmentType.SPECIALIST_CONSULTATION,
            "procedure": AppointmentType.PROCEDURE,
            "telemedicine": AppointmentType.TELEMEDICINE
        }
        return type_mapping.get(appointment_type, AppointmentType.GENERAL_CONSULTATION)
    
    def _map_priority(self, priority: str) -> AppointmentPriority:
        """Map string priority to enum."""
        priority_mapping = {
            "routine": AppointmentPriority.ROUTINE,
            "urgent": AppointmentPriority.URGENT,
            "asap": AppointmentPriority.ASAP,
            "stat": AppointmentPriority.STAT
        }
        return priority_mapping.get(priority, AppointmentPriority.ROUTINE)
    
    async def _send_appointment_notifications(self, appointment: Appointment, action: AppointmentAction, reason: Optional[str] = None):
        """Send notifications for appointment actions."""
        # Get patient and doctor details
        patient = self.db.query(Patient).filter(Patient.patient_id == appointment.patient_id).first()
        doctor = self.db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first() if appointment.doctor_id else None
        
        # Create notification message
        action_messages = {
            AppointmentAction.CREATE: "Your appointment has been scheduled",
            AppointmentAction.CONFIRM: "Your appointment has been confirmed",
            AppointmentAction.DECLINE: "Your appointment has been declined",
            AppointmentAction.COMPLETE: "Your appointment has been completed",
            AppointmentAction.RESCHEDULE: "Your appointment has been rescheduled"
        }
        
        message = action_messages.get(action, "Appointment update")
        if reason:
            message += f": {reason}"
        
        # Send to patient
        if patient and patient.user_id:
            await self.messaging_service.send_system_message(
                recipient_id=patient.user_id,
                subject=f"Appointment {action.value.title()}",
                content=message,
                message_type="appointment_notification"
            )
        
        # Send to doctor if applicable
        if doctor and doctor.user_id and action in [AppointmentAction.CREATE, AppointmentAction.RESCHEDULE]:
            patient_name = "Patient"
            if patient and patient.user:
                patient_name = f"{patient.user.first_name or ''} {patient.user.last_name or ''}".strip() or "Patient"
            await self.messaging_service.send_system_message(
                recipient_id=doctor.user_id,
                subject=f"New Appointment {action.value.title()}",
                content=f"New appointment with {patient_name}",
                message_type="appointment_notification"
            )
    
    async def get_clinic_appointments(
        self,
        clinic_id: str,
        page: int = 1,
        size: int = 20,
        patient_id: Optional[str] = None,
        practitioner_id: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get appointments for a clinic with formatting for frontend."""
        from app.crud.appointment import appointment as appointment_crud
        from sqlalchemy.orm import joinedload
        from uuid import UUID
        import traceback
        
        try:
            # Convert clinic_id to UUID if needed
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            
            # Build query filters
            query_filters = {
                "clinic_id": str(clinic_uuid),
                "skip": (page - 1) * size,
                "limit": size,
            }
            if status:
                query_filters["status"] = status
            if date_from:
                query_filters["date_from"] = date_from
            if date_to:
                query_filters["date_to"] = date_to
            
            # Get appointments from database
            appointments = appointment_crud.get_by_clinic(
                db=self.db,
                **query_filters
            )
            
            # Get total count
            count_filters = {
                "clinic_id": str(clinic_uuid),
            }
            if status:
                count_filters["status"] = status
            if date_from:
                count_filters["date_from"] = date_from
            if date_to:
                count_filters["date_to"] = date_to
            
            total = appointment_crud.count_by_clinic(
                db=self.db,
                **count_filters
            )
            
            # Format appointments for response
            formatted_appointments = []
            for apt in appointments:
                # Load patient with user relationship
                patient_name = "Unknown Patient"
                try:
                    patient = self.db.query(Patient).options(
                        joinedload(Patient.user)
                    ).filter(Patient.patient_id == apt.patient_id).first()
                    
                    if patient and patient.user_id:
                        # Access user through the relationship
                        user = patient.user
                        if user:
                            first_name = user.first_name if user.first_name else ''
                            last_name = user.last_name if user.last_name else ''
                            email = user.email if user.email else ''
                            full_name = f"{first_name} {last_name}".strip()
                            patient_name = full_name if full_name else (email if email else "Unknown Patient")
                except AttributeError as e:
                    # Handle case where Patient doesn't have expected attributes
                    print(f"AttributeError loading patient {apt.patient_id}: {e}")
                    patient_name = "Unknown Patient"
                except Exception as e:
                    print(f"Error loading patient {apt.patient_id}: {e}")
                    import traceback
                    traceback.print_exc()
                    patient_name = "Unknown Patient"
                
                # Load doctor with user relationship
                doctor_name = "Unknown Doctor"
                try:
                    doctor = self.db.query(Doctor).options(
                        joinedload(Doctor.user)
                    ).filter(Doctor.id == apt.doctor_id).first()
                    
                    if doctor and doctor.user_id:
                        # Access user through the relationship
                        user = doctor.user
                        if user:
                            first_name = user.first_name if user.first_name else ''
                            last_name = user.last_name if user.last_name else ''
                            full_name = f"{first_name} {last_name}".strip()
                            doctor_name = f"Dr. {full_name}" if full_name else "Unknown Doctor"
                except AttributeError as e:
                    # Handle case where Doctor doesn't have expected attributes
                    print(f"AttributeError loading doctor {apt.doctor_id}: {e}")
                    doctor_name = "Unknown Doctor"
                except Exception as e:
                    print(f"Error loading doctor {apt.doctor_id}: {e}")
                    import traceback
                    traceback.print_exc()
                    doctor_name = "Unknown Doctor"
                
                # Format appointment date and time
                apt_date = apt.appointment_date
                date_str = apt_date.strftime("%Y-%m-%d") if apt_date else ""
                time_str = apt_date.strftime("%H:%M") if apt_date else ""
                formatted_date = apt_date.strftime("%d %b %Y") if apt_date else ""
                
                formatted_appointments.append({
                    "id": str(apt.id),
                    "date": date_str,
                    "time": time_str,
                    "patient_name": patient_name,
                    "patient_id": str(apt.patient_id),
                    "doctor_name": doctor_name,
                    "doctor_id": str(apt.doctor_id),
                    "reason": apt.reason or "",
                    "description": apt.notes or "",
                    "status": apt.status or "pending",
                    "priority": "medium",  # Default priority
                    "duration": apt.duration_minutes or 30,
                    "formatted_date": formatted_date,
                    "fhir_appointment_id": None  # Can be added if needed
                })
            
            return {
                "appointments": formatted_appointments,
                "total": total
            }
        except AttributeError as e:
            # Catch any AttributeError and provide detailed traceback
            error_msg = f"AttributeError in get_clinic_appointments: {str(e)}"
            print(error_msg)
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
        except Exception as e:
            # Catch any other exception and provide detailed traceback
            error_msg = f"Error in get_clinic_appointments: {str(e)}"
            print(error_msg)
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
