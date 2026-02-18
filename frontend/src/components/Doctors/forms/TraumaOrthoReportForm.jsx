import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsAPI, icdCodesAPI, doctorPatientsAPI, doctorImagingAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from GeneralVisitReport/CardiologyReportForm)
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
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={`w-full px-4 py-4 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-600'} rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
    >
      <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t('traumaOrthoReport.select')}</option>
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
                index === selectedIndex 
                  ? darkMode ? 'bg-slate-700' : 'bg-emerald-50'
                  : darkMode ? 'hover:bg-slate-700' : 'hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-mono text-sm font-medium min-w-[100px] ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {result.code}
                </span>
                <span className={`text-sm flex-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
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
                index === selectedIndex 
                  ? darkMode ? 'bg-slate-700' : 'bg-emerald-50'
                  : darkMode ? 'hover:bg-slate-700' : 'hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-medium text-sm flex-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {result.brand_name || result.name || 'Unknown'}
                </span>
                {result.strength && (
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {result.strength} {result.strength_unit?.name || ''}
                  </span>
                )}
              </div>
              {result.mnn?.name && (
                <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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

// Preset arrays (module scope - avoid recreation on every render)
// These will be translated in the component using useTranslation
const MECHANISM_PRESETS = ['fall','rta','sports','assault','crush','twisting','penetrating','other'];
const REGION_PRESETS = ['shoulder','arm','elbow','forearm','wristHand','pelvis','hip','thigh','knee','leg','ankleFoot','spineCTL','ribs'];
const TYPE_PRESETS = ['sprain','strain','dislocationSubluxation','fracture','contusion','laceration','tendonRupture'];
const RED_FLAG_PRESETS = ['severePain','numbness','weakness','colorChange','compartmentSyndrome','openWound','deformity','lossOfPulses'];

// Special test presets - will be translated in component
const SPECIAL_TEST_PRESETS = {
  knee: ['lachman','anteriorDrawer','posteriorDrawer','mcmurray','varusValgus'],
  shoulder: ['apprehension','relocation','hawkinsKennedy','neer','jobe'],
  ankle: ['anteriorDrawerAnkle','talarTilt','squeeze','externalRotation'],
  achilles: ['thompson'],
  wrist: ['snuffboxTenderness','watson']
};

// Test presets - will be translated in component
const TEST_PRESETS = ['xrAnkle','xrWrist','xrKnee','xrShoulder','xrHip','xrSpine','ct','mri','us','cbc','crp','esr','cmp','coags','typeAndScreen','ecg','dDimer'];
// Referral presets - will be translated in component
const REFERRAL_PRESETS = ['physiotherapy','plasticSurgery','vascularSurgery','neurosurgerySpine','generalSurgery','painClinic','occupationalHealth'];
// Medication presets - will be translated in component
const MED_PRESETS = ['nsaids','acetaminophen','opioidShortCourse','ppiProtectant','antibiotics','tetanus','anticoagulant'];

// StructuredClone fallback for legacy Safari support
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const TraumaOrthoReportForm = ({ patient, encounter, onSave }) => {
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
    injury: false,
    history: false,
    examination: false,
    imaging: false,
    classification: false,
    procedures: false,
    diagnosis: false,
    plan: false,
    outcome: false,
    attachments: false
  });

  // Patient medications and allergies from database
  const [patientMedications, setPatientMedications] = useState([]);
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [loadingAllergies, setLoadingAllergies] = useState(false);

  // Smart editor states
  const [editingTest, setEditingTest] = useState(null);
  const [editingTestIdx, setEditingTestIdx] = useState(null);
  const [editingRef, setEditingRef] = useState(null);
  const [editingRefIdx, setEditingRefIdx] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [editingMedIdx, setEditingMedIdx] = useState(null);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [editingProcedureIdx, setEditingProcedureIdx] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    doc_type: 'trauma.initial',
    meta: {
      clinic_id: '',
      department_id: 'traumatology',
      physician_id: '',
      patient_id: '',
      encounter_id: '',
      datetime: new Date().toISOString()
    },
    chief_complaint: '',
    injury: {
      date: '',
      mechanism: '',
      context: '',
      energy_level: '',
      time_since_injury: '',
      side: 'left',
      region: [],
      type: [],
      open_status: 'closed',
      pain_scale: 0,
      red_flags: [],
      work_accident: false,
      police_report_no: '',
      insurance_claim_id: '',
      safeguarding_concerns: 'none',
      safeguarding_notes: ''
    },
    history: {
      hpi: '',
      pmh: '',
      meds: '',
      allergies: '',
      tetanus_status: 'unknown',
      osteoporosis_risk: 'low',
      on_anticoagulants: 'unknown',
      key_comorbidities: [],
      pediatric_patient: false,
      growth_plate_involved: 'unclear'
    },
    examination: {
      vitals: '',
      look: '',
      feel: '',
      move: '',
      special_tests: [],
      neurovascular: {
        pulses: '',
        cap_refill: '',
        motor: '',
        sensory: ''
      },
      compartment_status: '',
      compartment_syndrome_concerns: 'no',
      open_fracture: {
        gustilo: '',
        contamination: 'clean',
        first_antibiotics_time: '',
        first_debridement_time: '',
        debridement_planned: ''
      },
      soft_tissue: ''
    },
    imaging_links: [],
    classification: {
      site: '',
      side: 'left',
      system: 'AO/OTA',
      code: '',
      displacement: 'none',
      intra_articular: false,
      stability: 'stable',
      growth_plate_involved: 'unclear'
    },
    procedures: [],
    diagnosis: {
      main: '',
      secondary: [],
      codes: []
    },
    plan: {
      tests: [],
      referrals: [],
      meds: [],
      immobilization: {
        applied: false,
        type: '',
        side: '',
        region: ''
      },
      weight_bearing: 'as tolerated',
      dvt_prophylaxis: 'not indicated',
      sick_leave_days: 0,
      work_restrictions: '',
      physio: 'consider',
      follow_up: '48-72h',
      mobility_aid: 'none',
      home_exercises: '',
      physio_instructions: ''
    },
    outcome: {
      condition: '',
      course: '',
      red_flag_instructions_given: false,
      red_flag_instructions_text: ''
    },
    recommendations: [],
    attachments: []
  });

  // Available imaging studies from PACS
  const [availableImaging, setAvailableImaging] = useState([]);
  const [loadingImaging, setLoadingImaging] = useState(false);
  const [imagingSearchQuery, setImagingSearchQuery] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({});

  // Autosave state
  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (patient && encounter) {
      setFormData(prev => ({
        ...prev,
        meta: {
          clinic_id: encounter.clinic_id || 'clinic-001',
          department_id: 'traumatology',
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

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'trauma.discharge' : 'trauma.initial'
    }));
  }, [mode]);

  // Calculate time since injury when date changes
  useEffect(() => {
    if (formData.injury.date) {
      const injuryDate = new Date(formData.injury.date);
      const now = new Date();
      const hoursDiff = (now - injuryDate) / (1000 * 60 * 60);
      
      let timeSince = '';
      if (hoursDiff < 6) {
        timeSince = '< 6 hours';
      } else if (hoursDiff < 24) {
        timeSince = '6-24 hours';
      } else {
        timeSince = '> 24 hours';
      }
      
      if (formData.injury.time_since_injury !== timeSince) {
        setFormData(prev => ({
          ...prev,
          injury: {
            ...prev.injury,
            time_since_injury: timeSince
          }
        }));
      }
    }
  }, [formData.injury.date, formData.injury.time_since_injury]);

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

  // Fetch imaging studies from PACS
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
    }
  }, [addToArray, getOhifUrl]);

  const removeImagingFromReport = useCallback((index) => {
    removeFromArray('imaging_links', index);
  }, [removeFromArray]);

  const openImagingViewer = useCallback(async (study) => {
    try {
      const url = await getOhifUrl(study);
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening imaging viewer:', error);
    }
  }, [getOhifUrl]);

  // Region-aware special tests helper
  const suggestedTests = useCallback(() => {
    const r = formData.injury.region.join(' ').toLowerCase();
    const bucket = new Set();
    if (r.includes('knee') || r.includes('tizza')) SPECIAL_TEST_PRESETS.knee.forEach(t => bucket.add(t));
    if (r.includes('shoulder') || r.includes('yelka')) SPECIAL_TEST_PRESETS.shoulder.forEach(t => bucket.add(t));
    if (r.includes('ankle') || r.includes('foot') || r.includes('to\'piq') || r.includes('oyoq')) SPECIAL_TEST_PRESETS.ankle.forEach(t => bucket.add(t));
    if (r.includes('achilles')) SPECIAL_TEST_PRESETS.achilles.forEach(t => bucket.add(t));
    if (r.includes('wrist') || r.includes('hand') || r.includes('bilak') || r.includes('qo\'l')) SPECIAL_TEST_PRESETS.wrist.forEach(t => bucket.add(t));
    return Array.from(bucket).map(test => t(`traumaOrthoReport.${test}`));
  }, [formData.injury.region, t]);

  // Smart editor helpers
  const convertStringToTest = useCallback((str) => {
    if (typeof str === 'string') {
      return { 
        type: ['XR', 'CT', 'MRI', 'US', 'Fluoro'].includes(str) ? 'imaging' : 'lab',
        label: str, 
        note: '', 
        destinationClinicId: '' 
      };
    }
    return str;
  }, []);

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
    const isImaging = /^(XR|CT|MRI|US|Fluoro)/.test(preset.label || '');
    setEditingTest({
      type: preset.type || (isImaging ? 'imaging' : 'lab'),
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

  const openProcedureEditor = useCallback((preset = {}, idx = null) => {
    setEditingProcedure({
      name: preset.name || '',
      date: preset.date || '',
      side: preset.side || '',
      region: preset.region || '',
      anesthesia: preset.anesthesia || 'none',
      sedation: preset.sedation || 'none',
      technique: preset.technique || '',
      findings: preset.findings || '',
      result: preset.result || 'successful',
      complications: preset.complications || ''
    });
    setEditingProcedureIdx(idx);
  }, []);

  const saveProcedure = useCallback(() => {
    if (!editingProcedure?.name?.trim() || !editingProcedure?.date?.trim()) return;
    const next = [...formData.procedures];
    if (editingProcedureIdx === null) next.push(editingProcedure); else next[editingProcedureIdx] = editingProcedure;
    updateFormData('procedures', next);
    setEditingProcedure(null); setEditingProcedureIdx(null);
  }, [editingProcedure, editingProcedureIdx, formData.procedures, updateFormData]);

  const removeProcedure = useCallback((idx) => {
    updateFormData('procedures', formData.procedures.filter((_, i) => i !== idx));
  }, [formData.procedures, updateFormData]);

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

    if (formData.injury.open_status === 'open_confirmed') {
      if (!formData.examination.open_fracture.gustilo) {
        newErrors.gustilo = 'Gustilo classification is required for open fractures';
      }
    }

    // Open/laceration validation
    const isOpenOrLaceration =
      formData.injury.open_status === 'open_confirmed' ||
      formData.injury.type.includes('Laceration');

    if (isOpenOrLaceration) {
      const hasAntibiotics = formData.plan.meds.some(m =>
        (typeof m === 'string' ? m : m.med)?.toLowerCase().includes('antibiot')
      ) || formData.procedures.some(p =>
        (p.name || '').toLowerCase().includes('wound')
      );
      if (!hasAntibiotics) {
        newErrors.abx = 'Open/laceration injuries require antibiotics in Plan or Wound care procedure.';
      }

      const tetStatus = formData.history.tetanus_status;
      const tetDue = tetStatus === '>=5y' || tetStatus === 'unknown' || tetStatus === 'never';
      const hasTetanus = formData.plan.meds.some(m =>
        (typeof m === 'string' ? m : m.med)?.toLowerCase().includes('tetanus')
      );
      if (tetDue && !hasTetanus) {
        newErrors.tetanus = 'Tetanus prophylaxis is due—add to Medications.';
      }
    }

    formData.procedures.forEach((proc, index) => {
      if (proc.name && !proc.date) {
        newErrors[`procedure_${index}_date`] = 'Procedure date is required';
      }
    });

    if (mode === 'discharge') {
      if (!formData.recommendations.length) {
        newErrors.recommendations = 'At least one recommendation is required for discharge';
      }
    }

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
      doc_type: mode === 'discharge' ? 'trauma.discharge' : 'trauma.initial',
      meta: formData.meta,
      chief_complaint: formData.chief_complaint,
      injury: formData.injury,
      history: formData.history,
      examination: formData.examination,
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
      classification: formData.classification,
      procedures: formData.procedures,
      diagnosis: formData.diagnosis,
      plan: mode === 'initial' ? formData.plan : undefined,
      outcome: mode === 'discharge' ? formData.outcome : undefined,
      recommendations: mode === 'discharge' ? formData.recommendations : (formData.recommendations?.length ? formData.recommendations : undefined),
      attachments: formData.attachments
    };
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
      {/* Autosave Toast */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Saved at {lastSaved?.toLocaleTimeString()}
        </div>
      )}

      {/* Header */}
      <Card title={t('traumaOrthoReport.title')} className="mb-6" darkMode={darkMode}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.mode')}</FieldLabel>
            <Select
              name="mode"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
              options={[
                { value: 'initial', label: t('traumaOrthoReport.initialAssessment') },
                { value: 'discharge', label: t('traumaOrthoReport.dischargeSummary') }
              ]}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Chief Complaint */}
      <Card title={t('traumaOrthoReport.chiefComplaint')} darkMode={darkMode}>
        <FieldLabel required darkMode={darkMode}>{t('traumaOrthoReport.chiefComplaint')}</FieldLabel>
        <Input
          name="chief_complaint"
          placeholder={t('traumaOrthoReport.chiefComplaintPlaceholder')}
          value={formData.chief_complaint}
          onChange={(e) => updateFormData('chief_complaint', e.target.value)}
          required
          darkMode={darkMode}
        />
        {errors.chief_complaint && (
          <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
        )}
      </Card>

      {/* Injury Details */}
      <Card 
        title={t('traumaOrthoReport.injuryDetails')} 
        collapsible 
        isOpen={!collapsedSections.injury}
        onToggle={() => toggleSection('injury')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.dateTimeOfInjury')}</FieldLabel>
              <Input
                name="injury_date"
                type="datetime-local"
                value={formData.injury.date}
                onChange={(e) => updateFormData('injury.date', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.painScale')}</FieldLabel>
              <Input
                name="pain_scale"
                type="number"
                min="0"
                max="10"
                value={formData.injury.pain_scale}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Math.max(0, Math.min(10, Number(e.target.value)));
                  updateFormData('injury.pain_scale', v);
                }}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.mechanism')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.injury.mechanism && (
                <Chip onRemove={() => updateFormData('injury.mechanism', '')} darkMode={darkMode}>
                  {formData.injury.mechanism}
                </Chip>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MECHANISM_PRESETS.map(m => {
                const translatedLabel = t(`traumaOrthoReport.${m}`);
                return (
                <button
                  key={m}
                  type="button"
                  className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  onClick={() => updateFormData('injury.mechanism', translatedLabel)}
                >
                  {translatedLabel}
                </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.context')}</FieldLabel>
              <Input
                name="injury_context"
                placeholder={t('traumaOrthoReport.contextPlaceholder')}
                value={formData.injury.context}
                onChange={(e) => updateFormData('injury.context', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.side')}</FieldLabel>
              <Select
                name="injury_side"
                value={formData.injury.side}
                onChange={(e) => updateFormData('injury.side', e.target.value)}
                options={[
                  { value: 'left', label: t('traumaOrthoReport.left') },
                  { value: 'right', label: t('traumaOrthoReport.right') },
                  { value: 'bilateral', label: t('traumaOrthoReport.bilateral') },
                  { value: 'midline', label: t('traumaOrthoReport.midline') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.injuryEnergyLevel')}</FieldLabel>
              <Select
                name="energy_level"
                value={formData.injury.energy_level}
                onChange={(e) => updateFormData('injury.energy_level', e.target.value)}
                options={[
                  { value: '', label: t('traumaOrthoReport.select') },
                  { value: 'low-energy', label: t('traumaOrthoReport.lowEnergy') },
                  { value: 'high-energy', label: t('traumaOrthoReport.highEnergy') },
                  { value: 'polytrauma', label: t('traumaOrthoReport.polytrauma') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.timeSinceInjury')}</FieldLabel>
              <Input
                name="time_since_injury"
                placeholder={t('traumaOrthoReport.autoCalculated')}
                value={formData.injury.time_since_injury}
                readOnly
                className={darkMode ? 'bg-slate-700' : 'bg-slate-100'}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.regions')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.injury.region.map((r, i) => (
                <Chip key={i} onRemove={() => removeFromArray('injury.region', i)} darkMode={darkMode}>{r}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {REGION_PRESETS.map(r => {
                const translatedLabel = t(`traumaOrthoReport.${r}`);
                return (
                <button
                  key={r}
                  type="button"
                  className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  onClick={() => {
                    if (!formData.injury.region.includes(translatedLabel)) {
                      addToArray('injury.region', translatedLabel);
                    }
                  }}
                >
                  {translatedLabel}
                </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.types')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.injury.type.map((t, i) => (
                <Chip key={i} onRemove={() => removeFromArray('injury.type', i)} darkMode={darkMode}>{t}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TYPE_PRESETS.map(type => {
                const translatedLabel = t(`traumaOrthoReport.${type}`);
                return (
                <button
                  key={type}
                  type="button"
                  className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  onClick={() => {
                    if (!formData.injury.type.includes(translatedLabel)) {
                      addToArray('injury.type', translatedLabel);
                    }
                  }}
                >
                  {translatedLabel}
                </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.openClosedStatus')}</FieldLabel>
              <Select
                name="open_status"
                value={formData.injury.open_status}
                onChange={(e) => updateFormData('injury.open_status', e.target.value)}
                options={[
                  { value: 'closed', label: t('traumaOrthoReport.closed') },
                  { value: 'open_suspected', label: t('traumaOrthoReport.openSuspected') },
                  { value: 'open_confirmed', label: t('traumaOrthoReport.openConfirmed') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.redFlags')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.injury.red_flags.map((rf, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('injury.red_flags', i)} darkMode={darkMode}>{rf}</Chip>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {RED_FLAG_PRESETS.map(rf => {
                  const translatedLabel = t(`traumaOrthoReport.${rf}`);
                  return (
                  <button
                    key={rf}
                    type="button"
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                    onClick={() => {
                      if (!formData.injury.red_flags.includes(translatedLabel)) {
                        addToArray('injury.red_flags', translatedLabel);
                      }
                    }}
                  >
                    {translatedLabel}
                  </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.injury.work_accident}
                onChange={(e) => updateFormData('injury.work_accident', e.target.checked)}
                className={`w-4 h-4 rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
              />
              <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Work Accident</label>
            </div>
            {formData.injury.work_accident && (
              <div>
                <FieldLabel darkMode={darkMode}>Police Report Number</FieldLabel>
                <Input
                  name="police_report_no"
                  placeholder="Police report number..."
                  value={formData.injury.police_report_no}
                  onChange={(e) => updateFormData('injury.police_report_no', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            )}
            {formData.injury.work_accident && (
              <div>
                <FieldLabel darkMode={darkMode}>Work Injury / Insurance Claim ID</FieldLabel>
                <Input
                  name="insurance_claim_id"
                  placeholder="Insurance claim ID (if exists)..."
                  value={formData.injury.insurance_claim_id}
                  onChange={(e) => updateFormData('injury.insurance_claim_id', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>

          {/* Safeguarding */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.safeguardingNonAccidentalInjury')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.safeguardingConcerns')}</FieldLabel>
                <Select
                  name="safeguarding_concerns"
                  value={formData.injury.safeguarding_concerns}
                  onChange={(e) => updateFormData('injury.safeguarding_concerns', e.target.value)}
                  options={[
                    { value: 'none', label: t('traumaOrthoReport.none') },
                    { value: 'suspected', label: t('traumaOrthoReport.suspected') },
                    { value: 'confirmed', label: t('traumaOrthoReport.confirmed') },
                    { value: 'not_assessed', label: t('traumaOrthoReport.notAssessed') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              {(formData.injury.safeguarding_concerns === 'suspected' || formData.injury.safeguarding_concerns === 'confirmed') && (
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.notesOnSuspectedNonAccidentalInjury')}</FieldLabel>
                  <TextArea
                    name="safeguarding_notes"
                    placeholder={t('traumaOrthoReport.notesOnSuspectedNonAccidentalInjury') + '...'}
                    value={formData.injury.safeguarding_notes}
                    onChange={(e) => updateFormData('injury.safeguarding_notes', e.target.value)}
                    rows={2}
                    darkMode={darkMode}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* History */}
      <Card 
        title={t('traumaOrthoReport.history')} 
        collapsible 
        isOpen={!collapsedSections.history}
        onToggle={() => toggleSection('history')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.historyOfPresentInjury')}</FieldLabel>
            <div className="flex gap-2">
              <TextArea
                name="history_hpi"
                placeholder={t('traumaOrthoReport.historyOfPresentInjury') + '...'}
                value={formData.history.hpi}
                onChange={(e) => updateFormData('history.hpi', e.target.value)}
                rows={4}
                darkMode={darkMode}
              />
              <button
                type="button"
                disabled={!formData.chief_complaint.trim()}
                className={`px-3 py-2 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                🧠 AI Suggest
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.pastMedicalHistory')}</FieldLabel>
              <TextArea
                name="history_pmh"
                placeholder={t('traumaOrthoReport.pastMedicalHistory') + '...'}
                value={formData.history.pmh}
                onChange={(e) => updateFormData('history.pmh', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.currentMedications')}</FieldLabel>
              {patientMedications.length > 0 && (
                <div className={`mb-2 p-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-blue-900/30 border-blue-700' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>{t('traumaOrthoReport.fromPatientRecord') || 'From Patient Record'}</div>
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
                      updateFormData('history.meds', medsText);
                    }}
                    className={`mt-1 text-xs underline ${
                      darkMode 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    {t('traumaOrthoReport.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
              <TextArea
                name="history_meds"
                placeholder={t('traumaOrthoReport.currentMedications') + '...'}
                value={formData.history.meds}
                onChange={(e) => updateFormData('history.meds', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.allergies')}</FieldLabel>
              {patientAllergies.length > 0 && (
                <div className={`mb-2 p-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-red-900/30 border-red-700' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${
                    darkMode ? 'text-red-300' : 'text-red-800'
                  }`}>{t('traumaOrthoReport.fromPatientRecord') || 'From Patient Record'}</div>
                  <div className="space-y-1">
                    {patientAllergies.map((allergy, idx) => (
                      <div key={idx} className={`text-xs ${
                        darkMode ? 'text-red-300' : 'text-red-700'
                      }`}>
                        • {allergy.allergen_name || allergy.name || allergy.substance} {allergy.reaction ? `(${allergy.reaction})` : ''}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allergiesText = patientAllergies.map(a => 
                        `${a.allergen_name || a.name || a.substance}${a.reaction ? ` (${a.reaction})` : ''}`.trim()
                      ).join(', ');
                      updateFormData('history.allergies', allergiesText);
                    }}
                    className={`mt-1 text-xs underline ${
                      darkMode 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-red-600 hover:text-red-800'
                    }`}
                  >
                    {t('traumaOrthoReport.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
              <TextArea
                name="history_allergies"
                placeholder={t('traumaOrthoReport.allergies') + '...'}
                value={formData.history.allergies}
                onChange={(e) => updateFormData('history.allergies', e.target.value)}
                rows={2}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.tetanusStatus')}</FieldLabel>
              <Select
                name="tetanus_status"
                value={formData.history.tetanus_status}
                onChange={(e) => updateFormData('history.tetanus_status', e.target.value)}
                options={[
                  { value: 'unknown', label: t('traumaOrthoReport.unknown') },
                  { value: '<5y', label: t('traumaOrthoReport.lessThan5Years') },
                  { value: '>=5y', label: t('traumaOrthoReport.greaterThanOrEqual5Years') },
                  { value: 'never', label: t('traumaOrthoReport.never') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.osteoporosisRisk')}</FieldLabel>
              <Select
                name="osteoporosis_risk"
                value={formData.history.osteoporosis_risk}
                onChange={(e) => updateFormData('history.osteoporosis_risk', e.target.value)}
                options={[
                  { value: 'low', label: t('traumaOrthoReport.low') },
                  { value: 'moderate', label: t('traumaOrthoReport.moderate') },
                  { value: 'high', label: t('traumaOrthoReport.high') }
                ]}
                darkMode={darkMode}
              />
            </div>
          </div>

          {/* Key Risk Factors */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.keyComorbidities')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.onAnticoagulants')}</FieldLabel>
                <Select
                  name="on_anticoagulants"
                  value={formData.history.on_anticoagulants}
                  onChange={(e) => updateFormData('history.on_anticoagulants', e.target.value)}
                  options={[
                    { value: 'unknown', label: t('traumaOrthoReport.unknown') },
                    { value: 'yes', label: t('traumaOrthoReport.yes') },
                    { value: 'no', label: t('traumaOrthoReport.no') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.keyComorbidities')}</FieldLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.history.key_comorbidities.map((c, i) => (
                    <Chip key={i} onRemove={() => removeFromArray('history.key_comorbidities', i)} darkMode={darkMode}>{c}</Chip>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['diabetes', 'peripheralVascularDisease', 'smoking'].map(c => {
                    const translatedLabel = t(`traumaOrthoReport.${c}`);
                    return (
                    <button
                      key={c}
                      type="button"
                      className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                      onClick={() => {
                        if (!formData.history.key_comorbidities.includes(translatedLabel)) {
                          addToArray('history.key_comorbidities', translatedLabel);
                        }
                      }}
                    >
                      + {translatedLabel}
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Pediatric Info */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.history.pediatric_patient}
                onChange={(e) => updateFormData('history.pediatric_patient', e.target.checked)}
                className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
              />
              <FieldLabel className="mb-0" darkMode={darkMode}>{t('traumaOrthoReport.pediatricPatient')}</FieldLabel>
            </div>
            {formData.history.pediatric_patient && (
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.growthPlateInvolved')}</FieldLabel>
                <Select
                  name="growth_plate_involved"
                  value={formData.history.growth_plate_involved}
                  onChange={(e) => updateFormData('history.growth_plate_involved', e.target.value)}
                  options={[
                    { value: 'unclear', label: t('traumaOrthoReport.unclear') },
                    { value: 'yes', label: t('traumaOrthoReport.yes') },
                    { value: 'no', label: t('traumaOrthoReport.no') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Examination */}
      <Card 
        title={t('traumaOrthoReport.examination')} 
        collapsible 
        isOpen={!collapsedSections.examination}
        onToggle={() => toggleSection('examination')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.vitals')}</FieldLabel>
            <Input
              name="examination_vitals"
              placeholder={t('traumaOrthoReport.vitalSignsPlaceholder')}
              value={formData.examination.vitals}
              onChange={(e) => updateFormData('examination.vitals', e.target.value)}
              darkMode={darkMode}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.look')}</FieldLabel>
              <TextArea
                name="examination_look"
                placeholder={t('traumaOrthoReport.lookPlaceholder')}
                value={formData.examination.look}
                onChange={(e) => updateFormData('examination.look', e.target.value)}
                rows={4}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.feel')}</FieldLabel>
              <TextArea
                name="examination_feel"
                placeholder={t('traumaOrthoReport.feelPlaceholder')}
                value={formData.examination.feel}
                onChange={(e) => updateFormData('examination.feel', e.target.value)}
                rows={4}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.move')}</FieldLabel>
              <TextArea
                name="examination_move"
                placeholder={t('traumaOrthoReport.movePlaceholder')}
                value={formData.examination.move}
                onChange={(e) => updateFormData('examination.move', e.target.value)}
                rows={4}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.specialTests')}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.examination.special_tests.map((test, i) => (
                <Chip key={i} onRemove={() => removeFromArray('examination.special_tests', i)} darkMode={darkMode}>{test}</Chip>
              ))}
            </div>

            {/* Suggested first */}
            {suggestedTests().length > 0 && (
              <>
                <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('traumaOrthoReport.suggestedForSelectedRegions')}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  {suggestedTests().map(test => (
                    <button
                      key={test}
                      type="button"
                      className={`px-3 py-1 ${darkMode ? 'bg-emerald-900 text-emerald-300 hover:bg-emerald-800' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} rounded text-sm`}
                      onClick={() => !formData.examination.special_tests.includes(test) && addToArray('examination.special_tests', test)}
                    >
                      {test}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* All tests */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.values(SPECIAL_TEST_PRESETS).flat().map(test => {
                const translatedLabel = t(`traumaOrthoReport.${test}`);
                return (
                <button
                  key={test}
                  type="button"
                  className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  onClick={() => !formData.examination.special_tests.includes(translatedLabel) && addToArray('examination.special_tests', translatedLabel)}
                >
                  {translatedLabel}
                </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.neurovascular')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.pulses')}</FieldLabel>
                <Input
                  name="neurovascular_pulses"
                  placeholder={t('traumaOrthoReport.pulses') + '...'}
                  value={formData.examination.neurovascular.pulses}
                  onChange={(e) => updateFormData('examination.neurovascular.pulses', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.capillaryRefill')}</FieldLabel>
                <Input
                  name="neurovascular_cap_refill"
                  placeholder={t('traumaOrthoReport.capillaryRefill') + '...'}
                  value={formData.examination.neurovascular.cap_refill}
                  onChange={(e) => updateFormData('examination.neurovascular.cap_refill', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.motor')}</FieldLabel>
                <Input
                  name="neurovascular_motor"
                  placeholder={t('traumaOrthoReport.motor') + '...'}
                  value={formData.examination.neurovascular.motor}
                  onChange={(e) => updateFormData('examination.neurovascular.motor', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.sensory')}</FieldLabel>
                <Input
                  name="neurovascular_sensory"
                  placeholder={t('traumaOrthoReport.sensory') + '...'}
                  value={formData.examination.neurovascular.sensory}
                  onChange={(e) => updateFormData('examination.neurovascular.sensory', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {/* Compartment Syndrome Risk */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.compartmentSyndromeRisk')}</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.compartmentStatus')}</FieldLabel>
                <Select
                  name="compartment_status"
                  value={formData.examination.compartment_status}
                  onChange={(e) => updateFormData('examination.compartment_status', e.target.value)}
                  options={[
                    { value: '', label: t('traumaOrthoReport.select') },
                    { value: 'soft', label: t('traumaOrthoReport.soft') },
                    { value: 'tense', label: t('traumaOrthoReport.tense') },
                    { value: 'pain_out_of_proportion', label: t('traumaOrthoReport.painOutOfProportion') },
                    { value: 'pain_on_passive_stretch', label: t('traumaOrthoReport.painOnPassiveStretch') },
                    { value: 'unclear', label: t('traumaOrthoReport.unclear') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.compartmentSyndromeConcerns')}</FieldLabel>
                <Select
                  name="compartment_syndrome_concerns"
                  value={formData.examination.compartment_syndrome_concerns}
                  onChange={(e) => updateFormData('examination.compartment_syndrome_concerns', e.target.value)}
                  options={[
                    { value: 'no', label: t('traumaOrthoReport.no') },
                    { value: 'yes', label: t('traumaOrthoReport.yes') },
                    { value: 'monitor', label: t('traumaOrthoReport.monitor') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          {formData.injury.open_status === 'open_confirmed' && (
            <div className={`border ${darkMode ? 'border-red-600 rounded-lg p-4 bg-red-900/20' : 'border-red-200 rounded-lg p-4 bg-red-50'}`}>
              <FieldLabel required darkMode={darkMode}>{t('traumaOrthoReport.openFractureClassification')}</FieldLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.gustiloClassification')}</FieldLabel>
                  <Select
                    name="gustilo"
                    value={formData.examination.open_fracture.gustilo}
                    onChange={(e) => updateFormData('examination.open_fracture.gustilo', e.target.value)}
                    options={[
                      { value: 'I', label: t('traumaOrthoReport.gustiloI') },
                      { value: 'II', label: t('traumaOrthoReport.gustiloII') },
                      { value: 'IIIA', label: t('traumaOrthoReport.gustiloIIIA') },
                      { value: 'IIIB', label: t('traumaOrthoReport.gustiloIIIB') },
                      { value: 'IIIC', label: t('traumaOrthoReport.gustiloIIIC') }
                    ]}
                    required
                    darkMode={darkMode}
                  />
                  {errors.gustilo && (
                    <p className="text-red-500 text-sm mt-1">{errors.gustilo}</p>
                  )}
                </div>
                <div>
                  <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.contamination')}</FieldLabel>
                  <Select
                    name="contamination"
                    value={formData.examination.open_fracture.contamination}
                    onChange={(e) => updateFormData('examination.open_fracture.contamination', e.target.value)}
                    options={[
                      { value: 'clean', label: t('traumaOrthoReport.clean') },
                      { value: 'contaminated', label: t('traumaOrthoReport.contaminated') },
                      { value: 'farm', label: t('traumaOrthoReport.farm') },
                      { value: 'aquatic', label: t('traumaOrthoReport.aquatic') },
                      { value: 'other', label: t('traumaOrthoReport.other') }
                    ]}
                    darkMode={darkMode}
                  />
                </div>
              </div>
              <div className={`mt-4 border-t ${darkMode ? 'border-red-600' : 'border-red-300'} pt-4`}>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.openFractureTiming')}</FieldLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.timeOfFirstIVAntibiotics')}</FieldLabel>
                    <Input
                      name="first_antibiotics_time"
                      type="datetime-local"
                      placeholder={t('traumaOrthoReport.timeOfFirstIVAntibiotics')}
                      value={formData.examination.open_fracture.first_antibiotics_time}
                      onChange={(e) => updateFormData('examination.open_fracture.first_antibiotics_time', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.timeOfFirstSurgicalDebridement')}</FieldLabel>
                    <Input
                      name="first_debridement_time"
                      type="datetime-local"
                      placeholder={t('traumaOrthoReport.timeOfFirstSurgicalDebridement')}
                      value={formData.examination.open_fracture.first_debridement_time}
                      onChange={(e) => updateFormData('examination.open_fracture.first_debridement_time', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  {!formData.examination.open_fracture.first_debridement_time && (
                    <div className="col-span-2">
                      <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.debridementPlanned')}</FieldLabel>
                      <Input
                        name="debridement_planned"
                        placeholder={t('traumaOrthoReport.debridementPlanned') + '...'}
                        value={formData.examination.open_fracture.debridement_planned}
                        onChange={(e) => updateFormData('examination.open_fracture.debridement_planned', e.target.value)}
                        darkMode={darkMode}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.softTissue')}</FieldLabel>
            <TextArea
              name="examination_soft_tissue"
              placeholder={t('traumaOrthoReport.softTissue') + '...'}
              value={formData.examination.soft_tissue}
              onChange={(e) => updateFormData('examination.soft_tissue', e.target.value)}
              rows={3}
              darkMode={darkMode}
            />
          </div>
        </div>
      </Card>

      {/* Imaging Studies */}
      <Card 
        title={t('traumaOrthoReport.imagingStudies')} 
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
              {loadingImaging ? t('traumaOrthoReport.loading') || 'Loading...' : t('traumaOrthoReport.loadImaging') || 'Load Imaging'}
            </button>
            <input
              type="text"
              placeholder={t('traumaOrthoReport.searchStudies') || 'Search studies...'}
              value={imagingSearchQuery}
              onChange={(e) => setImagingSearchQuery(e.target.value)}
              className={`flex-1 px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-slate-200 text-slate-600'} rounded-lg`}
            />
          </div>

          {loadingImaging && (
            <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('traumaOrthoReport.loadingStudies') || 'Loading imaging studies...'}
            </div>
          )}

          {!loadingImaging && availableImaging.length === 0 && (
            <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('traumaOrthoReport.noStudiesFound') || 'No imaging studies found for this patient.'}
            </div>
          )}

          {!loadingImaging && availableImaging.length > 0 && (
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.availableStudies') || 'Available Studies'}</FieldLabel>
              <div className="space-y-2">
                {availableImaging
                  .filter(study => {
                    if (!imagingSearchQuery.trim()) return true;
                    const query = imagingSearchQuery.toLowerCase();
                    return (
                      study.modality?.toLowerCase().includes(query) ||
                      study.description?.toLowerCase().includes(query) ||
                      study.date?.includes(query) ||
                      study.study_uid?.toLowerCase().includes(query) ||
                      study.accession_number?.toLowerCase().includes(query)
                    );
                  })
                  .map((study, index) => (
                    <div key={study.study_id || index} className={`flex items-center justify-between p-3 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} rounded-lg`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className={`font-medium ${darkMode ? 'text-slate-200' : ''}`}>{study.modality || 'Unknown'}</span>
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{study.date || 'N/A'}</span>
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{study.description || study.study_id}</span>
                          {study.accession_number && (
                            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Acc: {study.accession_number}</span>
                          )}
                          <span className={`font-mono text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{study.study_uid || study.study_id}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          onClick={() => openImagingViewer(study)}
                        >
                          {t('traumaOrthoReport.openViewer')}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                          onClick={() => addImagingToReport(study)}
                        >
                          {t('traumaOrthoReport.addToReport')}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.selectedStudies')}</FieldLabel>
            <div className="space-y-2">
              {formData.imaging_links.map((imaging, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded`}>
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : ''}`}>{imaging.modality}</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{imaging.description}</span>
                  <select 
                    className={`text-xs border rounded px-1 py-0.5 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}
                    value={imaging.attach || 'reference_only'}
                    onChange={(e) => {
                      const next = clone(formData.imaging_links);
                      next[index].attach = e.target.value;
                      updateFormData('imaging_links', next);
                    }}
                  >
                    <option value="reference_only" className={darkMode ? 'bg-slate-800' : ''}>{t('traumaOrthoReport.referenceOnly')}</option>
                    <option value="embed_in_pdf" className={darkMode ? 'bg-slate-800' : ''}>{t('traumaOrthoReport.embedInPDF')}</option>
                  </select>
                  <input
                    className={`text-xs border rounded px-2 py-1 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}
                    placeholder={t('traumaOrthoReport.note') + '...'}
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

      {/* Classification */}
      <Card 
        title={t('traumaOrthoReport.classification')} 
        collapsible 
        isOpen={!collapsedSections.classification}
        onToggle={() => toggleSection('classification')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.site')}</FieldLabel>
              <Input
                name="classification_site"
                placeholder={t('traumaOrthoReport.site') + '...'}
                value={formData.classification.site}
                onChange={(e) => updateFormData('classification.site', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.side')}</FieldLabel>
              <Select
                name="classification_side"
                value={formData.classification.side}
                onChange={(e) => updateFormData('classification.side', e.target.value)}
                options={[
                  { value: 'left', label: t('traumaOrthoReport.left') },
                  { value: 'right', label: t('traumaOrthoReport.right') },
                  { value: 'bilateral', label: t('traumaOrthoReport.bilateral') },
                  { value: 'midline', label: t('traumaOrthoReport.midline') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.system')}</FieldLabel>
              <Select
                name="classification_system"
                value={formData.classification.system}
                onChange={(e) => updateFormData('classification.system', e.target.value)}
                options={[
                  { value: 'AO/OTA', label: t('traumaOrthoReport.aoOta') },
                  { value: 'Garden', label: t('traumaOrthoReport.garden') },
                  { value: 'Neer', label: t('traumaOrthoReport.neer') },
                  { value: 'Weber', label: t('traumaOrthoReport.weber') },
                  { value: 'Salter-Harris', label: t('traumaOrthoReport.salterHarris') },
                  { value: 'Other', label: t('traumaOrthoReport.other') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.code')}</FieldLabel>
              <Input
                name="classification_code"
                placeholder={t('traumaOrthoReport.code') + '...'}
                value={formData.classification.code}
                onChange={(e) => updateFormData('classification.code', e.target.value)}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.displacement')}</FieldLabel>
              <Select
                name="classification_displacement"
                value={formData.classification.displacement}
                onChange={(e) => updateFormData('classification.displacement', e.target.value)}
                options={[
                  { value: 'none', label: t('traumaOrthoReport.none') },
                  { value: 'minimal', label: t('traumaOrthoReport.minimal') },
                  { value: 'displaced', label: t('traumaOrthoReport.displaced') },
                  { value: 'angulated', label: t('traumaOrthoReport.angulated') },
                  { value: 'comminuted', label: t('traumaOrthoReport.comminuted') }
                ]}
                darkMode={darkMode}
              />
            </div>
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.stability')}</FieldLabel>
              <Select
                name="classification_stability"
                value={formData.classification.stability}
                onChange={(e) => updateFormData('classification.stability', e.target.value)}
                options={[
                  { value: 'stable', label: t('traumaOrthoReport.stable') },
                  { value: 'unstable', label: t('traumaOrthoReport.unstable') },
                  { value: 'unknown', label: t('traumaOrthoReport.unknown') }
                ]}
                darkMode={darkMode}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.classification.intra_articular}
                onChange={(e) => updateFormData('classification.intra_articular', e.target.checked)}
                className={`w-4 h-4 rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
              />
              <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('traumaOrthoReport.intraArticular')}</label>
            </div>
            {formData.history.pediatric_patient && (
              <div>
                <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.growthPlateInvolvedClassification')}</FieldLabel>
                <Select
                  name="classification_growth_plate"
                  value={formData.classification.growth_plate_involved}
                  onChange={(e) => updateFormData('classification.growth_plate_involved', e.target.value)}
                  options={[
                    { value: 'unclear', label: 'Unclear' },
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' }
                  ]}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Procedures */}
      <Card 
        title={t('traumaOrthoReport.procedures')} 
        collapsible 
        isOpen={!collapsedSections.procedures}
        onToggle={() => toggleSection('procedures')}
        counter={formData.procedures.length}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <button
            type="button"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 mb-4"
            onClick={() => openProcedureEditor()}
          >
{t('traumaOrthoReport.addProcedure')}
          </button>

          {formData.procedures.map((proc, idx) => (
            <div key={idx} className={`border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} rounded-lg p-4`}>
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
                <div>{t('traumaOrthoReport.date')}: {proc.date}</div>
                {proc.side && <div>{t('traumaOrthoReport.side')}: {proc.side}</div>}
                {proc.region && <div>{t('traumaOrthoReport.region')}: {proc.region}</div>}
                <div>{t('traumaOrthoReport.result')}: {proc.result}</div>
              </div>
            </div>
          ))}

          {editingProcedure && (
            <div className={`mt-3 grid grid-cols-12 gap-4 ${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="col-span-12">
                <FieldLabel required darkMode={darkMode}>{t('traumaOrthoReport.procedureName')}</FieldLabel>
                <Select
                  name="procedure_name"
                  value={editingProcedure.name}
                  onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))}
                  options={[
                    { value: 'Splint', label: t('traumaOrthoReport.splint') },
                    { value: 'Cast', label: t('traumaOrthoReport.cast') },
                    { value: 'Reduction (closed)', label: t('traumaOrthoReport.reductionClosed') },
                    { value: 'Reduction (open)', label: t('traumaOrthoReport.reductionOpen') },
                    { value: 'Arthrocentesis', label: t('traumaOrthoReport.arthrocentesis') },
                    { value: 'Wound care', label: t('traumaOrthoReport.woundCare') },
                    { value: 'External fixation', label: t('traumaOrthoReport.externalFixation') },
                    { value: 'Other', label: t('traumaOrthoReport.other') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel required darkMode={darkMode}>{t('traumaOrthoReport.date')}</FieldLabel>
                <Input
                  name="procedure_date"
                  type="datetime-local"
                  value={editingProcedure.date}
                  onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))}
                  darkMode={darkMode}
                />
                {errors[`procedure_${editingProcedureIdx}_date`] && (
                  <p className="text-red-500 text-sm mt-1">{errors[`procedure_${editingProcedureIdx}_date`]}</p>
                )}
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.side')}</FieldLabel>
                <Input
                  name="procedure_side"
                  placeholder={t('traumaOrthoReport.side') + '...'}
                  value={editingProcedure.side || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, side: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.region')}</FieldLabel>
                <Input
                  name="procedure_region"
                  placeholder={t('traumaOrthoReport.region') + '...'}
                  value={editingProcedure.region || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, region: e.target.value}))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.anesthesia')}</FieldLabel>
                <Select
                  name="procedure_anesthesia"
                  value={editingProcedure.anesthesia}
                  onChange={(e) => setEditingProcedure(s => ({...s, anesthesia: e.target.value}))}
                  options={[
                    { value: 'none', label: t('traumaOrthoReport.none') },
                    { value: 'local', label: t('traumaOrthoReport.local') },
                    { value: 'regional', label: t('traumaOrthoReport.regional') },
                    { value: 'general', label: t('traumaOrthoReport.general') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.sedation')}</FieldLabel>
                <Select
                  name="procedure_sedation"
                  value={editingProcedure.sedation}
                  onChange={(e) => setEditingProcedure(s => ({...s, sedation: e.target.value}))}
                  options={[
                    { value: 'none', label: t('traumaOrthoReport.none') },
                    { value: 'minimal', label: t('traumaOrthoReport.minimalSedation') },
                    { value: 'moderate', label: t('traumaOrthoReport.moderateSedation') },
                    { value: 'deep', label: t('traumaOrthoReport.deepSedation') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.technique')}</FieldLabel>
                <TextArea
                  name="procedure_technique"
                  placeholder={t('traumaOrthoReport.technique') + '...'}
                  value={editingProcedure.technique || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.findings')}</FieldLabel>
                <TextArea
                  name="procedure_findings"
                  placeholder={t('traumaOrthoReport.findings') + '...'}
                  value={editingProcedure.findings || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, findings: e.target.value}))}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.result')}</FieldLabel>
                <Select
                  name="procedure_result"
                  value={editingProcedure.result}
                  onChange={(e) => setEditingProcedure(s => ({...s, result: e.target.value}))}
                  options={[
                    { value: 'successful', label: t('traumaOrthoReport.successful') },
                    { value: 'partial', label: t('traumaOrthoReport.partial') },
                    { value: 'failed', label: t('traumaOrthoReport.failed') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.complications')}</FieldLabel>
                <TextArea
                  name="procedure_complications"
                  placeholder={t('traumaOrthoReport.complications') + '...'}
                  value={editingProcedure.complications || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, complications: e.target.value}))}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-12 flex justify-end gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
                  onClick={() => {setEditingProcedure(null); setEditingProcedureIdx(null);}}
                >
                  {t('traumaOrthoReport.cancel')}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  onClick={saveProcedure}
                >
                  {t('traumaOrthoReport.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Diagnosis */}
      <Card 
        title={t('traumaOrthoReport.diagnosis')} 
        collapsible 
        isOpen={!collapsedSections.diagnosis}
        onToggle={() => toggleSection('diagnosis')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel required darkMode={darkMode}>{t('traumaOrthoReport.mainDiagnosis')}</FieldLabel>
            <div className="space-y-2">
              {formData.diagnosis.main && typeof formData.diagnosis.main === 'object' && (formData.diagnosis.main.code || formData.diagnosis.main.term) ? (
                <div className="flex gap-2 items-start">
                  <div className="flex gap-2 items-start flex-1">
                    <Input
                      placeholder={t('traumaOrthoReport.icd11Code')}
                      value={formData.diagnosis.main.code || ''}
                      onChange={(e) => {
                        const current = typeof formData.diagnosis.main === 'object' ? formData.diagnosis.main : { code: '', term: '' };
                        updateFormData('diagnosis.main', { ...current, code: e.target.value });
                      }}
                      className="w-40"
                      darkMode={darkMode}
                    />
                    <Input
                      placeholder={t('traumaOrthoReport.diagnosisTerm')}
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
                    {t('traumaOrthoReport.clear')}
                  </button>
                </div>
              ) : null}
              <IcdCodeSearchInput
                placeholder={t('traumaOrthoReport.searchIcd11Code')}
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
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.secondaryDiagnoses')}</FieldLabel>
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
              placeholder={t('traumaOrthoReport.searchIcd11Code') || 'Search ICD-11 code...'}
              onSelect={(selected) => {
                addToArray('diagnosis.secondary', selected);
              }}
              darkMode={darkMode}
            />
          </div>

          <div>
            <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.diagnosisCodes')}</FieldLabel>
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
              placeholder={t('traumaOrthoReport.searchIcd11CodeToAdd')}
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

      {/* Plan & Treatment (Initial mode only) */}
      {mode === 'initial' && (
        <Card 
          title={t('traumaOrthoReport.planTreatment')} 
          collapsible 
          isOpen={!collapsedSections.plan}
          onToggle={() => toggleSection('plan')}
          darkMode={darkMode}
        >
          <div className="space-y-4">
            {/* Tests */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.tests')} <span className={darkMode ? 'text-slate-400' : 'text-slate-400'}>({formData.plan.tests.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {TEST_PRESETS.map(preset => {
                  const translatedLabel = t(`traumaOrthoReport.${preset}`);
                  const isImaging = ['xrAnkle','xrWrist','xrKnee','xrShoulder','xrHip','xrSpine','ct','mri','us'].includes(preset);
                  return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => openTestEditor({ label: translatedLabel, type: isImaging ? 'imaging' : 'lab' })}
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    {translatedLabel}
                  </button>
                  );
                })}
              </div>

              {formData.plan.tests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.tests.map((t, idx) => {
                    const obj = convertStringToTest(t);
                    return (
                      <Chip key={idx} onEdit={() => openTestEditor(obj, idx)} onRemove={() => removeTest(idx)} darkMode={darkMode}>
                        {obj.label}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {editingTest && (
                <div className={`mt-3 grid grid-cols-12 gap-4 ${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="col-span-12">
                    <Select 
                      name="test.type" 
                      value={editingTest.type} 
                      onChange={(e) => setEditingTest(s => ({...s, type: e.target.value}))}
                      options={[{value:'lab',label:t('traumaOrthoReport.lab')},{value:'imaging',label:t('traumaOrthoReport.imaging')}]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.label" 
                      placeholder={t('traumaOrthoReport.testName')} 
                      value={editingTest.label} 
                      onChange={(e) => setEditingTest(s => ({...s, label: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.note" 
                      placeholder={t('traumaOrthoReport.clinicalQuestionNote')} 
                      value={editingTest.note || ''} 
                      onChange={(e) => setEditingTest(s => ({...s, note: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.dest" 
                      placeholder={t('traumaOrthoReport.destinationClinic')} 
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
                      {t('traumaOrthoReport.cancel')}
                    </button>
                    <button 
                      type="button" 
                      onClick={saveTest} 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      {t('traumaOrthoReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className={`my-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Referrals */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.referrals')} <span className={darkMode ? 'text-slate-400' : 'text-slate-400'}>({formData.plan.referrals.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {REFERRAL_PRESETS.map(sp => {
                  const translatedLabel = t(`traumaOrthoReport.${sp}`);
                  return (
                  <button 
                    key={sp} 
                    type="button" 
                    onClick={() => openRefEditor({specialty: translatedLabel})} 
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    {translatedLabel}
                  </button>
                  );
                })}
              </div>

              {formData.plan.referrals.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.referrals.map((r, idx) => {
                    const obj = convertStringToReferral(r);
                    return (
                      <Chip key={idx} onEdit={() => openRefEditor(obj, idx)} onRemove={() => removeRef(idx)} darkMode={darkMode}>
                        {obj.doctorId ? `Dr ${obj.doctorId}` : obj.specialty}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {editingRef && (
                <div className={`mt-3 grid grid-cols-12 gap-4 ${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.specialty')} 
                      value={editingRef.specialty} 
                      onChange={(e) => setEditingRef(s => ({...s, specialty: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.specificDoctor')} 
                      value={editingRef.doctorId || ''} 
                      onChange={(e) => setEditingRef(s => ({...s, doctorId: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.reasonNote')} 
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
                      options={[{value:'routine',label:t('traumaOrthoReport.routine')},{value:'soon',label:t('traumaOrthoReport.soon')},{value:'urgent',label:t('traumaOrthoReport.urgent')}]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.destinationClinic')} 
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
                      {t('traumaOrthoReport.cancel')}
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" 
                      onClick={saveRef}
                    >
                      {t('traumaOrthoReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className={`my-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Medications */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.medications')} <span className={darkMode ? 'text-slate-400' : 'text-slate-400'}>({formData.plan.meds.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {MED_PRESETS.map(med => {
                  const translatedLabel = t(`traumaOrthoReport.${med}`);
                  return (
                  <button
                    key={med}
                    type="button"
                    onClick={() => openMedEditor({ med: translatedLabel })}
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    {translatedLabel}
                  </button>
                  );
                })}
              </div>

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
                <div className={`mt-3 grid grid-cols-12 gap-4 ${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="col-span-12">
                    <MedicationSearchInput
                      placeholder={t('traumaOrthoReport.searchMedication')}
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
                      placeholder={t('traumaOrthoReport.dose')} 
                      value={editingMed.dose} 
                      onChange={(e) => setEditingMed(s => ({...s, dose: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.route')} 
                      value={editingMed.route} 
                      onChange={(e) => setEditingMed(s => ({...s, route: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.frequency')} 
                      value={editingMed.freq} 
                      onChange={(e) => setEditingMed(s => ({...s, freq: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.duration')} 
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
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('traumaOrthoReport.sendToPharmacy')}</span>
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder={t('traumaOrthoReport.instructionsOptional')} 
                      value={editingMed.instructions || ''} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                      darkMode={darkMode}
                    />
                  </div>
                  {editingMed.sendToPharmacy && (
                    <div className="col-span-12">
                      <Input 
                        placeholder={t('traumaOrthoReport.pharmacyId')} 
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
                      {t('traumaOrthoReport.cancel')}
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" 
                      onClick={saveMed}
                    >
                      {t('traumaOrthoReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className={`my-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Immobilization */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.immobilization')}</FieldLabel>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.plan.immobilization.applied}
                  onChange={(e) => updateFormData('plan.immobilization.applied', e.target.checked)}
                  className={`w-4 h-4 rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('traumaOrthoReport.applied')}</label>
              </div>
              {formData.plan.immobilization.applied && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.type')}</FieldLabel>
                    <Select
                      name="immobilization_type"
                      value={formData.plan.immobilization.type}
                      onChange={(e) => updateFormData('plan.immobilization.type', e.target.value)}
                      options={[
                        { value: 'sling', label: t('traumaOrthoReport.sling') },
                        { value: 'backslab', label: t('traumaOrthoReport.backslab') },
                        { value: 'short leg cast', label: t('traumaOrthoReport.shortLegCast') },
                        { value: 'long leg cast', label: t('traumaOrthoReport.longLegCast') },
                        { value: 'thumb spica', label: t('traumaOrthoReport.thumbSpica') },
                        { value: 'functional brace', label: t('traumaOrthoReport.functionalBrace') },
                        { value: 'external fixator', label: t('traumaOrthoReport.externalFixator') },
                        { value: 'other', label: t('traumaOrthoReport.other') }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.side')}</FieldLabel>
                    <Input
                      name="immobilization_side"
                      placeholder={t('traumaOrthoReport.left') + ', ' + t('traumaOrthoReport.right') + ', etc.'}
                      value={formData.plan.immobilization.side || ''}
                      onChange={(e) => updateFormData('plan.immobilization.side', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.region')}</FieldLabel>
                    <Input
                      name="immobilization_region"
                      placeholder={t('traumaOrthoReport.knee') + ', ' + t('traumaOrthoReport.ankleFoot') + ', etc.'}
                      value={formData.plan.immobilization.region || ''}
                      onChange={(e) => updateFormData('plan.immobilization.region', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              )}
              {formData.plan.immobilization.applied && formData.plan.immobilization.type && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('traumaOrthoReport.documentNeurovascularStatus')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.weightBearing')}</FieldLabel>
                <Select
                  name="weight_bearing"
                  value={formData.plan.weight_bearing}
                  onChange={(e) => updateFormData('plan.weight_bearing', e.target.value)}
                  options={[
                    { value: 'as tolerated', label: t('traumaOrthoReport.asTolerated') },
                    { value: 'partial', label: t('traumaOrthoReport.partial') },
                    { value: 'non-weight-bearing', label: t('traumaOrthoReport.nonWeightBearing') },
                    { value: 'heel-touch', label: t('traumaOrthoReport.heelTouch') },
                    { value: 'unknown', label: t('traumaOrthoReport.unknown') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.dvtProphylaxis')}</FieldLabel>
                <Select
                  name="dvt_prophylaxis"
                  value={formData.plan.dvt_prophylaxis}
                  onChange={(e) => updateFormData('plan.dvt_prophylaxis', e.target.value)}
                  options={[
                    { value: 'not indicated', label: t('traumaOrthoReport.notIndicated') },
                    { value: 'mechanical', label: t('traumaOrthoReport.mechanical') },
                    { value: 'pharmacologic', label: t('traumaOrthoReport.pharmacologic') },
                    { value: 'both', label: t('traumaOrthoReport.both') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.sickLeaveDays')}</FieldLabel>
                <Input
                  name="sick_leave_days"
                  type="number"
                  min="0"
                  value={formData.plan.sick_leave_days || 0}
                  onChange={(e) => updateFormData('plan.sick_leave_days', parseInt(e.target.value) || 0)}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.physio')}</FieldLabel>
                <Select
                  name="physio"
                  value={formData.plan.physio}
                  onChange={(e) => updateFormData('plan.physio', e.target.value)}
                  options={[
                    { value: 'yes', label: t('traumaOrthoReport.yes') },
                    { value: 'no', label: t('traumaOrthoReport.no') },
                    { value: 'consider', label: t('traumaOrthoReport.consider') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.workRestrictions')}</FieldLabel>
              <TextArea
                name="work_restrictions"
                placeholder={t('traumaOrthoReport.workRestrictions') + '...'}
                value={formData.plan.work_restrictions || ''}
                onChange={(e) => updateFormData('plan.work_restrictions', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>

            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.followUp')}</FieldLabel>
              <Select
                name="follow_up"
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={[
                  { value: '24h', label: t('traumaOrthoReport.hours24') },
                  { value: '48-72h', label: t('traumaOrthoReport.hours48_72') },
                  { value: '1w', label: t('traumaOrthoReport.week1') },
                  { value: '2w', label: t('traumaOrthoReport.week2') },
                  { value: '6w', label: t('traumaOrthoReport.week6') },
                  { value: 'PRN', label: t('traumaOrthoReport.prn') }
                ]}
                darkMode={darkMode}
              />
            </div>

            {/* Mobility Aid */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.mobilityAid')}</FieldLabel>
              <Select
                name="mobility_aid"
                value={formData.plan.mobility_aid}
                onChange={(e) => updateFormData('plan.mobility_aid', e.target.value)}
                options={[
                  { value: 'none', label: t('traumaOrthoReport.none') },
                  { value: 'crutches', label: t('traumaOrthoReport.crutches') },
                  { value: 'walker', label: t('traumaOrthoReport.walker') },
                  { value: 'wheelchair', label: t('traumaOrthoReport.wheelchair') },
                  { value: 'cane', label: t('traumaOrthoReport.cane') }
                ]}
                darkMode={darkMode}
              />
            </div>

            {/* Home Exercises / Physio Instructions */}
            <div>
              <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.homeExercisesPhysioInstructions')}</FieldLabel>
              <div className="mb-2">
                <TextArea
                  name="home_exercises"
                  placeholder={t('traumaOrthoReport.homeExercisesPlaceholder')}
                  value={formData.plan.home_exercises}
                  onChange={(e) => updateFormData('plan.home_exercises', e.target.value)}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <TextArea
                  name="physio_instructions"
                  placeholder={t('traumaOrthoReport.additionalPhysioInstructions')}
                  value={formData.plan.physio_instructions}
                  onChange={(e) => updateFormData('plan.physio_instructions', e.target.value)}
                  rows={2}
                  darkMode={darkMode}
                />
              </div>
            </div>

            {/* Validation warnings */}
            {errors.abx && (
              <p className="text-red-500 text-sm mt-2">{errors.abx}</p>
            )}
            {errors.tetanus && (
              <p className="text-amber-600 text-sm mt-1">{errors.tetanus}</p>
            )}
          </div>
        </Card>
      )}

      {/* Outcome & Recommendations (Discharge mode only) */}
      {mode === 'discharge' && (
        <Card 
          title={t('traumaOrthoReport.outcomeRecommendations')} 
          collapsible 
          isOpen={!collapsedSections.outcome}
          onToggle={() => toggleSection('outcome')}
          darkMode={darkMode}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.currentCondition')}</FieldLabel>
                <TextArea
                  name="outcome_condition"
                  placeholder={t('traumaOrthoReport.currentConditionPlaceholder')}
                  value={formData.outcome.condition || ''}
                  onChange={(e) => updateFormData('outcome.condition', e.target.value)}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <FieldLabel darkMode={darkMode}>{t('traumaOrthoReport.hospitalCourse')}</FieldLabel>
                <TextArea
                  name="outcome_course"
                  placeholder={t('traumaOrthoReport.hospitalCoursePlaceholder')}
                  value={formData.outcome.course || ''}
                  onChange={(e) => updateFormData('outcome.course', e.target.value)}
                  rows={3}
                  darkMode={darkMode}
                />
              </div>
            </div>
            
            {/* Red Flag Instructions */}
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.outcome.red_flag_instructions_given}
                  onChange={(e) => updateFormData('outcome.red_flag_instructions_given', e.target.checked)}
                  className={`rounded ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                />
                <FieldLabel className="mb-0" darkMode={darkMode}>{t('traumaOrthoReport.redFlagInstructionsGiven')}</FieldLabel>
              </div>
              {formData.outcome.red_flag_instructions_given && (
                <div>
                  <FieldLabel className="text-xs" darkMode={darkMode}>{t('traumaOrthoReport.warningSigns')}</FieldLabel>
                  <TextArea
                    name="red_flag_instructions_text"
                    placeholder={t('traumaOrthoReport.warningSignsPlaceholder')}
                    value={formData.outcome.red_flag_instructions_text}
                    onChange={(e) => updateFormData('outcome.red_flag_instructions_text', e.target.value)}
                    rows={4}
                    darkMode={darkMode}
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel required darkMode={darkMode}>{t('traumaOrthoReport.recommendations')}</FieldLabel>
              <div className="space-y-2">
                {formData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      name={`recommendation_${index}`}
                      placeholder={t('traumaOrthoReport.recommendationPlaceholder')}
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
                  className={`px-3 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg text-sm`}
                  onClick={() => addToArray('recommendations', '')}
                >
                  {t('traumaOrthoReport.addRecommendation')}
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
        title={t('traumaOrthoReport.attachments')} 
        collapsible 
        isOpen={!collapsedSections.attachments}
        onToggle={() => toggleSection('attachments')}
        counter={formData.attachments.length}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className={`border-2 border-dashed ${darkMode ? 'border-slate-600' : 'border-slate-300'} rounded-lg p-6 text-center`}>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{t('traumaOrthoReport.dropFilesHere')}</p>
            <button
              type="button"
              className={`px-4 py-2 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded-lg`}
            >
              {t('traumaOrthoReport.chooseFiles')}
            </button>
          </div>
          
          <div className="space-y-2">
            {formData.attachments.map((attachment, index) => (
              <div key={index} className={`flex items-center justify-between p-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded`}>
                <span className={`text-sm ${darkMode ? 'text-slate-200' : ''}`}>{attachment.label || attachment.id}</span>
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
      <div className={`sticky bottom-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-t p-4 shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastSaved && `${t('traumaOrthoReport.lastSaved')}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('traumaOrthoReport.saveDraft')}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('traumaOrthoReport.preview')}
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
              {t('traumaOrthoReport.finalizeSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraumaOrthoReportForm;
