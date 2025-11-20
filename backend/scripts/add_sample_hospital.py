from datetime import date
import uuid

from app.db.session import SessionLocal
from app.common.models.hospital import Hospital, HospitalType, HospitalStatus


def main() -> None:
    db = SessionLocal()
    try:
        code = "FIAT001"
        existing = db.query(Hospital).filter(Hospital.code == code).first()
        if existing:
            print(f"Hospital already exists: id={existing.id} code={existing.code} name={existing.name}")
            return

        h = Hospital(
            id=str(uuid.uuid4()),
            name="Fiattib Clinic",
            legal_name="Fiattib Clinic LLC",
            code=code,
            hospital_type=HospitalType.CLINIC,
            registration_number="REG-0001",
            tax_id="TIN-0001",
            license_number="LIC-0001",
            license_valid_until=date(2030, 1, 1),
            phone="+998711234567",
            email="info@fiattib.uz",
            website="https://fiattib.uz",
            address_line1="123 Health St",
            city="Tashkent",
            state="Tashkent",
            zip_code="100000",
            country="UZ",
            is_24_hours=False,
            emergency_services=True,
            total_beds=20,
            status=HospitalStatus.ACTIVE,
        )

        db.add(h)
        db.commit()
        print(f"Created hospital with id: {h.id}")
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()


