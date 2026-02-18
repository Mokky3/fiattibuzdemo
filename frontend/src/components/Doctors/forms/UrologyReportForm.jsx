import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsAPI, icdCodesAPI, doctorPatientsAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from other report forms)
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
    onChange={onChange || (readOnly ? undefined : () => {})}
    readOnly={readOnly}
    required={required}
    className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
      darkMode 
        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
        : 'text-slate-600 border-slate-200 bg-white'
    } ${className}`}
  />
));

const Select = React.memo(({ name, value, onChange, options, className = "", required = false, darkMode = false }) => (
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
    <option value="" className={darkMode ? 'bg-slate-800' : ''}>Select...</option>
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
          className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            darkMode 
              ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
              : 'bg-white border-slate-200 text-slate-600'
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
                    ? 'bg-slate-700' 
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
                <div className={`text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
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
// Preset keys for translation
const CHIEF_COMPLAINT_PRESETS = ['frequentUrination', 'dysuria', 'hematuria', 'flankPain', 'incontinence', 'ed', 'scrotalPain', 'infertility'];
const LUTS_PRESETS = ['frequency', 'nocturia', 'urgency', 'weakStream', 'straining', 'intermittency', 'incompleteEmptying'];
const INCONTINENCE_TYPES = ['stress', 'urge', 'mixed', 'nocturnal', 'postoperative'];
const IMAGING_PRESETS = ['usKub', 'trus', 'ctKub', 'ctUrogram', 'mriProstate', 'cystoscopy'];
const PROCEDURE_PRESETS = ['cystoscopyProc', 'trusBiopsy', 'urs', 'eswl', 'pcnl', 'stent', 'nephrostomy', 'turpHolep', 'sling'];
const COUNSELING_PRESETS = ['hydration', 'stoneDiet', 'antibioticStewardship', 'limitCaffeine', 'pelvicPhysiotherapy', 'weightLoss'];
const REFERRAL_PRESETS = ['nephrology', 'oncology', 'andrology', 'physiotherapy'];
const ONSET_TYPES = ['acute', 'subacute', 'chronic'];
const COURSE_TYPES = ['stable', 'progressive', 'intermittent'];
const HEMATURIA_TYPES = ['none', 'microscopic', 'gross'];
const CVAT_TYPES = ['absent', 'unilateral', 'bilateral'];
const BLADDER_DISTENSION_TYPES = ['none', 'mild', 'moderate', 'severe'];
const INCONTINENCE_TYPE_OPTIONS = ['stress', 'urge', 'mixed', 'none'];
const LIBIDO_TYPES = ['normal', 'low'];
const FOLLOW_UP_OPTIONS = ['48h', '1w', '1m', '3m', 'PRN', 'date'];

