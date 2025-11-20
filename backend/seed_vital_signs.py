#!/usr/bin/env python3
"""Seed the vital_signs table with sample data."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uuid
from datetime import datetime, date, timedelta, time as dt_time
from random import uniform, randint, choice

from app.db.session import SessionLocal
from sqlalchemy import text

def create_vital_signs_table(db):
    """Create the vital_signs table if it doesn't exist."""
    create_table_sql = text("""
        CREATE TABLE IF NOT EXISTS ehr.vital_signs (
            id VARCHAR(36) PRIMARY KEY,
            patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
            recorded_by UUID REFERENCES core.users(id),
            systolic_bp INTEGER,
            diastolic_bp INTEGER,
            heart_rate INTEGER,
            temperature FLOAT,
            respiratory_rate INTEGER,
            oxygen_saturation INTEGER,
            weight FLOAT,
            height FLOAT,
            bmi FLOAT,
            pain_scale INTEGER,
            recorded_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON ehr.vital_signs(patient_id);
        CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON ehr.vital_signs(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_by ON ehr.vital_signs(recorded_by);
    """)
    
    try:
        db.execute(create_table_sql)
        db.commit()
        print("Created vital_signs table")
    except Exception as e:
        db.rollback()
        # Check if table already exists
        check_table = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'ehr' 
                AND table_name = 'vital_signs'
            )
        """)
        table_exists = db.execute(check_table).scalar()
        if table_exists:
            print("Table already exists")
        else:
            print(f"Table creation error: {e}")
            raise

def seed_vital_signs():
    """Create sample vital signs records."""
    db = SessionLocal()
    
    try:
        # Create table first
        create_vital_signs_table(db)
        
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
        
        # Get a nurse user ID (for recorded_by)
        nurse_query = text("""
            SELECT u.id 
            FROM core.users u
            JOIN ehr.nurses n ON u.id = n.user_id
            LIMIT 1
        """)
        nurse_result = db.execute(nurse_query).first()
        
        if not nurse_result:
            # Fallback: get any user with nurse role
            nurse_query_fallback = text("""
                SELECT id 
                FROM core.users 
                WHERE role = 'nurse' 
                LIMIT 1
            """)
            nurse_result = db.execute(nurse_query_fallback).first()
        
        recorded_by_id = str(nurse_result[0]) if nurse_result else None
        if not recorded_by_id:
            print("Warning: No nurse user found. Using NULL for recorded_by.")
        
        # Sample vital signs ranges
        # Normal ranges
        normal_ranges = {
            "temperature": (36.1, 37.2),  # Celsius
            "systolic_bp": (90, 120),
            "diastolic_bp": (60, 80),
            "heart_rate": (60, 100),  # bpm
            "respiratory_rate": (12, 20),  # breaths/min
            "oxygen_saturation": (95, 100),  # percentage
            "height": (150, 190),  # cm
            "weight": (50, 100),  # kg
            "pain_scale": (0, 3),  # 0-10 scale, normal is 0-3
        }
        
        # Abnormal ranges (for variety)
        abnormal_ranges = {
            "temperature": [(35.0, 36.0), (37.3, 38.5)],  # Low or fever
            "systolic_bp": [(140, 180), (70, 89)],  # High or low
            "diastolic_bp": [(90, 110), (40, 59)],  # High or low
            "heart_rate": [(100, 130), (40, 59)],  # High or low
            "respiratory_rate": [(21, 30), (8, 11)],  # High or low
            "oxygen_saturation": [(85, 94)],  # Low
            "pain_scale": [(4, 10)],  # Moderate to severe pain
        }
        
        # Dates: today, yesterday, 2 days ago, 3 days ago
        today = date.today()
        dates = [today - timedelta(days=i) for i in range(4)]
        
        # Times throughout the day
        times = [
            dt_time(6, 0),   # 06:00
            dt_time(8, 0),   # 08:00
            dt_time(12, 0),  # 12:00
            dt_time(14, 0),  # 14:00
            dt_time(18, 0),  # 18:00
            dt_time(20, 0),  # 20:00
        ]
        
        created_count = 0
        batch_size = 50
        batch = []
        
        # Create vital signs for each patient
        for patient_id in patient_ids[:8]:  # Use first 8 patients
            # Get patient's height and weight (for BMI calculation)
            patient_height = uniform(150, 190)  # cm
            patient_weight = uniform(50, 100)  # kg
            
            for vital_date in dates:
                # Create 2-4 vital signs per day per patient
                num_vitals = randint(2, 4)
                selected_times = sorted(choice(times) for _ in range(num_vitals))
                
                for vital_time in selected_times:
                    # Determine if this vital sign should be normal or abnormal
                    is_abnormal = created_count % 5 == 0  # 20% abnormal
                    
                    # Generate vital signs
                    if is_abnormal:
                        # Generate abnormal values
                        temp_range = choice(abnormal_ranges["temperature"])
                        bp_sys_range = choice(abnormal_ranges["systolic_bp"])
                        bp_dia_range = choice(abnormal_ranges["diastolic_bp"])
                        hr_range = choice(abnormal_ranges["heart_rate"])
                        rr_range = choice(abnormal_ranges["respiratory_rate"])
                        spo2_range = choice(abnormal_ranges["oxygen_saturation"])
                        pain_range = choice(abnormal_ranges["pain_scale"])
                    else:
                        # Generate normal values
                        temp_range = normal_ranges["temperature"]
                        bp_sys_range = normal_ranges["systolic_bp"]
                        bp_dia_range = normal_ranges["diastolic_bp"]
                        hr_range = normal_ranges["heart_rate"]
                        rr_range = normal_ranges["respiratory_rate"]
                        spo2_range = normal_ranges["oxygen_saturation"]
                        pain_range = normal_ranges["pain_scale"]
                    
                    temperature = round(uniform(*temp_range), 1)
                    systolic_bp = randint(*bp_sys_range)
                    diastolic_bp = randint(*bp_dia_range)
                    heart_rate = randint(*hr_range)
                    respiratory_rate = randint(*rr_range)
                    oxygen_saturation = randint(*spo2_range)
                    pain_scale = randint(*pain_range)
                    
                    # Use patient's height and weight (with slight variations)
                    height = round(patient_height + uniform(-2, 2), 1)
                    weight = round(patient_weight + uniform(-2, 2), 1)
                    
                    # Calculate BMI
                    if height > 0:
                        bmi = round(weight / ((height / 100) ** 2), 1)
                    else:
                        bmi = None
                    
                    # Combine date and time
                    recorded_at = datetime.combine(vital_date, vital_time)
                    
                    # Add to batch
                    batch.append({
                        "id": str(uuid.uuid4()),
                        "patient_id": str(patient_id),
                        "recorded_by": recorded_by_id,
                        "systolic_bp": systolic_bp,
                        "diastolic_bp": diastolic_bp,
                        "heart_rate": heart_rate,
                        "temperature": temperature,
                        "respiratory_rate": respiratory_rate,
                        "oxygen_saturation": oxygen_saturation,
                        "weight": weight,
                        "height": height,
                        "bmi": bmi,
                        "pain_scale": pain_scale,
                        "recorded_at": recorded_at,
                    })
                    
                    # Commit batch when it reaches batch_size
                    if len(batch) >= batch_size:
                        try:
                            insert_sql = text("""
                                INSERT INTO ehr.vital_signs 
                                (id, patient_id, recorded_by, systolic_bp, diastolic_bp, heart_rate, 
                                 temperature, respiratory_rate, oxygen_saturation, weight, height, 
                                 bmi, pain_scale, recorded_at)
                                VALUES 
                                (:id, CAST(:patient_id AS UUID), CAST(:recorded_by AS UUID), 
                                 :systolic_bp, :diastolic_bp, :heart_rate, :temperature, 
                                 :respiratory_rate, :oxygen_saturation, :weight, :height, 
                                 :bmi, :pain_scale, :recorded_at)
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
                    INSERT INTO ehr.vital_signs 
                    (id, patient_id, recorded_by, systolic_bp, diastolic_bp, heart_rate, 
                     temperature, respiratory_rate, oxygen_saturation, weight, height, 
                     bmi, pain_scale, recorded_at)
                    VALUES 
                    (:id, CAST(:patient_id AS UUID), CAST(:recorded_by AS UUID), 
                     :systolic_bp, :diastolic_bp, :heart_rate, :temperature, 
                     :respiratory_rate, :oxygen_saturation, :weight, :height, 
                     :bmi, :pain_scale, :recorded_at)
                """)
                
                for params in batch:
                    db.execute(insert_sql, params)
                
                db.commit()
                created_count += len(batch)
                print(f"Committed final batch of {len(batch)} records (total: {created_count})")
            except Exception as e:
                db.rollback()
                print(f"Error committing final batch: {e}, skipping batch")
        
        print(f"\nCreated {created_count} vital signs records")
        print(f"   - Date distribution:")
        
        # Count by date
        date_counts = db.execute(text("""
            SELECT DATE(recorded_at) as date, COUNT(*) 
            FROM ehr.vital_signs 
            GROUP BY DATE(recorded_at) 
            ORDER BY DATE(recorded_at)
        """)).all()
        for vital_date, count in date_counts:
            print(f"     {vital_date}: {count} vitals")
        
        print(f"\nTotal records: {db.execute(text('SELECT COUNT(*) FROM ehr.vital_signs')).scalar()}")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating vital signs: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding vital signs...")
    seed_vital_signs()
    print("Done!")

