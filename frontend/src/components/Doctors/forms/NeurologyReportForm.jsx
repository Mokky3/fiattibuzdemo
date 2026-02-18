import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsAPI, icdCodesAPI, doctorPatientsAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from OphthalmologyReportForm)
const Card = React.memo(({ children, className = "", collapsible = false, isOpen = true, onToggle, title, counter, subtitle, darkMode = false }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
  
  useEffect(() => {
    setInternalIsOpen(isOpen);
  }, [isOpen]);
  
  const handleToggle = () => {
    const newState = !internalIsOpen;
    setInternalIsOpen(newState);
    if (onToggle) onToggle();
  };
  
  const displayIsOpen = collapsible ? internalIsOpen : isOpen;
  
  return (
    <div className={`rounded-2xl border shadow-sm ${
      darkMode 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-slate-100'
    } ${className}`}>
      {title && (
        <div 
          className={`p-4 border-b ${
            darkMode ? 'border-slate-700' : 'border-slate-100'
          } ${collapsible ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
          onClick={collapsible ? handleToggle : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold text-lg ${
                darkMode ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {title}
                {counter !== undefined && <span className={`ml-2 ${
                  darkMode ? 'text-slate-400' : 'text-slate-400'
                }`}>({counter})</span>}
              </h3>
              {subtitle && (
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>{subtitle}</p>
              )}
            </div>
            {collapsible && (
              <span className={`text-sm ${
                darkMode ? 'text-slate-400' : 'text-slate-400'
              }`}>
                {displayIsOpen ? '▼' : '▶'}
              </span>
            )}
          </div>
        </div>
      )}
      {displayIsOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
});

const FieldLabel = React.memo(({ children, required = false, darkMode = false }) => (
  <label className={`block text-sm font-medium mb-2 ${
    darkMode ? 'text-slate-300' : 'text-slate-700'
  }`}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
));

const Input = React.memo(({ name, placeholder, value, onChange, className = "", type = "text", required = false, readOnly = false, darkMode = false }) => (
  <input
    type={type}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={readOnly ? () => {} : onChange}
    readOnly={readOnly}
    required={required}
    className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
      darkMode 
        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
        : 'text-slate-600 border-slate-200 bg-white'
    } ${className}`}
  />
));

const Select = React.memo(({ name, value, onChange, options, className = "", required = false, darkMode = false, selectPlaceholder = "Select..." }) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    required={required}
    className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
      darkMode 
        ? 'bg-slate-700 border-slate-600 text-slate-200' 
        : 'text-slate-600 border-slate-200 bg-white'
    } ${className}`}
  >
    <option value="" className={darkMode ? 'bg-slate-800' : ''}>{selectPlaceholder}</option>
    {options.map(option => (
      <option key={option.value} value={option.value} className={darkMode ? 'bg-slate-800' : ''}>
        {option.label}
      </option>
    ))}
  </select>
));

const TextArea = React.memo(({ name, placeholder, value, onChange, className = "", rows = 3, required = false, darkMode = false }) => (
  <textarea
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={rows}
    required={required}
    className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical ${
      darkMode 
        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
        : 'text-slate-600 border-slate-200 bg-white'
    } ${className}`}
  />
));

