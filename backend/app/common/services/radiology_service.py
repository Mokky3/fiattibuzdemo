from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from app.common.schemas.radiology import (
    RadiologyReport,
    RadiologyReportCreate,
    RadiologyStudy,
    RadiologyContact,
    RadiologyThread,
    RadiologyMessage,
    PACSStudyInfo,
)


_REPORTS: Dict[str, RadiologyReport] = {}
_THREADS: Dict[int, RadiologyThread] = {}


def list_studies_mock() -> List[RadiologyStudy]:
    return [
        RadiologyStudy(
            id="RAD-001",
            accessionNumber="ACC2025001",
            patientName="Smith, John",
            mrn="MRN001234",
            modality="CT",
            bodyPart="Chest",
            studyDescription="CT Chest W/O Contrast",
            studyDate=datetime.fromisoformat("2025-06-29T09:00:00"),
            dob=datetime.fromisoformat("1980-03-15T00:00:00").date(),
            age=45,
            gender="M",
        )
    ]


def create_report(payload: RadiologyReportCreate, radiologist: str) -> RadiologyReport:
    report_id = f"REP-{len(_REPORTS)+1:04d}"
    report = RadiologyReport(
        id=report_id,
        study_id=payload.study_id,
        findings=payload.findings,
        impression=payload.impression,
        recommendations=payload.recommendations,
        radiologist=radiologist,
        created_at=datetime.utcnow(),
    )
    _REPORTS[report_id] = report
    return report


def list_reports() -> List[RadiologyReport]:
    return list(_REPORTS.values())


def get_pacs_viewer_info(study_id: str) -> PACSStudyInfo:
    # Placeholder mapping; replace with DICOMweb/Orthanc integration
    uid = "1.2.840.113619.2.55.3.2831164352.781.1591788880.467"
    return PACSStudyInfo(
        study_id=study_id,
        StudyInstanceUID=uid,
        viewer_url=f"http://localhost:3001/viewer?StudyInstanceUID={uid}",
    )


def list_contacts_mock() -> List[RadiologyContact]:
    return [
        RadiologyContact(id=1, name="Dr. Sarah Wilson", role="Cardiologist", type="doctor", urgent=True, status="online"),
        RadiologyContact(id=2, name="Dr. Michael Chen", role="Emergency Medicine", type="doctor", urgent=True, status="online"),
    ]


def get_thread(contact_id: int) -> RadiologyThread:
    if contact_id not in _THREADS:
        _THREADS[contact_id] = RadiologyThread(
            contact_id=contact_id,
            messages=[
                RadiologyMessage(
                    id=1,
                    sender="Dr. Sarah Wilson",
                    content="Need urgent review of CT angiogram.",
                    time="10:30 AM",
                    isMe=False,
                    urgent=True,
                    studyLink="CTG2025001",
                )
            ],
        )
    return _THREADS[contact_id]


def send_message(contact_id: int, sender: str, content: str) -> RadiologyMessage:
    thread = get_thread(contact_id)
    msg_id = max((m.id for m in thread.messages), default=0) + 1
    message = RadiologyMessage(id=msg_id, sender=sender, content=content, time="now", isMe=True)
    thread.messages.append(message)
    _THREADS[contact_id] = thread
    return message





