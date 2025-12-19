import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsAPI, icdCodesAPI, doctorPatientsAPI, doctorImagingAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from GeneralVisitReport)
const Card = React.memo(({ children, className = "", collapsible = false, isOpen = true, onToggle, title, counter, darkMode = false }) => (
  <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-2xl border shadow-sm ${className}`}>
    {title && (
      <div 
        className={`p-4 border-b ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'} cursor-pointer`}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center justify-between">
          <h3 className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} font-semibold text-lg`}>
            {title}
            {counter !== undefined && <span className={`${darkMode ? 'text-slate-400' : 'text-slate-400'} ml-2`}>({counter})</span>}
          </h3>
          {collapsible && (
            <span className={`${darkMode ? 'text-slate-400' : 'text-slate-400'} text-sm`}>
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

const FieldLabel = React.memo(({ children, required = false, darkMode = false }) => (
  <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
));

const Input = React.memo(({ name, placeholder, value, onChange, className = "", type = "text", required = false, readOnly = false, darkMode = false }) => (
  <input
    key={name}
    type={type}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required={required}
    readOnly={readOnly}
    className={`w-full px-4 py-4 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-slate-200 text-slate-600'} rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
  />
));

const Select = React.memo(({ name, value, onChange, options, className = "", required = false, darkMode = false }) => {
  const { t } = useTranslation();
  return (
  <select
    key={name}
    name={name}
    value={value}
    onChange={onChange}
    required={required}
      className={`w-full px-4 py-4 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-600'} rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
  >
      <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t('cardiologyReport.select')}</option>
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
    key={name}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={rows}
    required={required}
    className={`w-full px-4 py-4 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-slate-200 text-slate-600'} rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical ${className}`}
  />
));

const Chip = React.memo(({ children, onRemove, onEdit, className = "", darkMode = false }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-2 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'} rounded-lg text-sm ${className}`}>
    <span>{children}</span>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
      >
        ✎
      </button>
    )}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className={darkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}
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
          className={`w-full px-4 py-4 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-slate-200 text-slate-600'} rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'} border rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
          {searchResults.map((result, index) => (
            <button
              key={result.id || result.code}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-2 focus:outline-none ${
                darkMode
                  ? index === selectedIndex ? 'bg-slate-700' : 'hover:bg-slate-700'
                  : index === selectedIndex ? 'bg-emerald-50' : 'hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-mono text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-600'} font-medium min-w-[100px]`}>
                  {result.code}
                </span>
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex-1`}>
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
          className={`w-full px-4 py-4 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-slate-200 text-slate-600'} rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'} border rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
          {searchResults.map((result, index) => (
            <button
              key={result.id || index}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-2 focus:outline-none ${
                darkMode
                  ? index === selectedIndex ? 'bg-slate-700' : 'hover:bg-slate-700'
                  : index === selectedIndex ? 'bg-emerald-50' : 'hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-medium text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-700'} flex-1`}>
                  {result.brand_name || result.name || 'Unknown'}
                </span>
                {result.strength && (
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {result.strength} {result.strength_unit?.name || ''}
                  </span>
                )}
              </div>
              {result.mnn?.name && (
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                  MNN: {result.mnn.name}
                </div>
              )}
              {result.dosage_form?.name && (
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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

const ToggleMatrix = React.memo(({ items, values, onChange, notes = {}, onNoteChange, darkMode = false }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {items.map(({key, label}) => (
      <div key={key} className={`flex items-center justify-between p-3 border ${darkMode ? 'border-slate-700' : 'border-slate-200'} rounded-lg`}>
        <span className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} font-medium`}>{label}</span>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => onChange(key, 'normal')}
            className={`px-3 py-1 rounded text-sm ${
              values[key] === 'normal' 
                ? darkMode ? 'bg-emerald-700 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Normal
          </button>
          <button 
            type="button" 
            onClick={() => onChange(key, 'abnormal')}
            className={`px-3 py-1 rounded text-sm ${
              values[key] === 'abnormal' 
                ? darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
                : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Abnormal
          </button>
          {values[key] === 'abnormal' && (
            <input 
              type="text" 
              placeholder="Note" 
              value={notes[key] || ''}
              onChange={(e) => onNoteChange(key, e.target.value)}
              className={`w-28 px-2 py-1 text-xs border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'} rounded focus:outline-none focus:ring-1 focus:ring-emerald-500`}
            />
          )}
        </div>
      </div>
    ))}
  </div>
));

