import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { patientDoctorSearchAPI } from '../../services/apiService';

const DoctorSearchModal = ({ isOpen, onClose, initialDoctor = null, initialHospital = '', onAppointmentBooked }) => {
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

  const appointmentTypes = [
    'General Consultation',
    'Yearly Check Up',
    'Follow-up Visit',
    'Emergency Consultation',
    'Specialist Consultation'
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
        setError(err?.message || 'Failed to search doctors');
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
        setError(err?.message || 'Failed to search doctors');
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
      setError('Please select date, time, and appointment type');
      return;
    }
    
    // Check if a doctor is selected (either from search results or pre-filled)
    const doctorToBook = selectedDoctor || (results.length === 1 ? results[0] : null) || (initialDoctor ? {
      id: initialDoctor.id,
      name: initialDoctor.name,
      hospital: initialHospital || doctorSearchData.hospital
    } : null);
    
    if (!doctorToBook || !doctorToBook.id) {
      setError('Please select a doctor from the search results');
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
      setError(e?.message || 'Failed to book appointment');
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
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 sm:border-4 border-emerald-400">
        <div className="p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-2xl font-semibold text-emerald-400">Search a doctor</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
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
                  placeholder="Search doctor by name..."
                  value={doctorSearchData.fullName}
                  onChange={(e) => handleDoctorSearchChange('fullName', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-emerald-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors text-sm sm:text-base"
                />
                {loading && doctorSearchData.fullName && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                  </div>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Filter by hospital (optional)"
                  value={doctorSearchData.hospital}
                  onChange={(e) => handleDoctorSearchChange('hospital', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-emerald-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors text-sm sm:text-base"
                />
              </div>
            </div>
            
            {/* Real-time search results dropdown */}
            {doctorSearchData.fullName && results.length > 0 && !showSuccessMessage && (
              <div className="mt-2 border-2 border-emerald-200 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
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
                    className={`p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                      selectedDoctor?.id === doc.id || selectedDoctor?.id === doc.doctor_id
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-sm sm:text-base">
                          {doc.fullName || doc.name || doc.full_name || 'Doctor'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">
                          {doc.specialty || doc.specialization ? (
                            <span className="text-emerald-600 font-medium">{doc.specialty || doc.specialization}</span>
                          ) : null}
                          {doc.specialty || doc.specialization ? ' • ' : ''}
                          {doc.hospital || doc.organization || 'Hospital not specified'}
                        </div>
                      </div>
                      {selectedDoctor?.id === doc.id || selectedDoctor?.id === doc.doctor_id ? (
                        <div className="ml-2 text-emerald-600">
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
              <div className="mt-2 text-sm text-gray-500 text-center py-2">
                No doctors found. Try a different search term.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Appointment date</label>
              <input
                type="date"
                value={doctorSearchData.appointmentDate}
                onChange={(e) => handleDoctorSearchChange('appointmentDate', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base"
                placeholder="date/month/year"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Appointment time</label>
              <input
                type="time"
                value={doctorSearchData.appointmentTime}
                onChange={(e) => handleDoctorSearchChange('appointmentTime', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base"
                placeholder="time"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Appointment type</label>
              <div className="relative">
                <select
                  value={doctorSearchData.appointmentType}
                  onChange={(e) => handleDoctorSearchChange('appointmentType', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none bg-white text-sm sm:text-base"
                >
                  <option value="">Value</option>
                  {appointmentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 sm:top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Additional note (optional)</label>
              <textarea
                value={doctorSearchData.additionalNote}
                onChange={(e) => handleDoctorSearchChange('additionalNote', e.target.value)}
                rows={4}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none text-sm sm:text-base"
                placeholder="Value"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'BOOKING...' : 'SUBMIT'}
              </button>
            </div>
          </form>

          <div className="mt-4">
            {error && (
              <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded">{error}</div>
            )}
            {showSuccessMessage && (
              <div className="p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg text-center">
                <div className="font-semibold text-lg mb-1">Appointment Booked Successfully!</div>
                <div className="text-sm">Your appointment has been confirmed.</div>
              </div>
            )}
            {loading && !showSuccessMessage && (
              <div className="text-sm text-gray-600">Searching doctors...</div>
            )}
            {!loading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((doc, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedDoctor(doc)}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedDoctor?.id === doc.id || selectedDoctor?.id === doc.doctor_id
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-gray-800">{doc.name || doc.fullName || 'Doctor'}</div>
                      <div className="text-xs text-gray-600">{doc.specialty || doc.specialization} • {doc.hospital || doc.organization}</div>
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