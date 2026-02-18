import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsAPI, icdCodesAPI, doctorPatientsAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from other report forms)
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

const Input = React.memo(({ name, placeholder, value, onChange, className = "", type = "text", required = false, readOnly = false }) => (
  <input
    type={type}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={readOnly ? undefined : onChange}
    required={required}
    readOnly={readOnly}
    className={`w-full px-4 py-4 border border-slate-200 rounded-lg text-base text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
  />
));

const Select = React.memo(({ name, value, onChange, options, className = "", required = false, t }) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    required={required}
    className={`w-full px-4 py-4 border border-slate-200 rounded-lg text-base text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
  >
    <option value="">{t ? t('allergyImmunologyReport.select') : 'Select...'}</option>
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

// Medication Search Component
const MedicationSearchInput = ({ value, onChange, onSelect, placeholder = "Search medication..." }) => {
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
        const response = await medicationsAPI.search(searchQuery, 20);
        const results = response.products || response.data?.products || [];
        setSearchResults(results);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Medication search error:', error);
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

  const handleSelect = (medication) => {
    setSearchQuery('');
    setShowResults(false);
    if (onSelect) {
      onSelect({
        med: medication.brand_name || medication.name || '',
        strength: medication.strength || '',
        mnn: medication.mnn?.name || '',
        form: medication.dosage_form?.name || ''
      });
    }
    if (onChange) {
      onChange({
        target: { value: medication.brand_name || medication.name || '' }
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
          value={value || searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (onChange) {
              onChange(e);
            }
          }}
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
              key={result.id || index}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none ${
                index === selectedIndex ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="font-medium text-sm text-emerald-700 flex-1">
                  {result.brand_name || result.name || 'Unknown'}
                </span>
                {result.strength && (
                  <span className="text-xs text-slate-500">
                    {result.strength} {result.strength_unit?.name || ''}
                  </span>
                )}
              </div>
              {result.mnn?.name && (
                <div className="text-xs text-slate-500 mt-1">
                  MNN: {result.mnn.name}
                </div>
              )}
              {result.dosage_form?.name && (
                <div className="text-xs text-slate-500">
                  Form: {result.dosage_form.name}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Utility function for deep cloning
const clone = (obj) => {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
};

// OHIF URL helper
const getOhifUrl = (studyUid) => {
  if (!studyUid) return '';
  return `https://ohif-viewer.example.com/viewer?studyUID=${studyUid}`;
};

// Module-scope presets
const CHIEF_COMPLAINT_PRESETS = [
  "nasal congestion", "sneezing", "itchy eyes", "skin rash", "urticaria",
  "angioedema", "wheezing", "food reaction", "drug reaction", "insect sting",
  "latex allergy", "anaphylaxis"
];

const FOOD_TRIGGERS = [
  "milk", "egg", "peanut", "tree nuts", "fish", "shellfish", "soy", "wheat",
  "sesame", "kiwi", "buckwheat"
];

const AEROALLERGENS = [
  "dust mite", "cat", "dog", "birch", "ragweed", "mugwort", "grass mix",
  "alder", "Alternaria", "Cladosporium"
];

const DRUG_TRIGGERS = [
  "penicillin", "cephalosporin", "NSAID", "contrast media", "chemotherapy"
];

const INSECT_VENOM = [
  "wasp", "bee", "hornet", "bumblebee"
];

const AVOIDANCE_ADVICE = [
  "dust mite control", "saline nasal rinses", "HEPA filter", "no pets in bedroom",
  "encase bedding", "mold remediation", "food/symptom diary"
];

const EDUCATION_TOPICS = [
  "intranasal spray technique", "skin care (emollients)", "anaphylaxis action plan",
  "auto-injector training", "asthma control steps"
];

const REFERRAL_PRESETS = [
  "pulmonology", "dermatology", "ent", "gastro", "immunology_lab"
];

const BIOLOGICS_PRESETS = [
  "omalizumab", "dupilumab", "mepolizumab", "benralizumab", "reslizumab", "tezepelumab"
];

const FOLLOW_UP_OPTIONS = ['48h', '1w', '1m', '3m', '6m', 'PRN', 'date'];

const DIAGNOSIS_CODE_PRESETS = [
  { system: 'ICD10', code: 'J30.9', term: 'Allergic rhinitis, unspecified' },
  { system: 'ICD10', code: 'L50.9', term: 'Urticaria, unspecified' },
  { system: 'ICD10', code: 'T78.4', term: 'Allergy, unspecified' },
  { system: 'ICD10', code: 'J45.9', term: 'Asthma, unspecified' }
];

const AllergyImmunologyReportForm = ({ patient, encounter, onSave }) => {
  const { t } = useTranslation();
  
  // Helper function to get translated preset
  const getTranslatedPreset = (preset, category) => {
    const keyMap = {
      // Chief complaint presets
      'nasal congestion': 'nasalCongestion',
      'itchy eyes': 'itchyEyes',
      'skin rash': 'skinRash',
      'tree nuts': 'treeNuts',
      'dust mite': 'dustMite',
      'grass mix': 'grassMix',
      'contrast media': 'contrastMedia',
      'insect sting': 'insectSting',
      'latex allergy': 'latexAllergy',
      'food reaction': 'foodReaction',
      'drug reaction': 'drugReaction',
      // Avoidance advice
      'dust mite control': 'dustMiteControl',
      'saline nasal rinses': 'salineNasalRinses',
      'hepa filter': 'hepaFilter',
      'no pets in bedroom': 'noPetsInBedroom',
      'encase bedding': 'encaseBedding',
      'mold remediation': 'moldRemediation',
      'food/symptom diary': 'foodSymptomDiary',
      // Education topics
      'intranasal spray technique': 'intranasalSprayTechnique',
      'skin care (emollients)': 'skinCareEmollients',
      'anaphylaxis action plan': 'anaphylaxisActionPlan',
      'auto-injector training': 'autoInjectorTraining',
      'asthma control steps': 'asthmaControlSteps',
      // Referrals
      'immunology_lab': 'immunologyLab'
    };
    const lowerPreset = preset.toLowerCase();
    let key = keyMap[lowerPreset];
    if (!key) {
      // Convert "preset name" to "presetName" format
      key = lowerPreset.split(/[\s\/_()]+/).map((word, i) => 
        i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      ).join('').replace(/[()]/g, '');
    }
    return t(`allergyImmunologyReport.${category}.${key}`, { defaultValue: preset });
  };
  
  // Mode state
  const [mode, setMode] = useState('initial');

  // Patient medications and loading state
  const [patientMedications, setPatientMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState({
    scores: false,
    hpi: false,
    vitals: true, // Closed by default
    exam: false,
    tests: false,
    diagnosis: false,
    plan: false,
    procedures: false,
    outcome: false,
    attachments: false
  });

  // Form data state
  const [formData, setFormData] = useState({
    doc_type: 'allergy.initial',
    meta: {
      clinic_id: '',
      department_id: 'allergy_immunology',
      physician_id: '',
      patient_id: '',
      encounter_id: '',
      datetime: ''
    },
    chief_complaint: '',
    scores: {
      rcat: { total: '' },
      act: { total: '' },
      uas7: { total: '' }
    },
    hpi: {
      onset: '',
      duration: '',
      course: '',
      index_exposure_time: '',
      last_reaction_time: '',
      latency_to_symptoms: '',
      triggers: {
        food: [],
        drug: [],
        insect: [],
        latex: false,
        aeroallergens: [],
        contact: [],
        cold: false,
        exercise: false,
        nsaid: false,
        alcohol: false
      },
      reaction_pattern: {
        ige_mediated: false,
        non_ige: false,
        mixed: false
      },
      systems_involved: {
        skin: false,
        gi: false,
        respiratory_upper: false,
        respiratory_lower: false,
        cv: false,
        neuro: false
      },
      symptom_details: '',
      anaphylaxis: {
        occurred: false,
        grade: '',
        epinephrine_given: false,
        ed_visit: false,
        tryptase_acute: '',
        tryptase_baseline: ''
      },
      atopic_history: {
        asthma: false,
        allergic_rhinitis: false,
        atopic_dermatitis: false,
        food_allergy: false,
        chronic_urticaria: false,
        nasal_polyps: false,
        eoe: false
      },
      occupational_exposure: '',
      home_env: {
        pets: false,
        smoke_exposure: false,
        dust_mites_mattress: false,
        visible_mold: false,
        seasonality: 'none'
      },
      meds_current: '',
      meds_contra: '',
      allergies_noted: '',
      pmh: '',
      psh: '',
      family: '',
      social: ''
    },
    vitals: {
      bp: '',
      hr: '',
      temp: '',
      spo2: '',
      height_cm: '',
      weight_kg: '',
      bmi: ''
    },
    exam: {
      skin: '',
      eyes: '',
      nose: '',
      throat: '',
      lungs: '',
      heart: '',
      abdomen: '',
      skin_urticaria: '',
      angioedema: '',
      ad_severity: '',
      nasal_findings: '',
      wheeze: ''
    },
    tests: {
      spt: [],
      idt: [],
      specific_ige: [],
      total_ige: '',
      eos_abs: '',
      tryptase_baseline: '',
      feNO_ppb: '',
      spirometry: {
        fev1_pct: '',
        fev1_fvc: '',
        bronchodilator_response: '',
        date: ''
      },
      peak_flow: {
        best_l_min: '',
        variability_pct: ''
      },
      labs_other: '',
      challenge: [],
      desensitization: [],
      imaging: [],
      imaging_links: [],
      referenced_docs: []
    },
    diagnosis: {
      main: '',
      secondary: [],
      codes: []
    },
    plan: {
      meds: [],
      avoidance: [],
      emergency_action_plan: {
        epinephrine_auto_injector_prescribed: false,
        dose_mg: '',
        devices: '0',
        training_provided: false,
        written_plan_given: false
      },
      immunotherapy: {
        candidate: false,
        modality: 'None',
        allergens: [],
        start_date: '',
        build_up_scheme: '',
        maintenance_interval_w: '',
        expected_duration_y: ''
      },
      biologics: [],
      education: [],
      vaccinations: [],
      referrals: [],
      follow_up: '',
      follow_up_date: ''
    },
    procedures_done: [],
    outcome: {
      condition: '',
      course: ''
    },
    recommendations: [],
    attachments: []
  });

  // Error state
  const [errors, setErrors] = useState({});

  // Autosave state
  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const payloadRef = useRef(null);

  // Smart editor states
  const [editingMed, setEditingMed] = useState(null);
  const [editingMedIdx, setEditingMedIdx] = useState(null);
  const [editingSPT, setEditingSPT] = useState(null);
  const [editingSPTIdx, setEditingSPTIdx] = useState(null);
  const [editingIDT, setEditingIDT] = useState(null);
  const [editingIDTIdx, setEditingIDTIdx] = useState(null);
  const [editingIgE, setEditingIgE] = useState(null);
  const [editingIgEIdx, setEditingIgEIdx] = useState(null);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [editingChallengeIdx, setEditingChallengeIdx] = useState(null);
  const [editingDesensitization, setEditingDesensitization] = useState(null);
  const [editingDesensitizationIdx, setEditingDesensitizationIdx] = useState(null);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [editingProcedureIdx, setEditingProcedureIdx] = useState(null);
  const [newCode, setNewCode] = useState({ system: '', code: '', term: '' });

  // Mock available imaging
  const [availableImaging] = useState([
    { study_uid: '1.2.3.4.5', description: 'Chest X-ray', date: '2024-01-15' },
    { study_uid: '1.2.3.4.6', description: 'Sinus CT', date: '2024-01-15' }
  ]);

  // Helper function to update form data
  const updateFormData = useCallback((path, value) => {
    setFormData(prev => {
      const newData = clone(prev);
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  }, []);

  // Helper functions for array operations
  const addToArray = useCallback((path, item) => {
    setFormData(prev => {
      const newData = clone(prev);
      const keys = path.split('.');
      let current = newData;
      
      for (const key of keys) {
        if (!(key in current) || !Array.isArray(current[key])) {
          current[key] = [];
        }
        current = current[key];
      }
      
      current.push(item);
      return newData;
    });
  }, []);

  const removeFromArray = useCallback((path, index) => {
    setFormData(prev => {
      const newData = clone(prev);
      const keys = path.split('.');
      let current = newData;
      
      for (const key of keys) {
        current = current[key];
      }
      
      current.splice(index, 1);
      return newData;
    });
  }, []);

  const toggleSection = useCallback((section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Initialize meta from props
  useEffect(() => {
    if (patient || encounter) {
      setFormData(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          patient_id: patient?.patient_id || prev.meta.patient_id,
          encounter_id: encounter?.id || prev.meta.encounter_id,
          clinic_id: encounter?.clinic_id || prev.meta.clinic_id || 'clinic-001',
          physician_id: encounter?.doctor_id || prev.meta.physician_id || 'doctor-001',
          datetime: encounter?.datetime || prev.meta.datetime || new Date().toISOString()
        },
        vitals: {
          ...prev.vitals,
          height_cm: patient?.height_cm ? String(patient.height_cm) : prev.vitals.height_cm,
          weight_kg: patient?.weight_kg ? String(patient.weight_kg) : prev.vitals.weight_kg
        }
      }));
    }
  }, [patient, encounter]);

  // Fetch vitals from backend (latest within 3 days)
  useEffect(() => {
    if (!patient?.patient_id) return;
    
    const fetchVitals = async () => {
      try {
        const vitalsList = await doctorPatientsAPI.getVitals(patient.patient_id);
        
        if (vitalsList && vitalsList.length > 0) {
          // Filter vitals to only include entries within the last 3 days
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          const recentVitals = vitalsList.filter(vital => {
            if (!vital.recorded_at) return false;
            const recordedDate = new Date(vital.recorded_at);
            return recordedDate >= threeDaysAgo;
          });
          
          // Get the most recent vitals entry from the filtered list (first in the list as it's sorted by recorded_at DESC)
          const latestVitals = recentVitals.length > 0 ? recentVitals[0] : null;
          
          if (latestVitals) {
            // Map backend vitals structure to form structure
            const mappedVitals = {
              bp: latestVitals.systolic_bp && latestVitals.diastolic_bp 
                ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` 
                : formData.vitals.bp || '',
              hr: latestVitals.heart_rate?.toString() || formData.vitals.hr || '',
              temp: latestVitals.temperature?.toString() || formData.vitals.temp || '',
              spo2: latestVitals.oxygen_saturation?.toString() || formData.vitals.spo2 || '',
              height_cm: latestVitals.height?.toString() || patient?.height_cm?.toString() || formData.vitals.height_cm || '',
              weight_kg: latestVitals.weight?.toString() || patient?.weight_kg?.toString() || formData.vitals.weight_kg || '',
              bmi: latestVitals.bmi?.toString() || formData.vitals.bmi || ''
            };
            
            // Only update if we have new vitals data
            if (latestVitals.systolic_bp || latestVitals.heart_rate || latestVitals.temperature || latestVitals.oxygen_saturation || latestVitals.height || latestVitals.weight) {
              setFormData(prev => ({
                ...prev,
                vitals: mappedVitals
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching vitals:', error);
      }
    };
    
    fetchVitals();
  }, [patient?.patient_id]);

  // Fetch patient medications from database
  useEffect(() => {
    const fetchPatientMedications = async () => {
      const patientId = patient?.patient_id || patient?.id || '';
      if (!patientId) return;

      try {
        setLoadingMedications(true);
        const medications = await doctorPatientsAPI.getMedications(patientId, true);
        // Handle both SuccessResponse format and direct array
        const medsArray = Array.isArray(medications) 
          ? medications 
          : (medications?.data && Array.isArray(medications.data) 
            ? medications.data 
            : []);
        setPatientMedications(medsArray);
      } catch (error) {
        console.error('Error fetching patient medications:', error);
        setPatientMedications([]);
      } finally {
        setLoadingMedications(false);
      }
    };
    
    fetchPatientMedications();
  }, [patient?.patient_id, patient?.id]);

  // Auto-calculate BMI
  useEffect(() => {
    const height = parseFloat(formData.vitals.height_cm);
    const weight = parseFloat(formData.vitals.weight_kg);
    if (height > 0 && weight > 0) {
      const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
      updateFormData('vitals.bmi', bmi);
    }
  }, [formData.vitals.height_cm, formData.vitals.weight_kg, updateFormData]);

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'initial' ? 'allergy.initial' : 'allergy.discharge'
    }));
  }, [mode]);

  // Smart editor helpers for medications
  const openMedEditor = useCallback((med = null, idx = null) => {
    if (med) {
      setEditingMed(clone(med));
      setEditingMedIdx(idx);
    } else {
      setEditingMed({
        med: '',
        conc_strength: '',
        route: '',
        freq: '',
        duration: '',
        instructions: '',
        sendToPharmacy: false,
        pharmacyId: ''
      });
      setEditingMedIdx(null);
    }
  }, []);

  const saveMed = useCallback(() => {
    if (!editingMed?.med) return;
    
    const newMeds = clone(formData.plan.meds);
    if (editingMedIdx !== null) {
      newMeds[editingMedIdx] = editingMed;
    } else {
      newMeds.push(editingMed);
    }
    updateFormData('plan.meds', newMeds);
    setEditingMed(null);
    setEditingMedIdx(null);
  }, [editingMed, editingMedIdx, formData.plan.meds, updateFormData]);

  const removeMed = useCallback((idx) => {
    removeFromArray('plan.meds', idx);
  }, [removeFromArray]);

  // Smart editor helpers for test procedures
  const openSPTEditor = useCallback((spt = null, idx = null) => {
    if (spt) {
      setEditingSPT(clone(spt));
      setEditingSPTIdx(idx);
    } else {
      setEditingSPT({
        allergen_group: '',
        allergen: '',
        wheal_mm: '',
        flare_mm: '',
        control_histamine_mm: '',
        date: ''
      });
      setEditingSPTIdx(null);
    }
  }, []);

  const saveSPT = useCallback(() => {
    if (!editingSPT?.allergen) return;
    const newSPT = clone(formData.tests.spt);
    if (editingSPTIdx !== null) {
      newSPT[editingSPTIdx] = editingSPT;
    } else {
      newSPT.push(editingSPT);
    }
    updateFormData('tests.spt', newSPT);
    setEditingSPT(null);
    setEditingSPTIdx(null);
  }, [editingSPT, editingSPTIdx, formData.tests.spt, updateFormData]);

  const openIDTEditor = useCallback((idt = null, idx = null) => {
    if (idt) {
      setEditingIDT(clone(idt));
      setEditingIDTIdx(idx);
    } else {
      setEditingIDT({
        allergen: '',
        dilution: '',
        wheal_mm: '',
        date: ''
      });
      setEditingIDTIdx(null);
    }
  }, []);

  const saveIDT = useCallback(() => {
    if (!editingIDT?.allergen) return;
    const newIDT = clone(formData.tests.idt);
    if (editingIDTIdx !== null) {
      newIDT[editingIDTIdx] = editingIDT;
    } else {
      newIDT.push(editingIDT);
    }
    updateFormData('tests.idt', newIDT);
    setEditingIDT(null);
    setEditingIDTIdx(null);
  }, [editingIDT, editingIDTIdx, formData.tests.idt, updateFormData]);

  const openIgEEditor = useCallback((ige = null, idx = null) => {
    if (ige) {
      setEditingIgE(clone(ige));
      setEditingIgEIdx(idx);
    } else {
      setEditingIgE({
        allergen: '',
        value_kua_l: '',
        class_0_6: '',
        date: ''
      });
      setEditingIgEIdx(null);
    }
  }, []);

  const saveIgE = useCallback(() => {
    if (!editingIgE?.allergen) return;
    const newIgE = clone(formData.tests.specific_ige);
    if (editingIgEIdx !== null) {
      newIgE[editingIgEIdx] = editingIgE;
    } else {
      newIgE.push(editingIgE);
    }
    updateFormData('tests.specific_ige', newIgE);
    setEditingIgE(null);
    setEditingIgEIdx(null);
  }, [editingIgE, editingIgEIdx, formData.tests.specific_ige, updateFormData]);

  const openChallengeEditor = useCallback((challenge = null, idx = null) => {
    if (challenge) {
      setEditingChallenge(clone(challenge));
      setEditingChallengeIdx(idx);
    } else {
      setEditingChallenge({
        type: '',
        protocol: '',
        outcome: '',
        reactions: '',
        stopped_due_to: '',
        date: ''
      });
      setEditingChallengeIdx(null);
    }
  }, []);

  const saveChallenge = useCallback(() => {
    if (!editingChallenge?.type || !editingChallenge?.date) return;
    const newChallenge = clone(formData.tests.challenge);
    if (editingChallengeIdx !== null) {
      newChallenge[editingChallengeIdx] = editingChallenge;
    } else {
      newChallenge.push(editingChallenge);
    }
    updateFormData('tests.challenge', newChallenge);
    setEditingChallenge(null);
    setEditingChallengeIdx(null);
  }, [editingChallenge, editingChallengeIdx, formData.tests.challenge, updateFormData]);

  const openDesensitizationEditor = useCallback((desens = null, idx = null) => {
    if (desens) {
      setEditingDesensitization(clone(desens));
      setEditingDesensitizationIdx(idx);
    } else {
      setEditingDesensitization({
        agent: '',
        protocol: '',
        premeds: '',
        outcome: '',
        reactions: '',
        date: ''
      });
      setEditingDesensitizationIdx(null);
    }
  }, []);

  const saveDesensitization = useCallback(() => {
    if (!editingDesensitization?.agent || !editingDesensitization?.date) return;
    const newDesens = clone(formData.tests.desensitization);
    if (editingDesensitizationIdx !== null) {
      newDesens[editingDesensitizationIdx] = editingDesensitization;
    } else {
      newDesens.push(editingDesensitization);
    }
    updateFormData('tests.desensitization', newDesens);
    setEditingDesensitization(null);
    setEditingDesensitizationIdx(null);
  }, [editingDesensitization, editingDesensitizationIdx, formData.tests.desensitization, updateFormData]);

  const openProcedureEditor = useCallback((proc = null, idx = null) => {
    if (proc) {
      setEditingProcedure(clone(proc));
      setEditingProcedureIdx(idx);
    } else {
      setEditingProcedure({
        name: '',
        date: '',
        setting: '',
        premeds: '',
        technique: '',
        findings: '',
        result: '',
        adverse_events: ''
      });
      setEditingProcedureIdx(null);
    }
  }, []);

  const saveProcedure = useCallback(() => {
    if (!editingProcedure?.name || !editingProcedure?.date) return;
    const newProcs = clone(formData.procedures_done);
    if (editingProcedureIdx !== null) {
      newProcs[editingProcedureIdx] = editingProcedure;
    } else {
      newProcs.push(editingProcedure);
    }
    updateFormData('procedures_done', newProcs);
    setEditingProcedure(null);
    setEditingProcedureIdx(null);
  }, [editingProcedure, editingProcedureIdx, formData.procedures_done, updateFormData]);

  const removeProcedure = useCallback((idx) => {
    removeFromArray('procedures_done', idx);
  }, [removeFromArray]);

  // OHIF imaging helpers
  const addImagingToReport = useCallback((study) => {
    const link = {
      modality: study.modality || '',
      date: study.date || '',
      description: study.description || '',
      study_uid: study.study_uid || '',
      ohif_url: getOhifUrl(study.study_uid),
      attach: 'reference_only',
      note: ''
    };
    addToArray('tests.imaging_links', link);
  }, [addToArray]);

  const removeImagingFromReport = useCallback((idx) => {
    removeFromArray('tests.imaging_links', idx);
  }, [removeFromArray]);

  const openImagingViewer = useCallback((url) => {
    if (typeof window !== 'undefined' && url) {
      window.open(url, '_blank');
    }
  }, []);

  // Validation function
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.chief_complaint.trim()) {
      newErrors.chief_complaint = 'Chief complaint is required';
    }

    if (!formData.diagnosis.main.trim()) {
      newErrors['diagnosis.main'] = 'Main diagnosis is required';
    }

    // Score validations
    if (formData.scores.rcat.total && (parseFloat(formData.scores.rcat.total) < 0 || parseFloat(formData.scores.rcat.total) > 30)) {
      newErrors['scores.rcat.total'] = 'RCAT score must be 0-30';
    }
    if (formData.scores.act.total && (parseFloat(formData.scores.act.total) < 5 || parseFloat(formData.scores.act.total) > 25)) {
      newErrors['scores.act.total'] = 'ACT score must be 5-25';
    }
    if (formData.scores.uas7.total && (parseFloat(formData.scores.uas7.total) < 0 || parseFloat(formData.scores.uas7.total) > 42)) {
      newErrors['scores.uas7.total'] = 'UAS7 score must be 0-42';
    }

    // SPT/IDT validations
    formData.tests.spt.forEach((spt, idx) => {
      if (spt.allergen && !spt.wheal_mm) {
        newErrors[`tests.spt.${idx}.wheal_mm`] = 'Wheal size required';
      }
      if (spt.allergen && !spt.date) {
        newErrors[`tests.spt.${idx}.date`] = 'Date required';
      }
    });

    formData.tests.idt.forEach((idt, idx) => {
      if (idt.allergen && !idt.wheal_mm) {
        newErrors[`tests.idt.${idx}.wheal_mm`] = 'Wheal size required';
      }
      if (idt.allergen && !idt.date) {
        newErrors[`tests.idt.${idx}.date`] = 'Date required';
      }
    });

    // Specific IgE validations
    formData.tests.specific_ige.forEach((ige, idx) => {
      if (ige.allergen && ige.value_kua_l && parseFloat(ige.value_kua_l) < 0) {
        newErrors[`tests.specific_ige.${idx}.value_kua_l`] = 'Value must be ≥ 0';
      }
      if (ige.allergen && ige.value_kua_l && !ige.date) {
        newErrors[`tests.specific_ige.${idx}.date`] = 'Date required';
      }
    });

    // Challenge/Desensitization validations
    formData.tests.challenge.forEach((ch, idx) => {
      if (ch.type && !ch.date) {
        newErrors[`tests.challenge.${idx}.date`] = 'Date required';
      }
      if (ch.type && !ch.outcome) {
        newErrors[`tests.challenge.${idx}.outcome`] = 'Outcome required';
      }
    });

    formData.tests.desensitization.forEach((des, idx) => {
      if (des.agent && !des.date) {
        newErrors[`tests.desensitization.${idx}.date`] = 'Date required';
      }
      if (des.agent && !des.outcome) {
        newErrors[`tests.desensitization.${idx}.outcome`] = 'Outcome required';
      }
    });

    // Procedures validations
    formData.procedures_done.forEach((proc, idx) => {
      if (proc.name && !proc.date) {
        newErrors[`procedures_done.${idx}.date`] = 'Date required';
      }
    });

    // Follow-up date validation
    if (formData.plan.follow_up === 'date' && !formData.plan.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required';
    }

    // Discharge mode: recommendations required
    if (mode === 'discharge' && formData.recommendations.length === 0) {
      newErrors.recommendations = 'At least one recommendation is required for discharge';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  // Build payload function
  const buildPayload = useCallback(() => {
    const payload = clone(formData);
    
    // Shallow prune empty strings, arrays, and objects
    const pruneEmpty = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) {
        return obj.length > 0 ? obj : undefined;
      }
      const pruned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value === '' || value === null || value === undefined) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof value === 'object' && Object.keys(value).length === 0) continue;
        pruned[key] = typeof value === 'object' ? pruneEmpty(value) : value;
      }
      return Object.keys(pruned).length > 0 ? pruned : undefined;
    };

    return pruneEmpty(payload) || {};
  }, [formData]);

  // Autosave setup
  useEffect(() => {
    payloadRef.current = buildPayload();
  }, [buildPayload]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (payloadRef.current) {
        const payload = buildPayload();
        console.log('DRAFT', payload);
        setLastSaved(new Date());
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2500);
        payloadRef.current = payload;
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [buildPayload]);

  // Handler functions
  const handleSaveDraft = useCallback(() => {
    const payload = buildPayload();
    console.log('SAVE DRAFT', payload);
  }, [buildPayload]);

  const handlePreview = useCallback(() => {
    const payload = buildPayload();
    console.log('PREVIEW', payload);
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

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('initial')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  mode === 'initial'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('allergyImmunologyReport.initial')}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('discharge')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  mode === 'discharge'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('allergyImmunologyReport.discharge')}
              </button>
            </div>
            <div className="text-sm text-slate-500">
              {lastSaved && `${t('allergyImmunologyReport.lastSaved')}: ${lastSaved.toLocaleTimeString()}`}
            </div>
          </div>
        </div>
      </Card>

      {/* Autosave Toast */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {t('allergyImmunologyReport.savedAt')} {lastSaved?.toLocaleTimeString()}
        </div>
      )}

      {/* Chief Complaint */}
      <Card>
        <div>
          <FieldLabel required>{t('allergyImmunologyReport.chiefComplaint')}</FieldLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {CHIEF_COMPLAINT_PRESETS.map(preset => {
              const translatedPreset = getTranslatedPreset(preset, 'chiefComplaintPresets');
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const current = formData.chief_complaint;
                    updateFormData('chief_complaint', current ? `${current}, ${translatedPreset}` : translatedPreset);
                  }}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                >
                  + {translatedPreset}
                </button>
              );
            })}
          </div>
          <Input
            name="chief_complaint"
            placeholder={t('allergyImmunologyReport.chiefComplaintPlaceholder')}
            value={formData.chief_complaint}
            onChange={(e) => updateFormData('chief_complaint', e.target.value)}
          />
          {errors.chief_complaint && (
            <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
          )}
        </div>
      </Card>

      {/* Scores */}
      <Card title={t('allergyImmunologyReport.scores')} collapsible isOpen={!collapsedSections.scores} onToggle={() => toggleSection('scores')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel>{t('allergyImmunologyReport.rcat')}</FieldLabel>
            <Input
              type="number"
              name="rcat_total"
              placeholder="0-30"
              value={formData.scores.rcat.total}
              onChange={(e) => updateFormData('scores.rcat.total', e.target.value)}
            />
            {errors['scores.rcat.total'] && (
              <p className="text-red-500 text-sm mt-1">{errors['scores.rcat.total']}</p>
            )}
          </div>
          <div>
            <FieldLabel>{t('allergyImmunologyReport.act')}</FieldLabel>
            <Input
              type="number"
              name="act_total"
              placeholder="5-25"
              value={formData.scores.act.total}
              onChange={(e) => updateFormData('scores.act.total', e.target.value)}
            />
            {errors['scores.act.total'] && (
              <p className="text-red-500 text-sm mt-1">{errors['scores.act.total']}</p>
            )}
          </div>
          <div>
            <FieldLabel>{t('allergyImmunologyReport.uas7')}</FieldLabel>
            <Input
              type="number"
              name="uas7_total"
              placeholder="0-42"
              value={formData.scores.uas7.total}
              onChange={(e) => updateFormData('scores.uas7.total', e.target.value)}
            />
            {errors['scores.uas7.total'] && (
              <p className="text-red-500 text-sm mt-1">{errors['scores.uas7.total']}</p>
            )}
          </div>
        </div>
      </Card>

      {/* HPI */}
      <Card title={t('allergyImmunologyReport.historyOfPresentIllness')} collapsible isOpen={!collapsedSections.hpi} onToggle={() => toggleSection('hpi')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.onset')}</FieldLabel>
              <Select
                name="onset"
                value={formData.hpi.onset}
                onChange={(e) => updateFormData('hpi.onset', e.target.value)}
                options={[
                  { value: 'acute', label: t('allergyImmunologyReport.acute') },
                  { value: 'subacute', label: t('allergyImmunologyReport.subacute') },
                  { value: 'chronic', label: t('allergyImmunologyReport.chronic') }
                ]}
                t={t}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.duration')}</FieldLabel>
              <Input
                name="duration"
                placeholder={t('allergyImmunologyReport.durationPlaceholder')}
                value={formData.hpi.duration}
                onChange={(e) => updateFormData('hpi.duration', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.course')}</FieldLabel>
              <Select
                name="course"
                value={formData.hpi.course}
                onChange={(e) => updateFormData('hpi.course', e.target.value)}
                options={[
                  { value: 'intermittent', label: t('allergyImmunologyReport.intermittent') },
                  { value: 'persistent', label: t('allergyImmunologyReport.persistent') },
                  { value: 'progressive', label: t('allergyImmunologyReport.progressive') }
                ]}
                t={t}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.indexExposureTime')}</FieldLabel>
              <Input
                type="datetime-local"
                name="index_exposure_time"
                value={formData.hpi.index_exposure_time}
                onChange={(e) => updateFormData('hpi.index_exposure_time', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.lastReactionTime')}</FieldLabel>
              <Input
                type="datetime-local"
                name="last_reaction_time"
                value={formData.hpi.last_reaction_time}
                onChange={(e) => updateFormData('hpi.last_reaction_time', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.latencyToSymptoms')}</FieldLabel>
              <Input
                name="latency_to_symptoms"
                placeholder={t('allergyImmunologyReport.latencyPlaceholder')}
                value={formData.hpi.latency_to_symptoms}
                onChange={(e) => updateFormData('hpi.latency_to_symptoms', e.target.value)}
              />
            </div>
          </div>

          {/* Triggers */}
          <div>
            <FieldLabel>{t('allergyImmunologyReport.triggers')}</FieldLabel>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-600 mb-1">{t('allergyImmunologyReport.food')}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {FOOD_TRIGGERS.map(preset => {
                    const translatedPreset = getTranslatedPreset(preset, 'foodTriggers');
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const current = formData.hpi.triggers.food;
                          const originalPreset = preset;
                          if (current.includes(originalPreset)) {
                            removeFromArray('hpi.triggers.food', current.indexOf(originalPreset));
                          } else {
                            addToArray('hpi.triggers.food', originalPreset);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          formData.hpi.triggers.food.includes(preset)
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {translatedPreset}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-600 mb-1">{t('allergyImmunologyReport.aeroallergens')}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {AEROALLERGENS.map(preset => {
                    const translatedPreset = getTranslatedPreset(preset, 'aeroallergenPresets');
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const current = formData.hpi.triggers.aeroallergens;
                          const originalPreset = preset;
                          if (current.includes(originalPreset)) {
                            removeFromArray('hpi.triggers.aeroallergens', current.indexOf(originalPreset));
                          } else {
                            addToArray('hpi.triggers.aeroallergens', originalPreset);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          formData.hpi.triggers.aeroallergens.includes(preset)
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {translatedPreset}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-600 mb-1">{t('allergyImmunologyReport.drugs')}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {DRUG_TRIGGERS.map(preset => {
                    const translatedPreset = getTranslatedPreset(preset, 'drugTriggers');
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const current = formData.hpi.triggers.drug;
                          const originalPreset = preset;
                          if (current.includes(originalPreset)) {
                            removeFromArray('hpi.triggers.drug', current.indexOf(originalPreset));
                          } else {
                            addToArray('hpi.triggers.drug', originalPreset);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          formData.hpi.triggers.drug.includes(preset)
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {translatedPreset}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-600 mb-1">{t('allergyImmunologyReport.insectVenom')}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {INSECT_VENOM.map(preset => {
                    const translatedPreset = getTranslatedPreset(preset, 'insectVenomPresets');
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const current = formData.hpi.triggers.insect;
                          const originalPreset = preset;
                          if (current.includes(originalPreset)) {
                            removeFromArray('hpi.triggers.insect', current.indexOf(originalPreset));
                          } else {
                            addToArray('hpi.triggers.insect', originalPreset);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          formData.hpi.triggers.insect.includes(preset)
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {translatedPreset}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.triggers.latex}
                    onChange={(e) => updateFormData('hpi.triggers.latex', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('allergyImmunologyReport.latex')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.triggers.cold}
                    onChange={(e) => updateFormData('hpi.triggers.cold', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('allergyImmunologyReport.cold')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.triggers.exercise}
                    onChange={(e) => updateFormData('hpi.triggers.exercise', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('allergyImmunologyReport.exercise')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.triggers.nsaid}
                    onChange={(e) => updateFormData('hpi.triggers.nsaid', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('allergyImmunologyReport.nsaid')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.triggers.alcohol}
                    onChange={(e) => updateFormData('hpi.triggers.alcohol', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('allergyImmunologyReport.alcohol')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Reaction Pattern */}
          <div>
            <FieldLabel>{t('allergyImmunologyReport.reactionPattern')}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.reaction_pattern.ige_mediated}
                  onChange={(e) => updateFormData('hpi.reaction_pattern.ige_mediated', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.igeMediated')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.reaction_pattern.non_ige}
                  onChange={(e) => updateFormData('hpi.reaction_pattern.non_ige', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.nonIge')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.reaction_pattern.mixed}
                  onChange={(e) => updateFormData('hpi.reaction_pattern.mixed', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.mixed')}</span>
              </label>
            </div>
          </div>

          {/* Systems Involved */}
          <div>
            <FieldLabel>{t('allergyImmunologyReport.systemsInvolved')}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.systems_involved.skin}
                  onChange={(e) => updateFormData('hpi.systems_involved.skin', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.skin')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.systems_involved.gi}
                  onChange={(e) => updateFormData('hpi.systems_involved.gi', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.gi')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.systems_involved.respiratory_upper}
                  onChange={(e) => updateFormData('hpi.systems_involved.respiratory_upper', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.respiratoryUpper')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.systems_involved.respiratory_lower}
                  onChange={(e) => updateFormData('hpi.systems_involved.respiratory_lower', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.respiratoryLower')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.systems_involved.cv}
                  onChange={(e) => updateFormData('hpi.systems_involved.cv', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.cardiovascular')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.systems_involved.neuro}
                  onChange={(e) => updateFormData('hpi.systems_involved.neuro', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.neurological')}</span>
              </label>
            </div>
          </div>

          {/* Symptom Details */}
          <div>
            <FieldLabel>{t('allergyImmunologyReport.symptomDetails')}</FieldLabel>
            <TextArea
              name="symptom_details"
              placeholder={t('allergyImmunologyReport.symptomDetailsPlaceholder')}
              value={formData.hpi.symptom_details}
              onChange={(e) => updateFormData('hpi.symptom_details', e.target.value)}
              rows={3}
            />
          </div>

          {/* Anaphylaxis */}
          <div className="border-t pt-4">
            <FieldLabel>{t('allergyImmunologyReport.anaphylaxis')}</FieldLabel>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.anaphylaxis.occurred}
                  onChange={(e) => updateFormData('hpi.anaphylaxis.occurred', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">{t('allergyImmunologyReport.anaphylaxisOccurred')}</span>
              </label>
              
              {formData.hpi.anaphylaxis.occurred && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <FieldLabel>{t('allergyImmunologyReport.grade')}</FieldLabel>
                      <Select
                        name="anaphylaxis_grade"
                        value={formData.hpi.anaphylaxis.grade}
                        onChange={(e) => updateFormData('hpi.anaphylaxis.grade', e.target.value)}
                        options={[
                          { value: 'I', label: t('allergyImmunologyReport.gradeI') },
                          { value: 'II', label: t('allergyImmunologyReport.gradeII') },
                          { value: 'III', label: t('allergyImmunologyReport.gradeIII') },
                          { value: 'IV', label: t('allergyImmunologyReport.gradeIV') }
                        ]}
                        t={t}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('allergyImmunologyReport.tryptaseAcute')}</FieldLabel>
                      <Input
                        name="tryptase_acute"
                        placeholder={t('allergyImmunologyReport.tryptasePlaceholder')}
                        value={formData.hpi.anaphylaxis.tryptase_acute}
                        onChange={(e) => updateFormData('hpi.anaphylaxis.tryptase_acute', e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('allergyImmunologyReport.tryptaseBaseline')}</FieldLabel>
                      <Input
                        name="tryptase_baseline"
                        placeholder={t('allergyImmunologyReport.tryptasePlaceholder')}
                        value={formData.hpi.anaphylaxis.tryptase_baseline}
                        onChange={(e) => updateFormData('hpi.anaphylaxis.tryptase_baseline', e.target.value)}
                      />
                    </div>
                  </div>
                  {formData.hpi.anaphylaxis.tryptase_acute && !formData.hpi.anaphylaxis.tryptase_baseline && (
                    <div className="ml-6 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                      {t('allergyImmunologyReport.baselineTryptaseWarning')}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 ml-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hpi.anaphylaxis.epinephrine_given}
                        onChange={(e) => updateFormData('hpi.anaphylaxis.epinephrine_given', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t('allergyImmunologyReport.epinephrineGiven')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hpi.anaphylaxis.ed_visit}
                        onChange={(e) => updateFormData('hpi.anaphylaxis.ed_visit', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t('allergyImmunologyReport.edVisit')}</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Atopic History */}
          <div className="border-t pt-4">
            <FieldLabel>{t('allergyImmunologyReport.atopicHistory')}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.atopic_history.asthma}
                  onChange={(e) => updateFormData('hpi.atopic_history.asthma', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.asthma')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.atopic_history.allergic_rhinitis}
                  onChange={(e) => updateFormData('hpi.atopic_history.allergic_rhinitis', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.allergicRhinitis')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.atopic_history.atopic_dermatitis}
                  onChange={(e) => updateFormData('hpi.atopic_history.atopic_dermatitis', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.atopicDermatitis')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.atopic_history.food_allergy}
                  onChange={(e) => updateFormData('hpi.atopic_history.food_allergy', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.foodAllergy')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.atopic_history.chronic_urticaria}
                  onChange={(e) => updateFormData('hpi.atopic_history.chronic_urticaria', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.chronicUrticaria')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.atopic_history.nasal_polyps}
                  onChange={(e) => updateFormData('hpi.atopic_history.nasal_polyps', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.nasalPolyps')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.atopic_history.eoe}
                  onChange={(e) => updateFormData('hpi.atopic_history.eoe', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('allergyImmunologyReport.eoe')}</span>
              </label>
            </div>
          </div>

          {/* Occupational & Home Environment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.occupationalExposure')}</FieldLabel>
              <TextArea
                name="occupational_exposure"
                placeholder={t('allergyImmunologyReport.occupationalExposurePlaceholder')}
                value={formData.hpi.occupational_exposure}
                onChange={(e) => updateFormData('hpi.occupational_exposure', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.homeEnvironment')}</FieldLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.hpi.home_env.pets}
                      onChange={(e) => updateFormData('hpi.home_env.pets', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t('allergyImmunologyReport.pets')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.hpi.home_env.smoke_exposure}
                      onChange={(e) => updateFormData('hpi.home_env.smoke_exposure', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t('allergyImmunologyReport.smokeExposure')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.hpi.home_env.dust_mites_mattress}
                      onChange={(e) => updateFormData('hpi.home_env.dust_mites_mattress', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t('allergyImmunologyReport.dustMitesMattress')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.hpi.home_env.visible_mold}
                      onChange={(e) => updateFormData('hpi.home_env.visible_mold', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t('allergyImmunologyReport.visibleMold')}</span>
                  </label>
                </div>
                <Select
                  name="seasonality"
                  value={formData.hpi.home_env.seasonality}
                  onChange={(e) => updateFormData('hpi.home_env.seasonality', e.target.value)}
                  options={[
                    { value: 'none', label: t('allergyImmunologyReport.none') },
                    { value: 'spring', label: t('allergyImmunologyReport.spring') },
                    { value: 'summer', label: t('allergyImmunologyReport.summer') },
                    { value: 'autumn', label: t('allergyImmunologyReport.autumn') },
                    { value: 'winter', label: t('allergyImmunologyReport.winter') },
                    { value: 'perennial', label: t('allergyImmunologyReport.perennial') }
                  ]}
                  t={t}
                />
              </div>
            </div>
          </div>

          {/* Medications & History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.currentMedications')}</FieldLabel>
              {patientMedications.length > 0 && (
                <div className="mb-2 p-2 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="text-xs font-semibold mb-1 text-blue-800">{t('allergyImmunologyReport.fromPatientRecord') || 'From Patient Record'}</div>
                  <div className="space-y-1">
                    {patientMedications.map((med, idx) => (
                      <div key={idx} className="text-xs text-blue-700">
                        • {med.medication_name || med.name} {med.dosage || ''} {med.frequency || ''} {med.route || ''}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const medsText = patientMedications.map(m => 
                        `${m.medication_name || m.name} ${m.dosage || ''} ${m.frequency || ''} ${m.route || ''}`.trim()
                      ).join(', ');
                      updateFormData('hpi.meds_current', medsText);
                    }}
                    className="mt-1 text-xs underline text-blue-600 hover:text-blue-800"
                  >
                    {t('allergyImmunologyReport.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
              <TextArea
                name="meds_current"
                placeholder={t('allergyImmunologyReport.currentMedicationsPlaceholder')}
                value={formData.hpi.meds_current}
                onChange={(e) => updateFormData('hpi.meds_current', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.contraindicatedMedications')}</FieldLabel>
              <TextArea
                name="meds_contra"
                placeholder={t('allergyImmunologyReport.contraindicatedMedicationsPlaceholder')}
                value={formData.hpi.meds_contra}
                onChange={(e) => updateFormData('hpi.meds_contra', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.allergiesNoted')}</FieldLabel>
              <Input
                name="allergies_noted"
                placeholder={t('allergyImmunologyReport.allergiesNotedPlaceholder')}
                value={formData.hpi.allergies_noted}
                onChange={(e) => updateFormData('hpi.allergies_noted', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.pastMedicalHistory')}</FieldLabel>
              <TextArea
                name="pmh"
                placeholder={t('allergyImmunologyReport.pmhPlaceholder')}
                value={formData.hpi.pmh}
                onChange={(e) => updateFormData('hpi.pmh', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.pastSurgicalHistory')}</FieldLabel>
              <TextArea
                name="psh"
                placeholder={t('allergyImmunologyReport.pshPlaceholder')}
                value={formData.hpi.psh}
                onChange={(e) => updateFormData('hpi.psh', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.familyHistory')}</FieldLabel>
              <TextArea
                name="family"
                placeholder={t('allergyImmunologyReport.familyHistoryPlaceholder')}
                value={formData.hpi.family}
                onChange={(e) => updateFormData('hpi.family', e.target.value)}
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>{t('allergyImmunologyReport.socialHistory')}</FieldLabel>
              <TextArea
                name="social"
                placeholder={t('allergyImmunologyReport.socialHistoryPlaceholder')}
                value={formData.hpi.social}
                onChange={(e) => updateFormData('hpi.social', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* AI Suggest Button */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!formData.chief_complaint.trim()}
              onClick={() => console.log('AI Suggest')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                formData.chief_complaint.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {t('allergyImmunologyReport.aiSuggest')}
            </button>
          </div>
        </div>
      </Card>

      {/* Vitals & Physical Exam */}
      <Card title={t('allergyImmunologyReport.vitalsPhysicalExam')} collapsible isOpen={!collapsedSections.vitals} onToggle={() => toggleSection('vitals')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.bp')}</FieldLabel>
              <Input
                name="bp"
                placeholder={t('allergyImmunologyReport.bpPlaceholder')}
                value={formData.vitals.bp}
                onChange={(e) => updateFormData('vitals.bp', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.hr')}</FieldLabel>
              <Input
                name="hr"
                placeholder={t('allergyImmunologyReport.hrPlaceholder')}
                value={formData.vitals.hr}
                onChange={(e) => updateFormData('vitals.hr', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.temp')}</FieldLabel>
              <Input
                name="temp"
                placeholder={t('allergyImmunologyReport.tempPlaceholder')}
                value={formData.vitals.temp}
                onChange={(e) => updateFormData('vitals.temp', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.spo2')}</FieldLabel>
              <Input
                name="spo2"
                placeholder={t('allergyImmunologyReport.spo2Placeholder')}
                value={formData.vitals.spo2}
                onChange={(e) => updateFormData('vitals.spo2', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.heightCm')}</FieldLabel>
              <Input
                type="number"
                name="height_cm"
                value={formData.vitals.height_cm}
                onChange={(e) => updateFormData('vitals.height_cm', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.weightKg')}</FieldLabel>
              <Input
                type="number"
                name="weight_kg"
                value={formData.vitals.weight_kg}
                onChange={(e) => updateFormData('vitals.weight_kg', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.bmi')}</FieldLabel>
              <Input
                name="bmi"
                value={formData.vitals.bmi}
                readOnly
                className="bg-slate-50"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title={t('allergyImmunologyReport.physicalExamination')} collapsible isOpen={!collapsedSections.exam} onToggle={() => toggleSection('exam')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.skin')}</FieldLabel>
              <TextArea
                name="skin"
                placeholder={t('allergyImmunologyReport.skinPlaceholder')}
                value={formData.exam.skin}
                onChange={(e) => updateFormData('exam.skin', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.eyes')}</FieldLabel>
              <TextArea
                name="eyes"
                placeholder={t('allergyImmunologyReport.eyesPlaceholder')}
                value={formData.exam.eyes}
                onChange={(e) => updateFormData('exam.eyes', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.nose')}</FieldLabel>
              <TextArea
                name="nose"
                placeholder={t('allergyImmunologyReport.nosePlaceholder')}
                value={formData.exam.nose}
                onChange={(e) => updateFormData('exam.nose', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.throat')}</FieldLabel>
              <TextArea
                name="throat"
                placeholder={t('allergyImmunologyReport.throatPlaceholder')}
                value={formData.exam.throat}
                onChange={(e) => updateFormData('exam.throat', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.lungs')}</FieldLabel>
              <TextArea
                name="lungs"
                placeholder={t('allergyImmunologyReport.lungsPlaceholder')}
                value={formData.exam.lungs}
                onChange={(e) => updateFormData('exam.lungs', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.heart')}</FieldLabel>
              <TextArea
                name="heart"
                placeholder={t('allergyImmunologyReport.heartPlaceholder')}
                value={formData.exam.heart}
                onChange={(e) => updateFormData('exam.heart', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.abdomen')}</FieldLabel>
              <TextArea
                name="abdomen"
                placeholder={t('allergyImmunologyReport.abdomenPlaceholder')}
                value={formData.exam.abdomen}
                onChange={(e) => updateFormData('exam.abdomen', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.urticaria')}</FieldLabel>
              <Select
                name="skin_urticaria"
                value={formData.exam.skin_urticaria}
                onChange={(e) => updateFormData('exam.skin_urticaria', e.target.value)}
                options={[
                  { value: 'present', label: t('allergyImmunologyReport.present') },
                  { value: 'absent', label: t('allergyImmunologyReport.absent') }
                ]}
                t={t}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.angioedema')}</FieldLabel>
              <Select
                name="angioedema"
                value={formData.exam.angioedema}
                onChange={(e) => updateFormData('exam.angioedema', e.target.value)}
                options={[
                  { value: 'present', label: t('allergyImmunologyReport.present') },
                  { value: 'absent', label: t('allergyImmunologyReport.absent') }
                ]}
                t={t}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.wheeze')}</FieldLabel>
              <Select
                name="wheeze"
                value={formData.exam.wheeze}
                onChange={(e) => updateFormData('exam.wheeze', e.target.value)}
                options={[
                  { value: 'present', label: t('allergyImmunologyReport.present') },
                  { value: 'absent', label: t('allergyImmunologyReport.absent') }
                ]}
                t={t}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.adSeverity')}</FieldLabel>
              <Input
                name="ad_severity"
                placeholder={t('allergyImmunologyReport.adSeverityPlaceholder')}
                value={formData.exam.ad_severity}
                onChange={(e) => updateFormData('exam.ad_severity', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.nasalFindings')}</FieldLabel>
              <Input
                name="nasal_findings"
                placeholder={t('allergyImmunologyReport.nasalFindingsPlaceholder')}
                value={formData.exam.nasal_findings}
                onChange={(e) => updateFormData('exam.nasal_findings', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tests Section - will be added next due to complexity */}
      <Card title={t('allergyImmunologyReport.tests')} collapsible isOpen={!collapsedSections.tests} onToggle={() => toggleSection('tests')}>
        <div className="space-y-6">
          <p className="text-slate-500 text-sm">Test sections will be implemented here (SPT, IDT, Specific IgE, Challenge, Desensitization, etc.)</p>
        </div>
      </Card>

      {/* Diagnosis */}
      <Card title={t('allergyImmunologyReport.diagnosis')} collapsible isOpen={!collapsedSections.diagnosis} onToggle={() => toggleSection('diagnosis')}>
        <div className="space-y-4">
          <div>
            <FieldLabel required>{t('allergyImmunologyReport.mainDiagnosis')}</FieldLabel>
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
                    {t('allergyImmunologyReport.clear')}
                  </button>
                </div>
              ) : null}
              <IcdCodeSearchInput
                placeholder={t('allergyImmunologyReport.searchIcdCode')}
                onSelect={(selected) => {
                  updateFormData('diagnosis.main', selected);
                }}
              />
            </div>
            {errors['diagnosis.main'] && (
              <p className="text-red-500 text-sm mt-1">{errors['diagnosis.main']}</p>
            )}
          </div>
          <div>
            <FieldLabel>{t('allergyImmunologyReport.secondaryDiagnoses')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.secondary.map((diag, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.secondary', idx)}>
                  {diag}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t('allergyImmunologyReport.addSecondaryDiagnosis')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value) {
                      addToArray('diagnosis.secondary', value);
                      e.target.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
          <div>
            <FieldLabel>{t('allergyImmunologyReport.diagnosisCodes')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.codes.map((code, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.codes', idx)}>
                  {code.system} {code.code}: {code.term}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Select
                name="code_system"
                value={newCode.system}
                onChange={(e) => setNewCode(prev => ({ ...prev, system: e.target.value }))}
                options={[
                  { value: 'ICD10', label: t('allergyImmunologyReport.icd10') },
                  { value: 'ICD11', label: t('allergyImmunologyReport.icd11') },
                  { value: 'SNOMED', label: t('allergyImmunologyReport.snomed') }
                ]}
                t={t}
              />
              <Input
                name="code_code"
                placeholder={t('allergyImmunologyReport.code')}
                value={newCode.code}
                onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value }))}
              />
              <Input
                name="code_term"
                placeholder={t('allergyImmunologyReport.term')}
                value={newCode.term}
                onChange={(e) => setNewCode(prev => ({ ...prev, term: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => {
                  if (newCode.system && newCode.code && newCode.term) {
                    addToArray('diagnosis.codes', { ...newCode });
                    setNewCode({ system: '', code: '', term: '' });
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
              >
                {t('allergyImmunologyReport.addCode')}
              </button>
            </div>
            <div className="mt-2">
              <IcdCodeSearchInput
                placeholder={t('allergyImmunologyReport.searchIcdCodeToAdd')}
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
        </div>
      </Card>

      {/* Plan & Treatment - Initial Mode Only */}
      {mode === 'initial' && (
        <Card title={t('allergyImmunologyReport.planTreatment')} collapsible isOpen={!collapsedSections.plan} onToggle={() => toggleSection('plan')}>
          <div className="space-y-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.medications')} ({formData.plan.meds.length})</FieldLabel>
              {formData.plan.meds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.plan.meds.map((med, idx) => {
                    const label = `${med.med} ${med.dose} ${med.route} ${med.freq}`;
                    return (
                      <Chip key={idx} onEdit={() => openMedEditor(med, idx)} onRemove={() => removeMed(idx)}>
                        {label}
                      </Chip>
                    );
                  })}
                </div>
              )}
              {editingMed && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <MedicationSearchInput
                      placeholder={t('allergyImmunologyReport.searchMedication')}
                      value={editingMed.med}
                      onChange={(e) => setEditingMed(s => ({ ...s, med: e.target.value }))}
                      onSelect={(selected) => {
                        setEditingMed(s => ({
                          ...s,
                          med: selected.med,
                          conc_strength: selected.strength || s.conc_strength
                        }));
                      }}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input placeholder={t('allergyImmunologyReport.concentrationStrength')} value={editingMed.conc_strength} onChange={(e) => setEditingMed(s => ({...s, conc_strength: e.target.value}))} />
                  </div>
                  <div className="col-span-12">
                    <Select name="route" value={editingMed.route} onChange={(e) => setEditingMed(s => ({...s, route: e.target.value}))} options={[
                      {value:'inhaled',label:t('allergyImmunologyReport.inhaled')},
                      {value:'intranasal',label:t('allergyImmunologyReport.intranasal')},
                      {value:'oral',label:t('allergyImmunologyReport.oral')},
                      {value:'topical',label:t('allergyImmunologyReport.topical')},
                      {value:'injectable',label:t('allergyImmunologyReport.injectable')},
                      {value:'other',label:t('allergyImmunologyReport.other')}
                    ]} t={t} />
                  </div>
                  <div className="col-span-12">
                    <Input placeholder={t('allergyImmunologyReport.frequency')} value={editingMed.freq} onChange={(e) => setEditingMed(s => ({...s, freq: e.target.value}))} />
                  </div>
                  <div className="col-span-12">
                    <Input placeholder={t('allergyImmunologyReport.duration')} value={editingMed.duration} onChange={(e) => setEditingMed(s => ({...s, duration: e.target.value}))} />
                  </div>
                  <div className="col-span-12">
                    <TextArea placeholder={t('allergyImmunologyReport.instructions')} value={editingMed.instructions} onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))} rows={2} />
                  </div>
                  <div className="col-span-12 flex gap-2">
                    <button type="button" onClick={saveMed} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{t('allergyImmunologyReport.save')}</button>
                    <button type="button" onClick={() => { setEditingMed(null); setEditingMedIdx(null); }} className="px-4 py-2 border border-slate-300 rounded-lg">{t('allergyImmunologyReport.cancel')}</button>
                  </div>
                </div>
              )}
              {!editingMed && (
                <button type="button" onClick={() => openMedEditor()} className="mt-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm">
                  {t('allergyImmunologyReport.addMedication')}
                </button>
              )}
            </div>

            <div>
              <FieldLabel>{t('allergyImmunologyReport.avoidance')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {AVOIDANCE_ADVICE.map(preset => {
                  const translatedPreset = getTranslatedPreset(preset, 'avoidanceAdvice');
                  return (
                    <button key={preset} type="button" onClick={() => addToArray('plan.avoidance', preset)} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm">
                      + {translatedPreset}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.avoidance.map((adv, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.avoidance', idx)}>{adv}</Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>{t('allergyImmunologyReport.emergencyActionPlan')}</FieldLabel>
              {formData.hpi.anaphylaxis.occurred && !formData.plan.emergency_action_plan.epinephrine_auto_injector_prescribed && (
                <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  {t('allergyImmunologyReport.epinephrineAutoInjectorRecommended')}
                </div>
              )}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.plan.emergency_action_plan.epinephrine_auto_injector_prescribed} onChange={(e) => updateFormData('plan.emergency_action_plan.epinephrine_auto_injector_prescribed', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">{t('allergyImmunologyReport.epinephrineAutoInjectorPrescribed')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.plan.emergency_action_plan.training_provided} onChange={(e) => updateFormData('plan.emergency_action_plan.training_provided', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">{t('allergyImmunologyReport.trainingProvided')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.plan.emergency_action_plan.written_plan_given} onChange={(e) => updateFormData('plan.emergency_action_plan.written_plan_given', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">{t('allergyImmunologyReport.writtenPlanGiven')}</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>{t('allergyImmunologyReport.doseMg')}</FieldLabel>
                    <Input name="dose_mg" value={formData.plan.emergency_action_plan.dose_mg} onChange={(e) => updateFormData('plan.emergency_action_plan.dose_mg', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{t('allergyImmunologyReport.devices')}</FieldLabel>
                    <Select name="devices" value={formData.plan.emergency_action_plan.devices} onChange={(e) => updateFormData('plan.emergency_action_plan.devices', e.target.value)} options={[
                      {value:'0',label:'0'},
                      {value:'1',label:'1'},
                      {value:'2',label:'2'}
                    ]} t={t} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>{t('allergyImmunologyReport.immunotherapy')}</FieldLabel>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={formData.plan.immunotherapy.candidate} onChange={(e) => updateFormData('plan.immunotherapy.candidate', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">{t('allergyImmunologyReport.candidateForImmunotherapy')}</span>
              </label>
              {formData.plan.immunotherapy.candidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div>
                    <FieldLabel>{t('allergyImmunologyReport.modality')}</FieldLabel>
                    <Select name="modality" value={formData.plan.immunotherapy.modality} onChange={(e) => updateFormData('plan.immunotherapy.modality', e.target.value)} options={[
                      {value:'SCIT',label:t('allergyImmunologyReport.scit')},
                      {value:'SLIT',label:t('allergyImmunologyReport.slit')},
                      {value:'VIT',label:t('allergyImmunologyReport.vit')},
                      {value:'Biologic',label:t('allergyImmunologyReport.biologic')},
                      {value:'None',label:t('allergyImmunologyReport.none')}
                    ]} t={t} />
                  </div>
                  <div>
                    <FieldLabel>{t('allergyImmunologyReport.startDate')}</FieldLabel>
                    <Input type="date" name="start_date" value={formData.plan.immunotherapy.start_date} onChange={(e) => updateFormData('plan.immunotherapy.start_date', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{t('allergyImmunologyReport.buildUpScheme')}</FieldLabel>
                    <Select name="build_up_scheme" value={formData.plan.immunotherapy.build_up_scheme} onChange={(e) => updateFormData('plan.immunotherapy.build_up_scheme', e.target.value)} options={[
                      {value:'conventional',label:t('allergyImmunologyReport.conventional')},
                      {value:'rush',label:t('allergyImmunologyReport.rush')},
                      {value:'cluster',label:t('allergyImmunologyReport.cluster')}
                    ]} t={t} />
                  </div>
                  <div>
                    <FieldLabel>{t('allergyImmunologyReport.maintenanceIntervalWeeks')}</FieldLabel>
                    <Input name="maintenance_interval_w" value={formData.plan.immunotherapy.maintenance_interval_w} onChange={(e) => updateFormData('plan.immunotherapy.maintenance_interval_w', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{t('allergyImmunologyReport.expectedDurationYears')}</FieldLabel>
                    <Input name="expected_duration_y" value={formData.plan.immunotherapy.expected_duration_y} onChange={(e) => updateFormData('plan.immunotherapy.expected_duration_y', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <FieldLabel>{t('allergyImmunologyReport.biologics')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {BIOLOGICS_PRESETS.map(preset => {
                  const translatedPreset = getTranslatedPreset(preset, 'biologicsPresets');
                  return (
                    <button key={preset} type="button" onClick={() => {
                      if (formData.plan.biologics.includes(preset)) {
                        removeFromArray('plan.biologics', formData.plan.biologics.indexOf(preset));
                      } else {
                        addToArray('plan.biologics', preset);
                      }
                    }} className={`px-3 py-1 rounded-lg text-sm ${formData.plan.biologics.includes(preset) ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'}`}>
                      {translatedPreset}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.biologics.map((bio, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.biologics', idx)}>{bio}</Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>{t('allergyImmunologyReport.education')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {EDUCATION_TOPICS.map(preset => {
                  const translatedPreset = getTranslatedPreset(preset, 'educationTopics');
                  return (
                    <button key={preset} type="button" onClick={() => addToArray('plan.education', preset)} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm">
                      + {translatedPreset}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.education.map((edu, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.education', idx)}>{edu}</Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>{t('allergyImmunologyReport.referrals')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {REFERRAL_PRESETS.map(preset => {
                  const translatedPreset = getTranslatedPreset(preset, 'referralPresets');
                  return (
                    <button key={preset} type="button" onClick={() => {
                      if (formData.plan.referrals.includes(preset)) {
                        removeFromArray('plan.referrals', formData.plan.referrals.indexOf(preset));
                      } else {
                        addToArray('plan.referrals', preset);
                      }
                    }} className={`px-3 py-1 rounded-lg text-sm ${formData.plan.referrals.includes(preset) ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'}`}>
                      {translatedPreset}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.referrals.map((ref, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.referrals', idx)}>{ref}</Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>{t('allergyImmunologyReport.followUp')}</FieldLabel>
              <Select name="follow_up" value={formData.plan.follow_up} onChange={(e) => updateFormData('plan.follow_up', e.target.value)} options={FOLLOW_UP_OPTIONS.map(f => ({ value: f, label: f === '48h' ? t('allergyImmunologyReport.followUp48h') : f === '1w' ? t('allergyImmunologyReport.followUp1w') : f === '1m' ? t('allergyImmunologyReport.followUp1m') : f === '3m' ? t('allergyImmunologyReport.followUp3m') : f === '6m' ? t('allergyImmunologyReport.followUp6m') : f === 'PRN' ? t('allergyImmunologyReport.prn') : t('allergyImmunologyReport.specificDate') }))} t={t} />
              {formData.plan.follow_up === 'date' && (
                <div className="mt-2">
                  <Input type="date" name="follow_up_date" value={formData.plan.follow_up_date} onChange={(e) => updateFormData('plan.follow_up_date', e.target.value)} />
                  {errors.follow_up_date && <p className="text-red-500 text-sm mt-1">{errors.follow_up_date}</p>}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Procedures Done */}
      <Card title={t('allergyImmunologyReport.proceduresDone')} collapsible isOpen={!collapsedSections.procedures} onToggle={() => toggleSection('procedures')} counter={formData.procedures_done.length}>
        <div className="space-y-4">
          {formData.procedures_done.length > 0 && (
            <div className="space-y-2">
              {formData.procedures_done.map((proc, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{proc.name} - {proc.date}</p>
                      {proc.setting && <p className="text-sm text-slate-600">{t('allergyImmunologyReport.setting')}: {proc.setting}</p>}
                      {proc.result && <p className="text-sm text-slate-600">{t('allergyImmunologyReport.result')}: {proc.result}</p>}
                      {proc.adverse_events && <p className="text-sm text-red-600">{t('allergyImmunologyReport.adverseEvents')}: {proc.adverse_events}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openProcedureEditor(proc, idx)} className="text-slate-600 hover:text-slate-800">✎</button>
                      <button type="button" onClick={() => removeProcedure(idx)} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {editingProcedure && (
            <div className="grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
              <div className="col-span-12"><Input placeholder={t('allergyImmunologyReport.procedureNamePlaceholder')} value={editingProcedure.name} onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))} /></div>
              <div className="col-span-12"><Input type="date" placeholder={t('allergyImmunologyReport.datePlaceholder')} value={editingProcedure.date} onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))} /></div>
              <div className="col-span-12"><Select name="setting" value={editingProcedure.setting} onChange={(e) => setEditingProcedure(s => ({...s, setting: e.target.value}))} options={[{value:'clinic',label:t('allergyImmunologyReport.clinic')},{value:'ED',label:t('allergyImmunologyReport.ed')},{value:'inpatient',label:t('allergyImmunologyReport.inpatient')}]} t={t} /></div>
              <div className="col-span-12"><TextArea placeholder={t('allergyImmunologyReport.premeds')} value={editingProcedure.premeds} onChange={(e) => setEditingProcedure(s => ({...s, premeds: e.target.value}))} rows={2} /></div>
              <div className="col-span-12"><TextArea placeholder={t('allergyImmunologyReport.technique')} value={editingProcedure.technique} onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))} rows={2} /></div>
              <div className="col-span-12"><TextArea placeholder={t('allergyImmunologyReport.findings')} value={editingProcedure.findings} onChange={(e) => setEditingProcedure(s => ({...s, findings: e.target.value}))} rows={2} /></div>
              <div className="col-span-12"><Select name="result" value={editingProcedure.result} onChange={(e) => setEditingProcedure(s => ({...s, result: e.target.value}))} options={[{value:'successful',label:t('allergyImmunologyReport.successful')},{value:'partial',label:t('allergyImmunologyReport.partial')},{value:'failed',label:t('allergyImmunologyReport.failed')}]} t={t} /></div>
              <div className="col-span-12"><TextArea placeholder={t('allergyImmunologyReport.adverseEvents')} value={editingProcedure.adverse_events} onChange={(e) => setEditingProcedure(s => ({...s, adverse_events: e.target.value}))} rows={2} /></div>
              <div className="col-span-12 flex gap-2">
                <button type="button" onClick={saveProcedure} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{t('allergyImmunologyReport.save')}</button>
                <button type="button" onClick={() => { setEditingProcedure(null); setEditingProcedureIdx(null); }} className="px-4 py-2 border border-slate-300 rounded-lg">{t('allergyImmunologyReport.cancel')}</button>
              </div>
            </div>
          )}
          {!editingProcedure && (
            <button type="button" onClick={() => openProcedureEditor()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm">
              {t('allergyImmunologyReport.addProcedure')}
            </button>
          )}
        </div>
      </Card>

      {/* Outcome & Recommendations - Discharge Mode Only */}
      {mode === 'discharge' && (
        <Card title={t('allergyImmunologyReport.outcomeRecommendations')} collapsible isOpen={!collapsedSections.outcome} onToggle={() => toggleSection('outcome')}>
          <div className="space-y-4">
            <div>
              <FieldLabel>{t('allergyImmunologyReport.conditionAtDischarge')}</FieldLabel>
              <Input name="condition" placeholder={t('allergyImmunologyReport.conditionPlaceholder')} value={formData.outcome.condition} onChange={(e) => updateFormData('outcome.condition', e.target.value)} />
            </div>
            <div>
              <FieldLabel>{t('allergyImmunologyReport.hospitalCourse')}</FieldLabel>
              <TextArea name="course" placeholder={t('allergyImmunologyReport.hospitalCoursePlaceholder')} value={formData.outcome.course} onChange={(e) => updateFormData('outcome.course', e.target.value)} rows={4} />
            </div>
            <div>
              <FieldLabel required>{t('allergyImmunologyReport.recommendations')}</FieldLabel>
              <div className="space-y-2">
                {formData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={rec} onChange={(e) => { const newRecs = [...formData.recommendations]; newRecs[index] = e.target.value; updateFormData('recommendations', newRecs); }} />
                    <button type="button" onClick={() => removeFromArray('recommendations', index)} className="text-red-500 hover:text-red-700">×</button>
                  </div>
                ))}
                <button type="button" className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50" onClick={() => addToArray('recommendations', '')}>
                  {t('allergyImmunologyReport.addRecommendation')}
                </button>
              </div>
              {errors.recommendations && <p className="text-red-500 text-sm mt-1">{errors.recommendations}</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Attachments */}
      <Card title={t('allergyImmunologyReport.attachments')} collapsible isOpen={!collapsedSections.attachments} onToggle={() => toggleSection('attachments')} counter={formData.attachments.length}>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <p className="text-slate-500 mb-2">{t('allergyImmunologyReport.dropFilesHere')}</p>
            <p className="text-xs text-slate-400 mb-2">{t('allergyImmunologyReport.includeImagingReports')}</p>
            <button type="button" className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">{t('allergyImmunologyReport.chooseFiles')}</button>
          </div>
          <div className="space-y-2">
            {formData.attachments.map((attachment, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm">{attachment.label || attachment.id}</span>
                <span className="text-xs text-slate-500">{attachment.type}</span>
                <button type="button" onClick={() => removeFromArray('attachments', index)} className="text-red-500 hover:text-red-700">×</button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {lastSaved && `${t('allergyImmunologyReport.lastSaved')}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              {t('allergyImmunologyReport.saveDraft')}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              {t('allergyImmunologyReport.preview')}
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
              {t('allergyImmunologyReport.finalizeSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllergyImmunologyReportForm;
