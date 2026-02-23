# Traumatology Report - JSON Form Structure

This document describes the complete JSON structure returned by the `TraumaOrthoReportForm` component.

## Complete JSON Structure

The form has two modes: `initial` and `discharge`. The JSON structure differs slightly based on the mode.

### Base Structure (Both Modes)

```json
{
  "doc_type": "trauma.initial | trauma.discharge",
  "meta": {
    "clinic_id": "string",
    "department_id": "traumatology",
    "physician_id": "string",
    "patient_id": "string",
    "encounter_id": "string",
    "datetime": "ISO 8601 datetime string"
  },
  "chief_complaint": "string",
  "injury": {
    "date": "ISO date string",
    "mechanism": "string",
    "context": "string",
    "energy_level": "low | medium | high",
    "time_since_injury": "string",
    "side": "left | right | bilateral",
    "region": ["string"],
    "type": ["string"],
    "open_status": "closed | open_confirmed | unclear",
    "pain_scale": 0,
    "red_flags": ["string"],
    "work_accident": false,
    "police_report_no": "string",
    "insurance_claim_id": "string",
    "safeguarding_concerns": "none | suspected | confirmed",
    "safeguarding_notes": "string"
  },
  "history": {
    "hpi": "string",
    "pmh": "string (Past Medical History)",
    "meds": "string",
    "allergies": "string",
    "tetanus_status": "up_to_date | <5y | >=5y | unknown | never",
    "osteoporosis_risk": "low | moderate | high",
    "on_anticoagulants": "yes | no | unknown",
    "key_comorbidities": ["string"],
    "pediatric_patient": false,
    "growth_plate_involved": "yes | no | unclear"
  },
  "examination": {
    "vitals": "string",
    "look": "string",
    "feel": "string",
    "move": "string",
    "special_tests": ["string"],
    "neurovascular": {
      "pulses": "string",
      "cap_refill": "string",
      "motor": "string",
      "sensory": "string"
    },
    "compartment_status": "string",
    "compartment_syndrome_concerns": "no | yes | unclear",
    "open_fracture": {
      "gustilo": "I | II | IIIA | IIIB | IIIC",
      "contamination": "clean | contaminated | heavily_contaminated",
      "first_antibiotics_time": "ISO datetime string",
      "first_debridement_time": "ISO datetime string",
      "debridement_planned": "string"
    },
    "soft_tissue": "string"
  },
  "imaging_links": [
    {
      "study_uid": "string",
      "modality": "XR | CT | MRI | US | Fluoro",
      "date": "ISO date string",
      "description": "string",
      "ohif_url": "string",
      "diagnostic_report_id": "string",
      "attach": "reference_only | attach",
      "note": "string"
    }
  ],
  "classification": {
    "site": "string",
    "side": "left | right | bilateral",
    "system": "AO/OTA | other",
    "code": "string",
    "displacement": "none | minimal | moderate | severe",
    "intra_articular": false,
    "stability": "stable | unstable",
    "growth_plate_involved": "yes | no | unclear"
  },
  "procedures": [
    {
      "name": "string",
      "date": "ISO date string",
      "side": "left | right | bilateral",
      "region": "string",
      "anesthesia": "none | local | regional | general",
      "sedation": "none | minimal | moderate | deep",
      "technique": "string",
      "findings": "string",
      "result": "successful | partial | failed",
      "complications": "string"
    }
  ],
  "diagnosis": {
    "main": "string",
    "secondary": ["string"],
    "codes": []
  },
  "attachments": []
}
```

### Initial Mode Only Fields

```json
{
  "plan": {
    "tests": [
      {
        "type": "lab | imaging",
        "label": "string",
        "note": "string",
        "destinationClinicId": "string"
      }
    ],
    "referrals": [
      {
        "specialty": "string",
        "doctorId": "string",
        "reason": "string",
        "destinationClinicId": "string",
        "urgency": "routine | soon | urgent"
      }
    ],
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
    "immobilization": {
      "applied": false,
      "type": "string",
      "side": "string",
      "region": "string"
    },
    "weight_bearing": "as tolerated | non-weight_bearing | partial | full",
    "dvt_prophylaxis": "not indicated | indicated | already_on",
    "sick_leave_days": 0,
    "work_restrictions": "string",
    "physio": "not_needed | consider | urgent",
    "follow_up": "string",
    "mobility_aid": "none | crutches | walker | wheelchair | other",
    "home_exercises": "string",
    "physio_instructions": "string"
  }
}
```

### Discharge Mode Only Fields

```json
{
  "outcome": {
    "condition": "string",
    "course": "string",
    "red_flag_instructions_given": false,
    "red_flag_instructions_text": "string"
  },
  "recommendations": []
}
```

