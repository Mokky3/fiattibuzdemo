# Midwifery Report - JSON Form Structure

This document describes the complete JSON structure returned by the `MidwiferyForm` component.

## Complete JSON Structure

The midwifery form is structured for antenatal care visits and includes comprehensive obstetric and gynecological information.

```json
{
  "doc_type": "midwifery.initial",
  "meta": {
    "clinic_id": "string",
    "department_id": "midwifery_gynecology",
    "physician_id": "string",
    "patient_id": "string",
    "encounter_id": "string",
    "datetime": "ISO 8601 datetime string"
  },
  "patient_info": {
    "patient_name": "string",
    "date_of_birth": "ISO date string",
    "age": "string (number as string)",
    "id_mrn": "string (ID/MRN)",
    "contact_number": "string",
    "address": "string",
    "emergency_contact": "string",
    "marital_status": "Single | Married | Widowed | Divorced | Other"
  },
  "obstetric_medical_history": {
    "obstetric_summary": {
      "gravida": "string (number as string)",
      "para": "string (number as string)",
      "abortions_miscarriages": "string (number as string)",
      "living_children": "string (number as string)",
      "previous_modes_of_delivery": ["string"],
      "previous_obstetric_complications": "string"
    },
    "general_medical_history": {
      "medical_conditions": "string",
      "surgical_history": "string",
      "allergies": "string",
      "blood_group": "A+ | A- | B+ | B- | AB+ | AB- | O+ | O-",
      "rh_isoimmunization_history": "No | Suspected | Confirmed",
      "current_medications": ["string"],
      "family_history": "string"
    }
  },
  "current_pregnancy": {
    "pregnancy_planned": "Yes | No | Unknown",
    "last_menstrual_period": "ISO date string",
    "dating_method": "LMP | Early Ultrasound | IVF Dates | Unknown",
    "estimated_due_date": "ISO date string",
    "gestational_age": "string (e.g., '32+5' for 32 weeks 5 days)",
    "pregnancy_type": "Singleton | Twins | Triplets | Higher Order",
    "visit_number": "string (number as string)",
    "high_risk_factors": "string",
    "current_pregnancy_complaints": "string"
  },
  "vital_signs": {
    "blood_pressure": "string (e.g., '120/80')",
    "pulse_rate": "string (number as string)",
    "respiratory_rate": "string (number as string)",
    "temperature": "string (number as string)",
    "spo2": "string (number as string)",
    "weight": "string (number as string, in kg)",
    "height": "string (number as string, in cm)",
    "bmi": "string (number as string, calculated automatically)"
  },
  "obstetric_examination": {
    "general": {
      "general_appearance": "string",
      "oedema": "Absent | Mild | Moderate | Severe | Generalized"
    },
    "uterus_fetus": {
      "fundal_height": "string (e.g., '32 cm')",
      "symphysis_fundal_height_comment": "string",
      "fetal_lie": "Longitudinal | Transverse | Oblique | Uncertain",
      "presentation": "Cephalic | Breech | Shoulder | Compound | Uncertain",
      "position": "string (e.g., 'LOA', 'ROA')",
      "fetal_movement": "Normal | Reduced | Absent | Not Assessed",
      "fetal_heart_rate": "string (number as string, bpm)",
      "fhr_character_comment": "string"
    },
    "labour_specific": {
      "contractions": "string",
      "membranes": "Intact | Ruptured",
      "time_of_rupture": "ISO datetime string",
      "liquor": "Not Assessed | Clear | Meconium Stained | Bloody | Foul Smelling | Other",
      "vaginal_bleeding": "None | Spotting | Light | Moderate | Heavy",
      "vaginal_bleeding_description": "string (only if vaginal_bleeding is not 'None')",
      "show_mucus_plug": "Absent | Present"
    },
    "cervical_assessment": {
      "cervical_dilation": "string (e.g., '3 cm')",
      "effacement": "string (e.g., '50%')",
      "station": "string (e.g., '-2', '0', '+2')",
      "cervical_consistency_position": "string"
    }
  },
  "laboratory_tests": {
    "hemoglobin": "string (e.g., '12.5 g/dL')",
    "blood_sugar_glucose": "string",
    "gdm_screening_ogtt_result": "string (GDM screening/OGTT result)",
    "urine_analysis": "string",
    "hiv_status": "Negative | Positive | Unknown | Not Tested",
    "hepatitis_b_status": "Negative | Positive | Unknown | Not Tested",
    "syphilis": "Negative | Positive | Unknown | Not Tested",
    "other_tests": "string"
  },
  "ultrasound_fetal_assessment": {
    "number_of_fetuses": "string (number as string, default: 1)",
    "ultrasound_date": "ISO date string",
    "gestational_age_by_ultrasound": "string",
    "placenta_position": "Anterior | Posterior | Fundal | Low Lying | Previa",
    "placental_comment": "string",
    "amniotic_fluid": "Normal | Oligohydramnios | Polyhydramnios | Borderline | Not Assessed",
    "estimated_fetal_weight": "string (e.g., '2500 g')",
    "fetal_biometry": "string",
    "doppler_bpp_findings": "string (Doppler/BPP findings)",
    "additional_ultrasound_findings": "string"
  },
  "risk_assessment_summary": {
    "overall_risk_category": "Low Risk | Moderate Risk | High Risk",
    "key_risk_factors": "string",
    "clinical_impression": "string"
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
  "care_plan_followup": {
    "next_visit_date": "ISO date string",
    "next_visit_type": "Routine Antenatal | High Risk Antenatal | Ultrasound | Lab Review | Postnatal | Other",
    "recommended_tests": "string",
    "medications_prescribed": ["string"],
    "dietary_recommendations": "string",
    "activity_work_restrictions": "string",
    "emergency_instructions": "string",
    "planned_place_of_delivery": "This Facility | Other Facility | Not Yet Decided",
    "planned_mode_of_delivery": "Normal Vaginal Delivery (Planned) | Elective Caesarean | Vaginal Birth After Caesarean | Undecided"
  },
  "notes_counselling_signoff": {
    "general_observations": "string",
    "patient_concerns": "string",
    "counselling_provided": "string",
    "follow_up_plan_narrative": "string",
    "provider_signature": "string",
    "documentation_date_time": "ISO datetime string"
  }
}
```