const Chip = React.memo(({ children, onRemove, onEdit, className = "", darkMode = false }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
    darkMode 
      ? 'bg-slate-700 text-slate-300' 
      : 'bg-slate-100 text-slate-700'
  } ${className}`}>
    <span>{children}</span>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
        aria-label="Edit"
      >
        ✎
      </button>
    )}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className={darkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}
        aria-label="Remove"
      >
        ×
      </button>
    )}
  </div>
));

// ICD Code Search Component
const IcdCodeSearchInput = ({ value, onChange, onSelect, placeholder = "Search ICD code or description...", darkMode = false }) => {
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
          className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            darkMode 
              ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
              : 'text-slate-600 border-slate-200 bg-white'
          }`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
          darkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}>
          {searchResults.map((result, index) => (
            <button
              key={result.id || result.code}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-2 focus:outline-none ${
                darkMode
                  ? index === selectedIndex 
                    ? 'bg-emerald-900/50' 
                    : 'hover:bg-slate-700'
                  : index === selectedIndex 
                    ? 'bg-emerald-50' 
                    : 'hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-mono text-sm font-medium min-w-[100px] ${
                  darkMode ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                  {result.code}
                </span>
                <span className={`text-sm flex-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
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
const MedicationSearchInput = ({ value, onChange, onSelect, placeholder = "Search medication...", darkMode = false }) => {
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
          className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            darkMode 
              ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
              : 'text-slate-600 border-slate-200 bg-white'
          }`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
          darkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}>
          {searchResults.map((result, index) => (
            <button
              key={result.id || index}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-2 focus:outline-none ${
                darkMode
                  ? index === selectedIndex 
                    ? 'bg-emerald-900/50' 
                    : 'hover:bg-slate-700'
                  : index === selectedIndex 
                    ? 'bg-emerald-50' 
                    : 'hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-medium text-sm flex-1 ${
                  darkMode ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  {result.brand_name || result.name || 'Unknown'}
                </span>
                {result.strength && (
                  <span className={`text-xs ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {result.strength} {result.strength_unit?.name || ''}
                  </span>
                )}
              </div>
              {result.mnn?.name && (
                <div className={`text-xs mt-1 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
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
  const { t } = useTranslation();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Sync theme on mount and when darkMode changes
  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem('theme');
      const root = document.documentElement;

      if (saved === 'dark') {
        root.classList.add('dark');
        setDarkMode(true);
      } else {
        root.classList.remove('dark');
        setDarkMode(false);
      }
    };

    syncTheme(); // Sync on mount

    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        syncTheme();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleThemeChange = () => syncTheme();
    window.addEventListener('themechange', handleThemeChange);

    const interval = setInterval(syncTheme, 100); // Periodically check for same-tab changes

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themechange', handleThemeChange);
      clearInterval(interval);
    };
  }, []);

  // Mode state
  const [mode, setMode] = useState('initial');
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    meta: false,
    hpi: false,
    vitals: true, // Collapsed by default - will auto-fill from backend
    mentalStatus: false,
    cranialNerves: false,
    motor: false,
    reflexes: false,
    sensory: false,
    cerebellar: false,
    autonomic: false,
    meningeal: false,
    painHeadache: false,
    seizure: true, // Default collapsed - advanced/optional
    stroke: true, // Default collapsed - advanced/optional
    localization: false,
    tests: true, // Default collapsed - contains LP which is optional
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

  // Patient medications from database
  const [patientMedications, setPatientMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

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

  // Fetch latest vitals from backend when patient/encounter changes
  useEffect(() => {
    const fetchVitals = async () => {
      if (!patient?.patient_id) return;
      
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
              bp_right: latestVitals.systolic_bp && latestVitals.diastolic_bp 
                ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` 
                : formData.vitals.bp_right || '',
              bp_left: latestVitals.systolic_bp && latestVitals.diastolic_bp 
                ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` 
                : formData.vitals.bp_left || '',
              hr: latestVitals.heart_rate?.toString() || formData.vitals.hr || '',
              temp: latestVitals.temperature?.toString() || formData.vitals.temp || '',
              spo2: latestVitals.oxygen_saturation?.toString() || formData.vitals.spo2 || ''
            };
            
            // Only update if we have new vitals data
            if (latestVitals.systolic_bp || latestVitals.heart_rate || latestVitals.temperature || latestVitals.oxygen_saturation) {
              setFormData(prev => ({
                ...prev,
                vitals: mappedVitals
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching vitals:', error);
        // Silently fail - don't block form usage if vitals can't be fetched
      }
    };
    
    fetchVitals();
  }, [patient?.patient_id]); // Only depend on patient_id to avoid unnecessary re-fetches

  // Fetch patient medications from database
  useEffect(() => {
    const fetchPatientMedications = async () => {
      const patientId = patient?.patient_id || patient?.id || encounter?.patient_id || '';
      if (!patientId) return;

      try {
        setLoadingMedications(true);
        const medications = await doctorPatientsAPI.getMedications(patientId, true);
        console.log('Fetched medications:', medications);
        // Handle both SuccessResponse format and direct array
        const medsArray = Array.isArray(medications) 
          ? medications 
          : (medications?.data && Array.isArray(medications.data) 
            ? medications.data 
            : []);
        console.log('Processed medications array:', medsArray);
        setPatientMedications(medsArray);
      } catch (error) {
        console.error('Error fetching patient medications:', error);
        setPatientMedications([]);
      } finally {
        setLoadingMedications(false);
      }
    };
    
    fetchPatientMedications();
  }, [patient?.patient_id, patient?.id, encounter?.patient_id]);

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

    // Main diagnosis validation - check both code and term
    const mainDiag = formData.diagnosis.main;
    if (typeof mainDiag === 'object') {
      if (!mainDiag.code?.trim() && !mainDiag.term?.trim()) {
        newErrors.diagnosis_main = 'Main diagnosis is required';
      }
    } else if (typeof mainDiag === 'string' && !mainDiag.trim()) {
      newErrors.diagnosis_main = 'Main diagnosis is required';
    } else if (!mainDiag) {
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
    <div className={`max-w-6xl mx-auto p-6 space-y-6 min-h-screen ${
      darkMode ? 'bg-slate-900' : 'bg-slate-50'
    }`}>
      {/* Autosave Toast */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Saved at {lastSaved?.toLocaleTimeString()}
        </div>
      )}

      {/* Header */}
      <Card title={t('neurologyReport.title') || 'Neurology Report'} className="mb-6" darkMode={darkMode}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.mode')}</FieldLabel>
            <Select
              name="mode"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
              options={[
                { value: 'initial', label: t('neurologyReport.initialAssessment') },
                { value: 'discharge', label: t('neurologyReport.dischargeSummary') }
              ]}
              darkMode={darkMode}
              selectPlaceholder={t('neurologyReport.select')}
            />
          </div>
        </div>
      </Card>

      {/* Chief Complaint */}
      <Card title={t('neurologyReport.chiefComplaint')} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel required darkMode={darkMode}>{t('neurologyReport.chiefComplaint')}</FieldLabel>
            <Input
              name="chief_complaint"
              placeholder={t('neurologyReport.enterChiefComplaint')}
              value={formData.chief_complaint}
              onChange={(e) => updateFormData('chief_complaint', e.target.value)}
              required
              darkMode={darkMode}
            />
            {errors.chief_complaint && (
              <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
            )}
          </div>
        </div>
      </Card>

      {/* HPI */}
      <Card title={t('neurologyReport.historyOfPresentIllness')} collapsible isOpen={!collapsedSections.hpi} onToggle={() => toggleSection('hpi')} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.onsetType')}</FieldLabel>
              <Select
                name="onset_type"
                value={formData.hpi.onset_type}
                onChange={(e) => updateFormData('hpi.onset_type', e.target.value)}
                options={[
                  { value: 'sudden', label: t('neurologyReport.sudden') },
                  { value: 'gradual', label: t('neurologyReport.gradual') },
                  { value: 'progressive', label: t('neurologyReport.progressive') }
                ]}
                darkMode={darkMode}
                selectPlaceholder={t('neurologyReport.select')}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.lastKnownWell')}</FieldLabel>
              <Input
                type="datetime-local"
                name="lkw_time"
                value={formData.hpi.lkw_time}
                onChange={(e) => updateFormData('hpi.lkw_time', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.course')}</FieldLabel>
              <Input
                name="course"
                placeholder={t('neurologyReport.coursePlaceholder')}
                value={formData.hpi.course}
                onChange={(e) => updateFormData('hpi.course', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.triggers')}</FieldLabel>
            <Input
              name="triggers"
              placeholder={t('neurologyReport.triggersPlaceholder')}
              value={formData.hpi.triggers}
              onChange={(e) => updateFormData('hpi.triggers', e.target.value)}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.associatedSymptoms')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { value: 'weakness', label: t('neurologyReport.weakness') },
                { value: 'numbness', label: t('neurologyReport.numbness') },
                { value: 'tingling', label: t('neurologyReport.tingling') },
                { value: 'vision loss', label: t('neurologyReport.visionLoss') },
                { value: 'diplopia', label: t('neurologyReport.diplopia') },
                { value: 'dysarthria', label: t('neurologyReport.dysarthria') },
                { value: 'aphasia', label: t('neurologyReport.aphasia') },
                { value: 'vertigo', label: t('neurologyReport.vertigo') },
                { value: 'ataxia', label: t('neurologyReport.ataxia') },
                { value: 'syncope', label: t('neurologyReport.syncope') },
                { value: 'tremor', label: t('neurologyReport.tremor') },
                { value: 'memory loss', label: t('neurologyReport.memoryLoss') },
                { value: 'seizure', label: t('neurologyReport.seizure') },
                { value: 'headache', label: t('neurologyReport.headache') }
              ].map(symptom => (
                <button
                  key={symptom.value}
                  type="button"
                  onClick={() => {
                    if (formData.hpi.associated_symptoms.includes(symptom.value)) {
                      removeFromArray('hpi.associated_symptoms', formData.hpi.associated_symptoms.indexOf(symptom.value));
                    } else {
                      addToArray('hpi.associated_symptoms', symptom.value);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm border ${
                    formData.hpi.associated_symptoms.includes(symptom.value)
                      ? darkMode
                        ? 'bg-emerald-900/50 text-emerald-300 border-emerald-600'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : darkMode
                        ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {symptom.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.hpi.associated_symptoms.map((symptom, idx) => {
                const symptomLabels = {
                  'weakness': t('neurologyReport.weakness'),
                  'numbness': t('neurologyReport.numbness'),
                  'tingling': t('neurologyReport.tingling'),
                  'vision loss': t('neurologyReport.visionLoss'),
                  'diplopia': t('neurologyReport.diplopia'),
                  'dysarthria': t('neurologyReport.dysarthria'),
                  'aphasia': t('neurologyReport.aphasia'),
                  'vertigo': t('neurologyReport.vertigo'),
                  'ataxia': t('neurologyReport.ataxia'),
                  'syncope': t('neurologyReport.syncope'),
                  'tremor': t('neurologyReport.tremor'),
                  'memory loss': t('neurologyReport.memoryLoss'),
                  'seizure': t('neurologyReport.seizure'),
                  'headache': t('neurologyReport.headache')
                };
                return (
                <Chip key={idx} onRemove={() => removeFromArray('hpi.associated_symptoms', idx)} darkMode={darkMode}>
                    {symptomLabels[symptom] || symptom}
                </Chip>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.headacheProfile')}</FieldLabel>
            <TextArea
              name="headache_profile"
              placeholder={t('neurologyReport.headacheProfilePlaceholder')}
              value={formData.hpi.headache_profile}
              onChange={(e) => updateFormData('hpi.headache_profile', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.seizureSemiology')}</FieldLabel>
            <TextArea
              name="seizure_semiology"
              placeholder={t('neurologyReport.seizureSemiologyPlaceholder')}
              value={formData.hpi.seizure_semiology}
              onChange={(e) => updateFormData('hpi.seizure_semiology', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.riskFactors')}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              {Object.keys(formData.hpi.risk_factors).map(factor => {
                const riskFactorLabels = {
                  'htn': t('neurologyReport.htn') || 'HTN',
                  'dm': t('neurologyReport.dm') || 'DM',
                  'af': t('neurologyReport.af') || 'AF',
                  'smoking': t('neurologyReport.smoking') || 'Smoking',
                  'anticoagulants': t('neurologyReport.anticoagulants') || 'Anticoagulants'
                };
                return (
                <label key={factor} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.risk_factors[factor]}
                    onChange={(e) => updateFormData(`hpi.risk_factors.${factor}`, e.target.checked)}
                    className={`rounded ${
                      darkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>{riskFactorLabels[factor] || factor.charAt(0).toUpperCase() + factor.slice(1)}</span>
                </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.currentMedications')}</FieldLabel>
              {patientMedications.length > 0 && (
                <div className={`mb-2 p-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-blue-900/30 border-blue-700' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>{t('neurologyReport.fromPatientRecord') || 'From Patient Record'}</div>
                  <div className="space-y-1">
                    {patientMedications.map((med, idx) => (
                      <div key={idx} className={`text-xs ${
                        darkMode ? 'text-blue-300' : 'text-blue-700'
                      }`}>
                        • {med.medication_name} {med.dosage} {med.frequency} {med.route || ''}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const medsText = patientMedications.map(m => 
                        `${m.medication_name} ${m.dosage} ${m.frequency} ${m.route || ''}`.trim()
                      ).join(', ');
                      updateFormData('hpi.meds', medsText);
                    }}
                    className={`mt-1 text-xs underline ${
                      darkMode 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    {t('neurologyReport.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
              <TextArea
                name="meds"
                placeholder={t('neurologyReport.listCurrentMedications')}
                value={formData.hpi.meds}
                onChange={(e) => updateFormData('hpi.meds', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.allergies')}</FieldLabel>
              <Input
                name="allergies"
                placeholder={t('neurologyReport.drugAllergiesReactions')}
                value={formData.hpi.allergies}
                onChange={(e) => updateFormData('hpi.allergies', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.pastMedicalHistory')}</FieldLabel>
            <TextArea
              name="pmh"
              placeholder={t('neurologyReport.previousNeurologicalDiagnoses')}
              value={formData.hpi.pmh}
              onChange={(e) => updateFormData('hpi.pmh', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.familyHistory')}</FieldLabel>
              <TextArea
                name="family"
                placeholder={t('neurologyReport.familyHistoryNeurological')}
                value={formData.hpi.family}
                onChange={(e) => updateFormData('hpi.family', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.socialHistory')}</FieldLabel>
              <TextArea
                name="social"
                placeholder={t('neurologyReport.socialHistoryPlaceholder')}
                value={formData.hpi.social}
                onChange={(e) => updateFormData('hpi.social', e.target.value)}
                rows={2}
                darkMode={darkMode}
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
                  : darkMode
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              🧠 AI Suggest
            </button>
          </div>
        </div>
      </Card>

      {/* Vitals */}
      <Card title={t('neurologyReport.vitals')} collapsible isOpen={!collapsedSections.vitals} onToggle={() => toggleSection('vitals')} darkMode={darkMode}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.bpRight')}</FieldLabel>
            <Input
              name="bp_right"
              placeholder={t('neurologyReport.bpPlaceholder')}
              value={formData.vitals.bp_right}
              onChange={(e) => updateFormData('vitals.bp_right', e.target.value)}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.bpLeft')}</FieldLabel>
            <Input
              name="bp_left"
              placeholder={t('neurologyReport.bpPlaceholder')}
              value={formData.vitals.bp_left}
              onChange={(e) => updateFormData('vitals.bp_left', e.target.value)}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.heartRate')}</FieldLabel>
            <Input
              name="hr"
              placeholder={t('neurologyReport.hrPlaceholder')}
              value={formData.vitals.hr}
              onChange={(e) => updateFormData('vitals.hr', e.target.value)}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.temperature')}</FieldLabel>
            <Input
              name="temp"
              placeholder={t('neurologyReport.tempPlaceholder')}
              value={formData.vitals.temp}
              onChange={(e) => updateFormData('vitals.temp', e.target.value)}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.spo2')}</FieldLabel>
            <Input
              name="spo2"
              placeholder={t('neurologyReport.spo2Placeholder')}
              value={formData.vitals.spo2}
              onChange={(e) => updateFormData('vitals.spo2', e.target.value)}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Mental Status */}
      <Card title={t('neurologyReport.mentalStatus')} collapsible isOpen={!collapsedSections.mentalStatus} onToggle={() => toggleSection('mentalStatus')} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.levelOfConsciousness')}</FieldLabel>
            <Select
              name="consciousness"
              value={formData.mental_status.consciousness}
              onChange={(e) => updateFormData('mental_status.consciousness', e.target.value)}
              options={[
                { value: 'alert', label: t('neurologyReport.alert') },
                { value: 'drowsy', label: t('neurologyReport.drowsy') },
                { value: 'stupor', label: t('neurologyReport.stupor') },
                { value: 'coma', label: t('neurologyReport.coma') }
              ]}
              darkMode={darkMode}
              selectPlaceholder={t('neurologyReport.select')}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.orientation')}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              {Object.keys(formData.mental_status.orientation).map(field => {
                const fieldLabels = {
                  person: t('neurologyReport.person') || 'Person',
                  place: t('neurologyReport.place') || 'Place',
                  time: t('neurologyReport.time') || 'Time'
                };
                return (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.mental_status.orientation[field]}
                    onChange={(e) => updateFormData(`mental_status.orientation.${field}`, e.target.checked)}
                    className={`rounded ${
                      darkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>{fieldLabels[field] || field.charAt(0).toUpperCase() + field.slice(1)}</span>
                </label>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.attentionMemory')}</FieldLabel>
              <TextArea
                name="attention_memory"
                placeholder={t('neurologyReport.attentionMemoryPlaceholder')}
                value={formData.mental_status.attention_memory}
                onChange={(e) => updateFormData('mental_status.attention_memory', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.language')}</FieldLabel>
              <TextArea
                name="language"
                placeholder={t('neurologyReport.languagePlaceholder')}
                value={formData.mental_status.language}
                onChange={(e) => updateFormData('mental_status.language', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.behavior')}</FieldLabel>
            <TextArea
              name="behavior"
              placeholder={t('neurologyReport.behaviorPlaceholder')}
              value={formData.mental_status.behavior}
              onChange={(e) => updateFormData('mental_status.behavior', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>
                {t('neurologyReport.mmseScore')} <span className={`text-xs font-normal ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>({t('neurologyReport.recordIfPerformed') || 'record if performed'})</span>
              </FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  name="mmse_score"
                  placeholder={t('neurologyReport.score')}
                  value={formData.mental_status.mmse.score}
                  onChange={(e) => updateFormData('mental_status.mmse.score', e.target.value)}
                  darkMode={darkMode}
                />
                <Input
                  type="date"
                  name="mmse_date"
                  value={formData.mental_status.mmse.date}
                  onChange={(e) => updateFormData('mental_status.mmse.date', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>
                {t('neurologyReport.mocaScore')} <span className={`text-xs font-normal ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>({t('neurologyReport.recordIfPerformed') || 'record if performed'})</span>
              </FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  name="moca_score"
                  placeholder={t('neurologyReport.score')}
                  value={formData.mental_status.moca.score}
                  onChange={(e) => updateFormData('mental_status.moca.score', e.target.value)}
                  darkMode={darkMode}
                />
                <Input
                  type="date"
                  name="moca_date"
                  value={formData.mental_status.moca.date}
                  onChange={(e) => updateFormData('mental_status.moca.date', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cranial Nerves */}
      <Card title={t('neurologyReport.cranialNerves')} collapsible isOpen={!collapsedSections.cranialNerves} onToggle={() => toggleSection('cranialNerves')} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={fillNormalCNExam}
              className={`px-4 py-2 rounded-lg text-sm ${
                darkMode 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t('neurologyReport.fillNormalCNExam')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn1')}</FieldLabel>
              <Input
                name="cn1"
                placeholder={t('neurologyReport.intactBilaterallyImpaired')}
                value={formData.cranial_nerves.cn1}
                onChange={(e) => updateFormData('cranial_nerves.cn1', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn2Fields')}</FieldLabel>
              <Input
                name="cn2_fields"
                placeholder={t('neurologyReport.fullFieldsOU')}
                value={formData.cranial_nerves.cn2_fields}
                onChange={(e) => updateFormData('cranial_nerves.cn2_fields', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn2Fundoscopy')}</FieldLabel>
              <Input
                name="cn2_fundoscopy"
                placeholder={t('neurologyReport.discsVesselsMacula')}
                value={formData.cranial_nerves.cn2_fundoscopy}
                onChange={(e) => updateFormData('cranial_nerves.cn2_fundoscopy', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn3_4_6')}</FieldLabel>
              <Input
                name="cn3_4_6_eyemov"
                placeholder={t('neurologyReport.fullEOMNystagmus')}
                value={formData.cranial_nerves.cn3_4_6_eyemov}
                onChange={(e) => updateFormData('cranial_nerves.cn3_4_6_eyemov', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn5')}</FieldLabel>
              <Input
                name="cn5"
                placeholder={t('neurologyReport.sensationV1V3')}
                value={formData.cranial_nerves.cn5}
                onChange={(e) => updateFormData('cranial_nerves.cn5', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn7')}</FieldLabel>
              <Input
                name="cn7"
                placeholder={t('neurologyReport.facialSymmetry')}
                value={formData.cranial_nerves.cn7}
                onChange={(e) => updateFormData('cranial_nerves.cn7', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn8')}</FieldLabel>
              <Input
                name="cn8"
                placeholder={t('neurologyReport.hearingIntact')}
                value={formData.cranial_nerves.cn8}
                onChange={(e) => updateFormData('cranial_nerves.cn8', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn9_10')}</FieldLabel>
              <Input
                name="cn9_10"
                placeholder={t('neurologyReport.gagIntact')}
                value={formData.cranial_nerves.cn9_10}
                onChange={(e) => updateFormData('cranial_nerves.cn9_10', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn11')}</FieldLabel>
              <Input
                name="cn11"
                placeholder={t('neurologyReport.scmTrapezius')}
                value={formData.cranial_nerves.cn11}
                onChange={(e) => updateFormData('cranial_nerves.cn11', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.cn12')}</FieldLabel>
              <Input
                name="cn12"
                placeholder={t('neurologyReport.tongueMidline')}
                value={formData.cranial_nerves.cn12}
                onChange={(e) => updateFormData('cranial_nerves.cn12', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Motor */}
      <Card title={t('neurologyReport.motorExamination')} collapsible isOpen={!collapsedSections.motor} onToggle={() => toggleSection('motor')} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.tone') || 'Tone'}</FieldLabel>
              <Select
                name="tone"
                value={formData.motor.tone}
                onChange={(e) => updateFormData('motor.tone', e.target.value)}
                options={[
                  { value: 'normal', label: t('neurologyReport.normal') },
                  { value: 'spastic', label: t('neurologyReport.spastic') },
                  { value: 'rigid', label: t('neurologyReport.rigid') },
                  { value: 'flaccid', label: t('neurologyReport.flaccid') }
                ]}
                darkMode={darkMode}
                selectPlaceholder={t('neurologyReport.select')}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.bulk')}</FieldLabel>
              <Select
                name="bulk"
                value={formData.motor.bulk}
                onChange={(e) => updateFormData('motor.bulk', e.target.value)}
                options={[
                  { value: 'normal', label: t('neurologyReport.normal') },
                  { value: 'atrophy', label: t('neurologyReport.atrophy') },
                  { value: 'hypertrophy', label: t('neurologyReport.hypertrophy') }
                ]}
                darkMode={darkMode}
                selectPlaceholder={t('neurologyReport.select')}
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.motor.fasciculations}
                  onChange={(e) => updateFormData('motor.fasciculations', e.target.checked)}
                  className={`rounded ${
                    darkMode ? 'border-slate-600' : 'border-slate-300'
                  }`}
                />
                <span className={`text-sm ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>{t('neurologyReport.fasciculations')}</span>
              </label>
            </div>
          </div>
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.strength')} (MRC 0-5)</FieldLabel>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <thead>
                  <tr className={`border-b ${
                    darkMode ? 'border-slate-700' : 'border-slate-200'
                  }`}>
                    <th className={`text-left p-2 ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>{t('neurologyReport.joint')}</th>
                    <th className={`text-center p-2 ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>{t('neurologyReport.right')}</th>
                    <th className={`text-center p-2 ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>{t('neurologyReport.left')}</th>
                  </tr>
                </thead>
                <tbody>
                  {['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].map(joint => {
                    const jointLabels = {
                      shoulder: t('neurologyReport.shoulder'),
                      elbow: t('neurologyReport.elbow'),
                      wrist: t('neurologyReport.wrist'),
                      hip: t('neurologyReport.hip'),
                      knee: t('neurologyReport.knee'),
                      ankle: t('neurologyReport.ankle')
                    };
                    return (
                    <tr key={joint} className={`border-b ${
                      darkMode ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <td className={`p-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>{jointLabels[joint] || joint}</td>
                      <td className="p-2">
                        <Select
                          name={`strength_R_${joint}`}
                          value={formData.motor.strength.R[joint]}
                          onChange={(e) => updateFormData(`motor.strength.R.${joint}`, e.target.value)}
                          options={MRC_GRADES.map(g => ({ value: g, label: g }))}
                          darkMode={darkMode}
                          selectPlaceholder={t('neurologyReport.select')}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          name={`strength_L_${joint}`}
                          value={formData.motor.strength.L[joint]}
                          onChange={(e) => updateFormData(`motor.strength.L.${joint}`, e.target.value)}
                          options={MRC_GRADES.map(g => ({ value: g, label: g }))}
                          darkMode={darkMode}
                          selectPlaceholder={t('neurologyReport.select')}
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {errors.motor_R_shoulder && <p className="text-red-500 text-sm mt-1">{errors.motor_R_shoulder}</p>}
          </div>
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.pronatorDrift')}</FieldLabel>
            <Select
              name="pronator_drift"
              value={formData.motor.pronator_drift}
              onChange={(e) => updateFormData('motor.pronator_drift', e.target.value)}
              options={[
                { value: 'present', label: t('neurologyReport.present') },
                { value: 'absent', label: t('neurologyReport.absent') }
              ]}
              darkMode={darkMode}
              selectPlaceholder={t('neurologyReport.select')}
            />
          </div>
        </div>
      </Card>

      {/* Reflexes */}
      <Card title={t('neurologyReport.reflexes')} collapsible isOpen={!collapsedSections.reflexes} onToggle={() => toggleSection('reflexes')} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.deepTendonReflexes')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['biceps', 'triceps', 'brachioradialis', 'knee', 'ankle'].map(reflex => {
                const reflexLabels = {
                  biceps: t('neurologyReport.biceps'),
                  triceps: t('neurologyReport.triceps'),
                  brachioradialis: t('neurologyReport.brachioradialis'),
                  knee: t('neurologyReport.knee'),
                  ankle: t('neurologyReport.ankle')
                };
                return (
                <div key={reflex}>
                  <FieldLabel darkMode={darkMode}>{reflexLabels[reflex] || reflex}</FieldLabel>
                  <div className="flex gap-2">
                    {REFLEX_GRADES.map(grade => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => updateFormData(`reflexes.${reflex}`, grade)}
                        className={`px-3 py-1 rounded text-sm border ${
                          formData.reflexes[reflex] === grade
                            ? darkMode
                              ? 'bg-emerald-900/50 text-emerald-300 border-emerald-600'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : darkMode
                              ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.plantarResponse')}</FieldLabel>
              <Select
                name="plantar"
                value={formData.reflexes.plantar}
                onChange={(e) => updateFormData('reflexes.plantar', e.target.value)}
                options={[
                  { value: 'flexor', label: t('neurologyReport.flexor') },
                  { value: 'extensor', label: t('neurologyReport.extensor') }
                ]}
                darkMode={darkMode}
                selectPlaceholder={t('neurologyReport.select')}
              />
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.reflexes.hoffman}
                  onChange={(e) => updateFormData('reflexes.hoffman', e.target.checked)}
                  className={`rounded ${
                    darkMode ? 'border-slate-600' : 'border-slate-300'
                  }`}
                />
                <span className={`text-sm ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>{t('neurologyReport.hoffman')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.reflexes.clonus}
                  onChange={(e) => updateFormData('reflexes.clonus', e.target.checked)}
                  className={`rounded ${
                    darkMode ? 'border-slate-600' : 'border-slate-300'
                  }`}
                />
                <span className={`text-sm ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>{t('neurologyReport.clonus')}</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Sensory */}
      <Card title={t('neurologyReport.sensoryExamination')} collapsible isOpen={!collapsedSections.sensory} onToggle={() => toggleSection('sensory')} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>Light Touch</FieldLabel>
              <TextArea
                name="light_touch"
                placeholder="Intact throughout, decreased R arm..."
                value={formData.sensory.light_touch}
                onChange={(e) => updateFormData('sensory.light_touch', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.pinprick')}</FieldLabel>
              <TextArea
                name="pinprick"
                placeholder={t('neurologyReport.intactThroughout')}
                value={formData.sensory.pinprick}
                onChange={(e) => updateFormData('sensory.pinprick', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.temperature')}</FieldLabel>
              <TextArea
                name="temperature"
                placeholder={t('neurologyReport.intactThroughout')}
                value={formData.sensory.temperature}
                onChange={(e) => updateFormData('sensory.temperature', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.vibration')}</FieldLabel>
              <TextArea
                name="vibration"
                placeholder={t('neurologyReport.normalAt128Hz')}
                value={formData.sensory.vibration}
                onChange={(e) => updateFormData('sensory.vibration', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.proprioception')}</FieldLabel>
              <TextArea
                name="proprioception"
                placeholder={t('neurologyReport.intactFingerToe')}
                value={formData.sensory.proprioception}
                onChange={(e) => updateFormData('sensory.proprioception', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.dermatomesNote')}</FieldLabel>
              <TextArea
                name="dermatomes_note"
                placeholder={t('neurologyReport.dermatomalPattern')}
                value={formData.sensory.dermatomes_note}
                onChange={(e) => updateFormData('sensory.dermatomes_note', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Cerebellar */}
      <Card title={t('neurologyReport.cerebellarGait')} collapsible isOpen={!collapsedSections.cerebellar} onToggle={() => toggleSection('cerebellar')} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.fingerToNose')}</FieldLabel>
              <Input
                name="fnf"
                placeholder={t('neurologyReport.smoothAccurate')}
                value={formData.cerebellar.fnf}
                onChange={(e) => updateFormData('cerebellar.fnf', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.heelToShin')}</FieldLabel>
              <Input
                name="hks"
                placeholder={t('neurologyReport.smoothAccurate')}
                value={formData.cerebellar.hks}
                onChange={(e) => updateFormData('cerebellar.hks', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.diadochokinesis')}</FieldLabel>
              <Input
                name="diadochokinesis"
                placeholder={t('neurologyReport.rapidAlternating')}
                value={formData.cerebellar.diadochokinesis}
                onChange={(e) => updateFormData('cerebellar.diadochokinesis', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.romberg')}</FieldLabel>
              <Select
                name="romberg"
                value={formData.cerebellar.romberg}
                onChange={(e) => updateFormData('cerebellar.romberg', e.target.value)}
                options={[
                  { value: 'positive', label: t('neurologyReport.positive') },
                  { value: 'negative', label: t('neurologyReport.negative') }
                ]}
                darkMode={darkMode}
                selectPlaceholder={t('neurologyReport.select')}
              />
            </div>
          </div>
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.gait')}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              {Object.keys(formData.cerebellar.gait).map(type => {
                const gaitLabels = {
                  normal: t('neurologyReport.normal') || 'Normal',
                  tandem: t('neurologyReport.tandem') || 'Tandem',
                  heels: t('neurologyReport.heels') || 'Heels',
                  toes: t('neurologyReport.toes') || 'Toes'
                };
                return (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.cerebellar.gait[type]}
                    onChange={(e) => updateFormData(`cerebellar.gait.${type}`, e.target.checked)}
                    className={`rounded ${
                      darkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />
                    <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>{gaitLabels[type] || type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </label>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Autonomic */}
      <Card title={t('neurologyReport.autonomicFunction')} collapsible isOpen={!collapsedSections.autonomic} onToggle={() => toggleSection('autonomic')} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.orthostaticBP')}</FieldLabel>
              <Input
                name="orthostasis_bp"
                placeholder={t('neurologyReport.supineStandingBP')}
                value={formData.autonomic.orthostasis_bp}
                onChange={(e) => updateFormData('autonomic.orthostasis_bp', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.bowelBladder')}</FieldLabel>
              <Input
                name="bowel_bladder"
                placeholder={t('neurologyReport.normalIncontinence')}
                value={formData.autonomic.bowel_bladder}
                onChange={(e) => updateFormData('autonomic.bowel_bladder', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.sweating')}</FieldLabel>
              <Input
                name="sweating"
                placeholder={t('neurologyReport.normalAnhidrosis')}
                value={formData.autonomic.sweating}
                onChange={(e) => updateFormData('autonomic.sweating', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Meningeal */}
      <Card title={t('neurologyReport.meningealSigns')} collapsible isOpen={!collapsedSections.meningeal} onToggle={() => toggleSection('meningeal')} darkMode={darkMode}>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.meningeal.nuchal_rigidity}
              onChange={(e) => updateFormData('meningeal.nuchal_rigidity', e.target.checked)}
              className={`rounded ${
                darkMode ? 'border-slate-600' : 'border-slate-300'
              }`}
            />
            <span className={`text-sm ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>{t('neurologyReport.nuchalRigidity')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.meningeal.kernig}
              onChange={(e) => updateFormData('meningeal.kernig', e.target.checked)}
              className={`rounded ${
                darkMode ? 'border-slate-600' : 'border-slate-300'
              }`}
            />
            <span className={`text-sm ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>{t('neurologyReport.kernig')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.meningeal.brudzinski}
              onChange={(e) => updateFormData('meningeal.brudzinski', e.target.checked)}
              className={`rounded ${
                darkMode ? 'border-slate-600' : 'border-slate-300'
              }`}
            />
            <span className={`text-sm ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>{t('neurologyReport.brudzinski')}</span>
          </label>
        </div>
      </Card>

      {/* Pain/Headache */}
      <Card title={t('neurologyReport.painHeadache')} collapsible isOpen={!collapsedSections.painHeadache} onToggle={() => toggleSection('painHeadache')} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.site')}</FieldLabel>
              <Input
                name="site"
                placeholder={t('neurologyReport.frontalTemporal')}
                value={formData.pain_headache.site}
                onChange={(e) => updateFormData('pain_headache.site', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.quality')}</FieldLabel>
              <Input
                name="quality"
                placeholder={t('neurologyReport.throbbingSharp')}
                value={formData.pain_headache.quality}
                onChange={(e) => updateFormData('pain_headache.quality', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.severity')}</FieldLabel>
              <Input
                type="number"
                name="severity_vas"
                placeholder="0-10"
                min="0"
                max="10"
                value={formData.pain_headache.severity_vas}
                onChange={(e) => updateFormData('pain_headache.severity_vas', e.target.value)}
                darkMode={darkMode}
              />
              {errors.vas && <p className="text-red-500 text-sm mt-1">{errors.vas}</p>}
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.triggers')}</FieldLabel>
              <Input
                name="triggers"
                placeholder={t('neurologyReport.lightSoundMovement')}
                value={formData.pain_headache.triggers}
                onChange={(e) => updateFormData('pain_headache.triggers', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.snoopRedFlags')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { value: 'Systemic symptoms', label: t('neurologyReport.systemicSymptoms') },
                { value: 'Neurologic deficit', label: t('neurologyReport.neurologicDeficit') },
                { value: 'Onset after age 50', label: t('neurologyReport.onsetAfterAge50') },
                { value: 'Pattern change', label: t('neurologyReport.patternChange') },
                { value: 'Papilledema', label: t('neurologyReport.papilledema') }
              ].map(flag => (
                <button
                  key={flag.value}
                  type="button"
                  onClick={() => {
                    if (formData.pain_headache.red_flags.includes(flag.value)) {
                      removeFromArray('pain_headache.red_flags', formData.pain_headache.red_flags.indexOf(flag.value));
                    } else {
                      addToArray('pain_headache.red_flags', flag.value);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm border ${
                    formData.pain_headache.red_flags.includes(flag.value)
                      ? darkMode
                        ? 'bg-red-900/50 text-red-300 border-red-600'
                        : 'bg-red-100 text-red-700 border-red-300'
                      : darkMode
                        ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {flag.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.pain_headache.red_flags.map((flag, idx) => {
                const flagLabels = {
                  'Systemic symptoms': t('neurologyReport.systemicSymptoms'),
                  'Neurologic deficit': t('neurologyReport.neurologicDeficit'),
                  'Onset after age 50': t('neurologyReport.onsetAfterAge50'),
                  'Pattern change': t('neurologyReport.patternChange'),
                  'Papilledema': t('neurologyReport.papilledema')
                };
                return (
                <Chip key={idx} onRemove={() => removeFromArray('pain_headache.red_flags', idx)} darkMode={darkMode}>
                    {flagLabels[flag] || flag}
                </Chip>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Seizure */}
      <Card title={t('neurologyReport.seizure')} collapsible isOpen={!collapsedSections.seizure} onToggle={() => toggleSection('seizure')} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.semiology')}</FieldLabel>
            <TextArea
              name="semiology"
              placeholder={t('neurologyReport.auraIctalPhase')}
              value={formData.seizure.semiology}
              onChange={(e) => updateFormData('seizure.semiology', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.frequency')}</FieldLabel>
              <Input
                name="frequency"
                placeholder={t('neurologyReport.dailyWeeklyMonthly')}
                value={formData.seizure.frequency}
                onChange={(e) => updateFormData('seizure.frequency', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.triggers')}</FieldLabel>
              <Input
                name="triggers"
                placeholder={t('neurologyReport.sleepDeprivation')}
                value={formData.seizure.triggers}
                onChange={(e) => updateFormData('seizure.triggers', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.postictal')}</FieldLabel>
              <Input
                name="postictal"
                placeholder={t('neurologyReport.confusionAphasia')}
                value={formData.seizure.postictal}
                onChange={(e) => updateFormData('seizure.postictal', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.adherence')}</FieldLabel>
              <Input
                name="adherence"
                placeholder={t('neurologyReport.goodPoorMissed')}
                value={formData.seizure.adherence}
                onChange={(e) => updateFormData('seizure.adherence', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.antiepilepticDrugs')}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {formData.seizure.aeds.map((aed, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('seizure.aeds', idx)} darkMode={darkMode}>
                  {aed}
                </Chip>
              ))}
            </div>
            <Input
              name="new_aed"
              placeholder={t('neurologyReport.addAED')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  addToArray('seizure.aeds', e.target.value.trim());
                  e.target.value = '';
                }
              }}
              className="mt-2"
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Stroke */}
      <Card 
        title={t('neurologyReport.strokeAssessment')} 
        subtitle={t('neurologyReport.strokeOptional') || 'Stroke cases (optional)'}
        collapsible 
        isOpen={!collapsedSections.stroke} 
        onToggle={() => toggleSection('stroke')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          {isWithinTPAWindow() && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 font-medium">{t('neurologyReport.candidateForIVtPA')}</p>
            </div>
          )}
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.lastKnownWell')}</FieldLabel>
            <Input
              type="datetime-local"
              name="lkw_time"
              value={formData.stroke.lkw_time}
              onChange={(e) => updateFormData('stroke.lkw_time', e.target.value)}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.nihssScore')}</FieldLabel>
            <Card title={t('neurologyReport.nihssItems')} className="mt-2" darkMode={darkMode}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {NIHSS_ITEMS.map(item => {
                  const itemKey = item.replace(/_/g, '').toLowerCase();
                  const itemLabel = t(`neurologyReport.nihss${itemKey}`) || item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  return (
                  <div key={item}>
                    <FieldLabel darkMode={darkMode} className="text-xs">{itemLabel}</FieldLabel>
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
                      darkMode={darkMode}
                    />
                  </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <FieldLabel darkMode={darkMode}>{t('neurologyReport.totalNIHSS')}</FieldLabel>
                <Input
                  name="nihss_total"
                  value={formData.stroke.nihss.total}
                  readOnly
                  className={`font-semibold ${
                    darkMode ? 'bg-slate-700' : 'bg-slate-100'
                  }`}
                  darkMode={darkMode}
                />
                {errors.nihss_total && <p className="text-red-500 text-sm mt-1">{errors.nihss_total}</p>}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.modifiedRankinScalePreStroke')}</FieldLabel>
              <Input
                name="mrs_pre"
                placeholder="0-6"
                value={formData.stroke.mrs_pre}
                onChange={(e) => updateFormData('stroke.mrs_pre', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.modifiedRankinScaleCurrent')}</FieldLabel>
              <Input
                name="mrs_current"
                placeholder="0-6"
                value={formData.stroke.mrs_current}
                onChange={(e) => updateFormData('stroke.mrs_current', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.tpaEligibilityChecklist')}</FieldLabel>
            <div className="space-y-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tpa_eligible"
                    checked={formData.stroke.tpa_checklist.eligible === true}
                    onChange={() => updateFormData('stroke.tpa_checklist.eligible', true)}
                    className={`rounded ${
                      darkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>{t('neurologyReport.eligible')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tpa_eligible"
                    checked={formData.stroke.tpa_checklist.eligible === false}
                    onChange={() => updateFormData('stroke.tpa_checklist.eligible', false)}
                    className={`rounded ${
                      darkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>{t('neurologyReport.notEligible')}</span>
                </label>
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">{t('neurologyReport.contraindications')}</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { value: 'Age >80', label: t('neurologyReport.ageOver80') },
                    { value: 'NIHSS >25', label: t('neurologyReport.nihssOver25') },
                    { value: 'INR >1.7', label: t('neurologyReport.inrOver17') },
                    { value: 'Platelets <100k', label: t('neurologyReport.plateletsUnder100k') },
                    { value: 'Glucose <50 or >400', label: t('neurologyReport.glucoseUnder50OrOver400') },
                    { value: 'SBP >185 or DBP >110', label: t('neurologyReport.sbpOver185OrDbpOver110') },
                    { value: 'Anticoagulant use', label: t('neurologyReport.anticoagulantUse') },
                    { value: 'Recent surgery', label: t('neurologyReport.recentSurgery') },
                    { value: 'GI bleed', label: t('neurologyReport.giBleed') },
                    { value: 'Pregnancy', label: t('neurologyReport.pregnancy') }
                  ].map(contra => (
                    <button
                      key={contra.value}
                      type="button"
                      onClick={() => {
                        const contraList = formData.stroke.tpa_checklist.contraindications;
                        if (contraList.includes(contra.value)) {
                          removeFromArray('stroke.tpa_checklist.contraindications', contraList.indexOf(contra.value));
                        } else {
                          addToArray('stroke.tpa_checklist.contraindications', contra.value);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-sm border ${
                        formData.stroke.tpa_checklist.contraindications.includes(contra.value)
                          ? darkMode
                            ? 'bg-red-900/50 text-red-300 border-red-600'
                            : 'bg-red-100 text-red-700 border-red-300'
                          : darkMode
                            ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {contra.label}
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
                className={`rounded ${
                  darkMode ? 'border-slate-600' : 'border-slate-300'
                }`}
              />
              <span className={`text-sm ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>{t('neurologyReport.considerThrombectomy')}</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Localization Hypothesis */}
      <Card title={t('neurologyReport.localizationHypothesis')} collapsible isOpen={!collapsedSections.localization} onToggle={() => toggleSection('localization')} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.lesionSite')}</FieldLabel>
            <Select
              name="lesion_site"
              value={formData.localization_hypothesis.lesion_site}
              onChange={(e) => updateFormData('localization_hypothesis.lesion_site', e.target.value)}
              options={[
                { value: 'cortex', label: t('neurologyReport.cortex') },
                { value: 'subcortex', label: t('neurologyReport.subcortex') },
                { value: 'brainstem', label: t('neurologyReport.brainstem') },
                { value: 'cerebellum', label: t('neurologyReport.cerebellum') },
                { value: 'spinal', label: t('neurologyReport.spinal') },
                { value: 'peripheral', label: t('neurologyReport.peripheral') },
                { value: 'nmj', label: t('neurologyReport.nmj') },
                { value: 'muscle', label: t('neurologyReport.muscle') }
              ]}
              darkMode={darkMode}
              selectPlaceholder={t('neurologyReport.select')}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.rationale')}</FieldLabel>
            <TextArea
              name="rationale"
              placeholder={t('neurologyReport.explainLocalization')}
              value={formData.localization_hypothesis.rationale}
              onChange={(e) => updateFormData('localization_hypothesis.rationale', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Tests */}
      <Card title={t('neurologyReport.testsDiagnostics')} collapsible isOpen={!collapsedSections.tests} onToggle={() => toggleSection('tests')} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>Imaging Studies</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {IMAGING_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addToArray('tests.imaging', preset)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    darkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + {preset}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {formData.tests.imaging.map((img, idx) => {
                const imagingLabels = {
                  'CT head non-contrast': t('neurologyReport.ctHeadNonContrast'),
                  'CT-angiography': t('neurologyReport.ctAngiography'),
                  'MR DWI/FLAIR': t('neurologyReport.mrDwiFlair'),
                  'MRA head/neck': t('neurologyReport.mraHeadNeck'),
                  'Carotid Doppler': t('neurologyReport.carotidDoppler')
                };
                return (
                <div key={idx} className={`flex items-center justify-between p-2 rounded ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-50'
                }`}>
                  <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>{imagingLabels[img] || img}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('tests.imaging', idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.eeg')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  name="eeg_date"
                  value={formData.tests.eeg.date}
                  onChange={(e) => updateFormData('tests.eeg.date', e.target.value)}
                  darkMode={darkMode}
                />
                <TextArea
                  name="eeg_summary"
                  placeholder={t('neurologyReport.summary')}
                  value={formData.tests.eeg.summary}
                  onChange={(e) => updateFormData('tests.eeg.summary', e.target.value)}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.emgNcs')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  name="emg_ncs_date"
                  value={formData.tests.emg_ncs.date}
                  onChange={(e) => updateFormData('tests.emg_ncs.date', e.target.value)}
                  darkMode={darkMode}
                />
                <TextArea
                  name="emg_ncs_summary"
                  placeholder={t('neurologyReport.summary')}
                  value={formData.tests.emg_ncs.summary}
                  onChange={(e) => updateFormData('tests.emg_ncs.summary', e.target.value)}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.laboratoryTests')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">B12</FieldLabel>
                <Input
                  name="b12"
                  value={formData.tests.labs.b12}
                  onChange={(e) => updateFormData('tests.labs.b12', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">TSH</FieldLabel>
                <Input
                  name="tsh"
                  value={formData.tests.labs.tsh}
                  onChange={(e) => updateFormData('tests.labs.tsh', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">A1C</FieldLabel>
                <Input
                  name="a1c"
                  value={formData.tests.labs.a1c}
                  onChange={(e) => updateFormData('tests.labs.a1c', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">CK</FieldLabel>
                <Input
                  name="ck"
                  value={formData.tests.labs.ck}
                  onChange={(e) => updateFormData('tests.labs.ck', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">ESR/CRP</FieldLabel>
                <Input
                  name="esr_crp"
                  value={formData.tests.labs.esr_crp}
                  onChange={(e) => updateFormData('tests.labs.esr_crp', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div className="mt-2">
              <FieldLabel darkMode={darkMode} className="text-xs">{t('neurologyReport.otherLabs')}</FieldLabel>
              <TextArea
                name="others"
                value={formData.tests.labs.others}
                onChange={(e) => updateFormData('tests.labs.others', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.lumbarPuncture')}</FieldLabel>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.tests.lp.performed}
                  onChange={(e) => updateFormData('tests.lp.performed', e.target.checked)}
                  className={`rounded ${
                    darkMode ? 'border-slate-600' : 'border-slate-300'
                  }`}
                />
                <span className={`text-sm ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>{t('neurologyReport.performed')}</span>
              </label>
              {formData.tests.lp.performed && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pl-6">
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">{t('neurologyReport.openingPressure')}</FieldLabel>
                    <Input
                      name="opening_pressure"
                      value={formData.tests.lp.opening_pressure}
                      onChange={(e) => updateFormData('tests.lp.opening_pressure', e.target.value)}
                      darkMode={darkMode}
                    />
                    {errors.lp_opening_pressure && <p className="text-red-500 text-xs mt-1">{errors.lp_opening_pressure}</p>}
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">{t('neurologyReport.cells')}</FieldLabel>
                    <Input
                      name="cells"
                      value={formData.tests.lp.cells}
                      onChange={(e) => updateFormData('tests.lp.cells', e.target.value)}
                      darkMode={darkMode}
                    />
                    {errors.lp_cells && <p className="text-red-500 text-xs mt-1">{errors.lp_cells}</p>}
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">{t('neurologyReport.protein')}</FieldLabel>
                    <Input
                      name="protein"
                      value={formData.tests.lp.protein}
                      onChange={(e) => updateFormData('tests.lp.protein', e.target.value)}
                      darkMode={darkMode}
                    />
                    {errors.lp_protein && <p className="text-red-500 text-xs mt-1">{errors.lp_protein}</p>}
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">{t('neurologyReport.glucose')}</FieldLabel>
                    <Input
                      name="glucose"
                      value={formData.tests.lp.glucose}
                      onChange={(e) => updateFormData('tests.lp.glucose', e.target.value)}
                      darkMode={darkMode}
                    />
                    {errors.lp_glucose && <p className="text-red-500 text-xs mt-1">{errors.lp_glucose}</p>}
                  </div>
                  <div className="col-span-2">
                    <FieldLabel darkMode={darkMode} className="text-xs">{t('neurologyReport.microbiology')}</FieldLabel>
                    <Input
                      name="microbiology"
                      value={formData.tests.lp.microbiology}
                      onChange={(e) => updateFormData('tests.lp.microbiology', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Diagnosis */}
      <Card title={t('neurologyReport.diagnosis')} collapsible isOpen={!collapsedSections.diagnosis} onToggle={() => toggleSection('diagnosis')} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel required darkMode={darkMode}>{t('neurologyReport.mainDiagnosis')}</FieldLabel>
            <div className="space-y-2">
              {formData.diagnosis.main && typeof formData.diagnosis.main === 'object' && (formData.diagnosis.main.code || formData.diagnosis.main.term) ? (
                <div className="flex gap-2 items-start">
                  <div className="flex gap-2 items-start flex-1">
                    <Input
                      placeholder={t('neurologyReport.icd11Code')}
                      value={formData.diagnosis.main.code || ''}
                      onChange={(e) => {
                        const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                        updateFormData('diagnosis.main', { ...current, code: e.target.value });
                      }}
                      className="w-40"
                      darkMode={darkMode}
                    />
                    <Input
                      placeholder={t('neurologyReport.diagnosisTerm')}
                      value={formData.diagnosis.main.term || ''}
                      onChange={(e) => {
                        const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                        updateFormData('diagnosis.main', { ...current, term: e.target.value });
                      }}
                      className="flex-1"
                      darkMode={darkMode}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateFormData('diagnosis.main', '')}
                    className={`px-3 py-2 rounded transition-colors ${
                      darkMode 
                        ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {t('neurologyReport.clear')}
                  </button>
                </div>
              ) : null}
              <IcdCodeSearchInput
                placeholder={t('neurologyReport.searchIcd11Code')}
                onSelect={(selected) => {
                  updateFormData('diagnosis.main', selected);
                }}
                darkMode={darkMode}
              />
            </div>
            {errors.diagnosis_main && <p className="text-red-500 text-sm mt-1">{errors.diagnosis_main}</p>}
          </div>
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.secondaryDiagnoses')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.secondary.map((diag, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.secondary', idx)} darkMode={darkMode}>
                  {typeof diag === 'object' ? `${diag.code || ''} ${diag.term || ''}`.trim() : diag}
                </Chip>
              ))}
            </div>
            <IcdCodeSearchInput
              placeholder={t('neurologyReport.searchIcd11Code') || 'Search ICD-11 code...'}
              onSelect={(selected) => {
                addToArray('diagnosis.secondary', selected);
              }}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('neurologyReport.diagnosisCodes')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {DIAGNOSIS_CODE_PRESETS.map(preset => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => addToArray('diagnosis.codes', preset)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    darkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + {preset.code}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.codes.map((code, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.codes', idx)} darkMode={darkMode}>
                  {code.system} {code.code}: {code.term}
                </Chip>
              ))}
            </div>
            <IcdCodeSearchInput
              placeholder={t('neurologyReport.searchIcd11CodeToAdd')}
              onSelect={(selected) => {
                addToArray('diagnosis.codes', {
                  system: 'ICD11',
                  code: selected.code,
                  term: selected.term
                });
              }}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Plan & Treatment - Initial Mode Only */}
      {mode === 'initial' && (
        <Card title={t('neurologyReport.planTreatment')} collapsible isOpen={!collapsedSections.plan} onToggle={() => toggleSection('plan')} darkMode={darkMode}>
          <div className="space-y-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.medications')}</FieldLabel>
              <FieldLabel darkMode={darkMode} className="text-xs">({formData.plan.meds.length})</FieldLabel>
              {formData.plan.meds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.plan.meds.map((med, idx) => {
                    const label = `${med.med} ${med.dose} ${med.route} ${med.freq} ${med.duration}`;
                    return (
                      <Chip key={idx} onEdit={() => openMedEditor(med, idx)} onRemove={() => removeMed(idx)} darkMode={darkMode}>
                        {label}
                      </Chip>
                    );
                  })}
                </div>
              )}
              
              {editingMed && (
                <div className={`mt-3 grid grid-cols-12 gap-4 p-4 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="col-span-12">
                    <MedicationSearchInput
                      placeholder={t('neurologyReport.searchMedication')}
                      value={editingMed.med}
                      onChange={(e) => setEditingMed(s => ({ ...s, med: e.target.value }))}
                      onSelect={(selected) => {
                        setEditingMed(s => ({
                          ...s,
                          med: selected.med,
                          dose: selected.strength || s.dose
                        }));
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('neurologyReport.dose')} 
                      value={editingMed.dose} 
                      onChange={(e) => setEditingMed(s => ({...s, dose: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('neurologyReport.route')} 
                      value={editingMed.route} 
                      onChange={(e) => setEditingMed(s => ({...s, route: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('neurologyReport.frequencyLabel')} 
                      value={editingMed.freq} 
                      onChange={(e) => setEditingMed(s => ({...s, freq: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('neurologyReport.duration')} 
                      value={editingMed.duration} 
                      onChange={(e) => setEditingMed(s => ({...s, duration: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <TextArea 
                      placeholder={t('neurologyReport.instructions')} 
                      value={editingMed.instructions} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                      rows={2}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex gap-2">
                    <button type="button" onClick={saveMed} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{t('neurologyReport.save')}</button>
                    <button type="button" onClick={() => { setEditingMed(null); setEditingMedIdx(null); }} className={`px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'border-slate-600 hover:bg-slate-700 text-slate-300' 
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}>{t('neurologyReport.cancel')}</button>
                  </div>
                </div>
              )}
              
              {!editingMed && (
                <button
                  type="button"
                  onClick={() => openMedEditor()}
                  className={`mt-2 px-4 py-2 rounded-lg text-sm ${
                    darkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t('neurologyReport.addMedication')}
                </button>
              )}
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.plannedProcedures')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { value: 'LP', label: t('neurologyReport.lp') },
                  { value: 'EMG/NCS', label: t('neurologyReport.emgNcs') },
                  { value: 'EEG', label: t('neurologyReport.eeg') },
                  { value: 'Carotid Ultrasound', label: t('neurologyReport.carotidUltrasound') },
                  { value: 'Evoked Potentials', label: t('neurologyReport.evokedPotentials') },
                  { value: 'Other', label: t('neurologyReport.other') }
                ].map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => addToArray('plan.procedures_planned', preset.value)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.procedures_planned.map((proc, idx) => {
                  const procLabels = {
                    'LP': t('neurologyReport.lp'),
                    'EMG/NCS': t('neurologyReport.emgNcs'),
                    'EEG': t('neurologyReport.eeg'),
                    'Carotid Ultrasound': t('neurologyReport.carotidUltrasound'),
                    'Evoked Potentials': t('neurologyReport.evokedPotentials'),
                    'Other': t('neurologyReport.other')
                  };
                  return (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.procedures_planned', idx)} darkMode={darkMode}>
                      {procLabels[proc] || proc}
                  </Chip>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.counseling')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { value: 'Medication compliance', label: t('neurologyReport.medicationCompliance') },
                  { value: 'Side-effects explained', label: t('neurologyReport.sideEffectsExplained') },
                  { value: 'Driving restrictions', label: t('neurologyReport.drivingRestrictions') },
                  { value: 'Seizure precautions', label: t('neurologyReport.seizurePrecautions') },
                  { value: 'Fall prevention', label: t('neurologyReport.fallPrevention') },
                  { value: 'Return precautions', label: t('neurologyReport.returnPrecautions') }
                ].map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => addToArray('plan.counseling', preset.value)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.counseling.map((counsel, idx) => {
                  const counselLabels = {
                    'Medication compliance': t('neurologyReport.medicationCompliance'),
                    'Side-effects explained': t('neurologyReport.sideEffectsExplained'),
                    'Driving restrictions': t('neurologyReport.drivingRestrictions'),
                    'Seizure precautions': t('neurologyReport.seizurePrecautions'),
                    'Fall prevention': t('neurologyReport.fallPrevention'),
                    'Return precautions': t('neurologyReport.returnPrecautions')
                  };
                  return (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.counseling', idx)} darkMode={darkMode}>
                      {counselLabels[counsel] || counsel}
                  </Chip>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.rehabReferrals')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { value: 'Physical Therapy', label: t('neurologyReport.physicalTherapy') },
                  { value: 'Occupational Therapy', label: t('neurologyReport.occupationalTherapy') },
                  { value: 'Speech Therapy', label: t('neurologyReport.speechTherapy') },
                  { value: 'Neuropsychology', label: t('neurologyReport.neuropsychology') },
                  { value: 'Cognitive Rehabilitation', label: t('neurologyReport.cognitiveRehabilitation') }
                ].map(ref => (
                  <button
                    key={ref.value}
                    type="button"
                    onClick={() => addToArray('plan.rehab_referrals', ref.value)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + {ref.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.rehab_referrals.map((ref, idx) => {
                  const refLabels = {
                    'Physical Therapy': t('neurologyReport.physicalTherapy'),
                    'Occupational Therapy': t('neurologyReport.occupationalTherapy'),
                    'Speech Therapy': t('neurologyReport.speechTherapy'),
                    'Neuropsychology': t('neurologyReport.neuropsychology'),
                    'Cognitive Rehabilitation': t('neurologyReport.cognitiveRehabilitation')
                  };
                  return (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.rehab_referrals', idx)} darkMode={darkMode}>
                      {refLabels[ref] || ref}
                  </Chip>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.safety') || 'Safety'}</FieldLabel>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.plan.safety.falls}
                    onChange={(e) => updateFormData('plan.safety.falls', e.target.checked)}
                    className={`rounded ${
                      darkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>{t('neurologyReport.fallsRisk') || 'Falls Risk'}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.plan.safety.driving_restriction}
                    onChange={(e) => updateFormData('plan.safety.driving_restriction', e.target.checked)}
                    className={`rounded ${
                      darkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>{t('neurologyReport.drivingRestriction')}</span>
                </label>
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('neurologyReport.followUp')}</FieldLabel>
              <Select
                name="follow_up"
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={[
                  { value: '24h', label: t('neurologyReport.hours24') },
                  { value: '3d', label: t('neurologyReport.days3') },
                  { value: '1w', label: t('neurologyReport.week1') },
                  { value: '1m', label: t('neurologyReport.month1') },
                  { value: 'date', label: t('neurologyReport.specificDate') },
                  { value: 'prn', label: t('neurologyReport.prn') }
                ]}
                darkMode={darkMode}
                selectPlaceholder={t('neurologyReport.select')}
              />
              {formData.plan.follow_up === 'date' && (
                <div className="mt-2">
                  <Input
                    type="date"
                    name="follow_up_date"
                    value={formData.plan.follow_up_date}
                    onChange={(e) => updateFormData('plan.follow_up_date', e.target.value)}
                    darkMode={darkMode}
                  />
                  {errors.follow_up_date && <p className="text-red-500 text-sm mt-1">{errors.follow_up_date}</p>}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Procedures Done */}
      <Card title={t('neurologyReport.proceduresDone')} collapsible isOpen={!collapsedSections.procedures} onToggle={() => toggleSection('procedures')} counter={formData.procedures_done.length} darkMode={darkMode}>
        <div className="space-y-4">
          {formData.procedures_done.length > 0 && (
            <div className="space-y-2">
              {formData.procedures_done.map((proc, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-medium ${
                        darkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>{proc.name} - {proc.date}</p>
                      {proc.side && <p className={`text-sm ${
                        darkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>Side: {proc.side}</p>}
                      {proc.technique && <p className={`text-sm ${
                        darkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>Technique: {proc.technique}</p>}
                      {proc.findings && <p className={`text-sm ${
                        darkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>Findings: {proc.findings}</p>}
                      {proc.complications && <p className="text-sm text-red-600">Complications: {proc.complications}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openProcedureEditor(proc, idx)} className={`${
                        darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
                      }`}>✎</button>
                      <button type="button" onClick={() => removeProcedure(idx)} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {editingProcedure && (
            <div className={`grid grid-cols-12 gap-4 p-4 rounded-lg border ${
              darkMode 
                ? 'bg-slate-800 border-slate-700' 
                : 'bg-white border-slate-200'
            }`}>
              <div className="col-span-12">
                <Input 
                  placeholder="Procedure name" 
                  value={editingProcedure.name} 
                  onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  type="date"
                  placeholder="Date" 
                  value={editingProcedure.date} 
                  onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  placeholder="Side (R/L/Both)" 
                  value={editingProcedure.side} 
                  onChange={(e) => setEditingProcedure(s => ({...s, side: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  placeholder="Anesthesia" 
                  value={editingProcedure.anesthesia} 
                  onChange={(e) => setEditingProcedure(s => ({...s, anesthesia: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Technique" 
                  value={editingProcedure.technique} 
                  onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Findings" 
                  value={editingProcedure.findings} 
                  onChange={(e) => setEditingProcedure(s => ({...s, findings: e.target.value}))}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <Select 
                  name="result" 
                  value={editingProcedure.result} 
                  onChange={(e) => setEditingProcedure(s => ({...s, result: e.target.value}))}
                  options={[
                    {value:'successful',label:t('neurologyReport.successful')},
                    {value:'partial',label:t('neurologyReport.partial')},
                    {value:'failed',label:t('neurologyReport.failed')}
                  ]} 
                  darkMode={darkMode}
                  selectPlaceholder={t('neurologyReport.select')}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Complications" 
                  value={editingProcedure.complications} 
                  onChange={(e) => setEditingProcedure(s => ({...s, complications: e.target.value}))}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 flex gap-2">
                <button type="button" onClick={saveProcedure} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Save</button>
                <button type="button" onClick={() => { setEditingProcedure(null); setEditingProcedureIdx(null); }} className={`px-4 py-2 border rounded-lg ${
                  darkMode 
                    ? 'border-slate-600 hover:bg-slate-700 text-slate-300' 
                    : 'border-slate-300 hover:bg-slate-50'
                }`}>Cancel</button>
              </div>
            </div>
          )}
          
          {!editingProcedure && (
            <button
              type="button"
              onClick={() => openProcedureEditor()}
              className={`px-4 py-2 rounded-lg text-sm ${
                darkMode 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              + Add Procedure
            </button>
          )}
        </div>
      </Card>

      {/* Outcome & Recommendations - Discharge Mode Only */}
      {mode === 'discharge' && (
        <Card title={t('neurologyReport.outcomeRecommendations')} collapsible isOpen={!collapsedSections.outcome} onToggle={() => toggleSection('outcome')} darkMode={darkMode}>
          <div className="space-y-4">
            <div>
              <FieldLabel darkMode={darkMode}>Condition at Discharge</FieldLabel>
              <Input
                name="condition"
                placeholder="Stable, improved, unchanged..."
                value={formData.outcome.condition}
                onChange={(e) => updateFormData('outcome.condition', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>Hospital Course</FieldLabel>
              <TextArea
                name="course"
                placeholder="Summarize hospital stay, treatments, response..."
                value={formData.outcome.course}
                onChange={(e) => updateFormData('outcome.course', e.target.value)}
                rows={4}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel required darkMode={darkMode}>Recommendations</FieldLabel>
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
                      darkMode={darkMode}
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
                  className={`px-3 py-2 border rounded-lg text-sm ${
                    darkMode 
                      ? 'border-slate-600 hover:bg-slate-700 text-slate-300' 
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
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
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
            darkMode 
              ? 'border-slate-600' 
              : 'border-slate-300'
          }`}>
            <p className={`mb-2 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Drop files here or click to upload</p>
            <p className={`text-xs mb-2 ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>Include imaging reports, EEG tracings, etc.</p>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg ${
                darkMode 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Choose Files
            </button>
          </div>
          
          <div className="space-y-2">
            {formData.attachments.map((attachment, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${
                darkMode ? 'bg-slate-700' : 'bg-slate-50'
              }`}>
                <span className={`text-sm ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>{attachment.label || attachment.id}</span>
                <span className={`text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>{attachment.type}</span>
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
      <div className={`sticky bottom-0 border-t p-4 shadow-lg ${
        darkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border rounded-lg ${
                darkMode 
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className={`px-4 py-2 border rounded-lg ${
                darkMode 
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
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