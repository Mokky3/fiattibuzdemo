import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Thermometer, Heart, Activity, Droplets, Eye, Plus, Calendar, Clock, User, TrendingUp, AlertTriangle, X } from 'lucide-react';
import NurseHeader from './header';
import { getVitals, getPatients, createPatientVital } from '../../services/nurseService';
import { VitalSignForm } from './PatientProfileForms';

const NurseVitalsModule = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('table'); // table or cards
  
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

  const [vitalsData, setVitalsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Modal state for recording vitals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await getVitals({ 
          search: searchTerm,
          status: statusFilter,
          date_filter: selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'all'
        })
        console.log('🔍 [vitals.jsx] getVitals response:', response)
        console.log('🔍 [vitals.jsx] response.items:', response?.items)
        console.log('🔍 [vitals.jsx] response.data:', response?.data)
        if (active) {
          // Handle both array response and object with items
          if (Array.isArray(response)) {
            console.log('🔍 [vitals.jsx] Response is array, length:', response.length)
            setVitalsData(response)
            setTotal(response.length)
          } else if (response && response.items) {
            console.log('🔍 [vitals.jsx] Response has items, count:', response.items.length)
            setVitalsData(response.items)
            setTotal(response.total || response.items.length)
          } else {
            console.log('🔍 [vitals.jsx] No items found in response')
            setVitalsData([])
            setTotal(0)
          }
        }
      } catch (e) {
        console.error('Error loading vitals:', e)
        if (active) {
          setVitalsData([])
          setTotal(0)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [searchTerm, statusFilter, selectedDate])

  // Load patients when modal opens
  useEffect(() => {
    if (showRecordModal && patients.length === 0) {
      const loadPatients = async () => {
        try {
          const response = await getPatients({})
          const patientList = response?.items || response || []
          setPatients(patientList)
        } catch (e) {
          console.error('Error loading patients:', e)
        }
      }
      loadPatients()
    }
  }, [showRecordModal, patients.length])

  const handleRecordVital = async (vitalData) => {
    if (!selectedPatientId) {
      alert(t('pleaseSelectPatientFirst'))
      return
    }

    try {
      setSubmitting(true)
      await createPatientVital(selectedPatientId, vitalData)
      
      // Refresh vitals list
      const response = await getVitals({ 
        search: searchTerm,
        status: statusFilter,
        date_filter: selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'all'
      })
      if (Array.isArray(response)) {
        setVitalsData(response)
        setTotal(response.length)
      } else if (response && response.items) {
        setVitalsData(response.items)
        setTotal(response.total || response.items.length)
      }
      
      // Close modal and reset
      setShowRecordModal(false)
      setSelectedPatientId(null)
      setPatientSearchTerm('')
    } catch (e) {
      console.error('Error recording vital:', e)
      alert(t('errorRecordingVital') + ': ' + (e.message || t('unknownError')))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPatients = patients.filter(p => {
    const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase()
    return name.includes(patientSearchTerm.toLowerCase())
  })

  const getStatusColor = (status) => {
    switch(status) {
      case 'normal':
        return darkMode ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-green-100 text-green-800';
      case 'attention':
        return darkMode ? 'bg-yellow-900 bg-opacity-30 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'abnormal':
        return darkMode ? 'bg-red-900 bg-opacity-30 text-red-300' : 'bg-red-100 text-red-800';
      case 'pending':
        return darkMode ? 'bg-[#133037] text-[#8AA2A7]' : 'bg-gray-100 text-gray-800';
      default:
        return darkMode ? 'bg-[#133037] text-[#8AA2A7]' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'normal':
        return <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-green-400' : 'bg-green-500'}`}></div>;
      case 'attention':
        return <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>;
      case 'abnormal':
        return <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-red-400' : 'bg-red-500'}`}></div>;
      case 'pending':
        return <Clock className={`w-3 h-3 ${darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}`} />;
      default:
        return <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-[#8AA2A7]' : 'bg-gray-500'}`}></div>;
    }
  };

  const getActionButton = (status, vital) => {
    if (status === 'pending') {
      return (
        <button className={`px-3 py-1 rounded text-sm flex items-center transition-colors ${
          darkMode
            ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
            : 'bg-[#5ACCC3] text-white hover:bg-teal-600'
        }`}>
          <Plus className="w-3 h-3 mr-1" />
          {t('record')}
        </button>
      );
    } else {
      return (
        <button 
          onClick={() => {
            if (vital.patientId) {
              navigate(`/nurse/patients/${vital.patientId}/profile`);
            }
          }}
          className={`border px-3 py-1 rounded text-sm flex items-center transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Eye className="w-3 h-3 mr-1" />
          {t('view')}
        </button>
      );
    }
  };

  const filteredVitals = vitalsData.filter(vital => {
    const matchesSearch = vital.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vital.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vital.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    return vitalsData.reduce((acc, vital) => {
      acc[vital.status] = (acc[vital.status] || 0) + 1;
      return acc;
    }, {});
  };

  const statusCounts = getStatusCounts();

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <NurseHeader />
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-2xl font-bold flex items-center ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
            }`}>
              <Activity className="mr-3 h-6 w-6" />
              {t('vitalSignsManagement')}
            </h1>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                }`}
              />
              <button 
                onClick={() => setShowRecordModal(true)}
                className={`px-4 py-2 rounded flex items-center transition-colors ${
                  darkMode
                    ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                    : 'bg-[#5ACCC3] text-white hover:bg-teal-600'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('recordVitals')}
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-green-500 border-[#133037]'
                : 'bg-white border-green-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`}>{statusCounts.normal || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('normal')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-yellow-500 border-[#133037]'
                : 'bg-white border-yellow-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`}>{statusCounts.attention || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('attention')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-red-500 border-[#133037]'
                : 'bg-white border-red-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`}>{statusCounts.abnormal || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('abnormal')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-gray-500 border-[#133037]'
                : 'bg-white border-gray-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{statusCounts.pending || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('pending')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-[#79CAC2] border-[#133037]'
                : 'bg-white border-[#5ACCC3]'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
              }`}>{vitalsData.length}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('totalPatients')}</div>
            </div>
          </div>

          {/* Filters and View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder={t('searchPatientOrRoom')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3]'
                  }`}
                />
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`} />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                }`}
              >
                <option value="all">{t('allStatus')}</option>
                <option value="normal">{t('normal')}</option>
                <option value="attention">{t('attention')}</option>
                <option value="abnormal">{t('abnormal')}</option>
                <option value="pending">{t('pending')}</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded transition-colors ${
                  viewMode === 'table'
                    ? darkMode
                      ? 'bg-[#79CAC2] text-[#050C0F]'
                      : 'bg-[#5ACCC3] text-white'
                    : darkMode
                    ? 'bg-[#0D2026] border border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('table')}
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded transition-colors ${
                  viewMode === 'cards'
                    ? darkMode
                      ? 'bg-[#79CAC2] text-[#050C0F]'
                      : 'bg-[#5ACCC3] text-white'
                    : darkMode
                    ? 'bg-[#0D2026] border border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('cards')}
              </button>
            </div>
          </div>
        </div>

        {/* Vitals Display */}
        {viewMode === 'table' ? (
          <div className={`rounded-lg shadow overflow-hidden transition-colors ${
            darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b transition-colors ${
                  darkMode ? 'bg-[#07181D] border-[#133037]' : 'bg-gray-50 border-gray-200'
                }`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('patient')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('time')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('temperature')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('bloodPressure')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('heartRate')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('respiratory')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('o2Sat')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('pain')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('status')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('action')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${
                  darkMode ? 'divide-[#133037]' : 'divide-gray-200 bg-white'
                }`}>
                  {loading ? (
                    <tr>
                      <td colSpan="10" className={`px-6 py-8 text-center ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        <div className="flex items-center justify-center">
                          <div className={`animate-spin rounded-full h-6 w-6 border-b-2 mr-2 ${
                            darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
                          }`}></div>
                          {t('loadingVitalsData')}
                        </div>
                      </td>
                    </tr>
                  ) : filteredVitals.length === 0 ? (
                    <tr>
                      <td colSpan="10" className={`px-6 py-8 text-center ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        {t('noVitalSignsFound')}
                      </td>
                    </tr>
                  ) : (
                    filteredVitals.map((vital) => (
                    <tr key={vital.id} className={`transition-colors ${
                      darkMode ? 'hover:bg-[#133037]' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className={`font-medium ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{vital.patient}</div>
                          <div className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('room')} {vital.room}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.time}</div>
                        <div className={`text-xs ${
                          darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                        }`}>{vital.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Thermometer className={`w-4 h-4 mr-2 ${
                            darkMode ? 'text-red-400' : 'text-red-500'
                          }`} />
                          <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.temperature}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Activity className={`w-4 h-4 mr-2 ${
                            darkMode ? 'text-blue-400' : 'text-blue-500'
                          }`} />
                          <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.bloodPressure}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Heart className={`w-4 h-4 mr-2 ${
                            darkMode ? 'text-red-400' : 'text-red-500'
                          }`} />
                          <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.heartRate}</span>
                          {vital.heartRate !== '-' && (
                            <span className={`text-xs ml-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                            }`}>bpm</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.respiratory}</div>
                        {vital.respiratory !== '-' && (
                          <div className={`text-xs ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>/min</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Droplets className={`w-4 h-4 mr-2 ${
                            darkMode ? 'text-blue-400' : 'text-blue-500'
                          }`} />
                          <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.oxygenSat}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.pain}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(vital.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vital.status)}`}>
                            {t(vital.status)}
                          </span>
                        </div>
                        {vital.alerts && vital.alerts.length > 0 && (
                          <div className="mt-1">
                            {vital.alerts.map((alert, index) => (
                              <div key={index} className={`flex items-center text-xs ${
                                darkMode ? 'text-red-400' : 'text-red-600'
                              }`}>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {alert}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionButton(vital.status, vital)}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVitals.map((vital) => (
              <div key={vital.id} className={`rounded-lg shadow p-6 hover:shadow-lg transition-all ${
                darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`font-bold ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{vital.patient}</h3>
                    <p className={`text-sm ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{t('room')} {vital.room} • {vital.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(vital.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vital.status)}`}>
                      {t(vital.status)}
                    </span>
                  </div>
                </div>
                
                {vital.status !== 'pending' ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Thermometer className={`w-4 h-4 mr-2 ${
                        darkMode ? 'text-red-400' : 'text-red-500'
                      }`} />
                      <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.temperature}</span>
                    </div>
                    <div className="flex items-center">
                      <Heart className={`w-4 h-4 mr-2 ${
                        darkMode ? 'text-red-400' : 'text-red-500'
                      }`} />
                      <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.heartRate} bpm</span>
                    </div>
                    <div className="flex items-center">
                      <Activity className={`w-4 h-4 mr-2 ${
                        darkMode ? 'text-blue-400' : 'text-blue-500'
                      }`} />
                      <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.bloodPressure}</span>
                    </div>
                    <div className="flex items-center">
                      <Droplets className={`w-4 h-4 mr-2 ${
                        darkMode ? 'text-blue-400' : 'text-blue-500'
                      }`} />
                      <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{vital.oxygenSat}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-4 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>
                    <Clock className={`w-8 h-8 mx-auto mb-2 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`} />
                    <p>{t('vitalsDueForRecording')}</p>
                  </div>
                )}
                
                {vital.alerts && vital.alerts.length > 0 && (
                  <div className={`mt-4 pt-4 border-t ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    {vital.alerts.map((alert, index) => (
                      <div key={index} className={`flex items-center text-xs mb-1 ${
                        darkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {alert}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={`mt-4 pt-4 border-t flex justify-between items-center ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <span className={`text-xs ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>
                    {vital.nurse !== '-' ? t('recordedBy', { nurse: vital.nurse }) : t('notRecorded')}
                  </span>
                  {getActionButton(vital.status, vital)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        <div className={`mt-6 text-sm text-center ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
        }`}>
          {t('showingVitals', { 
            count: filteredVitals.length, 
            total: vitalsData.length, 
            date: selectedDate 
          })}
        </div>
      </div>

      {/* Record Vitals Modal */}
      {showRecordModal && (
        <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 ${
          darkMode ? 'bg-black/50' : 'bg-white/30'
        }`}>
          <div className={`rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors ${
            darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
                }`}>{t('recordVitalSigns')}</h2>
                <button
                  onClick={() => {
                    setShowRecordModal(false)
                    setSelectedPatientId(null)
                    setPatientSearchTerm('')
                  }}
                  className={`transition-colors ${
                    darkMode ? 'text-[#8AA2A7] hover:text-[#C1D9DD]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {!selectedPatientId ? (
                <div>
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('selectPatient')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('searchPatients')}
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3]'
                        }`}
                      />
                      <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                  <div className={`max-h-64 overflow-y-auto border rounded-lg ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    {filteredPatients.length > 0 ? (
                      <ul className={`divide-y ${
                        darkMode ? 'divide-[#133037]' : 'divide-gray-200'
                      }`}>
                        {filteredPatients.map((patient) => (
                          <li
                            key={patient.id}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={`p-3 cursor-pointer transition-colors ${
                              darkMode ? 'hover:bg-[#133037]' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`font-medium ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>
                              {patient.firstName} {patient.lastName}
                            </div>
                            {patient.dateOfBirth && (
                              <div className={`text-sm ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                              }`}>
                                {t('dob')}: {new Date(patient.dateOfBirth).toLocaleDateString()}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className={`p-4 text-center ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        {t('noPatientsFound')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                      }`}>{t('recordingVitalsFor')}:</p>
                      <p className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>
                        {patients.find(p => p.id === selectedPatientId)?.firstName}{' '}
                        {patients.find(p => p.id === selectedPatientId)?.lastName}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPatientId(null)}
                      className={`text-sm transition-colors ${
                        darkMode
                          ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                          : 'text-[#5ACCC3] hover:text-teal-700'
                      }`}
                    >
                      {t('changePatient')}
                    </button>
                  </div>
                  <VitalSignForm
                    onSubmit={handleRecordVital}
                    onCancel={() => {
                      setShowRecordModal(false)
                      setSelectedPatientId(null)
                      setPatientSearchTerm('')
                    }}
                    submitting={submitting}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseVitalsModule;