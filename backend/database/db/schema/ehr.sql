-- EHR schema tables

-- Patients table
CREATE TABLE IF NOT EXISTS ehr.patients (
  patient_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID UNIQUE REFERENCES core.users(user_id) ON DELETE CASCADE,
  date_of_birth  DATE,
  sex            TEXT CHECK (sex IN ('male','female','other','unknown')),
  phone          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS ehr.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  doctor_id UUID NOT NULL REFERENCES core.users(user_id),
  hospital_id UUID NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL,
  appointment_type TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Encounters table
CREATE TABLE IF NOT EXISTS ehr.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_encounter_id TEXT,
  identifiers JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  status TEXT NOT NULL,
  class_code JSONB NOT NULL,
  class_display TEXT NOT NULL,
  type_code JSONB NOT NULL,
  type_display TEXT NOT NULL,
  service_type JSONB,
  priority JSONB,
  subject_id UUID REFERENCES ehr.patients(patient_id),
  episode_of_care_id UUID,
  based_on JSONB,
  appointment_id UUID,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  length_value FLOAT,
  length_unit TEXT,
  length_code TEXT,
  reason_code JSONB,
  reason_reference JSONB,
  diagnosis JSONB,
  account_id UUID,
  hospitalization JSONB,
  location JSONB,
  service_provider_id UUID,
  part_of_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Lab Orders table
CREATE TABLE IF NOT EXISTS ehr.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_service_request_id TEXT,
  identifiers JSONB,
  requisition JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  ordered_by UUID NOT NULL REFERENCES core.users(user_id),
  encounter_id UUID REFERENCES ehr.encounters(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL,
  intent TEXT NOT NULL,
  priority TEXT NOT NULL,
  tests_ordered JSONB NOT NULL,
  category JSONB,
  clinical_indication TEXT,
  clinical_notes TEXT,
  reason_codes JSONB,
  supporting_info JSONB,
  ordered_date TIMESTAMPTZ NOT NULL,
  required_by TIMESTAMPTZ,
  occurrence_date TIMESTAMPTZ,
  patient_instructions TEXT,
  lab_instructions TEXT,
  do_not_perform BOOLEAN,
  specimen_required BOOLEAN,
  specimen_type TEXT,
  specimen_instructions TEXT,
  fasting_required BOOLEAN,
  performing_lab_id UUID,
  location_code JSONB,
  insurance_ids JSONB,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Lab Results table
CREATE TABLE IF NOT EXISTS ehr.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_observation_id TEXT,
  fhir_diagnostic_report_id TEXT,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  lab_order_id UUID REFERENCES ehr.lab_orders(id),
  medical_record_id UUID,
  result_number TEXT NOT NULL,
  accession_number TEXT,
  test_name TEXT NOT NULL,
  test_code TEXT NOT NULL,
  test_category TEXT,
  panel_name TEXT,
  result_value TEXT NOT NULL,
  result_unit TEXT,
  result_type TEXT,
  reference_range TEXT,
  reference_range_low FLOAT,
  reference_range_high FLOAT,
  reference_range_text TEXT,
  is_abnormal BOOLEAN,
  abnormality_type TEXT,
  is_critical BOOLEAN,
  status TEXT NOT NULL,
  interpretation TEXT,
  clinical_significance TEXT,
  comments TEXT,
  performing_lab_name TEXT,
  performing_lab_id UUID,
  lab_director TEXT,
  specimen_type TEXT,
  specimen_collected_date TIMESTAMPTZ,
  specimen_received_date TIMESTAMPTZ,
  specimen_condition TEXT,
  test_date TIMESTAMPTZ NOT NULL,
  resulted_date TIMESTAMPTZ NOT NULL,
  verified_date TIMESTAMPTZ,
  ordered_by UUID,
  performed_by TEXT,
  verified_by TEXT,
  resulted_by TEXT,
  report_file_url TEXT,
  attachments JSONB,
  test_method TEXT,
  instrument_id TEXT,
  previous_results JSONB,
  delta TEXT,
  trend TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Lab Reports table
CREATE TABLE IF NOT EXISTS ehr.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES ehr.lab_orders(id),
  patient_id UUID REFERENCES ehr.patients(patient_id),
  report_date TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  summary TEXT,
  metrics JSONB,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS ehr.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_medication_request_id TEXT,
  identifiers JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  doctor_id UUID NOT NULL REFERENCES core.users(user_id),
  hospital_id UUID NOT NULL,
  encounter_id UUID REFERENCES ehr.encounters(id),
  prescription_number TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  medicine_code TEXT,
  generic_name TEXT,
  brand_name TEXT,
  description TEXT,
  status TEXT NOT NULL,
  status_reason JSONB,
  intent TEXT NOT NULL,
  priority TEXT,
  prescribed_date TIMESTAMPTZ NOT NULL,
  start_date DATE,
  end_date DATE,
  dosage TEXT NOT NULL,
  dosage_unit TEXT,
  frequency TEXT NOT NULL,
  route TEXT,
  duration TEXT,
  dosage_instructions JSONB,
  purpose TEXT,
  indication TEXT,
  reason_codes JSONB,
  notes TEXT,
  total_refills INTEGER,
  remaining_refills INTEGER,
  tablets_per_refill INTEGER,
  quantity FLOAT,
  quantity_unit TEXT,
  days_supply INTEGER,
  dispense_request JSONB,
  expected_supply_duration INTEGER,
  allow_generic_substitution BOOLEAN,
  substitution_reason TEXT,
  estimated_price FLOAT,
  currency TEXT,
  prior_prescription_id UUID,
  is_signed BOOLEAN,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  created_by UUID NOT NULL,
  prescribed_by UUID NOT NULL,
  last_modified_by UUID,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Conditions table
CREATE TABLE IF NOT EXISTS ehr.conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_condition_id TEXT,
  identifiers JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  encounter_id UUID REFERENCES ehr.encounters(id),
  clinical_status TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT,
  code JSONB NOT NULL,
  display_name TEXT NOT NULL,
  body_sites JSONB,
  onset_date DATE,
  onset_age INTEGER,
  onset_period_start DATE,
  onset_period_end DATE,
  onset_string TEXT,
  abatement_date DATE,
  abatement_age INTEGER,
  abatement_period_start DATE,
  abatement_period_end DATE,
  abatement_string TEXT,
  recorded_date TIMESTAMPTZ NOT NULL,
  recorder_id UUID,
  asserter_id UUID,
  notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Observations table
CREATE TABLE IF NOT EXISTS ehr.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_observation_id TEXT,
  identifiers JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  encounter_id UUID REFERENCES ehr.encounters(id),
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  code JSONB NOT NULL,
  display_name TEXT NOT NULL,
  based_on JSONB,
  part_of JSONB,
  focus JSONB,
  effective_date TIMESTAMPTZ,
  effective_period_start TIMESTAMPTZ,
  effective_period_end TIMESTAMPTZ,
  issued TIMESTAMPTZ,
  performers JSONB,
  value_type TEXT,
  value_data JSONB,
  value_quantity FLOAT,
  value_unit TEXT,
  value_string TEXT,
  value_boolean BOOLEAN,
  value_integer INTEGER,
  data_absent_reason JSONB,
  interpretation JSONB,
  is_abnormal BOOLEAN,
  notes JSONB,
  body_site JSONB,
  method JSONB,
  specimen_id UUID,
  device JSONB,
  reference_ranges JSONB,
  reference_range_low FLOAT,
  reference_range_high FLOAT,
  reference_range_text TEXT,
  has_member JSONB,
  derived_from JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Allergy Intolerances table
CREATE TABLE IF NOT EXISTS ehr.allergy_intolerances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_allergy_intolerance_id TEXT,
  identifiers JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  encounter_id UUID REFERENCES ehr.encounters(id),
  clinical_status TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  type TEXT NOT NULL,
  categories JSONB,
  criticality TEXT,
  code JSONB NOT NULL,
  display_name TEXT NOT NULL,
  onset_date DATE,
  onset_age INTEGER,
  onset_period_start DATE,
  onset_period_end DATE,
  onset_string TEXT,
  recorded_date TIMESTAMPTZ NOT NULL,
  recorder_id UUID,
  asserter_id UUID,
  last_occurrence TIMESTAMPTZ,
  notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Immunizations table
CREATE TABLE IF NOT EXISTS ehr.immunizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_immunization_id TEXT,
  identifiers JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  encounter_id UUID REFERENCES ehr.encounters(id),
  status TEXT NOT NULL,
  status_reason JSONB,
  vaccine_code JSONB NOT NULL,
  vaccine_name TEXT NOT NULL,
  occurrence_date TIMESTAMPTZ,
  occurrence_string TEXT,
  recorded TIMESTAMPTZ NOT NULL,
  primary_source BOOLEAN,
  report_origin JSONB,
  location_id UUID,
  manufacturer TEXT,
  lot_number TEXT,
  expiration_date DATE,
  site JSONB,
  route JSONB,
  dose_quantity FLOAT,
  dose_unit TEXT,
  performer_id UUID,
  performer_function JSONB,
  reason_codes JSONB,
  reason_references JSONB,
  is_subpotent BOOLEAN,
  subpotent_reasons JSONB,
  education_document_type TEXT,
  education_reference TEXT,
  education_publication_date DATE,
  education_presentation_date TIMESTAMPTZ,
  program_eligibility JSONB,
  funding_source JSONB,
  notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Radiology Studies table
CREATE TABLE IF NOT EXISTS ehr.radiology_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accession_number TEXT NOT NULL,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  mrn TEXT,
  patient_name TEXT,
  age INTEGER,
  gender TEXT,
  dob DATE,
  order_date TIMESTAMPTZ NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  modality TEXT NOT NULL,
  body_part TEXT NOT NULL,
  study_description TEXT NOT NULL,
  indication TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  ordering_physician TEXT,
  technologist TEXT,
  location TEXT,
  room TEXT,
  contrast BOOLEAN,
  preparation TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  insurance TEXT,
  "authorization" TEXT,
  cpt_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Radiology Reports table
CREATE TABLE IF NOT EXISTS ehr.radiology_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES ehr.radiology_studies(id),
  radiologist_id UUID REFERENCES core.users(user_id),
  report_date TIMESTAMPTZ DEFAULT now(),
  findings TEXT NOT NULL,
  impression TEXT NOT NULL,
  recommendations TEXT,
  is_critical BOOLEAN,
  status TEXT
);

-- Messages table
CREATE TABLE IF NOT EXISTS ehr.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES core.users(user_id),
  recipient_id UUID NOT NULL REFERENCES core.users(user_id),
  subject TEXT NOT NULL,
  message_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lab Settings table
CREATE TABLE IF NOT EXISTS ehr.lab_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_type TEXT NOT NULL,
  settings_data JSONB NOT NULL,
  version TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_user ON ehr.patients (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON ehr.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON ehr.appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON ehr.appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON ehr.encounters (patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON ehr.encounters (status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON ehr.lab_orders (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_ordered_by ON ehr.lab_orders (ordered_by);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON ehr.lab_orders (status);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON ehr.lab_results (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_lab_order_id ON ehr.lab_results (lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_status ON ehr.lab_results (status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON ehr.prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON ehr.prescriptions (doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON ehr.prescriptions (status);
CREATE INDEX IF NOT EXISTS idx_conditions_patient_id ON ehr.conditions (patient_id);
CREATE INDEX IF NOT EXISTS idx_conditions_clinical_status ON ehr.conditions (clinical_status);
CREATE INDEX IF NOT EXISTS idx_observations_patient_id ON ehr.observations (patient_id);
CREATE INDEX IF NOT EXISTS idx_observations_status ON ehr.observations (status);
CREATE INDEX IF NOT EXISTS idx_allergy_intolerances_patient_id ON ehr.allergy_intolerances (patient_id);
CREATE INDEX IF NOT EXISTS idx_allergy_intolerances_clinical_status ON ehr.allergy_intolerances (clinical_status);
CREATE INDEX IF NOT EXISTS idx_immunizations_patient_id ON ehr.immunizations (patient_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_status ON ehr.immunizations (status);
CREATE INDEX IF NOT EXISTS idx_radiology_studies_patient_id ON ehr.radiology_studies (patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_studies_status ON ehr.radiology_studies (status);
CREATE INDEX IF NOT EXISTS idx_radiology_reports_study_id ON ehr.radiology_reports (study_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON ehr.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON ehr.messages (recipient_id);
