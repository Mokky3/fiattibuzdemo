# app/crud/hospital.py
"""CRUD operations for Hospital and related models."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, date
import uuid

from app.crud.base import CRUDBase
from pydantic import BaseModel
from app.common.models.hospital import (
    Hospital, HospitalDepartment, Location,
    HospitalType, HospitalStatus, DepartmentType
)
# from app.common.schemas.clinic import (
#     ClinicCreate, ClinicUpdate, ClinicResponse,
#     DepartmentCreate, DepartmentUpdate, DepartmentResponse
# )


class CRUDHospital(CRUDBase[Hospital, BaseModel, BaseModel]):
    """CRUD operations for Hospital model."""
    
    def get_by_code(self, db: Session, *, code: str) -> Optional[Hospital]:
        """Get hospital by code."""
        return db.query(Hospital).filter(Hospital.code == code).first()
    
    def get_by_registration_number(
        self, db: Session, *, registration_number: str
    ) -> Optional[Hospital]:
        """Get hospital by registration number."""
        return db.query(Hospital).filter(
            Hospital.registration_number == registration_number
        ).first()
    
    def get_active_hospitals(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        city: Optional[str] = None,
        hospital_type: Optional[HospitalType] = None
    ) -> List[Hospital]:
        """Get active hospitals with optional filtering."""
        query = db.query(Hospital).filter(
            and_(
                Hospital.status == HospitalStatus.ACTIVE,
                Hospital.is_active == True
            )
        )
        
        if city:
            query = query.filter(Hospital.city == city)
        
        if hospital_type:
            query = query.filter(Hospital.hospital_type == hospital_type)
        
        return query.offset(skip).limit(limit).all()
    
    def search_hospitals(
        self,
        db: Session,
        *,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Hospital]:
        """Search hospitals by name, city, or services."""
        query = db.query(Hospital)
        
        # Apply search
        if search_term:
            search_conditions = or_(
                func.lower(Hospital.name).contains(search_term.lower()),
                func.lower(Hospital.city).contains(search_term.lower()),
                func.lower(Hospital.address_line1).contains(search_term.lower())
            )
            query = query.filter(search_conditions)
        
        # Apply filters
        if filters:
            if 'status' in filters and filters['status']:
                query = query.filter(Hospital.status == filters['status'])
            
            if 'city' in filters and filters['city']:
                query = query.filter(Hospital.city == filters['city'])
            
            if 'hospital_type' in filters and filters['hospital_type']:
                query = query.filter(Hospital.hospital_type == filters['hospital_type'])
            
            if 'emergency_services' in filters:
                query = query.filter(Hospital.emergency_services == filters['emergency_services'])
            
            if 'is_24_hours' in filters:
                query = query.filter(Hospital.is_24_hours == filters['is_24_hours'])
        
        return query.offset(skip).limit(limit).all()
    
    def get_hospital_stats(
        self, db: Session, *, hospital_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get hospital statistics."""
        hospital = self.get(db, id=hospital_id)
        if not hospital:
            return {}
        
        # Count departments
        total_departments = db.query(HospitalDepartment).filter(
            HospitalDepartment.hospital_id == hospital_id
        ).count()
        
        active_departments = db.query(HospitalDepartment).filter(
            and_(
                HospitalDepartment.hospital_id == hospital_id,
                HospitalDepartment.is_active == True
            )
        ).count()
        
        # Count staff (from User model)
        from app.common.models.user import User
        total_staff = db.query(User).filter(
            User.organization_id == hospital_id
        ).count()
        
        # Count doctors
        from app.common.models.user import UserRole
        total_doctors = db.query(User).filter(
            and_(
                User.organization_id == hospital_id,
                User.role == UserRole.DOCTOR
            )
        ).count()
        
        # Get bed occupancy
        total_bed_capacity = db.query(
            func.sum(HospitalDepartment.bed_capacity)
        ).filter(
            HospitalDepartment.hospital_id == hospital_id
        ).scalar() or 0
        
        current_occupancy = db.query(
            func.sum(HospitalDepartment.current_occupancy)
        ).filter(
            HospitalDepartment.hospital_id == hospital_id
        ).scalar() or 0
        
        occupancy_rate = (current_occupancy / total_bed_capacity * 100) if total_bed_capacity > 0 else 0
        
        return {
            "hospital_id": str(hospital_id),
            "name": hospital.name,
            "total_departments": total_departments,
            "active_departments": active_departments,
            "total_staff": total_staff,
            "total_doctors": total_doctors,
            "total_beds": total_bed_capacity,
            "bed_capacity": total_bed_capacity,
            "current_occupancy": current_occupancy,
            "occupancy_rate": round(occupancy_rate, 2),
            "emergency_services": True,  # Default value since attribute doesn't exist
            "is_24_hours": False  # Default value since attribute doesn't exist
        }
    
    def update_hospital_status(
        self,
        db: Session,
        *,
        hospital_id: uuid.UUID,
        status: HospitalStatus
    ) -> Optional[Hospital]:
        """Update hospital status."""
        hospital = self.get(db, id=hospital_id)
        if hospital:
            hospital.status = status
            hospital.is_active = status == HospitalStatus.ACTIVE
            hospital.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(hospital)
        return hospital
    
    def get_hospitals_by_parent(
        self,
        db: Session,
        *,
        parent_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Hospital]:
        """Get child hospitals of a parent organization."""
        return db.query(Hospital).filter(
            Hospital.parent_organization_id == parent_id
        ).offset(skip).limit(limit).all()
    
    def get_cities(self, db: Session) -> List[str]:
        """Get unique cities with hospitals."""
        cities = db.query(Hospital.city).distinct().all()
        return [city[0] for city in cities if city[0]]
    
    def get_hospital_departments(
        self,
        db: Session,
        *,
        hospital_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[HospitalDepartment]:
        """Get departments for a hospital."""
        return db.query(HospitalDepartment).filter(
            HospitalDepartment.hospital_id == hospital_id
        ).offset(skip).limit(limit).all()


class CRUDHospitalDepartment(CRUDBase[HospitalDepartment, BaseModel, BaseModel]):
    """CRUD operations for HospitalDepartment model."""
    
    def get_by_code(
        self,
        db: Session,
        *,
        code: str,
        hospital_id: uuid.UUID
    ) -> Optional[HospitalDepartment]:
        """Get department by code within a hospital."""
        return db.query(HospitalDepartment).filter(
            and_(
                HospitalDepartment.code == code,
                HospitalDepartment.hospital_id == hospital_id
            )
        ).first()
    
    def get_hospital_departments(
        self,
        db: Session,
        *,
        hospital_id: uuid.UUID,
        department_type: Optional[DepartmentType] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[HospitalDepartment]:
        """Get departments for a hospital."""
        query = db.query(HospitalDepartment).filter(
            HospitalDepartment.hospital_id == hospital_id
        )
        
        if department_type:
            query = query.filter(HospitalDepartment.department_type == department_type)
        
        if is_active is not None:
            query = query.filter(HospitalDepartment.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()
    
    def update_occupancy(
        self,
        db: Session,
        *,
        department_id: uuid.UUID,
        occupancy: int
    ) -> Optional[HospitalDepartment]:
        """Update department occupancy."""
        dept = self.get(db, id=department_id)
        if dept:
            dept.current_occupancy = occupancy
            dept.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(dept)
        return dept
    
    def get_department_stats(
        self,
        db: Session,
        *,
        department_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get department statistics."""
        dept = self.get(db, id=department_id)
        if not dept:
            return {}
        
        # Count staff
        from app.common.models.user import User
        staff_count = db.query(User).filter(
            User.department_id == department_id
        ).count()
        
        # Count doctors
        from app.common.models.user import UserRole
        doctor_count = db.query(User).filter(
            and_(
                User.department_id == department_id,
                User.role == UserRole.DOCTOR
            )
        ).count()
        
        nurse_count = db.query(User).filter(
            and_(
                User.department_id == department_id,
                User.role == UserRole.NURSE
            )
        ).count()
        
        # Calculate occupancy rate
        occupancy_rate = 0
        if dept.bed_capacity and dept.bed_capacity > 0:
            occupancy_rate = (dept.current_occupancy / dept.bed_capacity) * 100
        
        return {
            "department_id": str(department_id),
            "name": dept.name,
            "type": dept.department_type.value,
            "is_active": dept.is_active,
            "is_24_hours": dept.is_24_hours,
            "total_staff": staff_count,
            "doctors": doctor_count,
            "nurses": nurse_count,
            "bed_capacity": dept.bed_capacity or 0,
            "current_occupancy": dept.current_occupancy,
            "occupancy_rate": round(occupancy_rate, 2),
            "is_accepting_patients": dept.is_accepting_patients
        }
    
    def toggle_patient_acceptance(
        self,
        db: Session,
        *,
        department_id: uuid.UUID,
        accepting: bool
    ) -> Optional[HospitalDepartment]:
        """Toggle whether department is accepting patients."""
        dept = self.get(db, id=department_id)
        if dept:
            dept.is_accepting_patients = accepting
            dept.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(dept)
        return dept
    
    def get_sub_departments(
        self,
        db: Session,
        *,
        parent_department_id: uuid.UUID
    ) -> List[HospitalDepartment]:
        """Get sub-departments of a department."""
        return db.query(HospitalDepartment).filter(
            HospitalDepartment.parent_department_id == parent_department_id
        ).all()


class CRUDLocation(CRUDBase[Location, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Location model."""
    
    def get_by_code(
        self, db: Session, *, code: str
    ) -> Optional[Location]:
        """Get location by code."""
        return db.query(Location).filter(Location.code == code).first()
    
    def get_available_locations(
        self,
        db: Session,
        *,
        hospital_id: uuid.UUID,
        location_type: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Location]:
        """Get available locations."""
        query = db.query(Location).filter(
            and_(
                Location.hospital_id == hospital_id,
                Location.is_active == True,
                Location.is_available == True,
                Location.is_occupied == False
            )
        )
        
        if location_type:
            query = query.filter(Location.location_type == location_type)
        
        if department_id:
            query = query.filter(Location.department_id == department_id)
        
        return query.offset(skip).limit(limit).all()
    
    def occupy_location(
        self,
        db: Session,
        *,
        location_id: uuid.UUID,
        patient_id: uuid.UUID
    ) -> Optional[Location]:
        """Mark location as occupied by a patient."""
        location = self.get(db, id=location_id)
        if location and location.is_available and not location.is_occupied:
            location.is_occupied = True
            location.current_patient_id = patient_id
            location.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(location)
        return location
    
    def release_location(
        self,
        db: Session,
        *,
        location_id: uuid.UUID
    ) -> Optional[Location]:
        """Release an occupied location."""
        location = self.get(db, id=location_id)
        if location:
            location.is_occupied = False
            location.current_patient_id = None
            location.cleaning_required = True
            location.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(location)
        return location
    
    def mark_for_maintenance(
        self,
        db: Session,
        *,
        location_id: uuid.UUID,
        notes: Optional[str] = None
    ) -> Optional[Location]:
        """Mark location for maintenance."""
        location = self.get(db, id=location_id)
        if location:
            location.is_available = False
            location.maintenance_required = True
            if notes:
                location.notes = notes
            location.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(location)
        return location
    
    def complete_maintenance(
        self,
        db: Session,
        *,
        location_id: uuid.UUID
    ) -> Optional[Location]:
        """Mark maintenance as completed."""
        location = self.get(db, id=location_id)
        if location:
            location.is_available = True
            location.maintenance_required = False
            location.cleaning_required = False
            location.updated_at = datetime.utcnow()
            
            # Update sterilization for operating rooms
            if location.location_type == "operating_room":
                location.is_sterile = True
                location.last_sterilized = datetime.utcnow()
            
            db.commit()
            db.refresh(location)
        return location
    
    def get_location_utilization(
        self,
        db: Session,
        *,
        hospital_id: uuid.UUID,
        location_type: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """Get location utilization statistics."""
        query = db.query(Location).filter(
            Location.hospital_id == hospital_id
        )
        
        if location_type:
            query = query.filter(Location.location_type == location_type)
        
        if department_id:
            query = query.filter(Location.department_id == department_id)
        
        locations = query.all()
        
        total = len(locations)
        occupied = len([l for l in locations if l.is_occupied])
        available = len([l for l in locations if l.is_available and not l.is_occupied])
        maintenance = len([l for l in locations if l.maintenance_required])
        cleaning = len([l for l in locations if l.cleaning_required])
        
        utilization_rate = (occupied / total * 100) if total > 0 else 0
        
        return {
            "total_locations": total,
            "occupied": occupied,
            "available": available,
            "under_maintenance": maintenance,
            "requiring_cleaning": cleaning,
            "utilization_rate": round(utilization_rate, 2)
        }


# Create instances
hospital = CRUDHospital(Hospital)
hospital_department = CRUDHospitalDepartment(HospitalDepartment)
location = CRUDLocation(Location)

# Alias for compatibility
clinic = hospital  # Hospital model serves as the clinic/organization