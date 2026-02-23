# Neurology Report - JSON Form Structure

This document describes the complete JSON structure returned by the `NeurologyReportForm` component.

## Complete JSON Structure

The form has two modes: `initial` and `discharge`. The JSON structure differs slightly based on the mode.

### Base Structure (Both Modes)

```json
{
  "doc_type": "neu.initial | neu.discharge",
  "meta": {
    "clinic_id": "string",
    "department_id": "neurology",
    "physician_id": "string",
    "patient_id": "string",
    "encounter_id": "string",
    "datetime": "ISO 8601 datetime string"
  },
  "chief_complaint": "string",
  "hpi": {
    "onset_type": "string",
    "lkw_time": "string (Last Known Well time)",
    "course": "string",
    "triggers": "string",
    "associated_symptoms": ["string"],
    "headache_profile": "string",
    "seizure_semiology": "string",
    "risk_factors": {
      "htn": false,
      "dm": false,
      "af": false,
      "smoking": false,
      "anticoagulants": false
    },
    "meds": "string",
    "allergies": "string",
    "pmh": "string (Past Medical History)",
    "family": "string",
    "social": "string"
  },
  "vitals": {
    "bp_right": "string",
    "bp_left": "string",
    "hr": "string (Heart Rate)",
    "temp": "string (Temperature)",
    "spo2": "string (SpO2)"
  },
  "mental_status": {
    "consciousness": "alert | drowsy | stuporous | comatose",
    "orientation": {
      "person": true,
      "place": true,
      "time": true
    },
    "attention_memory": "string",
    "language": "string",
    "behavior": "string",
    "mmse": {
      "score": "string (0-30)",
      "date": "ISO date string"
    },
    "moca": {
      "score": "string (0-30)",
      "date": "ISO date string"
    }
  },
  "cranial_nerves": {
    "cn1": "string (Olfactory)",
    "cn2_fields": "string (Optic - Visual Fields)",
    "cn2_fundoscopy": "string (Optic - Fundoscopy)",
    "cn3_4_6_eyemov": "string (Oculomotor, Trochlear, Abducens - Eye Movements)",
    "cn5": "string (Trigeminal)",
    "cn7": "string (Facial)",
    "cn8": "string (Vestibulocochlear)",
    "cn9_10": "string (Glossopharyngeal, Vagus)",
    "cn11": "string (Accessory)",
    "cn12": "string (Hypoglossal)"
  },
  "motor": {
    "tone": "normal | increased | decreased | spastic | rigid",
    "bulk": "normal | atrophic",
    "fasciculations": false,
    "strength": {
      "R": {
        "shoulder": "string (0-5)",
        "elbow": "string (0-5)",
        "wrist": "string (0-5)",
        "hip": "string (0-5)",
        "knee": "string (0-5)",
        "ankle": "string (0-5)"
      },
      "L": {
        "shoulder": "string (0-5)",
        "elbow": "string (0-5)",
        "wrist": "string (0-5)",
        "hip": "string (0-5)",
        "knee": "string (0-5)",
        "ankle": "string (0-5)"
      }
    },
    "pronator_drift": "string"
  },
  "reflexes": {
    "biceps": "string (0-4+ or absent)",
    "triceps": "string",
    "brachioradialis": "string",
    "knee": "string",
    "ankle": "string",
    "plantar": "string (flexor | extensor)",
    "hoffman": false,
    "clonus": false
  },
  "sensory": {
    "light_touch": "string",
    "pinprick": "string",
    "temperature": "string",
    "vibration": "string",
    "proprioception": "string",
    "dermatomes_note": "string"
  },
  "cerebellar": {
    "fnf": "string (Finger-to-Nose-Finger)",
    "hks": "string (Heel-to-Knee-to-Shin)",
    "diadochokinesis": "string",
    "romberg": "string",
    "gait": {
      "normal": true,
      "tandem": false,
      "heels": false,
      "toes": false
    }
  },
  "autonomic": {
    "orthostasis_bp": "string",
    "bowel_bladder": "string",
    "sweating": "string"
  },
  "meningeal": {
    "nuchal_rigidity": false,
    "kernig": false,
    "brudzinski": false
  },
  "pain_headache": {
    "site": "string",
    "quality": "string",
    "severity_vas": "string (Visual Analog Scale 0-10)",
    "triggers": "string",
    "red_flags": ["string"]
  },
  "seizure": {
    "semiology": "string",
    "frequency": "string",
    "triggers": "string",
    "postictal": "string",
    "aeds": ["string (Anti-Epileptic Drugs)"],
    "adherence": "string"
  },
  "stroke": {
    "lkw_time": "string (Last Known Well time)",
    "nihss": {
      "total": "string (0-42)",
      "items": {}
    },
    "mrs_pre": "string (Modified Rankin Scale 0-6)",
    "mrs_current": "string (Modified Rankin Scale 0-6)",
    "tpa_checklist": {
      "eligible": null,
      "contraindications": []
    },
    "thrombectomy_consider": false
  },
  "localization_hypothesis": {
    "lesion_site": "string",
    "rationale": "string"
  },
  "tests": {
    "imaging": [
      {
        "study_uid": "string",
        "modality": "CT | MRI | MRA | CTA | other",
        "date": "ISO date string",
        "description": "string",
        "source": "orthanc | pacs",
        "diagnostic_report_id": "string",
        "ohif_url": "string",
        "attach": "reference_only | attach",
        "note": "string"
      }
    ],
    "eeg": {
      "date": "ISO date string",
      "summary": "string"
    },
    "emg_ncs": {
      "date": "ISO date string",
      "summary": "string"
    },
    "labs": {
      "b12": "string",
      "tsh": "string",
      "a1c": "string",
      "ck": "string (Creatine Kinase)",
      "esr_crp": "string (ESR/CRP)",
      "others": "string"
    },
    "lp": {
      "performed": false,
      "opening_pressure": "string (cmH2O)",
      "cells": "string",
      "protein": "string (mg/dL)",
      "glucose": "string (mg/dL)",
      "microbiology": "string"
    },
    "referenced_docs": []
  },
  "diagnosis": {
    "main": "string",
    "secondary": ["string"],
    "codes": []
  },
  "procedures_done": [
    {
      "name": "string",
      "date": "ISO date string",
      "side": "R | L | bilateral",
      "anesthesia": "none | local | general",
      "technique": "string",
      "findings": "string",
      "result": "successful | partial | failed",
      "complications": "string"
    }
  ],
  "attachments": []
}
```

