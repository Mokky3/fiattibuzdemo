// 1. UPDATE YOUR REACT COMPONENT - PatientRegister.js

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ReceptionistHeader } from './ReceptionHeader';
import { User, Phone, Mail, MapPin, UserPlus, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { receptionAPI } from '../../services/apiService';

// Configure axios base URL (fallback); centralized calls use receptionAPI
const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : 'http://localhost:8000/api/v1';

const PatientRegister = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    phone_number: '',
    email: '',
    address: '',
    emergency_contact: '',
    pinfl: '',
  });

  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // REAL API CALL - Fetch patients
  useEffect(() => {
    fetchPatients();
  }, [searchTerm]); // Refetch when search term changes

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      // Use the new comprehensive patients list endpoint
      const patientsList = await receptionAPI.getPatientsList(searchTerm)
      const transformedPatients = (patientsList || []).map(p => ({ 
        id: p.id, 
        full_name: p.full_name, 
        date_of_birth: p.date_of_birth,
        phone_number: p.phone_number,
        email: p.email
      }))
      setPatients(transformedPatients)
    } catch (err) {
      console.error('Failed to fetch patients:', err)
      setPatients([])
    } finally {
      setIsLoading(false)
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // REAL API CALL - Register patient
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const clinicId = localStorage.getItem('clinic_id') || 'default-clinic'
      const payload = { ...form, clinic_id: clinicId }
      await receptionAPI.registerPatient(payload)
      
      setSuccess(true);
      showMessage(t('patientRegisteredSuccessfully'), 'success');
      
      // Reset form
      setForm({
        full_name: '',
        date_of_birth: '',
        gender: '',
        phone_number: '',
        email: '',
        address: '',
        emergency_contact: '',
        pinfl: '',
      });
      
      // Refresh patient list
      fetchPatients();
      
    } catch (err) {
      console.error('Registration error:', err);
      setSuccess(false);
      
      // Handle different error types
      if (err.response?.status === 409) {
        showMessage(err.response.data.detail || t('patientAlreadyExists'), 'error');
      } else if (err.response?.status === 400) {
        showMessage(err.response.data.detail || t('invalidDataProvided'), 'error');
      } else {
        showMessage(t('registrationFailedPleaseTryAgain'), 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // REAL API CALL - Find and invite patient
  const handleFindAndInvite = async () => {
    if (!form.full_name && !form.date_of_birth && !form.pinfl) {
      showMessage(t('pleaseFillInAtLeastOneSearchField'), 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const clinicId = localStorage.getItem('clinic_id') || 'default-clinic'
      const searchResp = await receptionAPI.searchPatients({ clinicId, q: form.full_name || '', pinfl: form.pinfl || '', phone: form.phone_number || '' })
      const items = searchResp?.data || searchResp?.items || searchResp?.results || []
      if (items.length) {
        showMessage(t('patientExistsInTheSystem'), 'success')
      } else {
        showMessage(t('noPatientFoundWithProvidedInformation'), 'warning')
      }
      
    } catch (err) {
      console.error('Find and invite error:', err);
      
      if (err.response?.status === 404) {
        showMessage(t('noPatientFoundWithProvidedInformation'), 'warning');
      } else {
        showMessage(t('failedToSendInvitationPleaseTryAgain'), 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getMessageStyles = () => {
    switch (messageType) {
      case 'success': 
        return darkMode
          ? 'bg-[#062412] text-[#4ADE80] border-[#4ADE80]'
          : 'bg-green-50 text-green-700 border-green-200';
      case 'error': 
        return darkMode
          ? 'bg-[#2A0E15] text-[#FB7185] border-[#FB7185]'
          : 'bg-red-50 text-red-700 border-red-200';
      case 'warning': 
        return darkMode
          ? 'bg-[#251F07] text-[#FACC15] border-[#FACC15]'
          : 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: 
        return darkMode
          ? 'bg-[#07181D] text-[#C1D9DD] border-[#133037]'
          : 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <ReceptionistHeader />

      <div className="flex flex-row max-w-screen-2xl mx-auto px-2 sm:px-4 py-6 sm:py-10 gap-4 sm:gap-6">
        {/* Fixed Width Left Sidebar - Patient List */}
        <div className={`w-80 flex-shrink-0 rounded-xl shadow-sm border h-fit sticky top-6 transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
        }`}>
          <div className={`p-4 border-b transition-colors ${
            darkMode ? 'border-[#133037]' : 'border-gray-100'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
            }`}>
              <User className="w-5 h-5" />
              {t('patientList')}
            </h3>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder={t('searchPatients')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Debounce: fetchPatients will be called via useEffect when searchTerm changes
                }}
                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                }`}
              />
            </div>
          </div>
          
          <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredPatients.length > 0 ? (
              <div className="space-y-2">
                {filteredPatients.map((p) => (
                  <div 
                    key={p.id} 
                    className={`border rounded-lg p-3 transition-colors cursor-pointer ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] hover:bg-[#133037] hover:border-[#79CAC2]'
                        : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-[#4DB6B0]'
                    }`}
                  >
                    <div className={`font-medium text-sm ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                    }`}>{p.full_name}</div>
                    <div className={`text-xs mt-1 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{p.date_of_birth}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center text-sm py-8 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                <User className={`w-8 h-8 mx-auto mb-2 ${
                  darkMode ? 'text-[#133037]' : 'text-gray-300'
                }`} />
                {searchTerm ? t('noPatientsFound') : t('noPatientsRegisteredYet')}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Registration Form */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <UserPlus className={`w-5 h-5 sm:w-6 sm:h-6 ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
            }`} />
            <h2 className={`text-xl sm:text-2xl font-bold ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
            }`}>{t('registerNewPatient')}</h2>
          </div>

          {/* Enhanced Message Display */}
          {message && (
            <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border flex items-center gap-3 transition-colors ${getMessageStyles()}`}>
              {getMessageIcon()}
              <span className="font-medium text-sm sm:text-base">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`rounded-xl shadow-sm border transition-colors ${
            darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
          }`}>
            <div className={`p-4 sm:p-6 border-b transition-colors ${
              darkMode ? 'border-[#133037]' : 'border-gray-100'
            }`}>
              <h3 className={`text-base sm:text-lg font-medium mb-1 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
              }`}>{t('patientInformation')}</h3>
              <p className={`text-xs sm:text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('fillInPatientDetailsBelow')}</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Enhanced Input Fields */}
                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('fullName')} <span className={darkMode ? 'text-red-400' : 'text-red-500'}>*</span>
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      placeholder={t('enterFullName')}
                      className={`w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('dateOfBirth')} <span className={darkMode ? 'text-red-400' : 'text-red-500'}>*</span>
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-200 text-gray-900 focus:ring-[#4DB6B0]'
                    }`}
                    required
                  />
                </div>

                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('gender')} <span className={darkMode ? 'text-red-400' : 'text-red-500'}>*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-200 text-gray-900 focus:ring-[#4DB6B0]'
                    }`}
                    required
                  >
                    <option value="">{t('selectGender')}</option>
                    <option value="Male">{t('male')}</option>
                    <option value="Female">{t('female')}</option>
                  </select>
                </div>

                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('pinfl')} <span className={darkMode ? 'text-red-400' : 'text-red-500'}>*</span>
                  </label>
                  <input
                    type="text"
                    name="pinfl"
                    value={form.pinfl}
                    onChange={handleChange}
                    placeholder={t('enterPinflNumber')}
                    maxLength={14}
                    className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                    }`}
                    required
                  />
                </div>

                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('phoneNumber')} <span className={darkMode ? 'text-red-400' : 'text-red-500'}>*</span>
                  </label>
                  <div className="relative">
                    <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`} />
                    <input
                      type="tel"
                      name="phone_number"
                      value={form.phone_number}
                      onChange={handleChange}
                      placeholder="+998XXXXXXXXX"
                      className={`w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('email')}</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`} />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder={t('enterEmailAddress')}
                      className={`w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('emergencyContact')}</label>
                  <div className="relative">
                    <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      name="emergency_contact"
                      value={form.emergency_contact}
                      onChange={handleChange}
                      placeholder={t('emergencyContactNumber')}
                      className={`w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                    />
                  </div>
                </div>

                <div className="relative sm:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('address')}</label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder={t('enterFullAddress')}
                      className={`w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm sm:text-base ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`px-4 sm:px-6 py-3 sm:py-4 rounded-b-xl border-t transition-colors ${
              darkMode ? 'bg-[#07181D] border-[#133037]' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base ${
                    darkMode
                      ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                      : 'bg-[#4DB6B0] text-white hover:bg-[#45a9a3]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                        darkMode ? 'border-[#050C0F]' : 'border-white'
                      }`}></div>
                      {t('registering')}...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {t('registerPatient')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleFindAndInvite}
                  disabled={isLoading}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base ${
                    darkMode
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('searching')}...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      {t('findInvitePatient')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientRegister;