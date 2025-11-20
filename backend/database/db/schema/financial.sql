-- Financial schema tables

-- Bills table
CREATE TABLE IF NOT EXISTS financial.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  account_id UUID NOT NULL,
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  bill_type TEXT NOT NULL,
  service_period_start DATE NOT NULL,
  service_period_end DATE NOT NULL,
  status TEXT NOT NULL,
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
  cancelled_date TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS financial.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  bill_id UUID REFERENCES financial.bills(id),
  payment_number TEXT NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL,
  reference_number TEXT,
  authorization_code TEXT,
  card_last_four TEXT,
  card_type TEXT,
  bank_name TEXT,
  bank_reference TEXT,
  payer_name TEXT,
  payer_relationship TEXT,
  processed_date TIMESTAMPTZ,
  processor_reference TEXT,
  is_refunded BOOLEAN,
  refunded_amount NUMERIC(15, 2),
  refund_date TIMESTAMPTZ,
  refund_reason TEXT,
  receipt_number TEXT,
  receipt_issued BOOLEAN,
  notes TEXT,
  received_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Charge Items table
CREATE TABLE IF NOT EXISTS financial.charge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_charge_item_id TEXT,
  identifiers JSONB,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  encounter_id UUID REFERENCES ehr.encounters(id),
  appointment_id UUID REFERENCES ehr.appointments(id),
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_category TEXT,
  code JSONB NOT NULL,
  status TEXT NOT NULL,
  occurrence_date TIMESTAMPTZ NOT NULL,
  occurrence_period_start TIMESTAMPTZ,
  occurrence_period_end TIMESTAMPTZ,
  quantity NUMERIC(10, 2) NOT NULL,
  quantity_unit TEXT,
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
  body_site JSONB,
  reason_codes JSONB,
  product_reference TEXT,
  product_code JSONB,
  account_id UUID,
  supporting_info JSONB,
  notes JSONB,
  entered_by UUID NOT NULL,
  entered_date TIMESTAMPTZ DEFAULT now(),
  is_billed BOOLEAN,
  billed_date TIMESTAMPTZ,
  bill_id UUID REFERENCES financial.bills(id),
  part_of_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Insurance Claims table
CREATE TABLE IF NOT EXISTS financial.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_claim_id TEXT,
  insurance_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  appointment_id UUID REFERENCES ehr.appointments(id),
  claim_number TEXT NOT NULL,
  internal_claim_id TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  service_type TEXT,
  service_date DATE NOT NULL,
  service_end_date DATE,
  submission_date DATE NOT NULL,
  received_date DATE,
  status TEXT NOT NULL,
  status_date TIMESTAMPTZ NOT NULL,
  status_reason TEXT,
  billing_provider_id UUID NOT NULL,
  rendering_provider_id UUID,
  referring_provider_id UUID,
  services JSONB NOT NULL,
  diagnosis_codes JSONB NOT NULL,
  procedure_codes JSONB,
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
  check_number TEXT,
  denial_reason TEXT,
  denial_codes JSONB,
  appeal_submitted BOOLEAN,
  appeal_date DATE,
  appeal_outcome TEXT,
  appeal_notes TEXT,
  attachments JSONB,
  internal_notes TEXT,
  payer_notes TEXT,
  is_resubmission BOOLEAN,
  original_claim_id UUID,
  resubmission_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Insurance Authorizations table
CREATE TABLE IF NOT EXISTS financial.insurance_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id),
  authorization_number TEXT,
  request_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  procedure_codes JSONB NOT NULL,
  diagnosis_codes JSONB NOT NULL,
  requesting_provider_id UUID NOT NULL,
  servicing_provider_id UUID,
  status TEXT NOT NULL,
  decision_date DATE,
  valid_from DATE,
  valid_to DATE,
  units_approved INTEGER,
  units_used INTEGER,
  clinical_notes TEXT,
  payer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Financial Transactions table
CREATE TABLE IF NOT EXISTS financial.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  transaction_type TEXT NOT NULL,
  charge_item_id UUID REFERENCES financial.charge_items(id),
  payment_id UUID REFERENCES financial.payments(id),
  debit_amount NUMERIC(15, 2),
  credit_amount NUMERIC(15, 2),
  running_balance NUMERIC(15, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  posted_by UUID NOT NULL,
  posted_date TIMESTAMPTZ DEFAULT now(),
  is_reversed BOOLEAN,
  reversed_by_id UUID,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_patient_id ON financial.bills (patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON financial.bills (status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON financial.bills (bill_date);

CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON financial.payments (patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON financial.payments (bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON financial.payments (payment_date);

CREATE INDEX IF NOT EXISTS idx_charge_items_patient_id ON financial.charge_items (patient_id);
CREATE INDEX IF NOT EXISTS idx_charge_items_encounter_id ON financial.charge_items (encounter_id);
CREATE INDEX IF NOT EXISTS idx_charge_items_status ON financial.charge_items (status);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient_id ON financial.insurance_claims (patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON financial.insurance_claims (status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_submission_date ON financial.insurance_claims (submission_date);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_account_id ON financial.financial_transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial.financial_transactions (transaction_date);
