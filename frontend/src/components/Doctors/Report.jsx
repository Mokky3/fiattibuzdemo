import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from './Header';
import MidwiferyForm from './forms/MidwiferyForm';
import GeneralVisitReport from './forms/GeneralVisitReport';
import CardiologyReportForm from './forms/CardiologyReportForm';
import TraumaOrthoReportForm from './forms/TraumaOrthoReportForm';
import OphthalmologyReportForm from './forms/OphthalmologyReportForm';
import OncologyReportForm from './forms/OncologyReportForm';
import NeurologyReportForm from './forms/NeurologyReportForm';
import UrologyReportForm from './forms/UrologyReportForm';
import AllergyImmunologyReportForm from './forms/AllergyImmunologyReportForm';
import { doctorPatientsAPI, doctorReportsAPI, getCurrentUser } from '../../services/apiService';

const Report = () => {
  const { patientId, reportId } = useParams(); // Get reportId if editing existing report
  const navigate = useNavigate();

  const [selectedSpecialty, setSelectedSpecialty] = useState('general');
  const [selectedCode, setSelectedCode] = useState('#001');
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({});
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [patientVitals, setPatientVitals] = useState([]);
  const [patientImmunizations, setPatientImmunizations] = useState([]);

  // Initialize formData structure when switching to General Visit Report (#001)
  useEffect(() => {
    if (selectedSpecialty === 'general' && selectedCode === '#001') {
      // Initialize with General Visit Report structure if not already set
      if (!formData.meta || formData.chief_complaint === undefined) {
        const clinicId = localStorage.getItem('clinic_id') || '';
        setFormData(prev => ({
          ...prev,
          meta: {
            clinic_id: clinicId,
            department_id: 'dept-general',
            physician_id: '',
            encounter_type: 'ambulatory',
            visit_datetime: new Date().toISOString(),
            ...prev.meta
          },
          chief_complaint: prev.chief_complaint !== undefined ? prev.chief_complaint : '',
          onset_time: prev.onset_time !== undefined ? prev.onset_time : null,
          info_source: prev.info_source || 'patient',
          hpi: prev.hpi || {
            onset: '',
            duration: '',
            course: '',
            modifiers: [],
            associated_symptoms: [],
            free: ''
          },
          pmh_fh_sh: prev.pmh_fh_sh || {
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
          ros: prev.ros || {
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
          pe: prev.pe || {
            general: 'normal',
            lungs: 'normal',
            heart: 'normal',
            abdomen: 'normal',
            neuro: 'normal',
            extremities: 'normal',
            notes: {}
          },
          assessment: prev.assessment || {
            working: [],
            ddx: []
          },
          plan: prev.plan || {
            tests: [],
            referrals: [],
            med_changes: [],
            lifestyle: [],
            follow_up: ''
          },
          summary: prev.summary !== undefined ? prev.summary : ''
        }));
      }
    }
  }, [selectedSpecialty, selectedCode]);

  // Fetch and set the last department report for this patient
  useEffect(() => {
    const loadLastReport = async () => {
      if (!patientId) return;
      
      try {
        // Get current doctor ID from user
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser.id) {
          console.log('No current user found, defaulting to general report');
          return;
        }

        // Fetch patient reports
        const reportsResponse = await doctorPatientsAPI.getReports(patientId);
        const reports = reportsResponse?.data || reportsResponse || [];
        
        if (!Array.isArray(reports) || reports.length === 0) {
          console.log('No reports found for patient, defaulting to general report');
          return;
        }

        // Filter reports by current doctor and find the most recent one
        const doctorReports = reports
          .filter(report => report.doctor_id === currentUser.id)
          .sort((a, b) => {
            // Sort by date (most recent first)
            const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`);
            const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`);
            return dateB - dateA;
          });

        if (doctorReports.length > 0) {
          const lastReport = doctorReports[0];
          console.log('Found last report:', lastReport);
          
          // Try to get specialty and doc_type from the report
          // Reports might have these fields directly or in nested data
          const backendSpecialty = lastReport.specialty || lastReport.reportData?.specialty || 'general_medicine';
          const docType = lastReport.doc_type || lastReport.reportData?.doc_type || lastReport.problem;
          
          // Map to frontend specialty and code
          const { specialty, code } = mapBackendToFrontend(backendSpecialty, docType);
          
          console.log(`Setting report to: ${specialty} / ${code} based on last report`);
          setSelectedSpecialty(specialty);
          setSelectedCode(code);
        } else {
          console.log('No reports found for current doctor, defaulting to general report');
        }
      } catch (error) {
        console.error('Error loading last report:', error);
        // Default to general on error
      }
    };

    loadLastReport();
  }, [patientId]);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await doctorPatientsAPI.getById(patientId)
        console.log('🔍 [Report] getById response:', response);
        // Extract the data field from the API response
        const data = response.data || response
        console.log('🔍 [Report] Extracted data:', data);
        console.log('🔍 [Report] height:', data.height, 'weight:', data.weight, 'bmi:', data.bmi);
        setPatient({
          id: data.id,
          name: `${data.first_name} ${data.last_name}`.trim(),
          gender: data.gender,
          dob: data.date_of_birth,
          age: data.age,
          height: data.height,
          weight: data.weight,
          bmi: data.bmi,
          last_measured: data.last_measured,
          temperature: data.temperature,
          bloodPressure: data.blood_pressure,
          bloodGroup: data.blood_group,
          rhFactor: data.rh_factor,
          phoneNumber: data.phone_number,
          emailAddress: data.email,
          address: data.address,
          temporaryAddress: data.temporary_address,
          allergies: data.allergies || data.allergy_info || '',
          // Medical History fields
          previousPregnancies: data.previous_pregnancies || data.pregnancy_history || '',
          complications: data.complications || data.previous_complications || '',
          currentMedications: data.current_medications || data.medications || '',
          familyHistory: data.family_history || data.family_medical_history || '',
          emergencyContact: data.emergency_contact || data.emergency_contact_info || '',
        })
        
        // Fetch allergies, vitals, and immunizations separately
        try {
          const allergies = await doctorPatientsAPI.getAllergies(patientId);
          console.log('Fetched allergies:', allergies);
          setPatientAllergies(Array.isArray(allergies) ? allergies : []);
        } catch (err) {
          console.error('Error fetching allergies:', err);
          setPatientAllergies([]);
        }
        
        try {
          const vitals = await doctorPatientsAPI.getVitals(patientId);
          console.log('Fetched vitals:', vitals);
          setPatientVitals(Array.isArray(vitals) ? vitals : []);
          
          // Update patient with latest vitals if available
          if (vitals && vitals.length > 0) {
            const latestVitals = vitals[0];
            setPatient(prev => ({
              ...prev,
              temperature: latestVitals.temperature || prev.temperature,
              bloodPressure: latestVitals.bloodPressure || prev.bloodPressure,
              height: latestVitals.height || prev.height,
              weight: latestVitals.weight || prev.weight,
              bmi: latestVitals.bmi || prev.bmi,
              lastVitalsDate: latestVitals.recordedAt || null,
            }));
          }
        } catch (err) {
          console.error('Error fetching vitals:', err);
          setPatientVitals([]);
        }
        
        try {
          const immunizations = await doctorPatientsAPI.getImmunizations(patientId);
          console.log('Fetched immunizations:', immunizations);
          setPatientImmunizations(Array.isArray(immunizations) ? immunizations : []);
        } catch (err) {
          console.error('Error fetching immunizations:', err);
          setPatientImmunizations([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPatient();
  }, [patientId]);

  // Map frontend specialty names to backend enum values
  const mapSpecialtyToBackend = (frontendSpecialty) => {
    const specialtyMap = {
      'general': 'general_medicine',
      'cardiology': 'cardiology',
      'neurology': 'neurology',
      'urology': 'urology',
      'general oncology': 'oncology',
      'ophthalmology': 'ophthalmology',
      'traumatology': 'surgery',
      'midwifery & gynecology': 'surgery', // Note: backend may not have this, mapping to closest
      'allergology': 'dermatology', // Note: backend may not have allergology, mapping to closest
    };
    return specialtyMap[frontendSpecialty] || 'general_medicine';
  };

  // Map backend specialty/doc_type to frontend specialty and code
  const mapBackendToFrontend = (backendSpecialty, docType) => {
    // Map backend specialties to frontend specialties
    const specialtyMap = {
      'general_medicine': 'general',
      'cardiology': 'cardiology',
      'neurology': 'neurology',
      'urology': 'urology',
      'oncology': 'general oncology',
      'ophthalmology': 'ophthalmology',
      'surgery': 'traumatology', // Default surgery to traumatology
      'dermatology': 'allergology', // Default dermatology to allergology
    };

    let frontendSpecialty = specialtyMap[backendSpecialty] || 'general';
    let code = '#001'; // Default to general report code

    // Map doc_type to specific codes if available
    if (docType) {
      const docTypeMap = {
        'general_visit': { specialty: 'general', code: '#001' },
        'midwifery': { specialty: 'midwifery & gynecology', code: '#025' },
        'cardiology': { specialty: 'cardiology', code: '#601' },
        'ophthalmology': { specialty: 'ophthalmology', code: '#101' },
        'neurology': { specialty: 'neurology', code: '#201' },
        'trauma': { specialty: 'traumatology', code: '#301' },
        'urology': { specialty: 'urology', code: '#401' },
        'oncology': { specialty: 'general oncology', code: '#501' },
        'allergy': { specialty: 'allergology', code: '#701' },
      };

      const mapped = docTypeMap[docType.toLowerCase()];
      if (mapped) {
        frontendSpecialty = mapped.specialty;
        code = mapped.code;
      }
    } else {
      // If no doc_type, use specialty-based default codes
      const specialtyCodeMap = {
        'general': '#001',
        'cardiology': '#601',
        'neurology': '#201',
        'urology': '#401',
        'general oncology': '#501',
        'ophthalmology': '#101',
        'traumatology': '#301',
        'midwifery & gynecology': '#025',
        'allergology': '#701',
      };
      code = specialtyCodeMap[frontendSpecialty] || '#001';
    }

    return { specialty: frontendSpecialty, code };
  };

  const handleSaveReport = async (payloadFromForm = null) => {
    try {
      // CRITICAL: Check if payloadFromForm is actually an event object (should never happen)
      if (payloadFromForm && typeof payloadFromForm === 'object') {
        // Check if it looks like a React event object (which shouldn't be passed)
        if (payloadFromForm._reactName || payloadFromForm.nativeEvent || (payloadFromForm.type === 'click' && payloadFromForm.screenX !== undefined)) {
          console.error('ERROR: handleSaveReport received an event object instead of form data!', {
            hasReactName: !!payloadFromForm._reactName,
            hasNativeEvent: !!payloadFromForm.nativeEvent,
            type: payloadFromForm.type,
            keys: Object.keys(payloadFromForm || {}),
            stackTrace: new Error().stack
          });
          alert('Error: Form data was not passed correctly. Please try saving again.');
          return;
        }
      }
      
      const clinicId = localStorage.getItem('clinic_id') || 'default-clinic'
      const backendSpecialty = mapSpecialtyToBackend(selectedSpecialty);
      
      // Debug: Log what we received
      if (payloadFromForm) {
        console.log('handleSaveReport - Received payloadFromForm:', {
          hasDocType: !!payloadFromForm.doc_type,
          hasMeta: !!payloadFromForm.meta,
          hasHpi: !!payloadFromForm.hpi,
          hasChiefComplaint: !!payloadFromForm.chief_complaint,
          payloadType: typeof payloadFromForm,
          isArray: Array.isArray(payloadFromForm),
          keys: Object.keys(payloadFromForm || {}).slice(0, 10)
        });
      }
      
      // If a form component passes payload directly (e.g., OphthalmologyReportForm), use it
      // Otherwise, use formData from state (for simple forms)
      const reportData = payloadFromForm || formData;
      
      // For General Visit Report (#001), ensure formData structure is correct
      if (selectedSpecialty === 'general' && selectedCode === '#001' && !payloadFromForm) {
        // Ensure formData has the required structure for GeneralReportData
        const processedData = {
          ...formData,
          meta: {
            ...formData.meta,
            clinic_id: clinicId,
            visit_datetime: formData.meta?.visit_datetime || new Date().toISOString()
          },
          // Ensure onset_time is null if empty string
          onset_time: formData.onset_time || null,
          // Ensure assessment fields are arrays of objects
          assessment: {
            working: Array.isArray(formData.assessment?.working) 
              ? formData.assessment.working.map(d => typeof d === 'string' ? { code: '', term: d } : d)
              : [],
            ddx: Array.isArray(formData.assessment?.ddx)
              ? formData.assessment.ddx.map(d => typeof d === 'string' ? { code: '', term: d } : d)
              : []
          },
          // Ensure plan fields are arrays
          plan: {
            tests: Array.isArray(formData.plan?.tests) ? formData.plan.tests : [],
            referrals: Array.isArray(formData.plan?.referrals) ? formData.plan.referrals : [],
            med_changes: Array.isArray(formData.plan?.med_changes) ? formData.plan.med_changes : [],
            lifestyle: Array.isArray(formData.plan?.lifestyle) ? formData.plan.lifestyle : [],
            follow_up: formData.plan?.follow_up || null
          }
        }
        
        const data = await doctorReportsAPI.create({
          patientId,
          specialty: backendSpecialty,
          code: selectedCode,
          data: processedData,
          clinicId,
        })
        
        // Debug: Log the response
        console.log('Report.jsx: General report save response:', {
          id: data?.id,
          fhir_document_reference_id: data?.fhir_document_reference_id,
          responseKeys: Object.keys(data || {})
        });
        
        // Use fhir_document_reference_id as primary ID for navigation (matches backend lookup)
        const savedReportId = data?.fhir_document_reference_id || data?.id || data?.document_reference?.id
        console.log('Report.jsx: Navigating to general report with ID:', savedReportId)
        navigate(`/reports/${savedReportId}`)
      } else {
        // For other report types (including ophthalmology), use the payload as-is
        // Ensure patient_id is set in meta if not already present
        // Sanitize the payload to remove circular references and non-serializable data
        // Use a more aggressive approach: try JSON.parse(JSON.stringify) with custom replacer
        let sanitizedReportData;
        try {
          // First attempt: use JSON.stringify with a replacer function
          const jsonString = JSON.stringify(reportData, (key, value) => {
            // Skip functions
            if (typeof value === 'function') {
              return undefined;
            }
            // Skip Window and global objects (global doesn't exist in browser, only window)
            if (value === window || value === self || value === globalThis) {
              return undefined;
            }
            // Skip DOM elements
            if (value instanceof HTMLElement || value instanceof Node || (value && value.nodeType !== undefined)) {
              return undefined;
            }
            // Skip React elements
            if (value && (value.$$typeof || value._owner || (value.props && value.$$typeof))) {
              return undefined;
            }
            // Skip React internal properties
            if (key.startsWith('__react') || key.startsWith('__') || key === 'stateNode' || key === 'ref' || key === 'window') {
              return undefined;
            }
            // Convert Date to ISO string
            if (value instanceof Date) {
              return value.toISOString();
            }
            return value;
          });
          sanitizedReportData = JSON.parse(jsonString);
        } catch (e) {
          // If JSON.stringify fails, fall back to manual sanitization
          console.warn('JSON.stringify failed, using manual sanitization:', e);
          const sanitizeForJSON = (obj, visited = new WeakSet()) => {
            if (obj === null || obj === undefined) return undefined;
            if (typeof obj === 'function') return undefined;
            if (typeof obj !== 'object') return obj;
            
            // Handle circular references
            if (visited.has(obj)) return undefined;
            
            // Handle DOM elements
            if (obj instanceof HTMLElement || obj instanceof Node || (obj.nodeType !== undefined && obj.nodeType !== null)) {
              return undefined;
            }
            
            // Handle React elements
            if (obj.$$typeof || obj._owner || obj.props) {
              return undefined;
            }
            
            // Handle Date
            if (obj instanceof Date) return obj.toISOString();
            
            visited.add(obj);
            
            try {
              if (Array.isArray(obj)) {
                return obj.map(item => sanitizeForJSON(item, visited)).filter(item => item !== undefined);
              }
              const sanitized = {};
              for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                  // Skip React internal properties
                  if (key.startsWith('__react') || key.startsWith('__') || key === 'stateNode' || key === 'ref') {
                    continue;
                  }
                  const value = sanitizeForJSON(obj[key], visited);
                  if (value !== undefined) {
                    sanitized[key] = value;
                  }
                }
              }
              return sanitized;
            } catch (err) {
              console.warn('Failed to sanitize object:', err);
              return undefined;
            }
          };
          sanitizedReportData = sanitizeForJSON(reportData);
        }
        const finalData = {
          ...sanitizedReportData,
          meta: {
            ...sanitizedReportData.meta,
            clinic_id: sanitizedReportData.meta?.clinic_id || clinicId,
            patient_id: sanitizedReportData.meta?.patient_id || patientId,
            datetime: sanitizedReportData.meta?.datetime || new Date().toISOString()
          }
        };
        
        // If editing an existing report, include the report ID in the payload
        if (reportId) {
          finalData.fhir_document_reference_id = reportId;
          finalData.report_id = reportId;
          finalData.id = reportId;
          console.log('Report.jsx: Editing existing report, including reportId in payload:', reportId);
        }
        
        // Debug: Log the payload being sent
        console.log('Report.jsx: Saving report with payload:', {
          specialty: backendSpecialty,
          code: selectedCode,
          hasDocType: !!finalData.doc_type,
          docType: finalData.doc_type,
          payloadKeys: Object.keys(finalData)
        });
        
        const data = await doctorReportsAPI.create({
          patientId,
          specialty: backendSpecialty,
          code: selectedCode,
          data: finalData,
          clinicId,
        })
        
        // Debug: Log the response
        console.log('Report.jsx: Save response:', {
          id: data?.id,
          fhir_document_reference_id: data?.fhir_document_reference_id,
          specialty: data?.specialty,
          doc_type: data?.doc_type,
          responseKeys: Object.keys(data || {})
        });
        
        // Use fhir_document_reference_id as primary ID for navigation (matches backend lookup)
        const savedReportId = data?.fhir_document_reference_id || data?.id || data?.document_reference?.id
        console.log('Report.jsx: Navigating to report with ID:', savedReportId)
        navigate(`/reports/${savedReportId}`)
      }
    } catch (err) {
      console.error('Error saving report:', err)
      alert(`Failed to save report: ${err?.message || 'Unknown error'}`)
    }
  };

  const specialties = [
    'general', 'ophthalmology', 'neurology', 'traumatology',
    'midwifery & gynecology', 'urology', 'general oncology',
    'cardiology', 'allergology'
  ];

  // Department-specific document codes
  const departmentCodes = {
    'general': ['#001', '#002', '#003', '#004'],
    'ophthalmology': ['#101', '#102', '#103', '#104'],
    'neurology': ['#201', '#202', '#203', '#204'],
    'traumatology': ['#301', '#302', '#303', '#304'],
    'midwifery & gynecology': ['#025', '#003-1', '#025-1', '#096'],
    'urology': ['#401', '#402', '#403', '#404'],
    'general oncology': ['#501', '#502', '#503', '#504'],
    'cardiology': ['#601', '#602', '#603', '#604'],
    'allergology': ['#701', '#702', '#703', '#704']
  };

  // Get current codes based on selected specialty
  const currentCodes = departmentCodes[selectedSpecialty] || departmentCodes['general'];

  // Auto-select first code when specialty changes
  useEffect(() => {
    if (currentCodes && !currentCodes.includes(selectedCode)) {
      setSelectedCode(currentCodes[0]);
    }
  }, [selectedSpecialty, currentCodes, selectedCode]);

  const renderSpecialtyForm = () => {
    const props = { formData, setFormData, patient, onSave: handleSaveReport };

    // Midwifery & Gynecology forms
    if (selectedSpecialty === 'midwifery & gynecology') {
      if (selectedCode === '#025') {
      return <MidwiferyForm {...props} />;
    }
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Midwifery & Gynecology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Examination Findings</label>
                <textarea
                  name="examinationFindings"
                  value={formData.examinationFindings || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, examinationFindings: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Record examination findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // General Medicine forms
    if (selectedSpecialty === 'general') {
      if (selectedCode === '#001') {
        return <GeneralVisitReport {...props} />;
      }
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              General Medical Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">History of Present Illness</label>
                <textarea
                  name="historyOfPresentIllness"
                  value={formData.historyOfPresentIllness || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, historyOfPresentIllness: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the history of the present illness..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
                <textarea
                  name="physicalExamination"
                  value={formData.physicalExamination || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, physicalExamination: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Record physical examination findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Cardiology forms
    if (selectedSpecialty === 'cardiology') {
      if (selectedCode === '#601') {
        return <CardiologyReportForm patient={patient} encounter={{ id: 'encounter-001', clinic_id: 'clinic-001', doctor_id: 'doctor-001', datetime: new Date().toISOString() }} onSave={handleSaveReport} />;
      }
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Cardiology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cardiac History</label>
                <textarea
                  name="cardiacHistory"
                  value={formData.cardiacHistory || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cardiacHistory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe cardiac history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
                <textarea
                  name="physicalExamination"
                  value={formData.physicalExamination || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, physicalExamination: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Record cardiac examination findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter cardiac diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the cardiac treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Ophthalmology forms
    if (selectedSpecialty === 'ophthalmology') {
      if (selectedCode === '#101') {
        return <OphthalmologyReportForm patient={patient} encounter={{ id: 'encounter-001', clinic_id: 'clinic-001', doctor_id: 'doctor-001', datetime: new Date().toISOString() }} onSave={handleSaveReport} />;
      }
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Ophthalmology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ocular History</label>
                <textarea
                  name="ocularHistory"
                  value={formData.ocularHistory || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ocularHistory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe ocular history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visual Acuity</label>
                <textarea
                  name="visualAcuity"
                  value={formData.visualAcuity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, visualAcuity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="2"
                  placeholder="Record visual acuity..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Neurology forms
    if (selectedSpecialty === 'neurology') {
      if (selectedCode === '#201') {
        return <NeurologyReportForm patient={patient} encounter={{ id: 'encounter-001', clinic_id: 'clinic-001', doctor_id: 'doctor-001', datetime: new Date().toISOString() }} onSave={handleSaveReport} />;
      }
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Neurology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neurological History</label>
                <textarea
                  name="neurologicalHistory"
                  value={formData.neurologicalHistory || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, neurologicalHistory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe neurological history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
                <textarea
                  name="physicalExamination"
                  value={formData.physicalExamination || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, physicalExamination: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Record examination findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Traumatology forms
    if (selectedSpecialty === 'traumatology') {
      if (selectedCode === '#301') {
        return <TraumaOrthoReportForm patient={patient} encounter={{ id: 'encounter-001', clinic_id: 'clinic-001', doctor_id: 'doctor-001', datetime: new Date().toISOString() }} onSave={handleSaveReport} />;
    }
    return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Traumatology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Injury Details</label>
                <textarea
                  name="injuryDetails"
                  value={formData.injuryDetails || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, injuryDetails: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe injury details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
                <textarea
                  name="physicalExamination"
                  value={formData.physicalExamination || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, physicalExamination: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Record examination findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Oncology forms
    if (selectedSpecialty === 'general oncology') {
      if (selectedCode === '#501') {
        return <OncologyReportForm patient={patient} encounter={{ id: 'encounter-001', clinic_id: 'clinic-001', doctor_id: 'doctor-001', datetime: new Date().toISOString() }} onSave={handleSaveReport} />;
    }
    return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Oncology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cancer History</label>
                <textarea
                  name="cancerHistory"
                  value={formData.cancerHistory || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cancerHistory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe cancer history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Urology forms
    if (selectedSpecialty === 'urology') {
      if (selectedCode === '#401') {
        return <UrologyReportForm patient={patient} encounter={{ id: 'encounter-001', clinic_id: 'clinic-001', doctor_id: 'doctor-001', datetime: new Date().toISOString() }} onSave={handleSaveReport} />;
      }
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Urology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urological History</label>
                <textarea
                  name="urologicalHistory"
                  value={formData.urologicalHistory || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, urologicalHistory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe urological history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Examination Findings</label>
                <textarea
                  name="examinationFindings"
                  value={formData.examinationFindings || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, examinationFindings: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Record examination findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Allergy/Immunology forms
    if (selectedSpecialty === 'allergology') {
      if (selectedCode === '#701') {
        return <AllergyImmunologyReportForm patient={patient} encounter={{ id: 'encounter-001', clinic_id: 'clinic-001', doctor_id: 'doctor-001', datetime: new Date().toISOString() }} onSave={handleSaveReport} />;
      }
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Allergy/Immunology Report - {selectedCode}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <textarea
                  name="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter the patient's main complaint..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allergy History</label>
                <textarea
                  name="allergyHistory"
                  value={formData.allergyHistory || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, allergyHistory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe allergy history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Examination Findings</label>
                <textarea
                  name="examinationFindings"
                  value={formData.examinationFindings || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, examinationFindings: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Record examination findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="3"
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  rows="4"
                  placeholder="Describe the treatment plan..."
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Other specialties - generic form
    return (
      <div className="p-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedSpecialty.charAt(0).toUpperCase() + selectedSpecialty.slice(1)} Report - {selectedCode}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
              <textarea
                name="chiefComplaint"
                value={formData.chiefComplaint || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                rows="3"
                placeholder="Enter the patient's main complaint..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Examination Findings</label>
              <textarea
                name="examinationFindings"
                value={formData.examinationFindings || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, examinationFindings: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                rows="4"
                placeholder="Record examination findings..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                rows="3"
                placeholder="Enter diagnosis..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
              <textarea
                name="treatmentPlan"
                value={formData.treatmentPlan || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                rows="4"
                placeholder="Describe the treatment plan..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">Loading patient info...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="w-full h-full bg-repeat" style={{ backgroundImage: "url('/medical-icons.svg')" }}></div>
        </div>

        {/* Patient Sidebar - Sticky */}
        <div className="md:w-1/5 lg:w-1/6 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[#5ACCC3] font-medium text-sm">Patient portal</h2>
              <button className="text-[#5ACCC3]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 5a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <button onClick={() => navigate('/doctor/patient')} className="text-gray-600 text-sm mb-4 hover:text-[#5ACCC3]">
              &larr; back
            </button>

            <div className="border border-gray-200 rounded-md p-4 mb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-md"></div>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-[#5ACCC3] font-medium">{patient.name} {patient.gender === 'male' ? '♂' : '♀'}</h3>
                <p className="text-sm text-gray-600">{patient.dob}</p>
                <p className="text-xs text-gray-500">Age: {patient.age}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Info label="Height" value={patient.height} />
                <Info label="Weight" value={patient.weight} />
                <Info label="BMI" value={patient.bmi} />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Info label="Temperature" value={patient.temperature} />
                <Info label="Blood Pressure" value={patient.bloodPressure} />
              </div>

              <p className="text-xs text-gray-400 text-center mb-4">
                {patient?.last_measured || patient?.lastVitalsDate 
                  ? `Last measured: ${new Date(patient.last_measured || patient.lastVitalsDate).toLocaleString()}` 
                  : 'Last measured: —'}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Info label="Blood Group" value={patient.bloodGroup} />
                <Info label="Blood rh factor" value={patient.rhFactor} />
              </div>

              {/* Allergies Section */}
              <div className="mb-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center mb-2">
                    <svg className="h-4 w-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-red-700 text-xs font-medium">Allergies</p>
                  </div>
                  {patientAllergies && patientAllergies.length > 0 ? (
                    <div className="space-y-1">
                      {patientAllergies.map((allergy) => (
                        <p key={allergy.id} className="text-sm text-red-800">
                          {allergy.display_name || allergy.name || 'Unknown'} 
                          {allergy.criticality && ` (${allergy.criticality})`}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-red-800">No known allergies</p>
                  )}
                </div>
              </div>
              
              {/* Immunizations Section */}
              {patientImmunizations && patientImmunizations.length > 0 && (
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-green-700 text-xs font-medium mb-2">Immunizations</p>
                    <div className="space-y-1 text-sm text-green-800">
                      {patientImmunizations.slice(0, 5).map((imm) => (
                        <div key={imm.id} className="flex justify-between">
                          <span>
                            {imm.vaccine}
                            {imm.lotNumber && ` (Lot: ${imm.lotNumber})`}
                          </span>
                          {imm.date && (
                            <span className="text-xs text-green-600">
                              {new Date(imm.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Info label="Phone Number" value={patient.phoneNumber} />
              <Info label="Email Address" value={patient.emailAddress} />
              <Info label="Address" value={patient.address} />
              <Info label="Temporary Address" value={patient.temporaryAddress} />
            </div>
          </div>
        </div>

        {/* Form Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {specialties.map(specialty => (
                <button
                  key={specialty}
                  onClick={() => setSelectedSpecialty(specialty)}
                  className={`px-3 py-1 text-sm rounded-md ${selectedSpecialty === specialty ? 'bg-[#5ACCC3] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {specialty}
                </button>
              ))}
            </div>

            <div className="bg-[#5ACCC3]/10 rounded-md p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {currentCodes.map(code => (
                  <button
                    key={code}
                    onClick={() => setSelectedCode(code)}
                    className={`px-3 py-1 text-sm rounded-md ${selectedCode === code ? 'bg-[#5ACCC3] text-white' : 'text-[#5ACCC3] bg-white'}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-md border border-gray-200">
              {renderSpecialtyForm()}

              {/* Only show default save button for forms that don't have their own save buttons */}
              {/* Specialty forms with their own save buttons: ophthalmology, cardiology, neurology, urology, oncology */}
              {!(
                (selectedSpecialty === 'ophthalmology' && selectedCode === '#101') ||
                (selectedSpecialty === 'cardiology' && selectedCode === '#201') ||
                (selectedSpecialty === 'neurology' && selectedCode === '#301') ||
                (selectedSpecialty === 'urology' && selectedCode === '#401') ||
                (selectedSpecialty === 'general oncology' && selectedCode === '#501')
              ) && (
                <div className="flex justify-end p-4 border-t">
                  <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Call handleSaveReport without passing the event
                      handleSaveReport();
                    }}
                    className="px-4 py-2 bg-[#5ACCC3] text-white rounded-md text-sm"
                  >
                    Save Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div className="mb-3">
    <p className="text-gray-600 text-xs">{label}:</p>
    <p className="text-sm">{value || '-'}</p>
  </div>
);

export default Report;