## Example with Sample Data

```json
{
  "doc_type": "midwifery.initial",
  "meta": {
    "clinic_id": "clinic-123",
    "department_id": "midwifery_gynecology",
    "physician_id": "doc-456",
    "patient_id": "patient-789",
    "encounter_id": "encounter-101",
    "datetime": "2024-01-15T10:30:00.000Z"
  },
  "patient_info": {
    "patient_name": "Fatima Alimova",
    "date_of_birth": "1990-05-15",
    "age": "33",
    "id_mrn": "MRN-12345",
    "contact_number": "+998901234567",
    "address": "Tashkent, Uzbekistan",
    "emergency_contact": "+998901234568",
    "marital_status": "Married"
  },
  "obstetric_medical_history": {
    "obstetric_summary": {
      "gravida": "2",
      "para": "1",
      "abortions_miscarriages": "0",
      "living_children": "1",
      "previous_modes_of_delivery": ["Normal Vaginal Delivery"],
      "previous_obstetric_complications": "None"
    },
    "general_medical_history": {
      "medical_conditions": "None",
      "surgical_history": "Appendectomy in 2015",
      "allergies": "Penicillin",
      "blood_group": "A+",
      "rh_isoimmunization_history": "No",
      "current_medications": ["Folic acid 400mcg daily", "Iron supplement"],
      "family_history": "Mother had gestational diabetes"
    }
  },
  "current_pregnancy": {
    "pregnancy_planned": "Yes",
    "last_menstrual_period": "2023-06-10",
    "dating_method": "LMP",
    "estimated_due_date": "2024-03-17",
    "gestational_age": "32+5",
    "pregnancy_type": "Singleton",
    "visit_number": "6",
    "high_risk_factors": "Family history of GDM",
    "current_pregnancy_complaints": "Mild back pain, occasional heartburn"
  },
  "vital_signs": {
    "blood_pressure": "120/80",
    "pulse_rate": "78",
    "respiratory_rate": "18",
    "temperature": "36.8",
    "spo2": "98",
    "weight": "68",
    "height": "165",
    "bmi": "25.0"
  },
  "obstetric_examination": {
    "general": {
      "general_appearance": "Well-appearing, comfortable",
      "oedema": "Mild"
    },
    "uterus_fetus": {
      "fundal_height": "32 cm",
      "symphysis_fundal_height_comment": "Corresponds to gestational age",
      "fetal_lie": "Longitudinal",
      "presentation": "Cephalic",
      "position": "LOA",
      "fetal_movement": "Normal",
      "fetal_heart_rate": "145",
      "fhr_character_comment": "Regular, good variability"
    },
    "labour_specific": {
      "contractions": "None",
      "membranes": "Intact",
      "time_of_rupture": "",
      "liquor": "Not Assessed",
      "vaginal_bleeding": "None",
      "vaginal_bleeding_description": "",
      "show_mucus_plug": "Absent"
    },
    "cervical_assessment": {
      "cervical_dilation": "",
      "effacement": "",
      "station": "",
      "cervical_consistency_position": "Long, posterior, firm"
    }
  },
  "laboratory_tests": {
    "hemoglobin": "11.5 g/dL",
    "blood_sugar_glucose": "4.8 mmol/L",
    "gdm_screening_ogtt_result": "Normal - 1hr: 7.2, 2hr: 6.1",
    "urine_analysis": "No protein, no glucose, no ketones",
    "hiv_status": "Negative",
    "hepatitis_b_status": "Negative",
    "syphilis": "Negative",
    "other_tests": "Rubella immune, Varicella immune"
  },
  "ultrasound_fetal_assessment": {
    "number_of_fetuses": "1",
    "ultrasound_date": "2024-01-10",
    "gestational_age_by_ultrasound": "32+3",
    "placenta_position": "Posterior",
    "placental_comment": "Normal appearance, no previa",
    "amniotic_fluid": "Normal",
    "estimated_fetal_weight": "2100 g",
    "fetal_biometry": "BPD: 8.2cm, HC: 29.5cm, AC: 27.8cm, FL: 6.1cm",
    "doppler_bpp_findings": "Umbilical artery PI normal, MCA PI normal, BPP score: 8/8",
    "additional_ultrasound_findings": "No anomalies detected"
  },
  "risk_assessment_summary": {
    "overall_risk_category": "Low Risk",
    "key_risk_factors": "Family history of GDM - monitoring blood sugar",
    "clinical_impression": "Normal pregnancy progressing well. Patient doing well with routine antenatal care."
  },
  "diagnosis": {
    "code": "JA00",
    "term": "Normal pregnancy"
  },
  "diagnosis_codes": [
    {
      "code": "JA00",
      "term": "Normal pregnancy"
    }
  ],
  "care_plan_followup": {
    "next_visit_date": "2024-01-29",
    "next_visit_type": "Routine Antenatal",
    "recommended_tests": "Repeat hemoglobin in 2 weeks, 36-week GBS screening",
    "medications_prescribed": ["Folic acid 400mcg daily", "Iron supplement 65mg daily"],
    "dietary_recommendations": "Continue balanced diet, increase iron-rich foods, stay hydrated",
    "activity_work_restrictions": "Continue normal activities, avoid heavy lifting",
    "emergency_instructions": "Return immediately if: severe abdominal pain, heavy bleeding, decreased fetal movement, signs of labor, or any concerns",
    "planned_place_of_delivery": "This Facility",
    "planned_mode_of_delivery": "Normal Vaginal Delivery (Planned)"
  },
  "notes_counselling_signoff": {
    "general_observations": "Patient is well-informed and engaged in her care. Good understanding of pregnancy changes.",
    "patient_concerns": "Worried about delivery process. Discussed normal labor and delivery.",
    "counselling_provided": "Discussed: labor signs, when to come to hospital, pain management options, breastfeeding preparation",
    "follow_up_plan_narrative": "Continue routine antenatal visits every 2 weeks until 36 weeks, then weekly. Monitor blood sugar given family history.",
    "provider_signature": "Dr. Sarah Johnson",
    "documentation_date_time": "2024-01-15T10:45:00"
  }
}
```

