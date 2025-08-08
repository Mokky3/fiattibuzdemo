...# services/fhir_builders.py
from uuid import uuid4
from datetime import datetime, timezone
from typing import Dict, Any, List

# -------- helper to make Coding blocks ---------------------------------------
def coding(system: str, code: str, display: str) -> Dict[str, str]:
    return {"system": system, "code": code, "display": display}

# -------- build QuestionnaireResponse ----------------------------------------
def build_questionnaire_response(
    questionnaire_code: str,
    answers: Dict[str, Any],
    patient_id: str,
    author_id: str,
) -> Dict:
    qr_id = f"qr-{uuid4().hex[:8]}"
    authored = datetime.now(timezone.utc).isoformat()
    return {
        "resourceType": "QuestionnaireResponse",
        "id": qr_id,
        "questionnaire": {
            "reference": f"Questionnaire/{questionnaire_code}"
        },
        "status": "completed",
        "subject": {"reference": f"Patient/{patient_id}"},
        "author": {"reference": f"Practitioner/{author_id}"},
        "authored": authored,
        "item": [
            {
                "linkId": k,
                "answer": [{"valueString": str(v)}]
            } for k, v in answers.items()
        ],
    }

# -------- map a few key fields → Observations w/ LOINC/SNOMED ---------------
FIELD_MAP = {
    "mother_education": coding("http://snomed.info/sct", "365456000", "Educational level"),
    "pregnancy_number": coding("http://loinc.org", "11994-9", "Number of pregnancies"),
    "mother_age":       coding("http://loinc.org", "30525-0", "Age of Mother"),
    # … add as many as you need
}

def build_observations_from_form(form: Dict[str, Any], patient_id: str) -> List[Dict]:
    observations = []
    for field, code in FIELD_MAP.items():
        if field not in form or form[field] in (None, ""):
            continue
        obs_id = f"obs-{uuid4().hex[:8]}"
        value = form[field]
        # choose value type
        v_key = "valueString"
        if isinstance(value, (int, float)):
            v_key = "valueInteger" if isinstance(value, int) else "valueQuantity"
        observations.append({
            "resourceType": "Observation",
            "id": obs_id,
            "status": "final",
            "category": [{
                "coding": [coding("http://terminology.hl7.org/CodeSystem/observation-category", "social-history", "Social History")]
            }],
            "code": {"coding": [code]},
            "subject": {"reference": f"Patient/{patient_id}"},
            v_key: value,
            "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
        })
    return observations

# -------- convenient export for Bundle dict ----------------------------------
def bundle_to_dict(resources: List[Dict]) -> Dict:
    return {
        "resourceType": "Bundle",
        "type": "transaction",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "entry": [{"resource": r} for r in resources],
    }
