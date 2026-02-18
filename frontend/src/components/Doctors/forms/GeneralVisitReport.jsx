import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { icdCodesAPI, medicationsAPI } from '../../../services/apiService';

// Sub-components moved outside to prevent recreation
const FieldLabel = ({ children, required = false, darkMode = false }) => (
  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = React.memo(({ name, type = 'text', placeholder, value, onChange, onKeyDown, className = '', darkMode = false }) => {
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
        className={`w-full px-4 py-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base ${
          darkMode 
            ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
            : 'text-slate-600 border-slate-200 bg-white'
        } ${className}`}
      />
    </div>
  );
});

const Select = React.memo(({ name, value, onChange, options, placeholder, className = '', darkMode = false }) => {
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
        className={`w-full px-4 py-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base ${
          darkMode 
            ? 'bg-slate-700 border-slate-600 text-slate-200' 
            : 'text-slate-600 border-slate-200 bg-white'
        } ${className}`}
      >
        <option value="" className={darkMode ? 'bg-slate-800' : ''}>{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value} className={darkMode ? 'bg-slate-800' : ''}>{option.label}</option>
        ))}
      </select>
    </div>
  );
});

const TextArea = React.memo(({ name, placeholder, value, onChange, rows = 3, className = '', darkMode = false }) => {
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
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none ${
          darkMode 
            ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
            : 'text-slate-600 border-slate-200 bg-white'
        } ${className}`}
      />
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
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            darkMode 
              ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
              : 'text-slate-600 border-slate-200 bg-white'
          }`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
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
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            darkMode 
              ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
              : 'text-slate-600 border-slate-200 bg-white'
          }`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
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

const Chip = ({ children, onRemove, className = '', darkMode = false }) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
    darkMode 
      ? 'bg-emerald-900/30 text-emerald-300' 
      : 'bg-emerald-50 text-emerald-700'
  } ${className}`}>
    {children}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className={`ml-1 ${
          darkMode 
            ? 'text-emerald-400 hover:text-emerald-200' 
            : 'text-emerald-500 hover:text-emerald-700'
        }`}
      >
        ×
      </button>
    )}
  </span>
);

const ToggleMatrix = ({ items, values, onChange, notes = {}, onNoteChange, darkMode = false, t }) => (
  <div className="grid grid-cols-2 gap-4">
    {items.map(({key, label}) => (
      <div key={key} className={`flex items-center justify-between p-3 border rounded-lg ${
        darkMode 
          ? 'border-slate-700 bg-slate-800/50' 
          : 'border-slate-200 bg-white'
      }`}>
        <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(key, 'normal')}
            className={`px-3 py-1 rounded text-sm ${
              values[key] === 'normal' 
                ? darkMode
                  ? 'bg-emerald-900/50 text-emerald-300'
                  : 'bg-emerald-100 text-emerald-700'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('generalVisitReport.normal')}
          </button>
          <button
            type="button"
            onClick={() => onChange(key, 'abnormal')}
            className={`px-3 py-1 rounded text-sm ${
              values[key] === 'abnormal' 
                ? darkMode
                  ? 'bg-red-900/50 text-red-300'
                  : 'bg-red-100 text-red-700'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('generalVisitReport.abnormal')}
          </button>
          {values[key] === 'abnormal' && (
            <input
              key={`note-${key}`}
              type="text"
              placeholder={t('generalVisitReport.note')}
              value={notes[key] || ''}
              onChange={(e) => onNoteChange(key, e.target.value)}
              className={`w-24 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                darkMode 
                  ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
                  : 'border-slate-200 bg-white'
              }`}
            />
          )}
        </div>
      </div>
    ))}
  </div>
);

const Card = ({ title, children, actions, className = '', defaultCollapsed = false, darkMode = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  return (
    <div className={`rounded-2xl border shadow-sm ${
      darkMode 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-slate-100'
    } ${className}`}>
      <div className={`p-4 border-b ${
        darkMode ? 'border-slate-700' : 'border-slate-100'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-lg ${
            darkMode ? 'text-slate-200' : 'text-slate-800'
          }`}>{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`transition-colors ${
                darkMode 
                  ? 'text-slate-400 hover:text-slate-200' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
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
  const { t } = useTranslation();

  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Listen for storage events and periodically check for theme changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        const saved = localStorage.getItem('theme');
        const newDarkMode = saved === 'dark';
        setDarkMode(prev => {
          if (prev !== newDarkMode) {
            return newDarkMode;
          }
          return prev;
        });
      }
    };

    // Listen for custom theme change events (for same-tab changes)
    const handleThemeChange = () => {
      const saved = localStorage.getItem('theme');
      const newDarkMode = saved === 'dark';
      setDarkMode(prev => {
        if (prev !== newDarkMode) {
          return newDarkMode;
        }
        return prev;
      });
    };

    // Periodic check to ensure sync (catches changes from same tab)
    const checkTheme = () => {
      const saved = localStorage.getItem('theme');
      const newDarkMode = saved === 'dark';
      const hasDarkClass = document.documentElement.classList.contains('dark');
      
      // Sync if there's a mismatch
      if (newDarkMode !== hasDarkClass) {
        setDarkMode(newDarkMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themechange', handleThemeChange);
    
    // Check immediately and then periodically
    checkTheme();
    const interval = setInterval(checkTheme, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themechange', handleThemeChange);
      clearInterval(interval);
    };
  }, []);

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
      free: '',
      pregnancy_status: 'not_pregnant',
      pregnancy_trimester: '',
      breastfeeding: 'unknown'
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
      alcohol_use: 'none',
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
      follow_up: '',
      work_capacity: 'fit_for_work',
      sick_leave_days: '',
      hospitalization: 'not_required',
      destination_hospital_ward: '',
      vitals_allergies_reviewed: false
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
            free: prev?.hpi?.free || '',
            pregnancy_status: prev?.hpi?.pregnancy_status || 'not_pregnant',
            pregnancy_trimester: prev?.hpi?.pregnancy_trimester || '',
            breastfeeding: prev?.hpi?.breastfeeding || 'unknown'
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
            alcohol_use: prev?.pmh_fh_sh?.alcohol_use || 'none',
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
            follow_up: prev?.plan?.follow_up || '',
            work_capacity: prev?.plan?.work_capacity || 'fit_for_work',
            sick_leave_days: prev?.plan?.sick_leave_days || '',
            hospitalization: prev?.plan?.hospitalization || 'not_required',
            destination_hospital_ward: prev?.plan?.destination_hospital_ward || '',
            vitals_allergies_reviewed: prev?.plan?.vitals_allergies_reviewed || false
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
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className={`rounded-2xl border shadow-sm p-6 ${
          darkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-100'
        }`}>
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {t('generalVisitReport.title')}
          </h1>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('generalVisitReport.subtitle')}
          </p>
        </div>

        {/* A. Identification */}
        <Card title={t('generalVisitReport.identification')} darkMode={darkMode}>
          <div className="space-y-4">
            <div>
              <FieldLabel required darkMode={darkMode}>{t('generalVisitReport.chiefComplaint')}</FieldLabel>
              <Input
                name="chief_complaint"
                placeholder={t('generalVisitReport.chiefComplaintPlaceholder')}
                value={formData?.chief_complaint || ''}
                onChange={createInputHandler('chief_complaint')}
                darkMode={darkMode}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.onsetTime')}</FieldLabel>
                <Input
                  name="onset_time"
                  type="datetime-local"
                  value={formData?.onset_time || ''}
                  onChange={createInputHandler('onset_time')}
                  darkMode={darkMode}
                />
              </div>
              
              <div>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.informationSource')}</FieldLabel>
                <Select
                  name="info_source"
                  value={formData?.info_source || 'patient'}
                  onChange={createInputHandler('info_source')}
                  options={[
                    { value: 'patient', label: t('generalVisitReport.patient') },
                    { value: 'relative', label: t('generalVisitReport.relative') },
                    { value: 'record', label: t('generalVisitReport.medicalRecord') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* B. HPI */}
        <Card title={t('generalVisitReport.historyOfPresentIllness')} defaultCollapsed={true} darkMode={darkMode}>
          <p className={`text-xs mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('generalVisitReport.anamnesisMorbi')}</p>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.onset')}</FieldLabel>
                <Select
                  name="hpi.onset"
                  value={formData?.hpi?.onset || ''}
                  onChange={createInputHandler('hpi.onset')}
                  options={[
                    { value: 'остро', label: t('generalVisitReport.acute') },
                    { value: 'постепенно', label: t('generalVisitReport.gradual') },
                    { value: 'неизвестно', label: t('generalVisitReport.unknown') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              
              <div>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.duration')}</FieldLabel>
                <Input
                  name="hpi.duration"
                  placeholder={t('generalVisitReport.durationPlaceholder')}
                  value={formData?.hpi?.duration || ''}
                  onChange={createInputHandler('hpi.duration')}
                  darkMode={darkMode}
                />
              </div>
              
              <div>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.course')}</FieldLabel>
                <Select
                  name="hpi.course"
                  value={formData?.hpi?.course || ''}
                  onChange={createInputHandler('hpi.course')}
                  options={[
                    { value: 'ухудшается', label: t('generalVisitReport.worsening') },
                    { value: 'улучшается', label: t('generalVisitReport.improving') },
                    { value: 'стабильно', label: t('generalVisitReport.stable') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
            </div>
            
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.modifiers')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.hpi?.modifiers || []).map(modifier => (
                  <Chip key={modifier} onRemove={() => removeFromArray('hpi.modifiers', modifier)} darkMode={darkMode}>
                    {modifier}
                  </Chip>
                ))}
              </div>
              <Input
                name="hpi_modifier_input"
                placeholder={t('generalVisitReport.addModifier')}
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
                darkMode={darkMode}
              />
            </div>
            
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.associatedSymptoms')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.hpi?.associated_symptoms || []).map(symptom => (
                  <Chip key={symptom} onRemove={() => removeFromArray('hpi.associated_symptoms', symptom)} darkMode={darkMode}>
                    {symptom}
                  </Chip>
                ))}
              </div>
              <Input
                name="hpi_symptom_input"
                placeholder={t('generalVisitReport.addSymptom')}
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
                darkMode={darkMode}
              />
            </div>
            
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.freeText')}</FieldLabel>
              <div className="flex gap-2">
                <TextArea
                  name="hpi.free"
                  placeholder={t('generalVisitReport.detailedDescription')}
                  value={formData?.hpi?.free || ''}
                  onChange={createInputHandler('hpi.free')}
                  rows={4}
                  className="flex-1"
                  darkMode={darkMode}
                />
                <button type="button" className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                  🧠 AI Suggest
                </button>
              </div>
            </div>

            {/* Pregnancy / Breastfeeding Section - Only for women 15-49 */}
            {(() => {
              if (!patient) return false;
              const gender = (patient.gender || patient.sex || '').toString().toLowerCase();
              const isFemale = gender === 'female' || gender === 'f' || gender === 'ж' || gender === 'женский';
              const age = patient.age || (patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null);
              return isFemale && age && age >= 15 && age <= 49;
            })() && (
              <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.pregnancyBreastfeedingStatus')}</FieldLabel>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('generalVisitReport.pregnancyStatus')}</FieldLabel>
                    <Select
                      name="hpi.pregnancy_status"
                      value={formData?.hpi?.pregnancy_status || 'not_pregnant'}
                      onChange={createInputHandler('hpi.pregnancy_status')}
                      options={[
                        { value: 'not_pregnant', label: t('generalVisitReport.notPregnant') },
                        { value: 'pregnant', label: t('generalVisitReport.pregnant') },
                        { value: 'unknown', label: t('generalVisitReport.unknown') }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  {formData?.hpi?.pregnancy_status === 'pregnant' && (
                    <div>
                      <FieldLabel darkMode={darkMode}>{t('generalVisitReport.trimester')}</FieldLabel>
                      <Select
                        name="hpi.pregnancy_trimester"
                        value={formData?.hpi?.pregnancy_trimester || ''}
                        onChange={createInputHandler('hpi.pregnancy_trimester')}
                        options={[
                          { value: 'I', label: 'I' },
                          { value: 'II', label: 'II' },
                          { value: 'III', label: 'III' }
                        ]}
                        darkMode={darkMode}
                      />
                    </div>
                  )}
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('generalVisitReport.breastfeeding')}</FieldLabel>
                    <Select
                      name="hpi.breastfeeding"
                      value={formData?.hpi?.breastfeeding || 'unknown'}
                      onChange={createInputHandler('hpi.breastfeeding')}
                      options={[
                        { value: 'yes', label: t('generalVisitReport.yes') },
                        { value: 'no', label: t('generalVisitReport.no') },
                        { value: 'unknown', label: t('generalVisitReport.unknown') }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* B. PMH / FH / SH */}
        <Card title={t('generalVisitReport.pastMedicalHistory')} defaultCollapsed={true} darkMode={darkMode}>
          <p className={`text-xs mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('generalVisitReport.anamnesisVitae')}</p>
          <div className="space-y-6">
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.pastMedicalHistoryItems')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.pmh_fh_sh?.pmh || []).map(condition => (
                  <Chip key={condition} onRemove={() => removeFromArray('pmh_fh_sh.pmh', condition)} darkMode={darkMode}>
                    {condition}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['HTN', 'T2DM', 'CAD', 'CKD', 'Depression', 'Tuberculosis', 'Hepatitis B/C', 'Bronchial Asthma', 'Peptic Ulcer', 'Rheumatic Heart Disease', 'Other'].map(condition => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => addToArray('pmh_fh_sh.pmh', condition)}
                    className={`px-3 py-1 rounded transition-colors text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.surgeriesHospitalizations')}</FieldLabel>
              <TextArea
                name="pmh_fh_sh.surgeries"
                placeholder={t('generalVisitReport.surgeriesPlaceholder')}
                value={formData?.pmh_fh_sh?.surgeries || ''}
                onChange={(e) => updateFormData('pmh_fh_sh.surgeries', e.target.value)}
                rows={3}
                darkMode={darkMode}
              />
            </div>
            
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.familyHistory')}</FieldLabel>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'cardio', label: t('generalVisitReport.cardiovascular') },
                  { key: 'diabetes', label: t('generalVisitReport.diabetes') },
                  { key: 'cancer', label: t('generalVisitReport.cancer') }
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{label}</label>
                    <Select
                      name={`pmh_fh_sh.fh.${key}`}
                      value={formData?.pmh_fh_sh?.fh?.[key] || 'unknown'}
                      onChange={(e) => updateFormData(`pmh_fh_sh.fh.${key}`, e.target.value)}
                      options={[
                        { value: 'yes', label: t('generalVisitReport.yes') },
                        { value: 'no', label: t('generalVisitReport.no') },
                        { value: 'unknown', label: t('generalVisitReport.unknown') }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Input
                  name="pmh_fh_sh.fh.notes"
                  placeholder={t('generalVisitReport.familyHistoryNotes')}
                  value={formData?.pmh_fh_sh?.fh?.notes || ''}
                  onChange={(e) => updateFormData('pmh_fh_sh.fh.notes', e.target.value)}
                  darkMode={darkMode}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.smoking')}</FieldLabel>
                <Select
                  name="pmh_fh_sh.smoking"
                  value={formData?.pmh_fh_sh?.smoking || 'never'}
                  onChange={(e) => updateFormData('pmh_fh_sh.smoking', e.target.value)}
                  options={[
                    { value: 'never', label: t('generalVisitReport.never') },
                    { value: 'former', label: t('generalVisitReport.former') },
                    { value: 'current', label: t('generalVisitReport.current') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
              
              <div>
                <FieldLabel darkMode={darkMode}>{t('generalVisitReport.alcoholUse')}</FieldLabel>
                <Select
                  name="pmh_fh_sh.alcohol_use"
                  value={formData?.pmh_fh_sh?.alcohol_use || 'none'}
                  onChange={(e) => updateFormData('pmh_fh_sh.alcohol_use', e.target.value)}
                  options={[
                    { value: 'none', label: t('generalVisitReport.none') },
                    { value: 'occasional', label: t('generalVisitReport.occasional') },
                    { value: 'regular', label: t('generalVisitReport.regular') }
                  ]}
                  darkMode={darkMode}
                />
              </div>
            </div>
            
            <div className="opacity-60">
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.exercise')} <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{t('generalVisitReport.optional')}</span></FieldLabel>
              <Select
                name="pmh_fh_sh.exercise"
                value={formData?.pmh_fh_sh?.exercise || 'low'}
                onChange={(e) => updateFormData('pmh_fh_sh.exercise', e.target.value)}
                options={[
                  { value: 'low', label: t('generalVisitReport.low') },
                  { value: 'moderate', label: t('generalVisitReport.moderate') },
                  { value: 'high', label: t('generalVisitReport.high') }
                ]}
                darkMode={darkMode}
              />
            </div>
          </div>
        </Card>

        {/* B. ROS */}
        <Card title={t('generalVisitReport.reviewOfSystems')} defaultCollapsed={true} darkMode={darkMode}>
          <ToggleMatrix
            items={[
              { key: 'respiratory', label: t('generalVisitReport.respiratory') },
              { key: 'cardio', label: t('generalVisitReport.cardio') },
              { key: 'gi', label: t('generalVisitReport.gi') },
              { key: 'neuro', label: t('generalVisitReport.neuro') },
              { key: 'gu', label: t('generalVisitReport.gu') },
              { key: 'derm', label: t('generalVisitReport.derm') },
              { key: 'ent', label: t('generalVisitReport.ent') },
              { key: 'msk', label: t('generalVisitReport.msk') }
            ]}
            values={formData?.ros || { respiratory: 'normal', cardio: 'normal', gi: 'normal', neuro: 'normal', gu: 'normal', derm: 'normal', ent: 'normal', msk: 'normal', notes: {} }}
            onChange={(key, value) => updateFormData(`ros.${key}`, value)}
            notes={formData?.ros?.notes || {}}
            onNoteChange={(key, value) => updateFormData(`ros.notes.${key}`, value)}
            darkMode={darkMode}
            t={t}
          />
        </Card>

        {/* B. PE */}
        <Card title={t('generalVisitReport.physicalExamination')} defaultCollapsed={true} darkMode={darkMode}>
          <p className={`text-xs mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('generalVisitReport.objectiveStatus')}</p>
          <ToggleMatrix
            items={[
              { key: 'general', label: t('generalVisitReport.general') },
              { key: 'lungs', label: t('generalVisitReport.lungs') },
              { key: 'heart', label: t('generalVisitReport.heart') },
              { key: 'abdomen', label: t('generalVisitReport.abdomen') },
              { key: 'neuro', label: t('generalVisitReport.neuro') },
              { key: 'extremities', label: t('generalVisitReport.extremities') }
            ]}
            values={formData?.pe || { general: 'normal', lungs: 'normal', heart: 'normal', abdomen: 'normal', neuro: 'normal', extremities: 'normal', notes: {} }}
            onChange={(key, value) => updateFormData(`pe.${key}`, value)}
            notes={formData?.pe?.notes || {}}
            onNoteChange={(key, value) => updateFormData(`pe.notes.${key}`, value)}
            darkMode={darkMode}
            t={t}
          />
        </Card>

        {/* B. Assessment */}
        <Card title={t('generalVisitReport.assessment')} darkMode={darkMode}>
          <div className="space-y-4">
            <div>
              <FieldLabel required darkMode={darkMode}>
                {t('generalVisitReport.workingDiagnosis')} <span className={`text-xs font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({t('generalVisitReport.preliminaryDiagnosis')})</span>
              </FieldLabel>
              <div className="space-y-2">
                {(formData?.assessment?.working || []).map((diagnosis, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <Input
                        placeholder={t('generalVisitReport.icd11Code')}
                        value={diagnosis.code || ''}
                        onChange={(e) => {
                          const currentWorking = formData?.assessment?.working || [];
                          const newWorking = [...currentWorking];
                          newWorking[index] = { ...diagnosis, code: e.target.value };
                          updateFormData('assessment.working', newWorking);
                        }}
                        className="w-40"
                        darkMode={darkMode}
                      />
                      <Input
                        placeholder={t('generalVisitReport.diagnosisTerm')}
                        value={diagnosis.term || ''}
                        onChange={(e) => {
                          const currentWorking = formData?.assessment?.working || [];
                          const newWorking = [...currentWorking];
                          newWorking[index] = { ...diagnosis, term: e.target.value };
                          updateFormData('assessment.working', newWorking);
                        }}
                        className="flex-1"
                        darkMode={darkMode}
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
                      {t('generalVisitReport.remove')}
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 items-start">
                  <IcdCodeSearchInput
                    placeholder={t('generalVisitReport.searchIcdCode')}
                    darkMode={darkMode}
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
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.differentialDiagnoses')}</FieldLabel>
              <div className="space-y-2">
                {(formData?.assessment?.ddx || []).map((diagnosis, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <Input
                        placeholder={t('generalVisitReport.icd11Code')}
                        value={diagnosis.code || ''}
                        onChange={(e) => {
                          const currentDdx = formData?.assessment?.ddx || [];
                          const newDdx = [...currentDdx];
                          newDdx[index] = { ...diagnosis, code: e.target.value };
                          updateFormData('assessment.ddx', newDdx);
                        }}
                        className="w-40"
                        darkMode={darkMode}
                      />
                      <Input
                        placeholder={t('generalVisitReport.diagnosisTerm')}
                        value={diagnosis.term || ''}
                        onChange={(e) => {
                          const currentDdx = formData?.assessment?.ddx || [];
                          const newDdx = [...currentDdx];
                          newDdx[index] = { ...diagnosis, term: e.target.value };
                          updateFormData('assessment.ddx', newDdx);
                        }}
                        className="flex-1"
                        darkMode={darkMode}
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
                      {t('generalVisitReport.remove')}
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 items-start">
                  <IcdCodeSearchInput
                    placeholder={t('generalVisitReport.searchIcdCode')}
                    darkMode={darkMode}
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
        <Card title={t('generalVisitReport.plan')} defaultCollapsed={true} darkMode={darkMode}>
          <div className="space-y-6">
            {/* Tests Section */}
            <div>
              <FieldLabel darkMode={darkMode}>
                {t('generalVisitReport.tests')} <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>({formData?.plan?.tests?.length || 0})</span>
              </FieldLabel>
              
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
                    className={`px-3 py-1 rounded text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
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
                      <Chip key={idx} darkMode={darkMode}>
                        <span className="mr-1">{testObj.label}</span>
                        <button
                          type="button"
                          className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
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
                <div className={`mt-3 grid grid-cols-12 gap-4 p-4 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="col-span-12">
                    <Select
                      name="test.type"
                      value={editingTest.type}
                      onChange={(e) => setEditingTest(s => ({ ...s, type: e.target.value }))}
                      options={[
                        { value: 'lab', label: t('generalVisitReport.lab') },
                        { value: 'imaging', label: t('generalVisitReport.imaging') }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      name="test.label"
                      placeholder={t('generalVisitReport.testName')}
                      value={editingTest.label}
                      onChange={(e) => setEditingTest(s => ({ ...s, label: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      name="test.note"
                      placeholder={t('generalVisitReport.clinicalQuestion')}
                      value={editingTest.note || ''}
                      onChange={(e) => setEditingTest(s => ({ ...s, note: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      name="test.dest"
                      placeholder={t('generalVisitReport.destinationClinic')}
                      value={editingTest.destinationClinicId || ''}
                      onChange={(e) => setEditingTest(s => ({ ...s, destinationClinicId: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => { setEditingTest(null); setEditingTestIdx(null); }}
                      className={`px-4 py-2 border rounded-lg ${
                        darkMode 
                          ? 'border-slate-600 hover:bg-slate-700 text-slate-300' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t('generalVisitReport.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={saveTest}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      {t('generalVisitReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Referrals Section */}
            <div>
              <FieldLabel darkMode={darkMode}>
                {t('generalVisitReport.referrals')} <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>({formData?.plan?.referrals?.length || 0})</span>
              </FieldLabel>
              
              {/* Referral presets */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {['Cardiology', 'Pulmonology', 'Endocrinology', 'Neurology', 'Other'].map(sp => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => openRefEditor({ specialty: sp })}
                    className={`px-3 py-1 rounded text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
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
                      <Chip key={idx} darkMode={darkMode}>
                        <span className="mr-1">{refObj.doctorId ? `Dr ${refObj.doctorId}` : refObj.specialty}</span>
                        <button
                          type="button"
                          className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
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
                <div className={`mt-3 grid grid-cols-12 gap-4 p-4 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.specialty')}
                      value={editingRef.specialty}
                      onChange={(e) => setEditingRef(s => ({ ...s, specialty: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.specificDoctor')}
                      value={editingRef.doctorId || ''}
                      onChange={(e) => setEditingRef(s => ({ ...s, doctorId: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.reasonNote')}
                      value={editingRef.reason || ''}
                      onChange={(e) => setEditingRef(s => ({ ...s, reason: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Select
                      name="urgency"
                      value={editingRef.urgency || 'routine'}
                      onChange={(e) => setEditingRef(s => ({ ...s, urgency: e.target.value }))}
                      options={[
                        { value: 'routine', label: t('generalVisitReport.routine') },
                        { value: 'soon', label: t('generalVisitReport.soon') },
                        { value: 'urgent', label: t('generalVisitReport.urgent') }
                      ]}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.destinationClinic')}
                      value={editingRef.destinationClinicId || ''}
                      onChange={(e) => setEditingRef(s => ({ ...s, destinationClinicId: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      className={`px-4 py-2 border rounded-lg ${
                        darkMode 
                          ? 'border-slate-600 hover:bg-slate-700 text-slate-300' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => { setEditingRef(null); setEditingRefIdx(null); }}
                    >
                      {t('generalVisitReport.cancel')}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      onClick={saveRef}
                    >
                      {t('generalVisitReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Medications Section */}
            <div>
              <FieldLabel darkMode={darkMode}>
                {t('generalVisitReport.medicationChanges')} <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>({formData?.plan?.med_changes?.length || 0})</span>
              </FieldLabel>
              
              {/* Add medication button */}
              <button
                type="button"
                onClick={() => openMedEditor()}
                className={`px-4 py-2 rounded transition-colors mb-3 ${
                  darkMode 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('generalVisitReport.addMedication')}
              </button>

              {/* Saved medications list */}
              {formData?.plan?.med_changes?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(formData?.plan?.med_changes || []).map((med, idx) => {
                    const medObj = convertStringToMed(med);
                    return (
                      <Chip key={idx} darkMode={darkMode}>
                        <span className="mr-1">
                          {typeof med === 'string' ? med : `${medObj.med} ${medObj.dose} ${medObj.route} ${medObj.freq}`}
                        </span>
                        <button
                          type="button"
                          className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
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
                <div className={`mt-3 grid grid-cols-12 gap-4 p-4 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="col-span-12">
                    <MedicationSearchInput
                      placeholder={t('generalVisitReport.searchMedication')}
                      darkMode={darkMode}
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
                      placeholder={t('generalVisitReport.dose')}
                      value={editingMed.dose}
                      onChange={(e) => setEditingMed(s => ({ ...s, dose: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.route')}
                      value={editingMed.route}
                      onChange={(e) => setEditingMed(s => ({ ...s, route: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.frequency')}
                      value={editingMed.freq}
                      onChange={(e) => setEditingMed(s => ({ ...s, freq: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.duration')}
                      value={editingMed.duration}
                      onChange={(e) => setEditingMed(s => ({ ...s, duration: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input
                      placeholder={t('generalVisitReport.instructions')}
                      value={editingMed.instructions || ''}
                      onChange={(e) => setEditingMed(s => ({ ...s, instructions: e.target.value }))}
                      darkMode={darkMode}
                    />
                  </div>
                  {/* Send to Pharmacy / Pharmacy ID - Hidden by default for Uzbek clinics */}
                  {/* Uncomment and show conditionally based on clinic settings if pharmacy integration exists */}
                  {/* 
                  <div className="col-span-12 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingMed.sendToPharmacy || false}
                      onChange={(e) => setEditingMed(s => ({ ...s, sendToPharmacy: e.target.checked }))}
                      className="rounded w-4 h-4"
                    />
                    <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('generalVisitReport.sendToPharmacy')}</label>
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
                  */}
                  <div className="col-span-12 flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      className={`px-4 py-2 border rounded-lg ${
                        darkMode 
                          ? 'border-slate-600 hover:bg-slate-700 text-slate-300' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => { setEditingMed(null); setEditingMedIdx(null); }}
                    >
                      {t('generalVisitReport.cancel')}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      onClick={saveMed}
                    >
                      {t('generalVisitReport.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.lifestyle')}</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData?.plan?.lifestyle || []).map(item => (
                  <Chip key={item} onRemove={() => removeFromArray('plan.lifestyle', item)} darkMode={darkMode}>
                    {item}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  t('generalVisitReport.hydration'),
                  t('generalVisitReport.rest'),
                  t('generalVisitReport.exercise'),
                  t('generalVisitReport.diet'),
                  t('generalVisitReport.smokingCessation'),
                  t('generalVisitReport.other')
                ].map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => addToArray('plan.lifestyle', item)}
                    className={`px-3 py-1 rounded transition-colors text-sm ${
                      darkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.followUp')}</FieldLabel>
              <Select
                name="plan.follow_up"
                value={formData?.plan?.follow_up || ''}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={[
                  { value: '24h', label: t('generalVisitReport.hours24') },
                  { value: '3d', label: t('generalVisitReport.days3') },
                  { value: '1w', label: t('generalVisitReport.week1') },
                  { value: 'PRN', label: t('generalVisitReport.asNeeded') }
                ]}
                darkMode={darkMode}
              />
            </div>

            {/* Work Capacity / Sick Leave Decision */}
            <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.workCapacitySickLeave')}</FieldLabel>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel darkMode={darkMode}>{t('generalVisitReport.workCapacityThisVisit')}</FieldLabel>
                  <Select
                    name="plan.work_capacity"
                    value={formData?.plan?.work_capacity || 'fit_for_work'}
                    onChange={(e) => updateFormData('plan.work_capacity', e.target.value)}
                    options={[
                      { value: 'fit_for_work', label: t('generalVisitReport.fitForWork') },
                      { value: 'limited_capacity', label: t('generalVisitReport.limitedCapacity') },
                      { value: 'temporarily_unfit', label: t('generalVisitReport.temporarilyUnfit') }
                    ]}
                    darkMode={darkMode}
                  />
                </div>
                {formData?.plan?.work_capacity === 'temporarily_unfit' && (
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('generalVisitReport.sickLeaveRecommended')}</FieldLabel>
                    <Input
                      name="plan.sick_leave_days"
                      type="number"
                      min="0"
                      placeholder="Number of days"
                      value={formData?.plan?.sick_leave_days || ''}
                      onChange={(e) => updateFormData('plan.sick_leave_days', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Hospitalization Decision */}
            <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <FieldLabel darkMode={darkMode}>{t('generalVisitReport.hospitalizationDecision')}</FieldLabel>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel darkMode={darkMode}>{t('generalVisitReport.hospitalization')}</FieldLabel>
                  <Select
                    name="plan.hospitalization"
                    value={formData?.plan?.hospitalization || 'not_required'}
                    onChange={(e) => updateFormData('plan.hospitalization', e.target.value)}
                    options={[
                      { value: 'not_required', label: t('generalVisitReport.notRequired') },
                      { value: 'planned', label: t('generalVisitReport.planned') },
                      { value: 'urgent_emergency', label: t('generalVisitReport.urgentEmergency') }
                    ]}
                    darkMode={darkMode}
                  />
                </div>
                {(formData?.plan?.hospitalization === 'planned' || formData?.plan?.hospitalization === 'urgent_emergency') && (
                  <div>
                    <FieldLabel darkMode={darkMode}>{t('generalVisitReport.destinationHospitalWard')}</FieldLabel>
                    <Input
                      name="plan.destination_hospital_ward"
                      placeholder="Optional free-text"
                      value={formData?.plan?.destination_hospital_ward || ''}
                      onChange={(e) => updateFormData('plan.destination_hospital_ward', e.target.value)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Vitals & Allergies Reviewed Checkbox */}
            <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData?.plan?.vitals_allergies_reviewed || false}
                  onChange={(e) => updateFormData('plan.vitals_allergies_reviewed', e.target.checked)}
                  className={`rounded w-4 h-4 text-emerald-600 focus:ring-emerald-500 ${
                    darkMode 
                      ? 'border-slate-600 bg-slate-700' 
                      : 'border-slate-300 bg-white'
                  }`}
                />
                <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('generalVisitReport.vitalsAllergiesReviewed')}</label>
              </div>
            </div>
          </div>
        </Card>

        {/* Visit Summary */}
        <Card title={t('generalVisitReport.summary')} defaultCollapsed={true} darkMode={darkMode}>
          <TextArea
            name="summary"
            placeholder={t('generalVisitReport.summaryPlaceholder')}
            value={formData?.summary || ''}
            onChange={(e) => updateFormData('summary', e.target.value)}
            rows={4}
            darkMode={darkMode}
          />
        </Card>
      </div>

    </div>
  );
};

export default GeneralVisitReport;
