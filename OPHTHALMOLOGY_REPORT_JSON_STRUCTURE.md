# Ophthalmology Report - JSON Form Structure

This document describes the complete JSON structure returned by the `OphthalmologyReportForm` component.

## Complete JSON Structure

The form has two modes: `initial` and `discharge`. The JSON structure differs slightly based on the mode.

### Base Structure (Both Modes)

```json
{
  "doc_type": "oph.initial | oph.discharge",
  "meta": {
    "clinic_id": "string",
    "department_id": "ophthalmology",
    "physician_id": "string",
    "patient_id": "string",
    "encounter_id": "string",
    "datetime": "ISO 8601 datetime string"
  },
  "chief_complaint": "string",
  "hpi": {
    "description": "string",
    "ocular_history": "string",
    "systemic_history": "string",
    "meds": "string",
    "allergies": "string"
  },
  "external": {
    "eyebrows": "string",
    "lids_lashes": "string",
    "lacrimal": "string",
    "orbit": "string"
  },
  "acuity": {
    "distance": {
      "sc": {
        "OD": "string (e.g., '20/20')",
        "OS": "string",
        "OU": "string"
      },
      "cc": {
        "OD": "string",
        "OS": "string",
        "OU": "string"
      }
    },
    "near": {
      "sc": {
        "OD": "string",
        "OS": "string",
        "OU": "string"
      },
      "cc": {
        "OD": "string",
        "OS": "string",
        "OU": "string"
      }
    },
    "pinhole": {
      "OD": "string",
      "OS": "string"
    }
  },
  "refraction": {
    "cycloplegic": false,
    "od": {
      "sphere": "string (e.g., '-2.50')",
      "cylinder": "string (e.g., '-0.75')",
      "axis": "string (0-180)",
      "add": "string (e.g., '+2.00')"
    },
    "os": {
      "sphere": "string",
      "cylinder": "string",
      "axis": "string (0-180)",
      "add": "string"
    },
    "final_rx": {
      "od": "string",
      "os": "string",
      "pd": "string (45-80 mm)"
    }
  },
  "pupils": {
    "od": {
      "size_mm": "string",
      "reaction": "string",
      "rapd": false,
      "irregular": false
    },
    "os": {
      "size_mm": "string",
      "reaction": "string",
      "rapd": false,
      "irregular": false
    }
  },
  "motility": {
    "versions": "string",
    "ductions": "string",
    "deviations": "string"
  },
  "alignment": {
    "distance": {
      "type": "string",
      "prism": "string",
      "axis": "string"
    },
    "near": {
      "type": "string",
      "prism": "string",
      "axis": "string"
    }
  },
  "color_vision": {
    "method": "Ishihara | other",
    "result": "string",
    "not_tested": false
  },
  "confrontation_fields": {
    "summary": "string"
  },
  "iop": {
    "method": "NCT | GAT | other",
    "time": "string",
    "od": "string (1-80 mmHg)",
    "os": "string (1-80 mmHg)",
    "post_dilation": {
      "time": "string",
      "od": "string",
      "os": "string"
    }
  },
  "dilation": {
    "performed": false,
    "agent": "string",
    "time": "string"
  },
  "gonioscopy": {
    "performed": false,
    "od": {
      "shaffer": "string",
      "pigmentation": "string",
      "pas": false,
      "notes": "string"
    },
    "os": {
      "shaffer": "string",
      "pigmentation": "string",
      "pas": false,
      "notes": "string"
    }
  },
  "anterior": {
    "lids": "string",
    "conjunctiva": "string",
    "cornea": "string",
    "anterior_chamber": "string",
    "iris": "string",
    "lens": "string",
    "lens_grade": {
      "nuclear": "string",
      "cortical": "string",
      "posterior_subcapsular": "string"
    }
  },
  "posterior": {
    "vitreous": "string",
    "disc": "string",
    "cd_ratio": {
      "OD": "string",
      "OS": "string"
    },
    "macula": "string",
    "vessels": "string",
    "periphery": "string",
    "dr_grade": "string",
    "amd_grade": "string"
  },
  "tests": {
    "notes": "string",
    "keratometry": {
      "k1": "string",
      "k2": "string",
      "axis": "string"
    },
    "pachymetry": {
      "cct_od": "string (300-800 μm)",
      "cct_os": "string (300-800 μm)"
    },
    "oct": {
      "rnfl_od": "string",
      "rnfl_os": "string",
      "gcipl_od": "string",
      "gcipl_os": "string"
    },
    "imaging": [],
    "referenced_docs": []
  },
  "imaging_links": [
    {
      "study_uid": "string",
      "modality": "string",
      "date": "string",
      "description": "string",
      "ohif_url": "string",
      "diagnostic_report_id": "string",
      "attach": true,
      "note": "string"
    }
  ],
  "diagnosis": {
    "main": {
      "code": "ICD-11 code string",
      "term": "Diagnosis term/description"
    },
    "secondary": [
      {
        "code": "ICD-11 code string",
        "term": "Diagnosis term/description"
      }
    ],
    "codes": []
  },
  "procedures_done": [
    {
      "name": "string",
      "date": "ISO date string",
      "eye": "OD | OS | OU",
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
        "conc_strength": "string",
        "route": "topical | oral | injection",
        "freq": "string",
        "duration": "string",
        "instructions": "string",
        "sendToPharmacy": false,
        "pharmacyId": "string"
      }
    ],
    "procedures_planned": [],
    "counseling": [],
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
  "doc_type": "oph.initial",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "ophthalmology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-101",
    "datetime": "2024-01-15T10:30:00.000Z"
  },
  "chief_complaint": "Blurred vision in right eye for 2 weeks",
  "hpi": {
    "description": "Patient reports gradual onset of blurred vision in right eye over past 2 weeks. No pain, redness, or discharge.",
    "ocular_history": "History of cataract surgery OD in 2020",
    "systemic_history": "Type 2 diabetes, hypertension",
    "meds": "Metformin, Lisinopril",
    "allergies": "Penicillin"
  },
  "external": {
    "eyebrows": "Normal",
    "lids_lashes": "Normal, no ptosis",
    "lacrimal": "Normal tear production",
    "orbit": "No proptosis or enophthalmos"
  },
  "acuity": {
    "distance": {
      "sc": {
        "OD": "20/40",
        "OS": "20/20",
        "OU": "20/25"
      },
      "cc": {
        "OD": "20/30",
        "OS": "20/20",
        "OU": "20/25"
      }
    },
    "near": {
      "sc": {
        "OD": "J3",
        "OS": "J1",
        "OU": "J2"
      },
      "cc": {
        "OD": "J2",
        "OS": "J1",
        "OU": "J1"
      }
    },
    "pinhole": {
      "OD": "20/25",
      "OS": "20/20"
    }
  },
  "refraction": {
    "cycloplegic": false,
    "od": {
      "sphere": "-1.50",
      "cylinder": "-0.75",
      "axis": "180",
      "add": "+2.00"
    },
    "os": {
      "sphere": "-0.50",
      "cylinder": "-0.25",
      "axis": "175",
      "add": "+2.00"
    },
    "final_rx": {
      "od": "-1.50 -0.75 x 180 Add +2.00",
      "os": "-0.50 -0.25 x 175 Add +2.00",
      "pd": "64"
    }
  },
  "pupils": {
    "od": {
      "size_mm": "4",
      "reaction": "Brisk",
      "rapd": false,
      "irregular": false
    },
    "os": {
      "size_mm": "4",
      "reaction": "Brisk",
      "rapd": false,
      "irregular": false
    }
  },
  "motility": {
    "versions": "Full in all gazes",
    "ductions": "Full",
    "deviations": "No strabismus"
  },
  "alignment": {
    "distance": {
      "type": "Orthophoric",
      "prism": "",
      "axis": ""
    },
    "near": {
      "type": "Orthophoric",
      "prism": "",
      "axis": ""
    }
  },
  "color_vision": {
    "method": "Ishihara",
    "result": "Normal",
    "not_tested": false
  },
  "confrontation_fields": {
    "summary": "Full to confrontation OU"
  },
  "iop": {
    "method": "NCT",
    "time": "10:30",
    "od": "16",
    "os": "15",
    "post_dilation": {
      "time": "",
      "od": "",
      "os": ""
    }
  },
  "dilation": {
    "performed": true,
    "agent": "Tropicamide 1%",
    "time": "10:35"
  },
  "gonioscopy": {
    "performed": false,
    "od": {
      "shaffer": "",
      "pigmentation": "",
      "pas": false,
      "notes": ""
    },
    "os": {
      "shaffer": "",
      "pigmentation": "",
      "pas": false,
      "notes": ""
    }
  },
  "anterior": {
    "lids": "Normal OU",
    "conjunctiva": "Quiet OU",
    "cornea": "Clear OU",
    "anterior_chamber": "Deep and quiet OU",
    "iris": "Normal OU",
    "lens": "PCIOL OD, clear lens OS",
    "lens_grade": {
      "nuclear": "",
      "cortical": "",
      "posterior_subcapsular": ""
    }
  },
  "posterior": {
    "vitreous": "Clear OU",
    "disc": "Sharp margins, pink OU, C/D 0.3 OU",
    "cd_ratio": {
      "OD": "0.3",
      "OS": "0.3"
    },
    "macula": "Normal OU",
    "vessels": "Normal caliber and course OU",
    "periphery": "Normal OU, no breaks or tears",
    "dr_grade": "",
    "amd_grade": ""
  },
  "tests": {
    "notes": "OCT performed to rule out macular edema",
    "keratometry": {
      "k1": "43.50",
      "k2": "44.00",
      "axis": "90"
    },
    "pachymetry": {
      "cct_od": "550",
      "cct_os": "545"
    },
    "oct": {
      "rnfl_od": "95",
      "rnfl_os": "98",
      "gcipl_od": "85",
      "gcipl_os": "87"
    },
    "imaging": [],
    "referenced_docs": []
  },
  "imaging_links": [
    {
      "study_uid": "1.2.840.113619.2.55.3.123456789",
      "modality": "OCT",
      "date": "2024-01-15",
      "description": "Macular OCT",
      "ohif_url": "https://ohif.example.com/viewer?studyUID=...",
      "diagnostic_report_id": "report-123",
      "attach": true,
      "note": "No macular edema"
    }
  ],
  "diagnosis": {
    "main": {
      "code": "9D90.0",
      "term": "Refractive error"
    },
    "secondary": [
      {
        "code": "9D90.1",
        "term": "Myopia"
      }
    ],
    "codes": []
  },
  "procedures_done": [],
  "attachments": [],
  "plan": {
    "meds": [
      {
        "med": "Artificial Tears",
        "conc_strength": "0.5%",
        "route": "topical",
        "freq": "QID",
        "duration": "1 month",
        "instructions": "Apply to both eyes",
        "sendToPharmacy": false,
        "pharmacyId": ""
      }
    ],
    "procedures_planned": [],
    "counseling": ["Importance of regular eye exams", "Diabetes eye care"],
    "follow_up": "3 months",
    "follow_up_date": "2024-04-15"
  }
}
```