## Example with Sample Data

### Initial Visit Example

```json
{
  "doc_type": "trauma.initial",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "traumatology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-101",
    "datetime": "2024-01-15T10:30:00.000Z"
  },
  "chief_complaint": "Right wrist pain after fall",
  "injury": {
    "date": "2024-01-15T08:00:00.000Z",
    "mechanism": "Fall on outstretched hand (FOOSH)",
    "context": "Slipped on ice while walking",
    "energy_level": "medium",
    "time_since_injury": "2.5 hours",
    "side": "right",
    "region": ["wrist", "distal radius"],
    "type": ["Fracture", "Closed"],
    "open_status": "closed",
    "pain_scale": 7,
    "red_flags": ["Deformity", "Loss of function"],
    "work_accident": false,
    "police_report_no": "",
    "insurance_claim_id": "",
    "safeguarding_concerns": "none",
    "safeguarding_notes": ""
  },
  "history": {
    "hpi": "Patient fell on ice 2.5 hours ago, landing on right hand. Immediate pain and swelling. Unable to move wrist. No loss of consciousness.",
    "pmh": "Osteoporosis, Hypertension",
    "meds": "Alendronate 70mg weekly, Lisinopril 10mg daily",
    "allergies": "Penicillin",
    "tetanus_status": "up_to_date",
    "osteoporosis_risk": "high",
    "on_anticoagulants": "no",
    "key_comorbidities": ["Osteoporosis"],
    "pediatric_patient": false,
    "growth_plate_involved": "unclear"
  },
  "examination": {
    "vitals": "BP 140/85, HR 88, Temp 36.8, SpO2 98%",
    "look": "Swelling over right distal radius. Visible deformity. No open wounds. Ecchymosis present.",
    "feel": "Tender over distal radius. Crepitus on palpation. No skin breaks.",
    "move": "Unable to move wrist due to pain. Fingers move normally. Thumb abduction intact.",
    "special_tests": ["Finkelstein test negative"],
    "neurovascular": {
      "pulses": "Radial and ulnar pulses present",
      "cap_refill": "<2 seconds",
      "motor": "Finger extension intact, thumb abduction intact",
      "sensory": "Intact in all distributions"
    },
    "compartment_status": "No compartment syndrome",
    "compartment_syndrome_concerns": "no",
    "open_fracture": {
      "gustilo": "",
      "contamination": "clean",
      "first_antibiotics_time": "",
      "first_debridement_time": "",
      "debridement_planned": ""
    },
    "soft_tissue": "Swelling and ecchymosis over distal radius. No lacerations."
  },
  "imaging_links": [
    {
      "study_uid": "1.2.840.113619.2.55.3.123456789",
      "modality": "XR",
      "date": "2024-01-15",
      "description": "XR Right Wrist: PA/Lat/Oblique",
      "ohif_url": "/ohif/viewer?StudyInstanceUIDs=1.2.840.113619.2.55.3.123456789",
      "diagnostic_report_id": "rep-001",
      "attach": "attach",
      "note": "Colles fracture with dorsal angulation"
    }
  ],
  "classification": {
    "site": "Distal radius",
    "side": "right",
    "system": "AO/OTA",
    "code": "23-A2.2",
    "displacement": "moderate",
    "intra_articular": false,
    "stability": "unstable",
    "growth_plate_involved": "unclear"
  },
  "procedures": [
    {
      "name": "Closed reduction",
      "date": "2024-01-15T11:00:00.000Z",
      "side": "right",
      "region": "wrist",
      "anesthesia": "local",
      "sedation": "minimal",
      "technique": "Hematoma block with lidocaine, manual reduction",
      "findings": "Successful reduction achieved. Alignment improved.",
      "result": "successful",
      "complications": "None"
    }
  ],
  "diagnosis": {
    "main": "Closed fracture of distal radius, right (Colles fracture)",
    "secondary": ["Osteoporosis"],
    "codes": []
  },
  "attachments": [],
  "plan": {
    "tests": [
      {
        "type": "imaging",
        "label": "XR",
        "note": "Post-reduction XR to confirm alignment",
        "destinationClinicId": ""
      }
    ],
    "referrals": [
      {
        "specialty": "Orthopedic Surgery",
        "doctorId": "ortho-doc-1",
        "reason": "Follow-up for unstable fracture",
        "destinationClinicId": "clinic-ortho-1",
        "urgency": "soon"
      }
    ],
    "meds": [
      {
        "med": "Acetaminophen",
        "dose": "500mg",
        "route": "oral",
        "freq": "Q6H",
        "duration": "5 days",
        "instructions": "Take with food",
        "sendToPharmacy": false,
        "pharmacyId": ""
      },
      {
        "med": "Ibuprofen",
        "dose": "400mg",
        "route": "oral",
        "freq": "TID",
        "duration": "5 days",
        "instructions": "Take with food",
        "sendToPharmacy": false,
        "pharmacyId": ""
      }
    ],
    "immobilization": {
      "applied": true,
      "type": "Short arm cast",
      "side": "right",
      "region": "wrist"
    },
    "weight_bearing": "non-weight_bearing",
    "dvt_prophylaxis": "not indicated",
    "sick_leave_days": 7,
    "work_restrictions": "No heavy lifting with right arm",
    "physio": "consider",
    "follow_up": "1 week",
    "mobility_aid": "none",
    "home_exercises": "Finger range of motion exercises",
    "physio_instructions": "Begin gentle finger exercises. Avoid wrist movement."
  }
}
```

