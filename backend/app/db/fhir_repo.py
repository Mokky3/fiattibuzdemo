# db/fhir_repo.py
from typing import Dict
from sqlalchemy import insert, select, delete
from db import Session, fhir_resources   # fhir_resources table: id, resource (JSONB)

def save(bundle_id: str, bundle_json: Dict):
    with Session() as s:
        s.execute(insert(fhir_resources).values(id=bundle_id, resource=bundle_json))
        s.commit()

def get_by_qr_id(qr_id: str) -> Dict | None:
    with Session() as s:
        stmt = select(fhir_resources.c.resource).where(
            fhir_resources.c.resource["entry"].contains([{"resource": {"id": qr_id}}])
        )
        row = s.execute(stmt).first()
        return row[0] if row else None

def delete_by_qr_id(qr_id: str) -> bool:
    with Session() as s:
        stmt = delete(fhir_resources).where(
            fhir_resources.c.resource["entry"].contains([{"resource": {"id": qr_id}}])
        )
        res = s.execute(stmt)
        s.commit()
        return res.rowcount > 0
