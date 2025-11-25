#!/usr/bin/env python3
"""Fix all remaining VARCHAR(36) columns that should be UUID."""
import re
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
migration_file = backend_path / "supabase" / "migrations" / "20251121071748_initial_schema_safe.sql"

def fix_all_uuid_columns():
    """Fix all VARCHAR(36) columns that reference UUID primary keys."""
    print("Reading migration file...")
    content = migration_file.read_text(encoding="utf-8")
    
    # List of column patterns that should be UUID (they reference UUID tables)
    uuid_column_patterns = [
        # User references (core.users.id is UUID)
        (r'(\s+assigned_radiologist_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+radiologist_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+user_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+author_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+created_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+modified_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+updated_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+verified_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+approved_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+cancelled_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+signed_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+reviewed_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+locked_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+performed_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+posted_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+received_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+entered_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+submitted_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+resolved_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+acknowledged_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+reversed_by_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+notified_user_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+recipient_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+sender_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+assigned_to)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+completed_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+assessor_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+authenticator_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+custodian_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+performer_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+recorder_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+asserter_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+individual_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+dispensed_by_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+requesting_provider_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+servicing_provider_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+billing_provider_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+rendering_provider_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+referring_provider_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Patient references (ehr.patients.patient_id is UUID)
        (r'(\s+patient_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+current_patient_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Hospital/Organization references (ref.hospitals.id is UUID)
        (r'(\s+hospital_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+organization_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+clinic_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+performing_organization_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+requesting_organization_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+service_provider_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Department references (ref.hospital_departments.id is UUID)
        (r'(\s+department_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+location_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+primary_department_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+cost_center_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Doctor references (ehr.doctors.id is UUID)
        (r'(\s+doctor_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+ordered_by)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Practitioner references (ehr.practitioners.id is UUID)
        (r'(\s+practitioner_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Nurse references (ehr.nurses.id is VARCHAR(36) - keep as is)
        # But user_id in nurses should be UUID if it references core.users
        
        # Appointment references (ehr.appointments.id is UUID)
        (r'(\s+appointment_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+encounter_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Lab references
        (r'(\s+lab_order_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+order_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Prescription references (ehr.prescriptions.id is UUID)
        (r'(\s+prescription_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        
        # Medical record references
        (r'(\s+medical_record_id)\s+VARCHAR\(36\)', r'\1 UUID'),
        (r'(\s+vital_signs_id)\s+VARCHAR\(36\)', r'\1 UUID'),
    ]
    
    print("Fixing VARCHAR(36) columns to UUID...")
    changes_made = 0
    
    for pattern, replacement in uuid_column_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
            changes_made += len(matches)
            print(f"  Fixed {len(matches)} occurrences of {pattern}")
    
    # Also fix in table definitions with NOT NULL
    not_null_patterns = [
        (r'(\s+assigned_radiologist_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+radiologist_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+user_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+patient_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+hospital_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+organization_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+department_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+doctor_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+appointment_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
        (r'(\s+encounter_id)\s+VARCHAR\(36\)\s+NOT NULL', r'\1 UUID NOT NULL'),
    ]
    
    for pattern, replacement in not_null_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
            changes_made += len(matches)
            print(f"  Fixed {len(matches)} NOT NULL occurrences")
    
    # Write backup
    backup_file = migration_file.with_suffix('.sql.backup3')
    if migration_file.exists():
        migration_file.rename(backup_file)
        print(f"Backup created: {backup_file.name}")
    
    # Write fixed content
    migration_file.write_text(content, encoding="utf-8")
    print(f"\n✅ Fixed {changes_made} type mismatches!")
    print(f"📁 File: {migration_file}")

if __name__ == "__main__":
    fix_all_uuid_columns()


