import os
import sqlite3
import sys
from pathlib import Path

# Add backend to path to import app modules
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from passlib.context import CryptContext

# Password hashing - must match AuthService schemes for compatibility
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,
    bcrypt_sha256__truncate_error=False,
)


USERS = [
    ("admin", "admin@example.com", "Admin123!", "Super", "Admin"),
    ("doctor", "doctor@example.com", "Doctor123!", "John", "Doe"),
    ("nurse", "nurse@example.com", "Nurse123!", "Jane", "Nurse"),
    ("receptionist", "reception@example.com", "Reception123!", "Rex", "Reception"),
    ("lab_technician", "lab@example.com", "Lab123!", "Lara", "Lab"),
    ("radiologist", "radiology@example.com", "Radiology123!", "Ray", "Radiology"),
    ("patient", "patient@example.com", "Patient123!", "Pat", "Ient"),
]


def main() -> None:
    db_path = os.path.join(os.path.dirname(__file__), "ehr.db")
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys = ON")

        print("Creating portal users (sqlite)...")
        results = []

        pinfl_counter = 12345678901230
        for role, email, pwd, first_name, surname in USERS:
            cur.execute("SELECT id FROM users WHERE email = ?", (email,))
            row = cur.fetchone()
            if row:
                results.append((role, email, pwd, False))
                continue

            username = email.split("@")[0]
            # Use pbkdf2_sha256 to match AuthService.get_password_hash() scheme
            hashed_password = pwd_context.hash(pwd, scheme="pbkdf2_sha256")
            pinfl_counter += 1
            pinfl = str(pinfl_counter)
            phone_number = "+99890" + str(pinfl_counter % 10000000).zfill(7)

            # Insert minimal user matching existing schema
            # Note: Column name might be 'hashed_password' or 'password_hash' depending on schema
            # Try both to handle different database versions
            try:
                cur.execute(
                    """
                    INSERT INTO users (username, email, password_hash, role, first_name, last_name, pinfl, phone, is_active, status)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                    """,
                    (username, email, hashed_password, role, first_name, surname, pinfl, phone_number, True, "ACTIVE"),
                )
            except sqlite3.OperationalError:
                # Fallback to older schema with hashed_password and surname
                cur.execute(
                    """
                    INSERT INTO users (username, email, hashed_password, role, first_name, surname, pinfl, phone_number)
                    VALUES (?,?,?,?,?,?,?,?)
                    """,
                    (username, email, hashed_password, role, first_name, surname, pinfl, phone_number),
                )
            results.append((role, email, pwd, True))

        # Ensure a doctor profile exists (older schema lacks user_id)
        cur.execute("SELECT email FROM doctors WHERE email = ?", ("doctor@example.com",))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO doctors (full_name, specialty, phone, email) VALUES (?,?,?,?)",
                ("Dr. John Doe", "General", "+998900000000", "doctor@example.com"),
            )

        conn.commit()

        print("\nAccounts:")
        for role, email, pwd, created in results:
            status = "created" if created else "exists"
            print(f"  - {role}: {email} / {pwd} ({status})")

    finally:
        conn.close()


if __name__ == "__main__":
    main()


