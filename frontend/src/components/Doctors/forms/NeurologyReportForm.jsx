import React, { useState, useEffect, useCallback, useRef } from 'react';
import { medicationsAPI, icdCodesAPI } from '../../../services/apiService';

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

// Preset arrays (module scope)
const ASSOCIATED_SYMPTOMS = ['weakness', 'numbness', 'tingling', 'vision loss', 'diplopia', 'dysarthria', 'aphasia', 'vertigo', 'ataxia', 'syncope', 'tremor', 'memory loss', 'seizure', 'headache'];
const ONSET_TYPES = ['sudden', 'gradual', 'progressive'];
const CONSCIOUSNESS_LEVELS = ['alert', 'drowsy', 'stupor', 'coma'];
const TONE_TYPES = ['normal', 'spastic', 'rigid', 'flaccid'];
const BULK_TYPES = ['normal', 'atrophy', 'hypertrophy'];
const REFLEX_GRADES = ['0', '1+', '2+', '3+', '4+'];
const PLANTAR_RESPONSES = ['flexor', 'extensor'];
const ROMBERG_RESULTS = ['positive', 'negative'];
const LESION_SITES = ['cortex', 'subcortex', 'brainstem', 'cerebellum', 'spinal', 'peripheral', 'nmj', 'muscle'];
const IMAGING_PRESETS = ['CT head non-contrast', 'CT-angiography', 'MR DWI/FLAIR', 'MRA head/neck', 'Carotid Doppler'];
const MRC_GRADES = ['0', '1', '2', '3', '3+', '4-', '4', '4+', '5'];
const SNOOP_RED_FLAGS = ['Systemic symptoms', 'Neurologic deficit', 'Onset after age 50', 'Pattern change', 'Papilledema'];
const TPA_CONTRAINDICATIONS = ['Age >80', 'NIHSS >25', 'INR >1.7', 'Platelets <100k', 'Glucose <50 or >400', 'SBP >185 or DBP >110', 'Anticoagulant use', 'Recent surgery', 'GI bleed', 'Pregnancy'];
const PROCEDURE_PRESETS = ['LP', 'EMG/NCS', 'EEG', 'Carotid Ultrasound', 'Evoked Potentials', 'Other'];
const REHAB_REFERRALS = ['Physical Therapy', 'Occupational Therapy', 'Speech Therapy', 'Neuropsychology', 'Cognitive Rehabilitation'];
const COUNSELING_PRESETS = ['Medication compliance', 'Side-effects explained', 'Driving restrictions', 'Seizure precautions', 'Fall prevention', 'Return precautions'];
const DIAGNOSIS_CODE_PRESETS = [
  { system: 'ICD10', code: 'G93.1', term: 'Anoxic brain damage' },
  { system: 'ICD10', code: 'I63.9', term: 'Cerebral infarction, unspecified' },
  { system: 'ICD10', code: 'G40.9', term: 'Epilepsy, unspecified' },
  { system: 'ICD10', code: 'G44.1', term: 'Vascular headache' },
  { system: 'ICD10', code: 'G90.9', term: 'Disorder of autonomic nervous system, unspecified' }
];

// StructuredClone fallback
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// NIHSS items for stroke assessment
const NIHSS_ITEMS = [
  '1a_consciousness_level',
  '1b_consciousness_questions',
  '1c_consciousness_commands',
  '2_best_gaze',
  '3_visual',
  '4_facial_palsy',
  '5a_motor_arm_left',
  '5b_motor_arm_right',
  '6a_motor_leg_left',
  '6b_motor_leg_right',
  '7_limb_ataxia',
  '8_sensory',
  '9_best_language',
  '10_dysarthria',
  '11_extinction_inattention'
];

