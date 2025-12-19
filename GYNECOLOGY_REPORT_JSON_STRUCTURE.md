# Gynecology Report - JSON Form Structure

This document describes the complete JSON structure returned by the `GynecologyForm` component.

## Complete JSON Structure

The gynecology form is structured for comprehensive gynecological consultations and includes detailed menstrual, reproductive, and gynecological history.

```json
{
  "doc_type": "gynecology.initial",
  "meta": {
    "clinic_id": "string",
    "department_id": "midwifery_gynecology",
    "physician_id": "string",
    "patient_id": "string",
    "encounter_id": "string",
    "datetime": "ISO 8601 datetime string"
  },
  "chief_complaint": "string",
  "visit_type": "New consultation | Follow-up | Procedure visit | Post-op follow-up",
  "patient_info": {
    "patient_name": "string",
    "date_of_birth": "ISO date string",
    "age": "string (number as string)",
    "id_mrn": "string (ID/MRN)",
    "contact_number": "string",
    "address": "string",
    "marital_status": "Single | Married | Widowed | Divorced | Other",
    "occupation": "string",
    "emergency_contact": "string"
  },
  "presenting_complaint_hpi": {
    "presenting_complaint": "string",
    "duration_of_symptoms": "string",
    "history_of_present_illness": "string"
  },
  "menstrual_reproductive_history": {
    "menarche_age": "string (number as string)",
    "cycle_pattern": "Regular | Irregular | Amenorrhea | Oligomenorrhea | Polymenorrhea",
    "last_menstrual_period": "ISO date string",
    "cycle_length": "string (e.g., '28 days')",
    "duration_of_bleeding": "string (e.g., '5 days')",
    "flow_amount": "Light | Normal | Heavy | Very Heavy",
    "dysmenorrhea": "None | Mild | Moderate | Severe",
    "dysmenorrhea_severity_score": "string (number as string, 0-10)",
    "intermenstrual_bleeding": "No | Yes",
    "intermenstrual_bleeding_description": "string (only if intermenstrual_bleeding is 'Yes')",
    "postcoital_bleeding": "No | Yes",
    "postcoital_bleeding_description": "string (only if postcoital_bleeding is 'Yes')",
    "premenstrual_symptoms": "string",
    "contraception_use": "None | Condoms | Combined OCP | Progestin-only pill | IUD | Implant | Injection | Sterilization | Other",
    "contraception_details": "string (only if contraception_use is not 'None')",
    "menopausal_status": "Premenopausal | Perimenopausal | Postmenopausal",
    "age_at_menopause": "string (number as string, only if postmenopausal)",
    "last_menstrual_period_menopause": "ISO date string (only if postmenopausal)",
    "postmenopausal_bleeding": "No | Yes",
    "postmenopausal_bleeding_description": "string (only if postmenopausal_bleeding is 'Yes')"
  },
  "obstetric_history": {
    "gravida": "string (number as string)",
    "para": "string (number as string)",
    "abortions_miscarriages": "string (number as string)",
    "living_children": "string (number as string)",
    "previous_obstetric_complications": "string"
  },
  "gynecological_history": {
    "sexual_activity": "Currently sexually active | Not currently sexually active | Never sexually active",
    "dyspareunia": "No | Superficial | Deep | Both",
    "dyspareunia_description": "string (only if dyspareunia is not 'No')",
    "vaginal_discharge_history": "string",
    "past_gynecologic_diagnoses": "string",
    "infertility_history": "string",
    "previous_gynecological_procedures": "string",
    "history_of_stis_pid": "No | Yes | Unknown",
    "stis_pid_type_treatment": "string (only if history_of_stis_pid is 'Yes')",
    "urinary_symptoms": "string",
    "pelvic_organ_prolapse_symptoms": "string"
  },
  "medical_surgical_history": {
    "medical_conditions": "string",
    "previous_surgeries": "string",
    "allergies": "string",
    "current_medications": ["string"],
    "family_history": "string"
  },
  "screening_preventive_care": {
    "pap_smear_ever_done": "No | Yes",
    "date_of_last_pap_smear": "ISO date string (only if pap_smear_ever_done is 'Yes')",
    "result_of_last_pap_smear": "Normal | ASC-US | LSIL | HSIL | AGC | Other abnormal | Unknown",
    "hpv_testing": "Not done | Negative | Positive (high-risk) | Positive (low-risk) | Unknown",
    "hpv_type": "string (only if hpv_testing is positive)",
    "hpv_vaccination_status": "Not vaccinated | Partially vaccinated | Fully vaccinated | Unknown",
    "breast_self_exam_practice": "Yes | No | Occasionally",
    "clinical_breast_exam_date": "ISO date string",
    "mammography": "string",
    "other_screening": "string"
  },
  "review_of_systems": {
    "systemic_symptoms": "string",
    "gastrointestinal_symptoms": "string",
    "endocrine_metabolic": "string",
    "psychological_emotional": "string"
  },
  "physical_examination": {
    "vitals": {
      "blood_pressure": "string (e.g., '120/80')",
      "pulse_rate": "string (number as string)",
      "respiratory_rate": "string (number as string)",
      "temperature": "string (number as string)",
      "spo2": "string (number as string)",
      "weight": "string (number as string, in kg)",
      "height": "string (number as string, in cm)",
      "bmi": "string (number as string, calculated automatically)"
    },
    "general_examination": {
      "general_appearance": "string",
      "pallor_anemia_signs": "None | Mild | Moderate | Severe",
      "other_systemic_findings": "string"
    },
    "breast_examination": {
      "inspection_findings": "string",
      "palpation_findings": "string"
    },
    "abdominal_examination": {
      "inspection": "string",
      "palpation": "string",
      "percussion_auscultation": "string"
    },
    "pelvic_examination": {
      "external_genitalia_findings": "string",
      "vaginal_mucosa": "string",
      "vaginal_discharge_description": "string",
      "cervix_appearance": "string",
      "contact_bleeding_on_touch": "No | Yes",
      "prolapse_assessment": "string",
      "cervical_motion_tenderness": "Absent | Present | Not assessed",
      "uterus_size": "string (e.g., '8 weeks size')",
      "uterus_position": "Anteverted | Retroverted | Midposition | Uncertain",
      "uterus_consistency_mobility": "string",
      "adnexal_findings": "string",
      "pouch_of_douglas": "string",
      "rectal_rectovaginal_findings": "string"
    }
  },
  "investigations": {
    "pregnancy_test": "Not done | Negative | Positive | Pending",
    "laboratory_tests": "string",
    "imaging": "string",
    "cervical_screening_colposcopy": "string",
    "other_tests": "string"
  },
  "diagnosis": {
    "code": "ICD-11 code string",
    "term": "Diagnosis term/description"
  },
  "diagnosis_codes": [
    {
      "code": "ICD-11 code string",
      "term": "Diagnosis term/description"
    }
  ],
  "management_plan": {
    "problem_list": "string",
    "medications_prescribed": ["string"],
    "procedures_performed_today": "string",
    "procedures_planned_referrals": "string",
    "non_pharmacologic_management": "string",
    "follow_up_plan": "string",
    "follow_up_date": "ISO date string"
  },
  "counselling_signoff": {
    "counselling_provided": "string",
    "safety_warning_signs_explained": "string",
    "patient_questions_concerns": "string",
    "provider_notes": "string",
    "provider_name_signature": "string",
    "documentation_date_time": "ISO datetime string"
  }
}
```

