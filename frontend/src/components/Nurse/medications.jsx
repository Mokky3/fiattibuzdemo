import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Clock, CheckCircle, AlertTriangle, Eye, Pill, Calendar, MoreVertical } from 'lucide-react';
import NurseHeader from './header';
import { getMedications, administerMedication, skipMedication } from '../../services/nurseService';

const NurseMedicationsModule = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [openMenuId, setOpenMenuId] = useState(null);
  
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

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    given: 0,
    pending: 0,
    'due-soon': 0,
    overdue: 0,
    skipped: 0
  });

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await getMedications({ 
          date: selectedDate,
          status: statusFilter,
          search: searchTerm 
        })
        if (active) {
          // Handle both array response and object with items
          if (Array.isArray(response)) {
            setMedications(response)
            // Calculate status counts from array
            const counts = response.reduce((acc, med) => {
              acc[med.status] = (acc[med.status] || 0) + 1
              acc.total = (acc.total || 0) + 1
              return acc
            }, { total: 0, given: 0, pending: 0, 'due-soon': 0, overdue: 0, skipped: 0 })
            setStatusCounts(counts)
          } else if (response && response.items) {
            setMedications(response.items)
            setStatusCounts({
              total: response.total || response.items.length,
              given: response.given || 0,
              pending: response.pending || 0,
              'due-soon': response.dueSoon || 0,
              overdue: response.overdue || 0,
              skipped: response.skipped || 0
            })
          } else {
            setMedications([])
            setStatusCounts({ total: 0, given: 0, pending: 0, 'due-soon': 0, overdue: 0, skipped: 0 })
          }
        }
      } catch (e) {
        console.error('Error loading medications:', e)
        if (active) {
          setMedications([])
          setStatusCounts({ total: 0, given: 0, pending: 0, 'due-soon': 0, overdue: 0, skipped: 0 })
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [selectedDate, statusFilter, searchTerm])

  const onAdminister = async (med) => {
    try {
      const response = await administerMedication(med.id)
      if (response && response.data) {
        // Update the medication with the response from backend
        setMedications(prev => prev.map(m => m.id === med.id ? response.data : m))
        // Refresh the data to get updated status counts
        const updatedResponse = await getMedications({ 
          date: selectedDate,
          status: statusFilter,
          search: searchTerm 
        })
        if (updatedResponse && updatedResponse.items) {
          setStatusCounts({
            total: updatedResponse.total || updatedResponse.items.length,
            given: updatedResponse.given || 0,
            pending: updatedResponse.pending || 0,
            'due-soon': updatedResponse.dueSoon || 0,
            overdue: updatedResponse.overdue || 0,
            skipped: updatedResponse.skipped || 0
          })
        }
      }
    } catch (e) {
      console.error('Error administering medication:', e)
    }
  }
  
  const onSkip = async (med) => {
    try {
      const response = await skipMedication(med.id, 'Skipped via UI')
      if (response && response.data) {
        // Update the medication with the response from backend
        setMedications(prev => prev.map(m => m.id === med.id ? response.data : m))
        // Refresh the data to get updated status counts
        const updatedResponse = await getMedications({ 
          date: selectedDate,
          status: statusFilter,
          search: searchTerm 
        })
        if (updatedResponse && updatedResponse.items) {
          setStatusCounts({
            total: updatedResponse.total || updatedResponse.items.length,
            given: updatedResponse.given || 0,
            pending: updatedResponse.pending || 0,
            'due-soon': updatedResponse.dueSoon || 0,
            overdue: updatedResponse.overdue || 0,
            skipped: updatedResponse.skipped || 0
          })
        }
      }
    } catch (e) {
      console.error('Error skipping medication:', e)
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'given':
        return <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />;
      case 'pending':
        return <Clock className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />;
      case 'due-soon':
        return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />;
      case 'overdue':
        return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />;
      case 'skipped':
        return <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
          darkMode ? 'bg-gray-600' : 'bg-gray-400'
        }`}>
          <span className="text-white text-xs">S</span>
        </div>;
      default:
        return <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />;
    }
  };

  const getStatusText = (status, statusTime) => {
    switch(status) {
      case 'given':
        return statusTime ? t('givenAt', { time: statusTime }) : t('given');
      case 'pending':
        return t('pending');
      case 'due-soon':
        return t('dueSoon');
      case 'overdue':
        return t('overdue');
      case 'skipped':
        return t('skipped');
      default:
        return t('unknown');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'given':
        return darkMode ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-green-100 text-green-800';
      case 'pending':
        return darkMode ? 'bg-yellow-900 bg-opacity-30 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'due-soon':
        return darkMode ? 'bg-orange-900 bg-opacity-30 text-orange-300' : 'bg-orange-100 text-orange-800';
      case 'overdue':
        return darkMode ? 'bg-red-900 bg-opacity-30 text-red-300' : 'bg-red-100 text-red-800';
      case 'skipped':
        return darkMode ? 'bg-[#133037] text-[#8AA2A7]' : 'bg-gray-100 text-gray-800';
      default:
        return darkMode ? 'bg-[#133037] text-[#8AA2A7]' : 'bg-gray-100 text-gray-800';
    }
  };

  const handleSkipFromMenu = async (medication) => {
    setOpenMenuId(null);
    await onSkip(medication);
  };

  const getActionButton = (status, medication) => {
    const isMenuOpen = openMenuId === medication.id;
    
    switch(status) {
      case 'given':
        return (
          <button className={`border px-3 py-1 rounded text-sm transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            {t('view')}
          </button>
        );
      case 'pending':
      case 'due-soon':
      case 'overdue':
        return (
          <div className="flex items-center space-x-2 relative">
            <button 
              onClick={() => onAdminister(medication)} 
              className={`px-3 py-1 rounded text-sm flex items-center transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-teal-600'
              }`}
            >
              <Pill className="w-3 h-3 mr-1" />
              {t('administer')}
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : medication.id);
                }}
                className={`p-1 rounded transition-colors ${
                  darkMode
                    ? 'hover:bg-[#133037]'
                    : 'hover:bg-gray-200'
                }`}
                aria-label={t('moreOptions')}
              >
                <MoreVertical className={`w-4 h-4 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`} />
              </button>
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setOpenMenuId(null)}
                  />
                  <div className={`absolute right-0 mt-1 w-48 rounded-md shadow-lg z-20 border ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037]'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSkipFromMenu(medication);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center transition-colors ${
                          darkMode
                            ? 'text-[#C1D9DD] hover:bg-[#133037]'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-2">⏭️</span>
                        {t('skipMedication')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case 'skipped':
        return (
          <button 
            onClick={() => onSkip(medication)} 
            className={`px-3 py-1 rounded text-sm transition-colors ${
              darkMode
                ? 'bg-orange-900 bg-opacity-30 text-orange-300 hover:bg-orange-900 hover:bg-opacity-40'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {t('reason')}
          </button>
        );
      default:
        return (
          <button className={`px-3 py-1 rounded text-sm transition-colors ${
            darkMode
              ? 'bg-[#133037] text-[#C1D9DD] hover:bg-[#1a3d44]'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}>
            {t('view')}
          </button>
        );
    }
  };

  // Since we're now filtering on the backend, we can use medications directly
  const filteredMedications = medications;

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
              <Pill className="mr-3 h-6 w-6" />
              {t('medicationAdministration')}
            </h1>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`border rounded px-3 py-2 text-sm transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF]'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button className={`px-4 py-2 rounded flex items-center transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-teal-600'
              }`}>
                <Calendar className="w-4 h-4 mr-2" />
                {t('schedule')}
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-green-500 border-[#133037]'
                : 'bg-white border-green-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {loading ? '...' : statusCounts.given || 0}
              </div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('given')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-yellow-500 border-[#133037]'
                : 'bg-white border-yellow-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                {loading ? '...' : statusCounts.pending || 0}
              </div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('pending')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-orange-500 border-[#133037]'
                : 'bg-white border-orange-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-orange-400' : 'text-orange-600'
              }`}>
                {loading ? '...' : statusCounts['due-soon'] || 0}
              </div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('dueSoon')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-red-500 border-[#133037]'
                : 'bg-white border-red-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {loading ? '...' : statusCounts.overdue || 0}
              </div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('overdue')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-gray-500 border-[#133037]'
                : 'bg-white border-gray-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>
                {loading ? '...' : statusCounts.skipped || 0}
              </div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('skipped')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-[#79CAC2] border-[#133037]'
                : 'bg-white border-[#5ACCC3]'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
              }`}>
                {loading ? '...' : statusCounts.total || 0}
              </div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('total')}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder={t('searchPatientMedicationOrRoom')}
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
              <option value="pending">{t('pending')}</option>
              <option value="due-soon">{t('dueSoon')}</option>
              <option value="overdue">{t('overdue')}</option>
              <option value="given">{t('given')}</option>
              <option value="skipped">{t('skipped')}</option>
            </select>
          </div>
        </div>

        {/* Medications Table */}
        <div className={`rounded-lg shadow overflow-hidden transition-colors ${
          darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
        }`}>
          {loading ? (
            <div className="p-8 text-center">
              <div className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                {t('loadingMedications')}
              </div>
            </div>
          ) : (
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
                    }`}>{t('medication')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('dosage')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('frequency')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('route')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('timeToAdminister')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('status')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('action')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${
                  darkMode ? 'divide-[#133037]' : 'divide-gray-200 bg-[#0D2026]'
                }`}>
                  {filteredMedications.map((med) => (
                    <tr key={med.id} className={`transition-colors ${
                      darkMode ? 'hover:bg-[#133037]' : 'hover:bg-gray-50 bg-white'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className={`font-medium ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{med.patient}</div>
                          <div className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('room')} {med.room}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-medium ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{med.medication}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{med.dosage}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{med.frequency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{med.route}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{med.timeToAdminister}</div>
                        {med.nextDue && med.nextDue !== 'PRN' && (
                          <div className={`text-xs ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('next')}: {med.nextDue}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(med.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(med.status)}`}>
                            {getStatusText(med.status, med.statusTime)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionButton(med.status, med)}
                      </td>
                    </tr>
                  ))}
                  {filteredMedications.length === 0 && !loading && (
                    <tr>
                      <td className={`px-6 py-8 text-center ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`} colSpan={8}>
                        {searchTerm || statusFilter !== 'all' 
                          ? t('noMedicationsFoundMatchingCriteria') 
                          : t('noMedicationsFoundForSelectedDate')
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className={`mt-4 text-sm text-center ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
        }`}>
          {loading ? (
            t('loading')
          ) : (
            t('showingMedications', { 
              count: filteredMedications.length, 
              total: statusCounts.total, 
              date: selectedDate 
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NurseMedicationsModule;