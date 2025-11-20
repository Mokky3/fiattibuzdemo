-- Insert an initial admin user (replace email later)
INSERT INTO core.users (email, full_name, role)
VALUES ('admin@fiattib.uz', 'FIATTIB Admin', 'admin')
ON CONFLICT (email) DO NOTHING;
