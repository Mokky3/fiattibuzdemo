import React, { useState, useEffect, useCallback, useRef } from 'react';
import { medicationsAPI, icdCodesAPI } from '../../../services/apiService';

// FormField component moved outside to prevent recreation
const FormField = React.memo(({ label, name, type = 'text', placeholder = '', options = [], width = 'full', formData, onChange }) => {
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
      <label className="block text-gray-600 text-xs mb-1">{label}</label>
      {type === 'select' ? (
        <select 
          key={name}
          name={name} 
          value={formData[name] || ''} 
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
        >
          <option value="">Select an option</option>
          {options.map((option, index) => (
            <option key={index} value={option}>{option}</option>
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
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] resize-none"
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
                className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
              />
              <span className="text-sm">{option}</span>
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
          <span className="text-sm">{placeholder}</span>
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
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
        />
      )}
    </div>
  );
});

// FormSection component moved outside
const FormSection = React.memo(({ title, children, bgColor = 'bg-white' }) => (
  <div className={`${bgColor} rounded-lg p-4 sm:p-6 mb-6 shadow-sm border border-gray-100`}>
    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 border-b border-gray-200 pb-2">
      {title}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
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
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#5ACCC3] border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                <span className="text-xs text-gray-700 flex-1">
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
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#5ACCC3] border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                  <span className="text-xs text-gray-500">
                    {result.strength} {result.strength_unit?.name || ''}
                  </span>
                )}
              </div>
              {result.mnn?.name && (
                <div className="text-xs text-gray-500 mt-1">
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
const MedicationListField = ({ label, name, value, onChange, formData }) => {
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
      <label className="block text-gray-600 text-xs mb-1">{label}</label>
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
          placeholder="Search medication to add..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSelect={handleAddMedication}
        />
      </div>
    </div>
  );
};

const MidwiferyForm = ({ formData, setFormData, patient }) => {
  // Auto-populate patient information when patient data is available
  useEffect(() => {
    if (patient && setFormData) {
      setFormData(prev => ({
        ...prev,
        // Patient Information
        patientName: patient.name || '',
        dateOfBirth: patient.dob || '',
        age: patient.age || '',
        contactNumber: patient.phoneNumber || '',
        address: patient.address || '',
        emergencyContact: patient.emergencyContact || '',
        // Medical History
        bloodGroup: patient.bloodGroup || '',
        allergies: patient.allergies || '',
        previousPregnancies: patient.previousPregnancies || '',
        complications: patient.complications || '',
        currentMedications: patient.currentMedications || '',
        familyHistory: patient.familyHistory || '',
        // Vital Signs
        bloodPressure: patient.bloodPressure || '',
        temperature: patient.temperature || '',
        weight: patient.weight || '',
        height: patient.height || '',
        bmi: patient.bmi || '',
      }));
    }
  }, [patient, setFormData]);

  // Stable handle input change function
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, [setFormData]);

  // Initialize diagnosis fields if not present (only once on mount)
  useEffect(() => {
    if (formData && formData.diagnosis === undefined) {
      setFormData(prev => ({
        ...prev,
        diagnosis: prev.diagnosis || '',
        diagnosisCodes: prev.diagnosisCodes || []
      }));
    }
  }, []); // Only run once on mount, not when formData changes


  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Midwifery Form</h1>
              <p className="text-gray-600 text-sm sm:text-base">Complete patient assessment and care plan</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors">
                Save Draft
              </button>
              <button className="px-4 sm:px-6 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors">
                Submit Form
              </button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
          <FormSection title="Patient Information" bgColor="bg-blue-50">
            <FormField label="Patient Name" name="patientName" placeholder="Enter full name" formData={formData} onChange={handleChange} />
            <FormField label="Date of Birth" name="dateOfBirth" type="date" formData={formData} onChange={handleChange} />
            <FormField label="Age" name="age" type="number" placeholder="Age in years" formData={formData} onChange={handleChange} />
            <FormField label="Contact Number" name="contactNumber" type="tel" placeholder="Phone number" formData={formData} onChange={handleChange} />
            <FormField label="Address" name="address" type="textarea" placeholder="Full address" width="full" formData={formData} onChange={handleChange} />
            <FormField label="Emergency Contact" name="emergencyContact" placeholder="Emergency contact name and number" width="full" formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Medical History" bgColor="bg-green-50">
            <FormField label="Blood Group" name="bloodGroup" type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} formData={formData} onChange={handleChange} />
            <FormField label="Allergies" name="allergies" type="textarea" placeholder="List any allergies" width="full" formData={formData} onChange={handleChange} />
            <FormField label="Previous Pregnancies" name="previousPregnancies" type="number" placeholder="Number of previous pregnancies" formData={formData} onChange={handleChange} />
            <FormField label="Complications" name="complications" type="textarea" placeholder="Any previous complications" width="full" formData={formData} onChange={handleChange} />
            <MedicationListField label="Current Medications" name="currentMedications" value={formData.currentMedications || ''} onChange={handleChange} formData={formData} />
            <FormField label="Family History" name="familyHistory" type="textarea" placeholder="Relevant family medical history" width="full" formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Current Pregnancy" bgColor="bg-yellow-50">
            <FormField label="Last Menstrual Period" name="lastMenstrualPeriod" type="date" formData={formData} onChange={handleChange} />
            <FormField label="Expected Due Date" name="expectedDueDate" type="date" formData={formData} onChange={handleChange} />
            <FormField label="Gestational Age" name="gestationalAge" placeholder="Weeks and days" formData={formData} onChange={handleChange} />
            <FormField label="Pregnancy Type" name="pregnancyType" type="select" options={['Singleton', 'Twins', 'Triplets', 'Other']} formData={formData} onChange={handleChange} />
            <FormField label="Pregnancy Number" name="pregnancyNumber" type="number" placeholder="Number of current pregnancy" formData={formData} onChange={handleChange} />
            <FormField label="High Risk Factors" name="highRiskFactors" type="textarea" placeholder="Any high risk factors" width="full" formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Vital Signs" bgColor="bg-red-50">
            <FormField label="Blood Pressure" name="bloodPressure" placeholder="e.g., 120/80 mmHg" formData={formData} onChange={handleChange} />
            <FormField label="Pulse Rate" name="pulseRate" type="number" placeholder="Beats per minute" formData={formData} onChange={handleChange} />
            <FormField label="Temperature" name="temperature" type="number" placeholder="°C" formData={formData} onChange={handleChange} />
            <FormField label="Weight" name="weight" type="number" placeholder="kg" formData={formData} onChange={handleChange} />
            <FormField label="Height" name="height" type="number" placeholder="cm" formData={formData} onChange={handleChange} />
            <FormField label="BMI" name="bmi" type="number" placeholder="Body Mass Index" formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Obstetric Examination" bgColor="bg-purple-50">
            <FormField label="Fundal Height" name="fundalHeight" placeholder="cm" formData={formData} onChange={handleChange} />
            <FormField label="Fetal Heart Rate" name="fetalHeartRate" type="number" placeholder="Beats per minute" formData={formData} onChange={handleChange} />
            <FormField label="Fetal Position" name="fetalPosition" type="select" options={['Cephalic', 'Breech', 'Transverse', 'Oblique']} formData={formData} onChange={handleChange} />
            <FormField label="Fetal Movement" name="fetalMovement" type="select" options={['Normal', 'Reduced', 'Absent']} formData={formData} onChange={handleChange} />
            <FormField label="Cervical Dilation" name="cervicalDilation" placeholder="cm" formData={formData} onChange={handleChange} />
            <FormField label="Station" name="station" placeholder="Fetal station" formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Laboratory Tests" bgColor="bg-indigo-50">
            <FormField label="Hemoglobin" name="hemoglobin" placeholder="g/dL" formData={formData} onChange={handleChange} />
            <FormField label="Blood Sugar" name="bloodSugar" placeholder="mg/dL" formData={formData} onChange={handleChange} />
            <FormField label="Urine Analysis" name="urineAnalysis" type="textarea" placeholder="Urine test results" width="full" formData={formData} onChange={handleChange} />
            <FormField label="HIV Status" name="hivStatus" type="select" options={['Negative', 'Positive', 'Unknown', 'Not Tested']} formData={formData} onChange={handleChange} />
            <FormField label="Hepatitis B" name="hepatitisB" type="select" options={['Negative', 'Positive', 'Unknown', 'Not Tested']} formData={formData} onChange={handleChange} />
            <FormField label="Syphilis" name="syphilis" type="select" options={['Negative', 'Positive', 'Unknown', 'Not Tested']} formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Ultrasound Findings" bgColor="bg-teal-50">
            <FormField label="Placenta Position" name="placentaPosition" type="select" options={['Anterior', 'Posterior', 'Fundal', 'Previa']} formData={formData} onChange={handleChange} />
            <FormField label="Amniotic Fluid" name="amnioticFluid" type="select" options={['Normal', 'Oligohydramnios', 'Polyhydramnios']} formData={formData} onChange={handleChange} />
            <FormField label="Estimated Fetal Weight" name="estimatedFetalWeight" placeholder="grams" formData={formData} onChange={handleChange} />
            <FormField label="Ultrasound Date" name="ultrasoundDate" type="date" formData={formData} onChange={handleChange} />
            <FormField label="Additional Findings" name="additionalFindings" type="textarea" placeholder="Any additional ultrasound findings" width="full" formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Diagnosis" bgColor="bg-pink-50">
            <div className="w-full px-2 mb-3">
              <label className="block text-gray-600 text-xs mb-1">Main Diagnosis</label>
              <div className="space-y-2">
                {formData.diagnosis && typeof formData.diagnosis === 'object' && (formData.diagnosis.code || formData.diagnosis.term) ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex gap-2 items-start flex-1">
                      <input
                        type="text"
                        placeholder="ICD-11 code"
                        value={formData.diagnosis.code || ''}
                        onChange={(e) => {
                          const current = typeof formData.diagnosis === 'object' ? formData.diagnosis : { code: '', term: '' };
                          handleChange({
                            target: { name: 'diagnosis', value: { ...current, code: e.target.value } }
                          });
                        }}
                        className="w-32 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      />
                      <input
                        type="text"
                        placeholder="Diagnosis term"
                        value={formData.diagnosis.term || ''}
                        onChange={(e) => {
                          const current = typeof formData.diagnosis === 'object' ? formData.diagnosis : { code: '', term: '' };
                          handleChange({
                            target: { name: 'diagnosis', value: { ...current, term: e.target.value } }
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: 'diagnosis', value: '' } })}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
                <IcdCodeSearchInput
                  placeholder="Search ICD-11 code or diagnosis..."
                  onSelect={(selected) => {
                    handleChange({
                      target: { name: 'diagnosis', value: selected }
                    });
                  }}
                />
              </div>
            </div>
            <div className="w-full px-2 mb-3">
              <label className="block text-gray-600 text-xs mb-1">Diagnosis Codes</label>
              <div className="space-y-2">
                {formData.diagnosisCodes && formData.diagnosisCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.diagnosisCodes.map((code, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#5ACCC3]/10 text-[#5ACCC3] rounded text-xs"
                      >
                        {typeof code === 'object' ? `${code.code}: ${code.term}` : code}
                        <button
                          type="button"
                          onClick={() => {
                            const newCodes = formData.diagnosisCodes.filter((_, i) => i !== index);
                            handleChange({ target: { name: 'diagnosisCodes', value: newCodes } });
                          }}
                          className="text-[#5ACCC3] hover:text-[#4BB5AC] ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <IcdCodeSearchInput
                  placeholder="Search ICD-11 code to add..."
                  onSelect={(selected) => {
                    const currentCodes = Array.isArray(formData.diagnosisCodes) ? formData.diagnosisCodes : [];
                    handleChange({
                      target: { name: 'diagnosisCodes', value: [...currentCodes, selected] }
                    });
                  }}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Care Plan" bgColor="bg-orange-50">
            <FormField label="Next Visit Date" name="nextVisitDate" type="date" formData={formData} onChange={handleChange} />
            <FormField label="Recommended Tests" name="recommendedTests" type="textarea" placeholder="Tests to be done" width="full" formData={formData} onChange={handleChange} />
            <MedicationListField label="Medications Prescribed" name="medicationsPrescribed" value={formData.medicationsPrescribed || ''} onChange={handleChange} formData={formData} />
            <FormField label="Dietary Recommendations" name="dietaryRecommendations" type="textarea" placeholder="Dietary advice" width="full" formData={formData} onChange={handleChange} />
            <FormField label="Activity Restrictions" name="activityRestrictions" type="textarea" placeholder="Activity limitations" width="full" formData={formData} onChange={handleChange} />
            <FormField label="Emergency Instructions" name="emergencyInstructions" type="textarea" placeholder="When to seek emergency care" width="full" formData={formData} onChange={handleChange} />
          </FormSection>

          <FormSection title="Notes and Observations" bgColor="bg-gray-50">
            <FormField label="General Observations" name="generalObservations" type="textarea" placeholder="General physical examination findings" width="full" formData={formData} onChange={handleChange} />
            <FormField label="Patient Concerns" name="patientConcerns" type="textarea" placeholder="Patient's concerns and questions" width="full" formData={formData} onChange={handleChange} />
            <FormField label="Provider Notes" name="providerNotes" type="textarea" placeholder="Provider's clinical notes" width="full" formData={formData} onChange={handleChange} />
            <FormField label="Follow-up Plan" name="followUpPlan" type="textarea" placeholder="Follow-up care plan" width="full" formData={formData} onChange={handleChange} />
          </FormSection>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-8 pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              <button className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors">
                Save Draft
              </button>
              <button className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                Print Form
              </button>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button className="px-4 sm:px-6 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors">
                Submit Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MidwiferyForm;