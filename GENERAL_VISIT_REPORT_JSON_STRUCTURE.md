# General Visit Report - JSON Form Structure

This document describes the complete JSON structure returned by the `GeneralVisitReport` form component.

## Complete JSON Structure

```json
{
  "meta": {
    "clinic_id": "string (from localStorage)",
    "department_id": "dept-general",
    "physician_id": "string (empty by default)",
    "encounter_type": "ambulatory",
    "visit_datetime": "ISO 8601 datetime string"
  },
  "chief_complaint": "string",
  "onset_time": "ISO 8601 datetime string or null",
  "info_source": "patient | relative | record",
  "hpi": {
    "onset": "остро | постепенно | неизвестно | ''",
    "duration": "string",
    "course": "ухудшается | улучшается | стабильно | ''",
    "modifiers": ["string", "..."],
    "associated_symptoms": ["string", "..."],
    "free": "string (free text description)",
    "pregnancy_status": "not_pregnant | pregnant | unknown",
    "pregnancy_trimester": "I | II | III | ''",
    "breastfeeding": "yes | no | unknown"
  },
  "pmh_fh_sh": {
    "pmh": ["HTN", "T2DM", "CAD", "CKD", "Depression", "Tuberculosis", "Hepatitis B/C", "Bronchial Asthma", "Peptic Ulcer", "Rheumatic Heart Disease", "Other"],
    "surgeries": "string",
    "fh": {
      "cardio": "yes | no | unknown",
      "diabetes": "yes | no | unknown",
      "cancer": "yes | no | unknown",
      "notes": "string"
    },
    "smoking": "never | former | current",
    "alcohol_use": "none | occasional | regular",
    "audit_c": 0,
    "exercise": "low | moderate | high"
  },
  "ros": {
    "respiratory": "normal | abnormal",
    "cardio": "normal | abnormal",
    "gi": "normal | abnormal",
    "neuro": "normal | abnormal",
    "gu": "normal | abnormal",
    "derm": "normal | abnormal",
    "ent": "normal | abnormal",
    "msk": "normal | abnormal",
    "notes": {
      "respiratory": "string (if abnormal)",
      "cardio": "string (if abnormal)",
      "gi": "string (if abnormal)",
      "neuro": "string (if abnormal)",
      "gu": "string (if abnormal)",
      "derm": "string (if abnormal)",
      "ent": "string (if abnormal)",
      "msk": "string (if abnormal)"
    }
  },
  "pe": {
    "general": "normal | abnormal",
    "lungs": "normal | abnormal",
    "heart": "normal | abnormal",
    "abdomen": "normal | abnormal",
    "neuro": "normal | abnormal",
    "extremities": "normal | abnormal",
    "notes": {
      "general": "string (if abnormal)",
      "lungs": "string (if abnormal)",
      "heart": "string (if abnormal)",
      "abdomen": "string (if abnormal)",
      "neuro": "string (if abnormal)",
      "extremities": "string (if abnormal)"
    }
  },
  "assessment": {
    "working": [
      {
        "code": "ICD-11 code string",
        "term": "Diagnosis term/description"
      }
    ],
    "ddx": [
      {
        "code": "ICD-11 code string",
        "term": "Diagnosis term/description"
      }
    ]
  },
  "plan": {
    "tests": [
      {
        "type": "lab | imaging",
        "label": "Test name (e.g., 'CBC', 'CXR', 'ECG')",
        "note": "Clinical question / note",
        "destinationClinicId": "string (optional)"
      }
    ],
    "referrals": [
      {
        "specialty": "string (e.g., 'Cardiology', 'Pulmonology')",
        "doctorId": "string (optional)",
        "reason": "string",
        "destinationClinicId": "string (optional)",
        "urgency": "routine | soon | urgent"
      }
    ],
    "med_changes": [
      {
        "med": "Medication name",
        "dose": "string",
        "route": "string",
        "freq": "string",
        "duration": "string",
        "instructions": "string (optional)",
        "sendToPharmacy": false,
        "pharmacyId": "string (optional)"
      }
    ],
    "lifestyle": ["Hydration", "Rest", "Exercise", "Diet", "Smoking Cessation", "Other"],
    "follow_up": "24h | 3d | 1w | PRN | ''",
    "work_capacity": "fit_for_work | limited_capacity | temporarily_unfit",
    "sick_leave_days": "string (number as string, only if work_capacity is 'temporarily_unfit')",
    "hospitalization": "not_required | planned | urgent_emergency",
    "destination_hospital_ward": "string (only if hospitalization is 'planned' or 'urgent_emergency')",
    "vitals_allergies_reviewed": false
  },
  "summary": "string"
}
```

## Example with Sample Data

