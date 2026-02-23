-- Supabase Migration: Initial Schema
-- Generated: 2025-11-21T07:17:48.446297
-- From SQLAlchemy models

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ehr;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS staging;

-- Create custom enum types
DO $$ BEGIN
    CREATE TYPE contacttype AS ENUM ('EMAIL', 'PHONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitationstatus AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;



-- Create tables (without foreign keys)

CREATE TABLE IF NOT EXISTS ehr.message_receipts (

	id VARCHAR NOT NULL, 
	message_id UUID NOT NULL, 
	thread_id VARCHAR, 
	user_id UUID NOT NULL, 
	read BOOLEAN, 
	read_at TIMESTAMP WITH TIME ZONE, 
	delivered BOOLEAN, 
	delivered_at TIMESTAMP WITH TIME ZONE, 
	device_info VARCHAR, 
	ip_address VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.radiology_templates (

	id VARCHAR(36) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	modality VARCHAR(20) NOT NULL, 
	body_part VARCHAR(100) NOT NULL, 
	category VARCHAR(100) NOT NULL, 
	description TEXT, 
	author_id UUID, 
	created_date DATE NOT NULL, 
	last_modified DATE NOT NULL, 
	usage_count INTEGER, 
	is_private BOOLEAN, 
	is_favorite BOOLEAN, 
	content JSON NOT NULL, 
	tags JSON, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.doctors (

	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	license_number VARCHAR(50) NOT NULL, 
	license_issuer VARCHAR(100), 
	license_issued_date DATE, 
	license_expiry_date DATE, 
	primary_specialization VARCHAR(100) NOT NULL, 
	sub_specializations JSON, 
	board_certifications JSON, 
	years_of_experience INTEGER, 
	previous_positions JSON, 
	consultation_fee FLOAT, 
	consultation_fee_currency VARCHAR(3), 
	consultation_types JSON, 
	average_consultation_time INTEGER, 
	bio TEXT, 
	education JSON, 
	publications JSON, 
	awards JSON, 
	professional_memberships JSON, 
	languages_spoken JSON, 
	procedures_performed JSON, 
	special_interests JSON, 
	rating FLOAT, 
	rating_count INTEGER, 
	is_accepting_patients BOOLEAN, 
	max_patients_per_day INTEGER, 
	professional_email VARCHAR(255), 
	website VARCHAR(500), 
	linkedin_profile VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.radiology_worklist_assignments (

	id VARCHAR(36) NOT NULL, 
	study_id VARCHAR(36) NOT NULL, 
	assigned_radiologist_id UUID, 
	reading_status VARCHAR(20) NOT NULL, 
	critical_flag BOOLEAN, 
	tags JSON, 
	preliminary_findings TEXT, 
	image_count INTEGER, 
	series_count INTEGER, 
	study_size VARCHAR(50), 
	protocol_name VARCHAR(200), 
	assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	turnaround_time VARCHAR(50), 
	estimated_read_time VARCHAR(50), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.immunizations (

	id VARCHAR(36) NOT NULL, 
	fhir_immunization_id VARCHAR(255), 
	identifiers JSON, 
	patient_id UUID NOT NULL, 
	encounter_id VARCHAR(36), 
	status VARCHAR(16) NOT NULL, 
	status_reason JSON, 
	vaccine_code JSON NOT NULL, 
	vaccine_name VARCHAR(500) NOT NULL, 
	occurrence_date TIMESTAMP WITH TIME ZONE, 
	occurrence_string VARCHAR(200), 
	recorded TIMESTAMP WITH TIME ZONE NOT NULL, 
	primary_source BOOLEAN, 
	report_origin JSON, 
	location_id UUID, 
	manufacturer VARCHAR(200), 
	lot_number VARCHAR(50), 
	expiration_date DATE, 
	site JSON, 
	route JSON, 
	dose_quantity FLOAT, 
	dose_unit VARCHAR(50), 
	performer_id UUID, 
	performer_function JSON, 
	reason_codes JSON, 
	reason_references JSON, 
	is_subpotent BOOLEAN, 
	subpotent_reasons JSON, 
	education_document_type VARCHAR(100), 
	education_reference VARCHAR(500), 
	education_publication_date DATE, 
	education_presentation_date TIMESTAMP WITH TIME ZONE, 
	program_eligibility JSON, 
	funding_source JSON, 
	notes JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_immunization_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.observation_components (

	id VARCHAR(36) NOT NULL, 
	observation_id UUID NOT NULL, 
	code JSON NOT NULL, 
	display_name VARCHAR(500) NOT NULL, 
	value_type VARCHAR(50), 
	value_data JSON, 
	value_quantity FLOAT, 
	value_unit VARCHAR(50), 
	value_string VARCHAR(500), 
	interpretation JSON, 
	reference_range_low FLOAT, 
	reference_range_high FLOAT, 
	reference_range_text VARCHAR(200), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.audit_trail (

	id VARCHAR(36) NOT NULL, 
	user_id UUID NOT NULL, 
	user_name VARCHAR(255), 
	action VARCHAR(100) NOT NULL, 
	resource_type VARCHAR(50) NOT NULL, 
	resource_id VARCHAR(36) NOT NULL, 
	old_values JSON, 
	new_values JSON, 
	ip_address VARCHAR(45), 
	user_agent VARCHAR(500), 
	timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.hospital_departments (

	id UUID NOT NULL, 
	hospital_id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	department_type VARCHAR(16) NOT NULL, 
	description TEXT, 
	floor VARCHAR(10), 
	building VARCHAR(50), 
	wing VARCHAR(50), 
	room_numbers JSON, 
	phone VARCHAR(20), 
	extension VARCHAR(10), 
	email VARCHAR(255), 
	bed_capacity INTEGER, 
	current_occupancy INTEGER, 
	max_occupancy_rate FLOAT, 
	doctor_capacity INTEGER, 
	nurse_capacity INTEGER, 
	operating_hours JSON, 
	is_24_hours BOOLEAN, 
	services_offered JSON, 
	equipment_available JSON, 
	head_id UUID, 
	deputy_head_id UUID, 
	parent_department_id UUID, 
	is_active BOOLEAN, 
	is_accepting_patients BOOLEAN, 
	cost_center_code VARCHAR(50), 
	budget_allocated FLOAT, 
	patient_satisfaction_target FLOAT, 
	average_wait_time_target INTEGER, 
	fhir_location_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_location_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.pharmacies (

	id VARCHAR(36) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	legal_name VARCHAR(200), 
	license_number VARCHAR(100) NOT NULL, 
	phone VARCHAR(20) NOT NULL, 
	fax VARCHAR(20), 
	email VARCHAR(255), 
	website VARCHAR(500), 
	address TEXT NOT NULL, 
	district VARCHAR(100), 
	city VARCHAR(100) NOT NULL, 
	state VARCHAR(100) NOT NULL, 
	zip_code VARCHAR(20), 
	country VARCHAR(2), 
	latitude FLOAT, 
	longitude FLOAT, 
	is_24_hours BOOLEAN, 
	opening_time TIME WITHOUT TIME ZONE, 
	closing_time TIME WITHOUT TIME ZONE, 
	operating_hours JSON, 
	delivery_available BOOLEAN, 
	online_ordering BOOLEAN, 
	consultation_available BOOLEAN, 
	rating FLOAT, 
	rating_count INTEGER, 
	accepted_insurances JSON, 
	is_in_network BOOLEAN, 
	is_active BOOLEAN, 
	is_verified BOOLEAN, 
	verified_at TIMESTAMP WITH TIME ZONE, 
	fhir_organization_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (license_number), 
	UNIQUE (fhir_organization_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.conditions (

	id VARCHAR(36) NOT NULL, 
	fhir_condition_id VARCHAR(255), 
	identifiers JSON, 
	patient_id UUID NOT NULL, 
	encounter_id VARCHAR(36), 
	clinical_status VARCHAR(10) NOT NULL, 
	verification_status VARCHAR(16) NOT NULL, 
	category VARCHAR(19) NOT NULL, 
	severity VARCHAR(8), 
	code JSON NOT NULL, 
	display_name VARCHAR(500) NOT NULL, 
	body_sites JSON, 
	onset_date DATE, 
	onset_age INTEGER, 
	onset_period_start DATE, 
	onset_period_end DATE, 
	onset_string VARCHAR(200), 
	abatement_date DATE, 
	abatement_age INTEGER, 
	abatement_period_start DATE, 
	abatement_period_end DATE, 
	abatement_string VARCHAR(200), 
	recorded_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	recorder_id UUID, 
	asserter_id UUID, 
	notes JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_condition_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.organization_patients (

	organization_id UUID NOT NULL, 
	patient_id UUID NOT NULL, 
	local_mrn VARCHAR(50), 
	status VARCHAR(20) NOT NULL, 
	first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	last_seen_at TIMESTAMP WITH TIME ZONE, 
	consent_share BOOLEAN NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (organization_id, patient_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.lab_result_notifications (

	id VARCHAR(36) NOT NULL, 
	lab_result_id UUID NOT NULL, 
	notified_user_id UUID NOT NULL, 
	notification_type VARCHAR(50) NOT NULL, 
	notification_sent_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	notification_read_at TIMESTAMP WITH TIME ZONE, 
	acknowledged BOOLEAN, 
	acknowledged_at TIMESTAMP WITH TIME ZONE, 
	response_notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.condition_stages (

	id VARCHAR(36) NOT NULL, 
	condition_id VARCHAR(36) NOT NULL, 
	summary JSON NOT NULL, 
	assessment JSON, 
	type JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.prescription_reminders (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	prescription_id UUID NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	subtitle VARCHAR(200), 
	message TEXT, 
	reminder_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	repeat_pattern VARCHAR(50), 
	priority VARCHAR(6), 
	is_active BOOLEAN, 
	is_acknowledged BOOLEAN, 
	acknowledged_at TIMESTAMP WITH TIME ZONE, 
	send_email BOOLEAN, 
	send_sms BOOLEAN, 
	send_push BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.nurse_patient_assignments (

	id VARCHAR(36) NOT NULL, 
	nurse_id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	assignment_date DATE NOT NULL, 
	shift_type VARCHAR(20) NOT NULL, 
	is_primary BOOLEAN, 
	is_active BOOLEAN, 
	acuity_level INTEGER, 
	special_instructions TEXT, 
	assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	unassigned_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.report_templates (

	id VARCHAR(36) NOT NULL, 
	organization_id UUID, 
	name VARCHAR(200) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	description TEXT, 
	template_type VARCHAR(50) NOT NULL, 
	data_sources JSON NOT NULL, 
	filters JSON, 
	columns JSON, 
	charts JSON, 
	layout JSON, 
	styles JSON, 
	is_schedulable BOOLEAN, 
	default_schedule JSON, 
	is_public BOOLEAN, 
	required_role VARCHAR(50), 
	required_permissions JSON, 
	is_active BOOLEAN, 
	is_system BOOLEAN, 
	created_by UUID NOT NULL, 
	modified_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (code)
)

;

CREATE TABLE IF NOT EXISTS ops.lab_equipment_instruments (

	id VARCHAR(36) NOT NULL, 
	instrument_id VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	type VARCHAR(100) NOT NULL, 
	status VARCHAR(50) NOT NULL, 
	location VARCHAR(200), 
	calibration_due TIMESTAMP WITH TIME ZONE, 
	maintenance_due TIMESTAMP WITH TIME ZONE, 
	settings JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	created_by UUID, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.insurances (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	fhir_coverage_id VARCHAR(255), 
	provider_name VARCHAR(200) NOT NULL, 
	provider_id VARCHAR(100), 
	provider_phone VARCHAR(20), 
	provider_website VARCHAR(500), 
	policy_number VARCHAR(50) NOT NULL, 
	group_number VARCHAR(50), 
	plan_name VARCHAR(200), 
	plan_type VARCHAR(50), 
	coverage_type VARCHAR(13) NOT NULL, 
	subscriber_id VARCHAR(50), 
	subscriber_name VARCHAR(200), 
	subscriber_relationship VARCHAR(50), 
	subscriber_dob DATE, 
	status VARCHAR(9), 
	start_date DATE NOT NULL, 
	end_date DATE NOT NULL, 
	monthly_premium FLOAT, 
	annual_deductible FLOAT, 
	deductible_met FLOAT, 
	out_of_pocket_max FLOAT, 
	out_of_pocket_met FLOAT, 
	copay_primary_care FLOAT, 
	copay_specialist FLOAT, 
	copay_urgent_care FLOAT, 
	copay_emergency FLOAT, 
	copay_prescription_generic FLOAT, 
	copay_prescription_brand FLOAT, 
	coinsurance_in_network FLOAT, 
	coinsurance_out_network FLOAT, 
	coverage_details JSON, 
	exclusions JSON, 
	prior_authorization_required JSON, 
	network_name VARCHAR(200), 
	is_in_network BOOLEAN, 
	last_verified_date DATE, 
	verified_by UUID, 
	verification_notes TEXT, 
	card_front_url VARCHAR(500), 
	card_back_url VARCHAR(500), 
	is_primary BOOLEAN, 
	coordination_of_benefits_order INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_coverage_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.clinical_notes (

	id UUID NOT NULL, 
	patient_id UUID NOT NULL, 
	doctor_id UUID NOT NULL, 
	encounter_id UUID, 
	note_type VARCHAR(50) NOT NULL, 
	note_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	subjective TEXT, 
	objective TEXT, 
	assessment TEXT, 
	plan TEXT, 
	content TEXT, 
	template_id UUID, 
	template_data JSON, 
	is_draft BOOLEAN, 
	is_locked BOOLEAN, 
	is_amended BOOLEAN, 
	amendment_notes TEXT, 
	shared_with_patient BOOLEAN, 
	shared_with_team JSON, 
	created_by UUID NOT NULL, 
	locked_by UUID, 
	locked_at TIMESTAMP WITH TIME ZONE, 
	fhir_document_reference_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS financial.charge_item_modifiers (

	id VARCHAR(36) NOT NULL, 
	charge_item_id VARCHAR(36) NOT NULL, 
	modifier_type VARCHAR(13) NOT NULL, 
	modifier_code VARCHAR(50), 
	description VARCHAR(500) NOT NULL, 
	percentage NUMERIC(5, 2), 
	amount NUMERIC(15, 2), 
	authorized_by UUID NOT NULL, 
	authorization_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	authorization_reference VARCHAR(100), 
	reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.organization_stats (

	id VARCHAR(36) NOT NULL, 
	organization_id UUID NOT NULL, 
	total_patients INTEGER, 
	active_patients INTEGER, 
	new_patients_month INTEGER, 
	new_patients_today INTEGER, 
	total_appointments INTEGER, 
	completed_appointments INTEGER, 
	cancelled_appointments INTEGER, 
	no_show_appointments INTEGER, 
	appointments_today INTEGER, 
	appointments_month INTEGER, 
	total_revenue FLOAT, 
	revenue_month FLOAT, 
	revenue_today FLOAT, 
	outstanding_payments FLOAT, 
	total_doctors INTEGER, 
	total_nurses INTEGER, 
	total_staff INTEGER, 
	active_departments INTEGER, 
	average_wait_time INTEGER, 
	average_consultation_time INTEGER, 
	patient_satisfaction_score FLOAT, 
	bed_occupancy_rate FLOAT, 
	last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (organization_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.immunization_protocols (

	id VARCHAR(36) NOT NULL, 
	immunization_id VARCHAR(36) NOT NULL, 
	series VARCHAR(200), 
	authority VARCHAR(200), 
	target_diseases JSON NOT NULL, 
	dose_number_positive INTEGER, 
	dose_number_string VARCHAR(50), 
	series_doses_positive INTEGER, 
	series_doses_string VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.message_thread_participants (

	id VARCHAR NOT NULL, 
	thread_id VARCHAR NOT NULL, 
	user_id UUID NOT NULL, 
	role VARCHAR, 
	is_active BOOLEAN, 
	joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	left_at TIMESTAMP WITH TIME ZONE, 
	notify_on_message BOOLEAN, 
	notify_on_mention BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS financial.bills (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	account_id VARCHAR(36) NOT NULL, 
	bill_number VARCHAR(50) NOT NULL, 
	bill_date DATE NOT NULL, 
	due_date DATE NOT NULL, 
	bill_type VARCHAR(50) NOT NULL, 
	service_period_start DATE NOT NULL, 
	service_period_end DATE NOT NULL, 
	status VARCHAR(11) NOT NULL, 
	total_charges NUMERIC(15, 2) NOT NULL, 
	total_discounts NUMERIC(15, 2), 
	total_adjustments NUMERIC(15, 2), 
	total_tax NUMERIC(15, 2), 
	total_amount NUMERIC(15, 2) NOT NULL, 
	paid_amount NUMERIC(15, 2), 
	balance_due NUMERIC(15, 2) NOT NULL, 
	insurance_billed BOOLEAN, 
	insurance_billed_amount NUMERIC(15, 2), 
	insurance_paid_amount NUMERIC(15, 2), 
	insurance_adjustment NUMERIC(15, 2), 
	patient_responsibility NUMERIC(15, 2), 
	notes TEXT, 
	internal_notes TEXT, 
	submitted_date DATE, 
	submitted_by UUID, 
	cancelled_date TIMESTAMP WITH TIME ZONE, 
	cancelled_by UUID, 
	cancellation_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	created_by UUID NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.dosage_form (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	code TEXT, 
	name TEXT NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.medication_product_synonym (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	product_id UUID NOT NULL, 
	name TEXT NOT NULL, 
	lang TEXT DEFAULT 'ru', 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS core.users (

	id UUID NOT NULL, 
	username VARCHAR(50), 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	email_verified BOOLEAN, 
	phone_verified BOOLEAN, 
	two_factor_enabled BOOLEAN, 
	two_factor_secret VARCHAR(255), 
	first_name VARCHAR(100) NOT NULL, 
	last_name VARCHAR(100) NOT NULL, 
	middle_name VARCHAR(100), 
	full_name VARCHAR(200), 
	phone VARCHAR(20), 
	role VARCHAR(14) NOT NULL, 
	status VARCHAR(9), 
	is_active BOOLEAN, 
	organization_id UUID, 
	department_id UUID, 
	admin_department_id UUID, 
	failed_login_attempts INTEGER, 
	locked_until TIMESTAMP WITH TIME ZONE, 
	password_changed_at TIMESTAMP WITH TIME ZONE, 
	last_login TIMESTAMP WITH TIME ZONE, 
	last_activity TIMESTAMP WITH TIME ZONE, 
	timezone VARCHAR(50), 
	language VARCHAR(5), 
	profile_image_url VARCHAR(500), 
	custom_permissions JSON, 
	fhir_practitioner_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_practitioner_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.practitioner_roles (

	id UUID NOT NULL, 
	fhir_practitioner_role_id VARCHAR(255), 
	practitioner_id UUID NOT NULL, 
	organization_id UUID NOT NULL, 
	roles JSON, 
	active BOOLEAN, 
	period_start DATE, 
	period_end DATE, 
	telecom JSON, 
	available_times JSON, 
	not_available JSON, 
	availability_exceptions TEXT, 
	healthcare_services JSON, 
	endpoints JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_practitioner_role_id)
)

;

CREATE TABLE IF NOT EXISTS ref.medication_product (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	pharm_id TEXT, 
	brand_name CITEXT NOT NULL, 
	brand_name_normalized TEXT, 
	registration_number TEXT, 
	mnn_id UUID, 
	dosage_form_id UUID, 
	route_id UUID, 
	strength_value NUMERIC, 
	strength_unit_id UUID, 
	manufacturer_id UUID, 
	country_of_origin TEXT, 
	rx_required BOOLEAN, 
	metadata JSONB DEFAULT '{}', 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.admin_activities (

	id VARCHAR(36) NOT NULL, 
	user_id UUID NOT NULL, 
	organization_id UUID, 
	activity_type VARCHAR(17) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	action VARCHAR(200) NOT NULL, 
	resource_type VARCHAR(50), 
	resource_id VARCHAR(36), 
	resource_name VARCHAR(200), 
	old_values JSON, 
	new_values JSON, 
	status VARCHAR(20) NOT NULL, 
	error_message TEXT, 
	ip_address VARCHAR(45), 
	user_agent VARCHAR(500), 
	user_metadata JSON, 
	performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.admin_departments (

	id VARCHAR(36) NOT NULL, 
	organization_id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	department_type VARCHAR(50) NOT NULL, 
	floor VARCHAR(10), 
	building VARCHAR(50), 
	room_numbers JSON, 
	phone VARCHAR(20), 
	email VARCHAR(255), 
	bed_capacity INTEGER, 
	current_occupancy INTEGER, 
	operating_hours JSON, 
	is_24_hours BOOLEAN, 
	head_id UUID, 
	is_active BOOLEAN, 
	fhir_location_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_location_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.radiology_studies (

	id VARCHAR(36) NOT NULL, 
	accession_number VARCHAR(50) NOT NULL, 
	patient_id UUID NOT NULL, 
	mrn VARCHAR(50), 
	patient_name VARCHAR(200), 
	age INTEGER, 
	gender VARCHAR(1), 
	dob DATE, 
	order_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	modality VARCHAR(20) NOT NULL, 
	body_part VARCHAR(100) NOT NULL, 
	study_description VARCHAR(500) NOT NULL, 
	indication TEXT, 
	priority VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	ordering_physician VARCHAR(200), 
	technologist VARCHAR(200), 
	location VARCHAR(200), 
	room VARCHAR(100), 
	contrast BOOLEAN, 
	preparation TEXT, 
	duration_minutes INTEGER, 
	notes TEXT, 
	insurance VARCHAR(200), 
	"authorization" VARCHAR(200), 
	cpt_code VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.system_alerts (

	id VARCHAR(36) NOT NULL, 
	alert_type VARCHAR(7) NOT NULL, 
	severity VARCHAR(8) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	message TEXT NOT NULL, 
	details JSON, 
	is_global BOOLEAN, 
	organization_id UUID, 
	department_id VARCHAR(36), 
	user_id UUID, 
	is_active BOOLEAN, 
	is_acknowledged BOOLEAN, 
	acknowledged_by UUID, 
	acknowledged_at TIMESTAMP WITH TIME ZONE, 
	is_resolved BOOLEAN, 
	resolved_by UUID, 
	resolved_at TIMESTAMP WITH TIME ZONE, 
	resolution_notes TEXT, 
	auto_resolve_after INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	expires_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.messages (

	id UUID NOT NULL, 
	conversation_id VARCHAR NOT NULL, 
	sender_id UUID NOT NULL, 
	recipient_id UUID, 
	patient_id UUID, 
	subject VARCHAR NOT NULL, 
	content TEXT NOT NULL, 
	message_type VARCHAR(12), 
	priority VARCHAR(6), 
	read BOOLEAN, 
	read_at TIMESTAMP WITH TIME ZONE, 
	delivered BOOLEAN, 
	delivered_at TIMESTAMP WITH TIME ZONE, 
	parent_message_id UUID, 
	is_system_message BOOLEAN, 
	template_id VARCHAR, 
	template_variables TEXT, 
	fhir_communication_id VARCHAR, 
	timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	edited_at TIMESTAMP WITH TIME ZONE, 
	deleted_at TIMESTAMP WITH TIME ZONE, 
	thread_id VARCHAR, 
	clinic_id VARCHAR, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.medical_records (

	id VARCHAR(36) NOT NULL, 
	fhir_encounter_id VARCHAR(255), 
	fhir_composition_id VARCHAR(255), 
	patient_id UUID NOT NULL, 
	doctor_id UUID NOT NULL, 
	hospital_id UUID NOT NULL, 
	appointment_id UUID, 
	record_number VARCHAR(50) NOT NULL, 
	record_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	record_type VARCHAR(12) NOT NULL, 
	status VARCHAR(16), 
	chief_complaint TEXT, 
	history_of_present_illness TEXT, 
	past_medical_history TEXT, 
	family_history TEXT, 
	social_history TEXT, 
	review_of_systems JSON, 
	physical_examination JSON, 
	vital_signs_id VARCHAR(36), 
	clinical_impression TEXT, 
	differential_diagnosis JSON, 
	primary_diagnosis TEXT, 
	diagnosis_codes JSON, 
	treatment_plan TEXT, 
	medications_prescribed JSON, 
	procedures_ordered JSON, 
	follow_up_instructions TEXT, 
	allergies_reviewed BOOLEAN, 
	medications_reviewed BOOLEAN, 
	problems_reviewed BOOLEAN, 
	summary TEXT, 
	is_sensitive BOOLEAN, 
	sensitivity_reason VARCHAR(200), 
	created_by UUID NOT NULL, 
	signed_by UUID, 
	signed_at TIMESTAMP WITH TIME ZONE, 
	reviewed_by UUID, 
	reviewed_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_encounter_id), 
	UNIQUE (fhir_composition_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.encounters (

	id VARCHAR(36) NOT NULL, 
	fhir_encounter_id VARCHAR(255), 
	identifiers JSON, 
	appointment_id UUID, 
	patient_id UUID NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	status_history JSON, 
	encounter_class VARCHAR(11) NOT NULL, 
	class_history JSON, 
	encounter_type JSON, 
	service_type JSON, 
	priority JSON, 
	period_start TIMESTAMP WITH TIME ZONE NOT NULL, 
	period_end TIMESTAMP WITH TIME ZONE, 
	length_minutes INTEGER, 
	reason_codes JSON, 
	reason_references JSON, 
	episode_of_care_ids JSON, 
	based_on JSON, 
	service_provider_id UUID NOT NULL, 
	account_ids JSON, 
	part_of_encounter_id VARCHAR(36), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_encounter_id)
)

;

CREATE TABLE IF NOT EXISTS notification_preferences (

	id VARCHAR(36) NOT NULL, 
	user_id UUID NOT NULL, 
	notification_type VARCHAR(24) NOT NULL, 
	in_app_enabled BOOLEAN, 
	email_enabled BOOLEAN, 
	sms_enabled BOOLEAN, 
	push_enabled BOOLEAN, 
	voice_enabled BOOLEAN, 
	quiet_hours_enabled BOOLEAN, 
	quiet_hours_start VARCHAR(5), 
	quiet_hours_end VARCHAR(5), 
	max_per_day INTEGER, 
	min_interval_minutes INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_user_notification_type UNIQUE (user_id, notification_type)
)

;

CREATE TABLE IF NOT EXISTS ehr.lab_orders (

	id VARCHAR(36) NOT NULL, 
	fhir_service_request_id VARCHAR(255), 
	identifiers JSON, 
	requisition JSON, 
	patient_id UUID NOT NULL, 
	ordered_by UUID NOT NULL, 
	encounter_id UUID, 
	order_number VARCHAR(50) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	intent VARCHAR(14) NOT NULL, 
	priority VARCHAR(7) NOT NULL, 
	tests_ordered JSON NOT NULL, 
	category JSON, 
	clinical_indication TEXT, 
	clinical_notes TEXT, 
	reason_codes JSON, 
	supporting_info JSON, 
	ordered_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	required_by TIMESTAMP WITH TIME ZONE, 
	occurrence_date TIMESTAMP WITH TIME ZONE, 
	patient_instructions TEXT, 
	lab_instructions TEXT, 
	do_not_perform BOOLEAN, 
	specimen_required BOOLEAN, 
	specimen_type VARCHAR(6), 
	specimen_instructions TEXT, 
	fasting_required BOOLEAN, 
	performing_lab_id VARCHAR(36), 
	location_code JSON, 
	insurance_ids JSON, 
	cancelled_by UUID, 
	cancelled_at TIMESTAMP WITH TIME ZONE, 
	cancellation_reason VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_service_request_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.family_member_conditions (

	id VARCHAR(36) NOT NULL, 
	family_member_id VARCHAR(36) NOT NULL, 
	code JSON NOT NULL, 
	outcome JSON, 
	contributed_to_death BOOLEAN, 
	onset_age INTEGER, 
	onset_range_low INTEGER, 
	onset_range_high INTEGER, 
	onset_period_start DATE, 
	onset_period_end DATE, 
	onset_string VARCHAR(200), 
	notes JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS financial.insurance_authorizations (

	id VARCHAR(36) NOT NULL, 
	insurance_id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	authorization_number VARCHAR(50), 
	request_date DATE NOT NULL, 
	service_type VARCHAR(100) NOT NULL, 
	procedure_codes JSON NOT NULL, 
	diagnosis_codes JSON NOT NULL, 
	requesting_provider_id UUID NOT NULL, 
	servicing_provider_id UUID, 
	status VARCHAR(20) NOT NULL, 
	decision_date DATE, 
	valid_from DATE, 
	valid_to DATE, 
	units_approved INTEGER, 
	units_used INTEGER, 
	clinical_notes TEXT, 
	payer_notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (authorization_number)
)

;

CREATE TABLE IF NOT EXISTS ehr.observations (

	id UUID NOT NULL, 
	fhir_observation_id VARCHAR(255), 
	identifiers JSON, 
	patient_id UUID NOT NULL, 
	encounter_id VARCHAR(36), 
	status VARCHAR(16) NOT NULL, 
	category VARCHAR(11) NOT NULL, 
	code JSON NOT NULL, 
	display_name VARCHAR(500) NOT NULL, 
	based_on JSON, 
	part_of JSON, 
	focus JSON, 
	effective_date TIMESTAMP WITH TIME ZONE, 
	effective_period_start TIMESTAMP WITH TIME ZONE, 
	effective_period_end TIMESTAMP WITH TIME ZONE, 
	issued TIMESTAMP WITH TIME ZONE, 
	performers JSON, 
	value_type VARCHAR(50), 
	value_data JSON, 
	value_quantity FLOAT, 
	value_unit VARCHAR(50), 
	value_string VARCHAR(500), 
	value_boolean BOOLEAN, 
	value_integer INTEGER, 
	data_absent_reason JSON, 
	interpretation JSON, 
	is_abnormal BOOLEAN, 
	notes JSON, 
	body_site JSON, 
	method JSON, 
	specimen_id UUID, 
	device JSON, 
	reference_ranges JSON, 
	reference_range_low FLOAT, 
	reference_range_high FLOAT, 
	reference_range_text VARCHAR(200), 
	has_member JSON, 
	derived_from JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_observation_id)
)

;

CREATE TABLE IF NOT EXISTS ops.scheduled_reports (

	id VARCHAR(36) NOT NULL, 
	template_id VARCHAR(36) NOT NULL, 
	organization_id UUID NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	schedule JSON NOT NULL, 
	timezone VARCHAR(50), 
	parameters JSON, 
	filters JSON, 
	recipients JSON NOT NULL, 
	cc_recipients JSON, 
	delivery_format VARCHAR(20), 
	include_raw_data BOOLEAN, 
	is_active BOOLEAN, 
	last_run_at TIMESTAMP WITH TIME ZONE, 
	last_run_status VARCHAR(20), 
	last_run_error TEXT, 
	next_run_at TIMESTAMP WITH TIME ZONE, 
	created_by UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.nurse_shift_assignments (

	id VARCHAR(36) NOT NULL, 
	nurse_id VARCHAR(36) NOT NULL, 
	department_id UUID NOT NULL, 
	shift_date DATE NOT NULL, 
	shift_type VARCHAR(20) NOT NULL, 
	start_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	end_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	status VARCHAR(20), 
	checked_in_at TIMESTAMP WITH TIME ZONE, 
	checked_out_at TIMESTAMP WITH TIME ZONE, 
	is_overtime BOOLEAN, 
	is_holiday BOOLEAN, 
	replaced_nurse_id VARCHAR(36), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.blocked_time_slots (

	id VARCHAR(36) NOT NULL, 
	doctor_id UUID NOT NULL, 
	schedule_id VARCHAR(36), 
	start_datetime TIMESTAMP WITH TIME ZONE NOT NULL, 
	end_datetime TIMESTAMP WITH TIME ZONE NOT NULL, 
	reason VARCHAR(200) NOT NULL, 
	block_type VARCHAR(50) NOT NULL, 
	description TEXT, 
	is_recurring BOOLEAN, 
	recurrence_pattern JSON, 
	recurrence_end_date DATE, 
	is_active BOOLEAN, 
	created_by UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.route (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	code TEXT NOT NULL, 
	name TEXT NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.medication_price (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	presentation_id UUID NOT NULL, 
	price_type TEXT DEFAULT 'retail' NOT NULL, 
	currency TEXT NOT NULL, 
	amount NUMERIC NOT NULL, 
	source TEXT, 
	noted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.immunization_reactions (

	id VARCHAR(36) NOT NULL, 
	immunization_id VARCHAR(36) NOT NULL, 
	date TIMESTAMP WITH TIME ZONE, 
	detail JSON, 
	reported BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.medication_administrations (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	administered_by UUID, 
	room VARCHAR(50), 
	date DATE NOT NULL, 
	medication VARCHAR(200) NOT NULL, 
	dosage VARCHAR(100) NOT NULL, 
	frequency VARCHAR(100), 
	route VARCHAR(50), 
	time_to_administer VARCHAR(10) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	status_time VARCHAR(10), 
	next_due VARCHAR(10), 
	administered_at TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.hospitalizations (

	id VARCHAR(36) NOT NULL, 
	encounter_id VARCHAR(36) NOT NULL, 
	pre_admission_identifier JSON, 
	origin_location_id VARCHAR(36), 
	admit_source JSON, 
	re_admission JSON, 
	diet_preference JSON, 
	special_courtesy JSON, 
	special_arrangement JSON, 
	destination_location_id VARCHAR(36), 
	discharge_disposition JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (encounter_id)
)

;

CREATE TABLE IF NOT EXISTS ops.notifications (

	id VARCHAR(36) NOT NULL, 
	recipient_id UUID NOT NULL, 
	notification_type VARCHAR(24) NOT NULL, 
	channel VARCHAR(10) NOT NULL, 
	priority VARCHAR(6), 
	title VARCHAR(200) NOT NULL, 
	message TEXT NOT NULL, 
	data JSON, 
	reference_type VARCHAR(50), 
	reference_id VARCHAR(36), 
	status VARCHAR(9), 
	scheduled_for TIMESTAMP WITH TIME ZONE, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	delivered_at TIMESTAMP WITH TIME ZONE, 
	read_at TIMESTAMP WITH TIME ZONE, 
	failed_at TIMESTAMP WITH TIME ZONE, 
	failure_reason TEXT, 
	retry_count INTEGER, 
	max_retries INTEGER, 
	action_url VARCHAR(500), 
	action_text VARCHAR(100), 
	requires_action BOOLEAN, 
	action_taken BOOLEAN, 
	action_taken_at TIMESTAMP WITH TIME ZONE, 
	expires_at TIMESTAMP WITH TIME ZONE, 
	group_id VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.message_templates (

	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	category VARCHAR NOT NULL, 
	content TEXT NOT NULL, 
	variables TEXT, 
	is_active BOOLEAN, 
	use_count INTEGER, 
	role_restrictions TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	created_by UUID NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (name)
)

;

CREATE TABLE IF NOT EXISTS ehr.patient_accounts (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	account_number VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	account_type VARCHAR(50), 
	status VARCHAR(20), 
	guarantor_name VARCHAR(200), 
	guarantor_relationship VARCHAR(50), 
	guarantor_phone VARCHAR(20), 
	guarantor_address TEXT, 
	total_charges NUMERIC(15, 2), 
	total_adjustments NUMERIC(15, 2), 
	total_payments NUMERIC(15, 2), 
	current_balance NUMERIC(15, 2), 
	credit_limit NUMERIC(15, 2), 
	payment_terms_days INTEGER, 
	coverage_start DATE, 
	coverage_end DATE, 
	service_period_start DATE, 
	service_period_end DATE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.nurse_settings (

	id VARCHAR(36) NOT NULL, 
	nurse_id VARCHAR(36) NOT NULL, 
	notify_critical_results BOOLEAN, 
	notify_medication_due BOOLEAN, 
	notify_task_overdue BOOLEAN, 
	dashboard_default_tab VARCHAR(50), 
	items_per_page INTEGER, 
	auto_assign_vitals BOOLEAN, 
	allow_cross_unit_tasks BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (nurse_id)
)

;

CREATE TABLE IF NOT EXISTS ref.medication_product_category (

	product_id UUID NOT NULL, 
	category_id UUID NOT NULL, 
	PRIMARY KEY (product_id, category_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.lab_results (

	id UUID NOT NULL, 
	fhir_observation_id VARCHAR(255), 
	fhir_diagnostic_report_id VARCHAR(255), 
	patient_id UUID NOT NULL, 
	lab_order_id VARCHAR(36), 
	medical_record_id VARCHAR(36), 
	result_number VARCHAR(50) NOT NULL, 
	accession_number VARCHAR(50), 
	test_name VARCHAR(200) NOT NULL, 
	test_code VARCHAR(50) NOT NULL, 
	test_category VARCHAR(100), 
	panel_name VARCHAR(200), 
	result_value VARCHAR(100) NOT NULL, 
	result_unit VARCHAR(50), 
	result_type VARCHAR(20), 
	reference_range VARCHAR(100), 
	reference_range_low FLOAT, 
	reference_range_high FLOAT, 
	reference_range_text TEXT, 
	is_abnormal BOOLEAN, 
	abnormality_type VARCHAR(13), 
	is_critical BOOLEAN, 
	status VARCHAR(11) NOT NULL, 
	interpretation TEXT, 
	clinical_significance TEXT, 
	comments TEXT, 
	performing_lab_name VARCHAR(200), 
	performing_lab_id UUID, 
	lab_director VARCHAR(200), 
	specimen_type VARCHAR(6), 
	specimen_collected_date TIMESTAMP WITH TIME ZONE, 
	specimen_received_date TIMESTAMP WITH TIME ZONE, 
	specimen_condition VARCHAR(100), 
	test_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	resulted_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	verified_date TIMESTAMP WITH TIME ZONE, 
	ordered_by UUID, 
	performed_by VARCHAR(200), 
	verified_by VARCHAR(200), 
	resulted_by VARCHAR(200), 
	report_file_url VARCHAR(500), 
	attachments JSON, 
	test_method VARCHAR(200), 
	instrument_id VARCHAR(100), 
	previous_results JSON, 
	delta VARCHAR(50), 
	trend VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_observation_id), 
	UNIQUE (fhir_diagnostic_report_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.condition_evidence (

	id VARCHAR(36) NOT NULL, 
	condition_id VARCHAR(36) NOT NULL, 
	code JSON, 
	detail JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.medication_administration_events (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	medication_id VARCHAR(36), 
	nurse_id VARCHAR(36) NOT NULL, 
	action VARCHAR(20) NOT NULL, 
	reason TEXT, 
	dose_given VARCHAR(100), 
	route VARCHAR(50), 
	administered_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	comments TEXT, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS pharmacy_prescription_prices (

	id VARCHAR(36) NOT NULL, 
	pharmacy_id VARCHAR(36) NOT NULL, 
	prescription_id UUID NOT NULL, 
	is_available BOOLEAN, 
	stock_quantity INTEGER, 
	last_stock_check TIMESTAMP WITH TIME ZONE, 
	unit_price FLOAT NOT NULL, 
	total_price FLOAT NOT NULL, 
	currency VARCHAR(3), 
	discount_percent FLOAT, 
	discount_amount FLOAT, 
	final_price FLOAT NOT NULL, 
	insurance_accepted BOOLEAN, 
	insurance_coverage_percent FLOAT, 
	estimated_copay FLOAT, 
	generic_available BOOLEAN, 
	generic_price FLOAT, 
	price_valid_until TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_pharmacy_prescription UNIQUE (pharmacy_id, prescription_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.appointment_participants (

	id VARCHAR(36) NOT NULL, 
	appointment_id UUID NOT NULL, 
	participant_type VARCHAR(19) NOT NULL, 
	user_id UUID, 
	external_participant_name VARCHAR(200), 
	external_participant_contact VARCHAR(100), 
	required BOOLEAN, 
	status VARCHAR(20), 
	start_time TIMESTAMP WITH TIME ZONE, 
	end_time TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.appointment_reminders (

	id VARCHAR(36) NOT NULL, 
	appointment_id UUID NOT NULL, 
	reminder_type VARCHAR(20) NOT NULL, 
	scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	sent BOOLEAN, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	delivered BOOLEAN, 
	delivered_at TIMESTAMP WITH TIME ZONE, 
	response_received BOOLEAN, 
	response_type VARCHAR(20), 
	response_received_at TIMESTAMP WITH TIME ZONE, 
	failed BOOLEAN, 
	failure_reason VARCHAR(500), 
	retry_count INTEGER, 
	message_content TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.care_plans (

	id VARCHAR(36) NOT NULL, 
	fhir_care_plan_id VARCHAR(255), 
	identifiers JSON, 
	medical_record_id VARCHAR(36), 
	patient_id UUID NOT NULL, 
	encounter_id UUID, 
	status VARCHAR(20) NOT NULL, 
	intent VARCHAR(20) NOT NULL, 
	title VARCHAR(500), 
	description TEXT, 
	category JSON, 
	period_start DATE, 
	period_end DATE, 
	created TIMESTAMP WITH TIME ZONE NOT NULL, 
	author_id UUID, 
	contributors JSON, 
	care_team JSON, 
	addresses JSON, 
	supporting_info JSON, 
	goals JSON, 
	activities JSON, 
	notes JSON, 
	based_on JSON, 
	replaces JSON, 
	part_of JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_care_plan_id)
)

;

CREATE TABLE IF NOT EXISTS ops.service_prices (

	id VARCHAR(36) NOT NULL, 
	organization_id UUID NOT NULL, 
	department_id VARCHAR(36), 
	service_code VARCHAR(50) NOT NULL, 
	service_name VARCHAR(200) NOT NULL, 
	service_category VARCHAR(100) NOT NULL, 
	description TEXT, 
	base_price FLOAT NOT NULL, 
	currency VARCHAR(3), 
	insurance_covered BOOLEAN, 
	insurance_coverage_percent FLOAT, 
	cash_discount_percent FLOAT, 
	tax_rate FLOAT, 
	tax_included BOOLEAN, 
	duration_minutes INTEGER, 
	is_active BOOLEAN, 
	requires_approval BOOLEAN, 
	valid_from DATE NOT NULL, 
	valid_to DATE, 
	created_by UUID, 
	approved_by UUID, 
	approved_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS core.user_activities (

	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	activity_type VARCHAR(50) NOT NULL, 
	description TEXT, 
	resource_id UUID, 
	ip_address INET, 
	user_agent VARCHAR(500), 
	metadata JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.emergency_contacts (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	relationship_type VARCHAR(50) NOT NULL, 
	phone_primary VARCHAR(20) NOT NULL, 
	phone_secondary VARCHAR(20), 
	email VARCHAR(255), 
	address TEXT, 
	is_primary BOOLEAN, 
	priority INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.patients (

	patient_id UUID NOT NULL, 
	user_id UUID, 
	date_of_birth DATE, 
	sex VARCHAR(10), 
	phone VARCHAR(50), 
	address TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (patient_id), 
	UNIQUE (user_id)
)

;

CREATE TABLE IF NOT EXISTS ops.notification_templates (

	id VARCHAR(36) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	notification_type VARCHAR(24) NOT NULL, 
	channels JSON NOT NULL, 
	title_template TEXT NOT NULL, 
	message_template TEXT NOT NULL, 
	email_subject_template TEXT, 
	email_body_template TEXT, 
	sms_template TEXT, 
	push_template TEXT, 
	required_variables JSON, 
	optional_variables JSON, 
	is_active BOOLEAN, 
	priority VARCHAR(6), 
	language VARCHAR(5), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (code)
)

;

CREATE TABLE IF NOT EXISTS core.user_settings (

	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	email_notifications BOOLEAN, 
	sms_notifications BOOLEAN, 
	push_notifications BOOLEAN, 
	appointment_reminders BOOLEAN, 
	appointment_confirmations BOOLEAN, 
	appointment_cancellations BOOLEAN, 
	lab_results_ready BOOLEAN, 
	prescription_reminders BOOLEAN, 
	patient_messages BOOLEAN, 
	system_updates BOOLEAN, 
	marketing_emails BOOLEAN, 
	appointment_reminder_time VARCHAR(20), 
	prescription_reminder_time VARCHAR(20), 
	login_alerts BOOLEAN, 
	session_timeout INTEGER, 
	require_password_change INTEGER, 
	available_for_appointments BOOLEAN, 
	available_for_emergency BOOLEAN, 
	working_days JSON, 
	working_hours_start VARCHAR(5), 
	working_hours_end VARCHAR(5), 
	lunch_break_enabled BOOLEAN, 
	lunch_break_start VARCHAR(5), 
	lunch_break_end VARCHAR(5), 
	consultation_duration INTEGER, 
	buffer_time INTEGER, 
	theme VARCHAR(20), 
	sidebar_collapsed BOOLEAN, 
	font_size VARCHAR(20), 
	high_contrast BOOLEAN, 
	date_format VARCHAR(20), 
	time_format VARCHAR(2), 
	start_page VARCHAR(50), 
	items_per_page INTEGER, 
	dashboard_layout JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id)
)

;

CREATE TABLE IF NOT EXISTS financial.charge_items (

	id VARCHAR(36) NOT NULL, 
	fhir_charge_item_id VARCHAR(255), 
	identifiers JSON, 
	patient_id UUID NOT NULL, 
	encounter_id VARCHAR(36), 
	appointment_id UUID, 
	service_code VARCHAR(50) NOT NULL, 
	service_name VARCHAR(500) NOT NULL, 
	service_category VARCHAR(100), 
	code JSON NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	occurrence_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	occurrence_period_start TIMESTAMP WITH TIME ZONE, 
	occurrence_period_end TIMESTAMP WITH TIME ZONE, 
	quantity NUMERIC(10, 2) NOT NULL, 
	quantity_unit VARCHAR(20), 
	unit_price NUMERIC(15, 2) NOT NULL, 
	gross_amount NUMERIC(15, 2) NOT NULL, 
	factor_override NUMERIC(5, 2), 
	price_override NUMERIC(15, 2), 
	override_reason TEXT, 
	discount_amount NUMERIC(15, 2), 
	tax_amount NUMERIC(15, 2), 
	net_amount NUMERIC(15, 2) NOT NULL, 
	performer_id UUID, 
	performing_organization_id UUID, 
	requesting_organization_id UUID, 
	cost_center_id UUID, 
	body_site JSON, 
	reason_codes JSON, 
	product_reference VARCHAR(255), 
	product_code JSON, 
	account_id VARCHAR(36), 
	supporting_info JSON, 
	notes JSON, 
	entered_by UUID NOT NULL, 
	entered_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	is_billed BOOLEAN, 
	billed_date TIMESTAMP WITH TIME ZONE, 
	bill_id VARCHAR(36), 
	part_of_id VARCHAR(36), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_charge_item_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.doctor_schedules (

	id VARCHAR(36) NOT NULL, 
	doctor_id UUID NOT NULL, 
	is_recurring BOOLEAN, 
	day_of_week INTEGER, 
	start_time TIME WITHOUT TIME ZONE NOT NULL, 
	end_time TIME WITHOUT TIME ZONE NOT NULL, 
	specific_date DATE, 
	break_start TIME WITHOUT TIME ZONE, 
	break_end TIME WITHOUT TIME ZONE, 
	location_id UUID, 
	room_number VARCHAR(20), 
	slot_duration INTEGER, 
	buffer_time INTEGER, 
	max_appointments INTEGER, 
	allowed_appointment_types JSON, 
	is_active BOOLEAN, 
	valid_from DATE NOT NULL, 
	valid_to DATE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.family_member_histories (

	id VARCHAR(36) NOT NULL, 
	fhir_family_member_history_id VARCHAR(255), 
	identifiers JSON, 
	patient_id UUID NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	data_absent_reason JSON, 
	name VARCHAR(200), 
	relationship_type JSON NOT NULL, 
	sex JSON, 
	born_period_start DATE, 
	born_period_end DATE, 
	born_date DATE, 
	born_string VARCHAR(200), 
	age_age INTEGER, 
	age_range_low INTEGER, 
	age_range_high INTEGER, 
	age_string VARCHAR(200), 
	deceased_boolean BOOLEAN, 
	deceased_age INTEGER, 
	deceased_range_low INTEGER, 
	deceased_range_high INTEGER, 
	deceased_date DATE, 
	deceased_string VARCHAR(200), 
	reason_codes JSON, 
	reason_references JSON, 
	notes JSON, 
	date TIMESTAMP WITH TIME ZONE NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_family_member_history_id)
)

;

CREATE TABLE IF NOT EXISTS ref.manufacturer (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	name CITEXT NOT NULL, 
	country TEXT, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_manufacturer_name_country UNIQUE (name, country)
)

;

CREATE TABLE IF NOT EXISTS ehr.radiology_reports (

	id VARCHAR(36) NOT NULL, 
	study_id VARCHAR(36) NOT NULL, 
	radiologist_id UUID, 
	report_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	findings TEXT NOT NULL, 
	impression TEXT NOT NULL, 
	recommendations TEXT, 
	is_critical BOOLEAN, 
	status VARCHAR(20), 
	PRIMARY KEY (id), 
	UNIQUE (study_id)
)

;

CREATE TABLE IF NOT EXISTS staging.drug_catalog_raw (

	id SERIAL NOT NULL, 
	source_row JSONB NOT NULL, 
	src_file TEXT, 
	src_sheet TEXT, 
	imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.encounter_participants (

	id VARCHAR(36) NOT NULL, 
	encounter_id VARCHAR(36) NOT NULL, 
	participant_type JSON, 
	individual_id UUID, 
	period_start TIMESTAMP WITH TIME ZONE, 
	period_end TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.claim_line_items (

	id VARCHAR(36) NOT NULL, 
	claim_id VARCHAR(36) NOT NULL, 
	line_number INTEGER NOT NULL, 
	service_date DATE NOT NULL, 
	procedure_code VARCHAR(20) NOT NULL, 
	procedure_description VARCHAR(500) NOT NULL, 
	modifiers JSON, 
	quantity FLOAT NOT NULL, 
	unit_charge FLOAT NOT NULL, 
	total_charge FLOAT NOT NULL, 
	allowed_amount FLOAT, 
	paid_amount FLOAT, 
	patient_responsibility FLOAT, 
	status VARCHAR(20), 
	denial_reason VARCHAR(500), 
	place_of_service_code VARCHAR(5), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS core.user_sessions (

	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	token_hash VARCHAR(255) NOT NULL, 
	refresh_token_hash VARCHAR(255), 
	ip_address VARCHAR(45), 
	user_agent VARCHAR(500), 
	device_type VARCHAR(50), 
	device_info JSON, 
	location VARCHAR(200), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	is_active BOOLEAN, 
	revoked_at TIMESTAMP WITH TIME ZONE, 
	revoked_reason VARCHAR(200), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.system_configs (

	id VARCHAR(36) NOT NULL, 
	organization_id UUID, 
	category VARCHAR(50) NOT NULL, 
	key VARCHAR(100) NOT NULL, 
	value JSON NOT NULL, 
	value_type VARCHAR(20) NOT NULL, 
	description TEXT, 
	is_required BOOLEAN, 
	is_sensitive BOOLEAN, 
	allowed_values JSON, 
	min_value FLOAT, 
	max_value FLOAT, 
	is_global BOOLEAN, 
	is_public BOOLEAN, 
	modified_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS staging.price_raw (

	id SERIAL NOT NULL, 
	source_row JSONB NOT NULL, 
	src_file TEXT, 
	src_sheet TEXT, 
	imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.bulk_operations (

	id VARCHAR(36) NOT NULL, 
	organization_id UUID NOT NULL, 
	operation_type VARCHAR(20) NOT NULL, 
	resource_type VARCHAR(50) NOT NULL, 
	file_name VARCHAR(255), 
	file_size INTEGER, 
	file_format VARCHAR(20), 
	file_url VARCHAR(500), 
	total_records INTEGER, 
	processed_records INTEGER, 
	successful_records INTEGER, 
	failed_records INTEGER, 
	errors JSON, 
	warnings JSON, 
	status VARCHAR(20), 
	progress_percent FLOAT, 
	options JSON, 
	filters JSON, 
	started_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	performed_by UUID NOT NULL, 
	result_summary JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.medical_history (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	condition VARCHAR(500) NOT NULL, 
	icd10_code VARCHAR(10), 
	diagnosed_date DATE, 
	resolved_date DATE, 
	status VARCHAR(20), 
	severity VARCHAR(20), 
	notes TEXT, 
	recorded_by UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.doctor_schedule_templates (

	id UUID NOT NULL, 
	doctor_id UUID NOT NULL, 
	day_of_week INTEGER NOT NULL, 
	start_time VARCHAR(5) NOT NULL, 
	end_time VARCHAR(5) NOT NULL, 
	break_start VARCHAR(5), 
	break_end VARCHAR(5), 
	slot_duration INTEGER, 
	buffer_time INTEGER, 
	location_id UUID, 
	room_number VARCHAR(50), 
	consultation_types JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.encounter_diagnoses (

	id VARCHAR(36) NOT NULL, 
	encounter_id VARCHAR(36) NOT NULL, 
	condition_reference VARCHAR(255), 
	condition_code JSON, 
	use JSON, 
	rank INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.message_attachments (

	id VARCHAR NOT NULL, 
	message_id UUID NOT NULL, 
	file_name VARCHAR NOT NULL, 
	file_type VARCHAR NOT NULL, 
	file_size INTEGER NOT NULL, 
	file_url VARCHAR NOT NULL, 
	description VARCHAR, 
	uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	fhir_binary_id VARCHAR, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.lab_reports (

	id UUID NOT NULL, 
	order_id VARCHAR(36), 
	patient_id UUID, 
	report_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	title VARCHAR(200) NOT NULL, 
	summary TEXT, 
	metrics JSON, 
	attachments JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.message_threads (

	id VARCHAR NOT NULL, 
	thread_type VARCHAR NOT NULL, 
	patient_id UUID, 
	encounter_id VARCHAR(36), 
	clinic_id VARCHAR, 
	title VARCHAR, 
	description TEXT, 
	is_active BOOLEAN, 
	is_archived BOOLEAN, 
	archived_at TIMESTAMP WITH TIME ZONE, 
	retention_days INTEGER, 
	expires_at TIMESTAMP WITH TIME ZONE, 
	fhir_communication_id VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.general_reports (

	id UUID NOT NULL, 
	patient_id UUID NOT NULL, 
	doctor_id UUID NOT NULL, 
	encounter_id UUID, 
	clinic_id UUID NOT NULL, 
	report_code VARCHAR(20) NOT NULL, 
	report_type VARCHAR(50) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	chief_complaint TEXT NOT NULL, 
	onset_time TIMESTAMP WITH TIME ZONE, 
	info_source VARCHAR(50), 
	hpi_onset VARCHAR(50), 
	hpi_duration VARCHAR(100), 
	hpi_course VARCHAR(50), 
	hpi_modifiers JSON, 
	hpi_associated_symptoms JSON, 
	hpi_free_text TEXT, 
	pmh_conditions JSON, 
	pmh_surgeries TEXT, 
	fh_cardio VARCHAR(20), 
	fh_diabetes VARCHAR(20), 
	fh_cancer VARCHAR(20), 
	fh_notes TEXT, 
	social_smoking VARCHAR(20), 
	social_audit_c INTEGER, 
	social_exercise VARCHAR(20), 
	ros_respiratory VARCHAR(20) NOT NULL, 
	ros_cardio VARCHAR(20) NOT NULL, 
	ros_gi VARCHAR(20) NOT NULL, 
	ros_neuro VARCHAR(20) NOT NULL, 
	ros_gu VARCHAR(20) NOT NULL, 
	ros_derm VARCHAR(20) NOT NULL, 
	ros_ent VARCHAR(20) NOT NULL, 
	ros_msk VARCHAR(20) NOT NULL, 
	ros_notes JSON, 
	pe_general VARCHAR(20) NOT NULL, 
	pe_lungs VARCHAR(20) NOT NULL, 
	pe_heart VARCHAR(20) NOT NULL, 
	pe_abdomen VARCHAR(20) NOT NULL, 
	pe_neuro VARCHAR(20) NOT NULL, 
	pe_extremities VARCHAR(20) NOT NULL, 
	pe_notes JSON, 
	working_diagnoses JSON, 
	differential_diagnoses JSON, 
	plan_tests JSON, 
	plan_referrals JSON, 
	plan_med_changes JSON, 
	plan_lifestyle JSON, 
	plan_follow_up VARCHAR(50), 
	visit_summary TEXT, 
	fhir_document_reference_id VARCHAR(255), 
	fhir_binary_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	signed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.doctor_departments (

	doctor_id UUID NOT NULL, 
	department_id UUID NOT NULL, 
	PRIMARY KEY (doctor_id, department_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.document_references (

	id VARCHAR(36) NOT NULL, 
	fhir_document_reference_id VARCHAR(255), 
	master_identifier JSON, 
	identifiers JSON, 
	medical_record_id VARCHAR(36), 
	patient_id UUID NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	doc_status VARCHAR(20), 
	type VARCHAR(17) NOT NULL, 
	category JSON, 
	title VARCHAR(500) NOT NULL, 
	description TEXT, 
	date TIMESTAMP WITH TIME ZONE NOT NULL, 
	authors JSON, 
	authenticator_id UUID, 
	custodian_id UUID, 
	content JSON NOT NULL, 
	encounter_id UUID, 
	event JSON, 
	period_start TIMESTAMP WITH TIME ZONE, 
	period_end TIMESTAMP WITH TIME ZONE, 
	facility_type JSON, 
	practice_setting JSON, 
	source_patient_info JSON, 
	related_documents JSON, 
	security_labels JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_document_reference_id)
)

;

CREATE TABLE IF NOT EXISTS role_permissions (

	id UUID NOT NULL, 
	role VARCHAR(14) NOT NULL, 
	permission_id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT uq_role_permission UNIQUE (role, permission_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.allergy_reactions (

	id VARCHAR(36) NOT NULL, 
	allergy_id VARCHAR(36) NOT NULL, 
	substance JSON, 
	manifestations JSON NOT NULL, 
	description TEXT, 
	severity VARCHAR(8), 
	exposure_route JSON, 
	onset TIMESTAMP WITH TIME ZONE, 
	notes JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS core.system_metrics (

	id UUID NOT NULL, 
	hospital_id UUID, 
	metric_date DATE NOT NULL, 
	avg_cpu_usage NUMERIC(5, 2) NOT NULL, 
	max_cpu_usage NUMERIC(5, 2) NOT NULL, 
	avg_memory_usage NUMERIC(5, 2) NOT NULL, 
	max_memory_usage NUMERIC(5, 2) NOT NULL, 
	avg_disk_usage NUMERIC(5, 2) NOT NULL, 
	max_disk_usage NUMERIC(5, 2) NOT NULL, 
	avg_process_count INTEGER NOT NULL, 
	max_process_count INTEGER NOT NULL, 
	total_users INTEGER NOT NULL, 
	active_users INTEGER NOT NULL, 
	total_appointments INTEGER NOT NULL, 
	completed_appointments INTEGER NOT NULL, 
	total_activities INTEGER NOT NULL, 
	system_uptime_hours NUMERIC(8, 2) NOT NULL, 
	error_count INTEGER NOT NULL, 
	warning_count INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS login_sessions (

	id VARCHAR(36) NOT NULL, 
	user_id UUID NOT NULL, 
	session_token_hash VARCHAR(255) NOT NULL, 
	refresh_token_hash VARCHAR(255), 
	device_type VARCHAR(50), 
	device_name VARCHAR(100), 
	device_id VARCHAR(255), 
	browser VARCHAR(50), 
	browser_version VARCHAR(20), 
	user_agent VARCHAR(500), 
	os VARCHAR(50), 
	os_version VARCHAR(20), 
	ip_address VARCHAR(45) NOT NULL, 
	ip_country VARCHAR(2), 
	ip_region VARCHAR(100), 
	ip_city VARCHAR(100), 
	location VARCHAR(200), 
	login_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	last_activity_type VARCHAR(50), 
	is_active BOOLEAN, 
	is_trusted BOOLEAN, 
	logged_out_at TIMESTAMP WITH TIME ZONE, 
	logout_reason VARCHAR(50), 
	two_factor_verified BOOLEAN, 
	suspicious_activity BOOLEAN, 
	risk_score INTEGER, 
	session_data JSON, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	idle_timeout_minutes INTEGER, 
	absolute_timeout_hours INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (refresh_token_hash)
)

;

CREATE TABLE IF NOT EXISTS ehr.vital_signs (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	medical_record_id VARCHAR(36), 
	measured_by UUID NOT NULL, 
	temperature FLOAT, 
	temperature_method VARCHAR(20), 
	blood_pressure_systolic INTEGER, 
	blood_pressure_diastolic INTEGER, 
	blood_pressure_position VARCHAR(20), 
	heart_rate INTEGER, 
	heart_rhythm VARCHAR(50), 
	respiratory_rate INTEGER, 
	oxygen_saturation INTEGER, 
	oxygen_flow_rate FLOAT, 
	weight FLOAT, 
	height FLOAT, 
	bmi FLOAT, 
	head_circumference FLOAT, 
	pain_scale INTEGER, 
	pain_location VARCHAR(200), 
	blood_glucose FLOAT, 
	glucose_method VARCHAR(50), 
	measured_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	notes TEXT, 
	fhir_observation_ids JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.doctor_schedule_exceptions (

	id UUID NOT NULL, 
	doctor_id UUID NOT NULL, 
	exception_date DATE NOT NULL, 
	exception_type VARCHAR(50) NOT NULL, 
	start_time VARCHAR(5), 
	end_time VARCHAR(5), 
	reason VARCHAR(200), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.clinical_impressions (

	id VARCHAR(36) NOT NULL, 
	fhir_clinical_impression_id VARCHAR(255), 
	identifiers JSON, 
	medical_record_id VARCHAR(36), 
	patient_id UUID NOT NULL, 
	encounter_id UUID, 
	assessor_id UUID NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	status_reason JSON, 
	code JSON, 
	description TEXT, 
	effective_date TIMESTAMP WITH TIME ZONE, 
	effective_period_start TIMESTAMP WITH TIME ZONE, 
	effective_period_end TIMESTAMP WITH TIME ZONE, 
	date TIMESTAMP WITH TIME ZONE NOT NULL, 
	previous_id VARCHAR(36), 
	problems JSON, 
	investigations JSON, 
	summary TEXT, 
	findings JSON, 
	prognosis_codeable_concepts JSON, 
	prognosis_references JSON, 
	supporting_info JSON, 
	protocols JSON, 
	notes JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_clinical_impression_id)
)

;

CREATE TABLE IF NOT EXISTS ops.department_stats (

	id VARCHAR(36) NOT NULL, 
	department_id VARCHAR(36) NOT NULL, 
	total_staff INTEGER, 
	doctors_count INTEGER, 
	nurses_count INTEGER, 
	support_staff_count INTEGER, 
	total_patients INTEGER, 
	active_patients INTEGER, 
	patients_today INTEGER, 
	patient_staff_ratio FLOAT, 
	appointments_today INTEGER, 
	appointments_month INTEGER, 
	average_daily_appointments FLOAT, 
	revenue_month FLOAT, 
	revenue_per_patient FLOAT, 
	average_wait_time INTEGER, 
	bed_occupancy_rate FLOAT, 
	last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (department_id)
)

;

CREATE TABLE IF NOT EXISTS ref.unit (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	code TEXT NOT NULL, 
	name TEXT NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.encounter_locations (

	id VARCHAR(36) NOT NULL, 
	encounter_id VARCHAR(36) NOT NULL, 
	location_id UUID NOT NULL, 
	status VARCHAR(20), 
	physical_type JSON, 
	period_start TIMESTAMP WITH TIME ZONE, 
	period_end TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS notification_template_usage (

	notification_id VARCHAR(36) NOT NULL, 
	template_id VARCHAR(36) NOT NULL, 
	PRIMARY KEY (notification_id, template_id)
)

;

CREATE TABLE IF NOT EXISTS ops.system_logs (

	id VARCHAR(36) NOT NULL, 
	level VARCHAR(20) NOT NULL, 
	message TEXT NOT NULL, 
	module VARCHAR(200), 
	function VARCHAR(200), 
	line_number INTEGER, 
	timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	user_id UUID, 
	session_id VARCHAR(100), 
	request_id VARCHAR(100), 
	metadata JSON, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS financial.payments (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	bill_id VARCHAR(36), 
	payment_number VARCHAR(50) NOT NULL, 
	payment_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	amount NUMERIC(15, 2) NOT NULL, 
	currency VARCHAR(3), 
	payment_method VARCHAR(14) NOT NULL, 
	status VARCHAR(14) NOT NULL, 
	reference_number VARCHAR(100), 
	authorization_code VARCHAR(50), 
	card_last_four VARCHAR(4), 
	card_type VARCHAR(20), 
	bank_name VARCHAR(100), 
	bank_reference VARCHAR(100), 
	payer_name VARCHAR(200), 
	payer_relationship VARCHAR(50), 
	processed_date TIMESTAMP WITH TIME ZONE, 
	processor_reference VARCHAR(100), 
	is_refunded BOOLEAN, 
	refunded_amount NUMERIC(15, 2), 
	refund_date TIMESTAMP WITH TIME ZONE, 
	refund_reason TEXT, 
	receipt_number VARCHAR(50), 
	receipt_issued BOOLEAN, 
	notes TEXT, 
	received_by UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (receipt_number)
)

;

CREATE TABLE IF NOT EXISTS ops.patient_medications (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	prescription_id UUID, 
	medication_name VARCHAR(200) NOT NULL, 
	dosage VARCHAR(100) NOT NULL, 
	frequency VARCHAR(100) NOT NULL, 
	route VARCHAR(50), 
	start_date DATE NOT NULL, 
	end_date DATE, 
	is_active BOOLEAN, 
	is_discontinued BOOLEAN, 
	discontinued_date DATE, 
	discontinued_reason VARCHAR(500), 
	prescribed_by UUID NOT NULL, 
	prescribed_date DATE NOT NULL, 
	instructions TEXT, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.medication_presentation (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	product_id UUID NOT NULL, 
	pack_text TEXT, 
	items_per_pack INTEGER, 
	pack_size_value NUMERIC, 
	pack_size_unit_id UUID, 
	gtin TEXT, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_med_presentation_product_gtin_pack UNIQUE (product_id, gtin, pack_text)
)

;

CREATE TABLE IF NOT EXISTS ehr.practitioners (

	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	fhir_practitioner_id VARCHAR(255), 
	identifiers JSON, 
	status VARCHAR(9), 
	gender VARCHAR(20), 
	birth_date DATE, 
	photos JSON, 
	qualifications JSON, 
	communication_languages JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	UNIQUE (fhir_practitioner_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.insurance_policies (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	provider VARCHAR(200) NOT NULL, 
	policy_number VARCHAR(100) NOT NULL, 
	group_number VARCHAR(100), 
	holder_name VARCHAR(200), 
	holder_relationship VARCHAR(50), 
	holder_date_of_birth DATE, 
	valid_from DATE NOT NULL, 
	valid_to DATE, 
	is_primary BOOLEAN, 
	is_active BOOLEAN, 
	verified BOOLEAN, 
	verified_at TIMESTAMP WITH TIME ZONE, 
	verified_by UUID, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.practitioner_locations (

	practitioner_role_id UUID NOT NULL, 
	location_id UUID NOT NULL, 
	PRIMARY KEY (practitioner_role_id, location_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.practitioner_specialties (

	practitioner_role_id UUID NOT NULL, 
	specialty_id UUID NOT NULL, 
	PRIMARY KEY (practitioner_role_id, specialty_id)
)

;

CREATE TABLE IF NOT EXISTS core.permissions (

	id UUID NOT NULL, 
	code VARCHAR(100) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	category VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (code)
)

;

CREATE TABLE IF NOT EXISTS core.user_invitations (

	id VARCHAR(36) NOT NULL, 
	contact VARCHAR(255) NOT NULL, 
	contact_type contacttype NOT NULL, 
	invitation_token VARCHAR(255) NOT NULL, 
	invitation_link TEXT, 
	first_name VARCHAR(100), 
	last_name VARCHAR(100), 
	role VARCHAR(50) NOT NULL, 
	organization_id UUID, 
	status invitationstatus NOT NULL, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	accepted_at TIMESTAMP WITH TIME ZONE, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	notification_sent BOOLEAN NOT NULL, 
	notification_type VARCHAR(50), 
	notification_provider VARCHAR(100), 
	notification_id VARCHAR(255), 
	created_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS financial.insurance_claims (

	id VARCHAR(36) NOT NULL, 
	fhir_claim_id VARCHAR(255), 
	insurance_id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	appointment_id UUID, 
	claim_number VARCHAR(50) NOT NULL, 
	internal_claim_id VARCHAR(50) NOT NULL, 
	claim_type VARCHAR(50) NOT NULL, 
	service_type VARCHAR(100), 
	service_date DATE NOT NULL, 
	service_end_date DATE, 
	submission_date DATE NOT NULL, 
	received_date DATE, 
	status VARCHAR(18) NOT NULL, 
	status_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	status_reason TEXT, 
	billing_provider_id UUID NOT NULL, 
	rendering_provider_id UUID, 
	referring_provider_id UUID, 
	services JSON NOT NULL, 
	diagnosis_codes JSON NOT NULL, 
	procedure_codes JSON, 
	total_charge_amount FLOAT NOT NULL, 
	allowed_amount FLOAT, 
	approved_amount FLOAT, 
	insurance_paid_amount FLOAT, 
	patient_paid_amount FLOAT, 
	patient_responsibility FLOAT, 
	contractual_adjustment FLOAT, 
	other_adjustments FLOAT, 
	write_off_amount FLOAT, 
	deductible_applied FLOAT, 
	copay_amount FLOAT, 
	coinsurance_amount FLOAT, 
	processed_date DATE, 
	payment_date DATE, 
	check_number VARCHAR(50), 
	denial_reason TEXT, 
	denial_codes JSON, 
	appeal_submitted BOOLEAN, 
	appeal_date DATE, 
	appeal_outcome VARCHAR(50), 
	appeal_notes TEXT, 
	attachments JSON, 
	internal_notes TEXT, 
	payer_notes TEXT, 
	is_resubmission BOOLEAN, 
	original_claim_id VARCHAR(36), 
	resubmission_code VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_claim_id), 
	UNIQUE (internal_claim_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.appointments (

	id UUID NOT NULL, 
	patient_id UUID NOT NULL, 
	doctor_id UUID NOT NULL, 
	hospital_id UUID NOT NULL, 
	appointment_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	duration_minutes INTEGER NOT NULL, 
	status VARCHAR(50) NOT NULL, 
	appointment_type VARCHAR(50) NOT NULL, 
	reason TEXT, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS financial.financial_transactions (

	id VARCHAR(36) NOT NULL, 
	account_id VARCHAR(36) NOT NULL, 
	transaction_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	transaction_type VARCHAR(50) NOT NULL, 
	charge_item_id VARCHAR(36), 
	payment_id VARCHAR(36), 
	debit_amount NUMERIC(15, 2), 
	credit_amount NUMERIC(15, 2), 
	running_balance NUMERIC(15, 2) NOT NULL, 
	description VARCHAR(500) NOT NULL, 
	reference_number VARCHAR(100), 
	posted_by UUID NOT NULL, 
	posted_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	is_reversed BOOLEAN, 
	reversed_by_id VARCHAR(36), 
	reversal_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.doctor_hospitals (

	doctor_id UUID NOT NULL, 
	hospital_id UUID NOT NULL, 
	PRIMARY KEY (doctor_id, hospital_id)
)

;

CREATE TABLE IF NOT EXISTS ref.hospitals (

	id UUID NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	code VARCHAR(50), 
	address TEXT, 
	phone VARCHAR(20), 
	email VARCHAR(255), 
	logo_url VARCHAR(500), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.patient_settings (

	id VARCHAR(36) NOT NULL, 
	patient_id UUID NOT NULL, 
	email_appointments BOOLEAN, 
	email_reminders BOOLEAN, 
	email_lab_results BOOLEAN, 
	email_prescriptions BOOLEAN, 
	email_newsletters BOOLEAN, 
	sms_appointments BOOLEAN, 
	sms_reminders BOOLEAN, 
	sms_emergency_only BOOLEAN, 
	push_enabled BOOLEAN, 
	push_appointments BOOLEAN, 
	push_messages BOOLEAN, 
	push_updates BOOLEAN, 
	reminder_timing VARCHAR(7), 
	profile_visibility VARCHAR(12), 
	share_health_data BOOLEAN, 
	allow_research BOOLEAN, 
	data_retention_years INTEGER, 
	activity_tracking BOOLEAN, 
	two_factor_enabled BOOLEAN, 
	login_alerts BOOLEAN, 
	session_timeout_minutes INTEGER, 
	device_management BOOLEAN, 
	language VARCHAR(2), 
	date_format VARCHAR(20), 
	time_format VARCHAR(10), 
	theme VARCHAR(5), 
	font_size VARCHAR(20), 
	sound_enabled BOOLEAN, 
	auto_play_videos BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (patient_id)
)

;

CREATE TABLE IF NOT EXISTS ref.locations (

	id VARCHAR(36) NOT NULL, 
	hospital_id UUID NOT NULL, 
	department_id UUID, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	location_type VARCHAR(50) NOT NULL, 
	building VARCHAR(50), 
	floor VARCHAR(10), 
	section VARCHAR(50), 
	room_number VARCHAR(20), 
	bed_number VARCHAR(10), 
	capacity INTEGER, 
	is_occupied BOOLEAN, 
	current_patient_id UUID, 
	features JSON, 
	equipment JSON, 
	is_active BOOLEAN, 
	is_available BOOLEAN, 
	maintenance_required BOOLEAN, 
	cleaning_required BOOLEAN, 
	is_sterile BOOLEAN, 
	last_sterilized TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	fhir_location_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (code), 
	UNIQUE (fhir_location_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.prescriptions (

	id UUID NOT NULL, 
	fhir_medication_request_id VARCHAR(255), 
	identifiers JSON, 
	patient_id UUID NOT NULL, 
	doctor_id UUID NOT NULL, 
	hospital_id UUID NOT NULL, 
	encounter_id UUID, 
	prescription_number VARCHAR(50) NOT NULL, 
	medicine_name VARCHAR(200) NOT NULL, 
	medicine_code VARCHAR(50), 
	generic_name VARCHAR(200), 
	brand_name VARCHAR(200), 
	description TEXT, 
	status VARCHAR(16) NOT NULL, 
	status_reason JSON, 
	intent VARCHAR(14) NOT NULL, 
	priority VARCHAR(7), 
	prescribed_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	start_date DATE, 
	end_date DATE, 
	dosage VARCHAR(100) NOT NULL, 
	dosage_unit VARCHAR(50), 
	frequency VARCHAR(100) NOT NULL, 
	route VARCHAR(50), 
	duration VARCHAR(100), 
	dosage_instructions JSON, 
	purpose TEXT, 
	indication TEXT, 
	reason_codes JSON, 
	notes TEXT, 
	total_refills INTEGER, 
	remaining_refills INTEGER, 
	tablets_per_refill INTEGER, 
	quantity FLOAT, 
	quantity_unit VARCHAR(50), 
	days_supply INTEGER, 
	dispense_request JSON, 
	expected_supply_duration INTEGER, 
	allow_generic_substitution BOOLEAN, 
	substitution_reason VARCHAR(200), 
	estimated_price FLOAT, 
	currency VARCHAR(3), 
	prior_prescription_id UUID, 
	is_signed BOOLEAN, 
	signed_at TIMESTAMP WITH TIME ZONE, 
	signature_data TEXT, 
	created_by UUID NOT NULL, 
	prescribed_by UUID NOT NULL, 
	last_modified_by UUID, 
	cancelled_by UUID, 
	cancelled_at TIMESTAMP WITH TIME ZONE, 
	cancellation_reason VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_medication_request_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.specialties (

	id UUID NOT NULL, 
	system VARCHAR(255) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	display VARCHAR(200) NOT NULL, 
	description TEXT, 
	parent_id UUID, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (code)
)

;

CREATE TABLE IF NOT EXISTS ops.system_notifications (

	id VARCHAR NOT NULL, 
	recipient_id UUID NOT NULL, 
	sender_id UUID, 
	title VARCHAR NOT NULL, 
	message TEXT NOT NULL, 
	notification_type VARCHAR, 
	channel VARCHAR(8), 
	read BOOLEAN, 
	read_at TIMESTAMP WITH TIME ZONE, 
	sent BOOLEAN, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	action_url VARCHAR, 
	action_required BOOLEAN, 
	action_taken BOOLEAN, 
	action_taken_at TIMESTAMP WITH TIME ZONE, 
	scheduled_for TIMESTAMP WITH TIME ZONE, 
	delivery_status VARCHAR, 
	delivery_attempts INTEGER, 
	last_attempt_at TIMESTAMP WITH TIME ZONE, 
	reference_type VARCHAR, 
	reference_id VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	expires_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.lab_settings (

	id VARCHAR(36) NOT NULL, 
	settings_type VARCHAR(50) NOT NULL, 
	settings_data JSON NOT NULL, 
	version VARCHAR(20), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	created_by UUID, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ref.category_tag (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	name CITEXT NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS core.user_profiles (

	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	specialty VARCHAR(100), 
	sub_specialty VARCHAR(100), 
	license_number VARCHAR(50), 
	license_expiry DATE, 
	qualification VARCHAR(200), 
	years_of_experience INTEGER, 
	bio TEXT, 
	education JSON, 
	certifications JSON, 
	languages_spoken JSON, 
	address TEXT, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	zip_code VARCHAR(20), 
	country VARCHAR(2), 
	employee_id VARCHAR(50), 
	position VARCHAR(100), 
	start_date DATE, 
	contract_type VARCHAR(50), 
	emergency_contact_name VARCHAR(200), 
	emergency_contact_phone VARCHAR(20), 
	emergency_contact_relationship VARCHAR(50), 
	bank_account_number VARCHAR(50), 
	bank_name VARCHAR(100), 
	tax_id VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.nurses (

	id VARCHAR(36) NOT NULL, 
	user_id UUID NOT NULL, 
	license_number VARCHAR(50) NOT NULL, 
	license_issuer VARCHAR(100), 
	license_issued_date DATE, 
	license_expiry_date DATE, 
	primary_specialty VARCHAR(11) NOT NULL, 
	secondary_specialties JSON, 
	role VARCHAR(25) NOT NULL, 
	certifications JSON, 
	years_of_experience INTEGER, 
	previous_positions JSON, 
	clinical_skills JSON, 
	languages_spoken JSON, 
	can_work_nights BOOLEAN, 
	can_work_weekends BOOLEAN, 
	preferred_shifts JSON, 
	primary_department_id UUID, 
	can_float BOOLEAN, 
	rating FLOAT, 
	rating_count INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id)
)

;

CREATE TABLE IF NOT EXISTS ehr.prescription_refills (

	id VARCHAR(36) NOT NULL, 
	prescription_id UUID NOT NULL, 
	pharmacy_id VARCHAR(36) NOT NULL, 
	refill_number INTEGER NOT NULL, 
	refill_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	quantity_dispensed INTEGER NOT NULL, 
	days_supply INTEGER, 
	dispensed_by VARCHAR(200), 
	dispensed_by_id UUID, 
	price FLOAT, 
	insurance_covered_amount FLOAT, 
	patient_paid_amount FLOAT, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ehr.allergy_intolerances (

	id VARCHAR(36) NOT NULL, 
	fhir_allergy_intolerance_id VARCHAR(255), 
	identifiers JSON, 
	patient_id UUID NOT NULL, 
	encounter_id VARCHAR(36), 
	clinical_status VARCHAR(10) NOT NULL, 
	verification_status VARCHAR(16) NOT NULL, 
	type VARCHAR(11) NOT NULL, 
	categories JSON, 
	criticality VARCHAR(16), 
	code JSON NOT NULL, 
	display_name VARCHAR(500) NOT NULL, 
	onset_date DATE, 
	onset_age INTEGER, 
	onset_period_start DATE, 
	onset_period_end DATE, 
	onset_string VARCHAR(200), 
	recorded_date TIMESTAMP WITH TIME ZONE NOT NULL, 
	recorder_id UUID, 
	asserter_id UUID, 
	last_occurrence TIMESTAMP WITH TIME ZONE, 
	notes JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (fhir_allergy_intolerance_id)
)

;

CREATE TABLE IF NOT EXISTS ref.mnn (

	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	name CITEXT NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE IF NOT EXISTS ops.todos (

	id VARCHAR NOT NULL, 
	description VARCHAR NOT NULL, 
	category VARCHAR, 
	priority VARCHAR, 
	created_by VARCHAR NOT NULL, 
	assigned_to VARCHAR, 
	patient_id VARCHAR, 
	completed BOOLEAN, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	completed_by UUID, 
	date VARCHAR NOT NULL, 
	due_date TIMESTAMP WITH TIME ZONE, 
	reminder_date TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
)

;


-- Add foreign key constraints

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_receipts_message_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_receipts ADD CONSTRAINT message_receipts_message_id_fkey FOREIGN KEY (message_id) REFERENCES ehr.messages (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_receipts_thread_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_receipts ADD CONSTRAINT message_receipts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES ehr.message_threads (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_receipts_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_receipts ADD CONSTRAINT message_receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'radiology_templates_author_id_fkey'
    ) THEN
        ALTER TABLE ehr.radiology_templates ADD CONSTRAINT radiology_templates_author_id_fkey FOREIGN KEY (author_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctors_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctors ADD CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'radiology_worklist_assignments_study_id_fkey'
    ) THEN
        ALTER TABLE ehr.radiology_worklist_assignments ADD CONSTRAINT radiology_worklist_assignments_study_id_fkey FOREIGN KEY (study_id) REFERENCES ehr.radiology_studies (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'radiology_worklist_assignments_assigned_radiologist_id_fkey'
    ) THEN
        ALTER TABLE ehr.radiology_worklist_assignments ADD CONSTRAINT radiology_worklist_assignments_assigned_radiologist_id_fkey FOREIGN KEY (assigned_radiologist_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'immunizations_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.immunizations ADD CONSTRAINT immunizations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'immunizations_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.immunizations ADD CONSTRAINT immunizations_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'immunizations_location_id_fkey'
    ) THEN
        ALTER TABLE ehr.immunizations ADD CONSTRAINT immunizations_location_id_fkey FOREIGN KEY (location_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'immunizations_performer_id_fkey'
    ) THEN
        ALTER TABLE ehr.immunizations ADD CONSTRAINT immunizations_performer_id_fkey FOREIGN KEY (performer_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'observation_components_observation_id_fkey'
    ) THEN
        ALTER TABLE ehr.observation_components ADD CONSTRAINT observation_components_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES ehr.observations (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_trail_user_id_fkey'
    ) THEN
        ALTER TABLE ops.audit_trail ADD CONSTRAINT audit_trail_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hospital_departments_hospital_id_fkey'
    ) THEN
        ALTER TABLE ref.hospital_departments ADD CONSTRAINT hospital_departments_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hospital_departments_head_id_fkey'
    ) THEN
        ALTER TABLE ref.hospital_departments ADD CONSTRAINT hospital_departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hospital_departments_deputy_head_id_fkey'
    ) THEN
        ALTER TABLE ref.hospital_departments ADD CONSTRAINT hospital_departments_deputy_head_id_fkey FOREIGN KEY (deputy_head_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hospital_departments_parent_department_id_fkey'
    ) THEN
        ALTER TABLE ref.hospital_departments ADD CONSTRAINT hospital_departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conditions_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.conditions ADD CONSTRAINT conditions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conditions_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.conditions ADD CONSTRAINT conditions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conditions_recorder_id_fkey'
    ) THEN
        ALTER TABLE ehr.conditions ADD CONSTRAINT conditions_recorder_id_fkey FOREIGN KEY (recorder_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conditions_asserter_id_fkey'
    ) THEN
        ALTER TABLE ehr.conditions ADD CONSTRAINT conditions_asserter_id_fkey FOREIGN KEY (asserter_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organization_patients_organization_id_fkey'
    ) THEN
        ALTER TABLE ehr.organization_patients ADD CONSTRAINT organization_patients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organization_patients_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.organization_patients ADD CONSTRAINT organization_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_result_notifications_lab_result_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_result_notifications ADD CONSTRAINT lab_result_notifications_lab_result_id_fkey FOREIGN KEY (lab_result_id) REFERENCES ehr.lab_results (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_result_notifications_notified_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_result_notifications ADD CONSTRAINT lab_result_notifications_notified_user_id_fkey FOREIGN KEY (notified_user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'condition_stages_condition_id_fkey'
    ) THEN
        ALTER TABLE ehr.condition_stages ADD CONSTRAINT condition_stages_condition_id_fkey FOREIGN KEY (condition_id) REFERENCES ehr.conditions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescription_reminders_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescription_reminders ADD CONSTRAINT prescription_reminders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescription_reminders_prescription_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescription_reminders ADD CONSTRAINT prescription_reminders_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES ehr.prescriptions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurse_patient_assignments_nurse_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurse_patient_assignments ADD CONSTRAINT nurse_patient_assignments_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES ehr.nurses (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurse_patient_assignments_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurse_patient_assignments ADD CONSTRAINT nurse_patient_assignments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'report_templates_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.report_templates ADD CONSTRAINT report_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'report_templates_created_by_fkey'
    ) THEN
        ALTER TABLE ops.report_templates ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'report_templates_modified_by_fkey'
    ) THEN
        ALTER TABLE ops.report_templates ADD CONSTRAINT report_templates_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurances_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.insurances ADD CONSTRAINT insurances_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurances_verified_by_fkey'
    ) THEN
        ALTER TABLE ehr.insurances ADD CONSTRAINT insurances_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_notes_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_notes ADD CONSTRAINT clinical_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_notes_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_notes ADD CONSTRAINT clinical_notes_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_notes_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_notes ADD CONSTRAINT clinical_notes_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_notes_created_by_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_notes ADD CONSTRAINT clinical_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_notes_locked_by_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_notes ADD CONSTRAINT clinical_notes_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_item_modifiers_charge_item_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_item_modifiers ADD CONSTRAINT charge_item_modifiers_charge_item_id_fkey FOREIGN KEY (charge_item_id) REFERENCES financial.charge_items (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_item_modifiers_authorized_by_fkey'
    ) THEN
        ALTER TABLE financial.charge_item_modifiers ADD CONSTRAINT charge_item_modifiers_authorized_by_fkey FOREIGN KEY (authorized_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organization_stats_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.organization_stats ADD CONSTRAINT organization_stats_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'immunization_protocols_immunization_id_fkey'
    ) THEN
        ALTER TABLE ehr.immunization_protocols ADD CONSTRAINT immunization_protocols_immunization_id_fkey FOREIGN KEY (immunization_id) REFERENCES ehr.immunizations (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_thread_participants_thread_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_thread_participants ADD CONSTRAINT message_thread_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES ehr.message_threads (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_thread_participants_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_thread_participants ADD CONSTRAINT message_thread_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_patient_id_fkey'
    ) THEN
        ALTER TABLE financial.bills ADD CONSTRAINT bills_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_account_id_fkey'
    ) THEN
        ALTER TABLE financial.bills ADD CONSTRAINT bills_account_id_fkey FOREIGN KEY (account_id) REFERENCES ehr.patient_accounts (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_submitted_by_fkey'
    ) THEN
        ALTER TABLE financial.bills ADD CONSTRAINT bills_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_cancelled_by_fkey'
    ) THEN
        ALTER TABLE financial.bills ADD CONSTRAINT bills_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_created_by_fkey'
    ) THEN
        ALTER TABLE financial.bills ADD CONSTRAINT bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_synonym_product_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product_synonym ADD CONSTRAINT medication_product_synonym_product_id_fkey FOREIGN KEY (product_id) REFERENCES ref.medication_product (id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_organization_id_fkey'
    ) THEN
        ALTER TABLE core.users ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_department_id_fkey'
    ) THEN
        ALTER TABLE core.users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_admin_department_id_fkey'
    ) THEN
        ALTER TABLE core.users ADD CONSTRAINT users_admin_department_id_fkey FOREIGN KEY (admin_department_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_roles_practitioner_id_fkey'
    ) THEN
        ALTER TABLE ehr.practitioner_roles ADD CONSTRAINT practitioner_roles_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES ehr.practitioners (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_roles_organization_id_fkey'
    ) THEN
        ALTER TABLE ehr.practitioner_roles ADD CONSTRAINT practitioner_roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_mnn_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product ADD CONSTRAINT medication_product_mnn_id_fkey FOREIGN KEY (mnn_id) REFERENCES ref.mnn (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_dosage_form_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product ADD CONSTRAINT medication_product_dosage_form_id_fkey FOREIGN KEY (dosage_form_id) REFERENCES ref.dosage_form (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_route_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product ADD CONSTRAINT medication_product_route_id_fkey FOREIGN KEY (route_id) REFERENCES ref.route (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_strength_unit_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product ADD CONSTRAINT medication_product_strength_unit_id_fkey FOREIGN KEY (strength_unit_id) REFERENCES ref.unit (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_manufacturer_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product ADD CONSTRAINT medication_product_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES ref.manufacturer (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_activities_user_id_fkey'
    ) THEN
        ALTER TABLE ops.admin_activities ADD CONSTRAINT admin_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_activities_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.admin_activities ADD CONSTRAINT admin_activities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_departments_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.admin_departments ADD CONSTRAINT admin_departments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_departments_head_id_fkey'
    ) THEN
        ALTER TABLE ops.admin_departments ADD CONSTRAINT admin_departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'radiology_studies_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.radiology_studies ADD CONSTRAINT radiology_studies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.system_alerts ADD CONSTRAINT system_alerts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_department_id_fkey'
    ) THEN
        ALTER TABLE ops.system_alerts ADD CONSTRAINT system_alerts_department_id_fkey FOREIGN KEY (department_id) REFERENCES ops.admin_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_user_id_fkey'
    ) THEN
        ALTER TABLE ops.system_alerts ADD CONSTRAINT system_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_acknowledged_by_fkey'
    ) THEN
        ALTER TABLE ops.system_alerts ADD CONSTRAINT system_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_resolved_by_fkey'
    ) THEN
        ALTER TABLE ops.system_alerts ADD CONSTRAINT system_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE ehr.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_recipient_id_fkey'
    ) THEN
        ALTER TABLE ehr.messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.messages ADD CONSTRAINT messages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_parent_message_id_fkey'
    ) THEN
        ALTER TABLE ehr.messages ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES ehr.messages (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_thread_id_fkey'
    ) THEN
        ALTER TABLE ehr.messages ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES ehr.message_threads (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_hospital_id_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_appointment_id_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_vital_signs_id_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_vital_signs_id_fkey FOREIGN KEY (vital_signs_id) REFERENCES ehr.vital_signs (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_created_by_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_signed_by_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_reviewed_by_fkey'
    ) THEN
        ALTER TABLE ehr.medical_records ADD CONSTRAINT medical_records_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounters_appointment_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounters ADD CONSTRAINT encounters_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounters_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounters ADD CONSTRAINT encounters_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounters_service_provider_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounters ADD CONSTRAINT encounters_service_provider_id_fkey FOREIGN KEY (service_provider_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounters_part_of_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounters ADD CONSTRAINT encounters_part_of_encounter_id_fkey FOREIGN KEY (part_of_encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_fkey'
    ) THEN
        ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_orders ADD CONSTRAINT lab_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_ordered_by_fkey'
    ) THEN
        ALTER TABLE ehr.lab_orders ADD CONSTRAINT lab_orders_ordered_by_fkey FOREIGN KEY (ordered_by) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_orders ADD CONSTRAINT lab_orders_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_cancelled_by_fkey'
    ) THEN
        ALTER TABLE ehr.lab_orders ADD CONSTRAINT lab_orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'family_member_conditions_family_member_id_fkey'
    ) THEN
        ALTER TABLE ehr.family_member_conditions ADD CONSTRAINT family_member_conditions_family_member_id_fkey FOREIGN KEY (family_member_id) REFERENCES ehr.family_member_histories (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_authorizations_insurance_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_authorizations ADD CONSTRAINT insurance_authorizations_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES ehr.insurances (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_authorizations_patient_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_authorizations ADD CONSTRAINT insurance_authorizations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_authorizations_requesting_provider_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_authorizations ADD CONSTRAINT insurance_authorizations_requesting_provider_id_fkey FOREIGN KEY (requesting_provider_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_authorizations_servicing_provider_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_authorizations ADD CONSTRAINT insurance_authorizations_servicing_provider_id_fkey FOREIGN KEY (servicing_provider_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'observations_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.observations ADD CONSTRAINT observations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'observations_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.observations ADD CONSTRAINT observations_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_reports_template_id_fkey'
    ) THEN
        ALTER TABLE ops.scheduled_reports ADD CONSTRAINT scheduled_reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES ops.report_templates (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_reports_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.scheduled_reports ADD CONSTRAINT scheduled_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_reports_created_by_fkey'
    ) THEN
        ALTER TABLE ops.scheduled_reports ADD CONSTRAINT scheduled_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurse_shift_assignments_nurse_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurse_shift_assignments ADD CONSTRAINT nurse_shift_assignments_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES ehr.nurses (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurse_shift_assignments_department_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurse_shift_assignments ADD CONSTRAINT nurse_shift_assignments_department_id_fkey FOREIGN KEY (department_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurse_shift_assignments_replaced_nurse_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurse_shift_assignments ADD CONSTRAINT nurse_shift_assignments_replaced_nurse_id_fkey FOREIGN KEY (replaced_nurse_id) REFERENCES ehr.nurses (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'blocked_time_slots_doctor_id_fkey'
    ) THEN
        ALTER TABLE ops.blocked_time_slots ADD CONSTRAINT blocked_time_slots_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'blocked_time_slots_schedule_id_fkey'
    ) THEN
        ALTER TABLE ops.blocked_time_slots ADD CONSTRAINT blocked_time_slots_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES ehr.doctor_schedules (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'blocked_time_slots_created_by_fkey'
    ) THEN
        ALTER TABLE ops.blocked_time_slots ADD CONSTRAINT blocked_time_slots_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_price_presentation_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_price ADD CONSTRAINT medication_price_presentation_id_fkey FOREIGN KEY (presentation_id) REFERENCES ref.medication_presentation (id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'immunization_reactions_immunization_id_fkey'
    ) THEN
        ALTER TABLE ehr.immunization_reactions ADD CONSTRAINT immunization_reactions_immunization_id_fkey FOREIGN KEY (immunization_id) REFERENCES ehr.immunizations (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_administrations_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.medication_administrations ADD CONSTRAINT medication_administrations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_administrations_administered_by_fkey'
    ) THEN
        ALTER TABLE ehr.medication_administrations ADD CONSTRAINT medication_administrations_administered_by_fkey FOREIGN KEY (administered_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hospitalizations_encounter_id_fkey'
    ) THEN
        ALTER TABLE ref.hospitalizations ADD CONSTRAINT hospitalizations_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_recipient_id_fkey'
    ) THEN
        ALTER TABLE ops.notifications ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_templates_created_by_fkey'
    ) THEN
        ALTER TABLE ehr.message_templates ADD CONSTRAINT message_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patient_accounts_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.patient_accounts ADD CONSTRAINT patient_accounts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurse_settings_nurse_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurse_settings ADD CONSTRAINT nurse_settings_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES ehr.nurses (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_category_product_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product_category ADD CONSTRAINT medication_product_category_product_id_fkey FOREIGN KEY (product_id) REFERENCES ref.medication_product (id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_product_category_category_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_product_category ADD CONSTRAINT medication_product_category_category_id_fkey FOREIGN KEY (category_id) REFERENCES ref.category_tag (id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_results_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_results ADD CONSTRAINT lab_results_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_results_lab_order_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_results ADD CONSTRAINT lab_results_lab_order_id_fkey FOREIGN KEY (lab_order_id) REFERENCES ehr.lab_orders (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_results_medical_record_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_results ADD CONSTRAINT lab_results_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES ehr.medical_records (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_results_ordered_by_fkey'
    ) THEN
        ALTER TABLE ehr.lab_results ADD CONSTRAINT lab_results_ordered_by_fkey FOREIGN KEY (ordered_by) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'condition_evidence_condition_id_fkey'
    ) THEN
        ALTER TABLE ehr.condition_evidence ADD CONSTRAINT condition_evidence_condition_id_fkey FOREIGN KEY (condition_id) REFERENCES ehr.conditions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_administration_events_patient_id_fkey'
    ) THEN
        ALTER TABLE ops.medication_administration_events ADD CONSTRAINT medication_administration_events_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_administration_events_medication_id_fkey'
    ) THEN
        ALTER TABLE ops.medication_administration_events ADD CONSTRAINT medication_administration_events_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES ops.patient_medications (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_administration_events_nurse_id_fkey'
    ) THEN
        ALTER TABLE ops.medication_administration_events ADD CONSTRAINT medication_administration_events_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES ehr.nurses (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_prescription_prices_pharmacy_id_fkey'
    ) THEN
        ALTER TABLE pharmacy_prescription_prices ADD CONSTRAINT pharmacy_prescription_prices_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES ehr.pharmacies (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_prescription_prices_prescription_id_fkey'
    ) THEN
        ALTER TABLE pharmacy_prescription_prices ADD CONSTRAINT pharmacy_prescription_prices_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES ehr.prescriptions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointment_participants_appointment_id_fkey'
    ) THEN
        ALTER TABLE ehr.appointment_participants ADD CONSTRAINT appointment_participants_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointment_participants_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.appointment_participants ADD CONSTRAINT appointment_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointment_reminders_appointment_id_fkey'
    ) THEN
        ALTER TABLE ehr.appointment_reminders ADD CONSTRAINT appointment_reminders_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'care_plans_medical_record_id_fkey'
    ) THEN
        ALTER TABLE ehr.care_plans ADD CONSTRAINT care_plans_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES ehr.medical_records (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'care_plans_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.care_plans ADD CONSTRAINT care_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'care_plans_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.care_plans ADD CONSTRAINT care_plans_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'care_plans_author_id_fkey'
    ) THEN
        ALTER TABLE ehr.care_plans ADD CONSTRAINT care_plans_author_id_fkey FOREIGN KEY (author_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_prices_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.service_prices ADD CONSTRAINT service_prices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_prices_department_id_fkey'
    ) THEN
        ALTER TABLE ops.service_prices ADD CONSTRAINT service_prices_department_id_fkey FOREIGN KEY (department_id) REFERENCES ops.admin_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_prices_created_by_fkey'
    ) THEN
        ALTER TABLE ops.service_prices ADD CONSTRAINT service_prices_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_prices_approved_by_fkey'
    ) THEN
        ALTER TABLE ops.service_prices ADD CONSTRAINT service_prices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_activities_user_id_fkey'
    ) THEN
        ALTER TABLE core.user_activities ADD CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'emergency_contacts_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.emergency_contacts ADD CONSTRAINT emergency_contacts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patients_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.patients ADD CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_fkey'
    ) THEN
        ALTER TABLE core.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_patient_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_encounter_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_appointment_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_performer_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_performer_id_fkey FOREIGN KEY (performer_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_performing_organization_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_performing_organization_id_fkey FOREIGN KEY (performing_organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_requesting_organization_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_requesting_organization_id_fkey FOREIGN KEY (requesting_organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_cost_center_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_account_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES ehr.patient_accounts (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_entered_by_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_bill_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES financial.bills (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'charge_items_part_of_id_fkey'
    ) THEN
        ALTER TABLE financial.charge_items ADD CONSTRAINT charge_items_part_of_id_fkey FOREIGN KEY (part_of_id) REFERENCES financial.charge_items (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_schedules_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_schedules ADD CONSTRAINT doctor_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_schedules_location_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_schedules ADD CONSTRAINT doctor_schedules_location_id_fkey FOREIGN KEY (location_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'family_member_histories_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.family_member_histories ADD CONSTRAINT family_member_histories_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'radiology_reports_study_id_fkey'
    ) THEN
        ALTER TABLE ehr.radiology_reports ADD CONSTRAINT radiology_reports_study_id_fkey FOREIGN KEY (study_id) REFERENCES ehr.radiology_studies (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'radiology_reports_radiologist_id_fkey'
    ) THEN
        ALTER TABLE ehr.radiology_reports ADD CONSTRAINT radiology_reports_radiologist_id_fkey FOREIGN KEY (radiologist_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounter_participants_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounter_participants ADD CONSTRAINT encounter_participants_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounter_participants_individual_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounter_participants ADD CONSTRAINT encounter_participants_individual_id_fkey FOREIGN KEY (individual_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'claim_line_items_claim_id_fkey'
    ) THEN
        ALTER TABLE ehr.claim_line_items ADD CONSTRAINT claim_line_items_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES financial.insurance_claims (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE core.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_configs_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.system_configs ADD CONSTRAINT system_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_configs_modified_by_fkey'
    ) THEN
        ALTER TABLE ops.system_configs ADD CONSTRAINT system_configs_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bulk_operations_organization_id_fkey'
    ) THEN
        ALTER TABLE ops.bulk_operations ADD CONSTRAINT bulk_operations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bulk_operations_performed_by_fkey'
    ) THEN
        ALTER TABLE ops.bulk_operations ADD CONSTRAINT bulk_operations_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_history_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.medical_history ADD CONSTRAINT medical_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medical_history_recorded_by_fkey'
    ) THEN
        ALTER TABLE ehr.medical_history ADD CONSTRAINT medical_history_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_schedule_templates_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_schedule_templates ADD CONSTRAINT doctor_schedule_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_schedule_templates_location_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_schedule_templates ADD CONSTRAINT doctor_schedule_templates_location_id_fkey FOREIGN KEY (location_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounter_diagnoses_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounter_diagnoses ADD CONSTRAINT encounter_diagnoses_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_attachments_message_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_attachments ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES ehr.messages (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_reports_order_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_reports ADD CONSTRAINT lab_reports_order_id_fkey FOREIGN KEY (order_id) REFERENCES ehr.lab_orders (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lab_reports_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.lab_reports ADD CONSTRAINT lab_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_threads ADD CONSTRAINT message_threads_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.message_threads ADD CONSTRAINT message_threads_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'general_reports_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.general_reports ADD CONSTRAINT general_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'general_reports_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.general_reports ADD CONSTRAINT general_reports_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'general_reports_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.general_reports ADD CONSTRAINT general_reports_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'general_reports_clinic_id_fkey'
    ) THEN
        ALTER TABLE ehr.general_reports ADD CONSTRAINT general_reports_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_departments_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_departments ADD CONSTRAINT doctor_departments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_departments_department_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_departments ADD CONSTRAINT doctor_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'document_references_medical_record_id_fkey'
    ) THEN
        ALTER TABLE ehr.document_references ADD CONSTRAINT document_references_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES ehr.medical_records (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'document_references_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.document_references ADD CONSTRAINT document_references_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'document_references_authenticator_id_fkey'
    ) THEN
        ALTER TABLE ehr.document_references ADD CONSTRAINT document_references_authenticator_id_fkey FOREIGN KEY (authenticator_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'document_references_custodian_id_fkey'
    ) THEN
        ALTER TABLE ehr.document_references ADD CONSTRAINT document_references_custodian_id_fkey FOREIGN KEY (custodian_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'document_references_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.document_references ADD CONSTRAINT document_references_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permission_id_fkey'
    ) THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES core.permissions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'allergy_reactions_allergy_id_fkey'
    ) THEN
        ALTER TABLE ehr.allergy_reactions ADD CONSTRAINT allergy_reactions_allergy_id_fkey FOREIGN KEY (allergy_id) REFERENCES ehr.allergy_intolerances (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'login_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE login_sessions ADD CONSTRAINT login_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.vital_signs ADD CONSTRAINT vital_signs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_medical_record_id_fkey'
    ) THEN
        ALTER TABLE ehr.vital_signs ADD CONSTRAINT vital_signs_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES ehr.medical_records (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_measured_by_fkey'
    ) THEN
        ALTER TABLE ehr.vital_signs ADD CONSTRAINT vital_signs_measured_by_fkey FOREIGN KEY (measured_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_schedule_exceptions_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_schedule_exceptions ADD CONSTRAINT doctor_schedule_exceptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_impressions_medical_record_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_impressions ADD CONSTRAINT clinical_impressions_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES ehr.medical_records (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_impressions_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_impressions ADD CONSTRAINT clinical_impressions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_impressions_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_impressions ADD CONSTRAINT clinical_impressions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_impressions_assessor_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_impressions ADD CONSTRAINT clinical_impressions_assessor_id_fkey FOREIGN KEY (assessor_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinical_impressions_previous_id_fkey'
    ) THEN
        ALTER TABLE ehr.clinical_impressions ADD CONSTRAINT clinical_impressions_previous_id_fkey FOREIGN KEY (previous_id) REFERENCES ehr.clinical_impressions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'department_stats_department_id_fkey'
    ) THEN
        ALTER TABLE ops.department_stats ADD CONSTRAINT department_stats_department_id_fkey FOREIGN KEY (department_id) REFERENCES ops.admin_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounter_locations_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounter_locations ADD CONSTRAINT encounter_locations_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'encounter_locations_location_id_fkey'
    ) THEN
        ALTER TABLE ehr.encounter_locations ADD CONSTRAINT encounter_locations_location_id_fkey FOREIGN KEY (location_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notification_template_usage_notification_id_fkey'
    ) THEN
        ALTER TABLE notification_template_usage ADD CONSTRAINT notification_template_usage_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES ops.notifications (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notification_template_usage_template_id_fkey'
    ) THEN
        ALTER TABLE notification_template_usage ADD CONSTRAINT notification_template_usage_template_id_fkey FOREIGN KEY (template_id) REFERENCES ops.notification_templates (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_logs_user_id_fkey'
    ) THEN
        ALTER TABLE ops.system_logs ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_patient_id_fkey'
    ) THEN
        ALTER TABLE financial.payments ADD CONSTRAINT payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_bill_id_fkey'
    ) THEN
        ALTER TABLE financial.payments ADD CONSTRAINT payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES financial.bills (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_received_by_fkey'
    ) THEN
        ALTER TABLE financial.payments ADD CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patient_medications_patient_id_fkey'
    ) THEN
        ALTER TABLE ops.patient_medications ADD CONSTRAINT patient_medications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patient_medications_prescription_id_fkey'
    ) THEN
        ALTER TABLE ops.patient_medications ADD CONSTRAINT patient_medications_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES ehr.prescriptions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patient_medications_prescribed_by_fkey'
    ) THEN
        ALTER TABLE ops.patient_medications ADD CONSTRAINT patient_medications_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_presentation_product_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_presentation ADD CONSTRAINT medication_presentation_product_id_fkey FOREIGN KEY (product_id) REFERENCES ref.medication_product (id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'medication_presentation_pack_size_unit_id_fkey'
    ) THEN
        ALTER TABLE ref.medication_presentation ADD CONSTRAINT medication_presentation_pack_size_unit_id_fkey FOREIGN KEY (pack_size_unit_id) REFERENCES ref.unit (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'practitioners_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.practitioners ADD CONSTRAINT practitioners_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_policies_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.insurance_policies ADD CONSTRAINT insurance_policies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_policies_verified_by_fkey'
    ) THEN
        ALTER TABLE ehr.insurance_policies ADD CONSTRAINT insurance_policies_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_locations_practitioner_role_id_fkey'
    ) THEN
        ALTER TABLE ehr.practitioner_locations ADD CONSTRAINT practitioner_locations_practitioner_role_id_fkey FOREIGN KEY (practitioner_role_id) REFERENCES ehr.practitioner_roles (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_locations_location_id_fkey'
    ) THEN
        ALTER TABLE ehr.practitioner_locations ADD CONSTRAINT practitioner_locations_location_id_fkey FOREIGN KEY (location_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_specialties_practitioner_role_id_fkey'
    ) THEN
        ALTER TABLE ehr.practitioner_specialties ADD CONSTRAINT practitioner_specialties_practitioner_role_id_fkey FOREIGN KEY (practitioner_role_id) REFERENCES ehr.practitioner_roles (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_specialties_specialty_id_fkey'
    ) THEN
        ALTER TABLE ehr.practitioner_specialties ADD CONSTRAINT practitioner_specialties_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES ehr.specialties (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_organization_id_fkey'
    ) THEN
        ALTER TABLE core.user_invitations ADD CONSTRAINT user_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_created_by_fkey'
    ) THEN
        ALTER TABLE core.user_invitations ADD CONSTRAINT user_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_insurance_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_claims ADD CONSTRAINT insurance_claims_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES ehr.insurances (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_patient_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_claims ADD CONSTRAINT insurance_claims_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_appointment_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_claims ADD CONSTRAINT insurance_claims_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_billing_provider_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_claims ADD CONSTRAINT insurance_claims_billing_provider_id_fkey FOREIGN KEY (billing_provider_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_rendering_provider_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_claims ADD CONSTRAINT insurance_claims_rendering_provider_id_fkey FOREIGN KEY (rendering_provider_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_referring_provider_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_claims ADD CONSTRAINT insurance_claims_referring_provider_id_fkey FOREIGN KEY (referring_provider_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_original_claim_id_fkey'
    ) THEN
        ALTER TABLE financial.insurance_claims ADD CONSTRAINT insurance_claims_original_claim_id_fkey FOREIGN KEY (original_claim_id) REFERENCES financial.insurance_claims (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_hospital_id_fkey'
    ) THEN
        ALTER TABLE ehr.appointments ADD CONSTRAINT appointments_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_account_id_fkey'
    ) THEN
        ALTER TABLE financial.financial_transactions ADD CONSTRAINT financial_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES ehr.patient_accounts (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_charge_item_id_fkey'
    ) THEN
        ALTER TABLE financial.financial_transactions ADD CONSTRAINT financial_transactions_charge_item_id_fkey FOREIGN KEY (charge_item_id) REFERENCES financial.charge_items (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_payment_id_fkey'
    ) THEN
        ALTER TABLE financial.financial_transactions ADD CONSTRAINT financial_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES financial.payments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_posted_by_fkey'
    ) THEN
        ALTER TABLE financial.financial_transactions ADD CONSTRAINT financial_transactions_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_reversed_by_id_fkey'
    ) THEN
        ALTER TABLE financial.financial_transactions ADD CONSTRAINT financial_transactions_reversed_by_id_fkey FOREIGN KEY (reversed_by_id) REFERENCES financial.financial_transactions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_hospitals_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_hospitals ADD CONSTRAINT doctor_hospitals_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctor_hospitals_hospital_id_fkey'
    ) THEN
        ALTER TABLE ehr.doctor_hospitals ADD CONSTRAINT doctor_hospitals_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patient_settings_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.patient_settings ADD CONSTRAINT patient_settings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'locations_hospital_id_fkey'
    ) THEN
        ALTER TABLE ref.locations ADD CONSTRAINT locations_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'locations_department_id_fkey'
    ) THEN
        ALTER TABLE ref.locations ADD CONSTRAINT locations_department_id_fkey FOREIGN KEY (department_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'locations_current_patient_id_fkey'
    ) THEN
        ALTER TABLE ref.locations ADD CONSTRAINT locations_current_patient_id_fkey FOREIGN KEY (current_patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_doctor_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES ehr.doctors (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_hospital_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES ref.hospitals (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.appointments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_prior_prescription_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_prior_prescription_id_fkey FOREIGN KEY (prior_prescription_id) REFERENCES ehr.prescriptions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_created_by_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_prescribed_by_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_last_modified_by_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_cancelled_by_fkey'
    ) THEN
        ALTER TABLE ehr.prescriptions ADD CONSTRAINT prescriptions_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'specialties_parent_id_fkey'
    ) THEN
        ALTER TABLE ehr.specialties ADD CONSTRAINT specialties_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ehr.specialties (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_notifications_recipient_id_fkey'
    ) THEN
        ALTER TABLE ops.system_notifications ADD CONSTRAINT system_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_notifications_sender_id_fkey'
    ) THEN
        ALTER TABLE ops.system_notifications ADD CONSTRAINT system_notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_user_id_fkey'
    ) THEN
        ALTER TABLE core.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurses_user_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurses ADD CONSTRAINT nurses_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nurses_primary_department_id_fkey'
    ) THEN
        ALTER TABLE ehr.nurses ADD CONSTRAINT nurses_primary_department_id_fkey FOREIGN KEY (primary_department_id) REFERENCES ref.hospital_departments (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescription_refills_prescription_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescription_refills ADD CONSTRAINT prescription_refills_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES ehr.prescriptions (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescription_refills_pharmacy_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescription_refills ADD CONSTRAINT prescription_refills_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES ehr.pharmacies (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prescription_refills_dispensed_by_id_fkey'
    ) THEN
        ALTER TABLE ehr.prescription_refills ADD CONSTRAINT prescription_refills_dispensed_by_id_fkey FOREIGN KEY (dispensed_by_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'allergy_intolerances_patient_id_fkey'
    ) THEN
        ALTER TABLE ehr.allergy_intolerances ADD CONSTRAINT allergy_intolerances_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'allergy_intolerances_encounter_id_fkey'
    ) THEN
        ALTER TABLE ehr.allergy_intolerances ADD CONSTRAINT allergy_intolerances_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES ehr.encounters (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'allergy_intolerances_recorder_id_fkey'
    ) THEN
        ALTER TABLE ehr.allergy_intolerances ADD CONSTRAINT allergy_intolerances_recorder_id_fkey FOREIGN KEY (recorder_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'allergy_intolerances_asserter_id_fkey'
    ) THEN
        ALTER TABLE ehr.allergy_intolerances ADD CONSTRAINT allergy_intolerances_asserter_id_fkey FOREIGN KEY (asserter_id) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'todos_created_by_fkey'
    ) THEN
        ALTER TABLE ops.todos ADD CONSTRAINT todos_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'todos_assigned_to_fkey'
    ) THEN
        ALTER TABLE ops.todos ADD CONSTRAINT todos_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES core.users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'todos_patient_id_fkey'
    ) THEN
        ALTER TABLE ops.todos ADD CONSTRAINT todos_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ehr.patients (patient_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'todos_completed_by_fkey'
    ) THEN
        ALTER TABLE ops.todos ADD CONSTRAINT todos_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES core.users (id);
    END IF;
END $$;

