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

// FormField component moved outside to prevent recreation
const FormField = React.memo(({ label, name, type = 'text', placeholder = '', options = [], width = 'full', formData, onChange, required = false, darkMode = false, t }) => {
  const widthClass = {
    'full': 'w-full',
    'half': 'w-full sm:w-1/2',
    '1/3': 'w-full sm:w-1/3',
    '2/3': 'w-full sm:w-2/3',
    '1/4': 'w-full sm:w-1/4',
    '3/4': 'w-full sm:w-3/4',
  }[width];

  const handleFocus = useCallback(() => {
    console.log(`Focus in: ${name}`);
  }, [name]);

  const handleBlur = useCallback(() => {
    console.log(`Focus out: ${name}`);
  }, [name]);

  return (
    <div className={`${widthClass} px-2 mb-3`}>
      <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === 'select' ? (
        <select 
          key={name}
          name={name} 
          value={formData[name] || ''} 
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
          className={`w-full px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
        >
          <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t ? t('midwiferyForm.selectOption') : 'Select an option'}</option>
          {options.map((option, index) => (
            <option key={index} value={option} className={darkMode ? 'bg-slate-800' : ''}>{option}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          key={name}
          name={name}
          value={formData[name] || ''}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
                onFocus={handleFocus}
                onBlur={handleBlur}
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
            key={name}
            type="checkbox"
            name={name}
            checked={formData[name] || false}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
          />
          <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{placeholder}</span>
        </label>
      ) : (
        <input
          key={name}
          type={type}
          name={name}
          value={formData[name] || ''}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]`}
        />
      )}
    </div>
  );
});

// FormSection component moved outside
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

// Medication List Component with Search
const MedicationListField = ({ label, name, value, onChange, formData, darkMode = false, t }) => {
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
          placeholder={t('midwiferyForm.searchMedication')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSelect={handleAddMedication}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
};

// Chip component for multi-select items
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

const MidwiferyForm = ({ formData, setFormData, patient, onSave }) => {
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

  // Patient medications and loading state
  const [patientMedications, setPatientMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  
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
        doc_type: 'midwifery.initial',
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
            // Map backend vitals structure to midwifery form structure
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

  // Auto-populate medical history when patient data is available
  useEffect(() => {
    if (patient && setFormData) {
      setFormData(prev => ({
        ...prev,
        // Medical History (patient info is retrieved from backend and shown in saved report)
        bloodGroup: patient.bloodGroup || patient.blood_group || '',
        allergies: patient.allergies || '',
        familyHistory: patient.familyHistory || patient.family_history || '',
        meta: {
          ...prev.meta,
          patient_id: patient.patient_id || patient.id || prev.meta?.patient_id || '',
        }
      }));
    }
  }, [patient, setFormData]);

  // Calculate BMI when weight or height changes
  useEffect(() => {
    if (formData.weight && formData.height) {
      const weight = parseFloat(formData.weight);
      const height = parseFloat(formData.height) / 100; // Convert cm to meters
      if (weight > 0 && height > 0) {
        const bmi = (weight / (height * height)).toFixed(1);
        if (formData.bmi !== bmi) {
          setFormData(prev => ({ ...prev, bmi }));
        }
      }
    }
  }, [formData.weight, formData.height]);

  // Calculate gestational age from LMP
  useEffect(() => {
    if (formData.lastMenstrualPeriod) {
      const lmp = new Date(formData.lastMenstrualPeriod);
      const today = new Date();
      const diffTime = today - lmp;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(diffDays / 7);
      const days = diffDays % 7;
      const gestationalAge = `${weeks}+${days}`;
      if (formData.gestationalAge !== gestationalAge) {
        setFormData(prev => ({ ...prev, gestationalAge }));
      }
    }
  }, [formData.lastMenstrualPeriod]);

  // Stable handle input change function
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, [setFormData]);

  // Helper to update nested form data
  const updateNestedField = useCallback((path, value) => {
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
  }, [setFormData]);

  // Initialize form data structure
  useEffect(() => {
    if (formData && !formData.diagnosis) {
      setFormData(prev => ({
        ...prev,
        diagnosis: prev.diagnosis || { code: '', term: '' },
        diagnosisCodes: prev.diagnosisCodes || [],
        previousModesOfDelivery: prev.previousModesOfDelivery || [],
        currentPregnancyComplaints: prev.currentPregnancyComplaints || '',
        previousObstetricComplications: prev.previousObstetricComplications || '',
        medicalConditions: prev.medicalConditions || '',
        surgicalHistory: prev.surgicalHistory || '',
        rhIsoimmunizationHistory: prev.rhIsoimmunizationHistory || '',
        highRiskFactors: prev.highRiskFactors || '',
        generalAppearance: prev.generalAppearance || '',
        oedema: prev.oedema || '',
        fundalHeight: prev.fundalHeight || '',
        sfhComment: prev.sfhComment || '',
        fetalLie: prev.fetalLie || '',
        presentation: prev.presentation || '',
        position: prev.position || '',
        fetalMovement: prev.fetalMovement || '',
        fetalHeartRate: prev.fetalHeartRate || '',
        fhrCharacter: prev.fhrCharacter || '',
        contractions: prev.contractions || '',
        membranes: prev.membranes || '',
        timeOfRupture: prev.timeOfRupture || '',
        liquor: prev.liquor || '',
        vaginalBleeding: prev.vaginalBleeding || '',
        vaginalBleedingDescription: prev.vaginalBleedingDescription || '',
        showMucusPlug: prev.showMucusPlug || '',
        cervicalDilation: prev.cervicalDilation || '',
        effacement: prev.effacement || '',
        station: prev.station || '',
        cervicalConsistency: prev.cervicalConsistency || '',
        hemoglobin: prev.hemoglobin || '',
        bloodSugar: prev.bloodSugar || '',
        gdmScreening: prev.gdmScreening || '',
        urineAnalysis: prev.urineAnalysis || '',
        hivStatus: prev.hivStatus || '',
        hepatitisBStatus: prev.hepatitisBStatus || '',
        syphilis: prev.syphilis || '',
        otherTests: prev.otherTests || '',
        numberOfFetuses: prev.numberOfFetuses || 1,
        ultrasoundDate: prev.ultrasoundDate || '',
        gestationalAgeByUltrasound: prev.gestationalAgeByUltrasound || '',
        placentaPosition: prev.placentaPosition || '',
        placentalComment: prev.placentalComment || '',
        amnioticFluid: prev.amnioticFluid || '',
        estimatedFetalWeight: prev.estimatedFetalWeight || '',
        fetalBiometry: prev.fetalBiometry || '',
        dopplerBppFindings: prev.dopplerBppFindings || '',
        additionalUltrasoundFindings: prev.additionalUltrasoundFindings || '',
        overallRiskCategory: prev.overallRiskCategory || '',
        keyRiskFactors: prev.keyRiskFactors || '',
        clinicalImpression: prev.clinicalImpression || '',
        nextVisitDate: prev.nextVisitDate || '',
        nextVisitType: prev.nextVisitType || '',
        recommendedTests: prev.recommendedTests || '',
        medicationsPrescribed: prev.medicationsPrescribed || '',
        dietaryRecommendations: prev.dietaryRecommendations || '',
        activityWorkRestrictions: prev.activityWorkRestrictions || '',
        emergencyInstructions: prev.emergencyInstructions || '',
        plannedPlaceOfDelivery: prev.plannedPlaceOfDelivery || '',
        plannedModeOfDelivery: prev.plannedModeOfDelivery || '',
        generalObservations: prev.generalObservations || '',
        patientConcerns: prev.patientConcerns || '',
        counsellingProvided: prev.counsellingProvided || '',
        followUpPlanNarrative: prev.followUpPlanNarrative || '',
        providerSignature: prev.providerSignature || '',
        documentationDateTime: prev.documentationDateTime || new Date().toISOString().slice(0, 16),
      }));
    }
  }, []);

  // Helper to add/remove from array fields
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
    // Patient information is retrieved from backend, no validation needed
    if (!formData.diagnosis || !formData.diagnosis.code || !formData.diagnosis.term) {
      alert('Please select a main diagnosis.');
      return false;
    }
    return true;
  }, [formData]);

  // Build payload - comprehensive structure for all midwifery fields
  const buildPayload = useCallback(() => {
    return {
      doc_type: 'midwifery.initial',
      meta: formData.meta || {
        clinic_id: localStorage.getItem('clinic_id') || '',
        department_id: 'midwifery_gynecology',
        physician_id: localStorage.getItem('user_id') || '',
        patient_id: patient?.patient_id || patient?.id || '',
        encounter_id: '',
        datetime: new Date().toISOString()
      },
      // Obstetric & Medical History
      obstetric_medical_history: {
        obstetric_summary: {
          gravida: formData.gravida,
          para: formData.para,
          abortions_miscarriages: formData.abortions,
          living_children: formData.livingChildren,
          previous_modes_of_delivery: formData.previousModesOfDelivery || [],
          previous_obstetric_complications: formData.previousObstetricComplications,
        },
        general_medical_history: {
          medical_conditions: formData.medicalConditions,
          surgical_history: formData.surgicalHistory,
          allergies: formData.allergies,
          blood_group: formData.bloodGroup,
          rh_isoimmunization_history: formData.rhIsoimmunizationHistory,
          current_medications: formData.currentMedications || [],
          family_history: formData.familyHistory,
        },
      },
      // Current Pregnancy
      current_pregnancy: {
        pregnancy_planned: formData.pregnancyPlanned,
        last_menstrual_period: formData.lastMenstrualPeriod,
        dating_method: formData.datingMethod,
        estimated_due_date: formData.estimatedDueDate,
        gestational_age: formData.gestationalAge,
        pregnancy_type: formData.pregnancyType,
        visit_number: formData.visitNumber,
        high_risk_factors: formData.highRiskFactors,
        current_pregnancy_complaints: formData.currentPregnancyComplaints,
      },
      // Vital Signs
      vital_signs: {
        blood_pressure: formData.bloodPressure,
        pulse_rate: formData.pulseRate,
        respiratory_rate: formData.respiratoryRate,
        temperature: formData.temperature,
        spo2: formData.spo2,
        weight: formData.weight,
        height: formData.height,
        bmi: formData.bmi,
      },
      // Obstetric Examination
      obstetric_examination: {
        general: {
          general_appearance: formData.generalAppearance,
          oedema: formData.oedema,
        },
        uterus_fetus: {
          fundal_height: formData.fundalHeight,
          symphysis_fundal_height_comment: formData.symphysisFundalHeightComment,
          fetal_lie: formData.fetalLie,
          presentation: formData.presentation,
          position: formData.position,
          fetal_movement: formData.fetalMovement,
          fetal_heart_rate: formData.fetalHeartRate,
          fhr_character_comment: formData.fhrCharacterComment,
        },
        labour_specific: {
          contractions: formData.contractions,
          membranes: formData.membranes,
          time_of_rupture: formData.timeOfRupture,
          liquor: formData.liquor,
          vaginal_bleeding: formData.vaginalBleeding,
          vaginal_bleeding_description: formData.vaginalBleedingDescription,
          show_mucus_plug: formData.showMucusPlug,
        },
        cervical_assessment: {
          cervical_dilation: formData.cervicalDilation,
          effacement: formData.effacement,
          station: formData.station,
          cervical_consistency_position: formData.cervicalConsistencyPosition,
        },
      },
      // Laboratory Tests
      laboratory_tests: {
        hemoglobin: formData.hemoglobin,
        blood_sugar_glucose: formData.bloodSugarGlucose,
        gdm_screening_ogtt_result: formData.gdmScreeningOgttResult,
        urine_analysis: formData.urineAnalysis,
        hiv_status: formData.hivStatus,
        hepatitis_b_status: formData.hepatitisBStatus,
        syphilis: formData.syphilis,
        other_tests: formData.otherTests,
      },
      // Ultrasound & Fetal Assessment
      ultrasound_fetal_assessment: {
        number_of_fetuses: formData.numberOfFetuses,
        ultrasound_date: formData.ultrasoundDate,
        gestational_age_by_ultrasound: formData.gestationalAgeByUltrasound,
        placenta_position: formData.placentaPosition,
        placental_comment: formData.placentalComment,
        amniotic_fluid: formData.amnioticFluid,
        estimated_fetal_weight: formData.estimatedFetalWeight,
        fetal_biometry: formData.fetalBiometry,
        doppler_bpp_findings: formData.dopplerBppFindings,
        additional_ultrasound_findings: formData.additionalUltrasoundFindings,
      },
      // Risk Assessment & Summary
      risk_assessment_summary: {
        overall_risk_category: formData.overallRiskCategory,
        key_risk_factors: formData.keyRiskFactors,
        clinical_impression: formData.clinicalImpression,
      },
      // Diagnosis
      diagnosis: formData.diagnosis,
      diagnosis_codes: formData.diagnosisCodes || [],
      // Care Plan & Follow-up
      care_plan_followup: {
        next_visit_date: formData.nextVisitDate,
        next_visit_type: formData.nextVisitType,
        recommended_tests: formData.recommendedTests,
        medications_prescribed: formData.medicationsPrescribed || [],
        dietary_recommendations: formData.dietaryRecommendations,
        activity_work_restrictions: formData.activityWorkRestrictions,
        emergency_instructions: formData.emergencyInstructions,
        planned_place_of_delivery: formData.plannedPlaceOfDelivery,
        planned_mode_of_delivery: formData.plannedModeOfDelivery,
      },
      // Notes, Counselling & Sign-off
      notes_counselling_signoff: {
        general_observations: formData.generalObservations,
        patient_concerns: formData.patientConcerns,
        counselling_provided: formData.counsellingProvided,
        follow_up_plan_narrative: formData.followUpPlanNarrative,
        provider_signature: formData.providerSignature,
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
          {/* 1. Obstetric & Medical History */}
          <FormSection title={t('midwiferyForm.obstetricMedicalHistory')} bgColor="bg-green-50" darkMode={darkMode}>
            {/* 2.1. Obstetric Summary */}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('midwiferyForm.obstetricSummary')}</h4>
            </div>
            <FormField label={t('midwiferyForm.gravida')} name="gravida" type="number" placeholder={t('midwiferyForm.gravidaPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.para')} name="para" type="number" placeholder={t('midwiferyForm.paraPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.abortions')} name="abortions" type="number" placeholder={t('midwiferyForm.abortionsPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.livingChildren')} name="livingChildren" type="number" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('midwiferyForm.previousModesOfDelivery')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.previousModesOfDelivery || []).map((mode, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('previousModesOfDelivery', i)} darkMode={darkMode}>{mode}</Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[t('midwiferyForm.normalVaginalDelivery'), t('midwiferyForm.instrumental'), t('midwiferyForm.electiveCaesarean'), t('midwiferyForm.emergencyCaesarean'), t('midwiferyForm.other')].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (!(formData.previousModesOfDelivery || []).includes(mode)) {
                        addToArray('previousModesOfDelivery', mode);
                      }
                    }}
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    + {mode}
                  </button>
                ))}
              </div>
            </div>
            <FormField label={t('midwiferyForm.previousObstetricComplications')} name="previousObstetricComplications" type="textarea" placeholder={t('midwiferyForm.previousObstetricComplicationsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />

            {/* 2.2. General Medical History */}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('midwiferyForm.generalMedicalHistory')}</h4>
            </div>
            <FormField label={t('midwiferyForm.medicalConditions')} name="medicalConditions" type="textarea" placeholder={t('midwiferyForm.medicalConditionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.surgicalHistory')} name="surgicalHistory" type="textarea" placeholder={t('midwiferyForm.surgicalHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.allergies')} name="allergies" type="textarea" placeholder={t('midwiferyForm.allergiesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.bloodGroup')} name="bloodGroup" type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.rhIsoimmunizationHistory')} name="rhIsoimmunizationHistory" type="select" options={[t('midwiferyForm.no'), t('midwiferyForm.suspected'), t('midwiferyForm.confirmed')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="col-span-full">
              <MedicationListField label={t('midwiferyForm.currentMedications')} name="currentMedications" value={formData.currentMedications || ''} onChange={handleChange} formData={formData} darkMode={darkMode} t={t} />
              {patientMedications.length > 0 && (
                <div className={`mt-2 p-3 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{t('midwiferyForm.fromPatientRecord') || 'From Patient Record'}</div>
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
                    {t('midwiferyForm.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
            </div>
            <FormField label={t('midwiferyForm.familyHistory')} name="familyHistory" type="textarea" placeholder={t('midwiferyForm.familyHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 3. Current Pregnancy */}
          <FormSection title={t('midwiferyForm.currentPregnancy')} bgColor="bg-yellow-50" darkMode={darkMode}>
            <FormField label={t('midwiferyForm.pregnancyPlanned')} name="pregnancyPlanned" type="select" options={[t('midwiferyForm.yes'), t('midwiferyForm.no'), t('midwiferyForm.unknown')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.lastMenstrualPeriod')} name="lastMenstrualPeriod" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.datingMethod')} name="datingMethod" type="select" options={[t('midwiferyForm.lmp'), t('midwiferyForm.earlyUltrasound'), t('midwiferyForm.ivfDates'), t('midwiferyForm.unknown')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.estimatedDueDate')} name="estimatedDueDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.gestationalAge')} name="gestationalAge" placeholder={t('midwiferyForm.gestationalAgePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.pregnancyType')} name="pregnancyType" type="select" options={[t('midwiferyForm.singleton'), t('midwiferyForm.twins'), t('midwiferyForm.triplets'), t('midwiferyForm.higherOrder')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.visitNumber')} name="visitNumber" type="number" placeholder={t('midwiferyForm.visitNumberPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.highRiskFactors')} name="highRiskFactors" type="textarea" placeholder={t('midwiferyForm.highRiskFactorsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.currentPregnancyComplaints')} name="currentPregnancyComplaints" type="textarea" placeholder={t('midwiferyForm.currentPregnancyComplaintsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 4. Vital Signs */}
          <FormSection 
            title={t('midwiferyForm.vitalSigns')} 
            bgColor="bg-red-50" 
            darkMode={darkMode}
            collapsible={true}
            isOpen={!collapsedSections.vitals}
            onToggle={() => toggleSection('vitals')}
          >
            <FormField label={t('midwiferyForm.bloodPressure')} name="bloodPressure" placeholder={t('midwiferyForm.bloodPressurePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.pulseRate')} name="pulseRate" type="number" placeholder={t('midwiferyForm.pulseRatePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.respiratoryRate')} name="respiratoryRate" type="number" placeholder={t('midwiferyForm.respiratoryRatePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.temperature')} name="temperature" type="number" placeholder={t('midwiferyForm.temperaturePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.spo2')} name="spo2" type="number" placeholder={t('midwiferyForm.spo2Placeholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.weight')} name="weight" type="number" placeholder={t('midwiferyForm.weightPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.height')} name="height" type="number" placeholder={t('midwiferyForm.heightPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.bmi')} name="bmi" type="number" placeholder={t('midwiferyForm.bmiPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 5. Obstetric Examination */}
          <FormSection title={t('midwiferyForm.obstetricExamination')} bgColor="bg-purple-50" darkMode={darkMode}>
            {/* 5.1. General */}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('midwiferyForm.general')}</h4>
            </div>
            <FormField label={t('midwiferyForm.generalAppearance')} name="generalAppearance" type="textarea" placeholder={t('midwiferyForm.generalAppearancePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.oedema')} name="oedema" type="select" options={[t('midwiferyForm.absent'), t('midwiferyForm.mild'), t('midwiferyForm.moderate'), t('midwiferyForm.severe'), t('midwiferyForm.generalized')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />

            {/* 5.2. Uterus & Fetus */}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('midwiferyForm.uterusFetus')}</h4>
            </div>
            <FormField label={t('midwiferyForm.fundalHeight')} name="fundalHeight" placeholder={t('midwiferyForm.fundalHeightPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.sfhComment')} name="sfhComment" type="textarea" placeholder={t('midwiferyForm.sfhCommentPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.fetalLie')} name="fetalLie" type="select" options={[t('midwiferyForm.longitudinal'), t('midwiferyForm.transverse'), t('midwiferyForm.oblique'), t('midwiferyForm.uncertain')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.presentation')} name="presentation" type="select" options={[t('midwiferyForm.cephalic'), t('midwiferyForm.breech'), t('midwiferyForm.shoulder'), t('midwiferyForm.compound'), t('midwiferyForm.uncertain')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.position')} name="position" placeholder={t('midwiferyForm.positionPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.fetalMovement')} name="fetalMovement" type="select" options={[t('midwiferyForm.normal'), t('midwiferyForm.reduced'), t('midwiferyForm.absent'), t('midwiferyForm.notAssessed')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.fetalHeartRate')} name="fetalHeartRate" type="number" placeholder={t('midwiferyForm.fetalHeartRatePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.fhrCharacter')} name="fhrCharacter" type="textarea" placeholder={t('midwiferyForm.fhrCharacterPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />

            {/* 5.3. Labour-specific fields */}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('midwiferyForm.labourSpecificFields')}</h4>
            </div>
            <FormField label={t('midwiferyForm.contractions')} name="contractions" type="textarea" placeholder={t('midwiferyForm.contractionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.membranes')} name="membranes" type="select" options={[t('midwiferyForm.intact'), t('midwiferyForm.ruptured')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.timeOfRupture')} name="timeOfRupture" type="datetime-local" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.liquor')} name="liquor" type="select" options={[t('midwiferyForm.notAssessedLiquor'), t('midwiferyForm.clear'), t('midwiferyForm.meconiumStained'), t('midwiferyForm.bloody'), t('midwiferyForm.foulSmelling'), t('midwiferyForm.other')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.vaginalBleeding')} name="vaginalBleeding" type="select" options={[t('midwiferyForm.none'), t('midwiferyForm.spotting'), t('midwiferyForm.light'), t('midwiferyForm.moderate'), t('midwiferyForm.heavy')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.vaginalBleeding && formData.vaginalBleeding !== t('midwiferyForm.none') && (
              <FormField label={t('midwiferyForm.vaginalBleedingDescription')} name="vaginalBleedingDescription" type="textarea" placeholder={t('midwiferyForm.vaginalBleedingDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('midwiferyForm.showMucusPlug')} name="showMucusPlug" type="select" options={[t('midwiferyForm.absent'), t('midwiferyForm.present')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />

            {/* 5.4. Cervical Assessment */}
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('midwiferyForm.cervicalAssessment')}</h4>
            </div>
            <FormField label={t('midwiferyForm.cervicalDilation')} name="cervicalDilation" placeholder={t('midwiferyForm.cervicalDilationPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.effacement')} name="effacement" placeholder={t('midwiferyForm.effacementPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.station')} name="station" placeholder={t('midwiferyForm.stationPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.cervicalConsistency')} name="cervicalConsistency" type="textarea" placeholder={t('midwiferyForm.cervicalConsistencyPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 6. Laboratory Tests */}
          <FormSection title={t('midwiferyForm.laboratoryTests')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <FormField label={t('midwiferyForm.hemoglobin')} name="hemoglobin" placeholder={t('midwiferyForm.hemoglobinPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.bloodSugar')} name="bloodSugar" placeholder={t('midwiferyForm.bloodSugarPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.gdmScreening')} name="gdmScreening" type="textarea" placeholder={t('midwiferyForm.gdmScreeningPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.urineAnalysis')} name="urineAnalysis" type="textarea" placeholder={t('midwiferyForm.urineAnalysisPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.hivStatus')} name="hivStatus" type="select" options={[t('midwiferyForm.negative'), t('midwiferyForm.positive'), t('midwiferyForm.unknown'), t('midwiferyForm.notTested')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.hepatitisBStatus')} name="hepatitisBStatus" type="select" options={[t('midwiferyForm.negative'), t('midwiferyForm.positive'), t('midwiferyForm.unknown'), t('midwiferyForm.notTested')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.syphilis')} name="syphilis" type="select" options={[t('midwiferyForm.negative'), t('midwiferyForm.positive'), t('midwiferyForm.unknown'), t('midwiferyForm.notTested')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.otherTests')} name="otherTests" type="textarea" placeholder={t('midwiferyForm.otherTestsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 7. Ultrasound & Fetal Assessment */}
          <FormSection title={t('midwiferyForm.ultrasoundFetalAssessment')} bgColor="bg-teal-50" darkMode={darkMode}>
            <FormField label={t('midwiferyForm.numberOfFetuses')} name="numberOfFetuses" type="number" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.ultrasoundDate')} name="ultrasoundDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.gestationalAgeByUltrasound')} name="gestationalAgeByUltrasound" placeholder={t('midwiferyForm.gestationalAgeByUltrasoundPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.placentaPosition')} name="placentaPosition" type="select" options={[t('midwiferyForm.anterior'), t('midwiferyForm.posterior'), t('midwiferyForm.fundal'), t('midwiferyForm.lowLying'), t('midwiferyForm.previa')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.placentalComment')} name="placentalComment" type="textarea" placeholder={t('midwiferyForm.placentalCommentPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.amnioticFluid')} name="amnioticFluid" type="select" options={[t('midwiferyForm.normalAmniotic'), t('midwiferyForm.oligohydramnios'), t('midwiferyForm.polyhydramnios'), t('midwiferyForm.borderline'), t('midwiferyForm.notAssessedLiquor')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.estimatedFetalWeight')} name="estimatedFetalWeight" placeholder={t('midwiferyForm.estimatedFetalWeightPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.fetalBiometry')} name="fetalBiometry" type="textarea" placeholder={t('midwiferyForm.fetalBiometryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.dopplerBppFindings')} name="dopplerBppFindings" type="textarea" placeholder={t('midwiferyForm.dopplerBppFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.additionalUltrasoundFindings')} name="additionalUltrasoundFindings" type="textarea" placeholder={t('midwiferyForm.additionalUltrasoundFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 8. Risk Assessment & Summary */}
          <FormSection title={t('midwiferyForm.riskAssessmentSummary')} bgColor="bg-pink-50" darkMode={darkMode}>
            <FormField label={t('midwiferyForm.overallRiskCategory')} name="overallRiskCategory" type="select" options={[t('midwiferyForm.lowRisk'), t('midwiferyForm.moderateRisk'), t('midwiferyForm.highRisk')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.keyRiskFactors')} name="keyRiskFactors" type="textarea" placeholder={t('midwiferyForm.keyRiskFactorsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.clinicalImpression')} name="clinicalImpression" type="textarea" placeholder={t('midwiferyForm.clinicalImpressionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 9. Diagnosis (ICD-11-ready) */}
          <FormSection title={t('midwiferyForm.diagnosis')} bgColor="bg-pink-50" darkMode={darkMode}>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('midwiferyForm.mainDiagnosis')} <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {formData.diagnosis && typeof formData.diagnosis === 'object' && (formData.diagnosis.code || formData.diagnosis.term) ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <input
                        type="text"
                        placeholder={t('midwiferyForm.icd11Code')}
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
                        placeholder={t('midwiferyForm.diagnosisTerm')}
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
                      {t('midwiferyForm.clear')}
                    </button>
                  </div>
                ) : null}
                <IcdCodeSearchInput
                  placeholder={t('midwiferyForm.searchIcd11Code')}
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
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('midwiferyForm.additionalDiagnosisCodes')}</label>
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
                  placeholder={t('midwiferyForm.searchIcd11CodeToAdd')}
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

          {/* 10. Care Plan & Follow-up */}
          <FormSection title={t('midwiferyForm.carePlanFollowup')} bgColor="bg-orange-50" darkMode={darkMode}>
            <FormField label={t('midwiferyForm.nextVisitDate')} name="nextVisitDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.nextVisitType')} name="nextVisitType" type="select" options={[t('midwiferyForm.routineAntenatal'), t('midwiferyForm.highRiskAntenatal'), t('midwiferyForm.ultrasound'), t('midwiferyForm.labReview'), t('midwiferyForm.postnatal'), t('midwiferyForm.other')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.recommendedTests')} name="recommendedTests" type="textarea" placeholder={t('midwiferyForm.recommendedTestsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <MedicationListField label={t('midwiferyForm.medicationsPrescribed')} name="medicationsPrescribed" value={formData.medicationsPrescribed || ''} onChange={handleChange} formData={formData} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.dietaryRecommendations')} name="dietaryRecommendations" type="textarea" placeholder={t('midwiferyForm.dietaryRecommendationsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.activityWorkRestrictions')} name="activityWorkRestrictions" type="textarea" placeholder={t('midwiferyForm.activityWorkRestrictionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.emergencyInstructions')} name="emergencyInstructions" type="textarea" placeholder={t('midwiferyForm.emergencyInstructionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.plannedPlaceOfDelivery')} name="plannedPlaceOfDelivery" type="select" options={[t('midwiferyForm.thisFacility'), t('midwiferyForm.otherFacility'), t('midwiferyForm.notYetDecided')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.plannedModeOfDelivery')} name="plannedModeOfDelivery" type="select" options={[t('midwiferyForm.normalVaginalDeliveryPlanned'), t('midwiferyForm.electiveCaesarean'), t('midwiferyForm.vaginalBirthAfterCaesarean'), t('midwiferyForm.undecided')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 11. Notes, Counselling & Sign-off */}
          <FormSection title={t('midwiferyForm.notesCounsellingSignoff')} bgColor="bg-gray-50" darkMode={darkMode}>
            <FormField label={t('midwiferyForm.generalObservations')} name="generalObservations" type="textarea" placeholder={t('midwiferyForm.generalObservationsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.patientConcerns')} name="patientConcerns" type="textarea" placeholder={t('midwiferyForm.patientConcernsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.counsellingProvided')} name="counsellingProvided" type="textarea" placeholder={t('midwiferyForm.counsellingProvidedPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.followUpPlanNarrative')} name="followUpPlanNarrative" type="textarea" placeholder={t('midwiferyForm.followUpPlanNarrativePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.providerSignature')} name="providerSignature" placeholder={t('midwiferyForm.providerSignaturePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('midwiferyForm.documentationDateTime')} name="documentationDateTime" type="datetime-local" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

        </div>
      </div>
      
      {/* Sticky Footer */}
      <div className={`sticky bottom-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-t p-4 shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastSaved && `${t('midwiferyForm.lastSaved') || 'Last saved'}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('midwiferyForm.saveDraft')}
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
              {t('midwiferyForm.submitForm')}
            </button>
          </div>
        </div>
      </div>
      
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {t('midwiferyForm.draftSavedSuccessfully')}
        </div>
      )}
    </div>
  );
};

export default MidwiferyForm;
