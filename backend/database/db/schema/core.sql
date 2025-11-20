-- Reference core schema definition
CREATE TABLE IF NOT EXISTS core.users (
  user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin','doctor','nurse','receptionist','patient')),
  specialty      TEXT,
  license_number TEXT,
  organization   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON core.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON core.users (role);