### Discharge Visit Example

```json
{
  "doc_type": "oph.discharge",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "ophthalmology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-102",
    "datetime": "2024-01-20T14:00:00.000Z"
  },
  "chief_complaint": "Post-operative follow-up",
  "hpi": {
    "description": "Patient returns for post-operative follow-up after cataract surgery OD",
    "ocular_history": "Cataract surgery OD 1 week ago",
    "systemic_history": "Type 2 diabetes, hypertension",
    "meds": "Prednisolone eye drops, Moxifloxacin eye drops",
    "allergies": "Penicillin"
  },
  "external": {
    "eyebrows": "Normal",
    "lids_lashes": "Normal",
    "lacrimal": "Normal",
    "orbit": "Normal"
  },
  "acuity": {
    "distance": {
      "sc": {
        "OD": "20/25",
        "OS": "20/20",
        "OU": "20/20"
      },
      "cc": {
        "OD": "20/20",
        "OS": "20/20",
        "OU": "20/20"
      }
    },
    "near": {
      "sc": {
        "OD": "J1",
        "OS": "J1",
        "OU": "J1"
      },
      "cc": {
        "OD": "J1",
        "OS": "J1",
        "OU": "J1"
      }
    },
    "pinhole": {
      "OD": "20/20",
      "OS": "20/20"
    }
  },
  "refraction": {
    "cycloplegic": false,
    "od": {
      "sphere": "+0.25",
      "cylinder": "-0.50",
      "axis": "90",
      "add": ""
    },
    "os": {
      "sphere": "-0.50",
      "cylinder": "-0.25",
      "axis": "175",
      "add": "+2.00"
    },
    "final_rx": {
      "od": "+0.25 -0.50 x 90",
      "os": "-0.50 -0.25 x 175 Add +2.00",
      "pd": "64"
    }
  },
  "pupils": {
    "od": {
      "size_mm": "4",
      "reaction": "Brisk",
      "rapd": false,
      "irregular": false
    },
    "os": {
      "size_mm": "4",
      "reaction": "Brisk",
      "rapd": false,
      "irregular": false
    }
  },
  "motility": {
    "versions": "Full",
    "ductions": "Full",
    "deviations": "None"
  },
  "alignment": {
    "distance": {
      "type": "Orthophoric",
      "prism": "",
      "axis": ""
    },
    "near": {
      "type": "Orthophoric",
      "prism": "",
      "axis": ""
    }
  },
  "color_vision": {
    "method": "Ishihara",
    "result": "Normal",
    "not_tested": false
  },
  "confrontation_fields": {
    "summary": "Full OU"
  },
  "iop": {
    "method": "NCT",
    "time": "14:00",
    "od": "14",
    "os": "15",
    "post_dilation": {
      "time": "",
      "od": "",
      "os": ""
    }
  },
  "dilation": {
    "performed": false,
    "agent": "",
    "time": ""
  },
  "gonioscopy": {
    "performed": false,
    "od": {
      "shaffer": "",
      "pigmentation": "",
      "pas": false,
      "notes": ""
    },
    "os": {
      "shaffer": "",
      "pigmentation": "",
      "pas": false,
      "notes": ""
    }
  },
  "anterior": {
    "lids": "Normal OU",
    "conjunctiva": "Mild injection OD, quiet OS",
    "cornea": "Clear OU, well-centered PCIOL OD",
    "anterior_chamber": "Deep and quiet OU",
    "iris": "Normal OU",
    "lens": "PCIOL OD, clear lens OS",
    "lens_grade": {
      "nuclear": "",
      "cortical": "",
      "posterior_subcapsular": ""
    }
  },
  "posterior": {
    "vitreous": "Clear OU",
    "disc": "Sharp margins, pink OU, C/D 0.3 OU",
    "cd_ratio": {
      "OD": "0.3",
      "OS": "0.3"
    },
    "macula": "Normal OU",
    "vessels": "Normal OU",
    "periphery": "Normal OU",
    "dr_grade": "",
    "amd_grade": ""
  },
  "tests": {
    "notes": "",
    "keratometry": {
      "k1": "",
      "k2": "",
      "axis": ""
    },
    "pachymetry": {
      "cct_od": "",
      "cct_os": ""
    },
    "oct": {
      "rnfl_od": "",
      "rnfl_os": "",
      "gcipl_od": "",
      "gcipl_os": ""
    },
    "imaging": [],
    "referenced_docs": []
  },
  "imaging_links": [],
  "diagnosis": {
    "main": {
      "code": "9B70.0",
      "term": "Status post cataract surgery"
    },
    "secondary": [],
    "codes": []
  },
  "procedures_done": [
    {
      "name": "Phacoemulsification with IOL implantation",
      "date": "2024-01-13",
      "eye": "OD",
      "anesthesia": "local",
      "technique": "Phacoemulsification",
      "findings": "Uncomplicated procedure",
      "result": "successful",
      "complications": "None"
    }
  ],
  "attachments": [],
  "outcome": {
    "condition": "Stable, healing well",
    "course": "Uncomplicated post-operative course"
  },
  "recommendations": [
    "Continue post-operative medications as prescribed",
    "Follow-up in 1 month",
    "Avoid heavy lifting for 2 weeks"
  ]
}
```

## Key Notes

1. **Mode-Specific Fields**:
   - `initial` mode includes `plan` object
   - `discharge` mode includes `outcome` and `recommendations` fields

2. **Eye Notation**:
   - `OD` = Right eye (Oculus Dexter)
   - `OS` = Left eye (Oculus Sinister)
   - `OU` = Both eyes (Oculus Uterque)

3. **Visual Acuity Format**:
   - Distance: Snellen notation (e.g., "20/20", "20/40")
   - Near: Jaeger notation (e.g., "J1", "J3")
   - `sc` = without correction
   - `cc` = with correction

4. **Refraction Format**:
   - Sphere: positive or negative diopters (e.g., "-2.50", "+1.00")
   - Cylinder: negative diopters (e.g., "-0.75")
   - Axis: 0-180 degrees
   - Add: positive diopters for reading (e.g., "+2.00")

5. **IOP (Intraocular Pressure)**:
   - Normal range: 10-21 mmHg
   - Validation: 1-80 mmHg
   - Methods: NCT (Non-Contact Tonometry), GAT (Goldmann Applanation Tonometry)

6. **Gonioscopy**:
   - Only included if `performed` is `true`
   - Shaffer grading system
   - PAS = Peripheral Anterior Synechiae

7. **C/D Ratio**:
   - Cup-to-Disc ratio
   - Normal: < 0.3
   - Format: decimal (e.g., "0.3", "0.5")

