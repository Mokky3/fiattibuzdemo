"""Database-backed FHIR repository.

Persists FHIR resources (including Bundles) in a single table `fhir_resources`
with a JSON column that is portable across SQLite and PostgreSQL.

Additionally, for key resource types used by the application (reports and
prescriptions), this repository will also attempt to synchronize the saved
resources to the external FHIR server in the background:
    - Reports: DocumentReference, Binary, DiagnosticReport
    - Prescriptions: MedicationRequest
    - Vitals (for completeness): Observation

Public API:
    - fhir_repo.save(resource: dict) -> dict
    - fhir_repo.get(resource_type: str, id_: str) -> dict | None
    - fhir_repo.list_bundles(resource_type: str | None = None) -> list[dict]
"""

from __future__ import annotations

from typing import List, Optional, Iterable
import asyncio
from uuid import uuid4

from sqlalchemy import Column, String, JSON, DateTime, func, select, delete
from sqlalchemy.orm import Session

from app.db.base_class import Base
from app.db.session import SessionLocal
from app.services.fhir_client import FHIRClient


class FHIRResource(Base):
    __tablename__ = "fhir_resources"

    # Key format: "{resourceType}/{id}" (for Bundles, use their own id)
    key = Column(String(200), primary_key=True, index=True)
    resource_type = Column(String(64), index=True, nullable=False)
    resource_id = Column(String(100), index=True, nullable=True)
    resource = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class FHIRRepository:
    def __init__(self, session_factory=SessionLocal):
        self._session_factory = session_factory
        # Resource types we sync to the external FHIR server when saved locally
        self._sync_resource_types = {
            "DocumentReference",
            "Binary",
            "DiagnosticReport",
            "MedicationRequest",
            "Observation",
        }

    def save(self, resource: dict) -> dict:
        """Insert or update a FHIR resource or Bundle.

        If the input is a resource without an `id`, one will be generated.
        Key is stored as "{resourceType}/{id}".
        """
        if not isinstance(resource, dict):
            raise ValueError("resource must be a dict")

        resource_type = resource.get("resourceType")
        if not resource_type:
            raise ValueError("resourceType is required in FHIR resource")

        # Ensure resource has id
        resource_id = resource.get("id")
        if not resource_id:
            resource_id = uuid4().hex
            resource = {**resource, "id": resource_id}

        key = f"{resource_type}/{resource_id}"

        # Collect resources that should be synced to external FHIR server
        resources_to_sync = list(self._extract_resources_for_sync(resource))

        with self._session_factory() as session:  # type: Session
            existing = session.get(FHIRResource, key)
            if existing:
                existing.resource = resource  # type: ignore[assignment]
                existing.resource_type = resource_type
                existing.resource_id = resource_id
            else:
                existing = FHIRResource(
                    key=key,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    resource=resource,
                )
                session.add(existing)

            session.commit()
            session.refresh(existing)

            # Fire-and-forget background sync to external FHIR server
            if resources_to_sync:
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(self._sync_to_remote_fhir(resources_to_sync))
                except RuntimeError:
                    # No running loop (e.g., called in sync context). Skip background sync.
                    pass
            return existing.resource  # type: ignore[return-value]

    def get(self, resource_type: str, id_: str) -> Optional[dict]:
        """Return a single FHIR resource by type and id."""
        key = f"{resource_type}/{id_}"
        with self._session_factory() as session:  # type: Session
            row = session.get(FHIRResource, key)
            return row.resource if row else None  # type: ignore[return-value]

    def delete(self, resource_type: str, id_: str) -> bool:
        """Delete a resource by type and id. Returns True if deleted."""
        key = f"{resource_type}/{id_}"
        with self._session_factory() as session:  # type: Session
            row = session.get(FHIRResource, key)
            if not row:
                return False
            session.delete(row)
            session.commit()
            return True

    def list_bundles(self, resource_type: Optional[str] = None) -> List[dict]:
        """Return all Bundle resources. If resource_type is provided, only bundles
        whose first entry's resourceType matches will be returned.
        """
        with self._session_factory() as session:  # type: Session
            stmt = select(FHIRResource).where(FHIRResource.resource_type == "Bundle")
            rows: List[FHIRResource] = list(session.execute(stmt).scalars())

            bundles: List[dict] = []
            for row in rows:
                bundle = dict(row.resource)  # type: ignore[assignment]
                if not isinstance(bundle, dict):
                    continue
                # Ensure timestamp exists for consumers that expect it
                if not bundle.get("timestamp"):
                    try:
                        bundle["timestamp"] = (row.created_at or row.updated_at).isoformat() + "Z"  # type: ignore[union-attr]
                    except Exception:
                        pass
                if resource_type:
                    entries = bundle.get("entry") or []
                    if not entries:
                        continue
                    root_res = entries[0].get("resource") if isinstance(entries[0], dict) else None
                    if not root_res or root_res.get("resourceType") != resource_type:
                        continue
                bundles.append(bundle)
            return bundles

    # ---------------------------------------------------------------------
    # Internal helpers: background sync to external FHIR server
    # ---------------------------------------------------------------------
    def _extract_resources_for_sync(self, resource: dict) -> Iterable[dict]:
        """Yield individual resources that should be synced to remote FHIR.

        Supports both single resources and transaction-like Bundles with
        embedded resources in `entry`.
        """
        try:
            r_type = resource.get("resourceType")
            if r_type == "Bundle":
                for entry in resource.get("entry", []) or []:
                    entry_res = entry.get("resource") if isinstance(entry, dict) else None
                    if isinstance(entry_res, dict) and entry_res.get("resourceType") in self._sync_resource_types:
                        yield entry_res
            else:
                if r_type in self._sync_resource_types:
                    yield resource
        except Exception:
            # Never fail the primary save due to sync preparation issues
            return

    async def _sync_to_remote_fhir(self, resources: List[dict]) -> None:
        """Best-effort synchronization to external FHIR server.

        Uses PUT upsert when resource has an `id`, otherwise POST create.
        Errors are swallowed to avoid impacting API responsiveness.
        """
        client = FHIRClient()
        for res in resources:
            try:
                r_type = res.get("resourceType")
                r_id = res.get("id")
                if not r_type:
                    continue
                if r_id:
                    await client._make_request("PUT", f"{r_type}/{r_id}", data=res)
                else:
                    await client._make_request("POST", f"{r_type}", data=res)
            except Exception:
                # Swallow errors; logging could be added here if desired
                continue


# Singleton instance to be imported by routes/services
fhir_repo = FHIRRepository()


