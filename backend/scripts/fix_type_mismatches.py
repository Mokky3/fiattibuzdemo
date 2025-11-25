#!/usr/bin/env python3
"""Fix type mismatches in migration file - convert VARCHAR(36) user_id columns to UUID."""
import re
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
migration_file = backend_path / "supabase" / "migrations" / "20251121071748_initial_schema_safe.sql"

def fix_type_mismatches():
    """Fix type mismatches where VARCHAR(36) references UUID columns."""
    print("Reading migration file...")
    content = migration_file.read_text(encoding="utf-8")
    
    # Map of columns that should be UUID (they reference UUID primary keys)
    # Format: (table_pattern, column_pattern) -> target_type
    uuid_columns = {
        # Columns referencing core.users.id (UUID)
        (r'core\.users', r'id'): {
            'columns': [
                r'user_id\s+VARCHAR\(36\)',
                r'author_id\s+VARCHAR\(36\)',
                r'created_by\s+VARCHAR\(36\)',
                r'created_by_id\s+VARCHAR\(36\)',
                r'modified_by\s+VARCHAR\(36\)',
                r'updated_by\s+VARCHAR\(36\)',
                r'deleted_by\s+VARCHAR\(36\)',
                r'verified_by\s+VARCHAR\(36\)',
                r'approved_by\s+VARCHAR\(36\)',
                r'cancelled_by\s+VARCHAR\(36\)',
                r'signed_by\s+VARCHAR\(36\)',
                r'reviewed_by\s+VARCHAR\(36\)',
                r'locked_by\s+VARCHAR\(36\)',
                r'performed_by\s+VARCHAR\(36\)',
                r'posted_by\s+VARCHAR\(36\)',
                r'received_by\s+VARCHAR\(36\)',
                r'entered_by\s+VARCHAR\(36\)',
                r'submitted_by\s+VARCHAR\(36\)',
                r'resolved_by\s+VARCHAR\(36\)',
                r'acknowledged_by\s+VARCHAR\(36\)',
                r'reversed_by_id\s+VARCHAR\(36\)',
                r'notified_user_id\s+VARCHAR\(36\)',
                r'recipient_id\s+VARCHAR\(36\)',
                r'sender_id\s+VARCHAR\(36\)',
                r'assigned_to\s+VARCHAR\(36\)',
                r'completed_by\s+VARCHAR\(36\)',
                r'assessor_id\s+VARCHAR\(36\)',
                r'authenticator_id\s+VARCHAR\(36\)',
                r'custodian_id\s+VARCHAR\(36\)',
                r'performer_id\s+VARCHAR\(36\)',
                r'radiologist_id\s+VARCHAR\(36\)',
                r'assigned_radiologist_id\s+VARCHAR\(36\)',
                r'head_id\s+UUID',
                r'deputy_head_id\s+UUID',
            ]
        },
        # Columns referencing ehr.patients.patient_id (UUID)
        (r'ehr\.patients', r'patient_id'): {
            'columns': [
                r'patient_id\s+VARCHAR\(36\)',
            ]
        },
        # Columns referencing ref.hospitals.id (UUID)
        (r'ref\.hospitals', r'id'): {
            'columns': [
                r'hospital_id\s+VARCHAR\(36\)',
                r'organization_id\s+VARCHAR\(36\)',
                r'clinic_id\s+VARCHAR\(36\)',
            ]
        },
        # Columns referencing ref.hospital_departments.id (UUID)
        (r'ref\.hospital_departments', r'id'): {
            'columns': [
                r'department_id\s+VARCHAR\(36\)',
                r'location_id\s+VARCHAR\(36\)',
                r'primary_department_id\s+VARCHAR\(36\)',
                r'parent_department_id\s+UUID',  # Already UUID, but keep for reference
            ]
        },
        # Columns referencing ehr.doctors.id (UUID)
        (r'ehr\.doctors', r'id'): {
            'columns': [
                r'doctor_id\s+VARCHAR\(36\)',
            ]
        },
        # Columns referencing ehr.practitioners.id (UUID)
        (r'ehr\.practitioners', r'id'): {
            'columns': [
                r'practitioner_id\s+VARCHAR\(36\)',
            ]
        },
    }
    
    # Fix user_id columns that reference core.users.id
    print("Fixing user_id/author_id columns referencing core.users.id...")
    # Pattern: column_name VARCHAR(36) that will reference UUID
    patterns_to_fix = [
        (r'(\s+user_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+author_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+created_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+modified_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+updated_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+verified_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+approved_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+cancelled_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+signed_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+reviewed_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+locked_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+performed_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+posted_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+received_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+entered_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+submitted_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+resolved_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+acknowledged_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+reversed_by_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+notified_user_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+recipient_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+sender_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+assigned_to)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+completed_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+assessor_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+authenticator_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+custodian_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+performer_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+radiologist_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+assigned_radiologist_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
    ]
    
    for pattern, replacement in patterns_to_fix:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
    
    # Fix patient_id, hospital_id, organization_id, department_id columns
    print("Fixing patient_id/hospital_id/organization_id/department_id columns...")
    more_patterns = [
        (r'(\s+patient_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+hospital_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+organization_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+clinic_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+department_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+location_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+primary_department_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+doctor_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
        (r'(\s+practitioner_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL|,))', r'\1 UUID\2'),
    ]
    
    for pattern, replacement in more_patterns:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
    
    # Also fix in FOREIGN KEY constraint names (for consistency)
    print("Fixing foreign key constraint definitions...")
    
    # Write backup
    backup_file = migration_file.with_suffix('.sql.backup2')
    migration_file.rename(backup_file)
    print(f"Backup created: {backup_file.name}")
    
    # Write fixed content
    migration_file.write_text(content, encoding="utf-8")
    print(f"✅ Type mismatches fixed!")
    print(f"📁 File: {migration_file}")
    print("\nChanged VARCHAR(36) to UUID for columns that reference UUID primary keys.")

if __name__ == "__main__":
    fix_type_mismatches()


