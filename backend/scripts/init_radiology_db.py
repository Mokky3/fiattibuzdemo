"""Initialize database tables for Radiology (and required dependencies).

Run: python backend/scripts/init_radiology_db.py
"""
from app.db.session import engine
from app.db.base_class import Base

# Import models to ensure they are registered with SQLAlchemy metadata
from app.common.models import (
    admin, appointment, clinical, doctor, document, financial, hospital,
    lab_insurance, log_ses, medical, messaging, nurse, patient, practitioner,
    prescription, user
)
from app.common.models import radiology  # newly added radiology models
from app.common.models import lab  # newly added lab models


def main() -> None:
    print("[init] Creating tables if not exist...")
    Base.metadata.create_all(bind=engine)
    print("[init] Done.")


if __name__ == "__main__":
    main()


