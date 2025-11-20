-- Operations schema tables

-- Audit Logs table
CREATE TABLE IF NOT EXISTS ops.audit_logs (
  id             BIGSERIAL PRIMARY KEY,
  actor_user_id  UUID REFERENCES core.users(user_id),
  action         TEXT NOT NULL,
  entity         TEXT NOT NULL,
  entity_id      TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS ops.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES core.users(user_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Todos table
CREATE TABLE IF NOT EXISTS ops.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES core.users(user_id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Nurse Tasks table
CREATE TABLE IF NOT EXISTS ops.nurse_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  nurse_id UUID NOT NULL REFERENCES core.users(user_id),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ,
  completed_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Medication Administration Events table
CREATE TABLE IF NOT EXISTS ops.medication_administration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  medication_id UUID,
  nurse_id UUID NOT NULL REFERENCES core.users(user_id),
  action TEXT NOT NULL,
  reason TEXT,
  dose_given TEXT,
  route TEXT,
  administered_at TIMESTAMPTZ DEFAULT now(),
  comments TEXT
);

-- Blocked Time Slots table
CREATE TABLE IF NOT EXISTS ops.blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES core.users(user_id),
  schedule_id UUID,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  block_type TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN,
  recurrence_pattern JSONB,
  recurrence_end_date DATE,
  is_active BOOLEAN,
  created_by UUID NOT NULL REFERENCES core.users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Message Attachments table
CREATE TABLE IF NOT EXISTS ops.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES ehr.messages(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  fhir_binary_id TEXT
);

-- Patient Medications table
CREATE TABLE IF NOT EXISTS ops.patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  prescription_id UUID REFERENCES ehr.prescriptions(id),
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN,
  is_discontinued BOOLEAN,
  discontinued_date DATE,
  discontinued_reason TEXT,
  prescribed_by UUID NOT NULL REFERENCES core.users(user_id),
  prescribed_date DATE NOT NULL,
  instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Prescription Reminders table
CREATE TABLE IF NOT EXISTS ops.prescription_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  prescription_id UUID NOT NULL REFERENCES ehr.prescriptions(id),
  title TEXT NOT NULL,
  subtitle TEXT,
  message TEXT,
  reminder_time TIMESTAMPTZ NOT NULL,
  repeat_pattern TEXT,
  priority TEXT,
  is_active BOOLEAN,
  is_acknowledged BOOLEAN,
  acknowledged_at TIMESTAMPTZ,
  send_email BOOLEAN,
  send_sms BOOLEAN,
  send_push BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Prescription Refills table
CREATE TABLE IF NOT EXISTS ops.prescription_refills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES ehr.prescriptions(id),
  pharmacy_id UUID NOT NULL,
  refill_number INTEGER NOT NULL,
  refill_date TIMESTAMPTZ NOT NULL,
  quantity_dispensed INTEGER NOT NULL,
  days_supply INTEGER,
  dispensed_by TEXT,
  dispensed_by_id UUID,
  price FLOAT,
  insurance_covered_amount FLOAT,
  patient_paid_amount FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Pharmacy Prescription Prices table
CREATE TABLE IF NOT EXISTS ops.pharmacy_prescription_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL,
  prescription_id UUID NOT NULL REFERENCES ehr.prescriptions(id),
  is_available BOOLEAN,
  stock_quantity INTEGER,
  last_stock_check TIMESTAMPTZ,
  unit_price FLOAT NOT NULL,
  total_price FLOAT NOT NULL,
  currency TEXT,
  discount_percent FLOAT,
  discount_amount FLOAT,
  final_price FLOAT NOT NULL,
  insurance_accepted BOOLEAN,
  insurance_coverage_percent FLOAT,
  estimated_copay FLOAT,
  generic_available BOOLEAN,
  generic_price FLOAT,
  price_valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Lab Equipment Instruments table
CREATE TABLE IF NOT EXISTS ops.lab_equipment_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  calibration_due TIMESTAMPTZ,
  maintenance_due TIMESTAMPTZ,
  settings JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID
);

-- Radiology Templates table
CREATE TABLE IF NOT EXISTS ops.radiology_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  modality TEXT NOT NULL,
  body_part TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  author_id UUID REFERENCES core.users(user_id),
  created_date DATE NOT NULL,
  last_modified DATE NOT NULL,
  usage_count INTEGER,
  is_private BOOLEAN,
  is_favorite BOOLEAN,
  content JSONB NOT NULL,
  tags JSONB
);

-- Radiology Worklist Assignments table
CREATE TABLE IF NOT EXISTS ops.radiology_worklist_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES ehr.radiology_studies(id),
  assigned_radiologist_id UUID REFERENCES core.users(user_id),
  reading_status TEXT NOT NULL,
  critical_flag BOOLEAN,
  tags JSONB,
  preliminary_findings TEXT,
  image_count INTEGER,
  series_count INTEGER,
  study_size TEXT,
  protocol_name TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  turnaround_time TEXT,
  estimated_read_time TEXT
);

-- FHIR Resources table
CREATE TABLE IF NOT EXISTS ops.fhir_resources (
  key TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_created ON ops.audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON ops.audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON ops.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON ops.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON ops.todos (user_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON ops.todos (status);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_patient_id ON ops.nurse_tasks (patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_nurse_id ON ops.nurse_tasks (nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_status ON ops.nurse_tasks (status);
CREATE INDEX IF NOT EXISTS idx_medication_events_patient_id ON ops.medication_administration_events (patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_events_nurse_id ON ops.medication_administration_events (nurse_id);
CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_doctor_id ON ops.blocked_time_slots (doctor_id);
CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_start ON ops.blocked_time_slots (start_datetime);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON ops.message_attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_patient_id ON ops.patient_medications (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_prescription_id ON ops.patient_medications (prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_reminders_patient_id ON ops.prescription_reminders (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_reminders_prescription_id ON ops.prescription_reminders (prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_refills_prescription_id ON ops.prescription_refills (prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_prescription_prices_prescription_id ON ops.pharmacy_prescription_prices (prescription_id);
CREATE INDEX IF NOT EXISTS idx_lab_equipment_instruments_instrument_id ON ops.lab_equipment_instruments (instrument_id);
CREATE INDEX IF NOT EXISTS idx_radiology_templates_author_id ON ops.radiology_templates (author_id);
CREATE INDEX IF NOT EXISTS idx_radiology_worklist_assignments_study_id ON ops.radiology_worklist_assignments (study_id);
CREATE INDEX IF NOT EXISTS idx_radiology_worklist_assignments_radiologist_id ON ops.radiology_worklist_assignments (assigned_radiologist_id);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_resource_type ON ops.fhir_resources (resource_type);
