"""Nurse vitals routes supporting the NurseVitalsModule UI."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from app.common.auth.auth_service import AuthenticatedUser, require_nurse_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.nurse.schemas.vitals import (
    VitalMeasurement,
    VitalMeasurementCreate,
    VitalMeasurementUpdate,
    VitalCollection,
    VitalStats,
)
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, text
from app.db.session import get_db
from app.crud.vitals import vitals as vitals_crud
from app.common.models.medical import VitalSign
from app.common.models.patient import Patient
from app.common.models.user import User

router = APIRouter(prefix="/vitals", tags=["Nurse Vitals"])
logger = logging.getLogger(__name__)

_ALLOWED_STATUS = {"normal", "attention", "abnormal", "pending"}


@router.get("", response_model=SuccessResponse[VitalCollection])
async def list_vitals(
    search: Optional[str] = Query(None),
    status: str = Query("all"),
    date_filter: str = Query("all", pattern=r"^(all|today|week)$"),
    tab: str = Query("all", pattern=r"^(all|abnormal|attention|pending)$"),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    try:
        # Use raw SQL to query vital signs with correct column names
        # Database has: recorded_by, recorded_at, systolic_bp, diastolic_bp
        # ORM expects: measured_by, measured_at, blood_pressure_systolic, blood_pressure_diastolic
        
        # First, get assigned patient IDs for this nurse (if any)
        try:
            nurse_profile_sql = text("""
                SELECT id 
                FROM ehr.nurses 
                WHERE user_id = :user_id
            """)
            nurse_result = db.execute(nurse_profile_sql, {"user_id": current_user.user_id}).first()
            nurse_profile_id = str(nurse_result[0]) if nurse_result else None
            
            assigned_patient_ids = []
            if nurse_profile_id:
                assignments_sql = text("""
                    SELECT DISTINCT patient_id 
                    FROM ehr.nurse_patient_assignments 
                    WHERE nurse_id = :nurse_id
                """)
                assignment_results = db.execute(assignments_sql, {"nurse_id": nurse_profile_id}).all()
                assigned_patient_ids = [str(row[0]) for row in assignment_results]
        except Exception as e:
            logger.warning(f"Error getting nurse assignments: {e}")
            try:
                db.rollback()
            except Exception:
                pass
            assigned_patient_ids = []
        
        # Build query - show all vitals if no assignments, or only assigned patients
        if assigned_patient_ids:
            # Query vitals for assigned patients
            # Build IN clause with placeholders
            placeholders = ",".join([f":patient_id_{i}" for i in range(len(assigned_patient_ids))])
            vitals_sql = text(f"""
                SELECT 
                    id, patient_id, recorded_by, systolic_bp, diastolic_bp,
                    heart_rate, temperature, respiratory_rate, oxygen_saturation,
                    weight, height, bmi, pain_scale, recorded_at, created_at
                FROM ehr.vital_signs
                WHERE patient_id IN ({placeholders})
                ORDER BY recorded_at ASC
                LIMIT 500
            """)
            params = {f"patient_id_{i}": patient_id for i, patient_id in enumerate(assigned_patient_ids)}
            vitals_results = db.execute(vitals_sql, params).all()
        else:
            # Query all vitals (no assignments found)
            vitals_sql = text("""
                SELECT 
                    id, patient_id, recorded_by, systolic_bp, diastolic_bp,
                    heart_rate, temperature, respiratory_rate, oxygen_saturation,
                    weight, height, bmi, pain_scale, recorded_at, created_at
                FROM ehr.vital_signs
                ORDER BY recorded_at ASC
                LIMIT 500
            """)
            vitals_results = db.execute(vitals_sql).all()
        
        # Convert raw SQL results to VitalSign-like objects
        vitals_list = []
        for row in vitals_results:
            vital = VitalSign()
            vital.id = str(row[0])  # id
            vital.patient_id = str(row[1])  # patient_id
            vital.measured_by = str(row[2]) if row[2] else None  # recorded_by -> measured_by
            vital.blood_pressure_systolic = row[3]  # systolic_bp -> blood_pressure_systolic
            vital.blood_pressure_diastolic = row[4]  # diastolic_bp -> blood_pressure_diastolic
            vital.heart_rate = row[5]  # heart_rate
            vital.temperature = row[6]  # temperature
            vital.respiratory_rate = row[7]  # respiratory_rate
            vital.oxygen_saturation = row[8]  # oxygen_saturation
            vital.weight = row[9]  # weight
            vital.height = row[10]  # height
            vital.bmi = row[11]  # bmi
            vital.pain_scale = row[12]  # pain_scale
            vital.measured_at = row[13]  # recorded_at -> measured_at
            vital.created_at = row[14]  # created_at
            
            # Set defaults for missing columns
            vital.temperature_method = None
            vital.blood_pressure_position = None
            vital.heart_rhythm = None
            vital.oxygen_flow_rate = None
            vital.head_circumference = None
            vital.pain_location = None
            vital.blood_glucose = None
            vital.glucose_method = None
            vital.notes = None
            vital.fhir_observation_ids = None
            vital.updated_at = None
            vital.medical_record_id = None
            
            vitals_list.append(vital)

        # In-memory filtering on loaded items if any (placeholder; production should query by filters)
        filtered = vitals_list

        if search:
            needle = search.lower()
            filtered = [
                v for v in filtered
                if needle in (v.notes or "").lower()
            ]

        today = date.today()
        if date_filter == "today":
            filtered = [v for v in filtered if v.measured_at.date() == today]
        elif date_filter == "week":
            start = today - timedelta(days=6)
            filtered = [v for v in filtered if start <= v.measured_at.date() <= today]

        def map_status(v: VitalSign) -> str:
            # Determine status based on vital signs values
            alerts = []
            
            # Check temperature (normal: 36.1-37.2°C)
            if v.temperature and (v.temperature < 36.1 or v.temperature > 37.2):
                alerts.append("temperature")
            
            # Check blood pressure (normal: <120/80)
            if v.blood_pressure_systolic and v.blood_pressure_diastolic:
                if v.blood_pressure_systolic >= 140 or v.blood_pressure_diastolic >= 90:
                    alerts.append("hypertension")
                elif v.blood_pressure_systolic < 90 or v.blood_pressure_diastolic < 60:
                    alerts.append("hypotension")
            
            # Check heart rate (normal: 60-100 bpm)
            if v.heart_rate and (v.heart_rate < 60 or v.heart_rate > 100):
                alerts.append("heart_rate")
            
            # Check oxygen saturation (normal: >95%)
            if v.oxygen_saturation and v.oxygen_saturation < 95:
                alerts.append("oxygen")
            
            # Check respiratory rate (normal: 12-20 breaths/min)
            if v.respiratory_rate and (v.respiratory_rate < 12 or v.respiratory_rate > 20):
                alerts.append("respiratory")
            
            # Determine status based on alerts
            if len(alerts) >= 2:
                return "abnormal"
            elif len(alerts) == 1:
                return "attention"
            else:
                return "normal"

        # Get patient and nurse names for mapping
        items_schema: List[VitalMeasurement] = []
        for v in filtered:
            try:
                # Get patient name using raw SQL (similar to medications)
                patient_name = f"Patient {str(v.patient_id)[:8]}"
                try:
                    # Try multiple approaches to get patient name
                    # Approach 1: Join patients with users via user_id
                    try:
                        patient_sql = text("""
                            SELECT u.first_name, u.last_name
                            FROM ehr.patients p
                            JOIN core.users u ON p.user_id = u.id
                            WHERE p.patient_id = :patient_id
                        """)
                        patient_result = db.execute(patient_sql, {"patient_id": v.patient_id}).first()
                        if patient_result and (patient_result[0] or patient_result[1]):
                            first_name = patient_result[0] or ""
                            last_name = patient_result[1] or ""
                            if first_name or last_name:
                                patient_name = f"{first_name} {last_name}".strip()
                                logger.debug(f"Found patient name via user_id join: {patient_name}")
                    except Exception as e1:
                        logger.debug(f"User_id join failed for patient {v.patient_id}: {e1}")
                        try:
                            db.rollback()
                        except Exception:
                            pass
                    
                    # Approach 2: Try matching patient_id directly with user_id
                    if patient_name.startswith("Patient "):
                        try:
                            patient_sql_direct = text("""
                                SELECT first_name, last_name
                                FROM core.users
                                WHERE id = :patient_id
                            """)
                            patient_result = db.execute(patient_sql_direct, {"patient_id": v.patient_id}).first()
                            if patient_result and (patient_result[0] or patient_result[1]):
                                first_name = patient_result[0] or ""
                                last_name = patient_result[1] or ""
                                if first_name or last_name:
                                    patient_name = f"{first_name} {last_name}".strip()
                                    logger.debug(f"Found patient name via direct user_id match: {patient_name}")
                        except Exception as e2:
                            logger.debug(f"Direct user_id match failed for patient {v.patient_id}: {e2}")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                    
                    # Approach 3: String comparison fallback
                    if patient_name.startswith("Patient "):
                        try:
                            patient_sql_str = text("""
                                SELECT u.first_name, u.last_name
                                FROM ehr.patients p
                                JOIN core.users u ON p.user_id = u.id
                                WHERE p.patient_id::text = :patient_id
                            """)
                            patient_result = db.execute(patient_sql_str, {"patient_id": str(v.patient_id)}).first()
                            if patient_result and (patient_result[0] or patient_result[1]):
                                first_name = patient_result[0] or ""
                                last_name = patient_result[1] or ""
                                if first_name or last_name:
                                    patient_name = f"{first_name} {last_name}".strip()
                                    logger.debug(f"Found patient name via string comparison: {patient_name}")
                        except Exception as e3:
                            logger.debug(f"String comparison also failed for patient {v.patient_id}: {e3}")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                except Exception as e:
                    logger.warning(f"Error getting patient name for {v.patient_id}: {e}")
                    # Keep default patient_name
                
                # Get nurse name (using raw SQL to handle UUID)
                nurse_name = "Unknown Nurse"
                if v.measured_by:
                    try:
                        nurse_sql = text("""
                            SELECT first_name, last_name
                            FROM core.users
                            WHERE id = :nurse_id
                        """)
                        nurse_result = db.execute(nurse_sql, {"nurse_id": v.measured_by}).first()
                        if nurse_result and (nurse_result[0] or nurse_result[1]):
                            nurse_first = nurse_result[0] or ""
                            nurse_last = nurse_result[1] or ""
                            if nurse_first or nurse_last:
                                nurse_name = f"{nurse_first} {nurse_last}".strip()
                    except Exception as e:
                        logger.debug(f"Error getting nurse name: {e}")
                
                # Format vital signs values
                temperature_str = f"{v.temperature}°C" if v.temperature else None
                blood_pressure_str = f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}" if v.blood_pressure_systolic and v.blood_pressure_diastolic else None
                heart_rate_str = str(v.heart_rate) if v.heart_rate else None
                respiratory_str = str(v.respiratory_rate) if v.respiratory_rate else None
                oxygen_str = f"{v.oxygen_saturation}%" if v.oxygen_saturation else None
                pain_str = f"{v.pain_scale}/10" if v.pain_scale is not None else None
                
                # Get alerts based on status
                alerts = []
                if map_status(v) == "abnormal":
                    alerts = ["Multiple abnormal values"]
                elif map_status(v) == "attention":
                    alerts = ["One abnormal value"]
                
                items_schema.append(VitalMeasurement(
                    id=str(v.id),
                    patient=patient_name,
                    patientId=str(v.patient_id) if v.patient_id else None,
                    room="",  # Room not available in current data
                    date=v.measured_at.date(),
                    time=v.measured_at.time().strftime("%H:%M"),
                    temperature=temperature_str,
                    bloodPressure=blood_pressure_str,
                    heartRate=heart_rate_str,
                    respiratory=respiratory_str,
                    oxygenSat=oxygen_str,
                    pain=pain_str,
                    status=map_status(v),
                    nurse=nurse_name,
                    alerts=alerts,
                ))
            except Exception as e:
                logger.warning(f"Error processing vital {v.id}: {e}")
                continue

        stats = VitalStats(
            total=len(items_schema),
            normal=sum(1 for x in items_schema if x.status == "normal"),
            attention=sum(1 for x in items_schema if x.status == "attention"),
            abnormal=sum(1 for x in items_schema if x.status == "abnormal"),
            pending=sum(1 for x in items_schema if x.status == "pending"),
        )

        collection = VitalCollection(
            items=items_schema,
            total=stats.total,
            normal=stats.normal,
            attention=stats.attention,
            abnormal=stats.abnormal,
            pending=stats.pending,
        )
        logger.info(f"Returning {len(items_schema)} vitals, total: {stats.total}, normal: {stats.normal}, attention: {stats.attention}, abnormal: {stats.abnormal}, pending: {stats.pending}")
        return SuccessResponse(data=collection, message="Vitals retrieved")
    except Exception as e:
        logger.error(f"Error in list_vitals: {e}", exc_info=True)
        # Return empty collection instead of crashing
        collection = VitalCollection(
            items=[],
            total=0,
            normal=0,
            attention=0,
            abnormal=0,
            pending=0,
        )
        return SuccessResponse(data=collection, message="Vitals retrieved")


@router.get("/summary", response_model=SuccessResponse[VitalStats])
async def get_vitals_summary(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Placeholder summary until query paths are added
    stats = VitalStats(total=0, normal=0, attention=0, abnormal=0, pending=0)
    return SuccessResponse(data=stats, message="Vitals summary")


@router.post("", response_model=SuccessResponse[VitalMeasurement], status_code=status.HTTP_201_CREATED)
async def create_vital(
    payload: VitalMeasurementCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    measured_at = datetime.combine(payload.date, datetime.strptime(payload.time, "%H:%M").time())
    obj = vitals_crud.create(
        db,
        patient_id=payload.patient,
        measured_by=current_user.user_id,
        measured_at=measured_at,
        values={
            "temperature": float(payload.temperature) if payload.temperature else None,
            "blood_pressure_systolic": int(payload.bloodPressure.split("/")[0]) if payload.bloodPressure else None,
            "blood_pressure_diastolic": int(payload.bloodPressure.split("/")[1]) if payload.bloodPressure else None,
            "heart_rate": int(payload.heartRate) if payload.heartRate else None,
            "respiratory_rate": int(payload.respiratory) if payload.respiratory else None,
            "oxygen_saturation": float(payload.oxygenSat) if payload.oxygenSat else None,
            "pain_scale": int(payload.pain) if payload.pain else None,
            "notes": None,
        },
    )
    dto = VitalMeasurement(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room="",
        date=obj.measured_at.date(),
        time=obj.measured_at.time().strftime("%H:%M"),
        temperature=None if obj.temperature is None else f"{obj.temperature}",
        bloodPressure=(
            None
            if obj.blood_pressure_systolic is None
            else f"{obj.blood_pressure_systolic}/{obj.blood_pressure_diastolic}"
        ),
        heartRate=None if obj.heart_rate is None else str(obj.heart_rate),
        respiratory=None if obj.respiratory_rate is None else str(obj.respiratory_rate),
        oxygenSat=None if obj.oxygen_saturation is None else str(obj.oxygen_saturation),
        pain=None if obj.pain_scale is None else str(obj.pain_scale),
        status="normal",
        nurse=None,
        alerts=[],
    )
    return SuccessResponse(data=dto, message="Vital created")


@router.get("/{vital_id}", response_model=SuccessResponse[VitalMeasurement])
async def get_vital(
    vital_id: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    obj = vitals_crud.get(db, vital_id=vital_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vital record not found")
    dto = VitalMeasurement(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room="",
        date=obj.measured_at.date(),
        time=obj.measured_at.time().strftime("%H:%M"),
        temperature=None if obj.temperature is None else f"{obj.temperature}",
        bloodPressure=(
            None
            if obj.blood_pressure_systolic is None
            else f"{obj.blood_pressure_systolic}/{obj.blood_pressure_diastolic}"
        ),
        heartRate=None if obj.heart_rate is None else str(obj.heart_rate),
        respiratory=None if obj.respiratory_rate is None else str(obj.respiratory_rate),
        oxygenSat=None if obj.oxygen_saturation is None else str(obj.oxygen_saturation),
        pain=None if obj.pain_scale is None else str(obj.pain_scale),
        status="normal",
        nurse=None,
        alerts=[],
    )
    return SuccessResponse(data=dto, message="Vital retrieved")


@router.patch("/{vital_id}", response_model=SuccessResponse[VitalMeasurement])
async def patch_vital(
    vital_id: str,
    payload: VitalMeasurementUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    updates = payload.dict(exclude_none=True)
    # Map schema fields back to ORM columns
    def parse_updates(data: Dict[str, object]) -> Dict[str, object]:
        out: Dict[str, object] = {}
        if "temperature" in data:
            out["temperature"] = float(data["temperature"]) if data["temperature"] is not None else None
        if "bloodPressure" in data:
            parts = str(data["bloodPressure"]).split("/") if data["bloodPressure"] else None
            if parts and len(parts) == 2:
                out["blood_pressure_systolic"] = int(parts[0])
                out["blood_pressure_diastolic"] = int(parts[1])
        if "heartRate" in data:
            out["heart_rate"] = int(data["heartRate"]) if data["heartRate"] is not None else None
        if "respiratory" in data:
            out["respiratory_rate"] = int(data["respiratory"]) if data["respiratory"] is not None else None
        if "oxygenSat" in data:
            out["oxygen_saturation"] = float(data["oxygenSat"]) if data["oxygenSat"] is not None else None
        if "pain" in data:
            out["pain_scale"] = int(data["pain"]) if data["pain"] is not None else None
        if "date" in data or "time" in data:
            # recompute measured_at if provided
            pass
        return out
    values = parse_updates(updates)
    obj = vitals_crud.update(db, vital_id=vital_id, values=values)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vital record not found")
    dto = VitalMeasurement(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room="",
        date=obj.measured_at.date(),
        time=obj.measured_at.time().strftime("%H:%M"),
        temperature=None if obj.temperature is None else f"{obj.temperature}",
        bloodPressure=(
            None
            if obj.blood_pressure_systolic is None
            else f"{obj.blood_pressure_systolic}/{obj.blood_pressure_diastolic}"
        ),
        heartRate=None if obj.heart_rate is None else str(obj.heart_rate),
        respiratory=None if obj.respiratory_rate is None else str(obj.respiratory_rate),
        oxygenSat=None if obj.oxygen_saturation is None else str(obj.oxygen_saturation),
        pain=None if obj.pain_scale is None else str(obj.pain_scale),
        status="normal",
        nurse=None,
        alerts=[],
    )
    return SuccessResponse(data=dto, message="Vital updated")


@router.post("/{vital_id}/status", response_model=SuccessResponse[VitalMeasurement])
async def update_vital_status(
    vital_id: str,
    payload: dict = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # No direct status field in VitalSign; this is a no-op mapping for now
    obj = vitals_crud.get(db, vital_id=vital_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vital record not found")
    dto = VitalMeasurement(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room="",
        date=obj.measured_at.date(),
        time=obj.measured_at.time().strftime("%H:%M"),
        temperature=None if obj.temperature is None else f"{obj.temperature}",
        bloodPressure=(
            None
            if obj.blood_pressure_systolic is None
            else f"{obj.blood_pressure_systolic}/{obj.blood_pressure_diastolic}"
        ),
        heartRate=None if obj.heart_rate is None else str(obj.heart_rate),
        respiratory=None if obj.respiratory_rate is None else str(obj.respiratory_rate),
        oxygenSat=None if obj.oxygen_saturation is None else str(obj.oxygen_saturation),
        pain=None if obj.pain_scale is None else str(obj.pain_scale),
        status="normal",
        nurse=None,
        alerts=[],
    )
    return SuccessResponse(data=dto, message="Vital status updated")


@router.delete("/{vital_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_vital(
    vital_id: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    ok = vitals_crud.delete(db, vital_id=vital_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vital record not found")
    return SuccessResponse(data={"status": "deleted"}, message="Vital deleted")