### Discharge Visit Example

```json
{
  "doc_type": "trauma.discharge",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "traumatology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-102",
    "datetime": "2024-01-22T14:00:00.000Z"
  },
  "chief_complaint": "Follow-up after wrist fracture",
  "injury": {
    "date": "2024-01-15T08:00:00.000Z",
    "mechanism": "Fall on outstretched hand",
    "context": "Slipped on ice",
    "energy_level": "medium",
    "time_since_injury": "7 days",
    "side": "right",
    "region": ["wrist", "distal radius"],
    "type": ["Fracture", "Closed"],
    "open_status": "closed",
    "pain_scale": 3,
    "red_flags": [],
    "work_accident": false,
    "police_report_no": "",
    "insurance_claim_id": "",
    "safeguarding_concerns": "none",
    "safeguarding_notes": ""
  },
  "history": {
    "hpi": "Patient returns for follow-up. Pain much improved. No new concerns.",
    "pmh": "Osteoporosis, Hypertension",
    "meds": "Alendronate, Lisinopril, Acetaminophen PRN",
    "allergies": "Penicillin",
    "tetanus_status": "up_to_date",
    "osteoporosis_risk": "high",
    "on_anticoagulants": "no",
    "key_comorbidities": ["Osteoporosis"],
    "pediatric_patient": false,
    "growth_plate_involved": "unclear"
  },
  "examination": {
    "vitals": "BP 138/82, HR 75, Temp 36.7, SpO2 98%",
    "look": "Cast intact. Minimal swelling. No skin breakdown.",
    "feel": "Mild tenderness over fracture site. No crepitus.",
    "move": "Fingers move well. Thumb abduction intact.",
    "special_tests": [],
    "neurovascular": {
      "pulses": "Present",
      "cap_refill": "<2 seconds",
      "motor": "Intact",
      "sensory": "Intact"
    },
    "compartment_status": "Normal",
    "compartment_syndrome_concerns": "no",
    "open_fracture": {
      "gustilo": "",
      "contamination": "clean",
      "first_antibiotics_time": "",
      "first_debridement_time": "",
      "debridement_planned": ""
    },
    "soft_tissue": "Healing well"
  },
  "imaging_links": [
    {
      "study_uid": "1.2.840.113619.2.55.3.123456790",
      "modality": "XR",
      "date": "2024-01-22",
      "description": "XR Right Wrist: PA/Lat",
      "ohif_url": "/ohif/viewer?StudyInstanceUIDs=1.2.840.113619.2.55.3.123456790",
      "diagnostic_report_id": "rep-002",
      "attach": "attach",
      "note": "Fracture alignment maintained"
    }
  ],
  "classification": {
    "site": "Distal radius",
    "side": "right",
    "system": "AO/OTA",
    "code": "23-A2.2",
    "displacement": "minimal",
    "intra_articular": false,
    "stability": "stable",
    "growth_plate_involved": "unclear"
  },
  "procedures": [],
  "diagnosis": {
    "main": "Healing fracture of distal radius, right",
    "secondary": ["Osteoporosis"],
    "codes": []
  },
  "attachments": [],
  "outcome": {
    "condition": "Stable, healing well",
    "course": "Fracture alignment maintained. Patient doing well with cast.",
    "red_flag_instructions_given": true,
    "red_flag_instructions_text": "Return immediately if: severe pain, numbness, tingling, loss of finger movement, cast becomes too tight or loose, or any signs of infection."
  },
  "recommendations": [
    "Continue cast immobilization",
    "Keep cast dry",
    "Elevate hand when possible",
    "Continue finger exercises",
    "Follow-up in 2 weeks",
    "Consider bone density scan given osteoporosis"
  ]
}
```

## Key Notes

1. **Mode-Specific Fields**:
   - `initial` mode includes `plan` object
   - `discharge` mode includes `outcome` and `recommendations` fields

