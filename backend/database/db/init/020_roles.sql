DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='fiattib_app_rw') THEN
    CREATE ROLE fiattib_app_rw LOGIN PASSWORD 'change_me_app_rw';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='fiattib_app_ro') THEN
    CREATE ROLE fiattib_app_ro LOGIN PASSWORD 'change_me_app_ro';
  END IF;
END $$;