### Initial Mode Only Fields

```json
{
  "plan": {
    "meds": [
      {
        "med": "Medication name",
        "dose": "string",
        "route": "oral | IV | IM | topical",
        "freq": "string",
        "duration": "string",
        "instructions": "string",
        "sendToPharmacy": false,
        "pharmacyId": "string"
      }
    ],
    "procedures_planned": [],
    "counseling": [],
    "rehab_referrals": [],
    "safety": {
      "falls": false,
      "driving_restriction": false
    },
    "follow_up": "string",
    "follow_up_date": "ISO date string"
  }
}
```

### Discharge Mode Only Fields

```json
{
  "outcome": {
    "condition": "string",
    "course": "string"
  },
  "recommendations": []
}
```

## Example with Sample Data

### Initial Visit Example

```json
{
  "doc_type": "neu.initial",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "neurology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-101",
    "datetime": "2024-01-15T10:30:00.000Z"
  },
  "chief_complaint": "Headache and right-sided weakness for 2 days",
  "hpi": {
    "onset_type": "Acute",
    "lkw_time": "2024-01-13T08:00:00.000Z",
    "course": "Progressive",
    "triggers": "None identified",
    "associated_symptoms": ["Nausea", "Vomiting", "Dizziness"],
    "headache_profile": "Throbbing, severe, right-sided",
    "seizure_semiology": "",
    "risk_factors": {
      "htn": true,
      "dm": true,
      "af": false,
      "smoking": true,
      "anticoagulants": false
    },
    "meds": "Lisinopril 10mg daily, Metformin 500mg BID",
    "allergies": "Penicillin",
    "pmh": "Hypertension, Type 2 Diabetes",
    "family": "Father had stroke at age 65",
    "social": "Former smoker, quit 5 years ago"
  },
  "vitals": {
    "bp_right": "150/90",
    "bp_left": "148/88",
    "hr": "88",
    "temp": "37.2",
    "spo2": "98"
  },
  "mental_status": {
    "consciousness": "alert",
    "orientation": {
      "person": true,
      "place": true,
      "time": true
    },
    "attention_memory": "Mildly impaired short-term memory",
    "language": "Fluent, no aphasia",
    "behavior": "Appropriate",
    "mmse": {
      "score": "26",
      "date": "2024-01-15"
    },
    "moca": {
      "score": "24",
      "date": "2024-01-15"
    }
  },
  "cranial_nerves": {
    "cn1": "Not tested",
    "cn2_fields": "Full fields OU",
    "cn2_fundoscopy": "Normal discs, vessels, macula OU",
    "cn3_4_6_eyemov": "Full EOM, no nystagmus",
    "cn5": "Intact sensation V1-V3, muscles of mastication",
    "cn7": "Right facial droop, left intact",
    "cn8": "Hearing intact bilaterally",
    "cn9_10": "Gag intact, uvula midline",
    "cn11": "SCM and trapezius strength intact",
    "cn12": "Tongue deviates slightly to right"
  },
  "motor": {
    "tone": "Increased on right",
    "bulk": "normal",
    "fasciculations": false,
    "strength": {
      "R": {
        "shoulder": "4",
        "elbow": "4",
        "wrist": "4",
        "hip": "4",
        "knee": "4",
        "ankle": "4"
      },
      "L": {
        "shoulder": "5",
        "elbow": "5",
        "wrist": "5",
        "hip": "5",
        "knee": "5",
        "ankle": "5"
      }
    },
    "pronator_drift": "Right arm drifts down"
  },
  "reflexes": {
    "biceps": "3+",
    "triceps": "3+",
    "brachioradialis": "3+",
    "knee": "3+",
    "ankle": "3+",
    "plantar": "extensor",
    "hoffman": true,
    "clonus": false
  },
  "sensory": {
    "light_touch": "Decreased on right side",
    "pinprick": "Decreased on right side",
    "temperature": "Decreased on right side",
    "vibration": "Intact bilaterally",
    "proprioception": "Intact bilaterally",
    "dermatomes_note": "Right hemibody sensory loss"
  },
  "cerebellar": {
    "fnf": "Mild dysmetria right",
    "hks": "Normal",
    "diadochokinesis": "Mildly impaired right",
    "romberg": "Negative",
    "gait": {
      "normal": false,
      "tandem": false,
      "heels": false,
      "toes": false
    }
  },
  "autonomic": {
    "orthostasis_bp": "No orthostatic hypotension",
    "bowel_bladder": "Normal",
    "sweating": "Normal"
  },
  "meningeal": {
    "nuchal_rigidity": false,
    "kernig": false,
    "brudzinski": false
  },
  "pain_headache": {
    "site": "Right frontal",
    "quality": "Throbbing",
    "severity_vas": "8",
    "triggers": "None",
    "red_flags": ["Acute onset", "Focal neurological deficit"]
  },
  "seizure": {
    "semiology": "",
    "frequency": "",
    "triggers": "",
    "postictal": "",
    "aeds": [],
    "adherence": ""
  },
  "stroke": {
    "lkw_time": "2024-01-13T08:00:00.000Z",
    "nihss": {
      "total": "8",
      "items": {}
    },
    "mrs_pre": "0",
    "mrs_current": "3",
    "tpa_checklist": {
      "eligible": null,
      "contraindications": []
    },
    "thrombectomy_consider": false
  },
  "localization_hypothesis": {
    "lesion_site": "Left internal capsule",
    "rationale": "Right hemiparesis, right facial droop, right hemisensory loss"
  },
  "tests": {
    "imaging": [
      {
        "study_uid": "1.2.840.113619.2.55.3.123456789",
        "modality": "CT",
        "date": "2024-01-15",
        "description": "CT head non-contrast",
        "source": "orthanc",
        "diagnostic_report_id": "rep-001",
        "ohif_url": "/ohif/viewer?StudyInstanceUIDs=1.2.840.113619.2.55.3.123456789",
        "attach": "reference_only",
        "note": "Acute infarct in left internal capsule"
      },
      {
        "study_uid": "1.2.840.113619.2.55.3.123456790",
        "modality": "MRI",
        "date": "2024-01-15",
        "description": "MR DWI/FLAIR",
        "source": "orthanc",
        "diagnostic_report_id": "rep-002",
        "ohif_url": "/ohif/viewer?StudyInstanceUIDs=1.2.840.113619.2.55.3.123456790",
        "attach": "attach",
        "note": "Confirms acute infarct"
      }
    ],
    "eeg": {
      "date": "",
      "summary": ""
    },
    "emg_ncs": {
      "date": "",
      "summary": ""
    },
    "labs": {
      "b12": "450",
      "tsh": "2.5",
      "a1c": "7.2",
      "ck": "120",
      "esr_crp": "15/2",
      "others": "Lipid panel pending"
    },
    "lp": {
      "performed": false,
      "opening_pressure": "",
      "cells": "",
      "protein": "",
      "glucose": "",
      "microbiology": ""
    },
    "referenced_docs": []
  },
  "diagnosis": {
    "main": "Acute ischemic stroke, left internal capsule",
    "secondary": ["Hypertension", "Type 2 Diabetes"],
    "codes": []
  },
  "procedures_done": [],
  "attachments": [],
  "plan": {
    "meds": [
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
        "dose": "40mg",
        "route": "oral",
        "freq": "once daily",
        "duration": "indefinite",
        "instructions": "Take at bedtime",
        "sendToPharmacy": false,
        "pharmacyId": ""
      }
    ],
    "procedures_planned": [],
    "counseling": ["Stroke risk factors", "Medication adherence", "Lifestyle modifications"],
    "rehab_referrals": ["Physical therapy", "Occupational therapy", "Speech therapy"],
    "safety": {
      "falls": true,
      "driving_restriction": true
    },
    "follow_up": "2 weeks",
    "follow_up_date": "2024-01-29"
  }
}
```

