import React, { useState, useEffect, useCallback, useRef } from 'react';
import { icdCodesAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from OphthalmologyReportForm)
const Card = React.memo(({ children, className = "", collapsible = false, isOpen = true, onToggle, title, counter }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
    {title && (
      <div 
        className="p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50"
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-slate-800 font-semibold text-lg">
            {title}
            {counter !== undefined && <span className="text-slate-400 ml-2">({counter})</span>}
          </h3>
          {collapsible && (
            <span className="text-slate-400 text-sm">
              {isOpen ? '▼' : '▶'}
            </span>
          )}
        </div>
      </div>
    )}
    {isOpen && (
      <div className="p-4">
        {children}
      </div>
    )}
  </div>
));

const FieldLabel = React.memo(({ children, required = false }) => (
  <label className="block text-sm font-medium text-slate-700 mb-2">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
));

const Input = React.memo(({ name, placeholder, value, onChange, className = "", type = "text", required = false }) => (
  <input
    type={type}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required={required}
    className={`w-full px-4 py-4 border border-slate-200 rounded-lg text-base text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
  />
));

const Select = React.memo(({ name, value, onChange, options, className = "", required = false }) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    required={required}
    className={`w-full px-4 py-4 border border-slate-200 rounded-lg text-base text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
  >
    <option value="">Select...</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
));

const TextArea = React.memo(({ name, placeholder, value, onChange, className = "", rows = 3, required = false }) => (
  <textarea
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={rows}
    required={required}
    className={`w-full px-4 py-4 border border-slate-200 rounded-lg text-base text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical ${className}`}
  />
));

const Chip = React.memo(({ children, onRemove, onEdit, className = "" }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm ${className}`}>
    <span>{children}</span>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className="text-slate-500 hover:text-slate-700"
        aria-label="Edit"
      >
        ✎
      </button>
    )}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="text-slate-500 hover:text-red-600"
        aria-label="Remove"
      >
        ×
      </button>
    )}
  </div>
));

// ICD Code Search Component
const IcdCodeSearchInput = ({ value, onChange, onSelect, placeholder = "Search ICD code or description..." }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const debounceTimer = useRef(null);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await icdCodesAPI.search(searchQuery, 'ICD-11', 20);
        setSearchResults(response?.results || []);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('ICD code search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target) &&
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (icdCode) => {
    setSearchQuery('');
    setShowResults(false);
    if (onSelect) {
      onSelect({
        code: icdCode.code,
        term: icdCode.description_en || icdCode.description_ru || icdCode.description_uz || icdCode.description || icdCode.name || ''
      });
    }
  };

  const handleKeyDown = (e) => {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  return (
    <div className="relative flex-1" ref={resultsRef}>
      <div className="relative" ref={searchRef}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-4 border border-slate-200 rounded-lg text-base text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={result.id || result.code}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none ${
                index === selectedIndex ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="font-mono text-sm text-emerald-600 font-medium min-w-[100px]">
                  {result.code}
                </span>
                <span className="text-sm text-slate-700 flex-1">
                  {result.description_en || result.description_ru || result.description_uz || result.description || result.name || 'No description'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Preset arrays (module scope)
const ECOG = ['0', '1', '2', '3', '4'];
const CTCAE_GRADES = ['1', '2', '3', '4', '5'];
const TREATMENT_INTENT = ['curative', 'neoadjuvant', 'adjuvant', 'palliative', 'maintenance'];
const CHEMO_PRESETS = ['FOLFOX', 'FOLFIRI', 'FOLFOXIRI', 'AC→T', 'TCHP', 'R-CHOP', 'ABVD', 'Gem/Cis', 'CapeOx', 'Pembrolizumab', 'Nivolumab', 'Atezolizumab', 'Osimertinib', 'Imatinib'];
const ANTIEMESIS_RISK = ['minimal', 'low', 'moderate', 'high'];
const VTE_PROPH = ['none', 'LMWH', 'DOAC', 'mechanical'];
const RADIATION_TECH = ['3D-CRT', 'IMRT', 'VMAT', 'SBRT', 'Brachy'];
const ONCOMARKERS = ['PSA', 'CEA', 'CA-125', 'CA19-9', 'AFP', 'β-hCG', 'LDH', 'β2-microglobulin', 'CA15-3', 'Calcitonin'];
const HEME_MARKERS = ['BCR-ABL1', 'JAK2V617F', 'CALR', 'MPL', 'FLT3-ITD', 'NPM1', 'IGH::MYC', 'BCL2', 'BCL6'];
const RECIST_CRITERIA = ['RECIST', 'iRECIST', 'Lugano', 'IMWG'];
const STAGING_SYSTEMS = ['TNM', 'Lugano', 'Ann Arbor', 'IMWG'];
const IMAGING_PRESETS = ['CT head non-contrast', 'CT-angiography', 'MR DWI/FLAIR', 'MRA head/neck', 'Carotid Doppler'];

// StructuredClone fallback
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// Utility functions
const calcBSA = (height_cm, weight_kg) => {
  if (!height_cm || !weight_kg) return '';
  return Math.sqrt((height_cm * weight_kg) / 3600).toFixed(2);
};

const getOhifUrl = (study) => {
  return `/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(study.study_uid)}`;
};

const OncologyReportForm = ({ patient, encounter, onSave }) => {
  // Mode state
  const [mode, setMode] = useState('initial');
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    meta: false,
    intent: false,
    hpi: false,
    performance: false,
    vitals: false,
    pathology: false,
    staging: false,
    diagnostics: false,
    diagnosis: false,
    plan: false,
    local: false,
    toxicities: false,
    response: false,
    imaging: false,
    outcome: false,
    attachments: false
  });

  // Calculate BMI if height/weight provided
  const initialBMI = patient?.weight_kg && patient?.height_cm 
    ? (+(patient.weight_kg / ((patient.height_cm / 100) ** 2)).toFixed(1)).toString()
    : '';

  // Calculate BSA if height/weight provided
  const initialBSA = patient?.height_cm && patient?.weight_kg
    ? calcBSA(patient.height_cm, patient.weight_kg)
    : '';

  // Form data state
  const [formData, setFormData] = useState({
    doc_type: 'onc.initial',
    meta: {
      clinic_id: encounter?.clinic_id || 'clinic-001',
      department_id: 'oncology',
      physician_id: encounter?.doctor_id || 'doctor-001',
      patient_id: patient?.patient_id || 'patient-001',
      encounter_id: encounter?.id || 'enc-001',
      datetime: encounter?.datetime || new Date().toISOString(),
    },
    intent: 'curative',
    tumor_board: { discussed: false, date: '', decisions: '' },
    consents: { chemo: false, immuno: false, radiation: false, surgery: false },
    chief_complaint: '',
    hpi: {
      description: '',
      duration: '',
      b_symptoms: { fever: false, night_sweats: false, weight_loss: false },
      risk_factors: '',
      family_history: '',
      prior_therapies: [],
      allergies: '',
      meds_current: '',
      associated_symptoms: [],
    },
    performance: { ecog: '0', karnofsky: '' },
    comorbidities: '',
    nutrition: { bmi: initialBMI, nrs2002: '', sarcopenia: false },
    pain: { score: '', scale: 'NRS0-10', analgesics: '' },
    vitals: { hr: '', bp: '', temp: '', spo2: '' },
    labs: {
      cbc: { wbc: '', hb: '', plt: '' },
      chem: { creatinine: '', alt: '', ast: '', bili: '', alb: '', glu: '', na: '', k: '' },
      coag: { inr: '', aptt: '' },
      infectious: { hbsag: false, anti_hbc: false, anti_hbs: false, hcv_ab: false, hiv_abag: false, quantiferon: false },
      tumor_markers: [],
    },
    pathology: {
      site: '',
      histology: '',
      grade: '',
      margins: 'R0',
      lymphovascular_invasion: false,
      perineural_invasion: false,
      biomarkers: {
        pd_l1: '',
        msi_mmr: '',
        tmb: '',
        lung: { egfr: '', alk: '', ros1: '', braf: '', kras: '', met: '', ret: '', ntrk: '' },
        breast: { er: '', pr: '', her2: '', ki67: '' },
        melanoma: { braf: '', nras: '', ckit: '' },
        crc: { kras: '', nras: '', braf: '', msi_mmr: '', her2: '' },
        prostate: { psa_baseline: '', brca1_2: '', msi: '' },
        heme: { marrow: '', flow: '', cytogenetics: '', molecular: [] }
      }
    },
    staging: {
      system: 'TNM',
      t: '',
      n: '',
      m: '',
      stage_group: '',
      lugano: { stage: '', bulky: false, ipi: '' },
      myeloma: { crab: '', iss: '', r_iss: '', b2m: '', albumin: '', flc: '', spep: '', upep: '' },
      measurable_lesions: [],
      imaging_summary: '',
    },
    diagnostics: {
      imaging: ['CT Chest/Abd/Pelvis'],
      procedures: [],
      endoscopy: '',
      notes: ''
    },
    diagnosis: {
      main: '',
      secondary: [],
      codes: []
    },
    plan: {
      bsa: initialBSA,
      regimen: '',
      line: '1',
      type: 'chemo',
      schedule: { schema: 'q3w', cycles_planned: '6', start_date: '' },
      dosing: [],
      premedication: 'dexamethasone + 5-HT3 + NK1 (per risk)',
      antiemesis_risk: 'moderate',
      gcsf: { strategy: 'none', agent: 'filgrastim', day: '' },
      antimicrobial_ppx: { hbv: false, pjp: false, hsv_vzv: false, tb: false, notes: '' },
      vte_prophylaxis: 'none',
      fertility: { counseling: false, contraception_advice: false },
      follow_up: 'q3w',
      follow_up_date: ''
    },
    surgery: { planned: false, type: '', p_tnm: '', margins: '', complications: '' },
    radiation: { planned: false, intent: 'adjuvant', technique: 'IMRT', total_dose_gy: '', fractions: '', organs_at_risk: '' },
    toxicities: [],
    response: {
      criteria: 'RECIST',
      timepoint: '',
      best_response: '',
      target_lesions: [],
      non_target_findings: '',
      new_lesions: '',
      mrd: { assessed: false, method: 'flow', value: '', threshold: '' }
    },
    imaging_links: [],
    tests: { referenced_docs: [], notes: '', lp: { performed: false, opening_pressure: '', cells: '', protein: '', glucose: '', microbiology: '' } },
    outcome: { condition: '', course: '' },
    recommendations: [],
    attachments: []
  });

  // Available imaging studies (mock data)
  const [availableImaging, setAvailableImaging] = useState([
    {
      study_uid: '1.2.3.4.5.6.7.8.9.40',
      modality: 'CT',
      date: '2024-01-15',
      description: 'CT Chest/Abd/Pelvis',
      source: 'orthanc',
      diagnostic_report_id: 'rep-001'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.41',
      modality: 'MRI',
      date: '2024-01-15',
      description: 'MRI Brain with contrast',
      source: 'orthanc',
      diagnostic_report_id: 'rep-002'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.42',
      modality: 'PET-CT',
      date: '2024-01-14',
      description: 'PET-CT whole body',
      source: 'pacs',
      diagnostic_report_id: 'rep-003'
    }
  ]);

  // Validation errors
  const [errors, setErrors] = useState({});

  // Autosave state
  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Smart editor states
  const [editingMed, setEditingMed] = useState(null);
  const [editingMedIdx, setEditingMedIdx] = useState(null);
  const [editingDosing, setEditingDosing] = useState(null);
  const [editingDosingIdx, setEditingDosingIdx] = useState(null);
  const [editingToxicity, setEditingToxicity] = useState(null);
  const [editingToxicityIdx, setEditingToxicityIdx] = useState(null);
  const [editingPriorTherapy, setEditingPriorTherapy] = useState(null);
  const [editingPriorTherapyIdx, setEditingPriorTherapyIdx] = useState(null);
  const [editingLesion, setEditingLesion] = useState(null);
  const [editingLesionIdx, setEditingLesionIdx] = useState(null);
  const [editingTargetLesion, setEditingTargetLesion] = useState(null);
  const [editingTargetLesionIdx, setEditingTargetLesionIdx] = useState(null);

  // Initialize form data
  useEffect(() => {
    if (patient && encounter) {
      setFormData(prev => ({
        ...prev,
        meta: {
          clinic_id: encounter.clinic_id || 'clinic-001',
          department_id: 'oncology',
          physician_id: encounter.doctor_id || 'doctor-001',
          patient_id: patient.patient_id || 'patient-001',
          encounter_id: encounter.id || 'enc-001',
          datetime: encounter.datetime || new Date().toISOString()
        }
      }));
    }
  }, [patient, encounter]);

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'onc.discharge' : 'onc.initial'
    }));
  }, [mode]);

  // Helper functions
  const updateFormData = useCallback((path, value) => {
    setFormData(prev => {
      const newData = clone(prev);
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  }, []);

  const addToArray = useCallback((path, item) => {
    setFormData(prev => {
      const newData = clone(prev);
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      if (!current[keys[keys.length - 1]]) {
        current[keys[keys.length - 1]] = [];
      }
      current[keys[keys.length - 1]].push(item);
      return newData;
    });
  }, []);

  const removeFromArray = useCallback((path, index) => {
    setFormData(prev => {
      const newData = clone(prev);
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]].splice(index, 1);
      return newData;
    });
  }, []);

  const toggleSection = useCallback((section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const addImagingToReport = useCallback((study, attach = 'reference_only', note = '') => {
    const imagingItem = {
      ...study,
      ohif_url: getOhifUrl(study),
      attach,
      note
    };
    addToArray('imaging_links', imagingItem);
  }, [addToArray]);

  const removeImagingFromReport = useCallback((index) => {
    removeFromArray('imaging_links', index);
  }, [removeFromArray]);

  const openImagingViewer = useCallback((study) => {
    const url = getOhifUrl(study);
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // Auto-calculate % change for target lesions
  const calculatePercentChange = useCallback((baseline, current) => {
    if (!baseline || !current) return null;
    const baselineNum = parseFloat(baseline);
    const currentNum = parseFloat(current);
    if (isNaN(baselineNum) || isNaN(currentNum) || baselineNum === 0) return null;
    return (((currentNum - baselineNum) / baselineNum) * 100).toFixed(1);
  }, []);

  // Update target lesion when baseline or current changes
  useEffect(() => {
    formData.response.target_lesions.forEach((lesion, idx) => {
      if (lesion.baseline_mm && lesion.current_mm) {
        const percentChange = calculatePercentChange(lesion.baseline_mm, lesion.current_mm);
        if (percentChange !== null && lesion.percent_change !== percentChange) {
          const updated = [...formData.response.target_lesions];
          updated[idx] = { ...lesion, percent_change: percentChange };
          updateFormData('response.target_lesions', updated);
        }
      }
    });
  }, [formData.response.target_lesions, calculatePercentChange, updateFormData]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.chief_complaint.trim()) {
      newErrors.chief_complaint = 'Chief complaint is required';
    }

    if (!formData.diagnosis.main.trim()) {
      newErrors.diagnosis_main = 'Main diagnosis is required';
    }

    if (mode === 'discharge') {
      if (!formData.recommendations.length) {
        newErrors.recommendations = 'At least one recommendation is required for discharge';
      }
    }

    if (formData.staging.system === 'TNM') {
      if (!formData.staging.t) newErrors.staging_t = 'T stage is required';
      if (!formData.staging.n) newErrors.staging_n = 'N stage is required';
      if (!formData.staging.m) newErrors.staging_m = 'M stage is required';
      if (!formData.staging.stage_group) newErrors.staging_group = 'Stage group is required';
    }

    formData.toxicities.forEach((tox, index) => {
      if (!tox.term) newErrors[`tox_term_${index}`] = 'Term is required';
      if (!tox.grade) newErrors[`tox_grade_${index}`] = 'Grade is required';
    });

    formData.imaging_links.forEach((imaging, index) => {
      if (!imaging.study_uid && !imaging.ohif_url) {
        newErrors[`imaging_${index}`] = 'Valid Study UID or OHIF URL is required';
      }
    });

    if (formData.plan.follow_up === 'PRN' && !formData.plan.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required when PRN is selected';
    }

    if (formData.tests.lp?.performed && (!formData.tests.lp.opening_pressure || !formData.tests.lp.cells || !formData.tests.lp.protein || !formData.tests.lp.glucose)) {
      newErrors.lp_fields = 'LP fields are required when LP is performed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  // Build payload
  const buildPayload = useCallback(() => {
    const payload = {
      doc_type: mode === 'discharge' ? 'onc.discharge' : 'onc.initial',
      meta: formData.meta,
      intent: formData.intent,
      tumor_board: formData.tumor_board,
      consents: formData.consents,
      chief_complaint: formData.chief_complaint,
      hpi: formData.hpi,
      performance: formData.performance,
      comorbidities: formData.comorbidities,
      nutrition: formData.nutrition,
      pain: formData.pain,
      vitals: formData.vitals,
      labs: formData.labs,
      pathology: formData.pathology,
      staging: formData.staging,
      diagnostics: formData.diagnostics,
      diagnosis: formData.diagnosis,
      surgery: formData.surgery,
      radiation: formData.radiation,
      toxicities: formData.toxicities,
      response: formData.response,
      imaging_links: formData.imaging_links.map(s => ({
        study_uid: s.study_uid,
        modality: s.modality,
        date: s.date,
        description: s.description,
        ohif_url: s.ohif_url,
        diagnostic_report_id: s.diagnostic_report_id,
        attach: s.attach,
        note: s.note || ''
      })),
      tests: formData.tests,
      attachments: formData.attachments
    };

    if (mode === 'initial') {
      payload.plan = formData.plan;
    }

    if (mode === 'discharge') {
      payload.outcome = formData.outcome;
      payload.recommendations = formData.recommendations.length ? formData.recommendations : undefined;
    }

    return payload;
  }, [formData, mode]);

  // Autosave every 30 seconds
  const payloadRef = useRef(null);
  useEffect(() => { 
    payloadRef.current = buildPayload(); 
  }, [buildPayload]);

  useEffect(() => {
    const id = setInterval(() => {
      if (payloadRef.current) {
        console.log('DRAFT', payloadRef.current);
        setLastSaved(new Date());
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2500);
      }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Event handlers
  const handleSaveDraft = useCallback(() => {
    console.log('DRAFT', buildPayload());
    setLastSaved(new Date());
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  }, [buildPayload]);

  const handlePreview = useCallback(() => {
    console.log('PREVIEW', buildPayload());
  }, [buildPayload]);

  const handleFinalize = useCallback(() => {
    if (validateForm()) {
      const payload = buildPayload();
      console.log('SUBMIT - Payload keys:', Object.keys(payload || {}));
      console.log('SUBMIT - Payload has doc_type:', !!payload?.doc_type);
      
      // CRITICAL: Verify payload is not an event object before passing to onSave
      if (payload && (payload._reactName || payload.nativeEvent || (payload.type === 'click' && payload.screenX !== undefined))) {
        console.error('ERROR: buildPayload() returned an event object! This should never happen.', payload);
        alert('Error: Form data structure is invalid. Please try saving again.');
        return;
      }
      
      if (onSave && typeof onSave === 'function') {
        try {
          onSave(payload);
        } catch (error) {
          console.error('Error calling onSave:', error);
          alert('Error saving report: ' + (error.message || 'Unknown error'));
        }
      } else {
        console.error('ERROR: onSave is not a function:', typeof onSave, onSave);
      }
    }
  }, [validateForm, buildPayload, onSave]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // Check if HBV prophylaxis warning should show
  const shouldShowHBVWarning = () => {
    return (formData.labs.infectious.hbsag || formData.labs.infectious.anti_hbc) && formData.plan.type === 'io';
  };

  // Check if CrCl warning should show
  const shouldShowCrClWarning = () => {
    return formData.labs.chem.creatinine && formData.plan.dosing.length > 0;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Autosave Toast */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Saved at {lastSaved?.toLocaleTimeString()}
        </div>
      )}

      {/* Header */}
      <Card title="Oncology Report" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Mode</FieldLabel>
            <Select
              name="mode"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
              options={[
                { value: 'initial', label: 'Initial Assessment' },
                { value: 'discharge', label: 'Discharge Summary' }
              ]}
            />
          </div>
          <div>
            <FieldLabel>Patient</FieldLabel>
            <div className="text-slate-600">
              {patient ? `${patient.first_name} ${patient.last_name}` : 'John Doe'} 
              {patient && ` (${patient.age || 'N/A'} years, ${patient.gender || 'N/A'})`}
            </div>
          </div>
          <div>
            <FieldLabel>Clinic</FieldLabel>
            <div className="text-slate-600">Oncology Department</div>
          </div>
          <div>
            <FieldLabel>Physician</FieldLabel>
            <div className="text-slate-600">Dr. Smith</div>
          </div>
          <div>
            <FieldLabel>Encounter</FieldLabel>
            <div className="text-slate-600">
              {formData.meta.encounter_id} - {new Date(formData.meta.datetime).toLocaleString()}
            </div>
          </div>
          <div>
            <FieldLabel>Last Saved</FieldLabel>
            <div className="text-slate-600">
              {lastSaved ? lastSaved.toLocaleTimeString() : 'Not saved yet'}
            </div>
          </div>
        </div>
      </Card>

      {/* Treatment Intent & Tumor Board */}
      <Card 
        title="Treatment Intent & Tumor Board" 
        collapsible 
        isOpen={!collapsedSections.intent}
        onToggle={() => toggleSection('intent')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Treatment Intent</FieldLabel>
            <Select
              name="intent"
              value={formData.intent}
              onChange={(e) => updateFormData('intent', e.target.value)}
              options={TREATMENT_INTENT.map(i => ({ value: i, label: i.charAt(0).toUpperCase() + i.slice(1) }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.tumor_board.discussed}
                  onChange={(e) => updateFormData('tumor_board.discussed', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label className="text-sm text-slate-600">Tumor Board Discussed</label>
              </div>
              {formData.tumor_board.discussed && (
                <>
                  <Input
                    name="tumor_board_date"
                    type="date"
                    placeholder="Date"
                    value={formData.tumor_board.date}
                    onChange={(e) => updateFormData('tumor_board.date', e.target.value)}
                  />
                  <TextArea
                    name="tumor_board_decisions"
                    placeholder="Board decisions..."
                    value={formData.tumor_board.decisions}
                    onChange={(e) => updateFormData('tumor_board.decisions', e.target.value)}
                    rows={3}
                  />
                </>
              )}
            </div>
            <div>
              <FieldLabel>Consents</FieldLabel>
              <div className="space-y-2">
                {['chemo', 'immuno', 'radiation', 'surgery'].map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.consents[type]}
                      onChange={(e) => updateFormData(`consents.${type}`, e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <label className="text-sm text-slate-600 capitalize">{type === 'immuno' ? 'Immunotherapy' : type}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Chief Complaint */}
      <Card title="Chief Complaint">
        <FieldLabel required>Chief Complaint</FieldLabel>
        <Input
          name="chief_complaint"
          placeholder="Primary reason for visit..."
          value={formData.chief_complaint}
          onChange={(e) => updateFormData('chief_complaint', e.target.value)}
          required
        />
        {errors.chief_complaint && (
          <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
        )}
      </Card>

      {/* HPI */}
      <Card 
        title="History of Present Illness" 
        collapsible 
        isOpen={!collapsedSections.hpi}
        onToggle={() => toggleSection('hpi')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>HPI Description</FieldLabel>
            <div className="flex gap-2">
              <TextArea
                name="hpi_description"
                placeholder="Detailed history..."
                value={formData.hpi.description}
                onChange={(e) => updateFormData('hpi.description', e.target.value)}
                rows={4}
              />
              <button
                type="button"
                disabled={!formData.chief_complaint.trim()}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🧠 AI Suggest
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Duration</FieldLabel>
              <Input
                name="hpi_duration"
                placeholder="Duration of symptoms..."
                value={formData.hpi.duration}
                onChange={(e) => updateFormData('hpi.duration', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>B Symptoms</FieldLabel>
              <div className="space-y-2">
                {['fever', 'night_sweats', 'weight_loss'].map(symptom => (
                  <div key={symptom} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.hpi.b_symptoms[symptom]}
                      onChange={(e) => updateFormData(`hpi.b_symptoms.${symptom}`, e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <label className="text-sm text-slate-600 capitalize">{symptom.replace('_', ' ')}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <FieldLabel>Associated Symptoms</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.hpi.associated_symptoms?.map((symp, i) => (
                <Chip key={i} onRemove={() => removeFromArray('hpi.associated_symptoms', i)}>{symp}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['weakness', 'numbness', 'tingling', 'vision loss', 'diplopia', 'dysarthria', 'aphasia', 'vertigo', 'ataxia', 'syncope', 'tremor', 'memory loss', 'seizure', 'headache'].map(symp => (
                <button
                  key={symp}
                  type="button"
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  onClick={() => {
                    if (!formData.hpi.associated_symptoms?.includes(symp)) {
                      addToArray('hpi.associated_symptoms', symp);
                    }
                  }}
                >
                  {symp}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Risk Factors</FieldLabel>
              <TextArea
                name="risk_factors"
                placeholder="Risk factors..."
                value={formData.hpi.risk_factors}
                onChange={(e) => updateFormData('hpi.risk_factors', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Family History</FieldLabel>
              <TextArea
                name="family_history"
                placeholder="Family cancer history..."
                value={formData.hpi.family_history}
                onChange={(e) => updateFormData('hpi.family_history', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Allergies</FieldLabel>
              <Input
                name="allergies"
                placeholder="Drug allergies..."
                value={formData.hpi.allergies}
                onChange={(e) => updateFormData('hpi.allergies', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Current Medications</FieldLabel>
              <TextArea
                name="meds_current"
                placeholder="Current medications..."
                value={formData.hpi.meds_current}
                onChange={(e) => updateFormData('hpi.meds_current', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Performance / Comorbidity / Nutrition / Pain */}
      <Card 
        title="Performance Status & Comorbidities" 
        collapsible 
        isOpen={!collapsedSections.performance}
        onToggle={() => toggleSection('performance')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>ECOG Performance Status</FieldLabel>
              <Select
                name="ecog"
                value={formData.performance.ecog}
                onChange={(e) => updateFormData('performance.ecog', e.target.value)}
                options={ECOG.map(e => ({ value: e, label: e }))}
              />
            </div>
            <div>
              <FieldLabel>Karnofsky Score</FieldLabel>
              <Input
                name="karnofsky"
                placeholder="0-100"
                value={formData.performance.karnofsky}
                onChange={(e) => updateFormData('performance.karnofsky', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>BMI</FieldLabel>
              <Input
                name="bmi"
                placeholder="Auto-calculated"
                value={formData.nutrition.bmi}
                onChange={(e) => updateFormData('nutrition.bmi', e.target.value)}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Comorbidities</FieldLabel>
            <TextArea
              name="comorbidities"
              placeholder="Significant comorbidities..."
              value={formData.comorbidities}
              onChange={(e) => updateFormData('comorbidities', e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Pain Score (NRS 0-10)</FieldLabel>
              <Input
                name="pain_score"
                type="number"
                min="0"
                max="10"
                placeholder="0-10"
                value={formData.pain.score}
                onChange={(e) => updateFormData('pain.score', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Analgesics</FieldLabel>
              <Input
                name="analgesics"
                placeholder="Current analgesics..."
                value={formData.pain.analgesics}
                onChange={(e) => updateFormData('pain.analgesics', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Vitals & Labs */}
      <Card 
        title="Vitals & Labs" 
        collapsible 
        isOpen={!collapsedSections.vitals}
        onToggle={() => toggleSection('vitals')}
      >
        <div className="space-y-6">
          <div>
            <FieldLabel>Vitals</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                name="hr"
                placeholder="HR (bpm)"
                value={formData.vitals.hr}
                onChange={(e) => updateFormData('vitals.hr', e.target.value)}
              />
              <Input
                name="bp"
                placeholder="BP (mmHg)"
                value={formData.vitals.bp}
                onChange={(e) => updateFormData('vitals.bp', e.target.value)}
              />
              <Input
                name="temp"
                placeholder="Temp (°C)"
                value={formData.vitals.temp}
                onChange={(e) => updateFormData('vitals.temp', e.target.value)}
              />
              <Input
                name="spo2"
                placeholder="SpO2 (%)"
                value={formData.vitals.spo2}
                onChange={(e) => updateFormData('vitals.spo2', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <FieldLabel>CBC</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                name="wbc"
                placeholder="WBC (×10³/μL)"
                value={formData.labs.cbc.wbc}
                onChange={(e) => updateFormData('labs.cbc.wbc', e.target.value)}
              />
              <Input
                name="hb"
                placeholder="Hb (g/dL)"
                value={formData.labs.cbc.hb}
                onChange={(e) => updateFormData('labs.cbc.hb', e.target.value)}
              />
              <Input
                name="plt"
                placeholder="Platelets (×10³/μL)"
                value={formData.labs.cbc.plt}
                onChange={(e) => updateFormData('labs.cbc.plt', e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Chemistry</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                name="creatinine"
                placeholder="Creatinine (mg/dL)"
                value={formData.labs.chem.creatinine}
                onChange={(e) => updateFormData('labs.chem.creatinine', e.target.value)}
              />
              <Input
                name="alt"
                placeholder="ALT (U/L)"
                value={formData.labs.chem.alt}
                onChange={(e) => updateFormData('labs.chem.alt', e.target.value)}
              />
              <Input
                name="ast"
                placeholder="AST (U/L)"
                value={formData.labs.chem.ast}
                onChange={(e) => updateFormData('labs.chem.ast', e.target.value)}
              />
              <Input
                name="bili"
                placeholder="Bilirubin (mg/dL)"
                value={formData.labs.chem.bili}
                onChange={(e) => updateFormData('labs.chem.bili', e.target.value)}
              />
              <Input
                name="alb"
                placeholder="Albumin (g/dL)"
                value={formData.labs.chem.alb}
                onChange={(e) => updateFormData('labs.chem.alb', e.target.value)}
              />
              <Input
                name="glu"
                placeholder="Glucose (mg/dL)"
                value={formData.labs.chem.glu}
                onChange={(e) => updateFormData('labs.chem.glu', e.target.value)}
              />
              <Input
                name="na"
                placeholder="Na (mEq/L)"
                value={formData.labs.chem.na}
                onChange={(e) => updateFormData('labs.chem.na', e.target.value)}
              />
              <Input
                name="k"
                placeholder="K (mEq/L)"
                value={formData.labs.chem.k}
                onChange={(e) => updateFormData('labs.chem.k', e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Coagulation</FieldLabel>
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="inr"
                placeholder="INR"
                value={formData.labs.coag.inr}
                onChange={(e) => updateFormData('labs.coag.inr', e.target.value)}
              />
              <Input
                name="aptt"
                placeholder="aPTT (s)"
                value={formData.labs.coag.aptt}
                onChange={(e) => updateFormData('labs.coag.aptt', e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Infectious Screening</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['hbsag', 'anti_hbc', 'anti_hbs', 'hcv_ab', 'hiv_abag', 'quantiferon'].map(test => (
                <div key={test} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.labs.infectious[test]}
                    onChange={(e) => updateFormData(`labs.infectious.${test}`, e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label className="text-sm text-slate-600 uppercase">{test.replace(/_/g, '-')}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Tumor Markers</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.labs.tumor_markers.map((marker, i) => (
                <Chip key={i} onRemove={() => removeFromArray('labs.tumor_markers', i)}>{marker}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {ONCOMARKERS.map(marker => (
                <button
                  key={marker}
                  type="button"
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  onClick={() => {
                    if (!formData.labs.tumor_markers.includes(marker)) {
                      addToArray('labs.tumor_markers', marker);
                    }
                  }}
                >
                  {marker}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Pathology & Biomarkers */}
      <Card 
        title="Pathology & Biomarkers" 
        collapsible 
        isOpen={!collapsedSections.pathology}
        onToggle={() => toggleSection('pathology')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Primary Site</FieldLabel>
              <Input
                name="pathology_site"
                placeholder="Primary tumor site..."
                value={formData.pathology.site}
                onChange={(e) => updateFormData('pathology.site', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Histology</FieldLabel>
              <Input
                name="pathology_histology"
                placeholder="Histologic type..."
                value={formData.pathology.histology}
                onChange={(e) => updateFormData('pathology.histology', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Grade</FieldLabel>
              <Input
                name="pathology_grade"
                placeholder="Tumor grade..."
                value={formData.pathology.grade}
                onChange={(e) => updateFormData('pathology.grade', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Margins</FieldLabel>
              <Select
                name="pathology_margins"
                value={formData.pathology.margins}
                onChange={(e) => updateFormData('pathology.margins', e.target.value)}
                options={[
                  { value: 'R0', label: 'R0 (Negative)' },
                  { value: 'R1', label: 'R1 (Microscopic)' },
                  { value: 'R2', label: 'R2 (Macroscopic)' }
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.pathology.lymphovascular_invasion}
                onChange={(e) => updateFormData('pathology.lymphovascular_invasion', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm text-slate-600">Lymphovascular Invasion</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.pathology.perineural_invasion}
                onChange={(e) => updateFormData('pathology.perineural_invasion', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm text-slate-600">Perineural Invasion</label>
            </div>
          </div>
          <div>
            <FieldLabel>Biomarkers</FieldLabel>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  name="pd_l1"
                  placeholder="PD-L1 (%)"
                  value={formData.pathology.biomarkers.pd_l1}
                  onChange={(e) => updateFormData('pathology.biomarkers.pd_l1', e.target.value)}
                />
                <Input
                  name="msi_mmr"
                  placeholder="MSI/MMR"
                  value={formData.pathology.biomarkers.msi_mmr}
                  onChange={(e) => updateFormData('pathology.biomarkers.msi_mmr', e.target.value)}
                />
                <Input
                  name="tmb"
                  placeholder="TMB (mut/Mb)"
                  value={formData.pathology.biomarkers.tmb}
                  onChange={(e) => updateFormData('pathology.biomarkers.tmb', e.target.value)}
                />
              </div>
              <div className="border-t pt-4">
                <FieldLabel>Disease-Specific Biomarkers</FieldLabel>
                <div className="space-y-4">
                  <div>
                    <FieldLabel className="text-xs">Lung</FieldLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['egfr', 'alk', 'ros1', 'braf', 'kras', 'met', 'ret', 'ntrk'].map(gene => (
                        <Input
                          key={gene}
                          name={`lung_${gene}`}
                          placeholder={gene.toUpperCase()}
                          value={formData.pathology.biomarkers.lung[gene]}
                          onChange={(e) => updateFormData(`pathology.biomarkers.lung.${gene}`, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <FieldLabel className="text-xs">Breast</FieldLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['er', 'pr', 'her2', 'ki67'].map(marker => (
                        <Input
                          key={marker}
                          name={`breast_${marker}`}
                          placeholder={marker.toUpperCase()}
                          value={formData.pathology.biomarkers.breast[marker]}
                          onChange={(e) => updateFormData(`pathology.biomarkers.breast.${marker}`, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <FieldLabel className="text-xs">CRC</FieldLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['kras', 'nras', 'braf', 'msi_mmr', 'her2'].map(marker => (
                        <Input
                          key={marker}
                          name={`crc_${marker}`}
                          placeholder={marker.toUpperCase()}
                          value={formData.pathology.biomarkers.crc[marker]}
                          onChange={(e) => updateFormData(`pathology.biomarkers.crc.${marker}`, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Staging & Disease Burden */}
      <Card 
        title="Staging & Disease Burden" 
        collapsible 
        isOpen={!collapsedSections.staging}
        onToggle={() => toggleSection('staging')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Staging System</FieldLabel>
            <Select
              name="staging_system"
              value={formData.staging.system}
              onChange={(e) => updateFormData('staging.system', e.target.value)}
              options={STAGING_SYSTEMS.map(s => ({ value: s, label: s }))}
            />
          </div>
          {formData.staging.system === 'TNM' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <FieldLabel required>T</FieldLabel>
                <Input
                  name="staging_t"
                  placeholder="T stage"
                  value={formData.staging.t}
                  onChange={(e) => updateFormData('staging.t', e.target.value)}
                  required
                />
                {errors.staging_t && <p className="text-red-500 text-sm mt-1">{errors.staging_t}</p>}
              </div>
              <div>
                <FieldLabel required>N</FieldLabel>
                <Input
                  name="staging_n"
                  placeholder="N stage"
                  value={formData.staging.n}
                  onChange={(e) => updateFormData('staging.n', e.target.value)}
                  required
                />
                {errors.staging_n && <p className="text-red-500 text-sm mt-1">{errors.staging_n}</p>}
              </div>
              <div>
                <FieldLabel required>M</FieldLabel>
                <Input
                  name="staging_m"
                  placeholder="M stage"
                  value={formData.staging.m}
                  onChange={(e) => updateFormData('staging.m', e.target.value)}
                  required
                />
                {errors.staging_m && <p className="text-red-500 text-sm mt-1">{errors.staging_m}</p>}
              </div>
              <div>
                <FieldLabel required>Stage Group</FieldLabel>
                <Input
                  name="staging_group"
                  placeholder="Stage group"
                  value={formData.staging.stage_group}
                  onChange={(e) => updateFormData('staging.stage_group', e.target.value)}
                  required
                />
                {errors.staging_group && <p className="text-red-500 text-sm mt-1">{errors.staging_group}</p>}
              </div>
            </div>
          )}
          <div>
            <FieldLabel>Imaging Summary</FieldLabel>
            <TextArea
              name="imaging_summary"
              placeholder="Summary of imaging findings..."
              value={formData.staging.imaging_summary}
              onChange={(e) => updateFormData('staging.imaging_summary', e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <FieldLabel>Measurable Lesions</FieldLabel>
            <div className="space-y-2">
              {formData.staging.measurable_lesions.map((lesion, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-800">{lesion.site || 'New Lesion'}</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLesion(lesion);
                          setEditingLesionIdx(idx);
                        }}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromArray('staging.measurable_lesions', idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div>{lesion.modality}: {lesion.longest_diam_mm}mm {lesion.target && '(Target)'}</div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                onClick={() => {
                  setEditingLesion({
                    site: '',
                    modality: 'CT',
                    longest_diam_mm: '',
                    target: false
                  });
                  setEditingLesionIdx(null);
                }}
              >
                Add Lesion
              </button>

              {editingLesion && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <FieldLabel required>Site</FieldLabel>
                    <Input
                      placeholder="Lesion site"
                      value={editingLesion.site}
                      onChange={(e) => setEditingLesion(s => ({...s, site: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <FieldLabel>Modality</FieldLabel>
                    <Select
                      name="lesion_modality"
                      value={editingLesion.modality}
                      onChange={(e) => setEditingLesion(s => ({...s, modality: e.target.value}))}
                      options={[
                        { value: 'CT', label: 'CT' },
                        { value: 'MRI', label: 'MRI' },
                        { value: 'PET-CT', label: 'PET-CT' },
                        { value: 'US', label: 'US' }
                      ]}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <FieldLabel>Longest Diameter (mm)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Diameter"
                      value={editingLesion.longest_diam_mm}
                      onChange={(e) => setEditingLesion(s => ({...s, longest_diam_mm: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingLesion.target}
                        onChange={(e) => setEditingLesion(s => ({...s, target: e.target.checked}))}
                        className="w-4 h-4 rounded"
                      />
                      <label className="text-sm text-slate-600">Target Lesion</label>
                    </div>
                  </div>
                  <div className="col-span-12 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                      onClick={() => {setEditingLesion(null); setEditingLesionIdx(null);}}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      onClick={() => {
                        if (!editingLesion.site) return;
                        const next = [...formData.staging.measurable_lesions];
                        if (editingLesionIdx === null) next.push(editingLesion); else next[editingLesionIdx] = editingLesion;
                        updateFormData('staging.measurable_lesions', next);
                        setEditingLesion(null); setEditingLesionIdx(null);
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Diagnostics Plan */}
      <Card 
        title="Diagnostics Plan" 
        collapsible 
        isOpen={!collapsedSections.diagnostics}
        onToggle={() => toggleSection('diagnostics')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Imaging Studies</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnostics.imaging.map((img, i) => (
                <Chip key={i} onRemove={() => removeFromArray('diagnostics.imaging', i)}>{img}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {IMAGING_PRESETS.map(img => (
                <button
                  key={img}
                  type="button"
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  onClick={() => {
                    if (!formData.diagnostics.imaging.includes(img)) {
                      addToArray('diagnostics.imaging', img);
                    }
                  }}
                >
                  {img}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Procedures</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnostics.procedures.map((proc, i) => (
                <Chip key={i} onRemove={() => removeFromArray('diagnostics.procedures', i)}>{proc}</Chip>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add procedure..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    addToArray('diagnostics.procedures', e.target.value.trim());
                    e.target.value = '';
                  }
                }
              }}
            />
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <TextArea
              name="diagnostics_notes"
              placeholder="Additional diagnostic notes..."
              value={formData.diagnostics.notes}
              onChange={(e) => updateFormData('diagnostics.notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Card>

      {/* Diagnosis */}
      <Card 
        title="Diagnosis" 
        collapsible 
        isOpen={!collapsedSections.diagnosis}
        onToggle={() => toggleSection('diagnosis')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel required>Main Diagnosis</FieldLabel>
            <div className="space-y-2">
              {formData.diagnosis.main && typeof formData.diagnosis.main === 'object' && (formData.diagnosis.main.code || formData.diagnosis.main.term) ? (
                <div className="flex gap-2 items-start">
                  <div className="flex gap-2 items-start flex-1">
                    <Input
                      placeholder="ICD-11 code"
                      value={formData.diagnosis.main.code || ''}
                      onChange={(e) => {
                        const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                        updateFormData('diagnosis.main', { ...current, code: e.target.value });
                      }}
                      className="w-40"
                    />
                    <Input
                      placeholder="Diagnosis term"
                      value={formData.diagnosis.main.term || ''}
                      onChange={(e) => {
                        const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                        updateFormData('diagnosis.main', { ...current, term: e.target.value });
                      }}
                      className="flex-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateFormData('diagnosis.main', '')}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
              <IcdCodeSearchInput
                placeholder="Search ICD-11 code or diagnosis..."
                onSelect={(selected) => {
                  updateFormData('diagnosis.main', selected);
                }}
              />
            </div>
            {errors.diagnosis_main && (
              <p className="text-red-500 text-sm mt-1">{errors.diagnosis_main}</p>
            )}
          </div>
          <div>
            <FieldLabel>Secondary Diagnoses</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.secondary.map((diag, index) => (
                <Chip
                  key={index}
                  onRemove={() => removeFromArray('diagnosis.secondary', index)}
                >
                  {diag}
                </Chip>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add secondary diagnosis..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    addToArray('diagnosis.secondary', e.target.value.trim());
                    e.target.value = '';
                  }
                }
              }}
            />
          </div>
          <div>
            <FieldLabel>Diagnosis Codes</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.codes.map((code, index) => (
                <Chip
                  key={index}
                  onRemove={() => removeFromArray('diagnosis.codes', index)}
                >
                  {code.system}: {code.code} - {code.term}
                </Chip>
              ))}
            </div>
            <IcdCodeSearchInput
              placeholder="Search ICD-11 code to add..."
              onSelect={(selected) => {
                addToArray('diagnosis.codes', {
                  system: 'ICD11',
                  code: selected.code,
                  term: selected.term
                });
              }}
            />
          </div>
        </div>
      </Card>

      {/* Plan & Treatment (Initial mode only) */}
      {mode === 'initial' && (
        <Card 
          title="Systemic Therapy Plan" 
          collapsible 
          isOpen={!collapsedSections.plan}
          onToggle={() => toggleSection('plan')}
        >
          <div className="space-y-4">
            {shouldShowCrClWarning() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ Consider dose adjustment if CrCl &lt; 50 mL/min
                </p>
              </div>
            )}
            {shouldShowHBVWarning() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ HBV prophylaxis recommended during immunotherapy
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>BSA (m²)</FieldLabel>
                <Input
                  name="bsa"
                  placeholder="Auto-calculated"
                  value={formData.plan.bsa}
                  onChange={(e) => updateFormData('plan.bsa', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Regimen</FieldLabel>
                <Select
                  name="regimen"
                  value={formData.plan.regimen}
                  onChange={(e) => updateFormData('plan.regimen', e.target.value)}
                  options={CHEMO_PRESETS.map(r => ({ value: r, label: r }))}
                />
              </div>
              <div>
                <FieldLabel>Line</FieldLabel>
                <Input
                  name="line"
                  placeholder="1, 2, etc."
                  value={formData.plan.line}
                  onChange={(e) => updateFormData('plan.line', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Type</FieldLabel>
                <Select
                  name="plan_type"
                  value={formData.plan.type}
                  onChange={(e) => updateFormData('plan.type', e.target.value)}
                  options={[
                    { value: 'chemo', label: 'Chemotherapy' },
                    { value: 'io', label: 'Immunotherapy' },
                    { value: 'tt', label: 'Targeted Therapy' },
                    { value: 'endocrine', label: 'Endocrine' },
                    { value: 'supportive', label: 'Supportive' }
                  ]}
                />
              </div>
              <div>
                <FieldLabel>Schedule</FieldLabel>
                <Input
                  name="schedule_schema"
                  placeholder="q3w, q2w, etc."
                  value={formData.plan.schedule.schema}
                  onChange={(e) => updateFormData('plan.schedule.schema', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Cycles Planned</FieldLabel>
                <Input
                  name="cycles_planned"
                  placeholder="Number of cycles"
                  value={formData.plan.schedule.cycles_planned}
                  onChange={(e) => updateFormData('plan.schedule.cycles_planned', e.target.value)}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Dosing</FieldLabel>
              <div className="space-y-2">
                {formData.plan.dosing.map((dose, idx) => {
                  const label = `${dose.drug} ${dose.dose_mg_per_m2} mg/m² D${dose.day}`;
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      <span className="text-sm flex-1">{label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDosing(dose);
                          setEditingDosingIdx(idx);
                        }}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromArray('plan.dosing', idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                  onClick={() => {
                    setEditingDosing({
                      drug: '',
                      dose_mg_per_m2: '',
                      day: ''
                    });
                    setEditingDosingIdx(null);
                  }}
                >
                  + Add Drug
                </button>
              </div>

              {editingDosing && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <FieldLabel required>Drug</FieldLabel>
                    <Input
                      placeholder="Drug name"
                      value={editingDosing.drug}
                      onChange={(e) => setEditingDosing(s => ({...s, drug: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <FieldLabel required>Dose (mg/m²)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Dose per m²"
                      value={editingDosing.dose_mg_per_m2}
                      onChange={(e) => setEditingDosing(s => ({...s, dose_mg_per_m2: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <FieldLabel required>Day</FieldLabel>
                    <Input
                      placeholder="Day of cycle (1, 2, etc.)"
                      value={editingDosing.day}
                      onChange={(e) => setEditingDosing(s => ({...s, day: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                      onClick={() => {setEditingDosing(null); setEditingDosingIdx(null);}}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      onClick={() => {
                        if (!editingDosing.drug || !editingDosing.dose_mg_per_m2 || !editingDosing.day) return;
                        const next = [...formData.plan.dosing];
                        if (editingDosingIdx === null) next.push(editingDosing); else next[editingDosingIdx] = editingDosing;
                        updateFormData('plan.dosing', next);
                        setEditingDosing(null); setEditingDosingIdx(null);
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Antiemesis Risk</FieldLabel>
                <Select
                  name="antiemesis_risk"
                  value={formData.plan.antiemesis_risk}
                  onChange={(e) => updateFormData('plan.antiemesis_risk', e.target.value)}
                  options={ANTIEMESIS_RISK.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
                />
              </div>
              <div>
                <FieldLabel>VTE Prophylaxis</FieldLabel>
                <Select
                  name="vte_prophylaxis"
                  value={formData.plan.vte_prophylaxis}
                  onChange={(e) => updateFormData('plan.vte_prophylaxis', e.target.value)}
                  options={VTE_PROPH.map(v => ({ value: v, label: v === 'none' ? 'None' : v }))}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Follow-up</FieldLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  name="follow_up"
                  value={formData.plan.follow_up}
                  onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                  options={[
                    { value: '24h', label: '24 hours' },
                    { value: '1w', label: '1 week' },
                    { value: 'q3w', label: 'Q3 weeks' },
                    { value: 'q6w', label: 'Q6 weeks' },
                    { value: 'PRN', label: 'PRN' }
                  ]}
                />
                {formData.plan.follow_up === 'PRN' && (
                  <Input
                    name="follow_up_date"
                    type="date"
                    placeholder="Specific date"
                    value={formData.plan.follow_up_date}
                    onChange={(e) => updateFormData('plan.follow_up_date', e.target.value)}
                  />
                )}
              </div>
              {errors.follow_up_date && (
                <p className="text-red-500 text-sm mt-1">{errors.follow_up_date}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Local Therapy */}
      <Card 
        title="Local Therapy" 
        collapsible 
        isOpen={!collapsedSections.local}
        onToggle={() => toggleSection('local')}
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.surgery.planned}
                onChange={(e) => updateFormData('surgery.planned', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm font-medium text-slate-700">Surgery Planned</label>
            </div>
            {formData.surgery.planned && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <Input
                  name="surgery_type"
                  placeholder="Surgery type..."
                  value={formData.surgery.type}
                  onChange={(e) => updateFormData('surgery.type', e.target.value)}
                />
                <Input
                  name="surgery_margins"
                  placeholder="Margins..."
                  value={formData.surgery.margins}
                  onChange={(e) => updateFormData('surgery.margins', e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.radiation.planned}
                onChange={(e) => updateFormData('radiation.planned', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm font-medium text-slate-700">Radiation Planned</label>
            </div>
            {formData.radiation.planned && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <Select
                  name="radiation_technique"
                  value={formData.radiation.technique}
                  onChange={(e) => updateFormData('radiation.technique', e.target.value)}
                  options={RADIATION_TECH.map(t => ({ value: t, label: t }))}
                />
                <Input
                  name="total_dose_gy"
                  placeholder="Total dose (Gy)"
                  value={formData.radiation.total_dose_gy}
                  onChange={(e) => updateFormData('radiation.total_dose_gy', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Toxicities */}
      <Card 
        title="Toxicities (CTCAE v5.0)" 
        collapsible 
        isOpen={!collapsedSections.toxicities}
        onToggle={() => toggleSection('toxicities')}
        counter={formData.toxicities.length}
      >
        <div className="space-y-4">
          {formData.toxicities.map((tox, idx) => {
            const obj = tox;
            return (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-800">{obj.term || 'New Toxicity'}</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingToxicity(obj);
                        setEditingToxicityIdx(idx);
                      }}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromArray('toxicities', idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>Grade: {obj.grade}</div>
                  {obj.onset && <div>Onset: {obj.onset}</div>}
                  {obj.action && <div>Action: {obj.action}</div>}
                </div>
              </div>
            );
          })}
          
          <button
            type="button"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            onClick={() => {
              setEditingToxicity({
                term: '',
                grade: '',
                onset: '',
                offset: '',
                action: '',
                outcome: ''
              });
              setEditingToxicityIdx(null);
            }}
          >
            Add Toxicity
          </button>

          {editingToxicity && (
            <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
              <div className="col-span-12">
                <FieldLabel required>Term</FieldLabel>
                <Input
                  placeholder="Toxicity term"
                  value={editingToxicity.term}
                  onChange={(e) => setEditingToxicity(s => ({...s, term: e.target.value}))}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel required>Grade</FieldLabel>
                <Select
                  name="tox_grade"
                  value={editingToxicity.grade}
                  onChange={(e) => setEditingToxicity(s => ({...s, grade: e.target.value}))}
                  options={CTCAE_GRADES.map(g => ({ value: g, label: `Grade ${g}` }))}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel>Onset Date</FieldLabel>
                <Input
                  type="date"
                  value={editingToxicity.onset}
                  onChange={(e) => setEditingToxicity(s => ({...s, onset: e.target.value}))}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel>Resolution Date</FieldLabel>
                <Input
                  type="date"
                  value={editingToxicity.offset || ''}
                  onChange={(e) => setEditingToxicity(s => ({...s, offset: e.target.value}))}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel>Outcome</FieldLabel>
                <Input
                  placeholder="Resolved, ongoing, etc."
                  value={editingToxicity.outcome || ''}
                  onChange={(e) => setEditingToxicity(s => ({...s, outcome: e.target.value}))}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel>Management Action</FieldLabel>
                <TextArea
                  placeholder="Actions taken..."
                  value={editingToxicity.action || ''}
                  onChange={(e) => setEditingToxicity(s => ({...s, action: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                  onClick={() => {setEditingToxicity(null); setEditingToxicityIdx(null);}}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  onClick={() => {
                    if (!editingToxicity.term || !editingToxicity.grade) return;
                    const next = [...formData.toxicities];
                    if (editingToxicityIdx === null) next.push(editingToxicity); else next[editingToxicityIdx] = editingToxicity;
                    updateFormData('toxicities', next);
                    setEditingToxicity(null); setEditingToxicityIdx(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Response Assessment */}
      <Card 
        title="Response Assessment & MRD" 
        collapsible 
        isOpen={!collapsedSections.response}
        onToggle={() => toggleSection('response')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Criteria</FieldLabel>
              <Select
                name="response_criteria"
                value={formData.response.criteria}
                onChange={(e) => updateFormData('response.criteria', e.target.value)}
                options={RECIST_CRITERIA.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <FieldLabel>Timepoint</FieldLabel>
              <Input
                name="response_timepoint"
                type="date"
                value={formData.response.timepoint}
                onChange={(e) => updateFormData('response.timepoint', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Best Response</FieldLabel>
              <Select
                name="best_response"
                value={formData.response.best_response}
                onChange={(e) => updateFormData('response.best_response', e.target.value)}
                options={[
                  { value: 'CR', label: 'CR (Complete Response)' },
                  { value: 'PR', label: 'PR (Partial Response)' },
                  { value: 'SD', label: 'SD (Stable Disease)' },
                  { value: 'PD', label: 'PD (Progressive Disease)' }
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Target Lesions</FieldLabel>
            <div className="space-y-2">
              {formData.response.target_lesions.map((lesion, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-800">{lesion.site || 'New Lesion'}</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTargetLesion(lesion);
                          setEditingTargetLesionIdx(idx);
                        }}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromArray('response.target_lesions', idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div>{lesion.baseline_mm}mm → {lesion.current_mm}mm ({lesion.percent_change}%)</div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                onClick={() => {
                  setEditingTargetLesion({
                    site: '',
                    modality: 'CT',
                    longest_diam_mm: '',
                    baseline_mm: '',
                    current_mm: '',
                    percent_change: '',
                    target: true
                  });
                  setEditingTargetLesionIdx(null);
                }}
              >
                Add Target Lesion
              </button>

              {editingTargetLesion && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <FieldLabel required>Site</FieldLabel>
                    <Input
                      placeholder="Lesion site"
                      value={editingTargetLesion.site}
                      onChange={(e) => setEditingTargetLesion(s => ({...s, site: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <FieldLabel required>Baseline (mm)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Baseline diameter"
                      value={editingTargetLesion.baseline_mm}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setEditingTargetLesion(s => {
                          const updated = {...s, baseline_mm: newVal};
                          if (updated.current_mm && newVal) {
                            const pc = calculatePercentChange(newVal, updated.current_mm);
                            if (pc !== null) updated.percent_change = pc;
                          }
                          return updated;
                        });
                      }}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <FieldLabel required>Current (mm)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Current diameter"
                      value={editingTargetLesion.current_mm}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setEditingTargetLesion(s => {
                          const updated = {...s, current_mm: newVal};
                          if (updated.baseline_mm && newVal) {
                            const pc = calculatePercentChange(updated.baseline_mm, newVal);
                            if (pc !== null) updated.percent_change = pc;
                          }
                          return updated;
                        });
                      }}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <FieldLabel>% Change</FieldLabel>
                    <Input
                      placeholder="Auto-calculated"
                      value={editingTargetLesion.percent_change || ''}
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                      onClick={() => {setEditingTargetLesion(null); setEditingTargetLesionIdx(null);}}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      onClick={() => {
                        if (!editingTargetLesion.site || !editingTargetLesion.baseline_mm || !editingTargetLesion.current_mm) return;
                        const next = [...formData.response.target_lesions];
                        if (editingTargetLesionIdx === null) next.push(editingTargetLesion); else next[editingTargetLesionIdx] = editingTargetLesion;
                        updateFormData('response.target_lesions', next);
                        setEditingTargetLesion(null); setEditingTargetLesionIdx(null);
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Non-Target Findings</FieldLabel>
              <TextArea
                name="non_target_findings"
                placeholder="Non-target lesions..."
                value={formData.response.non_target_findings}
                onChange={(e) => updateFormData('response.non_target_findings', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>New Lesions</FieldLabel>
              <TextArea
                name="new_lesions"
                placeholder="New lesions..."
                value={formData.response.new_lesions}
                onChange={(e) => updateFormData('response.new_lesions', e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.response.mrd.assessed}
                onChange={(e) => updateFormData('response.mrd.assessed', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm font-medium text-slate-700">MRD Assessed</label>
            </div>
            {formData.response.mrd.assessed && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                <Select
                  name="mrd_method"
                  value={formData.response.mrd.method}
                  onChange={(e) => updateFormData('response.mrd.method', e.target.value)}
                  options={[
                    { value: 'flow', label: 'Flow Cytometry' },
                    { value: 'NGS', label: 'NGS' },
                    { value: 'PCR', label: 'PCR' }
                  ]}
                />
                <Input
                  name="mrd_value"
                  placeholder="MRD value"
                  value={formData.response.mrd.value}
                  onChange={(e) => updateFormData('response.mrd.value', e.target.value)}
                />
                <Input
                  name="mrd_threshold"
                  placeholder="Threshold"
                  value={formData.response.mrd.threshold}
                  onChange={(e) => updateFormData('response.mrd.threshold', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tests & References */}
      <Card 
        title="Tests & Referenced Documents" 
        collapsible 
        isOpen={!collapsedSections.imaging}
        onToggle={() => toggleSection('imaging')}
        counter={formData.tests.referenced_docs.length}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Test Notes</FieldLabel>
            <TextArea
              name="tests_notes"
              placeholder="Additional test notes..."
              value={formData.tests.notes}
              onChange={(e) => updateFormData('tests.notes', e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <FieldLabel>Referenced Documents</FieldLabel>
            <div className="space-y-2">
              {formData.tests.referenced_docs.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <span className="text-sm">{doc.type}</span>
                  <span className="text-sm font-medium">{doc.title}</span>
                  <span className="text-sm text-slate-500">{doc.date}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('tests.referenced_docs', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                onClick={() => addToArray('tests.referenced_docs', {
                  type: 'Pathology',
                  title: '',
                  date: new Date().toISOString().split('T')[0]
                })}
              >
                + Add Reference
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Imaging Studies */}
      <Card 
        title="Imaging Studies" 
        collapsible 
        isOpen={!collapsedSections.imaging}
        onToggle={() => toggleSection('imaging')}
        counter={formData.imaging_links.length}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              onClick={() => {
                console.log('Auto-loading imaging studies...');
              }}
            >
              Load Imaging (Auto)
            </button>
            <input
              type="text"
              placeholder="Search studies..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <FieldLabel>Available Studies</FieldLabel>
            <div className="space-y-2">
              {availableImaging.map((study, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{study.modality}</span>
                      <span className="text-slate-600">{study.date}</span>
                      <span className="text-slate-600">{study.description}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      onClick={() => openImagingViewer(study)}
                    >
                      Open Viewer
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                      onClick={() => addImagingToReport(study)}
                    >
                      Add to Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Selected Studies</FieldLabel>
            <div className="space-y-2">
              {formData.imaging_links.map((imaging, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <span className="text-sm font-medium">{imaging.modality}</span>
                  <span className="text-sm text-slate-600">{imaging.description}</span>
                  <select 
                    className="text-xs border rounded px-1 py-0.5"
                    value={imaging.attach || 'reference_only'}
                    onChange={(e) => {
                      const next = clone(formData.imaging_links);
                      next[index].attach = e.target.value;
                      updateFormData('imaging_links', next);
                    }}
                  >
                    <option value="reference_only">Reference only</option>
                    <option value="embed_in_pdf">Embed in PDF</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openImagingViewer(imaging)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Open viewer"
                  >
                    🔗
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImagingFromReport(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Outcome & Recommendations (Discharge mode only) */}
      {mode === 'discharge' && (
        <Card 
          title="Outcome & Recommendations" 
          collapsible 
          isOpen={!collapsedSections.outcome}
          onToggle={() => toggleSection('outcome')}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Current Condition</FieldLabel>
                <TextArea
                  name="outcome_condition"
                  placeholder="Patient's current condition..."
                  value={formData.outcome.condition}
                  onChange={(e) => updateFormData('outcome.condition', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <FieldLabel>Hospital Course</FieldLabel>
                <TextArea
                  name="outcome_course"
                  placeholder="Summary of hospital course..."
                  value={formData.outcome.course}
                  onChange={(e) => updateFormData('outcome.course', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div>
              <FieldLabel required>Recommendations</FieldLabel>
              <div className="space-y-2">
                {formData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      name={`recommendation_${index}`}
                      placeholder="Recommendation..."
                      value={rec}
                      onChange={(e) => {
                        const newRecs = [...formData.recommendations];
                        newRecs[index] = e.target.value;
                        updateFormData('recommendations', newRecs);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeFromArray('recommendations', index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                  onClick={() => addToArray('recommendations', '')}
                >
                  + Add Recommendation
                </button>
              </div>
              {errors.recommendations && (
                <p className="text-red-500 text-sm mt-1">{errors.recommendations}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Attachments */}
      <Card 
        title="Attachments" 
        collapsible 
        isOpen={!collapsedSections.attachments}
        onToggle={() => toggleSection('attachments')}
        counter={formData.attachments.length}
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <p className="text-slate-500 mb-2">Drop files here or click to upload</p>
            <button
              type="button"
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            >
              Choose Files
            </button>
          </div>
          <div className="space-y-2">
            {formData.attachments.map((attachment, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm">{attachment.label || attachment.id}</span>
                <span className="text-xs text-slate-500">{attachment.type}</span>
                <button
                  type="button"
                  onClick={() => removeFromArray('attachments', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFinalize();
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Finalize & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OncologyReportForm;

