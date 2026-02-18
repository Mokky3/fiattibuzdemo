import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import {
  MapPin,
  Clock,
  Calendar,
  Pill,
  RefreshCw,
  DollarSign,
  Eye,
  Navigation,
  Search
} from 'lucide-react';

import { patientPrescriptionsAPI } from '../../services/apiService';
import { handlePatientAuthError } from '../../utils/patientAuth';

const Prescription = () => {
  const { t } = useTranslation();
  const [medicineSearch, setMedicineSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);

  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const tabs = [
    { key: 'active', label: t('prescription.active') },
    { key: 'expired', label: t('prescription.expired') },
    { key: 'all', label: t('prescription.allPrescriptions') }
  ];

  // TODO: Wire pharmacies to API; mock data removed
  const nearbyPharmacies = [];

  const loadList = async () => {
    setLoading(true);
    setError('');
    try {
      const scope = activeTab === 'all' ? 'all' : activeTab;
      const { items } = await patientPrescriptionsAPI.list({ scope, page: 1, size: 50 });
      setList(items);
    } catch (e) {
      // Handle authentication errors and redirect if needed
      if (handlePatientAuthError(e)) {
        return; // Redirected, exit early
      }
      
      setError(e?.message || t('prescription.errorLoadFailed'));
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getFilteredPrescriptions = () => list.filter(p => {
    if (activeTab === 'active') return (p.status || 'active') === 'active';
    if (activeTab === 'expired') return (p.status || '') !== 'active';
    return true;
  }).filter(p => !medicineSearch || (p.medicineName || '').toLowerCase().includes(medicineSearch.toLowerCase()));

  const getStatusColor = (status) => {
    return status === 'active' ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600');
  };

  const isExpiringSoon = (endDate) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const requestRefill = async (prescriptionId) => {
    try {
      setLoading(true);
      await patientPrescriptionsAPI.requestRefill({ prescriptionId, reason: t('prescription.refillViaPortal'), urgent: false });
      await loadList();
    } catch (e) {
      setError(e?.message || t('prescription.errorRefillFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-6">
            {/* Medicine Search */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('prescription.searchForMedicine')}</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('prescription.search')}
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent pl-10 text-sm sm:text-base ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'border-gray-200'
                  }`}
                />
                <Search className={`absolute left-3 top-2.5 sm:top-3.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
            </div>

            {/* Nearby Pharmacies */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('prescription.nearbyPharmacies')}</h3>
              
              {/* Map Placeholder */}
              <div className={`${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-100 border-2 border-blue-300'} rounded-lg p-4 sm:p-8 mb-4 sm:mb-6 flex items-center justify-center`}>
                <div className="text-center">
                  <Navigation className={`h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`font-medium text-sm sm:text-base ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{t('prescription.interactiveMap')}</p>
                  <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>{t('prescription.pharmaciesInYourArea')}</p>
                </div>
              </div>

              {/* Pharmacy List */}
              <div className="space-y-3 sm:space-y-4">
                {nearbyPharmacies.length === 0 && (
                  <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <MapPin className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className="text-sm">{t('prescription.noNearbyPharmacies')}</p>
                  </div>
                )}
                {nearbyPharmacies.map((pharmacy) => (
                  <div key={pharmacy.id} className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${
                    darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{pharmacy.name}</h4>
                        <div className={`flex items-center text-xs sm:text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="truncate">{pharmacy.address}</span>
                        </div>
                        <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 mt-2">
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{pharmacy.distance}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            pharmacy.isOpen 
                              ? darkMode 
                                ? 'bg-green-900/50 text-green-400' 
                                : 'bg-green-100 text-green-600'
                              : darkMode
                                ? 'bg-red-900/50 text-red-400'
                                : 'bg-red-100 text-red-600'
                          }`}>
                            {pharmacy.isOpen ? t('prescription.open') : t('prescription.closed')}
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>★ {pharmacy.rating}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs sm:text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{t('prescription.price')}</div>
                        <div className={`text-base sm:text-lg font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{pharmacy.price}</div>
                      </div>
                    </div>
                    <button className={`w-full py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                      darkMode 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'bg-emerald-400 hover:bg-emerald-500'
                    } text-white`}>
                      {t('prescription.view')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area - Prescriptions */}
          <div className="flex-1 min-w-0">
            {/* Tab Navigation */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} mb-4 sm:mb-6`}>
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium rounded-t-xl transition-colors ${
                      activeTab === tab.key
                        ? darkMode
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-400 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prescription Cards */}
            <div className="space-y-4 sm:space-y-6">
              {error && (
                <div className={`p-3 border rounded-lg ${
                  darkMode 
                    ? 'bg-red-900/30 border-red-700 text-red-300' 
                    : 'bg-red-100 border-red-200 text-red-700'
                }`}>{error}</div>
              )}
              {loading && (
                <div className={`p-3 text-sm text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('prescription.loadingPrescriptions')}</div>
              )}
              {!loading && getFilteredPrescriptions().length === 0 && (
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-8 text-center`}>
                  <Pill className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('prescription.noPrescriptionsFound')}</p>
                  <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                    {activeTab === 'active' ? t('prescription.noActivePrescriptions') : 
                     activeTab === 'expired' ? t('prescription.noExpiredPrescriptions') : 
                     t('prescription.noPrescriptions')}
                  </p>
                </div>
              )}
              {!loading && getFilteredPrescriptions().map((prescription) => (
                <div key={prescription.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-3 sm:mb-4 space-y-3 lg:space-y-0">
                    <div className="flex-1">
                      <h3 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{prescription.medicineName}</h3>
                      <p className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('prescription.knownAs')}: {prescription.knownAs}</p>
                      {isExpiringSoon(prescription.endDate) && (
                        <div className={`mt-2 border rounded-lg p-2 ${
                          darkMode 
                            ? 'bg-yellow-900/30 border-yellow-700' 
                            : 'bg-yellow-100 border-yellow-300'
                        }`}>
                          <p className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>⚠️ {t('prescription.expiringSoon')}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm sm:text-lg font-bold ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{t('prescription.price')}</div>
                      <div className={`text-lg sm:text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{prescription.price}</div>
                    </div>
                  </div>

                  <div className={`rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className={`mb-3 text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{prescription.description}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{t('prescription.prescribed')}:</span>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : ''}`}>{prescription.prescribedDate}</p>
                      </div>
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{t('prescription.endDate')}:</span>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : ''}`}>{prescription.endDate}</p>
                      </div>
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{t('prescription.dosage')}:</span>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : ''}`}>{prescription.dosage}</p>
                      </div>
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{t('prescription.frequency')}:</span>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : ''}`}>{prescription.frequency}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="font-medium">{t('prescription.prescribedBy')}:</span> {prescription.prescribedBy}
                      </p>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{prescription.hospital}</p>
                    </div>
                    <div>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="font-medium">{t('prescription.refillInfo')}:</span> {prescription.refillInfo}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className={`w-full rounded-full h-2 mr-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div 
                            className={`h-2 rounded-full ${darkMode ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                            style={{ width: `${(prescription.remainingRefills / prescription.totalRefills) * 100}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {prescription.remainingRefills}/{prescription.totalRefills} {t('prescription.left')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`border rounded-lg p-3 mb-3 sm:mb-4 ${
                    darkMode 
                      ? 'bg-blue-900/30 border-blue-700' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>{prescription.purpose}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    <button className={`text-white px-4 sm:px-6 py-2 rounded-lg transition-colors font-medium flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm ${
                      darkMode 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'bg-emerald-400 hover:bg-emerald-500'
                    }`}>
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{t('prescription.lookUp')}</span>
                    </button>
                    {prescription.status === 'active' && prescription.remainingRefills > 0 && (
                      <button onClick={() => requestRefill(prescription.id)} className={`text-white px-4 sm:px-6 py-2 rounded-lg transition-colors font-medium flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm ${
                        darkMode 
                          ? 'bg-gray-600 hover:bg-gray-500' 
                          : 'bg-gray-400 hover:bg-gray-500'
                      }`}>
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{t('prescription.refill')}</span>
                      </button>
                    )}
                    {prescription.status === 'expired' && (
                      <button className={`text-white px-4 sm:px-6 py-2 rounded-lg transition-colors font-medium flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-blue-400 hover:bg-blue-500'
                      }`}>
                        <Pill className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{t('prescription.requestNewPrescription')}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prescription;