### Discharge Visit Example

```json
{
  "doc_type": "neu.discharge",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "neurology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-102",
    "datetime": "2024-01-20T14:00:00.000Z"
  },
  "chief_complaint": "Follow-up after stroke",
  "hpi": {
    "onset_type": "Acute",
    "lkw_time": "2024-01-13T08:00:00.000Z",
    "course": "Improving",
    "triggers": "",
    "associated_symptoms": [],
    "headache_profile": "Resolved",
    "seizure_semiology": "",
    "risk_factors": {
      "htn": true,
      "dm": true,
      "af": false,
      "smoking": false,
      "anticoagulants": false
    },
    "meds": "Aspirin 100mg daily, Atorvastatin 40mg daily",
    "allergies": "Penicillin",
    "pmh": "Hypertension, Type 2 Diabetes, Previous stroke",
    "family": "Father had stroke at age 65",
    "social": "Former smoker"
  },
  "vitals": {
    "bp_right": "140/85",
    "bp_left": "138/83",
    "hr": "75",
    "temp": "36.8",
    "spo2": "98"
  },
  "mental_status": {
    "consciousness": "alert",
    "orientation": {
      "person": true,
      "place": true,
      "time": true
    },
    "attention_memory": "Improved",
    "language": "Fluent",
    "behavior": "Appropriate",
    "mmse": {
      "score": "28",
      "date": "2024-01-20"
    },
    "moca": {
      "score": "26",
      "date": "2024-01-20"
    }
  },
  "cranial_nerves": {
    "cn1": "Not tested",
    "cn2_fields": "Full fields OU",
    "cn2_fundoscopy": "Normal OU",
    "cn3_4_6_eyemov": "Full EOM",
    "cn5": "Intact",
    "cn7": "Mild right facial weakness, improved",
    "cn8": "Intact",
    "cn9_10": "Intact",
    "cn11": "Intact",
    "cn12": "Midline, improved"
  },
  "motor": {
    "tone": "Normal",
    "bulk": "normal",
    "fasciculations": false,
    "strength": {
      "R": {
        "shoulder": "4+",
        "elbow": "4+",
        "wrist": "4+",
        "hip": "4+",
        "knee": "4+",
        "ankle": "4+"
      },
      "L": {
        "shoulder": "5",
        "elbow": "5",
        "wrist": "5",
        "hip": "5",
        "knee": "5",
        "ankle": "5"
      }
    },
    "pronator_drift": "Minimal"
  },
  "reflexes": {
    "biceps": "2+",
    "triceps": "2+",
    "brachioradialis": "2+",
    "knee": "2+",
    "ankle": "2+",
    "plantar": "flexor",
    "hoffman": false,
    "clonus": false
  },
  "sensory": {
    "light_touch": "Mildly decreased right",
    "pinprick": "Mildly decreased right",
    "temperature": "Mildly decreased right",
    "vibration": "Intact",
    "proprioception": "Intact",
    "dermatomes_note": "Improving"
  },
  "cerebellar": {
    "fnf": "Normal",
    "hks": "Normal",
    "diadochokinesis": "Normal",
    "romberg": "Negative",
    "gait": {
      "normal": false,
      "tandem": false,
      "heels": false,
      "toes": false
    }
  },
  "autonomic": {
    "orthostasis_bp": "Normal",
    "bowel_bladder": "Normal",
    "sweating": "Normal"
  },
  "meningeal": {
    "nuchal_rigidity": false,
    "kernig": false,
    "brudzinski": false
  },
  "pain_headache": {
    "site": "",
    "quality": "",
    "severity_vas": "",
    "triggers": "",
    "red_flags": []
  },
  "seizure": {
    "semiology": "",
    "frequency": "",
    "triggers": "",
    "postictal": "",
    "aeds": [],
    "adherence": ""
  },
  "stroke": {
    "lkw_time": "2024-01-13T08:00:00.000Z",
    "nihss": {
      "total": "3",
      "items": {}
    },
    "mrs_pre": "0",
    "mrs_current": "2",
    "tpa_checklist": {
      "eligible": null,
      "contraindications": []
    },
    "thrombectomy_consider": false
  },
  "localization_hypothesis": {
    "lesion_site": "Left internal capsule - resolving",
    "rationale": "Improving right hemiparesis"
  },
  "tests": {
    "imaging": [],
    "eeg": {
      "date": "",
      "summary": ""
    },
    "emg_ncs": {
      "date": "",
      "summary": ""
    },
    "labs": {
      "b12": "",
      "tsh": "",
      "a1c": "7.0",
      "ck": "",
      "esr_crp": "",
      "others": ""
    },
    "lp": {
      "performed": false,
      "opening_pressure": "",
      "cells": "",
      "protein": "",
      "glucose": "",
      "microbiology": ""
    },
    "referenced_docs": []
  },
  "diagnosis": {
    "main": "Acute ischemic stroke, left internal capsule - improving",
    "secondary": ["Hypertension", "Type 2 Diabetes"],
    "codes": []
  },
  "procedures_done": [
    {
      "name": "Physical therapy session",
      "date": "2024-01-18",
      "side": "bilateral",
      "anesthesia": "none",
      "technique": "Standard PT",
      "findings": "Patient showing improvement in right arm strength",
      "result": "successful",
      "complications": ""
    }
  ],
  "attachments": [],
  "outcome": {
    "condition": "Stable, improving",
    "course": "Patient showing gradual improvement in right hemiparesis"
  },
  "recommendations": [
    "Continue current medications",
    "Continue physical and occupational therapy",
    "Follow-up in 1 month",
    "Monitor blood pressure and blood sugar",
    "No driving until cleared by physician"
  ]
}
```

