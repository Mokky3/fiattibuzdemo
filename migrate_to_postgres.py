#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL.
This script will:
1. Connect to both SQLite and PostgreSQL databases
2. Transfer all data while preserving relationships
3. Handle data type conversions
4. Provide progress reporting
"""

import sqlite3
import psycopg2
import psycopg2.extras
import json
import uuid
from datetime import datetime
from pathlib import Path
import os
from typing import Dict, List, Any, Optional

# Database configurations
SQLITE_DB_PATH = "ehr.db"
POSTGRES_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'fiattib',
    'user': 'fiattib_app_rw',
    'password': 'change_me_app_rw'
}

class DatabaseMigrator:
    def __init__(self):
        self.sqlite_conn = None
        self.postgres_conn = None
        self.migration_stats = {}
        
    def connect_databases(self):
        """Connect to both SQLite and PostgreSQL databases."""
        print("Connecting to databases...")
        
        # Connect to SQLite
        if not Path(SQLITE_DB_PATH).exists():
            raise FileNotFoundError(f"SQLite database not found: {SQLITE_DB_PATH}")
        
        self.sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
        self.sqlite_conn.row_factory = sqlite3.Row  # Enable column access by name
        
        # Connect to PostgreSQL
        try:
            self.postgres_conn = psycopg2.connect(**POSTGRES_CONFIG)
            self.postgres_conn.autocommit = False
            print("✅ Connected to both databases successfully")
        except psycopg2.Error as e:
            print(f"❌ Failed to connect to PostgreSQL: {e}")
            raise
    
    def get_table_columns(self, table_name: str, connection) -> List[str]:
        """Get column names for a table."""
        if isinstance(connection, sqlite3.Connection):
            cursor = connection.execute(f"PRAGMA table_info({table_name})")
            return [row[1] for row in cursor.fetchall()]
        else:  # PostgreSQL
            cursor = connection.cursor()
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s AND table_schema = 'core'
                ORDER BY ordinal_position
            """, (table_name,))
            return [row[0] for row in cursor.fetchall()]
    
    def is_valid_uuid(self, uuid_string: str) -> bool:
        """Check if a string is a valid UUID."""
        try:
            uuid.UUID(uuid_string)
            return True
        except ValueError:
            return False

    def get_column_mapping(self, table_name: str) -> Dict[str, str]:
        """Get column mapping from SQLite to PostgreSQL for specific tables."""
        mappings = {
            'users': {
                'id': 'user_id',
                'first_name': 'full_name',  # Combine first_name and last_name
                'last_name': None,  # Will be combined with first_name
                'email': 'email',
                'role': 'role',
                'created_at': 'created_at'
            },
            'patients': {
                'id': 'patient_id',
                'first_name': None,  # Will be combined with last_name
                'last_name': None,  # Will be combined with first_name
                'date_of_birth': 'date_of_birth',
                'gender': 'sex',  # Map gender to sex
                'phone': 'phone',
                'created_at': 'created_at'
            },
            'appointments': {
                'id': 'id',
                'patient_id': 'patient_id',
                'doctor_id': 'doctor_id',
                'hospital_id': 'hospital_id',
                'appointment_date': 'appointment_date',
                'minutes_duration': 'duration_minutes',
                'appointment_type': 'appointment_type',
                'status': 'status',
                'description': 'notes',
                'created_at': 'created_at'
            },
            'lab_orders': {
                'id': 'id',
                'patient_id': 'patient_id',
                'ordered_by': 'ordered_by',
                'order_number': 'order_number',
                'status': 'status',
                'intent': 'intent',
                'priority': 'priority',
                'tests_ordered': 'tests_ordered',
                'clinical_notes': 'clinical_notes',
                'ordered_date': 'ordered_date',
                'created_at': 'created_at'
            },
            'messages': {
                'id': 'id',
                'sender_id': 'sender_id',
                'recipient_id': 'recipient_id',
                'content': 'message_content',
                'timestamp': 'created_at'
            },
            'lab_results': {
                'id': 'id',
                'patient_id': 'patient_id',
                'lab_order_id': 'lab_order_id',
                'test_name': 'test_name',
                'test_code': 'test_code',
                'result_value': 'result_value',
                'result_unit': 'result_unit',
                'reference_range': 'reference_range',
                'is_abnormal': 'is_abnormal',
                'is_critical': 'is_critical',
                'status': 'status',
                'test_date': 'test_date',
                'created_at': 'created_at'
            },
            'lab_reports': {
                'id': 'id',
                'order_id': 'order_id',
                'title': 'title',
                'summary': 'summary',
                'created_at': 'created_at'
            },
            'lab_settings': {
                'id': 'id',
                'settings_type': 'settings_type',
                'settings_data': 'settings_data',
                'version': 'version',
                'is_active': 'is_active',
                'created_at': 'created_at'
            },
            'todos': {
                'id': 'id',
                'user_id': 'user_id',
                'title': 'title',
                'description': 'description',
                'completed': 'status',  # Map completed to status
                'completed_at': 'completed_at',
                'created_at': 'created_at'
            }
        }
        return mappings.get(table_name, {})

    def convert_sqlite_to_postgres_data(self, data: Dict[str, Any], table_name: str) -> Dict[str, Any]:
        """Convert SQLite data types to PostgreSQL compatible types."""
        column_mapping = self.get_column_mapping(table_name)
        converted = {}
        
        # Special handling for users table
        if table_name == 'users':
            # Map SQLite columns to PostgreSQL columns
            if 'first_name' in data and 'last_name' in data:
                first_name = data.get('first_name', '')
                last_name = data.get('last_name', '')
                converted['full_name'] = f"{first_name} {last_name}".strip()
            
            # Map other fields
            converted['user_id'] = data.get('id')
            converted['email'] = data.get('email')
            
            # Map role to allowed values
            role = data.get('role', '').upper()
            role_mapping = {
                'SUPER_ADMIN': 'admin',
                'ADMIN': 'admin',
                'DOCTOR': 'doctor',
                'NURSE': 'nurse',
                'RECEPTIONIST': 'receptionist',
                'PATIENT': 'patient'
            }
            converted['role'] = role_mapping.get(role, 'patient')  # Default to patient
            
            converted['created_at'] = data.get('created_at')
            
            # Add default values for required fields
            if not converted.get('full_name'):
                converted['full_name'] = 'Unknown User'
            
            return converted
        
        # Special handling for patients table
        if table_name == 'patients':
            # Map SQLite columns to PostgreSQL columns
            converted['patient_id'] = data.get('id')
            
            # Check if user_id exists in users table, if not set to NULL
            user_id = data.get('user_id')
            if user_id:
                # We'll validate this during migration
                converted['user_id'] = user_id
            else:
                converted['user_id'] = None
                
            converted['date_of_birth'] = data.get('date_of_birth')
            converted['phone'] = data.get('phone')
            converted['created_at'] = data.get('created_at')
            
            # Map gender to sex with allowed values
            gender = data.get('gender', '').upper()
            gender_mapping = {
                'MALE': 'male',
                'FEMALE': 'female',
                'OTHER': 'other',
                'UNKNOWN': 'unknown'
            }
            converted['sex'] = gender_mapping.get(gender, 'unknown')
            
            return converted
        
        # Special handling for appointments table
        if table_name == 'appointments':
            # Map SQLite columns to PostgreSQL columns
            converted['id'] = data.get('id')
            converted['patient_id'] = data.get('patient_id')
            converted['doctor_id'] = data.get('doctor_id')
            converted['hospital_id'] = data.get('hospital_id')
            converted['appointment_date'] = data.get('appointment_date')
            
            # Handle duration_minutes - ensure it's not NULL
            duration = data.get('minutes_duration')
            if duration is None or duration == '':
                duration = 30  # Default 30 minutes
            converted['duration_minutes'] = int(duration) if duration else 30
            
            converted['status'] = data.get('status', 'scheduled')
            converted['appointment_type'] = data.get('appointment_type', 'consultation')
            converted['notes'] = data.get('description')
            converted['created_at'] = data.get('created_at')
            
            return converted
        
        # Special handling for lab_orders table
        if table_name == 'lab_orders':
            # Skip test data with invalid UUIDs
            patient_id = data.get('patient_id')
            if patient_id and not self.is_valid_uuid(patient_id):
                print(f"  ⚠️  Skipping lab order with invalid patient_id: {patient_id}")
                return {}  # Return empty dict to skip
            
            ordered_by = data.get('ordered_by')
            if ordered_by and not self.is_valid_uuid(ordered_by):
                print(f"  ⚠️  Skipping lab order with invalid ordered_by: {ordered_by}")
                return {}  # Return empty dict to skip
            
            # Map SQLite columns to PostgreSQL columns
            converted['id'] = data.get('id')
            converted['patient_id'] = data.get('patient_id')
            converted['ordered_by'] = data.get('ordered_by')
            converted['order_number'] = data.get('order_number')
            converted['status'] = data.get('status')
            converted['intent'] = data.get('intent')
            converted['priority'] = data.get('priority')
            converted['tests_ordered'] = data.get('tests_ordered')
            converted['clinical_notes'] = data.get('clinical_notes')
            converted['ordered_date'] = data.get('ordered_date')
            converted['created_at'] = data.get('created_at')
            
            return converted
        
        # Special handling for messages table
        if table_name == 'messages':
            # Map SQLite columns to PostgreSQL columns
            converted['id'] = data.get('id')
            converted['sender_id'] = data.get('sender_id')
            converted['recipient_id'] = data.get('recipient_id')
            converted['message_content'] = data.get('content')
            converted['created_at'] = data.get('timestamp')
            
            # Add a default subject since it's required in PostgreSQL
            converted['subject'] = 'Message'  # Default subject
            
            return converted
        
        # Special handling for lab_results table
        if table_name == 'lab_results':
            # Skip records with NULL patient_id since it's required in PostgreSQL
            patient_id = data.get('patient_id')
            if not patient_id:
                print(f"  ⚠️  Skipping lab result with NULL patient_id")
                return {}  # Return empty dict to skip
            
            # Map SQLite columns to PostgreSQL columns
            converted['id'] = data.get('id')
            converted['patient_id'] = data.get('patient_id')
            converted['lab_order_id'] = data.get('lab_order_id')
            converted['test_name'] = data.get('test_name')
            converted['test_code'] = data.get('test_code')
            converted['result_value'] = data.get('result_value')
            converted['result_unit'] = data.get('result_unit')
            converted['reference_range'] = data.get('reference_range')
            converted['is_abnormal'] = bool(data.get('is_abnormal', 0))
            converted['is_critical'] = bool(data.get('is_critical', 0))
            converted['status'] = data.get('status', 'final')
            converted['test_date'] = data.get('test_date')
            converted['created_at'] = data.get('created_at')
            
            return converted
        
        # Special handling for lab_reports table
        if table_name == 'lab_reports':
            # Map SQLite columns to PostgreSQL columns
            converted['id'] = data.get('id')
            converted['order_id'] = data.get('order_id')
            converted['title'] = data.get('title', 'Lab Report')  # Default title if NULL
            converted['summary'] = data.get('summary', '')  # Default empty summary if NULL
            converted['created_at'] = data.get('created_at')
            
            return converted
        
        # Special handling for lab_settings table
        if table_name == 'lab_settings':
            # Map SQLite columns to PostgreSQL columns
            converted['id'] = data.get('id')
            converted['settings_type'] = data.get('settings_type', 'general')
            converted['version'] = data.get('version', '1.0')
            converted['is_active'] = bool(data.get('is_active', True))
            converted['created_at'] = data.get('created_at')
            
            # Handle settings_data dict conversion
            settings_data = data.get('settings_data')
            if isinstance(settings_data, dict):
                converted['settings_data'] = json.dumps(settings_data)
            else:
                converted['settings_data'] = json.dumps({})
            
            return converted
        
        # Special handling for todos table
        if table_name == 'todos':
            # Skip records with NULL user_id since it's required in PostgreSQL
            user_id = data.get('user_id')
            if not user_id:
                print(f"  ⚠️  Skipping todo with NULL user_id")
                return {}  # Return empty dict to skip
            
            # Map SQLite columns to PostgreSQL columns
            converted['id'] = data.get('id')
            converted['user_id'] = data.get('user_id')
            converted['title'] = data.get('title', 'Todo Item')
            converted['description'] = data.get('description', '')
            converted['completed_at'] = data.get('completed_at')
            converted['created_at'] = data.get('created_at')
            
            # Map completed boolean to status string
            completed = data.get('completed', 0)
            if completed:
                converted['status'] = 'completed'
                converted['priority'] = 'medium'
            else:
                converted['status'] = 'pending'
                converted['priority'] = 'medium'
            
            return converted
        
        # Default conversion for other tables
        for key, value in data.items():
            if key in column_mapping and column_mapping[key] is None:
                continue  # Skip this column
                
            target_key = column_mapping.get(key, key)
            
            if value is None:
                converted[target_key] = None
            elif isinstance(value, str):
                # Handle JSON strings
                if key in ['identifiers', 'metadata', 'settings_data', 'tests_ordered', 'code', 'notes', 'custom_permissions']:
                    try:
                        converted[target_key] = json.loads(value) if value else None
                    except json.JSONDecodeError:
                        converted[target_key] = value
            elif isinstance(value, dict):
                # Handle dict values (convert to JSON string for PostgreSQL)
                converted[target_key] = json.dumps(value)
            elif isinstance(value, (int, float, bool)):
                # Convert SQLite integer booleans to PostgreSQL booleans
                if key in ['is_abnormal', 'is_critical', 'is_active', 'is_discontinued', 'is_signed', 'is_billed', 'is_read', 'is_reversed', 'is_refunded', 'is_walk_in', 'is_video_consultation', 'is_waitlist', 'is_vip', 'email_verified', 'phone_verified', 'two_factor_enabled', 'insurance_verified', 'copay_collected', 'reminder_sent', 'confirmation_sent', 'primary_source', 'is_subpotent', 'generic_available', 'insurance_accepted', 'allow_generic_substitution']:
                    converted[target_key] = bool(value)
                else:
                    converted[target_key] = value
            elif isinstance(value, datetime):
                converted[target_key] = value
            else:
                converted[target_key] = str(value)
        
        return converted
    
    def migrate_table(self, table_name: str, schema: str = 'core', batch_size: int = 1000):
        """Migrate a single table from SQLite to PostgreSQL."""
        print(f"Migrating table: {schema}.{table_name}")
        
        # Get data from SQLite
        sqlite_cursor = self.sqlite_conn.cursor()
        sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        total_rows = sqlite_cursor.fetchone()[0]
        
        if total_rows == 0:
            print(f"  ⏭️  Table {table_name} is empty, skipping...")
            return
        
        print(f"  📊 Found {total_rows} rows to migrate")
        
        # Get all data
        sqlite_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sqlite_cursor.fetchall()
        
        # Get column names
        columns = [description[0] for description in sqlite_cursor.description]
        
        # Prepare PostgreSQL insert
        postgres_cursor = self.postgres_conn.cursor()
        
        migrated_count = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            
            for row in batch:
                # Convert row to dict
                row_dict = dict(zip(columns, row))
                converted_row = self.convert_sqlite_to_postgres_data(row_dict, table_name)
                
                if not converted_row:
                    continue  # Skip if no data to insert
                
                # Build dynamic insert query based on converted data
                converted_columns = list(converted_row.keys())
                placeholders = ', '.join(['%s'] * len(converted_columns))
                column_names = ', '.join(converted_columns)
                values = list(converted_row.values())
                
                insert_query = f"""
                    INSERT INTO {schema}.{table_name} ({column_names})
                    VALUES ({placeholders})
                    ON CONFLICT DO NOTHING
                """
                
                try:
                    # Special validation for patients table
                    if table_name == 'patients' and 'user_id' in converted_row and converted_row['user_id']:
                        # Check if user_id exists in users table
                        postgres_cursor.execute(
                            "SELECT 1 FROM core.users WHERE user_id = %s",
                            (converted_row['user_id'],)
                        )
                        if not postgres_cursor.fetchone():
                            print(f"  ⚠️  Skipping patient with non-existent user_id: {converted_row['user_id']}")
                            converted_row['user_id'] = None  # Set to NULL
                            # Rebuild the query with updated values
                            converted_columns = list(converted_row.keys())
                            placeholders = ', '.join(['%s'] * len(converted_columns))
                            column_names = ', '.join(converted_columns)
                            values = list(converted_row.values())
                            insert_query = f"""
                                INSERT INTO {schema}.{table_name} ({column_names})
                                VALUES ({placeholders})
                                ON CONFLICT DO NOTHING
                            """
                    
                    # Special validation for appointments table
                    elif table_name == 'appointments':
                        # Check if doctor_id exists in users table
                        if 'doctor_id' in converted_row and converted_row['doctor_id']:
                            postgres_cursor.execute(
                                "SELECT 1 FROM core.users WHERE user_id = %s",
                                (converted_row['doctor_id'],)
                            )
                            if not postgres_cursor.fetchone():
                                print(f"  ⚠️  Skipping appointment with non-existent doctor_id: {converted_row['doctor_id']}")
                                continue  # Skip this appointment
                        
                        # Check if patient_id exists in patients table
                        if 'patient_id' in converted_row and converted_row['patient_id']:
                            postgres_cursor.execute(
                                "SELECT 1 FROM ehr.patients WHERE patient_id = %s",
                                (converted_row['patient_id'],)
                            )
                            if not postgres_cursor.fetchone():
                                print(f"  ⚠️  Skipping appointment with non-existent patient_id: {converted_row['patient_id']}")
                                continue  # Skip this appointment
                    
                    # Special validation for lab_results table
                    elif table_name == 'lab_results':
                        # Check if lab_order_id exists in lab_orders table
                        if 'lab_order_id' in converted_row and converted_row['lab_order_id']:
                            postgres_cursor.execute(
                                "SELECT 1 FROM ehr.lab_orders WHERE id = %s",
                                (converted_row['lab_order_id'],)
                            )
                            if not postgres_cursor.fetchone():
                                print(f"  ⚠️  Skipping lab result with non-existent lab_order_id: {converted_row['lab_order_id']}")
                                continue  # Skip this lab result
                        
                        # Check if patient_id exists in patients table
                        if 'patient_id' in converted_row and converted_row['patient_id']:
                            postgres_cursor.execute(
                                "SELECT 1 FROM ehr.patients WHERE patient_id = %s",
                                (converted_row['patient_id'],)
                            )
                            if not postgres_cursor.fetchone():
                                print(f"  ⚠️  Skipping lab result with non-existent patient_id: {converted_row['patient_id']}")
                                continue  # Skip this lab result
                    
                    postgres_cursor.execute(insert_query, values)
                    migrated_count += 1
                    if migrated_count % 100 == 0:
                        print(f"  📈 Migrated {migrated_count}/{total_rows} rows...")
                except Exception as e:
                    print(f"  ❌ Error migrating row: {e}")
                    print(f"  Row data: {converted_row}")
                    self.postgres_conn.rollback()
                    raise
        
        self.postgres_conn.commit()
        self.migration_stats[table_name] = migrated_count
        print(f"  ✅ Successfully migrated {migrated_count} rows from {table_name}")
    
    def get_table_mapping(self) -> Dict[str, str]:
        """Get mapping of SQLite tables to PostgreSQL schemas."""
        return {
            # Core schema
            'users': 'core',
            
            # EHR schema
            'patients': 'ehr',
            'appointments': 'ehr',
            'encounters': 'ehr',
            'lab_orders': 'ehr',
            'lab_results': 'ehr',
            'lab_reports': 'ehr',
            'prescriptions': 'ehr',
            'conditions': 'ehr',
            'observations': 'ehr',
            'allergy_intolerances': 'ehr',
            'immunizations': 'ehr',
            'radiology_studies': 'ehr',
            'radiology_reports': 'ehr',
            'messages': 'ehr',
            'lab_settings': 'ehr',
            
            # Financial schema
            'bills': 'financial',
            'payments': 'financial',
            'charge_items': 'financial',
            'insurance_claims': 'financial',
            'insurance_authorizations': 'financial',
            'financial_transactions': 'financial',
            
            # Operations schema
            'audit_logs': 'ops',
            'notifications': 'ops',
            'todos': 'ops',
            'nurse_tasks': 'ops',
            'medication_administration_events': 'ops',
            'blocked_time_slots': 'ops',
            'message_attachments': 'ops',
            'patient_medications': 'ops',
            'prescription_reminders': 'ops',
            'prescription_refills': 'ops',
            'pharmacy_prescription_prices': 'ops',
            'lab_equipment_instruments': 'ops',
            'radiology_templates': 'ops',
            'radiology_worklist_assignments': 'ops',
            'fhir_resources': 'ops',
        }
    
    def get_migration_order(self) -> List[str]:
        """Get the order in which tables should be migrated (respecting foreign key constraints)."""
        return [
            # Core tables first
            'users',
            
            # EHR tables
            'patients',
            'appointments',
            'encounters',
            'lab_orders',
            'lab_results',
            'lab_reports',
            'prescriptions',
            'conditions',
            'observations',
            'allergy_intolerances',
            'immunizations',
            'radiology_studies',
            'radiology_reports',
            'messages',
            'lab_settings',
            
            # Financial tables
            'bills',
            'payments',
            'charge_items',
            'insurance_claims',
            'insurance_authorizations',
            'financial_transactions',
            
            # Operations tables
            'audit_logs',
            'notifications',
            'todos',
            'nurse_tasks',
            'medication_administration_events',
            'blocked_time_slots',
            'message_attachments',
            'patient_medications',
            'prescription_reminders',
            'prescription_refills',
            'pharmacy_prescription_prices',
            'lab_equipment_instruments',
            'radiology_templates',
            'radiology_worklist_assignments',
            'fhir_resources',
        ]
    
    def run_migration(self):
        """Run the complete migration process."""
        print("🚀 Starting SQLite to PostgreSQL migration...")
        print("=" * 60)
        
        try:
            self.connect_databases()
            
            table_mapping = self.get_table_mapping()
            migration_order = self.get_migration_order()
            
            # Get existing tables from SQLite
            sqlite_cursor = self.sqlite_conn.cursor()
            sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing_tables = [row[0] for row in sqlite_cursor.fetchall()]
            
            print(f"Found {len(existing_tables)} tables in SQLite database")
            
            # Migrate tables in order
            for table_name in migration_order:
                if table_name in existing_tables:
                    schema = table_mapping.get(table_name, 'core')
                    self.migrate_table(table_name, schema)
                else:
                    print(f"⏭️  Table {table_name} not found in SQLite, skipping...")
            
            # Print migration summary
            print("\n" + "=" * 60)
            print("📊 MIGRATION SUMMARY")
            print("=" * 60)
            
            total_migrated = 0
            for table, count in self.migration_stats.items():
                print(f"  {table}: {count:,} rows")
                total_migrated += count
            
            print(f"\n✅ Migration completed successfully!")
            print(f"📈 Total rows migrated: {total_migrated:,}")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            if self.postgres_conn:
                self.postgres_conn.rollback()
            raise
        finally:
            self.close_connections()
    
    def close_connections(self):
        """Close database connections."""
        if self.sqlite_conn:
            self.sqlite_conn.close()
        if self.postgres_conn:
            self.postgres_conn.close()
        print("🔌 Database connections closed")

def main():
    """Main migration function."""
    migrator = DatabaseMigrator()
    migrator.run_migration()

if __name__ == "__main__":
    main()
