import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X } from 'lucide-react';
import { patientDoctorSearchAPI } from '../../services/apiService';

const DoctorSearchModal = ({ isOpen, onClose, initialDoctor = null, initialHospital = '', onAppointmentBooked }) => {
  const { t } = useTranslation();
  const [doctorSearchData, setDoctorSearchData] = useState({
    fullName: initialDoctor?.name || '',
    hospital: initialHospital || '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: '',
    additionalNote: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const searchTimeoutRef = useRef(null);

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

  const appointmentTypes = [
    t('patientAppointment.typeGeneralConsultation'),
    t('patientAppointment.typeYearlyCheckUp'),
    t('patientAppointment.typeFollowUpVisit'),
    t('patientAppointment.typeEmergencyConsultation'),
    t('patientAppointment.typeSpecialistConsultation')
  ];

  const handleAutoSearch = useCallback(async (doctorName, hospitalName) => {
    if (!doctorName) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await patientDoctorSearchAPI.search({
        q: doctorName,
        specialty: '',
        hospital: hospitalName || '',
        page: 1,
        size: 20
      });
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      // Handle 404 or "Doctor not found" gracefully - treat as empty results
      if (err?.message?.includes('not found') || err?.message?.includes('404')) {
        setResults([]);
        setError(''); // Don't show error for not found, just show empty results
      } else {
        setError(err?.message || t('doctorSearchModal.errorSearchFailed'));
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update state when initialDoctor or initialHospital changes
  useEffect(() => {
    if (isOpen) {
      // Only pre-fill if we have a doctor with ID (from Book Appointment button)
      if (initialDoctor?.id && initialDoctor?.name) {
        setDoctorSearchData(prev => ({
          ...prev,
          fullName: initialDoctor.name,
          hospital: initialHospital || prev.hospital
        }));
        
        // Create a result directly without searching
        const doctorResult = {
          id: initialDoctor.id,
          name: initialDoctor.name,
          fullName: initialDoctor.name,
          specialty: initialDoctor.specialty || '',
          hospital: initialHospital || '',
          organization: initialHospital || ''
        };
        setResults([doctorResult]);
        setSelectedDoctor(doctorResult); // Auto-select the pre-filled doctor
        setLoading(false);
        setError('');
      } else {
        // Reset form when opening normally (no pre-filled doctor)
        setDoctorSearchData(prev => ({
          ...prev,
          fullName: '',
          hospital: '',
          appointmentDate: '',
          appointmentTime: '',
          appointmentType: '',
          additionalNote: ''
        }));
        setResults([]);
        setSelectedDoctor(null);
        setError('');
      }
    }
  }, [isOpen, initialDoctor, initialHospital]);

  const handleRealTimeSearch = useCallback(async (searchQuery, hospitalFilter = '') => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const data = await patientDoctorSearchAPI.search({
        q: searchQuery,
        specialty: '',
        hospital: hospitalFilter,
        page: 1,
        size: 20
      });
      
      console.log('Search results:', data); // Debug log
      
      // Ensure data is an array and map to expected format
      const formattedResults = Array.isArray(data) ? data.map(doc => {
        // Handle different field name variations from backend
        const doctorId = doc.id || doc.fhir_practitioner_role_id || doc.fhir_practitioner_id;
        const doctorName = doc.full_name || doc.fullName || doc.name || 'Doctor';
        const doctorSpecialty = doc.specialty || doc.specialization || doc.primary_specialization || 'General';
        const doctorHospital = doc.hospital || doc.clinic_name || doc.organization || doc.location || '';
        
        return {
          id: doctorId,
          fullName: doctorName,
          name: doctorName,
          full_name: doctorName,
          specialty: doctorSpecialty,
          specialization: doctorSpecialty,
          hospital: doctorHospital,
          clinic_name: doctorHospital,
          organization: doctorHospital,
          location: doctorHospital,
          doctor_id: doctorId,
          fhir_practitioner_id: doc.fhir_practitioner_id,
          fhir_practitioner_role_id: doc.fhir_practitioner_role_id
        };
      }) : [];
      
      setResults(formattedResults);
    } catch (err) {
      console.error('Search error:', err); // Debug log
      // Handle 404 or "Doctor not found" gracefully - treat as empty results
      if (err?.message?.includes('not found') || err?.message?.includes('404')) {
        setResults([]);
        setError(''); // Don't show error for not found, just show empty results
      } else {
        setError(err?.message || t('doctorSearchModal.errorSearchFailed'));
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDoctorSearchChange = (field, value) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setDoctorSearchData(prev => {
      const updated = {
      ...prev,
      [field]: value
      };
      
      // Real-time search when typing in the doctor name field (with debouncing)
      if (field === 'fullName') {
        if (value.length >= 1) {
          // Debounce search by 300ms - use prev.hospital to get current state
          searchTimeoutRef.current = setTimeout(() => {
            handleRealTimeSearch(value, prev.hospital);
          }, 300);
        } else {
          // Clear results when field is empty
          setResults([]);
          setSelectedDoctor(null);
        }
      } else if (field === 'hospital') {
        // Re-search when hospital filter changes and there's already a search query
        if (prev.fullName && prev.fullName.length >= 1) {
          searchTimeoutRef.current = setTimeout(() => {
            handleRealTimeSearch(prev.fullName, value);
          }, 300);
        }
      }
      
      return updated;
    });
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleDoctorSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await patientDoctorSearchAPI.search({
        q: doctorSearchData.fullName,
        specialty: doctorSearchData.appointmentType,
        hospital: doctorSearchData.hospital,
        page: 1,
        size: 20
      });
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to search doctors');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!doctorSearchData.appointmentDate || !doctorSearchData.appointmentTime || !doctorSearchData.appointmentType) {
      setError(t('doctorSearchModal.errorSelectDateTimeType'));
      return;
    }
    
    // Check if a doctor is selected (either from search results or pre-filled)
    const doctorToBook = selectedDoctor || (results.length === 1 ? results[0] : null) || (initialDoctor ? {
      id: initialDoctor.id,
      name: initialDoctor.name,
      hospital: initialHospital || doctorSearchData.hospital
    } : null);
    
    if (!doctorToBook || !doctorToBook.id) {
      setError(t('doctorSearchModal.errorSelectDoctor'));
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await patientDoctorSearchAPI.bookAppointment({
        hospital: doctorSearchData.hospital || doctorToBook.hospital || '',
        appointmentDate: doctorSearchData.appointmentDate,
        appointmentTime: doctorSearchData.appointmentTime,
        appointmentType: doctorSearchData.appointmentType,
        additionalNote: doctorSearchData.additionalNote,
        doctor_id: doctorToBook.id || doctorToBook.doctor_id || ''
      });
      
      // Show success message
      setShowSuccessMessage(true);
      
      // Notify parent component that appointment was booked
      if (onAppointmentBooked) {
        onAppointmentBooked();
      }
      
      // Close modal after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
        handleClose();
      }, 3000);
      
    } catch (e) {
      setError(e?.message || t('patientAppointment.errorBookFailed'));
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDoctorSearchData({
      fullName: '',
      hospital: '',
      appointmentDate: '',
      appointmentTime: '',
      appointmentType: '',
      additionalNote: ''
    });
    setResults([]);
    setError('');
    setSelectedDoctor(null);
    setShowSuccessMessage(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 sm:border-4 ${darkMode ? 'border-emerald-600' : 'border-emerald-400'}`}>
        <div className="p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h2 className={`text-lg sm:text-2xl font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('doctorSearchModal.searchDoctor')}</h2>
            <button
              onClick={handleClose}
              className={`transition-colors p-1 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <form onSubmit={handleDoctorSearch} className="space-y-4 sm:space-y-6" onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.type !== 'textarea') {
              e.preventDefault();
              handleDoctorSearch(e);
            }
          }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('doctorSearchModal.searchByName')}
                  value={doctorSearchData.fullName}
                  onChange={(e) => handleDoctorSearchChange('fullName', e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors text-sm sm:text-base ${
                    darkMode 
                      ? 'bg-gray-700 border-emerald-600 text-gray-100 placeholder-gray-400' 
                      : 'border-emerald-200'
                  }`}
                />
                {loading && doctorSearchData.fullName && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${darkMode ? 'border-emerald-400' : 'border-emerald-400'}`}></div>
                  </div>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder={t('doctorSearchModal.filterByHospital')}
                  value={doctorSearchData.hospital}
                  onChange={(e) => handleDoctorSearchChange('hospital', e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors text-sm sm:text-base ${
                    darkMode 
                      ? 'bg-gray-700 border-emerald-600 text-gray-100 placeholder-gray-400' 
                      : 'border-emerald-200'
                  }`}
                />
              </div>
            </div>
            
            {/* Real-time search results dropdown */}
            {doctorSearchData.fullName && results.length > 0 && !showSuccessMessage && (
              <div className={`mt-2 border-2 rounded-lg shadow-lg max-h-64 overflow-y-auto ${
                darkMode 
                  ? 'bg-gray-700 border-emerald-600' 
                  : 'bg-white border-emerald-200'
              }`}>
                {results.map((doc, idx) => (
                  <div 
                    key={doc.id || idx} 
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setDoctorSearchData(prev => ({
                        ...prev,
                        fullName: doc.fullName || doc.name || doc.full_name || '',
                        hospital: doc.hospital || doc.organization || prev.hospital
                      }));
                      setResults([]); // Close dropdown after selection
                    }}
                    className={`p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                      selectedDoctor?.id === doc.id || selectedDoctor?.id === doc.doctor_id
                        ? darkMode 
                          ? 'bg-emerald-900/30 border-emerald-600' 
                          : 'bg-emerald-50 border-emerald-200'
                        : darkMode 
                          ? 'border-gray-600 hover:bg-gray-600' 
                          : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                          {doc.fullName || doc.name || doc.full_name || t('doctorSearchModal.doctor')}
                        </div>
                        <div className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {doc.specialty || doc.specialization ? (
                            <span className={`font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{doc.specialty || doc.specialization}</span>
                          ) : null}
                          {doc.specialty || doc.specialization ? ' • ' : ''}
                          {doc.hospital || doc.organization || t('doctorSearchModal.hospitalNotSpecified')}
                        </div>
                      </div>
                      {selectedDoctor?.id === doc.id || selectedDoctor?.id === doc.doctor_id ? (
                        <div className={`ml-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {doctorSearchData.fullName && results.length === 0 && !loading && !showSuccessMessage && (
              <div className={`mt-2 text-sm text-center py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('doctorSearchModal.noDoctorsFound')}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('patientAppointment.appointmentDate')}</label>
              <input
                type="date"
                value={doctorSearchData.appointmentDate}
                onChange={(e) => handleDoctorSearchChange('appointmentDate', e.target.value)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                    : 'border-gray-200'
                }`}
                placeholder="date/month/year"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('patientAppointment.appointmentTime')}</label>
              <input
                type="time"
                value={doctorSearchData.appointmentTime}
                onChange={(e) => handleDoctorSearchChange('appointmentTime', e.target.value)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                    : 'border-gray-200'
                }`}
                placeholder="time"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('patientAppointment.appointmentType')}</label>
              <div className="relative">
                <select
                  value={doctorSearchData.appointmentType}
                  onChange={(e) => handleDoctorSearchChange('appointmentType', e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none text-sm sm:text-base ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <option value="">{t('patientAppointment.selectType')}</option>
                  {appointmentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 sm:top-3.5 h-4 w-4 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('patientAppointment.additionalNote')}</label>
              <textarea
                value={doctorSearchData.additionalNote}
                onChange={(e) => handleDoctorSearchChange('additionalNote', e.target.value)}
                rows={4}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none text-sm sm:text-base ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                    : 'border-gray-200'
                }`}
                placeholder={t('patientAppointment.additionalNotePlaceholder')}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-colors font-medium text-sm sm:text-base ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {t('doctorSearchModal.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-emerald-400 hover:bg-emerald-500'
                } text-white`}
              >
                {loading ? t('doctorSearchModal.booking') : t('doctorSearchModal.submit')}
              </button>
            </div>
          </form>

          <div className="mt-4">
            {error && (
              <div className={`p-3 rounded border ${
                darkMode 
                  ? 'bg-red-900/30 border-red-700 text-red-300' 
                  : 'bg-red-100 border-red-200 text-red-700'
              }`}>{error}</div>
            )}
            {showSuccessMessage && (
              <div className={`p-4 rounded-lg text-center border ${
                darkMode 
                  ? 'bg-green-900/30 border-green-700 text-green-300' 
                  : 'bg-green-100 border-green-400 text-green-800'
              }`}>
                <div className={`font-semibold text-lg mb-1 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{t('doctorSearchModal.successBooked')}</div>
                <div className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{t('doctorSearchModal.appointmentConfirmed')}</div>
              </div>
            )}
            {loading && !showSuccessMessage && (
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('doctorSearchModal.searching')}</div>
            )}
            {!loading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((doc, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedDoctor(doc)}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedDoctor?.id === doc.id || selectedDoctor?.id === doc.doctor_id
                        ? darkMode 
                          ? 'border-emerald-600 bg-emerald-900/30' 
                          : 'border-emerald-400 bg-emerald-50'
                        : darkMode 
                          ? 'border-gray-600 hover:border-gray-500' 
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{doc.name || doc.fullName || t('doctorSearchModal.doctor')}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.specialty || doc.specialization} • {doc.hospital || doc.organization}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSearchModal; 