```json
{
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "dept-general",
    "physician_id": "doc-456",
    "encounter_type": "ambulatory",
    "visit_datetime": "2024-01-15T10:30:00.000Z"
  },
  "chief_complaint": "Chest pain for 2 days",
  "onset_time": "2024-01-13T08:00:00.000Z",
  "info_source": "patient",
  "hpi": {
    "onset": "остро",
    "duration": "2 days",
    "course": "стабильно",
    "modifiers": ["worse with exertion", "relieved by rest"],
    "associated_symptoms": ["shortness of breath", "nausea"],
    "free": "Patient reports sudden onset of chest pain 2 days ago. Pain is substernal, pressure-like, worse with activity.",
    "pregnancy_status": "not_pregnant",
    "pregnancy_trimester": "",
    "breastfeeding": "no"
  },
  "pmh_fh_sh": {
    "pmh": ["HTN", "T2DM"],
    "surgeries": "Appendectomy in 2010",
    "fh": {
      "cardio": "yes",
      "diabetes": "yes",
      "cancer": "no",
      "notes": "Father had MI at age 55"
    },
    "smoking": "former",
    "alcohol_use": "occasional",
    "audit_c": 0,
    "exercise": "low"
  },
  "ros": {
    "respiratory": "abnormal",
    "cardio": "abnormal",
    "gi": "normal",
    "neuro": "normal",
    "gu": "normal",
    "derm": "normal",
    "ent": "normal",
    "msk": "normal",
    "notes": {
      "respiratory": "Shortness of breath on exertion",
      "cardio": "Chest pain"
    }
  },
  "pe": {
    "general": "normal",
    "lungs": "normal",
    "heart": "abnormal",
    "abdomen": "normal",
    "neuro": "normal",
    "extremities": "normal",
    "notes": {
      "heart": "Regular rhythm, no murmurs, S4 gallop present"
    }
  },
  "assessment": {
    "working": [
      {
        "code": "BA41",
        "term": "Acute coronary syndrome"
      }
    ],
    "ddx": [
      {
        "code": "MD11",
        "term": "Gastroesophageal reflux disease"
      },
      {
        "code": "MD12",
        "term": "Anxiety disorder"
      }
    ]
  },
  "plan": {
    "tests": [
      {
        "type": "lab",
        "label": "CBC",
        "note": "Check for anemia",
        "destinationClinicId": ""
      },
      {
        "type": "lab",
        "label": "CRP",
        "note": "Inflammation marker",
        "destinationClinicId": ""
      },
      {
        "type": "imaging",
        "label": "ECG",
        "note": "Rule out MI",
        "destinationClinicId": ""
      }
    ],
    "referrals": [
      {
        "specialty": "Cardiology",
        "doctorId": "cardio-doc-1",
        "reason": "Further evaluation of chest pain",
        "destinationClinicId": "clinic-cardio-1",
        "urgency": "soon"
      }
    ],
    "med_changes": [
      {
        "med": "Aspirin",
        "dose": "100mg",
        "route": "oral",
        "freq": "once daily",
        "duration": "indefinite",
        "instructions": "Take with food",
        "sendToPharmacy": false,
        "pharmacyId": ""
      },
      {
        "med": "Atorvastatin",
        "dose": "20mg",
        "route": "oral",
        "freq": "once daily",
        "duration": "indefinite",
        "instructions": "Take at bedtime",
        "sendToPharmacy": false,
        "pharmacyId": ""
      }
    ],
    "lifestyle": ["Exercise", "Diet"],
    "follow_up": "1w",
    "work_capacity": "limited_capacity",
    "sick_leave_days": "",
    "hospitalization": "not_required",
    "destination_hospital_ward": "",
    "vitals_allergies_reviewed": true
  },
  "summary": "Patient presents with acute chest pain. Working diagnosis: ACS. Plan: Cardiology referral, aspirin, statin, follow-up in 1 week."
}
```

## Key Notes

1. **Arrays**: Most array fields default to empty arrays `[]` if not filled
2. **Null vs Empty String**: 
   - `onset_time` can be `null` or an ISO datetime string
   - Empty strings `''` are used for most text fields
3. **Assessment Diagnoses**: Both `working` and `ddx` arrays contain objects with `code` and `term` properties
4. **Plan Tests**: Each test has `type` ('lab' or 'imaging'), `label`, `note`, and optional `destinationClinicId`
5. **Plan Referrals**: Each referral requires `specialty` and `reason`, with optional `doctorId`, `destinationClinicId`, and `urgency`
6. **Plan Medications**: Each medication requires `med`, `dose`, `route`, `freq`, and `duration`; `instructions`, `sendToPharmacy`, and `pharmacyId` are optional
7. **Conditional Fields**:
   - `pregnancy_trimester` only relevant if `pregnancy_status` is 'pregnant'
   - `sick_leave_days` only relevant if `work_capacity` is 'temporarily_unfit'
   - `destination_hospital_ward` only relevant if `hospitalization` is 'planned' or 'urgent_emergency'
8. **ROS and PE Notes**: The `notes` objects only contain entries for systems marked as 'abnormal'

## Data Processing Before Submission

Before submission (in `Report.jsx`), the form data is processed:
- `onset_time` is set to `null` if empty string
- `assessment.working` and `assessment.ddx` are normalized to ensure they're arrays of objects (strings are converted to `{code: '', term: string}`)
- `plan.follow_up` is set to `null` if empty string
- `meta.clinic_id` and `meta.visit_datetime` are ensured to have values



