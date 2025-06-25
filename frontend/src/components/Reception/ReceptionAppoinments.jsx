import React, { useState } from 'react';
import { ReceptionistHeader } from './ReceptionHeader';
import { FiSearch, FiFilter, FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiEdit, FiTrash2, FiPlus, FiDownload, FiRefreshCw, FiX, FiAlertTriangle, FiMessageSquare, FiFileText, FiUserCheck } from 'react-icons/fi';

// New Appointment Modal Component
const NewAppointmentModal = ({ isOpen, onClose, onSubmit }) => {
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

  // Mock patient data for search
  const mockPatients = [
    { id: 1, name: 'Muhammad Hariton', phone: '+998 90 123 45 67', email: 'muhammad@email.com', lastVisit: '2025-05-15' },
    { id: 2, name: 'Sarah Johnson', phone: '+998 90 987 65 43', email: 'sarah@email.com', lastVisit: '2025-06-10' },
    { id: 3, name: 'Michael Brown', phone: '+998 90 555 12 34', email: 'michael@email.com', lastVisit: '2025-04-20' },
  ];

  // Mock doctors data
  const doctors = [
    { id: 1, name: 'Dr. Smith', specialty: 'General Medicine', available: true },
    { id: 2, name: 'Dr. Wilson', specialty: 'Cardiology', available: true },
    { id: 3, name: 'Dr. Johnson', specialty: 'Psychiatry', available: false },
    { id: 4, name: 'Dr. Davis', specialty: 'Dermatology', available: true },
  ];

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

  const searchPatients = (searchTerm) => {
    if (searchTerm.length > 2) {
      const results = mockPatients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone.includes(searchTerm) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results);
      setShowPatientSearch(true);
    } else {
      setSearchResults([]);
      setShowPatientSearch(false);
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
    
    if (!formData.patientName.trim()) newErrors.patientName = 'Patient name is required';
    if (!formData.patientPhone.trim()) newErrors.patientPhone = 'Phone number is required';
    if (!formData.appointmentDate) newErrors.appointmentDate = 'Appointment date is required';
    if (!formData.appointmentTime) newErrors.appointmentTime = 'Appointment time is required';
    if (!formData.doctorId) newErrors.doctorId = 'Doctor selection is required';
    if (!formData.appointmentType) newErrors.appointmentType = 'Appointment type is required';
    if (!formData.reason.trim()) newErrors.reason = 'Reason for visit is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      resetForm();
      onClose();
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
            Schedule New Appointment
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="text-xl text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiUser className="text-[#4DB6B0]" />
                Patient Information
              </h3>

              {/* Patient Search/Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isNewPatient}
                      onChange={(e) => handleInputChange('isNewPatient', e.target.checked)}
                      className="rounded border-gray-300 text-[#4DB6B0] focus:ring-[#4DB6B0]"
                    />
                    <span className="text-sm text-gray-700">New Patient</span>
                  </label>
                </div>

                {!formData.isNewPatient && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Existing Patient
                    </label>
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        value={formData.patientName}
                        onChange={(e) => {
                          handleInputChange('patientName', e.target.value);
                          searchPatients(e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    
                    {showPatientSearch && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map(patient => (
                          <div
                            key={patient.id}
                            onClick={() => selectPatient(patient)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-800">{patient.name}</div>
                            <div className="text-sm text-gray-600">{patient.phone} • {patient.email}</div>
                            <div className="text-xs text-gray-500">Last visit: {patient.lastVisit}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      value={formData.patientName}
                      onChange={(e) => handleInputChange('patientName', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                        errors.patientName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter patient name"
                    />
                    {errors.patientName && <p className="text-red-500 text-sm mt-1">{errors.patientName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.patientPhone}
                      onChange={(e) => handleInputChange('patientPhone', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                        errors.patientPhone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="+998 90 123 45 67"
                    />
                    {errors.patientPhone && <p className="text-red-500 text-sm mt-1">{errors.patientPhone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.patientEmail}
                      onChange={(e) => handleInputChange('patientEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      placeholder="patient@email.com"
                    />
                  </div>
                </div>

                {/* Insurance Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Provider
                    </label>
                    <input
                      type="text"
                      value={formData.insuranceProvider}
                      onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      placeholder="Insurance company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance ID
                    </label>
                    <input
                      type="text"
                      value={formData.insuranceId}
                      onChange={(e) => handleInputChange('insuranceId', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      placeholder="Insurance ID number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiCalendar className="text-[#4DB6B0]" />
                Appointment Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                      errors.appointmentDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.appointmentDate && <p className="text-red-500 text-sm mt-1">{errors.appointmentDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <select
                    value={formData.appointmentTime}
                    onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                      errors.appointmentTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  {errors.appointmentTime && <p className="text-red-500 text-sm mt-1">{errors.appointmentTime}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor *
                </label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => handleInputChange('doctorId', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                    errors.doctorId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select doctor</option>
                  {doctors.map(doctor => (
                    <option 
                      key={doctor.id} 
                      value={doctor.id}
                      disabled={!doctor.available}
                    >
                      {doctor.name} - {doctor.specialty} {!doctor.available ? '(Unavailable)' : ''}
                    </option>
                  ))}
                </select>
                {errors.doctorId && <p className="text-red-500 text-sm mt-1">{errors.doctorId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Type *
                </label>
                <select
                  value={formData.appointmentType}
                  onChange={(e) => handleInputChange('appointmentType', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                    errors.appointmentType ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select appointment type</option>
                  {appointmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.appointmentType && <p className="text-red-500 text-sm mt-1">{errors.appointmentType}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Visit *
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                    errors.reason ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Brief description of the reason for visit"
                />
                {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                  placeholder="Any additional notes or special requirements..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-3 bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FiPlus className="text-sm" />
              Schedule Appointment
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
  action // 'delete' or 'decline'
}) => {
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
      alert('Please select or provide a reason');
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
  const title = isDelete ? 'Cancel Appointment' : 'Decline Appointment Request';
  const confirmText = isDelete ? 'Cancel Appointment' : 'Decline Request';
  const warningText = isDelete 
    ? 'This will permanently cancel the appointment. The patient will be notified of the cancellation.'
    : 'This will decline the appointment request. The patient will be notified that their request was not approved.';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDelete ? 'bg-red-100' : 'bg-yellow-100'}`}>
              {isDelete ? (
                <FiTrash2 className={`text-lg ${isDelete ? 'text-red-600' : 'text-yellow-600'}`} />
              ) : (
                <FiAlertTriangle className="text-lg text-yellow-600" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="text-xl text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appointment Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Appointment Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Patient:</strong> {appointment.patient}</div>
              <div><strong>Date:</strong> {appointment.date}</div>
              <div><strong>Time:</strong> {appointment.time}</div>
              <div><strong>Doctor:</strong> {appointment.doctor}</div>
              <div><strong>Reason:</strong> {appointment.reason}</div>
            </div>
          </div>

          {/* Warning Message */}
          <div className={`p-4 rounded-lg border-l-4 ${
            isDelete 
              ? 'bg-red-50 border-red-400' 
              : 'bg-yellow-50 border-yellow-400'
          }`}>
            <div className="flex items-start gap-3">
              <FiAlertTriangle className={`mt-0.5 ${
                isDelete ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <div className="text-sm text-gray-700">
                {warningText}
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Reason for {isDelete ? 'cancellation' : 'declining'} *
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
                    className="text-[#4DB6B0] focus:ring-[#4DB6B0]"
                  />
                  <span className="text-sm text-gray-700">{reasonOption}</span>
                </label>
              ))}
            </div>

            {/* Custom reason textarea */}
            {(selectedReason === 'Other (specify below)' || !selectedReason) && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedReason === 'Other (specify below)' ? 'Please specify:' : 'Or provide custom reason:'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={`Explain why you're ${isDelete ? 'canceling' : 'declining'} this appointment...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent resize-none"
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
                className="rounded border-gray-300 text-[#4DB6B0] focus:ring-[#4DB6B0]"
              />
              <div className="flex items-center gap-2">
                <FiMessageSquare className="text-[#4DB6B0] text-sm" />
                <span className="text-sm text-gray-700">
                  Notify patient via SMS/Email
                </span>
              </div>
            </label>
            
            {notifyPatient && (
              <div className="ml-6 text-xs text-gray-500">
                Patient will receive an automatic notification with the reason for {isDelete ? 'cancellation' : 'declining'}.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedReason && !reason.trim())}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
              isDelete 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
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
  const [appointments, setAppointments] = useState({
    upcoming: [
      {
        id: 1,
        time: '10:00',
        date: '22.06.2025',
        patient: 'Muhammad Hariton',
        reason: 'Anxiety problems',
        description: 'Description of problems and notes are written here',
        doctor: 'Dr. Smith',
        phone: '+998 90 123 45 67',
        email: 'muhammad@email.com',
        status: 'confirmed',
        priority: 'medium'
      },
      {
        id: 2,
        time: '10:30',
        date: '22.06.2025',
        patient: 'Sarah Johnson',
        reason: 'Regular checkup',
        description: 'Annual physical examination and blood work review',
        doctor: 'Dr. Smith',
        phone: '+998 90 987 65 43',
        email: 'sarah@email.com',
        status: 'confirmed',
        priority: 'low'
      },
    ],
    pending: [
      {
        id: 5,
        time: '14:00',
        date: '02.07.2025',
        patient: 'Michael Brown',
        reason: 'Follow-up consultation',
        description: 'Post-surgery follow-up and wound examination',
        doctor: 'Dr. Wilson',
        phone: '+998 90 555 12 34',
        email: 'michael@email.com',
        status: 'pending',
        priority: 'high'
      },
    ],
    past: [
      {
        id: 10,
        time: '10:00',
        date: '21.06.2025',
        patient: 'Emma Davis',
        reason: 'Therapy session',
        description: 'Cognitive behavioral therapy session',
        doctor: 'Dr. Johnson',
        phone: '+998 90 777 88 99',
        email: 'emma@email.com',
        status: 'completed',
        priority: 'medium'
      },
    ],
  });

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
    const { appointmentId, reason, notifyPatient, action } = data;
    
    if (action === 'delete') {
      // Remove from upcoming appointments
      setAppointments(prev => ({
        ...prev,
        upcoming: prev.upcoming.filter(apt => apt.id !== appointmentId)
      }));
      
      console.log(`Appointment ${appointmentId} cancelled. Reason: ${reason}. Notify patient: ${notifyPatient}`);
      
    } else if (action === 'decline') {
      // Remove from pending appointments
      setAppointments(prev => ({
        ...prev,
        pending: prev.pending.filter(apt => apt.id !== appointmentId)
      }));
      
      console.log(`Appointment request ${appointmentId} declined. Reason: ${reason}. Notify patient: ${notifyPatient}`);
    }
    
    // Show success message
    alert(`Appointment ${action === 'delete' ? 'cancelled' : 'declined'} successfully!`);
  };

  const handleNewAppointment = (appointmentData) => {
    // Map doctor ID to doctor name
    const doctorMap = {
      1: 'Dr. Smith',
      2: 'Dr. Wilson', 
      3: 'Dr. Johnson',
      4: 'Dr. Davis'
    };

    // Create new appointment object
    const newAppointment = {
      id: Date.now(),
      time: appointmentData.appointmentTime,
      date: appointmentData.appointmentDate,
      patient: appointmentData.patientName,
      reason: appointmentData.reason,
      description: appointmentData.notes || appointmentData.reason,
      doctor: doctorMap[appointmentData.doctorId] || 'Unknown Doctor',
      phone: appointmentData.patientPhone,
      email: appointmentData.patientEmail,
      status: 'confirmed',
      priority: appointmentData.priority
    };

    // Add to appointments list
    setAppointments(prev => ({
      ...prev,
      upcoming: [...prev.upcoming, newAppointment]
    }));
    
    // Show success message
    alert('Appointment scheduled successfully!');
  };

  const acceptAppointment = (id) => {
    setAppointments(prev => {
      const accepted = prev.pending.find(a => a.id === id);
      if (accepted) {
        accepted.status = 'confirmed';
        return {
          ...prev,
          pending: prev.pending.filter(a => a.id !== id),
          upcoming: [...prev.upcoming, accepted],
        };
      }
      return prev;
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const renderCard = (appt, actions = null) => (
    <div key={appt.id} className="bg-white p-6 rounded-lg shadow border border-gray-100 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4 flex-1">
          <div className="bg-[#4DB6B0] text-white px-4 py-3 rounded-lg text-center min-w-[80px]">
            <div className="text-lg font-bold">{appt.time}</div>
            <div className="text-xs opacity-90">{appt.date}</div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-800 text-lg">{appt.patient}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(appt.priority)}`}>
                {appt.priority} priority
              </span>
              {getStatusIcon(appt.status)}
            </div>
            
            <div className="text-sm text-[#4DB6B0] font-medium mb-2">{appt.reason}</div>
            <div className="text-sm text-gray-600 mb-3">{appt.description}</div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <FiUser className="text-[#4DB6B0]" />
                <span>Provider: {appt.doctor}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiPhone className="text-[#4DB6B0]" />
                <span>{appt.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiMail className="text-[#4DB6B0]" />
                <span>{appt.email}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {actions ? (
            <div className="flex gap-2">
              <button 
                onClick={() => openConfirmationModal(appt, 'decline')}
                className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
              >
                <FiTrash2 className="text-xs" />
                Decline
              </button>
              <button 
                onClick={() => acceptAppointment(appt.id)} 
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Accept
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg transition-colors">
                View Details
              </button>
              {appt.status !== 'completed' && (
                <>
                  <button className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-2 rounded-lg transition-colors">
                    <FiEdit className="text-sm" />
                  </button>
                  <button 
                    onClick={() => openConfirmationModal(appt, 'delete')}
                    className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg transition-colors"
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

  const totalAppointments = appointments.upcoming.length + appointments.pending.length + appointments.past.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section with Search and Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
                Appointment Management
              </h1>
              <p className="text-gray-600 mt-1">Manage all patient appointments and schedules</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowNewAppointmentModal(true)}
                className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FiPlus className="text-sm" />
                New Appointment
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <FiDownload className="text-sm" />
                Export
              </button>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients, doctors, or reasons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                />
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FiFilter className="text-sm" />
                Filters
              </button>
              
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors">
                <FiRefreshCw className="text-sm" />
              </button>
            </div>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="all">All Status</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0]">
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0]">
                    <option value="all">All Doctors</option>
                    <option value="dr-smith">Dr. Smith</option>
                    <option value="dr-wilson">Dr. Wilson</option>
                    <option value="dr-johnson">Dr. Johnson</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0]">
                    <option value="all">All Times</option>
                    <option value="morning">Morning (8AM-12PM)</option>
                    <option value="afternoon">Afternoon (12PM-5PM)</option>
                    <option value="evening">Evening (5PM-8PM)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-800">{totalAppointments}</p>
              </div>
              <FiCalendar className="text-2xl text-[#4DB6B0]" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Today</p>
                <p className="text-2xl font-bold text-blue-600">{appointments.upcoming.length}</p>
              </div>
              <FiClock className="text-2xl text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{appointments.pending.length}</p>
              </div>
              <FiClock className="text-2xl text-yellow-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{appointments.past.length}</p>
              </div>
              <FiClock className="text-2xl text-green-500" />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#4DB6B0]">Upcoming appointments for June 22, 2025</h2>
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                {appointments.upcoming.length} appointments
              </span>
            </div>
            {appointments.upcoming.length > 0 ? (
              appointments.upcoming.map(appt => renderCard(appt))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiCalendar className="text-4xl mx-auto mb-3 text-gray-300" />
                <p>No upcoming appointments</p>
              </div>
            )}
          </div>

          {/* Pending Appointments */}
          <div className="bg-yellow-50 rounded-xl p-6 shadow border border-yellow-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-green-600">Accept appointments</h2>
              <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                {appointments.pending.length} pending
              </span>
            </div>
            {appointments.pending.length > 0 ? (
              appointments.pending.map(appt => renderCard(appt, true))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiClock className="text-4xl mx-auto mb-3 text-gray-300" />
                <p>No pending appointments</p>
              </div>
            )}
          </div>

          {/* Past Appointments */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-700">Past appointments</h2>
              <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                {appointments.past.length} completed
              </span>
            </div>
            {appointments.past.length > 0 ? (
              appointments.past.map(appt => renderCard(appt))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiClock className="text-4xl mx-auto mb-3 text-gray-300" />
                <p>No past appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <NewAppointmentModal
          isOpen={showNewAppointmentModal}
          onClose={() => setShowNewAppointmentModal(false)}
          onSubmit={handleNewAppointment}
        />

        <AppointmentConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={closeConfirmationModal}
          onConfirm={handleConfirmAction}
          appointment={confirmationModal.appointment}
          action={confirmationModal.action}
        />
      </div>
    </div>
  );
};

export default ReceptionAppointments;
            

