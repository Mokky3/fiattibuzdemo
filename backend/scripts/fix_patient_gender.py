#!/usr/bin/env python3
"""
Fix the patient gender field to use uppercase enum values.
"""
import sqlite3

def fix_patient_gender():
    """Fix the patient gender field."""
    
    conn = sqlite3.connect('../ehr.db')
    cursor = conn.cursor()
    
    try:
        # Update the gender field to uppercase
        cursor.execute('UPDATE patients SET gender = "MALE" WHERE user_id = "62198172-d6ca-4a1e-a73e-b546ab33e46d"')
        conn.commit()
        
        # Verify the update
        cursor.execute('SELECT id, user_id, first_name, last_name, gender FROM patients WHERE user_id = "62198172-d6ca-4a1e-a73e-b546ab33e46d"')
        record = cursor.fetchone()
        print(f'✅ Updated patient record: {record}')
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Fixing patient gender field...")
    success = fix_patient_gender()
    if success:
        print("\n🎉 Patient gender fixed!")
    else:
        print("\n❌ Failed to fix patient gender!")
