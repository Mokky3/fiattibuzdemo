#!/usr/bin/env python3
"""
Seed the database with sample radiology data for testing the dashboard.
Run: python backend/scripts/seed_radiology_data.py
"""
import sys
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import get_db
from app.common.models.radiology import RadiologyStudy, WorklistAssignment
from app.crud.radiology import radiology_study, worklist as worklist_crud
import uuid

def create_sample_studies():
    """Create sample radiology studies for testing."""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if we already have studies
        existing_studies = radiology_study.list(db, skip=0, limit=1)
        if existing_studies:
            print("✅ Sample radiology studies already exist")
            return
        
        print("📊 Creating sample radiology studies...")
        
        # Sample studies data
        sample_studies = [
            {
                "accession_number": "ACC-001",
                "patient_name": "John Smith",
                "patient_id": str(uuid.uuid4()),
                "mrn": "MRN-001",
                "age": 45,
                "gender": "M",
                "dob": datetime(1979, 1, 15).date(),
                "order_date": datetime.now(timezone.utc) - timedelta(hours=2),
                "scheduled_date": datetime.now(timezone.utc) - timedelta(hours=2),
                "modality": "CT",
                "body_part": "Chest",
                "study_description": "CT Chest with Contrast",
                "indication": "Chest pain, rule out PE",
                "priority": "STAT",
                "ordering_physician": "Dr. Johnson",
                "technologist": "Tech A",
                "status": "completed",
                "contrast": True,
                "location": "Radiology Suite 1",
                "room": "CT-1"
            },
            {
                "accession_number": "ACC-002",
                "patient_name": "Sarah Wilson",
                "patient_id": str(uuid.uuid4()),
                "mrn": "MRN-002",
                "age": 32,
                "gender": "F",
                "dob": datetime(1992, 5, 20).date(),
                "order_date": datetime.now(timezone.utc) - timedelta(hours=1),
                "scheduled_date": datetime.now(timezone.utc) - timedelta(hours=1),
                "modality": "MRI",
                "body_part": "Brain",
                "study_description": "MRI Brain without Contrast",
                "indication": "Headache, rule out mass",
                "priority": "Urgent",
                "ordering_physician": "Dr. Brown",
                "technologist": "Tech B",
                "status": "completed",
                "contrast": False,
                "location": "Radiology Suite 2",
                "room": "MRI-1"
            },
            {
                "accession_number": "ACC-003",
                "patient_name": "Mike Johnson",
                "patient_id": str(uuid.uuid4()),
                "mrn": "MRN-003",
                "age": 28,
                "gender": "M",
                "dob": datetime(1996, 8, 10).date(),
                "order_date": datetime.now(timezone.utc) - timedelta(minutes=30),
                "scheduled_date": datetime.now(timezone.utc) - timedelta(minutes=30),
                "modality": "XR",
                "body_part": "Chest",
                "study_description": "Chest X-Ray PA/Lateral",
                "indication": "Cough, fever",
                "priority": "Routine",
                "ordering_physician": "Dr. Davis",
                "technologist": "Tech C",
                "status": "completed",
                "contrast": False,
                "location": "Radiology Suite 1",
                "room": "XR-1"
            },
            {
                "accession_number": "ACC-004",
                "patient_name": "Emma Brown",
                "patient_id": str(uuid.uuid4()),
                "mrn": "MRN-004",
                "age": 55,
                "gender": "F",
                "dob": datetime(1969, 3, 25).date(),
                "order_date": datetime.now(timezone.utc) - timedelta(minutes=15),
                "scheduled_date": datetime.now(timezone.utc) - timedelta(minutes=15),
                "modality": "US",
                "body_part": "Abdomen",
                "study_description": "Ultrasound Abdomen Complete",
                "indication": "Abdominal pain",
                "priority": "Routine",
                "ordering_physician": "Dr. Wilson",
                "technologist": "Tech D",
                "status": "completed",
                "contrast": False,
                "location": "Radiology Suite 3",
                "room": "US-1"
            },
            {
                "accession_number": "ACC-005",
                "patient_name": "David Lee",
                "patient_id": str(uuid.uuid4()),
                "mrn": "MRN-005",
                "age": 67,
                "gender": "M",
                "dob": datetime(1957, 11, 8).date(),
                "order_date": datetime.now(timezone.utc) - timedelta(minutes=5),
                "scheduled_date": datetime.now(timezone.utc) - timedelta(minutes=5),
                "modality": "CT",
                "body_part": "Abdomen",
                "study_description": "CT Abdomen/Pelvis with Contrast",
                "indication": "Abdominal mass, staging",
                "priority": "STAT",
                "ordering_physician": "Dr. Anderson",
                "technologist": "Tech A",
                "status": "completed",
                "contrast": True,
                "location": "Radiology Suite 1",
                "room": "CT-1"
            }
        ]
        
        # Create studies
        created_studies = []
        for study_data in sample_studies:
            study = radiology_study.create(db, obj_in=study_data)
            created_studies.append(study)
            print(f"  ✅ Created study: {study.accession_number} - {study.patient_name}")
        
        # Create worklist assignments with different reading statuses
        assignment_data = [
            {"study_id": created_studies[0].id, "reading_status": "unread", "critical_flag": True},
            {"study_id": created_studies[1].id, "reading_status": "reading", "critical_flag": False},
            {"study_id": created_studies[2].id, "reading_status": "preliminary", "critical_flag": False},
            {"study_id": created_studies[3].id, "reading_status": "final", "critical_flag": False},
            {"study_id": created_studies[4].id, "reading_status": "unread", "critical_flag": True},
        ]
        
        print("📋 Creating worklist assignments...")
        for assignment_info in assignment_data:
            assignment = worklist_crud.create_assignment(
                db,
                study_id=assignment_info["study_id"],
                reading_status=assignment_info["reading_status"],
                critical_flag=assignment_info["critical_flag"]
            )
            print(f"  ✅ Created assignment for study {assignment_info['study_id']}")
        
        db.commit()
        print("✅ Successfully created sample radiology data!")
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_studies()
