-- Row Level Security (RLS) Configuration for Admin Portal
-- This file implements comprehensive access control for admin portal users
-- ensuring they can only access clinics, staff, and patients they have permission to manage

-- Enable RLS on core tables
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on EHR tables
ALTER TABLE ehr.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reference tables
ALTER TABLE ref.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.specialties ENABLE ROW LEVEL SECURITY;

-- Enable RLS on operations tables
ALTER TABLE ops.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.nurse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Enable RLS on financial tables
ALTER TABLE financial.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.insurance_claims ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CORE USERS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all users
CREATE POLICY admin_super_admin_all_users ON core.users
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access users in their clinic
CREATE POLICY admin_clinic_admin_clinic_users ON core.users
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access users in same clinic (using organization_id as clinic_id)
            organization_id::text = current_setting('app.current_clinic_id', true) OR
            -- Access users with no clinic assignment (global users)
            organization_id IS NULL
        )
    );

-- Policy: Users can always access their own record
CREATE POLICY admin_users_own_record ON core.users
    FOR ALL
    TO fiattib_app_rw
    USING (
        user_id::text = current_setting('app.current_user_id', true)
    );

-- ============================================================================
-- PATIENTS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all patients
CREATE POLICY admin_super_admin_all_patients ON ehr.patients
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access patients in their clinic
CREATE POLICY admin_clinic_admin_clinic_patients ON ehr.patients
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access patients in same clinic
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access patients with no clinic assignment
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id IS NULL
            )
        )
    );

-- ============================================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all appointments
CREATE POLICY admin_super_admin_all_appointments ON ehr.appointments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access appointments in their clinic
CREATE POLICY admin_clinic_admin_clinic_appointments ON ehr.appointments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access appointments with patients in same clinic
            patient_id IN (
                SELECT patient_id FROM ehr.patients p
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access appointments with doctors in same clinic
            doctor_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access appointments with no clinic assignment
            (patient_id IN (
                SELECT patient_id FROM ehr.patients p
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization_id IS NULL
            ) OR doctor_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id IS NULL
            ))
        )
    );

-- ============================================================================
-- DOCTORS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all doctors
CREATE POLICY admin_super_admin_all_doctors ON ehr.doctors
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access doctors in their clinic
CREATE POLICY admin_clinic_admin_clinic_doctors ON ehr.doctors
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access doctors in same clinic
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access doctors with no clinic assignment
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id IS NULL
            )
        )
    );

-- ============================================================================
-- NURSES TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all nurses
CREATE POLICY admin_super_admin_all_nurses ON ehr.nurses
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access nurses in their clinic
CREATE POLICY admin_clinic_admin_clinic_nurses ON ehr.nurses
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access nurses in same clinic
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access nurses with no clinic assignment
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id IS NULL
            )
        )
    );

-- ============================================================================
-- HOSPITALS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all hospitals
CREATE POLICY admin_super_admin_all_hospitals ON ref.hospitals
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access their assigned hospital
CREATE POLICY admin_clinic_admin_assigned_hospital ON ref.hospitals
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access hospital assigned to their clinic
            id::text = current_setting('app.current_clinic_id', true) OR
            -- Access hospitals with no specific assignment (global hospitals)
            id IS NULL
        )
    );

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all audit logs
CREATE POLICY admin_super_admin_all_audit_logs ON ops.audit_logs
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access audit logs for their clinic
CREATE POLICY admin_clinic_admin_clinic_audit_logs ON ops.audit_logs
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access audit logs for their clinic
            clinic_id = current_setting('app.current_clinic_id', true) OR
            -- Access global audit logs (no clinic specified)
            clinic_id IS NULL
        )
    );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all notifications
CREATE POLICY admin_super_admin_all_notifications ON ops.notifications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access notifications for their clinic
CREATE POLICY admin_clinic_admin_clinic_notifications ON ops.notifications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access notifications for their clinic
            clinic_id = current_setting('app.current_clinic_id', true) OR
            -- Access global notifications
            clinic_id IS NULL OR
            -- Access notifications for users in their clinic
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- FINANCIAL TABLES POLICIES
-- ============================================================================

