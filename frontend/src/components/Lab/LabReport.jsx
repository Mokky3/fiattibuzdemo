import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LabHeader from './header';
import { getPatientById, getPatients, createReport } from '../../services/labService';
import { Plus, X, Save, ArrowLeft } from 'lucide-react';
import { TestInputRenderer } from './TestInputComponents';

const LabReport = () => {
  const { patientId, reportId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [showPatientSelector, setShowPatientSelector] = useState(!patientId);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    testResults: [],
    specimenType: '',
    specimenCollectedDate: new Date().toISOString().split('T')[0],
    specimenCollectedTime: new Date().toTimeString().slice(0, 5),
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toTimeString().slice(0, 5),
    comments: '',
    status: 'completed',
  });

  // Test configuration with metadata
  const testConfig = {
    'Complete Blood Count (CBC)': {
      type: 'panel_cbc',
      code: 'CBC_PANEL',
      parameters: [
        { code: 'HB', name: 'Hemoglobin', unit: 'g/dL', ref: 'M:13.0–17.0; F:12.0–15.5' },
        { code: 'HCT', name: 'Hematocrit', unit: '%', ref: 'M:40–52; F:36–48' },
        { code: 'RBC', name: 'RBC Count', unit: '×10⁶/µL', ref: 'M:4.5–6.0; F:4.0–5.2' },
        { code: 'WBC', name: 'WBC Count', unit: '×10³/µL', ref: '4.0–11.0' },
        { code: 'PLT', name: 'Platelet Count', unit: '×10³/µL', ref: '150–400' },
        { code: 'MCV', name: 'Mean Corpuscular Vol', unit: 'fL', ref: '80–100' },
        { code: 'MCH', name: 'Mean Corpuscular Hb', unit: 'pg', ref: '27–33' },
        { code: 'MCHC', name: 'Mean Corp. Hb Conc.', unit: 'g/dL', ref: '32–36' },
        { code: 'RDW', name: 'Red Cell Dist. Width', unit: '%', ref: '11.5–14.5' },
        { code: 'MPV', name: 'Mean Platelet Vol.', unit: 'fL', ref: '7.5–11.5' }
      ]
    },
    'Hemoglobin': { type: 'numeric_single', code: 'HB', unit: 'g/dL', ref: 'M:13.0–17.0; F:12.0–15.5' },
    'Hematocrit': { type: 'numeric_single', code: 'HCT', unit: '%', ref: 'M:40–52; F:36–48' },
    'RBC Count': { type: 'numeric_single', code: 'RBC', unit: '×10⁶/µL', ref: 'M:4.5–6.0; F:4.0–5.2' },
    'WBC Count': { type: 'numeric_single', code: 'WBC', unit: '×10³/µL', ref: '4.0–11.0' },
    'Platelet Count': { type: 'numeric_single', code: 'PLT', unit: '×10³/µL', ref: '150–400' },
    'MCV': { type: 'numeric_single', code: 'MCV', unit: 'fL', ref: '80–100' },
    'MCH': { type: 'numeric_single', code: 'MCH', unit: 'pg', ref: '27–33' },
    'MCHC': { type: 'numeric_single', code: 'MCHC', unit: 'g/dL', ref: '32–36' },
    'RDW': { type: 'numeric_single', code: 'RDW', unit: '%', ref: '11.5–14.5' },
    'ESR': { type: 'numeric_single', code: 'ESR', unit: 'mm/hr', ref: 'M:0–15; F:0–20' },
    'Differential WBC Count': {
      type: 'panel_wbc_diff',
      code: 'WBC_DIFF_PANEL',
      parameters: [
        { code: 'NEU', name: 'Neutrophils', unit_percent: '%', ref_percent: '40–70' },
        { code: 'LYM', name: 'Lymphocytes', unit_percent: '%', ref_percent: '20–45' },
        { code: 'MONO', name: 'Monocytes', unit_percent: '%', ref_percent: '2–10' },
        { code: 'EOS', name: 'Eosinophils', unit_percent: '%', ref_percent: '1–6' },
        { code: 'BASO', name: 'Basophils', unit_percent: '%', ref_percent: '0–1' },
        { code: 'BANDS', name: 'Bands / Immature Neutrophils', unit_percent: '%', ref_percent: '0–5' },
        { code: 'IG', name: 'Immature Granulocytes', unit_percent: '%', ref_percent: '0–0.5' }
      ]
    },
    'RBC Indices': {
      type: 'panel_numeric',
      code: 'RBC_INDICES_PANEL',
      parameters: [
        { code: 'MCV', name: 'MCV – Mean Corpuscular Volume', unit: 'fL', ref: '80–100' },
        { code: 'MCH', name: 'MCH – Mean Corpuscular Hemoglobin', unit: 'pg', ref: '27–33' },
        { code: 'MCHC', name: 'MCHC – Mean Corp. Hb Concentration', unit: 'g/dL', ref: '32–36' },
        { code: 'RDW', name: 'RDW – Red Cell Distribution Width', unit: '%', ref: '11.5–14.5' }
      ]
    },
    'Platelet Studies': {
      type: 'panel_platelet',
      code: 'PLATELET_PANEL',
      numericParameters: [
        { code: 'PLT', name: 'Platelet Count (PLT)', unit: '×10³/µL', ref: '150–400' },
        { code: 'MPV', name: 'Mean Platelet Volume (MPV)', unit: 'fL', ref: '7.5–11.5' },
        { code: 'PDW', name: 'Platelet Distribution Width (PDW)', unit: 'fL', ref: '' },
        { code: 'PCT', name: 'Plateletcrit (PCT)', unit: '%', ref: '' }
      ]
    },
    'Reticulocyte Count': {
      type: 'panel_numeric',
      code: 'RETIC_PANEL',
      parameters: [
        { code: 'RETIC_PCT', name: 'Reticulocyte %', unit: '%', ref: '0.5–2.5' },
        { code: 'RETIC_ABS', name: 'Absolute Reticulocyte Count', unit: '×10³/µL', ref: '' },
        { code: 'RET_HE', name: 'Reticulocyte Hemoglobin Content (Ret-He/CHr)', unit: 'pg', ref: '' }
      ]
    },
    'Reticulocyte %': { type: 'numeric_single', code: 'RETIC_PCT', unit: '%', ref: '0.5–2.5' },
    'Absolute Retic Count': { type: 'numeric_single', code: 'RETIC_ABS', unit: '×10³/µL', ref: '' },
    'Peripheral Smear / Morphology': {
      type: 'morphology_panel',
      code: 'SMEAR_PANEL'
    },
    'Hemoglobin Electrophoresis': {
      type: 'panel_numeric',
      code: 'HB_ELECTRO_PANEL',
      parameters: [
        { code: 'HBA', name: 'HbA', unit: '%', ref: '95–98' },
        { code: 'HBA2', name: 'HbA₂', unit: '%', ref: '2.0–3.5' },
        { code: 'HBF', name: 'HbF', unit: '%', ref: '<1' },
        { code: 'HBS', name: 'HbS', unit: '%', ref: '' },
        { code: 'HBC', name: 'HbC', unit: '%', ref: '' },
        { code: 'HBE', name: 'HbE', unit: '%', ref: '' }
      ]
    },
    'Bone Marrow Examination (optional)': {
      type: 'structured_text_report',
      code: 'BONE_MARROW_PANEL'
    },
    // Chemistry Division Tests
    'Liver Function Tests (LFT)': {
      type: 'panel_numeric',
      code: 'LFT_PANEL',
      parameters: [
        { code: 'ALT', name: 'ALT (Alanine aminotransferase)', unit: 'U/L', ref: '0–40' },
        { code: 'AST', name: 'AST (Aspartate aminotransferase)', unit: 'U/L', ref: '0–38' },
        { code: 'ALP', name: 'Alkaline Phosphatase', unit: 'U/L', ref: '65–280' },
        { code: 'GGT', name: 'GGT', unit: 'U/L', ref: 'M:7–52; F:5–38' },
        { code: 'TBIL', name: 'Total Bilirubin', unit: 'µmol/L', ref: '0–18.8' },
        { code: 'DBIL', name: 'Direct Bilirubin', unit: 'µmol/L', ref: '0–4.27' },
        { code: 'IBIL', name: 'Indirect Bilirubin', unit: 'µmol/L', ref: '(TBIL - DBIL)' },
        { code: 'TP', name: 'Total Protein', unit: 'g/L', ref: '66–82' },
        { code: 'ALB', name: 'Albumin', unit: 'g/L', ref: '35–50' }
      ]
    },
    'Kidney / Renal Function Tests (RFT)': {
      type: 'panel_numeric',
      code: 'RFT_PANEL',
      parameters: [
        { code: 'UREA', name: 'Urea', unit: 'mmol/L', ref: '2.49–7.49' },
        { code: 'CREA', name: 'Creatinine', unit: 'µmol/L', ref: 'M:53–97; F:44–80' },
        { code: 'UA', name: 'Uric Acid', unit: 'µmol/L', ref: 'M:210–430; F:155–395' },
        { code: 'BUN', name: 'BUN (Blood Urea Nitrogen)', unit: 'mmol/L', ref: '2.5–7.1' },
        { code: 'EGFR', name: 'eGFR (calculated)', unit: 'mL/min', ref: '> 90' }
      ]
    },
    'Electrolyte Panel': {
      type: 'panel_numeric',
      code: 'ELECTROLYTE_PANEL',
      parameters: [
        { code: 'NA', name: 'Sodium', unit: 'mmol/L', ref: '135–145' },
        { code: 'K', name: 'Potassium', unit: 'mmol/L', ref: '3.5–5.1' },
        { code: 'CL', name: 'Chloride', unit: 'mmol/L', ref: '98–107' },
        { code: 'CA', name: 'Calcium', unit: 'mmol/L', ref: '2.02–2.60' },
        { code: 'MG', name: 'Magnesium', unit: 'mmol/L', ref: '0.7–1.1' },
        { code: 'PHOS', name: 'Phosphate', unit: 'mmol/L', ref: '0.8–1.5' }
      ]
    },
    'Lipid Profile': {
      type: 'panel_numeric',
      code: 'LIPID_PANEL',
      parameters: [
        { code: 'CHOL', name: 'Total Cholesterol', unit: 'mmol/L', ref: '3.8–5.2' },
        { code: 'TG', name: 'Triglycerides', unit: 'mmol/L', ref: 'M:0.53–3.2; F:0.53–1.7' },
        { code: 'HDL', name: 'HDL Cholesterol', unit: 'mmol/L', ref: '> 1.0' },
        { code: 'LDL', name: 'LDL Cholesterol', unit: 'mmol/L', ref: '1.71–3.5' },
        { code: 'VLDL', name: 'VLDL (optional)', unit: 'mmol/L', ref: '0.26–1.04' }
      ]
    },
    'Fasting Blood Glucose': { type: 'numeric_single', code: 'GLU_FAST', unit: 'mmol/L', ref: '3.33–6.105' },
    'Random Blood Glucose': { type: 'numeric_single', code: 'GLU_RANDOM', unit: 'mmol/L', ref: '< 11.1' },
    'Post-prandial (2-hour) Glucose': { type: 'numeric_single', code: 'GLU_2H', unit: 'mmol/L', ref: '< 7.8' },
    'Glucose Tolerance Test (GTT)': {
      type: 'panel_numeric',
      code: 'GTT_PANEL',
      parameters: [
        { code: 'GTT_0H', name: 'Fasting glucose', unit: 'mmol/L', ref: '3.33–6.1' },
        { code: 'GTT_1H', name: '1-hour glucose', unit: 'mmol/L', ref: '< 10.0' },
        { code: 'GTT_2H', name: '2-hour glucose', unit: 'mmol/L', ref: '< 7.8' }
      ]
    },
    'Protein Profile': {
      type: 'panel_numeric',
      code: 'PROTEIN_PANEL',
      parameters: [
        { code: 'TP', name: 'Total Protein', unit: 'g/L', ref: '66–82' },
        { code: 'ALB', name: 'Albumin', unit: 'g/L', ref: '35–50' },
        { code: 'GLOB', name: 'Globulin (calculated)', unit: 'g/L', ref: '23–35' },
        { code: 'AGR', name: 'A/G Ratio (calculated)', unit: '—', ref: '1.0–2.5' }
      ]
    },
    'Enzyme Tests (AST, ALT, ALP, GGT, LDH)': {
      type: 'panel_numeric',
      code: 'ENZYME_PANEL',
      parameters: [
        { code: 'LDH', name: 'LDH (Lactate Dehydrogenase)', unit: 'U/L', ref: '140–280' },
        { code: 'CK', name: 'CK (Creatine Kinase)', unit: 'U/L', ref: 'M:55–170; F:30–135' },
        { code: 'CKMB', name: 'CK-MB', unit: 'U/L', ref: '< 6' },
        { code: 'AMY', name: 'Amylase', unit: 'U/L', ref: '30–110' },
        { code: 'LIP', name: 'Lipase', unit: 'U/L', ref: '0–160' }
      ]
    },
    'Minerals (Calcium, Magnesium, Phosphate)': {
      type: 'panel_numeric',
      code: 'MINERALS_PANEL',
      parameters: [
        { code: 'CA', name: 'Calcium (Total)', unit: 'mmol/L', ref: '2.02–2.60' },
        { code: 'ICA', name: 'Ionized Calcium', unit: 'mmol/L', ref: '1.12–1.32' },
        { code: 'MG', name: 'Magnesium', unit: 'mmol/L', ref: '0.7–1.1' },
        { code: 'PHOS', name: 'Phosphate', unit: 'mmol/L', ref: '0.8–1.5' }
      ]
    },
    'Iron Studies (Iron, Ferritin, TIBC)': {
      type: 'panel_numeric',
      code: 'IRON_PANEL',
      parameters: [
        { code: 'IRON', name: 'Serum Iron', unit: 'µmol/L', ref: '10–30' },
        { code: 'FERR', name: 'Ferritin', unit: 'ng/mL', ref: 'M:30–400; F:13–150' },
        { code: 'TIBC', name: 'TIBC', unit: 'µmol/L', ref: '45–72' },
        { code: 'TRANSF', name: 'Transferrin', unit: 'g/L', ref: '2.0–3.6' },
        { code: 'TSAT', name: 'Transferrin Saturation (%)', unit: '%', ref: '20–50' }
      ]
    },
    'Vitamins (B12, Folate, Vitamin D)': {
      type: 'panel_numeric',
      code: 'VITAMINS_PANEL',
      parameters: [
        { code: 'B12', name: 'Vitamin B12', unit: 'pg/mL', ref: '200–900' },
        { code: 'FOL', name: 'Folate', unit: 'ng/mL', ref: '2–20' },
        { code: 'VITD', name: 'Vitamin D (25-OH)', unit: 'ng/mL', ref: '30–100' }
      ]
    },
    'Cardiac Markers (Troponin, CK-MB)': {
      type: 'panel_numeric',
      code: 'CARDIAC_MARKERS_PANEL',
      parameters: [
        { code: 'TROP_I', name: 'Troponin I', unit: 'ng/mL', ref: '< 0.04' },
        { code: 'TROP_T', name: 'Troponin T', unit: 'ng/mL', ref: '< 0.01' },
        { code: 'CKMB', name: 'CK-MB', unit: 'U/L', ref: '< 6' },
        { code: 'BNP', name: 'BNP', unit: 'pg/mL', ref: '< 100' },
        { code: 'NTPROBNP', name: 'NT-proBNP', unit: 'pg/mL', ref: '< 125' },
        { code: 'MYO', name: 'Myoglobin', unit: 'ng/mL', ref: '25–72' }
      ]
    },
    // Individual cardiac markers (for backward compatibility if needed)
    'Troponin I': { type: 'numeric_single', code: 'TROP_I', unit: 'ng/mL', ref: '< 0.04' },
    'Troponin T': { type: 'numeric_single', code: 'TROP_T', unit: 'ng/mL', ref: '< 0.01' },
    'CK-MB': { type: 'numeric_single', code: 'CKMB', unit: 'U/L', ref: '< 6' },
    'BNP': { type: 'numeric_single', code: 'BNP', unit: 'pg/mL', ref: '< 100' },
    'NT-proBNP': { type: 'numeric_single', code: 'NTPROBNP', unit: 'pg/mL', ref: '< 125' },
    'Myoglobin': { type: 'numeric_single', code: 'MYO', unit: 'ng/mL', ref: '25–72' },
    'Amylase / Lipase': {
      type: 'panel_numeric',
      code: 'PANCREATIC_ENZYMES_PANEL',
      parameters: [
        { code: 'AMY', name: 'Amylase', unit: 'U/L', ref: '30–110' },
        { code: 'LIP', name: 'Lipase', unit: 'U/L', ref: '0–160' }
      ]
    },
    'Acid–Base Balance': {
      type: 'panel_numeric',
      code: 'ABG_PANEL',
      parameters: [
        { code: 'PH', name: 'pH', unit: '—', ref: '7.35–7.45' },
        { code: 'PCO2', name: 'pCO₂', unit: 'mmHg', ref: '35–45' },
        { code: 'PO2', name: 'pO₂', unit: 'mmHg', ref: '80–100' },
        { code: 'HCO3', name: 'HCO₃⁻', unit: 'mmol/L', ref: '22–26' },
        { code: 'BE', name: 'Base Excess', unit: 'mmol/L', ref: '-2 to +2' },
        { code: 'O2SAT', name: 'O₂ Saturation', unit: '%', ref: '95–100' },
        { code: 'TCO2', name: 'Total CO₂', unit: 'mmol/L', ref: '23–27' },
        { code: 'LAC', name: 'Lactate (optional)', unit: 'mmol/L', ref: '0.5–2.2' },
        { code: 'AG', name: 'Anion Gap (calc)', unit: 'mmol/L', ref: '8–16' },
        { code: 'ICA', name: 'Ionized Calcium', unit: 'mmol/L', ref: '1.12–1.32' }
      ]
    },
    'HbA1c': { type: 'numeric_single', code: 'HBA1C', unit: '%', ref: '< 5.7' },
    // Microbiology - Culture Panels
    'Blood Culture': {
      type: 'culture_panel',
      code: 'BLOOD_CULTURE',
      cultureType: 'blood',
      antibiotics: [
        'Ampicillin', 'Amoxiclav', 'Ceftriaxone', 'Ceftazidime', 'Cefotaxime',
        'Ciprofloxacin', 'Levofloxacin', 'Gentamicin', 'Amikacin', 'Meropenem',
        'Imipenem', 'Piperacillin-Tazobactam', 'Vancomycin (G+)', 'Linezolid (G+)'
      ]
    },
    'Urine Culture': {
      type: 'culture_panel',
      code: 'URINE_CULTURE',
      cultureType: 'urine',
      antibiotics: [
        'Ampicillin', 'Amoxiclav', 'Ceftriaxone', 'Ceftazidime', 'Cefotaxime',
        'Ciprofloxacin', 'Levofloxacin', 'Gentamicin', 'Amikacin', 'Meropenem',
        'Imipenem', 'Piperacillin-Tazobactam', 'Vancomycin (G+)', 'Linezolid (G+)'
      ]
    },
    'Stool Culture': {
      type: 'culture_panel',
      code: 'STOOL_CULTURE',
      cultureType: 'stool',
      antibiotics: [
        'Ampicillin', 'Amoxiclav', 'Ceftriaxone', 'Ceftazidime', 'Cefotaxime',
        'Ciprofloxacin', 'Levofloxacin', 'Gentamicin', 'Amikacin', 'Meropenem',
        'Imipenem', 'Piperacillin-Tazobactam', 'Vancomycin (G+)', 'Linezolid (G+)'
      ]
    },
    'Sputum / Respiratory Culture': {
      type: 'culture_panel',
      code: 'SPUTUM_CULTURE',
      cultureType: 'sputum',
      antibiotics: [
        'Ampicillin', 'Amoxiclav', 'Ceftriaxone', 'Ceftazidime', 'Cefotaxime',
        'Ciprofloxacin', 'Levofloxacin', 'Gentamicin', 'Amikacin', 'Meropenem',
        'Imipenem', 'Piperacillin-Tazobactam', 'Vancomycin (G+)', 'Linezolid (G+)'
      ]
    },
    'Wound / Pus Culture': {
      type: 'culture_panel',
      code: 'WOUND_CULTURE',
      cultureType: 'wound',
      antibiotics: [
        'Ampicillin', 'Amoxiclav', 'Ceftriaxone', 'Ceftazidime', 'Cefotaxime',
        'Ciprofloxacin', 'Levofloxacin', 'Gentamicin', 'Amikacin', 'Meropenem',
        'Imipenem', 'Piperacillin-Tazobactam', 'Vancomycin (G+)', 'Linezolid (G+)'
      ]
    },
    'Throat / Nasal Swab': {
      type: 'qualitative_or_culture',
      code: 'THROAT_NASAL_SWAB',
      testTypes: ['Rapid Strep Test', 'Throat Culture', 'Nasal Swab Culture', 'MRSA Screening', 'Other']
    },
    'Genital Swab Culture': {
      type: 'culture_panel',
      code: 'GENITAL_SWAB_CULTURE',
      cultureType: 'genital',
      antibiotics: ['Ceftriaxone', 'Azithromycin', 'Doxycycline', 'Ciprofloxacin']
    },
    'Fungal Culture': {
      type: 'culture_panel',
      code: 'FUNGAL_CULTURE',
      cultureType: 'fungal',
      antifungals: ['Fluconazole', 'Itraconazole', 'Voriconazole', 'Amphotericin B']
    },
    'AFB Smear': {
      type: 'qualitative',
      code: 'AFB_SMEAR',
      qualitativeType: 'afb_smear'
    },
    'GeneXpert MTB/RIF': {
      type: 'molecular_panel',
      code: 'GENEXPERT_MTB_RIF',
      parameters: [
        { code: 'MTB', name: 'MTB Detection' },
        { code: 'RIF', name: 'Rifampicin Resistance' },
        { code: 'SEMI_QUANT', name: 'Semi-Quantitative Category' }
      ]
    },
    'TB Culture': {
      type: 'culture_panel',
      code: 'TB_CULTURE',
      cultureType: 'tb',
      antiTBDrugs: ['Isoniazid (INH)', 'Rifampicin (RIF)', 'Ethambutol (EMB)', 'Pyrazinamide (PZA)', 'Streptomycin (SM)']
    },
    'Rapid Micro Tests': {
      type: 'qualitative_test',
      code: 'RAPID_MICRO_TEST',
      testTypes: [
        'COVID-19 Ag', 'Influenza A/B Ag', 'RSV Ag', 'Rotavirus Ag',
        'Adenovirus Ag', 'H. pylori Ag', 'Giardia Ag', 'Strep A Ag', 'Custom'
      ]
    },
    // Immunology Division Tests
    'Immunoglobulins (IgG, IgA, IgM, IgE)': {
      type: 'panel_numeric',
      code: 'IMMUNOGLOBULINS_PANEL',
      parameters: [
        { code: 'IGG', name: 'IgG', unit: 'g/L', ref: '7–16' },
        { code: 'IGA', name: 'IgA', unit: 'g/L', ref: '0.7–4.0' },
        { code: 'IGM', name: 'IgM', unit: 'g/L', ref: '0.4–2.3' },
        { code: 'IGE', name: 'Total IgE', unit: 'IU/mL', ref: '0–100' }
      ]
    },
    'ANA (Antinuclear Antibody)': {
      type: 'qualitative_with_titer',
      code: 'ANA',
      testName: 'ANA (Antinuclear Antibody)'
    },
    'Anti-dsDNA': {
      type: 'numeric_or_qualitative',
      code: 'DSDNA',
      unit: 'IU/mL',
      ref: '< 30'
    },
    'ENA Panel': {
      type: 'panel_numeric',
      code: 'ENA_PANEL',
      parameters: [
        { code: 'SM', name: 'Anti-Smith', unit: 'IU/mL', ref: '' },
        { code: 'RNP', name: 'Anti-RNP', unit: 'IU/mL', ref: '' },
        { code: 'SSA', name: 'Anti-SSA', unit: 'IU/mL', ref: '' },
        { code: 'SSB', name: 'Anti-SSB', unit: 'IU/mL', ref: '' }
      ]
    },
    'Complement System (C3, C4)': {
      type: 'panel_numeric',
      code: 'COMPLEMENT_PANEL',
      parameters: [
        { code: 'C3', name: 'C3 Complement', unit: 'g/L', ref: '0.9–1.8' },
        { code: 'C4', name: 'C4 Complement', unit: 'g/L', ref: '0.1–0.4' },
        { code: 'CH50', name: 'CH50 (optional)', unit: 'U/mL', ref: '23–46' }
      ]
    },
    'Inflammatory Markers (CRP, Procalcitonin)': {
      type: 'panel_numeric',
      code: 'INFLAMMATORY_PANEL',
      parameters: [
        { code: 'CRP', name: 'CRP', unit: 'mg/L', ref: '< 5' },
        { code: 'PCT', name: 'Procalcitonin', unit: 'ng/mL', ref: '< 0.05' },
        { code: 'ESR', name: 'ESR (optional)', unit: 'mm/hr', ref: 'M: <15; F: <20' }
      ]
    },
    'Rheumatology Tests (RF, Anti-CCP)': {
      type: 'panel_numeric',
      code: 'RHEUMATOLOGY_PANEL',
      parameters: [
        { code: 'RF', name: 'Rheumatoid Factor (RF)', unit: 'IU/mL', ref: '< 14' },
        { code: 'CCP', name: 'Anti-CCP', unit: 'U/mL', ref: '< 20' }
      ]
    },
    'Specific IgE Test': {
      type: 'numeric_single',
      code: 'SPECIFIC_IGE',
      unit: 'kU/L',
      ref: 'Class-based'
    },
    // Serology Division Tests
    'HIV': {
      type: 'qualitative',
      code: 'HIV',
      testName: 'HIV Screening'
    },
    'Hepatitis B Panel': {
      type: 'panel_qualitative',
      code: 'HEP_B_PANEL',
      parameters: [
        { code: 'HBSAG', name: 'HBsAg', type: 'qualitative' },
        { code: 'ANTI_HBS', name: 'Anti-HBs', type: 'numeric', unit: 'IU/mL', ref: '>10 IU/mL = immune' },
        { code: 'ANTI_HBC', name: 'Anti-HBc Total', type: 'qualitative' },
        { code: 'HBEAG', name: 'HBeAg', type: 'qualitative' },
        { code: 'ANTI_HBE', name: 'Anti-HBe', type: 'qualitative' }
      ]
    },
    'Hepatitis C': {
      type: 'qualitative',
      code: 'HEP_C',
      testName: 'Hepatitis C (Anti-HCV)'
    },
    'COVID Serology': {
      type: 'qualitative_or_numeric',
      code: 'COVID_SEROLOGY',
      testSubtype: 'covid'
    },
    'EBV / CMV Serology': {
      type: 'panel_qualitative',
      code: 'EBV_CMV_PANEL',
      parameters: [
        { code: 'CMV_IGM', name: 'CMV IgM', type: 'qualitative' },
        { code: 'CMV_IGG', name: 'CMV IgG', type: 'qualitative' },
        { code: 'EBV_VCA_IGM', name: 'EBV VCA IgM', type: 'qualitative' },
        { code: 'EBV_VCA_IGG', name: 'EBV VCA IgG', type: 'qualitative' },
        { code: 'EBNA_IGG', name: 'EBNA IgG', type: 'qualitative' },
        { code: 'IGG_AVIDITY', name: 'IgG Avidity', type: 'numeric', unit: 'IU/mL' }
      ]
    },
    'Syphilis (TPHA / RPR)': {
      type: 'qualitative_or_titer',
      code: 'SYPHILIS'
    },
    'Typhoid (Widal Test)': {
      type: 'titer_panel',
      code: 'TYPHOID_WIDAL',
      parameters: [
        { code: 'TYPHI_O', name: 'S. Typhi O titer' },
        { code: 'TYPHI_H', name: 'S. Typhi H titer' },
        { code: 'PARA_A_H', name: 'S. Paratyphi A H' },
        { code: 'PARA_B_H', name: 'S. Paratyphi B H' }
      ]
    },
    'Brucella Serology': {
      type: 'titer_test',
      code: 'BRUCELLA'
    },
    'Toxoplasma': {
      type: 'qualitative_or_numeric',
      code: 'TOXOPLASMA',
      testSubtype: 'parasitic'
    },
    'Malaria': {
      type: 'qualitative_or_numeric',
      code: 'MALARIA',
      testSubtype: 'parasitic'
    },
    'TORCH Panel': {
      type: 'panel_qualitative',
      code: 'TORCH_PANEL',
      parameters: [
        { code: 'TOXO_IGG', name: 'Toxoplasma IgG', type: 'qualitative' },
        { code: 'TOXO_IGM', name: 'Toxoplasma IgM', type: 'qualitative' },
        { code: 'RUBELLA_IGG', name: 'Rubella IgG', type: 'qualitative' },
        { code: 'RUBELLA_IGM', name: 'Rubella IgM', type: 'qualitative' },
        { code: 'CMV_IGG', name: 'CMV IgG', type: 'qualitative' },
        { code: 'CMV_IGM', name: 'CMV IgM', type: 'qualitative' },
        { code: 'HSV1_IGG', name: 'HSV-1 IgG', type: 'qualitative' },
        { code: 'HSV1_IGM', name: 'HSV-1 IgM', type: 'qualitative' },
        { code: 'HSV2_IGG', name: 'HSV-2 IgG', type: 'qualitative' },
        { code: 'HSV2_IGM', name: 'HSV-2 IgM', type: 'qualitative' }
      ]
    },
    'Dengue Panel': {
      type: 'panel_qualitative',
      code: 'DENGUE_PANEL',
      parameters: [
        { code: 'NS1', name: 'NS1 Antigen', type: 'qualitative' },
        { code: 'DENGUE_IGM', name: 'Dengue IgM', type: 'qualitative' },
        { code: 'DENGUE_IGG', name: 'Dengue IgG', type: 'qualitative' }
      ]
    },
    'Chikungunya': {
      type: 'panel_qualitative',
      code: 'CHIKUNGUNYA_PANEL',
      parameters: [
        { code: 'CHIK_IGM', name: 'Chikungunya IgM', type: 'qualitative' },
        { code: 'CHIK_IGG', name: 'Chikungunya IgG', type: 'qualitative' }
      ]
    },
    'Zika Virus': {
      type: 'panel_qualitative',
      code: 'ZIKA_PANEL',
      parameters: [
        { code: 'ZIKA_IGM', name: 'Zika IgM', type: 'qualitative' },
        { code: 'ZIKA_IGG', name: 'Zika IgG', type: 'qualitative' }
      ]
    },
    'H. pylori IgG': {
      type: 'qualitative_or_numeric',
      code: 'H_PYLORI_IGG',
      testSubtype: 'h_pylori'
    },
    'H. pylori Antigen': {
      type: 'qualitative',
      code: 'H_PYLORI_AG'
    },
    'H. pylori Breath Test': {
      type: 'qualitative',
      code: 'H_PYLORI_BREATH'
    },
    // Urinalysis Division Tests
    'Urine Dipstick (Chemical)': {
      type: 'urine_dipstick',
      code: 'URINE_DIPSTICK'
    },
    'Urine Microscopy': {
      type: 'urine_microscopy',
      code: 'URINE_MICROSCOPY'
    },
    '24-hour Urine Tests': {
      type: 'urine_24h',
      code: 'URINE_24H',
      parameters: [
        { code: 'PROT24', name: 'Protein (24h)', unit: 'mg/24h', ref: '< 150' },
        { code: 'CREAT24', name: 'Creatinine (24h)', unit: 'mg/24h', ref: '500–2000' },
        { code: 'CA24', name: 'Calcium (24h)', unit: 'mg/24h', ref: '100–300' },
        { code: 'UREA24', name: 'Urea (24h)', unit: 'g/24h', ref: '12–20' },
        { code: 'NA24', name: 'Sodium (24h)', unit: 'mmol/24h', ref: '40–220' },
        { code: 'K24', name: 'Potassium (24h)', unit: 'mmol/24h', ref: '25–125' }
      ]
    },
    'Protein/Creatinine Ratio': {
      type: 'urine_upcr',
      code: 'URINE_UPCR'
    },
    'Microalbuminuria': {
      type: 'urine_microalbumin',
      code: 'URINE_MICROALBUMIN'
    },
    // Hormones Division Tests
    'Thyroid Panel': {
      type: 'thyroid_panel',
      code: 'THYROID_PANEL',
      parameters: [
        { code: 'TSH', name: 'TSH', unit: 'µIU/mL', ref: '0.4–4.0' },
        { code: 'FT4', name: 'Free T4', unit: 'ng/dL', ref: '0.8–1.8' },
        { code: 'FT3', name: 'Free T3', unit: 'pg/mL', ref: '2.3–4.2' },
        { code: 'TT3', name: 'Total T3 (optional)', unit: 'ng/dL', ref: '70–200' },
        { code: 'TT4', name: 'Total T4 (optional)', unit: 'µg/dL', ref: '4.5–12.0' },
        { code: 'ANTI_TPO', name: 'Anti-TPO (optional)', unit: 'IU/mL', ref: '< 60' },
        { code: 'ANTI_TG', name: 'Anti-Tg (optional)', unit: 'IU/mL', ref: '< 40' }
      ]
    },
    'Female Reproductive Hormones': {
      type: 'female_reproductive_hormones',
      code: 'FEMALE_REPRO_HORMONES',
      parameters: [
        { code: 'FSH', name: 'FSH', unit: 'mIU/mL', ref: 'Follicular: 3–10' },
        { code: 'LH', name: 'LH', unit: 'mIU/mL', ref: 'Follicular: 2–12' },
        { code: 'E2', name: 'Estradiol (E2)', unit: 'pg/mL', ref: 'Follicular: 30–120' },
        { code: 'PRG', name: 'Progesterone', unit: 'ng/mL', ref: 'Follicular: <1.5' },
        { code: 'PRL', name: 'Prolactin', unit: 'ng/mL', ref: '4–23' },
        { code: 'AMH', name: 'AMH (Ovarian reserve)', unit: 'ng/mL', ref: 'Age-dependent' }
      ]
    },
    'Male Reproductive Hormones': {
      type: 'male_reproductive_hormones',
      code: 'MALE_REPRO_HORMONES',
      parameters: [
        { code: 'TESTO', name: 'Testosterone (Total)', unit: 'ng/dL', ref: '300–1000' },
        { code: 'FTES', name: 'Free Testosterone', unit: 'pg/mL', ref: '9–30' },
        { code: 'LH', name: 'LH', unit: 'mIU/mL', ref: '1.5–9' },
        { code: 'FSH', name: 'FSH', unit: 'mIU/mL', ref: '1–12' },
        { code: 'PRL', name: 'Prolactin', unit: 'ng/mL', ref: '4–15' },
        { code: 'E2', name: 'Estradiol (E2)', unit: 'pg/mL', ref: '10–40' }
      ]
    },
    'Cortisol': {
      type: 'cortisol',
      code: 'CORTISOL'
    },
    'ACTH': {
      type: 'acth',
      code: 'ACTH'
    },
    'DHEA-S': {
      type: 'dheas',
      code: 'DHEAS'
    },
    'Growth Hormone (GH)': {
      type: 'growth_hormone',
      code: 'GH'
    },
    'IGF-1': {
      type: 'igf1',
      code: 'IGF1'
    },
    'Metabolic Hormones (Insulin-related)': {
      type: 'metabolic_hormones',
      code: 'METABOLIC_HORMONES',
      parameters: [
        { code: 'INS', name: 'Insulin (Fasting)', unit: 'µIU/mL', ref: '2–20' },
        { code: 'CPEP', name: 'C-Peptide', unit: 'ng/mL', ref: '0.5–2.0' }
      ]
    },
    'β-hCG (Quantitative)': {
      type: 'beta_hcg_quantitative',
      code: 'BETA_HCG_QUANT'
    },
    'hCG Qualitative (Rapid)': {
      type: 'hcg_qualitative',
      code: 'HCG_QUAL'
    },
    // Tumor Markers Division Tests
    'GI Tumor Markers': {
      type: 'gi_tumor_markers',
      code: 'GI_TUMOR_MARKERS',
      parameters: [
        { code: 'AFP', name: 'AFP (Alpha-fetoprotein)', unit: 'ng/mL', ref: '< 10' },
        { code: 'CEA', name: 'CEA (Carcinoembryonic Antigen)', unit: 'ng/mL', ref: '< 5' },
        { code: 'CA199', name: 'CA19-9', unit: 'U/mL', ref: '< 37' }
      ]
    },
    'CA15-3': {
      type: 'numeric_single',
      code: 'CA153',
      unit: 'U/mL',
      ref: '< 30'
    },
    'CA-125': {
      type: 'numeric_single',
      code: 'CA125',
      unit: 'U/mL',
      ref: '< 35'
    },
    'PSA Panel': {
      type: 'psa_panel',
      code: 'PSA_PANEL',
      parameters: [
        { code: 'PSA', name: 'Total PSA', unit: 'ng/mL', ref: '< 4' },
        { code: 'FPSA', name: 'Free PSA', unit: 'ng/mL', ref: 'n/a' }
      ]
    },
    'Testicular Cancer Markers': {
      type: 'testicular_cancer_markers',
      code: 'TESTICULAR_MARKERS',
      parameters: [
        { code: 'BHCG_TUMOR', name: 'β-hCG', unit: 'mIU/mL', ref: '< 5' },
        { code: 'AFP', name: 'AFP', unit: 'ng/mL', ref: '< 10' },
        { code: 'LDH', name: 'LDH', unit: 'U/L', ref: '140–280' }
      ]
    },
    'NSE': {
      type: 'numeric_single',
      code: 'NSE',
      unit: 'ng/mL',
      ref: '< 12.5'
    },
    'ProGRP': {
      type: 'numeric_single',
      code: 'PROGRP',
      unit: 'pg/mL',
      ref: '< 65'
    },
    'Thyroglobulin': {
      type: 'numeric_single',
      code: 'TG',
      unit: 'ng/mL',
      ref: 'undetectable after thyroid removal'
    },
    // Blood Bank Division Tests
    'Blood Group & Rh Typing': {
      type: 'blood_group_rh',
      code: 'BLOOD_GROUP_RH'
    },
    'Antibody Screening (IAT)': {
      type: 'antibody_screening',
      code: 'ANTIBODY_SCREEN'
    },
    'Crossmatch (Compatibility Testing)': {
      type: 'crossmatch',
      code: 'CROSSMATCH',
      parameters: [
        { code: 'MAJOR', name: 'Major Crossmatch', result: '', reactionStrength: '' },
        { code: 'MINOR', name: 'Minor Crossmatch', result: '', reactionStrength: '' }
      ]
    },
    'Direct Coombs Test (DAT)': {
      type: 'direct_coombs',
      code: 'DIRECT_COOMBS'
    },
    'Indirect Coombs Test (IAT)': {
      type: 'indirect_coombs',
      code: 'INDIRECT_COOMBS'
    },
    'Major & Minor Crossmatch (Detailed Panel)': {
      type: 'major_minor_crossmatch',
      code: 'MAJOR_MINOR_CROSSMATCH',
      parameters: [
        { code: 'MAJOR', name: 'Major Crossmatch', result: '', reactionStrength: '' },
        { code: 'MINOR', name: 'Minor Crossmatch', result: '', reactionStrength: '' }
      ]
    },
    'Donor Screening Tests': {
      type: 'donor_screening',
      code: 'DONOR_SCREENING',
      parameters: [
        { code: 'HBSAG', name: 'HBsAg', result: '', allowNumeric: false },
        { code: 'ANTI_HCV', name: 'Anti-HCV', result: '', allowNumeric: false },
        { code: 'HIV', name: 'HIV 1/2', result: '', allowNumeric: false },
        { code: 'SYPHILIS', name: 'Syphilis (RPR/TPHA)', result: '', allowNumeric: false },
        { code: 'MALARIA', name: 'Malaria', result: '', allowNumeric: false },
        { code: 'ALT', name: 'ALT (optional)', result: '', allowNumeric: true }
      ]
    },
    // Coagulation Division Tests
    'Basic Coagulation Panel': {
      type: 'basic_coagulation_panel',
      code: 'BASIC_COAG_PANEL',
      parameters: [
        { code: 'PT', name: 'PT (Prothrombin Time)', unit: 'sec', ref: '~ 11–15 sec' },
        { code: 'ISI', name: 'Thromboplastin reagent ISI (optional)', unit: '', ref: '' },
        { code: 'APTT', name: 'aPTT (Activated Partial Thromboplastin Time)', unit: 'sec', ref: '~ 25–35 sec' },
        { code: 'TT', name: 'Thrombin Time (TT)', unit: 'sec', ref: '~ 12–18 sec' },
        { code: 'FIB', name: 'Fibrinogen Level', unit: 'g/L', ref: '2.0–4.0' }
      ]
    },
    'D-Dimer': {
      type: 'd_dimer',
      code: 'D_DIMER'
    },
    'Coagulation Factor Assays': {
      type: 'coagulation_factor_assays',
      code: 'COAG_FACTORS',
      parameters: [
        { code: 'F8', name: 'Factor VIII (FVIII)', unit: '%', ref: '50–150%' },
        { code: 'F9', name: 'Factor IX (FIX)', unit: '%', ref: '50–150%' },
        { code: 'F7', name: 'Factor VII (FVII)', unit: '%', ref: '50–150%' },
        { code: 'F11', name: 'Factor XI (FXI)', unit: '%', ref: '50–150%' },
        { code: 'F12', name: 'Factor XII (FXII)', unit: '%', ref: '50–150%' }
      ]
    },
    'Mixing Studies (PT, aPTT)': {
      type: 'mixing_studies',
      code: 'MIXING_STUDIES'
    },
    'Bleeding Profile / Platelet Function Tests': {
      type: 'bleeding_profile',
      code: 'BLEEDING_PROFILE',
      parameters: [
        { code: 'BT', name: 'Bleeding Time', unit: 'min', ref: '2–9' },
        { code: 'CT', name: 'Clotting Time', unit: 'min', ref: '8–15' },
        { code: 'CEPI', name: 'PFA-100 (CEPI)', unit: 'sec', ref: '80–180' },
        { code: 'CADP', name: 'PFA-100 (CADP)', unit: 'sec', ref: '60–120' }
      ]
    },
    // Clinical Toxicology Division Tests
    'Urine Drug Screening Panel': {
      type: 'urine_drug_screening',
      code: 'URINE_DRUG_SCREEN',
      parameters: [
        { code: 'AMP', name: 'Amphetamines', result: '' },
        { code: 'METH', name: 'Methamphetamines', result: '' },
        { code: 'OPI', name: 'Opiates', result: '' },
        { code: 'MOR', name: 'Morphine', result: '' },
        { code: 'MTD', name: 'Methadone', result: '' },
        { code: 'COC', name: 'Cocaine (Benzoylecgonine)', result: '' },
        { code: 'THC', name: 'THC (Cannabis/Marijuana)', result: '' },
        { code: 'BZO', name: 'Benzodiazepines', result: '' },
        { code: 'BAR', name: 'Barbiturates', result: '' },
        { code: 'TCA', name: 'Tricyclic Antidepressants', result: '' },
        { code: 'BUP', name: 'Buprenorphine', result: '' },
        { code: 'FEN', name: 'Fentanyl', result: '' },
        { code: 'MDMA', name: 'MDMA / Ecstasy', result: '' },
        { code: 'PCP', name: 'PCP (Phencyclidine)', result: '' }
      ]
    },
    'Confirmatory Toxicology (GC/MS or LC/MS)': {
      type: 'confirmatory_toxicology',
      code: 'CONFIRMATORY_TOX',
      parameters: [
        { code: 'AMP_Q', name: 'Amphetamines (quantitative)', unit: 'ng/mL', cutoffLevel: '' },
        { code: 'THC_COOH', name: 'THC-COOH (quantitative)', unit: 'ng/mL', cutoffLevel: '' },
        { code: 'COC_MET', name: 'Cocaine metabolites', unit: 'ng/mL', cutoffLevel: '' },
        { code: 'MOR_Q', name: 'Morphine', unit: 'ng/mL', cutoffLevel: '' },
        { code: 'CODEINE', name: 'Codeine', unit: 'ng/mL', cutoffLevel: '' },
        { code: 'HYDROCODONE', name: 'Hydrocodone', unit: 'ng/mL', cutoffLevel: '' }
      ]
    },
    'Therapeutic Drug Monitoring (TDM)': {
      type: 'therapeutic_drug_monitoring',
      code: 'TDM'
    },
    'Ethanol (Blood Alcohol Level)': {
      type: 'ethanol',
      code: 'ETHANOL'
    },
    'Breath Alcohol': {
      type: 'breath_alcohol',
      code: 'BREATH_ALCOHOL'
    },
    'Toxic Alcohols (Methanol, Ethylene Glycol)': {
      type: 'toxic_alcohols',
      code: 'TOXIC_ALCOHOLS',
      parameters: [
        { code: 'METHAL', name: 'Methanol', unit: 'mg/dL', ref: '0' },
        { code: 'EG', name: 'Ethylene Glycol', unit: 'mg/dL', ref: '0' },
        { code: 'ISO', name: 'Isopropanol (optional)', unit: 'mg/dL', ref: '0' },
        { code: 'OGAP', name: 'Osmolal Gap', unit: 'mOsm/kg', ref: '< 10' }
      ]
    },
    'Heavy Metals Panel': {
      type: 'heavy_metals_panel',
      code: 'HEAVY_METALS',
      parameters: [
        { code: 'Pb', name: 'Lead', unit: 'µg/dL', ref: '< 5' },
        { code: 'Hg', name: 'Mercury', unit: 'µg/L', ref: '< 10' },
        { code: 'As', name: 'Arsenic', unit: 'µg/L', ref: '< 50' },
        { code: 'Cd', name: 'Cadmium', unit: 'µg/L', ref: '< 5' },
        { code: 'Cr', name: 'Chromium (optional)', unit: 'µg/L', ref: 'varies' }
      ]
    },
    // Fertility Division Tests
    'Female Fertility Hormone Panel': {
      type: 'female_fertility_hormone_panel',
      code: 'FEMALE_FERTILITY_PANEL',
      parameters: [
        { code: 'FSH', name: 'FSH', unit: 'mIU/mL', ref: '3–10' },
        { code: 'LH', name: 'LH', unit: 'mIU/mL', ref: '2–12' },
        { code: 'E2', name: 'Estradiol (E2)', unit: 'pg/mL', ref: '30–120' },
        { code: 'PRG', name: 'Progesterone', unit: 'ng/mL', ref: '< 1.5' },
        { code: 'PRL', name: 'Prolactin', unit: 'ng/mL', ref: '4–23' },
        { code: 'TESTO', name: 'Testosterone (Total)', unit: 'ng/dL', ref: '20–70' },
        { code: 'DHEAS', name: 'DHEA-S', unit: 'µg/dL', ref: 'age-dependent' }
      ]
    },
    'Male Fertility Hormone Panel': {
      type: 'male_fertility_hormone_panel',
      code: 'MALE_FERTILITY_PANEL',
      parameters: [
        { code: 'TESTO', name: 'Testosterone (Total)', unit: 'ng/dL', ref: '300–1000' },
        { code: 'FTES', name: 'Free Testosterone', unit: 'pg/mL', ref: '9–30' },
        { code: 'LH', name: 'LH', unit: 'mIU/mL', ref: '1.5–9' },
        { code: 'FSH', name: 'FSH', unit: 'mIU/mL', ref: '1–12' },
        { code: 'PRL', name: 'Prolactin', unit: 'ng/mL', ref: '4–15' },
        { code: 'E2', name: 'Estradiol', unit: 'pg/mL', ref: '10–40' }
      ]
    },
    'Ovarian Reserve Tests': {
      type: 'ovarian_reserve_tests',
      code: 'OVARIAN_RESERVE',
      parameters: [
        { code: 'AMH', name: 'AMH (Anti-Müllerian Hormone)', unit: 'ng/mL', ref: 'age-dependent' },
        { code: 'AFC', name: 'Antral Follicle Count (Ultrasound)', unit: 'count', ref: '8–15' },
        { code: 'FSH', name: 'FSH (cycle day 2–3)', unit: 'mIU/mL', ref: '3–10' }
      ]
    },
    'Progesterone Day 21 Test': {
      type: 'progesterone_day21',
      code: 'PRG_DAY21'
    },
    'LH Surge Test (Urine LH)': {
      type: 'lh_surge_test',
      code: 'LH_SURGE'
    },
    'Estradiol Rising Pattern': {
      type: 'estradiol_rising_pattern',
      code: 'E2_RISING'
    },
    'Semen Analysis (Sperm Test)': {
      type: 'semen_analysis',
      code: 'SEMEN_ANALYSIS'
    },
    // Molecular Diagnostics Division Tests
    'Respiratory PCR Panel': {
      type: 'respiratory_pcr_panel',
      code: 'RESP_PCR_PANEL',
      parameters: [
        { code: 'COVID', name: 'SARS-CoV-2', result: '', ctValue: '', viralLoad: '' },
        { code: 'FLUA', name: 'Influenza A', result: '', ctValue: '', viralLoad: '' },
        { code: 'FLUB', name: 'Influenza B', result: '', ctValue: '', viralLoad: '' },
        { code: 'RSV', name: 'RSV A/B', result: '', ctValue: '', viralLoad: '' },
        { code: 'ADV', name: 'Adenovirus', result: '', ctValue: '', viralLoad: '' },
        { code: 'PARA', name: 'Parainfluenza 1–4', result: '', ctValue: '', viralLoad: '' },
        { code: 'HMPV', name: 'Human Metapneumovirus', result: '', ctValue: '', viralLoad: '' },
        { code: 'RHINO', name: 'Rhinovirus / Enterovirus', result: '', ctValue: '', viralLoad: '' },
        { code: 'BPERT', name: 'Bordetella pertussis', result: '', ctValue: '', viralLoad: '' }
      ]
    },
    'Gastrointestinal PCR Panel': {
      type: 'gastrointestinal_pcr_panel',
      code: 'GI_PCR_PANEL',
      parameters: [
        { code: 'SALM', name: 'Salmonella', result: '', ctValue: '' },
        { code: 'SHIG', name: 'Shigella', result: '', ctValue: '' },
        { code: 'CAMP', name: 'Campylobacter', result: '', ctValue: '' },
        { code: 'ECOLI', name: 'E. coli (ETEC, STEC)', result: '', ctValue: '' },
        { code: 'CDIFF', name: 'Clostridium difficile toxin A/B', result: '', ctValue: '' },
        { code: 'ROTA', name: 'Rotavirus', result: '', ctValue: '' },
        { code: 'NORO', name: 'Norovirus', result: '', ctValue: '' },
        { code: 'ADV4041', name: 'Adenovirus 40/41', result: '', ctValue: '' },
        { code: 'ASTRO', name: 'Astrovirus', result: '', ctValue: '' },
        { code: 'SAPO', name: 'Sapovirus', result: '', ctValue: '' },
        { code: 'GIARDIA', name: 'Giardia lamblia', result: '', ctValue: '' },
        { code: 'CRYPTO', name: 'Cryptosporidium', result: '', ctValue: '' },
        { code: 'ENTAMOEBA', name: 'Entamoeba histolytica', result: '', ctValue: '' }
      ]
    },
    'Urogenital / STI PCR Panel': {
      type: 'urogenital_sti_pcr_panel',
      code: 'STI_PCR_PANEL',
      parameters: [
        { code: 'CT', name: 'Chlamydia trachomatis', result: '', ctValue: '' },
        { code: 'NG', name: 'Neisseria gonorrhoeae', result: '', ctValue: '' },
        { code: 'MG', name: 'Mycoplasma genitalium', result: '', ctValue: '' },
        { code: 'UU', name: 'Ureaplasma urealyticum', result: '', ctValue: '' },
        { code: 'TV', name: 'Trichomonas vaginalis', result: '', ctValue: '' },
        { code: 'HSV1', name: 'HSV-1', result: '', ctValue: '' },
        { code: 'HSV2', name: 'HSV-2', result: '', ctValue: '' }
      ]
    },
    'TB / Mycobacteria PCR (GeneXpert)': {
      type: 'tb_mycobacteria_pcr',
      code: 'TB_PCR'
    },
    'HBV DNA PCR': {
      type: 'hepatitis_viral_load',
      code: 'HBV_DNA'
    },
    'HCV RNA PCR': {
      type: 'hepatitis_viral_load',
      code: 'HCV_RNA'
    },
    'HIV Viral Load': {
      type: 'hiv_viral_load',
      code: 'HIV_VL'
    },
    'HPV PCR & Genotyping': {
      type: 'hpv_pcr_genotyping',
      code: 'HPV_PCR',
      parameters: [
        { code: 'HPV16', name: 'HPV 16', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV18', name: 'HPV 18', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV31', name: 'HPV 31', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV33', name: 'HPV 33', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV35', name: 'HPV 35', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV39', name: 'HPV 39', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV45', name: 'HPV 45', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV51', name: 'HPV 51', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV52', name: 'HPV 52', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV56', name: 'HPV 56', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV58', name: 'HPV 58', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV59', name: 'HPV 59', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV68', name: 'HPV 68', isHighRisk: true, result: '', ctValue: '' },
        { code: 'HPV6', name: 'HPV 6', isHighRisk: false, result: '', ctValue: '' },
        { code: 'HPV11', name: 'HPV 11', isHighRisk: false, result: '', ctValue: '' }
      ]
    },
    'COVID-19 PCR (Standalone Test)': {
      type: 'covid19_pcr',
      code: 'COVID19_PCR'
    },
    'Oncology Molecular Panels': {
      type: 'oncology_molecular_panels',
      code: 'ONCO_MOL_PANEL',
      parameters: [
        { code: 'EGFR', name: 'EGFR mutation panel', result: '', variantName: '', alleleFrequency: '' },
        { code: 'KRAS', name: 'KRAS mutation panel', result: '', variantName: '', alleleFrequency: '' },
        { code: 'BRAF', name: 'BRAF V600E', result: '', variantName: '', alleleFrequency: '' },
        { code: 'JAK2', name: 'JAK2 V617F', result: '', variantName: '', alleleFrequency: '' },
        { code: 'BRCA1', name: 'BRCA1/2', result: '', variantName: '', alleleFrequency: '' }
      ]
    },
    // POCT Division Tests
    'Glucose Monitoring (Glucometer)': {
      type: 'glucose_monitoring_poct',
      code: 'GLUCOSE_POCT'
    },
    'POCT HbA1c': {
      type: 'poct_hba1c',
      code: 'HBA1C_POCT'
    },
    'POCT ABG (Arterial Blood Gas)': {
      type: 'poct_abg',
      code: 'ABG_POCT',
      parameters: [
        { code: 'PH', name: 'pH', unit: '—', ref: '7.35–7.45' },
        { code: 'PCO2', name: 'pCO₂', unit: 'mmHg', ref: '35–45' },
        { code: 'PO2', name: 'pO₂', unit: 'mmHg', ref: '80–100' },
        { code: 'HCO3', name: 'HCO₃⁻', unit: 'mmol/L', ref: '22–26' },
        { code: 'BE', name: 'Base Excess', unit: 'mmol/L', ref: '-2 to +2' },
        { code: 'LAC', name: 'Lactate (optional)', unit: 'mmol/L', ref: '< 2.0' },
        { code: 'O2SAT', name: 'O₂ Saturation', unit: '%', ref: '95–100' },
        { code: 'NA', name: 'Sodium (Na⁺)', unit: 'mmol/L', ref: '135–145' },
        { code: 'K', name: 'Potassium (K⁺)', unit: 'mmol/L', ref: '3.5–5.1' },
        { code: 'CL', name: 'Chloride (Cl⁻)', unit: 'mmol/L', ref: '98–107' },
        { code: 'ICA', name: 'Ionized Calcium (iCa²⁺)', unit: 'mmol/L', ref: '1.12–1.32' },
        { code: 'GLU', name: 'Glucose', unit: 'mg/dL', ref: '70–100' }
      ]
    },
    'Rapid Infectious Tests (POCT)': {
      type: 'rapid_infectious_tests_poct',
      code: 'RAPID_INFECTIOUS_POCT'
    },
    'POCT Cardiac Markers': {
      type: 'poct_cardiac_markers',
      code: 'CARDIAC_POCT'
    },
    'Electrolytes (POCT)': {
      type: 'electrolytes_poct',
      code: 'ELECTROLYTES_POCT',
      parameters: [
        { code: 'NA', name: 'Sodium (Na⁺)', unit: 'mmol/L', ref: '135–145' },
        { code: 'K', name: 'Potassium (K⁺)', unit: 'mmol/L', ref: '3.5–5.1' },
        { code: 'CL', name: 'Chloride (Cl⁻)', unit: 'mmol/L', ref: '98–107' },
        { code: 'ICA', name: 'Ionized Calcium', unit: 'mmol/L', ref: '1.12–1.32' },
        { code: 'MG', name: 'Magnesium (optional)', unit: 'mmol/L', ref: '0.7–1.1' },
        { code: 'GLU', name: 'Glucose', unit: 'mg/dL', ref: '70–100' },
        { code: 'LAC', name: 'Lactate', unit: 'mmol/L', ref: '< 2.0' },
        { code: 'HCT', name: 'Hematocrit / Hemoglobin', unit: '% / g/dL', ref: 'varies' }
      ]
    },
    'Urine POCT (Rapid Urine Stick)': {
      type: 'urine_poct',
      code: 'URINE_POCT',
      parameters: [
        { code: 'GLU', name: 'Glucose', result: '' },
        { code: 'PROT', name: 'Protein', result: '' },
        { code: 'KET', name: 'Ketones', result: '' },
        { code: 'BLD', name: 'Blood', result: '' },
        { code: 'NIT', name: 'Nitrite', result: '' },
        { code: 'LE', name: 'Leukocyte esterase', result: '' },
        { code: 'PH', name: 'pH', result: '' },
        { code: 'SG', name: 'Specific gravity', result: '' }
      ]
    },
    'Pregnancy Test (hCG POCT)': {
      type: 'pregnancy_test_poct',
      code: 'PREGNANCY_POCT'
    },
    'POCT Coagulation (INR Devices)': {
      type: 'poct_coagulation',
      code: 'COAG_POCT'
    },
    'CRP (C-Reactive Protein POCT)': {
      type: 'other_poct_devices',
      code: 'CRP_POCT'
    },
    'ESR POCT': {
      type: 'other_poct_devices',
      code: 'ESR_POCT'
    },
    'Lactate POCT': {
      type: 'other_poct_devices',
      code: 'LACTATE_POCT'
    },
    'Blood Ketones (β-Hydroxybutyrate)': {
      type: 'other_poct_devices',
      code: 'KETONES_POCT'
    },
    'Microalbumin POCT': {
      type: 'other_poct_devices',
      code: 'MICROALBUMIN_POCT'
    },
    // Flow Cytometry Division Tests
    'Lymphocyte Subset Panel (CD4 / CD8)': {
      type: 'lymphocyte_subset_panel',
      code: 'LYMPH_SUBSET_PANEL',
      parameters: [
        { code: 'WBC', name: 'Total WBC', unit: '/µL', ref: '' },
        { code: 'LYMPH', name: 'Total Lymphocyte Count', unit: '/µL', ref: '' },
        { code: 'CD3A', name: 'CD3 Absolute Count', unit: 'cells/µL', ref: '' },
        { code: 'CD3P', name: 'CD3 %', unit: '%', ref: '' },
        { code: 'CD4A', name: 'CD4 Absolute Count', unit: 'cells/µL', ref: '500–1500' },
        { code: 'CD4P', name: 'CD4 %', unit: '%', ref: '' },
        { code: 'CD8A', name: 'CD8 Absolute Count', unit: 'cells/µL', ref: '' },
        { code: 'CD8P', name: 'CD8 %', unit: '%', ref: '' },
        { code: 'CD4R', name: 'CD4/CD8 Ratio', unit: 'ratio', ref: '1.0–3.0' }
      ]
    },
    'Leukemia/Lymphoma Immunophenotyping': {
      type: 'leukemia_lymphoma_immunophenotyping',
      code: 'LEUKEMIA_LYMPHOMA_PHENOTYPING'
    },
    'HLA-B27 by Flow Cytometry': {
      type: 'hla_b27_flow_cytometry',
      code: 'HLA_B27_FLOW'
    },
    'Stem Cell Enumeration (CD34 Count)': {
      type: 'stem_cell_enumeration',
      code: 'STEM_CELL_ENUM',
      parameters: [
        { code: 'WBC', name: 'Total WBC', unit: '/µL', ref: '' },
        { code: 'TNC', name: 'Total Nucleated Cells', unit: '/µL', ref: '' },
        { code: 'CD34A', name: 'CD34 Absolute Count', unit: 'cells/µL', ref: '' },
        { code: 'CD34P', name: 'CD34 %', unit: '%', ref: '' },
        { code: 'VIA', name: 'Viability', unit: '%', ref: '' }
      ]
    },
    'Minimal Residual Disease (MRD)': {
      type: 'minimal_residual_disease',
      code: 'MRD'
    },
    'Paroxysmal Nocturnal Hemoglobinuria (PNH Panel)': {
      type: 'pnh_panel',
      code: 'PNH_PANEL',
      parameters: [
        { code: 'PNH_RBC', name: '% PNH clone in RBCs', unit: '%', ref: '' },
        { code: 'PNH_GRAN', name: '% PNH clone in granulocytes', unit: '%', ref: '' },
        { code: 'PNH_MONO', name: '% PNH clone in monocytes', unit: '%', ref: '' },
        { code: 'FLAER', name: 'FLAER binding', unit: '', ref: '' }
      ]
    },
    // Cytogenetics Division Tests
    'Conventional Karyotyping (G-banding)': {
      type: 'conventional_karyotyping',
      code: 'KARYOTYPING'
    },
    'Rapid Aneuploidy Detection (QF-PCR)': {
      type: 'rapid_aneuploidy_detection',
      code: 'QF_PCR'
    },
    'FISH Panels': {
      type: 'fish_panels',
      code: 'FISH_PANELS'
    },
    'Chromosomal Microarray (CMA / aCGH)': {
      type: 'chromosomal_microarray',
      code: 'CMA_ACGH'
    },
    'Prenatal Cytogenetics': {
      type: 'prenatal_cytogenetics',
      code: 'PRENATAL_CYTO'
    },
    'Postnatal/Constitutional Cytogenetics': {
      type: 'postnatal_constitutional_cytogenetics',
      code: 'POSTNATAL_CYTO'
    },
    'Oncology Cytogenetics': {
      type: 'oncology_cytogenetics',
      code: 'ONCOLOGY_CYTO'
    },
    // Add more test configs as needed - for now using defaults for others
  };

  // Test divisions with subdivisions
  const testDivisions = {
    hematology: {
      name: 'Hematology',
      subdivisions: {
        'Complete Blood Count (CBC)': ['Hemoglobin', 'Hematocrit', 'RBC Count', 'WBC Count', 'Platelet Count', 'MCV', 'MCH', 'MCHC', 'RDW'],
        'Differential WBC Count': ['Differential WBC Count', 'Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils'],
        'RBC Indices': ['RBC Indices', 'MCV', 'MCH', 'MCHC', 'RDW'],
        'Platelet Studies': ['Platelet Studies', 'Platelet Count', 'Mean Platelet Volume (MPV)', 'Platelet Distribution Width'],
        'Reticulocyte Count': ['Reticulocyte Count', 'Reticulocyte %', 'Absolute Retic Count'],
        'ESR (Erythrocyte Sedimentation Rate)': ['ESR'],
        'Peripheral Smear / Morphology': ['Peripheral Smear / Morphology'],
        'Hemoglobin Electrophoresis': ['Hemoglobin Electrophoresis'],
        'Bone Marrow Examination (optional)': ['Bone Marrow Examination (optional)']
      }
    },
    chemistry: {
      name: 'Chemistry (Biochemistry)',
      subdivisions: {
        'Liver Function Tests (LFT)': ['Liver Function Tests (LFT)'],
        'Kidney / Renal Function Tests (RFT)': ['Kidney / Renal Function Tests (RFT)'],
        'Electrolyte Panel': ['Electrolyte Panel'],
        'Lipid Profile': ['Lipid Profile'],
        'Glucose Tests': ['Fasting Blood Glucose', 'Random Blood Glucose', 'Post-prandial (2-hour) Glucose', 'Glucose Tolerance Test (GTT)', 'HbA1c'],
        'Protein Profile': ['Protein Profile'],
        'Enzyme Tests (AST, ALT, ALP, GGT, LDH)': ['Enzyme Tests (AST, ALT, ALP, GGT, LDH)'],
        'Minerals (Calcium, Magnesium, Phosphate)': ['Minerals (Calcium, Magnesium, Phosphate)'],
        'Iron Studies (Iron, Ferritin, TIBC)': ['Iron Studies (Iron, Ferritin, TIBC)'],
        'Vitamins (B12, Folate, Vitamin D)': ['Vitamins (B12, Folate, Vitamin D)'],
        'Cardiac Markers (Troponin, CK-MB)': ['Cardiac Markers (Troponin, CK-MB)'],
        'Amylase / Lipase': ['Amylase / Lipase'],
        'Acid–Base Balance': ['Acid–Base Balance']
      }
    },
    microbiology: {
      name: 'Microbiology',
      subdivisions: {
        'Blood Culture': ['Blood Culture'],
        'Urine Culture': ['Urine Culture'],
        'Stool Culture': ['Stool Culture'],
        'Sputum / Respiratory Culture': ['Sputum / Respiratory Culture'],
        'Wound / Pus Culture': ['Wound / Pus Culture'],
        'Throat / Nasal Swab Culture': ['Throat / Nasal Swab'],
        'Genital Swab Culture': ['Genital Swab Culture'],
        'Fungal Culture': ['Fungal Culture'],
        'AFB / TB Microscopy & Culture': ['AFB Smear', 'GeneXpert MTB/RIF', 'TB Culture'],
        'Rapid Micro Tests': ['Rapid Micro Tests']
      }
    },
    immunology: {
      name: 'Immunology',
      subdivisions: {
        'Immunoglobulins (IgG, IgA, IgM, IgE)': ['Immunoglobulins (IgG, IgA, IgM, IgE)'],
        'Autoimmune Panel (ANA, dsDNA)': ['ANA (Antinuclear Antibody)', 'Anti-dsDNA', 'ENA Panel'],
        'Complement System (C3, C4)': ['Complement System (C3, C4)'],
        'Inflammatory Markers (CRP, Procalcitonin)': ['Inflammatory Markers (CRP, Procalcitonin)'],
        'Rheumatoid Tests (RF, CCP)': ['Rheumatology Tests (RF, Anti-CCP)'],
        'Allergy Markers (IgE subclasses)': ['Specific IgE Test']
      }
    },
    serology: {
      name: 'Serology',
      subdivisions: {
        'Viral Serology (HIV, Hepatitis)': ['HIV', 'Hepatitis B Panel', 'Hepatitis C', 'COVID Serology', 'EBV / CMV Serology'],
        'Bacterial Serology (Typhoid, Syphilis)': ['Syphilis (TPHA / RPR)', 'Typhoid (Widal Test)', 'Brucella Serology'],
        'Parasitic Serology (Toxoplasma, Malaria)': ['Toxoplasma', 'Malaria'],
        'TORCH Panel': ['TORCH Panel'],
        'Dengue / Chikungunya Panel': ['Dengue Panel', 'Chikungunya', 'Zika Virus'],
        'H. pylori Tests': ['H. pylori IgG', 'H. pylori Antigen', 'H. pylori Breath Test']
      }
    },
    urinalysis: {
      name: 'Urinalysis',
      subdivisions: {
        'Urine Dipstick (Chemical)': ['Urine Dipstick (Chemical)'],
        'Urine Microscopy': ['Urine Microscopy'],
        '24-hour Urine Tests': ['24-hour Urine Tests'],
        'Protein/Creatinine Ratio': ['Protein/Creatinine Ratio'],
        'Microalbuminuria': ['Microalbuminuria']
      }
    },
    hormones: {
      name: 'Hormones / Endocrinology',
      subdivisions: {
        'Thyroid Panel': ['Thyroid Panel'],
        'Female Reproductive Hormones': ['Female Reproductive Hormones'],
        'Male Reproductive Hormones': ['Male Reproductive Hormones'],
        'Cortisol': ['Cortisol'],
        'ACTH': ['ACTH'],
        'DHEA-S': ['DHEA-S'],
        'Growth Hormone (GH)': ['Growth Hormone (GH)'],
        'IGF-1': ['IGF-1'],
        'Metabolic Hormones (Insulin-related)': ['Metabolic Hormones (Insulin-related)'],
        'β-hCG (Quantitative)': ['β-hCG (Quantitative)'],
        'hCG Qualitative (Rapid)': ['hCG Qualitative (Rapid)']
      }
    },
    'tumor markers': {
      name: 'Tumor Markers',
      subdivisions: {
        'GI Tumor Markers': ['GI Tumor Markers'],
        'CA15-3': ['CA15-3'],
        'CA-125': ['CA-125'],
        'PSA Panel': ['PSA Panel'],
        'Testicular Cancer Markers': ['Testicular Cancer Markers'],
        'NSE': ['NSE'],
        'ProGRP': ['ProGRP'],
        'Thyroglobulin': ['Thyroglobulin']
      }
    },
    'blood bank': {
      name: 'Blood Bank / Transfusion',
      subdivisions: {
        'Blood Group & Rh Typing': ['Blood Group & Rh Typing'],
        'Antibody Screening (IAT)': ['Antibody Screening (IAT)'],
        'Crossmatch (Compatibility Testing)': ['Crossmatch (Compatibility Testing)'],
        'Direct Coombs Test (DAT)': ['Direct Coombs Test (DAT)'],
        'Indirect Coombs Test (IAT)': ['Indirect Coombs Test (IAT)'],
        'Major & Minor Crossmatch (Detailed Panel)': ['Major & Minor Crossmatch (Detailed Panel)'],
        'Donor Screening Tests': ['Donor Screening Tests']
      }
    },
    'molecular diagnostics': {
      name: 'Molecular Diagnostics',
      subdivisions: {
        'Respiratory PCR Panel': ['Respiratory PCR Panel'],
        'Gastrointestinal PCR Panel': ['Gastrointestinal PCR Panel'],
        'Urogenital / STI PCR Panel': ['Urogenital / STI PCR Panel'],
        'TB / Mycobacteria PCR (GeneXpert)': ['TB / Mycobacteria PCR (GeneXpert)'],
        'HBV DNA PCR': ['HBV DNA PCR'],
        'HCV RNA PCR': ['HCV RNA PCR'],
        'HIV Viral Load': ['HIV Viral Load'],
        'HPV PCR & Genotyping': ['HPV PCR & Genotyping'],
        'COVID-19 PCR (Standalone Test)': ['COVID-19 PCR (Standalone Test)'],
        'Oncology Molecular Panels': ['Oncology Molecular Panels']
      }
    },
    coagulation: {
      name: 'Coagulation',
      subdivisions: {
        'Basic Coagulation Panel': ['Basic Coagulation Panel'],
        'D-Dimer': ['D-Dimer'],
        'Coagulation Factor Assays': ['Coagulation Factor Assays'],
        'Mixing Studies (PT, aPTT)': ['Mixing Studies (PT, aPTT)'],
        'Bleeding Profile / Platelet Function Tests': ['Bleeding Profile / Platelet Function Tests']
      }
    },
    'clinical toxicology': {
      name: 'Clinical Toxicology',
      subdivisions: {
        'Urine Drug Screening Panel': ['Urine Drug Screening Panel'],
        'Confirmatory Toxicology (GC/MS or LC/MS)': ['Confirmatory Toxicology (GC/MS or LC/MS)'],
        'Therapeutic Drug Monitoring (TDM)': ['Therapeutic Drug Monitoring (TDM)'],
        'Ethanol (Blood Alcohol Level)': ['Ethanol (Blood Alcohol Level)'],
        'Breath Alcohol': ['Breath Alcohol'],
        'Toxic Alcohols (Methanol, Ethylene Glycol)': ['Toxic Alcohols (Methanol, Ethylene Glycol)'],
        'Heavy Metals Panel': ['Heavy Metals Panel']
      }
    },
    'allergy testing': {
      name: 'Allergy Testing',
      subdivisions: {
        'Total IgE': ['Total IgE'],
        'Food Allergen Panel': ['Food Allergen IgE', 'Food Panel'],
        'Respiratory Allergen Panel': ['Respiratory Allergen IgE', 'Pollen Panel'],
        'Environmental Allergen Panel': ['Dust Mite', 'Mold', 'Pet Dander'],
        'Drug Allergy Panel': ['Drug Allergen Panel', 'Penicillin Allergy']
      }
    },
    fertility: {
      name: 'Fertility',
      subdivisions: {
        'Female Fertility Hormone Panel': ['Female Fertility Hormone Panel'],
        'Male Fertility Hormone Panel': ['Male Fertility Hormone Panel'],
        'Ovarian Reserve Tests': ['Ovarian Reserve Tests'],
        'Progesterone Day 21 Test': ['Progesterone Day 21 Test'],
        'LH Surge Test (Urine LH)': ['LH Surge Test (Urine LH)'],
        'Estradiol Rising Pattern': ['Estradiol Rising Pattern'],
        'Semen Analysis (Sperm Test)': ['Semen Analysis (Sperm Test)']
      }
    },
    'point-of-care testing (poct)': {
      name: 'Point-of-Care Testing (POCT)',
      subdivisions: {
        'Glucose Monitoring (Glucometer)': ['Glucose Monitoring (Glucometer)'],
        'POCT HbA1c': ['POCT HbA1c'],
        'POCT ABG (Arterial Blood Gas)': ['POCT ABG (Arterial Blood Gas)'],
        'Rapid Infectious Tests (POCT)': ['Rapid Infectious Tests (POCT)'],
        'POCT Cardiac Markers': ['POCT Cardiac Markers'],
        'Electrolytes (POCT)': ['Electrolytes (POCT)'],
        'Urine POCT (Rapid Urine Stick)': ['Urine POCT (Rapid Urine Stick)'],
        'Pregnancy Test (hCG POCT)': ['Pregnancy Test (hCG POCT)'],
        'POCT Coagulation (INR Devices)': ['POCT Coagulation (INR Devices)'],
        'CRP (C-Reactive Protein POCT)': ['CRP (C-Reactive Protein POCT)'],
        'ESR POCT': ['ESR POCT'],
        'Lactate POCT': ['Lactate POCT'],
        'Blood Ketones (β-Hydroxybutyrate)': ['Blood Ketones (β-Hydroxybutyrate)'],
        'Microalbumin POCT': ['Microalbumin POCT']
      }
    },
    cytogenetics: {
      name: 'Cytogenetics',
      subdivisions: {
        'Conventional Karyotyping (G-banding)': ['Conventional Karyotyping (G-banding)'],
        'Rapid Aneuploidy Detection (QF-PCR)': ['Rapid Aneuploidy Detection (QF-PCR)'],
        'FISH Panels': ['FISH Panels'],
        'Chromosomal Microarray (CMA / aCGH)': ['Chromosomal Microarray (CMA / aCGH)'],
        'Prenatal Cytogenetics': ['Prenatal Cytogenetics'],
        'Postnatal/Constitutional Cytogenetics': ['Postnatal/Constitutional Cytogenetics'],
        'Oncology Cytogenetics': ['Oncology Cytogenetics']
      }
    },
    'flow cytometry': {
      name: 'Flow Cytometry',
      subdivisions: {
        'Lymphocyte Subset Panel (CD4 / CD8)': ['Lymphocyte Subset Panel (CD4 / CD8)'],
        'Leukemia/Lymphoma Immunophenotyping': ['Leukemia/Lymphoma Immunophenotyping'],
        'HLA-B27 by Flow Cytometry': ['HLA-B27 by Flow Cytometry'],
        'Stem Cell Enumeration (CD34 Count)': ['Stem Cell Enumeration (CD34 Count)'],
        'Minimal Residual Disease (MRD)': ['Minimal Residual Disease (MRD)'],
        'Paroxysmal Nocturnal Hemoglobinuria (PNH Panel)': ['Paroxysmal Nocturnal Hemoglobinuria (PNH Panel)']
      }
    }
  };

  // Fetch patients list
  useEffect(() => {
    if (showPatientSelector) {
      (async () => {
        try {
          const response = await getPatients({});
          const patientList = response?.data?.items || response?.items || response || [];
          setPatients(Array.isArray(patientList) ? patientList : []);
        } catch (e) {
          console.error('Error loading patients:', e);
          setPatients([]);
        }
      })();
    }
  }, [showPatientSelector]);

  // Fetch patient details
  useEffect(() => {
    if (patientId) {
      (async () => {
        try {
          const response = await getPatientById(patientId);
          const patientData = response?.data || response;
          setPatient({
            id: patientData.id,
            name: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            dateOfBirth: patientData.dateOfBirth,
            height: patientData.height,
            weight: patientData.weight,
            bmi: patientData.bmi,
            bloodGroup: patientData.bloodGroup,
            rhFactor: patientData.rhFactor,
            address: patientData.address,
            phone: patientData.phone,
            email: patientData.email,
          });
          setShowPatientSelector(false);
        } catch (e) {
          console.error('Error loading patient:', e);
        }
      })();
    }
  }, [patientId]);

  // Get available subdivisions for selected division
  const availableSubdivisions = selectedDivision ? (Object.keys(testDivisions[selectedDivision]?.subdivisions || {})) : [];
  
  // Get available tests for selected subdivision
  const availableTests = selectedDivision && selectedSubdivision 
    ? (testDivisions[selectedDivision]?.subdivisions[selectedSubdivision] || []) 
    : [];
  
  // Get test config for a test name
  const getTestConfig = (testName) => {
    return testConfig[testName] || { type: 'numeric_single', unit: '', ref: '' };
  };

  const handleAddTest = () => {
    setShowAddTestModal(true);
    setSelectedDivision('');
    setSelectedSubdivision('');
  };

  const handleCloseModal = () => {
    setShowAddTestModal(false);
    setSelectedDivision('');
    setSelectedSubdivision('');
  };

  // Helper function to add a test without closing modal or checking division/subdivision
  const addTestToForm = (testName) => {
    const config = getTestConfig(testName);
    
    // Create test result based on type
    if (config.type === 'panel_cbc') {
      // For CBC panel, create a structure with parameters
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'panel_cbc',
            parameters: config.parameters.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })),
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'panel_wbc_diff') {
      // For WBC Differential panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'panel_wbc_diff',
            parameters: config.parameters.map(param => ({
              code: param.code,
              name: param.name,
              unit_percent: param.unit_percent || '%',
              ref_percent: param.ref_percent || '',
              percentValue: '',
              absoluteValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })),
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'culture_panel') {
      // For culture panels
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'culture_panel',
            cultureType: config.cultureType || '',
            cultureResult: '',
            timeToPositivity: '',
            gramStain: '',
            organism: '',
            growthPattern: '',
            colonyCount: '',
            pathogenDetected: [],
            ovaParasites: '',
            wbcPerHPF: '',
            rbcPerHPF: '',
            hPyloriAg: '',
            giardiaAg: '',
            rotavirusAg: '',
            specimenQuality: '',
            growthLevel: '',
            growthType: '',
            growthAmount: '',
            woundType: '',
            astResults: config.antibiotics?.map(ab => ({
              antibiotic: ab,
              result: '' // S, I, or R
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'qualitative_with_titer') {
      // For ANA and similar tests with titer
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'qualitative_with_titer',
            result: '',
            titer: '',
            pattern: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'numeric_or_qualitative') {
      // For Anti-dsDNA and similar tests
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'numeric_or_qualitative',
            resultValue: '',
            resultUnit: config.unit || '',
            referenceRange: config.ref || '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'panel_qualitative') {
      // For panel qualitative tests (Hepatitis B Panel, TORCH, etc.)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'panel_qualitative',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              type: param.type || 'qualitative',
              result: '',
              numericValue: '',
              unit: param.unit || '',
              ref: param.ref || '',
              allowIndeterminate: param.allowIndeterminate || false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'qualitative_or_numeric') {
      // For COVID Serology, Parasitic Serology, H. pylori
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'qualitative_or_numeric',
            testSubtype: config.testSubtype || '',
            igmResult: '',
            iggResult: '',
            igmIndex: '',
            iggIndex: '',
            totalAntibodies: '',
            indexValue: '',
            iggAvidity: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'qualitative_or_titer') {
      // For Syphilis
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'qualitative_or_titer',
            rprResult: '',
            rprTiter: '',
            tphaResult: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'titer_panel') {
      // For Typhoid Widal Test
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'titer_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              titer: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'titer_test') {
      // For Brucella Serology
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'titer_test',
            abortusTiter: '',
            melitensisTiter: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urine_dipstick') {
      // For Urine Dipstick
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urine_dipstick',
            color: '',
            appearance: '',
            specificGravity: '',
            pH: '',
            glucose: '',
            protein: '',
            ketones: '',
            bilirubin: '',
            urobilinogen: '',
            nitrite: '',
            leukocyteEsterase: '',
            blood: '',
            odor: '',
            foam: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urine_microscopy') {
      // For Urine Microscopy
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urine_microscopy',
            rbc: '',
            wbc: '',
            epithelialCells: '',
            bacteria: '',
            yeast: '',
            spermatozoa: '',
            hyalineCasts: '',
            granularCasts: '',
            rbcCasts: '',
            wbcCasts: '',
            epithelialCasts: '',
            broadCasts: '',
            calciumOxalate: '',
            uricAcidCrystals: '',
            triplePhosphate: '',
            amorphousCrystals: '',
            trichomonas: '',
            schistosomaEggs: '',
            mucusThreads: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urine_24h') {
      // For 24-Hour Urine Tests
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urine_24h',
            totalVolume: '',
            collectionDuration: '24',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urine_upcr') {
      // For Urine Protein/Creatinine Ratio
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urine_upcr',
            urineProtein: '',
            urineCreatinine: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urine_microalbumin') {
      // For Urine Microalbumin
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urine_microalbumin',
            microalbumin: '',
            urineCreatinine: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'thyroid_panel') {
      // For Thyroid Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'thyroid_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'female_reproductive_hormones') {
      // For Female Reproductive Hormones
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'female_reproductive_hormones',
            cycleDay: '',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'male_reproductive_hormones') {
      // For Male Reproductive Hormones
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'male_reproductive_hormones',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'cortisol') {
      // For Cortisol
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'cortisol',
            timeOfSample: '',
            resultValue: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'acth') {
      // For ACTH
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'acth',
            resultValue: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'dheas') {
      // For DHEA-S
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'dheas',
            resultValue: '',
            referenceRange: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'growth_hormone') {
      // For Growth Hormone
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'growth_hormone',
            resultValue: '',
            referenceRange: '<10',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'igf1') {
      // For IGF-1
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'igf1',
            resultValue: '',
            referenceRange: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'metabolic_hormones') {
      // For Metabolic Hormones
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'metabolic_hormones',
            fastingGlucose: '',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'beta_hcg_quantitative') {
      // For β-hCG Quantitative
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'beta_hcg_quantitative',
            resultValue: '',
            pregnancyWeek: '',
            referenceRange: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'hcg_qualitative') {
      // For hCG Qualitative
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'hcg_qualitative',
            result: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'gi_tumor_markers') {
      // For GI Tumor Markers
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'gi_tumor_markers',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'psa_panel') {
      // For PSA Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'psa_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'testicular_cancer_markers') {
      // For Testicular Cancer Markers
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'testicular_cancer_markers',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'blood_group_rh') {
      // For Blood Group & Rh Typing
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'blood_group_rh',
            aboGroup: '',
            rhFactor: '',
            method: '',
            weakD: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'antibody_screening') {
      // For Antibody Screening
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'antibody_screening',
            screenCellI: '',
            screenCellII: '',
            screenCellIII: '',
            antibodyScreenResult: '',
            antibodyIdentified: '',
            antibodyOther: '',
            reactionStrength: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'crossmatch') {
      // For Crossmatch
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'crossmatch',
            donorUnitNumber: '',
            donorBloodGroup: '',
            donorRh: '',
            expiryDate: '',
            recipientGroup: '',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
              reactionStrength: '',
            })) || [],
            finalInterpretation: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'direct_coombs') {
      // For Direct Coombs Test
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'direct_coombs',
            datResult: '',
            antiIgG: '',
            antiC3d: '',
            reactionStrength: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'indirect_coombs') {
      // For Indirect Coombs Test
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'indirect_coombs',
            iatResult: '',
            antibodyIdentified: '',
            reactionStrength: '',
            method: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'major_minor_crossmatch') {
      // For Major & Minor Crossmatch
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'major_minor_crossmatch',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
              reactionStrength: '',
            })) || [],
            safeForTransfusion: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'donor_screening') {
      // For Donor Screening Tests
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'donor_screening',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
              allowNumeric: param.allowNumeric || false,
              numericValue: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'basic_coagulation_panel') {
      // For Basic Coagulation Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'basic_coagulation_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'd_dimer') {
      // For D-Dimer
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'd_dimer',
            resultValue: '',
            resultUnit: 'μg/mL FEU',
            testMethod: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'coagulation_factor_assays') {
      // For Coagulation Factor Assays
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'coagulation_factor_assays',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'mixing_studies') {
      // For Mixing Studies
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'mixing_studies',
            baselinePT: '',
            baselineAPTT: '',
            apttMixImmediate: '',
            apttMixAfter2h: '',
            apttMixInterpretation: '',
            ptMixImmediate: '',
            ptMixAfterIncubation: '',
            ptMixInterpretation: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'bleeding_profile') {
      // For Bleeding Profile
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'bleeding_profile',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urine_drug_screening') {
      // For Urine Drug Screening Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urine_drug_screening',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
            })) || [],
            creatinine: '',
            specificGravity: '',
            pH: '',
            adulterationCheck: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'confirmatory_toxicology') {
      // For Confirmatory Toxicology
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'confirmatory_toxicology',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              resultValue: '',
              cutoffLevel: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'therapeutic_drug_monitoring') {
      // For Therapeutic Drug Monitoring
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'therapeutic_drug_monitoring',
            drugName: '',
            tdmTestType: '',
            resultValue: '',
            resultUnit: '',
            referenceRange: '',
            timeOfLastDose: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'ethanol') {
      // For Ethanol
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'ethanol',
            resultValue: '',
            resultUnit: 'mg/dL',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'breath_alcohol') {
      // For Breath Alcohol
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'breath_alcohol',
            resultValue: '',
            referenceRange: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'toxic_alcohols') {
      // For Toxic Alcohols
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'toxic_alcohols',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            anionGap: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'heavy_metals_panel') {
      // For Heavy Metals Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'heavy_metals_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'female_fertility_hormone_panel') {
      // For Female Fertility Hormone Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'female_fertility_hormone_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            cycleDay: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'male_fertility_hormone_panel') {
      // For Male Fertility Hormone Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'male_fertility_hormone_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'ovarian_reserve_tests') {
      // For Ovarian Reserve Tests
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'ovarian_reserve_tests',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            cycleDay: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'progesterone_day21') {
      // For Progesterone Day 21 Test
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'progesterone_day21',
            resultValue: '',
            resultUnit: 'ng/mL',
            cycleDay: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'lh_surge_test') {
      // For LH Surge Test
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'lh_surge_test',
            result: '',
            comments: '',
          }
        ]
      }));
    } else if (config.type === 'estradiol_rising_pattern') {
      // For Estradiol Rising Pattern
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'estradiol_rising_pattern',
            resultValue: '',
            cycleDay: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'semen_analysis') {
      // For Semen Analysis
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'semen_analysis',
            volume: '',
            color: '',
            viscosity: '',
            liquefactionTime: '',
            pH: '',
            odor: '',
            concentration: '',
            totalSpermCount: '',
            progressiveMotility: '',
            nonProgressive: '',
            immotile: '',
            totalMotility: '',
            normalForms: '',
            vitality: '',
            roundCells: '',
            wbcs: '',
            agglutination: '',
            debris: '',
            crystals: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'respiratory_pcr_panel') {
      // For Respiratory PCR Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'respiratory_pcr_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
              ctValue: '',
              viralLoad: '',
            })) || [],
            comments: '',
          }
        ]
      }));
    } else if (config.type === 'gastrointestinal_pcr_panel') {
      // For Gastrointestinal PCR Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'gastrointestinal_pcr_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
              ctValue: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urogenital_sti_pcr_panel') {
      // For Urogenital / STI PCR Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urogenital_sti_pcr_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
              ctValue: '',
            })) || [],
            comments: '',
          }
        ]
      }));
    } else if (config.type === 'tb_mycobacteria_pcr') {
      // For TB / Mycobacteria PCR
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'tb_mycobacteria_pcr',
            mtbDetection: '',
            rifampicinResistance: '',
            semiQuantitativeLevel: '',
            ctMTB: '',
            ctRIF: '',
            specimenType: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'hepatitis_viral_load') {
      // For Hepatitis Viral Load (HBV or HCV)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'hepatitis_viral_load',
            viralLoad: '',
            genotype: '',
            detectionLimit: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'hiv_viral_load') {
      // For HIV Viral Load
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'hiv_viral_load',
            viralLoad: '',
            detectionLimit: '',
            comments: '',
          }
        ]
      }));
    } else if (config.type === 'hpv_pcr_genotyping') {
      // For HPV PCR & Genotyping
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'hpv_pcr_genotyping',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              isHighRisk: param.isHighRisk,
              result: '',
              ctValue: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'covid19_pcr') {
      // For COVID-19 PCR
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'covid19_pcr',
            result: '',
            ctNGene: '',
            ctORF1ab: '',
            ctSGene: '',
            ctOther: '',
            specimenType: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'oncology_molecular_panels') {
      // For Oncology Molecular Panels
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'oncology_molecular_panels',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
              variantName: '',
              alleleFrequency: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'glucose_monitoring_poct') {
      // For Glucose Monitoring (Glucometer)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'glucose_monitoring_poct',
            resultValue: '',
            resultUnit: 'mg/dL',
            glucoseTestType: '',
            deviceId: '',
            testStripLot: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'poct_hba1c') {
      // For POCT HbA1c
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'poct_hba1c',
            resultValue: '',
            lotNumber: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'poct_abg') {
      // For POCT ABG
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'poct_abg',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            deviceName: '',
            specimenType: '',
            temperatureCorrection: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'rapid_infectious_tests_poct') {
      // For Rapid Infectious Tests (POCT)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'rapid_infectious_tests_poct',
            result: '',
            controlLine: '',
            specimenType: '',
            lotNumber: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'poct_cardiac_markers') {
      // For POCT Cardiac Markers
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'poct_cardiac_markers',
            resultValue: '',
            resultUnit: '',
            referenceRange: '',
            deviceId: '',
            timeOfCollection: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'electrolytes_poct') {
      // For Electrolytes (POCT)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'electrolytes_poct',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            deviceId: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'urine_poct') {
      // For Urine POCT
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'urine_poct',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              result: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'pregnancy_test_poct') {
      // For Pregnancy Test (hCG POCT)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'pregnancy_test_poct',
            result: '',
            controlLine: '',
            specimenType: '',
            lotNumber: '',
            comments: '',
          }
        ]
      }));
    } else if (config.type === 'poct_coagulation') {
      // For POCT Coagulation
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'poct_coagulation',
            inrValue: '',
            ptValue: '',
            deviceId: '',
            comments: '',
          }
        ]
      }));
    } else if (config.type === 'other_poct_devices') {
      // For Other POCT Devices (CRP, ESR, Lactate, Blood Ketones, Microalbumin)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'other_poct_devices',
            resultValue: '',
            resultUnit: '',
            referenceRange: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'lymphocyte_subset_panel') {
      // For Lymphocyte Subset Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'lymphocyte_subset_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'leukemia_lymphoma_immunophenotyping') {
      // For Leukemia/Lymphoma Immunophenotyping
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'leukemia_lymphoma_immunophenotyping',
            markers: [],
            finalInterpretation: '',
          }
        ]
      }));
    } else if (config.type === 'hla_b27_flow_cytometry') {
      // For HLA-B27 by Flow Cytometry
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'hla_b27_flow_cytometry',
            result: '',
            percentPositive: '',
            meanFluorescenceIntensity: '',
            controlCheck: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'stem_cell_enumeration') {
      // For Stem Cell Enumeration
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'stem_cell_enumeration',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
              abnormalityType: 'normal',
              isAbnormal: false,
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'minimal_residual_disease') {
      // For Minimal Residual Disease (MRD)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'minimal_residual_disease',
            diseaseType: '',
            mrdPercent: '',
            positivityThreshold: '0.01',
            result: '',
            markersUsed: [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'pnh_panel') {
      // For PNH Panel
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'pnh_panel',
            parameters: config.parameters?.map(param => ({
              code: param.code,
              name: param.name,
              unit: param.unit,
              ref: param.ref,
              resultValue: '',
            })) || [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'conventional_karyotyping') {
      // For Conventional Karyotyping
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'conventional_karyotyping',
            specimenType: '',
            cultureType: '',
            totalMetaphases: '',
            normalMetaphases: '',
            abnormalMetaphases: '',
            modalChromosomeNumber: '',
            karyotypeResult: '',
            interpretation: '',
            conclusion: '',
          }
        ]
      }));
    } else if (config.type === 'rapid_aneuploidy_detection') {
      // For Rapid Aneuploidy Detection (QF-PCR)
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'rapid_aneuploidy_detection',
            chromosomeResults: {},
            strMarkers: [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'fish_panels') {
      // For FISH Panels
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'fish_panels',
            fishPanelType: '',
            markers: [],
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'chromosomal_microarray') {
      // For Chromosomal Microarray
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'chromosomal_microarray',
            result: '',
            cnvType: '',
            cnvSize: '',
            chromosomalLocation: '',
            iscnDescription: '',
            pathogenicityClassification: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'prenatal_cytogenetics') {
      // For Prenatal Cytogenetics
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'prenatal_cytogenetics',
            gestationalAge: '',
            specimenType: '',
            cultureSuccess: '',
            metaphasesAnalyzed: '',
            finalKaryotype: '',
            aneuploidyChr13: '',
            aneuploidyChr18: '',
            aneuploidyChr21: '',
            aneuploidyChrX: '',
            aneuploidyChrY: '',
            mosaicism: '',
            maternalCellContamination: '',
            interpretation: '',
          }
        ]
      }));
    } else if (config.type === 'postnatal_constitutional_cytogenetics') {
      // For Postnatal/Constitutional Cytogenetics
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'postnatal_constitutional_cytogenetics',
            indication: '',
            specimenType: '',
            cultureType: '',
            totalMetaphases: '',
            normalMetaphases: '',
            abnormalMetaphases: '',
            modalChromosomeNumber: '',
            karyotypeResult: '',
            interpretation: '',
            conclusion: '',
          }
        ]
      }));
    } else if (config.type === 'oncology_cytogenetics') {
      // For Oncology Cytogenetics
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'oncology_cytogenetics',
            specimenType: '',
            cultureType: '',
            totalMetaphases: '',
            normalMetaphases: '',
            abnormalMetaphases: '',
            modalChromosomeNumber: '',
            karyotypeResult: '',
            interpretation: '',
            conclusion: '',
          }
        ]
      }));
    } else {
      // For numeric_single
      setFormData(prev => ({
        ...prev,
        testResults: [
          ...prev.testResults,
          {
            testName: testName,
            testCode: config.code || '',
            testType: 'numeric_single',
            resultValue: '',
            resultUnit: config.unit || '',
            referenceRange: config.ref || '',
            isAbnormal: false,
            abnormalityType: 'normal',
            isCritical: false,
            interpretation: '',
          }
        ]
      }));
    }
  };

  const handleSelectTest = (testName) => {
    if (!selectedDivision || !selectedSubdivision) {
      return;
    }

    addTestToForm(testName);
    handleCloseModal();
  };

  const handleRemoveTest = (index) => {
    setFormData(prev => ({
      ...prev,
      testResults: prev.testResults.filter((_, i) => i !== index)
    }));
  };

  const handleTestChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      testResults: prev.testResults.map((test, i) => 
        i === index ? { ...test, [field]: value } : test
      )
    }));
  };

  const handlePanelParameterChange = (testIndex, paramIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      testResults: prev.testResults.map((test, i) => {
        if (i === testIndex && (test.testType === 'panel_cbc' || test.testType === 'panel_wbc_diff' || 
                                test.testType === 'panel_numeric' || test.testType === 'urine_24h' ||
                                test.testType === 'thyroid_panel' || test.testType === 'female_reproductive_hormones' ||
                                test.testType === 'male_reproductive_hormones' || test.testType === 'metabolic_hormones' ||
                                test.testType === 'gi_tumor_markers' || test.testType === 'psa_panel' ||
                                test.testType === 'testicular_cancer_markers' || test.testType === 'crossmatch' ||
                                test.testType === 'major_minor_crossmatch' || test.testType === 'donor_screening' ||
                                test.testType === 'basic_coagulation_panel' || test.testType === 'coagulation_factor_assays' ||
                                test.testType === 'bleeding_profile' || test.testType === 'urine_drug_screening' ||
                                test.testType === 'confirmatory_toxicology' || test.testType === 'toxic_alcohols' ||
                                test.testType === 'heavy_metals_panel' || test.testType === 'female_fertility_hormone_panel' ||
                                test.testType === 'male_fertility_hormone_panel' ||                                 test.testType === 'ovarian_reserve_tests' ||
                                test.testType === 'respiratory_pcr_panel' || test.testType === 'gastrointestinal_pcr_panel' ||
                                test.testType === 'urogenital_sti_pcr_panel' || test.testType === 'hpv_pcr_genotyping' ||
                                test.testType === 'oncology_molecular_panels' || test.testType === 'poct_abg' ||
                                test.testType === 'electrolytes_poct' || test.testType === 'urine_poct' ||
                                test.testType === 'lymphocyte_subset_panel' || test.testType === 'stem_cell_enumeration' ||
                                test.testType === 'pnh_panel')) {
          return {
            ...test,
            parameters: test.parameters.map((param, pIdx) => 
              pIdx === paramIndex ? { ...param, [field]: value } : param
            )
          };
        } else if (i === testIndex && test.testType === 'panel_platelet') {
          return {
            ...test,
            numericParameters: test.numericParameters.map((param, pIdx) => 
              pIdx === paramIndex ? { ...param, [field]: value } : param
            )
          };
        }
        return test;
      })
    }));
  };

  // Auto-calculate abnormality for numeric values
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle special cases like "> 90", "< 11.1", etc.
    if (refRange.trim().startsWith('>')) {
      const threshold = parseFloat(refRange.replace('>', '').trim());
      if (!isNaN(threshold)) {
        return numValue >= threshold ? 'normal' : 'low';
      }
    } else if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue <= threshold ? 'normal' : 'high';
      }
    }

    // Parse reference range (e.g., "M:13.0–17.0; F:12.0–15.5" or "4.0–11.0" or "40–70")
    let low = null, high = null;
    
    if (refRange.includes(';')) {
      // Gender-specific range
      const parts = refRange.split(';');
      const genderPart = gender === 'male' ? parts[0] : parts[1] || parts[0];
      const rangeMatch = genderPart.match(/(\d+\.?\d*)–(\d+\.?\d*)/);
      if (rangeMatch) {
        low = parseFloat(rangeMatch[1]);
        high = parseFloat(rangeMatch[2]);
      }
    } else {
      // Handle ranges like "-2 to +2" (for Base Excess)
      const toRangeMatch = refRange.match(/(-?\d+\.?\d*)\s+to\s+(\+?-?\d+\.?\d*)/i);
      if (toRangeMatch) {
        low = parseFloat(toRangeMatch[1]);
        high = parseFloat(toRangeMatch[2].replace('+', ''));
        if (!isNaN(low) && !isNaN(high)) {
          if (numValue < low) return 'low';
          if (numValue > high) return 'high';
          return 'normal';
        }
      }
      
      // Single range (supports both "–" and "-" as separators)
      const rangeMatch = refRange.match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
      if (rangeMatch) {
        low = parseFloat(rangeMatch[1]);
        high = parseFloat(rangeMatch[2]);
      }
    }

    if (low === null || high === null) return 'normal';

    if (numValue < low) return 'low';
    if (numValue > high) return 'high';
    return 'normal';
  };

  const handleSaveReport = async () => {
    if (!patient) {
      alert('Please select a patient');
      return;
    }

    if (formData.testResults.length === 0) {
      alert('Please add at least one test result');
      return;
    }

    try {
      const now = new Date();
      const generatedDate = now.toISOString().split('T')[0];
      const generatedTime = now.toTimeString().slice(0, 5);

      // Determine category from first test's subdivision or use default
      const defaultCategory = formData.testResults.length > 0 ? 'general' : 'general';
      const reportData = {
        title: formData.title || `Lab Report - ${generatedDate}`,
        type: 'patient',
        category: defaultCategory,
        generatedDate,
        generatedTime,
        generatedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email || 'Lab Technician' : 'Lab Technician',
        status: formData.status,
        format: 'pdf',
        description: formData.description,
        data: {
          patientId: patient.id,
          patientName: patient.name,
          specimenType: formData.specimenType,
          specimenCollectedDate: formData.specimenCollectedDate,
          specimenCollectedTime: formData.specimenCollectedTime,
          testDate: formData.testDate,
          testTime: formData.testTime,
          testResults: formData.testResults,
          comments: formData.comments,
        },
        patientInfo: {
          name: patient.name,
          id: patient.id,
          age: patient.age,
          gender: patient.gender,
        }
      };

      const response = await createReport(reportData);
      console.log('Report created:', response);
      
      // Navigate back to reports page
      navigate('/lab/reports');
    } catch (err) {
      console.error('Error saving report:', err);
      alert(`Failed to save report: ${err?.message || 'Unknown error'}`);
    }
  };

  const Info = ({ label, value }) => (
    <div className="mb-3">
      <p className="text-gray-600 text-xs">{label}:</p>
      <p className="text-sm">{value || '-'}</p>
    </div>
  );

  if (showPatientSelector) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LabHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Select Patient</h2>
              <button
                onClick={() => navigate('/lab/reports')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/lab/reports/new/${p.id}`)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#5ACCC3] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-sm text-gray-600">Age: {p.age} • {p.gender}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {p.id}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LabHeader />
        <div className="p-8 text-center text-gray-500">Loading patient info...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <LabHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Patient Sidebar - Sticky */}
        <div className="md:w-1/5 lg:w-1/6 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[#5ACCC3] font-medium text-sm">Lab Portal</h2>
            </div>

            <button 
              onClick={() => navigate('/lab/reports')} 
              className="text-gray-600 text-sm mb-4 hover:text-[#5ACCC3] flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              back
            </button>

            <div className="border border-gray-200 rounded-md p-4 mb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-[#5ACCC3] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-[#5ACCC3] font-medium">{patient.name} {patient.gender === 'male' ? '♂' : '♀'}</h3>
                <p className="text-sm text-gray-600">{patient.dateOfBirth}</p>
                <p className="text-xs text-gray-500">Age: {patient.age}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Info label="Height" value={patient.height} />
                <Info label="Weight" value={patient.weight} />
                <Info label="BMI" value={patient.bmi} />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Info label="Blood Group" value={patient.bloodGroup} />
                <Info label="RH Factor" value={patient.rhFactor} />
              </div>

              <Info label="Phone" value={patient.phone} />
              <Info label="Email" value={patient.email} />
              <Info label="Address" value={patient.address} />
            </div>
          </div>
        </div>

        {/* Form Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="bg-white rounded-md border border-gray-200 p-6">
              {/* Specimen Information */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specimen Type
                  </label>
                  <select
                    value={formData.specimenType}
                    onChange={(e) => setFormData(prev => ({ ...prev, specimenType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select specimen type</option>
                    <option value="blood">Blood</option>
                    <option value="urine">Urine</option>
                    <option value="sputum">Sputum</option>
                    <option value="stool">Stool</option>
                    <option value="tissue">Tissue</option>
                    <option value="swab">Swab</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specimen Collected Date & Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={formData.specimenCollectedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, specimenCollectedDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    />
                    <input
                      type="time"
                      value={formData.specimenCollectedTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, specimenCollectedTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Date
                  </label>
                  <input
                    type="date"
                    value={formData.testDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, testDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  />
                </div>
              </div>

              {/* Test Results */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Test Results</h3>
                  <button
                    onClick={handleAddTest}
                    className="flex items-center px-3 py-1 bg-[#5ACCC3] text-white rounded-md text-sm hover:bg-[#4ab8b0]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Test
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.testResults.map((test, index) => (
                    <TestInputRenderer
                      key={index}
                      test={test}
                      index={index}
                      onRemove={handleRemoveTest}
                      onTestChange={handleTestChange}
                      onParameterChange={handlePanelParameterChange}
                      patient={patient}
                      setFormData={setFormData}
                    />
                  ))}
                </div>
              </div>

              {/* Description/Comments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description/Comments
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Enter report description or comments..."
                ></textarea>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => navigate('/lab/reports')}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm mr-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReport}
                  className="px-4 py-2 bg-[#5ACCC3] text-white rounded-md text-sm hover:bg-[#4ab8b0] flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Test Modal */}
      {showAddTestModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 border-green-500">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add Test</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Division
                  </label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => {
                      setSelectedDivision(e.target.value);
                      setSelectedSubdivision(''); // Reset subdivision when division changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select division</option>
                    {Object.keys(testDivisions).map(divisionKey => (
                      <option key={divisionKey} value={divisionKey}>
                        {testDivisions[divisionKey].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subdivision
                  </label>
                  <select
                    value={selectedSubdivision}
                    onChange={(e) => {
                      const subdivision = e.target.value;
                      setSelectedSubdivision(subdivision);
                      
                      // Automatically add all tests from this subdivision
                      if (subdivision && selectedDivision) {
                        const tests = testDivisions[selectedDivision]?.subdivisions[subdivision] || [];
                        
                        // First, check if the subdivision name itself is a panel test
                        const subdivisionConfig = getTestConfig(subdivision);
                        if (subdivisionConfig.type === 'panel_cbc' || subdivisionConfig.type === 'panel_wbc_diff' || 
                            subdivisionConfig.type === 'panel_numeric' || subdivisionConfig.type === 'panel_platelet' ||
                            subdivisionConfig.type === 'morphology_panel' || subdivisionConfig.type === 'structured_text_report' ||
                            subdivisionConfig.type === 'culture_panel' || subdivisionConfig.type === 'panel_qualitative' ||
                            subdivisionConfig.type === 'qualitative_or_numeric' || subdivisionConfig.type === 'qualitative_or_titer' ||
                            subdivisionConfig.type === 'titer_panel' || subdivisionConfig.type === 'titer_test' ||
                            subdivisionConfig.type === 'urine_dipstick' || subdivisionConfig.type === 'urine_microscopy' ||
                            subdivisionConfig.type === 'urine_24h' || subdivisionConfig.type === 'urine_upcr' ||
                            subdivisionConfig.type === 'urine_microalbumin' || subdivisionConfig.type === 'thyroid_panel' ||
                            subdivisionConfig.type === 'female_reproductive_hormones' || subdivisionConfig.type === 'male_reproductive_hormones' ||
                            subdivisionConfig.type === 'cortisol' || subdivisionConfig.type === 'acth' ||
                            subdivisionConfig.type === 'dheas' || subdivisionConfig.type === 'growth_hormone' ||
                            subdivisionConfig.type === 'igf1' || subdivisionConfig.type === 'metabolic_hormones' ||
                            subdivisionConfig.type === 'beta_hcg_quantitative' || subdivisionConfig.type === 'hcg_qualitative' ||
                            subdivisionConfig.type === 'gi_tumor_markers' || subdivisionConfig.type === 'psa_panel' ||
                            subdivisionConfig.type === 'testicular_cancer_markers' || subdivisionConfig.type === 'blood_group_rh' ||
                            subdivisionConfig.type === 'antibody_screening' || subdivisionConfig.type === 'crossmatch' ||
                            subdivisionConfig.type === 'direct_coombs' || subdivisionConfig.type === 'indirect_coombs' ||
                            subdivisionConfig.type === 'major_minor_crossmatch' || subdivisionConfig.type === 'donor_screening' ||
                            subdivisionConfig.type === 'basic_coagulation_panel' || subdivisionConfig.type === 'd_dimer' ||
                            subdivisionConfig.type === 'coagulation_factor_assays' || subdivisionConfig.type === 'mixing_studies' ||
                            subdivisionConfig.type === 'bleeding_profile' || subdivisionConfig.type === 'urine_drug_screening' ||
                            subdivisionConfig.type === 'confirmatory_toxicology' || subdivisionConfig.type === 'therapeutic_drug_monitoring' ||
                            subdivisionConfig.type === 'ethanol' || subdivisionConfig.type === 'breath_alcohol' ||
                            subdivisionConfig.type === 'toxic_alcohols' || subdivisionConfig.type === 'heavy_metals_panel' ||
                            subdivisionConfig.type === 'female_fertility_hormone_panel' || subdivisionConfig.type === 'male_fertility_hormone_panel' ||
                            subdivisionConfig.type === 'ovarian_reserve_tests' || subdivisionConfig.type === 'progesterone_day21' ||
                            subdivisionConfig.type === 'lh_surge_test' || subdivisionConfig.type === 'estradiol_rising_pattern' ||
                            subdivisionConfig.type === 'semen_analysis' || subdivisionConfig.type === 'respiratory_pcr_panel' ||
                            subdivisionConfig.type === 'gastrointestinal_pcr_panel' || subdivisionConfig.type === 'urogenital_sti_pcr_panel' ||
                            subdivisionConfig.type === 'tb_mycobacteria_pcr' || subdivisionConfig.type === 'hepatitis_viral_load' ||
                            subdivisionConfig.type === 'hiv_viral_load' || subdivisionConfig.type === 'hpv_pcr_genotyping' ||
                            subdivisionConfig.type === 'covid19_pcr' || subdivisionConfig.type === 'oncology_molecular_panels' ||
                            subdivisionConfig.type === 'glucose_monitoring_poct' || subdivisionConfig.type === 'poct_hba1c' ||
                            subdivisionConfig.type === 'poct_abg' || subdivisionConfig.type === 'rapid_infectious_tests_poct' ||
                            subdivisionConfig.type === 'poct_cardiac_markers' || subdivisionConfig.type === 'electrolytes_poct' ||
                            subdivisionConfig.type === 'urine_poct' || subdivisionConfig.type === 'pregnancy_test_poct' ||
                            subdivisionConfig.type === 'poct_coagulation' || subdivisionConfig.type === 'other_poct_devices' ||
                            subdivisionConfig.type === 'lymphocyte_subset_panel' || subdivisionConfig.type === 'leukemia_lymphoma_immunophenotyping' ||
                            subdivisionConfig.type === 'hla_b27_flow_cytometry' || subdivisionConfig.type === 'stem_cell_enumeration' ||
                            subdivisionConfig.type === 'minimal_residual_disease' || subdivisionConfig.type === 'pnh_panel' ||
                            subdivisionConfig.type === 'conventional_karyotyping' || subdivisionConfig.type === 'rapid_aneuploidy_detection' ||
                            subdivisionConfig.type === 'fish_panels' || subdivisionConfig.type === 'chromosomal_microarray' ||
                            subdivisionConfig.type === 'prenatal_cytogenetics' || subdivisionConfig.type === 'postnatal_constitutional_cytogenetics' ||
                            subdivisionConfig.type === 'oncology_cytogenetics') {
                          // The subdivision itself is a panel test, add it as a panel
                          addTestToForm(subdivision);
                          handleCloseModal();
                        } else {
                          // Check if there's a panel test in the test list
                          const panelTests = tests.filter(testName => {
                            const config = getTestConfig(testName);
                            return config.type === 'panel_cbc' || config.type === 'panel_wbc_diff' ||
                                   config.type === 'panel_numeric' || config.type === 'panel_platelet' ||
                                   config.type === 'morphology_panel' || config.type === 'structured_text_report' ||
                                   config.type === 'culture_panel' || config.type === 'panel_qualitative' ||
                                   config.type === 'qualitative_or_numeric' || config.type === 'qualitative_or_titer' ||
                                   config.type === 'titer_panel' || config.type === 'titer_test' ||
                                   config.type === 'urine_dipstick' || config.type === 'urine_microscopy' ||
                                   config.type === 'urine_24h' || config.type === 'urine_upcr' ||
                                   config.type === 'urine_microalbumin' || config.type === 'thyroid_panel' ||
                                   config.type === 'female_reproductive_hormones' || config.type === 'male_reproductive_hormones' ||
                                   config.type === 'cortisol' || config.type === 'acth' ||
                                   config.type === 'dheas' || config.type === 'growth_hormone' ||
                                   config.type === 'igf1' || config.type === 'metabolic_hormones' ||
                                   config.type === 'beta_hcg_quantitative' || config.type === 'hcg_qualitative' ||
                                   config.type === 'gi_tumor_markers' || config.type === 'psa_panel' ||
                                   config.type === 'testicular_cancer_markers' || config.type === 'blood_group_rh' ||
                                   config.type === 'antibody_screening' || config.type === 'crossmatch' ||
                                   config.type === 'direct_coombs' || config.type === 'indirect_coombs' ||
                                   config.type === 'major_minor_crossmatch' || config.type === 'donor_screening' ||
                                   config.type === 'basic_coagulation_panel' || config.type === 'd_dimer' ||
                                   config.type === 'coagulation_factor_assays' || config.type === 'mixing_studies' ||
                                   config.type === 'bleeding_profile' || config.type === 'urine_drug_screening' ||
                                   config.type === 'confirmatory_toxicology' || config.type === 'therapeutic_drug_monitoring' ||
                                   config.type === 'ethanol' || config.type === 'breath_alcohol' ||
                                   config.type === 'toxic_alcohols' || config.type === 'heavy_metals_panel' ||
                                   config.type === 'female_fertility_hormone_panel' || config.type === 'male_fertility_hormone_panel' ||
                                   config.type === 'ovarian_reserve_tests' || config.type === 'progesterone_day21' ||
                                   config.type === 'lh_surge_test' || config.type === 'estradiol_rising_pattern' ||
                                   config.type === 'semen_analysis' || config.type === 'respiratory_pcr_panel' ||
                                   config.type === 'gastrointestinal_pcr_panel' || config.type === 'urogenital_sti_pcr_panel' ||
                                   config.type === 'tb_mycobacteria_pcr' || config.type === 'hepatitis_viral_load' ||
                                   config.type === 'hiv_viral_load' || config.type === 'hpv_pcr_genotyping' ||
                                   config.type === 'covid19_pcr' || config.type === 'oncology_molecular_panels' ||
                                   config.type === 'glucose_monitoring_poct' || config.type === 'poct_hba1c' ||
                                   config.type === 'poct_abg' || config.type === 'rapid_infectious_tests_poct' ||
                                   config.type === 'poct_cardiac_markers' || config.type === 'electrolytes_poct' ||
                                   config.type === 'urine_poct' || config.type === 'pregnancy_test_poct' ||
                                   config.type === 'poct_coagulation' || config.type === 'other_poct_devices' ||
                                   config.type === 'lymphocyte_subset_panel' || config.type === 'leukemia_lymphoma_immunophenotyping' ||
                                   config.type === 'hla_b27_flow_cytometry' || config.type === 'stem_cell_enumeration' ||
                                   config.type === 'minimal_residual_disease' || config.type === 'pnh_panel' ||
                                   config.type === 'conventional_karyotyping' || config.type === 'rapid_aneuploidy_detection' ||
                                   config.type === 'fish_panels' || config.type === 'chromosomal_microarray' ||
                                   config.type === 'prenatal_cytogenetics' || config.type === 'postnatal_constitutional_cytogenetics' ||
                                   config.type === 'oncology_cytogenetics';
                          });
                          
                          // If there's a panel test, add only the panel (not individual tests)
                          if (panelTests.length > 0) {
                            panelTests.forEach(testName => {
                              addTestToForm(testName);
                            });
                            handleCloseModal();
                          } else {
                            // No panel tests, add individual numeric_single tests
                            tests.forEach(testName => {
                              addTestToForm(testName);
                            });
                            handleCloseModal();
                          }
                        }
                      }
                    }}
                    disabled={!selectedDivision}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{selectedDivision ? 'Select subdivision' : 'Select division first'}</option>
                    {availableSubdivisions.map(subdivision => (
                      <option key={subdivision} value={subdivision}>
                        {subdivision}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabReport;
