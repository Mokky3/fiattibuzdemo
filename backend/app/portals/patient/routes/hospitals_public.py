"""Patient-facing hospitals endpoints (read-only).

Provides simplified hospital list and related departments/doctors for display in the patient portal.
"""
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast, String as SQLString, Text

from app.db.session import get_db
from app.crud.hospital import hospital as hospital_crud
from app.common.auth.auth_service import (
    AuthenticatedUser, require_patient_access
)
from app.common.schemas.responses_enhanced import (
    SuccessResponse, ProblemDetail, ErrorType, create_problem_detail
)
from app.common.security.middleware import audit_pii_access
from app.common.models.hospital import Hospital, HospitalDepartment
from app.common.models.doctor import Doctor, doctor_hospitals, doctor_departments
from app.common.models.user import User


router = APIRouter(tags=["Patient · Hospitals"])


class HospitalCard(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = None
    type: Optional[str] = None
    established: Optional[str] = None
    beds: Optional[str] = None
    departments: Optional[int] = None
    doctors: Optional[int] = None


class DepartmentDTO(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    doctors: Optional[int] = None


class DoctorDTO(BaseModel):
    id: str
    full_name: str
    specialty: Optional[str] = None
    rating: Optional[float] = None


def _format_address(h) -> str:
    """Format hospital address from available fields."""
    if hasattr(h, "address") and h.address:
        return h.address
    parts = [
        getattr(h, "address_line1", None),
        getattr(h, "city", None),
        getattr(h, "state", None),
    ]
    address = ", ".join([p for p in parts if p])
    return address if address else "Address not available"


@router.get("/hospitals", response_model=SuccessResponse[List[HospitalCard]])
@audit_pii_access("read", "hospital", "hospitals_list")
async def list_hospitals(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name or city"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    _: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    try:
        # Query hospitals with eager loading for counts
        query = db.query(Hospital).filter(Hospital.is_active == True)
        
        if search:
            query = query.filter(
                func.lower(Hospital.name).contains(search.lower())
            )
        
        hospitals = query.offset((page - 1) * size).limit(size).all()

        items: List[HospitalCard] = []
        for h in hospitals:
            # Count departments
            dept_count = db.query(func.count(HospitalDepartment.id)).filter(
                HospitalDepartment.hospital_id == h.id,
                HospitalDepartment.is_active == True
            ).scalar() or 0
            
            # Count doctors using the many-to-many relationship
            # Note: doctor_hospitals.hospital_id is UUID in database, cast column to text for comparison
            doctor_count = db.query(func.count(Doctor.id)).join(
                doctor_hospitals
            ).filter(
                cast(doctor_hospitals.c.hospital_id, Text) == str(h.id)
            ).scalar() or 0
            
            items.append(HospitalCard(
                id=str(h.id),
                name=h.name or "Hospital",
                address=_format_address(h),
                phone=h.phone or "",
                rating=4.7,  # Default rating if not available
                type="General Hospital",  # Default type
                established="",  # Default if not available
                beds="—",  # Default if not available
                departments=dept_count,
                doctors=doctor_count,
            ))

        return SuccessResponse(data=items, message="Hospitals retrieved")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Hospitals Retrieval Failed",
            status=500,
            detail=str(e),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/hospitals/{hospital_id}/departments", response_model=SuccessResponse[List[DepartmentDTO]])
@audit_pii_access("read", "hospital", "hospital_departments")
async def list_hospital_departments(
    request: Request,
    hospital_id: str,
    _: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    try:
        # Validate hospital exists
        try:
            hospital_uuid = UUID(hospital_id)
        except ValueError:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Invalid Hospital ID",
                status=404,
                detail=f"Invalid hospital ID format: {hospital_id}",
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        hospital = hospital_crud.get(db=db, id=hospital_id)
        if not hospital:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Hospital Not Found",
                status=404,
                detail=f"Hospital {hospital_id} not found",
            )
            raise HTTPException(status_code=404, detail=problem.dict())

        # Fetch departments - query directly to ensure we get active departments
        depts = db.query(HospitalDepartment).filter(
            HospitalDepartment.hospital_id == hospital_uuid,
            HospitalDepartment.is_active == True
        ).all()

        items: List[DepartmentDTO] = []
        for d in depts:
            try:
                # Count doctors in this department using the many-to-many relationship
                # Note: doctor_departments.department_id is UUID in database, cast column to text for comparison
                doctors_count = db.query(func.count(Doctor.id)).join(
                    doctor_departments
                ).filter(
                    cast(doctor_departments.c.department_id, Text) == str(d.id)
                ).scalar() or 0

                items.append(DepartmentDTO(
                    id=str(d.id),
                    name=d.name or "Department",
                    description=d.description or "",
                    doctors=doctors_count,
                ))
            except Exception as e:
                # Log error but continue processing other departments
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error processing department {d.id}: {e}")
                # Still add the department even if doctor count fails
                items.append(DepartmentDTO(
                    id=str(d.id),
                    name=d.name or "Department",
                    description=d.description or "",
                    doctors=0,
                ))
        
        return SuccessResponse(data=items, message="Departments retrieved")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Departments Retrieval Failed",
            status=500,
            detail=str(e),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/hospitals/{hospital_id}/doctors", response_model=SuccessResponse[List[DoctorDTO]])
@audit_pii_access("read", "hospital", "hospital_doctors")
async def list_hospital_doctors(
    request: Request,
    hospital_id: str,
    _: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    try:
        # Validate hospital exists
        try:
            hospital_uuid = UUID(hospital_id)
        except ValueError:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Invalid Hospital ID",
                status=404,
                detail=f"Invalid hospital ID format: {hospital_id}",
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        hospital = hospital_crud.get(db=db, id=hospital_id)
        if not hospital:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Hospital Not Found",
                status=404,
                detail=f"Hospital {hospital_id} not found",
            )
            raise HTTPException(status_code=404, detail=problem.dict())

        # Query doctors using the many-to-many relationship with eager loading of User
        # Note: doctor_hospitals.hospital_id is UUID in database, cast column to text for comparison
        doctors = db.query(Doctor).join(
            doctor_hospitals
        ).options(
            joinedload(Doctor.user)
        ).filter(
            cast(doctor_hospitals.c.hospital_id, Text) == str(hospital_uuid)
        ).all()
        
        items: List[DoctorDTO] = []
        for d in doctors:
            # Get doctor name from User relationship
            full_name = "Doctor"
            if d.user:
                if d.user.first_name and d.user.last_name:
                    full_name = f"{d.user.first_name} {d.user.last_name}"
                elif d.user.first_name:
                    full_name = d.user.first_name
                elif d.user.last_name:
                    full_name = d.user.last_name
            
            items.append(DoctorDTO(
                id=str(d.id),
                full_name=full_name,
                specialty=d.primary_specialization or "General",
                rating=4.7,  # Default rating if not available
            ))
        
        return SuccessResponse(data=items, message="Doctors retrieved")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Doctors Retrieval Failed",
            status=500,
            detail=str(e),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/hospitals/{hospital_id}/departments/{department_id}/doctors", response_model=SuccessResponse[List[DoctorDTO]])
@audit_pii_access("read", "hospital", "department_doctors")
async def list_department_doctors(
    request: Request,
    hospital_id: str,
    department_id: str,
    _: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    """Get list of doctors in a specific department."""
    try:
        # Validate hospital exists
        try:
            hospital_uuid = UUID(hospital_id)
        except ValueError:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Invalid Hospital ID",
                status=404,
                detail=f"Invalid hospital ID format: {hospital_id}",
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Validate department exists
        try:
            department_uuid = UUID(department_id)
        except ValueError:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Invalid Department ID",
                status=404,
                detail=f"Invalid department ID format: {department_id}",
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        hospital = hospital_crud.get(db=db, id=hospital_id)
        if not hospital:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Hospital Not Found",
                status=404,
                detail=f"Hospital {hospital_id} not found",
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Validate department belongs to hospital
        department = db.query(HospitalDepartment).filter(
            HospitalDepartment.id == department_uuid,
            HospitalDepartment.hospital_id == hospital_uuid,
            HospitalDepartment.is_active == True
        ).first()
        
        if not department:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Department Not Found",
                status=404,
                detail=f"Department {department_id} not found in hospital {hospital_id}",
            )
            raise HTTPException(status_code=404, detail=problem.dict())

        # Query doctors in this department using the many-to-many relationship
        # Note: doctor_departments.department_id is UUID in database, cast column to text for comparison
        doctors = db.query(Doctor).join(
            doctor_departments
        ).options(
            joinedload(Doctor.user)
        ).filter(
            cast(doctor_departments.c.department_id, Text) == str(department_uuid)
        ).all()
        
        items: List[DoctorDTO] = []
        for d in doctors:
            # Get doctor name from User relationship
            full_name = "Doctor"
            if d.user:
                if d.user.first_name and d.user.last_name:
                    full_name = f"{d.user.first_name} {d.user.last_name}"
                elif d.user.first_name:
                    full_name = d.user.first_name
                elif d.user.last_name:
                    full_name = d.user.last_name
            
            items.append(DoctorDTO(
                id=str(d.id),
                full_name=full_name,
                specialty=d.primary_specialization or "General",
                rating=4.7,  # Default rating if not available
            ))
        
        return SuccessResponse(data=items, message="Department doctors retrieved")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Department Doctors Retrieval Failed",
            status=500,
            detail=str(e),
        )
        raise HTTPException(status_code=500, detail=problem.dict())