## Example with Sample Data

```json
{
  "doc_type": "gynecology.initial",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "midwifery_gynecology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-101",
    "datetime": "2024-01-15T10:30:00.000Z"
  },
  "chief_complaint": "Irregular menstrual cycles and pelvic pain",
  "visit_type": "New consultation",
  "patient_info": {
    "patient_name": "Aisha Karimova",
    "date_of_birth": "1992-03-20",
    "age": "31",
    "id_mrn": "MRN-67890",
    "contact_number": "+998901234567",
    "address": "Tashkent, Uzbekistan",
    "marital_status": "Married",
    "occupation": "Teacher",
    "emergency_contact": "+998901234568"
  },
  "presenting_complaint_hpi": {
    "presenting_complaint": "Irregular menstrual cycles for 6 months, pelvic pain during periods",
    "duration_of_symptoms": "6 months",
    "history_of_present_illness": "Patient reports irregular cycles ranging from 25-45 days. Heavy bleeding during periods with severe cramping. Pain is worse on first 2 days of period. No intermenstrual bleeding. No postcoital bleeding."
  },
  "menstrual_reproductive_history": {
    "menarche_age": "13",
    "cycle_pattern": "Irregular",
    "last_menstrual_period": "2024-01-05",
    "cycle_length": "25-45 days",
    "duration_of_bleeding": "5-7 days",
    "flow_amount": "Heavy",
    "dysmenorrhea": "Severe",
    "dysmenorrhea_severity_score": "8",
    "intermenstrual_bleeding": "No",
    "intermenstrual_bleeding_description": "",
    "postcoital_bleeding": "No",
    "postcoital_bleeding_description": "",
    "premenstrual_symptoms": "Mood swings, bloating, breast tenderness",
    "contraception_use": "Condoms",
    "contraception_details": "Using condoms consistently",
    "menopausal_status": "Premenopausal",
    "age_at_menopause": "",
    "last_menstrual_period_menopause": "",
    "postmenopausal_bleeding": "No",
    "postmenopausal_bleeding_description": ""
  },
  "obstetric_history": {
    "gravida": "2",
    "para": "1",
    "abortions_miscarriages": "1",
    "living_children": "1",
    "previous_obstetric_complications": "Previous miscarriage at 8 weeks"
  },
  "gynecological_history": {
    "sexual_activity": "Currently sexually active",
    "dyspareunia": "Deep",
    "dyspareunia_description": "Deep pain during intercourse, worse during certain positions",
    "vaginal_discharge_history": "Occasional white discharge, no odor or itching",
    "past_gynecologic_diagnoses": "None",
    "infertility_history": "No",
    "previous_gynecological_procedures": "None",
    "history_of_stis_pid": "No",
    "stis_pid_type_treatment": "",
    "urinary_symptoms": "No frequency, urgency, or dysuria",
    "pelvic_organ_prolapse_symptoms": "None"
  },
  "medical_surgical_history": {
    "medical_conditions": "None",
    "previous_surgeries": "Appendectomy in 2010",
    "allergies": "Penicillin",
    "current_medications": ["Multivitamin daily"],
    "family_history": "Mother had endometriosis"
  },
  "screening_preventive_care": {
    "pap_smear_ever_done": "Yes",
    "date_of_last_pap_smear": "2023-06-15",
    "result_of_last_pap_smear": "Normal",
    "hpv_testing": "Negative",
    "hpv_type": "",
    "hpv_vaccination_status": "Fully vaccinated",
    "breast_self_exam_practice": "Occasionally",
    "clinical_breast_exam_date": "2023-12-01",
    "mammography": "Not yet indicated (age < 40)",
    "other_screening": "None"
  },
  "review_of_systems": {
    "systemic_symptoms": "No fever, weight loss, or fatigue",
    "gastrointestinal_symptoms": "No nausea, vomiting, or changes in bowel habits",
    "endocrine_metabolic": "No excessive hair growth, acne, or weight changes",
    "psychological_emotional": "Mood swings related to menstrual cycle"
  },
  "physical_examination": {
    "vitals": {
      "blood_pressure": "118/75",
      "pulse_rate": "72",
      "respiratory_rate": "16",
      "temperature": "36.7",
      "spo2": "98",
      "weight": "65",
      "height": "162",
      "bmi": "24.8"
    },
    "general_examination": {
      "general_appearance": "Well-appearing, comfortable",
      "pallor_anemia_signs": "None",
      "other_systemic_findings": "None"
    },
    "breast_examination": {
      "inspection_findings": "No visible masses, skin changes, or nipple discharge",
      "palpation_findings": "No palpable masses, no axillary lymphadenopathy"
    },
    "abdominal_examination": {
      "inspection": "No distension, scars, or visible masses",
      "palpation": "Soft, non-tender, no masses palpable",
      "percussion_auscultation": "Normal bowel sounds"
    },
    "pelvic_examination": {
      "external_genitalia_findings": "Normal external genitalia, no lesions or discharge",
      "vaginal_mucosa": "Normal, pink, well-estrogenized",
      "vaginal_discharge_description": "Minimal white discharge, no odor",
      "cervix_appearance": "Normal appearance, nulliparous os",
      "contact_bleeding_on_touch": "No",
      "prolapse_assessment": "No prolapse",
      "cervical_motion_tenderness": "Present",
      "uterus_size": "8 weeks size",
      "uterus_position": "Anteverted",
      "uterus_consistency_mobility": "Boggy, tender, limited mobility",
      "adnexal_findings": "Right adnexa tender, no masses palpable",
      "pouch_of_douglas": "Tender on palpation",
      "rectal_rectovaginal_findings": "Not performed"
    }
  },
  "investigations": {
    "pregnancy_test": "Negative",
    "laboratory_tests": "CBC: Normal, Hemoglobin: 12.5 g/dL, TSH: Normal",
    "imaging": "Pelvic ultrasound: Enlarged uterus with possible adenomyosis, right ovarian cyst 3cm",
    "cervical_screening_colposcopy": "Not indicated",
    "other_tests": "CA-125: 45 U/mL (slightly elevated)"
  },
  "diagnosis": {
    "code": "GA20",
    "term": "Endometriosis"
  },
  "diagnosis_codes": [
    {
      "code": "GA20",
      "term": "Endometriosis"
    },
    {
      "code": "GA00.1",
      "term": "Dysmenorrhea"
    }
  ],
  "management_plan": {
    "problem_list": "1. Irregular heavy menstrual cycles\n2. Severe dysmenorrhea\n3. Pelvic pain\n4. Possible endometriosis",
    "medications_prescribed": ["Mefenamic acid 500mg TID during menses", "Combined OCP (Ethinyl estradiol + Drospirenone) daily"],
    "procedures_performed_today": "Pelvic examination, speculum examination",
    "procedures_planned_referrals": "Consider diagnostic laparoscopy if symptoms persist after 3 months of medical management",
    "non_pharmacologic_management": "Heat therapy for pain, regular exercise, dietary modifications",
    "follow_up_plan": "Follow-up in 3 months to assess response to treatment. Consider laparoscopy if no improvement.",
    "follow_up_date": "2024-04-15"
  },
  "counselling_signoff": {
    "counselling_provided": "Discussed: Endometriosis, treatment options, lifestyle modifications, when to seek urgent care",
    "safety_warning_signs_explained": "Return immediately if: severe pelvic pain, heavy bleeding, signs of infection, or any concerns",
    "patient_questions_concerns": "Patient concerned about fertility. Discussed that treatment may help preserve fertility.",
    "provider_notes": "Patient is well-informed and engaged. Good understanding of condition and treatment plan.",
    "provider_name_signature": "Dr. Malika Toshmatova",
    "documentation_date_time": "2024-01-15T11:00:00"
  }
}
```

