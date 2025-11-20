-- Doctors and related tables schema
-- This file creates the doctors table and related structures for the EHR system

-- Create doctors table
CREATE TABLE IF NOT EXISTS ehr.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(user_id) ON DELETE CASCADE,
    
    -- Professional information
    license_number TEXT UNIQUE NOT NULL,
    license_issuer TEXT,
    license_issued_date DATE,
    license_expiry_date DATE,
    
    -- Specialization
    primary_specialization TEXT NOT NULL,
    sub_specializations JSONB, -- Array of sub-specialties
    board_certifications JSONB, -- Array of certifications
    
    -- Experience
    years_of_experience INTEGER,
    previous_positions JSONB, -- Array of previous work experience
    
    -- Consultation settings
    consultation_fee DECIMAL(10,2),
    consultation_fee_currency TEXT DEFAULT 'UZS',
    consultation_types JSONB, -- Array of consultation types
    average_consultation_time INTEGER DEFAULT 30, -- minutes
    
    -- Professional profile
    bio TEXT,
    education JSONB, -- Array of education records
    publications JSONB, -- Array of publications
    awards JSONB, -- Array of awards/recognitions
    professional_memberships JSONB, -- Array of memberships
    
    -- Skills and expertise
    languages_spoken JSONB, -- Array of languages with proficiency
    procedures_performed JSONB, -- Array of procedures
    special_interests JSONB, -- Array of special interests
    
    -- Ratings and reviews
    rating DECIMAL(3,2), -- Average rating (1-5)
    rating_count INTEGER DEFAULT 0,
    
    -- Availability
    is_accepting_patients BOOLEAN DEFAULT TRUE,
    max_patients_per_day INTEGER,
    
    -- Digital presence
    professional_email TEXT,
    website TEXT,
    linkedin_profile TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for doctors table
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON ehr.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_license_number ON ehr.doctors(license_number);
CREATE INDEX IF NOT EXISTS idx_doctors_primary_specialization ON ehr.doctors(primary_specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_rating ON ehr.doctors(rating);
CREATE INDEX IF NOT EXISTS idx_doctors_accepting_patients ON ehr.doctors(is_accepting_patients);

-- Create doctor_hospitals association table
CREATE TABLE IF NOT EXISTS ehr.doctor_hospitals (
    doctor_id UUID NOT NULL REFERENCES ehr.doctors(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES ref.hospitals(id) ON DELETE CASCADE,
    PRIMARY KEY (doctor_id, hospital_id)
);

-- Create doctor_departments association table (simplified - departments stored as JSON for now)
-- Note: This will be expanded when hospital_departments table is created
CREATE TABLE IF NOT EXISTS ehr.doctor_departments (
    doctor_id UUID NOT NULL REFERENCES ehr.doctors(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL, -- Store department name directly for now
    PRIMARY KEY (doctor_id, department_name)
);

-- Create doctor_schedule_templates table
CREATE TABLE IF NOT EXISTS ehr.doctor_schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES ehr.doctors(id) ON DELETE CASCADE,
    
    -- Day of week (0=Monday, 6=Sunday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Time slots
    start_time TEXT NOT NULL, -- HH:MM format
    end_time TEXT NOT NULL,
    
    -- Breaks
    break_start TEXT,
    break_end TEXT,
    
    -- Settings
    slot_duration INTEGER DEFAULT 30, -- minutes
    buffer_time INTEGER DEFAULT 10, -- minutes between appointments
    
    -- Location
    location_id UUID,
    room_number TEXT,
    
    -- Consultation types allowed
    consultation_types JSONB, -- Array of consultation types
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for doctor_schedule_templates
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_templates_doctor_id ON ehr.doctor_schedule_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_templates_day_of_week ON ehr.doctor_schedule_templates(day_of_week);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_templates_active ON ehr.doctor_schedule_templates(is_active);

-- Create doctor_schedule_exceptions table
CREATE TABLE IF NOT EXISTS ehr.doctor_schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES ehr.doctors(id) ON DELETE CASCADE,
    
    -- Exception details
    exception_date DATE NOT NULL,
    exception_type TEXT NOT NULL, -- leave, holiday, special_hours, blocked
    
    -- For special hours
    start_time TEXT,
    end_time TEXT,
    
    -- Reason
    reason TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for doctor_schedule_exceptions
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_exceptions_doctor_id ON ehr.doctor_schedule_exceptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_exceptions_date ON ehr.doctor_schedule_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_exceptions_type ON ehr.doctor_schedule_exceptions(exception_type);

-- Create clinical_notes table
CREATE TABLE IF NOT EXISTS ehr.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES ehr.doctors(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES ehr.appointments(id) ON DELETE SET NULL,
    
    -- Note type and format
    note_type TEXT NOT NULL, -- soap, progress, consultation, discharge, operative
    note_date TIMESTAMPTZ NOT NULL,
    
    -- SOAP format fields
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    
    -- Alternative format
    content TEXT, -- For non-SOAP notes
    
    -- Templates
    template_id UUID,
    template_data JSONB, -- Structured template data
    
    -- Status
    is_draft BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_amended BOOLEAN DEFAULT FALSE,
    amendment_notes TEXT,
    
    -- Sharing
    shared_with_patient BOOLEAN DEFAULT FALSE,
    shared_with_team JSONB, -- Array of user IDs
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES core.users(user_id),
    locked_by UUID REFERENCES core.users(user_id),
    locked_at TIMESTAMPTZ,
    
    -- FHIR reference
    fhir_document_reference_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for clinical_notes
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON ehr.clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor_id ON ehr.clinical_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_encounter_id ON ehr.clinical_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_note_date ON ehr.clinical_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_note_type ON ehr.clinical_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_created_by ON ehr.clinical_notes(created_by);

-- Add comments for documentation
COMMENT ON TABLE ehr.doctors IS 'Doctor profiles and professional information';
COMMENT ON TABLE ehr.doctor_hospitals IS 'Many-to-many relationship between doctors and hospitals';
COMMENT ON TABLE ehr.doctor_departments IS 'Many-to-many relationship between doctors and departments';
COMMENT ON TABLE ehr.doctor_schedule_templates IS 'Weekly schedule templates for doctors';
COMMENT ON TABLE ehr.doctor_schedule_exceptions IS 'Schedule exceptions (holidays, leaves, special hours)';
COMMENT ON TABLE ehr.clinical_notes IS 'Clinical notes (SOAP notes, progress notes, etc.)';

-- Add column comments
COMMENT ON COLUMN ehr.doctors.license_number IS 'Unique medical license number';
COMMENT ON COLUMN ehr.doctors.primary_specialization IS 'Main medical specialty';
COMMENT ON COLUMN ehr.doctors.consultation_fee IS 'Standard consultation fee in local currency';
COMMENT ON COLUMN ehr.doctors.rating IS 'Average patient rating (1-5 scale)';
COMMENT ON COLUMN ehr.doctor_schedule_templates.day_of_week IS 'Day of week (0=Monday, 6=Sunday)';
COMMENT ON COLUMN ehr.doctor_schedule_templates.slot_duration IS 'Duration of each appointment slot in minutes';
COMMENT ON COLUMN ehr.clinical_notes.note_type IS 'Type of clinical note (soap, progress, consultation, etc.)';
COMMENT ON COLUMN ehr.clinical_notes.is_draft IS 'Whether the note is still being edited';
COMMENT ON COLUMN ehr.clinical_notes.is_locked IS 'Whether the note is locked from further editing';
