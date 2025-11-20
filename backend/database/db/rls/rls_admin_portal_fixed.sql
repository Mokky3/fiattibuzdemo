-- Fixed Row Level Security (RLS) Configuration for Admin Portal
-- This file implements comprehensive access control with correct column names

-- ============================================================================
-- ENABLE RLS ON ALL EXISTING TABLES
-- ============================================================================

-- Core schema
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

-- EHR schema
ALTER TABLE ehr.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.allergy_intolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.immunizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.radiology_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.radiology_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.lab_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.doctor_hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.doctor_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.doctor_schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.doctor_schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.nurse_patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.nurse_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.nurse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.nurse_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.medication_administration_events ENABLE ROW LEVEL SECURITY;

-- Ops schema
ALTER TABLE ops.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.blocked_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.prescription_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.prescription_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.pharmacy_prescription_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.lab_equipment_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.radiology_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.radiology_worklist_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.medication_administration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.nurse_tasks ENABLE ROW LEVEL SECURITY;

-- Ref schema
ALTER TABLE ref.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.icd_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.pharmacies ENABLE ROW LEVEL SECURITY;

-- Financial schema
ALTER TABLE financial.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.charge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.insurance_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.financial_transactions ENABLE ROW LEVEL SECURITY;

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
            organization = current_setting('app.current_clinic_id', true) OR
            organization IS NULL
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

CREATE POLICY admin_super_admin_all_patients ON ehr.patients
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_patients ON ehr.patients
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization = current_setting('app.current_clinic_id', true)
            ) OR
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization IS NULL
            )
        )
    );

-- ============================================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY admin_super_admin_all_appointments ON ehr.appointments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_appointments ON ehr.appointments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            patient_id IN (
                SELECT patient_id FROM ehr.patients p
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization = current_setting('app.current_clinic_id', true)
            ) OR
            doctor_id IN (
                SELECT user_id FROM core.users 
                WHERE organization = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- DOCTORS TABLE POLICIES
-- ============================================================================

CREATE POLICY admin_super_admin_all_doctors ON ehr.doctors
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_doctors ON ehr.doctors
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization = current_setting('app.current_clinic_id', true)
            ) OR
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization IS NULL
            )
        )
    );

-- ============================================================================
-- NURSES TABLE POLICIES
-- ============================================================================

CREATE POLICY admin_super_admin_all_nurses ON ehr.nurses
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_nurses ON ehr.nurses
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization = current_setting('app.current_clinic_id', true)
            ) OR
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization IS NULL
            )
        )
    );

-- ============================================================================
-- HOSPITALS TABLE POLICIES
-- ============================================================================

CREATE POLICY admin_super_admin_all_hospitals ON ref.hospitals
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_assigned_hospital ON ref.hospitals
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            id::text = current_setting('app.current_clinic_id', true) OR
            id IS NULL
        )
    );

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================

CREATE POLICY admin_super_admin_all_audit_logs ON ops.audit_logs
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_audit_logs ON ops.audit_logs
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            clinic_id = current_setting('app.current_clinic_id', true) OR
            clinic_id IS NULL
        )
    );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY admin_super_admin_all_notifications ON ops.notifications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_notifications ON ops.notifications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            clinic_id = current_setting('app.current_clinic_id', true) OR
            clinic_id IS NULL OR
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- TODOS TABLE POLICIES
-- ============================================================================

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
            WHERE organization = current_setting('app.current_clinic_id', true)
        )
    );

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

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
            sender_id IN (
                SELECT user_id FROM core.users 
                WHERE organization = current_setting('app.current_clinic_id', true)
            ) OR
            recipient_id IN (
                SELECT user_id FROM core.users 
                WHERE organization = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- FINANCIAL TABLES POLICIES
-- ============================================================================

CREATE POLICY admin_super_admin_all_bills ON financial.bills
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_bills ON financial.bills
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        patient_id IN (
            SELECT patient_id FROM ehr.patients p
            JOIN core.users u ON p.user_id = u.user_id
            WHERE u.organization = current_setting('app.current_clinic_id', true)
        )
    );

CREATE POLICY admin_super_admin_all_payments ON financial.payments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_clinic_payments ON financial.payments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        bill_id IN (
            SELECT id FROM financial.bills b
            JOIN ehr.patients p ON b.patient_id = p.patient_id
            JOIN core.users u ON p.user_id = u.user_id
            WHERE u.organization = current_setting('app.current_clinic_id', true)
        )
    );

-- ============================================================================
-- REFERENCE TABLES POLICIES (Global access for admins)
-- ============================================================================

CREATE POLICY admin_super_admin_all_specialties ON ref.specialties
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_all_specialties ON ref.specialties
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN'
    );

CREATE POLICY admin_super_admin_all_medications ON ref.medications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_all_medications ON ref.medications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN'
    );

CREATE POLICY admin_super_admin_all_lab_tests ON ref.lab_tests
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

CREATE POLICY admin_clinic_admin_all_lab_tests ON ref.lab_tests
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN'
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

COMMENT ON POLICY admin_super_admin_all_todos ON ops.todos IS 'Super admins can access all todos across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_todos ON ops.todos IS 'Clinic admins can only access todos for users in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_messages ON ehr.messages IS 'Super admins can access all messages across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_messages ON ehr.messages IS 'Clinic admins can only access messages in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_bills ON financial.bills IS 'Super admins can access all bills across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_bills ON financial.bills IS 'Clinic admins can only access bills for patients in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_payments ON financial.payments IS 'Super admins can access all payments across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_payments ON financial.payments IS 'Clinic admins can only access payments for bills in their assigned clinic';