2. **Injury Classification**:
   - **Open Status**: `closed`, `open_confirmed`, or `unclear`
   - **Energy Level**: `low`, `medium`, or `high`
   - **Side**: `left`, `right`, or `bilateral`
   - **Region**: Array of affected body regions
   - **Type**: Array of injury types (e.g., "Fracture", "Dislocation", "Laceration")

3. **Gustilo Classification** (for open fractures):
   - **Type I**: Clean wound < 1cm
   - **Type II**: Wound 1-10cm, minimal contamination
   - **Type IIIA**: Adequate soft tissue coverage despite extensive laceration
   - **Type IIIB**: Extensive soft tissue loss, periosteal stripping
   - **Type IIIC**: Arterial injury requiring repair

4. **AO/OTA Classification System**:
   - Standard system for fracture classification
   - Format: `##-X#.#` (e.g., "23-A2.2")
   - First number = bone segment
   - Letter = fracture type
   - Numbers = group and subgroup

5. **Examination - Look, Feel, Move**:
   - Standard orthopedic examination approach
   - **Look**: Visual inspection
   - **Feel**: Palpation
   - **Move**: Range of motion and function

6. **Special Tests**:
   - Region-specific orthopedic tests
   - Examples: Finkelstein (wrist), McMurray (knee), Lachman (knee), etc.

7. **Neurovascular Assessment**:
   - Critical for all fractures
   - Pulses, capillary refill, motor, sensory
   - Must be documented for all injuries

8. **Compartment Syndrome**:
   - Medical emergency
   - Assessed in examination
   - Red flag if present

9. **Pain Scale**:
   - Numeric scale (0-10)
   - 0 = No pain
   - 10 = Worst pain imaginable

10. **Tetanus Status**:
    - Important for open injuries
    - Status: `up_to_date`, `<5y`, `>=5y`, `unknown`, `never`
    - If due, tetanus prophylaxis required

11. **Osteoporosis Risk**:
    - `low`, `moderate`, or `high`
    - Important for fracture risk assessment

12. **Weight Bearing Status**:
    - `as tolerated`
    - `non-weight_bearing`
    - `partial`
    - `full`

13. **DVT Prophylaxis**:
    - `not indicated`
    - `indicated`
    - `already_on`
    - Important for immobilized patients

14. **Immobilization**:
    - Type: Cast, splint, brace, sling, etc.
    - Side and region specified
    - Applied status tracked

15. **Safeguarding Concerns**:
    - `none`, `suspected`, or `confirmed`
    - Important for child protection and vulnerable adults
    - Notes field for details

16. **Work Accident**:
    - Boolean flag
    - May require police report and insurance claim tracking

17. **Red Flags**:
    - Array of concerning signs/symptoms
    - Examples: "Deformity", "Loss of function", "Neurovascular compromise"

18. **Procedures**:
    - Can include reductions, wound care, debridement, etc.
    - Each procedure has date, side, region, anesthesia, technique, findings, result, complications

19. **Imaging Links**:
    - XR, CT, MRI, US, Fluoro studies
    - Links to OHIF viewer for DICOM images
    - Can attach or reference only

20. **Physiotherapy**:
    - `not_needed`, `consider`, or `urgent`
    - Instructions and home exercises included

21. **Mobility Aids**:
    - `none`, `crutches`, `walker`, `wheelchair`, or `other`
    - Important for discharge planning

22. **Pediatric Considerations**:
    - `pediatric_patient` flag
    - `growth_plate_involved` assessment
    - Important for pediatric fractures

## Validation Rules

- **Chief Complaint**: Required
- **Main Diagnosis**: Required
- **Open Fractures**: If `open_status` is `open_confirmed`, Gustilo classification is required
- **Open/Laceration Injuries**: 
  - Require antibiotics in plan or wound care procedure
  - If tetanus due (>=5y, unknown, or never), tetanus prophylaxis required
- **Procedures**: If procedure name is provided, date is required
- **Discharge Mode**: Requires at least one recommendation
- **Imaging Links**: Each imaging study must have either `study_uid` or `ohif_url`

## Special Considerations

1. **Open Fracture Management**:
   - Requires Gustilo classification
   - Tracks time to first antibiotics
   - Tracks time to first debridement
   - Debridement planning

2. **Compartment Syndrome**:
   - Critical assessment
   - If concerns present, urgent intervention needed

3. **Red Flag Instructions**:
   - Given to patients at discharge
   - Important for patient safety
   - Documented in outcome section

4. **Work-Related Injuries**:
   - Police report number tracking
   - Insurance claim ID tracking
   - May require special documentation

5. **Safeguarding**:
   - Important for child protection
   - Suspected or confirmed concerns require documentation
   - Notes field for details



