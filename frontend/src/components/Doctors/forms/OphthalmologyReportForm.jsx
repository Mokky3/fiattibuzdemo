import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { icdCodesAPI, doctorPatientsAPI, medicationsAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from GeneralVisitReport/CardiologyReportForm)
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

const Input = React.memo(({ name, placeholder, value, onChange, className = "", type = "text", required = false, darkMode = false }) => (
  <input
    type={type}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required={required}
    className={`w-full px-4 py-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
      darkMode 
        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
        : 'text-slate-600 border-slate-200 bg-white'
    } ${className}`}
  />
));

const Select = React.memo(({ name, value, onChange, options, className = "", required = false, darkMode = false }) => {
  const { t } = useTranslation();
  return (
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
      <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t('ophthalmologyReport.select')}</option>
      {options.map(option => (
        <option key={option.value} value={option.value} className={darkMode ? 'bg-slate-800' : ''}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

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
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
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
        {showResults && searchResults.length > 0 && (
          <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
            darkMode 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-white border-slate-200'
          }`}>
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(result)}
                className={`px-4 py-3 cursor-pointer ${
                  darkMode
                    ? idx === selectedIndex 
                      ? 'bg-emerald-900/50' 
                      : 'hover:bg-slate-700'
                    : idx === selectedIndex 
                      ? 'bg-slate-100' 
                      : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`font-medium ${
                      darkMode ? 'text-emerald-400' : 'text-slate-800'
                    }`}>{result.code}</div>
                    <div className={`text-sm mt-1 ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {result.description_en || result.description_ru || result.description_uz || result.description || result.name || ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

// Preset arrays (module scope)
const VA_PRESETS = ['20/16', '20/20', '20/25', '20/30', '20/40', '20/50', '20/60', '20/70', '20/80', '20/100', '20/200', '20/400', 'CF', 'HM', 'LP', 'NLP'];
const NEAR_PRESETS = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J10', 'J12', 'J16'];
const IOP_METHODS = ['NCT', 'Applanation', 'Tono-Pen', 'iCare', 'Other'];
const COLOR_VISION_METHODS = ['Ishihara', 'D-15', 'Other'];
const GONIO_SHAFFER = ['I', 'II', 'III', 'IV'];
const TEST_PRESETS = ['OCT RNFL/Macula', 'HVF 24-2', 'Fundus Photo', 'FFA', 'B-scan', 'Topography', 'Biometry'];
const COUNSELING_PRESETS = ['Medication compliance', 'Side-effects explained', 'Driving precautions', 'Urgent return precautions'];
const PROCEDURE_PRESETS = ['YAG Capsulotomy', 'PRP', 'IVT', 'CXL', 'Cataract Surgery', 'Trabeculectomy', 'Other'];
const DR_GRADES = ['No DR', 'Mild NPDR', 'Mod NPDR', 'Severe NPDR', 'PDR'];
const AMD_GRADES = ['No AMD', 'Early', 'Intermediate', 'Advanced'];
const DIAGNOSIS_CODE_PRESETS = [
  { system: 'ICD10', code: 'H40.9', term: 'Glaucoma, unspecified' },
  { system: 'ICD10', code: 'H25.9', term: 'Cataract, unspecified' },
  { system: 'ICD10', code: 'H35.9', term: 'Retinal disorder, unspecified' },
  { system: 'ICD10', code: 'H40.1', term: 'Open-angle glaucoma' },
  { system: 'ICD10', code: 'H40.2', term: 'Angle-closure glaucoma' }
];

// StructuredClone fallback
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const OphthalmologyReportForm = ({ patient, encounter, onSave }) => {
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
  // Core sections (open by default): hpi, acuity, iop, anterior, posterior, diagnosis, plan
  // Advanced sections (collapsed by default): external, refraction, pupils, motility, alignment, color, vf, dilation, gonio, tests, imagingStudies, procedures, outcome, attachments
  const [collapsedSections, setCollapsedSections] = useState({
    meta: false,
    hpi: false, // Core - open
    external: true, // Advanced - collapsed
    acuity: false, // Core - open
    refraction: true, // Advanced - collapsed
    pupils: true, // Advanced - collapsed
    motility: true, // Advanced - collapsed
    alignment: true, // Advanced - collapsed
    color: true, // Advanced - collapsed
    vf: true, // Advanced - collapsed
    iop: false, // Core - open
    dilation: true, // Advanced - collapsed
    gonio: true, // Advanced - collapsed
    anterior: false, // Core - open
    posterior: false, // Core - open
    tests: true, // Advanced - collapsed
    imagingStudies: true, // Advanced - collapsed
    diagnosis: false, // Core - open
    plan: false, // Core - open
    procedures: true, // Advanced - collapsed
    outcome: true, // Advanced - collapsed (discharge mode only)
    attachments: true // Advanced - collapsed
  });

  // Form data state
  const [formData, setFormData] = useState({
    doc_type: 'oph.initial',
    meta: {
      clinic_id: '',
      department_id: 'ophthalmology',
      physician_id: '',
      patient_id: '',
      encounter_id: '',
      datetime: new Date().toISOString()
    },
    chief_complaint: '',
    hpi: {
      description: '',
      ocular_history: '',
      systemic_history: '',
      meds: '',
      allergies: ''
    },
    external: {
      eyebrows: '',
      lids_lashes: '',
      lacrimal: '',
      orbit: ''
    },
    acuity: {
      distance: { sc: { OD: '', OS: '', OU: '' }, cc: { OD: '', OS: '', OU: '' } },
      near: { sc: { OD: '', OS: '', OU: '' }, cc: { OD: '', OS: '', OU: '' } },
      pinhole: { OD: '', OS: '' }
    },
    refraction: {
      cycloplegic: false,
      od: { sphere: '', cylinder: '', axis: '', add: '' },
      os: { sphere: '', cylinder: '', axis: '', add: '' },
      final_rx: { od: '', os: '', pd: '' }
    },
    pupils: {
      od: { size_mm: '', reaction: '', rapd: false, irregular: false },
      os: { size_mm: '', reaction: '', rapd: false, irregular: false }
    },
    motility: { versions: '', ductions: '', deviations: '' },
    alignment: {
      distance: { type: '', prism: '', axis: '' },
      near: { type: '', prism: '', axis: '' }
    },
    color_vision: { method: 'Ishihara', result: '', not_tested: false },
    confrontation_fields: { summary: '' },
    iop: {
      method: 'NCT',
      time: '',
      od: '',
      os: '',
      post_dilation: { time: '', od: '', os: '' }
    },
    dilation: { performed: false, agent: '', time: '' },
    gonioscopy: {
      performed: false,
      od: { shaffer: '', pigmentation: '', pas: false, notes: '' },
      os: { shaffer: '', pigmentation: '', pas: false, notes: '' }
    },
    anterior: {
      lids: '',
      conjunctiva: '',
      cornea: '',
      anterior_chamber: '',
      iris: '',
      lens: '',
      lens_grade: { nuclear: '', cortical: '', posterior_subcapsular: '' }
    },
    posterior: {
      vitreous: '',
      disc: '',
      cd_ratio: { OD: '', OS: '' },
      macula: '',
      vessels: '',
      periphery: '',
      dr_grade: '',
      amd_grade: ''
    },
    tests: {
      notes: '',
      keratometry: { k1: '', k2: '', axis: '' },
      pachymetry: { cct_od: '', cct_os: '' },
      oct: { rnfl_od: '', rnfl_os: '', gcipl_od: '', gcipl_os: '' },
      imaging: [],
      referenced_docs: []
    },
    imaging_links: [],
    diagnosis: {
      main: { code: '', term: '' }, // Changed to object to support ICD codes
      secondary: [], // Array of { code: '', term: '' } objects
      codes: []
    },
    plan: {
      meds: [],
      procedures_planned: [],
      counseling: [],
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

  // Available imaging studies (to be fetched from API)
  const [availableImaging, setAvailableImaging] = useState([]);

  // Patient allergies and medications from database
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [patientMedications, setPatientMedications] = useState([]);
  const [loadingAllergies, setLoadingAllergies] = useState(false);
  const [loadingMedications, setLoadingMedications] = useState(false);

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
    if (patient || encounter) {
      const clinicId = localStorage.getItem('clinic_id') || encounter?.clinic_id || 'default-clinic';
      const patientId = patient?.id || patient?.patient_id || encounter?.patient_id || '';
      
      setFormData(prev => ({
        ...prev,
        meta: {
          clinic_id: clinicId,
          department_id: 'ophthalmology',
          physician_id: encounter?.doctor_id || '',
          patient_id: patientId,
          encounter_id: encounter?.id || '',
          datetime: encounter?.datetime || new Date().toISOString()
        }
      }));
    }
  }, [patient, encounter]);

  // Fetch patient allergies and medications from database
  useEffect(() => {
    const fetchPatientData = async () => {
      const patientId = patient?.id || patient?.patient_id || encounter?.patient_id || '';
      if (!patientId) return;

      try {
        // Fetch allergies
        setLoadingAllergies(true);
        const allergies = await doctorPatientsAPI.getAllergies(patientId);
        console.log('Fetched allergies:', allergies);
        // Handle both SuccessResponse format and direct array
        const allergiesArray = Array.isArray(allergies) 
          ? allergies 
          : (allergies?.data && Array.isArray(allergies.data) 
            ? allergies.data 
            : []);
        console.log('Processed allergies array:', allergiesArray);
        setPatientAllergies(allergiesArray);
      } catch (error) {
        console.error('Error fetching patient allergies:', error);
        setPatientAllergies([]);
      } finally {
        setLoadingAllergies(false);
      }

      try {
        // Fetch medications
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

    fetchPatientData();
  }, [patient, encounter]);

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'oph.discharge' : 'oph.initial'
    }));
  }, [mode]);

  // Auto-suggest gonioscopy if IOP > 21
  useEffect(() => {
    const iopOd = parseFloat(formData.iop.od) || 0;
    const iopOs = parseFloat(formData.iop.os) || 0;
    if ((iopOd > 21 || iopOs > 21) && !formData.gonioscopy.performed) {
      // Auto-suggest (user can still toggle off)
      // We'll show a helper message instead of auto-enabling
    }
  }, [formData.iop.od, formData.iop.os]);

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
    addToArray('imaging_links', imagingItem);
  }, [addToArray, getOhifUrl]);

  const removeImagingFromReport = useCallback((index) => {
    removeFromArray('imaging_links', index);
  }, [removeFromArray]);

  const openImagingViewer = useCallback((study) => {
    const url = getOhifUrl(study);
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  }, [getOhifUrl]);

  // Smart editor helpers
  const convertStringToMed = useCallback((str) => {
    if (typeof str === 'string') {
      return {
        med: str,
        conc_strength: '',
        route: 'topical',
        freq: '',
        duration: '',
        instructions: '',
        sendToPharmacy: false,
        pharmacyId: ''
      };
    }
    return str;
  }, []);

  const openMedEditor = useCallback((preset = {}, idx = null) => {
    setEditingMed({
      med: preset.med || '',
      conc_strength: preset.conc_strength || '',
      route: preset.route || 'topical',
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
      eye: preset.eye || 'OU',
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

    if (formData.gonioscopy.performed) {
      if (!formData.gonioscopy.od.shaffer) {
        newErrors.gonio_od_shaffer = 'OD Shaffer grade is required';
      }
      if (!formData.gonioscopy.os.shaffer) {
        newErrors.gonio_os_shaffer = 'OS Shaffer grade is required';
      }
    }

    // Axis validation (0-180)
    ['od', 'os'].forEach(eye => {
      const axis = Number(formData.refraction[eye].axis);
      if (formData.refraction[eye].axis && (isNaN(axis) || axis < 0 || axis > 180)) {
        newErrors[`axis_${eye}`] = 'Axis must be 0–180';
      }
    });

    // IOP validation (1-80 mmHg)
    ['od', 'os'].forEach(eye => {
      const v = Number(formData.iop[eye]);
      if (formData.iop[eye] && (isNaN(v) || v <= 0 || v > 80)) {
        newErrors[`iop_${eye}`] = 'IOP must be between 1–80 mmHg';
      }
    });

    // Pachymetry validation (300-800 μm)
    const cctod = Number(formData.tests.pachymetry.cct_od);
    const cctos = Number(formData.tests.pachymetry.cct_os);
    if (formData.tests.pachymetry.cct_od && (isNaN(cctod) || cctod < 300 || cctod > 800)) {
      newErrors.cct_od = 'CCT OD must be 300–800 μm';
    }
    if (formData.tests.pachymetry.cct_os && (isNaN(cctos) || cctos < 300 || cctos > 800)) {
      newErrors.cct_os = 'CCT OS must be 300–800 μm';
    }

    // PD validation (45-80 mm)
    const pd = Number(formData.refraction.final_rx.pd);
    if (formData.refraction.final_rx.pd && (isNaN(pd) || pd < 45 || pd > 80)) {
      newErrors.pd = 'PD should be 45–80 mm';
    }

    formData.imaging_links.forEach((imaging, index) => {
      if (!imaging.study_uid && !imaging.ohif_url) {
        newErrors[`imaging_${index}`] = 'Valid Study UID or OHIF URL is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  // Build payload - sanitize to ensure JSON-serializable
  const buildPayload = useCallback(() => {
    // Helper to deep clone and sanitize (remove functions, undefined, DOM elements, etc.)
    const sanitize = (obj, visited = new WeakSet()) => {
      if (obj === null || obj === undefined) return undefined;
      if (typeof obj === 'function') return undefined;
      if (typeof obj !== 'object') return obj;
      
      // Handle circular references
      if (visited.has(obj)) return undefined;
      
      // Handle Window and global objects (global doesn't exist in browser, only window)
      if (obj === window || obj === self || obj === globalThis) {
        return undefined;
      }
      
      // Handle DOM elements (HTMLElement, Node, etc.)
      if (obj instanceof HTMLElement || obj instanceof Node || (obj.nodeType !== undefined && obj.nodeType !== null)) {
        return undefined;
      }
      
      // Handle React elements
      if (obj.$$typeof || obj._owner || (obj.props && obj.$$typeof)) {
        return undefined;
      }
      
      // Handle Date
      if (obj instanceof Date) return obj.toISOString();
      
      visited.add(obj);
      
      try {
        if (Array.isArray(obj)) {
          return obj.map(item => sanitize(item, visited)).filter(item => item !== undefined);
        }
        const sanitized = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            // Skip React internal properties
            if (key.startsWith('__react') || key.startsWith('__') || key === 'stateNode' || key === 'ref' || key === '_owner' || key === 'window') {
              continue;
            }
            const value = sanitize(obj[key], visited);
            if (value !== undefined) {
              sanitized[key] = value;
            }
          }
        }
        return sanitized;
      } catch (e) {
        // If we can't sanitize (e.g., circular reference), return undefined
        console.warn('Failed to sanitize object:', e);
        return undefined;
      }
    };

    const payload = {
      doc_type: mode === 'discharge' ? 'oph.discharge' : 'oph.initial',
      meta: sanitize(formData.meta),
      chief_complaint: formData.chief_complaint || '',
      hpi: sanitize(formData.hpi),
      external: sanitize(formData.external),
      acuity: sanitize(formData.acuity),
      refraction: sanitize(formData.refraction),
      pupils: sanitize(formData.pupils),
      motility: sanitize(formData.motility),
      alignment: sanitize(formData.alignment),
      color_vision: sanitize(formData.color_vision),
      confrontation_fields: sanitize(formData.confrontation_fields),
      iop: sanitize(formData.iop),
      dilation: sanitize(formData.dilation),
      gonioscopy: sanitize(formData.gonioscopy),
      anterior: sanitize(formData.anterior),
      posterior: sanitize(formData.posterior),
      tests: sanitize(formData.tests),
      imaging_links: (formData.imaging_links || []).map(s => sanitize({
        study_uid: s.study_uid,
        modality: s.modality,
        date: s.date,
        description: s.description,
        ohif_url: s.ohif_url,
        diagnostic_report_id: s.diagnostic_report_id,
        attach: s.attach,
        note: s.note || ''
      })),
      diagnosis: sanitize(formData.diagnosis),
      procedures_done: sanitize(formData.procedures_done) || [],
      attachments: sanitize(formData.attachments) || []
    };

    if (mode === 'initial') {
      payload.plan = sanitize(formData.plan);
    } else {
      payload.outcome = sanitize(formData.outcome);
      if (formData.recommendations?.length) {
        payload.recommendations = sanitize(formData.recommendations);
      }
    }

    return payload;
  }, [formData, mode]);

  // Autosave every 30 seconds (stable interval)
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
    console.log('handleFinalize called');
    
    // Validate form first
    const isValid = validateForm();
    console.log('Validation result:', isValid);
    console.log('Current errors:', errors);
    
    if (!isValid) {
      // Show validation errors to user
      const errorMessages = Object.values(errors).filter(Boolean);
      if (errorMessages.length > 0) {
        alert('Please fix the following errors before saving:\n\n' + errorMessages.join('\n'));
      } else {
        alert('Please fill in all required fields before saving.');
      }
      // Scroll to first error field
      const firstErrorField = document.querySelector('[data-error]') || document.querySelector('.text-red-500');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
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
      if (payload && (payload._reactName || payload.nativeEvent || payload.type === 'click')) {
        console.error('ERROR: buildPayload() returned an event object! This should not happen.', payload);
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
      alert('Error: Save handler is not available. Please refresh the page and try again.');
      }
  }, [validateForm, buildPayload, onSave, errors]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // IOP helper to check if gonioscopy should be suggested
  const shouldSuggestGonio = () => {
    const iopOd = parseFloat(formData.iop.od) || 0;
    const iopOs = parseFloat(formData.iop.os) || 0;
    return (iopOd > 21 || iopOs > 21) && !formData.gonioscopy.performed;
  };

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
      <Card title={t('ophthalmologyReport.title') || 'Ophthalmology Report'} className="mb-6" darkMode={darkMode}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.mode')}</FieldLabel>
            <Select
              name="mode"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
              options={[
                { value: 'initial', label: t('ophthalmologyReport.initialAssessment') },
                { value: 'discharge', label: t('ophthalmologyReport.dischargeSummary') }
              ]}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Chief Complaint */}
      <Card title={t('ophthalmologyReport.chiefComplaint')} darkMode={darkMode}>
        <FieldLabel required darkMode={darkMode}>{t('ophthalmologyReport.chiefComplaint')}</FieldLabel>
        <Input
          name="chief_complaint"
          placeholder={t('ophthalmologyReport.chiefComplaintPlaceholder')}
          value={formData.chief_complaint}
          onChange={(e) => updateFormData('chief_complaint', e.target.value)}
          required
          darkMode={darkMode}
        />
        {errors.chief_complaint && (
          <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
        )}
      </Card>

      {/* History of Present Illness */}
      <Card 
        title={t('ophthalmologyReport.historyOfPresentIllness')} 
        collapsible 
        isOpen={!collapsedSections.hpi}
        onToggle={() => toggleSection('hpi')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.hpiDescription')}</FieldLabel>
            <div className="flex gap-2">
              <TextArea
                name="hpi_description"
                placeholder={t('ophthalmologyReport.hpiDescriptionPlaceholder')}
                value={formData.hpi.description}
                onChange={(e) => updateFormData('hpi.description', e.target.value)}
                rows={4}
                darkMode={darkMode}
              />
              <button
                type="button"
                disabled={!formData.chief_complaint.trim()}
                className={`px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('ophthalmologyReport.aiSuggest')}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.ocularHistory')}</FieldLabel>
              <TextArea
                name="ocular_history"
                placeholder={t('ophthalmologyReport.ocularHistoryPlaceholder')}
                value={formData.hpi.ocular_history}
                onChange={(e) => updateFormData('hpi.ocular_history', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.systemicHistory')}</FieldLabel>
              <TextArea
                name="systemic_history"
                placeholder={t('ophthalmologyReport.systemicHistoryPlaceholder')}
                value={formData.hpi.systemic_history}
                onChange={(e) => updateFormData('hpi.systemic_history', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.medications')}</FieldLabel>
              {patientMedications.length > 0 && (
                <div className={`mb-2 p-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-blue-900/30 border-blue-700' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>{t('ophthalmologyReport.fromPatientRecord')}</div>
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
                    {t('ophthalmologyReport.copyToForm')}
                  </button>
                </div>
              )}
              <TextArea
                name="meds"
                placeholder={t('ophthalmologyReport.medicationsPlaceholder')}
                value={formData.hpi.meds}
                onChange={(e) => updateFormData('hpi.meds', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.allergies')}</FieldLabel>
              {patientAllergies.length > 0 && (
                <div className={`mb-2 p-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-amber-900/30 border-amber-700' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${
                    darkMode ? 'text-amber-300' : 'text-amber-800'
                  }`}>{t('ophthalmologyReport.fromPatientRecord')}</div>
                  <div className="space-y-1">
                    {patientAllergies.map((allergy, idx) => (
                      <div key={idx} className={`text-xs ${
                        darkMode ? 'text-amber-300' : 'text-amber-700'
                      }`}>
                        • {allergy.display_name}
                        {allergy.criticality && ` (${allergy.criticality})`}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allergiesText = patientAllergies.map(a => a.display_name).join(', ');
                      updateFormData('hpi.allergies', allergiesText);
                    }}
                    className={`mt-1 text-xs underline ${
                      darkMode 
                        ? 'text-amber-400 hover:text-amber-300' 
                        : 'text-amber-600 hover:text-amber-800'
                    }`}
                  >
                    {t('ophthalmologyReport.copyToForm')}
                  </button>
                </div>
              )}
              <TextArea
                name="allergies"
                placeholder={t('ophthalmologyReport.allergiesPlaceholder')}
                value={formData.hpi.allergies}
                onChange={(e) => updateFormData('hpi.allergies', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* External / Adnexa */}
      <Card 
        title={t('ophthalmologyReport.externalAdnexa')} 
        collapsible 
        isOpen={!collapsedSections.external}
        onToggle={() => toggleSection('external')}
        darkMode={darkMode}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.eyebrows')}</FieldLabel>
            <Input
              name="eyebrows"
              placeholder={t('ophthalmologyReport.eyebrowsPlaceholder')}
              value={formData.external.eyebrows}
              onChange={(e) => updateFormData('external.eyebrows', e.target.value)}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.lidsLashes')}</FieldLabel>
            <Input
              name="lids_lashes"
              placeholder={t('ophthalmologyReport.lidsLashesPlaceholder')}
              value={formData.external.lids_lashes}
              onChange={(e) => updateFormData('external.lids_lashes', e.target.value)}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.lacrimal')}</FieldLabel>
            <Input
              name="lacrimal"
              placeholder={t('ophthalmologyReport.lacrimalPlaceholder')}
              value={formData.external.lacrimal}
              onChange={(e) => updateFormData('external.lacrimal', e.target.value)}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.orbit')}</FieldLabel>
            <Input
              name="orbit"
              placeholder={t('ophthalmologyReport.orbitPlaceholder')}
              value={formData.external.orbit}
              onChange={(e) => updateFormData('external.orbit', e.target.value)}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Visual Acuity */}
      <Card 
        title={t('ophthalmologyReport.visualAcuity')} 
        collapsible 
        isOpen={!collapsedSections.acuity}
        onToggle={() => toggleSection('acuity')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.distanceVisionSC')}</FieldLabel>
            <div className="grid grid-cols-3 gap-4">
              {['OD', 'OS', 'OU'].map(eye => (
                <div key={eye}>
                  <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
                  <Select
                    name={`acuity_distance_sc_${eye}`}
                    value={formData.acuity.distance.sc[eye]}
                    onChange={(e) => updateFormData(`acuity.distance.sc.${eye}`, e.target.value)}
                    options={VA_PRESETS.map(va => ({ value: va, label: va }))}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.distanceVisionCC')}</FieldLabel>
            <div className="grid grid-cols-3 gap-4">
              {['OD', 'OS', 'OU'].map(eye => (
                <div key={eye}>
                  <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
                  <Select
                    name={`acuity_distance_cc_${eye}`}
                    value={formData.acuity.distance.cc[eye]}
                    onChange={(e) => updateFormData(`acuity.distance.cc.${eye}`, e.target.value)}
                    options={VA_PRESETS.map(va => ({ value: va, label: va }))}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.nearVisionSC')}</FieldLabel>
            <div className="grid grid-cols-3 gap-4">
              {['OD', 'OS', 'OU'].map(eye => (
                <div key={eye}>
                  <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
                  <Select
                    name={`acuity_near_sc_${eye}`}
                    value={formData.acuity.near.sc[eye]}
                    onChange={(e) => updateFormData(`acuity.near.sc.${eye}`, e.target.value)}
                    options={NEAR_PRESETS.map(n => ({ value: n, label: n }))}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.nearVisionCC')}</FieldLabel>
            <div className="grid grid-cols-3 gap-4">
              {['OD', 'OS', 'OU'].map(eye => (
                <div key={eye}>
                  <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
                  <Select
                    name={`acuity_near_cc_${eye}`}
                    value={formData.acuity.near.cc[eye]}
                    onChange={(e) => updateFormData(`acuity.near.cc.${eye}`, e.target.value)}
                    options={NEAR_PRESETS.map(n => ({ value: n, label: n }))}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.pinhole')}</FieldLabel>
            <div className="grid grid-cols-2 gap-4">
              {['OD', 'OS'].map(eye => (
                <div key={eye}>
                  <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
                  <Select
                    name={`acuity_pinhole_${eye}`}
                    value={formData.acuity.pinhole[eye]}
                    onChange={(e) => updateFormData(`acuity.pinhole.${eye}`, e.target.value)}
                    options={VA_PRESETS.map(va => ({ value: va, label: va }))}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Refraction */}
      <Card 
        title={t('ophthalmologyReport.refraction')} 
        collapsible 
        isOpen={!collapsedSections.refraction}
        onToggle={() => toggleSection('refraction')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.refraction.cycloplegic}
              onChange={(e) => updateFormData('refraction.cycloplegic', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.cycloplegic')}</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['OD', 'OS'].map(eye => (
              <div key={eye} className={`border rounded-lg p-4 ${
                darkMode ? 'border-slate-700' : 'border-slate-200'
              }`}>
                <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.sphere')}</FieldLabel>
                    <Input
                      name={`refraction_${eye.toLowerCase()}_sphere`}
                      placeholder="±XX.XX"
                      value={formData.refraction[eye.toLowerCase()].sphere}
                      onChange={(e) => updateFormData(`refraction.${eye.toLowerCase()}.sphere`, e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.cylinder')}</FieldLabel>
                    <Input
                      name={`refraction_${eye.toLowerCase()}_cylinder`}
                      placeholder="±XX.XX"
                      value={formData.refraction[eye.toLowerCase()].cylinder}
                      onChange={(e) => updateFormData(`refraction.${eye.toLowerCase()}.cylinder`, e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.axis')}</FieldLabel>
                    <Input
                      name={`refraction_${eye.toLowerCase()}_axis`}
                      placeholder="0-180"
                      value={formData.refraction[eye.toLowerCase()].axis}
                      onChange={(e) => updateFormData(`refraction.${eye.toLowerCase()}.axis`, e.target.value)}
                      darkMode={darkMode}
                    />
                    {errors[`axis_${eye.toLowerCase()}`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`axis_${eye.toLowerCase()}`]}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.add')}</FieldLabel>
                    <Input
                      name={`refraction_${eye.toLowerCase()}_add`}
                      placeholder="+X.XX"
                      value={formData.refraction[eye.toLowerCase()].add}
                      onChange={(e) => updateFormData(`refraction.${eye.toLowerCase()}.add`, e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.finalRxOD')}</FieldLabel>
              <Input
                name="final_rx_od"
                placeholder={t('ophthalmologyReport.finalPrescriptionOD')}
                value={formData.refraction.final_rx.od}
                onChange={(e) => updateFormData('refraction.final_rx.od', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.finalRxOS')}</FieldLabel>
              <Input
                name="final_rx_os"
                placeholder={t('ophthalmologyReport.finalPrescriptionOS')}
                value={formData.refraction.final_rx.os}
                onChange={(e) => updateFormData('refraction.final_rx.os', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.pd')}</FieldLabel>
              <Input
                name="final_rx_pd"
                placeholder={t('ophthalmologyReport.pupillaryDistance')}
                value={formData.refraction.final_rx.pd}
                onChange={(e) => updateFormData('refraction.final_rx.pd', e.target.value)}
                darkMode={darkMode}
              />
              {errors.pd && (
                <p className="text-red-500 text-sm mt-1">{errors.pd}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Pupils */}
      <Card 
        title={t('ophthalmologyReport.pupils')} 
        collapsible 
        isOpen={!collapsedSections.pupils}
        onToggle={() => toggleSection('pupils')}
        darkMode={darkMode}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['OD', 'OS'].map(eye => (
            <div key={eye} className={`border rounded-lg p-4 ${
              darkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
              <div className="space-y-4">
                <div>
                  <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.sizeMM')}</FieldLabel>
                  <Input
                    name={`pupils_${eye.toLowerCase()}_size`}
                    placeholder="XX mm"
                    value={formData.pupils[eye.toLowerCase()].size_mm}
                    onChange={(e) => updateFormData(`pupils.${eye.toLowerCase()}.size_mm`, e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
                <div>
                  <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.reaction')}</FieldLabel>
                  <Input
                    name={`pupils_${eye.toLowerCase()}_reaction`}
                    placeholder="PERRLA, sluggish, etc."
                    value={formData.pupils[eye.toLowerCase()].reaction}
                    onChange={(e) => updateFormData(`pupils.${eye.toLowerCase()}.reaction`, e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.pupils[eye.toLowerCase()].rapd}
                    onChange={(e) => updateFormData(`pupils.${eye.toLowerCase()}.rapd`, e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.rapd')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.pupils[eye.toLowerCase()].irregular}
                    onChange={(e) => updateFormData(`pupils.${eye.toLowerCase()}.irregular`, e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.irregular')}</label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Motility */}
      <Card 
        title={t('ophthalmologyReport.motility')} 
        collapsible 
        isOpen={!collapsedSections.motility}
        onToggle={() => toggleSection('motility')}
        darkMode={darkMode}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.versions')}</FieldLabel>
            <TextArea
              name="motility_versions"
              placeholder={t('ophthalmologyReport.versionsPlaceholder')}
              value={formData.motility.versions}
              onChange={(e) => updateFormData('motility.versions', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.ductions')}</FieldLabel>
            <TextArea
              name="motility_ductions"
              placeholder={t('ophthalmologyReport.ductionsPlaceholder')}
              value={formData.motility.ductions}
              onChange={(e) => updateFormData('motility.ductions', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.deviations')}</FieldLabel>
            <TextArea
              name="motility_deviations"
              placeholder={t('ophthalmologyReport.deviationsPlaceholder')}
              value={formData.motility.deviations}
              onChange={(e) => updateFormData('motility.deviations', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Alignment */}
      <Card 
        title={t('ophthalmologyReport.alignment')} 
        collapsible 
        isOpen={!collapsedSections.alignment}
        onToggle={() => toggleSection('alignment')}
        darkMode={darkMode}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.distance')}</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              <Input
                name="alignment_distance_type"
                placeholder={t('ophthalmologyReport.typeXTETHT')}
                value={formData.alignment.distance.type}
                onChange={(e) => updateFormData('alignment.distance.type', e.target.value)}
                darkMode={darkMode}
              />
              <Input
                name="alignment_distance_prism"
                placeholder={t('ophthalmologyReport.prism')}
                value={formData.alignment.distance.prism}
                onChange={(e) => updateFormData('alignment.distance.prism', e.target.value)}
                darkMode={darkMode}
              />
              <Input
                name="alignment_distance_axis"
                placeholder={t('ophthalmologyReport.axis')}
                value={formData.alignment.distance.axis}
                onChange={(e) => updateFormData('alignment.distance.axis', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.near')}</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              <Input
                name="alignment_near_type"
                placeholder={t('ophthalmologyReport.typeXTETHT')}
                value={formData.alignment.near.type}
                onChange={(e) => updateFormData('alignment.near.type', e.target.value)}
                darkMode={darkMode}
              />
              <Input
                name="alignment_near_prism"
                placeholder={t('ophthalmologyReport.prism')}
                value={formData.alignment.near.prism}
                onChange={(e) => updateFormData('alignment.near.prism', e.target.value)}
                darkMode={darkMode}
              />
              <Input
                name="alignment_near_axis"
                placeholder={t('ophthalmologyReport.axis')}
                value={formData.alignment.near.axis}
                onChange={(e) => updateFormData('alignment.near.axis', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Color Vision */}
      <Card 
        title={t('ophthalmologyReport.colorVision')} 
        collapsible 
        isOpen={!collapsedSections.color}
        onToggle={() => toggleSection('color')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.color_vision.not_tested}
              onChange={(e) => updateFormData('color_vision.not_tested', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.notTested')}</label>
          </div>
          {!formData.color_vision.not_tested && (
            <>
              <div>
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.method')}</FieldLabel>
                <Select
                  name="color_vision_method"
                  value={formData.color_vision.method}
                  onChange={(e) => updateFormData('color_vision.method', e.target.value)}
                  options={[
                    { value: 'Ishihara', label: t('ophthalmologyReport.ishihara') },
                    { value: 'D-15', label: t('ophthalmologyReport.d15') },
                    { value: 'Other', label: t('ophthalmologyReport.other') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.result')}</FieldLabel>
                <Input
                  name="color_vision_result"
                  placeholder={t('ophthalmologyReport.testResults')}
                  value={formData.color_vision.result}
                  onChange={(e) => updateFormData('color_vision.result', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Confrontation Fields */}
      <Card 
        title={t('ophthalmologyReport.confrontationFields')} 
        collapsible 
        isOpen={!collapsedSections.vf}
        onToggle={() => toggleSection('vf')}
        darkMode={darkMode}
      >
        <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.summary')}</FieldLabel>
        <TextArea
          name="confrontation_fields"
          placeholder={t('ophthalmologyReport.fullDefectDescription')}
          value={formData.confrontation_fields.summary}
          onChange={(e) => updateFormData('confrontation_fields.summary', e.target.value)}
          rows={3}
          darkMode={darkMode}
        />
      </Card>

      {/* IOP */}
      <Card 
        title={t('ophthalmologyReport.intraocularPressure')} 
        collapsible 
        isOpen={!collapsedSections.iop}
        onToggle={() => toggleSection('iop')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.iopMethod')}</FieldLabel>
              <Select
                name="iop_method"
                value={formData.iop.method}
                onChange={(e) => updateFormData('iop.method', e.target.value)}
                options={[
                  { value: 'NCT', label: t('ophthalmologyReport.nct') },
                  { value: 'Applanation', label: t('ophthalmologyReport.applanation') },
                  { value: 'Tono-Pen', label: t('ophthalmologyReport.tonoPen') },
                  { value: 'iCare', label: t('ophthalmologyReport.iCare') },
                  { value: 'Other', label: t('ophthalmologyReport.other') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.time')}</FieldLabel>
              <Input
                name="iop_time"
                type="time"
                value={formData.iop.time}
                onChange={(e) => updateFormData('iop.time', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.odMMHG')}</FieldLabel>
              <Input
                name="iop_od"
                type="number"
                placeholder="XX"
                value={formData.iop.od}
                onChange={(e) => updateFormData('iop.od', e.target.value)}
                darkMode={darkMode}
              />
              {errors.iop_od && (
                <p className="text-red-500 text-sm mt-1">{errors.iop_od}</p>
              )}
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.osMMHG')}</FieldLabel>
              <Input
                name="iop_os"
                type="number"
                placeholder="XX"
                value={formData.iop.os}
                onChange={(e) => updateFormData('iop.os', e.target.value)}
                darkMode={darkMode}
              />
              {errors.iop_os && (
                <p className="text-red-500 text-sm mt-1">{errors.iop_os}</p>
              )}
            </div>
          </div>
          {shouldSuggestGonio() && (
            <div className={`border rounded-lg p-3 ${
              darkMode 
                ? 'bg-amber-900/30 border-amber-700' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <p className={`text-sm ${
                darkMode ? 'text-amber-300' : 'text-amber-800'
              }`}>
                {t('ophthalmologyReport.iopWarning')}
              </p>
            </div>
          )}
          {formData.dilation.performed && (
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.postDilationTime')}</FieldLabel>
                <Input
                  type="time"
                  value={formData.iop.post_dilation.time}
                  onChange={(e) => updateFormData('iop.post_dilation.time', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.postDilationOD')}</FieldLabel>
                <Input
                  type="number"
                  placeholder="mmHg"
                  value={formData.iop.post_dilation.od}
                  onChange={(e) => updateFormData('iop.post_dilation.od', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.postDilationOS')}</FieldLabel>
                <Input
                  type="number"
                  placeholder="mmHg"
                  value={formData.iop.post_dilation.os}
                  onChange={(e) => updateFormData('iop.post_dilation.os', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Dilation */}
      <Card 
        title={t('ophthalmologyReport.dilation')} 
        collapsible 
        isOpen={!collapsedSections.dilation}
        onToggle={() => toggleSection('dilation')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.dilation.performed}
              onChange={(e) => updateFormData('dilation.performed', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.dilationPerformed')}</label>
          </div>
          {formData.dilation.performed && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.agent')}</FieldLabel>
                  <Input
                    name="dilation_agent"
                    placeholder={t('ophthalmologyReport.agentPlaceholder')}
                    value={formData.dilation.agent}
                    onChange={(e) => updateFormData('dilation.agent', e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
                <div>
                  <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.time')}</FieldLabel>
                  <Input
                    name="dilation_time"
                    type="time"
                    value={formData.dilation.time}
                    onChange={(e) => updateFormData('dilation.time', e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Gonioscopy */}
      <Card 
        title={t('ophthalmologyReport.gonioscopy')} 
        collapsible 
        isOpen={!collapsedSections.gonio}
        onToggle={() => toggleSection('gonio')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.gonioscopy.performed}
              onChange={(e) => updateFormData('gonioscopy.performed', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.gonioscopyPerformed')}</label>
          </div>
          {formData.gonioscopy.performed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['OD', 'OS'].map(eye => (
                <div key={eye} className={`border rounded-lg p-4 ${
                  darkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <FieldLabel darkMode={darkMode}>{t(`ophthalmologyReport.${eye.toLowerCase()}`)}</FieldLabel>
                  <div className="space-y-4">
                    <div>
                      <FieldLabel required darkMode={darkMode}>{t('ophthalmologyReport.shafferGrade')}</FieldLabel>
                      <Select
                        name={`gonio_${eye.toLowerCase()}_shaffer`}
                        value={formData.gonioscopy[eye.toLowerCase()].shaffer}
                        onChange={(e) => updateFormData(`gonioscopy.${eye.toLowerCase()}.shaffer`, e.target.value)}
                        options={GONIO_SHAFFER.map(g => ({ value: g, label: `${t('ophthalmologyReport.grade')} ${g}` }))}
                        required
                        darkMode={darkMode}
                      />
                      {errors[`gonio_${eye.toLowerCase()}_shaffer`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`gonio_${eye.toLowerCase()}_shaffer`]}</p>
                      )}
                    </div>
                    <div>
                      <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.pigmentation')}</FieldLabel>
                      <Input
                        name={`gonio_${eye.toLowerCase()}_pigmentation`}
                        placeholder={t('ophthalmologyReport.pigmentationGrade')}
                        value={formData.gonioscopy[eye.toLowerCase()].pigmentation}
                        onChange={(e) => updateFormData(`gonioscopy.${eye.toLowerCase()}.pigmentation`, e.target.value)}
                        darkMode={darkMode}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.gonioscopy[eye.toLowerCase()].pas}
                        onChange={(e) => updateFormData(`gonioscopy.${eye.toLowerCase()}.pas`, e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.pas')}</label>
                    </div>
                    <div>
                      <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.notes')}</FieldLabel>
                      <TextArea
                        name={`gonio_${eye.toLowerCase()}_notes`}
                        placeholder={t('ophthalmologyReport.additionalNotes')}
                        value={formData.gonioscopy[eye.toLowerCase()].notes}
                        onChange={(e) => updateFormData(`gonioscopy.${eye.toLowerCase()}.notes`, e.target.value)}
                        rows={2}
                        darkMode={darkMode}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Anterior Segment */}
      <Card 
        title={t('ophthalmologyReport.anteriorSegment')} 
        collapsible 
        isOpen={!collapsedSections.anterior}
        onToggle={() => toggleSection('anterior')}
        darkMode={darkMode}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.lids')}</FieldLabel>
            <TextArea
              name="anterior_lids"
              placeholder={t('ophthalmologyReport.lidsExamination')}
              value={formData.anterior.lids}
              onChange={(e) => updateFormData('anterior.lids', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.conjunctiva')}</FieldLabel>
            <TextArea
              name="anterior_conjunctiva"
              placeholder={t('ophthalmologyReport.conjunctiva')}
              value={formData.anterior.conjunctiva}
              onChange={(e) => updateFormData('anterior.conjunctiva', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.cornea')}</FieldLabel>
            <TextArea
              name="anterior_cornea"
              placeholder={t('ophthalmologyReport.corneaExamination')}
              value={formData.anterior.cornea}
              onChange={(e) => updateFormData('anterior.cornea', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.anteriorChamber')}</FieldLabel>
            <TextArea
              name="anterior_chamber"
              placeholder={t('ophthalmologyReport.acDepthCellsFlare')}
              value={formData.anterior.anterior_chamber}
              onChange={(e) => updateFormData('anterior.anterior_chamber', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.iris')}</FieldLabel>
            <TextArea
              name="anterior_iris"
              placeholder={t('ophthalmologyReport.irisExamination')}
              value={formData.anterior.iris}
              onChange={(e) => updateFormData('anterior.iris', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.lens')}</FieldLabel>
            <TextArea
              name="anterior_lens"
              placeholder={t('ophthalmologyReport.lensClarityOpacities')}
              value={formData.anterior.lens}
              onChange={(e) => updateFormData('anterior.lens', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Posterior Segment */}
      <Card 
        title={t('ophthalmologyReport.posteriorSegment')} 
        collapsible 
        isOpen={!collapsedSections.posterior}
        onToggle={() => toggleSection('posterior')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          {!formData.dilation.performed && (
            <div className={`border rounded-lg p-3 ${
              darkMode 
                ? 'bg-amber-900/30 border-amber-700' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <p className={`text-sm ${
                darkMode ? 'text-amber-300' : 'text-amber-800'
              }`}>
                {t('ophthalmologyReport.dilationNote')}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.vitreous')}</FieldLabel>
              <TextArea
                name="posterior_vitreous"
                placeholder={t('ophthalmologyReport.vitreousExamination')}
                value={formData.posterior.vitreous}
                onChange={(e) => updateFormData('posterior.vitreous', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.disc')}</FieldLabel>
              <TextArea
                name="posterior_disc"
                placeholder={t('ophthalmologyReport.opticDiscAppearance')}
                value={formData.posterior.disc}
                onChange={(e) => updateFormData('posterior.disc', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.cdRatio')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.od')}</FieldLabel>
                  <Input
                    name="posterior_cd_ratio_od"
                    placeholder="e.g., 0.3"
                    value={formData.posterior.cd_ratio.OD}
                    onChange={(e) => updateFormData('posterior.cd_ratio.OD', e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
                <div>
                  <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.os')}</FieldLabel>
                  <Input
                    name="posterior_cd_ratio_os"
                    placeholder="e.g., 0.3"
                    value={formData.posterior.cd_ratio.OS}
                    onChange={(e) => updateFormData('posterior.cd_ratio.OS', e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
              </div>
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.macula')}</FieldLabel>
              <TextArea
                name="posterior_macula"
                placeholder={t('ophthalmologyReport.maculaExamination')}
                value={formData.posterior.macula}
                onChange={(e) => updateFormData('posterior.macula', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.vessels')}</FieldLabel>
              <TextArea
                name="posterior_vessels"
                placeholder={t('ophthalmologyReport.retinalVessels')}
                value={formData.posterior.vessels}
                onChange={(e) => updateFormData('posterior.vessels', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.periphery')}</FieldLabel>
              <TextArea
                name="posterior_periphery"
                placeholder={t('ophthalmologyReport.peripheralRetina')}
                value={formData.posterior.periphery}
                onChange={(e) => updateFormData('posterior.periphery', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.diabeticRetinopathyGrade')}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'No DR', label: t('ophthalmologyReport.noDR') },
                  { value: 'Mild NPDR', label: t('ophthalmologyReport.mildNPDR') },
                  { value: 'Mod NPDR', label: t('ophthalmologyReport.modNPDR') },
                  { value: 'Severe NPDR', label: t('ophthalmologyReport.severeNPDR') },
                  { value: 'PDR', label: t('ophthalmologyReport.pdr') }
                ].map(grade => (
                  <button
                    key={grade.value}
                    type="button"
                    className={`px-3 py-1 rounded text-sm ${
                      formData.posterior.dr_grade === grade.value
                        ? 'bg-emerald-600 text-white'
                        : darkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    onClick={() => updateFormData('posterior.dr_grade', grade.value)}
                  >
                    {grade.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.amdGrade')}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'No AMD', label: t('ophthalmologyReport.noAMD') },
                  { value: 'Early', label: t('ophthalmologyReport.early') },
                  { value: 'Intermediate', label: t('ophthalmologyReport.intermediate') },
                  { value: 'Advanced', label: t('ophthalmologyReport.advanced') }
                ].map(grade => (
                  <button
                    key={grade.value}
                    type="button"
                    className={`px-3 py-1 rounded text-sm ${
                      formData.posterior.amd_grade === grade.value
                        ? 'bg-emerald-600 text-white'
                        : darkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    onClick={() => updateFormData('posterior.amd_grade', grade.value)}
                  >
                    {grade.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Imaging & Tests */}
      <Card 
        title={t('ophthalmologyReport.imagingTests')} 
        collapsible 
        isOpen={!collapsedSections.tests}
        onToggle={() => toggleSection('tests')}
        counter={formData.tests.imaging.length + formData.tests.referenced_docs.length}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.testNotes')}</FieldLabel>
            <TextArea
              name="tests_notes"
              placeholder={t('ophthalmologyReport.additionalTestNotes')}
              value={formData.tests.notes}
              onChange={(e) => updateFormData('tests.notes', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.keratometry')}</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  name="keratometry_k1"
                  placeholder="K1"
                  value={formData.tests.keratometry.k1}
                  onChange={(e) => updateFormData('tests.keratometry.k1', e.target.value)}
                  darkMode={darkMode}
                />
                <Input
                  name="keratometry_k2"
                  placeholder="K2"
                  value={formData.tests.keratometry.k2}
                  onChange={(e) => updateFormData('tests.keratometry.k2', e.target.value)}
                  darkMode={darkMode}
                />
                <Input
                  name="keratometry_axis"
                  placeholder="Axis"
                  value={formData.tests.keratometry.axis}
                  onChange={(e) => updateFormData('tests.keratometry.axis', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.pachymetry')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    name="pachymetry_od"
                    placeholder={t('ophthalmologyReport.cctOD')}
                    value={formData.tests.pachymetry.cct_od}
                    onChange={(e) => updateFormData('tests.pachymetry.cct_od', e.target.value)}
                    darkMode={darkMode}
                  />
                  {errors.cct_od && (
                    <p className="text-red-500 text-sm mt-1">{errors.cct_od}</p>
                  )}
                </div>
                <div>
                  <Input
                    name="pachymetry_os"
                    placeholder={t('ophthalmologyReport.cctOS')}
                    value={formData.tests.pachymetry.cct_os}
                    onChange={(e) => updateFormData('tests.pachymetry.cct_os', e.target.value)}
                    darkMode={darkMode}
                  />
                  {errors.cct_os && (
                    <p className="text-red-500 text-sm mt-1">{errors.cct_os}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.octMeasurements')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Input
                name="oct_rnfl_od"
                placeholder={t('ophthalmologyReport.rnflOD')}
                value={formData.tests.oct.rnfl_od}
                onChange={(e) => updateFormData('tests.oct.rnfl_od', e.target.value)}
                darkMode={darkMode}
              />
              <Input
                name="oct_rnfl_os"
                placeholder={t('ophthalmologyReport.rnflOS')}
                value={formData.tests.oct.rnfl_os}
                onChange={(e) => updateFormData('tests.oct.rnfl_os', e.target.value)}
                darkMode={darkMode}
              />
              <Input
                name="oct_gcipl_od"
                placeholder={t('ophthalmologyReport.gciplOD')}
                value={formData.tests.oct.gcipl_od}
                onChange={(e) => updateFormData('tests.oct.gcipl_od', e.target.value)}
                darkMode={darkMode}
              />
              <Input
                name="oct_gcipl_os"
                placeholder={t('ophthalmologyReport.gciplOS')}
                value={formData.tests.oct.gcipl_os}
                onChange={(e) => updateFormData('tests.oct.gcipl_os', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.imagingTestsLabel')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tests.imaging.map((test, i) => (
                <Chip key={i} onRemove={() => removeFromArray('tests.imaging', i)} darkMode={darkMode}>{test}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'OCT RNFL/Macula', label: t('ophthalmologyReport.octRnflMacula') },
                { value: 'HVF 24-2', label: t('ophthalmologyReport.hvf242') },
                { value: 'Fundus Photo', label: t('ophthalmologyReport.fundusPhoto') },
                { value: 'FFA', label: t('ophthalmologyReport.ffa') },
                { value: 'B-scan', label: t('ophthalmologyReport.bScan') },
                { value: 'Topography', label: t('ophthalmologyReport.topography') },
                { value: 'Biometry', label: t('ophthalmologyReport.biometry') }
              ].map(test => (
                <button
                  key={test.value}
                  type="button"
                  className={`px-3 py-1 rounded text-sm ${
                    darkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  onClick={() => {
                    if (!formData.tests.imaging.includes(test.value)) {
                      addToArray('tests.imaging', test.value);
                    }
                  }}
                >
                  {test.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.referencedDocuments')}</FieldLabel>
            <div className="space-y-2">
              {formData.tests.referenced_docs.map((doc, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 rounded ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-50'
                }`}>
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{doc.type}</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : ''}`}>{doc.title}</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{doc.date}</span>
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
                className={`px-3 py-2 border rounded-lg text-sm ${
                  darkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => addToArray('tests.referenced_docs', {
                  type: 'OCT',
                  title: 'OCT Report',
                  date: new Date().toISOString().split('T')[0]
                })}
              >
                {t('ophthalmologyReport.addReference')}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Imaging Studies */}
      <Card 
        title={t('ophthalmologyReport.imagingStudies')} 
        collapsible 
        isOpen={!collapsedSections.imagingStudies}
        onToggle={() => toggleSection('imagingStudies')}
        counter={formData.imaging_links.length}
        darkMode={darkMode}
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
              {t('ophthalmologyReport.loadImagingAuto')}
            </button>
            <input
              type="text"
              placeholder={t('ophthalmologyReport.searchStudies')}
              className={`flex-1 px-3 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.availableStudies')}</FieldLabel>
            <div className="space-y-2">
              {availableImaging.map((study, index) => (
                <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${
                  darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className={`font-medium ${darkMode ? 'text-slate-200' : ''}`}>{study.modality}</span>
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{study.date}</span>
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{study.description}</span>
                      <span className={`font-mono text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{study.study_uid}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      onClick={() => openImagingViewer(study)}
                    >
                      {t('ophthalmologyReport.openViewer')}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                      onClick={() => addImagingToReport(study)}
                    >
                      {t('ophthalmologyReport.addToReport')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.selectedStudies')}</FieldLabel>
            <div className="space-y-2">
              {formData.imaging_links.map((imaging, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 rounded ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-50'
                }`}>
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : ''}`}>{imaging.modality}</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{imaging.description}</span>
                  <select 
                    className={`text-xs border rounded px-1 py-0.5 ${
                      darkMode 
                        ? 'bg-slate-800 border-slate-600 text-slate-200' 
                        : 'bg-white border-slate-300 text-slate-600'
                    }`}
                    value={imaging.attach || 'reference_only'}
                    onChange={(e) => {
                      const next = clone(formData.imaging_links);
                      next[index].attach = e.target.value;
                      updateFormData('imaging_links', next);
                    }}
                  >
                    <option value="reference_only" className={darkMode ? 'bg-slate-800' : ''}>{t('ophthalmologyReport.referenceOnly')}</option>
                    <option value="embed_in_pdf" className={darkMode ? 'bg-slate-800' : ''}>{t('ophthalmologyReport.embedInPDF')}</option>
                  </select>
                  <input
                    className={`text-xs border rounded px-2 py-1 ${
                      darkMode 
                        ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-400' 
                        : 'bg-white border-slate-300 text-slate-600'
                    }`}
                    placeholder={t('ophthalmologyReport.note')}
                    value={imaging.note || ''}
                    onChange={(e) => {
                      const next = clone(formData.imaging_links);
                      next[index].note = e.target.value;
                      updateFormData('imaging_links', next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => openImagingViewer(imaging)}
                    className={darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}
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

      {/* Diagnosis */}
      <Card 
        title={t('ophthalmologyReport.diagnosis')} 
        collapsible 
        isOpen={!collapsedSections.diagnosis}
        onToggle={() => toggleSection('diagnosis')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel required darkMode={darkMode}>{t('ophthalmologyReport.mainDiagnosis')}</FieldLabel>
            <div className="space-y-2">
              {formData.diagnosis.main?.code || formData.diagnosis.main?.term ? (
                <div className="flex gap-2 items-start">
                  <div className="flex gap-2 items-start flex-1">
                    <Input
                      placeholder={t('ophthalmologyReport.icd11Code')}
                      value={typeof formData.diagnosis.main === 'object' ? (formData.diagnosis.main.code || '') : ''}
                      onChange={(e) => {
                        const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                        updateFormData('diagnosis.main', { ...current, code: e.target.value });
                      }}
                      className="w-40"
                      darkMode={darkMode}
                    />
                    <Input
                      placeholder={t('ophthalmologyReport.diagnosisTerm')}
                      value={typeof formData.diagnosis.main === 'object' ? (formData.diagnosis.main.term || '') : (typeof formData.diagnosis.main === 'string' ? formData.diagnosis.main : '')}
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
                    onClick={() => updateFormData('diagnosis.main', { code: '', term: '' })}
                    className={`px-3 py-2 rounded transition-colors ${
                      darkMode 
                        ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {t('ophthalmologyReport.clear')}
                  </button>
                </div>
              ) : null}
              <IcdCodeSearchInput
                placeholder={t('ophthalmologyReport.searchIcd11Code')}
                onSelect={(selected) => {
                  updateFormData('diagnosis.main', selected);
                }}
                darkMode={darkMode}
              />
            </div>
            {errors.diagnosis_main && (
              <p className="text-red-500 text-sm mt-1">{errors.diagnosis_main}</p>
            )}
          </div>
          
          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.secondaryDiagnoses')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.secondary.map((diag, index) => (
                <Chip
                  key={index}
                  onRemove={() => removeFromArray('diagnosis.secondary', index)}
                  darkMode={darkMode}
                >
                  {typeof diag === 'object' ? `${diag.code || ''} ${diag.term || ''}`.trim() : diag}
                </Chip>
              ))}
            </div>
            <IcdCodeSearchInput
              placeholder={t('ophthalmologyReport.searchIcd11Code')}
              onSelect={(selected) => {
                const currentSecondary = Array.isArray(formData.diagnosis.secondary) ? formData.diagnosis.secondary : [];
                addToArray('diagnosis.secondary', selected);
              }}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.diagnosisCodes')}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {formData.diagnosis.codes.map((code, index) => (
                <Chip
                  key={index}
                  onRemove={() => removeFromArray('diagnosis.codes', index)}
                  darkMode={darkMode}
                >
                  {code.system}: {code.code} - {code.term}
                </Chip>
              ))}
              <div className="flex gap-2">
                <select
                  className={`px-3 py-2 border rounded-lg text-sm ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-slate-200' 
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                  onChange={(e) => {
                    const selected = DIAGNOSIS_CODE_PRESETS[parseInt(e.target.value)];
                    if (selected) {
                      addToArray('diagnosis.codes', selected);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="" className={darkMode ? 'bg-slate-800' : ''}>Quick-add code...</option>
                  {DIAGNOSIS_CODE_PRESETS.map((preset, idx) => (
                    <option key={idx} value={idx} className={darkMode ? 'bg-slate-800' : ''}>
                      {preset.system}: {preset.code} - {preset.term}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`px-3 py-2 border rounded-lg text-sm ${
                    darkMode 
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                  onClick={() => addToArray('diagnosis.codes', {
                    system: 'ICD10',
                    code: '',
                    term: ''
                  })}
                >
                  + Add Custom
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Plan & Treatment (Initial mode only) */}
      {mode === 'initial' && (
        <Card 
          title={t('ophthalmologyReport.planTreatment')} 
          collapsible 
          isOpen={!collapsedSections.plan}
          onToggle={() => toggleSection('plan')}
          darkMode={darkMode}
        >
          <div className="space-y-4">
            {/* Medications */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.medicationsCount')} <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>({formData.plan.meds.length})</span></FieldLabel>
              <button 
                type="button" 
                onClick={() => openMedEditor()} 
                className={`px-4 py-2 rounded mb-3 ${
                  darkMode 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('ophthalmologyReport.addMedication')}
              </button>

              {formData.plan.meds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.meds.map((m, idx) => {
                    const obj = convertStringToMed(m);
                    const label = typeof m === 'string' ? m : `${obj.med} ${obj.conc_strength} ${obj.route}`;
                    return (
                      <Chip key={idx} onEdit={() => openMedEditor(obj, idx)} onRemove={() => removeMed(idx)} darkMode={darkMode}>
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
                      placeholder="Search medication..."
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
                      placeholder={t('ophthalmologyReport.concentrationStrength')} 
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
                        {value:'topical',label:t('ophthalmologyReport.topical')},
                        {value:'oral',label:t('ophthalmologyReport.oral')},
                        {value:'injection',label:t('ophthalmologyReport.injection')},
                        {value:'other',label:t('ophthalmologyReport.other')}
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('ophthalmologyReport.frequency')} 
                      value={editingMed.freq} 
                      onChange={(e) => setEditingMed(s => ({...s, freq: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('ophthalmologyReport.duration')} 
                      value={editingMed.duration} 
                      onChange={(e) => setEditingMed(s => ({...s, duration: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('ophthalmologyReport.instructions')} 
                      value={editingMed.instructions || ''} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={editingMed.sendToPharmacy || false} 
                      onChange={(e) => setEditingMed(s => ({...s, sendToPharmacy: e.target.checked}))} 
                      className="w-4 h-4 rounded"
                    />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('ophthalmologyReport.sendToPharmacy')}</span>
                  </div>
                  {editingMed.sendToPharmacy && (
                    <div className="col-span-12">
                      <Input 
                        placeholder={t('ophthalmologyReport.pharmacyID')} 
                        value={editingMed.pharmacyId || ''} 
                        onChange={(e) => setEditingMed(s => ({...s, pharmacyId: e.target.value}))}
                        darkMode={darkMode}
                      />
                    </div>
                  )}
                  <div className="col-span-12 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className={`px-4 py-2 border rounded-lg ${
                        darkMode 
                          ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => {setEditingMed(null); setEditingMedIdx(null);}}
                    >
                      {t('ophthalmologyReport.cancel')}
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" 
                      onClick={saveMed}
                    >
                      {t('ophthalmologyReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className={`my-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Procedures Planned */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.proceduresPlanned')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.plan.procedures_planned.map((proc, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('plan.procedures_planned', i)} darkMode={darkMode}>{proc}</Chip>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'YAG Capsulotomy', label: t('ophthalmologyReport.yagCapsulotomy') },
                  { value: 'PRP', label: t('ophthalmologyReport.prp') },
                  { value: 'IVT', label: t('ophthalmologyReport.ivt') },
                  { value: 'CXL', label: t('ophthalmologyReport.cxl') },
                  { value: 'Cataract Surgery', label: t('ophthalmologyReport.cataractSurgery') },
                  { value: 'Trabeculectomy', label: t('ophthalmologyReport.trabeculectomy') },
                  { value: 'Other', label: t('ophthalmologyReport.other') }
                ].map(proc => (
                  <button
                    key={proc.value}
                    type="button"
                    className={`px-3 py-1 rounded text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    onClick={() => {
                      if (!formData.plan.procedures_planned.includes(proc.value)) {
                        addToArray('plan.procedures_planned', proc.value);
                      }
                    }}
                  >
                    {proc.label}
                  </button>
                ))}
              </div>
            </div>

            <hr className={`my-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Counseling */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.counseling')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.plan.counseling.map((item, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('plan.counseling', i)} darkMode={darkMode}>{item}</Chip>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'Medication compliance', label: t('ophthalmologyReport.medicationCompliance') },
                  { value: 'Side-effects explained', label: t('ophthalmologyReport.sideEffectsExplained') },
                  { value: 'Driving precautions', label: t('ophthalmologyReport.drivingPrecautions') },
                  { value: 'Urgent return precautions', label: t('ophthalmologyReport.urgentReturnPrecautions') }
                ].map(item => (
                  <button
                    key={item.value}
                    type="button"
                    className={`px-3 py-1 rounded text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    onClick={() => {
                      if (!formData.plan.counseling.includes(item.value)) {
                        addToArray('plan.counseling', item.value);
                      }
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <hr className={`my-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Follow-up */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.followUp')}</FieldLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  name="plan_follow_up"
                  value={formData.plan.follow_up}
                  onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                  options={[
                    { value: '24h', label: t('ophthalmologyReport.hours24') },
                    { value: '1w', label: t('ophthalmologyReport.week1') },
                    { value: '1m', label: t('ophthalmologyReport.month1') },
                    { value: 'PRN', label: t('ophthalmologyReport.prn') },
                    { value: 'date', label: t('ophthalmologyReport.specificDate') }
                  ]}
                  darkMode={darkMode}
                />
                {formData.plan.follow_up === 'date' && (
                  <Input
                    name="follow_up_date"
                    type="date"
                    placeholder={t('ophthalmologyReport.specificDate')}
                    value={formData.plan.follow_up_date}
                    onChange={(e) => updateFormData('plan.follow_up_date', e.target.value)}
                    darkMode={darkMode}
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Procedures Done */}
      <Card 
        title={t('ophthalmologyReport.proceduresDone')} 
        collapsible 
        isOpen={!collapsedSections.procedures}
        onToggle={() => toggleSection('procedures')}
        counter={formData.procedures_done.length}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <button
            type="button"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 mb-4"
            onClick={() => openProcedureEditor()}
          >
            {t('ophthalmologyReport.addProcedure')}
          </button>

          {formData.procedures_done.map((proc, idx) => (
            <div key={idx} className={`border rounded-lg p-4 ${
              darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{proc.name}</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openProcedureEditor(proc, idx)}
                    className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProcedure(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <div>Date: {proc.date}</div>
                {proc.eye && <div>Eye: {proc.eye}</div>}
                <div>Result: {proc.result}</div>
              </div>
            </div>
          ))}

          {editingProcedure && (
            <div className={`mt-3 grid grid-cols-12 gap-4 p-4 rounded-lg border ${
              darkMode 
                ? 'bg-slate-800 border-slate-700' 
                : 'bg-white border-slate-200'
            }`}>
              <div className="col-span-12">
                <FieldLabel required darkMode={darkMode}>{t('ophthalmologyReport.procedureName')}</FieldLabel>
                <Select
                  name="procedure_name"
                  value={editingProcedure.name}
                  onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))}
                  options={[
                    { value: 'YAG Capsulotomy', label: t('ophthalmologyReport.yagCapsulotomy') },
                    { value: 'PRP', label: t('ophthalmologyReport.prp') },
                    { value: 'IVT', label: t('ophthalmologyReport.ivt') },
                    { value: 'CXL', label: t('ophthalmologyReport.cxl') },
                    { value: 'Cataract Surgery', label: t('ophthalmologyReport.cataractSurgery') },
                    { value: 'Trabeculectomy', label: t('ophthalmologyReport.trabeculectomy') },
                    { value: 'Other', label: t('ophthalmologyReport.other') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel required darkMode={darkMode}>{t('ophthalmologyReport.procedureDate')}</FieldLabel>
                <Input
                  name="procedure_date"
                  type="datetime-local"
                  value={editingProcedure.date}
                  onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.procedureEye')}</FieldLabel>
                <Select
                  name="procedure_eye"
                  value={editingProcedure.eye}
                  onChange={(e) => setEditingProcedure(s => ({...s, eye: e.target.value}))}
                  options={[
                    { value: 'OD', label: t('ophthalmologyReport.od') },
                    { value: 'OS', label: t('ophthalmologyReport.os') },
                    { value: 'OU', label: t('ophthalmologyReport.ou') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.procedureAnesthesia')}</FieldLabel>
                <Select
                  name="procedure_anesthesia"
                  value={editingProcedure.anesthesia}
                  onChange={(e) => setEditingProcedure(s => ({...s, anesthesia: e.target.value}))}
                  options={[
                    { value: 'none', label: t('ophthalmologyReport.none') },
                    { value: 'topical', label: t('ophthalmologyReport.topical') },
                    { value: 'local', label: t('ophthalmologyReport.local') },
                    { value: 'general', label: t('ophthalmologyReport.general') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.procedureTechnique')}</FieldLabel>
                <TextArea
                  name="procedure_technique"
                  placeholder={t('ophthalmologyReport.procedureTechnique')}
                  value={editingProcedure.technique || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.procedureFindings')}</FieldLabel>
                <TextArea
                  name="procedure_findings"
                  placeholder={t('ophthalmologyReport.procedureFindings')}
                  value={editingProcedure.findings || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, findings: e.target.value}))}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.procedureResult')}</FieldLabel>
                <Select
                  name="procedure_result"
                  value={editingProcedure.result}
                  onChange={(e) => setEditingProcedure(s => ({...s, result: e.target.value}))}
                  options={[
                    { value: 'successful', label: t('ophthalmologyReport.successful') },
                    { value: 'partial', label: t('ophthalmologyReport.partial') },
                    { value: 'failed', label: t('ophthalmologyReport.failed') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.procedureComplications')}</FieldLabel>
                <TextArea
                  name="procedure_complications"
                  placeholder={t('ophthalmologyReport.anyComplications')}
                  value={editingProcedure.complications || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, complications: e.target.value}))}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 flex justify-end gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 border rounded-lg ${
                    darkMode 
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {setEditingProcedure(null); setEditingProcedureIdx(null);}}
                >
                  {t('ophthalmologyReport.cancel')}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  onClick={saveProcedure}
                >
                  {t('ophthalmologyReport.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Outcome & Recommendations (Discharge mode only) */}
      {mode === 'discharge' && (
        <Card 
          title={t('ophthalmologyReport.outcomeRecommendations')} 
          collapsible 
          isOpen={!collapsedSections.outcome}
          onToggle={() => toggleSection('outcome')}
          darkMode={darkMode}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.currentCondition')}</FieldLabel>
              <TextArea
                name="outcome_condition"
                placeholder={t('ophthalmologyReport.patientsCurrentCondition')}
                value={formData.outcome.condition || ''}
                onChange={(e) => updateFormData('outcome.condition', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('ophthalmologyReport.hospitalCourse')}</FieldLabel>
              <TextArea
                name="outcome_course"
                placeholder={t('ophthalmologyReport.summaryOfHospitalCourse')}
                value={formData.outcome.course || ''}
                onChange={(e) => updateFormData('outcome.course', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
          </div>
            
            <div>
              <FieldLabel required darkMode={darkMode}>{t('ophthalmologyReport.recommendations')}</FieldLabel>
              <div className="space-y-2">
                {formData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      name={`recommendation_${index}`}
                      placeholder={t('ophthalmologyReport.recommendation')}
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
                  {t('ophthalmologyReport.addRecommendation')}
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
        title={t('ophthalmologyReport.attachments')} 
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
            <p className={`mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('ophthalmologyReport.dropFilesHere')}</p>
            <p className={`text-xs mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('ophthalmologyReport.includeFundusPhotos')}</p>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg ${
                darkMode 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('ophthalmologyReport.chooseFiles')}
            </button>
          </div>
          
          <div className="space-y-2">
            {formData.attachments.map((attachment, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${
                darkMode ? 'bg-slate-700' : 'bg-slate-50'
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
              {t('ophthalmologyReport.saveDraft')}
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
              {t('ophthalmologyReport.preview')}
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
              {t('ophthalmologyReport.finalizeSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OphthalmologyReportForm;
