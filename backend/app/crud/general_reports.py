"""CRUD operations for General Visit Reports (#001)."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from datetime import datetime, timezone
import uuid
from uuid import UUID

from app.crud.base import CRUDBase
from app.common.models.doctor import GeneralReport
from app.common.schemas.general_reports import (
    GeneralReportData, GeneralReportDB, GeneralReportResponse, GeneralReportSummary,
    convert_report_data_to_db, convert_db_to_report_data, ReportStatus
)


class CRUDGeneralReport(CRUDBase[GeneralReport, GeneralReportDB, GeneralReportDB]):
    """CRUD operations for General Visit Reports."""
    
    def create_report(
        self,
        db: Session,
        *,
        patient_id: str,
        doctor_id: str,
        clinic_id: str,
        report_data: GeneralReportData,
        encounter_id: Optional[str] = None,
        fhir_document_reference_id: Optional[str] = None,
        fhir_binary_id: Optional[str] = None
    ) -> GeneralReportResponse:
        """Create a new general visit report."""
        # Convert structured data to database fields
        db_fields = convert_report_data_to_db(report_data)
        
        # Convert string UUIDs to UUID objects for PostgreSQL compatibility
        # Create database record with proper UUID types
        db_report = GeneralReport(
            id=uuid.uuid4(),  # UUID object, not string
            patient_id=UUID(patient_id) if isinstance(patient_id, str) else patient_id,
            doctor_id=UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id,
            clinic_id=UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id,
            encounter_id=UUID(encounter_id) if encounter_id and isinstance(encounter_id, str) else encounter_id,
            report_code="#001",
            report_type="general_visit",
            status="draft",
            fhir_document_reference_id=fhir_document_reference_id,
            fhir_binary_id=fhir_binary_id,
            **db_fields
        )
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        # Convert back to response format
        return self._convert_to_response(db_report)
    
    def get_report_by_id(
        self,
        db: Session,
        *,
        report_id: str,
        doctor_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        clinic_id: Optional[str] = None
    ) -> Optional[GeneralReportResponse]:
        """Get a general visit report by ID with proper access control."""
        # Convert string UUIDs to UUID objects for database query
        report_uuid = UUID(report_id) if isinstance(report_id, str) else report_id
        query = db.query(GeneralReport).filter(GeneralReport.id == report_uuid)
        
        # Apply access control filters - convert to UUID if string
        if doctor_id:
            doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
            query = query.filter(GeneralReport.doctor_id == doctor_uuid)
        
        if patient_id:
            patient_uuid = UUID(patient_id) if isinstance(patient_id, str) else patient_id
            query = query.filter(GeneralReport.patient_id == patient_uuid)
        
        if clinic_id:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.filter(GeneralReport.clinic_id == clinic_uuid)
        
        db_report = query.first()
        if not db_report:
            return None
        
        return self._convert_to_response(db_report)
    
    def update_report(
        self,
        db: Session,
        *,
        report_id: str,
        report_data: GeneralReportData,
        status: Optional[ReportStatus] = None,
        doctor_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        fhir_document_reference_id: Optional[str] = None,
        fhir_binary_id: Optional[str] = None
    ) -> Optional[GeneralReportResponse]:
        """Update a general visit report with proper access control."""
        # Convert string UUIDs to UUID objects for database query
        report_uuid = UUID(report_id) if isinstance(report_id, str) else report_id
        query = db.query(GeneralReport).filter(GeneralReport.id == report_uuid)
        
        # Apply access control filters - convert to UUID if string
        if doctor_id:
            doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
            query = query.filter(GeneralReport.doctor_id == doctor_uuid)
        
        if patient_id:
            patient_uuid = UUID(patient_id) if isinstance(patient_id, str) else patient_id
            query = query.filter(GeneralReport.patient_id == patient_uuid)
        
        if clinic_id:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.filter(GeneralReport.clinic_id == clinic_uuid)
        
        db_report = query.first()
        if not db_report:
            return None
        
        # Convert structured data to database fields
        db_fields = convert_report_data_to_db(report_data)
        
        # Update fields
        for field, value in db_fields.items():
            setattr(db_report, field, value)
        
        if status:
            db_report.status = status.value
        
        if fhir_document_reference_id:
            db_report.fhir_document_reference_id = fhir_document_reference_id
        
        if fhir_binary_id:
            db_report.fhir_binary_id = fhir_binary_id
        
        db_report.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(db_report)
        
        return self._convert_to_response(db_report)
    
    def delete_report(
        self,
        db: Session,
        *,
        report_id: str,
        doctor_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        clinic_id: Optional[str] = None
    ) -> bool:
        """Delete a general visit report with proper access control."""
        # Convert string UUIDs to UUID objects for database query
        report_uuid = UUID(report_id) if isinstance(report_id, str) else report_id
        query = db.query(GeneralReport).filter(GeneralReport.id == report_uuid)
        
        # Apply access control filters - convert to UUID if string
        if doctor_id:
            doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
            query = query.filter(GeneralReport.doctor_id == doctor_uuid)
        
        if patient_id:
            patient_uuid = UUID(patient_id) if isinstance(patient_id, str) else patient_id
            query = query.filter(GeneralReport.patient_id == patient_uuid)
        
        if clinic_id:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.filter(GeneralReport.clinic_id == clinic_uuid)
        
        db_report = query.first()
        if not db_report:
            return False
        
        db.delete(db_report)
        db.commit()
        return True
    
    def list_reports(
        self,
        db: Session,
        *,
        doctor_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        status: Optional[ReportStatus] = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_direction: str = "desc"
    ) -> List[GeneralReportSummary]:
        """List general visit reports with filtering and pagination."""
        query = db.query(GeneralReport)
        
        # Apply filters - convert string UUIDs to UUID objects
        if doctor_id:
            doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
            query = query.filter(GeneralReport.doctor_id == doctor_uuid)
        
        if patient_id:
            patient_uuid = UUID(patient_id) if isinstance(patient_id, str) else patient_id
            query = query.filter(GeneralReport.patient_id == patient_uuid)
        
        if clinic_id:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.filter(GeneralReport.clinic_id == clinic_uuid)
        
        if status:
            query = query.filter(GeneralReport.status == status.value)
        
        # Apply ordering
        order_column = getattr(GeneralReport, order_by, GeneralReport.created_at)
        if order_direction.lower() == "desc":
            query = query.order_by(desc(order_column))
        else:
            query = query.order_by(asc(order_column))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        db_reports = query.all()
        
        # Convert to summary format
        summaries = []
        for db_report in db_reports:
            summaries.append(self._convert_to_summary(db_report))
        
        return summaries
    
    def count_reports(
        self,
        db: Session,
        *,
        doctor_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        status: Optional[ReportStatus] = None
    ) -> int:
        """Count general visit reports with filtering."""
        query = db.query(GeneralReport)
        
        # Apply filters - convert string UUIDs to UUID objects
        if doctor_id:
            doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
            query = query.filter(GeneralReport.doctor_id == doctor_uuid)
        
        if patient_id:
            patient_uuid = UUID(patient_id) if isinstance(patient_id, str) else patient_id
            query = query.filter(GeneralReport.patient_id == patient_uuid)
        
        if clinic_id:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.filter(GeneralReport.clinic_id == clinic_uuid)
        
        if status:
            query = query.filter(GeneralReport.status == status.value)
        
        return query.count()
    
    def get_reports_by_patient(
        self,
        db: Session,
        *,
        patient_id: str,
        doctor_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[GeneralReportSummary]:
        """Get all reports for a specific patient."""
        return self.list_reports(
            db=db,
            patient_id=patient_id,
            doctor_id=doctor_id,
            skip=skip,
            limit=limit
        )
    
    def get_reports_by_doctor(
        self,
        db: Session,
        *,
        doctor_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[GeneralReportSummary]:
        """Get all reports created by a specific doctor."""
        return self.list_reports(
            db=db,
            doctor_id=doctor_id,
            skip=skip,
            limit=limit
        )
    
    def get_reports_by_clinic(
        self,
        db: Session,
        *,
        clinic_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[GeneralReportSummary]:
        """Get all reports for a specific clinic."""
        return self.list_reports(
            db=db,
            clinic_id=clinic_id,
            skip=skip,
            limit=limit
        )
    
    def get_reports_by_status(
        self,
        db: Session,
        *,
        status: ReportStatus,
        doctor_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[GeneralReportSummary]:
        """Get all reports with a specific status."""
        return self.list_reports(
            db=db,
            status=status,
            doctor_id=doctor_id,
            skip=skip,
            limit=limit
        )
    
    def get_recent_reports(
        self,
        db: Session,
        *,
        doctor_id: Optional[str] = None,
        days: int = 7,
        limit: int = 50
    ) -> List[GeneralReportSummary]:
        """Get recent reports within specified days."""
        from datetime import timedelta
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = db.query(GeneralReport).filter(GeneralReport.created_at >= cutoff_date)
        
        if doctor_id:
            doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
            query = query.filter(GeneralReport.doctor_id == doctor_uuid)
        
        query = query.order_by(desc(GeneralReport.created_at)).limit(limit)
        
        db_reports = query.all()
        
        summaries = []
        for db_report in db_reports:
            summaries.append(self._convert_to_summary(db_report))
        
        return summaries
    
    def get_report_statistics(
        self,
        db: Session,
        *,
        doctor_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get report statistics."""
        from datetime import timedelta
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = db.query(GeneralReport).filter(GeneralReport.created_at >= cutoff_date)
        
        if doctor_id:
            doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
            query = query.filter(GeneralReport.doctor_id == doctor_uuid)
        
        if clinic_id:
            query = query.filter(GeneralReport.clinic_id == clinic_id)
        
        # Count by status
        total_reports = query.count()
        draft_reports = query.filter(GeneralReport.status == "draft").count()
        final_reports = query.filter(GeneralReport.status == "final").count()
        signed_reports = query.filter(GeneralReport.status == "signed").count()
        
        # Count by day (last 7 days)
        daily_counts = {}
        for i in range(7):
            day_start = datetime.now(timezone.utc) - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            day_count = query.filter(
                GeneralReport.created_at >= day_start,
                GeneralReport.created_at < day_end
            ).count()
            
            daily_counts[day_start.strftime("%Y-%m-%d")] = day_count
        
        return {
            "total_reports": total_reports,
            "draft_reports": draft_reports,
            "final_reports": final_reports,
            "signed_reports": signed_reports,
            "daily_counts": daily_counts,
            "period_days": days
        }
    
    def _convert_to_response(self, db_report: GeneralReport) -> GeneralReportResponse:
        """Convert database model to response format."""
        # Convert database fields back to structured data
        report_data = convert_db_to_report_data(GeneralReportDB.from_orm(db_report))
        
        return GeneralReportResponse(
            id=str(db_report.id),
            patient_id=str(db_report.patient_id),
            doctor_id=str(db_report.doctor_id),
            clinic_id=str(db_report.clinic_id),
            encounter_id=str(db_report.encounter_id) if db_report.encounter_id else None,
            report_code=db_report.report_code,
            report_type=db_report.report_type,
            status=ReportStatus(db_report.status),
            report_data=report_data,
            fhir_document_reference_id=db_report.fhir_document_reference_id,
            fhir_binary_id=db_report.fhir_binary_id,
            created_at=db_report.created_at,
            updated_at=db_report.updated_at,
            signed_at=db_report.signed_at
        )
    
    def _convert_to_summary(self, db_report: GeneralReport) -> GeneralReportSummary:
        """Convert database model to summary format."""
        # Get patient and doctor names (would need to join with User tables)
        # For now, using IDs as names
        patient_name = f"Patient {str(db_report.patient_id)[:8]}"
        doctor_name = f"Doctor {str(db_report.doctor_id)[:8]}"
        
        return GeneralReportSummary(
            id=str(db_report.id),
            patient_id=str(db_report.patient_id),
            patient_name=patient_name,
            doctor_id=str(db_report.doctor_id),
            doctor_name=doctor_name,
            clinic_id=str(db_report.clinic_id),
            chief_complaint=db_report.chief_complaint,
            status=ReportStatus(db_report.status),
            created_at=db_report.created_at,
            fhir_document_reference_id=db_report.fhir_document_reference_id
        )


# Create instance
general_report = CRUDGeneralReport(GeneralReport)