## Key Notes

1. **Menstrual History**:
   - **Menarche**: Age at first period
   - **Cycle Pattern**: Regular, irregular, amenorrhea, oligomenorrhea, polymenorrhea
   - **Cycle Length**: Days between periods
   - **Duration of Bleeding**: Days of menstrual flow
   - **Flow Amount**: Light, normal, heavy, very heavy
   - **Dysmenorrhea**: Painful periods (none, mild, moderate, severe)
   - **Dysmenorrhea Severity Score**: 0-10 scale

2. **Bleeding Patterns**:
   - **Intermenstrual Bleeding**: Bleeding between periods (red flag)
   - **Postcoital Bleeding**: Bleeding after intercourse (red flag)
   - **Postmenopausal Bleeding**: Bleeding after menopause (red flag - requires investigation)

3. **Contraception**:
   - Multiple options: Condoms, OCP, IUD, Implant, Injection, Sterilization
   - Details field for additional information

4. **Menopausal Status**:
   - **Premenopausal**: Still having periods
   - **Perimenopausal**: Transitioning to menopause
   - **Postmenopausal**: No periods for 12+ months
   - Age at menopause and last period tracked for postmenopausal patients

5. **Obstetric History**:
   - **Gravida (G)**: Total number of pregnancies
   - **Para (P)**: Number of deliveries after 20 weeks
   - **Abortions/Miscarriages**: Pregnancy losses before 20 weeks
   - **Living Children**: Number of living children

6. **Gynecological History**:
   - **Sexual Activity**: Current status
   - **Dyspareunia**: Painful intercourse (superficial, deep, or both)
   - **STI/PID History**: Important for pelvic inflammatory disease risk
   - **Urinary Symptoms**: May indicate pelvic floor issues
   - **Prolapse Symptoms**: Pelvic organ prolapse assessment

7. **Screening & Preventive Care**:
   - **Pap Smear**: Cervical cancer screening
   - **HPV Testing**: Human papillomavirus testing
   - **HPV Vaccination**: Vaccination status
   - **Breast Screening**: Self-exam, clinical exam, mammography

8. **Physical Examination**:
   - **Vitals**: Standard vital signs including BMI (auto-calculated)
   - **General Examination**: Appearance, anemia signs
   - **Breast Examination**: Inspection and palpation
   - **Abdominal Examination**: Inspection, palpation, percussion, auscultation
   - **Pelvic Examination**:
     - External genitalia
     - Speculum examination (vaginal mucosa, discharge, cervix)
     - Bimanual examination (uterus, adnexa, pouch of Douglas)
     - Rectal/rectovaginal examination

9. **Pelvic Examination Details**:
   - **Cervical Motion Tenderness (CMT)**: Sign of PID
   - **Uterus Size**: Measured in weeks (pregnancy equivalent)
   - **Uterus Position**: Anteverted, retroverted, midposition
   - **Adnexal Findings**: Ovaries and fallopian tubes
   - **Pouch of Douglas**: Posterior cul-de-sac