## Key Notes

1. **Gravida/Para Notation**:
   - **Gravida (G)**: Total number of pregnancies (including current)
   - **Para (P)**: Number of deliveries after 20 weeks
   - **Abortions**: Pregnancy losses before 20 weeks
   - **Living Children**: Number of living children

2. **Gestational Age Format**:
   - Format: `"weeks+days"` (e.g., "32+5" = 32 weeks 5 days)
   - Automatically calculated from LMP if provided
   - Can also be from ultrasound dating

3. **Fetal Lie**:
   - **Longitudinal**: Baby's long axis parallel to mother's spine (normal)
   - **Transverse**: Baby's long axis perpendicular to mother's spine
   - **Oblique**: Baby's long axis at an angle

4. **Fetal Presentation**:
   - **Cephalic**: Head down (normal)
   - **Breech**: Bottom/feet down
   - **Shoulder**: Transverse lie
   - **Compound**: Multiple parts presenting

5. **Fetal Position**:
   - Uses standard notation (e.g., LOA = Left Occiput Anterior)
   - First letter: Left (L) or Right (R)
   - Second part: Occiput (O), Sacrum (S), etc.
   - Third part: Anterior (A), Posterior (P), Transverse (T)

6. **Cervical Assessment**:
   - **Dilation**: 0-10 cm
   - **Effacement**: 0-100%
   - **Station**: Negative numbers (above ischial spines), 0 (at spines), positive numbers (below spines)

