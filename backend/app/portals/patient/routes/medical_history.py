"""Patient medical history router."""
from datetime import datetime, date
from typing import List, Optional
from uuid import uuid4
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from .auth_enhanced import get_current_patient, PatientUser
from app.portals.patient.schemas.medical_history import (
    MedicalHistoryOut,
    MedicalHistoryUpdate,
    MedicalHistorySimpleUpdate,
    AllergyItem,
    ChronicConditionItem,
)
from app.db.session import get_db
from app.common.models.patient import MedicalHistory, Patient
from app.common.schemas.responses_enhanced import (
    SuccessResponse,
    ProblemDetail,
    ErrorType,
    create_problem_detail,
)
from app.common.security.middleware import audit_pii_access

router = APIRouter(tags=["Patient · Medical History"])
logger = logging.getLogger(__name__)


@router.get("", response_model=SuccessResponse[MedicalHistoryOut])
@audit_pii_access("read", "patient", "medical_history")
async def get_medical_history(
    request: Request,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Get patient's medical history (allergies and chronic conditions)."""
    try:
        patient_id = str(current_patient.patient_id)
        
        # Get allergies from medical_history table
        allergies = []
        try:
            allergies_query = text("""
                SELECT condition, diagnosed_date, status, severity, notes, created_at, updated_at
                FROM ehr.medical_history
                WHERE patient_id = :patient_id
                AND condition ILIKE '%allergy%'
                ORDER BY diagnosed_date DESC NULLS LAST, created_at DESC
            """)
            allergies_result = db.execute(allergies_query, {"patient_id": patient_id}).all()
            
            for row in allergies_result:
                # Extract allergy name from condition (remove "allergy" suffix if present)
                condition_name = row[0] if row[0] else ""
                allergy_name = condition_name.replace(" allergy", "").replace("Allergy", "").strip()
                
                allergies.append(AllergyItem(
                    name=allergy_name,
                    severity=row[3] if row[3] else None,
                    reaction=row[4] if row[4] else None,  # notes field used for reaction
                    onset_date=row[1] if row[1] else None,
                    status=row[2] if row[2] else "active"
                ))
        except Exception as e:
            logger.warning(f"Error querying allergies from medical_history: {e}")
            # Fallback: try to get from Patient model if it has allergies column
            try:
                patient = db.query(Patient).filter(Patient.patient_id == current_patient.patient_id).first()
                if patient and hasattr(patient, 'allergies') and patient.allergies:
                    if isinstance(patient.allergies, list):
                        for allergy_name in patient.allergies:
                            allergies.append(AllergyItem(name=allergy_name, status="active"))
                    elif isinstance(patient.allergies, str):
                        for allergy_name in patient.allergies.split(','):
                            if allergy_name.strip():
                                allergies.append(AllergyItem(name=allergy_name.strip(), status="active"))
            except Exception as e2:
                logger.warning(f"Error getting allergies from Patient model: {e2}")
        
        # Get chronic conditions from medical_history table
        chronic_conditions = []
        try:
            conditions_query = text("""
                SELECT condition, icd10_code, diagnosed_date, status, severity, notes, created_at, updated_at
                FROM ehr.medical_history
                WHERE patient_id = :patient_id
                AND condition NOT ILIKE '%allergy%'
                ORDER BY diagnosed_date DESC NULLS LAST, created_at DESC
            """)
            conditions_result = db.execute(conditions_query, {"patient_id": patient_id}).all()
            
            for row in conditions_result:
                chronic_conditions.append(ChronicConditionItem(
                    condition=row[0] if row[0] else "",
                    icd10_code=row[1] if row[1] else None,
                    diagnosed_date=row[2] if row[2] else None,
                    status=row[3] if row[3] else "active",
                    severity=row[4] if row[4] else None,
                    notes=row[5] if row[5] else None
                ))
        except Exception as e:
            logger.warning(f"Error querying chronic conditions from medical_history: {e}")
            # Fallback: try to get from Patient model if it has chronic_conditions column
            try:
                patient = db.query(Patient).filter(Patient.patient_id == current_patient.patient_id).first()
                if patient and hasattr(patient, 'chronic_conditions') and patient.chronic_conditions:
                    if isinstance(patient.chronic_conditions, list):
                        for condition_name in patient.chronic_conditions:
                            chronic_conditions.append(ChronicConditionItem(
                                condition=condition_name,
                                status="active"
                            ))
                    elif isinstance(patient.chronic_conditions, str):
                        for condition_name in patient.chronic_conditions.split(','):
                            if condition_name.strip():
                                chronic_conditions.append(ChronicConditionItem(
                                    condition=condition_name.strip(),
                                    status="active"
                                ))
            except Exception as e2:
                logger.warning(f"Error getting chronic conditions from Patient model: {e2}")
        
        # Get last updated timestamp
        last_updated = None
        try:
            last_update_query = text("""
                SELECT MAX(updated_at) as last_updated
                FROM ehr.medical_history
                WHERE patient_id = :patient_id
            """)
            last_update_result = db.execute(last_update_query, {"patient_id": patient_id}).first()
            if last_update_result and last_update_result[0]:
                last_updated = last_update_result[0]
        except Exception as e:
            logger.warning(f"Error getting last updated timestamp: {e}")
        
        return SuccessResponse(
            data=MedicalHistoryOut(
                allergies=allergies,
                chronic_conditions=chronic_conditions,
                last_updated=last_updated
            ),
            message="Medical history retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error retrieving medical history: {e}", exc_info=True)
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Medical History Retrieval Failed",
            detail=f"Failed to retrieve medical history: {str(e)}",
            status=500
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.patch("", response_model=SuccessResponse[dict])
@audit_pii_access("update", "patient", "medical_history")
async def update_medical_history(
    request: Request,
    payload: MedicalHistorySimpleUpdate,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Update patient's medical history (allergies and chronic conditions)."""
    try:
        patient_id = str(current_patient.patient_id)
        user_id = str(current_patient.id)
        mutated = 0
        
        # Handle allergies
        if payload.allergies is not None:
            try:
                # Delete existing allergy records
                delete_allergies_query = text("""
                    DELETE FROM ehr.medical_history
                    WHERE patient_id = :patient_id
                    AND condition ILIKE '%allergy%'
                """)
                db.execute(delete_allergies_query, {"patient_id": patient_id})
                
                # Insert new allergy records
                for allergy_name in payload.allergies:
                    if allergy_name and allergy_name.strip():
                        allergy_id = str(uuid4())
                        insert_allergy_query = text("""
                            INSERT INTO ehr.medical_history 
                            (id, patient_id, condition, status, recorded_by, created_at, updated_at)
                            VALUES (:id, :patient_id, :condition, :status, :recorded_by, :created_at, :updated_at)
                        """)
                        db.execute(insert_allergy_query, {
                            "id": allergy_id,
                            "patient_id": patient_id,
                            "condition": f"{allergy_name.strip()} allergy",
                            "status": "active",
                            "recorded_by": user_id,
                            "created_at": datetime.now(),
                            "updated_at": datetime.now()
                        })
                        mutated += 1
                
                db.commit()
                logger.info(f"Updated {mutated} allergies for patient {patient_id}")
            except Exception as e:
                db.rollback()
                logger.error(f"Error updating allergies: {e}", exc_info=True)
                raise
        
        # Handle chronic conditions
        if payload.chronic_conditions is not None:
            try:
                # Delete existing chronic condition records (excluding allergies)
                delete_conditions_query = text("""
                    DELETE FROM ehr.medical_history
                    WHERE patient_id = :patient_id
                    AND condition NOT ILIKE '%allergy%'
                """)
                db.execute(delete_conditions_query, {"patient_id": patient_id})
                
                # Insert new chronic condition records
                for condition_name in payload.chronic_conditions:
                    if condition_name and condition_name.strip():
                        condition_id = str(uuid4())
                        insert_condition_query = text("""
                            INSERT INTO ehr.medical_history 
                            (id, patient_id, condition, status, recorded_by, created_at, updated_at)
                            VALUES (:id, :patient_id, :condition, :status, :recorded_by, :created_at, :updated_at)
                        """)
                        db.execute(insert_condition_query, {
                            "id": condition_id,
                            "patient_id": patient_id,
                            "condition": condition_name.strip(),
                            "status": "active",
                            "recorded_by": user_id,
                            "created_at": datetime.now(),
                            "updated_at": datetime.now()
                        })
                        mutated += 1
                
                db.commit()
                logger.info(f"Updated {mutated} chronic conditions for patient {patient_id}")
            except Exception as e:
                db.rollback()
                logger.error(f"Error updating chronic conditions: {e}", exc_info=True)
                raise
        
        return SuccessResponse(
            data={"status": "updated", "mutated": mutated},
            message="Medical history updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating medical history: {e}", exc_info=True)
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Medical History Update Failed",
            detail=f"Failed to update medical history: {str(e)}",
            status=500
        )
        raise HTTPException(status_code=500, detail=problem.dict())

