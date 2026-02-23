-- Create an appointment for a patient with a doctor
-- Run this script in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- 
-- This script:
-- 1. Finds a patient by email
-- 2. Finds a doctor (first available doctor in the same clinic)
-- 3. Creates an appointment linking them together

DO $$
DECLARE
    v_patient_id UUID;
    v_doctor_id UUID;
    v_clinic_id UUID;
    v_appointment_id UUID;
    patient_email TEXT := 'patient@example.com';
    appointment_date TIMESTAMPTZ := NOW() + INTERVAL '1 day';  -- Tomorrow
    appointment_duration INTEGER := 30;  -- 30 minutes
    appointment_status TEXT := 'scheduled';
    appointment_type TEXT := 'consultation';
    user_pk_col TEXT;
BEGIN
    -- Detect which primary key column exists in core.users
    SELECT column_name INTO user_pk_col
    FROM information_schema.columns
    WHERE table_schema = 'core'
    AND table_name = 'users'
    AND column_name IN ('id', 'user_id')
    ORDER BY CASE column_name WHEN 'id' THEN 1 ELSE 2 END
    LIMIT 1;
    
    IF user_pk_col IS NULL THEN
        RAISE EXCEPTION 'Could not find primary key column (id or user_id) in core.users table';
    END IF;
    
    RAISE NOTICE 'Using column: %', user_pk_col;
    
    -- Find patient by email
    EXECUTE format('
        SELECT p.patient_id
        FROM ehr.patients p
        JOIN core.users u ON u.%I = p.user_id
        WHERE u.email = %L
        LIMIT 1',
        user_pk_col, patient_email
    ) INTO v_patient_id;
    
    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Patient not found with email: %', patient_email;
    END IF;
    
    RAISE NOTICE 'Found patient: % (ID: %)', patient_email, v_patient_id;
    
    -- Get patient's clinic from organization_patients
    SELECT op.organization_id INTO v_clinic_id
    FROM ehr.organization_patients op
    WHERE op.patient_id = v_patient_id
    AND op.status = 'active'
    LIMIT 1;
    
    IF v_clinic_id IS NULL THEN
        RAISE EXCEPTION 'Patient is not assigned to any clinic';
    END IF;
    
    RAISE NOTICE 'Patient clinic ID: %', v_clinic_id;
    
    -- Find a doctor in the same clinic
    -- First try to find a doctor with the same organization_id
    EXECUTE format('
        SELECT d.id
        FROM ehr.doctors d
        JOIN core.users u ON u.%I = d.user_id
        WHERE u.organization_id = %L::UUID
        AND u.role = ''DOCTOR''
        AND u.is_active = TRUE
        LIMIT 1',
        user_pk_col, v_clinic_id::TEXT
    ) INTO v_doctor_id;
    
    -- If no doctor in same clinic, get any active doctor
    IF v_doctor_id IS NULL THEN
        EXECUTE format('
            SELECT d.id
            FROM ehr.doctors d
            JOIN core.users u ON u.%I = d.user_id
            WHERE u.role = ''DOCTOR''
            AND u.is_active = TRUE
            LIMIT 1',
            user_pk_col
        ) INTO v_doctor_id;
    END IF;
    
    IF v_doctor_id IS NULL THEN
        RAISE EXCEPTION 'No active doctor found';
    END IF;
    
    RAISE NOTICE 'Found doctor ID: %', v_doctor_id;
    
    -- Check if appointment already exists
    IF EXISTS (
        SELECT 1
        FROM ehr.appointments a
        WHERE a.patient_id = v_patient_id
        AND a.doctor_id = v_doctor_id
        AND a.status IN ('scheduled', 'confirmed', 'pending')
    ) THEN
        RAISE NOTICE 'Appointment already exists for this patient and doctor';
    ELSE
        -- Create appointment
        v_appointment_id := gen_random_uuid();
        
        INSERT INTO ehr.appointments (
            id,
            patient_id,
            doctor_id,
            hospital_id,
            appointment_date,
            duration_minutes,
            status,
            appointment_type,
            created_at
        ) VALUES (
            v_appointment_id,
            v_patient_id,
            v_doctor_id,
            v_clinic_id,
            appointment_date,
            appointment_duration,
            appointment_status,
            appointment_type,
            NOW()
        );
        
        RAISE NOTICE 'Created appointment (ID: %)', v_appointment_id;
        RAISE NOTICE '  Patient: %', patient_email;
        RAISE NOTICE '  Doctor ID: %', v_doctor_id;
        RAISE NOTICE '  Clinic ID: %', v_clinic_id;
        RAISE NOTICE '  Date: %', appointment_date;
        RAISE NOTICE '  Status: %', appointment_status;
    END IF;
    
END $$;

-- Verify the appointment was created
-- Run ONE of these queries based on your schema:

-- If your core.users table uses 'id' as primary key (newer schema):
SELECT 
    a.id as appointment_id,
    a.appointment_date,
    a.status,
    a.appointment_type,
    u.email as patient_email,
    COALESCE(u.first_name || ' ' || u.last_name, u.full_name, 'N/A') as patient_name,
    d.id as doctor_id,
    h.name as clinic_name
FROM ehr.appointments a
JOIN ehr.patients p ON p.patient_id = a.patient_id
JOIN core.users u ON u.id = p.user_id
JOIN ehr.doctors d ON d.id = a.doctor_id
JOIN ref.hospitals h ON h.id = a.hospital_id
WHERE u.email = 'patient@example.com'
ORDER BY a.appointment_date DESC
LIMIT 5;

-- OR if your core.users table uses 'user_id' as primary key (older schema):
-- SELECT 
--     a.id as appointment_id,
--     a.appointment_date,
--     a.status,
--     a.appointment_type,
--     u.email as patient_email,
--     COALESCE(u.first_name || ' ' || u.last_name, u.full_name, 'N/A') as patient_name,
--     d.id as doctor_id,
--     h.name as clinic_name
-- FROM ehr.appointments a
-- JOIN ehr.patients p ON p.patient_id = a.patient_id
-- JOIN core.users u ON u.user_id = p.user_id
-- JOIN ehr.doctors d ON d.id = a.doctor_id
-- JOIN ref.hospitals h ON h.id = a.hospital_id
-- WHERE u.email = 'patient@example.com'
-- ORDER BY a.appointment_date DESC
-- LIMIT 5;

