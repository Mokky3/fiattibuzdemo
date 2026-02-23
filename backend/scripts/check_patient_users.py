#!/usr/bin/env python3
"""
Check what patient users exist in the database.
"""
import sqlite3

def check_patient_users():
    """Check patient users in the database."""
    
    conn = sqlite3.connect('../ehr.db')
    cursor = conn.cursor()
    
    try:
        # Check users with patient role
        cursor.execute('SELECT id, email, role FROM users WHERE role = "patient"')
        patients = cursor.fetchall()
        
        print('Patient users in database:')
        for patient in patients:
            print(f'  - ID: {patient[0]}, Email: {patient[1]}, Role: {patient[2]}')
        
        # Check patient table
        cursor.execute('SELECT id, user_id, first_name, last_name, email FROM patients LIMIT 5')
        patient_records = cursor.fetchall()
        
        print('\nPatient records in database:')
        for record in patient_records:
            print(f'  - ID: {record[0]}, User ID: {record[1]}, Name: {record[2]} {record[3]}, Email: {record[4]}')
        
        # Check if there are any users that could be patients
        cursor.execute('SELECT id, email, role FROM users LIMIT 10')
        all_users = cursor.fetchall()
        
        print('\nAll users in database:')
        for user in all_users:
            print(f'  - ID: {user[0]}, Email: {user[1]}, Role: {user[2]}')
            
    finally:
        conn.close()

if __name__ == "__main__":
    check_patient_users()
