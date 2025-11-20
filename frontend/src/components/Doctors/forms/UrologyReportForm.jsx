import React, { useState, useEffect, useCallback, useRef } from 'react';
import { medicationsAPI, icdCodesAPI } from '../../../services/apiService';

// Shared UI primitives (reusing from other report forms)
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

const Input = React.memo(({ name, placeholder, value, onChange, className = "", type = "text", required = false, readOnly = false }) => (
  <input
    type={type}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange || (readOnly ? undefined : () => {})}
    readOnly={readOnly}
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
        aria-label="Edit"
      >
        ✎
      </button>
    )}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="text-slate-500 hover:text-red-600"
        aria-label="Remove"
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

// Preset arrays (module scope)
const CHIEF_COMPLAINT_PRESETS = ['частое мочеиспускание', 'дизурия', 'гематурия', 'боль в боку', 'недержание', 'ЭД', 'боль в мошонке', 'бесплодие'];
const LUTS_PRESETS = ['частота', 'никтурия', 'ургентность', 'слабая струя', 'натуживание', 'интермиттирующая струя', 'ощущение остатка'];
const INCONTINENCE_TYPES = ['стресс', 'ургент', 'смешанное', 'ночное', 'послеоперационное'];
const IMAGING_PRESETS = ['US KUB', 'TRUS', 'CT KUB', 'CT urogram', 'MRI prostate', 'Cystoscopy'];
const PROCEDURE_PRESETS = ['Cystoscopy', 'TRUS-biopsy', 'URS', 'ESWL', 'PCNL', 'Stent', 'Nephrostomy', 'TURP/HoLEP', 'Sling'];
const COUNSELING_PRESETS = ['гидратация', 'диета при камнях', 'антибиотик-stewardship', 'ограничить кофеин', 'тазовая физиотерапия', 'снижение веса'];
const REFERRAL_PRESETS = ['nephrology', 'oncology', 'andrology', 'physiotherapy'];
const ONSET_TYPES = ['acute', 'subacute', 'chronic'];
const COURSE_TYPES = ['stable', 'progressive', 'intermittent'];
const HEMATURIA_TYPES = ['none', 'microscopic', 'gross'];
const CVAT_TYPES = ['absent', 'unilateral', 'bilateral'];
const BLADDER_DISTENSION_TYPES = ['none', 'mild', 'moderate', 'severe'];
const INCONTINENCE_TYPE_OPTIONS = ['stress', 'urge', 'mixed', 'none'];
const LIBIDO_TYPES = ['normal', 'low'];
const FOLLOW_UP_OPTIONS = ['48h', '1w', '1m', '3m', 'PRN', 'date'];