## Key Notes

1. **Mode-Specific Fields**:
   - `initial` mode includes `plan` object
   - `discharge` mode includes `outcome` and `recommendations` fields

2. **Muscle Strength Grading**:
   - 0 = No contraction
   - 1 = Trace contraction
   - 2 = Active movement with gravity eliminated
   - 3 = Active movement against gravity
   - 4 = Active movement against some resistance
   - 5 = Normal strength

3. **Reflex Grading**:
   - 0 = Absent
   - 1+ = Hypoactive
   - 2+ = Normal
   - 3+ = Hyperactive
   - 4+ = Clonus

4. **Plantar Reflex**:
   - `flexor` = Normal (downgoing)
   - `extensor` = Abnormal (upgoing/Babinski sign)

5. **Consciousness Levels**:
   - `alert` = Fully awake and responsive
   - `drowsy` = Sleepy but arousable
   - `stuporous` = Difficult to arouse
   - `comatose` = Unresponsive

6. **NIHSS (National Institutes of Health Stroke Scale)**:
   - Range: 0-42
   - Higher score = More severe stroke
   - Used for stroke assessment

7. **Modified Rankin Scale (MRS)**:
   - 0 = No symptoms
   - 1 = No significant disability
   - 2 = Slight disability
   - 3 = Moderate disability
   - 4 = Moderately severe disability
   - 5 = Severe disability
   - 6 = Death