-- Policy: Super admins can access all financial data
CREATE POLICY admin_super_admin_all_bills ON financial.bills
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_super_admin_all_payments ON financial.payments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access financial data for their clinic
CREATE POLICY admin_clinic_admin_clinic_bills ON financial.bills
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access bills for patients in their clinic
            patient_id IN (
                SELECT patient_id FROM ehr.patients p
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

CREATE POLICY admin_clinic_admin_clinic_payments ON financial.payments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access payments for bills in their clinic
            bill_id IN (
                SELECT id FROM financial.bills b
                JOIN ehr.patients p ON b.patient_id = p.patient_id
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- ADDITIONAL EHR TABLE POLICIES
-- ============================================================================

-- Clinical Notes
CREATE POLICY admin_super_admin_all_clinical_notes ON ehr.clinical_notes
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_clinical_notes ON ehr.clinical_notes
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        patient_id IN (
            SELECT patient_id FROM ehr.patients p
            JOIN core.users u ON p.user_id = u.user_id
            WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
        )
    );

-- Lab Orders
CREATE POLICY admin_super_admin_all_lab_orders ON ehr.lab_orders
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_lab_orders ON ehr.lab_orders
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        patient_id IN (
            SELECT patient_id FROM ehr.patients p
            JOIN core.users u ON p.user_id = u.user_id
            WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
        )
    );

-- Lab Results
CREATE POLICY admin_super_admin_all_lab_results ON ehr.lab_results
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_lab_results ON ehr.lab_results
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        patient_id IN (
            SELECT patient_id FROM ehr.patients p
            JOIN core.users u ON p.user_id = u.user_id
            WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
        )
    );

-- Prescriptions
CREATE POLICY admin_super_admin_all_prescriptions ON ehr.prescriptions
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_prescriptions ON ehr.prescriptions
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        patient_id IN (
            SELECT patient_id FROM ehr.patients p
            JOIN core.users u ON p.user_id = u.user_id
            WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
        )
    );

-- Messages
CREATE POLICY admin_super_admin_all_messages ON ehr.messages
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_messages ON ehr.messages
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access messages involving users in their clinic
            sender_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            recipient_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- OPERATIONS TABLE POLICIES
-- ============================================================================

-- Todos
CREATE POLICY admin_super_admin_all_todos ON ops.todos
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_todos ON ops.todos
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        user_id IN (
            SELECT user_id FROM core.users 
            WHERE organization_id::text = current_setting('app.current_clinic_id', true)
        )
    );

-- Nurse Tasks
CREATE POLICY admin_super_admin_all_nurse_tasks ON ops.nurse_tasks
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_nurse_tasks ON ops.nurse_tasks
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            nurse_id IN (
                SELECT id FROM ehr.nurses n
                JOIN core.users u ON n.user_id = u.user_id
                WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            patient_id IN (
                SELECT patient_id FROM ehr.patients p
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- Blocked Time Slots
CREATE POLICY admin_super_admin_all_blocked_time_slots ON ops.blocked_time_slots
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_blocked_time_slots ON ops.blocked_time_slots
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            doctor_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            created_by IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY admin_super_admin_all_users ON core.users IS 'Super admins can access all users across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_users ON core.users IS 'Clinic admins can only access users in their assigned clinic';
COMMENT ON POLICY admin_users_own_record ON core.users IS 'Users can always access their own user record';

COMMENT ON POLICY admin_super_admin_all_patients ON ehr.patients IS 'Super admins can access all patients across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_patients ON ehr.patients IS 'Clinic admins can only access patients in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_appointments ON ehr.appointments IS 'Super admins can access all appointments across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_appointments ON ehr.appointments IS 'Clinic admins can only access appointments in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_doctors ON ehr.doctors IS 'Super admins can access all doctors across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_doctors ON ehr.doctors IS 'Clinic admins can only access doctors in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_nurses ON ehr.nurses IS 'Super admins can access all nurses across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_nurses ON ehr.nurses IS 'Clinic admins can only access nurses in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_hospitals ON ref.hospitals IS 'Super admins can access all hospitals';
COMMENT ON POLICY admin_clinic_admin_assigned_hospital ON ref.hospitals IS 'Clinic admins can only access their assigned hospital';

COMMENT ON POLICY admin_super_admin_all_audit_logs ON ops.audit_logs IS 'Super admins can access all audit logs across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_audit_logs ON ops.audit_logs IS 'Clinic admins can only access audit logs for their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_notifications ON ops.notifications IS 'Super admins can access all notifications across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_notifications ON ops.notifications IS 'Clinic admins can only access notifications for their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_bills ON financial.bills IS 'Super admins can access all bills across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_bills ON financial.bills IS 'Clinic admins can only access bills for patients in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_payments ON financial.payments IS 'Super admins can access all payments across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_payments ON financial.payments IS 'Clinic admins can only access payments for bills in their assigned clinic';