// StructuredClone fallback
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const UrologyReportForm = ({ patient, encounter, onSave }) => {
  // Mode state
  const [mode, setMode] = useState('initial');
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    meta: false,
    scores: false,
    hpi: false,
    vitals: false,
    exam: false,
    functional: false,
    labs: false,
    diagnosis: false,
    plan: false,
    procedures: false,
    outcome: false,
    attachments: false
  });

  // Form data state
  const [formData, setFormData] = useState({
    doc_type: 'uro.initial',
    meta: {
      clinic_id: '',
      department_id: 'urology',
      physician_id: '',
      patient_id: '',
      encounter_id: '',
      datetime: new Date().toISOString()
    },
    chief_complaint: '',
    scores: {
      ipss: { q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', total: '' },
      qol: '',
      iief5: { q1: '', q2: '', q3: '', q4: '', q5: '', total: '' },
      iciq_ui_sf: { q1: '', q2: '', q3: '', total: '' }
    },
    hpi: {
      onset: '',
      duration: '',
      course: '',
      triggers: '',
      associated_symptoms: [],
      pain_site: '',
      pain_severity_vas: '',
      luts: {
        frequency: false,
        nocturia: false,
        urgency: false,
        weak_stream: false,
        straining: false,
        intermittency: false,
        incomplete_emptying: false
      },
      hematuria: 'none',
      dysuria: false,
      incontinence_types: [],
      sexual: {
        ed: false,
        iief5_total: '',
        libido: 'normal',
        ejaculation_issues: '',
        infertility: false
      },
      meds: '',
      allergies: '',
      pmh: '',
      psh: '',
      family: '',
      social: ''
    },
    vitals: {
      bp: '',
      hr: '',
      temp: '',
      spo2: '',
      height_cm: patient?.height_cm?.toString() || '',
      weight_kg: patient?.weight_kg?.toString() || '',
      bmi: ''
    },
    exam: {
      abdomen: '',
      cVAT: 'absent',
      bladder_distension: 'none',
      male_genital: '',
      female_genital: '',
      dre: {
        tone: '',
        prostate_size: '',
        nodules: false,
        tenderness: false,
        comments: ''
      },
      pop_q: ''
    },
    functional: {
      pvr_ml: '',
      uroflow: {
        qmax_ml_s: '',
        qavg_ml_s: '',
        voided_vol_ml: '',
        void_time_s: '',
        curve_notes: ''
      },
      incontinence: {
        type: 'none',
        pad_test_g: ''
      }
    },
    labs_imaging: {
      urinalysis: {
        blood: '',
        protein: '',
        nitrite: '',
        leuk_esterase: '',
        rbc_hpf: '',
        wbc_hpf: ''
      },
      urine_culture: {
        date: '',
        cfu: '',
        organism: '',
        sensitivities: '',
        antibiotics_started: ''
      },
      renal_panel: {
        bun: '',
        creatinine: '',
        eGFR: ''
      },
      psa: {
        total_ng_ml: '',
        free_ng_ml: '',
        ratio: '',
        date: '',
        pre_DRE: true
      },
      hormones: {
        testosterone_total: '',
        prolactin: '',
        lh: '',
        fsh: ''
      },
      semen_analysis: {
        volume_ml: '',
        count_million_ml: '',
        motility_pct: '',
        morphology_pct: '',
        date: ''
      },
      imaging: [],
      imaging_links: [],
      referenced_docs: []
    },
    diagnosis: {
      main: '',
      secondary: [],
      codes: []
    },
    plan: {
      meds: [],
      procedures_planned: [],
      counseling: [],
      referrals: [],
      follow_up: '',
      follow_up_date: ''
    },
    procedures_done: [],
    outcome: {
      condition: '',
      course: ''
    },
    recommendations: [],
    attachments: []
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Autosave state
  const [lastSaved, setLastSaved] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Smart editor states
  const [editingMed, setEditingMed] = useState(null);
  const [editingMedIdx, setEditingMedIdx] = useState(null);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [editingProcedureIdx, setEditingProcedureIdx] = useState(null);
  
  // Diagnosis code input state
  const [newCode, setNewCode] = useState({ system: '', code: '', term: '' });

  // Initialize form data
  useEffect(() => {
    if (patient && encounter) {
      setFormData(prev => ({
        ...prev,
        meta: {
          clinic_id: encounter.clinic_id || 'clinic-001',
          department_id: 'urology',
          physician_id: encounter.doctor_id || 'doctor-001',
          patient_id: patient.patient_id || 'patient-001',
          encounter_id: encounter.id || 'encounter-001',
          datetime: encounter.datetime || new Date().toISOString()
        },
        vitals: {
          ...prev.vitals,
          height_cm: patient.height_cm?.toString() || prev.vitals.height_cm,
          weight_kg: patient.weight_kg?.toString() || prev.vitals.weight_kg
        }
      }));
    }
  }, [patient, encounter]);

  // Helper functions - define before useEffects that use them
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

  // Calculate BMI
  useEffect(() => {
    const height_m = parseFloat(formData.vitals.height_cm) / 100;
    const weight_kg = parseFloat(formData.vitals.weight_kg);
    if (height_m > 0 && weight_kg > 0) {
      const bmi = (weight_kg / (height_m * height_m)).toFixed(1);
      if (formData.vitals.bmi !== bmi) {
        updateFormData('vitals.bmi', bmi);
      }
    }
  }, [formData.vitals.height_cm, formData.vitals.weight_kg, updateFormData]);

  // Update doc_type when mode changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      doc_type: mode === 'discharge' ? 'uro.discharge' : 'uro.initial'
    }));
  }, [mode]);

  // Calculate IPSS total
  useEffect(() => {
    const total = Object.values(formData.scores.ipss)
      .slice(0, 7)
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (formData.scores.ipss.total !== total.toString()) {
      updateFormData('scores.ipss.total', total.toString());
    }
  }, [formData.scores.ipss.q1, formData.scores.ipss.q2, formData.scores.ipss.q3, formData.scores.ipss.q4, formData.scores.ipss.q5, formData.scores.ipss.q6, formData.scores.ipss.q7, formData.scores.ipss.total, updateFormData]);

  // Calculate IIEF-5 total
  useEffect(() => {
    const total = Object.values(formData.scores.iief5)
      .slice(0, 5)
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (formData.scores.iief5.total !== total.toString()) {
      updateFormData('scores.iief5.total', total.toString());
    }
  }, [formData.scores.iief5.q1, formData.scores.iief5.q2, formData.scores.iief5.q3, formData.scores.iief5.q4, formData.scores.iief5.q5, formData.scores.iief5.total, updateFormData]);

  // Calculate ICIQ-UI-SF total
  useEffect(() => {
    const total = Object.values(formData.scores.iciq_ui_sf)
      .slice(0, 3)
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (formData.scores.iciq_ui_sf.total !== total.toString()) {
      updateFormData('scores.iciq_ui_sf.total', total.toString());
    }
  }, [formData.scores.iciq_ui_sf.q1, formData.scores.iciq_ui_sf.q2, formData.scores.iciq_ui_sf.q3, formData.scores.iciq_ui_sf.total, updateFormData]);

  // Calculate PSA ratio
  useEffect(() => {
    const total = parseFloat(formData.labs_imaging.psa.total_ng_ml);
    const free = parseFloat(formData.labs_imaging.psa.free_ng_ml);
    if (total > 0 && free > 0) {
      const ratio = (free / total).toFixed(3);
      if (formData.labs_imaging.psa.ratio !== ratio) {
        updateFormData('labs_imaging.psa.ratio', ratio);
      }
    }
  }, [formData.labs_imaging.psa.total_ng_ml, formData.labs_imaging.psa.free_ng_ml, formData.labs_imaging.psa.ratio, updateFormData]);

  // Smart editor helpers
  const openMedEditor = useCallback((preset = {}, idx = null) => {
    setEditingMed({
      med: preset.med || '',
      conc_strength: preset.conc_strength || '',
      route: preset.route || 'oral',
      freq: preset.freq || '',
      duration: preset.duration || '',
      instructions: preset.instructions || '',
      sendToPharmacy: preset.sendToPharmacy || false,
      pharmacyId: preset.pharmacyId || ''
    });
    setEditingMedIdx(idx);
  }, []);

  const saveMed = useCallback(() => {
    if (!editingMed?.med?.trim()) return;
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
      side: preset.side || 'NA',
      anesthesia: preset.anesthesia || 'none',
      technique: preset.technique || '',
      findings: preset.findings || '',
      result: preset.result || 'successful',
      complications: preset.complications || ''
    });
    setEditingProcedureIdx(idx);
  }, []);

  const saveProcedure = useCallback(() => {
    if (!editingProcedure?.name?.trim() || !editingProcedure?.date?.trim()) return;
    const next = [...formData.procedures_done];
    if (editingProcedureIdx === null) next.push(editingProcedure); else next[editingProcedureIdx] = editingProcedure;
    updateFormData('procedures_done', next);
    setEditingProcedure(null); setEditingProcedureIdx(null);
  }, [editingProcedure, editingProcedureIdx, formData.procedures_done, updateFormData]);

  const removeProcedure = useCallback((idx) => {
    updateFormData('procedures_done', formData.procedures_done.filter((_, i) => i !== idx));
  }, [formData.procedures_done, updateFormData]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.chief_complaint.trim()) {
      newErrors.chief_complaint = 'Chief complaint is required';
    }

    if (!formData.diagnosis.main.trim()) {
      newErrors.diagnosis_main = 'Main diagnosis is required';
    }

    if (mode === 'discharge') {
      if (!formData.recommendations.length) {
        newErrors.recommendations = 'At least one recommendation is required for discharge';
      }
    }

    // Score validations
    const ipssTotal = parseInt(formData.scores.ipss.total) || 0;
    if (formData.scores.ipss.total && (ipssTotal < 0 || ipssTotal > 35)) {
      newErrors.ipss_total = 'IPSS total must be 0-35';
    }

    const qol = parseInt(formData.scores.qol) || 0;
    if (formData.scores.qol && (qol < 0 || qol > 6)) {
      newErrors.qol = 'QoL score must be 0-6';
    }

    const iief5Total = parseInt(formData.scores.iief5.total) || 0;
    if (formData.scores.iief5.total && (iief5Total < 5 || iief5Total > 25)) {
      newErrors.iief5_total = 'IIEF-5 total must be 5-25';
    }

    const iciqTotal = parseInt(formData.scores.iciq_ui_sf.total) || 0;
    if (formData.scores.iciq_ui_sf.total && (iciqTotal < 0 || iciqTotal > 16)) {
      newErrors.iciq_total = 'ICIQ-UI-SF total must be 0-16';
    }

    // PSA validation
    if (formData.labs_imaging.psa.total_ng_ml || formData.labs_imaging.psa.free_ng_ml) {
      if (!formData.labs_imaging.psa.date) {
        newErrors.psa_date = 'PSA date is required when PSA values are provided';
      }
      if (!formData.labs_imaging.psa.total_ng_ml || parseFloat(formData.labs_imaging.psa.total_ng_ml) < 0) {
        newErrors.psa_total = 'PSA total is required and must be >= 0';
      }
    }

    // Urine culture validation
    if (formData.labs_imaging.urine_culture.cfu) {
      if (!formData.labs_imaging.urine_culture.date) {
        newErrors.urine_culture_date = 'Culture date is required when CFU is provided';
      }
      if (!formData.labs_imaging.urine_culture.organism) {
        newErrors.urine_culture_organism = 'Organism is required when CFU is provided';
      }
    }

    // Uroflow/PVR validation
    const pvr = parseFloat(formData.functional.pvr_ml);
    if (formData.functional.pvr_ml && pvr < 0) {
      newErrors.pvr = 'PVR must be >= 0';
    }

    const qmax = parseFloat(formData.functional.uroflow.qmax_ml_s);
    if (formData.functional.uroflow.qmax_ml_s && qmax < 0) {
      newErrors.qmax = 'Qmax must be >= 0';
    }

    // Procedures validation
    formData.procedures_done.forEach((proc, idx) => {
      if (!proc.name?.trim()) {
        newErrors[`procedure_${idx}_name`] = 'Procedure name is required';
      }
      if (!proc.date?.trim()) {
        newErrors[`procedure_${idx}_date`] = 'Procedure date is required';
      }
    });

    // Follow-up date validation
    if (formData.plan.follow_up === 'date' && !formData.plan.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required when "date" is selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  // Build payload
  const buildPayload = useCallback(() => {
    const payload = {
      doc_type: mode === 'discharge' ? 'uro.discharge' : 'uro.initial',
      meta: formData.meta,
      chief_complaint: formData.chief_complaint,
      scores: formData.scores,
      hpi: formData.hpi,
      vitals: formData.vitals,
      exam: formData.exam,
      functional: formData.functional,
      labs_imaging: formData.labs_imaging,
      diagnosis: formData.diagnosis,
      procedures_done: formData.procedures_done,
      attachments: formData.attachments
    };

    if (mode === 'initial') {
      payload.plan = formData.plan;
    }

    if (mode === 'discharge') {
      payload.outcome = formData.outcome;
      payload.recommendations = formData.recommendations.length ? formData.recommendations : undefined;
    }

    return payload;
  }, [formData, mode]);

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
      <Card title="Urology Report" className="mb-6">
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
            <div className="text-slate-600">Urology Department</div>
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
        <div className="space-y-4">
          <div>
            <FieldLabel required>Chief Complaint</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {CHIEF_COMPLAINT_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (formData.chief_complaint === preset) {
                      updateFormData('chief_complaint', '');
                    } else {
                      updateFormData('chief_complaint', preset);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    formData.chief_complaint === preset
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Input
              name="chief_complaint"
              placeholder="Enter chief complaint..."
              value={formData.chief_complaint}
              onChange={(e) => updateFormData('chief_complaint', e.target.value)}
              required
            />
            {errors.chief_complaint && (
              <p className="text-red-500 text-sm mt-1">{errors.chief_complaint}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Scores */}
      <Card title="Symptom Scores" collapsible isOpen={!collapsedSections.scores} onToggle={() => toggleSection('scores')}>
        <div className="space-y-6">
          {/* IPSS */}
          <div>
            <FieldLabel>IPSS (International Prostate Symptom Score)</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'].map((q, idx) => (
                <div key={q}>
                  <FieldLabel className="text-xs">Q{idx + 1}</FieldLabel>
                  <Select
                    name={`ipss_${q}`}
                    value={formData.scores.ipss[q]}
                    onChange={(e) => updateFormData(`scores.ipss.${q}`, e.target.value)}
                    options={[0, 1, 2, 3, 4, 5].map(n => ({ value: n.toString(), label: n.toString() }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs">Total IPSS</FieldLabel>
              <Input
                name="ipss_total"
                value={formData.scores.ipss.total}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className="bg-slate-100 font-semibold"
              />
              {errors.ipss_total && <p className="text-red-500 text-sm mt-1">{errors.ipss_total}</p>}
            </div>
          </div>

          {/* QoL */}
          <div>
            <FieldLabel>IPSS QoL (Quality of Life)</FieldLabel>
            <Select
              name="qol"
              value={formData.scores.qol}
              onChange={(e) => updateFormData('scores.qol', e.target.value)}
              options={[0, 1, 2, 3, 4, 5, 6].map(n => ({ value: n.toString(), label: n.toString() }))}
            />
            {errors.qol && <p className="text-red-500 text-sm mt-1">{errors.qol}</p>}
          </div>

          {/* IIEF-5 */}
          <div>
            <FieldLabel>IIEF-5 (International Index of Erectile Function)</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['q1', 'q2', 'q3', 'q4', 'q5'].map((q, idx) => (
                <div key={q}>
                  <FieldLabel className="text-xs">Q{idx + 1}</FieldLabel>
                  <Select
                    name={`iief5_${q}`}
                    value={formData.scores.iief5[q]}
                    onChange={(e) => updateFormData(`scores.iief5.${q}`, e.target.value)}
                    options={[1, 2, 3, 4, 5].map(n => ({ value: n.toString(), label: n.toString() }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs">Total IIEF-5</FieldLabel>
              <Input
                name="iief5_total"
                value={formData.scores.iief5.total}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className="bg-slate-100 font-semibold"
              />
              {errors.iief5_total && <p className="text-red-500 text-sm mt-1">{errors.iief5_total}</p>}
            </div>
          </div>

          {/* ICIQ-UI-SF */}
          <div>
            <FieldLabel>ICIQ-UI-SF (Urinary Incontinence Short Form)</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['q1', 'q2', 'q3'].map((q, idx) => (
                <div key={q}>
                  <FieldLabel className="text-xs">Q{idx + 1}</FieldLabel>
                  <Input
                    type="number"
                    name={`iciq_${q}`}
                    min="0"
                    max={q === 'q1' ? '4' : '6'}
                    value={formData.scores.iciq_ui_sf[q]}
                    onChange={(e) => updateFormData(`scores.iciq_ui_sf.${q}`, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs">Total ICIQ-UI-SF</FieldLabel>
              <Input
                name="iciq_total"
                value={formData.scores.iciq_ui_sf.total}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className="bg-slate-100 font-semibold"
              />
              {errors.iciq_total && <p className="text-red-500 text-sm mt-1">{errors.iciq_total}</p>}
            </div>
          </div>
        </div>
      </Card>

      {/* HPI */}
      <Card title="History of Present Illness (HPI)" collapsible isOpen={!collapsedSections.hpi} onToggle={() => toggleSection('hpi')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Onset</FieldLabel>
              <Select
                name="onset"
                value={formData.hpi.onset}
                onChange={(e) => updateFormData('hpi.onset', e.target.value)}
                options={ONSET_TYPES.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
              />
            </div>
            <div>
              <FieldLabel>Duration</FieldLabel>
              <Input
                name="duration"
                placeholder="e.g., 2 weeks"
                value={formData.hpi.duration}
                onChange={(e) => updateFormData('hpi.duration', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Course</FieldLabel>
              <Select
                name="course"
                value={formData.hpi.course}
                onChange={(e) => updateFormData('hpi.course', e.target.value)}
                options={COURSE_TYPES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Triggers</FieldLabel>
            <Input
              name="triggers"
              placeholder="What triggers or worsens symptoms?"
              value={formData.hpi.triggers}
              onChange={(e) => updateFormData('hpi.triggers', e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>LUTS (Lower Urinary Tract Symptoms)</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {LUTS_PRESETS.map(luts => {
                const key = luts === 'частота' ? 'frequency' :
                           luts === 'никтурия' ? 'nocturia' :
                           luts === 'ургентность' ? 'urgency' :
                           luts === 'слабая струя' ? 'weak_stream' :
                           luts === 'натуживание' ? 'straining' :
                           luts === 'интермиттирующая струя' ? 'intermittency' :
                           'incomplete_emptying';
                return (
                  <label key={luts} className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.hpi.luts[key]}
                      onChange={(e) => updateFormData(`hpi.luts.${key}`, e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">{luts}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Hematuria</FieldLabel>
              <Select
                name="hematuria"
                value={formData.hpi.hematuria}
                onChange={(e) => updateFormData('hpi.hematuria', e.target.value)}
                options={HEMATURIA_TYPES.map(h => ({ value: h, label: h.charAt(0).toUpperCase() + h.slice(1) }))}
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.dysuria}
                  onChange={(e) => updateFormData('hpi.dysuria', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Dysuria</span>
              </label>
            </div>
          </div>

          <div>
            <FieldLabel>Incontinence Types</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {INCONTINENCE_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (formData.hpi.incontinence_types.includes(type)) {
                      removeFromArray('hpi.incontinence_types', formData.hpi.incontinence_types.indexOf(type));
                    } else {
                      addToArray('hpi.incontinence_types', type);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    formData.hpi.incontinence_types.includes(type)
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.hpi.incontinence_types.map((type, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('hpi.incontinence_types', idx)}>
                  {type}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Pain Site</FieldLabel>
              <Input
                name="pain_site"
                placeholder="Location of pain..."
                value={formData.hpi.pain_site}
                onChange={(e) => updateFormData('hpi.pain_site', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Pain Severity (VAS 0-10)</FieldLabel>
              <Input
                type="number"
                name="pain_severity_vas"
                min="0"
                max="10"
                placeholder="0-10"
                value={formData.hpi.pain_severity_vas}
                onChange={(e) => updateFormData('hpi.pain_severity_vas', e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Associated Symptoms</FieldLabel>
            <Input
              name="associated_symptoms"
              placeholder="Add symptom..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  addToArray('hpi.associated_symptoms', e.target.value.trim());
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.hpi.associated_symptoms.map((symptom, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('hpi.associated_symptoms', idx)}>
                  {symptom}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Sexual Function</FieldLabel>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.sexual.ed}
                  onChange={(e) => updateFormData('hpi.sexual.ed', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Erectile Dysfunction</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <FieldLabel className="text-xs">Libido</FieldLabel>
                  <Select
                    name="libido"
                    value={formData.hpi.sexual.libido}
                    onChange={(e) => updateFormData('hpi.sexual.libido', e.target.value)}
                    options={LIBIDO_TYPES.map(l => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))}
                  />
                </div>
                <div>
                  <FieldLabel className="text-xs">Ejaculation Issues</FieldLabel>
                  <Input
                    name="ejaculation_issues"
                    placeholder="Describe..."
                    value={formData.hpi.sexual.ejaculation_issues}
                    onChange={(e) => updateFormData('hpi.sexual.ejaculation_issues', e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hpi.sexual.infertility}
                  onChange={(e) => updateFormData('hpi.sexual.infertility', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Infertility</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Current Medications</FieldLabel>
              <TextArea
                name="meds"
                placeholder="List current medications..."
                value={formData.hpi.meds}
                onChange={(e) => updateFormData('hpi.meds', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Allergies</FieldLabel>
              <Input
                name="allergies"
                placeholder="Drug allergies, reactions..."
                value={formData.hpi.allergies}
                onChange={(e) => updateFormData('hpi.allergies', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Past Medical History</FieldLabel>
              <TextArea
                name="pmh"
                placeholder="Previous diagnoses..."
                value={formData.hpi.pmh}
                onChange={(e) => updateFormData('hpi.pmh', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Past Surgical History</FieldLabel>
              <TextArea
                name="psh"
                placeholder="Previous surgeries..."
                value={formData.hpi.psh}
                onChange={(e) => updateFormData('hpi.psh', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Family History</FieldLabel>
              <TextArea
                name="family"
                placeholder="Family history..."
                value={formData.hpi.family}
                onChange={(e) => updateFormData('hpi.family', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Social History</FieldLabel>
              <TextArea
                name="social"
                placeholder="Smoking, alcohol, occupation..."
                value={formData.hpi.social}
                onChange={(e) => updateFormData('hpi.social', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!formData.chief_complaint.trim()}
              onClick={() => console.log('AI Suggest clicked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                formData.chief_complaint.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              🧠 AI Suggest
            </button>
          </div>
        </div>
      </Card>

      {/* Vitals & Physical Exam */}
      <Card title="Vitals & Physical Exam" collapsible isOpen={!collapsedSections.vitals} onToggle={() => toggleSection('vitals')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>BP</FieldLabel>
              <Input
                name="bp"
                placeholder="120/80"
                value={formData.vitals.bp}
                onChange={(e) => updateFormData('vitals.bp', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Heart Rate</FieldLabel>
              <Input
                name="hr"
                placeholder="72 bpm"
                value={formData.vitals.hr}
                onChange={(e) => updateFormData('vitals.hr', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Temperature</FieldLabel>
              <Input
                name="temp"
                placeholder="36.5°C"
                value={formData.vitals.temp}
                onChange={(e) => updateFormData('vitals.temp', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>SpO2</FieldLabel>
              <Input
                name="spo2"
                placeholder="98%"
                value={formData.vitals.spo2}
                onChange={(e) => updateFormData('vitals.spo2', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Height (cm)</FieldLabel>
              <Input
                type="number"
                name="height_cm"
                placeholder="170"
                value={formData.vitals.height_cm}
                onChange={(e) => updateFormData('vitals.height_cm', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Weight (kg)</FieldLabel>
              <Input
                type="number"
                name="weight_kg"
                placeholder="70"
                value={formData.vitals.weight_kg}
                onChange={(e) => updateFormData('vitals.weight_kg', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>BMI</FieldLabel>
              <Input
                name="bmi"
                value={formData.vitals.bmi}
                readOnly={true}
                onChange={() => {}} // No-op for read-only field
                className="bg-slate-100"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Physical Examination" collapsible isOpen={!collapsedSections.exam} onToggle={() => toggleSection('exam')}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Abdomen</FieldLabel>
            <TextArea
              name="abdomen"
              placeholder="Palpation, percussion findings..."
              value={formData.exam.abdomen}
              onChange={(e) => updateFormData('exam.abdomen', e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>CVA Tenderness</FieldLabel>
              <Select
                name="cVAT"
                value={formData.exam.cVAT}
                onChange={(e) => updateFormData('exam.cVAT', e.target.value)}
                options={CVAT_TYPES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
              />
            </div>
            <div>
              <FieldLabel>Bladder Distension</FieldLabel>
              <Select
                name="bladder_distension"
                value={formData.exam.bladder_distension}
                onChange={(e) => updateFormData('exam.bladder_distension', e.target.value)}
                options={BLADDER_DISTENSION_TYPES.map(b => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Male Genital</FieldLabel>
              <TextArea
                name="male_genital"
                placeholder="Penile, scrotal exam..."
                value={formData.exam.male_genital}
                onChange={(e) => updateFormData('exam.male_genital', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <FieldLabel>Female Genital</FieldLabel>
              <TextArea
                name="female_genital"
                placeholder="Pelvic exam findings..."
                value={formData.exam.female_genital}
                onChange={(e) => updateFormData('exam.female_genital', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Digital Rectal Exam (DRE)</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs">Tone</FieldLabel>
                <Input
                  name="dre_tone"
                  placeholder="Normal, decreased..."
                  value={formData.exam.dre.tone}
                  onChange={(e) => updateFormData('exam.dre.tone', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Prostate Size</FieldLabel>
                <Input
                  name="prostate_size"
                  placeholder="Normal, enlarged..."
                  value={formData.exam.dre.prostate_size}
                  onChange={(e) => updateFormData('exam.dre.prostate_size', e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.exam.dre.nodules}
                  onChange={(e) => updateFormData('exam.dre.nodules', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Nodules</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.exam.dre.tenderness}
                  onChange={(e) => updateFormData('exam.dre.tenderness', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Tenderness</span>
              </label>
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs">DRE Comments</FieldLabel>
              <TextArea
                name="dre_comments"
                placeholder="Additional findings..."
                value={formData.exam.dre.comments}
                onChange={(e) => updateFormData('exam.dre.comments', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div>
            <FieldLabel>POP-Q (if applicable)</FieldLabel>
            <Input
              name="pop_q"
              placeholder="POP-Q staging..."
              value={formData.exam.pop_q}
              onChange={(e) => updateFormData('exam.pop_q', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Functional Testing */}
      <Card title="Functional Testing" collapsible isOpen={!collapsedSections.functional} onToggle={() => toggleSection('functional')}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Post-Void Residual (PVR)</FieldLabel>
            <Input
              type="number"
              name="pvr_ml"
              placeholder="ml"
              min="0"
              value={formData.functional.pvr_ml}
              onChange={(e) => updateFormData('functional.pvr_ml', e.target.value)}
            />
            {errors.pvr && <p className="text-red-500 text-sm mt-1">{errors.pvr}</p>}
          </div>
          <div>
            <FieldLabel>Uroflowmetry</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs">Qmax (ml/s)</FieldLabel>
                <Input
                  type="number"
                  name="qmax"
                  placeholder="ml/s"
                  min="0"
                  value={formData.functional.uroflow.qmax_ml_s}
                  onChange={(e) => updateFormData('functional.uroflow.qmax_ml_s', e.target.value)}
                />
                {errors.qmax && <p className="text-red-500 text-xs mt-1">{errors.qmax}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs">Qavg (ml/s)</FieldLabel>
                <Input
                  type="number"
                  name="qavg"
                  placeholder="ml/s"
                  min="0"
                  value={formData.functional.uroflow.qavg_ml_s}
                  onChange={(e) => updateFormData('functional.uroflow.qavg_ml_s', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Voided Volume (ml)</FieldLabel>
                <Input
                  type="number"
                  name="voided_vol"
                  placeholder="ml"
                  min="0"
                  value={formData.functional.uroflow.voided_vol_ml}
                  onChange={(e) => updateFormData('functional.uroflow.voided_vol_ml', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Void Time (s)</FieldLabel>
                <Input
                  type="number"
                  name="void_time"
                  placeholder="seconds"
                  min="0"
                  value={formData.functional.uroflow.void_time_s}
                  onChange={(e) => updateFormData('functional.uroflow.void_time_s', e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2">
              <FieldLabel className="text-xs">Curve Notes</FieldLabel>
              <TextArea
                name="curve_notes"
                placeholder="Flow pattern description..."
                value={formData.functional.uroflow.curve_notes}
                onChange={(e) => updateFormData('functional.uroflow.curve_notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Incontinence Type</FieldLabel>
              <Select
                name="incontinence_type"
                value={formData.functional.incontinence.type}
                onChange={(e) => updateFormData('functional.incontinence.type', e.target.value)}
                options={INCONTINENCE_TYPE_OPTIONS.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              />
            </div>
            <div>
              <FieldLabel>Pad Test (grams)</FieldLabel>
              <Input
                type="number"
                name="pad_test_g"
                placeholder="grams"
                min="0"
                value={formData.functional.incontinence.pad_test_g}
                onChange={(e) => updateFormData('functional.incontinence.pad_test_g', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Labs & Imaging */}
      <Card title="Labs & Imaging" collapsible isOpen={!collapsedSections.labs} onToggle={() => toggleSection('labs')}>
        <div className="space-y-6">
          {/* Urinalysis */}
          <div>
            <FieldLabel>Urinalysis</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel className="text-xs">Blood</FieldLabel>
                <Input
                  name="urine_blood"
                  value={formData.labs_imaging.urinalysis.blood}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.blood', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Protein</FieldLabel>
                <Input
                  name="urine_protein"
                  value={formData.labs_imaging.urinalysis.protein}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.protein', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Nitrite</FieldLabel>
                <Input
                  name="urine_nitrite"
                  value={formData.labs_imaging.urinalysis.nitrite}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.nitrite', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Leuk Esterase</FieldLabel>
                <Input
                  name="urine_leuk"
                  value={formData.labs_imaging.urinalysis.leuk_esterase}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.leuk_esterase', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">RBC/HPF</FieldLabel>
                <Input
                  name="urine_rbc"
                  value={formData.labs_imaging.urinalysis.rbc_hpf}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.rbc_hpf', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">WBC/HPF</FieldLabel>
                <Input
                  name="urine_wbc"
                  value={formData.labs_imaging.urinalysis.wbc_hpf}
                  onChange={(e) => updateFormData('labs_imaging.urinalysis.wbc_hpf', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Urine Culture */}
          <div>
            <FieldLabel>Urine Culture</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs">Date</FieldLabel>
                <Input
                  type="date"
                  name="culture_date"
                  value={formData.labs_imaging.urine_culture.date}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.date', e.target.value)}
                />
                {errors.urine_culture_date && <p className="text-red-500 text-xs mt-1">{errors.urine_culture_date}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs">CFU/ml</FieldLabel>
                <Input
                  name="culture_cfu"
                  value={formData.labs_imaging.urine_culture.cfu}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.cfu', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Organism</FieldLabel>
                <Input
                  name="culture_organism"
                  value={formData.labs_imaging.urine_culture.organism}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.organism', e.target.value)}
                />
                {errors.urine_culture_organism && <p className="text-red-500 text-xs mt-1">{errors.urine_culture_organism}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs">Antibiotics Started</FieldLabel>
                <Input
                  name="culture_abx"
                  value={formData.labs_imaging.urine_culture.antibiotics_started}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.antibiotics_started', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <FieldLabel className="text-xs">Sensitivities</FieldLabel>
                <TextArea
                  name="culture_sens"
                  value={formData.labs_imaging.urine_culture.sensitivities}
                  onChange={(e) => updateFormData('labs_imaging.urine_culture.sensitivities', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Renal Panel */}
          <div>
            <FieldLabel>Renal Panel</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel className="text-xs">BUN</FieldLabel>
                <Input
                  name="bun"
                  value={formData.labs_imaging.renal_panel.bun}
                  onChange={(e) => updateFormData('labs_imaging.renal_panel.bun', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Creatinine</FieldLabel>
                <Input
                  name="creatinine"
                  value={formData.labs_imaging.renal_panel.creatinine}
                  onChange={(e) => updateFormData('labs_imaging.renal_panel.creatinine', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">eGFR</FieldLabel>
                <Input
                  name="egfr"
                  value={formData.labs_imaging.renal_panel.eGFR}
                  onChange={(e) => updateFormData('labs_imaging.renal_panel.eGFR', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* PSA */}
          <div>
            <FieldLabel>PSA</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs">Total PSA (ng/ml)</FieldLabel>
                <Input
                  type="number"
                  name="psa_total"
                  min="0"
                  value={formData.labs_imaging.psa.total_ng_ml}
                  onChange={(e) => updateFormData('labs_imaging.psa.total_ng_ml', e.target.value)}
                />
                {errors.psa_total && <p className="text-red-500 text-xs mt-1">{errors.psa_total}</p>}
              </div>
              <div>
                <FieldLabel className="text-xs">Free PSA (ng/ml)</FieldLabel>
                <Input
                  type="number"
                  name="psa_free"
                  min="0"
                  value={formData.labs_imaging.psa.free_ng_ml}
                  onChange={(e) => updateFormData('labs_imaging.psa.free_ng_ml', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Free/Total Ratio</FieldLabel>
                <Input
                  name="psa_ratio"
                  value={formData.labs_imaging.psa.ratio}
                  readOnly={true}
                  onChange={() => {}} // No-op for read-only field
                  className="bg-slate-100"
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Date</FieldLabel>
                <Input
                  type="date"
                  name="psa_date"
                  value={formData.labs_imaging.psa.date}
                  onChange={(e) => updateFormData('labs_imaging.psa.date', e.target.value)}
                />
                {errors.psa_date && <p className="text-red-500 text-xs mt-1">{errors.psa_date}</p>}
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.labs_imaging.psa.pre_DRE}
                    onChange={(e) => updateFormData('labs_imaging.psa.pre_DRE', e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Pre-DRE</span>
                </label>
              </div>
            </div>
          </div>

          {/* Hormones */}
          <div>
            <FieldLabel>Hormones</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs">Testosterone Total</FieldLabel>
                <Input
                  name="testosterone"
                  value={formData.labs_imaging.hormones.testosterone_total}
                  onChange={(e) => updateFormData('labs_imaging.hormones.testosterone_total', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Prolactin</FieldLabel>
                <Input
                  name="prolactin"
                  value={formData.labs_imaging.hormones.prolactin}
                  onChange={(e) => updateFormData('labs_imaging.hormones.prolactin', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">LH</FieldLabel>
                <Input
                  name="lh"
                  value={formData.labs_imaging.hormones.lh}
                  onChange={(e) => updateFormData('labs_imaging.hormones.lh', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">FSH</FieldLabel>
                <Input
                  name="fsh"
                  value={formData.labs_imaging.hormones.fsh}
                  onChange={(e) => updateFormData('labs_imaging.hormones.fsh', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Semen Analysis */}
          <div>
            <FieldLabel>Semen Analysis</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel className="text-xs">Date</FieldLabel>
                <Input
                  type="date"
                  name="semen_date"
                  value={formData.labs_imaging.semen_analysis.date}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.date', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Volume (ml)</FieldLabel>
                <Input
                  type="number"
                  name="semen_volume"
                  min="0"
                  value={formData.labs_imaging.semen_analysis.volume_ml}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.volume_ml', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Count (million/ml)</FieldLabel>
                <Input
                  type="number"
                  name="semen_count"
                  min="0"
                  value={formData.labs_imaging.semen_analysis.count_million_ml}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.count_million_ml', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Motility (%)</FieldLabel>
                <Input
                  type="number"
                  name="semen_motility"
                  min="0"
                  max="100"
                  value={formData.labs_imaging.semen_analysis.motility_pct}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.motility_pct', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel className="text-xs">Morphology (%)</FieldLabel>
                <Input
                  type="number"
                  name="semen_morphology"
                  min="0"
                  max="100"
                  value={formData.labs_imaging.semen_analysis.morphology_pct}
                  onChange={(e) => updateFormData('labs_imaging.semen_analysis.morphology_pct', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Imaging */}
          <div>
            <FieldLabel>Imaging Studies</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {IMAGING_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addToArray('labs_imaging.imaging', preset)}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.labs_imaging.imaging.map((img, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('labs_imaging.imaging', idx)}>
                  {img}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Diagnosis */}
      <Card title="Diagnosis" collapsible isOpen={!collapsedSections.diagnosis} onToggle={() => toggleSection('diagnosis')}>
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
            {errors.diagnosis_main && <p className="text-red-500 text-sm mt-1">{errors.diagnosis_main}</p>}
          </div>
          
          <div>
            <FieldLabel>Secondary Diagnoses</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.secondary.map((diag, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.secondary', idx)}>
                  {diag}
                </Chip>
              ))}
            </div>
            <Input
              name="secondary_diagnosis"
              placeholder="Add secondary diagnosis..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  addToArray('diagnosis.secondary', e.target.value.trim());
                  e.target.value = '';
                }
              }}
            />
          </div>

          <div>
            <FieldLabel>Diagnosis Codes</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.diagnosis.codes.map((code, idx) => (
                <Chip key={idx} onRemove={() => removeFromArray('diagnosis.codes', idx)}>
                  {code.system} {code.code}: {code.term}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Select
                name="code_system"
                value={newCode.system}
                onChange={(e) => setNewCode(prev => ({ ...prev, system: e.target.value }))}
                options={[
                  { value: 'ICD10', label: 'ICD10' },
                  { value: 'ICD11', label: 'ICD11' },
                  { value: 'SNOMED', label: 'SNOMED' }
                ]}
              />
              <Input 
                name="code_code" 
                placeholder="Code" 
                value={newCode.code}
                onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value }))}
              />
              <Input 
                name="code_term" 
                placeholder="Term" 
                value={newCode.term}
                onChange={(e) => setNewCode(prev => ({ ...prev, term: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => {
                  if (newCode.system && newCode.code && newCode.term) {
                    addToArray('diagnosis.codes', { ...newCode });
                    setNewCode({ system: '', code: '', term: '' });
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
              >
                Add Code
              </button>
            </div>
            <div className="mt-2">
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
        </div>
      </Card>

      {/* Plan & Treatment - Initial Mode Only */}
      {mode === 'initial' && (
        <Card title="Plan & Treatment" collapsible isOpen={!collapsedSections.plan} onToggle={() => toggleSection('plan')}>
          <div className="space-y-4">
            <div>
              <FieldLabel>Medications</FieldLabel>
              <FieldLabel className="text-xs">({formData.plan.meds.length})</FieldLabel>
              {formData.plan.meds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.plan.meds.map((med, idx) => {
                    const label = `${med.med} ${med.dose} ${med.route} ${med.freq} ${med.duration}`;
                    return (
                      <Chip key={idx} onEdit={() => openMedEditor(med, idx)} onRemove={() => removeMed(idx)}>
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
                          conc_strength: selected.strength || s.conc_strength
                        }));
                      }}
                    />
                  </div>
                  <div className="col-span-12">
                    <Input 
                      placeholder="Concentration/Strength" 
                      value={editingMed.conc_strength} 
                      onChange={(e) => setEditingMed(s => ({...s, conc_strength: e.target.value}))}
                    />
                  </div>
                  <div className="col-span-12">
                    <Select 
                      name="med_route" 
                      value={editingMed.route} 
                      onChange={(e) => setEditingMed(s => ({...s, route: e.target.value}))}
                      options={[
                        {value:'topical',label:'Topical'},
                        {value:'oral',label:'Oral'},
                        {value:'injection',label:'Injection'},
                        {value:'other',label:'Other'}
                      ]} 
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
                  <div className="col-span-12">
                    <TextArea 
                      placeholder="Instructions" 
                      value={editingMed.instructions} 
                      onChange={(e) => setEditingMed(s => ({...s, instructions: e.target.value}))}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-12 flex gap-2">
                    <button type="button" onClick={saveMed} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Save</button>
                    <button type="button" onClick={() => { setEditingMed(null); setEditingMedIdx(null); }} className="px-4 py-2 border border-slate-300 rounded-lg">Cancel</button>
                  </div>
                </div>
              )}
              
              {!editingMed && (
                <button
                  type="button"
                  onClick={() => openMedEditor()}
                  className="mt-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                >
                  + Add Medication
                </button>
              )}
            </div>

            <div>
              <FieldLabel>Planned Procedures</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {PROCEDURE_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addToArray('plan.procedures_planned', preset)}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.procedures_planned.map((proc, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.procedures_planned', idx)}>
                    {proc}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Counseling</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {COUNSELING_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addToArray('plan.counseling', preset)}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.counseling.map((counsel, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.counseling', idx)}>
                    {counsel}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Referrals</FieldLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {REFERRAL_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (formData.plan.referrals.includes(preset)) {
                        removeFromArray('plan.referrals', formData.plan.referrals.indexOf(preset));
                      } else {
                        addToArray('plan.referrals', preset);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      formData.plan.referrals.includes(preset)
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.plan.referrals.map((ref, idx) => (
                  <Chip key={idx} onRemove={() => removeFromArray('plan.referrals', idx)}>
                    {ref}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Follow-up</FieldLabel>
              <Select
                name="follow_up"
                value={formData.plan.follow_up}
                onChange={(e) => updateFormData('plan.follow_up', e.target.value)}
                options={FOLLOW_UP_OPTIONS.map(f => ({ value: f, label: f === '48h' ? '48 hours' : f === '1w' ? '1 week' : f === '1m' ? '1 month' : f === '3m' ? '3 months' : f === 'PRN' ? 'PRN' : 'Specific date' }))}
              />
              {formData.plan.follow_up === 'date' && (
                <div className="mt-2">
                  <Input
                    type="date"
                    name="follow_up_date"
                    value={formData.plan.follow_up_date}
                    onChange={(e) => updateFormData('plan.follow_up_date', e.target.value)}
                  />
                  {errors.follow_up_date && <p className="text-red-500 text-sm mt-1">{errors.follow_up_date}</p>}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Procedures Done */}
      <Card title="Procedures Done" collapsible isOpen={!collapsedSections.procedures} onToggle={() => toggleSection('procedures')} counter={formData.procedures_done.length}>
        <div className="space-y-4">
          {formData.procedures_done.length > 0 && (
            <div className="space-y-2">
              {formData.procedures_done.map((proc, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{proc.name} - {proc.date}</p>
                      {proc.side && <p className="text-sm text-slate-600">Side: {proc.side}</p>}
                      {proc.technique && <p className="text-sm text-slate-600">Technique: {proc.technique}</p>}
                      {proc.findings && <p className="text-sm text-slate-600">Findings: {proc.findings}</p>}
                      {proc.complications && <p className="text-sm text-red-600">Complications: {proc.complications}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openProcedureEditor(proc, idx)} className="text-slate-600 hover:text-slate-800">✎</button>
                      <button type="button" onClick={() => removeProcedure(idx)} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {editingProcedure && (
            <div className="grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border">
              <div className="col-span-12">
                <Input 
                  placeholder="Procedure name" 
                  value={editingProcedure.name} 
                  onChange={(e) => setEditingProcedure(s => ({...s, name: e.target.value}))}
                />
              </div>
              <div className="col-span-12">
                <Input 
                  type="date"
                  placeholder="Date" 
                  value={editingProcedure.date} 
                  onChange={(e) => setEditingProcedure(s => ({...s, date: e.target.value}))}
                />
              </div>
              <div className="col-span-12">
                <Select 
                  name="side" 
                  value={editingProcedure.side} 
                  onChange={(e) => setEditingProcedure(s => ({...s, side: e.target.value}))}
                  options={[
                    {value:'R',label:'Right'},
                    {value:'L',label:'Left'},
                    {value:'Bilateral',label:'Bilateral'},
                    {value:'NA',label:'N/A'}
                  ]} 
                />
              </div>
              <div className="col-span-12">
                <Select 
                  name="anesthesia" 
                  value={editingProcedure.anesthesia} 
                  onChange={(e) => setEditingProcedure(s => ({...s, anesthesia: e.target.value}))}
                  options={[
                    {value:'none',label:'None'},
                    {value:'local',label:'Local'},
                    {value:'spinal',label:'Spinal'},
                    {value:'general',label:'General'}
                  ]} 
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Technique" 
                  value={editingProcedure.technique} 
                  onChange={(e) => setEditingProcedure(s => ({...s, technique: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Findings" 
                  value={editingProcedure.findings} 
                  onChange={(e) => setEditingProcedure(s => ({...s, findings: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12">
                <Select 
                  name="result" 
                  value={editingProcedure.result} 
                  onChange={(e) => setEditingProcedure(s => ({...s, result: e.target.value}))}
                  options={[
                    {value:'successful',label:'Successful'},
                    {value:'partial',label:'Partial'},
                    {value:'failed',label:'Failed'}
                  ]} 
                />
              </div>
              <div className="col-span-12">
                <TextArea 
                  placeholder="Complications" 
                  value={editingProcedure.complications} 
                  onChange={(e) => setEditingProcedure(s => ({...s, complications: e.target.value}))}
                  rows={2}
                />
              </div>
              <div className="col-span-12 flex gap-2">
                <button type="button" onClick={saveProcedure} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Save</button>
                <button type="button" onClick={() => { setEditingProcedure(null); setEditingProcedureIdx(null); }} className="px-4 py-2 border border-slate-300 rounded-lg">Cancel</button>
              </div>
            </div>
          )}
          
          {!editingProcedure && (
            <button
              type="button"
              onClick={() => openProcedureEditor()}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
            >
              + Add Procedure
            </button>
          )}
        </div>
      </Card>

      {/* Outcome & Recommendations - Discharge Mode Only */}
      {mode === 'discharge' && (
        <Card title="Outcome & Recommendations" collapsible isOpen={!collapsedSections.outcome} onToggle={() => toggleSection('outcome')}>
          <div className="space-y-4">
            <div>
              <FieldLabel>Condition at Discharge</FieldLabel>
              <Input
                name="condition"
                placeholder="Stable, improved, unchanged..."
                value={formData.outcome.condition}
                onChange={(e) => updateFormData('outcome.condition', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Hospital Course</FieldLabel>
              <TextArea
                name="course"
                placeholder="Summarize hospital stay, treatments, response..."
                value={formData.outcome.course}
                onChange={(e) => updateFormData('outcome.course', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <FieldLabel required>Recommendations</FieldLabel>
              <div className="space-y-2">
                {formData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
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
            <p className="text-xs text-slate-400 mb-2">Include imaging reports, procedure notes, etc.</p>
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

export default UrologyReportForm;

