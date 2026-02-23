#!/usr/bin/env python3
"""
Create appointments for our doctor in the main folder database
"""
import sqlite3
import uuid
from datetime import datetime, date, time

def create_appointments_main_db():
    # Connect to main folder database
    conn = sqlite3.connect('../ehr.db')
    cursor = conn.cursor()

    try:
        # First, check if our doctor exists
        cursor.execute("SELECT id FROM doctors WHERE user_id = '87fe91be-50dc-4793-bb58-ff3a9f50f432'")
        doctor = cursor.fetchone()
        
        if not doctor:
            print("❌ Doctor not found in main database")
            return False
        
        doctor_id = doctor[0]
        print(f"✅ Found doctor: {doctor_id}")
        
        # Get patients
        cursor.execute("SELECT id, first_name, last_name FROM patients LIMIT 5")
        patients = cursor.fetchall()
        
        if not patients:
            print("❌ No patients found in main database")
            return False
        
        print(f"✅ Found {len(patients)} patients")
        
        # Get hospital
        cursor.execute("SELECT id, name FROM hospitals LIMIT 1")
        hospital = cursor.fetchone()
        
        if not hospital:
            print("❌ No hospital found in main database")
            return False
        
        hospital_id = hospital[0]
        print(f"✅ Found hospital: {hospital[1]} ({hospital_id})")
        
        # Create appointments for each patient
        appointments_created = 0
        for i, (patient_id, first_name, last_name) in enumerate(patients):
            # Check if appointment already exists
            cursor.execute(
                "SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ?",
                (patient_id, doctor_id)
            )
            if cursor.fetchone():
                print(f"Appointment already exists for {first_name} {last_name}")
                continue
            
            # Create appointment
            appointment_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO appointments (
                    id, patient_id, doctor_id, hospital_id, appointment_date, 
                    start_time, end_time, appointment_type, status, chief_complaint, 
                    description, created_at, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                appointment_id,
                patient_id,
                doctor_id,
                hospital_id,
                "2024-10-11",  # Past date for past appointments
                f"09:{i:02d}:00",
                f"10:{i:02d}:00",
                "GENERAL_CONSULTATION",
                "BOOKED",
                f"Regular checkup for {first_name}",
                f"Follow-up appointment for {first_name} {last_name}",
                datetime.now().isoformat(),
                doctor_id
            ))
            appointments_created += 1
            print(f"✅ Created appointment for {first_name} {last_name}")
        
        conn.commit()
        
        # Verify the relationships
        cursor.execute("SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE doctor_id = ?", (doctor_id,))
        num_patients_for_doctor = cursor.fetchone()[0]

        print(f"\n🎉 SUCCESS! Doctor {doctor_id} now has {num_patients_for_doctor} patients:")
        cursor.execute("""
            SELECT p.first_name, p.last_name, p.id
            FROM patients p
            JOIN appointments a ON p.id = a.patient_id
            WHERE a.doctor_id = ?
            GROUP BY p.id
        """, (doctor_id,))
        for p_first, p_last, p_id in cursor.fetchall():
            print(f"  - {p_first} {p_last} (ID: {p_id})")

        print(f"\n📊 Summary:")
        print(f"  - Doctor ID: {doctor_id}")
        print(f"  - Total appointments: {num_patients_for_doctor}")
        print(f"  - New appointments created: {appointments_created}")
        print("\n✅ Appointments created in main database!")
        print("The appointments page should now display patients.")

        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    create_appointments_main_db()