10. **Investigations**:
    - **Pregnancy Test**: Always consider in reproductive-age women
    - **Laboratory Tests**: CBC, hormone levels, etc.
    - **Imaging**: Ultrasound, CT, MRI
    - **Cervical Screening/Colposcopy**: For abnormal Pap smears

11. **Diagnosis**:
    - Main diagnosis with ICD-11 code and term
    - Additional diagnosis codes as array
    - Each diagnosis code is an object with `code` and `term`

12. **Management Plan**:
    - **Problem List**: List of identified problems
    - **Medications**: Array of medication strings
    - **Procedures**: Performed today and planned
    - **Non-pharmacologic Management**: Lifestyle, diet, exercise
    - **Follow-up Plan**: Next steps and follow-up date

13. **Counselling & Sign-off**:
    - **Counselling Provided**: Patient education
    - **Safety Warning Signs**: Red flags to watch for
    - **Patient Questions/Concerns**: Documented patient concerns
    - **Provider Notes**: Additional clinical notes
    - **Provider Signature**: Provider name/signature
    - **Documentation DateTime**: When documentation was completed

14. **Field Name Mappings** (Form to Payload):
    - Form field `lmp` → Payload `last_menstrual_period` (in menstrual_reproductive_history)
    - Form field `abortions` → Payload `abortions_miscarriages`
    - Form field `stisPidDetails` → Payload `stis_pid_type_treatment`
    - Form field `safetyWarningSigns` → Payload `safety_warning_signs_explained`

