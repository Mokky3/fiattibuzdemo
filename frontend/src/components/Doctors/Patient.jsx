import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doctorPatientsAPI, medicationsAPI, checkBackendHealth } from '../../services/apiService';
import { API_BASE_URL } from '../../config/api';
import { uploadDicomStudy, getStudies } from '../../services/radiologyService';
import { Upload, Monitor, FileText, X, Loader, AlertCircle, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';

const Patient = () => {
  const { t } = useTranslation();
  const [selectedPatient, setSelectedPatient] = useState(0);
  const [activeTab, setActiveTab] = useState('reports');
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Radiology tab state
  const [patientRadiologyStudies, setPatientRadiologyStudies] = useState([]);
  const [radiologyLoading, setRadiologyLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadForm, setUploadForm] = useState({
    modality: '',
    body_part: '',
    description: '',
    source: 'external_cd',
    study_date: format(new Date(), 'yyyy-MM-dd'),
    file: null
  });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Patient-specific data states
  const [patientReports, setPatientReports] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState(null);
  
  // Prescription modal state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showPrescriptionTable, setShowPrescriptionTable] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    status: 'active'
  });

  // Medication search state
  const [medicationSearchResults, setMedicationSearchResults] = useState([]);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const [medicationSearchLoading, setMedicationSearchLoading] = useState(false);
  const medicationSearchTimeoutRef = useRef(null);
  const medicationInputRef = useRef(null);

  // Filter and sort states
  const [filterOption, setFilterOption] = useState('all');
  const [sortOption, setSortOption] = useState('date');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const navigate = useNavigate();

  // Load patients on component mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        
        // Check backend health
        const isHealthy = await checkBackendHealth();
        setBackendConnected(isHealthy);
        
        if (isHealthy) {
          try {
            const response = await doctorPatientsAPI.list();
            // Extract the data field from the API response
            const patientsData = response.data || response;
            console.log('Patients data received:', patientsData);
            setPatients(patientsData);
          } catch (apiError) {
            console.error('Failed to load patients from backend:', apiError);
            setError('Failed to load patients from server');
          }
        } else {
          console.log('Backend not available');
          setError('Backend server is not connected. Please ensure the server is running.');
        }
      } catch (err) {
        console.error('Error loading patients:', err);
        setError('Failed to connect to backend server');
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  // Load patient-specific data when selected patient changes
  useEffect(() => {
    if (patients.length > 0 && selectedPatient < patients.length) {
      const patientId = patients[selectedPatient].id;
      loadPatientData(patientId);
      loadPatientDetails(patientId);
      // Also load radiology studies if radiology tab is active
      if (activeTab === 'radiology') {
        loadPatientRadiologyStudies(patientId);
      }
    }
  }, [selectedPatient, patients, activeTab]);

  const loadPatientData = async (patientId) => {
    if (activeTab === 'reports') {
      await loadPatientReports(patientId);
    } else if (activeTab === 'prescriptions') {
      await loadPatientPrescriptions(patientId);
    } else if (activeTab === 'radiology') {
      await loadPatientRadiologyStudies(patientId);
    }
  };
  
  const loadPatientRadiologyStudies = async (patientId) => {
    if (!patientId) {
      console.log('No patientId provided, skipping radiology studies load');
      setPatientRadiologyStudies([]);
      return;
    }
    try {
      setRadiologyLoading(true);
      console.log('Loading radiology studies for patient:', patientId);
      // Filter studies by patient_id directly
      const studiesData = await getStudies({
        patientId: patientId, // Use patient_id filter instead of search
        page: 1,
        size: 100
      });
      console.log('Radiology studies response:', studiesData);
      // Handle different response formats
      let studies = [];
      if (Array.isArray(studiesData)) {
        studies = studiesData;
      } else if (studiesData?.items && Array.isArray(studiesData.items)) {
        studies = studiesData.items;
      } else if (studiesData?.data && Array.isArray(studiesData.data)) {
        studies = studiesData.data;
      }
      console.log('Parsed radiology studies:', studies);
      setPatientRadiologyStudies(studies);
    } catch (err) {
      console.error('Error loading radiology studies:', err);
      setPatientRadiologyStudies([]);
    } finally {
      setRadiologyLoading(false);
    }
  };

  const loadPatientDetails = async (patientId) => {
    try {
      const response = await doctorPatientsAPI.getById(patientId);
      console.log('🔍 [Patient] getById response:', response);
      // Extract the data field from the API response
      const data = response.data || response;
      console.log('🔍 [Patient] Extracted data:', data);
      console.log('🔍 [Patient] height:', data.height, 'weight:', data.weight, 'bmi:', data.bmi);
      setSelectedPatientDetails(data);
    } catch (err) {
      console.error('Error loading patient details:', err);
      setSelectedPatientDetails(null);
    }
  };

  const loadPatientReports = async (patientId) => {
    try {
      setReportsLoading(true);
      
      if (backendConnected) {
        try {
          const response = await doctorPatientsAPI.getReports(patientId);
          // Extract the data field from the API response
          const reports = response.data || response;
          setPatientReports(reports);
        } catch (apiError) {
          console.error('Failed to load patient reports:', apiError);
          setError('Failed to load reports');
        }
      }
    } catch (err) {
      console.error('Error loading patient reports:', err);
      setPatientReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadPatientPrescriptions = async (patientId) => {
    try {
      setPrescriptionsLoading(true);
      
      if (backendConnected) {
        try {
          const response = await doctorPatientsAPI.getPrescriptions(patientId);
          // Extract the data field from the API response
          const prescriptions = response.data || response;
          setPatientPrescriptions(prescriptions);
        } catch (apiError) {
          console.error('Failed to load patient prescriptions:', apiError);
          setError('Failed to load prescriptions');
        }
      }
    } catch (err) {
      console.error('Error loading patient prescriptions:', err);
      setPatientPrescriptions([]);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  const handleTabChange = async (newTab) => {
    setActiveTab(newTab);
    if (patients.length > 0) {
      if (newTab === 'reports') {
        await loadPatientReports(patients[selectedPatient].id);
      } else if (newTab === 'prescriptions') {
        await loadPatientPrescriptions(patients[selectedPatient].id);
      } else if (newTab === 'radiology') {
        await loadPatientRadiologyStudies(patients[selectedPatient].id);
      }
    }
  };

  const handlePatientSelect = async (index) => {
    setSelectedPatient(index);
    if (patients[index]) {
      await loadPatientData(patients[index].id);
    }
  };

  const handleAddReport = () => {
    if (patients[selectedPatient]) {
      navigate(`/doctor/report/${patients[selectedPatient].id}`);
    }
  };

  const [uploadingNote, setUploadingNote] = useState(false);
  const [uploadNoteError, setUploadNoteError] = useState(null);
  const [uploadNoteSuccess, setUploadNoteSuccess] = useState(null);

  const handleUploadNote = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!patients[selectedPatient]) {
      setUploadNoteError('Please select a patient first');
      return;
    }

    if (file.type !== 'application/pdf') {
      setUploadNoteError('Only PDF files are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadNoteError('File size must be less than 10MB');
      return;
    }

    setUploadingNote(true);
    setUploadNoteError(null);
    setUploadNoteSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', patients[selectedPatient].id);

      const token = localStorage.getItem('token');
      // API_BASE_URL from config already handles dev/prod automatically
      // It will use http://localhost:8000 in development mode

      const response = await fetch(`${API_BASE_URL}/api/v1/doctor/reports/upload-note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || errorData.message || 'Upload failed');
      }

      const result = await response.json();
      setUploadNoteSuccess(`Note uploaded successfully! Processed ${result.data?.fhir_processing?.resources_count || 0} FHIR resources.`);
      
      // Reload patient data to show new reports/conditions/observations
      if (patients[selectedPatient]) {
        await loadPatientReports(patients[selectedPatient].id);
      }

      // Reset file input
      event.target.value = '';

      // Clear success message after 5 seconds
      setTimeout(() => setUploadNoteSuccess(null), 5000);
    } catch (error) {
      console.error('Error uploading note:', error);
      setUploadNoteError(error.message || 'Failed to upload note');
    } finally {
      setUploadingNote(false);
    }
  };

  const handleViewReport = (reportId) => {
    navigate(`/reports/${reportId}`);
  };

  const handleViewAllReports = () => {
    if (patients[selectedPatient]) {
      navigate(`/patients/${patients[selectedPatient].id}/reports`);
    }
  };

  const handleEditReport = async (reportId) => {
    navigate(`/reports/${reportId}/edit`);
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        if (backendConnected) {
          await doctorPatientsAPI.deleteReport(reportId);
          // Reload reports after deletion
          await loadPatientReports(patients[selectedPatient].id);
        }
      } catch (err) {
        console.error('Error deleting report:', err);
        setError('Failed to delete report');
      }
    }
  };

  const handleEditPrescription = async (prescriptionId) => {
    navigate(`/prescriptions/${prescriptionId}/edit`);
  };

  const handleDeletePrescription = async (prescriptionId) => {
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      try {
        if (backendConnected) {
          await doctorPatientsAPI.deletePrescription(prescriptionId);
          // Reload prescriptions after deletion
          await loadPatientPrescriptions(patients[selectedPatient].id);
        }
      } catch (err) {
        console.error('Error deleting prescription:', err);
        setError('Failed to delete prescription');
      }
    }
  };

  const handleUpdatePrescriptionStatus = async (prescriptionId, newStatus) => {
    try {
      if (backendConnected) {
        await doctorPatientsAPI.updatePrescriptionStatus(prescriptionId, newStatus);
        // Reload prescriptions after update
        await loadPatientPrescriptions(patients[selectedPatient].id);
      }
    } catch (err) {
      console.error('Error updating prescription status:', err);
      setError('Failed to update prescription status');
    }
  };

  const handlePrescriptionInputChange = (e) => {
    const { name, value } = e.target;
    setNewPrescription(prev => ({
      ...prev,
      [name]: value
    }));

    // Handle medication search for medication_name field
    if (name === 'medication_name') {
      // Clear previous timeout
      if (medicationSearchTimeoutRef.current) {
        clearTimeout(medicationSearchTimeoutRef.current);
      }

      // Show dropdown if there's text
      if (value.trim().length > 0) {
        // Debounce search - wait 300ms after user stops typing
        medicationSearchTimeoutRef.current = setTimeout(() => {
          searchMedications(value);
        }, 300);
      } else {
        setMedicationSearchResults([]);
        setShowMedicationDropdown(false);
      }
    }
  };

  const searchMedications = async (query) => {
    if (!query || query.trim().length < 2) {
      setMedicationSearchResults([]);
      setShowMedicationDropdown(false);
      return;
    }

    try {
      setMedicationSearchLoading(true);
      const response = await medicationsAPI.search(query, 10);
      const results = response.products || response.data?.products || [];
      setMedicationSearchResults(results);
      setShowMedicationDropdown(results.length > 0);
    } catch (err) {
      console.error('Error searching medications:', err);
      setMedicationSearchResults([]);
      setShowMedicationDropdown(false);
    } finally {
      setMedicationSearchLoading(false);
    }
  };

  const handleSelectMedication = (medication) => {
    setNewPrescription(prev => ({
      ...prev,
      medication_name: medication.brand_name
    }));
    setShowMedicationDropdown(false);
    setMedicationSearchResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (medicationInputRef.current && !medicationInputRef.current.contains(event.target)) {
        setShowMedicationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clean up search timeout on unmount
      if (medicationSearchTimeoutRef.current) {
        clearTimeout(medicationSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleCreatePrescription = async () => {
    try {
      if (!patients[selectedPatient]) return;

      const patientId = patients[selectedPatient].id;
      
      if (backendConnected) {
        try {
          // Include patient_id in the payload as required by backend schema
          // Don't include status - let backend use default (ACTIVE)
          const { status, ...prescriptionData } = newPrescription;
          const prescriptionPayload = {
            ...prescriptionData,
            patient_id: patientId
          };
          const response = await doctorPatientsAPI.createPrescription(patientId, prescriptionPayload);
          // Extract the data field from the API response
          const createdPrescription = response.data || response;
          setPatientPrescriptions(prev => [createdPrescription, ...prev]);
          
          // Reset form and close modal
          setNewPrescription({
            medication_name: '',
            dosage: '',
            frequency: '',
            duration: '',
            instructions: '',
            status: 'active'
          });
          // Reset medication search state
          setMedicationSearchResults([]);
          setShowMedicationDropdown(false);
          setShowPrescriptionModal(false);
        } catch (apiError) {
          console.error('Failed to create prescription via API:', apiError);
          setError('Failed to create prescription');
        }
      } else {
        setError('Cannot create prescription - backend not connected');
      }
    } catch (err) {
      console.error('Error creating prescription:', err);
      setError('Failed to create prescription');
    }
  };

  const handleRefreshData = async () => {
    if (patients[selectedPatient]) {
      await loadPatientData(patients[selectedPatient].id);
    }
  };

  const handleExportData = () => {
    // Implement export functionality
    console.log('Export data for patient:', patients[selectedPatient]);
    // This could export to PDF, CSV, etc.
  };

  const handlePrintData = () => {
    window.print();
  };

  const renderReportsContent = () => {
    if (reportsLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
            darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
          }`}></div>
          <span className={`ml-3 ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('loadingReports')}</span>
        </div>
      );
    }

    if (!backendConnected) {
      return (
        <div className={`flex flex-col items-center justify-center h-[300px] rounded-lg border-2 border-dashed transition-colors ${
          darkMode
            ? 'text-[#8AA2A7] bg-[#10262D] border-[#133037]'
            : 'text-gray-400 bg-gray-50 border-gray-200'
        }`}>
          <svg className={`w-12 h-12 mb-4 ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-300'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={`text-lg font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('backendNotConnected')}</p>
          <p className={`text-sm mt-1 ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
          }`}>{t('pleaseEnsureBackendServerIsRunning')}</p>
        </div>
      );
    }

    if (patientReports.length > 0) {
      return (
        <div className="space-y-4">
          {patientReports.map((report) => (
            <div key={report.id} className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200 ${
              darkMode
                ? 'bg-[#10262D] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className="text-center min-w-[80px]">
                    <div className={`text-lg font-semibold ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{report.time}</div>
                    <div className={`text-xs font-medium ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{report.date}</div>
                  </div>
                  
                  <div className="min-w-[140px]">
                    <div className={`font-semibold ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{patients[selectedPatient]?.first_name} {patients[selectedPatient]?.last_name}</div>
                    <div className={`text-xs ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{patients[selectedPatient]?.patient_code}</div>
                  </div>
                  
                  <div className="min-w-[160px]">
                    <div className={`font-semibold ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{report.problem}</div>
                    {report.diagnosis && (
                      <div className={`text-xs font-medium ${
                        darkMode ? 'text-[#4ADE80]' : 'text-green-600'
                      }`}>{t('diagnosis')}: {report.diagnosis}</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-[200px]">
                    <div className={`text-sm leading-relaxed ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{report.description}</div>
                    {report.treatment && (
                      <div className={`text-xs mt-1 ${
                        darkMode ? 'text-[#79CAC2]' : 'text-blue-600'
                      }`}>{t('treatment')}: {report.treatment}</div>
                    )}
                  </div>
                  
                  <div className="min-w-[120px]">
                    <div className={`text-sm font-medium ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{report.doctor_name}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleViewReport(report.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm ${
                      darkMode
                        ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                        : 'bg-[#5ACCC3] text-white hover:bg-[#4BB5AC]'
                    }`}
                  >
                    {t('view')}
                  </button>
                  <button 
                    onClick={() => handleEditReport(report.id)}
                    className={`p-2 transition-colors duration-200 ${
                      darkMode
                        ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                        : 'text-gray-600 hover:text-[#5ACCC3]'
                    }`}
                    title={t('editReport')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeleteReport(report.id)}
                    className={`p-2 transition-colors duration-200 ${
                      darkMode
                        ? 'text-[#8AA2A7] hover:text-[#FB7185]'
                        : 'text-gray-600 hover:text-red-600'
                    }`}
                    title={t('deleteReport')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center justify-center h-[300px] rounded-lg border-2 border-dashed transition-colors ${
        darkMode
          ? 'text-[#8AA2A7] bg-[#10262D] border-[#133037]'
          : 'text-gray-400 bg-gray-50 border-gray-200'
      }`}>
        <svg className={`w-12 h-12 mb-4 ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-300'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className={`text-lg font-medium ${
          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
        }`}>{t('noReportsFound')}</p>
        <p className={`text-sm mt-1 ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
        }`}>{t('thisPatientDoesntHaveAnyReportsYet')}</p>
      </div>
    );
  };

  const renderPrescriptionsContent = () => {
    if (prescriptionsLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
            darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
          }`}></div>
          <span className={`ml-3 ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('loadingPrescriptions')}</span>
        </div>
      );
    }

    if (!backendConnected) {
      return (
        <div className={`flex flex-col items-center justify-center h-[300px] rounded-lg border-2 border-dashed transition-colors ${
          darkMode
            ? 'text-[#8AA2A7] bg-[#10262D] border-[#133037]'
            : 'text-gray-400 bg-gray-50 border-gray-200'
        }`}>
          <svg className={`w-12 h-12 mb-4 ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-300'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={`text-lg font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('backendNotConnected')}</p>
          <p className={`text-sm mt-1 ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
          }`}>{t('pleaseEnsureBackendServerIsRunning')}</p>
        </div>
      );
    }

    if (patientPrescriptions.length > 0) {
      return (
        <div className="space-y-4">
          {patientPrescriptions.map((prescription) => (
            <div key={prescription.id} className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200 ${
              darkMode
                ? 'bg-[#10262D] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className="min-w-[120px]">
                    <div className={`text-lg font-semibold ${
                      darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
                    }`}>{prescription.medication_name}</div>
                    <div className={`text-xs font-medium ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{prescription.prescribed_date}</div>
                  </div>
                  
                  <div className="min-w-[100px]">
                    <div className={`font-semibold ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('dosage')}</div>
                    <div className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{prescription.dosage}</div>
                  </div>
                  
                  <div className="min-w-[120px]">
                    <div className={`font-semibold ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('frequency')}</div>
                    <div className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{prescription.frequency}</div>
                  </div>
                  
                  <div className="min-w-[100px]">
                    <div className={`font-semibold ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('duration')}</div>
                    <div className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{prescription.duration}</div>
                  </div>
                  
                  <div className="flex-1 min-w-[200px]">
                    <div className={`font-semibold ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('instructions')}</div>
                    <div className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{prescription.instructions || t('noSpecialInstructions')}</div>
                  </div>
                  
                  <div className="min-w-[120px]">
                    <div className={`text-sm font-medium ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{prescription.doctor_name}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={prescription.status}
                    onChange={(e) => handleUpdatePrescriptionStatus(prescription.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      prescription.status === 'active' 
                        ? darkMode
                          ? 'bg-[#062412] text-[#4ADE80] border-[#062412]'
                          : 'bg-green-100 text-green-800 border-green-200'
                        : darkMode
                        ? 'bg-[#10262D] text-[#8AA2A7] border-[#133037]'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    <option value="active">{t('active')}</option>
                    <option value="completed">{t('completed')}</option>
                    <option value="cancelled">{t('cancelled')}</option>
                  </select>
                  <button 
                    onClick={() => handleEditPrescription(prescription.id)}
                    className={`p-2 transition-colors duration-200 ${
                      darkMode
                        ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                        : 'text-gray-600 hover:text-[#5ACCC3]'
                    }`}
                    title={t('editPrescription')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeletePrescription(prescription.id)}
                    className={`p-2 transition-colors duration-200 ${
                      darkMode
                        ? 'text-[#8AA2A7] hover:text-[#FB7185]'
                        : 'text-gray-600 hover:text-red-600'
                    }`}
                    title={t('deletePrescription')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center justify-center h-[300px] rounded-lg border-2 border-dashed transition-colors ${
        darkMode
          ? 'text-[#8AA2A7] bg-[#10262D] border-[#133037]'
          : 'text-gray-400 bg-gray-50 border-gray-200'
      }`}>
        <svg className={`w-12 h-12 mb-4 ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-300'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <p className={`text-lg font-medium ${
          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
        }`}>{t('noPrescriptionsFound')}</p>
        <p className={`text-sm mt-1 ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
        }`}>{t('thisPatientDoesntHaveAnyPrescriptionsYet')}</p>
      </div>
    );
  };

  const renderRadiologyContent = () => {
    if (!selectedPatientDetails) {
      return (
        <div className={`text-center py-12 ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
        }`}>
          <p>{t('pleaseSelectPatientToViewRadiologyStudies')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Upload Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              darkMode
                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                : 'bg-[#5ACCC3] text-white hover:bg-[#4BB5AC]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{t('uploadDicomStudy')}</span>
          </button>
        </div>

        {/* Studies List */}
        {radiologyLoading ? (
          <div className="flex justify-center py-12">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
              darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
            }`}></div>
          </div>
        ) : patientRadiologyStudies.length === 0 ? (
          <div className={`text-center py-12 rounded-lg shadow-sm transition-colors ${
            darkMode
              ? 'bg-[#10262D] border border-[#133037]'
              : 'bg-white'
          }`}>
            <Monitor className={`w-12 h-12 mx-auto mb-4 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
            }`} />
            <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('noRadiologyStudiesFoundForThisPatient')}</p>
            <p className={`text-sm mt-2 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{t('uploadDicomStudyToGetStarted')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patientRadiologyStudies.map((study) => (
              <div key={study.id} className={`rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
                darkMode
                  ? 'bg-[#10262D] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Monitor className={`w-5 h-5 ${
                      darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
                    }`} />
                    <div>
                      <h3 className={`font-semibold text-sm ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>
                        {study.studyDescription || study.modality || t('radiologyStudy')}
                      </h3>
                      {study.modality && (
                        <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                          darkMode
                            ? 'text-[#8AA2A7] bg-[#0D2026]'
                            : 'text-gray-500 bg-gray-100'
                        }`}>
                          {study.modality}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={`space-y-1 text-xs mb-3 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>
                  {study.bodyPart && (
                    <div>{t('bodyPart')}: {study.bodyPart}</div>
                  )}
                  {study.scheduledDate && (
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(study.scheduledDate), 'MMM d, yyyy')}
                    </div>
                  )}
                  {study.accessionNumber && (
                    <div className="flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      {study.accessionNumber}
                    </div>
                  )}
                </div>

                {study.studyInstanceUid && (
                  <button
                    onClick={() => {
                      navigate('/doctor/pacs', { 
                        state: { 
                          studyInstanceUID: study.studyInstanceUid,
                          orthancStudyId: study.orthancStudyId,
                          patientId: patients[selectedPatient]?.id || null
                        } 
                      });
                    }}
                    className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center space-x-2 ${
                      darkMode
                        ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                        : 'bg-[#5ACCC3] text-white hover:bg-[#4BB5AC]'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>{t('viewImages')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === 'reports') {
      return renderReportsContent();
    } else if (activeTab === 'prescriptions') {
      return renderPrescriptionsContent();
    } else if (activeTab === 'radiology') {
      return renderRadiologyContent();
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`flex flex-col min-h-screen transition-colors ${
        darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
      }`}>
        <Header />
        <div className="flex justify-center items-center flex-1">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
          }`}></div>
          <span className={`ml-4 text-lg ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('connectingToBackend')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <Header />
      
      {/* Backend status and error indicators */}
      {!backendConnected && (
        <div className={`border px-4 py-3 mx-2 sm:mx-4 mt-4 rounded transition-colors ${
          darkMode
            ? 'bg-[#251F07] border-[#FACC15] text-[#FACC15]'
            : 'bg-yellow-100 border-yellow-400 text-yellow-700'
        }`}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('backendNotConnected')}
          </div>
        </div>
      )}
      
      {error && (
        <div className={`border px-4 py-3 mx-2 sm:mx-4 mt-4 rounded transition-colors ${
          darkMode
            ? 'bg-[#2A0E15] border-[#FB7185] text-[#FB7185]'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
          <button 
            onClick={() => setError(null)}
            className={`float-right transition-colors ${
              darkMode ? 'text-[#FB7185] hover:text-[#FB7185]' : 'text-red-700 hover:text-red-900'
            }`}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className={`text-2xl font-bold bg-clip-text text-transparent ${
              darkMode
                ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA]'
                : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0]'
            }`}>
              {t('patients')}
            </h2>
          </div>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex gap-6">
          {/* Left Sidebar - Patient list */}
          <div className="lg:w-1/4 flex-shrink-0">
          <div className={`rounded-xl shadow-sm border p-4 sm:p-6 transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border-[#133037]'
              : 'bg-white border-gray-100'
          }`}>
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`font-semibold text-sm sm:text-base ${
                  darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
                }`}>{t('patientsList')}</h2>
                <div className="flex items-center space-x-2">
                  {backendConnected && (
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      darkMode ? 'bg-[#4ADE80]' : 'bg-green-500'
                    }`} title={t('backendConnected')}></div>
                  )}
                  <button 
                    onClick={handleRefreshData}
                    className={`p-1 rounded-md transition-colors duration-200 ${
                      darkMode
                        ? 'text-[#79CAC2] hover:bg-[#79CAC2] hover:bg-opacity-10'
                        : 'text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10'
                    }`}
                    title={t('refreshData')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              {patients.length > 0 ? (
                patients.map((patient, index) => (
                  <div 
                    key={patient.id} 
                    onClick={() => handlePatientSelect(index)}
                    className={`py-3 sm:py-4 px-3 sm:px-4 cursor-pointer border rounded-xl text-center transition-all duration-200 ${
                      selectedPatient === index 
                        ? darkMode
                          ? 'bg-[#79CAC2] text-[#050C0F] shadow-md transform scale-105'
                          : 'bg-[#5ACCC3] text-white shadow-md transform scale-105'
                        : darkMode
                        ? 'bg-[#10262D] border-[#133037] hover:bg-[#133037] hover:border-[#79CAC2] hover:shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-[#5ACCC3] hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-semibold text-xs sm:text-sm ${
                      selectedPatient === index 
                        ? darkMode ? 'text-[#050C0F]' : 'text-white'
                        : darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <p className={`text-xs mt-1 ${
                      selectedPatient === index 
                        ? darkMode ? 'text-[#050C0F] text-opacity-80' : 'text-white text-opacity-90'
                        : darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>
                      {patient.patient_code}
                    </p>
                  </div>
                ))
              ) : (
                <div className={`text-center py-6 sm:py-8 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>
                  <p className="text-xs sm:text-sm">{t('noPatientsFound')}</p>
                  <p className="text-xs mt-1">{t('pleaseCheckBackendConnection')}</p>
                </div>
              )}
            </div>
          </div>
          </div>
          
          {/* Main content - Patient details */}
          <div className="lg:w-3/4">
          <div className={`rounded-xl shadow-sm border p-4 sm:p-8 transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border-[#133037]'
              : 'bg-white border-gray-100'
          }`}>
            {patients[selectedPatient] ? (
              <>
                <div className={`rounded-xl p-6 mb-6 transition-colors ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#79CAC2]/10 to-[#58B4AA]/10'
                    : 'bg-gradient-to-r from-[#5ACCC3]/5 to-[#4DB6B0]/5'
                }`}>
                  {/* Patient Header */}
                  <div className="flex items-start gap-6 mb-6">
                    {/* Patient Avatar */}
                    <div className={`w-20 h-20 rounded-xl shadow-lg flex items-center justify-center flex-shrink-0 ${
                      darkMode
                        ? 'bg-gradient-to-br from-[#79CAC2] to-[#58B4AA]'
                        : 'bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0]'
                    }`}>
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <h2 className={`text-2xl font-bold mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>
                        {patients[selectedPatient].first_name} {patients[selectedPatient].last_name}
                      </h2>
                      <div className={`flex items-center gap-4 text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {patients[selectedPatient].age} {t('yearsOld')}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {patients[selectedPatient].gender}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {patients[selectedPatient].patient_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Medical & Contact Info Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Medical Information */}
                    <div className="space-y-4">
                      <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('medicalInformation')}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('bloodGroup')}</p>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].blood_group || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('rhFactor')}</p>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].rh_factor || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('height')}</p>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{(selectedPatientDetails?.height || patients[selectedPatient]?.height) || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('weight')}</p>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{(selectedPatientDetails?.weight || patients[selectedPatient]?.weight) || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border col-span-2 transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('bmi')}</p>
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-semibold ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{(selectedPatientDetails?.bmi || patients[selectedPatient]?.bmi) || '—'}</p>
                            <p className={`text-xs ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                            }`}>
                              {selectedPatientDetails?.last_measured 
                                ? `${t('lastMeasured')}: ${new Date(selectedPatientDetails.last_measured).toLocaleString()}` 
                                : `${t('lastMeasured')}: —`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {t('contactInformation')}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('email')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].email || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('phoneNumber')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].phone_number || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('address')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].address || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('temporaryAddress')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].temporary_address || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('workPlace')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].work_place || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('occupation')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].occupation || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('additionalContactName')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].emergency_contact_name || '—'}</p>
                        </div>
                        <div className={`rounded-lg p-3 border transition-colors ${
                          darkMode
                            ? 'bg-[#10262D] border-[#133037]'
                            : 'bg-white border-gray-100'
                        }`}>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('additionalContactPhone')}</p>
                          <p className={`text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patients[selectedPatient].emergency_contact_phone || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`border-t pt-6 sm:pt-8 transition-colors ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                    <div className={`flex space-x-1 p-1 rounded-lg transition-colors ${
                      darkMode ? 'bg-[#10262D]' : 'bg-gray-100'
                    }`}>
                      <button 
                        onClick={() => handleTabChange('reports')}
                        className={`px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                          activeTab === 'reports' 
                            ? darkMode
                              ? 'bg-[#79CAC2] text-[#050C0F] shadow-sm'
                              : 'bg-[#5ACCC3] text-white shadow-sm'
                            : darkMode
                            ? 'text-[#79CAC2] hover:bg-[#10262D] hover:shadow-sm'
                            : 'text-[#5ACCC3] hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        {t('reports')}
                      </button>
                      <button 
                        onClick={() => handleTabChange('prescriptions')}
                        className={`px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                          activeTab === 'prescriptions' 
                            ? darkMode
                              ? 'bg-[#79CAC2] text-[#050C0F] shadow-sm'
                              : 'bg-[#5ACCC3] text-white shadow-sm'
                            : darkMode
                            ? 'text-[#79CAC2] hover:bg-[#10262D] hover:shadow-sm'
                            : 'text-[#5ACCC3] hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        {t('prescriptions')}
                      </button>
                      <button 
                        onClick={() => handleTabChange('radiology')}
                        className={`px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                          activeTab === 'radiology' 
                            ? darkMode
                              ? 'bg-[#79CAC2] text-[#050C0F] shadow-sm'
                              : 'bg-[#5ACCC3] text-white shadow-sm'
                            : darkMode
                            ? 'text-[#79CAC2] hover:bg-[#10262D] hover:shadow-sm'
                            : 'text-[#5ACCC3] hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        {t('radiology')}
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <button 
                          onClick={() => setShowFilterMenu(!showFilterMenu)}
                          className="text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 p-2 rounded-md transition-colors duration-200"
                          title="Filter and sort"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {showFilterMenu && (
                          <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button 
                                onClick={() => {
                                  setFilterOption('all');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                All {activeTab}
                              </button>
                              <button 
                                onClick={() => {
                                  setFilterOption('recent');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Recent (Last 7 days)
                              </button>
                              <button 
                                onClick={() => {
                                  setFilterOption('month');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Last Month
                              </button>
                              <hr className="my-1" />
                              <button 
                                onClick={() => {
                                  setSortOption('date');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Sort by Date
                              </button>
                              <button 
                                onClick={() => {
                                  setSortOption('name');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Sort by Name
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={handleExportData}
                        className={`p-2 rounded-md transition-colors duration-200 ${
                          darkMode
                            ? 'text-[#79CAC2] hover:bg-[#79CAC2] hover:bg-opacity-10'
                            : 'text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10'
                        }`}
                        title={t('export')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        onClick={handlePrintData}
                        className={`p-2 rounded-md transition-colors duration-200 ${
                          darkMode
                            ? 'text-[#79CAC2] hover:bg-[#79CAC2] hover:bg-opacity-10'
                            : 'text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10'
                        }`}
                        title={t('print')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {activeTab === 'reports' ? (
                        <>
                          <button 
                            onClick={handleViewAllReports}
                            className={`px-4 sm:px-6 py-2 border-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                              darkMode
                                ? 'border-[#79CAC2] text-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                                : 'border-[#5ACCC3] text-[#5ACCC3] hover:bg-[#5ACCC3] hover:text-white'
                            }`}
                          >
                            {t('viewAll')}
                          </button>
                          <button 
                            onClick={handleAddReport}
                            className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 shadow-sm ${
                              darkMode
                                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                                : 'bg-[#5ACCC3] text-white hover:bg-[#4BB5AC]'
                            }`}
                          >
                            {t('addReport')}
                          </button>
                          <button 
                            onClick={() => {
                              if (patients[selectedPatient]) {
                                document.getElementById('upload-note-input')?.click();
                              }
                            }}
                            className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 shadow-sm ${
                              darkMode
                                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                                : 'bg-[#5ACCC3] text-white hover:bg-[#4BB5AC]'
                            }`}
                          >
                            {t('uploadNote') || 'Upload Note'}
                          </button>
                          <input
                            id="upload-note-input"
                            type="file"
                            accept=".pdf"
                            style={{ display: 'none' }}
                            onChange={handleUploadNote}
                          />
                        </>
                      ) : activeTab === 'prescriptions' ? (
                        <button 
                          onClick={() => setShowPrescriptionModal(true)}
                          className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 shadow-sm ${
                            darkMode
                              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                              : 'bg-[#5ACCC3] text-white hover:bg-[#4BB5AC]'
                          }`}
                        >
                          {t('addPrescription')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  
                  {/* Upload Note Status Messages */}
                  {uploadNoteError && (
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      darkMode
                        ? 'bg-red-900/20 border-red-500 text-red-300'
                        : 'bg-red-50 border-red-500 text-red-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <AlertCircle className="w-5 h-5 mr-2" />
                          {uploadNoteError}
                        </span>
                        <button
                          onClick={() => setUploadNoteError(null)}
                          className="ml-4 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {uploadNoteSuccess && (
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      darkMode
                        ? 'bg-green-900/20 border-green-500 text-green-300'
                        : 'bg-green-50 border-green-500 text-green-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <FileText className="w-5 h-5 mr-2" />
                          {uploadNoteSuccess}
                        </span>
                        <button
                          onClick={() => setUploadNoteSuccess(null)}
                          className="ml-4 text-green-500 hover:text-green-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {uploadingNote && (
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      darkMode
                        ? 'bg-blue-900/20 border-blue-500 text-blue-300'
                        : 'bg-blue-50 border-blue-500 text-blue-700'
                    }`}>
                      <div className="flex items-center">
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        <span>Processing PDF note... This may take a moment.</span>
                      </div>
                    </div>
                  )}

                  {/* Render content based on active tab */}
                  {renderContent()}
                </div>
              </>
            ) : (
              <div className={`flex flex-col items-center justify-center h-[300px] sm:h-[400px] ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
              }`}>
                <svg className={`w-12 h-12 sm:w-16 sm:h-16 mb-4 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-300'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className={`text-base sm:text-lg font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('noPatientSelected')}</p>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`}>{t('pleaseSelectPatientFromListToViewDetails')}</p>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Prescription Table Modal with Blurred Background */}
      {showPrescriptionTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"
            onClick={() => setShowPrescriptionTable(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#5ACCC3] to-[#4BB5AC] px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Prescriptions Table</h2>
                <button
                  onClick={() => setShowPrescriptionTable(false)}
                  className="text-white hover:text-gray-200 transition-colors duration-200 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Table Content */}
            <div className="overflow-x-auto max-h-[calc(90vh-80px)]">
              {patientPrescriptions.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patientPrescriptions.map((prescription) => (
                      <tr key={prescription.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{prescription.medication_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{prescription.dosage}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{prescription.frequency}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{prescription.duration}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            prescription.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : prescription.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {prescription.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{prescription.prescribed_date}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              className="text-[#5ACCC3] hover:text-[#4BB5AC] transition-colors duration-200"
                              title="Edit prescription"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 transition-colors duration-200"
                              title="Delete prescription"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <p className="text-lg font-medium">No prescriptions found</p>
                  <p className="text-sm text-gray-400 mt-1">This patient doesn't have any prescriptions yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal with Clear Blurred Background */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => {
          setShowPrescriptionModal(false);
          setMedicationSearchResults([]);
          setShowMedicationDropdown(false);
        }}>
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 backdrop-blur-md"
            onClick={() => {
              setShowPrescriptionModal(false);
              setMedicationSearchResults([]);
              setShowMedicationDropdown(false);
            }}
          ></div>
          
          {/* Modal Content */}
          <div className={`relative rounded-2xl shadow-2xl p-4 sm:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border border-[#133037]'
              : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg sm:text-xl font-bold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('addNewPrescription')}</h3>
              <button
                onClick={() => {
                  setShowPrescriptionModal(false);
                  setMedicationSearchResults([]);
                  setShowMedicationDropdown(false);
                }}
                className={`transition-colors duration-200 p-1 ${
                  darkMode
                    ? 'text-[#8AA2A7] hover:text-[#F5FEFF]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="relative" ref={medicationInputRef}>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                }`}>
                  {t('medicationName')} *
                </label>
                <div className="relative">
                <input
                  type="text"
                  name="medication_name"
                  value={newPrescription.medication_name}
                  onChange={handlePrescriptionInputChange}
                    onFocus={() => {
                      if (medicationSearchResults.length > 0) {
                        setShowMedicationDropdown(true);
                      }
                    }}
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none text-sm sm:text-base transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-transparent'
                  }`}
                    placeholder={t('startTypingMedicationName')}
                  required
                    autoComplete="off"
                />
                  {medicationSearchLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                        darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
                      }`}></div>
                    </div>
                  )}
                </div>
                
                {/* Medication Search Dropdown */}
                {showMedicationDropdown && medicationSearchResults.length > 0 && (
                  <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037]'
                      : 'bg-white border-gray-300'
                  }`}>
                    {medicationSearchResults.map((medication) => (
                      <button
                        key={medication.id}
                        type="button"
                        onClick={() => handleSelectMedication(medication)}
                        className={`w-full px-4 py-3 text-left transition-colors duration-150 border-b last:border-b-0 ${
                          darkMode
                            ? 'hover:bg-[#133037] border-[#133037]'
                            : 'hover:bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className={`font-semibold text-sm ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>
                              {medication.brand_name}
                            </div>
                            {medication.mnn && (
                              <div className={`text-xs mt-1 ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                              }`}>
                                MNN: {medication.mnn.name}
                              </div>
                            )}
                            {medication.dosage_form && (
                              <div className={`text-xs mt-0.5 ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                              }`}>
                                {t('form')}: {medication.dosage_form.name}
                              </div>
                            )}
                            {medication.strength_value && medication.strength_unit && (
                              <div className={`text-xs mt-0.5 ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                              }`}>
                                {t('strength')}: {medication.strength_value} {medication.strength_unit.name}
                              </div>
                            )}
                          </div>
                          {medication.manufacturer && (
                            <div className={`text-xs ml-2 text-right ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                            }`}>
                              {medication.manufacturer.name}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showMedicationDropdown && medicationSearchResults.length === 0 && !medicationSearchLoading && newPrescription.medication_name.trim().length >= 2 && (
                  <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {t('noMedicationsFoundTryDifferentSearchTerm')}
                  </div>
                )}
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                }`}>
                  {t('dosage')} *
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={newPrescription.dosage}
                  onChange={handlePrescriptionInputChange}
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none text-sm sm:text-base transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-transparent'
                  }`}
                  placeholder={t('dosagePlaceholder')}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                }`}>
                  {t('frequency')} *
                </label>
                <input
                  type="text"
                  name="frequency"
                  value={newPrescription.frequency}
                  onChange={handlePrescriptionInputChange}
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none text-sm sm:text-base transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-transparent'
                  }`}
                  placeholder={t('frequencyPlaceholder')}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                }`}>
                  {t('duration')} *
                </label>
                <input
                  type="text"
                  name="duration"
                  value={newPrescription.duration}
                  onChange={handlePrescriptionInputChange}
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none text-sm sm:text-base transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-transparent'
                  }`}
                  placeholder={t('durationPlaceholder')}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                }`}>
                  {t('instructions')}
                </label>
                <textarea
                  name="instructions"
                  value={newPrescription.instructions}
                  onChange={handlePrescriptionInputChange}
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none text-sm sm:text-base transition-colors resize-none ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-transparent'
                  }`}
                  placeholder={t('specialInstructionsForPatient')}
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPrescriptionModal(false);
                  setNewPrescription({
                    medication_name: '',
                    dosage: '',
                    frequency: '',
                    duration: '',
                    instructions: '',
                    status: 'active'
                  });
                  setMedicationSearchResults([]);
                  setShowMedicationDropdown(false);
                }}
                className={`px-4 sm:px-6 py-2 border rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 ${
                  darkMode
                    ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleCreatePrescription}
                disabled={!newPrescription.medication_name || !newPrescription.dosage || !newPrescription.frequency || !newPrescription.duration || !backendConnected}
                className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                    : 'bg-[#5ACCC3] text-white hover:bg-[#4BB5AC]'
                }`}
              >
                {t('addPrescription')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload DICOM Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Upload DICOM Study</h2>
                  <p className="text-gray-600 text-sm mt-1">Upload DICOM files (ZIP or single file) from CD or folder</p>
                </div>
                <button 
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError(null);
                    setUploadForm({
                      modality: '',
                      body_part: '',
                      description: '',
                      source: 'external_cd',
                      study_date: format(new Date(), 'yyyy-MM-dd'),
                      file: null
                    });
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {uploadError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-800">{uploadError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!uploadForm.file) {
                  setUploadError('Please select a file');
                  return;
                }
                if (!selectedPatientDetails || !selectedPatientDetails.id) {
                  setUploadError('No patient selected');
                  return;
                }

                setUploading(true);
                setUploadError(null);

                try {
                  const formData = new FormData();
                  formData.append('patient_id', selectedPatientDetails.id);
                  formData.append('file', uploadForm.file);
                  if (uploadForm.modality) formData.append('modality', uploadForm.modality);
                  if (uploadForm.body_part) formData.append('body_part', uploadForm.body_part);
                  if (uploadForm.description) formData.append('description', uploadForm.description);
                  formData.append('source', uploadForm.source);
                  if (uploadForm.study_date) formData.append('study_date', uploadForm.study_date);

                  await uploadDicomStudy(formData);
                  
                  // Refresh studies list
                  await loadPatientRadiologyStudies(selectedPatientDetails.id);

                  setShowUploadModal(false);
                  setUploadForm({
                    modality: '',
                    body_part: '',
                    description: '',
                    source: 'external_cd',
                    study_date: format(new Date(), 'yyyy-MM-dd'),
                    file: null
                  });
                } catch (err) {
                  setUploadError(err.message || 'Failed to upload DICOM study');
                } finally {
                  setUploading(false);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient
                    </label>
                    <input
                      type="text"
                      value={selectedPatientDetails ? `${selectedPatientDetails.fullName || selectedPatientDetails.name || 'Patient'} (${selectedPatientDetails.id})` : ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modality <span className="text-gray-400">(optional)</span>
                    </label>
                    <select
                      value={uploadForm.modality}
                      onChange={(e) => setUploadForm({ ...uploadForm, modality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent text-sm"
                    >
                      <option value="">Select modality</option>
                      <option value="CT">CT</option>
                      <option value="MR">MR</option>
                      <option value="CR">CR</option>
                      <option value="DX">DX</option>
                      <option value="US">US</option>
                      <option value="MG">MG</option>
                      <option value="PT">PT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Body Part <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={uploadForm.body_part}
                      onChange={(e) => setUploadForm({ ...uploadForm, body_part: e.target.value })}
                      placeholder="e.g., Head, Chest, Abdomen"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Study description or indication"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source
                    </label>
                    <select
                      value={uploadForm.source}
                      onChange={(e) => setUploadForm({ ...uploadForm, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent text-sm"
                    >
                      <option value="external_cd">External CD</option>
                      <option value="external_clinic">External Clinic</option>
                      <option value="internal">Internal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Study Date <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={uploadForm.study_date}
                      onChange={(e) => setUploadForm({ ...uploadForm, study_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DICOM File <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#5ACCC3] transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-[#5ACCC3] hover:text-[#4BB5AC] focus-within:outline-none">
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              ref={fileInputRef}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadForm({ ...uploadForm, file });
                                }
                              }}
                              accept=".dcm,.dicom,.zip,application/dicom,application/zip"
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          ZIP archive or DICOM file (.dcm, .dicom, .zip)
                        </p>
                        {uploadForm.file && (
                          <p className="text-sm text-gray-700 mt-2">
                            Selected: {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadError(null);
                      setUploadForm({
                        modality: '',
                        body_part: '',
                        description: '',
                        source: 'external_cd',
                        study_date: format(new Date(), 'yyyy-MM-dd'),
                        file: null
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadForm.file || uploading}
                    className="px-4 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload Study</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patient;