8. **MMSE and MoCA**:
   - MMSE: 0-30 (Mini-Mental State Examination)
   - MoCA: 0-30 (Montreal Cognitive Assessment)
   - Lower scores indicate cognitive impairment

9. **Lumbar Puncture (LP)**:
   - Only included if `performed` is `true`
   - Opening pressure: Normal 10-20 cmH2O
   - Cells: Normal < 5 white blood cells
   - Protein: Normal 15-60 mg/dL
   - Glucose: Normal 40-70 mg/dL (should be ~2/3 of serum glucose)

10. **Imaging**:
    - Can include CT, MRI, MRA, CTA studies
    - Links to OHIF viewer for DICOM images
    - Can attach or reference only

11. **Cranial Nerves**:
    - CN I-XII examination findings
    - Standard neurological exam components

12. **Stroke Assessment**:
    - Includes LKW (Last Known Well) time
    - NIHSS scoring
    - tPA eligibility checklist
    - Thrombectomy consideration

13. **Diagnosis**:
    - `main` is a string (not an object with code/term like ophthalmology)
    - `secondary` is an array of strings
    - `codes` array is available but not actively used

14. **Safety Considerations**:
    - Falls risk assessment
    - Driving restrictions
    - Important for discharge planning

15. **Rehabilitation Referrals**:
    - Physical therapy
    - Occupational therapy
    - Speech therapy
    - Other specialized services

## Validation Rules

- **Chief Complaint**: Required
- **Main Diagnosis**: Required
- **Discharge Mode**: Requires at least one recommendation
- **Lumbar Puncture**: If performed, requires opening pressure, cells, protein, and glucose
- **Imaging**: Each imaging study must have either `study_uid` or `ohif_url`



