-- Nurses and related tables schema
-- This file creates the nurses table and related structures for the EHR system

-- Create nurses table
CREATE TABLE IF NOT EXISTS ehr.nurses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(user_id) ON DELETE CASCADE,
    
    -- Professional information
    license_number TEXT UNIQUE NOT NULL,
    license_issuer TEXT,
    license_issued_date DATE,
    license_expiry_date DATE,
    
    -- Specialization
    primary_specialty TEXT NOT NULL CHECK (primary_specialty IN (
        'general', 'pediatric', 'emergency', 'icu', 'surgical', 
        'obstetric', 'psychiatric', 'geriatric', 'oncology', 'cardiac'
    )),
    secondary_specialties JSONB, -- Array of specialties
    role TEXT NOT NULL CHECK (role IN (
        'staff_nurse', 'charge_nurse', 'head_nurse', 'nurse_practitioner',
        'clinical_nurse_specialist', 'nurse_educator', 'nurse_manager'
    )),
    
    -- Certifications
    certifications JSONB, -- Array of certification objects
    
    -- Experience
    years_of_experience INTEGER,
    previous_positions JSONB, -- Array of previous work experience
    
    -- Skills
    clinical_skills JSONB, -- Array of skills
    languages_spoken JSONB, -- Array of languages with proficiency
    
    -- Work settings
    can_work_nights BOOLEAN DEFAULT TRUE,
    can_work_weekends BOOLEAN DEFAULT TRUE,
    preferred_shifts JSONB, -- Array of shift preferences
    
    -- Department assignments (simplified - using department name for now)
    primary_department_name TEXT, -- Store department name directly
    can_float BOOLEAN DEFAULT TRUE, -- Can work in multiple departments
    
    -- Performance
    rating DECIMAL(3,2), -- Average rating (1-5)
    rating_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for nurses table
CREATE INDEX IF NOT EXISTS idx_nurses_user_id ON ehr.nurses(user_id);
CREATE INDEX IF NOT EXISTS idx_nurses_license_number ON ehr.nurses(license_number);
CREATE INDEX IF NOT EXISTS idx_nurses_primary_specialty ON ehr.nurses(primary_specialty);
CREATE INDEX IF NOT EXISTS idx_nurses_role ON ehr.nurses(role);
CREATE INDEX IF NOT EXISTS idx_nurses_rating ON ehr.nurses(rating);
CREATE INDEX IF NOT EXISTS idx_nurses_can_work_nights ON ehr.nurses(can_work_nights);
CREATE INDEX IF NOT EXISTS idx_nurses_can_work_weekends ON ehr.nurses(can_work_weekends);

-- Create nurse_shift_assignments table
CREATE TABLE IF NOT EXISTS ehr.nurse_shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id UUID NOT NULL REFERENCES ehr.nurses(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL, -- Store department name directly for now
    
    -- Shift details
    shift_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'evening', 'night')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    
    -- Coverage
    is_overtime BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    replaced_nurse_id UUID REFERENCES ehr.nurses(id),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for nurse_shift_assignments
CREATE INDEX IF NOT EXISTS idx_nurse_shift_assignments_nurse_id ON ehr.nurse_shift_assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_shift_assignments_shift_date ON ehr.nurse_shift_assignments(shift_date);
CREATE INDEX IF NOT EXISTS idx_nurse_shift_assignments_shift_type ON ehr.nurse_shift_assignments(shift_type);
CREATE INDEX IF NOT EXISTS idx_nurse_shift_assignments_status ON ehr.nurse_shift_assignments(status);
CREATE INDEX IF NOT EXISTS idx_nurse_shift_assignments_department ON ehr.nurse_shift_assignments(department_name);

-- Create nurse_patient_assignments table
CREATE TABLE IF NOT EXISTS ehr.nurse_patient_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id UUID NOT NULL REFERENCES ehr.nurses(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id) ON DELETE CASCADE,
    
    -- Assignment details
    assignment_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'evening', 'night')),
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Care level
    acuity_level INTEGER CHECK (acuity_level >= 1 AND acuity_level <= 5), -- 1-5, patient care complexity
    special_instructions TEXT,
    
    -- Timestamps
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ
);

-- Create indexes for nurse_patient_assignments
CREATE INDEX IF NOT EXISTS idx_nurse_patient_assignments_nurse_id ON ehr.nurse_patient_assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_patient_assignments_patient_id ON ehr.nurse_patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_patient_assignments_assignment_date ON ehr.nurse_patient_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_nurse_patient_assignments_is_active ON ehr.nurse_patient_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_nurse_patient_assignments_acuity_level ON ehr.nurse_patient_assignments(acuity_level);

