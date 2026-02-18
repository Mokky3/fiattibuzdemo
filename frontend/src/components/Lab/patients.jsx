import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, User, FileText, Calendar, Download, Plus, Eye, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getPatients, getPatientById } from '../../services/labService';

const LabPatientsModule = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
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
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Real patients data from backend
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Patient details loading state
  const [patientDetailsLoading, setPatientDetailsLoading] = useState(false);
  const [patientDetailsError, setPatientDetailsError] = useState('');

  // Load patients from backend
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getPatients({ search: searchTerm });
        if (active) {
          // Handle SuccessResponse format: { data: { items: [...], total: N }, message: "..." }
          if (response?.data?.items) {
            setPatients(response.data.items);
          } else if (Array.isArray(response)) {
            setPatients(response);
          } else if (response && response.items) {
            setPatients(response.items);
          } else {
            setPatients([]);
          }
        }
      } catch (e) {
        console.error('Error loading lab patients:', e);
        if (active) {
          setError(t('failedToLoadPatients'));
          setPatients([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, [searchTerm]);

  const filteredPatients = patients.filter(patient => {
    const patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patient.id || patient.medical_record_number || '').includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'recent' && patient.recentTests && patient.recentTests.length > 0);
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    if (darkMode) {
      switch (status) {
        case 'normal': return 'text-green-300 bg-green-900 bg-opacity-30';
        case 'high': 
        case 'low': 
        case 'borderline': return 'text-yellow-300 bg-yellow-900 bg-opacity-30';
        case 'critical': return 'text-red-300 bg-red-900 bg-opacity-30';
        default: return 'text-gray-300 bg-gray-700 bg-opacity-30';
      }
    } else {
      switch (status) {
        case 'normal': return 'text-green-600 bg-green-50';
        case 'high': 
        case 'low': 
        case 'borderline': return 'text-yellow-600 bg-yellow-50';
        case 'critical': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />;
      case 'pending': return <Clock className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />;
      case 'critical': return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
      default: return <FileText className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
    }
  };

  // Fetch full patient details when selected
  useEffect(() => {
    let active = true;
    // Only fetch if we have a selected patient and we don't already have full details
    // Check if we have full details by looking for fields that are only in full details
    // Summary has recentTests as a number, Detail has it as an array
    // Check if we have full details (detail object has array for recentTests, summary has number)
    const hasFullDetails = selectedPatient && (
      Array.isArray(selectedPatient.recentTests) || // Full details have array, summary has number
      ((selectedPatient.dateOfBirth !== undefined && selectedPatient.dateOfBirth !== null && selectedPatient.dateOfBirth !== 'N/A') ||
       (selectedPatient.bloodGroup !== undefined && selectedPatient.bloodGroup !== null && selectedPatient.bloodGroup !== 'Unknown') ||
       (selectedPatient.height !== undefined && selectedPatient.height !== null && selectedPatient.height !== 'N/A') ||
       (selectedPatient.weight !== undefined && selectedPatient.weight !== null && selectedPatient.weight !== 'N/A'))
    );
    
    console.log('[patients.jsx] hasFullDetails check:', {
      selectedPatient: selectedPatient?.id,
      hasFullDetails,
      recentTestsIsArray: Array.isArray(selectedPatient?.recentTests),
      recentTests: selectedPatient?.recentTests,
      dateOfBirth: selectedPatient?.dateOfBirth,
      bloodGroup: selectedPatient?.bloodGroup,
      height: selectedPatient?.height,
      weight: selectedPatient?.weight,
    });
    
    if (selectedPatient && selectedPatient.id && !hasFullDetails) {
      console.log('[patients.jsx] Fetching full patient details for:', selectedPatient.id);
      (async () => {
        try {
          setPatientDetailsLoading(true);
          setPatientDetailsError('');
          console.log('[patients.jsx] Calling getPatientById with id:', selectedPatient.id);
          const response = await getPatientById(selectedPatient.id);
          console.log('[patients.jsx] Raw API response:', response);
          if (active) {
            // Handle SuccessResponse format: { data: {...}, message: "..." }
            const patientData = response?.data || response;
            console.log('[patients.jsx] Patient details response:', response);
            console.log('[patients.jsx] Patient data extracted:', patientData);
            console.log('[patients.jsx] Height:', patientData?.height);
            console.log('[patients.jsx] Weight:', patientData?.weight);
            console.log('[patients.jsx] BMI:', patientData?.bmi);
            console.log('[patients.jsx] All patientData keys:', patientData ? Object.keys(patientData) : []);
            console.log('[patients.jsx] patientData.height:', patientData?.height);
            console.log('[patients.jsx] patientData.weight:', patientData?.weight);
            console.log('[patients.jsx] patientData.bmi:', patientData?.bmi);
            if (patientData) {
              console.log('[patients.jsx] Setting selectedPatient with full details');
              // Replace the entire patient object with the full details (don't merge with summary)
              setSelectedPatient(patientData);
            } else {
              console.warn('[patients.jsx] No patientData received from API');
            }
          }
        } catch (e) {
          console.error('[patients.jsx] Error loading patient details:', e);
          if (active) {
            setPatientDetailsError('Failed to load patient details');
          }
        } finally {
          if (active) setPatientDetailsLoading(false);
        }
      })();
    } else if (hasFullDetails) {
      console.log('[patients.jsx] Already has full details, skipping fetch');
      // If we already have full details, don't show loading
      setPatientDetailsLoading(false);
    } else {
      console.log('[patients.jsx] No patient selected or missing ID');
    }
    return () => { active = false };
  }, [selectedPatient?.id]);

  const PatientCard = ({ patient }) => {
    const patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    const patientId = patient.id || patient.medical_record_number || 'N/A';
    const patientAge = patient.age || (patient.date_of_birth ? 
      Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A');
    const patientGender = patient.gender || 'N/A';
    const avatar = patient.avatar || (patientName ? patientName.split(' ').map(n => n[0]).join('').toUpperCase() : 'P');
    
    return (
      <div 
        className={`rounded-lg border p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
          selectedPatient?.id === patient.id
            ? darkMode
              ? 'border-[#79CAC2] bg-[#79CAC2] bg-opacity-10'
              : 'border-teal-500 bg-teal-50'
            : darkMode
              ? 'bg-[#0D2026] border-[#133037] hover:border-[#79CAC2]'
              : 'bg-white border-gray-200 hover:border-teal-300'
        }`}
        onClick={() => {
          // Set the summary first, then useEffect will fetch full details
          setSelectedPatient(patient);
        }}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
            darkMode ? 'bg-[#79CAC2]' : 'bg-teal-500'
          }`}>
            {avatar}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{patientName}</h3>
            <p className={`text-sm ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>#{patientId}</p>
          </div>
          <div className="text-right">
            <div className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{patientAge} {t('yO')}</div>
            <div className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{patientGender}</div>
          </div>
        </div>
      </div>
    );
  };

  const PatientDetails = ({ patient }) => {
    if (!patient) {
      return (
        <div className={`rounded-lg border p-6 ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
            : 'bg-white border-gray-200'
        }`}>
          {t('noPatientSelected')}
        </div>
      );
    }
    
    const patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown Patient';
    
    // Ensure recentTests is always an array for rendering
    const recentTestsArray = Array.isArray(patient.recentTests) ? patient.recentTests : [];
    
    // Debug logging
    console.log('PatientDetails - patient object:', patient);
    console.log('PatientDetails - all keys:', patient ? Object.keys(patient) : []);
    console.log('PatientDetails - height:', patient?.height);
    console.log('PatientDetails - weight:', patient?.weight);
    console.log('PatientDetails - bmi:', patient?.bmi);
    console.log('PatientDetails - lastMeasured:', patient?.lastMeasured);
    console.log('PatientDetails - recentTests type:', typeof patient?.recentTests);
    console.log('PatientDetails - recentTests is array:', Array.isArray(patient?.recentTests));
    
    if (patientDetailsLoading) {
      return (
        <div className={`rounded-lg border p-6 ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
                darkMode ? 'border-[#79CAC2]' : 'border-teal-500'
              }`}></div>
              <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                {t('loadingPatientDetails')}
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    if (patientDetailsError) {
      return (
        <div className={`rounded-lg border p-6 ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${
                darkMode ? 'text-red-400' : 'text-red-300'
              }`} />
              <p className={darkMode ? 'text-red-400 mb-2' : 'text-red-500 mb-2'}>
                {t('errorLoadingPatientDetails')}
              </p>
              <p className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{patientDetailsError}</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
    <div className={`rounded-lg border p-6 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-200'
    }`}>
      {/* Patient Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
            darkMode ? 'bg-[#133037]' : 'bg-gray-200'
          }`}>
            <User className={`w-8 h-8 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{patientName}</h2>
            <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
              {patient.dateOfBirth || t('notAvailable')} ({patient.age || 0} {t('yO')}) • {patient.gender || t('unknown')}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className={`px-4 py-2 border rounded-lg transition-colors ${
            darkMode
              ? 'border-[#79CAC2] text-[#79CAC2] hover:bg-[#133037]'
              : 'border-teal-500 text-teal-700 hover:bg-teal-50'
          }`}>
            <Eye className="w-4 h-4 inline mr-2" />
            {t('view')}
          </button>
          <button 
            onClick={() => {
              if (selectedPatient && selectedPatient.id) {
                navigate(`/lab/reports/new/${selectedPatient.id}`);
              } else {
                alert(t('pleaseSelectAPatientFirst'));
              }
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            {t('addReport')}
          </button>
        </div>
      </div>

      {/* Medical Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-4">
          <div className={`rounded-lg p-4 ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <h3 className={`font-semibold mb-3 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('bloodInformation')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('bloodGroup')}:</span>
                <span className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient.bloodGroup || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('rhFactor')}:</span>
                <span className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient.rhFactor || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-lg p-4 ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <h3 className={`font-semibold mb-3 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('physicalMeasurements')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('height')}:</span>
                <span className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient?.height && patient.height !== 'N/A' ? patient.height : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('weight')}:</span>
                <span className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient?.weight && patient.weight !== 'N/A' ? patient.weight : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('bmi')}:</span>
                <span className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient?.bmi && patient.bmi !== 'N/A' ? patient.bmi : '—'}</span>
              </div>
              {patient.lastMeasured && (
                <p className={`text-xs mt-2 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{t('lastMeasured')}: {patient.lastMeasured}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-lg p-4 ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <h3 className={`font-semibold mb-3 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('contactInformation')}</h3>
            <div className="space-y-2">
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('address')}:</span>
                <p className={`font-medium text-sm ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient.address || '—'}</p>
              </div>
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('temporaryAddress')}:</span>
                <p className={`font-medium text-sm ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient.temporaryAddress || '—'}</p>
              </div>
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('workPlace')}:</span>
                <p className={`font-medium text-sm ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient.workPlace || '—'}</p>
              </div>
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('occupation')}:</span>
                <p className={`font-medium text-sm ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{patient.occupation || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b mb-6 ${
        darkMode ? 'border-[#133037]' : 'border-gray-200'
      }`}>
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reports'
                ? darkMode
                  ? 'border-[#79CAC2] text-[#79CAC2]'
                  : 'border-teal-500 text-teal-600'
                : darkMode
                  ? 'border-transparent text-[#8AA2A7] hover:text-[#C1D9DD]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('labReports')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? darkMode
                  ? 'border-[#79CAC2] text-[#79CAC2]'
                  : 'border-teal-500 text-teal-600'
                : darkMode
                  ? 'border-transparent text-[#8AA2A7] hover:text-[#C1D9DD]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('testHistory')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('recentLabReports')}</h3>
            <div className="flex space-x-2">
              <button className={`text-sm transition-colors ${
                darkMode
                  ? 'text-[#8AA2A7] hover:text-[#C1D9DD]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
                <Filter className="w-4 h-4 inline mr-1" />
                {t('filter')}
              </button>
              <button className={`text-sm transition-colors ${
                darkMode
                  ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                  : 'text-teal-600 hover:text-teal-700'
              }`}>
                <Download className="w-4 h-4 inline mr-1" />
                {t('exportAll')}
              </button>
            </div>
          </div>

          {recentTestsArray.map((test) => (
            <div key={test.id} className={`border rounded-lg p-6 ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    darkMode
                      ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {test.time}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{test.type}</h4>
                    <p className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{test.description}</p>
                    <p className={`text-xs ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{t('provider')}: {test.physician}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {getTestStatusIcon(test.status)}
                    <span className={`text-sm capitalize ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{test.status}</span>
                  </div>
                  <button className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                      : 'bg-teal-500 hover:bg-teal-600 text-white'
                  }`}>
                    {t('view')}
                  </button>
                </div>
              </div>

              {test.results && test.results.length > 0 && (
                <div className="mt-4">
                  <h5 className={`font-medium mb-3 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{t('testResults')}:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {test.results.map((result, index) => (
                      <div key={index} className={`rounded-lg p-3 ${
                        darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-medium text-sm ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{result.test}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                        </div>
                        <div className={`text-lg font-bold ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>
                          {result.value} <span className={`text-sm font-normal ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{result.unit}</span>
                        </div>
                        <div className={`text-xs ${
                          darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                        }`}>{t('range')}: {result.range}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('completeTestHistory')}</h3>
          <div className={`rounded-lg p-8 text-center ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <Calendar className={`w-12 h-12 mx-auto mb-4 ${
              darkMode ? 'text-[#133037]' : 'text-gray-400'
            }`} />
            <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
              {t('completeTestHistoryViewComingSoon')}
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{t('thisWillShowAChronologicalTimelineOfAllLabTests')}</p>
          </div>
        </div>
      )}
    </div>
  );
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className={`w-80 border-r overflow-y-auto ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                  darkMode
                    ? 'text-[#F5FEFF] border-[#79CAC2]'
                    : 'text-gray-900 border-teal-500'
                }`}>
                  {t('patientsList')}
                </h2>
                <button className={darkMode ? 'text-[#8AA2A7] hover:text-[#79CAC2]' : 'text-gray-400 hover:text-gray-600'}>
                  <Filter className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    placeholder={t('searchPatients')}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                        : 'border-gray-300 focus:ring-teal-500'
                    }`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filterStatus === 'all'
                      ? darkMode
                        ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
                        : 'bg-teal-100 text-teal-700'
                      : darkMode
                        ? 'bg-[#07181D] text-[#C1D9DD] hover:bg-[#133037]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('all')}
                </button>
                <button
                  onClick={() => setFilterStatus('recent')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filterStatus === 'recent'
                      ? darkMode
                        ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
                        : 'bg-teal-100 text-teal-700'
                      : darkMode
                        ? 'bg-[#07181D] text-[#C1D9DD] hover:bg-[#133037]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('recentTests')}
                </button>
              </div>

              {/* Patients List */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`rounded-lg border p-4 animate-pulse ${
                      darkMode
                        ? 'bg-[#0D2026] border-[#133037]'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-lg ${
                          darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                        }`}></div>
                        <div className="flex-1">
                          <div className={`h-4 rounded w-3/4 mb-2 ${
                            darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                          }`}></div>
                          <div className={`h-3 rounded w-1/2 ${
                            darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                          }`}></div>
                        </div>
                        <div className="text-right">
                          <div className={`h-3 rounded w-8 mb-1 ${
                            darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                          }`}></div>
                          <div className={`h-3 rounded w-12 ${
                            darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${
                    darkMode ? 'text-red-400' : 'text-red-300'
                  }`} />
                  <p className={darkMode ? 'text-red-400 mb-2' : 'text-red-500 mb-2'}>
                    {t('errorLoadingPatients')}
                  </p>
                  <p className={`text-sm ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{error}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {filteredPatients.map((patient) => (
                      <PatientCard key={patient.id || patient.medical_record_number} patient={patient} />
                    ))}
                  </div>

                  {filteredPatients.length === 0 && (
                    <div className="text-center py-8">
                      <User className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-[#133037]' : 'text-gray-300'
                      }`} />
                      <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                        {t('noPatientsFound')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {selectedPatient ? (
              <PatientDetails patient={selectedPatient} />
            ) : (
              <div className={`rounded-lg border p-12 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <User className={`w-20 h-20 mx-auto mb-6 ${
                  darkMode ? 'text-[#133037]' : 'text-gray-300'
                }`} />
                <h3 className={`text-xl font-semibold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('selectAPatient')}</h3>
                <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                  {t('chooseAPatientFromTheListToViewTheirLabReportsAndMedicalInformation')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabPatientsModule;