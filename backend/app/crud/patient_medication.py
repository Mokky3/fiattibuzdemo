# app/crud/patient_medication.py
"""CRUD operations for PatientMedication model."""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, text
from datetime import datetime, date, timezone
import uuid
from uuid import UUID

from app.crud.base import CRUDBase
from app.common.models.patient import PatientMedication


class CRUDPatientMedication(CRUDBase[PatientMedication, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for PatientMedication model."""
    
    def create_medication(
        self,
        db: Session,
        *,
        patient_id: str,
        medication_name: str,
        dosage: str,
        frequency: str,
        route: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        prescription_id: Optional[str] = None,
        prescribed_by: str,
        prescribed_date: Optional[date] = None,
        instructions: Optional[str] = None,
        notes: Optional[str] = None,
        is_active: bool = True,
        **kwargs
    ) -> PatientMedication:
        """Create a new patient medication record."""
        # Convert string UUIDs to string format (model uses String(36), but DB uses UUID)
        # The model uses String(36), but the database column is UUID
        # We'll use raw SQL to insert with proper UUID casting
        patient_id_str = str(patient_id) if not isinstance(patient_id, str) else patient_id
        prescribed_by_str = str(prescribed_by) if not isinstance(prescribed_by, str) else prescribed_by
        
        prescription_id_str = None
        if prescription_id:
            prescription_id_str = str(prescription_id) if not isinstance(prescription_id, str) else prescription_id
        
        # Use current date if not provided
        if not start_date:
            start_date = date.today()
        if not prescribed_date:
            prescribed_date = date.today()
        
        # Insert using raw SQL with proper UUID casting
        # SQLAlchemy text() uses :param syntax, and we need to cast to UUID in PostgreSQL
        # Use CAST() function instead of ::uuid syntax to avoid parameter parsing issues
        insert_sql = text("""
            INSERT INTO ops.patient_medications 
            (id, patient_id, prescription_id, medication_name, dosage, frequency, route, 
             start_date, end_date, is_active, is_discontinued, prescribed_by, prescribed_date, 
             instructions, notes)
            VALUES 
            (gen_random_uuid(), CAST(:patient_id AS uuid), CAST(:prescription_id AS uuid), :medication_name, 
             :dosage, :frequency, :route, :start_date, :end_date, :is_active, false, 
             CAST(:prescribed_by AS uuid), :prescribed_date, :instructions, :notes)
            RETURNING id, patient_id, prescription_id, medication_name, dosage, frequency, route,
                      start_date, end_date, is_active, is_discontinued, prescribed_by, 
                      prescribed_date, instructions, notes
        """)
        
        # Build parameters dict - pass string UUIDs, PostgreSQL will cast them
        params = {
            'patient_id': patient_id_str,
            'prescription_id': prescription_id_str if prescription_id_str else None,
            'medication_name': medication_name,
            'dosage': dosage,
            'frequency': frequency,
            'route': route,
            'start_date': start_date,
            'end_date': end_date,
            'is_active': is_active,
            'prescribed_by': prescribed_by_str,
            'prescribed_date': prescribed_date,
            'instructions': instructions,
            'notes': notes
        }
        
        result = db.execute(insert_sql, params)
        
        db.commit()
        row = result.fetchone()
        
        # Create a PatientMedication object from the result
        medication = PatientMedication(
            id=str(row[0]),
            patient_id=str(row[1]),
            prescription_id=str(row[2]) if row[2] else None,
            medication_name=row[3],
            dosage=row[4],
            frequency=row[5],
            route=row[6],
            start_date=row[7],
            end_date=row[8],
            is_active=row[9],
            is_discontinued=row[10],
            prescribed_by=str(row[11]),
            prescribed_date=row[12],
            instructions=row[13],
            notes=row[14]
        )
        
        return medication
    
    def get_patient_medications(
        self,
        db: Session,
        *,
        patient_id: str,
        active_only: bool = True,
        include_discontinued: bool = False
    ) -> List[PatientMedication]:
        """Get medications for a patient."""
        # Convert patient_id to UUID for proper database comparison
        # The database column is UUID, but the model uses String(36)
        try:
            patient_uuid = UUID(patient_id) if isinstance(patient_id, str) else patient_id
        except (ValueError, TypeError):
            # If conversion fails, try to use as string with cast
            patient_uuid = patient_id
        
        # The database column is UUID, but the model uses String(36)
        # We need to cast the patient_id column to TEXT for comparison, or use text() for direct SQL
        # Use raw SQL with proper type casting to avoid model type mismatch
        # Cast UUID column to TEXT for comparison with string parameter
        # Note: patient_id_str is already a string, so we cast both sides to TEXT
        patient_id_str = str(patient_uuid)
        query = db.query(PatientMedication).filter(
            text("CAST(ops.patient_medications.patient_id AS TEXT) = CAST(:patient_id AS TEXT)")
        ).params(patient_id=patient_id_str)
        
        if active_only:
            query = query.filter(
                PatientMedication.is_active == True,
                PatientMedication.is_discontinued == False
            )
        
        if not include_discontinued:
            query = query.filter(
                PatientMedication.is_discontinued == False
            )
        
        medications = query.order_by(desc(PatientMedication.prescribed_date)).all()
        return medications
    
    def update_medication_status(
        self,
        db: Session,
        *,
        medication_id: str,
        is_active: Optional[bool] = None,
        is_discontinued: Optional[bool] = None,
        discontinued_date: Optional[date] = None,
        discontinued_reason: Optional[str] = None
    ) -> Optional[PatientMedication]:
        """Update medication status."""
        medication = self.get(db, id=medication_id)
        if not medication:
            return None
        
        if is_active is not None:
            medication.is_active = is_active
        if is_discontinued is not None:
            medication.is_discontinued = is_discontinued
        if discontinued_date is not None:
            medication.discontinued_date = discontinued_date
        if discontinued_reason is not None:
            medication.discontinued_reason = discontinued_reason
        
        medication.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(medication)
        return medication
    
    def discontinue_medication(
        self,
        db: Session,
        *,
        medication_id: str,
        discontinued_date: Optional[date] = None,
        reason: Optional[str] = None
    ) -> Optional[PatientMedication]:
        """Discontinue a medication."""
        if not discontinued_date:
            discontinued_date = date.today()
        
        return self.update_medication_status(
            db,
            medication_id=medication_id,
            is_active=False,
            is_discontinued=True,
            discontinued_date=discontinued_date,
            discontinued_reason=reason
        )
    
    def get_by_prescription(
        self,
        db: Session,
        *,
        prescription_id: str
    ) -> List[PatientMedication]:
        """Get medications by prescription ID."""
        # Convert prescription_id to string for comparison
        prescription_id_str = str(prescription_id) if not isinstance(prescription_id, str) else prescription_id
        
        # The database column is UUID, but the model uses String(36)
        # Use raw SQL with proper type casting
        from sqlalchemy import text
        return db.query(PatientMedication).filter(
            text("CAST(ops.patient_medications.prescription_id AS TEXT) = CAST(:prescription_id AS TEXT)")
        ).params(prescription_id=prescription_id_str).all()


# Create instance
patient_medication = CRUDPatientMedication(PatientMedication)