7. **Fundal Height**:
   - Measured in cm from pubic symphysis to top of uterus
   - Should roughly correspond to gestational age in weeks
   - Comment field for assessment

8. **Fetal Heart Rate**:
   - Normal range: 110-160 bpm
   - Character comment describes regularity, variability, accelerations, decelerations

9. **Amniotic Fluid Assessment**:
   - **Normal**: Adequate fluid
   - **Oligohydramnios**: Too little fluid
   - **Polyhydramnios**: Too much fluid
   - **Borderline**: Slightly outside normal range

10. **Risk Categories**:
    - **Low Risk**: Normal pregnancy, no complications
    - **Moderate Risk**: Some risk factors but manageable
    - **High Risk**: Significant risk factors requiring close monitoring

11. **Blood Group and Rh Status**:
    - Important for Rh isoimmunization prevention
    - Rh-negative mothers may need Rhogam

12. **Medications**:
    - `medications_prescribed` is an array of strings
    - Each medication is stored as a string (newline-separated in form, array in payload)
    - Can include supplements, medications, etc.

13. **Diagnosis Structure**:
    - Main diagnosis uses ICD-11 codes with `code` and `term`
    - Additional diagnosis codes stored in `diagnosis_codes` array
    - Each diagnosis code is an object with `code` and `term`

14. **Visit Types**:
    - **Routine Antenatal**: Standard follow-up visit
    - **High Risk Antenatal**: Specialized monitoring
    - **Ultrasound**: Ultrasound appointment
    - **Lab Review**: Review of laboratory results
    - **Postnatal**: After delivery visit
    - **Other**: Custom visit type

15. **BMI Calculation**:
    - Automatically calculated from weight and height
    - Formula: weight (kg) / (height (m))²
    - Height converted from cm to meters

16. **Field Name Mappings** (Form to Payload):
    - Form field `sfhComment` → Payload `symphysis_fundal_height_comment`
    - Form field `fhrCharacter` → Payload `fhr_character_comment`
    - Form field `bloodSugar` → Payload `blood_sugar_glucose`
    - Form field `gdmScreening` → Payload `gdm_screening_ogtt_result`
    - Form field `cervicalConsistency` → Payload `cervical_consistency_position`

17. **Labour-Specific Fields**:
    - Only relevant during active labor
    - Includes contractions, membrane status, rupture time, liquor assessment
    - Cervical assessment becomes critical during labor

18. **Vaginal Bleeding**:
    - Conditional field: `vaginal_bleeding_description` only appears if bleeding is present
    - Important red flag in pregnancy

19. **Emergency Instructions**:
    - Critical patient education
    - Red flags to watch for
    - When to seek immediate care

20. **Planned Delivery**:
    - Place and mode of delivery planning
    - Important for care coordination
    - May change based on pregnancy course

## Validation Rules

- **Patient Name**: Required
- **Main Diagnosis**: Required (must have both `code` and `term`)
- **BMI**: Automatically calculated from weight and height
- **Gestational Age**: Automatically calculated from LMP if provided

## Special Considerations

1. **Multiple Pregnancies**:
    - `number_of_fetuses` tracks singleton, twins, triplets, etc.
    - Each fetus may need separate assessment

2. **High-Risk Factors**:
    - Documented in `high_risk_factors` field
    - Affects visit frequency and monitoring

3. **Rh Isoimmunization**:
    - Critical for Rh-negative mothers
    - May require Rhogam administration
    - History tracked in medical history

4. **GDM Screening**:
    - Gestational Diabetes Mellitus screening
    - OGTT (Oral Glucose Tolerance Test) results
    - Important for pregnancy management

5. **Fetal Movement**:
    - Important indicator of fetal well-being
    - Reduced or absent movement is a red flag

6. **Fundal Height**:
    - Should correlate with gestational age
    - Discrepancy may indicate growth issues

7. **Ultrasound Dating**:
    - More accurate than LMP in early pregnancy
    - Used to confirm or adjust due date

8. **Doppler/BPP**:
    - Biophysical Profile (BPP) scoring
    - Doppler studies for fetal well-being
    - Important for high-risk pregnancies

9. **Medication Management**:
    - Medications stored as array of strings
    - Can include supplements, prescriptions, etc.
    - Important for pregnancy safety

10. **Counselling**:
    - Patient education and counseling documented
    - Important for informed consent and patient engagement
    - Includes labor preparation, breastfeeding, etc.



