import React, { useState, useEffect, useCallback, useRef } from 'react';
import { medicationsAPI, icdCodesAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from GeneralVisitReport)
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
    key={name}
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
    key={name}
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
    key={name}
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

const ToggleMatrix = React.memo(({ items, values, onChange, notes = {}, onNoteChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {items.map(({key, label}) => (
      <div key={key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
        <span className="text-slate-600 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => onChange(key, 'normal')}
            className={`px-3 py-1 rounded text-sm ${values[key] === 'normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Normal
          </button>
          <button 
            type="button" 
            onClick={() => onChange(key, 'abnormal')}
            className={`px-3 py-1 rounded text-sm ${values[key] === 'abnormal' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Abnormal
          </button>
          {values[key] === 'abnormal' && (
            <input 
              type="text" 
              placeholder="Note" 
              value={notes[key] || ''}
              onChange={(e) => onNoteChange(key, e.target.value)}
              className="w-28 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          )}
        </div>
      </div>
    ))}
  </div>
));

const CardiologyReportForm = ({ patient, encounter, onSave }) => {
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
      illness: '',
      past: '',
      family: '',
      allergies: '',
      epidemiology: '',
      triggers: [],
      risk_factors: []
    },
    objective: {
      general: '',
      cardio: '',
      respiratory: '',
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
      notes: '',
      referenced_docs: []
    },
    imaging_links: [],
    diagnosis: {
      main: '',
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
      condition: '',
      course: ''
    },
    recommendations: [],
    attachments: []
  });

  // Available imaging studies (mock data)
  const [availableImaging, setAvailableImaging] = useState([
    {
      study_uid: '1.2.3.4.5.6.7.8.9.10',
      modality: 'CT',
      date: '2024-01-15',
      description: 'Cardiac CT Angiography',
      source: 'orthanc',
      diagnostic_report_id: 'rep-001'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.11',
      modality: 'MRI',
      date: '2024-01-10',
      description: 'Cardiac MRI',
      source: 'orthanc',
      diagnostic_report_id: 'rep-002'
    },
    {
      study_uid: '1.2.3.4.5.6.7.8.9.12',
      modality: 'Echo',
      date: '2024-01-08',
      description: 'Echocardiogram',
      source: 'pacs',
      diagnostic_report_id: 'rep-003'
    }
  ]);

  // Validation errors
  const [errors, setErrors] = useState({});

  // Autosave state
  const [lastSaved, setLastSaved] = useState(null);

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

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'cardiology.discharge' : 'cardiology.initial'
    }));
  }, [mode]);

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
    window.open(url, '_blank');
  }, [getOhifUrl]);

  // Smart editor helpers
  const convertStringToTest = useCallback((str) => {
    if (typeof str === 'string') {
      return { 
        type: ['ECG','Echo','Treadmill','Holter','ABPM','CXR'].includes(str) ? 'imaging' : 'lab',
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

    if (!formData.diagnosis.main.trim()) {
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card title="Cardiology Report" className="mb-6">
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
            <div className="text-slate-600">Cardiology Department</div>
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

      {/* History */}
      <Card 
        title="History" 
        collapsible 
        isOpen={!collapsedSections.history}
        onToggle={() => toggleSection('history')}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>History of Present Illness</FieldLabel>
            <div className="flex gap-2">
              <TextArea
                name="history_illness"
                placeholder="Detailed history of current illness..."
                value={formData.history.illness}
                onChange={(e) => updateFormData('history.illness', e.target.value)}
                rows={4}
              />
              <button
                type="button"
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm"
              >
                🧠 AI Suggest
              </button>
            </div>
          </div>
          
          {/* Triggers */}
          <div>
            <FieldLabel>Triggers</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.history.triggers.map((t, i) => (
                <Chip key={i} onRemove={() => removeFromArray('history.triggers', i)}>{t}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
              {['Exertion','Stress','Cold air','Meals','Night','Rest'].map(t => (
                <button 
                  key={t} 
                  type="button" 
                  className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 text-sm"
                  onClick={() => addToArray('history.triggers', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Risk factors */}
          <div>
            <FieldLabel>Risk Factors</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.history.risk_factors.map((t, i) => (
                <Chip key={i} onRemove={() => removeFromArray('history.risk_factors', i)}>{t}</Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
              {['HTN','T2DM','Dyslipidemia','Smoking','FH CAD','Obesity'].map(t => (
                <button 
                  key={t} 
                  type="button" 
                  className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 text-sm"
                  onClick={() => addToArray('history.risk_factors', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Past Medical History</FieldLabel>
              <TextArea
                name="history_past"
                placeholder="Previous cardiac conditions, surgeries..."
                value={formData.history.past}
                onChange={(e) => updateFormData('history.past', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Family History</FieldLabel>
              <TextArea
                name="history_family"
                placeholder="Family cardiac history..."
                value={formData.history.family}
                onChange={(e) => updateFormData('history.family', e.target.value)}
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
              <FieldLabel>Epidemiology</FieldLabel>
              <TextArea
                name="history_epidemiology"
                placeholder="Travel history, exposures..."
                value={formData.history.epidemiology}
                onChange={(e) => updateFormData('history.epidemiology', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Objective */}
      <Card 
        title="Objective Findings" 
        collapsible 
        isOpen={!collapsedSections.objective}
        onToggle={() => toggleSection('objective')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>General Appearance</FieldLabel>
              <TextArea
                name="objective_general"
                placeholder="General appearance, vital signs..."
                value={formData.objective.general}
                onChange={(e) => updateFormData('objective.general', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Cardiovascular</FieldLabel>
              <TextArea
                name="objective_cardio"
                placeholder="Heart sounds, murmurs, pulses..."
                value={formData.objective.cardio}
                onChange={(e) => updateFormData('objective.cardio', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Respiratory</FieldLabel>
              <TextArea
                name="objective_respiratory"
                placeholder="Lung sounds, breathing pattern..."
                value={formData.objective.respiratory}
                onChange={(e) => updateFormData('objective.respiratory', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Edema</FieldLabel>
              <TextArea
                name="objective_edema"
                placeholder="Peripheral edema, JVD..."
                value={formData.objective.edema}
                onChange={(e) => updateFormData('objective.edema', e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Other Findings</FieldLabel>
            <TextArea
              name="objective_other"
              placeholder="Additional physical findings..."
              value={formData.objective.other}
              onChange={(e) => updateFormData('objective.other', e.target.value)}
              rows={2}
            />
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
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Investigation Notes</FieldLabel>
            <TextArea
              name="investigations_notes"
              placeholder="Summary of investigations performed..."
              value={formData.investigations.notes}
              onChange={(e) => updateFormData('investigations.notes', e.target.value)}
              rows={3}
            />
          </div>
          
          <div>
            <FieldLabel>Referenced Documents</FieldLabel>
            <div className="space-y-2">
              {formData.investigations.referenced_docs.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <span className="text-sm text-slate-600">{doc.type}</span>
                  <span className="text-sm font-medium">{doc.title}</span>
                  <span className="text-sm text-slate-500">{doc.date}</span>
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
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                onClick={() => addToArray('investigations.referenced_docs', {
                  type: 'ecg',
                  title: 'ECG',
                  date: new Date().toISOString().split('T')[0]
                })}
              >
                + Add Reference
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Imaging Links */}
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
                // Mock auto-load imaging
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
                      const next = structuredClone(formData.imaging_links);
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
        title="Review of Systems" 
        collapsible 
        isOpen={!collapsedSections.objective}
        onToggle={() => toggleSection('objective')}
      >
        <ToggleMatrix
          items={[
            {key:'respiratory',label:'Respiratory'},
            {key:'cardio',label:'Cardio'},
            {key:'gi',label:'GI'},
            {key:'neuro',label:'Neuro'},
            {key:'gu',label:'GU'},
            {key:'derm',label:'Derm'},
            {key:'ent',label:'ENT'},
            {key:'msk',label:'MSK'}
          ]}
          values={formData.ros || {}} 
          onChange={(k, v) => updateFormData(`ros.${k}`, v)}
          notes={formData.ros?.notes || {}} 
          onNoteChange={(k, v) => updateFormData(`ros.notes.${k}`, v)}
        />
      </Card>

      {/* Physical Examination */}
      <Card 
        title="Physical Examination" 
        collapsible 
        isOpen={!collapsedSections.objective}
        onToggle={() => toggleSection('objective')}
      >
        <ToggleMatrix
          items={[
            {key:'general',label:'General'},
            {key:'lungs',label:'Lungs'},
            {key:'heart',label:'Heart'},
            {key:'abdomen',label:'Abdomen'},
            {key:'neuro',label:'Neuro'},
            {key:'extremities',label:'Extremities'}
          ]}
          values={formData.pe || {}} 
          onChange={(k, v) => updateFormData(`pe.${k}`, v)}
          notes={formData.pe?.notes || {}} 
          onNoteChange={(k, v) => updateFormData(`pe.notes.${k}`, v)}
        />
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Comorbidities</FieldLabel>
              <TextArea
                name="diagnosis_comorbid"
                placeholder="Other medical conditions..."
                value={formData.diagnosis.comorbid}
                onChange={(e) => updateFormData('diagnosis.comorbid', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Complications</FieldLabel>
              <TextArea
                name="diagnosis_complications"
                placeholder="Any complications..."
                value={formData.diagnosis.complications}
                onChange={(e) => updateFormData('diagnosis.complications', e.target.value)}
                rows={3}
              />
            </div>
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

      {/* Plan (Initial mode only) */}
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
                {['ECG','Echo','Treadmill','Holter','ABPM','Lipids','HbA1c','CMP','Troponin','BNP/NT-proBNP','CXR','Other'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => openTestEditor({ label: preset, type: ['ECG','Echo','Treadmill','Holter','ABPM','CXR'].includes(preset) ? 'imaging' : 'lab' })}
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
                {['Interventional Cardiology','Cardiothoracic Surgery','Endocrinology','Nephrology','Pulmonology','Rehab','Other'].map(sp => (
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
              <button 
                type="button" 
                onClick={() => openMedEditor()} 
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 mb-3"
              >
                Add Medication
              </button>

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

            <div>
              <FieldLabel>Lifestyle Recommendations</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {formData.plan.lifestyle.map((item, index) => (
                  <Chip
                    key={index}
                    onRemove={() => removeFromArray('plan.lifestyle', index)}
                  >
                    {item}
                  </Chip>
                ))}
                <button
                  type="button"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                  onClick={() => addToArray('plan.lifestyle', 'Low sodium diet')}
                >
                  + Add Lifestyle
                </button>
              </div>
            </div>

            <div>
              <FieldLabel>Follow-up</FieldLabel>
              <Input
                name="plan_follow_up"
                placeholder="Follow-up instructions..."
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Procedure */}
      <Card 
        title="Procedure / Operation" 
        collapsible 
        isOpen={!collapsedSections.procedure}
        onToggle={() => toggleSection('procedure')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Procedure Name</FieldLabel>
              <Input
                name="procedure_name"
                placeholder="e.g., PCI, CABG, RFA..."
                value={formData.procedure.name}
                onChange={(e) => updateFormData('procedure.name', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Procedure Date</FieldLabel>
              <Input
                name="procedure_date"
                type="date"
                value={formData.procedure.date}
                onChange={(e) => updateFormData('procedure.date', e.target.value)}
              />
              {errors.procedure_date && (
                <p className="text-red-500 text-sm mt-1">{errors.procedure_date}</p>
              )}
            </div>
          </div>
          <div>
            <FieldLabel>Procedure Notes</FieldLabel>
            <TextArea
              name="procedure_notes"
              placeholder="Detailed procedure notes..."
              value={formData.procedure.notes}
              onChange={(e) => updateFormData('procedure.notes', e.target.value)}
              rows={4}
            />
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

export default CardiologyReportForm;