-- Create medication_administration_events table (if not exists in ops schema)
CREATE TABLE IF NOT EXISTS ehr.medication_administration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id) ON DELETE CASCADE,
    medication_id UUID, -- References patient_medications if exists
    nurse_id UUID NOT NULL REFERENCES ehr.nurses(id) ON DELETE CASCADE,
    
    -- Administration details
    action TEXT NOT NULL CHECK (action IN ('administered', 'skipped')),
    reason TEXT,
    dose_given TEXT,
    route TEXT,
    administered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    comments TEXT
);

-- Create indexes for medication_administration_events
CREATE INDEX IF NOT EXISTS idx_medication_administration_events_patient_id ON ehr.medication_administration_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_administration_events_nurse_id ON ehr.medication_administration_events(nurse_id);
CREATE INDEX IF NOT EXISTS idx_medication_administration_events_medication_id ON ehr.medication_administration_events(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_administration_events_action ON ehr.medication_administration_events(action);
CREATE INDEX IF NOT EXISTS idx_medication_administration_events_administered_at ON ehr.medication_administration_events(administered_at);

-- Create nurse_settings table
CREATE TABLE IF NOT EXISTS ehr.nurse_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id UUID NOT NULL REFERENCES ehr.nurses(id) ON DELETE CASCADE,
    
    -- Notification preferences
    notify_critical_results BOOLEAN DEFAULT TRUE,
    notify_medication_due BOOLEAN DEFAULT TRUE,
    notify_task_overdue BOOLEAN DEFAULT TRUE,
    
    -- Display preferences
    dashboard_default_tab TEXT DEFAULT 'overview',
    items_per_page INTEGER DEFAULT 20,
    
    -- Workflow preferences
    auto_assign_vitals BOOLEAN DEFAULT TRUE,
    allow_cross_unit_tasks BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for nurse_settings
CREATE INDEX IF NOT EXISTS idx_nurse_settings_nurse_id ON ehr.nurse_settings(nurse_id);

-- Create nurse_tasks table (if not exists in ops schema)
CREATE TABLE IF NOT EXISTS ehr.nurse_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id UUID NOT NULL REFERENCES ehr.nurses(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES ehr.patients(patient_id) ON DELETE SET NULL,
    
    -- Task details
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN (
        'vital_signs', 'medication', 'assessment', 'documentation', 
        'patient_care', 'education', 'discharge', 'other'
    )),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Scheduling
    due_date TIMESTAMPTZ,
    estimated_duration INTEGER, -- minutes
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'cancelled', 'overdue'
    )),
    completed_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_by UUID REFERENCES core.users(user_id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for nurse_tasks
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_nurse_id ON ehr.nurse_tasks(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_patient_id ON ehr.nurse_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_task_type ON ehr.nurse_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_priority ON ehr.nurse_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_status ON ehr.nurse_tasks(status);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_due_date ON ehr.nurse_tasks(due_date);

-- Add comments for documentation
COMMENT ON TABLE ehr.nurses IS 'Nurse profiles and professional information';
COMMENT ON TABLE ehr.nurse_shift_assignments IS 'Nurse shift assignments and scheduling';
COMMENT ON TABLE ehr.nurse_patient_assignments IS 'Nurse-patient assignments for care coordination';
COMMENT ON TABLE ehr.medication_administration_events IS 'Audit log of medication administrations by nurses';
COMMENT ON TABLE ehr.nurse_settings IS 'Per-nurse preferences and settings';
COMMENT ON TABLE ehr.nurse_tasks IS 'Nurse task management and assignments';

-- Add column comments
COMMENT ON COLUMN ehr.nurses.license_number IS 'Unique nursing license number';
COMMENT ON COLUMN ehr.nurses.primary_specialty IS 'Main nursing specialty';
COMMENT ON COLUMN ehr.nurses.role IS 'Nursing role and level';
COMMENT ON COLUMN ehr.nurses.rating IS 'Average performance rating (1-5 scale)';
COMMENT ON COLUMN ehr.nurses.can_float IS 'Whether nurse can work in multiple departments';
COMMENT ON COLUMN ehr.nurse_shift_assignments.shift_type IS 'Type of shift (day, evening, night)';
COMMENT ON COLUMN ehr.nurse_shift_assignments.status IS 'Current status of the shift assignment';
COMMENT ON COLUMN ehr.nurse_patient_assignments.acuity_level IS 'Patient care complexity level (1-5)';
COMMENT ON COLUMN ehr.nurse_patient_assignments.is_primary IS 'Whether this is the primary nurse for the patient';
COMMENT ON COLUMN ehr.medication_administration_events.action IS 'Action taken (administered or skipped)';
COMMENT ON COLUMN ehr.nurse_tasks.task_type IS 'Type of nursing task';
COMMENT ON COLUMN ehr.nurse_tasks.priority IS 'Task priority level (low, medium, high, urgent)';
