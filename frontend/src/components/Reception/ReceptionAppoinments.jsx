import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReceptionistHeader } from './ReceptionHeader';
import { FiSearch, FiFilter, FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiEdit, FiTrash2, FiPlus, FiX, FiAlertTriangle, FiMessageSquare, FiFileText, FiUserCheck, FiArrowRight } from 'react-icons/fi';
import { receptionAPI } from '../../services/apiService';

// New Appointment Modal Component
const NewAppointmentModal = ({ isOpen, onClose, onSubmit, clinicId, darkMode = false }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    isNewPatient: false,
    appointmentDate: '',
    appointmentTime: '',
    doctorId: '',
    appointmentType: '',
    reason: '',
    notes: '',
    priority: 'medium',
    duration: '30',
    insuranceProvider: '',
    insuranceId: ''
  });

  const [searchResults, setSearchResults] = useState([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map frontend appointment types to backend enum values
  const appointmentTypeMap = {
    'General Consultation': 'consultation',
    'Follow-up Visit': 'follow_up',
    'Annual Check-up': 'routine_checkup',
    'Emergency Visit': 'emergency',
    'Specialist Consultation': 'consultation',
    'Therapy Session': 'consultation',
    'Diagnostic Test': 'procedure',
    'Procedure': 'procedure',
    'Vaccination': 'vaccination'
  };

  const appointmentTypes = [
    'General Consultation',
    'Follow-up Visit',
    'Annual Check-up',
    'Emergency Visit',
    'Specialist Consultation',
    'Therapy Session',
    'Diagnostic Test',
    'Procedure',
    'Vaccination'
  ];

  // Load doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDoctors();
    }
  }, [isOpen]);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const resp = await receptionAPI.getDoctors();
      const doctorsList = Array.isArray(resp) ? resp : (resp?.data || []);
      setDoctors(doctorsList);
    } catch (e) {
      console.error('Failed to load doctors', e);
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const searchPatients = async (searchTerm) => {
    setSearchError('')
    if (searchTerm.length < 3) {
      setSearchResults([])
      setShowPatientSearch(false)
      return
    }
    setSearchLoading(true)
    try {
      // Use the patients/list endpoint which has proper permissions
      const resp = await receptionAPI.getPatientsList(searchTerm)
      const items = Array.isArray(resp) ? resp : (resp?.data || resp?.items || [])
      const mapped = items.map(p => ({ 
        id: p.id || p.patient_id, 
        name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Patient', 
        phone: p.phone_number || p.phone || '', 
        email: p.email || '', 
        lastVisit: p.last_visit || p.last_appointment || '' 
      }))
      setSearchResults(mapped)
      setShowPatientSearch(mapped.length > 0)
    } catch (e) {
      console.error('Patient search error:', e)
      setSearchError(t('searchFailedPleaseTryAgain'))
      setShowPatientSearch(false)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  };

  const selectPatient = (patient) => {
    setFormData(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      isNewPatient: false
    }));
    setShowPatientSearch(false);
    setSearchResults([]);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.patientName.trim()) newErrors.patientName = t('patientNameIsRequired');
    if (!formData.patientPhone.trim()) newErrors.patientPhone = t('phoneNumberIsRequired');
    if (!formData.appointmentDate) newErrors.appointmentDate = t('appointmentDateIsRequired');
    if (!formData.appointmentTime) newErrors.appointmentTime = t('appointmentTimeIsRequired');
    if (!formData.doctorId) newErrors.doctorId = t('doctorSelectionIsRequired');
    if (!formData.appointmentType) newErrors.appointmentType = t('appointmentTypeIsRequired');
    if (!formData.reason.trim()) newErrors.reason = t('reasonForVisitIsRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      let patientId = formData.patientId;

      // If new patient, register them first
      if (formData.isNewPatient || !patientId) {
        try {
          // Split patient name into first and last name
          const nameParts = formData.patientName.trim().split(/\s+/);
          const firstName = nameParts[0] || formData.patientName;
          const lastName = nameParts.slice(1).join(' ') || '';

          const registrationData = {
            first_name: firstName,
            last_name: lastName,
            email: formData.patientEmail || `${formData.patientPhone.replace(/\s+/g, '')}@temp.patient`,
            phone: formData.patientPhone,
            date_of_birth: '', // Optional
            gender: '', // Optional
            address: '', // Optional
            emergency_contact_name: '', // Optional
            emergency_contact_phone: '', // Optional
            insurance_provider: formData.insuranceProvider || '',
            insurance_number: formData.insuranceId || ''
          };

          const regResp = await receptionAPI.registerPatient(registrationData);
          patientId = regResp.patient_id || regResp.data?.patient_id;
          if (!patientId) {
            throw new Error('Failed to get patient ID after registration');
          }
        } catch (regError) {
          console.error('Patient registration failed', regError);
          alert(`Failed to register patient: ${regError.message || 'Unknown error'}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Map appointment type to backend format
      const backendAppointmentType = appointmentTypeMap[formData.appointmentType] || 'consultation';

      // Book the appointment
      const appointmentData = {
        patient_id: patientId,
        doctor_id: formData.doctorId,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        appointment_type: backendAppointmentType,
        duration: parseInt(formData.duration, 10),
        notes: formData.notes || formData.reason,
        location: null // Optional
      };

      await receptionAPI.bookAppointment(appointmentData);
      
      // Show success message
      alert(t('appointmentScheduledSuccessfully'));
      
      // Call parent onSubmit for any additional handling
      onSubmit(formData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create appointment', error);
      alert(`${t('failedToScheduleAppointment')}: ${error.message || t('unknownError')}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      isNewPatient: false,
      appointmentDate: '',
      appointmentTime: '',
      doctorId: '',
      appointmentType: '',
      reason: '',
      notes: '',
      priority: 'medium',
      duration: '30',
      insuranceProvider: '',
      insuranceId: ''
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4 ${
      darkMode ? 'bg-[#050C0F]/30' : 'bg-white/10'
    }`}>
      <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors ${
        darkMode ? 'bg-[#0D2026] border-[#133037] border' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b transition-colors ${
          darkMode ? 'border-[#133037]' : 'border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold ${
            darkMode 
              ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent'
          }`}>
            {t('scheduleNewAppointment')}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-[#133037] text-[#C1D9DD]' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Information */}
            <div className="space-y-6">
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
              }`}>
                <FiUser className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                {t('patientInformation')}
              </h3>

              {/* Patient Search/Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isNewPatient}
                      onChange={(e) => handleInputChange('isNewPatient', e.target.checked)}
                      className={`rounded focus:ring-2 ${
                        darkMode
                          ? 'border-[#133037] bg-[#07181D] text-[#79CAC2] focus:ring-[#79CAC2]'
                          : 'border-gray-300 text-[#4DB6B0] focus:ring-[#4DB6B0]'
                      }`}
                    />
                    <span className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('newPatient')}</span>
                  </label>
                </div>

                {!formData.isNewPatient && (
                  <div className="relative">
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('searchExistingPatient')}
                    </label>
                    <div className="relative">
                      <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                      }`} />
                      <input
                        type="text"
                        placeholder={t('searchByNamePhoneOrEmail')}
                        value={formData.patientName}
                        onChange={(e) => {
                          handleInputChange('patientName', e.target.value);
                          searchPatients(e.target.value);
                        }}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                        }`}
                      />
                    </div>
                    {searchLoading && (
                      <div className={`text-xs mt-1 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>{t('searching')}...</div>
                    )}
                    {searchError && (
                      <div className={`text-xs mt-1 ${
                        darkMode ? 'text-red-400' : 'text-red-600'
                      }`}>{searchError}</div>
                    )}
                    
                    {showPatientSearch && searchResults.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-48 overflow-y-auto transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037]'
                          : 'bg-white border-gray-300'
                      }`}>
                        {searchResults.map(patient => (
                          <div
                            key={patient.id}
                            onClick={() => selectPatient(patient)}
                            className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                              darkMode
                                ? 'hover:bg-[#133037] border-[#133037]'
                                : 'hover:bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className={`font-medium ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                            }`}>{patient.name}</div>
                            <div className={`text-sm ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>{patient.phone} • {patient.email}</div>
                            <div className={`text-xs ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                            }`}>{t('lastVisit')}: {patient.lastVisit}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('patientName')} *
                    </label>
                    <input
                      type="text"
                      value={formData.patientName}
                      onChange={(e) => handleInputChange('patientName', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.patientName 
                          ? darkMode ? 'border-red-500' : 'border-red-300'
                          : darkMode ? 'border-[#133037]' : 'border-gray-300'
                      } ${
                        darkMode
                          ? 'bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                      placeholder={t('enterPatientName')}
                    />
                    {errors.patientName && <p className={`text-sm mt-1 ${
                      darkMode ? 'text-red-400' : 'text-red-500'
                    }`}>{errors.patientName}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('phoneNumber')} *
                    </label>
                    <input
                      type="tel"
                      value={formData.patientPhone}
                      onChange={(e) => handleInputChange('patientPhone', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.patientPhone 
                          ? darkMode ? 'border-red-500' : 'border-red-300'
                          : darkMode ? 'border-[#133037]' : 'border-gray-300'
                      } ${
                        darkMode
                          ? 'bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                      placeholder="+998 90 123 45 67"
                    />
                    {errors.patientPhone && <p className={`text-sm mt-1 ${
                      darkMode ? 'text-red-400' : 'text-red-500'
                    }`}>{errors.patientPhone}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('emailAddress')}
                    </label>
                    <input
                      type="email"
                      value={formData.patientEmail}
                      onChange={(e) => handleInputChange('patientEmail', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                      placeholder={t('patientEmailPlaceholder')}
                    />
                  </div>
                </div>

                {/* Insurance Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('insuranceProvider')}
                    </label>
                    <input
                      type="text"
                      value={formData.insuranceProvider}
                      onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                      placeholder={t('insuranceCompanyName')}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('insuranceId')}
                    </label>
                    <input
                      type="text"
                      value={formData.insuranceId}
                      onChange={(e) => handleInputChange('insuranceId', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                      }`}
                      placeholder={t('insuranceIdNumber')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-6">
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
              }`}>
                <FiCalendar className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                {t('appointmentDetails')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('date')} *
                  </label>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      errors.appointmentDate 
                        ? darkMode ? 'border-red-500' : 'border-red-300'
                        : darkMode ? 'border-[#133037]' : 'border-gray-300'
                    } ${
                      darkMode
                        ? 'bg-[#07181D] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'bg-white text-gray-900 focus:ring-[#4DB6B0]'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.appointmentDate && <p className={`text-sm mt-1 ${
                    darkMode ? 'text-red-400' : 'text-red-500'
                  }`}>{errors.appointmentDate}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('time')} *
                  </label>
                  <select
                    value={formData.appointmentTime}
                    onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      errors.appointmentTime 
                        ? darkMode ? 'border-red-500' : 'border-red-300'
                        : darkMode ? 'border-[#133037]' : 'border-gray-300'
                    } ${
                      darkMode
                        ? 'bg-[#07181D] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'bg-white text-gray-900 focus:ring-[#4DB6B0]'
                    }`}
                  >
                    <option value="">{t('selectTime')}</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  {errors.appointmentTime && <p className={`text-sm mt-1 ${
                    darkMode ? 'text-red-400' : 'text-red-500'
                  }`}>{errors.appointmentTime}</p>}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('doctor')} *
                </label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => handleInputChange('doctorId', e.target.value)}
                  disabled={doctorsLoading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    errors.doctorId 
                      ? darkMode ? 'border-red-500' : 'border-red-300'
                      : darkMode ? 'border-[#133037]' : 'border-gray-300'
                  } ${
                    darkMode
                      ? doctorsLoading 
                        ? 'bg-[#07181D] text-[#8AA2A7] cursor-not-allowed'
                        : 'bg-[#07181D] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : doctorsLoading
                        ? 'bg-gray-100 cursor-not-allowed'
                        : 'bg-white text-gray-900 focus:ring-[#4DB6B0]'
                  }`}
                >
                  <option value="">
                    {doctorsLoading ? t('loadingDoctors') : t('selectDoctor')}
                  </option>
                  {doctors.map(doctor => (
                    <option 
                      key={doctor.id} 
                      value={doctor.id}
                      disabled={!doctor.available}
                    >
                      {doctor.name} - {doctor.specialty} {!doctor.available ? `(${t('unavailable')})` : ''}
                    </option>
                  ))}
                </select>
                {errors.doctorId && <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-400' : 'text-red-500'
                }`}>{errors.doctorId}</p>}
                {doctors.length === 0 && !doctorsLoading && (
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`}>{t('noDoctorsAvailablePleaseContactAdministration')}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('appointmentType')} *
                </label>
                <select
                  value={formData.appointmentType}
                  onChange={(e) => handleInputChange('appointmentType', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    errors.appointmentType 
                      ? darkMode ? 'border-red-500' : 'border-red-300'
                      : darkMode ? 'border-[#133037]' : 'border-gray-300'
                  } ${
                    darkMode
                      ? 'bg-[#07181D] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'bg-white text-gray-900 focus:ring-[#4DB6B0]'
                  }`}
                >
                  <option value="">{t('selectAppointmentType')}</option>
                  {appointmentTypes.map(type => (
                    <option key={type} value={type}>{t(`appointmentType_${type.replace(/\s+/g, '')}`) || type}</option>
                  ))}
                </select>
                {errors.appointmentType && <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-400' : 'text-red-500'
                }`}>{errors.appointmentType}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('priority')}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-[#4DB6B0]'
                    }`}
                  >
                    <option value="low">{t('lowPriority')}</option>
                    <option value="medium">{t('mediumPriority')}</option>
                    <option value="high">{t('highPriority')}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    {t('durationMinutes')}
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-[#4DB6B0]'
                    }`}
                  >
                    <option value="15">15 {t('minutes')}</option>
                    <option value="30">30 {t('minutes')}</option>
                    <option value="45">45 {t('minutes')}</option>
                    <option value="60">1 {t('hour')}</option>
                    <option value="90">1.5 {t('hours')}</option>
                    <option value="120">2 {t('hours')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('reasonForVisit')} *
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    errors.reason 
                      ? darkMode ? 'border-red-500' : 'border-red-300'
                      : darkMode ? 'border-[#133037]' : 'border-gray-300'
                  } ${
                    darkMode
                      ? 'bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                      : 'bg-white text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                  }`}
                  placeholder={t('briefDescriptionOfReasonForVisit')}
                />
                {errors.reason && <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-400' : 'text-red-500'
                }`}>{errors.reason}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('additionalNotes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                  }`}
                  placeholder={t('anyAdditionalNotesOrSpecialRequirements')}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex justify-end gap-4 mt-8 pt-6 border-t transition-colors ${
            darkMode ? 'border-[#133037]' : 'border-gray-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 border rounded-lg transition-colors ${
                darkMode
                  ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                    darkMode ? 'border-[#050C0F]' : 'border-white'
                  }`}></div>
                  {t('scheduling')}...
                </>
              ) : (
                <>
                  <FiPlus className="text-sm" />
                  {t('scheduleAppointment')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Appointment Confirmation Modal Component
const AppointmentConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  appointment, 
  action, // 'delete' or 'decline'
  darkMode = false
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Predefined reasons based on action type
  const deleteReasons = [
    'Patient requested cancellation',
    'Doctor unavailable',
    'Emergency rescheduling needed',
    'Patient no-show',
    'Administrative error',
    'Facility closure',
    'Insurance issues',
    'Other (specify below)'
  ];

  const declineReasons = [
    'Doctor unavailable at requested time',
    'Appointment type not available',
    'Patient insurance not accepted',
    'Facility fully booked',
    'Insufficient information provided',
    'Duplicate appointment request',
    'Outside operating hours',
    'Other (specify below)'
  ];

  const reasons = action === 'delete' ? deleteReasons : declineReasons;

  const handleSubmit = async () => {
    if (!selectedReason && !reason.trim()) {
      alert(t('pleaseSelectOrProvideReason'));
      return;
    }

    setIsSubmitting(true);
    
    const finalReason = selectedReason === 'Other (specify below)' || !selectedReason 
      ? reason 
      : selectedReason;

    try {
      await onConfirm({
        appointmentId: appointment.id,
        reason: finalReason,
        notifyPatient,
        action
      });
      handleClose();
    } catch (error) {
      console.error('Error processing request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setSelectedReason('');
    setNotifyPatient(true);
    onClose();
  };

  if (!isOpen || !appointment) return null;

  const isDelete = action === 'delete';
  const title = isDelete ? t('cancelAppointment') : t('declineAppointmentRequest');
  const confirmText = isDelete ? t('cancelAppointment') : t('declineRequest');
  const warningText = isDelete 
    ? t('thisWillPermanentlyCancelAppointment')
    : t('thisWillDeclineAppointmentRequest');

  return (
    <div className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4 ${
      darkMode ? 'bg-[#050C0F]/30' : 'bg-white/10'
    }`}>
      <div className={`rounded-xl shadow-2xl max-w-md w-full transition-colors ${
        darkMode ? 'bg-[#0D2026] border-[#133037] border' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b transition-colors ${
          darkMode ? 'border-[#133037]' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDelete 
                ? darkMode ? 'bg-[#2A0E15]' : 'bg-red-100'
                : darkMode ? 'bg-[#251F07]' : 'bg-yellow-100'
            }`}>
              {isDelete ? (
                <FiTrash2 className={`text-lg ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`} />
              ) : (
                <FiAlertTriangle className={`text-lg ${
                  darkMode ? 'text-[#FACC15]' : 'text-yellow-600'
                }`} />
              )}
            </div>
            <h2 className={`text-xl font-semibold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
            }`}>{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-[#133037] text-[#C1D9DD]' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appointment Details */}
          <div className={`p-4 rounded-lg transition-colors ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <h3 className={`font-medium mb-2 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
            }`}>{t('appointmentDetails')}</h3>
            <div className={`text-sm space-y-1 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>
              <div><strong>{t('patient')}:</strong> {appointment.patient}</div>
              <div><strong>{t('date')}:</strong> {appointment.date}</div>
              <div><strong>{t('time')}:</strong> {appointment.time}</div>
              <div><strong>{t('doctor')}:</strong> {appointment.doctor}</div>
              <div><strong>{t('reason')}:</strong> {appointment.reason}</div>
            </div>
          </div>

          {/* Warning Message */}
          <div className={`p-4 rounded-lg border-l-4 transition-colors ${
            isDelete 
              ? darkMode
                ? 'bg-[#2A0E15] border-[#FB7185]'
                : 'bg-red-50 border-red-400'
              : darkMode
                ? 'bg-[#251F07] border-[#FACC15]'
                : 'bg-yellow-50 border-yellow-400'
          }`}>
            <div className="flex items-start gap-3">
              <FiAlertTriangle className={`mt-0.5 ${
                isDelete 
                  ? darkMode ? 'text-[#FB7185]' : 'text-red-500'
                  : darkMode ? 'text-[#FACC15]' : 'text-yellow-500'
              }`} />
              <div className={`text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>
                {warningText}
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-4">
            <label className={`block text-sm font-medium ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>
              {t('reasonFor')} {isDelete ? t('cancellation') : t('declining')} *
            </label>
            
            <div className="space-y-2">
              {reasons.map((reasonOption) => (
                <label key={reasonOption} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={reasonOption}
                    checked={selectedReason === reasonOption}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className={`focus:ring-2 ${
                      darkMode
                        ? 'text-[#79CAC2] focus:ring-[#79CAC2]'
                        : 'text-[#4DB6B0] focus:ring-[#4DB6B0]'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{reasonOption}</span>
                </label>
              ))}
            </div>

            {/* Custom reason textarea */}
            {(selectedReason === 'Other (specify below)' || !selectedReason) && (
              <div className="mt-4">
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {selectedReason === 'Other (specify below)' ? t('pleaseSpecify') : t('orProvideCustomReason')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t(isDelete ? 'explainWhyCanceling' : 'explainWhyDeclining')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Notification Option */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPatient}
                onChange={(e) => setNotifyPatient(e.target.checked)}
                className={`rounded focus:ring-2 ${
                  darkMode
                    ? 'border-[#133037] bg-[#07181D] text-[#79CAC2] focus:ring-[#79CAC2]'
                    : 'border-gray-300 text-[#4DB6B0] focus:ring-[#4DB6B0]'
                }`}
              />
              <div className="flex items-center gap-2">
                <FiMessageSquare className={`text-sm ${
                  darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
                }`} />
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('notifyPatientViaSmsEmail')}
                </span>
              </div>
            </label>
            
            {notifyPatient && (
              <div className={`ml-6 text-xs ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                {t('patientWillReceiveAutomaticNotification')} {isDelete ? t('cancellation') : t('declining')}.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex justify-end gap-3 p-6 border-t transition-colors ${
          darkMode ? 'border-[#133037]' : 'border-gray-200'
        }`}>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className={`px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 ${
              darkMode
                ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedReason && !reason.trim())}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
              isDelete 
                ? darkMode
                  ? 'bg-[#FB7185] hover:bg-[#F8719D]'
                  : 'bg-red-600 hover:bg-red-700'
                : darkMode
                  ? 'bg-[#FACC15] hover:bg-[#FCD34D] text-[#050C0F]'
                  : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('processing')}...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceptionAppointments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState({ upcoming: [], pending: [], past: [] });
  
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    appointment: null,
    action: null
  });

  const clinicId = localStorage.getItem('clinic_id') || 'default-clinic'

  const mapAppointment = (apt) => ({
    id: apt.id,
    time: apt.time,
    date: apt.formatted_date || apt.date,
    patient: apt.patient_name,
    reason: apt.reason || apt.description || '',
    description: apt.description || '',
    doctor: apt.doctor_name,
    phone: '',
    email: '',
    status: apt.status,
    priority: apt.priority || 'medium'
  })

  const loadAppointments = async () => {
    try {
      // Load upcoming appointments from dedicated endpoint
      const upcomingResp = await receptionAPI.getUpcoming(50, 168) // 50 appointments, 7 days ahead
      const upcomingItems = Array.isArray(upcomingResp) ? upcomingResp : (upcomingResp?.data || upcomingResp?.items || [])
      const upcomingMapped = upcomingItems.map(apt => ({
        id: apt.id || apt.appointment_id,
        time: apt.time,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), // Will be updated when backend provides date
        patient: apt.patient || 'Unknown Patient',
        reason: apt.type || '',
        description: apt.type || '',
        doctor: apt.doctor || 'Unknown Doctor',
        phone: '',
        email: '',
        status: apt.status || 'confirmed',
        priority: 'medium'
      }))
      
      // Load pending appointments from dedicated endpoint
      const pendingResp = await receptionAPI.getPending(50)
      const pendingItems = Array.isArray(pendingResp) ? pendingResp : (pendingResp?.data || pendingResp?.items || [])
      const pendingMapped = pendingItems.map(apt => ({
        id: apt.id || apt.appointment_id,
        time: apt.time,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        patient: apt.patient || 'Unknown Patient',
        reason: apt.type || '',
        description: apt.type || '',
        doctor: apt.doctor || 'Unassigned',
        phone: '',
        email: '',
        status: apt.status || 'pending',
        priority: 'medium'
      }))
      
      // Load past appointments with reports from dedicated endpoint
      console.log('[APPOINTMENTS] Loading past appointments...')
      const pastResp = await receptionAPI.getPast(50)
      console.log('[APPOINTMENTS] Past appointments response:', pastResp)
      const pastItems = Array.isArray(pastResp) ? pastResp : (pastResp?.data || pastResp?.items || [])
      console.log('[APPOINTMENTS] Past items extracted:', pastItems, 'Count:', pastItems.length)
      const pastMapped = pastItems.map(apt => ({
        id: apt.appointment_id || apt.id,
        time: apt.time || '',
        date: apt.date || '',  // Date when report was made (for reports without appointments)
        patient: apt.patient || 'Unknown Patient',
        doctor: apt.doctor || 'Unknown Doctor',
        type: apt.type || 'General Consultation',
        status: apt.status || 'completed',
        reason: apt.type || '',
        description: apt.type || '',
        phone: '',
        email: '',
        priority: 'medium',
        patientId: apt.patient_id || '',
        appointmentId: apt.appointment_id || apt.id
      }))
      console.log('[APPOINTMENTS] Past mapped:', pastMapped, 'Count:', pastMapped.length)
      
      // Filter out duplicates with upcoming and pending
      const loadedIds = new Set([...upcomingMapped.map(a => a.id), ...pendingMapped.map(a => a.id)])
      const past = pastMapped.filter(a => !loadedIds.has(a.id))
      console.log('[APPOINTMENTS] Past after filtering duplicates:', past, 'Count:', past.length)
      
      setAppointments({ upcoming: upcomingMapped, pending: pendingMapped, past })
    } catch (e) {
      console.error('Failed to load appointments', e)
      setAppointments({ upcoming: [], pending: [], past: [] })
    }
  }

  useEffect(() => { loadAppointments() }, [])

  const openConfirmationModal = (appointment, action) => {
    setConfirmationModal({
      isOpen: true,
      appointment,
      action
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({
      isOpen: false,
      appointment: null,
      action: null
    });
  };

  const handleConfirmAction = async (data) => {
    const { appointmentId, reason, action } = data
    try {
      await receptionAPI.cancelAppointment({ clinicId, appointmentId, reason })
      await loadAppointments()
      alert(t(action === 'delete' ? 'appointmentCancelledSuccessfully' : 'appointmentDeclinedSuccessfully'))
    } catch (e) {
      console.error('Cancel/decline failed', e)
      alert(t('failedToCancelAppointment'))
    }
  };

  const handleNewAppointment = async (appointmentData) => {
    // The appointment is already created in the modal's handleSubmit
    // This function is called after successful creation for any additional handling
    try {
      await loadAppointments();
      // Success message is already shown in the modal
    } catch (e) {
      console.error('Failed to refresh appointments', e);
    }
  };

  const acceptAppointment = async (id) => {
    try {
      await receptionAPI.confirmAppointment({ clinicId, appointmentId: id })
      await loadAppointments()
    } catch (e) {
      console.error('Confirm appointment failed', e)
      alert('Failed to confirm appointment')
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': 
        return darkMode 
          ? 'bg-[#2A0E15] text-[#FB7185] border-[#FB7185]'
          : 'bg-red-100 text-red-700 border-red-200';
      case 'medium': 
        return darkMode
          ? 'bg-[#251F07] text-[#FACC15] border-[#FACC15]'
          : 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': 
        return darkMode
          ? 'bg-[#062412] text-[#4ADE80] border-[#4ADE80]'
          : 'bg-green-100 text-green-700 border-green-200';
      default: 
        return darkMode
          ? 'bg-[#07181D] text-[#C1D9DD] border-[#133037]'
          : 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <FiClock className="text-green-500" />;
      case 'pending': return <FiClock className="text-yellow-500" />;
      case 'completed': return <FiClock className="text-gray-500" />;
      default: return <FiClock className="text-gray-400" />;
    }
  };

  const renderCard = (appt, actions = null, isPastAppointment = false) => {
    const handleCardClick = (e) => {
      // Only make clickable if it's a past appointment and not clicking on a button
      if (isPastAppointment && !e.target.closest('button')) {
        navigate(`/reception/appointments/${appt.appointmentId || appt.id}`);
      }
    };

    return (
      <div 
        key={appt.id} 
        className={`p-4 sm:p-6 rounded-lg shadow border mb-4 hover:shadow-md transition-all ${
          isPastAppointment ? 'cursor-pointer' : ''
        } ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-100'
        }`}
        onClick={isPastAppointment ? handleCardClick : undefined}
      >
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 flex-1">
            <div className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-center min-w-[70px] sm:min-w-[80px] ${
              darkMode
                ? 'bg-[#79CAC2] text-[#050C0F]'
                : 'bg-[#4DB6B0] text-white'
            }`}>
              <div className="text-base sm:text-lg font-bold">{appt.time}</div>
              <div className={`text-xs ${darkMode ? 'opacity-80' : 'opacity-90'}`}>{appt.date}</div>
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h3 className={`font-semibold text-base sm:text-lg ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                }`}>{appt.patient}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(appt.priority)}`}>
                  {t(appt.priority)} {t('priority')}
                </span>
                {getStatusIcon(appt.status)}
              </div>
              
              <div className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
              }`}>{appt.reason}</div>
              <div className={`text-sm mb-3 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{appt.description}</div>
              
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                <div className="flex items-center gap-2">
                  <FiUser className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                  <span className="text-xs sm:text-sm">{t('provider')}: {appt.doctor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiPhone className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                  <span className="text-xs sm:text-sm">{appt.phone}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
                  <FiMail className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                  <span className="text-xs sm:text-sm">{appt.email}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            {actions ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openConfirmationModal(appt, 'decline');
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm ${
                    darkMode
                      ? 'bg-[#2A0E15] hover:bg-[#3A1E25] text-[#FB7185] border border-[#FB7185]'
                      : 'bg-red-100 hover:bg-red-200 text-red-600'
                  }`}
                >
                  <FiTrash2 className="text-xs" />
                  {t('decline')}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    acceptAppointment(appt.id);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  {t('accept')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/reception/appointments/${appt.appointmentId || appt.id}`);
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                    darkMode
                      ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                      : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
                  }`}
                >
                  {t('viewDetails')}
                </button>
                {appt.status !== 'completed' && (
                  <>
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                        darkMode
                          ? 'bg-[#07181D] hover:bg-[#133037] text-[#79CAC2] border border-[#133037]'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                      }`}
                    >
                      <FiEdit className="text-sm" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfirmationModal(appt, 'delete');
                      }}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                        darkMode
                          ? 'bg-[#2A0E15] hover:bg-[#3A1E25] text-[#FB7185] border border-[#FB7185]'
                          : 'bg-red-100 hover:bg-red-200 text-red-600'
                      }`}
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <ReceptionistHeader />
      
      <div className="flex flex-row max-w-screen-2xl mx-auto px-2 sm:px-4 py-6 sm:py-10 gap-4 sm:gap-6">
        {/* Left Sidebar - Appointment Management */}
        <div className={`w-80 flex-shrink-0 rounded-xl shadow-sm border h-fit sticky top-6 transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
        }`}>
          <div className={`p-4 border-b transition-colors ${
            darkMode ? 'border-[#133037]' : 'border-gray-100'
          }`}>
            <h1 className={`text-lg sm:text-xl font-bold mb-2 ${
              darkMode
                ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent'
            }`}>
              {t('appointmentManagement')}
            </h1>
            <p className={`text-xs sm:text-sm ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>{t('manageAllPatientAppointmentsAndSchedules')}</p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowNewAppointmentModal(true)}
                className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm w-full ${
                  darkMode
                    ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                    : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
                }`}
              >
                <FiPlus className="text-sm" />
                {t('newAppointment')}
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder={t('searchPatientsDoctors')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                }`}
              />
            </div>
            
            {/* Date Filter */}
            <div className="relative">
              <FiCalendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
              }`} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-200 text-gray-900 focus:ring-[#4DB6B0]'
                }`}
              />
            </div>
            
            {/* Filter Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                darkMode
                  ? 'bg-[#07181D] hover:bg-[#133037] text-[#C1D9DD] border border-[#133037]'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <FiFilter className="text-sm" />
              {showFilters ? t('hideFilters') : t('showFilters')}
            </button>
            
            {/* Filter Options */}
            {showFilters && (
              <div className={`p-4 rounded-lg border space-y-4 transition-colors ${
                darkMode ? 'bg-[#07181D] border-[#133037]' : 'bg-gray-50 border-gray-200'
              }`}>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('status')}</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`w-full p-2 text-sm border rounded-lg focus:ring-2 transition-colors ${
                      darkMode
                        ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-[#4DB6B0]'
                    }`}
                  >
                    <option value="all">{t('allStatus')}</option>
                    <option value="confirmed">{t('confirmed')}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="completed">{t('completed')}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('priority')}</label>
                  <select className={`w-full p-2 text-sm border rounded-lg focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-[#4DB6B0]'
                  }`}>
                    <option value="all">{t('allPriorities')}</option>
                    <option value="high">{t('high')}</option>
                    <option value="medium">{t('medium')}</option>
                    <option value="low">{t('low')}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('doctor')}</label>
                  <select className={`w-full p-2 text-sm border rounded-lg focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-[#4DB6B0]'
                  }`}>
                    <option value="all">{t('allDoctors')}</option>
                    <option value="dr-smith">Dr. Smith</option>
                    <option value="dr-wilson">Dr. Wilson</option>
                    <option value="dr-johnson">Dr. Johnson</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('timeRange')}</label>
                  <select className={`w-full p-2 text-sm border rounded-lg focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-[#4DB6B0]'
                  }`}>
                    <option value="all">{t('allTimes')}</option>
                    <option value="morning">{t('morning')} (8AM-12PM)</option>
                    <option value="afternoon">{t('afternoon')} (12PM-5PM)</option>
                    <option value="evening">{t('evening')} (5PM-8PM)</option>
                  </select>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Main Content Area - Appointment Boxes */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6 sm:space-y-8">
          {/* Upcoming Appointments */}
          <div className={`rounded-xl p-4 sm:p-6 shadow border transition-colors ${
            darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
              <h2 className={`text-lg sm:text-xl font-semibold ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
              }`}>{t('upcomingAppointments')}</h2>
              <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium ${
                darkMode
                  ? 'bg-[#07181D] text-[#79CAC2] border border-[#133037]'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {appointments.upcoming.length} {t('appointments')}
              </span>
            </div>
            {appointments.upcoming.length > 0 ? (
              appointments.upcoming.map(appt => renderCard(appt))
            ) : (
              <div className={`text-center py-6 sm:py-8 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                <FiCalendar className={`text-3xl sm:text-4xl mx-auto mb-3 ${
                  darkMode ? 'text-[#133037]' : 'text-gray-300'
                }`} />
                <p className="text-sm sm:text-base">{t('noUpcomingAppointments')}</p>
              </div>
            )}
          </div>

          {/* Pending Appointments */}
          <div className={`rounded-xl p-4 sm:p-6 shadow border transition-colors ${
            darkMode 
              ? 'bg-[#251F07] border-[#FACC15]'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
              <h2 className={`text-lg sm:text-xl font-semibold ${
                darkMode ? 'text-[#FACC15]' : 'text-green-600'
              }`}>{t('acceptAppointments')}</h2>
              <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium ${
                darkMode
                  ? 'bg-[#251F07] text-[#FACC15] border border-[#FACC15]'
                  : 'bg-green-100 text-green-800'
              }`}>
                {appointments.pending.length} {t('pending')}
              </span>
            </div>
            {appointments.pending.length > 0 ? (
              appointments.pending.map(appt => renderCard(appt, true))
            ) : (
              <div className={`text-center py-6 sm:py-8 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                <FiClock className={`text-3xl sm:text-4xl mx-auto mb-3 ${
                  darkMode ? 'text-[#133037]' : 'text-gray-300'
                }`} />
                <p className="text-sm sm:text-base">{t('noPendingAppointments')}</p>
              </div>
            )}
          </div>

          {/* Past Appointments */}
          <div className={`rounded-xl p-4 sm:p-6 shadow border transition-colors ${
            darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
              <h2 className={`text-lg sm:text-xl font-semibold ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('pastAppointments')}</h2>
              <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium ${
                darkMode
                  ? 'bg-[#07181D] text-[#C1D9DD] border border-[#133037]'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {appointments.past.length} {t('completed')}
              </span>
            </div>
            {appointments.past.length > 0 ? (
              <>
                {appointments.past.slice(0, 5).map(appt => renderCard(appt, null, true))}
                {appointments.past.length > 5 && (
                  <div className={`mt-4 pt-4 border-t transition-colors ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    <button
                      onClick={() => navigate('/reception/appointments/past')}
                      className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium ${
                        darkMode
                          ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                          : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
                      }`}
                    >
                      {t('seeAllPastAppointments')}
                      <FiArrowRight className="text-sm" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={`text-center py-6 sm:py-8 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                <FiClock className={`text-3xl sm:text-4xl mx-auto mb-3 ${
                  darkMode ? 'text-[#133037]' : 'text-gray-300'
                }`} />
                <p className="text-sm sm:text-base">{t('noPastAppointments')}</p>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Modals */}
        <NewAppointmentModal
          isOpen={showNewAppointmentModal}
          onClose={() => setShowNewAppointmentModal(false)}
          onSubmit={handleNewAppointment}
          clinicId={clinicId}
          darkMode={darkMode}
        />

        <AppointmentConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={closeConfirmationModal}
          onConfirm={handleConfirmAction}
          appointment={confirmationModal.appointment}
          action={confirmationModal.action}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
};

export default ReceptionAppointments;
            

