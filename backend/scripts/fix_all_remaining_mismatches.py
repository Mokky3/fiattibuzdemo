#!/usr/bin/env python3
"""Fix all remaining foreign key type mismatches found by verification script."""
from pathlib import Path
import re

backend_path = Path(__file__).resolve().parent.parent
migration_file = backend_path / "supabase" / "migrations" / "20251121071748_initial_schema_safe.sql"

def fix_mismatches():
    """Fix all type mismatches using direct search and replace."""
    print("Reading migration file...")
    content = migration_file.read_text(encoding="utf-8")
    
    # Direct search and replace patterns
    # Format: (search_pattern, replacement, description)
    fixes = [
        # core.users.department_id: VARCHAR(36) → UUID (references ref.hospital_departments.id)
        (r'(\s+department_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)', r'\1 UUID\2', 'core.users.department_id'),
        
        # ehr.medical_records.vital_signs_id: UUID → VARCHAR(36) (references ehr.vital_signs.id)
        (r'(\s+vital_signs_id)\s+UUID(\s+(?:NOT NULL|NULL)?)', r'\1 VARCHAR(36)\2', 'vital_signs_id'),
        
        # ehr.lab_orders.encounter_id: VARCHAR(36) → UUID (references ehr.appointments.id)
        # But wait, let me check - lab_orders might reference encounters, not appointments
        # Actually, based on the error, it references appointments.id which is UUID
        # But we need to be careful - only fix lab_orders.encounter_id, not all encounter_id
        
        # ehr.medication_administrations.administered_by: VARCHAR(36) → UUID
        (r'(\s+administered_by)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)', r'\1 UUID\2', 'administered_by'),
        
        # ehr.lab_results.medical_record_id: UUID → VARCHAR(36)
        # ehr.care_plans.medical_record_id: UUID → VARCHAR(36)
        # ehr.document_references.medical_record_id: UUID → VARCHAR(36)
        # ehr.vital_signs.medical_record_id: UUID → VARCHAR(36)
        # ehr.clinical_impressions.medical_record_id: UUID → VARCHAR(36)
        # These all reference ehr.medical_records.id which is VARCHAR(36)
        # But we need to be careful - only fix these specific tables, not all medical_record_id
        
        # ehr.care_plans.encounter_id: VARCHAR(36) → UUID (references ehr.appointments.id)
        # ehr.document_references.encounter_id: VARCHAR(36) → UUID
        # ehr.clinical_impressions.encounter_id: VARCHAR(36) → UUID
        # ehr.prescriptions.encounter_id: VARCHAR(36) → UUID
        # But wait - these might reference encounters.id (VARCHAR) not appointments.id (UUID)
        # The verification script says they reference appointments.id, so they should be UUID
        
        # ehr.medical_history.recorded_by: VARCHAR(36) → UUID
        # Already fixed
        
        # ehr.vital_signs.measured_by: VARCHAR(36) → UUID
        # Already fixed
        
        # ops.department_stats.department_id: UUID → VARCHAR(36) (references ops.admin_departments.id)
        # Already fixed
        
        # ops.patient_medications.prescribed_by: VARCHAR(36) → UUID
        # Already fixed
        
        # financial.financial_transactions.reversed_by_id: UUID → VARCHAR(36) (self-reference)
        (r'(\s+reversed_by_id)\s+UUID(\s+(?:NOT NULL|NULL)?)', r'\1 VARCHAR(36)\2', 'reversed_by_id'),
        
        # ref.locations.department_id: VARCHAR(36) → UUID (references ref.hospital_departments.id)
        # Need to be careful - only fix ref.locations, not all department_id
    ]
    
    # More specific fixes that need table context
    specific_fixes = [
        # core.users table - department_id
        (r'(CREATE TABLE IF NOT EXISTS core\.users\s*\([^)]*?)(\s+department_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 UUID\3', 'core.users.department_id'),
        
        # ehr.lab_orders table - encounter_id (references appointments.id which is UUID)
        (r'(CREATE TABLE IF NOT EXISTS ehr\.lab_orders\s*\([^)]*?)(\s+encounter_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 UUID\3', 'ehr.lab_orders.encounter_id'),
        
        # ehr.care_plans table - encounter_id and medical_record_id
        (r'(CREATE TABLE IF NOT EXISTS ehr\.care_plans\s*\([^)]*?)(\s+encounter_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 UUID\3', 'ehr.care_plans.encounter_id'),
        (r'(CREATE TABLE IF NOT EXISTS ehr\.care_plans\s*\([^)]*?)(\s+medical_record_id)\s+UUID(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 VARCHAR(36)\3', 'ehr.care_plans.medical_record_id'),
        
        # ehr.document_references table
        (r'(CREATE TABLE IF NOT EXISTS ehr\.document_references\s*\([^)]*?)(\s+encounter_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 UUID\3', 'ehr.document_references.encounter_id'),
        (r'(CREATE TABLE IF NOT EXISTS ehr\.document_references\s*\([^)]*?)(\s+medical_record_id)\s+UUID(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 VARCHAR(36)\3', 'ehr.document_references.medical_record_id'),
        
        # ehr.clinical_impressions table
        (r'(CREATE TABLE IF NOT EXISTS ehr\.clinical_impressions\s*\([^)]*?)(\s+encounter_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 UUID\3', 'ehr.clinical_impressions.encounter_id'),
        (r'(CREATE TABLE IF NOT EXISTS ehr\.clinical_impressions\s*\([^)]*?)(\s+medical_record_id)\s+UUID(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 VARCHAR(36)\3', 'ehr.clinical_impressions.medical_record_id'),
        
        # ehr.prescriptions table - encounter_id
        (r'(CREATE TABLE IF NOT EXISTS ehr\.prescriptions\s*\([^)]*?)(\s+encounter_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 UUID\3', 'ehr.prescriptions.encounter_id'),
        
        # ehr.lab_results table - medical_record_id
        (r'(CREATE TABLE IF NOT EXISTS ehr\.lab_results\s*\([^)]*?)(\s+medical_record_id)\s+UUID(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 VARCHAR(36)\3', 'ehr.lab_results.medical_record_id'),
        
        # ehr.medical_records table - vital_signs_id
        (r'(CREATE TABLE IF NOT EXISTS ehr\.medical_records\s*\([^)]*?)(\s+vital_signs_id)\s+UUID(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 VARCHAR(36)\3', 'ehr.medical_records.vital_signs_id'),
        
        # ehr.vital_signs table - medical_record_id
        (r'(CREATE TABLE IF NOT EXISTS ehr\.vital_signs\s*\([^)]*?)(\s+medical_record_id)\s+UUID(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 VARCHAR(36)\3', 'ehr.vital_signs.medical_record_id'),
        
        # ref.locations table - department_id (references ref.hospital_departments.id which is UUID)
        (r'(CREATE TABLE IF NOT EXISTS ref\.locations\s*\([^)]*?)(\s+department_id)\s+VARCHAR\(36\)(\s+(?:NOT NULL|NULL)?)',
         r'\1\2 UUID\3', 'ref.locations.department_id'),
    ]
    
    changes_made = 0
    
    # Apply general fixes
    print("Applying general fixes...")
    for pattern, replacement, desc in fixes:
        matches = len(re.findall(pattern, content, re.IGNORECASE))
        if matches > 0:
            content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
            changes_made += matches
            print(f"  ✓ Fixed {desc}: {matches} occurrence(s)")
    
    # Apply specific fixes
    print("\nApplying specific table fixes...")
    for pattern, replacement, desc in specific_fixes:
        if re.search(pattern, content, re.MULTILINE | re.DOTALL | re.IGNORECASE):
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL | re.IGNORECASE)
            changes_made += 1
            print(f"  ✓ Fixed {desc}")
        else:
            print(f"  ⚠️  {desc} not found or already correct")
    
    # Write backup
    backup_file = migration_file.with_suffix('.sql.backup6')
    if migration_file.exists():
        migration_file.rename(backup_file)
        print(f"\nBackup created: {backup_file.name}")
    
    # Write fixed content
    migration_file.write_text(content, encoding="utf-8")
    print(f"\n✅ Fixed {changes_made} type mismatches!")
    print(f"📁 File: {migration_file}")

if __name__ == "__main__":
    fix_mismatches()