8. **Pachymetry**:
   - CCT = Central Corneal Thickness
   - Normal range: 500-600 μm
   - Validation: 300-800 μm

9. **Procedures**:
   - `procedures_done`: Array of completed procedures
   - Each procedure includes eye, anesthesia type, technique, findings, result, and complications

10. **Medications**:
    - Route is typically "topical" for eye medications
    - Can also be "oral" or "injection"
    - `conc_strength` = concentration/strength

11. **Imaging Links**:
    - Links to PACS/DICOM studies
    - Includes OHIF viewer URLs
    - Can attach diagnostic reports

12. **Data Sanitization**:
    - All data is sanitized before submission using a `sanitize()` function
    - Ensures JSON-serializable format
    - Removes undefined/null values where appropriate

## Validation Rules

- **Chief Complaint**: Required
- **Main Diagnosis**: Required (must have either code or term)
- **Discharge Mode**: Requires at least one recommendation
- **Gonioscopy**: If performed, requires Shaffer grade for both eyes
- **Refraction Axis**: Must be 0-180
- **IOP**: Must be 1-80 mmHg
- **Pachymetry**: Must be 300-800 μm
- **PD (Pupillary Distance)**: Must be 45-80 mm
- **Imaging Links**: Must have either `study_uid` or `ohif_url`