const NeurologyReportForm = ({ patient, encounter, onSave }) => {
  // Mode state
  const [mode, setMode] = useState('initial');
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    meta: false,
    hpi: false,
    vitals: false,
    mentalStatus: false,
    cranialNerves: false,
    motor: false,
    reflexes: false,
    sensory: false,
    cerebellar: false,
    autonomic: false,
    meningeal: false,
    painHeadache: false,
    seizure: false,
    stroke: false,
    localization: false,
    tests: false,
    diagnosis: false,
    plan: false,
    procedures: false,
    outcome: false,
    attachments: false
  });

  // Form data state - Initialized with all required fields
  const [formData, setFormData] = useState({
    doc_type: 'neu.initial',
    meta: {
      clinic_id: '',
      department_id: 'neurology',
      physician_id: '',
      patient_id: '',
      encounter_id: '',
      datetime: new Date().toISOString()
    },
    chief_complaint: '',
    hpi: {
      onset_type: '',
      lkw_time: '',
      course: '',
      triggers: '',
      associated_symptoms: [],
      headache_profile: '',
      seizure_semiology: '',
      risk_factors: { htn: false, dm: false, af: false, smoking: false, anticoagulants: false },
      meds: '',
      allergies: '',
      pmh: '',
      family: '',
      social: ''
    },
    vitals: { bp_right: '', bp_left: '', hr: '', temp: '', spo2: '' },
    mental_status: {
      consciousness: 'alert',
      orientation: { person: true, place: true, time: true },
      attention_memory: '',
      language: '',
      behavior: '',
      mmse: { score: '', date: '' },
      moca: { score: '', date: '' }
    },
    cranial_nerves: {
      cn1: '', cn2_fields: '', cn2_fundoscopy: '', cn3_4_6_eyemov: '',
      cn5: '', cn7: '', cn8: '', cn9_10: '', cn11: '', cn12: ''
    },
    motor: {
      tone: 'normal',
      bulk: 'normal',
      fasciculations: false,
      strength: {
        R: { shoulder: '', elbow: '', wrist: '', hip: '', knee: '', ankle: '' },
        L: { shoulder: '', elbow: '', wrist: '', hip: '', knee: '', ankle: '' }
      },
      pronator_drift: ''
    },
    reflexes: {
      biceps: '', triceps: '', brachioradialis: '', knee: '', ankle: '',
      plantar: '', hoffman: false, clonus: false
    },
    sensory: {
      light_touch: '', pinprick: '', temperature: '', vibration: '', proprioception: '', dermatomes_note: ''
    },
    cerebellar: {
      fnf: '', hks: '', diadochokinesis: '', romberg: '',
      gait: { normal: true, tandem: false, heels: false, toes: false }
    },
    autonomic: {
      orthostasis_bp: '', bowel_bladder: '', sweating: ''
    },
    meningeal: {
      nuchal_rigidity: false, kernig: false, brudzinski: false
    },
    pain_headache: {
      site: '', quality: '', severity_vas: '', triggers: '', red_flags: []
    },
    seizure: {
      semiology: '', frequency: '', triggers: '', postictal: '', aeds: [], adherence: ''
    },
    stroke: {
      lkw_time: '',
      nihss: { total: '', items: {} },
      mrs_pre: '',
      mrs_current: '',
      tpa_checklist: { eligible: null, contraindications: [] },
      thrombectomy_consider: false
    },
    localization_hypothesis: {
      lesion_site: '',
      rationale: ''
    },
    tests: {
      imaging: [],
      eeg: { date: '', summary: '' },
      emg_ncs: { date: '', summary: '' },
      labs: { b12: '', tsh: '', a1c: '', ck: '', esr_crp: '', others: '' },
      lp: { performed: false, opening_pressure: '', cells: '', protein: '', glucose: '', microbiology: '' },
      referenced_docs: []
    },
    diagnosis: {
      main: '',
      secondary: [],
      codes: []
    },
    plan: {
      meds: [],
      procedures_planned: [],
      counseling: [],
      rehab_referrals: [],
      safety: { falls: false, driving_restriction: false },
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

  // Available imaging studies (mock data)
  const [availableImaging, setAvailableImaging] = useState([
    {
      study_uid: '1.2.3.4.5.6.7.8.9.20',
      modality: 'CT',
      date: '2024-01-15',
      description: 'CT head non-contrast',
      source: 'orthanc',
      diagnostic_report_id: 'rep-001'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.21',
      modality: 'MRI',
      date: '2024-01-15',
      description: 'MR DWI/FLAIR',
      source: 'orthanc',
      diagnostic_report_id: 'rep-002'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.22',
      modality: 'MRA',
      date: '2024-01-14',
      description: 'MRA head/neck',
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
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [editingProcedureIdx, setEditingProcedureIdx] = useState(null);

  // Initialize form data
  useEffect(() => {
    if (patient && encounter) {
      setFormData(prev => ({
        ...prev,
        meta: {
          clinic_id: encounter.clinic_id || 'clinic-001',
          department_id: 'neurology',
          physician_id: encounter.doctor_id || 'doctor-001',
          patient_id: patient.patient_id || 'patient-001',
          encounter_id: encounter.id || 'encounter-001',
          datetime: encounter.datetime || new Date().toISOString()
        }
      }));
    }
  }, [patient, encounter]);

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'neu.discharge' : 'neu.initial'
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

  const getOhifUrl = useCallback((study) => {
    return `/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(study.study_uid)}`;
  }, []);

  const addImagingToReport = useCallback((study, attach = 'reference_only', note = '') => {
    const imagingItem = {
      ...study,
      ohif_url: getOhifUrl(study),
      attach,
      note
    };
    addToArray('tests.imaging', imagingItem);
  }, [addToArray, getOhifUrl]);

  const removeImagingFromReport = useCallback((index) => {
    removeFromArray('tests.imaging', index);
  }, [removeFromArray]);

  const openImagingViewer = useCallback((study) => {
    const url = getOhifUrl(study);
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  }, [getOhifUrl]);

  // Calculate NIHSS total
  const calculateNIHSS = useCallback(() => {
    let total = 0;
    NIHSS_ITEMS.forEach(item => {
      const value = formData.stroke.nihss.items[item];
      if (value !== undefined && value !== '') {
        total += parseInt(value) || 0;
      }
    });
    return total;
  }, [formData.stroke.nihss.items]);

  useEffect(() => {
    const total = calculateNIHSS();
    if (formData.stroke.nihss.total !== total.toString()) {
      updateFormData('stroke.nihss.total', total.toString());
    }
  }, [formData.stroke.nihss.items, calculateNIHSS, updateFormData]);

  // Check if within tPA window (4.5 hours)
  const isWithinTPAWindow = useCallback(() => {
    if (!formData.hpi.lkw_time || !formData.meta.datetime) return false;
    try {
      const lkw = new Date(formData.hpi.lkw_time);
      const encounter = new Date(formData.meta.datetime);
      const diffHours = (encounter - lkw) / (1000 * 60 * 60);
      return diffHours <= 4.5 && diffHours >= 0;
    } catch {
      return false;
    }
  }, [formData.hpi.lkw_time, formData.meta.datetime]);

  // Smart editor helpers
  const openMedEditor = useCallback((preset = {}, idx = null) => {
    setEditingMed({
      med: preset.med || '',
      dose: preset.dose || '',
      route: preset.route || '',
      freq: preset.freq || '',
      duration: preset.duration || '',
      instructions: preset.instructions || '',
      sendToPharmacy: preset.sendToPharmacy || false,
      pharmacyId: preset.pharmacyId || ''
    });
    setEditingMedIdx(idx);
  }, []);

  const saveMed = useCallback(() => {
    if (!editingMed?.med?.trim()) return;
    const next = [...formData.plan.meds];
    if (editingMedIdx === null) next.push(editingMed); else next[editingMedIdx] = editingMed;
    updateFormData('plan.meds', next);
    setEditingMed(null); setEditingMedIdx(null);
  }, [editingMed, editingMedIdx, formData.plan.meds, updateFormData]);

  const removeMed = useCallback((idx) => {
    updateFormData('plan.meds', formData.plan.meds.filter((_, i) => i !== idx));
  }, [formData.plan.meds, updateFormData]);

  const openProcedureEditor = useCallback((preset = {}, idx = null) => {
    setEditingProcedure({
      name: preset.name || '',
      date: preset.date || '',
      side: preset.side || '',
      anesthesia: preset.anesthesia || 'none',
      technique: preset.technique || '',
      findings: preset.findings || '',
      result: preset.result || 'successful',
      complications: preset.complications || ''
    });
    setEditingProcedureIdx(idx);
  }, []);

  const saveProcedure = useCallback(() => {
    if (!editingProcedure?.name?.trim() || !editingProcedure?.date?.trim()) return;
    const next = [...formData.procedures_done];
    if (editingProcedureIdx === null) next.push(editingProcedure); else next[editingProcedureIdx] = editingProcedure;
    updateFormData('procedures_done', next);
    setEditingProcedure(null); setEditingProcedureIdx(null);
  }, [editingProcedure, editingProcedureIdx, formData.procedures_done, updateFormData]);

  const removeProcedure = useCallback((idx) => {
    updateFormData('procedures_done', formData.procedures_done.filter((_, i) => i !== idx));
  }, [formData.procedures_done, updateFormData]);

  // Quick-fill "Normal CN exam" button
  const fillNormalCNExam = useCallback(() => {
    updateFormData('cranial_nerves.cn1', 'Intact');
    updateFormData('cranial_nerves.cn2_fields', 'Full fields OU');
    updateFormData('cranial_nerves.cn2_fundoscopy', 'Normal discs, vessels, macula OU');
    updateFormData('cranial_nerves.cn3_4_6_eyemov', 'Full EOM, no nystagmus');
    updateFormData('cranial_nerves.cn5', 'Intact sensation V1-V3, muscles of mastication');
    updateFormData('cranial_nerves.cn7', 'Facial symmetry, all branches intact');
    updateFormData('cranial_nerves.cn8', 'Hearing intact bilaterally');
    updateFormData('cranial_nerves.cn9_10', 'Gag intact, uvula midline');
    updateFormData('cranial_nerves.cn11', 'SCM and trapezius strength intact');
    updateFormData('cranial_nerves.cn12', 'Tongue midline, no atrophy/fasciculations');
  }, [updateFormData]);

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

    // NIHSS validation (0-42)
    const nihssTotal = parseInt(formData.stroke.nihss.total) || 0;
    if (formData.stroke.nihss.total && (nihssTotal < 0 || nihssTotal > 42)) {
      newErrors.nihss_total = 'NIHSS total must be 0-42';
    }

    // MRC strength validation (0-5)
    ['R', 'L'].forEach(side => {
      ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].forEach(joint => {
        const value = formData.motor.strength[side][joint];
        if (value && !MRC_GRADES.includes(value)) {
          newErrors[`motor_${side}_${joint}`] = 'MRC grade must be 0-5';
        }
      });
    });

    // VAS validation (0-10)
    const vas = parseFloat(formData.pain_headache.severity_vas);
    if (formData.pain_headache.severity_vas && (vas < 0 || vas > 10)) {
      newErrors.vas = 'VAS must be 0-10';
    }

    // Reflex validation
    ['biceps', 'triceps', 'brachioradialis', 'knee', 'ankle'].forEach(reflex => {
      const value = formData.reflexes[reflex];
      if (value && !REFLEX_GRADES.includes(value)) {
        newErrors[`reflex_${reflex}`] = 'Reflex grade must be 0, 1+, 2+, 3+, or 4+';
      }
    });

    // Follow-up date validation
    if (formData.plan.follow_up === 'date' && !formData.plan.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required when "date" is selected';
    }

    // LP validation
    if (formData.tests.lp.performed) {
      if (!formData.tests.lp.opening_pressure) newErrors.lp_opening_pressure = 'Opening pressure is required';
      if (!formData.tests.lp.cells) newErrors.lp_cells = 'Cell count is required';
      if (!formData.tests.lp.protein) newErrors.lp_protein = 'Protein is required';
      if (!formData.tests.lp.glucose) newErrors.lp_glucose = 'Glucose is required';
    }

    // Imaging validation
    formData.tests.imaging.forEach((imaging, index) => {
      if (!imaging.study_uid && !imaging.ohif_url) {
        newErrors[`imaging_${index}`] = 'Valid Study UID or OHIF URL is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  // Build payload
  const buildPayload = useCallback(() => {
    const payload = {
      doc_type: mode === 'discharge' ? 'neu.discharge' : 'neu.initial',
      meta: formData.meta,
      chief_complaint: formData.chief_complaint,
      hpi: formData.hpi,
      vitals: formData.vitals,
      mental_status: formData.mental_status,
      cranial_nerves: formData.cranial_nerves,
      motor: formData.motor,
      reflexes: formData.reflexes,
      sensory: formData.sensory,
      cerebellar: formData.cerebellar,
      autonomic: formData.autonomic,
      meningeal: formData.meningeal,
      pain_headache: formData.pain_headache,
      seizure: formData.seizure,
      stroke: formData.stroke,
      localization_hypothesis: formData.localization_hypothesis,
      tests: formData.tests,
      diagnosis: formData.diagnosis,
      procedures_done: formData.procedures_done,
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
      console.log('SUBMIT - Payload sample:', {
        doc_type: payload?.doc_type,
        hasMeta: !!payload?.meta,
        hasHpi: !!payload?.hpi,
        hasDiagnosis: !!payload?.diagnosis,
        hasPlan: !!payload?.plan
      });
      
      // CRITICAL: Verify payload is not an event object before passing to onSave
      if (payload && (payload._reactName || payload.nativeEvent || (payload.type === 'click' && payload.screenX !== undefined))) {
        console.error('ERROR: buildPayload() returned an event object! This should never happen.', payload);
        alert('Error: Form data structure is invalid. Please try saving again.');
        return;
      }
      
      if (onSave && typeof onSave === 'function') {
        // CRITICAL: Double-check payload is not an event before calling onSave
        if (payload && (payload._reactName || payload.nativeEvent || (payload.type === 'click' && payload.screenX !== undefined))) {
          console.error('ERROR: buildPayload() returned an event object! This should never happen.', payload);
          alert('Error: Form data structure is invalid. Please try saving again.');
          return;
        }
        
        // Ensure we pass the payload, not the event
        console.log('SUBMIT - Calling onSave with payload:', {
          hasDocType: !!payload?.doc_type,
          hasMeta: !!payload?.meta,
          payloadType: typeof payload,
          isEvent: !!(payload?._reactName || payload?.nativeEvent),
          onSaveType: typeof onSave,
          onSaveIsFunction: typeof onSave === 'function'
        });
        
        // Wrap onSave call to prevent any event from being passed
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Autosave Toast */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Saved at {lastSaved?.toLocaleTimeString()}
        </div>
      )}

      {/* Header */}
      <Card title="Neurology Report" className="mb-6">
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
            <div className="text-slate-600">Neurology Department</div>
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

      {/* Chief Complaint */}
      <Card title="Chief Complaint">
        <div className="space-y-4">
          <div>
            <FieldLabel required>Chief Complaint</FieldLabel>
            <Input
              name="chief_complaint"
              placeholder="Enter chief complaint..."
              value={formData.chief_complaint}
              onChange={(e) => updateFormData('chief_complaint', e.target.value)}
              required
            />
            {errors.chief_complaint && (
              <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
            )}
          </div>
        </div>
      </Card>

      {/* HPI */}
      <Card title="History of Present Illness (HPI)" collapsible isOpen={!collapsedSections.hpi} onToggle={() => toggleSection('hpi')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Onset Type</FieldLabel>
              <Select
                name="onset_type"
                value={formData.hpi.onset_type}
                onChange={(e) => updateFormData('hpi.onset_type', e.target.value)}
                options={ONSET_TYPES.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
              />
            </div>
            <div>
              <FieldLabel>Last Known Well (LKW)</FieldLabel>
              <Input
                type="datetime-local"
                name="lkw_time"
                value={formData.hpi.lkw_time}
                onChange={(e) => updateFormData('hpi.lkw_time', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Course</FieldLabel>
              <Input
                name="course"
                placeholder="Improving/worsening/stable..."
                value={formData.hpi.course}
                onChange={(e) => updateFormData('hpi.course', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <FieldLabel>Triggers</FieldLabel>
            <Input
              name="triggers"
              placeholder="What triggers or worsens symptoms?"
              value={formData.hpi.triggers}
              onChange={(e) => updateFormData('hpi.triggers', e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Associated Symptoms</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {ASSOCIATED_SYMPTOMS.map(symptom => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => {
                    if (formData.hpi.associated_symptoms.includes(symptom)) {
                      removeFromArray('hpi.associated_symptoms', formData.hpi.associated_symptoms.indexOf(symptom));
                    } else {
                      addToArray('hpi.associated_symptoms', symptom);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    formData.hpi.associated_symptoms.includes(symptom)
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.hpi.associated_symptoms.map((symptom, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('hpi.associated_symptoms', idx)}>
                  {symptom}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Headache Profile</FieldLabel>
            <TextArea
              name="headache_profile"
              placeholder="Location, quality, severity, duration, pattern..."
              value={formData.hpi.headache_profile}
              onChange={(e) => updateFormData('hpi.headache_profile', e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <FieldLabel>Seizure Semiology</FieldLabel>
            <TextArea
              name="seizure_semiology"
              placeholder="Description of seizure type, aura, duration, postictal state..."
              value={formData.hpi.seizure_semiology}
              onChange={(e) => updateFormData('hpi.seizure_semiology', e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <FieldLabel>Risk Factors</FieldLabel>
            <div className="flex flex-wrap gap-4">
              {Object.keys(formData.hpi.risk_factors).map(factor => (
                <label key={factor} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.risk_factors[factor]}
                    onChange={(e) => updateFormData(`hpi.risk_factors.${factor}`, e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">{factor === 'htn' ? 'HTN' : factor === 'dm' ? 'DM' : factor === 'af' ? 'AF' : factor.charAt(0).toUpperCase() + factor.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Current Medications</FieldLabel>
              <TextArea
                name="meds"
                placeholder="List current medications..."
                value={formData.hpi.meds}
                onChange={(e) => updateFormData('hpi.meds', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Allergies</FieldLabel>
              <Input
                name="allergies"
                placeholder="Drug allergies, reactions..."
                value={formData.hpi.allergies}
                onChange={(e) => updateFormData('hpi.allergies', e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Past Medical History</FieldLabel>
            <TextArea
              name="pmh"
              placeholder="Previous neurological diagnoses, surgeries..."
              value={formData.hpi.pmh}
              onChange={(e) => updateFormData('hpi.pmh', e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Family History</FieldLabel>
              <TextArea
                name="family"
                placeholder="Family history of neurological conditions..."
                value={formData.hpi.family}
                onChange={(e) => updateFormData('hpi.family', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Social History</FieldLabel>
              <TextArea
                name="social"
                placeholder="Smoking, alcohol, occupation, travel..."
                value={formData.hpi.social}
                onChange={(e) => updateFormData('hpi.social', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!formData.chief_complaint.trim()}
              onClick={() => console.log('AI Suggest clicked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                formData.chief_complaint.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              🧠 AI Suggest
            </button>
          </div>
        </div>
      </Card>

      {/* Vitals */}
      <Card title="Vitals" collapsible isOpen={!collapsedSections.vitals} onToggle={() => toggleSection('vitals')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel>BP Right</FieldLabel>
            <Input
              name="bp_right"
              placeholder="120/80"
              value={formData.vitals.bp_right}
              onChange={(e) => updateFormData('vitals.bp_right', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>BP Left</FieldLabel>
            <Input
              name="bp_left"
              placeholder="120/80"
              value={formData.vitals.bp_left}
              onChange={(e) => updateFormData('vitals.bp_left', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Heart Rate</FieldLabel>
            <Input
              name="hr"
              placeholder="72 bpm"
              value={formData.vitals.hr}
              onChange={(e) => updateFormData('vitals.hr', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Temperature</FieldLabel>
            <Input
              name="temp"
              placeholder="36.5°C"
              value={formData.vitals.temp}
              onChange={(e) => updateFormData('vitals.temp', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>SpO2</FieldLabel>
            <Input
              name="spo2"
              placeholder="98%"
              value={formData.vitals.spo2}
              onChange={(e) => updateFormData('vitals.spo2', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Mental Status */}
      <Card title="Mental Status" collapsible isOpen={!collapsedSections.mentalStatus} onToggle={() => toggleSection('mentalStatus')}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Level of Consciousness</FieldLabel>
            <Select
              name="consciousness"
              value={formData.mental_status.consciousness}
              onChange={(e) => updateFormData('mental_status.consciousness', e.target.value)}
              options={CONSCIOUSNESS_LEVELS.map(l => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))}
            />
          </div>
          <div>
            <FieldLabel>Orientation</FieldLabel>
            <div className="flex flex-wrap gap-4">
              {Object.keys(formData.mental_status.orientation).map(field => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.mental_status.orientation[field]}
                    onChange={(e) => updateFormData(`mental_status.orientation.${field}`, e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Attention & Memory</FieldLabel>
              <TextArea
                name="attention_memory"
                placeholder="Digit span, serial 7s, recall..."
                value={formData.mental_status.attention_memory}
                onChange={(e) => updateFormData('mental_status.attention_memory', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Language</FieldLabel>
              <TextArea
                name="language"
                placeholder="Fluent, naming, repetition, comprehension..."
                value={formData.mental_status.language}
                onChange={(e) => updateFormData('mental_status.language', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Behavior</FieldLabel>
            <TextArea
              name="behavior"
              placeholder="Appearance, mood, affect, insight..."
              value={formData.mental_status.behavior}
              onChange={(e) => updateFormData('mental_status.behavior', e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>MMSE Score</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  name="mmse_score"
                  placeholder="Score"
                  value={formData.mental_status.mmse.score}
                  onChange={(e) => updateFormData('mental_status.mmse.score', e.target.value)}
                />
                <Input
                  type="date"
                  name="mmse_date"
                  value={formData.mental_status.mmse.date}
                  onChange={(e) => updateFormData('mental_status.mmse.date', e.target.value)}
                />
              </div>
            </div>
            <div>
              <FieldLabel>MoCA Score</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  name="moca_score"
                  placeholder="Score"
                  value={formData.mental_status.moca.score}
                  onChange={(e) => updateFormData('mental_status.moca.score', e.target.value)}
                />
                <Input
                  type="date"
                  name="moca_date"
                  value={formData.mental_status.moca.date}
                  onChange={(e) => updateFormData('mental_status.moca.date', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cranial Nerves */}
      <Card title="Cranial Nerves" collapsible isOpen={!collapsedSections.cranialNerves} onToggle={() => toggleSection('cranialNerves')}>
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={fillNormalCNExam}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
            >
              Fill Normal CN Exam
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>CN I (Olfactory)</FieldLabel>
              <Input
                name="cn1"
                placeholder="Intact/bilaterally impaired..."
                value={formData.cranial_nerves.cn1}
                onChange={(e) => updateFormData('cranial_nerves.cn1', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN II (Optic) - Visual Fields</FieldLabel>
              <Input
                name="cn2_fields"
                placeholder="Full fields OU, hemianopia..."
                value={formData.cranial_nerves.cn2_fields}
                onChange={(e) => updateFormData('cranial_nerves.cn2_fields', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN II (Optic) - Fundoscopy</FieldLabel>
              <Input
                name="cn2_fundoscopy"
                placeholder="Discs, vessels, macula..."
                value={formData.cranial_nerves.cn2_fundoscopy}
                onChange={(e) => updateFormData('cranial_nerves.cn2_fundoscopy', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN III, IV, VI (Oculomotor, Trochlear, Abducens)</FieldLabel>
              <Input
                name="cn3_4_6_eyemov"
                placeholder="Full EOM, nystagmus, ptosis..."
                value={formData.cranial_nerves.cn3_4_6_eyemov}
                onChange={(e) => updateFormData('cranial_nerves.cn3_4_6_eyemov', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN V (Trigeminal)</FieldLabel>
              <Input
                name="cn5"
                placeholder="Sensation V1-V3, muscles of mastication..."
                value={formData.cranial_nerves.cn5}
                onChange={(e) => updateFormData('cranial_nerves.cn5', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN VII (Facial)</FieldLabel>
              <Input
                name="cn7"
                placeholder="Facial symmetry, all branches..."
                value={formData.cranial_nerves.cn7}
                onChange={(e) => updateFormData('cranial_nerves.cn7', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN VIII (Vestibulocochlear)</FieldLabel>
              <Input
                name="cn8"
                placeholder="Hearing intact bilaterally..."
                value={formData.cranial_nerves.cn8}
                onChange={(e) => updateFormData('cranial_nerves.cn8', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN IX, X (Glossopharyngeal, Vagus)</FieldLabel>
              <Input
                name="cn9_10"
                placeholder="Gag intact, uvula midline..."
                value={formData.cranial_nerves.cn9_10}
                onChange={(e) => updateFormData('cranial_nerves.cn9_10', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN XI (Spinal Accessory)</FieldLabel>
              <Input
                name="cn11"
                placeholder="SCM and trapezius strength..."
                value={formData.cranial_nerves.cn11}
                onChange={(e) => updateFormData('cranial_nerves.cn11', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>CN XII (Hypoglossal)</FieldLabel>
              <Input
                name="cn12"
                placeholder="Tongue midline, no atrophy..."
                value={formData.cranial_nerves.cn12}
                onChange={(e) => updateFormData('cranial_nerves.cn12', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Motor */}
      <Card title="Motor Examination" collapsible isOpen={!collapsedSections.motor} onToggle={() => toggleSection('motor')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Tone</FieldLabel>
              <Select
                name="tone"
                value={formData.motor.tone}
                onChange={(e) => updateFormData('motor.tone', e.target.value)}
                options={TONE_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              />
            </div>
            <div>
              <FieldLabel>Bulk</FieldLabel>
              <Select
                name="bulk"
                value={formData.motor.bulk}
                onChange={(e) => updateFormData('motor.bulk', e.target.value)}
                options={BULK_TYPES.map(b => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))}
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.motor.fasciculations}
                  onChange={(e) => updateFormData('motor.fasciculations', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Fasciculations</span>
              </label>
            </div>
          </div>
          
          <div>
            <FieldLabel>Strength (MRC 0-5)</FieldLabel>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Joint</th>
                    <th className="text-center p-2">Right</th>
                    <th className="text-center p-2">Left</th>
                  </tr>
                </thead>
                <tbody>
                  {['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].map(joint => (
                    <tr key={joint} className="border-b">
                      <td className="p-2 capitalize">{joint}</td>
                      <td className="p-2">
                        <Select
                          name={`strength_R_${joint}`}
                          value={formData.motor.strength.R[joint]}
                          onChange={(e) => updateFormData(`motor.strength.R.${joint}`, e.target.value)}
                          options={MRC_GRADES.map(g => ({ value: g, label: g }))}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          name={`strength_L_${joint}`}
                          value={formData.motor.strength.L[joint]}
                          onChange={(e) => updateFormData(`motor.strength.L.${joint}`, e.target.value)}
                          options={MRC_GRADES.map(g => ({ value: g, label: g }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.motor_R_shoulder && <p className="text-red-500 text-sm mt-1">{errors.motor_R_shoulder}</p>}
          </div>
          
          <div>
            <FieldLabel>Pronator Drift</FieldLabel>
            <Select
              name="pronator_drift"
              value={formData.motor.pronator_drift}
              onChange={(e) => updateFormData('motor.pronator_drift', e.target.value)}
              options={[
                { value: 'present', label: 'Present' },
                { value: 'absent', label: 'Absent' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Reflexes */}
      <Card title="Reflexes" collapsible isOpen={!collapsedSections.reflexes} onToggle={() => toggleSection('reflexes')}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Deep Tendon Reflexes</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['biceps', 'triceps', 'brachioradialis', 'knee', 'ankle'].map(reflex => (
                <div key={reflex}>
                  <FieldLabel className="capitalize">{reflex}</FieldLabel>
                  <div className="flex gap-2">
                    {REFLEX_GRADES.map(grade => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => updateFormData(`reflexes.${reflex}`, grade)}
                        className={`px-3 py-1 rounded text-sm ${
                          formData.reflexes[reflex] === grade
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Plantar Response</FieldLabel>
              <Select
                name="plantar"
                value={formData.reflexes.plantar}
                onChange={(e) => updateFormData('reflexes.plantar', e.target.value)}
                options={PLANTAR_RESPONSES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
              />
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.reflexes.hoffman}
                  onChange={(e) => updateFormData('reflexes.hoffman', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Hoffman</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.reflexes.clonus}
                  onChange={(e) => updateFormData('reflexes.clonus', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Clonus</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Sensory */}
      <Card title="Sensory Examination" collapsible isOpen={!collapsedSections.sensory} onToggle={() => toggleSection('sensory')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Light Touch</FieldLabel>
              <TextArea
                name="light_touch"
                placeholder="Intact throughout, decreased R arm..."
                value={formData.sensory.light_touch}
                onChange={(e) => updateFormData('sensory.light_touch', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Pinprick</FieldLabel>
              <TextArea
                name="pinprick"
                placeholder="Intact throughout, decreased R arm..."
                value={formData.sensory.pinprick}
                onChange={(e) => updateFormData('sensory.pinprick', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Temperature</FieldLabel>
              <TextArea
                name="temperature"
                placeholder="Intact throughout..."
                value={formData.sensory.temperature}
                onChange={(e) => updateFormData('sensory.temperature', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Vibration</FieldLabel>
              <TextArea
                name="vibration"
                placeholder="Normal at 128 Hz..."
                value={formData.sensory.vibration}
                onChange={(e) => updateFormData('sensory.vibration', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Proprioception</FieldLabel>
              <TextArea
                name="proprioception"
                placeholder="Intact finger/toe position sense..."
                value={formData.sensory.proprioception}
                onChange={(e) => updateFormData('sensory.proprioception', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Dermatomes Note</FieldLabel>
              <TextArea
                name="dermatomes_note"
                placeholder="Dermatomal pattern, level..."
                value={formData.sensory.dermatomes_note}
                onChange={(e) => updateFormData('sensory.dermatomes_note', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Cerebellar */}
      <Card title="Cerebellar & Gait" collapsible isOpen={!collapsedSections.cerebellar} onToggle={() => toggleSection('cerebellar')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Finger-to-Nose</FieldLabel>
              <Input
                name="fnf"
                placeholder="Smooth, accurate bilaterally..."
                value={formData.cerebellar.fnf}
                onChange={(e) => updateFormData('cerebellar.fnf', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Heel-to-Shin</FieldLabel>
              <Input
                name="hks"
                placeholder="Smooth, accurate bilaterally..."
                value={formData.cerebellar.hks}
                onChange={(e) => updateFormData('cerebellar.hks', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Diadochokinesis</FieldLabel>
              <Input
                name="diadochokinesis"
                placeholder="Rapid alternating movements..."
                value={formData.cerebellar.diadochokinesis}
                onChange={(e) => updateFormData('cerebellar.diadochokinesis', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Romberg</FieldLabel>
              <Select
                name="romberg"
                value={formData.cerebellar.romberg}
                onChange={(e) => updateFormData('cerebellar.romberg', e.target.value)}
                options={ROMBERG_RESULTS.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
              />
            </div>
          </div>
          
          <div>
            <FieldLabel>Gait</FieldLabel>
            <div className="flex flex-wrap gap-4">
              {Object.keys(formData.cerebellar.gait).map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.cerebellar.gait[type]}
                    onChange={(e) => updateFormData(`cerebellar.gait.${type}`, e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Autonomic */}
      <Card title="Autonomic Function" collapsible isOpen={!collapsedSections.autonomic} onToggle={() => toggleSection('autonomic')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Orthostatic BP</FieldLabel>
              <Input
                name="orthostasis_bp"
                placeholder="Supine/standing BP..."
                value={formData.autonomic.orthostasis_bp}
                onChange={(e) => updateFormData('autonomic.orthostasis_bp', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Bowel & Bladder</FieldLabel>
              <Input
                name="bowel_bladder"
                placeholder="Normal incontinence..."
                value={formData.autonomic.bowel_bladder}
                onChange={(e) => updateFormData('autonomic.bowel_bladder', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Sweating</FieldLabel>
              <Input
                name="sweating"
                placeholder="Normal, anhidrosis..."
                value={formData.autonomic.sweating}
                onChange={(e) => updateFormData('autonomic.sweating', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Meningeal */}
      <Card title="Meningeal Signs" collapsible isOpen={!collapsedSections.meningeal} onToggle={() => toggleSection('meningeal')}>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.meningeal.nuchal_rigidity}
              onChange={(e) => updateFormData('meningeal.nuchal_rigidity', e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Nuchal Rigidity</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.meningeal.kernig}
              onChange={(e) => updateFormData('meningeal.kernig', e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Kernig</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.meningeal.brudzinski}
              onChange={(e) => updateFormData('meningeal.brudzinski', e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Brudzinski</span>
          </label>
        </div>
      </Card>

      {/* Pain/Headache */}
      <Card title="Pain/Headache" collapsible isOpen={!collapsedSections.painHeadache} onToggle={() => toggleSection('painHeadache')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Site</FieldLabel>
              <Input
                name="site"
                placeholder="Frontal, temporal, occipital..."
                value={formData.pain_headache.site}
                onChange={(e) => updateFormData('pain_headache.site', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Quality</FieldLabel>
              <Input
                name="quality"
                placeholder="Throbbing, sharp, pressure..."
                value={formData.pain_headache.quality}
                onChange={(e) => updateFormData('pain_headache.quality', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Severity (VAS 0-10)</FieldLabel>
              <Input
                type="number"
                name="severity_vas"
                placeholder="0-10"
                min="0"
                max="10"
                value={formData.pain_headache.severity_vas}
                onChange={(e) => updateFormData('pain_headache.severity_vas', e.target.value)}
              />
              {errors.vas && <p className="text-red-500 text-sm mt-1">{errors.vas}</p>}
            </div>
            <div>
              <FieldLabel>Triggers</FieldLabel>
              <Input
                name="triggers"
                placeholder="Light, sound, movement..."
                value={formData.pain_headache.triggers}
                onChange={(e) => updateFormData('pain_headache.triggers', e.target.value)}
              />
            </div>
          </div>
          <div>
            <FieldLabel>SNOOP Red Flags</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {SNOOP_RED_FLAGS.map(flag => (
                <button
                  key={flag}
                  type="button"
                  onClick={() => {
                    if (formData.pain_headache.red_flags.includes(flag)) {
                      removeFromArray('pain_headache.red_flags', formData.pain_headache.red_flags.indexOf(flag));
                    } else {
                      addToArray('pain_headache.red_flags', flag);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    formData.pain_headache.red_flags.includes(flag)
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.pain_headache.red_flags.map((flag, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('pain_headache.red_flags', idx)}>
                  {flag}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Seizure */}
      <Card title="Seizure" collapsible isOpen={!collapsedSections.seizure} onToggle={() => toggleSection('seizure')}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Semiology</FieldLabel>
            <TextArea
              name="semiology"
              placeholder="Aura, ictal phase, postictal state..."
              value={formData.seizure.semiology}
              onChange={(e) => updateFormData('seizure.semiology', e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Frequency</FieldLabel>
              <Input
                name="frequency"
                placeholder="Daily, weekly, monthly..."
                value={formData.seizure.frequency}
                onChange={(e) => updateFormData('seizure.frequency', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Triggers</FieldLabel>
              <Input
                name="triggers"
                placeholder="Sleep deprivation, stress..."
                value={formData.seizure.triggers}
                onChange={(e) => updateFormData('seizure.triggers', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Postictal</FieldLabel>
              <Input
                name="postictal"
                placeholder="Confusion, aphasia, Todd's paralysis..."
                value={formData.seizure.postictal}
                onChange={(e) => updateFormData('seizure.postictal', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Adherence</FieldLabel>
              <Input
                name="adherence"
                placeholder="Good, poor, missed doses..."
                value={formData.seizure.adherence}
                onChange={(e) => updateFormData('seizure.adherence', e.target.value)}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Antiepileptic Drugs (AEDs)</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {formData.seizure.aeds.map((aed, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('seizure.aeds', idx)}>
                  {aed}
                </Chip>
              ))}
            </div>
            <Input
              name="new_aed"
              placeholder="Add AED..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  addToArray('seizure.aeds', e.target.value.trim());
                  e.target.value = '';
                }
              }}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* Stroke */}
      <Card title="Stroke Assessment" collapsible isOpen={!collapsedSections.stroke} onToggle={() => toggleSection('stroke')}>
        <div className="space-y-4">
          {isWithinTPAWindow() && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 font-medium">⚠️ Candidate for IV tPA? Complete checklist below.</p>
            </div>
          )}
          
          <div>
            <FieldLabel>Last Known Well (LKW)</FieldLabel>
            <Input
              type="datetime-local"
              name="lkw_time"
              value={formData.stroke.lkw_time}
              onChange={(e) => updateFormData('stroke.lkw_time', e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>NIHSS Score</FieldLabel>
            <Card title="NIHSS Items" className="mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {NIHSS_ITEMS.map(item => (
                  <div key={item}>
                    <FieldLabel className="text-xs">{item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      max="4"
                      value={formData.stroke.nihss.items[item] || ''}
                      onChange={(e) => {
                        const newItems = { ...formData.stroke.nihss.items };
                        newItems[item] = e.target.value;
                        updateFormData('stroke.nihss.items', newItems);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <FieldLabel>Total NIHSS</FieldLabel>
                <Input
                  name="nihss_total"
                  value={formData.stroke.nihss.total}
                  readOnly
                  className="bg-slate-100 font-semibold"
                />
                {errors.nihss_total && <p className="text-red-500 text-sm mt-1">{errors.nihss_total}</p>}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Modified Rankin Scale (Pre-stroke)</FieldLabel>
              <Input
                name="mrs_pre"
                placeholder="0-6"
                value={formData.stroke.mrs_pre}
                onChange={(e) => updateFormData('stroke.mrs_pre', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Modified Rankin Scale (Current)</FieldLabel>
              <Input
                name="mrs_current"
                placeholder="0-6"
                value={formData.stroke.mrs_current}
                onChange={(e) => updateFormData('stroke.mrs_current', e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>tPA Eligibility Checklist</FieldLabel>
            <div className="space-y-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tpa_eligible"
                    checked={formData.stroke.tpa_checklist.eligible === true}
                    onChange={() => updateFormData('stroke.tpa_checklist.eligible', true)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Eligible</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tpa_eligible"
                    checked={formData.stroke.tpa_checklist.eligible === false}
                    onChange={() => updateFormData('stroke.tpa_checklist.eligible', false)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Not Eligible</span>
                </label>
              </div>
              <div>
                <FieldLabel className="text-xs">Contraindications</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TPA_CONTRAINDICATIONS.map(contra => (
                    <button
                      key={contra}
                      type="button"
                      onClick={() => {
                        const contraList = formData.stroke.tpa_checklist.contraindications;
                        if (contraList.includes(contra)) {
                          removeFromArray('stroke.tpa_checklist.contraindications', contraList.indexOf(contra));
                        } else {
                          addToArray('stroke.tpa_checklist.contraindications', contra);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        formData.stroke.tpa_checklist.contraindications.includes(contra)
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {contra}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.stroke.thrombectomy_consider}
                onChange={(e) => updateFormData('stroke.thrombectomy_consider', e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-600">Consider Thrombectomy</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Localization Hypothesis */}
      <Card title="Localization Hypothesis" collapsible isOpen={!collapsedSections.localization} onToggle={() => toggleSection('localization')}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Lesion Site</FieldLabel>
            <Select
              name="lesion_site"
              value={formData.localization_hypothesis.lesion_site}
              onChange={(e) => updateFormData('localization_hypothesis.lesion_site', e.target.value)}
              options={LESION_SITES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            />
          </div>
          <div>
            <FieldLabel>Rationale</FieldLabel>
            <TextArea
              name="rationale"
              placeholder="Explain localization based on exam findings..."
              value={formData.localization_hypothesis.rationale}
              onChange={(e) => updateFormData('localization_hypothesis.rationale', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Card>

      {/* Tests */}
      <Card title="Tests & Diagnostics" collapsible isOpen={!collapsedSections.tests} onToggle={() => toggleSection('tests')}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Imaging Studies</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {IMAGING_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addToArray('tests.imaging', preset)}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {formData.tests.imaging.map((img, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm">{img}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('tests.imaging', idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>EEG</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  name="eeg_date"
                  value={formData.tests.eeg.date}
                  onChange={(e) => updateFormData('tests.eeg.date', e.target.value)}
                />
                <TextArea
                  name="eeg_summary"
                  placeholder="Summary..."
                  value={formData.tests.eeg.summary}
                  onChange={(e) => updateFormData('tests.eeg.summary', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <div>
              <FieldLabel>EMG/NCS</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  name="emg_ncs_date"
                  value={formData.tests.emg_ncs.date}
                  onChange={(e) => updateFormData('tests.emg_ncs.date', e.target.value)}
                />
                <TextArea
                  name="emg_ncs_summary"
                  placeholder="Summary..."
                  value={formData.tests.emg_ncs.summary}
                  onChange={(e) => updateFormData('tests.emg_ncs.summary', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>Laboratory Tests</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel className="text-xs">B12</FieldLabel>
                <Input
                  name="b12"
                  value={formData.tests.labs.b12}
                  onChange={(e) => updateFormData('tests.labs.b12', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">TSH</FieldLabel>
                <Input
                  name="tsh"
                  value={formData.tests.labs.tsh}
                  onChange={(e) => updateFormData('tests.labs.tsh', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">A1C</FieldLabel>
                <Input
                  name="a1c"
                  value={formData.tests.labs.a1c}
                  onChange={(e) => updateFormData('tests.labs.a1c', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">CK</FieldLabel>
                <Input
                  name="ck"
                  value={formData.tests.labs.ck}
                  onChange={(e) => updateFormData('tests.labs.ck', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">ESR/CRP</FieldLabel>
                <Input
                  name="esr_crp"
                  value={formData.tests.labs.esr_crp}
                  onChange={(e) => updateFormData('tests.labs.esr_crp', e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs">Other Labs</FieldLabel>
              <TextArea
                name="others"
                value={formData.tests.labs.others}
                onChange={(e) => updateFormData('tests.labs.others', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Lumbar Puncture</FieldLabel>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.tests.lp.performed}
                  onChange={(e) => updateFormData('tests.lp.performed', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Performed</span>
              </label>
              {formData.tests.lp.performed && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pl-6">
                  <div>
                    <FieldLabel className="text-xs">Opening Pressure</FieldLabel>
                    <Input
                      name="opening_pressure"
                      value={formData.tests.lp.opening_pressure}
                      onChange={(e) => updateFormData('tests.lp.opening_pressure', e.target.value)}
                    />
                    {errors.lp_opening_pressure && <p className="text-red-500 text-xs mt-1">{errors.lp_opening_pressure}</p>}
                  </div>
                  <div>
                    <FieldLabel className="text-xs">Cells</FieldLabel>
                    <Input
                      name="cells"
                      value={formData.tests.lp.cells}
                      onChange={(e) => updateFormData('tests.lp.cells', e.target.value)}
                    />
                    {errors.lp_cells && <p className="text-red-500 text-xs mt-1">{errors.lp_cells}</p>}
                  </div>
                  <div>
                    <FieldLabel className="text-xs">Protein</FieldLabel>
                    <Input
                      name="protein"
                      value={formData.tests.lp.protein}
                      onChange={(e) => updateFormData('tests.lp.protein', e.target.value)}
                    />
                    {errors.lp_protein && <p className="text-red-500 text-xs mt-1">{errors.lp_protein}</p>}
                  </div>
                  <div>
                    <FieldLabel className="text-xs">Glucose</FieldLabel>
                    <Input
                      name="glucose"
                      value={formData.tests.lp.glucose}
                      onChange={(e) => updateFormData('tests.lp.glucose', e.target.value)}
                    />
                    {errors.lp_glucose && <p className="text-red-500 text-xs mt-1">{errors.lp_glucose}</p>}
                  </div>
                  <div className="col-span-2">
                    <FieldLabel className="text-xs">Microbiology</FieldLabel>
                    <Input
                      name="microbiology"
                      value={formData.tests.lp.microbiology}
                      onChange={(e) => updateFormData('tests.lp.microbiology', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Diagnosis */}
      <Card title="Diagnosis" collapsible isOpen={!collapsedSections.diagnosis} onToggle={() => toggleSection('diagnosis')}>
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
            {errors.diagnosis_main && <p className="text-red-500 text-sm mt-1">{errors.diagnosis_main}</p>}
          </div>
          
          <div>
            <FieldLabel>Secondary Diagnoses</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.secondary.map((diag, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.secondary', idx)}>
                  {diag}
                </Chip>
              ))}
            </div>
            <Input
              name="secondary_diagnosis"
              placeholder="Add secondary diagnosis..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  addToArray('diagnosis.secondary', e.target.value.trim());
                  e.target.value = '';
                }
              }}
            />
          </div>

          <div>
            <FieldLabel>Diagnosis Codes</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {DIAGNOSIS_CODE_PRESETS.map(preset => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => addToArray('diagnosis.codes', preset)}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                >
                  + {preset.code}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.codes.map((code, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.codes', idx)}>
                  {code.system} {code.code}: {code.term}
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

      {/* Plan & Treatment - Initial Mode Only */}
      {mode === 'initial' && (
        <Card title="Plan & Treatment" collapsible isOpen={!collapsedSections.plan} onToggle={() => toggleSection('plan')}>
          <div className="space-y-4">
            <div>
              <FieldLabel>Medications</FieldLabel>
              <FieldLabel className="text-xs">({formData.plan.meds.length})</FieldLabel>
              {formData.plan.meds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.plan.meds.map((med, idx) => {
                    const label = `${med.med} ${med.dose} ${med.route} ${med.freq} ${med.duration}`;
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
                      placeholder="Search medication..."
                      value={editingMed.med}
                      onChange={(e) => setEditingMed(s => ({ ...s, med: e.target.value }))}
                      onSelect={(selected) => {
                        setEditingMed(s => ({
                          ...s,
                          med: selected.med,
                          dose: selected.strength || s.dose
                        }));
                      }}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Dose" 
                      value={editingMed.dose} 
                      onChange={(e) => setEditingMed(s => ({...s, dose: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Route (PO, IV, IM...)" 
                      value={editingMed.route} 
                      onChange={(e) => setEditingMed(s => ({...s, route: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Frequency" 
                      value={editingMed.freq} 
                      onChange={(e) => setEditingMed(s => ({...s, freq: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Duration" 
                      value={editingMed.duration} 
                      onChange={(e) => setEditingMed(s => ({...s, duration: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <TextArea 
                      placeholder="Instructions" 
                      value={editingMed.instructions} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-12 flex gap-2">
                    <button type="button" onClick={saveMed} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Save</button>
                    <button type="button" onClick={() => { setEditingMed(null); setEditingMedIdx(null); }} className="px-4 py-2 border border-slate-300 rounded-lg">Cancel</button>
                  </div>
                </div>
              )}
              
              {!editingMed && (
                <button
                  type="button"
                  onClick={() => openMedEditor()}
                  className="mt-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                >
                  + Add Medication
                </button>
              )}
            </div>

            <div>
              <FieldLabel>Planned Procedures</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {PROCEDURE_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addToArray('plan.procedures_planned', preset)}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.procedures_planned.map((proc, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.procedures_planned', idx)}>
                    {proc}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Counseling</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {COUNSELING_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addToArray('plan.counseling', preset)}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.counseling.map((counsel, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.counseling', idx)}>
                    {counsel}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Rehabilitation Referrals</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {REHAB_REFERRALS.map(ref => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => addToArray('plan.rehab_referrals', ref)}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    + {ref}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.rehab_referrals.map((ref, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.rehab_referrals', idx)}>
                    {ref}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Safety</FieldLabel>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.plan.safety.falls}
                    onChange={(e) => updateFormData('plan.safety.falls', e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Falls Risk</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.plan.safety.driving_restriction}
                    onChange={(e) => updateFormData('plan.safety.driving_restriction', e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Driving Restriction</span>
                </label>
              </div>
            </div>

            <div>
              <FieldLabel>Follow-up</FieldLabel>
              <Select
                name="follow_up"
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={[
                  { value: '24h', label: '24 hours' },
                  { value: '3d', label: '3 days' },
                  { value: '1w', label: '1 week' },
                  { value: '1m', label: '1 month' },
                  { value: 'date', label: 'Specific date' },
                  { value: 'prn', label: 'PRN' }
                ]}
              />
              {formData.plan.follow_up === 'date' && (
                <div className="mt-2">
                  <Input
                    type="date"
                    name="follow_up_date"
                    value={formData.plan.follow_up_date}
                    onChange={(e) => updateFormData('plan.follow_up_date', e.target.value)}
                  />
                  {errors.follow_up_date && <p className="text-red-500 text-sm mt-1">{errors.follow_up_date}</p>}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Procedures Done */}
      <Card title="Procedures Done" collapsible isOpen={!collapsedSections.procedures} onToggle={() => toggleSection('procedures')} counter={formData.procedures_done.length}>
        <div className="space-y-4">
          {formData.procedures_done.length > 0 && (
            <div className="space-y-2">
              {formData.procedures_done.map((proc, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{proc.name} - {proc.date}</p>
                      {proc.side && <p className="text-sm text-slate-600">Side: {proc.side}</p>}
                      {proc.technique && <p className="text-sm text-slate-600">Technique: {proc.technique}</p>}
                      {proc.findings && <p className="text-sm text-slate-600">Findings: {proc.findings}</p>}
                      {proc.complications && <p className="text-sm text-red-600">Complications: {proc.complications}</p>}
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
              <div className="col-span-12">
                <Input 
                  placeholder="Procedure name" 
                  value={editingProcedure.name} 
                  onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  type="date"
                  placeholder="Date" 
                  value={editingProcedure.date} 
                  onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  placeholder="Side (R/L/Both)" 
                  value={editingProcedure.side} 
                  onChange={(e) => setEditingProcedure(s => ({...s, side: e.target.value}))}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  placeholder="Anesthesia" 
                  value={editingProcedure.anesthesia} 
                  onChange={(e) => setEditingProcedure(s => ({...s, anesthesia: e.target.value}))}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Technique" 
                  value={editingProcedure.technique} 
                  onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Findings" 
                  value={editingProcedure.findings} 
                  onChange={(e) => setEditingProcedure(s => ({...s, findings: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12">
                <Select 
                  name="result" 
                  value={editingProcedure.result} 
                  onChange={(e) => setEditingProcedure(s => ({...s, result: e.target.value}))}
                  options={[
                    {value:'successful',label:'Successful'},
                    {value:'partial',label:'Partial'},
                    {value:'failed',label:'Failed'}
                  ]} 
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Complications" 
                  value={editingProcedure.complications} 
                  onChange={(e) => setEditingProcedure(s => ({...s, complications: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12 flex gap-2">
                <button type="button" onClick={saveProcedure} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Save</button>
                <button type="button" onClick={() => { setEditingProcedure(null); setEditingProcedureIdx(null); }} className="px-4 py-2 border border-slate-300 rounded-lg">Cancel</button>
              </div>
            </div>
          )}
          
          {!editingProcedure && (
            <button
              type="button"
              onClick={() => openProcedureEditor()}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
            >
              + Add Procedure
            </button>
          )}
        </div>
      </Card>

      {/* Outcome & Recommendations - Discharge Mode Only */}
      {mode === 'discharge' && (
        <Card title="Outcome & Recommendations" collapsible isOpen={!collapsedSections.outcome} onToggle={() => toggleSection('outcome')}>
          <div className="space-y-4">
            <div>
              <FieldLabel>Condition at Discharge</FieldLabel>
              <Input
                name="condition"
                placeholder="Stable, improved, unchanged..."
                value={formData.outcome.condition}
                onChange={(e) => updateFormData('outcome.condition', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Hospital Course</FieldLabel>
              <TextArea
                name="course"
                placeholder="Summarize hospital stay, treatments, response..."
                value={formData.outcome.course}
                onChange={(e) => updateFormData('outcome.course', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <FieldLabel required>Recommendations</FieldLabel>
              <div className="space-y-2">
                {formData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
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
            <p className="text-xs text-slate-400 mb-2">Include imaging reports, EEG tracings, etc.</p>
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
                // Call handleFinalize without passing the event
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

export default NeurologyReportForm;