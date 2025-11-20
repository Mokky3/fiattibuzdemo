import React, { useState, useCallback, useEffect, useRef } from 'react';
import { icdCodesAPI, medicationsAPI } from '../../../services/apiService';

// Sub-components moved outside to prevent recreation
const FieldLabel = ({ children, required = false }) => (
  <label className="block text-slate-600 text-sm font-medium mb-2">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = React.memo(({ name, type = 'text', placeholder, value, onChange, onKeyDown, className = '' }) => {
  const handleChange = useCallback((e) => {
    onChange(e);
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown]);

  const handleFocus = useCallback(() => {
    console.log(`Focus in: ${name}`);
  }, [name]);

  const handleBlur = useCallback(() => {
    console.log(`Focus out: ${name}`);
  }, [name]);

  return (
    <div>
      <input
        key={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`w-full px-4 py-4 border rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-slate-200 text-base ${className}`}
      />
    </div>
  );
});

const Select = React.memo(({ name, value, onChange, options, placeholder, className = '' }) => {
  const handleChange = useCallback((e) => {
    onChange(e);
  }, [onChange]);

  return (
    <div>
      <select
        key={name}
        name={name}
        value={value}
        onChange={handleChange}
        className={`w-full px-4 py-4 border rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-slate-200 text-base ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
});

const TextArea = React.memo(({ name, placeholder, value, onChange, rows = 3, className = '' }) => {
  const handleChange = useCallback((e) => {
    onChange(e);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    console.log(`Focus in: ${name}`);
  }, [name]);

  const handleBlur = useCallback(() => {
    console.log(`Focus out: ${name}`);
  }, [name]);

  return (
    <div>
      <textarea
        key={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none border-slate-200 ${className}`}
      />
    </div>
  );
});

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
          className="w-full px-4 py-2 border rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-slate-200"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
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
          className="w-full px-4 py-2 border rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-slate-200"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
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

const Chip = ({ children, onRemove, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm ${className}`}>
    {children}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="text-emerald-500 hover:text-emerald-700 ml-1"
      >
        ×
      </button>
    )}
  </span>
);

const ToggleMatrix = ({ items, values, onChange, notes = {}, onNoteChange }) => (
  <div className="grid grid-cols-2 gap-4">
    {items.map(({key, label}) => (
      <div key={key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
        <span className="text-slate-600 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(key, 'normal')}
            className={`px-3 py-1 rounded text-sm ${
              values[key] === 'normal' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => onChange(key, 'abnormal')}
            className={`px-3 py-1 rounded text-sm ${
              values[key] === 'abnormal' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Abnormal
          </button>
          {values[key] === 'abnormal' && (
            <input
              key={`note-${key}`}
              type="text"
              placeholder="Note"
              value={notes[key] || ''}
              onChange={(e) => onNoteChange(key, e.target.value)}
              className="w-24 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          )}
        </div>
      </div>
    ))}
  </div>
);

const Card = ({ title, children, actions, className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-slate-800 font-semibold text-lg">{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className={`w-5 h-5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

const GeneralVisitReport = ({ formData: externalFormData, setFormData: externalSetFormData, patient, onSave }) => {
  // Use external formData if provided, otherwise use internal state
  const [internalFormData, setInternalFormData] = useState({
    meta: {
      clinic_id: localStorage.getItem('clinic_id') || '',
      department_id: 'dept-general',
      physician_id: '',
      encounter_type: 'ambulatory',
      visit_datetime: new Date().toISOString()
    },
    chief_complaint: '',
    onset_time: null,
    info_source: 'patient',
    hpi: {
      onset: '',
      duration: '',
      course: '',
      modifiers: [],
      associated_symptoms: [],
      free: ''
    },
    pmh_fh_sh: {
      pmh: [],
      surgeries: '',
      fh: {
        cardio: 'unknown',
        diabetes: 'unknown',
        cancer: 'unknown',
        notes: ''
      },
      smoking: 'never',
      audit_c: 0,
      exercise: 'low'
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
    assessment: {
      working: [],
      ddx: []
    },
    plan: {
      tests: [],
      referrals: [],
      med_changes: [],
      lifestyle: [],
      follow_up: ''
    },
    summary: ''
  });

  // Use external formData if provided, otherwise use internal
  // Ensure formData has all required nested properties
  const formData = externalFormData || internalFormData;
  const setFormData = externalSetFormData || setInternalFormData;

  // Ensure formData has all required nested structures to prevent undefined errors
  // Only run once on mount when externalFormData is provided but missing nested structures
  useEffect(() => {
    if (externalFormData && formData && (
      !formData?.hpi || !formData?.pmh_fh_sh || !formData?.ros || !formData?.pe || 
      !formData?.assessment || !formData?.plan || 
      !formData?.hpi?.onset || !Array.isArray(formData?.hpi?.modifiers) || !Array.isArray(formData?.hpi?.associated_symptoms) ||
      !Array.isArray(formData?.pmh_fh_sh?.pmh) || !formData?.pmh_fh_sh?.fh || 
      !formData?.ros?.notes || !formData?.pe?.notes ||
      !Array.isArray(formData?.assessment?.working) || !Array.isArray(formData?.assessment?.ddx) ||
      !Array.isArray(formData?.plan?.tests) || !Array.isArray(formData?.plan?.referrals) || !Array.isArray(formData?.plan?.med_changes) || !Array.isArray(formData?.plan?.lifestyle)
    )) {
      setFormData(prev => {
        // Check if update is actually needed to avoid infinite loop
        const needsUpdate = (
          !prev?.hpi || !prev?.pmh_fh_sh || !prev?.ros || !prev?.pe || 
          !prev?.assessment || !prev?.plan
        );
        
        if (!needsUpdate) return prev;
        
        return {
          ...prev,
          hpi: {
            onset: prev?.hpi?.onset || '',
            duration: prev?.hpi?.duration || '',
            course: prev?.hpi?.course || '',
            modifiers: prev?.hpi?.modifiers || [],
            associated_symptoms: prev?.hpi?.associated_symptoms || [],
            free: prev?.hpi?.free || ''
          },
          pmh_fh_sh: {
            pmh: prev?.pmh_fh_sh?.pmh || [],
            surgeries: prev?.pmh_fh_sh?.surgeries || '',
            fh: {
              cardio: prev?.pmh_fh_sh?.fh?.cardio || 'unknown',
              diabetes: prev?.pmh_fh_sh?.fh?.diabetes || 'unknown',
              cancer: prev?.pmh_fh_sh?.fh?.cancer || 'unknown',
              notes: prev?.pmh_fh_sh?.fh?.notes || ''
            },
            smoking: prev?.pmh_fh_sh?.smoking || 'never',
            audit_c: prev?.pmh_fh_sh?.audit_c || 0,
            exercise: prev?.pmh_fh_sh?.exercise || 'low'
          },
          ros: {
            respiratory: prev?.ros?.respiratory || 'normal',
            cardio: prev?.ros?.cardio || 'normal',
            gi: prev?.ros?.gi || 'normal',
            neuro: prev?.ros?.neuro || 'normal',
            gu: prev?.ros?.gu || 'normal',
            derm: prev?.ros?.derm || 'normal',
            ent: prev?.ros?.ent || 'normal',
            msk: prev?.ros?.msk || 'normal',
            notes: prev?.ros?.notes || {}
          },
          pe: {
            general: prev?.pe?.general || 'normal',
            lungs: prev?.pe?.lungs || 'normal',
            heart: prev?.pe?.heart || 'normal',
            abdomen: prev?.pe?.abdomen || 'normal',
            neuro: prev?.pe?.neuro || 'normal',
            extremities: prev?.pe?.extremities || 'normal',
            notes: prev?.pe?.notes || {}
          },
          assessment: {
            working: prev?.assessment?.working || [],
            ddx: prev?.assessment?.ddx || []
          },
          plan: {
            tests: prev?.plan?.tests || [],
            referrals: prev?.plan?.referrals || [],
            med_changes: prev?.plan?.med_changes || [],
            lifestyle: prev?.plan?.lifestyle || [],
            follow_up: prev?.plan?.follow_up || ''
          }
        };
      });
    }
  }, [externalFormData]); // Only depend on externalFormData to avoid infinite loop

  // Sync formData changes to parent if external formData is used
  useEffect(() => {
    if (externalSetFormData && externalFormData !== formData) {
      // This will be handled by updateFormData
    }
  }, [formData, externalFormData, externalSetFormData]);

  // Inline editor states for smart orders
  const [editingTest, setEditingTest] = useState(null);
  const [editingTestIdx, setEditingTestIdx] = useState(null);
  const [editingRef, setEditingRef] = useState(null);
  const [editingRefIdx, setEditingRefIdx] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [editingMedIdx, setEditingMedIdx] = useState(null);
  
  // State for modifier and symptom inputs
  const [modifierInput, setModifierInput] = useState('');
  const [symptomInput, setSymptomInput] = useState('');

  // Update form data - stable reference (defined first) with deep cloning
  const updateFormData = useCallback((path, value) => {
    setFormData(prev => {
      const newData = structuredClone(prev);
      const keys = path.split('.');
      let cur = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]];
      }
      
      cur[keys[keys.length - 1]] = value;
      return newData;
    });
  }, []);

  // Stable event handlers for form inputs (defined after updateFormData)
  const createInputHandler = useCallback((path) => {
    return (e) => updateFormData(path, e.target.value);
  }, [updateFormData]);

  // Add to array field with deep cloning
  const addToArray = useCallback((path, value) => {
    setFormData(prev => {
      const newData = structuredClone(prev);
      const keys = path.split('.');
      let cur = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]];
      }
      
      if (!cur[keys[keys.length - 1]].includes(value)) {
        cur[keys[keys.length - 1]].push(value);
      }
      return newData;
    });
  }, []);

  // Remove from array field with deep cloning
  const removeFromArray = useCallback((path, value) => {
    setFormData(prev => {
      const newData = structuredClone(prev);
      const keys = path.split('.');
      let cur = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]];
      }
      
      cur[keys[keys.length - 1]] = cur[keys[keys.length - 1]].filter(item => item !== value);
      return newData;
    });
  }, []);

  // Helper functions for smart orders
  const convertStringToTest = useCallback((str) => {
    if (typeof str === 'string') {
      return {
        type: str === 'CXR' || str === 'ECG' ? 'imaging' : 'lab',
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
    const currentTests = formData?.plan?.tests || [];
    const next = [...currentTests];
    if (editingTestIdx === null) {
      next.push(editingTest);
    } else {
      next[editingTestIdx] = editingTest;
    }
    updateFormData('plan.tests', next);
    setEditingTest(null);
    setEditingTestIdx(null);
  }, [editingTest, editingTestIdx, formData?.plan?.tests, updateFormData]);

  const removeTest = useCallback((idx) => {
    const currentTests = formData?.plan?.tests || [];
    updateFormData('plan.tests', currentTests.filter((_, i) => i !== idx));
  }, [formData?.plan?.tests, updateFormData]);

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
    const currentRefs = formData?.plan?.referrals || [];
    const next = [...currentRefs];
    if (editingRefIdx === null) {
      next.push(editingRef);
    } else {
      next[editingRefIdx] = editingRef;
    }
    updateFormData('plan.referrals', next);
    setEditingRef(null);
    setEditingRefIdx(null);
  }, [editingRef, editingRefIdx, formData?.plan?.referrals, updateFormData]);

  const removeRef = useCallback((idx) => {
    const currentRefs = formData?.plan?.referrals || [];
    updateFormData('plan.referrals', currentRefs.filter((_, i) => i !== idx));
  }, [formData?.plan?.referrals, updateFormData]);

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
    const currentMeds = formData?.plan?.med_changes || [];
    const next = [...currentMeds];
    if (editingMedIdx === null) {
      next.push(editingMed);
    } else {
      next[editingMedIdx] = editingMed;
    }
    updateFormData('plan.med_changes', next);
    setEditingMed(null);
    setEditingMedIdx(null);
  }, [editingMed, editingMedIdx, formData?.plan?.med_changes, updateFormData]);

  const removeMed = useCallback((idx) => {
    const currentMeds = formData?.plan?.med_changes || [];
    updateFormData('plan.med_changes', currentMeds.filter((_, i) => i !== idx));
  }, [formData?.plan?.med_changes, updateFormData]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">General Visit Report (#001)</h1>
          <p className="text-slate-600">Outpatient visit documentation</p>
        </div>

        {/* A. Identification */}
        <Card title="A. Identification">
          <div className="space-y-4">
            <div>
              <FieldLabel required>Chief Complaint</FieldLabel>
              <Input
                name="chief_complaint"
                placeholder="Brief description of the main concern"
                value={formData?.chief_complaint || ''}
                onChange={createInputHandler('chief_complaint')}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Onset Time</FieldLabel>
                <Input
                  name="onset_time"
                  type="datetime-local"
                  value={formData?.onset_time || ''}
                  onChange={createInputHandler('onset_time')}
                />
              </div>
              
              <div>
                <FieldLabel>Information Source</FieldLabel>
                <Select
                  name="info_source"
                  value={formData?.info_source || 'patient'}
                  onChange={createInputHandler('info_source')}
                  options={[
                    { value: 'patient', label: 'Patient' },
                    { value: 'relative', label: 'Relative' },
                    { value: 'record', label: 'Medical Record' }
                  ]}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* B. HPI */}
        <Card title="B. History of Present Illness">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel>Onset</FieldLabel>
                <Select
                  name="hpi.onset"
                  value={formData?.hpi?.onset || ''}
                  onChange={createInputHandler('hpi.onset')}
                  options={[
                    { value: 'остро', label: 'Остро (Acute)' },
                    { value: 'постепенно', label: 'Постепенно (Gradual)' },
                    { value: 'неизвестно', label: 'Неизвестно (Unknown)' }
                  ]}
                />
              </div>
              
              <div>
                <FieldLabel>Duration</FieldLabel>
                <Input
                  name="hpi.duration"
                  placeholder="e.g., 3 days"
                  value={formData?.hpi?.duration || ''}
                  onChange={createInputHandler('hpi.duration')}
                />
              </div>
              
              <div>
                <FieldLabel>Course</FieldLabel>
                <Select
                  name="hpi.course"
                  value={formData?.hpi?.course || ''}
                  onChange={createInputHandler('hpi.course')}
                  options={[
                    { value: 'ухудшается', label: 'Ухудшается (Worsening)' },
                    { value: 'улучшается', label: 'Улучшается (Improving)' },
                    { value: 'стабильно', label: 'Стабильно (Stable)' }
                  ]}
                />
              </div>
            </div>
            
            <div>
              <FieldLabel>Modifiers</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.hpi?.modifiers || []).map(modifier => (
                  <Chip key={modifier} onRemove={() => removeFromArray('hpi.modifiers', modifier)}>
                    {modifier}
                  </Chip>
                ))}
              </div>
              <Input
                name="hpi_modifier_input"
                placeholder="Add modifier (press Enter)"
                value={modifierInput}
                onChange={(e) => setModifierInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = modifierInput.trim();
                    if (value) {
                      addToArray('hpi.modifiers', value);
                      setModifierInput('');
                    }
                  }
                }}
              />
            </div>
            
            <div>
              <FieldLabel>Associated Symptoms</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.hpi?.associated_symptoms || []).map(symptom => (
                  <Chip key={symptom} onRemove={() => removeFromArray('hpi.associated_symptoms', symptom)}>
                    {symptom}
                  </Chip>
                ))}
              </div>
              <Input
                name="hpi_symptom_input"
                placeholder="Add symptom (press Enter)"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = symptomInput.trim();
                    if (value) {
                      addToArray('hpi.associated_symptoms', value);
                      setSymptomInput('');
                    }
                  }
                }}
              />
            </div>
            
            <div>
              <FieldLabel>Free Text</FieldLabel>
              <div className="flex gap-2">
                <TextArea
                  name="hpi.free"
                  placeholder="Detailed description of the present illness..."
                  value={formData?.hpi?.free || ''}
                  onChange={createInputHandler('hpi.free')}
                  rows={4}
                  className="flex-1"
                />
                <button type="button" className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                  🧠 AI Suggest
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* B. PMH / FH / SH */}
        <Card title="B. Past Medical History / Family History / Social History">
          <div className="space-y-6">
            <div>
              <FieldLabel>Past Medical History</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.pmh_fh_sh?.pmh || []).map(condition => (
                  <Chip key={condition} onRemove={() => removeFromArray('pmh_fh_sh.pmh', condition)}>
                    {condition}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['HTN', 'T2DM', 'COPD', 'CAD', 'CKD', 'Depression', 'Anxiety', 'Other'].map(condition => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => addToArray('pmh_fh_sh.pmh', condition)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors text-sm"
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <FieldLabel>Surgeries/Hospitalizations</FieldLabel>
              <TextArea
                name="pmh_fh_sh.surgeries"
                placeholder="List any surgeries or hospitalizations..."
                value={formData?.pmh_fh_sh?.surgeries || ''}
                onChange={(e) => updateFormData('pmh_fh_sh.surgeries', e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <FieldLabel>Family History</FieldLabel>
              <div className="grid grid-cols-3 gap-4">
                {['cardio', 'diabetes', 'cancer'].map(condition => (
                  <div key={condition} className="space-y-2">
                    <label className="text-slate-600 text-sm font-medium capitalize">{condition}</label>
                    <Select
                      name={`pmh_fh_sh.fh.${condition}`}
                      value={formData?.pmh_fh_sh?.fh?.[condition] || 'unknown'}
                      onChange={(e) => updateFormData(`pmh_fh_sh.fh.${condition}`, e.target.value)}
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                        { value: 'unknown', label: 'Unknown' }
                      ]}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Input
                  name="pmh_fh_sh.fh.notes"
                  placeholder="Additional family history notes..."
                  value={formData?.pmh_fh_sh?.fh?.notes || ''}
                  onChange={(e) => updateFormData('pmh_fh_sh.fh.notes', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel>Smoking</FieldLabel>
                <Select
                  name="pmh_fh_sh.smoking"
                  value={formData?.pmh_fh_sh?.smoking || 'never'}
                  onChange={(e) => updateFormData('pmh_fh_sh.smoking', e.target.value)}
                  options={[
                    { value: 'never', label: 'Never' },
                    { value: 'former', label: 'Former' },
                    { value: 'current', label: 'Current' }
                  ]}
                />
              </div>
              
              <div>
                <FieldLabel>AUDIT-C Score</FieldLabel>
                <Input
                  name="pmh_fh_sh.audit_c"
                  type="number"
                  min="0"
                  max="12"
                  value={formData?.pmh_fh_sh?.audit_c || 0}
                  onChange={(e) => updateFormData('pmh_fh_sh.audit_c', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <FieldLabel>Exercise</FieldLabel>
                <Select
                  name="pmh_fh_sh.exercise"
                  value={formData?.pmh_fh_sh?.exercise || 'low'}
                  onChange={(e) => updateFormData('pmh_fh_sh.exercise', e.target.value)}
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

        {/* B. ROS */}
        <Card title="B. Review of Systems">
          <ToggleMatrix
            items={[
              { key: 'respiratory', label: 'Respiratory' },
              { key: 'cardio', label: 'Cardio' },
              { key: 'gi', label: 'GI' },
              { key: 'neuro', label: 'Neuro' },
              { key: 'gu', label: 'GU' },
              { key: 'derm', label: 'Derm' },
              { key: 'ent', label: 'ENT' },
              { key: 'msk', label: 'MSK' }
            ]}
            values={formData?.ros || { respiratory: 'normal', cardio: 'normal', gi: 'normal', neuro: 'normal', gu: 'normal', derm: 'normal', ent: 'normal', msk: 'normal', notes: {} }}
            onChange={(key, value) => updateFormData(`ros.${key}`, value)}
            notes={formData?.ros?.notes || {}}
            onNoteChange={(key, value) => updateFormData(`ros.notes.${key}`, value)}
          />
        </Card>

        {/* B. PE */}
        <Card title="B. Physical Examination">
          <ToggleMatrix
            items={[
              { key: 'general', label: 'General' },
              { key: 'lungs', label: 'Lungs' },
              { key: 'heart', label: 'Heart' },
              { key: 'abdomen', label: 'Abdomen' },
              { key: 'neuro', label: 'Neuro' },
              { key: 'extremities', label: 'Extremities' }
            ]}
            values={formData?.pe || { general: 'normal', lungs: 'normal', heart: 'normal', abdomen: 'normal', neuro: 'normal', extremities: 'normal', notes: {} }}
            onChange={(key, value) => updateFormData(`pe.${key}`, value)}
            notes={formData?.pe?.notes || {}}
            onNoteChange={(key, value) => updateFormData(`pe.notes.${key}`, value)}
          />
        </Card>

        {/* B. Assessment */}
        <Card title="B. Assessment">
          <div className="space-y-4">
            <div>
              <FieldLabel required>Working Diagnosis</FieldLabel>
              <div className="space-y-2">
                {(formData?.assessment?.working || []).map((diagnosis, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <Input
                        placeholder="ICD-11 code"
                        value={diagnosis.code || ''}
                        onChange={(e) => {
                          const currentWorking = formData?.assessment?.working || [];
                          const newWorking = [...currentWorking];
                          newWorking[index] = { ...diagnosis, code: e.target.value };
                          updateFormData('assessment.working', newWorking);
                        }}
                        className="w-40"
                      />
                      <Input
                        placeholder="Diagnosis term"
                        value={diagnosis.term || ''}
                        onChange={(e) => {
                          const currentWorking = formData?.assessment?.working || [];
                          const newWorking = [...currentWorking];
                          newWorking[index] = { ...diagnosis, term: e.target.value };
                          updateFormData('assessment.working', newWorking);
                        }}
                        className="flex-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentWorking = formData?.assessment?.working || [];
                        const newWorking = currentWorking.filter((_, i) => i !== index);
                        updateFormData('assessment.working', newWorking);
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 items-start">
                  <IcdCodeSearchInput
                    placeholder="Search ICD-11 code or diagnosis..."
                    onSelect={(selected) => {
                      const currentWorking = formData?.assessment?.working || [];
                      const newWorking = [...currentWorking, selected];
                      updateFormData('assessment.working', newWorking);
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <FieldLabel>Differential Diagnoses</FieldLabel>
              <div className="space-y-2">
                {(formData?.assessment?.ddx || []).map((diagnosis, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <Input
                        placeholder="ICD-11 code"
                        value={diagnosis.code || ''}
                        onChange={(e) => {
                          const currentDdx = formData?.assessment?.ddx || [];
                          const newDdx = [...currentDdx];
                          newDdx[index] = { ...diagnosis, code: e.target.value };
                          updateFormData('assessment.ddx', newDdx);
                        }}
                        className="w-40"
                      />
                      <Input
                        placeholder="Diagnosis term"
                        value={diagnosis.term || ''}
                        onChange={(e) => {
                          const currentDdx = formData?.assessment?.ddx || [];
                          const newDdx = [...currentDdx];
                          newDdx[index] = { ...diagnosis, term: e.target.value };
                          updateFormData('assessment.ddx', newDdx);
                        }}
                        className="flex-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentDdx = formData?.assessment?.ddx || [];
                        const newDdx = currentDdx.filter((_, i) => i !== index);
                        updateFormData('assessment.ddx', newDdx);
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 items-start">
                  <IcdCodeSearchInput
                    placeholder="Search ICD-11 code or diagnosis..."
                    onSelect={(selected) => {
                      const currentDdx = formData?.assessment?.ddx || [];
                      const newDdx = [...currentDdx, selected];
                      updateFormData('assessment.ddx', newDdx);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* B. Plan */}
        <Card title="B. Plan">
          <div className="space-y-6">
            {/* Tests Section */}
            <div>
              <FieldLabel>Tests <span className="text-slate-400">({formData?.plan?.tests?.length || 0})</span></FieldLabel>
              
              {/* Test presets */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {['CBC', 'CRP', 'ESR', 'CMP', 'CXR', 'ECG', 'Other'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => openTestEditor({
                      label: preset,
                      type: preset === 'CXR' || preset === 'ECG' ? 'imaging' : 'lab'
                    })}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Saved tests list */}
              {formData?.plan?.tests?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(formData?.plan?.tests || []).map((t, idx) => {
                    const testObj = convertStringToTest(t);
                    return (
                      <Chip key={idx} className="bg-emerald-50">
                        <span className="mr-1">{testObj.label}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-700"
                          onClick={() => openTestEditor(testObj, idx)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 ml-1"
                          onClick={() => removeTest(idx)}
                        >
                          ×
                        </button>
                      </Chip>
                    );
                  })}
                </div>
              )}

              {/* Inline test editor */}
              {editingTest && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <Select
                      name="test.type"
                      value={editingTest.type}
                      onChange={(e) => setEditingTest(s => ({ ...s, type: e.target.value }))}
                      options={[
                        { value: 'lab', label: 'Lab' },
                        { value: 'imaging', label: 'Imaging' }
                      ]}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      name="test.label"
                      placeholder="Test name"
                      value={editingTest.label}
                      onChange={(e) => setEditingTest(s => ({ ...s, label: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      name="test.note"
                      placeholder="Clinical question / note"
                      value={editingTest.note || ''}
                      onChange={(e) => setEditingTest(s => ({ ...s, note: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      name="test.dest"
                      placeholder="Destination clinic (optional)"
                      value={editingTest.destinationClinicId || ''}
                      onChange={(e) => setEditingTest(s => ({ ...s, destinationClinicId: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => { setEditingTest(null); setEditingTestIdx(null); }}
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

            {/* Referrals Section */}
            <div>
              <FieldLabel>Referrals <span className="text-slate-400">({formData?.plan?.referrals?.length || 0})</span></FieldLabel>
              
              {/* Referral presets */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {['Cardiology', 'Pulmonology', 'Endocrinology', 'Neurology', 'Other'].map(sp => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => openRefEditor({ specialty: sp })}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm"
                  >
                    {sp}
                  </button>
                ))}
              </div>

              {/* Saved referrals list */}
              {formData?.plan?.referrals?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(formData?.plan?.referrals || []).map((r, idx) => {
                    const refObj = convertStringToReferral(r);
                    return (
                      <Chip key={idx}>
                        <span className="mr-1">{refObj.doctorId ? `Dr ${refObj.doctorId}` : refObj.specialty}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-700"
                          onClick={() => openRefEditor(refObj, idx)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 ml-1"
                          onClick={() => removeRef(idx)}
                        >
                          ×
                        </button>
                      </Chip>
                    );
                  })}
                </div>
              )}

              {/* Inline referral editor */}
              {editingRef && (
                <div className="mt-3 grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
                  <div className="col-span-12">
                    <Input
                      placeholder="Specialty"
                      value={editingRef.specialty}
                      onChange={(e) => setEditingRef(s => ({ ...s, specialty: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder="Specific doctor (optional)"
                      value={editingRef.doctorId || ''}
                      onChange={(e) => setEditingRef(s => ({ ...s, doctorId: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder="Reason / note"
                      value={editingRef.reason || ''}
                      onChange={(e) => setEditingRef(s => ({ ...s, reason: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Select
                      name="urgency"
                      value={editingRef.urgency || 'routine'}
                      onChange={(e) => setEditingRef(s => ({ ...s, urgency: e.target.value }))}
                      options={[
                        { value: 'routine', label: 'Routine' },
                        { value: 'soon', label: 'Soon' },
                        { value: 'urgent', label: 'Urgent' }
                      ]}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder="Destination clinic (optional)"
                      value={editingRef.destinationClinicId || ''}
                      onChange={(e) => setEditingRef(s => ({ ...s, destinationClinicId: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                      onClick={() => { setEditingRef(null); setEditingRefIdx(null); }}
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

            {/* Medications Section */}
            <div>
              <FieldLabel>Medication Changes <span className="text-slate-400">({formData?.plan?.med_changes?.length || 0})</span></FieldLabel>
              
              {/* Add medication button */}
              <button
                type="button"
                onClick={() => openMedEditor()}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors mb-3"
              >
                Add Medication
              </button>

              {/* Saved medications list */}
              {formData?.plan?.med_changes?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(formData?.plan?.med_changes || []).map((med, idx) => {
                    const medObj = convertStringToMed(med);
                    return (
                      <Chip key={idx} className="bg-blue-50">
                        <span className="mr-1">
                          {typeof med === 'string' ? med : `${medObj.med} ${medObj.dose} ${medObj.route} ${medObj.freq}`}
                        </span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-700"
                          onClick={() => openMedEditor(medObj, idx)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 ml-1"
                          onClick={() => removeMed(idx)}
                        >
                          ×
                        </button>
                      </Chip>
                    );
                  })}
                </div>
              )}

              {/* Inline medication editor */}
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
                      onChange={(e) => setEditingMed(s => ({ ...s, dose: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder="Route"
                      value={editingMed.route}
                      onChange={(e) => setEditingMed(s => ({ ...s, route: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder="Frequency"
                      value={editingMed.freq}
                      onChange={(e) => setEditingMed(s => ({ ...s, freq: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder="Duration"
                      value={editingMed.duration}
                      onChange={(e) => setEditingMed(s => ({ ...s, duration: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingMed.sendToPharmacy || false}
                      onChange={(e) => setEditingMed(s => ({ ...s, sendToPharmacy: e.target.checked }))}
                      className="rounded w-4 h-4"
                    />
                    <label className="text-sm text-slate-600">Send to Pharmacy</label>
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder="Instructions (optional)"
                      value={editingMed.instructions || ''}
                      onChange={(e) => setEditingMed(s => ({ ...s, instructions: e.target.value }))}
                    />
                  </div>
                  {editingMed.sendToPharmacy && (
                    <div className="col-span-12">
                      <Input
                        placeholder="Pharmacy ID"
                        value={editingMed.pharmacyId || ''}
                        onChange={(e) => setEditingMed(s => ({ ...s, pharmacyId: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="col-span-12 flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                      onClick={() => { setEditingMed(null); setEditingMedIdx(null); }}
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
              <FieldLabel>Lifestyle/Education</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.plan?.lifestyle || []).map(item => (
                  <Chip key={item} onRemove={() => removeFromArray('plan.lifestyle', item)}>
                    {item}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['Hydration', 'Rest', 'Exercise', 'Diet', 'Smoking Cessation', 'Other'].map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => addToArray('plan.lifestyle', item)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors text-sm"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <FieldLabel>Follow-up</FieldLabel>
              <Select
                name="plan.follow_up"
                value={formData?.plan?.follow_up || ''}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={[
                  { value: '24h', label: '24 hours' },
                  { value: '3d', label: '3 days' },
                  { value: '1w', label: '1 week' },
                  { value: 'PRN', label: 'As needed (PRN)' }
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Visit Summary */}
        <Card title="Visit Summary">
          <TextArea
            name="summary"
            placeholder="Brief summary of the visit, red flags for patient, and next steps..."
            value={formData?.summary || ''}
            onChange={(e) => updateFormData('summary', e.target.value)}
            rows={4}
          />
        </Card>
      </div>

    </div>
  );
};

export default GeneralVisitReport;
