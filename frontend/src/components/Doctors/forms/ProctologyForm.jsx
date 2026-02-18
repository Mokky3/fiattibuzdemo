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
          <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t ? t('proctologyForm.selectOption') : 'Select an option'}</option>
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
const FormSection = React.memo(({ title, children, bgColor = 'bg-white', darkMode = false }) => {
  const darkBgColor = darkMode ? 'bg-slate-800' : bgColor;
  return (
    <div className={`${darkBgColor} rounded-lg p-4 sm:p-6 mb-6 shadow-sm border ${darkMode ? 'border-slate-700' : 'border-gray-100'}`}>
      <h3 className={`text-lg sm:text-xl font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'} mb-4 sm:mb-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2`}>
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
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
          placeholder={t('proctologyForm.searchMedication')}
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

const ProctologyForm = ({ formData, setFormData, patient, onSave }) => {
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

  // Initialize form data with proper structure
  useEffect(() => {
    if (!formData.meta) {
      setFormData(prev => ({
        ...prev,
        doc_type: 'proctology.initial',
        meta: {
          clinic_id: localStorage.getItem('clinic_id') || '',
          department_id: 'proctology',
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

  // Auto-populate patient information
  useEffect(() => {
    if (patient && setFormData) {
      setFormData(prev => ({
        ...prev,
        patientName: patient.name || patient.first_name + ' ' + patient.last_name || '',
        dateOfBirth: patient.dob || patient.date_of_birth || '',
        age: patient.age || '',
        idMrn: patient.id || patient.mrn || '',
        contactNumber: patient.phoneNumber || patient.phone || '',
        address: patient.address || '',
        bloodPressure: patient.bloodPressure || patient.blood_pressure || '',
        temperature: patient.temperature || '',
        weight: patient.weight || '',
        height: patient.height || '',
        bmi: patient.bmi || '',
        meta: {
          ...prev.meta,
          patient_id: patient.patient_id || patient.id || prev.meta?.patient_id || '',
        }
      }));
    }
  }, [patient, setFormData]);

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

  // Build payload
  const buildPayload = useCallback(() => {
    return {
      doc_type: 'proctology.initial',
      meta: formData.meta || {
        clinic_id: localStorage.getItem('clinic_id') || '',
        department_id: 'proctology',
        physician_id: localStorage.getItem('user_id') || '',
        patient_id: patient?.patient_id || patient?.id || '',
        encounter_id: '',
        datetime: new Date().toISOString()
      },
      chief_complaint: formData.presentingComplaint,
      // Presenting Complaint & HPI
      presenting_complaint_hpi: {
        presenting_complaint: formData.presentingComplaint,
        duration_of_symptoms: formData.durationOfSymptoms,
        history_of_present_illness: formData.historyOfPresentIllness,
        pain_score: formData.painScore,
        pain_character: formData.painCharacter,
      },
      // Bowel Habit & Stool Characteristics
      bowel_habit: {
        frequency_of_bowel_movements: formData.frequencyOfBowelMovements,
        stool_consistency: formData.stoolConsistency,
        change_in_bowel_habits: formData.changeInBowelHabits,
        change_in_bowel_habits_description: formData.changeInBowelHabitsDescription,
        straining_during_defecation: formData.strainingDuringDefecation,
        feeling_of_incomplete_evacuation: formData.feelingOfIncompleteEvacuation,
        time_spent_on_toilet: formData.timeSpentOnToilet,
        use_of_laxatives_enemas: formData.useOfLaxativesEnemas,
        fecal_incontinence: formData.fecalIncontinence,
        fecal_incontinence_description: formData.fecalIncontinenceDescription,
      },
      // Rectal Bleeding & Discharge
      rectal_bleeding_discharge: {
        rectal_bleeding: formData.rectalBleeding,
        rectal_bleeding_onset_duration: formData.rectalBleedingOnsetDuration,
        rectal_bleeding_amount: formData.rectalBleedingAmount,
        rectal_bleeding_color: formData.rectalBleedingColor,
        rectal_bleeding_relation_to_defecation: formData.rectalBleedingRelationToDefecation,
        rectal_bleeding_frequency: formData.rectalBleedingFrequency,
        mucus_pus_discharge: formData.mucusPusDischarge,
        mucus_pus_discharge_description: formData.mucusPusDischargeDescription,
        soiling_leakage: formData.soilingLeakage,
        soiling_leakage_description: formData.soilingLeakageDescription,
      },
      // Anal Pain, Itching & Prolapse
      anal_symptoms: {
        anal_pain: formData.analPain,
        anal_pain_description: formData.analPainDescription,
        anal_itching: formData.analItching,
        anal_lump_swelling: formData.analLumpSwelling,
        anal_lump_swelling_description: formData.analLumpSwellingDescription,
        prolapse_from_anus: formData.prolapseFromAnus,
        prolapse_from_anus_description: formData.prolapseFromAnusDescription,
        history_of_perianal_abscess_fistula: formData.historyOfPerianalAbscessFistula,
        history_of_perianal_abscess_fistula_description: formData.historyOfPerianalAbscessFistulaDescription,
      },
      // Past Gastrointestinal & Proctologic History
      past_gi_proctologic_history: {
        previous_diagnoses: formData.previousDiagnoses,
        previous_anorectal_procedures_surgeries: formData.previousAnorectalProceduresSurgeries,
        previous_colonoscopy_sigmoidoscopy: formData.previousColonoscopySigmoidoscopy,
        history_of_trauma_or_sexual_abuse: formData.historyOfTraumaOrSexualAbuse,
      },
      // General Medical History
      general_medical_history: {
        medical_conditions: formData.medicalConditions,
        previous_non_gi_surgeries: formData.previousNonGISurgeries,
        allergies: formData.allergies,
        current_medications: formData.currentMedications || [],
        anticoagulant_antiplatelet_use: formData.anticoagulantAntiplateletUse,
        anticoagulant_antiplatelet_type_dose: formData.anticoagulantAntiplateletTypeDose,
        family_history: formData.familyHistory,
      },
      // Lifestyle & Risk Factors
      lifestyle_risk_factors: {
        dietary_habits: formData.dietaryHabits,
        fluid_intake: formData.fluidIntake,
        physical_activity: formData.physicalActivity,
        smoking: formData.smoking,
        alcohol_use: formData.alcoholUse,
        occupational_factors: formData.occupationalFactors,
      },
      // Review of Systems
      review_of_systems: {
        systemic_symptoms: formData.systemicSymptoms,
        abdominal_symptoms: formData.abdominalSymptoms,
        urinary_symptoms: formData.urinarySymptoms,
        neurological_musculoskeletal: formData.neurologicalMusculoskeletal,
      },
      // Physical Examination
      physical_examination: {
        general_abdominal: {
          general_appearance: formData.generalAppearance,
          signs_of_anemia_jaundice_edema: formData.signsOfAnemiaJaundiceEdema,
          abdominal_examination: formData.abdominalExamination,
        },
        perianal_rectal: {
          perianal_inspection: formData.perianalInspection,
          digital_rectal_examination: formData.digitalRectalExamination,
          sphincter_tone_at_rest: formData.sphincterToneAtRest,
          sphincter_tone_at_squeeze: formData.sphincterToneAtSqueeze,
          anal_canal_findings: formData.analCanalFindings,
          rectal_ampulla_findings: formData.rectalAmpullaFindings,
          prostate: formData.prostate,
          rectovaginal_exam: formData.rectovaginalExam,
        },
      },
      // Proctoscopy / Anoscopy / Sigmoidoscopy
      endoscopic_findings: {
        procedure_performed: formData.procedurePerformed,
        preparation_adequacy: formData.preparationAdequacy,
        findings: formData.endoscopicFindings,
        hemorrhoids: formData.hemorrhoids,
        fissures: formData.fissures,
        polyps_masses: formData.polypsMasses,
        inflammation: formData.inflammation,
        biopsies_taken: formData.biopsiesTaken,
        biopsies_taken_site_purpose: formData.biopsiesTakenSitePurpose,
      },
      // Investigations
      investigations: {
        laboratory_tests: formData.laboratoryTests,
        imaging: formData.imaging,
        endoscopy: formData.endoscopy,
        other_specialized_tests: formData.otherSpecializedTests,
      },
      // Diagnosis
      diagnosis: formData.diagnosis,
      diagnosis_codes: formData.diagnosisCodes || [],
      // Management Plan
      management_plan: {
        problem_list: formData.problemList,
        conservative_management: formData.conservativeManagement,
        medications_prescribed: formData.medicationsPrescribed || [],
        procedures_performed_today: formData.proceduresPerformedToday,
        surgical_plan_referrals: formData.surgicalPlanReferrals,
        pain_management_plan: formData.painManagementPlan,
        bowel_regimen_plan: formData.bowelRegimenPlan,
        follow_up_plan: formData.followUpPlan,
        follow_up_date: formData.followUpDate,
      },
      // Patient Education & Counselling
      patient_education: {
        counselling_provided: formData.counsellingProvided,
        advice_on_hygiene_lifestyle: formData.adviceOnHygieneLifestyle,
        warning_signs_explained: formData.warningSignsExplained,
        patient_questions_concerns: formData.patientQuestionsConcerns,
        patient_understanding_agreement: formData.patientUnderstandingAgreement,
        provider_notes: formData.providerNotes,
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
          <FormSection title={t('proctologyForm.presentingComplaintHistory')} bgColor="bg-blue-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.presentingComplaint')} name="presentingComplaint" placeholder={t('proctologyForm.presentingComplaintPlaceholder')} width="full" formData={formData} onChange={handleChange} required darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.durationOfSymptoms')} name="durationOfSymptoms" placeholder={t('proctologyForm.durationOfSymptomsPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.historyOfPresentIllness')} name="historyOfPresentIllness" type="textarea" placeholder={t('proctologyForm.historyOfPresentIllnessPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.painScore')} name="painScore" type="number" placeholder={t('proctologyForm.painScorePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.painCharacter')} name="painCharacter" type="textarea" placeholder={t('proctologyForm.painCharacterPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 2. Bowel Habit & Stool Characteristics */}
          <FormSection title={t('proctologyForm.bowelHabitStoolCharacteristics')} bgColor="bg-green-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.frequencyOfBowelMovements')} name="frequencyOfBowelMovements" placeholder={t('proctologyForm.frequencyOfBowelMovementsPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.stoolConsistency')} name="stoolConsistency" type="select" options={[t('proctologyForm.hard'), t('proctologyForm.normal'), t('proctologyForm.loose'), t('proctologyForm.watery'), t('proctologyForm.alternating')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.changeInBowelHabits')} name="changeInBowelHabits" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.changeInBowelHabits === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.changeInBowelHabitsDescription')} name="changeInBowelHabitsDescription" type="textarea" placeholder={t('proctologyForm.changeInBowelHabitsDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.strainingDuringDefecation')} name="strainingDuringDefecation" type="select" options={[t('proctologyForm.no'), t('proctologyForm.occasionally'), t('proctologyForm.often'), t('proctologyForm.always')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.feelingOfIncompleteEvacuation')} name="feelingOfIncompleteEvacuation" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.timeSpentOnToilet')} name="timeSpentOnToilet" placeholder={t('proctologyForm.timeSpentOnToiletPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.useOfLaxativesEnemas')} name="useOfLaxativesEnemas" type="textarea" placeholder={t('proctologyForm.useOfLaxativesEnemasPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.fecalIncontinence')} name="fecalIncontinence" type="select" options={[t('proctologyForm.none'), t('proctologyForm.gasOnly'), t('proctologyForm.minorSoiling'), t('proctologyForm.liquidStool'), t('proctologyForm.solidStool')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.fecalIncontinence && formData.fecalIncontinence !== t('proctologyForm.none') && (
              <FormField label={t('proctologyForm.fecalIncontinenceDetails')} name="fecalIncontinenceDetails" type="textarea" placeholder={t('proctologyForm.fecalIncontinenceDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
          </FormSection>

          {/* 3. Rectal Bleeding & Discharge */}
          <FormSection title={t('proctologyForm.rectalBleedingDischarge')} bgColor="bg-yellow-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.rectalBleeding')} name="rectalBleeding" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.rectalBleeding === t('proctologyForm.yes') && (
              <>
                <FormField label={t('proctologyForm.rectalBleedingOnsetDuration')} name="rectalBleedingOnsetDuration" placeholder={t('proctologyForm.rectalBleedingOnsetDurationPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.rectalBleedingAmount')} name="rectalBleedingAmount" type="select" options={[t('proctologyForm.streaksOnStool'), t('proctologyForm.drops'), t('proctologyForm.splashing'), t('proctologyForm.clots'), t('proctologyForm.mixedWithStool')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.rectalBleedingColor')} name="rectalBleedingColor" type="select" options={[t('proctologyForm.brightRed'), t('proctologyForm.darkRed'), t('proctologyForm.maroon'), t('proctologyForm.blackTarry')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.rectalBleedingRelationToDefecation')} name="rectalBleedingRelationToDefecation" type="textarea" placeholder={t('proctologyForm.rectalBleedingRelationToDefecationPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.rectalBleedingFrequency')} name="rectalBleedingFrequency" placeholder={t('proctologyForm.rectalBleedingFrequencyPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              </>
            )}
            <FormField label={t('proctologyForm.mucusPusDischarge')} name="mucusPusDischarge" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.mucusPusDischarge === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.mucusPusDischargeDescription')} name="mucusPusDischargeDescription" type="textarea" placeholder={t('proctologyForm.mucusPusDischargeDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.soilingLeakage')} name="soilingLeakage" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.soilingLeakage === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.soilingLeakageDescription')} name="soilingLeakageDescription" type="textarea" placeholder={t('proctologyForm.soilingLeakageDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
          </FormSection>

          {/* 4. Anal Pain, Itching & Prolapse */}
          <FormSection title={t('proctologyForm.analPainItchingProlapse')} bgColor="bg-purple-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.analPain')} name="analPain" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.analPain === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.analPainDescription')} name="analPainDescription" type="textarea" placeholder={t('proctologyForm.analPainDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.analItching')} name="analItching" type="select" options={[t('proctologyForm.no'), t('proctologyForm.mild'), t('proctologyForm.moderate'), t('proctologyForm.severe')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.analItching && formData.analItching !== t('proctologyForm.no') && (
              <FormField label={t('proctologyForm.analItchingDescription')} name="analItchingDescription" type="textarea" placeholder={t('proctologyForm.analItchingDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.analLumpSwelling')} name="analLumpSwelling" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.analLumpSwelling === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.analLumpSwellingDescription')} name="analLumpSwellingDescription" type="textarea" placeholder={t('proctologyForm.analLumpSwellingDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.prolapseFromAnus')} name="prolapseFromAnus" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.prolapseFromAnus === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.prolapseDescription')} name="prolapseDescription" type="textarea" placeholder={t('proctologyForm.prolapseDescriptionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.historyOfPerianalAbscessFistula')} name="historyOfPerianalAbscessFistula" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.historyOfPerianalAbscessFistula === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.perianalAbscessFistulaDetails')} name="perianalAbscessFistulaDetails" type="textarea" placeholder={t('proctologyForm.perianalAbscessFistulaDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
          </FormSection>

          {/* 5. Past Gastrointestinal & Proctologic History */}
          <FormSection title={t('proctologyForm.giProctologicHistory')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.previousDiagnoses')} name="previousDiagnoses" type="textarea" placeholder={t('proctologyForm.previousDiagnosesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.previousAnorectalProcedures')} name="previousAnorectalProcedures" type="textarea" placeholder={t('proctologyForm.previousAnorectalProceduresPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.previousColonoscopySigmoidoscopy')} name="previousColonoscopySigmoidoscopy" type="textarea" placeholder={t('proctologyForm.previousColonoscopySigmoidoscopyPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.historyOfTraumaOrSexualAbuse')} name="historyOfTraumaOrSexualAbuse" type="textarea" placeholder={t('proctologyForm.historyOfTraumaOrSexualAbusePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 6. General Medical, Surgical, Medication & Family History */}
          <FormSection title={t('proctologyForm.generalMedicalHistory')} bgColor="bg-red-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.medicalConditions')} name="medicalConditions" type="textarea" placeholder={t('proctologyForm.medicalConditionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.previousNonGISurgeries')} name="previousNonGISurgeries" type="textarea" placeholder={t('proctologyForm.previousNonGISurgeriesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.allergies')} name="allergies" type="textarea" placeholder={t('proctologyForm.allergiesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="col-span-full">
              <MedicationListField label={t('proctologyForm.currentMedications')} name="currentMedications" value={formData.currentMedications || ''} onChange={handleChange} formData={formData} darkMode={darkMode} />
              {patientMedications.length > 0 && (
                <div className={`mt-2 p-3 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{t('proctologyForm.fromPatientRecord') || 'From Patient Record'}</div>
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
                    {t('proctologyForm.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
            </div>
            <FormField label={t('proctologyForm.anticoagulantAntiplateletUse')} name="anticoagulantAntiplateletUse" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.anticoagulantAntiplateletUse === t('proctologyForm.yes') && (
              <FormField label={t('proctologyForm.anticoagulantAntiplateletDetails')} name="anticoagulantAntiplateletDetails" type="textarea" placeholder={t('proctologyForm.anticoagulantAntiplateletDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.familyHistory')} name="familyHistory" type="textarea" placeholder={t('proctologyForm.familyHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 7. Lifestyle & Risk Factors */}
          <FormSection title={t('proctologyForm.lifestyleRiskFactors')} bgColor="bg-teal-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.dietaryHabits')} name="dietaryHabits" type="textarea" placeholder={t('proctologyForm.dietaryHabitsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.fluidIntake')} name="fluidIntake" placeholder={t('proctologyForm.fluidIntakePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.physicalActivity')} name="physicalActivity" type="select" options={[t('proctologyForm.sedentary'), t('proctologyForm.light'), t('proctologyForm.moderate'), t('proctologyForm.high')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.smoking')} name="smoking" type="select" options={[t('proctologyForm.never'), t('proctologyForm.former'), t('proctologyForm.current')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.smoking && formData.smoking !== t('proctologyForm.never') && (
              <FormField label={t('proctologyForm.smokingDetails')} name="smokingDetails" type="textarea" placeholder={t('proctologyForm.smokingDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('proctologyForm.alcoholUse')} name="alcoholUse" type="textarea" placeholder={t('proctologyForm.alcoholUsePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.occupationalFactors')} name="occupationalFactors" type="textarea" placeholder={t('proctologyForm.occupationalFactorsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 8. Review of Systems (Focused) */}
          <FormSection title={t('proctologyForm.reviewOfSystems')} bgColor="bg-pink-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.systemicSymptoms')} name="systemicSymptoms" type="textarea" placeholder={t('proctologyForm.systemicSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.abdominalSymptoms')} name="abdominalSymptoms" type="textarea" placeholder={t('proctologyForm.abdominalSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.urinarySymptoms')} name="urinarySymptoms" type="textarea" placeholder={t('proctologyForm.urinarySymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.neurologicalMusculoskeletal')} name="neurologicalMusculoskeletal" type="textarea" placeholder={t('proctologyForm.neurologicalMusculoskeletalPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 9. Physical Examination */}
          <FormSection title={t('proctologyForm.physicalExamination')} bgColor="bg-orange-50" darkMode={darkMode}>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('proctologyForm.generalAbdominalExamination')}</h4>
            </div>
            <FormField label={t('proctologyForm.generalAppearance')} name="generalAppearance" type="textarea" placeholder={t('proctologyForm.generalAppearancePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.signsOfAnemiaJaundiceEdema')} name="signsOfAnemiaJaundiceEdema" type="textarea" placeholder={t('proctologyForm.signsOfAnemiaJaundiceEdemaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.abdominalExamination')} name="abdominalExamination" type="textarea" placeholder={t('proctologyForm.abdominalExaminationPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 10. Perianal & Digital Rectal Examination */}
          <FormSection title={t('proctologyForm.perianalRectalExamination')} bgColor="bg-purple-50" darkMode={darkMode}>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('proctologyForm.perianalInspection')}</h4>
            </div>
            <FormField label={t('proctologyForm.perianalSkinArea')} name="perianalSkinArea" type="textarea" placeholder={t('proctologyForm.perianalSkinAreaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.externalHemorrhoids')} name="externalHemorrhoids" type="textarea" placeholder={t('proctologyForm.externalHemorrhoidsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.fissures')} name="fissures" type="textarea" placeholder={t('proctologyForm.fissuresPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.fistulaOpenings')} name="fistulaOpenings" type="textarea" placeholder={t('proctologyForm.fistulaOpeningsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.abscessSwelling')} name="abscessSwelling" type="textarea" placeholder={t('proctologyForm.abscessSwellingPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.rectalProlapseMucosalProlapse')} name="rectalProlapseMucosalProlapse" type="textarea" placeholder={t('proctologyForm.rectalProlapseMucosalProlapsePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('proctologyForm.digitalRectalExamination')}</h4>
            </div>
            <FormField label={t('proctologyForm.sphincterToneAtRest')} name="sphincterToneAtRest" type="select" options={[t('proctologyForm.normal'), t('proctologyForm.reduced'), t('proctologyForm.increased'), t('proctologyForm.notAssessed')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.sphincterToneOnSqueeze')} name="sphincterToneOnSqueeze" type="select" options={[t('proctologyForm.normal'), t('proctologyForm.reduced'), t('proctologyForm.notAssessed')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.analCanalFindings')} name="analCanalFindings" type="textarea" placeholder={t('proctologyForm.analCanalFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.rectalAmpullaFindings')} name="rectalAmpullaFindings" type="textarea" placeholder={t('proctologyForm.rectalAmpullaFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.prostateFindings')} name="prostateFindings" type="textarea" placeholder={t('proctologyForm.prostateFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.rectovaginalExamFindings')} name="rectovaginalExamFindings" type="textarea" placeholder={t('proctologyForm.rectovaginalExamFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 11. Proctoscopy / Anoscopy / Sigmoidoscopy */}
          <FormSection title={t('proctologyForm.endoscopicAnorectalFindings')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.procedurePerformed')} name="procedurePerformed" type="select" options={[t('proctologyForm.none'), t('proctologyForm.anoscopy'), t('proctologyForm.proctoscopy'), t('proctologyForm.flexibleSigmoidoscopy')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.procedurePerformed && formData.procedurePerformed !== t('proctologyForm.none') && (
              <>
                <FormField label={t('proctologyForm.preparationAdequacy')} name="preparationAdequacy" type="select" options={[t('proctologyForm.adequate'), t('proctologyForm.inadequate')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.endoscopicFindingsHemorrhoids')} name="endoscopicFindingsHemorrhoids" type="textarea" placeholder={t('proctologyForm.endoscopicFindingsHemorrhoidsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.endoscopicFindingsFissures')} name="endoscopicFindingsFissures" type="textarea" placeholder={t('proctologyForm.endoscopicFindingsFissuresPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.endoscopicFindingsPolypsMasses')} name="endoscopicFindingsPolypsMasses" type="textarea" placeholder={t('proctologyForm.endoscopicFindingsPolypsMassesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.endoscopicFindingsInflammation')} name="endoscopicFindingsInflammation" type="textarea" placeholder={t('proctologyForm.endoscopicFindingsInflammationPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('proctologyForm.biopsiesTaken')} name="biopsiesTaken" type="select" options={[t('proctologyForm.no'), t('proctologyForm.yes')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                {formData.biopsiesTaken === t('proctologyForm.yes') && (
                  <FormField label={t('proctologyForm.biopsiesDetails')} name="biopsiesDetails" type="textarea" placeholder={t('proctologyForm.biopsiesDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                )}
              </>
            )}
          </FormSection>

          {/* 12. Investigations */}
          <FormSection title={t('proctologyForm.investigations')} bgColor="bg-teal-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.laboratoryTests')} name="laboratoryTests" type="textarea" placeholder={t('proctologyForm.laboratoryTestsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.imaging')} name="imaging" type="textarea" placeholder={t('proctologyForm.imagingPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.endoscopy')} name="endoscopy" type="textarea" placeholder={t('proctologyForm.endoscopyPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.otherSpecializedTests')} name="otherSpecializedTests" type="textarea" placeholder={t('proctologyForm.otherSpecializedTestsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 13. Diagnosis (ICD-11) */}
          <FormSection title={t('proctologyForm.diagnosis')} bgColor="bg-pink-50" darkMode={darkMode}>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('proctologyForm.mainDiagnosis')} <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {formData.diagnosis && typeof formData.diagnosis === 'object' && (formData.diagnosis.code || formData.diagnosis.term) ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <input
                        type="text"
                        placeholder={t('proctologyForm.icd11Code')}
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
                        placeholder={t('proctologyForm.diagnosisTerm')}
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
                      {t('proctologyForm.clear')}
                    </button>
                  </div>
                ) : null}
                <IcdCodeSearchInput
                  placeholder={t('proctologyForm.searchIcdCode')}
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
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('proctologyForm.additionalDiagnosisCodes')}</label>
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
                  placeholder={t('proctologyForm.searchIcdCodeToAdd')}
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

          {/* 14. Management Plan */}
          <FormSection title={t('proctologyForm.managementPlan')} bgColor="bg-orange-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.problemList')} name="problemList" type="textarea" placeholder={t('proctologyForm.problemListPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.conservativeManagement')} name="conservativeManagement" type="textarea" placeholder={t('proctologyForm.conservativeManagementPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <MedicationListField label={t('proctologyForm.medicationsPrescribed')} name="medicationsPrescribed" value={formData.medicationsPrescribed || ''} onChange={handleChange} formData={formData} darkMode={darkMode} />
            <FormField label={t('proctologyForm.proceduresPerformedToday')} name="proceduresPerformedToday" type="textarea" placeholder={t('proctologyForm.proceduresPerformedTodayPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.surgicalPlanReferrals')} name="surgicalPlanReferrals" type="textarea" placeholder={t('proctologyForm.surgicalPlanReferralsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.painManagementPlan')} name="painManagementPlan" type="textarea" placeholder={t('proctologyForm.painManagementPlanPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.bowelRegimenPlan')} name="bowelRegimenPlan" type="textarea" placeholder={t('proctologyForm.bowelRegimenPlanPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.followUpPlan')} name="followUpPlan" type="textarea" placeholder={t('proctologyForm.followUpPlanPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.followUpDate')} name="followUpDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 15. Patient Education, Counselling & Sign-off */}
          <FormSection title={t('proctologyForm.counsellingSignOff')} bgColor="bg-gray-50" darkMode={darkMode}>
            <FormField label={t('proctologyForm.counsellingProvided')} name="counsellingProvided" type="textarea" placeholder={t('proctologyForm.counsellingProvidedPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.adviceOnHygieneLifestyle')} name="adviceOnHygieneLifestyle" type="textarea" placeholder={t('proctologyForm.adviceOnHygieneLifestylePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.warningSignsExplained')} name="warningSignsExplained" type="textarea" placeholder={t('proctologyForm.warningSignsExplainedPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.patientQuestionsConcerns')} name="patientQuestionsConcerns" type="textarea" placeholder={t('proctologyForm.patientQuestionsConcernsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.patientUnderstandingAgreement')} name="patientUnderstandingAgreement" type="select" options={[t('proctologyForm.understandsAgrees'), t('proctologyForm.needsFurtherExplanation'), t('proctologyForm.declinedRecommendedTreatment')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.providerNotes')} name="providerNotes" type="textarea" placeholder={t('proctologyForm.providerNotesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.providerSignature')} name="providerSignature" placeholder={t('proctologyForm.providerSignaturePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('proctologyForm.documentationDateTime')} name="documentationDateTime" type="datetime-local" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

        </div>
      </div>
      
      {/* Sticky Footer */}
      <div className={`sticky bottom-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-t p-4 shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastSaved && `${t('proctologyForm.lastSaved') || 'Last saved'}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('proctologyForm.saveDraft')}
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
              {t('proctologyForm.submitForm')}
            </button>
          </div>
        </div>
      </div>
      
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {t('proctologyForm.draftSavedSuccessfully')}
        </div>
      )}
    </div>
  );
};

export default ProctologyForm;

