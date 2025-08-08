import React, { useState, useRef } from 'react';

const MidwiferyForm = () => {
  const formRef = useRef(null);
  // Form state
  const [formData, setFormData] = useState({});

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const scrollPos = formRef.current?.scrollTop;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Restore scroll position after state update
    if (formRef.current) {
      setTimeout(() => {
        formRef.current.scrollTop = scrollPos;
      }, 0);
    }
  };

  // Label and input field component
  const FormField = ({ label, name, type = 'text', placeholder = '', options = [], width = 'full' }) => {
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
        <label className="block text-gray-600 text-xs mb-1">{label}</label>
        {type === 'select' ? (
          <select 
            name={name} 
            value={formData[name] || ''} 
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select an option</option>
            {options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
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
                  onChange={handleChange}
                  className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        ) : type === 'checkbox' ? (
          <label className="flex items-center">
            <input
              type="checkbox"
              name={name}
              checked={formData[name] || false}
              onChange={handleChange}
              className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
            />
            <span className="text-sm">{placeholder}</span>
          </label>
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          />
        )}
      </div>
    );
  };

  // Section component with title
  const FormSection = ({ title, children, bgColor = 'bg-white' }) => (
    <div className={`${bgColor} rounded-lg p-4 sm:p-6 mb-6 shadow-sm border border-gray-100`}>
      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 border-b border-gray-200 pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
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
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8" ref={formRef}>
          <FormSection title="Patient Information" bgColor="bg-blue-50">
            <FormField label="Patient Name" name="patientName" placeholder="Enter full name" />
            <FormField label="Date of Birth" name="dateOfBirth" type="date" />
            <FormField label="Age" name="age" type="number" placeholder="Age in years" />
            <FormField label="Contact Number" name="contactNumber" type="tel" placeholder="Phone number" />
            <FormField label="Address" name="address" type="textarea" placeholder="Full address" width="full" />
            <FormField label="Emergency Contact" name="emergencyContact" placeholder="Emergency contact name and number" width="full" />
          </FormSection>

          <FormSection title="Medical History" bgColor="bg-green-50">
            <FormField label="Blood Group" name="bloodGroup" type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            <FormField label="Allergies" name="allergies" type="textarea" placeholder="List any allergies" width="full" />
            <FormField label="Previous Pregnancies" name="previousPregnancies" type="number" placeholder="Number of previous pregnancies" />
            <FormField label="Complications" name="complications" type="textarea" placeholder="Any previous complications" width="full" />
            <FormField label="Current Medications" name="currentMedications" type="textarea" placeholder="List current medications" width="full" />
            <FormField label="Family History" name="familyHistory" type="textarea" placeholder="Relevant family medical history" width="full" />
          </FormSection>

          <FormSection title="Current Pregnancy" bgColor="bg-yellow-50">
            <FormField label="Last Menstrual Period" name="lastMenstrualPeriod" type="date" />
            <FormField label="Expected Due Date" name="expectedDueDate" type="date" />
            <FormField label="Gestational Age" name="gestationalAge" placeholder="Weeks and days" />
            <FormField label="Pregnancy Type" name="pregnancyType" type="select" options={['Singleton', 'Twins', 'Triplets', 'Other']} />
            <FormField label="Pregnancy Number" name="pregnancyNumber" type="number" placeholder="Number of current pregnancy" />
            <FormField label="High Risk Factors" name="highRiskFactors" type="textarea" placeholder="Any high risk factors" width="full" />
          </FormSection>

          <FormSection title="Vital Signs" bgColor="bg-red-50">
            <FormField label="Blood Pressure" name="bloodPressure" placeholder="e.g., 120/80 mmHg" />
            <FormField label="Pulse Rate" name="pulseRate" type="number" placeholder="Beats per minute" />
            <FormField label="Temperature" name="temperature" type="number" placeholder="°C" />
            <FormField label="Weight" name="weight" type="number" placeholder="kg" />
            <FormField label="Height" name="height" type="number" placeholder="cm" />
            <FormField label="BMI" name="bmi" type="number" placeholder="Body Mass Index" />
          </FormSection>

          <FormSection title="Obstetric Examination" bgColor="bg-purple-50">
            <FormField label="Fundal Height" name="fundalHeight" placeholder="cm" />
            <FormField label="Fetal Heart Rate" name="fetalHeartRate" type="number" placeholder="Beats per minute" />
            <FormField label="Fetal Position" name="fetalPosition" type="select" options={['Cephalic', 'Breech', 'Transverse', 'Oblique']} />
            <FormField label="Fetal Movement" name="fetalMovement" type="select" options={['Normal', 'Reduced', 'Absent']} />
            <FormField label="Cervical Dilation" name="cervicalDilation" placeholder="cm" />
            <FormField label="Station" name="station" placeholder="Fetal station" />
          </FormSection>

          <FormSection title="Laboratory Tests" bgColor="bg-indigo-50">
            <FormField label="Hemoglobin" name="hemoglobin" placeholder="g/dL" />
            <FormField label="Blood Sugar" name="bloodSugar" placeholder="mg/dL" />
            <FormField label="Urine Analysis" name="urineAnalysis" type="textarea" placeholder="Urine test results" width="full" />
            <FormField label="HIV Status" name="hivStatus" type="select" options={['Negative', 'Positive', 'Unknown', 'Not Tested']} />
            <FormField label="Hepatitis B" name="hepatitisB" type="select" options={['Negative', 'Positive', 'Unknown', 'Not Tested']} />
            <FormField label="Syphilis" name="syphilis" type="select" options={['Negative', 'Positive', 'Unknown', 'Not Tested']} />
          </FormSection>

          <FormSection title="Ultrasound Findings" bgColor="bg-teal-50">
            <FormField label="Placenta Position" name="placentaPosition" type="select" options={['Anterior', 'Posterior', 'Fundal', 'Previa']} />
            <FormField label="Amniotic Fluid" name="amnioticFluid" type="select" options={['Normal', 'Oligohydramnios', 'Polyhydramnios']} />
            <FormField label="Estimated Fetal Weight" name="estimatedFetalWeight" placeholder="grams" />
            <FormField label="Ultrasound Date" name="ultrasoundDate" type="date" />
            <FormField label="Additional Findings" name="additionalFindings" type="textarea" placeholder="Any additional ultrasound findings" width="full" />
          </FormSection>

          <FormSection title="Care Plan" bgColor="bg-orange-50">
            <FormField label="Next Visit Date" name="nextVisitDate" type="date" />
            <FormField label="Recommended Tests" name="recommendedTests" type="textarea" placeholder="Tests to be done" width="full" />
            <FormField label="Medications Prescribed" name="medicationsPrescribed" type="textarea" placeholder="Medications and dosages" width="full" />
            <FormField label="Dietary Recommendations" name="dietaryRecommendations" type="textarea" placeholder="Dietary advice" width="full" />
            <FormField label="Activity Restrictions" name="activityRestrictions" type="textarea" placeholder="Activity limitations" width="full" />
            <FormField label="Emergency Instructions" name="emergencyInstructions" type="textarea" placeholder="When to seek emergency care" width="full" />
          </FormSection>

          <FormSection title="Notes and Observations" bgColor="bg-gray-50">
            <FormField label="General Observations" name="generalObservations" type="textarea" placeholder="General physical examination findings" width="full" />
            <FormField label="Patient Concerns" name="patientConcerns" type="textarea" placeholder="Patient's concerns and questions" width="full" />
            <FormField label="Provider Notes" name="providerNotes" type="textarea" placeholder="Provider's clinical notes" width="full" />
            <FormField label="Follow-up Plan" name="followUpPlan" type="textarea" placeholder="Follow-up care plan" width="full" />
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