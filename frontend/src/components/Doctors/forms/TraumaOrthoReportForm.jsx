import React, { useState, useEffect, useCallback, useRef } from 'react';
import { medicationsAPI, icdCodesAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from GeneralVisitReport/CardiologyReportForm)
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
      >
        ✎
      </button>
    )}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="text-slate-500 hover:text-red-600"
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

// Preset arrays (module scope - avoid recreation on every render)
const MECHANISM_PRESETS = ['Fall','RTA','Sports','Assault','Crush','Twisting','Penetrating','Other'];
const REGION_PRESETS = ['Shoulder','Arm','Elbow','Forearm','Wrist/Hand','Pelvis','Hip','Thigh','Knee','Leg','Ankle/Foot','Spine (C/T/L)','Ribs'];
const TYPE_PRESETS = ['Sprain','Strain','Dislocation/Subluxation','Fracture','Contusion','Laceration','Tendon rupture'];
const RED_FLAG_PRESETS = ['Severe pain','Numbness','Weakness','Color change','Compartment syndrome','Open wound','Deformity','Loss of pulses'];

const SPECIAL_TEST_PRESETS = {
  knee: ['Lachman','Anterior drawer','Posterior drawer','McMurray','Varus/Valgus'],
  shoulder: ['Apprehension','Relocation','Hawkins-Kennedy','Neer','Jobe'],
  ankle: ['Anterior drawer (ankle)','Talar tilt','Squeeze','External rotation'],
  achilles: ['Thompson'],
  wrist: ['Snuffbox tenderness','Watson']
};

const TEST_PRESETS = ['XR Ankle: AP/Lat/Mortise','XR Wrist: PA/Lat/Oblique','XR Knee: AP/Lat','XR Shoulder: AP/Axillary','XR Hip: AP/Lat','XR Spine: AP/Lat','CT','MRI','US','CBC','CRP','ESR','CMP','Coags','Type & Screen','ECG','D-dimer'];
const REFERRAL_PRESETS = ['Physiotherapy','Plastic Surgery','Vascular Surgery','Neurosurgery/Spine','General Surgery','Pain Clinic','Occupational Health'];
const MED_PRESETS = ['NSAIDs','Acetaminophen','Opioid (short course)','PPI protectant','Antibiotics','Tetanus','Anticoagulant'];

