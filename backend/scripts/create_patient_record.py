#!/usr/bin/env python3
"""
Create a patient record for the patient@example.com user.
"""
import sqlite3
import uuid

def create_patient_record():
    """Create a patient record for patient@example.com user."""
    
    conn = sqlite3.connect('../ehr.db')
    cursor = conn.cursor()
    
    try:
        # Get the patient user ID
        cursor.execute('SELECT id FROM users WHERE email = "patient@example.com" AND role = "PATIENT"')
        user_result = cursor.fetchone()
        
        if not user_result:
            print("❌ Patient user not found!")
            return False
        
        user_id = user_result[0]
        print(f"✅ Found patient user: {user_id}")
        
        # Check if patient record already exists
        cursor.execute('SELECT id FROM patients WHERE user_id = ?', (user_id,))
        existing = cursor.fetchone()
        
        if existing:
            print(f"✅ Patient record already exists: {existing[0]}")
            return True
        
        # Create patient record
        patient_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO patients (
                id, user_id, first_name, last_name, email, phone, 
                gender, date_of_birth, address, medical_record_number,
                national_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ''', (
            patient_id,
            user_id,
            'John',  # first_name
            'Patient',  # last_name
            'patient@example.com',  # email
            '+1234567890',  # phone
            'male',  # gender
            '1990-01-01',  # date_of_birth
            '123 Main St, City, State',  # address
            f'MRN-{patient_id[:8].upper()}',  # medical_record_number
            f'ID{patient_id[:12].upper()}'  # national_id
        ))
        
        conn.commit()
        print(f"✅ Created patient record: {patient_id}")
        
        # Verify the record was created
        cursor.execute('SELECT id, user_id, first_name, last_name FROM patients WHERE user_id = ?', (user_id,))
        record = cursor.fetchone()
        if record:
            print(f"✅ Verified patient record: {record}")
            return True
        else:
            print("❌ Failed to create patient record")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Creating patient record for patient@example.com...")
    success = create_patient_record()
    if success:
        print("\n🎉 Patient record created successfully!")
    else:
        print("\n❌ Failed to create patient record!")