15. **Conditional Fields**:
    - **Intermenstrual Bleeding Description**: Only if intermenstrual bleeding is "Yes"
    - **Postcoital Bleeding Description**: Only if postcoital bleeding is "Yes"
    - **Contraception Details**: Only if contraception use is not "None"
    - **Age at Menopause**: Only if postmenopausal
    - **Last Menstrual Period (Menopause)**: Only if postmenopausal
    - **Postmenopausal Bleeding Description**: Only if postmenopausal bleeding is "Yes"
    - **Dyspareunia Description**: Only if dyspareunia is not "No"
    - **STI/PID Type Treatment**: Only if history of STIs/PID is "Yes"
    - **Date of Last Pap Smear**: Only if Pap smear ever done is "Yes"
    - **Result of Last Pap Smear**: Only if Pap smear ever done is "Yes"
    - **HPV Type**: Only if HPV testing is positive

16. **BMI Calculation**:
    - Automatically calculated from weight and height
    - Formula: weight (kg) / (height (m))²
    - Height converted from cm to meters

17. **Visit Types**:
    - **New consultation**: First visit
    - **Follow-up**: Subsequent visit
    - **Procedure visit**: Visit for procedure
    - **Post-op follow-up**: Post-operative follow-up

18. **Pap Smear Results**:
    - **Normal**: No abnormalities
    - **ASC-US**: Atypical squamous cells of undetermined significance
    - **LSIL**: Low-grade squamous intraepithelial lesion
    - **HSIL**: High-grade squamous intraepithelial lesion
    - **AGC**: Atypical glandular cells
    - **Other abnormal**: Other abnormal findings
    - **Unknown**: Result not known

19. **HPV Testing**:
    - **Not done**: Test not performed
    - **Negative**: No HPV detected
    - **Positive (high-risk)**: High-risk HPV types detected
    - **Positive (low-risk)**: Low-risk HPV types detected
    - **Unknown**: Result not known

20. **Pregnancy Test**:
    - Always consider in reproductive-age women
    - Options: Not done, Negative, Positive, Pending

## Validation Rules

- **Presenting Complaint**: Required
- **Main Diagnosis**: Required (must have both `code` and `term`)
- **BMI**: Automatically calculated from weight and height

## Special Considerations

1. **Red Flags**:
    - Intermenstrual bleeding
    - Postcoital bleeding
    - Postmenopausal bleeding
    - Cervical motion tenderness (PID)
    - Contact bleeding on touch (cervical pathology)

2. **Menstrual Disorders**:
    - Irregular cycles may indicate PCOS, thyroid issues, etc.
    - Heavy bleeding may indicate fibroids, adenomyosis, etc.
    - Severe dysmenorrhea may indicate endometriosis

3. **Contraception Counseling**:
    - Important for reproductive health
    - Details field for method-specific information

4. **Menopause Management**:
    - Postmenopausal bleeding is a red flag
    - Requires investigation for endometrial pathology
    - Age at menopause and last period important for risk assessment

5. **Screening Guidelines**:
    - Pap smear frequency based on age and risk
    - HPV testing for cervical cancer screening
    - Breast screening based on age and risk

6. **Pelvic Pain**:
    - Comprehensive history and examination
    - Consider endometriosis, PID, ovarian cysts, etc.
    - May require imaging or laparoscopy

7. **Infertility**:
    - Documented in gynecological history
    - May require specialized workup

8. **STI/PID History**:
    - Important for pelvic inflammatory disease risk
    - May affect fertility
    - Type and treatment documented

9. **Prolapse Assessment**:
    - Symptoms and examination findings
    - May require referral to urogynecology

10. **Medication Management**:
    - Medications stored as array of strings
    - Can include hormonal therapy, pain management, etc.
    - Important for pregnancy safety