const CardiologyReportForm = ({ patient, encounter, onSave }) => {
  const { t } = useTranslation();
  
  // Dark mode state - read from global theme preference
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Sync with global theme system
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        const saved = localStorage.getItem('theme');
        const newDarkMode = saved === 'dark';
        setDarkMode(newDarkMode);
      }
    };

    const handleThemeChange = () => {
      const saved = localStorage.getItem('theme');
      const newDarkMode = saved === 'dark';
      setDarkMode(newDarkMode);
    };

    const checkTheme = () => {
      const saved = localStorage.getItem('theme');
      const newDarkMode = saved === 'dark';
      const hasDarkClass = document.documentElement.classList.contains('dark');
      
      if (newDarkMode !== hasDarkClass || newDarkMode !== darkMode) {
        setDarkMode(newDarkMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themechange', handleThemeChange);
    
    checkTheme();
    const interval = setInterval(checkTheme, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themechange', handleThemeChange);
      clearInterval(interval);
    };
  }, [darkMode]);

  // Mode state
  const [mode, setMode] = useState('initial');
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    history: false,
    objective: false,
    investigations: false,
    imaging: false,
    diagnosis: false,
    plan: false,
    procedure: false,
    outcome: false,
    attachments: false
  });

  // Form data state
  const [formData, setFormData] = useState({
    doc_type: 'cardiology.initial',
    meta: {
      clinic_id: '',
      department_id: '',
      physician_id: '',
      patient_id: '',
      encounter_id: '',
      datetime: new Date().toISOString()
    },
    chief_complaint: '',
    history: {
      // Chest Pain
      chest_pain: {
        present: false,
        onset_duration: '',
        character: '',
        location: '',
        radiation: '',
        intensity: '',
        precipitating_factors: [],
        relieving_factors: [],
        associated_symptoms: []
      },
      // Dyspnea / Heart Failure
      dyspnea: {
        present: false,
        nyha_class: '',
        at_rest: false,
        on_exertion: false,
        orthopnea: false,
        orthopnea_pillows: '',
        pnd: false,
        edema: false,
        edema_severity: ''
      },
      // Palpitations / Syncope
      palpitations: {
        present: false,
        description: '',
        duration: '',
        triggers: ''
      },
      syncope: {
        present: false,
        circumstances: ''
      },
      // Other cardiac symptoms
      other_symptoms: {
        fatigue: false,
        reduced_exercise_tolerance: false,
        chest_tightness: false,
        claudication: false
      },
      // Risk factors
      risk_factors: {
        htn: false,
        diabetes: false,
        diabetes_type: '',
        diabetes_duration: '',
        dyslipidemia: false,
        smoking: 'never', // current / former / never
        pack_years: '',
        obesity: false,
        family_cad: false,
        family_sudden_death: false,
        ckd: false,
        previous_mi: false,
        previous_stroke: false,
        previous_pci: false,
        previous_cabg: false,
        other: ''
      },
      // Past medical / surgical history
      past_medical: {
        mi: false,
        mi_dates: '',
        angina: false,
        heart_failure: false,
        arrhythmias: [],
        pci_stents: false,
        pci_details: '',
        cabg: false,
        cabg_date: '',
        valve_surgery: false,
        valve_surgery_details: '',
        stroke_tia: false,
        copd_asthma: false,
        ckd: false,
        thyroid: false,
        other: ''
      },
      // Current medications
      current_meds: '',
      // Allergies
      allergies: '',
      // Family history
      family: '',
      // Social history
      social: {
        smoking: 'never',
        alcohol: '',
        occupational_load: '',
        physical_activity: ''
      },
      // Legacy fields (keep for backward compatibility)
      illness: '',
      past: '',
      epidemiology: '',
      triggers: []
    },
    objective: {
      // Vitals
      vitals: {
        bp: '',
        hr: '',
        rr: '',
        temp: '',
        spo2: '',
        weight: '',
        height: '',
        bmi: ''
      },
      // General appearance
      general_appearance: '',
      perfusion: '',
      consciousness: '',
      // Cardiovascular exam
      cardio: {
        jvp: '',
        apex_beat: '',
        heart_sounds: '',
        murmurs: '',
        peripheral_pulses: '',
        peripheral_edema: ''
      },
      // Respiratory system
      respiratory: {
        breathing_pattern: '',
        auscultation: ''
      },
      // Others
      abdomen: '',
      neurologic: '',
      // Legacy fields
      general: '',
      edema: '',
      other: ''
    },
    ros: {
      respiratory: 'normal',
      cardio: 'normal',
      gi: 'normal',
      neuro: 'normal',
      gu: 'normal',
      derm: 'normal',
      ent: 'normal',
      msk: 'normal',
      notes: {}
    },
    pe: {
      general: 'normal',
      lungs: 'normal',
      heart: 'normal',
      abdomen: 'normal',
      neuro: 'normal',
      extremities: 'normal',
      notes: {}
    },
    investigations: {
      // Labs
      labs: {
        troponin: '',
        troponin_date: '',
        bnp: '',
        nt_probnp: '',
        important_labs: ''
      },
      // ECG Summary
      ecg: {
        rhythm: '',
        rate: '',
        axis: '',
        st_t_changes: '',
        conduction: '',
        other: ''
      },
      // Echo Summary
      echo: {
        lvef: '',
        wall_motion: '',
        valves: '',
        chambers: '',
        pericardial_effusion: false,
        pericardial_effusion_size: ''
      },
      notes: '',
      referenced_docs: []
    },
    imaging_links: [],
    diagnosis: {
      main: '',
      functional_class: '', // CCS I-IV for angina, NYHA I-IV for HF
      comorbid: '',
      complications: '',
      codes: []
    },
    plan: {
      tests: [],
      referrals: [],
      meds: [],
      lifestyle: [],
      follow_up: ''
    },
    procedure: {
      name: '',
      date: '',
      notes: ''
    },
    outcome: {
      // Hospital course (for discharge mode)
      hospital_course: '',
      // Discharge condition
      condition: '',
      hemodynamic_stability: '',
      persisting_symptoms: '',
      vitals_at_discharge: '',
      nyha_at_discharge: '',
      // Legacy
      course: ''
    },
    recommendations: [],
    attachments: []
  });

  // Available imaging studies from backend
  const [availableImaging, setAvailableImaging] = useState([]);
  const [loadingImaging, setLoadingImaging] = useState(false);
  const [imagingSearchQuery, setImagingSearchQuery] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({});

  // Autosave state
  const [lastSaved, setLastSaved] = useState(null);

  // Patient medications and allergies from database
  const [patientMedications, setPatientMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [loadingAllergies, setLoadingAllergies] = useState(false);

  // Smart editor states
  const [editingTest, setEditingTest] = useState(null);
  const [editingTestIdx, setEditingTestIdx] = useState(null);
  const [editingRef, setEditingRef] = useState(null);
  const [editingRefIdx, setEditingRefIdx] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [editingMedIdx, setEditingMedIdx] = useState(null);

  // Initialize form data
  useEffect(() => {
    if (patient && encounter) {
      setFormData(prev => ({
        ...prev,
        meta: {
          clinic_id: encounter.clinic_id || 'clinic-001',
          department_id: encounter.department_id || 'cardiology',
          physician_id: encounter.doctor_id || 'doctor-001',
          patient_id: patient.patient_id || 'patient-001',
          encounter_id: encounter.id || 'encounter-001',
          datetime: encounter.datetime || new Date().toISOString()
        }
      }));
    }
  }, [patient, encounter]);

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

  // Fetch patient allergies from database
  useEffect(() => {
    const fetchPatientAllergies = async () => {
      const patientId = patient?.patient_id || patient?.id || encounter?.patient_id || '';
      if (!patientId) return;

      try {
        setLoadingAllergies(true);
        const allergies = await doctorPatientsAPI.getAllergies(patientId);
        // Handle both SuccessResponse format and direct array
        const allergiesArray = Array.isArray(allergies) 
          ? allergies 
          : (allergies?.data && Array.isArray(allergies.data) 
            ? allergies.data 
            : []);
        setPatientAllergies(allergiesArray);
      } catch (error) {
        console.error('Error fetching patient allergies:', error);
        setPatientAllergies([]);
      } finally {
        setLoadingAllergies(false);
      }
    };
    
    fetchPatientAllergies();
  }, [patient?.patient_id, patient?.id, encounter?.patient_id]);

  // Helper functions
  const updateFormData = useCallback((path, value) => {
    setFormData(prev => {
      const newData = structuredClone(prev);
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
      const newData = structuredClone(prev);
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]].push(item);
      return newData;
    });
  }, []);

  const removeFromArray = useCallback((path, index) => {
    setFormData(prev => {
      const newData = structuredClone(prev);
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

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'cardiology.discharge' : 'cardiology.initial'
    }));
  }, [mode]);

  // Auto-calculate BMI
  useEffect(() => {
    const weight = parseFloat(formData.objective.vitals.weight);
    const height = parseFloat(formData.objective.vitals.height);
    
    if (weight && height && height > 0) {
      const heightInMeters = height / 100;
      const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
      if (formData.objective.vitals.bmi !== bmi) {
        updateFormData('objective.vitals.bmi', bmi);
      }
    } else if (!weight || !height) {
      if (formData.objective.vitals.bmi !== '') {
        updateFormData('objective.vitals.bmi', '');
      }
    }
  }, [formData.objective.vitals.weight, formData.objective.vitals.height, updateFormData]);

  // Load imaging studies from backend
  const loadImagingStudies = useCallback(async () => {
    const patientId = patient?.patient_id || patient?.id || encounter?.patient_id || '';
    if (!patientId) {
      console.warn('No patient ID available for loading imaging studies');
      return;
    }

    try {
      setLoadingImaging(true);
      const response = await doctorImagingAPI.listStudies(patientId);
      
      // Handle different response formats
      let studies = [];
      if (response?.studies && Array.isArray(response.studies)) {
        studies = response.studies;
      } else if (response?.data?.studies && Array.isArray(response.data.studies)) {
        studies = response.data.studies;
      } else if (Array.isArray(response)) {
        studies = response;
      }

      // Map API response to form format
      const mappedStudies = studies.map(study => ({
        study_id: study.study_id,
        study_uid: study.study_instance_uid || study.study_id,
        modality: study.modality || 'Unknown',
        date: study.study_date || '',
        description: study.study_description || study.study_id,
        source: 'orthanc',
        diagnostic_report_id: study.accession_number || study.study_id,
        patient_id: study.patient_id,
        patient_name: study.patient_name,
        accession_number: study.accession_number,
        series_count: study.series_count || 0,
        instance_count: study.instance_count || 0
      }));

      setAvailableImaging(mappedStudies);
    } catch (error) {
      console.error('Error loading imaging studies:', error);
      setAvailableImaging([]);
    } finally {
      setLoadingImaging(false);
    }
  }, [patient?.patient_id, patient?.id, encounter?.patient_id]);

  // Auto-load imaging studies when patient is available
  useEffect(() => {
    const patientId = patient?.patient_id || patient?.id || encounter?.patient_id || '';
    if (patientId) {
      loadImagingStudies();
    }
  }, [patient?.patient_id, patient?.id, encounter?.patient_id, loadImagingStudies]);

  // Get OHIF viewer URL from API
  const getOhifUrl = useCallback(async (study) => {
    try {
      const params = {};
      if (study.study_id) {
        params.study_id = study.study_id;
      } else if (study.study_uid) {
        params.study_instance_uid = study.study_uid;
      }
      if (study.patient_id) {
        params.patient_id = study.patient_id;
      }

      const viewerResponse = await doctorImagingAPI.getViewerUrl(params);
      return viewerResponse?.viewer_url || viewerResponse?.data?.viewer_url || `/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(study.study_uid || study.study_id)}`;
    } catch (error) {
      console.error('Error getting viewer URL:', error);
      // Fallback to manual URL construction
      return `/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(study.study_uid || study.study_id)}`;
    }
  }, []);

  const addImagingToReport = useCallback(async (study, attach = 'reference_only', note = '') => {
    try {
      const ohifUrl = await getOhifUrl(study);
      const imagingItem = {
        ...study,
        ohif_url: ohifUrl,
        attach,
        note
      };
      addToArray('imaging_links', imagingItem);
    } catch (error) {
      console.error('Error adding imaging to report:', error);
      // Still add to report even if URL fetch fails
      const imagingItem = {
        ...study,
        ohif_url: `/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(study.study_uid || study.study_id)}`,
        attach,
        note
      };
      addToArray('imaging_links', imagingItem);
    }
  }, [addToArray, getOhifUrl]);

  const removeImagingFromReport = useCallback((index) => {
    removeFromArray('imaging_links', index);
  }, [removeFromArray]);

  const openImagingViewer = useCallback(async (study) => {
    try {
      const url = await getOhifUrl(study);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening viewer:', error);
      // Fallback URL
      const fallbackUrl = `/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(study.study_uid || study.study_id)}`;
      window.open(fallbackUrl, '_blank');
    }
  }, [getOhifUrl]);

  // Smart editor helpers
  const convertStringToTest = useCallback((str) => {
    if (typeof str === 'string') {
      const testKeys = ['ecg','echo','treadmill','holter','abpm','cxr','lipids','hba1c','cmp','troponin','bnpNtProbnp','other'];
      const isImaging = ['ecg','echo','treadmill','holter','abpm','cxr'].includes(str);
      return { 
        type: isImaging ? 'imaging' : 'lab',
        label: testKeys.includes(str) ? t(`cardiologyReport.${str}`) : str,
        note: '',
        destinationClinicId: ''
      };
    }
    return str;
  }, [t]);

  const convertStringToReferral = useCallback((str) => {
    if (typeof str === 'string') {
      return { 
        specialty: str, 
        doctorId: '', 
        reason: '', 
        destinationClinicId: '', 
        urgency: 'routine' 
      };
    }
    return str;
  }, []);

  const convertStringToMed = useCallback((str) => {
    if (typeof str === 'string') {
      return { 
        med: str, 
        dose: '', 
        route: '', 
        freq: '', 
        duration: '', 
        instructions: '', 
        sendToPharmacy: false, 
        pharmacyId: '' 
      };
    }
    return str;
  }, []);

  const openTestEditor = useCallback((preset = {}, idx = null) => {
    setEditingTest({
      type: preset.type || 'lab',
      label: preset.label || '',
      note: preset.note || '',
      destinationClinicId: preset.destinationClinicId || ''
    });
    setEditingTestIdx(idx);
  }, []);

  const saveTest = useCallback(() => {
    if (!editingTest?.label?.trim()) return;
    const next = [...formData.plan.tests];
    if (editingTestIdx === null) next.push(editingTest); else next[editingTestIdx] = editingTest;
    updateFormData('plan.tests', next);
    setEditingTest(null); setEditingTestIdx(null);
  }, [editingTest, editingTestIdx, formData.plan.tests, updateFormData]);

  const removeTest = useCallback((idx) => {
    updateFormData('plan.tests', formData.plan.tests.filter((_, i) => i !== idx));
  }, [formData.plan.tests, updateFormData]);

  const openRefEditor = useCallback((preset = {}, idx = null) => {
    setEditingRef({
      specialty: preset.specialty || '',
      doctorId: preset.doctorId || '',
      reason: preset.reason || '',
      destinationClinicId: preset.destinationClinicId || '',
      urgency: preset.urgency || 'routine'
    });
    setEditingRefIdx(idx);
  }, []);

  const saveRef = useCallback(() => {
    if (!(editingRef?.specialty?.trim() || editingRef?.doctorId?.trim())) return;
    if (!editingRef?.reason?.trim()) return;
    const next = [...formData.plan.referrals];
    if (editingRefIdx === null) next.push(editingRef); else next[editingRefIdx] = editingRef;
    updateFormData('plan.referrals', next);
    setEditingRef(null); setEditingRefIdx(null);
  }, [editingRef, editingRefIdx, formData.plan.referrals, updateFormData]);

  const removeRef = useCallback((idx) => {
    updateFormData('plan.referrals', formData.plan.referrals.filter((_, i) => i !== idx));
  }, [formData.plan.referrals, updateFormData]);

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
    if (!editingMed?.med?.trim() || !editingMed?.dose?.trim() || !editingMed?.route?.trim() || !editingMed?.freq?.trim() || !editingMed?.duration?.trim()) return;
    const next = [...formData.plan.meds];
    if (editingMedIdx === null) next.push(editingMed); else next[editingMedIdx] = editingMed;
    updateFormData('plan.meds', next);
    setEditingMed(null); setEditingMedIdx(null);
  }, [editingMed, editingMedIdx, formData.plan.meds, updateFormData]);

  const removeMed = useCallback((idx) => {
    updateFormData('plan.meds', formData.plan.meds.filter((_, i) => i !== idx));
  }, [formData.plan.meds, updateFormData]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Common validations
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

    // Mode-specific validations
    if (mode === 'discharge') {
      if (!formData.recommendations.length) {
        newErrors.recommendations = 'At least one recommendation is required for discharge';
      }

      if (formData.procedure.name && !formData.procedure.date) {
        newErrors.procedure_date = 'Procedure date is required when procedure name is provided';
      }
    }

    // Imaging validation
    formData.imaging_links.forEach((imaging, index) => {
      if (!imaging.study_uid && !imaging.ohif_url) {
        newErrors[`imaging_${index}`] = 'Valid Study UID or OHIF URL is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  // Build payload
  const buildPayload = useCallback(() => {
    return {
      doc_type: mode === 'discharge' ? 'cardiology.discharge' : 'cardiology.initial',
      meta: formData.meta,
      chief_complaint: formData.chief_complaint,
      history: formData.history,
      objective: formData.objective,
      investigations: formData.investigations,
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
      diagnosis: formData.diagnosis,
      plan: mode === 'initial' ? formData.plan : undefined,
      procedure: formData.procedure,
      outcome: mode === 'discharge' ? formData.outcome : undefined,
      recommendations: mode === 'discharge' ? formData.recommendations : (formData.recommendations?.length ? formData.recommendations : undefined),
      attachments: formData.attachments
    };
  }, [formData, mode]);

  // Autosave every 30 seconds (stable interval)
  const payloadRef = React.useRef(null);
  useEffect(() => { 
    payloadRef.current = buildPayload(); 
  }, [buildPayload]);

  useEffect(() => {
    const id = setInterval(() => {
      if (payloadRef.current) {
        console.log('DRAFT', payloadRef.current);
        setLastSaved(new Date());
      }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Event handlers
  const handleSaveDraft = useCallback(() => {
    console.log('DRAFT', buildPayload());
    setLastSaved(new Date());
  }, [buildPayload]);

  const handlePreview = useCallback(() => {
    // TODO: Implement preview modal
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
    <div className={`max-w-6xl mx-auto p-6 space-y-6 ${darkMode ? 'bg-slate-900' : 'bg-white'} min-h-screen`}>
      {/* Header */}
      <Card title={t('cardiologyReport.title')} className="mb-6" darkMode={darkMode}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.mode')}</FieldLabel>
            <Select
              name="mode"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
              options={[
                { value: 'initial', label: t('cardiologyReport.initialAssessment') },
                { value: 'discharge', label: t('cardiologyReport.dischargeSummary') }
              ]}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Chief Complaint */}
      <Card title={t('cardiologyReport.chiefComplaint')} darkMode={darkMode}>
        <FieldLabel required darkMode={darkMode}>{t('cardiologyReport.chiefComplaint')}</FieldLabel>
        <Input
          name="chief_complaint"
          placeholder={t('cardiologyReport.chiefComplaintPlaceholder')}
          value={formData.chief_complaint}
          onChange={(e) => updateFormData('chief_complaint', e.target.value)}
          required
          darkMode={darkMode}
        />
        {errors.chief_complaint && (
          <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
        )}
      </Card>

      {/* History */}
      <Card 
        title={t('cardiologyReport.historyOfPresentIllness')} 
        collapsible 
        isOpen={!collapsedSections.history}
        onToggle={() => toggleSection('history')}
        darkMode={darkMode}
      >
        <div className="space-y-6">
          {/* Chest Pain */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.history.chest_pain.present}
                onChange={(e) => updateFormData('history.chest_pain.present', e.target.checked)}
                className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
              />
              <FieldLabel className="mb-0" darkMode={darkMode}>{t('cardiologyReport.chestPainPresent')}</FieldLabel>
            </div>
            {formData.history.chest_pain.present && (
              <div className="space-y-4 pl-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.onsetDuration')}</FieldLabel>
                    <Input
                      placeholder={t('cardiologyReport.onsetDurationPlaceholder')}
                      value={formData.history.chest_pain.onset_duration}
                      onChange={(e) => updateFormData('history.chest_pain.onset_duration', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.character')}</FieldLabel>
                    <Select
                      value={formData.history.chest_pain.character}
                      onChange={(e) => updateFormData('history.chest_pain.character', e.target.value)}
                      darkMode={darkMode}
                      options={[
                        { value: '', label: t('cardiologyReport.select') },
                        { value: 'pressure', label: t('cardiologyReport.pressure') },
                        { value: 'burning', label: t('cardiologyReport.burning') },
                        { value: 'stabbing', label: t('cardiologyReport.stabbing') },
                        { value: 'tightness', label: t('cardiologyReport.tightness') },
                        { value: 'other', label: t('cardiologyReport.other') }
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.location')}</FieldLabel>
                    <Input
                      placeholder={t('cardiologyReport.locationPlaceholder')}
                      value={formData.history.chest_pain.location}
                      onChange={(e) => updateFormData('history.chest_pain.location', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.radiation')}</FieldLabel>
                    <Input
                      placeholder={t('cardiologyReport.radiationPlaceholder')}
                      value={formData.history.chest_pain.radiation}
                      onChange={(e) => updateFormData('history.chest_pain.radiation', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.intensity')}</FieldLabel>
                    <Select
                      value={formData.history.chest_pain.intensity}
                      onChange={(e) => updateFormData('history.chest_pain.intensity', e.target.value)}
                      darkMode={darkMode}
                      options={[
                        { value: '', label: t('cardiologyReport.select') },
                        { value: 'mild', label: t('cardiologyReport.mild') },
                        { value: 'moderate', label: t('cardiologyReport.moderate') },
                        { value: 'severe', label: t('cardiologyReport.severe') },
                        { value: '1-3', label: `1-3 (${t('cardiologyReport.mild')})` },
                        { value: '4-6', label: `4-6 (${t('cardiologyReport.moderate')})` },
                        { value: '7-10', label: `7-10 (${t('cardiologyReport.severe')})` }
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.precipitatingFactors')}</FieldLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.history.chest_pain.precipitating_factors.map((f, i) => (
                      <Chip key={i} onRemove={() => {
                        const newFactors = [...formData.history.chest_pain.precipitating_factors];
                        newFactors.splice(i, 1);
                        updateFormData('history.chest_pain.precipitating_factors', newFactors);
                      }} darkMode={darkMode}>{f}</Chip>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {[t('cardiologyReport.exertion'), t('cardiologyReport.coldAir'), t('cardiologyReport.emotionalStress'), t('cardiologyReport.afterMeals'), t('cardiologyReport.rest')].map(f => (
              <button
                        key={f}
                type="button"
                        className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} rounded text-sm`}
                        onClick={() => {
                          if (!formData.history.chest_pain.precipitating_factors.includes(f)) {
                            updateFormData('history.chest_pain.precipitating_factors', [...formData.history.chest_pain.precipitating_factors, f]);
                          }
                        }}
                      >
                        + {f}
              </button>
                    ))}
            </div>
          </div>
          <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.relievingFactors')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
                    {formData.history.chest_pain.relieving_factors.map((f, i) => (
                      <Chip key={i} onRemove={() => {
                        const newFactors = [...formData.history.chest_pain.relieving_factors];
                        newFactors.splice(i, 1);
                        updateFormData('history.chest_pain.relieving_factors', newFactors);
                      }} darkMode={darkMode}>{f}</Chip>
              ))}
            </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[t('cardiologyReport.rest'), t('cardiologyReport.nitroglycerin'), t('cardiologyReport.none')].map(f => (
                <button 
                        key={f}
                  type="button" 
                        className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} rounded text-sm`}
                        onClick={() => {
                          if (!formData.history.chest_pain.relieving_factors.includes(f)) {
                            updateFormData('history.chest_pain.relieving_factors', [...formData.history.chest_pain.relieving_factors, f]);
                          }
                        }}
                      >
                        + {f}
                </button>
              ))}
            </div>
          </div>
          <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.associatedSymptoms')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
                    {formData.history.chest_pain.associated_symptoms.map((s, i) => (
                      <Chip key={i} onRemove={() => {
                        const newSymptoms = [...formData.history.chest_pain.associated_symptoms];
                        newSymptoms.splice(i, 1);
                        updateFormData('history.chest_pain.associated_symptoms', newSymptoms);
                      }} darkMode={darkMode}>{s}</Chip>
              ))}
            </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {[t('cardiologyReport.dyspnea'), t('cardiologyReport.sweating'), t('cardiologyReport.nausea'), t('cardiologyReport.palpitations'), t('cardiologyReport.dizziness')].map(s => (
                <button 
                        key={s}
                  type="button" 
                        className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} rounded text-sm`}
                        onClick={() => {
                          if (!formData.history.chest_pain.associated_symptoms.includes(s)) {
                            updateFormData('history.chest_pain.associated_symptoms', [...formData.history.chest_pain.associated_symptoms, s]);
                          }
                        }}
                      >
                        + {s}
                </button>
              ))}
            </div>
                </div>
              </div>
            )}
          </div>

          {/* Dyspnea / Heart Failure */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.history.dyspnea.present}
                onChange={(e) => updateFormData('history.dyspnea.present', e.target.checked)}
                className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
              />
              <FieldLabel className="mb-0" darkMode={darkMode}>{t('cardiologyReport.dyspneaPresent')}</FieldLabel>
            </div>
            {formData.history.dyspnea.present && (
              <div className="space-y-4 pl-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.nyhaClass')}</FieldLabel>
                    <Select
                      value={formData.history.dyspnea.nyha_class}
                      onChange={(e) => updateFormData('history.dyspnea.nyha_class', e.target.value)}
                      darkMode={darkMode}
                      options={[
                        { value: '', label: t('cardiologyReport.select') },
                        { value: 'I', label: t('cardiologyReport.nyhaI') },
                        { value: 'II', label: t('cardiologyReport.nyhaII') },
                        { value: 'III', label: t('cardiologyReport.nyhaIII') },
                        { value: 'IV', label: t('cardiologyReport.nyhaIV') }
                      ]}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.history.dyspnea.at_rest}
                        onChange={(e) => updateFormData('history.dyspnea.at_rest', e.target.checked)}
                        className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                      />
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.atRest')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.history.dyspnea.on_exertion}
                        onChange={(e) => updateFormData('history.dyspnea.on_exertion', e.target.checked)}
                        className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                      />
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.onExertion')}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.history.dyspnea.orthopnea}
                      onChange={(e) => updateFormData('history.dyspnea.orthopnea', e.target.checked)}
                      className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                    />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.orthopnea')}</span>
                    {formData.history.dyspnea.orthopnea && (
                      <Input
                        placeholder={t('cardiologyReport.orthopneaPillows')}
                        value={formData.history.dyspnea.orthopnea_pillows}
                        onChange={(e) => updateFormData('history.dyspnea.orthopnea_pillows', e.target.value)}
                        className="w-32"
                        darkMode={darkMode}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.history.dyspnea.pnd}
                      onChange={(e) => updateFormData('history.dyspnea.pnd', e.target.checked)}
                      className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                    />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.pnd')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.history.dyspnea.edema}
                      onChange={(e) => updateFormData('history.dyspnea.edema', e.target.checked)}
                      className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                    />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.edema')}</span>
                    {formData.history.dyspnea.edema && (
                      <Select
                        value={formData.history.dyspnea.edema_severity}
                        onChange={(e) => updateFormData('history.dyspnea.edema_severity', e.target.value)}
                        darkMode={darkMode}
                        options={[
                          { value: '', label: t('cardiologyReport.select') },
                          { value: 'mild', label: t('cardiologyReport.mild') },
                          { value: 'moderate', label: t('cardiologyReport.moderate') },
                          { value: 'severe', label: t('cardiologyReport.severe') }
                        ]}
                        className="w-32"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Palpitations / Syncope */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.history.palpitations.present}
                    onChange={(e) => updateFormData('history.palpitations.present', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <FieldLabel className="mb-0" darkMode={darkMode}>{t('cardiologyReport.palpitations')}</FieldLabel>
                </div>
                {formData.history.palpitations.present && (
                  <div className="space-y-2 pl-6">
                    <Input
                      placeholder={t('cardiologyReport.palpitationsDescription')}
                      value={formData.history.palpitations.description}
                      onChange={(e) => updateFormData('history.palpitations.description', e.target.value)}
                      darkMode={darkMode}
                    />
                    <Input
                      placeholder={t('cardiologyReport.palpitationsDuration')}
                      value={formData.history.palpitations.duration}
                      onChange={(e) => updateFormData('history.palpitations.duration', e.target.value)}
                      darkMode={darkMode}
                    />
                    <Input
                      placeholder={t('cardiologyReport.palpitationsTriggers')}
                      value={formData.history.palpitations.triggers}
                      onChange={(e) => updateFormData('history.palpitations.triggers', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.history.syncope.present}
                    onChange={(e) => updateFormData('history.syncope.present', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <FieldLabel className="mb-0" darkMode={darkMode}>{t('cardiologyReport.syncope')}</FieldLabel>
                </div>
                {formData.history.syncope.present && (
                  <div className="pl-6">
                    <TextArea
                      placeholder={t('cardiologyReport.syncopeCircumstances')}
                      value={formData.history.syncope.circumstances}
                      onChange={(e) => updateFormData('history.syncope.circumstances', e.target.value)}
                      rows={2}
                      darkMode={darkMode}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Other Cardiac Symptoms */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.otherCardiacSymptoms')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.other_symptoms.fatigue}
                  onChange={(e) => updateFormData('history.other_symptoms.fatigue', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.fatigue')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.other_symptoms.reduced_exercise_tolerance}
                  onChange={(e) => updateFormData('history.other_symptoms.reduced_exercise_tolerance', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.reducedExerciseTolerance')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.other_symptoms.chest_tightness}
                  onChange={(e) => updateFormData('history.other_symptoms.chest_tightness', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.chestTightness')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.other_symptoms.claudication}
                  onChange={(e) => updateFormData('history.other_symptoms.claudication', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.claudication')}</span>
              </label>
            </div>
          </div>

          {/* Risk Factors */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.riskFactors')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.htn}
                  onChange={(e) => updateFormData('history.risk_factors.htn', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.htn')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.diabetes}
                  onChange={(e) => updateFormData('history.risk_factors.diabetes', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.diabetes')}</span>
              </label>
              {formData.history.risk_factors.diabetes && (
                <>
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.diabetesType')}</FieldLabel>
                    <Select
                      value={formData.history.risk_factors.diabetes_type}
                      onChange={(e) => updateFormData('history.risk_factors.diabetes_type', e.target.value)}
                      darkMode={darkMode}
                      options={[
                        { value: '', label: t('cardiologyReport.select') },
                        { value: 'T1', label: t('cardiologyReport.type1') },
                        { value: 'T2', label: t('cardiologyReport.type2') }
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.diabetesDuration')}</FieldLabel>
                    <Input
                      placeholder={t('cardiologyReport.yearsPlaceholder')}
                      value={formData.history.risk_factors.diabetes_duration}
                      onChange={(e) => updateFormData('history.risk_factors.diabetes_duration', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                </>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.dyslipidemia}
                  onChange={(e) => updateFormData('history.risk_factors.dyslipidemia', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.dyslipidemia')}</span>
              </label>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.smoking')}</FieldLabel>
                <Select
                  value={formData.history.risk_factors.smoking}
                  onChange={(e) => updateFormData('history.risk_factors.smoking', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: 'never', label: t('cardiologyReport.never') },
                    { value: 'former', label: t('cardiologyReport.former') },
                    { value: 'current', label: t('cardiologyReport.current') }
                  ]}
                />
              </div>
              {(formData.history.risk_factors.smoking === 'current' || formData.history.risk_factors.smoking === 'former') && (
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.packYears')}</FieldLabel>
                  <Input
                    placeholder={t('cardiologyReport.packYears')}
                    value={formData.history.risk_factors.pack_years}
                    onChange={(e) => updateFormData('history.risk_factors.pack_years', e.target.value)}
                    darkMode={darkMode}
                  />
                </div>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.obesity}
                  onChange={(e) => updateFormData('history.risk_factors.obesity', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.obesity')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.family_cad}
                  onChange={(e) => updateFormData('history.risk_factors.family_cad', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.familyCad')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.family_sudden_death}
                  onChange={(e) => updateFormData('history.risk_factors.family_sudden_death', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.familySuddenDeath')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.ckd}
                  onChange={(e) => updateFormData('history.risk_factors.ckd', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.ckd')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.previous_mi}
                  onChange={(e) => updateFormData('history.risk_factors.previous_mi', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.previousMi')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.previous_stroke}
                  onChange={(e) => updateFormData('history.risk_factors.previous_stroke', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.previousStroke')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.previous_pci}
                  onChange={(e) => updateFormData('history.risk_factors.previous_pci', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.previousPci')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.history.risk_factors.previous_cabg}
                  onChange={(e) => updateFormData('history.risk_factors.previous_cabg', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.previousCabg')}</span>
              </label>
              <div className="col-span-2">
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.otherRiskFactors')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.otherRiskFactors')}
                  value={formData.history.risk_factors.other}
                  onChange={(e) => updateFormData('history.risk_factors.other', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Past Medical / Surgical History */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.pastMedicalSurgicalHistory')}</FieldLabel>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.mi}
                    onChange={(e) => updateFormData('history.past_medical.mi', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.mi')}</span>
                </label>
                {formData.history.past_medical.mi && (
                  <div className="col-span-3">
                    <Input
                      placeholder={t('cardiologyReport.miDates')}
                      value={formData.history.past_medical.mi_dates}
                      onChange={(e) => updateFormData('history.past_medical.mi_dates', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.angina}
                    onChange={(e) => updateFormData('history.past_medical.angina', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.angina')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.heart_failure}
                    onChange={(e) => updateFormData('history.past_medical.heart_failure', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.heartFailure')}</span>
                </label>
                <div className="col-span-2">
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.arrhythmias')}</FieldLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.history.past_medical.arrhythmias.map((a, i) => (
                      <Chip key={i} onRemove={() => {
                        const newArr = [...formData.history.past_medical.arrhythmias];
                        newArr.splice(i, 1);
                        updateFormData('history.past_medical.arrhythmias', newArr);
                      }} darkMode={darkMode}>{a}</Chip>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['AF', 'VT', 'VF', 'SVT', 'Bradycardia'].map(a => (
                      <button
                        key={a}
                        type="button"
                        className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} rounded text-sm`}
                        onClick={() => {
                          if (!formData.history.past_medical.arrhythmias.includes(a)) {
                            updateFormData('history.past_medical.arrhythmias', [...formData.history.past_medical.arrhythmias, a]);
                          }
                        }}
                      >
                        + {a}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.pci_stents}
                    onChange={(e) => updateFormData('history.past_medical.pci_stents', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.pciStents')}</span>
                </label>
                {formData.history.past_medical.pci_stents && (
                  <div className="col-span-3">
                    <Input
                      placeholder={t('cardiologyReport.pciDetails')}
                      value={formData.history.past_medical.pci_details}
                      onChange={(e) => updateFormData('history.past_medical.pci_details', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.cabg}
                    onChange={(e) => updateFormData('history.past_medical.cabg', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.cabg')}</span>
                </label>
                {formData.history.past_medical.cabg && (
                  <div>
                    <Input
                      placeholder={t('cardiologyReport.cabgDate')}
                      value={formData.history.past_medical.cabg_date}
                      onChange={(e) => updateFormData('history.past_medical.cabg_date', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.valve_surgery}
                    onChange={(e) => updateFormData('history.past_medical.valve_surgery', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.valveSurgery')}</span>
                </label>
                {formData.history.past_medical.valve_surgery && (
                  <div className="col-span-3">
                    <Input
                      placeholder={t('cardiologyReport.valveSurgeryDetails')}
                      value={formData.history.past_medical.valve_surgery_details}
                      onChange={(e) => updateFormData('history.past_medical.valve_surgery_details', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.stroke_tia}
                    onChange={(e) => updateFormData('history.past_medical.stroke_tia', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.strokeTia')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.copd_asthma}
                    onChange={(e) => updateFormData('history.past_medical.copd_asthma', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.copdAsthma')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.ckd}
                    onChange={(e) => updateFormData('history.past_medical.ckd', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.ckd')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.history.past_medical.thyroid}
                    onChange={(e) => updateFormData('history.past_medical.thyroid', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.thyroid')}</span>
                </label>
                <div className="col-span-4">
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.otherComorbidities')}</FieldLabel>
                  <TextArea
                    placeholder={t('cardiologyReport.comorbiditiesPlaceholder')}
                    value={formData.history.past_medical.other}
                    onChange={(e) => updateFormData('history.past_medical.other', e.target.value)}
                    rows={2}
                    darkMode={darkMode}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current Medications */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.currentMedications')}</FieldLabel>
            {patientMedications.length > 0 && (
              <div className={`mb-2 p-2 border rounded-lg ${
                darkMode 
                  ? 'bg-blue-900/30 border-blue-700' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className={`text-xs font-semibold mb-1 ${
                  darkMode ? 'text-blue-300' : 'text-blue-800'
                }`}>{t('cardiologyReport.fromPatientRecord') || 'From Patient Record'}</div>
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
                    updateFormData('history.current_meds', medsText);
                  }}
                  className={`mt-1 text-xs underline ${
                    darkMode 
                      ? 'text-blue-400 hover:text-blue-300' 
                      : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  {t('cardiologyReport.copyToForm') || 'Copy to Form'}
                </button>
              </div>
            )}
            <TextArea
              placeholder={t('cardiologyReport.currentMedicationsPlaceholder')}
              value={formData.history.current_meds}
              onChange={(e) => updateFormData('history.current_meds', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>

          {/* Allergies */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.allergies')}</FieldLabel>
            {patientAllergies.length > 0 && (
              <div className={`mb-2 p-2 border rounded-lg ${
                darkMode 
                  ? 'bg-yellow-900/30 border-yellow-700' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className={`text-xs font-semibold mb-1 ${
                  darkMode ? 'text-yellow-300' : 'text-yellow-800'
                }`}>{t('cardiologyReport.fromPatientRecord') || 'From Patient Record'}</div>
                <div className="space-y-1">
                  {patientAllergies.map((allergy, idx) => (
                    <div key={idx} className={`text-xs ${
                      darkMode ? 'text-yellow-300' : 'text-yellow-700'
                    }`}>
                      • {allergy.allergen_name || allergy.name || allergy.substance} {allergy.reaction ? `- ${allergy.reaction}` : ''}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allergiesText = patientAllergies.map(a => 
                      `${a.allergen_name || a.name || a.substance}${a.reaction ? ` - ${a.reaction}` : ''}`.trim()
                    ).join(', ');
                    updateFormData('history.allergies', allergiesText);
                  }}
                  className={`mt-1 text-xs underline ${
                    darkMode 
                      ? 'text-yellow-400 hover:text-yellow-300' 
                      : 'text-yellow-600 hover:text-yellow-800'
                  }`}
                >
                  {t('cardiologyReport.copyToForm') || 'Copy to Form'}
                </button>
              </div>
            )}
            <TextArea
              placeholder={t('cardiologyReport.allergiesPlaceholder')}
              value={formData.history.allergies}
              onChange={(e) => updateFormData('history.allergies', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>

          {/* Family History */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.familyHistory')}</FieldLabel>
            <TextArea
              placeholder={t('cardiologyReport.familyHistoryPlaceholder')}
              value={formData.history.family}
              onChange={(e) => updateFormData('history.family', e.target.value)}
              rows={2}
              darkMode={darkMode}
            />
          </div>

          {/* Social History */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.socialHistory')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.smoking')}</FieldLabel>
                <Select
                  value={formData.history.social.smoking}
                  onChange={(e) => updateFormData('history.social.smoking', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: 'never', label: t('cardiologyReport.never') },
                    { value: 'former', label: t('cardiologyReport.former') },
                    { value: 'current', label: t('cardiologyReport.current') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.alcohol')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.alcoholPlaceholder')}
                  value={formData.history.social.alcohol}
                  onChange={(e) => updateFormData('history.social.alcohol', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.occupationalLoad')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.occupationalLoadPlaceholder')}
                  value={formData.history.social.occupational_load}
                  onChange={(e) => updateFormData('history.social.occupational_load', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.physicalActivity')}</FieldLabel>
                <Select
                  value={formData.history.social.physical_activity}
                  onChange={(e) => updateFormData('history.social.physical_activity', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'sedentary', label: t('cardiologyReport.sedentary') },
                    { value: 'moderate', label: t('cardiologyReport.moderate') },
                    { value: 'high', label: t('cardiologyReport.high') }
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Objective */}
      <Card 
        title={t('cardiologyReport.objectiveFindings')} 
        collapsible 
        isOpen={!collapsedSections.objective}
        onToggle={() => toggleSection('objective')}
        darkMode={darkMode}
      >
        <div className="space-y-6">
          {/* Vitals */}
          <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.vitals')}</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.bp')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.bpPlaceholder')}
                  value={formData.objective.vitals.bp}
                  onChange={(e) => updateFormData('objective.vitals.bp', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.hr')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.hrPlaceholder')}
                  value={formData.objective.vitals.hr}
                  onChange={(e) => updateFormData('objective.vitals.hr', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.rr')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.rrPlaceholder')}
                  value={formData.objective.vitals.rr}
                  onChange={(e) => updateFormData('objective.vitals.rr', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.temp')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.tempPlaceholder')}
                  value={formData.objective.vitals.temp}
                  onChange={(e) => updateFormData('objective.vitals.temp', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.spo2')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.spo2Placeholder')}
                  value={formData.objective.vitals.spo2}
                  onChange={(e) => updateFormData('objective.vitals.spo2', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.weight')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.weightPlaceholder')}
                  value={formData.objective.vitals.weight}
                  onChange={(e) => updateFormData('objective.vitals.weight', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.height')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.heightPlaceholder')}
                  value={formData.objective.vitals.height}
                  onChange={(e) => updateFormData('objective.vitals.height', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.bmi')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.bmiPlaceholder')}
                  value={formData.objective.vitals.bmi}
                  readOnly
                  className={darkMode ? 'bg-slate-700' : 'bg-slate-100'}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* General */}
          <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.general')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.generalAppearance')}</FieldLabel>
                <Select
                  value={formData.objective.general_appearance}
                  onChange={(e) => updateFormData('objective.general_appearance', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'well', label: t('cardiologyReport.well') },
                    { value: 'ill', label: t('cardiologyReport.ill') },
                    { value: 'distressed', label: t('cardiologyReport.distressed') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.perfusion')}</FieldLabel>
                <Select
                  value={formData.objective.perfusion}
                  onChange={(e) => updateFormData('objective.perfusion', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'warm', label: t('cardiologyReport.warmExtremities') },
                    { value: 'cold', label: t('cardiologyReport.coldExtremities') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.consciousness')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.consciousnessPlaceholder')}
                  value={formData.objective.consciousness}
                  onChange={(e) => updateFormData('objective.consciousness', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Cardiovascular Exam */}
          <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.cardiovascularExam')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.jvp')}</FieldLabel>
                <Select
                  value={formData.objective.cardio.jvp}
                  onChange={(e) => updateFormData('objective.cardio.jvp', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'normal', label: t('cardiologyReport.normal') },
                    { value: 'elevated', label: t('cardiologyReport.elevated') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.apexBeat')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.apexBeatPlaceholder')}
                  value={formData.objective.cardio.apex_beat}
                  onChange={(e) => updateFormData('objective.cardio.apex_beat', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.heartSounds')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.heartSoundsPlaceholder')}
                  value={formData.objective.cardio.heart_sounds}
                  onChange={(e) => updateFormData('objective.cardio.heart_sounds', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.murmurs')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.murmursPlaceholder')}
                  value={formData.objective.cardio.murmurs}
                  onChange={(e) => updateFormData('objective.cardio.murmurs', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.peripheralPulses')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.peripheralPulsesPlaceholder')}
                  value={formData.objective.cardio.peripheral_pulses}
                  onChange={(e) => updateFormData('objective.cardio.peripheral_pulses', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.peripheralEdema')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.peripheralEdemaPlaceholder')}
                  value={formData.objective.cardio.peripheral_edema}
                  onChange={(e) => updateFormData('objective.cardio.peripheral_edema', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Respiratory System */}
          <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.respiratorySystem')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.breathingPattern')}</FieldLabel>
                <Select
                  value={formData.objective.respiratory.breathing_pattern}
                  onChange={(e) => updateFormData('objective.respiratory.breathing_pattern', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'normal', label: t('cardiologyReport.normal') },
                    { value: 'tachypneic', label: t('cardiologyReport.tachypneic') },
                    { value: 'labored', label: t('cardiologyReport.labored') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.auscultation')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.auscultationPlaceholder')}
                  value={formData.objective.respiratory.auscultation}
                  onChange={(e) => updateFormData('objective.respiratory.auscultation', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Others */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.others')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.abdomen')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.abdomenPlaceholder')}
                  value={formData.objective.abdomen}
                  onChange={(e) => updateFormData('objective.abdomen', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.neurologic')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.neurologicPlaceholder')}
                  value={formData.objective.neurologic}
                  onChange={(e) => updateFormData('objective.neurologic', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Investigations */}
      <Card 
        title="Investigations" 
        collapsible 
        isOpen={!collapsedSections.investigations}
        onToggle={() => toggleSection('investigations')}
        counter={formData.investigations.referenced_docs.length}
        darkMode={darkMode}
      >
        <div className="space-y-6">
          {/* Labs */}
          <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.labs')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.troponin')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.troponinPlaceholder')}
                  value={formData.investigations.labs.troponin}
                  onChange={(e) => updateFormData('investigations.labs.troponin', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.troponinDate')}</FieldLabel>
                <Input
                  type="date"
                  value={formData.investigations.labs.troponin_date}
                  onChange={(e) => updateFormData('investigations.labs.troponin_date', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.bnp')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.bnpPlaceholder')}
                  value={formData.investigations.labs.bnp}
                  onChange={(e) => updateFormData('investigations.labs.bnp', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.ntProbnp')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.ntProbnpPlaceholder')}
                  value={formData.investigations.labs.nt_probnp}
                  onChange={(e) => updateFormData('investigations.labs.nt_probnp', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.importantLabs')}</FieldLabel>
                <TextArea
                  placeholder={t('cardiologyReport.importantLabsPlaceholder')}
                  value={formData.investigations.labs.important_labs}
                  onChange={(e) => updateFormData('investigations.labs.important_labs', e.target.value)}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* ECG Summary */}
          <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.ecgSummary')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.rhythm')}</FieldLabel>
                <Select
                  value={formData.investigations.ecg.rhythm}
                  onChange={(e) => updateFormData('investigations.ecg.rhythm', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'sinus', label: t('cardiologyReport.sinus') },
                    { value: 'af', label: t('cardiologyReport.af') },
                    { value: 'flutter', label: t('cardiologyReport.flutter') },
                    { value: 'ectopic', label: t('cardiologyReport.ectopic') },
                    { value: 'paced', label: t('cardiologyReport.paced') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.rate')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.ratePlaceholder')}
                  value={formData.investigations.ecg.rate}
                  onChange={(e) => updateFormData('investigations.ecg.rate', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.axis')}</FieldLabel>
                <Select
                  value={formData.investigations.ecg.axis}
                  onChange={(e) => updateFormData('investigations.ecg.axis', e.target.value)}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'normal', label: t('cardiologyReport.normal') },
                    { value: 'left', label: t('cardiologyReport.left') },
                    { value: 'right', label: t('cardiologyReport.right') },
                    { value: 'indeterminate', label: t('cardiologyReport.indeterminate') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.stTChanges')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.stTChangesPlaceholder')}
                  value={formData.investigations.ecg.st_t_changes}
                  onChange={(e) => updateFormData('investigations.ecg.st_t_changes', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.conduction')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.conductionPlaceholder')}
                  value={formData.investigations.ecg.conduction}
                  onChange={(e) => updateFormData('investigations.ecg.conduction', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.other')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.otherPlaceholder')}
                  value={formData.investigations.ecg.other}
                  onChange={(e) => updateFormData('investigations.ecg.other', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Echo Summary */}
          <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.echoSummary')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.lvef')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.lvefPlaceholder')}
                  value={formData.investigations.echo.lvef}
                  onChange={(e) => updateFormData('investigations.echo.lvef', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.wallMotion')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.wallMotionPlaceholder')}
                  value={formData.investigations.echo.wall_motion}
                  onChange={(e) => updateFormData('investigations.echo.wall_motion', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.valves')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.valvesPlaceholder')}
                  value={formData.investigations.echo.valves}
                  onChange={(e) => updateFormData('investigations.echo.valves', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.chambers')}</FieldLabel>
                <Input
                  placeholder={t('cardiologyReport.chambersPlaceholder')}
                  value={formData.investigations.echo.chambers}
                  onChange={(e) => updateFormData('investigations.echo.chambers', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.investigations.echo.pericardial_effusion}
                    onChange={(e) => updateFormData('investigations.echo.pericardial_effusion', e.target.checked)}
                    className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  />
                  <FieldLabel className="mb-0 text-xs" darkMode={darkMode}>{t('cardiologyReport.pericardialEffusion')}</FieldLabel>
                </div>
                {formData.investigations.echo.pericardial_effusion && (
                  <Input
                    placeholder={t('cardiologyReport.pericardialEffusionSize')}
                    value={formData.investigations.echo.pericardial_effusion_size}
                    onChange={(e) => updateFormData('investigations.echo.pericardial_effusion_size', e.target.value)}
                    darkMode={darkMode}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Investigation Notes */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.investigationNotes')}</FieldLabel>
            <TextArea
              name="investigations_notes"
              placeholder={t('cardiologyReport.investigationNotesPlaceholder')}
              value={formData.investigations.notes}
              onChange={(e) => updateFormData('investigations.notes', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>
          
          {/* Referenced Documents */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.referencedDocuments')}</FieldLabel>
            <div className="space-y-2">
              {formData.investigations.referenced_docs.map((doc, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded`}>
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{doc.type}</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : ''}`}>{doc.title}</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{doc.date}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('investigations.referenced_docs', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={`px-3 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg text-sm`}
                onClick={() => addToArray('investigations.referenced_docs', {
                  type: 'ecg',
                  title: 'ECG',
                  date: new Date().toISOString().split('T')[0]
                })}
              >
                {t('cardiologyReport.addReference')}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Imaging Links */}
      <Card 
        title={t('cardiologyReport.imagingStudies')} 
        collapsible 
        isOpen={!collapsedSections.imaging}
        onToggle={() => toggleSection('imaging')}
        counter={formData.imaging_links.length}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ${loadingImaging ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={loadImagingStudies}
              disabled={loadingImaging}
            >
              {loadingImaging ? (t('cardiologyReport.loading') || 'Loading...') : (t('cardiologyReport.loadImagingAuto') || 'Load Imaging')}
            </button>
            <input
              type="text"
              placeholder={t('cardiologyReport.searchStudies')}
              value={imagingSearchQuery}
              onChange={(e) => setImagingSearchQuery(e.target.value)}
              className={`flex-1 px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-600'} rounded-lg`}
            />
          </div>

          {loadingImaging && (
            <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('cardiologyReport.loadingStudies') || 'Loading imaging studies...'}
            </div>
          )}

          {!loadingImaging && availableImaging.length === 0 && (
            <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('cardiologyReport.noStudiesFound') || 'No imaging studies found for this patient.'}
            </div>
          )}

          {!loadingImaging && availableImaging.length > 0 && (
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.availableStudies')}</FieldLabel>
              <div className="space-y-2">
                {availableImaging
                  .filter(study => {
                    if (!imagingSearchQuery.trim()) return true;
                    const query = imagingSearchQuery.toLowerCase();
                    return (
                      (study.modality && study.modality.toLowerCase().includes(query)) ||
                      (study.description && study.description.toLowerCase().includes(query)) ||
                      (study.study_uid && study.study_uid.toLowerCase().includes(query)) ||
                      (study.date && study.date.includes(query))
                    );
                  })
                  .map((study, index) => (
                <div key={index} className={`flex items-center justify-between p-3 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} rounded-lg`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className={`font-medium ${darkMode ? 'text-slate-200' : ''}`}>{study.modality}</span>
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{study.date}</span>
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{study.description}</span>
                      <span className={`font-mono text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{study.study_uid}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      onClick={() => openImagingViewer(study)}
                    >
                      {t('cardiologyReport.openViewer')}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                      onClick={() => addImagingToReport(study)}
                    >
                      {t('cardiologyReport.addToReport')}
                    </button>
                  </div>
                </div>
                  ))}
              </div>
            </div>
          )}

          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.selectedStudies')}</FieldLabel>
            <div className="space-y-2">
              {formData.imaging_links.map((imaging, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded`}>
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : ''}`}>{imaging.modality}</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{imaging.description}</span>
                  <select 
                    className={`text-xs border rounded px-1 py-0.5 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}
                    value={imaging.attach || 'reference_only'}
                    onChange={(e) => {
                      const next = structuredClone(formData.imaging_links);
                      next[index].attach = e.target.value;
                      updateFormData('imaging_links', next);
                    }}
                  >
                    <option value="reference_only" className={darkMode ? 'bg-slate-800' : ''}>{t('cardiologyReport.referenceOnly')}</option>
                    <option value="embed_in_pdf" className={darkMode ? 'bg-slate-800' : ''}>{t('cardiologyReport.embedInPDF')}</option>
                  </select>
                  <input
                    className={`text-xs border rounded px-2 py-1 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}
                    placeholder={t('cardiologyReport.note')}
                    value={imaging.note || ''}
                    onChange={(e) => {
                      const next = structuredClone(formData.imaging_links);
                      next[index].note = e.target.value;
                      updateFormData('imaging_links', next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => openImagingViewer(imaging)}
                    className="text-blue-600 hover:text-blue-800"
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

      {/* Review of Systems */}
      <Card 
        title={t('cardiologyReport.reviewOfSystems')} 
        collapsible 
        isOpen={!collapsedSections.objective}
        onToggle={() => toggleSection('objective')}
        darkMode={darkMode}
      >
        <ToggleMatrix
          items={[
            {key:'respiratory',label:t('cardiologyReport.respiratory')},
            {key:'cardio',label:t('cardiologyReport.cardio')},
            {key:'gi',label:t('cardiologyReport.gi')},
            {key:'neuro',label:t('cardiologyReport.neuro')},
            {key:'gu',label:t('cardiologyReport.gu')},
            {key:'derm',label:t('cardiologyReport.derm')},
            {key:'ent',label:t('cardiologyReport.ent')},
            {key:'msk',label:t('cardiologyReport.msk')}
          ]}
          values={formData.ros || {}} 
          onChange={(k, v) => updateFormData(`ros.${k}`, v)}
          notes={formData.ros?.notes || {}} 
          onNoteChange={(k, v) => updateFormData(`ros.notes.${k}`, v)}
          darkMode={darkMode}
        />
      </Card>

      {/* Physical Examination */}
      <Card 
        title={t('cardiologyReport.physicalExamination')} 
        collapsible 
        isOpen={!collapsedSections.objective}
        onToggle={() => toggleSection('objective')}
        darkMode={darkMode}
      >
        <ToggleMatrix
          items={[
            {key:'general',label:t('cardiologyReport.general')},
            {key:'lungs',label:t('cardiologyReport.lungs')},
            {key:'heart',label:t('cardiologyReport.heart')},
            {key:'abdomen',label:t('cardiologyReport.abdomen')},
            {key:'neuro',label:t('cardiologyReport.neuro')},
            {key:'extremities',label:t('cardiologyReport.extremities')}
          ]}
          values={formData.pe || {}} 
          onChange={(k, v) => updateFormData(`pe.${k}`, v)}
          notes={formData.pe?.notes || {}} 
          onNoteChange={(k, v) => updateFormData(`pe.notes.${k}`, v)}
          darkMode={darkMode}
        />
      </Card>

      {/* Diagnosis */}
      <Card 
        title={t('cardiologyReport.diagnosis')} 
        collapsible 
        isOpen={!collapsedSections.diagnosis}
        onToggle={() => toggleSection('diagnosis')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel required darkMode={darkMode}>{t('cardiologyReport.mainDiagnosis')}</FieldLabel>
            <div className="space-y-2">
              {formData.diagnosis.main && typeof formData.diagnosis.main === 'object' && (formData.diagnosis.main.code || formData.diagnosis.main.term) ? (
                <div className="flex gap-2 items-start">
                  <div className="flex gap-2 items-start flex-1">
                    <Input
                      placeholder={t('cardiologyReport.icd11Code')}
                      value={formData.diagnosis.main.code || ''}
                      onChange={(e) => {
                        const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                        updateFormData('diagnosis.main', { ...current, code: e.target.value });
                      }}
                      className="w-40"
                      darkMode={darkMode}
                    />
                    <Input
                      placeholder={t('cardiologyReport.diagnosisTerm')}
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
                    className={`px-3 py-2 ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'} rounded transition-colors`}
                  >
                    {t('cardiologyReport.clear')}
                  </button>
                </div>
              ) : null}
              <IcdCodeSearchInput
                placeholder={t('cardiologyReport.searchIcd11Code')}
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

          {/* Functional / Severity Class */}
          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.functionalSeverityClass')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.forAnginaCcsClass')}</FieldLabel>
                <Select
                  value={formData.diagnosis.functional_class && formData.diagnosis.functional_class.startsWith('CCS') ? formData.diagnosis.functional_class : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateFormData('diagnosis.functional_class', e.target.value);
                    } else {
                      // Keep NYHA if it exists, otherwise clear
                      const current = formData.diagnosis.functional_class || '';
                      if (current.startsWith('NYHA')) {
                        // Keep NYHA
                      } else {
                        updateFormData('diagnosis.functional_class', '');
                      }
                    }
                  }}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'CCS I', label: t('cardiologyReport.ccsI') },
                    { value: 'CCS II', label: t('cardiologyReport.ccsII') },
                    { value: 'CCS III', label: t('cardiologyReport.ccsIII') },
                    { value: 'CCS IV', label: t('cardiologyReport.ccsIV') }
                  ]}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.forHeartFailureNyhaClass')}</FieldLabel>
                <Select
                  value={formData.diagnosis.functional_class && formData.diagnosis.functional_class.startsWith('NYHA') ? formData.diagnosis.functional_class : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateFormData('diagnosis.functional_class', e.target.value);
                    } else {
                      // Keep CCS if it exists, otherwise clear
                      const current = formData.diagnosis.functional_class || '';
                      if (current.startsWith('CCS')) {
                        // Keep CCS
                      } else {
                        updateFormData('diagnosis.functional_class', '');
                      }
                    }
                  }}
                  darkMode={darkMode}
                  options={[
                    { value: '', label: t('cardiologyReport.select') },
                    { value: 'NYHA I', label: t('cardiologyReport.nyhaI') },
                    { value: 'NYHA II', label: t('cardiologyReport.nyhaII') },
                    { value: 'NYHA III', label: t('cardiologyReport.nyhaIII') },
                    { value: 'NYHA IV', label: t('cardiologyReport.nyhaIV') }
                  ]}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.comorbidities')}</FieldLabel>
              <TextArea
                name="diagnosis_comorbid"
                placeholder={t('cardiologyReport.comorbiditiesPlaceholder')}
                value={formData.diagnosis.comorbid}
                onChange={(e) => updateFormData('diagnosis.comorbid', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.complications')}</FieldLabel>
              <TextArea
                name="diagnosis_complications"
                placeholder={t('cardiologyReport.complicationsPlaceholder')}
                value={formData.diagnosis.complications}
                onChange={(e) => updateFormData('diagnosis.complications', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.diagnosisCodes')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.codes.map((code, index) => (
                <Chip
                  key={index}
                  onRemove={() => removeFromArray('diagnosis.codes', index)}
                  darkMode={darkMode}
                >
                  {code.system}: {code.code} - {code.term}
                </Chip>
              ))}
            </div>
            <IcdCodeSearchInput
              placeholder={t('cardiologyReport.searchIcd11CodeToAdd')}
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

      {/* Plan (Initial mode only) */}
      {mode === 'initial' && (
        <Card 
          title={t('cardiologyReport.planTreatment')} 
          collapsible 
          isOpen={!collapsedSections.plan}
          onToggle={() => toggleSection('plan')}
          darkMode={darkMode}
        >
          <div className="space-y-4">
            {/* Tests */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.tests')} <span className={darkMode ? 'text-slate-400' : 'text-slate-400'}>({formData.plan.tests.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {['ecg','echo','treadmill','holter','abpm','lipids','hba1c','cmp','troponin','bnpNtProbnp','cxr','other'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => openTestEditor({ label: preset, type: ['ecg','echo','treadmill','holter','abpm','cxr'].includes(preset) ? 'imaging' : 'lab' })}
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    {t(`cardiologyReport.${preset}`)}
                  </button>
                ))}
              </div>

              {formData.plan.tests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.tests.map((t, idx) => {
                    const obj = convertStringToTest(t);
                    const testKeys = ['ecg','echo','treadmill','holter','abpm','cxr','lipids','hba1c','cmp','troponin','bnpNtProbnp','other'];
                    const displayLabel = typeof t === 'string' && testKeys.includes(t) ? t(`cardiologyReport.${t}`) : obj.label;
                    return (
                      <Chip key={idx} onEdit={() => openTestEditor(obj, idx)} onRemove={() => removeTest(idx)} darkMode={darkMode}>
                        {displayLabel}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {editingTest && (
                <div className={`mt-3 grid grid-cols-12 gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-lg border`}>
                  <div className="col-span-12">
                    <Select 
                      name="test.type" 
                      value={editingTest.type} 
                      onChange={(e) => setEditingTest(s => ({...s, type: e.target.value}))}
                      darkMode={darkMode}
                      options={[{value:'lab',label:t('cardiologyReport.lab')},{value:'imaging',label:t('cardiologyReport.imaging')}]} 
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.label" 
                      placeholder={t('cardiologyReport.testName')} 
                      value={editingTest.label} 
                      onChange={(e) => setEditingTest(s => ({...s, label: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.note" 
                      placeholder={t('cardiologyReport.clinicalQuestionNote')} 
                      value={editingTest.note || ''} 
                      onChange={(e) => setEditingTest(s => ({...s, note: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.dest" 
                      placeholder={t('cardiologyReport.destinationClinicOptional')} 
                      value={editingTest.destinationClinicId || ''} 
                      onChange={(e) => setEditingTest(s => ({...s, destinationClinicId: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => {setEditingTest(null); setEditingTestIdx(null);}} 
                      className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
                    >
                      {t('cardiologyReport.cancel')}
                    </button>
                    <button 
                      type="button" 
                      onClick={saveTest} 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      {t('cardiologyReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className="my-4" />

            {/* Referrals */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.referrals')} <span className={darkMode ? 'text-slate-400' : 'text-slate-400'}>({formData.plan.referrals.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {['interventionalCardiology','cardiothoracicSurgery','endocrinology','nephrology','pulmonology','rehab','other'].map(sp => (
                  <button 
                    key={sp} 
                    type="button" 
                    onClick={() => openRefEditor({specialty: sp})} 
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    {t(`cardiologyReport.${sp}`)}
                  </button>
                ))}
              </div>

              {formData.plan.referrals.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.referrals.map((r, idx) => {
                    const obj = convertStringToReferral(r);
                    const referralKeys = ['interventionalCardiology','cardiothoracicSurgery','endocrinology','nephrology','pulmonology','rehab','other'];
                    const specialtyDisplay = typeof r === 'string' && referralKeys.includes(r) ? t(`cardiologyReport.${r}`) : (obj.doctorId ? `Dr ${obj.doctorId}` : obj.specialty);
                    return (
                      <Chip key={idx} onEdit={() => openRefEditor(obj, idx)} onRemove={() => removeRef(idx)} darkMode={darkMode}>
                        {specialtyDisplay}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {editingRef && (
                <div className={`mt-3 grid grid-cols-12 gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-lg border`}>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.specialty')} 
                      value={editingRef.specialty} 
                      onChange={(e) => setEditingRef(s => ({...s, specialty: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.specificDoctorOptional')} 
                      value={editingRef.doctorId || ''} 
                      onChange={(e) => setEditingRef(s => ({...s, doctorId: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.reasonNote')} 
                      value={editingRef.reason || ''} 
                      onChange={(e) => setEditingRef(s => ({...s, reason: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Select 
                      name="urgency" 
                      value={editingRef.urgency || 'routine'} 
                      onChange={(e) => setEditingRef(s => ({...s, urgency: e.target.value}))}
                      darkMode={darkMode}
                      options={[{value:'routine',label:t('cardiologyReport.routine')},{value:'soon',label:t('cardiologyReport.soon')},{value:'urgent',label:t('cardiologyReport.urgent')}]} 
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.destinationClinicOptional')} 
                      value={editingRef.destinationClinicId || ''} 
                      onChange={(e) => setEditingRef(s => ({...s, destinationClinicId: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
                      onClick={() => {setEditingRef(null); setEditingRefIdx(null);}}
                    >
                      {t('cardiologyReport.cancel')}
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" 
                      onClick={saveRef}
                    >
                      {t('cardiologyReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className="my-4" />

            {/* Medications */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.medications')} <span className={darkMode ? 'text-slate-400' : 'text-slate-400'}>({formData.plan.meds.length})</span></FieldLabel>
              <button 
                type="button" 
                onClick={() => openMedEditor()} 
                className={`px-4 py-2 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded mb-3`}
              >
                {t('cardiologyReport.addMedication')}
              </button>

              {formData.plan.meds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.meds.map((m, idx) => {
                    const obj = convertStringToMed(m);
                    const label = typeof m === 'string' ? m : `${obj.med} ${obj.dose} ${obj.route} ${obj.freq}`;
                    return (
                      <Chip key={idx} onEdit={() => openMedEditor(obj, idx)} onRemove={() => removeMed(idx)} darkMode={darkMode}>
                        {label}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {editingMed && (
                <div className={`mt-3 grid grid-cols-12 gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-lg border`}>
                  <div className="col-span-12">
                    <MedicationSearchInput
                      placeholder={t('cardiologyReport.addMedication')}
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
                      placeholder={t('cardiologyReport.dose')} 
                      value={editingMed.dose} 
                      onChange={(e) => setEditingMed(s => ({...s, dose: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.route')} 
                      value={editingMed.route} 
                      onChange={(e) => setEditingMed(s => ({...s, route: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.freq')} 
                      value={editingMed.freq} 
                      onChange={(e) => setEditingMed(s => ({...s, freq: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.duration')} 
                      value={editingMed.duration} 
                      onChange={(e) => setEditingMed(s => ({...s, duration: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={editingMed.sendToPharmacy || false} 
                      onChange={(e) => setEditingMed(s => ({...s, sendToPharmacy: e.target.checked}))} 
                      className={`w-4 h-4 rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                    />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.sendToPharmacy')}</span>
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('cardiologyReport.instructions')} 
                      value={editingMed.instructions || ''} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  {editingMed.sendToPharmacy && (
                    <div className="col-span-12">
                      <Input 
                        placeholder={t('cardiologyReport.pharmacyId')} 
                        value={editingMed.pharmacyId || ''} 
                        onChange={(e) => setEditingMed(s => ({...s, pharmacyId: e.target.value}))}
                        darkMode={darkMode}
                      />
                    </div>
                  )}
                  <div className="col-span-12 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
                      onClick={() => {setEditingMed(null); setEditingMedIdx(null);}}
                    >
                      {t('cardiologyReport.cancel')}
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" 
                      onClick={saveMed}
                    >
                      {t('cardiologyReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.lifestyleRecommendations')}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {formData.plan.lifestyle.map((item, index) => (
                  <Chip
                    key={index}
                    onRemove={() => removeFromArray('plan.lifestyle', index)}
                    darkMode={darkMode}
                  >
                    {item}
                  </Chip>
                ))}
                <button
                  type="button"
                  className={`px-3 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg text-sm`}
                  onClick={() => addToArray('plan.lifestyle', 'Low sodium diet')}
                >
                  {t('cardiologyReport.addLifestyle')}
                </button>
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.followUp')}</FieldLabel>
              <Input
                name="plan_follow_up"
                placeholder={t('cardiologyReport.followUpPlaceholder')}
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                darkMode={darkMode}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Procedure */}
      <Card 
        title={t('cardiologyReport.procedureOperation')} 
        collapsible 
        isOpen={!collapsedSections.procedure}
        onToggle={() => toggleSection('procedure')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.procedureName')}</FieldLabel>
              <Input
                name="procedure_name"
                placeholder={t('cardiologyReport.procedureNamePlaceholder')}
                value={formData.procedure.name}
                onChange={(e) => updateFormData('procedure.name', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.procedureDate')}</FieldLabel>
              <Input
                name="procedure_date"
                type="date"
                value={formData.procedure.date}
                onChange={(e) => updateFormData('procedure.date', e.target.value)}
                darkMode={darkMode}
              />
              {errors.procedure_date && (
                <p className="text-red-500 text-sm mt-1">{errors.procedure_date}</p>
              )}
            </div>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('cardiologyReport.procedureNotes')}</FieldLabel>
            <TextArea
              name="procedure_notes"
              placeholder={t('cardiologyReport.procedureNotesPlaceholder')}
              value={formData.procedure.notes}
              onChange={(e) => updateFormData('procedure.notes', e.target.value)}
              rows={4}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Outcome & Recommendations (Discharge mode only) */}
      {mode === 'discharge' && (
        <Card 
          title={t('cardiologyReport.outcomeRecommendations')} 
          collapsible 
          isOpen={!collapsedSections.outcome}
          onToggle={() => toggleSection('outcome')}
          darkMode={darkMode}
        >
          <div className="space-y-6">
            {/* Hospital Course */}
            <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.hospitalCourse')}</FieldLabel>
              <TextArea
                name="outcome_hospital_course"
                placeholder={t('cardiologyReport.hospitalCoursePlaceholder')}
                value={formData.outcome.hospital_course}
                onChange={(e) => updateFormData('outcome.hospital_course', e.target.value)}
                rows={5}
                darkMode={darkMode}
              />
            </div>

            {/* Discharge Condition */}
            <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.dischargeCondition')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.hemodynamicStability')}</FieldLabel>
                  <Input
                    placeholder={t('cardiologyReport.hemodynamicStabilityPlaceholder')}
                    value={formData.outcome.hemodynamic_stability}
                    onChange={(e) => updateFormData('outcome.hemodynamic_stability', e.target.value)}
                    darkMode={darkMode}
                />
              </div>
              <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.persistingSymptoms')}</FieldLabel>
                  <Input
                    placeholder={t('cardiologyReport.persistingSymptomsPlaceholder')}
                    value={formData.outcome.persisting_symptoms}
                    onChange={(e) => updateFormData('outcome.persisting_symptoms', e.target.value)}
                    darkMode={darkMode}
                  />
              </div>
              <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.vitalsAtDischarge')}</FieldLabel>
                  <Input
                    placeholder={t('cardiologyReport.vitalsAtDischargePlaceholder')}
                    value={formData.outcome.vitals_at_discharge}
                    onChange={(e) => updateFormData('outcome.vitals_at_discharge', e.target.value)}
                    darkMode={darkMode}
                  />
              </div>
              <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.nyhaAtDischarge')}</FieldLabel>
                  <Select
                    value={formData.outcome.nyha_at_discharge}
                    onChange={(e) => updateFormData('outcome.nyha_at_discharge', e.target.value)}
                    darkMode={darkMode}
                    options={[
                      { value: '', label: t('cardiologyReport.select') },
                      { value: 'NYHA I', label: t('cardiologyReport.nyhaI') },
                      { value: 'NYHA II', label: t('cardiologyReport.nyhaII') },
                      { value: 'NYHA III', label: t('cardiologyReport.nyhaIII') },
                      { value: 'NYHA IV', label: t('cardiologyReport.nyhaIV') }
                    ]}
                  />
              </div>
            </div>
            </div>
            
            {/* Discharge Medications */}
            <div className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} pb-4`}>
              <FieldLabel darkMode={darkMode}>{t('cardiologyReport.dischargeMedications')}</FieldLabel>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{t('cardiologyReport.dischargeMedicationsDescription')}</p>
              <div className="space-y-2">
                {formData.plan.meds.length > 0 ? (
                  <div className="space-y-2">
                    {formData.plan.meds.map((m, idx) => {
                      const obj = convertStringToMed(m);
                      const label = typeof m === 'string' ? m : `${obj.med} ${obj.dose} ${obj.route} ${obj.freq} ${obj.duration || 'long-term'}`;
                      return (
                        <div key={idx} className={`p-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded`}>
                          <span className={`text-sm ${darkMode ? 'text-slate-200' : ''}`}>{label}</span>
                          {obj.instructions && (
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>{t('cardiologyReport.instructions')}: {obj.instructions}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{t('cardiologyReport.noMedicationsAddedYet')}</p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <FieldLabel required darkMode={darkMode}>{t('cardiologyReport.recommendations')}</FieldLabel>
              <div className="space-y-4">
                {/* Follow-up */}
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.followUp')}</FieldLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.followUpWith')}</FieldLabel>
                      <Input
                        placeholder={t('cardiologyReport.followUpWithPlaceholder')}
                        value={formData.recommendations.find(r => r.toLowerCase().includes('follow-up') || r.toLowerCase().includes('with')) || ''}
                        onChange={(e) => {
                          const existing = formData.recommendations.findIndex(r => r.toLowerCase().includes('follow-up') || r.toLowerCase().includes('with'));
                          if (existing >= 0) {
                            const newRecs = [...formData.recommendations];
                            newRecs[existing] = `${t('cardiologyReport.followUp')} ${t('cardiologyReport.followUpWith')}: ${e.target.value}`;
                            updateFormData('recommendations', newRecs);
                          } else {
                            addToArray('recommendations', `${t('cardiologyReport.followUp')} ${t('cardiologyReport.followUpWith')}: ${e.target.value}`);
                          }
                        }}
                        darkMode={darkMode}
                      />
                    </div>
                    <div>
                      <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.followUpWhen')}</FieldLabel>
                      <Input
                        placeholder={t('cardiologyReport.followUpWhenPlaceholder')}
                        value={formData.recommendations.find(r => r.toLowerCase().includes('when') || r.match(/\d+\s*(week|month|day)/i)) || ''}
                        onChange={(e) => {
                          const existing = formData.recommendations.findIndex(r => r.toLowerCase().includes('when') || r.match(/\d+\s*(week|month|day)/i));
                          if (existing >= 0) {
                            const newRecs = [...formData.recommendations];
                            newRecs[existing] = `${t('cardiologyReport.followUp')} ${t('cardiologyReport.followUpWhen')}: ${e.target.value}`;
                            updateFormData('recommendations', newRecs);
                          } else {
                            addToArray('recommendations', `${t('cardiologyReport.followUp')} ${t('cardiologyReport.followUpWhen')}: ${e.target.value}`);
                          }
                        }}
                        darkMode={darkMode}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.whatToBring')}</FieldLabel>
                    <Input
                      placeholder={t('cardiologyReport.whatToBringPlaceholder')}
                      value={formData.recommendations.find(r => r.toLowerCase().includes('bring')) || ''}
                      onChange={(e) => {
                        const existing = formData.recommendations.findIndex(r => r.toLowerCase().includes('bring'));
                        if (existing >= 0) {
                          const newRecs = [...formData.recommendations];
                          newRecs[existing] = `${t('cardiologyReport.whatToBring')}: ${e.target.value}`;
                          updateFormData('recommendations', newRecs);
                        } else {
                          addToArray('recommendations', `${t('cardiologyReport.whatToBring')}: ${e.target.value}`);
                        }
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                </div>

                {/* Red-flag Symptoms */}
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.redFlagSymptoms')}</FieldLabel>
              <div className="space-y-2">
                    {[
                      t('cardiologyReport.suddenWorseningDyspnea'),
                      t('cardiologyReport.chestPainNotRelieved'),
                      t('cardiologyReport.syncopeSevereDizziness'),
                      t('cardiologyReport.rapidWeightGainEdema')
                    ].map((symptom, idx) => {
                      const existing = formData.recommendations.findIndex(r => r.toLowerCase().includes(symptom.toLowerCase().split(' ')[0]));
                      return (
                        <label key={idx} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={existing >= 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addToArray('recommendations', `${t('cardiologyReport.recommendations')}: ${symptom}`);
                              } else {
                                removeFromArray('recommendations', existing);
                              }
                            }}
                            className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                          />
                          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{symptom}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Lifestyle & Rehab */}
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.lifestyleRehab')}</FieldLabel>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.recommendations.some(r => r.toLowerCase().includes('cardiac rehab'))}
                        onChange={(e) => {
                          const existing = formData.recommendations.findIndex(r => r.toLowerCase().includes('cardiac rehab'));
                          if (e.target.checked && existing < 0) {
                            addToArray('recommendations', t('cardiologyReport.cardiacRehabReferral'));
                          } else if (!e.target.checked && existing >= 0) {
                            removeFromArray('recommendations', existing);
                          }
                        }}
                        className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                      />
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('cardiologyReport.cardiacRehabReferral')}</span>
                    </label>
                    <Input
                      placeholder={t('cardiologyReport.walkingProgram')}
                      value={formData.recommendations.find(r => r.toLowerCase().includes('walking') || r.toLowerCase().includes('work')) || ''}
                      onChange={(e) => {
                        const existing = formData.recommendations.findIndex(r => r.toLowerCase().includes('walking') || r.toLowerCase().includes('work'));
                        if (existing >= 0) {
                          const newRecs = [...formData.recommendations];
                          newRecs[existing] = e.target.value;
                          updateFormData('recommendations', newRecs);
                        } else if (e.target.value) {
                          addToArray('recommendations', e.target.value);
                        }
                      }}
                      darkMode={darkMode}
                    />
                    <Input
                      placeholder={t('cardiologyReport.drivingRestrictions')}
                      value={formData.recommendations.find(r => r.toLowerCase().includes('driving')) || ''}
                      onChange={(e) => {
                        const existing = formData.recommendations.findIndex(r => r.toLowerCase().includes('driving'));
                        if (existing >= 0) {
                          const newRecs = [...formData.recommendations];
                          newRecs[existing] = e.target.value;
                          updateFormData('recommendations', newRecs);
                        } else if (e.target.value) {
                          addToArray('recommendations', e.target.value);
                        }
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                </div>

                {/* Additional Recommendations */}
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('cardiologyReport.additionalRecommendations')}</FieldLabel>
                  <div className="space-y-2">
                    {formData.recommendations.filter(r => 
                      !r.toLowerCase().includes('follow-up') && 
                      !r.toLowerCase().includes('with') &&
                      !r.toLowerCase().includes('when') &&
                      !r.toLowerCase().includes('bring') &&
                      !r.toLowerCase().includes('seek urgent help') &&
                      !r.toLowerCase().includes('cardiac rehab') &&
                      !r.toLowerCase().includes('walking') &&
                      !r.toLowerCase().includes('work') &&
                      !r.toLowerCase().includes('driving')
                    ).map((rec, index) => {
                      const actualIndex = formData.recommendations.indexOf(rec);
                      return (
                        <div key={actualIndex} className="flex items-center gap-2">
                          <Input
                            name={`recommendation_${actualIndex}`}
                            placeholder={t('cardiologyReport.additionalRecommendations')}
                      value={rec}
                      onChange={(e) => {
                        const newRecs = [...formData.recommendations];
                              newRecs[actualIndex] = e.target.value;
                        updateFormData('recommendations', newRecs);
                      }}
                      darkMode={darkMode}
                    />
                          <button
                            type="button"
                            onClick={() => removeFromArray('recommendations', actualIndex)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      className={`px-3 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg text-sm`}
                      onClick={() => addToArray('recommendations', '')}
                    >
                      {t('cardiologyReport.addRecommendation')}
                    </button>
                  </div>
                </div>
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
        title={t('cardiologyReport.attachments')} 
        collapsible 
        isOpen={!collapsedSections.attachments}
        onToggle={() => toggleSection('attachments')}
        counter={formData.attachments.length}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className={`border-2 border-dashed ${darkMode ? 'border-slate-600' : 'border-slate-300'} rounded-lg p-6 text-center`}>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{t('cardiologyReport.dropFilesHere')}</p>
            <button
              type="button"
              className={`px-4 py-2 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded-lg`}
            >
              {t('cardiologyReport.chooseFiles')}
            </button>
          </div>
          
          <div className="space-y-2">
            {formData.attachments.map((attachment, index) => (
              <div key={index} className={`flex items-center justify-between p-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded`}>
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
      <div className={`sticky bottom-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t p-4 shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastSaved && `${t('cardiologyReport.lastSaved')}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('cardiologyReport.saveDraft')}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('cardiologyReport.preview')}
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
              {t('cardiologyReport.finalizeSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardiologyReportForm;
