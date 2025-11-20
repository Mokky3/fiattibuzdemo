import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit3,
  FileText,
  X
} from 'lucide-react';
import DoctorSearchModal from './DoctorSearchModal';
import { patientAppointmentsAPI, patientHospitalsAPI } from '../../services/apiService';

const PatientAppointment = () => {
  const location = useLocation();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1)); // Current month
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    hospital: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: '',
    additionalNote: '',
    doctor_id: ''
  });
  
  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    appointmentDate: '',
    appointmentTime: ''
  });

  // Cancel confirmation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const [hospitals, setHospitals] = useState([]);

  const appointmentTypes = [
    'General Consultation',
    'Yearly Check Up',
    'Follow-up Visit',
    'Emergency Consultation',
    'Specialist Consultation'
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Monday-first calendar: shift Sunday (0) to end (6)
    const startDay = (firstDay.getDay() + 6) % 7;

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    if (!formData.hospital) {
      setError('Please select a hospital');
      return;
    }
    if (!formData.appointmentDate) {
      setError('Please select an appointment date');
      return;
    }
    if (!formData.appointmentTime) {
      setError('Please select an appointment time');
      return;
    }
    if (!formData.appointmentType) {
      setError('Please select an appointment type');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const payload = {
        hospital: formData.hospital,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        appointmentType: formData.appointmentType,
        additionalNote: formData.additionalNote || '',
        doctor_id: formData.doctor_id || '',
      };
      const res = await patientAppointmentsAPI.create(payload);
      // success toast / popup
      window.alert('Appointment booked successfully');
      // refresh lists
      await fetchAppointments();
      // reset form
      setFormData({ hospital: '', appointmentDate: '', appointmentTime: '', appointmentType: '', additionalNote: '', doctor_id: '' });
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const openDoctorModal = () => {
    setShowDoctorModal(true);
  };

  const closeDoctorModal = () => {
    setShowDoctorModal(false);
  };

  // Pre-fill form and open doctor modal from location state (when navigating from Hospital page with doctor info)
  useEffect(() => {
    if (location.state && location.state.doctor && location.state.doctor.id) {
      // Only auto-open and pre-fill if we have a specific doctor (from Book Appointment button)
      const { doctor, hospital } = location.state;
      // Open the doctor search modal automatically
      setShowDoctorModal(true);
      // Store doctor and hospital for the modal
      if (hospital) {
        setFormData(prev => ({
          ...prev,
          hospital: hospital
        }));
      }
      if (doctor && doctor.id) {
        setFormData(prev => ({
          ...prev,
          doctor_id: doctor.id
        }));
      }
      // Clear location state after using it to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const [upcoming, past] = await Promise.all([
        patientAppointmentsAPI.list('upcoming'),
        patientAppointmentsAPI.list('past'),
      ]);
      setUpcomingAppointments(upcoming);
      setPastAppointments(past);
    } catch (e) {
      // Handle authentication errors and redirect if needed
      if (handlePatientAuthError(e)) {
        return; // Redirected, exit early
      }
      
      setError(e?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const items = await patientHospitalsAPI.list();
      setHospitals(items);
    } catch (e) {
      // non-blocking; keep empty list on failure
      console.warn('[APPOINTMENTS] Failed to load hospitals', e);
      setHospitals([]);
    }
  };

  const handleCancelClick = (appointment) => {
    setAppointmentToCancel(appointment);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!appointmentToCancel) return;
    
    try {
      setLoading(true);
      setError('');
      await patientAppointmentsAPI.update(appointmentToCancel.id, { status: 'cancelled' });
      await fetchAppointments();
      setShowCancelModal(false);
      setAppointmentToCancel(null);
      window.alert('Appointment cancelled successfully');
    } catch (e) {
      setError(e?.message || 'Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCancel = () => {
    setShowCancelModal(false);
    setAppointmentToCancel(null);
  };

  const handleNoShow = async (appointmentId) => {
    try {
      setLoading(true);
      await patientAppointmentsAPI.update(appointmentId, { status: 'noshow' });
      await fetchAppointments();
    } catch (e) {
      setError(e?.message || 'Failed to mark as no-show');
    } finally {
      setLoading(false);
    }
  };

  const openRescheduleModal = (appointment) => {
    // Parse current appointment date and time
    let currentDate = '';
    let currentTime = '';
    
    if (appointment.date && appointment.time) {
      // Parse date from format "DD.MM.YYYY" to "YYYY-MM-DD"
      const [day, month, year] = appointment.date.split('.');
      if (day && month && year) {
        currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      // Time is already in "HH:MM" format
      currentTime = appointment.time;
    }
    
    setRescheduleAppointment(appointment);
    setRescheduleData({
      appointmentDate: currentDate,
      appointmentTime: currentTime
    });
    setShowRescheduleModal(true);
  };

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleAppointment(null);
    setRescheduleData({
      appointmentDate: '',
      appointmentTime: ''
    });
  };

  const handleReschedule = async () => {
    if (!rescheduleAppointment || !rescheduleData.appointmentDate || !rescheduleData.appointmentTime) {
      setError('Please provide both date and time');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await patientAppointmentsAPI.update(rescheduleAppointment.id, {
        appointmentDate: rescheduleData.appointmentDate,
        appointmentTime: rescheduleData.appointmentTime,
      });
      await fetchAppointments();
      closeRescheduleModal();
    } catch (e) {
      setError(e?.message || 'Failed to reschedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchHospitals();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
        )}
        <div className="flex gap-6">
          {/* Left Sidebar - Calendar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2 sm:mb-4">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <div key={`${day}-${idx}`} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 auto-rows-[2.25rem] sm:auto-rows-[2.5rem]">
                {getDaysInMonth(currentDate).map((day, index) => (
                  <div
                    key={index}
                    className={`
                      text-center py-1 sm:py-2 text-xs sm:text-sm rounded-lg cursor-pointer transition-colors
                      ${day === null ? '' : 'hover:bg-emerald-50'}
                      ${day && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear() && day === today.getDate() ? 'bg-emerald-400 text-white font-semibold' : 'text-gray-700'}
                    `}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                      }
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area - Appointment Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Book an Appointment Form */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-emerald-400 mb-4 sm:mb-6">Book an appointment</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hospital</label>
                    <div className="relative">
                      <select
                        value={formData.hospital}
                        onChange={(e) => handleInputChange('hospital', e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none bg-white text-sm sm:text-base"
                      >
                        <option value="">Select hospital</option>
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 sm:top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appointment date</label>
                    <input
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appointment time</label>
                    <input
                      type="time"
                      step="900" /* 15 minutes */
                      value={formData.appointmentTime}
                      onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appointment type</label>
                    <div className="relative">
                      <select
                        value={formData.appointmentType}
                        onChange={(e) => handleInputChange('appointmentType', e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none bg-white text-sm sm:text-base"
                      >
                        <option value="">Select type</option>
                        {appointmentTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 sm:top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional note (optional)</label>
                  <textarea
                    value={formData.additionalNote}
                    onChange={(e) => handleInputChange('additionalNote', e.target.value)}
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none text-sm sm:text-base"
                    placeholder="Value"
                  />
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                  <button
                    type="submit"
                    className="bg-emerald-400 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-emerald-500 transition-colors font-medium text-sm sm:text-base"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={openDoctorModal}
                    className="border border-gray-300 text-gray-700 px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                  >
                    Search a doctor
                  </button>
                  <button
                    type="button"
                    className="border border-gray-300 text-gray-700 px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                  >
                    Yearly look up
                  </button>
                </div>
              </form>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-400 mb-4 sm:mb-6">Upcoming appointment</h3>
              
              {loading && (
                <div className="text-sm text-gray-500 py-4">Loading upcoming appointments...</div>
              )}
              {!loading && upcomingAppointments.length === 0 && (
                <div className="text-sm text-gray-500 py-4 text-center">No upcoming appointments scheduled.</div>
              )}
              {!loading && upcomingAppointments.length > 0 && upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="text-center sm:text-left">
                        <div className="text-base sm:text-lg font-semibold text-gray-800">{appointment.date}</div>
                        <div className="text-xs sm:text-sm text-emerald-500">in {appointment.daysUntil} days</div>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-800">{appointment.time}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{appointment.description}</div>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                          <span className="text-red-500">{appointment.hospital}</span>
                          <span>{appointment.room}</span>
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openRescheduleModal(appointment)} className="bg-emerald-400 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center sm:justify-start space-x-2 text-sm">
                        <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>reschedule</span>
                      </button>
                      <button onClick={() => handleCancelClick(appointment)} className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm">cancel</button>
                      <button onClick={() => handleNoShow(appointment.id)} className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm">no-show</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Past Appointments */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-400 mb-4 sm:mb-6">Past appointments</h3>
              
              {loading && (
                <div className="text-sm text-gray-500 py-4">Loading past appointments...</div>
              )}
              {!loading && pastAppointments.length === 0 && (
                <div className="text-sm text-gray-500 py-4 text-center">No past appointments found.</div>
              )}
              {!loading && pastAppointments.length > 0 && pastAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="text-center sm:text-left">
                        <div className="text-base sm:text-lg font-semibold text-gray-800">{appointment.date}</div>
                        <div className="text-xs sm:text-sm text-gray-500">past</div>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-800">{appointment.time}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{appointment.description}</div>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                          <span className="text-red-500">{appointment.hospital}</span>
                          <span>{appointment.room}</span>
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>
                    <button className="bg-emerald-400 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center sm:justify-start space-x-2 text-sm">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>summary</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Search Modal */}
      <DoctorSearchModal 
        isOpen={showDoctorModal} 
        onClose={closeDoctorModal} 
        initialDoctor={location.state?.doctor || null}
        initialHospital={location.state?.hospital || formData.hospital || ''}
        onAppointmentBooked={fetchAppointments}
      />

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-emerald-400">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Reschedule Appointment</h3>
              <button
                onClick={closeRescheduleModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {rescheduleAppointment && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current appointment:</p>
                <p className="font-medium text-gray-800">
                  {rescheduleAppointment.date} at {rescheduleAppointment.time}
                </p>
                {rescheduleAppointment.description && (
                  <p className="text-sm text-gray-600 mt-1">{rescheduleAppointment.description}</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Appointment Date
                </label>
                <input
                  type="date"
                  value={rescheduleData.appointmentDate}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Appointment Time
                </label>
                <input
                  type="time"
                  step="900"
                  value={rescheduleData.appointmentTime}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeRescheduleModal}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={loading || !rescheduleData.appointmentDate || !rescheduleData.appointmentTime}
                className="px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Rescheduling...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && appointmentToCancel && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Cancel Appointment</h3>
              <button
                onClick={handleCancelCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to cancel this appointment?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {appointmentToCancel.date}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Time:</strong> {appointmentToCancel.time}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Hospital:</strong> {appointmentToCancel.hospital}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Type:</strong> {appointmentToCancel.type}
                </p>
              </div>
              <p className="text-sm text-red-600 mt-4">
                This action cannot be undone. The appointment will be marked as cancelled.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelCancel}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={loading}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointment;