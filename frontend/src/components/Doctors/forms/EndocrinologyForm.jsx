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
          <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t ? t('endocrinologyForm.selectOption') : 'Select an option'}</option>
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

// Checkbox Group Component
const CheckboxGroup = ({ label, name, options, formData, onChange, darkMode = false, t }) => {
  const handleCheckboxChange = (option) => {
    const current = formData[name] || [];
    const newValue = current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option];
    onChange({
      target: { name, value: newValue }
    });
  };

  return (
    <div className="w-full px-2 mb-3">
      <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <label key={index} className="flex items-center">
            <input
              type="checkbox"
              checked={(formData[name] || []).includes(option)}
              onChange={() => handleCheckboxChange(option)}
              className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
            />
            <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

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

const EndocrinologyForm = ({ formData, setFormData, patient, onSave }) => {
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
        doc_type: 'endocrinology.initial',
        meta: {
          clinic_id: localStorage.getItem('clinic_id') || '',
          department_id: 'endocrinology',
          physician_id: localStorage.getItem('user_id') || '',
          patient_id: patient?.patient_id || patient?.id || '',
          encounter_id: '',
          datetime: new Date().toISOString()
        },
        diagnosis: prev.diagnosis || { code: '', term: '' },
        diagnosisCodes: prev.diagnosisCodes || [],
        primaryEndocrineProblem: prev.primaryEndocrineProblem || [],
        currentTreatmentRegimen: prev.currentTreatmentRegimen || [],
        microvascularComplications: prev.microvascularComplications || [],
        macrovascularComplications: prev.macrovascularComplications || [],
        footProblems: prev.footProblems || [],
        thyroidKeySymptoms: prev.thyroidKeySymptoms || [],
        eyeSignsGraves: prev.eyeSignsGraves || [],
        fragilityFracturesHistory: prev.fragilityFracturesHistory || [],
        boneRiskFactors: prev.boneRiskFactors || [],
        lifestyleCounsellingProvided: prev.lifestyleCounsellingProvided || [],
        diabetesEducation: prev.diabetesEducation || [],
        labsReviewedToday: prev.labsReviewedToday || [],
        imagingReviewedOrdered: prev.imagingReviewedOrdered || [],
        referrals: prev.referrals || [],
        documentationDateTime: prev.documentationDateTime || new Date().toISOString().slice(0, 16),
      }));
    }
  }, []);

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
        meta: {
          ...prev.meta,
          patient_id: patient.patient_id || patient.id || prev.meta?.patient_id || '',
        }
      }));
    }
  }, [patient, setFormData]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, [setFormData]);

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

  // Determine which sections to show based on selected problems
  const showDiabetesSection = (formData.primaryEndocrineProblem || []).includes(t('endocrinologyForm.diabetes'));
  const showThyroidSection = (formData.primaryEndocrineProblem || []).includes(t('endocrinologyForm.thyroidDisorder'));

  // Validation
  const validateForm = useCallback(() => {
    if (!formData.mainReasonForVisit || !formData.mainReasonForVisit.trim()) {
      alert(t('endocrinologyForm.mainReasonForVisit') + ' is required.');
      return false;
    }
    if (!formData.diagnosis || !formData.diagnosis.code || !formData.diagnosis.term) {
      alert(t('endocrinologyForm.mainEndocrineDiagnosis') + ' is required.');
      return false;
    }
    return true;
  }, [formData]);

  // Build payload
  const buildPayload = useCallback(() => {
    return {
      doc_type: 'endocrinology.initial',
      meta: formData.meta || {
        clinic_id: localStorage.getItem('clinic_id') || '',
        department_id: 'endocrinology',
        physician_id: localStorage.getItem('user_id') || '',
        patient_id: patient?.patient_id || patient?.id || '',
        encounter_id: '',
        datetime: new Date().toISOString()
      },
      chief_complaint: formData.mainReasonForVisit,
      visit_type: formData.visitType,
      primary_endocrine_problem: formData.primaryEndocrineProblem || [],
      // Diabetes section
      diabetes: showDiabetesSection ? {
        diabetes_type: formData.diabetesType,
        year_of_diagnosis: formData.yearOfDiagnosis,
        current_treatment_regimen: formData.currentTreatmentRegimen || [],
        adherence: formData.adherence,
        self_monitoring: formData.selfMonitoring,
        typical_home_glucose_profile: formData.typicalHomeGlucoseProfile,
        recent_hba1c: formData.recentHbA1c,
        date_of_last_hba1c: formData.dateOfLastHbA1c,
        hypoglycemia_episodes: formData.hypoglycemiaEpisodes,
        hypoglycemia_unawareness: formData.hypoglycemiaUnawareness || false,
        history_of_dka_or_hhs: formData.historyOfDKAOrHHS,
        dka_hhs_year: formData.dkaHhsYear,
        microvascular_complications: formData.microvascularComplications || [],
        macrovascular_complications: formData.macrovascularComplications || [],
        foot_problems: formData.footProblems || [],
        last_eye_exam_date: formData.lastEyeExamDate,
        last_urine_albumin_test_date: formData.lastUrineAlbuminTestDate,
      } : undefined,
      // Thyroid section
      thyroid: showThyroidSection ? {
        main_thyroid_syndrome: formData.mainThyroidSyndrome,
        key_symptoms: formData.thyroidKeySymptoms || [],
        duration_of_symptoms: formData.durationOfThyroidSymptoms,
        goiter: formData.goiter,
        nodules_palpable: formData.nodulesPalpable,
        eye_signs_graves: formData.eyeSignsGraves || [],
        thyroid_tenderness: formData.thyroidTenderness,
        latest_thyroid_function_summary: formData.latestThyroidFunctionSummary,
        thyroid_us_fnab_done: formData.thyroidUSFNABDone,
        main_ultrasound_impression: formData.mainUltrasoundImpression,
      } : undefined,
      // Obesity & Metabolic
      obesity_metabolic: {
        weight_trend: formData.weightTrend,
        waist_circumference: formData.waistCircumference,
        suspected_metabolic_syndrome: formData.suspectedMetabolicSyndrome || false,
        physical_activity: formData.physicalActivity,
        dietary_pattern: formData.dietaryPattern,
        smoking_status: formData.smokingStatus,
        sleep_apnea_suspicion: formData.sleepApneaSuspicion || [],
        known_dyslipidemia: formData.knownDyslipidemia,
        on_statin_therapy: formData.onStatinTherapy,
        lipid_control_summary: formData.lipidControlSummary,
      },
      // Reproductive
      reproductive: {
        show_female: formData.showFemaleReproductive || false,
        show_male: formData.showMaleReproductive || false,
        female: formData.showFemaleReproductive ? {
          menstrual_pattern: formData.menstrualPattern,
          parity_obstetric_history: formData.parityObstetricHistory,
          suspicion_diagnosis_pcos: formData.suspicionDiagnosisPCOS || false,
          signs_of_hyperandrogenism: formData.signsOfHyperandrogenism || [],
          infertility_workup_status: formData.infertilityWorkupStatus,
          key_hormone_abnormalities: formData.keyHormoneAbnormalitiesFemale,
        } : undefined,
        male: formData.showMaleReproductive ? {
          main_complaint: formData.maleMainComplaint,
          duration_of_symptoms: formData.maleDurationOfSymptoms,
          testicular_genital_exam_summary: formData.testicularGenitalExamSummary,
          key_hormone_results: formData.keyHormoneResultsMale,
        } : undefined,
      },
      // Bone & Calcium
      bone_calcium: {
        fragility_fractures_history: formData.fragilityFracturesHistory || [],
        risk_factors: formData.boneRiskFactors || [],
        dexa_status: formData.dexaStatus,
        dexa_summary: formData.dexaSummary,
        calcium_vitamin_d_status: formData.calciumVitaminDStatus,
      },
      // Physical Exam
      physical_exam: {
        general_appearance: formData.generalAppearance,
        skin_hair: formData.skinHair,
        fat_distribution: formData.fatDistribution,
        edema: formData.edema,
        other_key_signs: formData.otherKeySigns,
      },
      // Investigations
      investigations: {
        labs_reviewed_today: formData.labsReviewedToday || [],
        main_interpretation_abnormalities: formData.mainInterpretationAbnormalities,
        imaging_reviewed_ordered: formData.imagingReviewedOrdered || [],
        key_imaging_impressions: formData.keyImagingImpressions,
      },
      // Diagnosis
      diagnosis: formData.diagnosis,
      diagnosis_codes: formData.diagnosisCodes || [],
      disease_status: formData.diseaseStatus,
      // Management Plan
      management_plan: {
        medication_changes_made_today: formData.medicationChangesMadeToday,
        new_prescriptions: formData.newPrescriptions,
        lifestyle_counselling_provided: formData.lifestyleCounsellingProvided || [],
        diabetes_education: formData.diabetesEducation || [],
        target_hba1c: formData.targetHbA1c,
        next_lab_checks: formData.nextLabChecks,
        next_lab_checks_other: formData.nextLabChecksOther,
        next_clinic_visit: formData.nextClinicVisit,
        referrals: formData.referrals || [],
        reason_for_referral: formData.reasonForReferral,
        patient_instructions: formData.patientInstructions,
      },
    };
  }, [formData, showDiabetesSection, showThyroidSection, patient]);

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
          {/* 1. Visit Context */}
          <FormSection title={t('endocrinologyForm.visitContext')} bgColor="bg-blue-50" darkMode={darkMode}>
            <FormField label={t('endocrinologyForm.visitType')} name="visitType" type="select" options={[t('endocrinologyForm.newConsultation'), t('endocrinologyForm.followUp'), t('endocrinologyForm.postHospitalFollowUp')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.mainReasonForVisit')} name="mainReasonForVisit" placeholder={t('endocrinologyForm.mainReasonForVisitPlaceholder')} width="full" formData={formData} onChange={handleChange} required darkMode={darkMode} t={t} />
            <CheckboxGroup
              label={t('endocrinologyForm.primaryEndocrineProblem')}
              name="primaryEndocrineProblem"
              options={[t('endocrinologyForm.diabetes'), t('endocrinologyForm.thyroidDisorder'), t('endocrinologyForm.obesity'), t('endocrinologyForm.metabolicSyndrome'), t('endocrinologyForm.lipidDisorder'), t('endocrinologyForm.pituitary'), t('endocrinologyForm.adrenal'), t('endocrinologyForm.reproductive'), t('endocrinologyForm.gonadal'), t('endocrinologyForm.bone'), t('endocrinologyForm.calcium'), t('endocrinologyForm.other')]}
              formData={formData}
              onChange={handleChange}
              darkMode={darkMode}
              t={t}
            />
          </FormSection>

          {/* 2. Diabetes Section */}
          {showDiabetesSection && (
            <FormSection title={t('endocrinologyForm.diabetesSection')} bgColor="bg-green-50" darkMode={darkMode}>
              <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
                <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.diabetesProfile')}</h4>
              </div>
              <FormField label={t('endocrinologyForm.diabetesType')} name="diabetesType" type="select" options={[t('endocrinologyForm.type1'), t('endocrinologyForm.type2'), t('endocrinologyForm.gestational'), t('endocrinologyForm.mody'), t('endocrinologyForm.other'), t('endocrinologyForm.unknown')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.yearOfDiagnosis')} name="yearOfDiagnosis" type="number" placeholder={t('endocrinologyForm.yearPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <CheckboxGroup
                label={t('endocrinologyForm.currentTreatmentRegimen')}
                name="currentTreatmentRegimen"
                options={[t('endocrinologyForm.lifestyleOnly'), t('endocrinologyForm.metformin'), t('endocrinologyForm.otherOralAgents'), t('endocrinologyForm.glp1Ra'), t('endocrinologyForm.basalInsulin'), t('endocrinologyForm.basalBolus'), t('endocrinologyForm.premixInsulin'), t('endocrinologyForm.insulinPump')]}
                formData={formData}
                onChange={handleChange}
                darkMode={darkMode}
                t={t}
              />
              <FormField label={t('endocrinologyForm.adherence')} name="adherence" type="select" options={[t('endocrinologyForm.good'), t('endocrinologyForm.irregular'), t('endocrinologyForm.poor')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
                <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.glycemicControl')}</h4>
              </div>
              <FormField label={t('endocrinologyForm.selfMonitoring')} name="selfMonitoring" type="select" options={[t('endocrinologyForm.notDone'), t('endocrinologyForm.occasionally'), t('endocrinologyForm.regularly')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.typicalHomeGlucoseProfile')} name="typicalHomeGlucoseProfile" type="textarea" placeholder={t('endocrinologyForm.typicalHomeGlucoseProfilePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.recentHbA1c')} name="recentHbA1c" type="number" placeholder={t('endocrinologyForm.percentPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.dateOfLastHbA1c')} name="dateOfLastHbA1c" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
                <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.hypoglycemiaKetoacidosis')}</h4>
              </div>
              <FormField label={t('endocrinologyForm.hypoglycemiaEpisodes')} name="hypoglycemiaEpisodes" type="select" options={[t('endocrinologyForm.none'), t('endocrinologyForm.occasionalMild'), t('endocrinologyForm.recurrent'), t('endocrinologyForm.severeNeededHelp')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.hypoglycemiaUnawareness')} name="hypoglycemiaUnawareness" type="checkbox" placeholder={t('endocrinologyForm.hypoglycemiaUnawareness')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.historyOfDKAOrHHS')} name="historyOfDKAOrHHS" type="select" options={[t('endocrinologyForm.no'), t('endocrinologyForm.dka'), t('endocrinologyForm.hhs'), t('endocrinologyForm.both')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              {formData.historyOfDKAOrHHS && formData.historyOfDKAOrHHS !== t('endocrinologyForm.no') && (
                <FormField label={t('endocrinologyForm.dkaHhsYear')} name="dkaHhsYear" placeholder={t('endocrinologyForm.yearPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              )}
              <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
                <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.diabetesComplications')}</h4>
              </div>
              <CheckboxGroup
                label={t('endocrinologyForm.microvascularComplications')}
                name="microvascularComplications"
                options={[t('endocrinologyForm.retinopathy'), t('endocrinologyForm.nephropathy'), t('endocrinologyForm.peripheralNeuropathy'), t('endocrinologyForm.autonomicNeuropathy')]}
                formData={formData}
                onChange={handleChange}
                darkMode={darkMode}
                t={t}
              />
              <CheckboxGroup
                label={t('endocrinologyForm.macrovascularComplications')}
                name="macrovascularComplications"
                options={[t('endocrinologyForm.ihd'), t('endocrinologyForm.mi'), t('endocrinologyForm.stroke'), t('endocrinologyForm.tia'), t('endocrinologyForm.peripheralArterialDisease')]}
                formData={formData}
                onChange={handleChange}
                darkMode={darkMode}
                t={t}
              />
              <CheckboxGroup
                label={t('endocrinologyForm.footProblems')}
                name="footProblems"
                options={[t('endocrinologyForm.noUlcer'), t('endocrinologyForm.currentUlcer'), t('endocrinologyForm.healedUlcer'), t('endocrinologyForm.amputation')]}
                formData={formData}
                onChange={handleChange}
                darkMode={darkMode}
                t={t}
              />
              <FormField label={t('endocrinologyForm.lastEyeExamDate')} name="lastEyeExamDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.lastUrineAlbuminTestDate')} name="lastUrineAlbuminTestDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            </FormSection>
          )}

          {/* 3. Thyroid Section */}
          {showThyroidSection && (
            <FormSection title={t('endocrinologyForm.thyroidSection')} bgColor="bg-yellow-50" darkMode={darkMode}>
              <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
                <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.thyroidSymptoms')}</h4>
              </div>
              <FormField label={t('endocrinologyForm.mainThyroidSyndrome')} name="mainThyroidSyndrome" type="select" options={[t('endocrinologyForm.hypothyroidism'), t('endocrinologyForm.hyperthyroidism'), t('endocrinologyForm.goiter'), t('endocrinologyForm.nodules'), t('endocrinologyForm.thyroiditis'), t('endocrinologyForm.other')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <CheckboxGroup
                label={t('endocrinologyForm.keySymptoms')}
                name="thyroidKeySymptoms"
                options={[t('endocrinologyForm.weightGain'), t('endocrinologyForm.weightLoss'), t('endocrinologyForm.heatIntolerance'), t('endocrinologyForm.coldIntolerance'), t('endocrinologyForm.palpitations'), t('endocrinologyForm.tremor'), t('endocrinologyForm.fatigue'), t('endocrinologyForm.constipation'), t('endocrinologyForm.diarrhea'), t('endocrinologyForm.neckSwelling'), t('endocrinologyForm.dysphagia'), t('endocrinologyForm.voiceChange')]}
                formData={formData}
                onChange={handleChange}
                darkMode={darkMode}
                t={t}
              />
              <FormField label={t('endocrinologyForm.durationOfSymptoms')} name="durationOfThyroidSymptoms" placeholder={t('endocrinologyForm.durationOfSymptomsPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
                <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.thyroidExamination')}</h4>
              </div>
              <FormField label={t('endocrinologyForm.goiterSize')} name="goiter" type="select" options={[t('endocrinologyForm.none'), t('endocrinologyForm.small'), t('endocrinologyForm.visible'), t('endocrinologyForm.veryLarge')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.nodulesPalpable')} name="nodulesPalpable" type="select" options={[t('endocrinologyForm.no'), t('endocrinologyForm.single'), t('endocrinologyForm.multiple')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <CheckboxGroup
                label={t('endocrinologyForm.eyeSignsGraves')}
                name="eyeSignsGraves"
                options={[t('endocrinologyForm.lidRetraction'), t('endocrinologyForm.exophthalmos'), t('endocrinologyForm.diplopia'), t('endocrinologyForm.none')]}
                formData={formData}
                onChange={handleChange}
                darkMode={darkMode}
                t={t}
              />
              <FormField label={t('endocrinologyForm.thyroidTenderness')} name="thyroidTenderness" type="select" options={[t('endocrinologyForm.yes'), t('endocrinologyForm.no')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
                <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.keyThyroidLabs')}</h4>
              </div>
              <FormField label={t('endocrinologyForm.latestThyroidFunctionSummary')} name="latestThyroidFunctionSummary" type="textarea" placeholder={t('endocrinologyForm.latestThyroidFunctionSummaryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              <FormField label={t('endocrinologyForm.thyroidUSFNABDone')} name="thyroidUSFNABDone" type="select" options={[t('endocrinologyForm.no'), t('endocrinologyForm.usOnly'), t('endocrinologyForm.fineNeedleBiopsy')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              {formData.thyroidUSFNABDone && formData.thyroidUSFNABDone !== t('endocrinologyForm.no') && (
                <FormField label={t('endocrinologyForm.mainUltrasoundImpression')} name="mainUltrasoundImpression" type="textarea" placeholder={t('endocrinologyForm.mainUltrasoundImpressionPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              )}
            </FormSection>
          )}

          {/* 4. Obesity & Metabolic / Lipid Section */}
          <FormSection title={t('endocrinologyForm.obesityMetabolicLipidSection')} bgColor="bg-purple-50" darkMode={darkMode}>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.anthropometryMetabolicStatus')}</h4>
            </div>
            <FormField label={t('endocrinologyForm.weightTrend')} name="weightTrend" type="select" options={[t('endocrinologyForm.stable'), t('endocrinologyForm.gradualGain'), t('endocrinologyForm.rapidGain'), t('endocrinologyForm.weightLoss')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.waistCircumference')} name="waistCircumference" type="number" placeholder="cm" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.suspectedMetabolicSyndrome')} name="suspectedMetabolicSyndrome" type="checkbox" placeholder={t('endocrinologyForm.suspectedMetabolicSyndrome')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.lifestyleRiskFactors')}</h4>
            </div>
            <FormField label={t('endocrinologyForm.physicalActivity')} name="physicalActivity" type="select" options={[t('endocrinologyForm.sedentary'), t('endocrinologyForm.light'), t('endocrinologyForm.moderate'), t('endocrinologyForm.intense')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.dietaryPattern')} name="dietaryPattern" type="textarea" placeholder={t('endocrinologyForm.dietaryPatternPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.smokingStatus')} name="smokingStatus" type="select" options={[t('endocrinologyForm.never'), t('endocrinologyForm.former'), t('endocrinologyForm.current')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{t('endocrinologyForm.sleepApneaSuspicion')}</label>
              <div className="flex flex-wrap gap-2">
                {[t('endocrinologyForm.snoring'), t('endocrinologyForm.pauses'), t('endocrinologyForm.daytimeSleepiness')].map(symptom => (
                  <label key={symptom} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.sleepApneaSuspicion || []).includes(symptom)}
                      onChange={(e) => {
                        const current = formData.sleepApneaSuspicion || [];
                        const newValue = e.target.checked
                          ? [...current, symptom]
                          : current.filter(item => item !== symptom);
                        handleChange({
                          target: { name: 'sleepApneaSuspicion', value: newValue }
                        });
                      }}
                      className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                    />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{symptom}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.lipidStatus')}</h4>
            </div>
            <FormField label={t('endocrinologyForm.knownDyslipidemia')} name="knownDyslipidemia" type="select" options={[t('endocrinologyForm.yes'), t('endocrinologyForm.no')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.onStatinTherapy')} name="onStatinTherapy" type="select" options={[t('endocrinologyForm.yes'), t('endocrinologyForm.no'), t('endocrinologyForm.intolerant')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.lipidControlSummary')} name="lipidControlSummary" placeholder={t('endocrinologyForm.lipidControlSummaryPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 5. Reproductive / Gonadal Endocrinology */}
          <FormSection title={t('endocrinologyForm.reproductiveGonadalEndocrinology')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{t('endocrinologyForm.showSection')}</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.showFemaleReproductive || false}
                    onChange={(e) => handleChange({ target: { name: 'showFemaleReproductive', value: e.target.checked } })}
                    className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{t('endocrinologyForm.femaleReproductive')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.showMaleReproductive || false}
                    onChange={(e) => handleChange({ target: { name: 'showMaleReproductive', value: e.target.checked } })}
                    className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                  />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{t('endocrinologyForm.maleReproductive')}</span>
                </label>
              </div>
            </div>
            {formData.showFemaleReproductive && (
              <>
                <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
                  <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.femalePCOSInfertility')}</h4>
                </div>
                <FormField label={t('endocrinologyForm.menstrualPattern')} name="menstrualPattern" type="select" options={[t('endocrinologyForm.regular'), t('endocrinologyForm.oligomenorrhea'), t('endocrinologyForm.amenorrhea'), t('endocrinologyForm.heavy'), t('endocrinologyForm.irregular')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('endocrinologyForm.parityObstetricHistory')} name="parityObstetricHistory" placeholder={t('endocrinologyForm.parityObstetricHistoryPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('endocrinologyForm.suspicionDiagnosisPCOS')} name="suspicionDiagnosisPCOS" type="checkbox" placeholder={t('endocrinologyForm.suspicionDiagnosisPCOS')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <div className="w-full px-2 mb-3">
                  <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{t('endocrinologyForm.signsOfHyperandrogenism')}</label>
                  <div className="flex flex-wrap gap-2">
                    {[t('endocrinologyForm.hirsutism'), t('endocrinologyForm.acne'), t('endocrinologyForm.alopecia')].map(sign => (
                      <label key={sign} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(formData.signsOfHyperandrogenism || []).includes(sign)}
                          onChange={(e) => {
                            const current = formData.signsOfHyperandrogenism || [];
                            const newValue = e.target.checked
                              ? [...current, sign]
                              : current.filter(item => item !== sign);
                            handleChange({
                              target: { name: 'signsOfHyperandrogenism', value: newValue }
                            });
                          }}
                          className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                        />
                        <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{sign}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <FormField label={t('endocrinologyForm.infertilityWorkupStatus')} name="infertilityWorkupStatus" type="select" options={[t('endocrinologyForm.notDone'), t('endocrinologyForm.inProgress'), t('endocrinologyForm.completed')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('endocrinologyForm.keyHormoneAbnormalitiesFemale')} name="keyHormoneAbnormalitiesFemale" type="textarea" placeholder={t('endocrinologyForm.keyHormoneAbnormalitiesFemalePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              </>
            )}
            {formData.showMaleReproductive && (
              <>
                <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
                  <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.maleHypogonadismED')}</h4>
                </div>
                <FormField label={t('endocrinologyForm.mainComplaint')} name="maleMainComplaint" type="select" options={[t('endocrinologyForm.lowLibido'), t('endocrinologyForm.erectileDysfunction'), t('endocrinologyForm.infertility'), t('endocrinologyForm.gynecomastia')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('endocrinologyForm.maleDurationOfSymptoms')} name="maleDurationOfSymptoms" placeholder={t('endocrinologyForm.durationPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('endocrinologyForm.testicularGenitalExamSummary')} name="testicularGenitalExamSummary" type="textarea" placeholder={t('endocrinologyForm.testicularGenitalExamSummaryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
                <FormField label={t('endocrinologyForm.keyHormoneResultsMale')} name="keyHormoneResultsMale" type="textarea" placeholder={t('endocrinologyForm.keyHormoneResultsMalePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              </>
            )}
          </FormSection>

          {/* 6. Bone & Calcium Disorders */}
          <FormSection title={t('endocrinologyForm.boneCalciumDisorders')} bgColor="bg-red-50" darkMode={darkMode}>
            <CheckboxGroup
              label={t('endocrinologyForm.fragilityFracturesHistory')}
              name="fragilityFracturesHistory"
              options={[t('endocrinologyForm.none'), t('endocrinologyForm.vertebral'), t('endocrinologyForm.hip'), t('endocrinologyForm.wrist'), t('endocrinologyForm.other')]}
              formData={formData}
              onChange={handleChange}
              darkMode={darkMode}
              t={t}
            />
            <CheckboxGroup
              label={t('endocrinologyForm.riskFactors')}
              name="boneRiskFactors"
              options={[t('endocrinologyForm.longTermSteroids'), t('endocrinologyForm.earlyMenopause'), t('endocrinologyForm.smoking'), t('endocrinologyForm.alcohol'), t('endocrinologyForm.lowBodyWeight'), t('endocrinologyForm.familyHistoryHipFracture')]}
              formData={formData}
              onChange={handleChange}
              darkMode={darkMode}
              t={t}
            />
            <FormField label={t('endocrinologyForm.dexaStatus')} name="dexaStatus" type="select" options={[t('endocrinologyForm.notDone'), t('endocrinologyForm.ordered'), t('endocrinologyForm.completed')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.dexaStatus === t('endocrinologyForm.completed') && (
              <FormField label={t('endocrinologyForm.dexaSummary')} name="dexaSummary" placeholder={t('endocrinologyForm.dexaSummaryPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('endocrinologyForm.calciumVitaminDStatus')} name="calciumVitaminDStatus" placeholder={t('endocrinologyForm.calciumVitaminDStatusPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 7. Endocrine Focused Physical Exam */}
          <FormSection title={t('endocrinologyForm.endocrineFocusedPhysicalExam')} bgColor="bg-teal-50" darkMode={darkMode}>
            <FormField label={t('endocrinologyForm.generalAppearance')} name="generalAppearance" placeholder={t('endocrinologyForm.generalAppearancePlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.skinHair')} name="skinHair" placeholder={t('endocrinologyForm.skinHairPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.fatDistribution')} name="fatDistribution" placeholder={t('endocrinologyForm.fatDistributionPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.edema')} name="edema" type="select" options={[t('endocrinologyForm.none'), t('endocrinologyForm.mild'), t('endocrinologyForm.moderate'), t('endocrinologyForm.severe')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.otherKeySigns')} name="otherKeySigns" type="textarea" placeholder={t('endocrinologyForm.otherKeySignsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 8. Key Investigations */}
          <FormSection title={t('endocrinologyForm.keyInvestigations')} bgColor="bg-pink-50" darkMode={darkMode}>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{t('endocrinologyForm.labsReviewedToday')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.labsReviewedToday || []).map((lab, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('labsReviewedToday', i)} darkMode={darkMode}>{lab}</Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[t('endocrinologyForm.fastingGlucoseOGTT'), t('endocrinologyForm.hba1c'), t('endocrinologyForm.lipidProfile'), t('endocrinologyForm.thyroidPanel'), t('endocrinologyForm.cortisolACTH'), t('endocrinologyForm.prolactin'), t('endocrinologyForm.gonadalHormones'), t('endocrinologyForm.calciumPhosphateALP')].map(lab => (
                  <button
                    key={lab}
                    type="button"
                    onClick={() => {
                      if (!(formData.labsReviewedToday || []).includes(lab)) {
                        addToArray('labsReviewedToday', lab);
                      }
                    }}
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    + {lab}
                  </button>
                ))}
              </div>
            </div>
            <FormField label={t('endocrinologyForm.mainInterpretationAbnormalities')} name="mainInterpretationAbnormalities" type="textarea" placeholder={t('endocrinologyForm.mainInterpretationAbnormalitiesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{t('endocrinologyForm.imagingReviewedOrdered')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.imagingReviewedOrdered || []).map((img, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('imagingReviewedOrdered', i)} darkMode={darkMode}>{img}</Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[t('endocrinologyForm.thyroidUS'), t('endocrinologyForm.pituitaryMRI'), t('endocrinologyForm.adrenalCTMRI'), t('endocrinologyForm.dexa'), t('endocrinologyForm.abdominalUS'), t('endocrinologyForm.other')].map(img => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => {
                      if (!(formData.imagingReviewedOrdered || []).includes(img)) {
                        addToArray('imagingReviewedOrdered', img);
                      }
                    }}
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    + {img}
                  </button>
                ))}
              </div>
            </div>
            <FormField label={t('endocrinologyForm.keyImagingImpressions')} name="keyImagingImpressions" type="textarea" placeholder={t('endocrinologyForm.keyImagingImpressionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 9. Diagnosis */}
          <FormSection title={t('endocrinologyForm.diagnosis')} bgColor="bg-orange-50" darkMode={darkMode}>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('endocrinologyForm.mainEndocrineDiagnosis')} <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {formData.diagnosis && typeof formData.diagnosis === 'object' && (formData.diagnosis.code || formData.diagnosis.term) ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <input
                        type="text"
                        placeholder={t('endocrinologyForm.icd11Code')}
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
                        placeholder={t('endocrinologyForm.diagnosisTerm')}
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
                      {t('endocrinologyForm.clear')}
                    </button>
                  </div>
                ) : null}
                <IcdCodeSearchInput
                  placeholder={t('endocrinologyForm.searchIcdCode')}
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
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('endocrinologyForm.secondaryDiagnoses')}</label>
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
                  placeholder={t('endocrinologyForm.searchIcdCodeToAdd')}
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
            <FormField label={t('endocrinologyForm.diseaseStatus')} name="diseaseStatus" type="select" options={[t('endocrinologyForm.newlyDiagnosed'), t('endocrinologyForm.controlled'), t('endocrinologyForm.subOptimallyControlled'), t('endocrinologyForm.poorlyControlled'), t('endocrinologyForm.remission')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 10. Management Plan & Education */}
          <FormSection title={t('endocrinologyForm.managementPlanEducation')} bgColor="bg-gray-50" darkMode={darkMode}>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.medications')}</h4>
            </div>
            <div className="col-span-full">
              <FormField label={t('endocrinologyForm.currentMedications')} name="currentMedications" type="textarea" placeholder={t('endocrinologyForm.currentMedicationsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              {patientMedications.length > 0 && (
                <div className={`mt-2 p-3 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{t('endocrinologyForm.fromPatientRecord') || 'From Patient Record'}</div>
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
                    {t('endocrinologyForm.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
            </div>
            <FormField label={t('endocrinologyForm.changesMadeToday')} name="medicationChangesMadeToday" type="textarea" placeholder={t('endocrinologyForm.changesMadeTodayPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.newPrescriptions')} name="newPrescriptions" type="textarea" placeholder={t('endocrinologyForm.newPrescriptionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.nonPharmacologicPlan')}</h4>
            </div>
            <CheckboxGroup
              label={t('endocrinologyForm.lifestyleCounsellingProvided')}
              name="lifestyleCounsellingProvided"
              options={[t('endocrinologyForm.dietModificationDiscussed'), t('endocrinologyForm.physicalActivityPlanDiscussed'), t('endocrinologyForm.weightReductionGoalsSet'), t('endocrinologyForm.smokingCessationAdvice')]}
              formData={formData}
              onChange={handleChange}
              darkMode={darkMode}
              t={t}
            />
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{t('endocrinologyForm.diabetesEducation')}</label>
              <div className="flex flex-wrap gap-2">
                {[t('endocrinologyForm.hypoglycemiaPrevention'), t('endocrinologyForm.footCare'), t('endocrinologyForm.sickDayRules')].map(edu => (
                  <label key={edu} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.diabetesEducation || []).includes(edu)}
                      onChange={(e) => {
                        const current = formData.diabetesEducation || [];
                        const newValue = e.target.checked
                          ? [...current, edu]
                          : current.filter(item => item !== edu);
                        handleChange({
                          target: { name: 'diabetesEducation', value: newValue }
                        });
                      }}
                      className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                    />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : ''}`}>{edu}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.followUpMonitoring')}</h4>
            </div>
            <FormField label={t('endocrinologyForm.targetHbA1c')} name="targetHbA1c" placeholder={t('endocrinologyForm.targetHbA1cPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('endocrinologyForm.nextLabChecks')} name="nextLabChecks" type="select" options={[t('endocrinologyForm.in3Months'), t('endocrinologyForm.in6Months'), t('endocrinologyForm.other')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.nextLabChecks === t('endocrinologyForm.other') && (
              <FormField label={t('endocrinologyForm.nextLabChecksOther')} name="nextLabChecksOther" placeholder={t('endocrinologyForm.nextLabChecksOtherPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('endocrinologyForm.nextClinicVisit')} name="nextClinicVisit" type="select" options={[t('endocrinologyForm.oneMonth'), t('endocrinologyForm.in3Months'), t('endocrinologyForm.sixMonths'), t('endocrinologyForm.earlierIfSymptomsWorsen')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-2`}>{t('endocrinologyForm.referrals')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.referrals || []).map((ref, i) => (
                  <Chip key={i} onRemove={() => removeFromArray('referrals', i)} darkMode={darkMode}>{ref}</Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[t('endocrinologyForm.ophthalmology'), t('endocrinologyForm.nephrology'), t('endocrinologyForm.cardiology'), t('endocrinologyForm.dietitian'), t('endocrinologyForm.diabetesNurseEducator'), t('endocrinologyForm.other')].map(ref => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => {
                      if (!(formData.referrals || []).includes(ref)) {
                        addToArray('referrals', ref);
                      }
                    }}
                    className={`px-3 py-1 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded text-sm`}
                  >
                    + {ref}
                  </button>
                ))}
              </div>
              {(formData.referrals || []).length > 0 && (
                <FormField label={t('endocrinologyForm.reasonForReferral')} name="reasonForReferral" type="textarea" placeholder={t('endocrinologyForm.reasonForReferralPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              )}
            </div>
            <div className={`col-span-full border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2 mb-4 mt-4`}>
              <h4 className={`text-md font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('endocrinologyForm.notesForPrintPatientInstructions')}</h4>
            </div>
            <FormField label={t('endocrinologyForm.patientInstructions')} name="patientInstructions" type="textarea" placeholder={t('endocrinologyForm.patientInstructionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

        </div>
      </div>
      
      {/* Sticky Footer */}
      <div className={`sticky bottom-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-t p-4 shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastSaved && `${t('endocrinologyForm.lastSaved') || 'Last saved'}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('endocrinologyForm.saveDraft')}
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
              {t('endocrinologyForm.submitForm')}
            </button>
          </div>
        </div>
      </div>
      
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {t('endocrinologyForm.draftSavedSuccessfully')}
        </div>
      )}
    </div>
  );
};

export default EndocrinologyForm;