// StructuredClone fallback
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const UrologyReportForm = ({ patient, encounter, onSave }) => {
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
  // Core sections (open by default): hpi, vitals, exam, labs, diagnosis, plan
  // Advanced sections (collapsed by default): scores, sexual function, hormones, POP-Q, functional, procedures, outcome, attachments
  const [collapsedSections, setCollapsedSections] = useState({
    meta: false,
    scores: true, // Advanced - collapsed
    hpi: false, // Core - open
    vitals: true, // Core - collapsed by default, auto-filled from backend
    exam: false, // Core - open
    functional: true, // Advanced - collapsed
    labs: false, // Core - open
    diagnosis: false, // Core - open
    plan: false, // Core - open
    procedures: true, // Advanced - collapsed
    outcome: true, // Advanced - collapsed (discharge mode only)
    attachments: true // Advanced - collapsed
  });

  // Form data state
  const [formData, setFormData] = useState({
    doc_type: 'uro.initial',
    meta: {
      clinic_id: '',
      department_id: 'urology',
      physician_id: '',
      patient_id: '',
      encounter_id: '',
      datetime: new Date().toISOString()
    },
    chief_complaint: '',
    scores: {
      ipss: { q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', total: '' },
      qol: '',
      iief5: { q1: '', q2: '', q3: '', q4: '', q5: '', total: '' },
      iciq_ui_sf: { q1: '', q2: '', q3: '', total: '' }
    },
    hpi: {
      onset: '',
      duration: '',
      course: '',
      triggers: '',
      associated_symptoms: [],
      pain_site: '',
      pain_severity_vas: '',
      luts: {
        frequency: false,
        nocturia: false,
        urgency: false,
        weak_stream: false,
        straining: false,
        intermittency: false,
        incomplete_emptying: false
      },
      hematuria: 'none',
      dysuria: false,
      incontinence_types: [],
      sexual: {
        ed: false,
        iief5_total: '',
        libido: 'normal',
        ejaculation_issues: '',
        infertility: false
      },
      // Acute urinary retention & catheters
      retention: {
        had_acute_retention: false,
        retention_episodes_count: '',
        current_catheter: false,
        catheter_type: '',
        catheter_size_fr: '',
        catheter_inserted_date: ''
      },
      // Stone disease (urolithiasis)
      stones: {
        history_of_stones: false,
        stone_location: '',
        stone_side: '',
        stone_size_mm: '',
        hydronephrosis_grade: '',
        previous_stone_procedures: []
      },
      // TB and endemic infections
      infections: {
        tb_history: false,
        tb_contact: false,
        gu_tb_suspected: false,
        std_history: ''
      },
      // Performance status
      performance_status: {
        ecog_karnofsky: '',
        weight_loss_recent: false,
        weight_loss_kg: ''
      },
      meds: '',
      allergies: '',
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
      height_cm: patient?.height_cm?.toString() || '',
      weight_kg: patient?.weight_kg?.toString() || '',
      bmi: ''
    },
    exam: {
      abdomen: '',
      cVAT: 'absent',
      bladder_distension: 'none',
      male_genital: '',
      female_genital: '',
      dre: {
        tone: '',
        prostate_size: '',
        nodules: false,
        tenderness: false,
        comments: ''
      },
      pop_q: ''
    },
    functional: {
      pvr_ml: '',
      uroflow: {
        qmax_ml_s: '',
        qavg_ml_s: '',
        voided_vol_ml: '',
        void_time_s: '',
        curve_notes: ''
      },
      incontinence: {
        type: 'none',
        pad_test_g: ''
      }
    },
    labs_imaging: {
      urinalysis: {
        blood: '',
        protein: '',
        nitrite: '',
        leuk_esterase: '',
        rbc_hpf: '',
        wbc_hpf: ''
      },
      urine_culture: {
        date: '',
        cfu: '',
        organism: '',
        sensitivities: '',
        antibiotics_started: ''
      },
      renal_panel: {
        bun: '',
        creatinine: '',
        eGFR: ''
      },
      // Basic blood tests (CBC, inflammatory markers, glucose)
      blood_tests: {
        hb: '',
        wbc: '',
        plt: '',
        esr: '',
        crp: '',
        glucose: ''
      },
      psa: {
        total_ng_ml: '',
        free_ng_ml: '',
        ratio: '',
        date: '',
        pre_DRE: true
      },
      hormones: {
        testosterone_total: '',
        prolactin: '',
        lh: '',
        fsh: ''
      },
      semen_analysis: {
        volume_ml: '',
        count_million_ml: '',
        motility_pct: '',
        morphology_pct: '',
        date: ''
      },
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
      procedures_planned: [],
      counseling: [],
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
  
  // Diagnosis code input state
  const [newCode, setNewCode] = useState({ system: '', code: '', term: '' });

  // Initialize form data
  useEffect(() => {
    if (patient && encounter) {
      setFormData(prev => ({
        ...prev,
        meta: {
          clinic_id: encounter.clinic_id || 'clinic-001',
          department_id: 'urology',
          physician_id: encounter.doctor_id || 'doctor-001',
          patient_id: patient.patient_id || 'patient-001',
          encounter_id: encounter.id || 'encounter-001',
          datetime: encounter.datetime || new Date().toISOString()
        },
        vitals: {
          ...prev.vitals,
          height_cm: patient.height_cm?.toString() || prev.vitals.height_cm,
          weight_kg: patient.weight_kg?.toString() || prev.vitals.weight_kg
        }
      }));
    }
  }, [patient, encounter]);

  // Fetch vitals from backend (latest within 3 days)
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
            // Only update if we have new vitals data
            if (latestVitals.systolic_bp || latestVitals.heart_rate || latestVitals.temperature || latestVitals.oxygen_saturation) {
              setFormData(prev => {
                // Map backend vitals structure to urology form structure
                const mappedVitals = {
                  bp: latestVitals.systolic_bp && latestVitals.diastolic_bp 
                    ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` 
                    : prev.vitals.bp || '',
                  hr: latestVitals.heart_rate?.toString() || prev.vitals.hr || '',
                  temp: latestVitals.temperature?.toString() || prev.vitals.temp || '',
                  spo2: latestVitals.oxygen_saturation?.toString() || prev.vitals.spo2 || '',
                  height_cm: prev.vitals.height_cm || patient?.height_cm?.toString() || '',
                  weight_kg: prev.vitals.weight_kg || patient?.weight_kg?.toString() || '',
                  bmi: prev.vitals.bmi || ''
                };
                
                return {
                  ...prev,
                  vitals: mappedVitals
                };
              });
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
  }, [patient?.patient_id, patient?.id, encounter?.patient_id]);

  // Helper functions - define before useEffects that use them
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

  // Calculate BMI
  useEffect(() => {
    const height_m = parseFloat(formData.vitals.height_cm) / 100;
    const weight_kg = parseFloat(formData.vitals.weight_kg);
    if (height_m > 0 && weight_kg > 0) {
      const bmi = (weight_kg / (height_m * height_m)).toFixed(1);
      if (formData.vitals.bmi !== bmi) {
        updateFormData('vitals.bmi', bmi);
      }
    }
  }, [formData.vitals.height_cm, formData.vitals.weight_kg, updateFormData]);

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'uro.discharge' : 'uro.initial'
    }));
  }, [mode]);

  // Calculate IPSS total
  useEffect(() => {
    const total = Object.values(formData.scores.ipss)
      .slice(0, 7)
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (formData.scores.ipss.total !== total.toString()) {
      updateFormData('scores.ipss.total', total.toString());
    }
  }, [formData.scores.ipss.q1, formData.scores.ipss.q2, formData.scores.ipss.q3, formData.scores.ipss.q4, formData.scores.ipss.q5, formData.scores.ipss.q6, formData.scores.ipss.q7, formData.scores.ipss.total, updateFormData]);

  // Calculate IIEF-5 total
  useEffect(() => {
    const total = Object.values(formData.scores.iief5)
      .slice(0, 5)
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (formData.scores.iief5.total !== total.toString()) {
      updateFormData('scores.iief5.total', total.toString());
    }
  }, [formData.scores.iief5.q1, formData.scores.iief5.q2, formData.scores.iief5.q3, formData.scores.iief5.q4, formData.scores.iief5.q5, formData.scores.iief5.total, updateFormData]);

  // Calculate ICIQ-UI-SF total
  useEffect(() => {
    const total = Object.values(formData.scores.iciq_ui_sf)
      .slice(0, 3)
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (formData.scores.iciq_ui_sf.total !== total.toString()) {
      updateFormData('scores.iciq_ui_sf.total', total.toString());
    }
  }, [formData.scores.iciq_ui_sf.q1, formData.scores.iciq_ui_sf.q2, formData.scores.iciq_ui_sf.q3, formData.scores.iciq_ui_sf.total, updateFormData]);

  // Calculate PSA ratio
  useEffect(() => {
    const total = parseFloat(formData.labs_imaging.psa.total_ng_ml);
    const free = parseFloat(formData.labs_imaging.psa.free_ng_ml);
    if (total > 0 && free > 0) {
      const ratio = (free / total).toFixed(3);
      if (formData.labs_imaging.psa.ratio !== ratio) {
        updateFormData('labs_imaging.psa.ratio', ratio);
      }
    }
  }, [formData.labs_imaging.psa.total_ng_ml, formData.labs_imaging.psa.free_ng_ml, formData.labs_imaging.psa.ratio, updateFormData]);

  // Smart editor helpers
  const openMedEditor = useCallback((preset = {}, idx = null) => {
    setEditingMed({
      med: preset.med || '',
      conc_strength: preset.conc_strength || '',
      route: preset.route || 'oral',
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
      side: preset.side || 'NA',
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

    // Score validations
    const ipssTotal = parseInt(formData.scores.ipss.total) || 0;
    if (formData.scores.ipss.total && (ipssTotal < 0 || ipssTotal > 35)) {
      newErrors.ipss_total = 'IPSS total must be 0-35';
    }

    const qol = parseInt(formData.scores.qol) || 0;
    if (formData.scores.qol && (qol < 0 || qol > 6)) {
      newErrors.qol = 'QoL score must be 0-6';
    }

    const iief5Total = parseInt(formData.scores.iief5.total) || 0;
    if (formData.scores.iief5.total && (iief5Total < 5 || iief5Total > 25)) {
      newErrors.iief5_total = 'IIEF-5 total must be 5-25';
    }

    const iciqTotal = parseInt(formData.scores.iciq_ui_sf.total) || 0;
    if (formData.scores.iciq_ui_sf.total && (iciqTotal < 0 || iciqTotal > 16)) {
      newErrors.iciq_total = 'ICIQ-UI-SF total must be 0-16';
    }

    // PSA validation
    if (formData.labs_imaging.psa.total_ng_ml || formData.labs_imaging.psa.free_ng_ml) {
      if (!formData.labs_imaging.psa.date) {
        newErrors.psa_date = 'PSA date is required when PSA values are provided';
      }
      if (!formData.labs_imaging.psa.total_ng_ml || parseFloat(formData.labs_imaging.psa.total_ng_ml) < 0) {
        newErrors.psa_total = 'PSA total is required and must be >= 0';
      }
    }

    // Urine culture validation
    if (formData.labs_imaging.urine_culture.cfu) {
      if (!formData.labs_imaging.urine_culture.date) {
        newErrors.urine_culture_date = 'Culture date is required when CFU is provided';
      }
      if (!formData.labs_imaging.urine_culture.organism) {
        newErrors.urine_culture_organism = 'Organism is required when CFU is provided';
      }
    }

    // Uroflow/PVR validation
    const pvr = parseFloat(formData.functional.pvr_ml);
    if (formData.functional.pvr_ml && pvr < 0) {
      newErrors.pvr = 'PVR must be >= 0';
    }

    const qmax = parseFloat(formData.functional.uroflow.qmax_ml_s);
    if (formData.functional.uroflow.qmax_ml_s && qmax < 0) {
      newErrors.qmax = 'Qmax must be >= 0';
    }

    // Procedures validation
    formData.procedures_done.forEach((proc, idx) => {
      if (!proc.name?.trim()) {
        newErrors[`procedure_${idx}_name`] = 'Procedure name is required';
      }
      if (!proc.date?.trim()) {
        newErrors[`procedure_${idx}_date`] = 'Procedure date is required';
      }
    });

    // Follow-up date validation
    if (formData.plan.follow_up === 'date' && !formData.plan.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required when "date" is selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  // Build payload
  const buildPayload = useCallback(() => {
    const payload = {
      doc_type: mode === 'discharge' ? 'uro.discharge' : 'uro.initial',
      meta: formData.meta,
      chief_complaint: formData.chief_complaint,
      scores: formData.scores,
      hpi: formData.hpi,
      vitals: formData.vitals,
      exam: formData.exam,
      functional: formData.functional,
      labs_imaging: formData.labs_imaging,
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
      <Card title={t('urologyReport.title') || 'Urology Report'} className="mb-6" darkMode={darkMode}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.mode')}</FieldLabel>
            <Select
              name="mode"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
              options={[
                { value: 'initial', label: t('urologyReport.initialAssessment') },
                { value: 'discharge', label: t('urologyReport.dischargeSummary') }
              ]}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Chief Complaint */}
      <Card title={t('urologyReport.chiefComplaint') || 'Chief Complaint'} darkMode={darkMode}>
        <div className="space-y-4">
          <div>
            <FieldLabel required darkMode={darkMode}>{t('urologyReport.chiefComplaint')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {CHIEF_COMPLAINT_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (formData.chief_complaint === preset) {
                      updateFormData('chief_complaint', '');
                    } else {
                      updateFormData('chief_complaint', preset);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    formData.chief_complaint === preset
                      ? darkMode
                        ? 'bg-emerald-700 text-emerald-200 border border-emerald-600'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : darkMode
                        ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t(`urologyReport.${preset}`)}
                </button>
              ))}
            </div>
            <Input
              name="chief_complaint"
              placeholder={t('urologyReport.chiefComplaintPlaceholder')}
              value={formData.chief_complaint}
              onChange={(e) => updateFormData('chief_complaint', e.target.value)}
              darkMode={darkMode}
              required
            />
            {errors.chief_complaint && (
              <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Scores */}
      <Card 
        title={t('urologyReport.symptomScores') || 'Symptom Scores'} 
        subtitle={t('urologyReport.advancedOptional') || 'Advanced (optional)'}
        collapsible 
        isOpen={!collapsedSections.scores} 
        onToggle={() => toggleSection('scores')}
        darkMode={darkMode}
      >
        <div className="space-y-6">
          {/* IPSS */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.ipss')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'].map((q, idx) => (
                <div key={q}>
                  <FieldLabel className="text-xs" darkMode={darkMode}>Q{idx + 1}</FieldLabel>
                  <Select
                    darkMode={darkMode}
                    name={`ipss_${q}`}
                    value={formData.scores.ipss[q]}
                    onChange={(e) => updateFormData(`scores.ipss.${q}`, e.target.value)}
                    options={[0, 1, 2, 3, 4, 5].map(n => ({ value: n.toString(), label: n.toString() }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.totalIPSS')}</FieldLabel>
              <Input
                darkMode={darkMode}
                name="ipss_total"
                value={formData.scores.ipss.total}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'} font-semibold ${darkMode ? 'text-slate-200' : ''}`}
              />
              {errors.ipss_total && <p className="text-red-500 text-sm mt-1">{errors.ipss_total}</p>}
            </div>
          </div>

          {/* QoL */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.ipssQol')}</FieldLabel>
            <Select
              darkMode={darkMode}
              name="qol"
              value={formData.scores.qol}
              onChange={(e) => updateFormData('scores.qol', e.target.value)}
              options={[0, 1, 2, 3, 4, 5, 6].map(n => ({ value: n.toString(), label: n.toString() }))}
            />
            {errors.qol && <p className="text-red-500 text-sm mt-1">{errors.qol}</p>}
          </div>

          {/* IIEF-5 */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.iief5')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['q1', 'q2', 'q3', 'q4', 'q5'].map((q, idx) => (
                <div key={q}>
                  <FieldLabel className="text-xs" darkMode={darkMode}>Q{idx + 1}</FieldLabel>
                  <Select
                    darkMode={darkMode}
                    name={`iief5_${q}`}
                    value={formData.scores.iief5[q]}
                    onChange={(e) => updateFormData(`scores.iief5.${q}`, e.target.value)}
                    options={[1, 2, 3, 4, 5].map(n => ({ value: n.toString(), label: n.toString() }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.totalIIEF5')}</FieldLabel>
              <Input
                darkMode={darkMode}
                name="iief5_total"
                value={formData.scores.iief5.total}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'} font-semibold ${darkMode ? 'text-slate-200' : ''}`}
              />
              {errors.iief5_total && <p className="text-red-500 text-sm mt-1">{errors.iief5_total}</p>}
            </div>
          </div>

          {/* ICIQ-UI-SF */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.iciqUISF')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['q1', 'q2', 'q3'].map((q, idx) => (
                <div key={q}>
                  <FieldLabel className="text-xs" darkMode={darkMode}>Q{idx + 1}</FieldLabel>
                  <Input
                    type="number"
                    name={`iciq_${q}`}
                    min="0"
                    max={q === 'q1' ? '4' : '6'}
                    value={formData.scores.iciq_ui_sf[q]}
                    onChange={(e) => updateFormData(`scores.iciq_ui_sf.${q}`, e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.totalICIQ')}</FieldLabel>
              <Input
                darkMode={darkMode}
                name="iciq_total"
                value={formData.scores.iciq_ui_sf.total}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'} font-semibold ${darkMode ? 'text-slate-200' : ''}`}
              />
              {errors.iciq_total && <p className="text-red-500 text-sm mt-1">{errors.iciq_total}</p>}
            </div>
          </div>
        </div>
      </Card>

      {/* HPI */}
      <Card 
        title={t('urologyReport.historyOfPresentIllness') || 'History of Present Illness (HPI)'} 
        collapsible 
        isOpen={!collapsedSections.hpi} 
        onToggle={() => toggleSection('hpi')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.onset')}</FieldLabel>
              <Select
                darkMode={darkMode}
                name="onset"
                value={formData.hpi.onset}
                onChange={(e) => updateFormData('hpi.onset', e.target.value)}
                options={ONSET_TYPES.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.duration')}</FieldLabel>
              <Input
                darkMode={darkMode}
                name="duration"
                placeholder={t('urologyReport.durationPlaceholder')}
                value={formData.hpi.duration}
                onChange={(e) => updateFormData('hpi.duration', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.course')}</FieldLabel>
              <Select
                darkMode={darkMode}
                name="course"
                value={formData.hpi.course}
                onChange={(e) => updateFormData('hpi.course', e.target.value)}
                options={COURSE_TYPES.map(c => ({ 
                  value: c, 
                  label: c === 'stable' ? t('urologyReport.stable') : 
                         c === 'progressive' ? t('urologyReport.progressive') : 
                         c === 'intermittent' ? t('urologyReport.intermittent') : 
                         c.charAt(0).toUpperCase() + c.slice(1) 
                }))}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.triggers')}</FieldLabel>
            <Input
              darkMode={darkMode}
              name="triggers"
              placeholder={t('urologyReport.triggersPlaceholder')}
              value={formData.hpi.triggers}
              onChange={(e) => updateFormData('hpi.triggers', e.target.value)}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.luts')}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {LUTS_PRESETS.map(luts => {
                const key = luts === 'frequency' ? 'frequency' :
                           luts === 'nocturia' ? 'nocturia' :
                           luts === 'urgency' ? 'urgency' :
                           luts === 'weakStream' ? 'weak_stream' :
                           luts === 'straining' ? 'straining' :
                           luts === 'intermittency' ? 'intermittency' :
                           'incomplete_emptying';
                return (
                  <label key={luts} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    darkMode ? 'bg-slate-700' : 'bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.hpi.luts[key]}
                      onChange={(e) => updateFormData(`hpi.luts.${key}`, e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className={`text-sm ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>{t(`urologyReport.${luts}`)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.hematuria')}</FieldLabel>
              <Select
                name="hematuria"
                value={formData.hpi.hematuria}
                onChange={(e) => updateFormData('hpi.hematuria', e.target.value)}
                options={HEMATURIA_TYPES.map(h => ({ 
                  value: h, 
                  label: h === 'none' ? t('urologyReport.none') : 
                         h === 'microscopic' ? t('urologyReport.microscopic') : 
                         h === 'gross' ? t('urologyReport.gross') : 
                         h.charAt(0).toUpperCase() + h.slice(1) 
                }))}
                darkMode={darkMode}
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.dysuria}
                  onChange={(e) => updateFormData('hpi.dysuria', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className={`text-sm ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>{t('urologyReport.dysuria')}</span>
              </label>
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.incontinenceTypes')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {INCONTINENCE_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (formData.hpi.incontinence_types.includes(type)) {
                      removeFromArray('hpi.incontinence_types', formData.hpi.incontinence_types.indexOf(type));
                    } else {
                      addToArray('hpi.incontinence_types', type);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    formData.hpi.incontinence_types.includes(type)
                      ? darkMode
                        ? 'bg-emerald-700 text-emerald-200 border border-emerald-600'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : darkMode
                        ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t(`urologyReport.incontinence${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.hpi.incontinence_types.map((type, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('hpi.incontinence_types', idx)} darkMode={darkMode}>
                  {INCONTINENCE_TYPES.includes(type) ? t(`urologyReport.incontinence${type.charAt(0).toUpperCase() + type.slice(1)}`) : type}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.painSite')}</FieldLabel>
              <Input
                name="pain_site"
                placeholder={t('urologyReport.painSitePlaceholder')}
                value={formData.hpi.pain_site}
                onChange={(e) => updateFormData('hpi.pain_site', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.painSeverity')}</FieldLabel>
              <Input
                type="number"
                name="pain_severity_vas"
                min="0"
                max="10"
                placeholder={t('urologyReport.painSeverityPlaceholder')}
                value={formData.hpi.pain_severity_vas}
                onChange={(e) => updateFormData('hpi.pain_severity_vas', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.associatedSymptoms')}</FieldLabel>
            <Input
              name="associated_symptoms"
              placeholder={t('urologyReport.associatedSymptomsPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  addToArray('hpi.associated_symptoms', e.target.value.trim());
                  e.target.value = '';
                }
              }}
              darkMode={darkMode}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.hpi.associated_symptoms.map((symptom, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('hpi.associated_symptoms', idx)} darkMode={darkMode}>
                  {symptom}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.sexualFunction')}</FieldLabel>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.sexual.ed}
                  onChange={(e) => updateFormData('hpi.sexual.ed', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('urologyReport.erectileDysfunction')}</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.libido')}</FieldLabel>
                  <Select
                    name="libido"
                    value={formData.hpi.sexual.libido}
                    onChange={(e) => updateFormData('hpi.sexual.libido', e.target.value)}
                    options={LIBIDO_TYPES.map(l => ({ 
                      value: l, 
                      label: l === 'normal' ? t('urologyReport.normal') : 
                             l === 'low' ? t('urologyReport.low') : 
                             l.charAt(0).toUpperCase() + l.slice(1) 
                    }))}
                    darkMode={darkMode}
                  />
                </div>
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.ejaculationIssues')}</FieldLabel>
                  <Input
                    name="ejaculation_issues"
                    placeholder={t('urologyReport.ejaculationIssuesPlaceholder')}
                    value={formData.hpi.sexual.ejaculation_issues}
                    onChange={(e) => updateFormData('hpi.sexual.ejaculation_issues', e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.sexual.infertility}
                  onChange={(e) => updateFormData('hpi.sexual.infertility', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('urologyReport.infertility')}</span>
              </label>
            </div>
          </div>

          {/* Acute Urinary Retention & Catheters */}
          <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.acuteUrinaryRetention') || 'Acute Urinary Retention & Catheters'}</FieldLabel>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.retention.had_acute_retention}
                  onChange={(e) => updateFormData('hpi.retention.had_acute_retention', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('urologyReport.hadAcuteRetention') || 'History of acute urinary retention'}
                </span>
              </label>
              {formData.hpi.retention.had_acute_retention && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.retentionEpisodesCount') || 'Number of episodes'}
                    </FieldLabel>
                    <Input
                      name="retention_episodes_count"
                      type="number"
                      placeholder={t('urologyReport.numberOfEpisodes') || 'Number of episodes'}
                      value={formData.hpi.retention.retention_episodes_count}
                      onChange={(e) => updateFormData('hpi.retention.retention_episodes_count', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.retention.current_catheter}
                  onChange={(e) => updateFormData('hpi.retention.current_catheter', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('urologyReport.currentCatheter') || 'Catheter in place now'}
                </span>
              </label>
              {formData.hpi.retention.current_catheter && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.catheterType') || 'Catheter Type'}
                    </FieldLabel>
                    <Select
                      name="catheter_type"
                      value={formData.hpi.retention.catheter_type}
                      onChange={(e) => updateFormData('hpi.retention.catheter_type', e.target.value)}
                      options={[
                        { value: 'foley', label: t('urologyReport.foley') || 'Foley' },
                        { value: 'suprapubic', label: t('urologyReport.suprapubic') || 'Suprapubic' },
                        { value: 'other', label: t('urologyReport.other') || 'Other' }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.catheterSizeFR') || 'Size (FR)'}
                    </FieldLabel>
                    <Input
                      name="catheter_size_fr"
                      type="number"
                      placeholder={t('urologyReport.sizeInFrench') || 'Size in French'}
                      value={formData.hpi.retention.catheter_size_fr}
                      onChange={(e) => updateFormData('hpi.retention.catheter_size_fr', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.catheterInsertedDate') || 'Inserted Date'}
                    </FieldLabel>
                    <Input
                      name="catheter_inserted_date"
                      type="date"
                      value={formData.hpi.retention.catheter_inserted_date}
                      onChange={(e) => updateFormData('hpi.retention.catheter_inserted_date', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stone Disease (Urolithiasis) */}
          <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.stoneDisease') || 'Stone Disease (Urolithiasis)'}</FieldLabel>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.stones.history_of_stones}
                  onChange={(e) => updateFormData('hpi.stones.history_of_stones', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('urologyReport.historyOfStones') || 'History of stones'}
                </span>
              </label>
              {formData.hpi.stones.history_of_stones && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.stoneLocation') || 'Stone Location'}
                    </FieldLabel>
                    <Select
                      name="stone_location"
                      value={formData.hpi.stones.stone_location}
                      onChange={(e) => updateFormData('hpi.stones.stone_location', e.target.value)}
                      options={[
                        { value: 'kidney', label: t('urologyReport.kidney') || 'Kidney' },
                        { value: 'ureter', label: t('urologyReport.ureter') || 'Ureter' },
                        { value: 'bladder', label: t('urologyReport.bladder') || 'Bladder' }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.stoneSide') || 'Side'}
                    </FieldLabel>
                    <Select
                      name="stone_side"
                      value={formData.hpi.stones.stone_side}
                      onChange={(e) => updateFormData('hpi.stones.stone_side', e.target.value)}
                      options={[
                        { value: 'right', label: t('urologyReport.right') || 'Right' },
                        { value: 'left', label: t('urologyReport.left') || 'Left' },
                        { value: 'bilateral', label: t('urologyReport.bilateral') || 'Bilateral' }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.stoneSizeMM') || 'Stone Size (mm)'}
                    </FieldLabel>
                    <Input
                      name="stone_size_mm"
                      type="number"
                      placeholder={t('urologyReport.sizeFromLastUSCT') || 'From last US/CT'}
                      value={formData.hpi.stones.stone_size_mm}
                      onChange={(e) => updateFormData('hpi.stones.stone_size_mm', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.hydronephrosisGrade') || 'Hydronephrosis Grade'}
                    </FieldLabel>
                    <Input
                      name="hydronephrosis_grade"
                      placeholder={t('urologyReport.grade0To4') || '0-4 or text'}
                      value={formData.hpi.stones.hydronephrosis_grade}
                      onChange={(e) => updateFormData('hpi.stones.hydronephrosis_grade', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel darkMode={darkMode} className="text-xs">
                      {t('urologyReport.previousStoneProcedures') || 'Previous Stone Procedures'}
                    </FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {['ESWL', 'URS', 'PCNL', 'Open Surgery'].map(proc => (
                        <label key={proc} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.hpi.stones.previous_stone_procedures.includes(proc)}
                            onChange={(e) => {
                              const current = formData.hpi.stones.previous_stone_procedures;
                              if (e.target.checked) {
                                updateFormData('hpi.stones.previous_stone_procedures', [...current, proc]);
                              } else {
                                updateFormData('hpi.stones.previous_stone_procedures', current.filter(p => p !== proc));
                              }
                            }}
                            className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                          />
                          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{proc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TB and Endemic Infections */}
          <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.tbAndInfections') || 'TB and Endemic Infections'}</FieldLabel>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.infections.tb_history}
                    onChange={(e) => updateFormData('hpi.infections.tb_history', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('urologyReport.tbHistory') || 'Past TB'}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.infections.tb_contact}
                    onChange={(e) => updateFormData('hpi.infections.tb_contact', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('urologyReport.tbContact') || 'TB Contact'}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.infections.gu_tb_suspected}
                    onChange={(e) => updateFormData('hpi.infections.gu_tb_suspected', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('urologyReport.guTbSuspected') || 'Suspected GU TB'}
                  </span>
                </label>
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">
                  {t('urologyReport.stdHistory') || 'STD History'}
                </FieldLabel>
                <TextArea
                  name="std_history"
                  placeholder={t('urologyReport.gonorrheaChlamydia') || 'Gonorrhea, chlamydia, etc.'}
                  value={formData.hpi.infections.std_history}
                  onChange={(e) => updateFormData('hpi.infections.std_history', e.target.value)}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Performance Status */}
          <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.performanceStatus') || 'Performance Status'}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">
                  {t('urologyReport.ecogKarnofsky') || 'ECOG/Karnofsky'}
                </FieldLabel>
                <Input
                  name="ecog_karnofsky"
                  placeholder={t('urologyReport.performanceStatusPlaceholder') || 'ECOG 0-4 or Karnofsky score'}
                  value={formData.hpi.performance_status.ecog_karnofsky}
                  onChange={(e) => updateFormData('hpi.performance_status.ecog_karnofsky', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.hpi.performance_status.weight_loss_recent}
                    onChange={(e) => updateFormData('hpi.performance_status.weight_loss_recent', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('urologyReport.weightLossRecent') || 'Recent weight loss (6 months)'}
                  </span>
                </label>
                {formData.hpi.performance_status.weight_loss_recent && (
                  <Input
                    name="weight_loss_kg"
                    type="number"
                    placeholder={t('urologyReport.weightLossKG') || 'Weight loss (kg)'}
                    value={formData.hpi.performance_status.weight_loss_kg}
                    onChange={(e) => updateFormData('hpi.performance_status.weight_loss_kg', e.target.value)}
                    darkMode={darkMode}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.currentMedications')}</FieldLabel>
              {patientMedications.length > 0 && (
                <div className={`mb-2 p-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-blue-900/30 border-blue-700' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>{t('urologyReport.fromPatientRecord') || 'From Patient Record'}</div>
                  <div className="space-y-1">
                    {patientMedications.map((med, idx) => (
                      <div key={idx} className={`text-xs ${
                        darkMode ? 'text-blue-300' : 'text-blue-700'
                      }`}>
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
                      updateFormData('hpi.meds', medsText);
                    }}
                    className={`mt-1 text-xs underline ${
                      darkMode 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    {t('urologyReport.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
              <TextArea
                name="meds"
                placeholder={t('urologyReport.currentMedicationsPlaceholder')}
                value={formData.hpi.meds}
                onChange={(e) => updateFormData('hpi.meds', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.allergies')}</FieldLabel>
              <Input
                name="allergies"
                placeholder={t('urologyReport.allergiesPlaceholder')}
                value={formData.hpi.allergies}
                onChange={(e) => updateFormData('hpi.allergies', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.pastMedicalHistory')}</FieldLabel>
              <TextArea
                name="pmh"
                placeholder={t('urologyReport.pastMedicalHistoryPlaceholder')}
                value={formData.hpi.pmh}
                onChange={(e) => updateFormData('hpi.pmh', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.pastSurgicalHistory')}</FieldLabel>
              <TextArea
                name="psh"
                placeholder={t('urologyReport.pastSurgicalHistoryPlaceholder')}
                value={formData.hpi.psh}
                onChange={(e) => updateFormData('hpi.psh', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.familyHistory')}</FieldLabel>
              <TextArea
                name="family"
                placeholder={t('urologyReport.familyHistoryPlaceholder')}
                value={formData.hpi.family}
                onChange={(e) => updateFormData('hpi.family', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.socialHistory')}</FieldLabel>
              <TextArea
                name="social"
                placeholder={t('urologyReport.socialHistoryPlaceholder')}
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
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {t('urologyReport.aiSuggest')}
            </button>
          </div>
        </div>
      </Card>

      {/* Vitals & Physical Exam */}
      <Card 
        title={t('urologyReport.vitalsPhysicalExam') || 'Vitals & Physical Exam'} 
        collapsible 
        isOpen={!collapsedSections.vitals} 
        onToggle={() => toggleSection('vitals')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.bp')}</FieldLabel>
              <Input
                name="bp"
                placeholder={t('urologyReport.bpPlaceholder')}
                value={formData.vitals.bp}
                onChange={(e) => updateFormData('vitals.bp', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.heartRate')}</FieldLabel>
              <Input
                name="hr"
                placeholder={t('urologyReport.heartRatePlaceholder')}
                value={formData.vitals.hr}
                onChange={(e) => updateFormData('vitals.hr', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.temperature')}</FieldLabel>
              <Input
                name="temp"
                placeholder={t('urologyReport.temperaturePlaceholder')}
                value={formData.vitals.temp}
                onChange={(e) => updateFormData('vitals.temp', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.spo2')}</FieldLabel>
              <Input
                name="spo2"
                placeholder={t('urologyReport.spo2Placeholder')}
                value={formData.vitals.spo2}
                onChange={(e) => updateFormData('vitals.spo2', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.height')}</FieldLabel>
              <Input
                type="number"
                name="height_cm"
                placeholder={t('urologyReport.heightPlaceholder')}
                value={formData.vitals.height_cm}
                onChange={(e) => updateFormData('vitals.height_cm', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.weight')}</FieldLabel>
              <Input
                type="number"
                name="weight_kg"
                placeholder={t('urologyReport.weightPlaceholder')}
                value={formData.vitals.weight_kg}
                onChange={(e) => updateFormData('vitals.weight_kg', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.bmi')}</FieldLabel>
              <Input
                name="bmi"
                value={formData.vitals.bmi}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className={darkMode ? 'bg-slate-700' : 'bg-slate-100'}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card 
        title={t('urologyReport.physicalExamination') || 'Physical Examination'} 
        collapsible 
        isOpen={!collapsedSections.exam} 
        onToggle={() => toggleSection('exam')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.abdomen')}</FieldLabel>
            <TextArea
              name="abdomen"
              placeholder={t('urologyReport.abdomenPlaceholder')}
              value={formData.exam.abdomen}
              onChange={(e) => updateFormData('exam.abdomen', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.cvaTenderness')}</FieldLabel>
              <Select
                name="cVAT"
                value={formData.exam.cVAT}
                onChange={(e) => updateFormData('exam.cVAT', e.target.value)}
                options={CVAT_TYPES.map(c => ({ 
                  value: c, 
                  label: c === 'absent' ? t('urologyReport.absent') : 
                         c === 'unilateral' ? t('urologyReport.unilateral') : 
                         c === 'bilateral' ? t('urologyReport.bilateral') : 
                         c.charAt(0).toUpperCase() + c.slice(1) 
                }))}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.bladderDistension')}</FieldLabel>
              <Select
                name="bladder_distension"
                value={formData.exam.bladder_distension}
                onChange={(e) => updateFormData('exam.bladder_distension', e.target.value)}
                options={BLADDER_DISTENSION_TYPES.map(b => ({ 
                  value: b, 
                  label: b === 'none' ? t('urologyReport.none') : 
                         b === 'mild' ? t('urologyReport.mild') : 
                         b === 'moderate' ? t('urologyReport.moderate') : 
                         b === 'severe' ? t('urologyReport.severe') : 
                         b.charAt(0).toUpperCase() + b.slice(1) 
                }))}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.maleGenital')}</FieldLabel>
              <TextArea
                name="male_genital"
                placeholder={t('urologyReport.maleGenitalPlaceholder')}
                value={formData.exam.male_genital}
                onChange={(e) => updateFormData('exam.male_genital', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.femaleGenital')}</FieldLabel>
              <TextArea
                name="female_genital"
                placeholder={t('urologyReport.femaleGenitalPlaceholder')}
                value={formData.exam.female_genital}
                onChange={(e) => updateFormData('exam.female_genital', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.digitalRectalExam')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.tone')}</FieldLabel>
                <Input
                  name="dre_tone"
                  placeholder={t('urologyReport.tonePlaceholder')}
                  value={formData.exam.dre.tone}
                  onChange={(e) => updateFormData('exam.dre.tone', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.prostateSize')}</FieldLabel>
                <Input
                  name="prostate_size"
                  placeholder={t('urologyReport.prostateSizePlaceholder')}
                  value={formData.exam.dre.prostate_size}
                  onChange={(e) => updateFormData('exam.dre.prostate_size', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.exam.dre.nodules}
                  onChange={(e) => updateFormData('exam.dre.nodules', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('urologyReport.nodules')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.exam.dre.tenderness}
                  onChange={(e) => updateFormData('exam.dre.tenderness', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('urologyReport.tenderness')}</span>
              </label>
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.dreComments')}</FieldLabel>
              <TextArea
                name="dre_comments"
                placeholder={t('urologyReport.dreCommentsPlaceholder')}
                value={formData.exam.dre.comments}
                onChange={(e) => updateFormData('exam.dre.comments', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.popQ')}</FieldLabel>
            <Input
              name="pop_q"
              placeholder={t('urologyReport.popQPlaceholder')}
              value={formData.exam.pop_q}
              onChange={(e) => updateFormData('exam.pop_q', e.target.value)}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Functional Testing */}
      <Card 
        title={t('urologyReport.functionalTesting') || 'Functional Testing'} 
        collapsible 
        isOpen={!collapsedSections.functional} 
        onToggle={() => toggleSection('functional')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.postVoidResidual')}</FieldLabel>
            <Input
              type="number"
              name="pvr_ml"
              placeholder={t('urologyReport.pvrPlaceholder')}
              min="0"
              value={formData.functional.pvr_ml}
              onChange={(e) => updateFormData('functional.pvr_ml', e.target.value)}
              darkMode={darkMode}
            />
            {errors.pvr && <p className="text-red-500 text-sm mt-1">{errors.pvr}</p>}
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.uroflowmetry')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.qmax')}</FieldLabel>
                <Input
                  type="number"
                  name="qmax"
                  placeholder={t('urologyReport.qmaxPlaceholder')}
                  min="0"
                  value={formData.functional.uroflow.qmax_ml_s}
                  onChange={(e) => updateFormData('functional.uroflow.qmax_ml_s', e.target.value)}
                  darkMode={darkMode}
                />
                {errors.qmax && <p className="text-red-500 text-xs mt-1">{errors.qmax}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.qavg')}</FieldLabel>
                <Input
                  type="number"
                  name="qavg"
                  placeholder={t('urologyReport.qavgPlaceholder')}
                  min="0"
                  value={formData.functional.uroflow.qavg_ml_s}
                  onChange={(e) => updateFormData('functional.uroflow.qavg_ml_s', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.voidedVolume')}</FieldLabel>
                <Input
                  type="number"
                  name="voided_vol"
                  placeholder={t('urologyReport.voidedVolumePlaceholder')}
                  min="0"
                  value={formData.functional.uroflow.voided_vol_ml}
                  onChange={(e) => updateFormData('functional.uroflow.voided_vol_ml', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.voidTime')}</FieldLabel>
                <Input
                  type="number"
                  name="void_time"
                  placeholder={t('urologyReport.voidTimePlaceholder')}
                  min="0"
                  value={formData.functional.uroflow.void_time_s}
                  onChange={(e) => updateFormData('functional.uroflow.void_time_s', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.curveNotes')}</FieldLabel>
              <TextArea
                name="curve_notes"
                placeholder={t('urologyReport.curveNotesPlaceholder')}
                value={formData.functional.uroflow.curve_notes}
                onChange={(e) => updateFormData('functional.uroflow.curve_notes', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.incontinenceType')}</FieldLabel>
              <Select
                name="incontinence_type"
                value={formData.functional.incontinence.type}
                onChange={(e) => updateFormData('functional.incontinence.type', e.target.value)}
                options={INCONTINENCE_TYPE_OPTIONS.map(opt => ({ 
                  value: opt, 
                  label: opt === 'stress' ? t('urologyReport.stress') : 
                         opt === 'urge' ? t('urologyReport.urge') : 
                         opt === 'mixed' ? t('urologyReport.mixed') : 
                         opt === 'none' ? t('urologyReport.none') : 
                         opt.charAt(0).toUpperCase() + opt.slice(1) 
                }))}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.padTest')}</FieldLabel>
              <Input
                type="number"
                name="pad_test_g"
                placeholder={t('urologyReport.padTestPlaceholder')}
                min="0"
                value={formData.functional.incontinence.pad_test_g}
                onChange={(e) => updateFormData('functional.incontinence.pad_test_g', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Labs & Imaging */}
      <Card 
        title={t('urologyReport.labsImaging') || 'Labs & Imaging'} 
        collapsible 
        isOpen={!collapsedSections.labs} 
        onToggle={() => toggleSection('labs')}
        darkMode={darkMode}
      >
        <div className="space-y-6">
          {/* Urinalysis */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.urinalysis')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.blood')}</FieldLabel>
                <Input
                  name="urine_blood"
                  value={formData.labs_imaging.urinalysis.blood}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.blood', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.protein')}</FieldLabel>
                <Input
                  name="urine_protein"
                  value={formData.labs_imaging.urinalysis.protein}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.protein', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.nitrite')}</FieldLabel>
                <Input
                  name="urine_nitrite"
                  value={formData.labs_imaging.urinalysis.nitrite}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.nitrite', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.leukEsterase')}</FieldLabel>
                <Input
                  name="urine_leuk"
                  value={formData.labs_imaging.urinalysis.leuk_esterase}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.leuk_esterase', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.rbcHPF')}</FieldLabel>
                <Input
                  name="urine_rbc"
                  value={formData.labs_imaging.urinalysis.rbc_hpf}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.rbc_hpf', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.wbcHPF')}</FieldLabel>
                <Input
                  name="urine_wbc"
                  value={formData.labs_imaging.urinalysis.wbc_hpf}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.wbc_hpf', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Urine Culture */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.urineCulture')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.date')}</FieldLabel>
                <Input
                  type="date"
                  name="culture_date"
                  value={formData.labs_imaging.urine_culture.date}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.date', e.target.value)}
                  darkMode={darkMode}
                />
                {errors.urine_culture_date && <p className="text-red-500 text-xs mt-1">{errors.urine_culture_date}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.cfuML')}</FieldLabel>
                <Input
                  name="culture_cfu"
                  value={formData.labs_imaging.urine_culture.cfu}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.cfu', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.organism')}</FieldLabel>
                <Input
                  name="culture_organism"
                  value={formData.labs_imaging.urine_culture.organism}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.organism', e.target.value)}
                  darkMode={darkMode}
                />
                {errors.urine_culture_organism && <p className="text-red-500 text-xs mt-1">{errors.urine_culture_organism}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.antibioticsStarted')}</FieldLabel>
                <Input
                  name="culture_abx"
                  value={formData.labs_imaging.urine_culture.antibiotics_started}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.antibiotics_started', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.sensitivities')}</FieldLabel>
                <TextArea
                  name="culture_sens"
                  value={formData.labs_imaging.urine_culture.sensitivities}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.sensitivities', e.target.value)}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Renal Panel */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.renalPanel')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.bun')}</FieldLabel>
                <Input
                  name="bun"
                  value={formData.labs_imaging.renal_panel.bun}
                  onChange={(e) => updateFormData('labs_imaging.renal_panel.bun', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.creatinine')}</FieldLabel>
                <Input
                  name="creatinine"
                  value={formData.labs_imaging.renal_panel.creatinine}
                  onChange={(e) => updateFormData('labs_imaging.renal_panel.creatinine', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.egfr')}</FieldLabel>
                <Input
                  name="egfr"
                  value={formData.labs_imaging.renal_panel.eGFR}
                  onChange={(e) => updateFormData('labs_imaging.renal_panel.eGFR', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Basic Blood Tests */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.basicBloodTests')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">{t('urologyReport.hb')}</FieldLabel>
                <Input
                  name="hb"
                  value={formData.labs_imaging.blood_tests.hb}
                  onChange={(e) => updateFormData('labs_imaging.blood_tests.hb', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">{t('urologyReport.wbc')}</FieldLabel>
                <Input
                  name="wbc"
                  value={formData.labs_imaging.blood_tests.wbc}
                  onChange={(e) => updateFormData('labs_imaging.blood_tests.wbc', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">{t('urologyReport.platelets')}</FieldLabel>
                <Input
                  name="plt"
                  value={formData.labs_imaging.blood_tests.plt}
                  onChange={(e) => updateFormData('labs_imaging.blood_tests.plt', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">{t('urologyReport.esr')}</FieldLabel>
                <Input
                  name="esr"
                  value={formData.labs_imaging.blood_tests.esr}
                  onChange={(e) => updateFormData('labs_imaging.blood_tests.esr', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">{t('urologyReport.crp')}</FieldLabel>
                <Input
                  name="crp"
                  value={formData.labs_imaging.blood_tests.crp}
                  onChange={(e) => updateFormData('labs_imaging.blood_tests.crp', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode} className="text-xs">{t('urologyReport.glucose')}</FieldLabel>
                <Input
                  name="glucose"
                  value={formData.labs_imaging.blood_tests.glucose}
                  onChange={(e) => updateFormData('labs_imaging.blood_tests.glucose', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* PSA */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.psa')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.totalPSA')}</FieldLabel>
                <Input
                  type="number"
                  name="psa_total"
                  min="0"
                  value={formData.labs_imaging.psa.total_ng_ml}
                  onChange={(e) => updateFormData('labs_imaging.psa.total_ng_ml', e.target.value)}
                  darkMode={darkMode}
                />
                {errors.psa_total && <p className="text-red-500 text-xs mt-1">{errors.psa_total}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.freePSA')}</FieldLabel>
                <Input
                  type="number"
                  name="psa_free"
                  min="0"
                  value={formData.labs_imaging.psa.free_ng_ml}
                  onChange={(e) => updateFormData('labs_imaging.psa.free_ng_ml', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.freeTotalRatio')}</FieldLabel>
                <Input
                  name="psa_ratio"
                  value={formData.labs_imaging.psa.ratio}
                  readOnly={true}
                  onChange={() => {}} // No-op for read-only field
                  className={darkMode ? 'bg-slate-700' : 'bg-slate-100'}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.date')}</FieldLabel>
                <Input
                  type="date"
                  name="psa_date"
                  value={formData.labs_imaging.psa.date}
                  onChange={(e) => updateFormData('labs_imaging.psa.date', e.target.value)}
                  darkMode={darkMode}
                />
                {errors.psa_date && <p className="text-red-500 text-xs mt-1">{errors.psa_date}</p>}
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.labs_imaging.psa.pre_DRE}
                    onChange={(e) => updateFormData('labs_imaging.psa.pre_DRE', e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('urologyReport.preDRE')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Hormones */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.hormones')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.testosteroneTotal')}</FieldLabel>
                <Input
                  name="testosterone"
                  value={formData.labs_imaging.hormones.testosterone_total}
                  onChange={(e) => updateFormData('labs_imaging.hormones.testosterone_total', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.prolactin')}</FieldLabel>
                <Input
                  name="prolactin"
                  value={formData.labs_imaging.hormones.prolactin}
                  onChange={(e) => updateFormData('labs_imaging.hormones.prolactin', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.lh')}</FieldLabel>
                <Input
                  name="lh"
                  value={formData.labs_imaging.hormones.lh}
                  onChange={(e) => updateFormData('labs_imaging.hormones.lh', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.fsh')}</FieldLabel>
                <Input
                  name="fsh"
                  value={formData.labs_imaging.hormones.fsh}
                  onChange={(e) => updateFormData('labs_imaging.hormones.fsh', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Semen Analysis */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.semenAnalysis')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.date')}</FieldLabel>
                <Input
                  type="date"
                  name="semen_date"
                  value={formData.labs_imaging.semen_analysis.date}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.date', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.volume')}</FieldLabel>
                <Input
                  type="number"
                  name="semen_volume"
                  min="0"
                  value={formData.labs_imaging.semen_analysis.volume_ml}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.volume_ml', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.count')}</FieldLabel>
                <Input
                  type="number"
                  name="semen_count"
                  min="0"
                  value={formData.labs_imaging.semen_analysis.count_million_ml}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.count_million_ml', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.motility')}</FieldLabel>
                <Input
                  type="number"
                  name="semen_motility"
                  min="0"
                  max="100"
                  value={formData.labs_imaging.semen_analysis.motility_pct}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.motility_pct', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('urologyReport.morphology')}</FieldLabel>
                <Input
                  type="number"
                  name="semen_morphology"
                  min="0"
                  max="100"
                  value={formData.labs_imaging.semen_analysis.morphology_pct}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.morphology_pct', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Imaging */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.imagingStudies')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {IMAGING_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addToArray('labs_imaging.imaging', preset)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    darkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + {t(`urologyReport.${preset}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.labs_imaging.imaging.map((img, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('labs_imaging.imaging', idx)} darkMode={darkMode}>
                  {IMAGING_PRESETS.includes(img) ? t(`urologyReport.${img}`) : img}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Diagnosis */}
      <Card 
        title={t('urologyReport.diagnosis') || 'Diagnosis'} 
        collapsible 
        isOpen={!collapsedSections.diagnosis} 
        onToggle={() => toggleSection('diagnosis')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <p className={`text-xs mb-2 ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {t('urologyReport.diagnosisNote') || 'Minimum requirement: fill main diagnosis (ICD-10/11). Additional codes are optional.'}
          </p>
          <div>
            <FieldLabel required darkMode={darkMode}>{t('urologyReport.mainDiagnosis') || 'Main Diagnosis'}</FieldLabel>
            <div className="space-y-2">
              {formData.diagnosis.main && typeof formData.diagnosis.main === 'object' && (formData.diagnosis.main.code || formData.diagnosis.main.term) ? (
                <div className="flex gap-2 items-start">
                  <div className="flex gap-2 items-start flex-1">
                    <Input
                    placeholder={t('urologyReport.icd11Code')}
                    value={formData.diagnosis.main.code || ''}
                    onChange={(e) => {
                      const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                      updateFormData('diagnosis.main', { ...current, code: e.target.value });
                    }}
                    className="w-40"
                    darkMode={darkMode}
                  />
                  <Input
                    placeholder={t('urologyReport.diagnosisTerm')}
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
                      ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {t('urologyReport.clear')}
                </button>
                </div>
              ) : null}
              <IcdCodeSearchInput
                placeholder={t('urologyReport.searchIcd11Code') || 'Search ICD-11 code or diagnosis...'}
                onSelect={(selected) => {
                  updateFormData('diagnosis.main', selected);
                }}
                darkMode={darkMode}
              />
            </div>
            {errors.diagnosis_main && <p className="text-red-500 text-sm mt-1">{errors.diagnosis_main}</p>}
          </div>
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.secondaryDiagnoses')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.secondary.map((diag, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.secondary', idx)} darkMode={darkMode}>
                  {typeof diag === 'object' ? `${diag.code || ''} ${diag.term || ''}`.trim() : diag}
                </Chip>
              ))}
            </div>
            <IcdCodeSearchInput
              placeholder={t('urologyReport.searchIcd11Code') || 'Search ICD-11 code...'}
              onSelect={(selected) => {
                addToArray('diagnosis.secondary', selected);
              }}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('urologyReport.diagnosisCodes')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.codes.map((code, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.codes', idx)} darkMode={darkMode}>
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
                  { value: 'ICD10', label: 'ICD10' },
                  { value: 'ICD11', label: 'ICD11' },
                  { value: 'SNOMED', label: 'SNOMED' }
                ]}
                darkMode={darkMode}
              />
              <Input 
                name="code_code" 
                placeholder={t('urologyReport.code')} 
                value={newCode.code}
                onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value }))}
                darkMode={darkMode}
              />
              <Input 
                name="code_term" 
                placeholder={t('urologyReport.term')} 
                value={newCode.term}
                onChange={(e) => setNewCode(prev => ({ ...prev, term: e.target.value }))}
                darkMode={darkMode}
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
                {t('urologyReport.addCode')}
              </button>
            </div>
            <div className="mt-2">
              <IcdCodeSearchInput
                placeholder={t('urologyReport.searchIcd11CodeToAdd') || 'Search ICD-11 code to add...'}
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
        </div>
      </Card>

      {/* Plan & Treatment - Initial Mode Only */}
      {mode === 'initial' && (
        <Card 
          title={t('urologyReport.planTreatment') || 'Plan & Treatment'} 
          collapsible 
          isOpen={!collapsedSections.plan} 
          onToggle={() => toggleSection('plan')}
          darkMode={darkMode}
        >
          <div className="space-y-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.medications')}</FieldLabel>
              <FieldLabel className="text-xs" darkMode={darkMode}>({formData.plan.meds.length})</FieldLabel>
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
                      placeholder={t('urologyReport.searchMedication')}
                      value={editingMed.med}
                      onChange={(e) => setEditingMed(s => ({ ...s, med: e.target.value }))}
                      onSelect={(selected) => {
                        setEditingMed(s => ({
                          ...s,
                          med: selected.med,
                          conc_strength: selected.strength || s.conc_strength
                        }));
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('urologyReport.concentrationStrength')} 
                      value={editingMed.conc_strength} 
                      onChange={(e) => setEditingMed(s => ({...s, conc_strength: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Select 
                      name="med_route" 
                      value={editingMed.route} 
                      onChange={(e) => setEditingMed(s => ({...s, route: e.target.value}))}
                      options={[
                        {value:'topical',label:t('urologyReport.topical')},
                        {value:'oral',label:t('urologyReport.oral')},
                        {value:'injection',label:t('urologyReport.injection')},
                        {value:'other',label:t('urologyReport.other')}
                      ]} 
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('urologyReport.frequency')} 
                      value={editingMed.freq} 
                      onChange={(e) => setEditingMed(s => ({...s, freq: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('urologyReport.duration')} 
                      value={editingMed.duration} 
                      onChange={(e) => setEditingMed(s => ({...s, duration: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <TextArea 
                      placeholder={t('urologyReport.instructions')} 
                      value={editingMed.instructions} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                      rows={2}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex gap-2">
                    <button type="button" onClick={saveMed} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{t('urologyReport.save')}</button>
                    <button type="button" onClick={() => { setEditingMed(null); setEditingMedIdx(null); }} className={`px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}>{t('urologyReport.cancel')}</button>
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
                  {t('urologyReport.addMedication')}
                </button>
              )}
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.plannedProcedures')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {PROCEDURE_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addToArray('plan.procedures_planned', preset)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + {t(`urologyReport.${preset}`)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.procedures_planned.map((proc, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.procedures_planned', idx)} darkMode={darkMode}>
                    {PROCEDURE_PRESETS.includes(proc) ? t(`urologyReport.${proc}`) : proc}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.counseling')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {COUNSELING_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addToArray('plan.counseling', preset)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + {t(`urologyReport.${preset}`)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.counseling.map((counsel, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.counseling', idx)} darkMode={darkMode}>
                    {COUNSELING_PRESETS.includes(counsel) ? t(`urologyReport.${counsel}`) : counsel}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.referrals')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {REFERRAL_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (formData.plan.referrals.includes(preset)) {
                        removeFromArray('plan.referrals', formData.plan.referrals.indexOf(preset));
                      } else {
                        addToArray('plan.referrals', preset);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      formData.plan.referrals.includes(preset)
                        ? darkMode
                          ? 'bg-emerald-700 text-emerald-200 border border-emerald-600'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : darkMode
                          ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {t(`urologyReport.${preset}`)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.referrals.map((ref, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.referrals', idx)} darkMode={darkMode}>
                    {REFERRAL_PRESETS.includes(ref) ? t(`urologyReport.${ref}`) : ref}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.followUp')}</FieldLabel>
              <Select
                name="follow_up"
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={FOLLOW_UP_OPTIONS.map(f => ({ value: f, label: f === '48h' ? t('urologyReport.hours48') : f === '1w' ? t('urologyReport.week1') : f === '1m' ? t('urologyReport.month1') : f === '3m' ? t('urologyReport.months3') : f === 'PRN' ? t('urologyReport.prn') : t('urologyReport.specificDate') }))}
                darkMode={darkMode}
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
      <Card 
        title={t('urologyReport.proceduresDone') || 'Procedures Done'} 
        collapsible 
        isOpen={!collapsedSections.procedures} 
        onToggle={() => toggleSection('procedures')} 
        counter={formData.procedures_done.length}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          {formData.procedures_done.length > 0 && (
            <div className="space-y-2">
              {formData.procedures_done.map((proc, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${
                  darkMode ? 'bg-slate-800' : 'bg-slate-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-slate-200' : ''}`}>{proc.name} - {proc.date}</p>
                      {proc.side && <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('urologyReport.side')}: {proc.side}</p>}
                      {proc.technique && <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('urologyReport.technique')}: {proc.technique}</p>}
                      {proc.findings && <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('urologyReport.findings')}: {proc.findings}</p>}
                      {proc.complications && <p className="text-sm text-red-600">{t('urologyReport.complications')}: {proc.complications}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openProcedureEditor(proc, idx)} className={`${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>✎</button>
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
                  placeholder={t('urologyReport.procedureName')} 
                  value={editingProcedure.name} 
                  onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  type="date"
                  placeholder={t('urologyReport.procedureDate')} 
                  value={editingProcedure.date} 
                  onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <Select 
                  name="side" 
                  value={editingProcedure.side} 
                  onChange={(e) => setEditingProcedure(s => ({...s, side: e.target.value}))}
                  options={[
                    {value:'R',label:t('urologyReport.right')},
                    {value:'L',label:t('urologyReport.left')},
                    {value:'Bilateral',label:t('urologyReport.bilateral')},
                    {value:'NA',label:t('urologyReport.na')}
                  ]} 
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <Select 
                  name="anesthesia" 
                  value={editingProcedure.anesthesia} 
                  onChange={(e) => setEditingProcedure(s => ({...s, anesthesia: e.target.value}))}
                  options={[
                    {value:'none',label:t('urologyReport.none')},
                    {value:'local',label:t('urologyReport.local')},
                    {value:'spinal',label:t('urologyReport.spinal')},
                    {value:'general',label:t('urologyReport.general')}
                  ]} 
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder={t('urologyReport.technique')} 
                  value={editingProcedure.technique} 
                  onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder={t('urologyReport.findings')} 
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
                    {value:'successful',label:t('urologyReport.successful')},
                    {value:'partial',label:t('urologyReport.partial')},
                    {value:'failed',label:t('urologyReport.failed')}
                  ]} 
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder={t('urologyReport.complications')} 
                  value={editingProcedure.complications} 
                  onChange={(e) => setEditingProcedure(s => ({...s, complications: e.target.value}))}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 flex gap-2">
                <button type="button" onClick={saveProcedure} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{t('urologyReport.save')}</button>
                <button type="button" onClick={() => { setEditingProcedure(null); setEditingProcedureIdx(null); }} className={`px-4 py-2 border rounded-lg ${
                  darkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : 'border-slate-300 hover:bg-slate-50'
                }`}>{t('urologyReport.cancel')}</button>
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
              {t('urologyReport.addProcedure')}
            </button>
          )}
        </div>
      </Card>

      {/* Outcome & Recommendations - Discharge Mode Only */}
      {mode === 'discharge' && (
        <Card 
          title={t('urologyReport.outcomeRecommendations') || 'Outcome & Recommendations'} 
          collapsible 
          isOpen={!collapsedSections.outcome} 
          onToggle={() => toggleSection('outcome')}
          darkMode={darkMode}
        >
          <div className="space-y-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.conditionAtDischarge')}</FieldLabel>
              <Input
                name="condition"
                placeholder={t('urologyReport.conditionPlaceholder')}
                value={formData.outcome.condition}
                onChange={(e) => updateFormData('outcome.condition', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('urologyReport.hospitalCourse')}</FieldLabel>
              <TextArea
                name="course"
                placeholder={t('urologyReport.hospitalCoursePlaceholder')}
                value={formData.outcome.course}
                onChange={(e) => updateFormData('outcome.course', e.target.value)}
                rows={4}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel required darkMode={darkMode}>{t('urologyReport.recommendations')}</FieldLabel>
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
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                  onClick={() => addToArray('recommendations', '')}
                >
                  {t('urologyReport.addRecommendation')}
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
        title={t('urologyReport.attachments')} 
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
            <p className={`mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('urologyReport.dropFilesHere')}</p>
            <p className={`text-xs mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('urologyReport.includeImagingReports')}</p>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg ${
                darkMode 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('urologyReport.chooseFiles')}
            </button>
          </div>
          
          <div className="space-y-2">
            {formData.attachments.map((attachment, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${
                darkMode ? 'bg-slate-800' : 'bg-slate-50'
              }`}>
                <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{attachment.label || attachment.id}</span>
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{attachment.type}</span>
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
            {lastSaved && `${t('urologyReport.lastSaved')} ${lastSaved.toLocaleTimeString()}`}
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
              {t('urologyReport.saveDraft')}
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
              {t('urologyReport.preview')}
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
              {t('urologyReport.finalizeSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrologyReportForm;

