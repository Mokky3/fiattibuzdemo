#!/usr/bin/env python3
"""
Seed script to create medication administration records for the nurse medication page.
This creates sample medication administration records with various statuses.
"""
import sys
import os
from datetime import date, datetime, timedelta
import uuid

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.common.models.medical import MedicationAdministration
from app.common.models.patient import Patient
from sqlalchemy import text

def create_medication_administrations_table(db):
    """Create the medication_administrations table if it doesn't exist."""
    from sqlalchemy import text
    
    create_table_sql = text("""
        CREATE TABLE IF NOT EXISTS ehr.medication_administrations (
            id VARCHAR(36) PRIMARY KEY,
            patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
            administered_by UUID REFERENCES core.users(id),
            room VARCHAR(50),
            date DATE NOT NULL,
            medication VARCHAR(200) NOT NULL,
            dosage VARCHAR(100) NOT NULL,
            frequency VARCHAR(100),
            route VARCHAR(50),
            time_to_administer VARCHAR(10) NOT NULL,
            status VARCHAR(20) NOT NULL,
            status_time VARCHAR(10),
            next_due VARCHAR(10),
            administered_at TIMESTAMPTZ,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ
        );
        
        CREATE INDEX IF NOT EXISTS idx_medication_administrations_patient_id ON ehr.medication_administrations(patient_id);
        CREATE INDEX IF NOT EXISTS idx_medication_administrations_date ON ehr.medication_administrations(date);
        CREATE INDEX IF NOT EXISTS idx_medication_administrations_status ON ehr.medication_administrations(status);
    """)
    
    try:
        db.execute(create_table_sql)
        db.commit()
        print("Created medication_administrations table")
    except Exception as e:
        db.rollback()
        # Check if table already exists
        check_table = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'ehr' 
                AND table_name = 'medication_administrations'
            )
        """)
        table_exists = db.execute(check_table).scalar()
        if table_exists:
            print("Table already exists")
        else:
            print(f"Table creation error: {e}")
            raise

def seed_medication_administrations():
    """Create sample medication administration records."""
    db = SessionLocal()
    
    try:
        # Create table first
        create_medication_administrations_table(db)
        # Get some patient IDs from the database
        patients_query = text("""
            SELECT patient_id 
            FROM ehr.patients 
            LIMIT 10
        """)
        patient_results = db.execute(patients_query).all()
        
        if not patient_results:
            print("No patients found in database. Please create patients first.")
            return
        
        patient_ids = [str(row[0]) for row in patient_results]
        print(f"Found {len(patient_ids)} patients")
        
        # Sample medications data
        medications_data = [
            {
                "medication": "Paracetamol",
                "dosage": "500mg",
                "frequency": "Every 6 hours",
                "route": "Oral",
                "times": ["08:00", "14:00", "20:00"]
            },
            {
                "medication": "Amoxicillin",
                "dosage": "250mg",
                "frequency": "Three times daily",
                "route": "Oral",
                "times": ["09:00", "15:00", "21:00"]
            },
            {
                "medication": "Ibuprofen",
                "dosage": "400mg",
                "frequency": "Every 8 hours",
                "route": "Oral",
                "times": ["08:00", "16:00", "00:00"]
            },
            {
                "medication": "Insulin",
                "dosage": "10 units",
                "frequency": "Before meals",
                "route": "Subcutaneous",
                "times": ["07:00", "12:00", "18:00"]
            },
            {
                "medication": "Morphine",
                "dosage": "5mg",
                "frequency": "As needed",
                "route": "Intravenous",
                "times": ["PRN"]
            },
            {
                "medication": "Aspirin",
                "dosage": "100mg",
                "frequency": "Once daily",
                "route": "Oral",
                "times": ["08:00"]
            },
            {
                "medication": "Metformin",
                "dosage": "500mg",
                "frequency": "Twice daily",
                "route": "Oral",
                "times": ["08:00", "20:00"]
            },
            {
                "medication": "Atorvastatin",
                "dosage": "20mg",
                "frequency": "Once daily",
                "route": "Oral",
                "times": ["22:00"]
            },
            {
                "medication": "Salbutamol",
                "dosage": "2 puffs",
                "frequency": "As needed",
                "route": "Inhalation",
                "times": ["PRN"]
            },
            {
                "medication": "Omeprazole",
                "dosage": "20mg",
                "frequency": "Once daily",
                "route": "Oral",
                "times": ["07:00"]
            }
        ]
        
        # Room numbers
        rooms = ["101", "102", "103", "201", "202", "203", "301", "302", "ICU-1", "ICU-2"]
        
        # Statuses to create
        statuses = ["pending", "due-soon", "overdue", "given", "skipped"]
        
        # Dates: today, yesterday, tomorrow
        today = date.today()
        dates = [today - timedelta(days=1), today, today + timedelta(days=1)]
        
        created_count = 0
        batch_size = 50  # Commit every 50 records
        batch = []
        
        # Create medication administrations
        for med_data in medications_data[:8]:  # Use first 8 medications
            for patient_id in patient_ids[:5]:  # Use first 5 patients
                for admin_date in dates:
                    for time_to_administer in med_data["times"]:
                        # Skip if it's PRN and we already have one for this patient/medication/date
                        if time_to_administer == "PRN":
                            # Only create one PRN per patient/medication/date - check in batch
                            skip_prn = False
                            for b in batch:
                                if (b["patient_id"] == patient_id and 
                                    b["medication"] == med_data["medication"] and 
                                    b["date"] == admin_date and 
                                    b["time_to_administer"] == "PRN"):
                                    skip_prn = True
                                    break
                            if skip_prn:
                                continue
                            
                            # Also check database
                            try:
                                check_sql = text("""
                                    SELECT COUNT(*) FROM ehr.medication_administrations
                                    WHERE patient_id = :patient_id::UUID
                                    AND medication = :medication
                                    AND date = :date
                                    AND time_to_administer = 'PRN'
                                """)
                                existing_count = db.execute(check_sql, {
                                    "patient_id": str(patient_id),
                                    "medication": med_data["medication"],
                                    "date": admin_date
                                }).scalar()
                                if existing_count > 0:
                                    continue
                            except Exception:
                                # If check fails, continue anyway
                                pass
                        
                        # Determine status based on date and time
                        now = datetime.now()
                        admin_datetime = None
                        if time_to_administer != "PRN":
                            try:
                                hour, minute = map(int, time_to_administer.split(":"))
                                admin_datetime = datetime.combine(admin_date, datetime.min.time().replace(hour=hour, minute=minute))
                            except:
                                admin_datetime = datetime.combine(admin_date, datetime.min.time())
                        
                        # Determine status
                        status = "pending"
                        status_time = None
                        next_due = None
                        
                        if admin_date < today:
                            # Past date - mark as given or overdue
                            status = "given" if created_count % 3 == 0 else "overdue"
                            status_time = time_to_administer if status == "given" else None
                        elif admin_date == today:
                            # Today - mix of statuses
                            if admin_datetime and admin_datetime < now - timedelta(hours=2):
                                # Past time - overdue or given
                                status = "given" if created_count % 2 == 0 else "overdue"
                                status_time = time_to_administer if status == "given" else None
                            elif admin_datetime and admin_datetime < now + timedelta(hours=1):
                                # Within 1 hour - due soon
                                status = "due-soon"
                            else:
                                # Future time - pending
                                status = "pending"
                        else:
                            # Future date - pending
                            status = "pending"
                        
                        # Add some skipped medications
                        if created_count % 7 == 0:
                            status = "skipped"
                        
                        # Calculate next due time
                        if time_to_administer != "PRN" and status in ["pending", "due-soon", "overdue"]:
                            next_due = time_to_administer
                        
                        # Get a room for this patient
                        room = rooms[created_count % len(rooms)]
                        
                        # Add to batch
                        batch.append({
                            "id": str(uuid.uuid4()),
                            "patient_id": str(patient_id),
                            "administered_by": None,
                            "room": room,
                            "date": admin_date,
                            "medication": med_data["medication"],
                            "dosage": med_data["dosage"],
                            "frequency": med_data["frequency"],
                            "route": med_data["route"],
                            "time_to_administer": time_to_administer,
                            "status": status,
                            "status_time": status_time,
                            "next_due": next_due,
                            "administered_at": datetime.now() if status == "given" else None,
                            "notes": None
                        })
                        
                        # Commit batch when it reaches batch_size
                        if len(batch) >= batch_size:
                            try:
                                insert_sql = text("""
                                    INSERT INTO ehr.medication_administrations 
                                    (id, patient_id, administered_by, room, date, medication, dosage, frequency, route, 
                                     time_to_administer, status, status_time, next_due, administered_at, notes)
                                    VALUES 
                                    (:id, CAST(:patient_id AS UUID), CAST(:administered_by AS UUID), :room, :date, :medication, :dosage, 
                                     :frequency, :route, :time_to_administer, :status, :status_time, :next_due, 
                                     :administered_at, :notes)
                                """)
                                
                                for params in batch:
                                    db.execute(insert_sql, params)
                                
                                db.commit()
                                created_count += len(batch)
                                print(f"Committed batch of {len(batch)} records (total: {created_count})")
                                batch = []
                            except Exception as e:
                                db.rollback()
                                print(f"Error committing batch: {e}, skipping batch")
                                batch = []
        
        # Commit remaining records
        if batch:
            try:
                insert_sql = text("""
                    INSERT INTO ehr.medication_administrations 
                    (id, patient_id, administered_by, room, date, medication, dosage, frequency, route, 
                     time_to_administer, status, status_time, next_due, administered_at, notes)
                    VALUES 
                    (:id, CAST(:patient_id AS UUID), CAST(:administered_by AS UUID), :room, :date, :medication, :dosage, 
                     :frequency, :route, :time_to_administer, :status, :status_time, :next_due, 
                     :administered_at, :notes)
                """)
                
                for params in batch:
                    db.execute(insert_sql, params)
                
                db.commit()
                created_count += len(batch)
                print(f"Committed final batch of {len(batch)} records (total: {created_count})")
            except Exception as e:
                db.rollback()
                print(f"Error committing final batch: {e}, skipping batch")
        print(f"Created {created_count} medication administration records")
        print(f"   - Status distribution:")
        
        # Count by status
        status_counts = db.execute(text("""
            SELECT status, COUNT(*) 
            FROM ehr.medication_administrations 
            GROUP BY status
        """)).all()
        
        for status, count in status_counts:
            print(f"     {status}: {count}")
        
        # Count by date
        date_counts = db.execute(text("""
            SELECT date, COUNT(*) 
            FROM ehr.medication_administrations 
            GROUP BY date
            ORDER BY date
        """)).all()
        
        print(f"   - Date distribution:")
        for admin_date, count in date_counts:
            print(f"     {admin_date}: {count} medications")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating medication administrations: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding medication administrations...")
    seed_medication_administrations()
    print("Done!")

