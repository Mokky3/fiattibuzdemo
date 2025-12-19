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
          <option value="" className={darkMode ? 'bg-slate-800' : ''}>{t ? t('entForm.selectOption') : 'Select an option'}</option>
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

const ENTForm = ({ formData, setFormData, patient, onSave }) => {
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
        doc_type: 'ent.initial',
        meta: {
          clinic_id: localStorage.getItem('clinic_id') || '',
          department_id: 'ent',
          physician_id: localStorage.getItem('user_id') || '',
          patient_id: patient?.patient_id || patient?.id || '',
          encounter_id: '',
          datetime: new Date().toISOString()
        },
        diagnosis: prev.diagnosis || { code: '', term: '' },
        diagnosisCodes: prev.diagnosisCodes || [],
        earSymptomsPresent: prev.earSymptomsPresent || [],
        nasalSymptomsPresent: prev.nasalSymptomsPresent || [],
        throatVoiceSymptomsPresent: prev.throatVoiceSymptomsPresent || [],
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

  // Initialize form data
  useEffect(() => {
    if (formData && !formData.diagnosis) {
      setFormData(prev => ({
        ...prev,
        diagnosis: prev.diagnosis || { code: '', term: '' },
        diagnosisCodes: prev.diagnosisCodes || [],
        earSymptoms: prev.earSymptoms || [],
        nasalSymptoms: prev.nasalSymptoms || [],
        throatVoiceSymptoms: prev.throatVoiceSymptoms || [],
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
    if (!formData.presentingENTComplaint || !formData.presentingENTComplaint.trim()) {
      alert(t('entForm.presentingENTComplaint') + ' is required.');
      return false;
    }
    if (!formData.diagnosis || !formData.diagnosis.code || !formData.diagnosis.term) {
      alert(t('entForm.mainENTDiagnosis') + ' is required.');
      return false;
    }
    return true;
  }, [formData]);

  // Build payload
  const buildPayload = useCallback(() => {
    return {
      doc_type: 'ent.initial',
      meta: formData.meta || {
        clinic_id: localStorage.getItem('clinic_id') || '',
        department_id: 'ent',
        physician_id: localStorage.getItem('user_id') || '',
        patient_id: patient?.patient_id || patient?.id || '',
        encounter_id: '',
        datetime: new Date().toISOString()
      },
      chief_complaint: formData.presentingENTComplaint,
      visit_type: formData.visitType,
      // Reason for ENT Visit & HPI
      reason_hpi: {
        presenting_ent_complaint: formData.presentingENTComplaint,
        duration_of_main_complaint: formData.durationOfMainComplaint,
        symptom_course: formData.symptomCourse,
        history_of_present_illness: formData.historyOfPresentIllness,
        impact_on_daily_life: formData.impactOnDailyLife,
      },
      // Ear Symptoms
      ear_symptoms: {
        ear_symptoms_present: formData.earSymptomsPresent || [],
        laterality: formData.laterality,
        ear_pain_details: formData.earPainDetails,
        hearing_loss_details: formData.hearingLossDetails,
        noise_exposure_history: formData.noiseExposureHistory,
        tinnitus_details: formData.tinnitusDetails,
        dizziness_vertigo_details: formData.dizzinessVertigoDetails,
        ear_discharge_details: formData.earDischargeDetails,
        fullness_pressure: formData.fullnessPressure,
        recurrent_ear_infections: formData.recurrentEarInfections,
        previous_ear_surgeries: formData.previousEarSurgeries,
        family_history_hearing_loss: formData.familyHistoryHearingLoss,
      },
      // Nose & Sinus Symptoms
      nose_sinus_symptoms: {
        nasal_symptoms_present: formData.nasalSymptomsPresent || [],
        nasal_obstruction_details: formData.nasalObstructionDetails,
        nasal_discharge: formData.nasalDischarge,
        allergic_symptoms: formData.allergicSymptoms,
        facial_pain_pressure: formData.facialPainPressure,
        smell_taste_disturbance: formData.smellTasteDisturbance,
        epistaxis: formData.epistaxis,
        history_of_sinusitis: formData.historyOfSinusitis,
        nasal_polyps_surgery_history: formData.nasalPolypsSurgeryHistory,
        history_of_nasal_trauma: formData.historyOfNasalTrauma,
      },
      // Throat, Voice & Swallowing
      throat_voice_swallowing: {
        throat_voice_symptoms_present: formData.throatVoiceSymptomsPresent || [],
        sore_throat_details: formData.soreThroatDetails,
        dysphagia: formData.dysphagia,
        odynophagia: formData.odynophagia,
        voice_change_hoarseness: formData.voiceChangeHoarseness,
        globus_sensation: formData.globusSensation,
        reflux_symptoms: formData.refluxSymptoms,
        recurrent_tonsillitis_history: formData.recurrentTonsillitisHistory,
        history_of_intubation_radiation: formData.historyOfIntubationRadiation,
      },
      // Sleep & Breathing
      sleep_breathing: {
        snoring: formData.snoring,
        snoring_details: formData.snoringDetails,
        witnessed_apneas_gasping: formData.witnessedApneasGasping,
        witnessed_apneas_details: formData.witnessedApneasDetails,
        daytime_sleepiness: formData.daytimeSleepiness,
        other_sleep_symptoms: formData.otherSleepSymptoms,
        previous_sleep_study_osa: formData.previousSleepStudyOSA,
      },
      // ENT-Focused Past History
      ent_past_history: {
        past_ent_surgeries: formData.pastENTSurgeries,
        recurrent_ent_infections: formData.recurrentENTInfections,
        allergy_asthma_atopy: formData.allergyAsthmaAtopy,
        occupational_environmental_exposures: formData.occupationalEnvironmentalExposures,
        smoking_history: formData.smokingHistory,
        alcohol_intake: formData.alcoholIntake,
        family_history_relevant: formData.familyHistoryRelevant,
      },
      // ENT Examination
      ent_examination: {
        ear: {
          right_ear_pinna: formData.rightEarPinna,
          left_ear_pinna: formData.leftEarPinna,
          right_ear_external_canal: formData.rightEarExternalCanal,
          left_ear_external_canal: formData.leftEarExternalCanal,
          right_tympanic_membrane: formData.rightTympanicMembrane,
          left_tympanic_membrane: formData.leftTympanicMembrane,
          hearing_screening: formData.hearingScreening,
          tuning_fork_tests: formData.tuningForkTests,
          vestibular_balance_findings: formData.vestibularBalanceFindings,
        },
        nose_sinuses: {
          external_nose: formData.externalNose,
          septum: formData.septum,
          turbinates: formData.turbinates,
          nasal_mucosa: formData.nasalMucosa,
          nasal_discharge_on_exam: formData.nasalDischargeOnExam,
          polyps_masses: formData.polypsMasses,
          sinus_region_tenderness: formData.sinusRegionTenderness,
          mouth_breathing_vs_nasal: formData.mouthBreathingVsNasal,
          nasal_endoscopy_findings: formData.nasalEndoscopyFindings,
        },
        oral_cavity_oropharynx_larynx: {
          oral_cavity: formData.oralCavity,
          tongue: formData.tongue,
          tonsils: formData.tonsils,
          soft_palate_uvula: formData.softPalateUvula,
          posterior_pharyngeal_wall: formData.posteriorPharyngealWall,
          laryngoscopy_stroboscopy_findings: formData.laryngoscopyStroboscopyFindings,
        },
        neck_cranial_nerve: {
          neck_inspection_palpation: formData.neckInspectionPalpation,
          lymph_nodes: formData.lymphNodes,
          thyroid_examination: formData.thyroidExamination,
          salivary_glands: formData.salivaryGlands,
          cranial_nerve_assessment: formData.cranialNerveAssessment,
        },
      },
      // ENT Investigations
      ent_investigations: {
        audiology_summary: formData.audiologySummary,
        tympanometry_acoustic_reflexes: formData.tympanometryAcousticReflexes,
        vestibular_testing_results: formData.vestibularTestingResults,
        nasal_endoscopy_report: formData.nasalEndoscopyReport,
        laryngoscopy_stroboscopy_report: formData.laryngoscopyStroboscopyReport,
        imaging: formData.imaging,
        laboratory_tests: formData.laboratoryTests,
      },
      // Diagnosis
      diagnosis: formData.diagnosis,
      diagnosis_codes: formData.diagnosisCodes || [],
      // Management Plan
      management_plan: {
        problem_list: formData.problemList,
        medical_treatment_plan: formData.medicalTreatmentPlan,
        procedures_performed_today: formData.proceduresPerformedToday,
        planned_ent_procedures_surgery: formData.plannedENTProceduresSurgery,
        referrals_multidisciplinary: formData.referralsMultidisciplinary,
        follow_up_plan: formData.followUpPlan,
        follow_up_date: formData.followUpDate,
      },
      // Patient Education & Counselling
      patient_education: {
        key_explanations_given: formData.keyExplanationsGiven,
        lifestyle_preventive_advice: formData.lifestylePreventiveAdvice,
        warning_signs_discussed: formData.warningSignsDiscussed,
        patient_questions_concerns: formData.patientQuestionsConcerns,
        patient_understanding_agreement: formData.patientUnderstandingAgreement,
        provider_notes_ent: formData.providerNotesENT,
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
        {/* Context Fields */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-4 sm:p-6 mb-6`}>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'} mb-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} pb-2`}>{t('entForm.context')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label={t('entForm.visitType')} name="visitType" type="select" options={[t('entForm.newConsultation'), t('entForm.followUp'), t('entForm.postOperative'), t('entForm.procedureVisit')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </div>
        </div>

        {/* Form Content */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-4 sm:p-8`}>
          {/* 1. Reason for ENT Visit & HPI */}
          <FormSection title={t('entForm.reasonForVisitHpi')} bgColor="bg-blue-50" darkMode={darkMode}>
            <FormField label={t('entForm.presentingENTComplaint')} name="presentingENTComplaint" placeholder={t('entForm.presentingENTComplaintPlaceholder')} width="full" formData={formData} onChange={handleChange} required darkMode={darkMode} t={t} />
            <FormField label={t('entForm.durationOfMainComplaint')} name="durationOfMainComplaint" placeholder={t('entForm.durationOfMainComplaintPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.symptomCourse')} name="symptomCourse" type="select" options={[t('entForm.acute'), t('entForm.subacute'), t('entForm.chronic'), t('entForm.recurrent')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.historyOfPresentIllness')} name="historyOfPresentIllness" type="textarea" placeholder={t('entForm.historyOfPresentIllnessPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <div className="col-span-full">
              <FormField label={t('entForm.currentMedications')} name="currentMedications" type="textarea" placeholder={t('entForm.currentMedicationsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
              {patientMedications.length > 0 && (
                <div className={`mt-2 p-3 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{t('entForm.fromPatientRecord') || 'From Patient Record'}</div>
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
                    {t('entForm.copyToForm') || 'Copy to Form'}
                  </button>
                </div>
              )}
            </div>
            <FormField label={t('entForm.impactOnDailyLife')} name="impactOnDailyLife" type="textarea" placeholder={t('entForm.impactOnDailyLifePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 2. Ear Symptoms */}
          <FormSection title={t('entForm.earSymptoms')} bgColor="bg-green-50" darkMode={darkMode}>
            <CheckboxGroup
              label={t('entForm.earSymptomsPresent')}
              name="earSymptoms"
              options={[t('entForm.earPain'), t('entForm.hearingLoss'), t('entForm.tinnitus'), t('entForm.dizzinessOrVertigo'), t('entForm.earDischarge'), t('entForm.fullnessOrPressure'), t('entForm.none')]}
              formData={formData}
              onChange={handleChange}
              darkMode={darkMode}
              t={t}
            />
            <FormField label={t('entForm.lateralityOfSymptoms')} name="lateralityOfSymptoms" type="select" options={[t('entForm.right'), t('entForm.left'), t('entForm.bilateral'), t('entForm.notSpecified')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {(formData.earSymptoms || []).includes(t('entForm.earPain')) && (
              <FormField label={t('entForm.earPainDetails')} name="earPainDetails" type="textarea" placeholder={t('entForm.earPainDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.earSymptoms || []).includes(t('entForm.hearingLoss')) && (
              <FormField label={t('entForm.hearingLossDetails')} name="hearingLossDetails" type="textarea" placeholder={t('entForm.hearingLossDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('entForm.noiseExposureHistory')} name="noiseExposureHistory" type="textarea" placeholder={t('entForm.noiseExposureHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {(formData.earSymptoms || []).includes(t('entForm.tinnitus')) && (
              <FormField label={t('entForm.tinnitusDetails')} name="tinnitusDetails" type="textarea" placeholder={t('entForm.tinnitusDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.earSymptoms || []).includes(t('entForm.dizzinessOrVertigo')) && (
              <FormField label={t('entForm.dizzinessVertigoDetails')} name="dizzinessVertigoDetails" type="textarea" placeholder={t('entForm.dizzinessVertigoDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.earSymptoms || []).includes(t('entForm.earDischarge')) && (
              <FormField label={t('entForm.earDischargeDetails')} name="earDischargeDetails" type="textarea" placeholder={t('entForm.earDischargeDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.earSymptoms || []).includes(t('entForm.fullnessOrPressure')) && (
              <FormField label={t('entForm.fullnessPressureInEar')} name="fullnessPressureInEar" type="textarea" placeholder={t('entForm.fullnessPressureInEarPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('entForm.historyOfRecurrentEarInfections')} name="historyOfRecurrentEarInfections" type="textarea" placeholder={t('entForm.historyOfRecurrentEarInfectionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.previousEarSurgeries')} name="previousEarSurgeries" type="textarea" placeholder={t('entForm.previousEarSurgeriesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.familyHistoryOfHearingLoss')} name="familyHistoryOfHearingLoss" type="textarea" placeholder={t('entForm.familyHistoryOfHearingLossPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 3. Nose & Sinus Symptoms */}
          <FormSection title={t('entForm.noseSinusSymptoms')} bgColor="bg-yellow-50" darkMode={darkMode}>
            <CheckboxGroup
              label={t('entForm.nasalSymptomsPresent')}
              name="nasalSymptoms"
              options={[t('entForm.nasalBlockage'), t('entForm.runnyNose'), t('entForm.sneezing'), t('entForm.itching'), t('entForm.facialPainOrPressure'), t('entForm.reducedSenseOfSmell'), t('entForm.nosebleeds'), t('entForm.postnasalDrip'), t('entForm.none')]}
              formData={formData}
              onChange={handleChange}
              darkMode={darkMode}
              t={t}
            />
            {(formData.nasalSymptoms || []).includes(t('entForm.nasalBlockage')) && (
              <FormField label={t('entForm.nasalObstructionDetails')} name="nasalObstructionDetails" type="textarea" placeholder={t('entForm.nasalObstructionDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.nasalSymptoms || []).includes(t('entForm.runnyNose')) && (
              <FormField label={t('entForm.nasalDischarge')} name="nasalDischarge" type="textarea" placeholder={t('entForm.nasalDischargePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('entForm.allergicSymptoms')} name="allergicSymptoms" type="textarea" placeholder={t('entForm.allergicSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {(formData.nasalSymptoms || []).includes(t('entForm.facialPainOrPressure')) && (
              <FormField label={t('entForm.facialPainPressure')} name="facialPainPressure" type="textarea" placeholder={t('entForm.facialPainPressurePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.nasalSymptoms || []).includes(t('entForm.reducedSenseOfSmell')) && (
              <FormField label={t('entForm.smellTasteDisturbance')} name="smellTasteDisturbance" type="textarea" placeholder={t('entForm.smellTasteDisturbancePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.nasalSymptoms || []).includes(t('entForm.nosebleeds')) && (
              <FormField label={t('entForm.epistaxis')} name="epistaxis" type="textarea" placeholder={t('entForm.epistaxisPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('entForm.historyOfSinusitis')} name="historyOfSinusitis" type="textarea" placeholder={t('entForm.historyOfSinusitisPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.nasalPolypsSurgeryHistory')} name="nasalPolypsSurgeryHistory" type="textarea" placeholder={t('entForm.nasalPolypsSurgeryHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.historyOfNasalTrauma')} name="historyOfNasalTrauma" type="textarea" placeholder={t('entForm.historyOfNasalTraumaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 4. Throat, Voice & Swallowing */}
          <FormSection title={t('entForm.throatVoiceSwallowing')} bgColor="bg-purple-50" darkMode={darkMode}>
            <CheckboxGroup
              label={t('entForm.throatVoiceSymptomsPresent')}
              name="throatVoiceSymptoms"
              options={[t('entForm.soreThroat'), t('entForm.difficultySwallowing'), t('entForm.painfulSwallowing'), t('entForm.voiceChangeOrHoarseness'), t('entForm.globusSensation'), t('entForm.chronicCough'), t('entForm.none')]}
              formData={formData}
              onChange={handleChange}
              darkMode={darkMode}
              t={t}
            />
            {(formData.throatVoiceSymptoms || []).includes(t('entForm.soreThroat')) && (
              <FormField label={t('entForm.soreThroatDetails')} name="soreThroatDetails" type="textarea" placeholder={t('entForm.soreThroatDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.throatVoiceSymptoms || []).includes(t('entForm.difficultySwallowing')) && (
              <FormField label={t('entForm.dysphagia')} name="dysphagia" type="textarea" placeholder={t('entForm.dysphagiaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.throatVoiceSymptoms || []).includes(t('entForm.painfulSwallowing')) && (
              <FormField label={t('entForm.odynophagia')} name="odynophagia" type="textarea" placeholder={t('entForm.odynophagiaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.throatVoiceSymptoms || []).includes(t('entForm.voiceChangeOrHoarseness')) && (
              <FormField label={t('entForm.voiceChangeHoarseness')} name="voiceChangeHoarseness" type="textarea" placeholder={t('entForm.voiceChangeHoarsenessPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            {(formData.throatVoiceSymptoms || []).includes(t('entForm.globusSensation')) && (
              <FormField label={t('entForm.globusSensationDetails')} name="globusSensation" type="textarea" placeholder={t('entForm.globusSensationDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('entForm.refluxSymptoms')} name="refluxSymptoms" type="textarea" placeholder={t('entForm.refluxSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.recurrentTonsillitisHistory')} name="recurrentTonsillitisHistory" type="textarea" placeholder={t('entForm.recurrentTonsillitisHistoryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.historyOfIntubationRadiationCaustic')} name="historyOfIntubationRadiationCaustic" type="textarea" placeholder={t('entForm.historyOfIntubationRadiationCausticPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 5. Sleep & Breathing */}
          <FormSection title={t('entForm.sleepBreathing')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <FormField label={t('entForm.snoring')} name="snoring" type="select" options={[t('entForm.none'), t('entForm.mild'), t('entForm.moderate'), t('entForm.severe')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.snoring && formData.snoring !== t('entForm.none') && (
              <FormField label={t('entForm.snoringDetails')} name="snoringDetails" type="textarea" placeholder={t('entForm.snoringDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('entForm.witnessedApneasGasping')} name="witnessedApneasGasping" type="select" options={[t('entForm.no'), t('entForm.occasional'), t('entForm.frequent')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            {formData.witnessedApneasGasping && formData.witnessedApneasGasping !== t('entForm.no') && (
              <FormField label={t('entForm.apneasGaspingDetails')} name="apneasGaspingDetails" type="textarea" placeholder={t('entForm.apneasGaspingDetailsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            )}
            <FormField label={t('entForm.daytimeSleepiness')} name="daytimeSleepiness" placeholder={t('entForm.daytimeSleepinessPlaceholder')} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.otherSleepSymptoms')} name="otherSleepSymptoms" type="textarea" placeholder={t('entForm.otherSleepSymptomsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.previousSleepStudyOSA')} name="previousSleepStudyOSA" type="textarea" placeholder={t('entForm.previousSleepStudyOSAPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 6. ENT-Focused Past History & Risk Factors */}
          <FormSection title={t('entForm.entFocusedHistory')} bgColor="bg-red-50" darkMode={darkMode}>
            <FormField label={t('entForm.pastENTSurgeries')} name="pastENTSurgeries" type="textarea" placeholder={t('entForm.pastENTSurgeriesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.recurrentENTInfections')} name="recurrentENTInfections" type="textarea" placeholder={t('entForm.recurrentENTInfectionsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.allergyAsthmaAtopy')} name="allergyAsthmaAtopy" type="textarea" placeholder={t('entForm.allergyAsthmaAtopyPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.occupationalEnvironmentalExposures')} name="occupationalEnvironmentalExposures" type="textarea" placeholder={t('entForm.occupationalEnvironmentalExposuresPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.smokingHistoryENT')} name="smokingHistoryENT" type="textarea" placeholder={t('entForm.smokingHistoryENTPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.alcoholIntake')} name="alcoholIntake" type="textarea" placeholder={t('entForm.alcoholIntakePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.familyHistoryENT')} name="familyHistoryENT" type="textarea" placeholder={t('entForm.familyHistoryENTPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 7. ENT Examination – Ear */}
          <FormSection title={t('entForm.earExamination')} bgColor="bg-teal-50" darkMode={darkMode}>
            <FormField label={t('entForm.rightEarPinna')} name="rightEarPinna" type="textarea" placeholder={t('entForm.rightEarPinnaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.leftEarPinna')} name="leftEarPinna" type="textarea" placeholder={t('entForm.leftEarPinnaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.rightEarExternalCanal')} name="rightEarExternalCanal" type="textarea" placeholder={t('entForm.rightEarExternalCanalPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.leftEarExternalCanal')} name="leftEarExternalCanal" type="textarea" placeholder={t('entForm.leftEarExternalCanalPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.rightTympanicMembrane')} name="rightTympanicMembrane" type="textarea" placeholder={t('entForm.rightTympanicMembranePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.leftTympanicMembrane')} name="leftTympanicMembrane" type="textarea" placeholder={t('entForm.leftTympanicMembranePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.hearingScreening')} name="hearingScreening" type="textarea" placeholder={t('entForm.hearingScreeningPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.tuningForkTests')} name="tuningForkTests" type="textarea" placeholder={t('entForm.tuningForkTestsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.vestibularBalanceFindings')} name="vestibularBalanceFindings" type="textarea" placeholder={t('entForm.vestibularBalanceFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 8. ENT Examination – Nose & Sinuses */}
          <FormSection title={t('entForm.nasalSinusExamination')} bgColor="bg-pink-50" darkMode={darkMode}>
            <FormField label={t('entForm.externalNose')} name="externalNose" type="textarea" placeholder={t('entForm.externalNosePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.septum')} name="septum" type="textarea" placeholder={t('entForm.septumPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.turbinates')} name="turbinates" type="textarea" placeholder={t('entForm.turbinatesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.nasalMucosa')} name="nasalMucosa" type="textarea" placeholder={t('entForm.nasalMucosaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.nasalDischargeOnExam')} name="nasalDischargeOnExam" type="textarea" placeholder={t('entForm.nasalDischargeOnExamPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.polypsMasses')} name="polypsMasses" type="textarea" placeholder={t('entForm.polypsMassesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.sinusRegionTenderness')} name="sinusRegionTenderness" type="textarea" placeholder={t('entForm.sinusRegionTendernessPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.mouthBreathingVsNasalBreathing')} name="mouthBreathingVsNasalBreathing" type="textarea" placeholder={t('entForm.mouthBreathingVsNasalBreathingPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.nasalEndoscopyFindings')} name="nasalEndoscopyFindings" type="textarea" placeholder={t('entForm.nasalEndoscopyFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 9. ENT Examination – Oral Cavity, Oropharynx & Larynx */}
          <FormSection title={t('entForm.oralCavityOropharynxLarynx')} bgColor="bg-orange-50" darkMode={darkMode}>
            <FormField label={t('entForm.oralCavity')} name="oralCavity" type="textarea" placeholder={t('entForm.oralCavityPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.tongue')} name="tongue" type="textarea" placeholder={t('entForm.tonguePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.tonsils')} name="tonsils" type="textarea" placeholder={t('entForm.tonsilsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.softPalateUvula')} name="softPalateUvula" type="textarea" placeholder={t('entForm.softPalateUvulaPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.posteriorPharyngealWall')} name="posteriorPharyngealWall" type="textarea" placeholder={t('entForm.posteriorPharyngealWallPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.laryngoscopyStroboscopyFindings')} name="laryngoscopyStroboscopyFindings" type="textarea" placeholder={t('entForm.laryngoscopyStroboscopyFindingsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 10. Neck & Cranial Nerve Examination */}
          <FormSection title={t('entForm.neckNeurologicExamination')} bgColor="bg-purple-50" darkMode={darkMode}>
            <FormField label={t('entForm.neckInspectionPalpation')} name="neckInspectionPalpation" type="textarea" placeholder={t('entForm.neckInspectionPalpationPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.lymphNodes')} name="lymphNodes" type="textarea" placeholder={t('entForm.lymphNodesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.thyroidExamination')} name="thyroidExamination" type="textarea" placeholder={t('entForm.thyroidExaminationPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.salivaryGlands')} name="salivaryGlands" type="textarea" placeholder={t('entForm.salivaryGlandsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.cranialNerveAssessment')} name="cranialNerveAssessment" type="textarea" placeholder={t('entForm.cranialNerveAssessmentPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 11. ENT Investigations */}
          <FormSection title={t('entForm.investigations')} bgColor="bg-indigo-50" darkMode={darkMode}>
            <FormField label={t('entForm.audiologySummary')} name="audiologySummary" type="textarea" placeholder={t('entForm.audiologySummaryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.tympanometryAcousticReflexes')} name="tympanometryAcousticReflexes" type="textarea" placeholder={t('entForm.tympanometryAcousticReflexesPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.vestibularTestingResults')} name="vestibularTestingResults" type="textarea" placeholder={t('entForm.vestibularTestingResultsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.nasalEndoscopyReport')} name="nasalEndoscopyReport" type="textarea" placeholder={t('entForm.nasalEndoscopyReportPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.laryngoscopyStroboscopyReport')} name="laryngoscopyStroboscopyReport" type="textarea" placeholder={t('entForm.laryngoscopyStroboscopyReportPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.imaging')} name="imaging" type="textarea" placeholder={t('entForm.imagingPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.laboratoryTestsENT')} name="laboratoryTestsENT" type="textarea" placeholder={t('entForm.laboratoryTestsENTPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 12. Diagnosis (ICD-11) */}
          <FormSection title={t('entForm.diagnosis')} bgColor="bg-pink-50" darkMode={darkMode}>
            <div className="w-full px-2 mb-3">
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('entForm.mainENTDiagnosis')} <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {formData.diagnosis && typeof formData.diagnosis === 'object' && (formData.diagnosis.code || formData.diagnosis.term) ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <input
                        type="text"
                        placeholder={t('entForm.icd11Code')}
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
                        placeholder={t('entForm.diagnosisTerm')}
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
                      {t('entForm.clear')}
                    </button>
                  </div>
                ) : null}
                <IcdCodeSearchInput
                  placeholder={t('entForm.searchIcdCode')}
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
              <label className={`block ${darkMode ? 'text-slate-300' : 'text-gray-600'} text-xs mb-1`}>{t('entForm.additionalENTDiagnoses')}</label>
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
                  placeholder={t('entForm.searchIcdCodeToAdd')}
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

          {/* 13. Management & Treatment Plan */}
          <FormSection title={t('entForm.managementPlan')} bgColor="bg-orange-50" darkMode={darkMode}>
            <FormField label={t('entForm.problemList')} name="problemList" type="textarea" placeholder={t('entForm.problemListPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.medicalTreatmentPlan')} name="medicalTreatmentPlan" type="textarea" placeholder={t('entForm.medicalTreatmentPlanPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.proceduresPerformedToday')} name="proceduresPerformedToday" type="textarea" placeholder={t('entForm.proceduresPerformedTodayPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.plannedENTProceduresSurgery')} name="plannedENTProceduresSurgery" type="textarea" placeholder={t('entForm.plannedENTProceduresSurgeryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.referralsMultidisciplinary')} name="referralsMultidisciplinary" type="textarea" placeholder={t('entForm.referralsMultidisciplinaryPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.followUpPlan')} name="followUpPlan" type="textarea" placeholder={t('entForm.followUpPlanPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.followUpDate')} name="followUpDate" type="date" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

          {/* 14. Patient Education & Counselling */}
          <FormSection title={t('entForm.counsellingEducation')} bgColor="bg-gray-50" darkMode={darkMode}>
            <FormField label={t('entForm.keyExplanationsGiven')} name="keyExplanationsGiven" type="textarea" placeholder={t('entForm.keyExplanationsGivenPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.lifestylePreventiveAdvice')} name="lifestylePreventiveAdvice" type="textarea" placeholder={t('entForm.lifestylePreventiveAdvicePlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.warningSignsDiscussed')} name="warningSignsDiscussed" type="textarea" placeholder={t('entForm.warningSignsDiscussedPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.patientQuestionsConcerns')} name="patientQuestionsConcerns" type="textarea" placeholder={t('entForm.patientQuestionsConcernsPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.patientUnderstandingAgreement')} name="patientUnderstandingAgreement" type="select" options={[t('entForm.understandsAgrees'), t('entForm.needsMoreExplanation'), t('entForm.declinedRecommendedTreatment')]} formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
            <FormField label={t('entForm.providerNotesENT')} name="providerNotesENT" type="textarea" placeholder={t('entForm.providerNotesENTPlaceholder')} width="full" formData={formData} onChange={handleChange} darkMode={darkMode} t={t} />
          </FormSection>

        </div>
      </div>
      
      {/* Sticky Footer */}
      <div className={`sticky bottom-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-t p-4 shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastSaved && `${t('entForm.lastSaved') || 'Last saved'}: ${lastSaved.toLocaleTimeString()}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`px-4 py-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} rounded-lg`}
            >
              {t('entForm.saveDraft')}
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
              {t('entForm.submitForm')}
            </button>
          </div>
        </div>
      </div>
      
      {showSaveToast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {t('entForm.draftSavedSuccessfully')}
        </div>
      )}
    </div>
  );
};

export default ENTForm;

