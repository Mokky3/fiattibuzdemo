import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { useNavigate } from 'react-router-dom';
import { patientsAPI, checkBackendHealth } from '../../services/apiService';

const Patient = () => {
  const [selectedPatient, setSelectedPatient] = useState(0);
  const [activeTab, setActiveTab] = useState('reports');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Patient-specific data states
  const [patientReports, setPatientReports] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  
  // Prescription modal state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    status: 'active'
  });

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
            const patientsData = await patientsAPI.getAll();
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
      loadPatientData(patients[selectedPatient].id);
    }
  }, [selectedPatient, patients]);

  const loadPatientData = async (patientId) => {
    if (activeTab === 'reports') {
      await loadPatientReports(patientId);
    } else if (activeTab === 'prescriptions') {
      await loadPatientPrescriptions(patientId);
    }
  };

  const loadPatientReports = async (patientId) => {
    try {
      setReportsLoading(true);
      
      if (backendConnected) {
        try {
          const reports = await patientsAPI.getReports(patientId);
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
          const prescriptions = await patientsAPI.getPrescriptions(patientId);
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
          await patientsAPI.deleteReport(reportId);
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
          await patientsAPI.deletePrescription(prescriptionId);
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
        await patientsAPI.updatePrescriptionStatus(prescriptionId, newStatus);
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
  };

  const handleCreatePrescription = async () => {
    try {
      if (!patients[selectedPatient]) return;

      const patientId = patients[selectedPatient].id;
      
      if (backendConnected) {
        try {
          const createdPrescription = await patientsAPI.createPrescription(patientId, newPrescription);
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5ACCC3]"></div>
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      );
    }

    if (!backendConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">Backend Not Connected</p>
          <p className="text-sm text-gray-400 mt-1">Please ensure the backend server is running.</p>
        </div>
      );
    }

    if (patientReports.length > 0) {
      return (
        <div className="space-y-4">
          {patientReports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className="text-center min-w-[80px]">
                    <div className="text-lg font-semibold text-gray-900">{report.time}</div>
                    <div className="text-xs text-gray-500 font-medium">{report.date}</div>
                  </div>
                  
                  <div className="min-w-[140px]">
                    <div className="font-semibold text-gray-900">{patients[selectedPatient]?.first_name} {patients[selectedPatient]?.last_name}</div>
                    <div className="text-xs text-gray-500">{patients[selectedPatient]?.patient_code}</div>
                  </div>
                  
                  <div className="min-w-[160px]">
                    <div className="font-semibold text-gray-900">{report.problem}</div>
                    {report.diagnosis && (
                      <div className="text-xs text-green-600 font-medium">Diagnosis: {report.diagnosis}</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-gray-600 text-sm leading-relaxed">{report.description}</div>
                    {report.treatment && (
                      <div className="text-xs text-blue-600 mt-1">Treatment: {report.treatment}</div>
                    )}
                  </div>
                  
                  <div className="min-w-[120px]">
                    <div className="text-gray-600 text-sm font-medium">{report.doctor_name}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleViewReport(report.id)}
                    className="px-4 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors duration-200 shadow-sm"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleEditReport(report.id)}
                    className="p-2 text-gray-600 hover:text-[#5ACCC3] transition-colors duration-200"
                    title="Edit report"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeleteReport(report.id)}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
                    title="Delete report"
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
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-medium">No reports found</p>
        <p className="text-sm text-gray-400 mt-1">This patient doesn't have any reports yet.</p>
      </div>
    );
  };

  const renderPrescriptionsContent = () => {
    if (prescriptionsLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5ACCC3]"></div>
          <span className="ml-3 text-gray-600">Loading prescriptions...</span>
        </div>
      );
    }

    if (!backendConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">Backend Not Connected</p>
          <p className="text-sm text-gray-400 mt-1">Please ensure the backend server is running.</p>
        </div>
      );
    }

    if (patientPrescriptions.length > 0) {
      return (
        <div className="space-y-4">
          {patientPrescriptions.map((prescription) => (
            <div key={prescription.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className="min-w-[120px]">
                    <div className="text-lg font-semibold text-[#5ACCC3]">{prescription.medication_name}</div>
                    <div className="text-xs text-gray-500 font-medium">{prescription.prescribed_date}</div>
                  </div>
                  
                  <div className="min-w-[100px]">
                    <div className="font-semibold text-gray-700">Dosage</div>
                    <div className="text-sm text-gray-600">{prescription.dosage}</div>
                  </div>
                  
                  <div className="min-w-[120px]">
                    <div className="font-semibold text-gray-700">Frequency</div>
                    <div className="text-sm text-gray-600">{prescription.frequency}</div>
                  </div>
                  
                  <div className="min-w-[100px]">
                    <div className="font-semibold text-gray-700">Duration</div>
                    <div className="text-sm text-gray-600">{prescription.duration}</div>
                  </div>
                  
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold text-gray-700">Instructions</div>
                    <div className="text-sm text-gray-600">{prescription.instructions || 'No special instructions'}</div>
                  </div>
                  
                  <div className="min-w-[120px]">
                    <div className="text-gray-600 text-sm font-medium">{prescription.doctor_name}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={prescription.status}
                    onChange={(e) => handleUpdatePrescriptionStatus(prescription.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      prescription.status === 'active' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button 
                    onClick={() => handleEditPrescription(prescription.id)}
                    className="p-2 text-gray-600 hover:text-[#5ACCC3] transition-colors duration-200"
                    title="Edit prescription"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeletePrescription(prescription.id)}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
                    title="Delete prescription"
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
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <p className="text-lg font-medium">No prescriptions found</p>
        <p className="text-sm text-gray-400 mt-1">This patient doesn't have any prescriptions yet.</p>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === 'reports') {
      return renderReportsContent();
    } else if (activeTab === 'prescriptions') {
      return renderPrescriptionsContent();
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center flex-1">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5ACCC3]"></div>
          <span className="ml-4 text-gray-600 text-lg">Connecting to backend...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      {/* Backend status and error indicators */}
      {!backendConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mx-4 mt-4 rounded">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Backend not connected - Please ensure the server is running
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="flex md:flex-row gap-8 bg-gray-50 relative px-8 py-6">
        {/* Medical illustrations background */}
        <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
          <div className="w-full h-full bg-repeat" style={{ backgroundImage: "url('/medical-icons.svg')" }}></div>
        </div>
        
        {/* Left sidebar - Patient list */}
        <div className="md:w-1/5 lg:w-1/6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#5ACCC3] font-semibold text-base">Patients List</h2>
                <div className="flex items-center space-x-2">
                  {backendConnected && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Backend connected"></div>
                  )}
                  <button 
                    onClick={handleRefreshData}
                    className="text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 p-1 rounded-md transition-colors duration-200"
                    title="Refresh data"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
                    className={`py-4 px-4 cursor-pointer border rounded-xl text-center transition-all duration-200 ${
                      selectedPatient === index 
                        ? 'bg-[#5ACCC3] text-white shadow-md transform scale-105' 
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-[#5ACCC3] hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-semibold text-sm ${selectedPatient === index ? 'text-white' : 'text-gray-900'}`}>
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <p className={`text-xs mt-1 ${selectedPatient === index ? 'text-white text-opacity-90' : 'text-gray-500'}`}>
                      {patient.patient_code}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">No patients found</p>
                  <p className="text-xs mt-1">Please check backend connection</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main content - Patient details */}
        <div className="md:w-4/5 lg:w-5/6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            {patients[selectedPatient] ? (
              <>
                <div className="flex mb-10">
                  {/* Patient photo and basic info */}
                  <div className="w-36 h-36 bg-gradient-to-br from-gray-100 to-gray-200 mr-10 flex-shrink-0 rounded-xl shadow-inner flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mt-2">
                    <h2 className="text-2xl font-bold text-[#5ACCC3] mb-3">
                      {patients[selectedPatient].first_name} {patients[selectedPatient].last_name}
                    </h2>
                    <div className="flex items-center space-x-4 mb-2">
                      <p className="text-gray-700 text-base font-medium">
                        {patients[selectedPatient].date_of_birth} ({patients[selectedPatient].age})
                      </p>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <p className="text-gray-700 text-base font-medium capitalize">
                        {patients[selectedPatient].gender}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-x-12 gap-y-4 mt-8">
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Blood Group</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].blood_group || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Blood Rh Factor</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].rh_factor || '—'}</p>
                      </div>
                      <div></div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Height</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].height || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Weight</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].weight || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">BMI</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].bmi || '—'}</p>
                        <p className="text-xs text-gray-400">Last measured</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-auto space-y-6">
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Email</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].email || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Address</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].address || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Temporary Address</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].temporary_address || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Work Place</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].work_place || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Occupation</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].occupation || '—'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => handleTabChange('reports')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          activeTab === 'reports' 
                            ? 'bg-[#5ACCC3] text-white shadow-sm' 
                            : 'text-[#5ACCC3] hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        Reports
                      </button>
                      <button 
                        onClick={() => handleTabChange('prescriptions')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          activeTab === 'prescriptions' 
                            ? 'bg-[#5ACCC3] text-white shadow-sm' 
                            : 'text-[#5ACCC3] hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        Prescriptions
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <button 
                          onClick={() => setShowFilterMenu(!showFilterMenu)}
                          className="text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 p-2 rounded-md transition-colors duration-200"
                          title="Filter and sort"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {showFilterMenu && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button 
                                onClick={() => {
                                  setFilterOption('all');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                All {activeTab}
                              </button>
                              <button 
                                onClick={() => {
                                  setFilterOption('recent');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Recent (Last 7 days)
                              </button>
                              <button 
                                onClick={() => {
                                  setFilterOption('month');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Last Month
                              </button>
                              <hr className="my-1" />
                              <button 
                                onClick={() => {
                                  setSortOption('date');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Sort by Date
                              </button>
                              <button 
                                onClick={() => {
                                  setSortOption('name');
                                  setShowFilterMenu(false);
                                }}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Sort by Name
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={handleExportData}
                        className="text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 p-2 rounded-md transition-colors duration-200"
                        title="Export data"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        onClick={handlePrintData}
                        className="text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 p-2 rounded-md transition-colors duration-200"
                        title="Print"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {activeTab === 'reports' ? (
                        <>
                          <button 
                            onClick={handleViewAllReports}
                            className="px-6 py-2 border-2 border-[#5ACCC3] text-[#5ACCC3] rounded-lg text-sm font-medium hover:bg-[#5ACCC3] hover:text-white transition-all duration-200"
                          >
                            View All
                          </button>
                          <button 
                            onClick={handleAddReport}
                            className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors duration-200 shadow-sm"
                          >
                            Add Report
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setShowPrescriptionModal(true)}
                          className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors duration-200 shadow-sm"
                        >
                          Add Prescription
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Render content based on active tab */}
                  {renderContent()}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-lg font-medium">No Patient Selected</p>
                <p className="text-sm text-gray-400 mt-1">Please select a patient from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Prescription</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name *
                </label>
                <input
                  type="text"
                  name="medication_name"
                  value={newPrescription.medication_name}
                  onChange={handlePrescriptionInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  placeholder="Enter medication name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage *
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={newPrescription.dosage}
                  onChange={handlePrescriptionInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  placeholder="e.g., 50mg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <input
                  type="text"
                  name="frequency"
                  value={newPrescription.frequency}
                  onChange={handlePrescriptionInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  placeholder="e.g., Once daily"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration *
                </label>
                <input
                  type="text"
                  name="duration"
                  value={newPrescription.duration}
                  onChange={handlePrescriptionInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  placeholder="e.g., 3 months"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  name="instructions"
                  value={newPrescription.instructions}
                  onChange={handlePrescriptionInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  placeholder="Special instructions for the patient"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
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
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePrescription}
                disabled={!newPrescription.medication_name || !newPrescription.dosage || !newPrescription.frequency || !newPrescription.duration || !backendConnected}
                className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patient;