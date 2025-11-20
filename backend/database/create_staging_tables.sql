-- Create staging tables manually
CREATE TABLE IF NOT EXISTS staging.drug_catalog_raw (
    id BIGSERIAL PRIMARY KEY,
    source_row JSONB NOT NULL,
    src_file TEXT,
    src_sheet TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staging.price_raw (
    id BIGSERIAL PRIMARY KEY,
    source_row JSONB NOT NULL,
    src_file TEXT,
    src_sheet TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stg_catalog_id ON staging.drug_catalog_raw ((source_row->>'ID'));
CREATE INDEX IF NOT EXISTS idx_stg_price_reg ON staging.price_raw ((source_row->>'Номер регистрации'));

GRANT SELECT, INSERT, UPDATE, DELETE ON staging.drug_catalog_raw TO fiattib_app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.price_raw TO fiattib_app_rw;
GRANT USAGE, SELECT ON SEQUENCE staging.drug_catalog_raw_id_seq TO fiattib_app_rw;
GRANT USAGE, SELECT ON SEQUENCE staging.price_raw_id_seq TO fiattib_app_rw;