// StructuredClone fallback for legacy Safari support
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const TraumaOrthoReportForm = ({ patient, encounter, onSave }) => {
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
      side: 'left',
      region: [],
      type: [],
      open_status: 'closed',
      pain_scale: 0,
      red_flags: [],
      work_accident: false,
      police_report_no: ''
    },
    history: {
      hpi: '',
      pmh: '',
      meds: '',
      allergies: '',
      tetanus_status: 'unknown',
      osteoporosis_risk: 'low'
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
      open_fracture: {
        gustilo: '',
        contamination: 'clean'
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
      stability: 'stable'
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
      follow_up: '48-72h'
    },
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
      modality: 'XR',
      date: '2024-01-15',
      description: 'XR Wrist: PA/Lat/Oblique',
      source: 'orthanc',
      diagnostic_report_id: 'rep-001'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.21',
      modality: 'CT',
      date: '2024-01-15',
      description: 'CT Ankle',
      source: 'orthanc',
      diagnostic_report_id: 'rep-002'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.22',
      modality: 'MRI',
      date: '2024-01-14',
      description: 'MRI Knee',
      source: 'pacs',
      diagnostic_report_id: 'rep-003'
    }
  ]);

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

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'trauma.discharge' : 'trauma.initial'
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
    addToArray('imaging_links', imagingItem);
  }, [addToArray, getOhifUrl]);

  const removeImagingFromReport = useCallback((index) => {
    removeFromArray('imaging_links', index);
  }, [removeFromArray]);

  const openImagingViewer = useCallback((study) => {
    const url = getOhifUrl(study);
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  }, [getOhifUrl]);

  // Region-aware special tests helper
  const suggestedTests = useCallback(() => {
    const r = formData.injury.region.join(' ').toLowerCase();
    const bucket = new Set();
    if (r.includes('knee')) SPECIAL_TEST_PRESETS.knee.forEach(t => bucket.add(t));
    if (r.includes('shoulder')) SPECIAL_TEST_PRESETS.shoulder.forEach(t => bucket.add(t));
    if (r.includes('ankle') || r.includes('foot')) SPECIAL_TEST_PRESETS.ankle.forEach(t => bucket.add(t));
    if (r.includes('achilles')) SPECIAL_TEST_PRESETS.achilles.forEach(t => bucket.add(t));
    if (r.includes('wrist') || r.includes('hand')) SPECIAL_TEST_PRESETS.wrist.forEach(t => bucket.add(t));
    return Array.from(bucket);
  }, [formData.injury.region]);

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

    if (!formData.diagnosis.main.trim()) {
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Autosave Toast */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Saved at {lastSaved?.toLocaleTimeString()}
        </div>
      )}

      {/* Header */}
      <Card title="Traumatology / Orthopedics Report" className="mb-6">
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
            <div className="text-slate-600">Traumatology Department</div>
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

      {/* Injury Details */}
      <Card 
        title="Injury Details" 
        collapsible 
        isOpen={!collapsedSections.injury}
        onToggle={() => toggleSection('injury')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Date/Time of Injury</FieldLabel>
              <Input
                name="injury_date"
                type="datetime-local"
                value={formData.injury.date}
                onChange={(e) => updateFormData('injury.date', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Pain Scale (0-10)</FieldLabel>
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
              />
            </div>
          </div>

          <div>
            <FieldLabel>Mechanism</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.injury.mechanism && (
                <Chip onRemove={() => updateFormData('injury.mechanism', '')}>
                  {formData.injury.mechanism}
                </Chip>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MECHANISM_PRESETS.map(m => (
                <button
                  key={m}
                  type="button"
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  onClick={() => updateFormData('injury.mechanism', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Context</FieldLabel>
              <Input
                name="injury_context"
                placeholder="Work-related, domestic, traffic, etc."
                value={formData.injury.context}
                onChange={(e) => updateFormData('injury.context', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Side</FieldLabel>
              <Select
                name="injury_side"
                value={formData.injury.side}
                onChange={(e) => updateFormData('injury.side', e.target.value)}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                  { value: 'bilateral', label: 'Bilateral' },
                  { value: 'midline', label: 'Midline' }
                ]}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Region(s)</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.injury.region.map((r, i) => (
                <Chip key={i} onRemove={() => removeFromArray('injury.region', i)}>{r}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {REGION_PRESETS.map(r => (
                <button
                  key={r}
                  type="button"
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  onClick={() => {
                    if (!formData.injury.region.includes(r)) {
                      addToArray('injury.region', r);
                    }
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Type(s)</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.injury.type.map((t, i) => (
                <Chip key={i} onRemove={() => removeFromArray('injury.type', i)}>{t}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TYPE_PRESETS.map(t => (
                <button
                  key={t}
                  type="button"
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  onClick={() => {
                    if (!formData.injury.type.includes(t)) {
                      addToArray('injury.type', t);
                    }
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Open/Closed Status</FieldLabel>
              <Select
                name="open_status"
                value={formData.injury.open_status}
                onChange={(e) => updateFormData('injury.open_status', e.target.value)}
                options={[
                  { value: 'closed', label: 'Closed' },
                  { value: 'open_suspected', label: 'Open (Suspected)' },
                  { value: 'open_confirmed', label: 'Open (Confirmed)' }
                ]}
              />
            </div>
            <div>
              <FieldLabel>Red Flags</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.injury.red_flags.map((rf, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('injury.red_flags', i)}>{rf}</Chip>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {RED_FLAG_PRESETS.map(rf => (
                  <button
                    key={rf}
                    type="button"
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                    onClick={() => {
                      if (!formData.injury.red_flags.includes(rf)) {
                        addToArray('injury.red_flags', rf);
                      }
                    }}
                  >
                    {rf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.injury.work_accident}
                onChange={(e) => updateFormData('injury.work_accident', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm text-slate-600">Work Accident</label>
            </div>
            {formData.injury.work_accident && (
              <div>
                <FieldLabel>Police Report Number</FieldLabel>
                <Input
                  name="police_report_no"
                  placeholder="Police report number..."
                  value={formData.injury.police_report_no}
                  onChange={(e) => updateFormData('injury.police_report_no', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* History */}
      <Card 
        title="History" 
        collapsible 
        isOpen={!collapsedSections.history}
        onToggle={() => toggleSection('history')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>History of Present Injury</FieldLabel>
            <div className="flex gap-2">
              <TextArea
                name="history_hpi"
                placeholder="Detailed history of injury..."
                value={formData.history.hpi}
                onChange={(e) => updateFormData('history.hpi', e.target.value)}
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
              <FieldLabel>Past Medical History</FieldLabel>
              <TextArea
                name="history_pmh"
                placeholder="Previous medical conditions..."
                value={formData.history.pmh}
                onChange={(e) => updateFormData('history.pmh', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Current Medications</FieldLabel>
              <TextArea
                name="history_meds"
                placeholder="Current medications..."
                value={formData.history.meds}
                onChange={(e) => updateFormData('history.meds', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Allergies</FieldLabel>
              <TextArea
                name="history_allergies"
                placeholder="Known allergies..."
                value={formData.history.allergies}
                onChange={(e) => updateFormData('history.allergies', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Tetanus Status</FieldLabel>
              <Select
                name="tetanus_status"
                value={formData.history.tetanus_status}
                onChange={(e) => updateFormData('history.tetanus_status', e.target.value)}
                options={[
                  { value: 'unknown', label: 'Unknown' },
                  { value: '<5y', label: '< 5 years' },
                  { value: '>=5y', label: '>= 5 years' },
                  { value: 'never', label: 'Never' }
                ]}
              />
            </div>
            <div>
              <FieldLabel>Osteoporosis Risk</FieldLabel>
              <Select
                name="osteoporosis_risk"
                value={formData.history.osteoporosis_risk}
                onChange={(e) => updateFormData('history.osteoporosis_risk', e.target.value)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'high', label: 'High' }
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Examination */}
      <Card 
        title="Examination" 
        collapsible 
        isOpen={!collapsedSections.examination}
        onToggle={() => toggleSection('examination')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Vitals</FieldLabel>
            <Input
              name="examination_vitals"
              placeholder="Vital signs..."
              value={formData.examination.vitals}
              onChange={(e) => updateFormData('examination.vitals', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Look</FieldLabel>
              <TextArea
                name="examination_look"
                placeholder="Deformity, swelling, bruising, wounds..."
                value={formData.examination.look}
                onChange={(e) => updateFormData('examination.look', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <FieldLabel>Feel</FieldLabel>
              <TextArea
                name="examination_feel"
                placeholder="Tenderness sites..."
                value={formData.examination.feel}
                onChange={(e) => updateFormData('examination.feel', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <FieldLabel>Move</FieldLabel>
              <TextArea
                name="examination_move"
                placeholder="AROM/PROM with degrees..."
                value={formData.examination.move}
                onChange={(e) => updateFormData('examination.move', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Special Tests</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.examination.special_tests.map((test, i) => (
                <Chip key={i} onRemove={() => removeFromArray('examination.special_tests', i)}>{test}</Chip>
              ))}
            </div>

            {/* Suggested first */}
            {suggestedTests().length > 0 && (
              <>
                <p className="text-xs text-slate-500 mb-1">Suggested for selected region(s)</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  {suggestedTests().map(test => (
                    <button
                      key={test}
                      type="button"
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 text-sm"
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
              {Object.values(SPECIAL_TEST_PRESETS).flat().map(test => (
                <button
                  key={test}
                  type="button"
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  onClick={() => !formData.examination.special_tests.includes(test) && addToArray('examination.special_tests', test)}
                >
                  {test}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Neurovascular</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Pulses</FieldLabel>
                <Input
                  name="neurovascular_pulses"
                  placeholder="Distal pulses..."
                  value={formData.examination.neurovascular.pulses}
                  onChange={(e) => updateFormData('examination.neurovascular.pulses', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Capillary Refill</FieldLabel>
                <Input
                  name="neurovascular_cap_refill"
                  placeholder="Capillary refill time..."
                  value={formData.examination.neurovascular.cap_refill}
                  onChange={(e) => updateFormData('examination.neurovascular.cap_refill', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Motor</FieldLabel>
                <Input
                  name="neurovascular_motor"
                  placeholder="Motor function..."
                  value={formData.examination.neurovascular.motor}
                  onChange={(e) => updateFormData('examination.neurovascular.motor', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Sensory</FieldLabel>
                <Input
                  name="neurovascular_sensory"
                  placeholder="Sensory function..."
                  value={formData.examination.neurovascular.sensory}
                  onChange={(e) => updateFormData('examination.neurovascular.sensory', e.target.value)}
                />
              </div>
            </div>
          </div>

          {formData.injury.open_status === 'open_confirmed' && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <FieldLabel required>Open Fracture Classification</FieldLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Gustilo Classification</FieldLabel>
                  <Select
                    name="gustilo"
                    value={formData.examination.open_fracture.gustilo}
                    onChange={(e) => updateFormData('examination.open_fracture.gustilo', e.target.value)}
                    options={[
                      { value: 'I', label: 'Gustilo I' },
                      { value: 'II', label: 'Gustilo II' },
                      { value: 'IIIA', label: 'Gustilo IIIA' },
                      { value: 'IIIB', label: 'Gustilo IIIB' },
                      { value: 'IIIC', label: 'Gustilo IIIC' }
                    ]}
                    required
                  />
                  {errors.gustilo && (
                    <p className="text-red-500 text-sm mt-1">{errors.gustilo}</p>
                  )}
                </div>
                <div>
                  <FieldLabel>Contamination</FieldLabel>
                  <Select
                    name="contamination"
                    value={formData.examination.open_fracture.contamination}
                    onChange={(e) => updateFormData('examination.open_fracture.contamination', e.target.value)}
                    options={[
                      { value: 'clean', label: 'Clean' },
                      { value: 'contaminated', label: 'Contaminated' },
                      { value: 'farm', label: 'Farm' },
                      { value: 'aquatic', label: 'Aquatic' },
                      { value: 'other', label: 'Other' }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <FieldLabel>Soft Tissue</FieldLabel>
            <TextArea
              name="examination_soft_tissue"
              placeholder="Compartments, skin, swelling grade..."
              value={formData.examination.soft_tissue}
              onChange={(e) => updateFormData('examination.soft_tissue', e.target.value)}
              rows={3}
            />
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
                      <span className="font-mono text-xs text-slate-500">{study.study_uid}</span>
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
                  <input
                    className="text-xs border rounded px-2 py-1"
                    placeholder="Note..."
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
        title="Fracture/Soft-tissue Classification" 
        collapsible 
        isOpen={!collapsedSections.classification}
        onToggle={() => toggleSection('classification')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Site</FieldLabel>
              <Input
                name="classification_site"
                placeholder="e.g., distal radius, femoral shaft, ankle"
                value={formData.classification.site}
                onChange={(e) => updateFormData('classification.site', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Side</FieldLabel>
              <Select
                name="classification_side"
                value={formData.classification.side}
                onChange={(e) => updateFormData('classification.side', e.target.value)}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                  { value: 'bilateral', label: 'Bilateral' },
                  { value: 'midline', label: 'Midline' }
                ]}
              />
            </div>
            <div>
              <FieldLabel>System</FieldLabel>
              <Select
                name="classification_system"
                value={formData.classification.system}
                onChange={(e) => updateFormData('classification.system', e.target.value)}
                options={[
                  { value: 'AO/OTA', label: 'AO/OTA' },
                  { value: 'Garden', label: 'Garden' },
                  { value: 'Neer', label: 'Neer' },
                  { value: 'Weber', label: 'Weber' },
                  { value: 'Salter-Harris', label: 'Salter-Harris' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
            </div>
            <div>
              <FieldLabel>Code</FieldLabel>
              <Input
                name="classification_code"
                placeholder="e.g., AO/OTA 33-A1"
                value={formData.classification.code}
                onChange={(e) => updateFormData('classification.code', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Displacement</FieldLabel>
              <Select
                name="classification_displacement"
                value={formData.classification.displacement}
                onChange={(e) => updateFormData('classification.displacement', e.target.value)}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'minimal', label: 'Minimal' },
                  { value: 'displaced', label: 'Displaced' },
                  { value: 'angulated', label: 'Angulated' },
                  { value: 'comminuted', label: 'Comminuted' }
                ]}
              />
            </div>
            <div>
              <FieldLabel>Stability</FieldLabel>
              <Select
                name="classification_stability"
                value={formData.classification.stability}
                onChange={(e) => updateFormData('classification.stability', e.target.value)}
                options={[
                  { value: 'stable', label: 'Stable' },
                  { value: 'unstable', label: 'Unstable' },
                  { value: 'unknown', label: 'Unknown' }
                ]}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.classification.intra_articular}
              onChange={(e) => updateFormData('classification.intra_articular', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className="text-sm text-slate-600">Intra-articular</label>
          </div>
        </div>
      </Card>

      {/* Procedures */}
      <Card 
        title="Procedures / Operations" 
        collapsible 
        isOpen={!collapsedSections.procedures}
        onToggle={() => toggleSection('procedures')}
        counter={formData.procedures.length}
      >
        <div className="space-y-4">
          <button
            type="button"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 mb-4"
            onClick={() => openProcedureEditor()}
          >
            Add Procedure
          </button>

          {formData.procedures.map((proc, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-slate-800">{proc.name}</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openProcedureEditor(proc, idx)}
                    className="text-slate-500 hover:text-slate-700"
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
              <div className="text-sm text-slate-600">
                <div>Date: {proc.date}</div>
                {proc.side && <div>Side: {proc.side}</div>}
                {proc.region && <div>Region: {proc.region}</div>}
                <div>Result: {proc.result}</div>
              </div>
            </div>
          ))}

          {editingProcedure && (
            <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
              <div className="col-span-12">
                <FieldLabel required>Procedure Name</FieldLabel>
                <Select
                  name="procedure_name"
                  value={editingProcedure.name}
                  onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))}
                  options={[
                    { value: 'Splint', label: 'Splint' },
                    { value: 'Cast', label: 'Cast' },
                    { value: 'Reduction (closed)', label: 'Reduction (closed)' },
                    { value: 'Reduction (open)', label: 'Reduction (open)' },
                    { value: 'Arthrocentesis', label: 'Arthrocentesis' },
                    { value: 'Wound care', label: 'Wound care' },
                    { value: 'External fixation', label: 'External fixation' },
                    { value: 'Other', label: 'Other' }
                  ]}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel required>Date</FieldLabel>
                <Input
                  name="procedure_date"
                  type="datetime-local"
                  value={editingProcedure.date}
                  onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))}
                />
                {errors[`procedure_${editingProcedureIdx}_date`] && (
                  <p className="text-red-500 text-sm mt-1">{errors[`procedure_${editingProcedureIdx}_date`]}</p>
                )}
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel>Side</FieldLabel>
                <Input
                  name="procedure_side"
                  placeholder="Left, Right, etc."
                  value={editingProcedure.side || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, side: e.target.value}))}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel>Region</FieldLabel>
                <Input
                  name="procedure_region"
                  placeholder="Knee, Ankle, etc."
                  value={editingProcedure.region || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, region: e.target.value}))}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel>Anesthesia</FieldLabel>
                <Select
                  name="procedure_anesthesia"
                  value={editingProcedure.anesthesia}
                  onChange={(e) => setEditingProcedure(s => ({...s, anesthesia: e.target.value}))}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'local', label: 'Local' },
                    { value: 'regional', label: 'Regional' },
                    { value: 'general', label: 'General' }
                  ]}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FieldLabel>Sedation</FieldLabel>
                <Select
                  name="procedure_sedation"
                  value={editingProcedure.sedation}
                  onChange={(e) => setEditingProcedure(s => ({...s, sedation: e.target.value}))}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'minimal', label: 'Minimal' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'deep', label: 'Deep' }
                  ]}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel>Technique</FieldLabel>
                <TextArea
                  name="procedure_technique"
                  placeholder="Procedure technique..."
                  value={editingProcedure.technique || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))}
                  rows={3}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel>Findings</FieldLabel>
                <TextArea
                  name="procedure_findings"
                  placeholder="Procedure findings..."
                  value={editingProcedure.findings || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, findings: e.target.value}))}
                  rows={3}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel>Result</FieldLabel>
                <Select
                  name="procedure_result"
                  value={editingProcedure.result}
                  onChange={(e) => setEditingProcedure(s => ({...s, result: e.target.value}))}
                  options={[
                    { value: 'successful', label: 'Successful' },
                    { value: 'partial', label: 'Partial' },
                    { value: 'failed', label: 'Failed' }
                  ]}
                />
              </div>
              <div className="col-span-12">
                <FieldLabel>Complications</FieldLabel>
                <TextArea
                  name="procedure_complications"
                  placeholder="Any complications..."
                  value={editingProcedure.complications || ''}
                  onChange={(e) => setEditingProcedure(s => ({...s, complications: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                  onClick={() => {setEditingProcedure(null); setEditingProcedureIdx(null);}}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  onClick={saveProcedure}
                >
                  Save
                </button>
              </div>
            </div>
          )}
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
                if (e.key === 'Enter' && e.target.value.trim()) {
                  addToArray('diagnosis.secondary', e.target.value.trim());
                  e.target.value = '';
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
          title="Plan & Treatment" 
          collapsible 
          isOpen={!collapsedSections.plan}
          onToggle={() => toggleSection('plan')}
        >
          <div className="space-y-4">
            {/* Tests */}
            <div>
              <FieldLabel>Tests <span className="text-slate-400">({formData.plan.tests.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {TEST_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => openTestEditor({ label: preset, type: ['XR', 'CT', 'MRI', 'US', 'Fluoro'].some(t => preset.includes(t)) ? 'imaging' : 'lab' })}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {formData.plan.tests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.tests.map((t, idx) => {
                    const obj = convertStringToTest(t);
                    return (
                      <Chip key={idx} onEdit={() => openTestEditor(obj, idx)} onRemove={() => removeTest(idx)}>
                        {obj.label}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {editingTest && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <Select 
                      name="test.type" 
                      value={editingTest.type} 
                      onChange={(e) => setEditingTest(s => ({...s, type: e.target.value}))}
                      options={[{value:'lab',label:'Lab'},{value:'imaging',label:'Imaging'}]} 
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.label" 
                      placeholder="Test name" 
                      value={editingTest.label} 
                      onChange={(e) => setEditingTest(s => ({...s, label: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.note" 
                      placeholder="Clinical question / note" 
                      value={editingTest.note || ''} 
                      onChange={(e) => setEditingTest(s => ({...s, note: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      name="test.dest" 
                      placeholder="Destination clinic (optional)" 
                      value={editingTest.destinationClinicId || ''} 
                      onChange={(e) => setEditingTest(s => ({...s, destinationClinicId: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => {setEditingTest(null); setEditingTestIdx(null);}} 
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={saveTest} 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className="my-4" />

            {/* Referrals */}
            <div>
              <FieldLabel>Referrals <span className="text-slate-400">({formData.plan.referrals.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {REFERRAL_PRESETS.map(sp => (
                  <button 
                    key={sp} 
                    type="button" 
                    onClick={() => openRefEditor({specialty: sp})} 
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  >
                    {sp}
                  </button>
                ))}
              </div>

              {formData.plan.referrals.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.referrals.map((r, idx) => {
                    const obj = convertStringToReferral(r);
                    return (
                      <Chip key={idx} onEdit={() => openRefEditor(obj, idx)} onRemove={() => removeRef(idx)}>
                        {obj.doctorId ? `Dr ${obj.doctorId}` : obj.specialty}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {editingRef && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <Input 
                      placeholder="Specialty" 
                      value={editingRef.specialty} 
                      onChange={(e) => setEditingRef(s => ({...s, specialty: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Specific doctor (optional)" 
                      value={editingRef.doctorId || ''} 
                      onChange={(e) => setEditingRef(s => ({...s, doctorId: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Reason / note" 
                      value={editingRef.reason || ''} 
                      onChange={(e) => setEditingRef(s => ({...s, reason: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Select 
                      name="urgency" 
                      value={editingRef.urgency || 'routine'} 
                      onChange={(e) => setEditingRef(s => ({...s, urgency: e.target.value}))}
                      options={[{value:'routine',label:'Routine'},{value:'soon',label:'Soon'},{value:'urgent',label:'Urgent'}]} 
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Destination clinic (optional)" 
                      value={editingRef.destinationClinicId || ''} 
                      onChange={(e) => setEditingRef(s => ({...s, destinationClinicId: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50" 
                      onClick={() => {setEditingRef(null); setEditingRefIdx(null);}}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" 
                      onClick={saveRef}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className="my-4" />

            {/* Medications */}
            <div>
              <FieldLabel>Medications <span className="text-slate-400">({formData.plan.meds.length})</span></FieldLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {MED_PRESETS.map(med => (
                  <button
                    key={med}
                    type="button"
                    onClick={() => openMedEditor({ med })}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  >
                    {med}
                  </button>
                ))}
              </div>

              {formData.plan.meds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.plan.meds.map((m, idx) => {
                    const obj = convertStringToMed(m);
                    const label = typeof m === 'string' ? m : `${obj.med} ${obj.dose} ${obj.route} ${obj.freq}`;
                    return (
                      <Chip key={idx} onEdit={() => openMedEditor(obj, idx)} onRemove={() => removeMed(idx)}>
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
                      placeholder="Route" 
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
                  <div className="col-span-12 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={editingMed.sendToPharmacy || false} 
                      onChange={(e) => setEditingMed(s => ({...s, sendToPharmacy: e.target.checked}))} 
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-600">Send to Pharmacy</span>
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Instructions (optional)" 
                      value={editingMed.instructions || ''} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                    />
                  </div>
                  {editingMed.sendToPharmacy && (
                    <div className="col-span-12">
                      <Input 
                        placeholder="Pharmacy ID" 
                        value={editingMed.pharmacyId || ''} 
                        onChange={(e) => setEditingMed(s => ({...s, pharmacyId: e.target.value}))}
                      />
                    </div>
                  )}
                  <div className="col-span-12 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50" 
                      onClick={() => {setEditingMed(null); setEditingMedIdx(null);}}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" 
                      onClick={saveMed}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr className="my-4" />

            {/* Immobilization */}
            <div>
              <FieldLabel>Immobilization</FieldLabel>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.plan.immobilization.applied}
                  onChange={(e) => updateFormData('plan.immobilization.applied', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label className="text-sm text-slate-600">Applied</label>
              </div>
              {formData.plan.immobilization.applied && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <Select
                      name="immobilization_type"
                      value={formData.plan.immobilization.type}
                      onChange={(e) => updateFormData('plan.immobilization.type', e.target.value)}
                      options={[
                        { value: 'sling', label: 'Sling' },
                        { value: 'backslab', label: 'Backslab' },
                        { value: 'short leg cast', label: 'Short Leg Cast' },
                        { value: 'long leg cast', label: 'Long Leg Cast' },
                        { value: 'thumb spica', label: 'Thumb Spica' },
                        { value: 'functional brace', label: 'Functional Brace' },
                        { value: 'external fixator', label: 'External Fixator' },
                        { value: 'other', label: 'Other' }
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel>Side</FieldLabel>
                    <Input
                      name="immobilization_side"
                      placeholder="Left, Right, etc."
                      value={formData.plan.immobilization.side || ''}
                      onChange={(e) => updateFormData('plan.immobilization.side', e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Region</FieldLabel>
                    <Input
                      name="immobilization_region"
                      placeholder="Knee, Ankle, etc."
                      value={formData.plan.immobilization.region || ''}
                      onChange={(e) => updateFormData('plan.immobilization.region', e.target.value)}
                    />
                  </div>
                </div>
              )}
              {formData.plan.immobilization.applied && formData.plan.immobilization.type && (
                <p className="text-xs text-slate-500 mt-1">
                  Document neurovascular status pre- and post-immobilization.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Weight Bearing</FieldLabel>
                <Select
                  name="weight_bearing"
                  value={formData.plan.weight_bearing}
                  onChange={(e) => updateFormData('plan.weight_bearing', e.target.value)}
                  options={[
                    { value: 'as tolerated', label: 'As Tolerated' },
                    { value: 'partial', label: 'Partial' },
                    { value: 'non-weight-bearing', label: 'Non-Weight-Bearing' },
                    { value: 'heel-touch', label: 'Heel-Touch' },
                    { value: 'unknown', label: 'Unknown' }
                  ]}
                />
              </div>
              <div>
                <FieldLabel>DVT Prophylaxis</FieldLabel>
                <Select
                  name="dvt_prophylaxis"
                  value={formData.plan.dvt_prophylaxis}
                  onChange={(e) => updateFormData('plan.dvt_prophylaxis', e.target.value)}
                  options={[
                    { value: 'not indicated', label: 'Not Indicated' },
                    { value: 'mechanical', label: 'Mechanical' },
                    { value: 'pharmacologic', label: 'Pharmacologic' },
                    { value: 'both', label: 'Both' }
                  ]}
                />
              </div>
              <div>
                <FieldLabel>Sick Leave (Days)</FieldLabel>
                <Input
                  name="sick_leave_days"
                  type="number"
                  min="0"
                  value={formData.plan.sick_leave_days || 0}
                  onChange={(e) => updateFormData('plan.sick_leave_days', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <FieldLabel>Physiotherapy</FieldLabel>
                <Select
                  name="physio"
                  value={formData.plan.physio}
                  onChange={(e) => updateFormData('plan.physio', e.target.value)}
                  options={[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                    { value: 'consider', label: 'Consider' }
                  ]}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Work Restrictions</FieldLabel>
              <TextArea
                name="work_restrictions"
                placeholder="Work restrictions..."
                value={formData.plan.work_restrictions || ''}
                onChange={(e) => updateFormData('plan.work_restrictions', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <FieldLabel>Follow-up</FieldLabel>
              <Select
                name="follow_up"
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={[
                  { value: '24h', label: '24 hours' },
                  { value: '48-72h', label: '48-72 hours' },
                  { value: '1w', label: '1 week' },
                  { value: '2w', label: '2 weeks' },
                  { value: '6w', label: '6 weeks' },
                  { value: 'PRN', label: 'PRN' }
                ]}
              />
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
                  value={formData.outcome.condition || ''}
                  onChange={(e) => updateFormData('outcome.condition', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <FieldLabel>Hospital Course</FieldLabel>
                <TextArea
                  name="outcome_course"
                  placeholder="Summary of hospital course..."
                  value={formData.outcome.course || ''}
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

export default TraumaOrthoReportForm;
