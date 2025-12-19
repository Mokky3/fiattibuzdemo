import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsAPI, icdCodesAPI, doctorPatientsAPI } from '../../../services/apiService';

// Helper function to clone objects
const clone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(item => clone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = clone(obj[key]);
      }
    }
    return cloned;
  }
};

// FormField component
const FormField = React.memo(({ label, name, type = 'text', placeholder = '', options = [], width = 'full', formData, onChange, required = false, darkMode = false, t }) => {
  const widthClass = {
    'full': 'w-full',
    'half': 'w-full sm:w-1/2',
    '1/3': 'w-full sm:w-1/3',
    '2/3': 'w-full sm:w-2/3',
    '1/4': 'w-full sm:w-1/4',
    '3/4': 'w-full sm:w-3/4',
  }[width];

  return (
    <div className={`${widthClass} px-2 mb-3`}>
      <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === 'select' ? (
        <select 
          name={name} 
          value={formData[name] || ''} 
          onChange={onChange}
          required={required}
          className={`w-full px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
        >
          <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t ? t('gynecologyForm.selectOption') : 'Select an option'}</option>
          {options.map((option, index) => (
            <option key={index} value={option} className={darkMode ? 'bg-slate-800' : ''}>{option}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={formData[name] || ''}
          onChange={onChange}
          placeholder={placeholder}
          rows="3"
          required={required}
          className={`w-full px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] resize-none`}
        ></textarea>
      ) : type === 'radio' ? (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {options.map((option, index) => (
            <label key={index} className="flex items-center">
              <input
                type="radio"
                name={name}
                value={option}
                checked={formData[name] === option}
                onChange={onChange}
                required={required}
                className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
              />
              <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{option}</span>
            </label>
          ))}
        </div>
      ) : type === 'checkbox' ? (
        <label className="flex items-center">
          <input
            type="checkbox"
            name={name}
            checked={formData[name] || false}
            onChange={onChange}
            className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
          />
          <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{placeholder}</span>
        </label>
      ) : (
        <input
          type={type}
          name={name}
          value={formData[name] || ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
        />
      )}
    </div>
  );
});

// FormSection component
const FormSection = React.memo(({ title, children, bgColor = 'bg-white', darkMode = false, collapsible = false, isOpen = true, onToggle }) => {
  const darkBgColor = darkMode ? 'bg-slate-800' : bgColor;
  return (
    <div className={`${darkBgColor} rounded-lg p-4 sm:p-6 mb-6 shadow-sm border ${darkMode ? 'border-slate-700' : 'border-gray-100'}`}>
      <h3 
        className={`text-lg sm:text-xl font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'} mb-4 sm:mb-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 ${collapsible ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center justify-between">
          <span>{title}</span>
          {collapsible && (
            <span className="text-sm text-slate-400">
              {isOpen ? '▼' : '▶'}
            </span>
          )}
        </div>
      </h3>
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children}
        </div>
      )}
    </div>
  );
});

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
          className={`w-full px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#5ACCC3] border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-md shadow-lg max-h-60 overflow-y-auto`}>
          {searchResults.map((result, index) => (
            <button
              key={result.id || result.code}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-3 py-2 hover:bg-[#5ACCC3]/10 focus:bg-[#5ACCC3]/10 focus:outline-none text-sm ${
                index === selectedIndex ? 'bg-[#5ACCC3]/10' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-[#5ACCC3] font-medium min-w-[80px]">
                  {result.code}
                </span>
                <span className={`text-xs flex-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
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
    const medText = medication.brand_name || medication.name || '';
    if (onSelect) {
      onSelect(medText);
    }
    if (onChange) {
      onChange({
        target: { value: medText }
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
          className={`w-full px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#5ACCC3] border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-md shadow-lg max-h-60 overflow-y-auto`}>
          {searchResults.map((result, index) => (
            <button
              key={result.id || index}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-3 py-2 hover:bg-[#5ACCC3]/10 focus:bg-[#5ACCC3]/10 focus:outline-none text-sm ${
                index === selectedIndex ? 'bg-[#5ACCC3]/10' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="font-medium text-xs text-[#5ACCC3] flex-1">
                  {result.brand_name || result.name || 'Unknown'}
                </span>
                {result.strength && (
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {result.strength} {result.strength_unit?.name || ''}
                  </span>
                )}
              </div>
              {result.mnn?.name && (
                <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  MNN: {result.mnn.name}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Medication List Component
const MedicationListField = ({ label, name, value, onChange, formData, darkMode = false }) => {
  const { t } = useTranslation();
  const [medications, setMedications] = useState(value ? value.split('\n').filter(m => m.trim()) : []);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (value) {
      const meds = value.split('\n').filter(m => m.trim());
      setMedications(meds);
    } else {
      setMedications([]);
    }
  }, [value]);

  const handleAddMedication = (medication) => {
    const newMeds = [...medications, medication];
    setMedications(newMeds);
    onChange({
      target: { name, value: newMeds.join('\n') }
    });
    setSearchValue('');
  };

  const handleRemoveMedication = (index) => {
    const newMeds = medications.filter((_, i) => i !== index);
    setMedications(newMeds);
    onChange({
      target: { name, value: newMeds.join('\n') }
    });
  };

  return (
    <div className="w-full px-2 mb-3">
      <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{label}</label>
      <div className="space-y-2">
        {medications.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {medications.map((med, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#5ACCC3]/10 text-[#5ACCC3] rounded text-xs"
              >
                {med}
                <button
                  type="button"
                  onClick={() => handleRemoveMedication(index)}
                  className="text-[#5ACCC3] hover:text-[#4BB5AC] ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <MedicationSearchInput
          placeholder={t('gynecologyForm.searchMedication')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSelect={handleAddMedication}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
};

// Chip component
const Chip = React.memo(({ children, onRemove, className = "", darkMode = false }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-2 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-[#5ACCC3]/10 text-[#5ACCC3]'} rounded-lg text-sm ${className}`}>
    <span>{children}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className={darkMode ? 'text-slate-400 hover:text-red-400' : 'text-[#5ACCC3] hover:text-[#4BB5AC]'}
      >
        ×
      </button>
    )}
  </div>
));

const GynecologyForm = ({ formData, setFormData, patient, onSave }) => {
  const { t } = useTranslation();
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return saved === 'true';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Sync dark mode with localStorage and document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', darkMode.toString());
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode]);

  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  
  // Patient medications and loading state
  const [patientMedications, setPatientMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  
  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState({
    vitals: true, // Closed by default
  });
  
  // Toggle section collapse
  const toggleSection = useCallback((section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Initialize form data with proper structure
  useEffect(() => {
    if (!formData.meta) {
      setFormData(prev => ({
        ...prev,
        doc_type: 'gynecology.initial',
        meta: {
          clinic_id: localStorage.getItem('clinic_id') || '',
          department_id: 'midwifery_gynecology',
          physician_id: localStorage.getItem('user_id') || '',
          patient_id: patient?.patient_id || patient?.id || '',
          encounter_id: '',
          datetime: new Date().toISOString()
        },
        diagnosis: prev.diagnosis || { code: '', term: '' },
        diagnosisCodes: prev.diagnosisCodes || [],
      }));
    }
  }, []);

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
          
          // Get the most recent vitals entry from the filtered list
          const latestVitals = recentVitals.length > 0 ? recentVitals[0] : null;
          
          if (latestVitals) {
            // Map backend vitals structure to gynecology form structure
            setFormData(prev => ({
              ...prev,
              bloodPressure: latestVitals.systolic_bp && latestVitals.diastolic_bp 
                ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` 
                : prev.bloodPressure || '',
              temperature: latestVitals.temperature?.toString() || prev.temperature || '',
              pulseRate: latestVitals.heart_rate?.toString() || prev.pulseRate || '',
              respiratoryRate: latestVitals.respiratory_rate?.toString() || prev.respiratoryRate || '',
              spo2: latestVitals.oxygen_saturation?.toString() || prev.spo2 || '',
              weight: latestVitals.weight?.toString() || patient?.weight?.toString() || prev.weight || '',
              height: latestVitals.height?.toString() || patient?.height?.toString() || prev.height || '',
              bmi: latestVitals.bmi?.toString() || prev.bmi || '',
            }));
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

  // Auto-populate medical history (patient info is retrieved from backend and shown in saved report)
  useEffect(() => {
    if (patient && setFormData) {
      setFormData(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          patient_id: patient.patient_id || patient.id || prev.meta?.patient_id || '',
        }
      }));
    }
  }, [patient, setFormData]);

  // Calculate BMI
  useEffect(() => {
    if (formData.weight && formData.height) {
      const weight = parseFloat(formData.weight);
      const height = parseFloat(formData.height) / 100;
      if (weight > 0 && height > 0) {
        const bmi = (weight / (height * height)).toFixed(1);
        if (formData.bmi !== bmi) {
          setFormData(prev => ({ ...prev, bmi }));
        }
      }
    }
  }, [formData.weight, formData.height]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, [setFormData]);

  // Initialize form data
  useEffect(() => {
    if (formData && !formData.diagnosis) {
      setFormData(prev => ({
        ...prev,
        diagnosis: prev.diagnosis || { code: '', term: '' },
        diagnosisCodes: prev.diagnosisCodes || [],
        // Context and patient info fields removed - retrieved from backend
        visitType: prev.visitType || 'New consultation',
        documentationDateTime: prev.documentationDateTime || new Date().toISOString().slice(0, 16),
      }));
    }
  }, []);

  const addToArray = useCallback((fieldName, value) => {
    setFormData(prev => {
      const current = prev[fieldName] || [];
      return { ...prev, [fieldName]: [...current, value] };
    });
  }, [setFormData]);

  const removeFromArray = useCallback((fieldName, index) => {
    setFormData(prev => {
      const current = prev[fieldName] || [];
      return { ...prev, [fieldName]: current.filter((_, i) => i !== index) };
    });
  }, [setFormData]);

  // Validation
  const validateForm = useCallback(() => {
    if (!formData.presentingComplaint || !formData.presentingComplaint.trim()) {
      alert('Please enter the presenting complaint.');
      return false;
    }
    if (!formData.diagnosis || !formData.diagnosis.code || !formData.diagnosis.term) {
      alert('Please select a main diagnosis.');
      return false;
    }
    return true;
  }, [formData]);

  // Build payload - comprehensive structure for all gynecology fields
  const buildPayload = useCallback(() => {
    return {
      doc_type: 'gynecology.initial',
      meta: formData.meta || {
        clinic_id: localStorage.getItem('clinic_id') || '',
        department_id: 'midwifery_gynecology',
        physician_id: localStorage.getItem('user_id') || '',
        patient_id: patient?.patient_id || patient?.id || '',
        encounter_id: '',
        datetime: new Date().toISOString()
      },
      chief_complaint: formData.presentingComplaint,
      visit_type: formData.visitType,
      // Presenting Complaint & HPI
      presenting_complaint_hpi: {
        presenting_complaint: formData.presentingComplaint,
        duration_of_symptoms: formData.durationOfSymptoms,
        history_of_present_illness: formData.historyOfPresentIllness,
      },
      // Menstrual & Reproductive History
      menstrual_reproductive_history: {
        menarche_age: formData.menarcheAge,
        cycle_pattern: formData.cyclePattern,
        last_menstrual_period: formData.lastMenstrualPeriod,
        cycle_length: formData.cycleLength,
        duration_of_bleeding: formData.durationOfBleeding,
        flow_amount: formData.flowAmount,
        dysmenorrhea: formData.dysmenorrhea,
        dysmenorrhea_severity_score: formData.dysmenorrheaSeverityScore,
        intermenstrual_bleeding: formData.intermenstrualBleeding,
        intermenstrual_bleeding_description: formData.intermenstrualBleedingDescription,
        postcoital_bleeding: formData.postcoitalBleeding,
        postcoital_bleeding_description: formData.postcoitalBleedingDescription,
        premenstrual_symptoms: formData.premenstrualSymptoms,
        contraception_use: formData.contraceptionUse,
        contraception_details: formData.contraceptionDetails,
        menopausal_status: formData.menopausalStatus,
        age_at_menopause: formData.ageAtMenopause,
        last_menstrual_period_menopause: formData.lastMenstrualPeriodMenopause,
        postmenopausal_bleeding: formData.postmenopausalBleeding,
        postmenopausal_bleeding_description: formData.postmenopausalBleedingDescription,
      },
      // Obstetric History
      obstetric_history: {
        gravida: formData.gravida,
        para: formData.para,
        abortions_miscarriages: formData.abortionsMiscarriages,
        living_children: formData.livingChildren,
        previous_obstetric_complications: formData.previousObstetricComplications,
      },
      // Gynecological History
      gynecological_history: {
        sexual_activity: formData.sexualActivity,
        dyspareunia: formData.dyspareunia,
        dyspareunia_description: formData.dyspareuniaDescription,
        vaginal_discharge_history: formData.vaginalDischargeHistory,
        past_gynecologic_diagnoses: formData.pastGynecologicDiagnoses,
        infertility_history: formData.infertilityHistory,
        previous_gynecological_procedures: formData.previousGynecologicalProcedures,
        history_of_stis_pid: formData.historyOfSTIsPID,
        stis_pid_type_treatment: formData.stisPidTypeTreatment,
        urinary_symptoms: formData.urinarySymptoms,
        pelvic_organ_prolapse_symptoms: formData.pelvicOrganProlapseSymptoms,
      },
      // Medical, Surgical, Allergy & Family History
      medical_surgical_history: {
        medical_conditions: formData.medicalConditions,
        previous_surgeries: formData.previousSurgeries,
        allergies: formData.allergies,
        current_medications: formData.currentMedications || [],
        family_history: formData.familyHistory,
      },
      // Screening & Preventive Care
      screening_preventive_care: {
        pap_smear_ever_done: formData.papSmearEverDone,
        date_of_last_pap_smear: formData.dateOfLastPapSmear,
        result_of_last_pap_smear: formData.resultOfLastPapSmear,
        hpv_testing: formData.hpvTesting,
        hpv_type: formData.hpvType,
        hpv_vaccination_status: formData.hpvVaccinationStatus,
        breast_self_exam_practice: formData.breastSelfExamPractice,
        clinical_breast_exam_date: formData.clinicalBreastExamDate,
        mammography: formData.mammography,
        other_screening: formData.otherScreening,
      },
      // Review of Systems
      review_of_systems: {
        systemic_symptoms: formData.systemicSymptoms,
        gastrointestinal_symptoms: formData.gastrointestinalSymptoms,
        endocrine_metabolic: formData.endocrineMetabolic,
        psychological_emotional: formData.psychologicalEmotional,
      },
      // Physical Examination
      physical_examination: {
        vitals: {
          blood_pressure: formData.bloodPressure,
          pulse_rate: formData.pulseRate,
          respiratory_rate: formData.respiratoryRate,
          temperature: formData.temperature,
          spo2: formData.spo2,
          weight: formData.weight,
          height: formData.height,
          bmi: formData.bmi,
        },
        general_examination: {
          general_appearance: formData.generalAppearance,
          pallor_anemia_signs: formData.pallorAnemiaSigns,
          other_systemic_findings: formData.otherSystemicFindings,
        },
        breast_examination: {
          inspection_findings: formData.breastInspectionFindings,
          palpation_findings: formData.breastPalpationFindings,
        },
        abdominal_examination: {
          inspection: formData.abdominalInspection,
          palpation: formData.abdominalPalpation,
          percussion_auscultation: formData.abdominalPercussionAuscultation,
        },
        pelvic_examination: {
          external_genitalia_findings: formData.externalGenitaliaFindings,
          vaginal_mucosa: formData.vaginalMucosa,
          vaginal_discharge_description: formData.vaginalDischargeDescription,
          cervix_appearance: formData.cervixAppearance,
          contact_bleeding_on_touch: formData.contactBleedingOnTouch,
          prolapse_assessment: formData.prolapseAssessment,
          cervical_motion_tenderness: formData.cervicalMotionTenderness,
          uterus_size: formData.uterusSize,
          uterus_position: formData.uterusPosition,
          uterus_consistency_mobility: formData.uterusConsistencyMobility,
          adnexal_findings: formData.adnexalFindings,
          pouch_of_douglas: formData.pouchOfDouglas,
          rectal_rectovaginal_findings: formData.rectalRectovaginalFindings,
        },
      },
      // Investigations
      investigations: {
        pregnancy_test: formData.pregnancyTest,
        laboratory_tests: formData.laboratoryTests,
        imaging: formData.imaging,
        cervical_screening_colposcopy: formData.cervicalScreeningColposcopy,
        other_tests: formData.otherTests,
      },
      // Diagnosis
      diagnosis: formData.diagnosis,
      diagnosis_codes: formData.diagnosisCodes || [],
      // Management Plan
      management_plan: {
        problem_list: formData.problemList,
        medications_prescribed: formData.medicationsPrescribed || [],
        procedures_performed_today: formData.proceduresPerformedToday,
        procedures_planned_referrals: formData.proceduresPlannedReferrals,
        non_pharmacologic_management: formData.nonPharmacologicManagement,
        follow_up_plan: formData.followUpPlan,
        follow_up_date: formData.followUpDate,
      },
      // Counselling & Sign-off
      counselling_signoff: {
        counselling_provided: formData.counsellingProvided,
        safety_warning_signs_explained: formData.safetyWarningSignsExplained,
        patient_questions_concerns: formData.patientQuestionsConcerns,
        provider_notes: formData.providerNotes,
        provider_name_signature: formData.providerNameSignature,
        documentation_date_time: formData.documentationDateTime,
      },
    };
  }, [formData, patient]);

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

  return (
    <div className={darkMode ? 'bg-slate-900' : 'bg-gray-50'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Form Content */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-4 sm:p-8`}>
          {/* 1. Presenting Complaint & History of Present Illness */}
          <FormSection title={t('gynecologyForm.presentingComplaintHistory')} bgColor="bg-green-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.presentingComplaint')} name="presentingComplaint" placeholder={t('gynecologyForm.presentingComplaintPlaceholder')} width="full" formData={formData} onChange={handleChange} required darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.durationOfSymptoms')} name="durationOfSymptoms" placeholder={t('gynecologyForm.durationOfSymptomsPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.historyOfPresentIllness')} name="historyOfPresentIllness" type="textarea" placeholder={t('gynecologyForm.historyOfPresentIllnessPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 3. Menstrual & Reproductive History */}
          <FormSection title={t('gynecologyForm.menstrualReproductiveHistory')} bgColor="bg-yellow-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.menarcheAge')} name="menarcheAge" type="number" placeholder={t('gynecologyForm.menarcheAgePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.cyclePattern')} name="cyclePattern" type="select" options={[t('gynecologyForm.regular'), t('gynecologyForm.irregular'), t('gynecologyForm.amenorrhea'), t('gynecologyForm.oligomenorrhea'), t('gynecologyForm.polymenorrhea')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.lastMenstrualPeriod')} name="lmp" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.cycleLength')} name="cycleLength" placeholder={t('gynecologyForm.cycleLengthPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.durationOfBleeding')} name="durationOfBleeding" placeholder={t('gynecologyForm.durationOfBleedingPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.flowAmount')} name="flowAmount" type="select" options={[t('gynecologyForm.light'), t('gynecologyForm.normal'), t('gynecologyForm.heavy'), t('gynecologyForm.veryHeavy')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.dysmenorrhea')} name="dysmenorrhea" type="select" options={[t('gynecologyForm.none'), t('gynecologyForm.mild'), t('gynecologyForm.moderate'), t('gynecologyForm.severe')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.dysmenorrheaSeverityScore')} name="dysmenorrheaSeverityScore" type="number" placeholder={t('gynecologyForm.dysmenorrheaSeverityScorePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.intermenstrualBleeding')} name="intermenstrualBleeding" type="select" options={[t('gynecologyForm.no'), t('gynecologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.intermenstrualBleeding === t('gynecologyForm.yes') && (
              <FormField label={t('gynecologyForm.intermenstrualBleedingDescription')} name="intermenstrualBleedingDescription" type="textarea" placeholder={t('gynecologyForm.intermenstrualBleedingDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('gynecologyForm.postcoitalBleeding')} name="postcoitalBleeding" type="select" options={[t('gynecologyForm.no'), t('gynecologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.postcoitalBleeding === t('gynecologyForm.yes') && (
              <FormField label={t('gynecologyForm.postcoitalBleedingDescription')} name="postcoitalBleedingDescription" type="textarea" placeholder={t('gynecologyForm.postcoitalBleedingDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('gynecologyForm.premenstrualSymptoms')} name="premenstrualSymptoms" type="textarea" placeholder={t('gynecologyForm.premenstrualSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.contraceptionUse')} name="contraceptionUse" type="select" options={[t('gynecologyForm.none'), t('gynecologyForm.condoms'), t('gynecologyForm.combinedOcp'), t('gynecologyForm.progestinOnlyPill'), t('gynecologyForm.iud'), t('gynecologyForm.implant'), t('gynecologyForm.injection'), t('gynecologyForm.sterilization'), t('gynecologyForm.other')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.contraceptionUse && formData.contraceptionUse !== t('gynecologyForm.none') && (
              <FormField label={t('gynecologyForm.contraceptionDetails')} name="contraceptionDetails" type="textarea" placeholder={t('gynecologyForm.contraceptionDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.menopauseIfApplicable')}</h4>
            </div>
            <FormField label={t('gynecologyForm.menopausalStatus')} name="menopausalStatus" type="select" options={[t('gynecologyForm.premenopausal'), t('gynecologyForm.perimenopausal'), t('gynecologyForm.postmenopausal')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.menopausalStatus === t('gynecologyForm.postmenopausal') && (
              <>
                <FormField label={t('gynecologyForm.ageAtMenopause')} name="ageAtMenopause" type="number" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.lastMenstrualPeriodIfKnown')} name="lastMenstrualPeriod" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              </>
            )}
            <FormField label={t('gynecologyForm.postmenopausalBleeding')} name="postmenopausalBleeding" type="select" options={[t('gynecologyForm.no'), t('gynecologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.postmenopausalBleeding === t('gynecologyForm.yes') && (
              <FormField label={t('gynecologyForm.postmenopausalBleedingDescription')} name="postmenopausalBleedingDescription" type="textarea" placeholder={t('gynecologyForm.postmenopausalBleedingDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
          </FormSection>

          {/* 4. Obstetric History (Summary) */}
          <FormSection title={t('gynecologyForm.obstetricHistorySummary')} bgColor="bg-purple-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.gravida')} name="gravida" type="number" placeholder={t('gynecologyForm.gravidaPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.para')} name="para" type="number" placeholder={t('gynecologyForm.paraPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.abortionsMiscarriages')} name="abortions" type="number" placeholder={t('gynecologyForm.abortionsMiscarriagesPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.livingChildren')} name="livingChildren" type="number" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.previousObstetricComplications')} name="previousObstetricComplications" type="textarea" placeholder={t('gynecologyForm.previousObstetricComplicationsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 5. Gynecological History */}
          <FormSection title={t('gynecologyForm.gynecologicalHistory')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.sexualActivity')} name="sexualActivity" type="select" options={[t('gynecologyForm.currentlySexuallyActive'), t('gynecologyForm.notCurrentlySexuallyActive'), t('gynecologyForm.neverSexuallyActive')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.dyspareunia')} name="dyspareunia" type="select" options={[t('gynecologyForm.no'), t('gynecologyForm.superficial'), t('gynecologyForm.deep'), t('gynecologyForm.both')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.dyspareunia && formData.dyspareunia !== t('gynecologyForm.no') && (
              <FormField label={t('gynecologyForm.dyspareuniaDescription')} name="dyspareuniaDescription" type="textarea" placeholder={t('gynecologyForm.dyspareuniaDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('gynecologyForm.vaginalDischargeHistory')} name="vaginalDischargeHistory" type="textarea" placeholder={t('gynecologyForm.vaginalDischargeHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.pastGynecologicDiagnoses')} name="pastGynecologicDiagnoses" type="textarea" placeholder={t('gynecologyForm.pastGynecologicDiagnosesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.infertilityHistory')} name="infertilityHistory" type="textarea" placeholder={t('gynecologyForm.infertilityHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.previousGynecologicalProcedures')} name="previousGynecologicalProcedures" type="textarea" placeholder={t('gynecologyForm.previousGynecologicalProceduresPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.historyOfStisPid')} name="historyOfStisPid" type="select" options={[t('gynecologyForm.no'), t('gynecologyForm.yes'), t('gynecologyForm.unknown')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.historyOfStisPid === t('gynecologyForm.yes') && (
              <FormField label={t('gynecologyForm.stisPidDetails')} name="stisPidDetails" type="textarea" placeholder={t('gynecologyForm.stisPidDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('gynecologyForm.urinarySymptoms')} name="urinarySymptoms" type="textarea" placeholder={t('gynecologyForm.urinarySymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.pelvicOrganProlapseSymptoms')} name="pelvicOrganProlapseSymptoms" type="textarea" placeholder={t('gynecologyForm.pelvicOrganProlapseSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 6. Medical, Surgical, Allergy & Family History */}
          <FormSection title={t('gynecologyForm.generalMedicalHistory')} bgColor="bg-red-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.medicalConditions')} name="medicalConditions" type="textarea" placeholder={t('gynecologyForm.medicalConditionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.previousSurgeries')} name="previousSurgeries" type="textarea" placeholder={t('gynecologyForm.previousSurgeriesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.allergies')} name="allergies" type="textarea" placeholder={t('gynecologyForm.allergiesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="col-span-full">
              <MedicationListField label={t('gynecologyForm.currentMedications')} name="currentMedications" value={formData.currentMedications || ''} onChange={handleChange} formData={formData} darkMode={darkMode} />
              {patientMedications.length > 0 && (
                <div className={`mt-2 p-3 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{t('gynecologyForm.fromPatientRecord') || 'From Patient Record'}</div>
                  <div className="space-y-1">
                    {patientMedications.map((med, idx) => (
                      <div key={idx} className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
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
                      setFormData(prev => ({
                        ...prev,
                        currentMedications: medsText
                      }));
                    }}
                    className={`mt-2 text-xs underline ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    {t('gynecologyForm.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
            </div>
            <FormField label={t('gynecologyForm.familyHistory')} name="familyHistory" type="textarea" placeholder={t('gynecologyForm.familyHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 7. Screening & Preventive Care */}
          <FormSection title={t('gynecologyForm.screeningPreventiveCare')} bgColor="bg-teal-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.papSmearEverDone')} name="papSmearEverDone" type="select" options={[t('gynecologyForm.no'), t('gynecologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.papSmearEverDone === t('gynecologyForm.yes') && (
              <>
                <FormField label={t('gynecologyForm.dateOfLastPapSmear')} name="dateOfLastPapSmear" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.resultOfLastPapSmear')} name="resultOfLastPapSmear" type="select" options={[t('gynecologyForm.normal'), t('gynecologyForm.ascUs'), t('gynecologyForm.lsil'), t('gynecologyForm.hsil'), t('gynecologyForm.agc'), t('gynecologyForm.otherAbnormal'), t('gynecologyForm.unknown')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              </>
            )}
            <FormField label={t('gynecologyForm.hpvTesting')} name="hpvTesting" type="select" options={[t('gynecologyForm.notDone'), t('gynecologyForm.negative'), t('gynecologyForm.positiveHighRisk'), t('gynecologyForm.positiveLowRisk'), t('gynecologyForm.unknown')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {(formData.hpvTesting === t('gynecologyForm.positiveHighRisk') || formData.hpvTesting === t('gynecologyForm.positiveLowRisk')) && (
              <FormField label={t('gynecologyForm.hpvType')} name="hpvType" type="textarea" placeholder={t('gynecologyForm.hpvTypePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('gynecologyForm.hpvVaccinationStatus')} name="hpvVaccinationStatus" type="select" options={[t('gynecologyForm.notVaccinated'), t('gynecologyForm.partiallyVaccinated'), t('gynecologyForm.fullyVaccinated'), t('gynecologyForm.unknown')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.breastScreening')}</h4>
            </div>
            <FormField label={t('gynecologyForm.breastSelfExamPractice')} name="breastSelfExamPractice" type="select" options={[t('gynecologyForm.yes'), t('gynecologyForm.no'), t('gynecologyForm.occasionally')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.clinicalBreastExamDate')} name="clinicalBreastExamDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.mammography')} name="mammography" type="textarea" placeholder={t('gynecologyForm.mammographyPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.otherScreening')} name="otherScreening" type="textarea" placeholder={t('gynecologyForm.otherScreeningPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 8. Review of Systems (Focused) */}
          <FormSection title={t('gynecologyForm.reviewOfSystems')} bgColor="bg-pink-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.systemicSymptoms')} name="systemicSymptoms" type="textarea" placeholder={t('gynecologyForm.systemicSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.gastrointestinalSymptoms')} name="gastrointestinalSymptoms" type="textarea" placeholder={t('gynecologyForm.gastrointestinalSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.endocrineMetabolic')} name="endocrineMetabolic" type="textarea" placeholder={t('gynecologyForm.endocrineMetabolicPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.psychologicalEmotional')} name="psychologicalEmotional" type="textarea" placeholder={t('gynecologyForm.psychologicalEmotionalPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 9. Physical Examination */}
          <FormSection title={t('gynecologyForm.physicalExamination')} bgColor="bg-orange-50" darkMode={darkMode}>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 
                className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'} cursor-pointer hover:opacity-80 flex items-center justify-between`}
                onClick={() => toggleSection('vitals')}
              >
                <span>{t('gynecologyForm.vitalSigns')}</span>
                <span className="text-sm text-slate-400">
                  {!collapsedSections.vitals ? '▼' : '▶'}
                </span>
              </h4>
            </div>
            {!collapsedSections.vitals && (
              <>
                <FormField label={t('gynecologyForm.bloodPressure')} name="bloodPressure" placeholder={t('gynecologyForm.bloodPressurePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.pulseRate')} name="pulseRate" type="number" placeholder={t('gynecologyForm.pulseRatePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.respiratoryRate')} name="respiratoryRate" type="number" placeholder={t('gynecologyForm.respiratoryRatePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.temperature')} name="temperature" type="number" placeholder={t('gynecologyForm.temperaturePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.spo2')} name="spo2" type="number" placeholder={t('gynecologyForm.spo2Placeholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.weight')} name="weight" type="number" placeholder={t('gynecologyForm.weightPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.height')} name="height" type="number" placeholder={t('gynecologyForm.heightPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('gynecologyForm.bmi')} name="bmi" type="number" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              </>
            )}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.generalExamination')}</h4>
            </div>
            <FormField label={t('gynecologyForm.generalAppearance')} name="generalAppearance" type="textarea" placeholder={t('gynecologyForm.generalAppearancePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.pallorAnemiaSigns')} name="pallorAnemiaSigns" type="select" options={[t('gynecologyForm.none'), t('gynecologyForm.mild'), t('gynecologyForm.moderate'), t('gynecologyForm.severe')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.otherSystemicFindings')} name="otherSystemicFindings" type="textarea" placeholder={t('gynecologyForm.otherSystemicFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.breastExamination')}</h4>
            </div>
            <FormField label={t('gynecologyForm.inspectionFindings')} name="breastInspectionFindings" type="textarea" placeholder={t('gynecologyForm.inspectionFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.palpationFindings')} name="breastPalpationFindings" type="textarea" placeholder={t('gynecologyForm.palpationFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.abdominalExamination')}</h4>
            </div>
            <FormField label={t('gynecologyForm.inspection')} name="abdominalInspection" type="textarea" placeholder={t('gynecologyForm.abdominalInspectionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.palpation')} name="abdominalPalpation" type="textarea" placeholder={t('gynecologyForm.abdominalPalpationPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.percussionAuscultation')} name="abdominalPercussionAuscultation" type="textarea" placeholder={t('gynecologyForm.percussionAuscultationPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 10. Pelvic Examination */}
          <FormSection title={t('gynecologyForm.pelvicExamination')} bgColor="bg-purple-50" darkMode={darkMode}>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.externalGenitalia')}</h4>
            </div>
            <FormField label={t('gynecologyForm.externalGenitaliaFindings')} name="externalGenitaliaFindings" type="textarea" placeholder={t('gynecologyForm.externalGenitaliaFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.speculumExamination')}</h4>
            </div>
            <FormField label={t('gynecologyForm.vaginalMucosa')} name="vaginalMucosa" type="textarea" placeholder={t('gynecologyForm.vaginalMucosaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.vaginalDischargeDescription')} name="vaginalDischargeDescription" type="textarea" placeholder={t('gynecologyForm.vaginalDischargeDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.cervixAppearance')} name="cervixAppearance" type="textarea" placeholder={t('gynecologyForm.cervixAppearancePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.contactBleedingOnTouch')} name="contactBleedingOnTouch" type="select" options={[t('gynecologyForm.no'), t('gynecologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.prolapseAssessment')} name="prolapseAssessment" type="textarea" placeholder={t('gynecologyForm.prolapseAssessmentPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.bimanualExamination')}</h4>
            </div>
            <FormField label={t('gynecologyForm.cervicalMotionTenderness')} name="cervicalMotionTenderness" type="select" options={[t('gynecologyForm.absent'), t('gynecologyForm.present'), t('gynecologyForm.notAssessed')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.uterusSize')} name="uterusSize" placeholder={t('gynecologyForm.uterusSizePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.uterusPosition')} name="uterusPosition" type="select" options={[t('gynecologyForm.anteverted'), t('gynecologyForm.retroverted'), t('gynecologyForm.midposition'), t('gynecologyForm.uncertain')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.uterusConsistencyMobility')} name="uterusConsistencyMobility" type="textarea" placeholder={t('gynecologyForm.uterusConsistencyMobilityPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.adnexalFindings')} name="adnexalFindings" type="textarea" placeholder={t('gynecologyForm.adnexalFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.pouchOfDouglas')} name="pouchOfDouglas" type="textarea" placeholder={t('gynecologyForm.pouchOfDouglasPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('gynecologyForm.rectalRectovaginalExam')}</h4>
            </div>
            <FormField label={t('gynecologyForm.rectalRectovaginalFindings')} name="rectalRectovaginalFindings" type="textarea" placeholder={t('gynecologyForm.rectalRectovaginalFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 11. Investigations */}
          <FormSection title={t('gynecologyForm.investigations')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.pregnancyTest')} name="pregnancyTest" type="select" options={[t('gynecologyForm.notDone'), t('gynecologyForm.negative'), t('gynecologyForm.positive'), t('gynecologyForm.pending')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.laboratoryTests')} name="laboratoryTests" type="textarea" placeholder={t('gynecologyForm.laboratoryTestsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.imaging')} name="imaging" type="textarea" placeholder={t('gynecologyForm.imagingPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.cervicalScreeningColposcopy')} name="cervicalScreeningColposcopy" type="textarea" placeholder={t('gynecologyForm.cervicalScreeningColposcopyPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.otherTests')} name="otherTests" type="textarea" placeholder={t('gynecologyForm.otherTestsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 12. Diagnosis (ICD-11) */}
          <FormSection title={t('gynecologyForm.diagnosis')} bgColor="bg-pink-50" darkMode={darkMode}>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('gynecologyForm.mainDiagnosis')} <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {formData.diagnosis && typeof formData.diagnosis === 'object' && (formData.diagnosis.code || formData.diagnosis.term) ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <input
                        type="text"
                        placeholder={t('gynecologyForm.icd11Code')}
                        value={formData.diagnosis.code || ''}
                        onChange={(e) => {
                          const current = typeof formData.diagnosis === 'object' ? formData.diagnosis : { code: '', term: '' };
                          handleChange({
                            target: { name: 'diagnosis', value: { ...current, code: e.target.value } }
                          });
                        }}
                        className={`w-32 px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
                      />
                      <input
                        type="text"
                        placeholder={t('gynecologyForm.diagnosisTerm')}
                        value={formData.diagnosis.term || ''}
                        onChange={(e) => {
                          const current = typeof formData.diagnosis === 'object' ? formData.diagnosis : { code: '', term: '' };
                          handleChange({
                            target: { name: 'diagnosis', value: { ...current, term: e.target.value } }
                          });
                        }}
                        className={`flex-1 px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: 'diagnosis', value: { code: '', term: '' } } })}
                      className={`px-3 py-2 ${darkMode ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'} rounded text-xs transition-colors`}
                    >
                      {t('gynecologyForm.clear')}
                    </button>
                  </div>
                ) : null}
                <IcdCodeSearchInput
                  placeholder={t('gynecologyForm.searchIcd11Code')}
                  onSelect={(selected) => {
                    handleChange({
                      target: { name: 'diagnosis', value: selected }
                    });
                  }}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('gynecologyForm.additionalDiagnosisCodes')}</label>
              <div className="space-y-2">
                {formData.diagnosisCodes && formData.diagnosisCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.diagnosisCodes.map((code, index) => (
                      <Chip
                        key={index}
                        onRemove={() => removeFromArray('diagnosisCodes', index)}
                        darkMode={darkMode}
                      >
                        {typeof code === 'object' ? `${code.code}: ${code.term}` : code}
                      </Chip>
                    ))}
                  </div>
                )}
                <IcdCodeSearchInput
                  placeholder={t('gynecologyForm.searchIcd11CodeToAdd')}
                  onSelect={(selected) => {
                    const currentCodes = Array.isArray(formData.diagnosisCodes) ? formData.diagnosisCodes : [];
                    handleChange({
                      target: { name: 'diagnosisCodes', value: [...currentCodes, selected] }
                    });
                  }}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </FormSection>

          {/* 13. Management Plan & Procedures */}
          <FormSection title={t('gynecologyForm.managementPlanProcedures')} bgColor="bg-orange-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.problemList')} name="problemList" type="textarea" placeholder={t('gynecologyForm.problemListPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <MedicationListField label={t('gynecologyForm.medicationsPrescribed')} name="medicationsPrescribed" value={formData.medicationsPrescribed || ''} onChange={handleChange} formData={formData} darkMode={darkMode} />
            <FormField label={t('gynecologyForm.proceduresPerformedToday')} name="proceduresPerformedToday" type="textarea" placeholder={t('gynecologyForm.proceduresPerformedTodayPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.proceduresPlannedReferrals')} name="proceduresPlannedReferrals" type="textarea" placeholder={t('gynecologyForm.proceduresPlannedReferralsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.nonPharmacologicManagement')} name="nonPharmacologicManagement" type="textarea" placeholder={t('gynecologyForm.nonPharmacologicManagementPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.followUpPlan')} name="followUpPlan" type="textarea" placeholder={t('gynecologyForm.followUpPlanPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.followUpDate')} name="followUpDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 14. Counselling, Patient Education & Sign-off */}
          <FormSection title={t('gynecologyForm.counsellingPatientEducation')} bgColor="bg-gray-50" darkMode={darkMode}>
            <FormField label={t('gynecologyForm.counsellingProvided')} name="counsellingProvided" type="textarea" placeholder={t('gynecologyForm.counsellingProvidedPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.safetyWarningSigns')} name="safetyWarningSigns" type="textarea" placeholder={t('gynecologyForm.safetyWarningSignsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.patientQuestionsConcerns')} name="patientQuestionsConcerns" type="textarea" placeholder={t('gynecologyForm.patientQuestionsConcernsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.providerNotes')} name="providerNotes" type="textarea" placeholder={t('gynecologyForm.providerNotesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.providerSignature')} name="providerSignature" placeholder={t('gynecologyForm.providerSignaturePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('gynecologyForm.documentationDateTime')} name="documentationDateTime" type="datetime-local" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

        </div>
      </div>
      
      {/* Sticky Footer */}
      <div className={`sticky bottom-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-t p-4 shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastSaved && `${t('gynecologyForm.lastSaved') || 'Last saved'}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('gynecologyForm.saveDraft')}
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
              {t('gynecologyForm.submitForm')}
            </button>
          </div>
        </div>
      </div>
      
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {t('gynecologyForm.draftSavedSuccessfully')}
        </div>
      )}
    </div>
  );
};

export default GynecologyForm;

