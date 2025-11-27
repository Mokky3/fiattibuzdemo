import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { patientAppointmentsAPI, patientHospitalsAPI, patientRecordsAPI } from '../../services/apiService';
import { handlePatientAuthError } from '../../utils/patientAuth';

const PatientAppointment = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1)); // Current month
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    t('patientDashboard.monthJanuary'),
    t('patientDashboard.monthFebruary'),
    t('patientDashboard.monthMarch'),
    t('patientDashboard.monthApril'),
    t('patientDashboard.monthMay'),
    t('patientDashboard.monthJune'),
    t('patientDashboard.monthJuly'),
    t('patientDashboard.monthAugust'),
    t('patientDashboard.monthSeptember'),
    t('patientDashboard.monthOctober'),
    t('patientDashboard.monthNovember'),
    t('patientDashboard.monthDecember')
  ];

  const [hospitals, setHospitals] = useState([]);

  const appointmentTypes = [
    t('patientAppointment.typeGeneralConsultation'),
    t('patientAppointment.typeYearlyCheckUp'),
    t('patientAppointment.typeFollowUpVisit'),
    t('patientAppointment.typeEmergencyConsultation'),
    t('patientAppointment.typeSpecialistConsultation')
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
      setError(t('patientAppointment.errorSelectHospital'));
      return;
    }
    if (!formData.appointmentDate) {
      setError(t('patientAppointment.errorSelectDate'));
      return;
    }
    if (!formData.appointmentTime) {
      setError(t('patientAppointment.errorSelectTime'));
      return;
    }
    if (!formData.appointmentType) {
      setError(t('patientAppointment.errorSelectType'));
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
      window.alert(t('patientAppointment.successBooked'));
      // refresh lists
      await fetchAppointments();
      // reset form
      setFormData({ hospital: '', appointmentDate: '', appointmentTime: '', appointmentType: '', additionalNote: '', doctor_id: '' });
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err?.message || t('patientAppointment.errorBookFailed'));
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
      
      setError(e?.message || t('patientAppointment.errorLoadFailed'));
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
      window.alert(t('patientAppointment.successCancelled'));
    } catch (e) {
      setError(e?.message || t('patientAppointment.errorCancelFailed'));
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
      setError(e?.message || t('patientAppointment.errorNoShowFailed'));
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
      setError(t('patientAppointment.errorProvideDateAndTime'));
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
      setError(e?.message || t('patientAppointment.errorRescheduleFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSummaryClick = async (appointment) => {
    try {
      setLoading(true);
      setError('');
      
      // Parse appointment date from format "DD.MM.YYYY" to "YYYY-MM-DD" for API search
      let searchDate = '';
      if (appointment.date) {
        const [day, month, year] = appointment.date.split('.');
        if (day && month && year) {
          searchDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      // Fetch records to find the one associated with this appointment
      const records = await patientRecordsAPI.list({ recordType: 'all', page: 1, size: 100 });
      const recordsList = records?.items || records || [];
      
      // Find record matching the appointment date
      let matchingRecord = null;
      if (searchDate) {
        matchingRecord = recordsList.find(record => {
          // Check if record date matches appointment date
          const recordDate = record.date || record.record_date;
          if (!recordDate) return false;
          
          // Normalize record date to YYYY-MM-DD format
          let normalizedRecordDate = '';
          if (recordDate.includes('.')) {
            const [d, m, y] = recordDate.split('.');
            normalizedRecordDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          } else if (recordDate.includes('-')) {
            normalizedRecordDate = recordDate.split('T')[0]; // Remove time if present
          } else {
            normalizedRecordDate = recordDate;
          }
          
          return normalizedRecordDate === searchDate || normalizedRecordDate.startsWith(searchDate);
        });
      }
      
      // If found, navigate to record summary
      if (matchingRecord && matchingRecord.id) {
        navigate(`/patient/records/${matchingRecord.id}`, { state: { record: matchingRecord } });
      } else {
        // If no record found, show error or navigate to records page with date filter
        setError(t('patientAppointment.noRecordFound'));
        // Optionally navigate to records page
        // navigate('/patient/records');
      }
    } catch (e) {
      console.error('Error fetching record for appointment:', e);
      setError(e?.message || t('patientAppointment.errorLoadRecord'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchHospitals();
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-100 border-red-400 text-red-700'} border`}>{error}</div>
        )}
        <div className="flex gap-6">
          {/* Left Sidebar - Calendar */}
          <div className="w-80 flex-shrink-0">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className={`p-1 sm:p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  aria-label={t('patientDashboard.previousMonth')}
                >
                  <ChevronLeft className={`h-4 w-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                </button>
                <h2 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  className={`p-1 sm:p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  aria-label={t('patientDashboard.nextMonth')}
                >
                  <ChevronRight className={`h-4 w-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2 sm:mb-4">
                {[
                  t('patientDashboard.calendarDayMon'),
                  t('patientDashboard.calendarDayTue'),
                  t('patientDashboard.calendarDayWed'),
                  t('patientDashboard.calendarDayThu'),
                  t('patientDashboard.calendarDayFri'),
                  t('patientDashboard.calendarDaySat'),
                  t('patientDashboard.calendarDaySun')
                ].map((day, idx) => (
                  <div key={`${day}-${idx}`} className={`text-center text-xs sm:text-sm font-medium py-1 sm:py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                      ${day === null ? '' : darkMode ? 'hover:bg-emerald-900/30' : 'hover:bg-emerald-50'}
                      ${day && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear() && day === today.getDate() 
                        ? darkMode ? 'bg-emerald-600 text-white font-semibold' : 'bg-emerald-400 text-white font-semibold' 
                        : darkMode ? 'text-gray-300' : 'text-gray-700'}
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
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
              <h2 className={`text-lg sm:text-xl font-semibold mb-4 sm:mb-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('patientAppointment.bookAppointment')}</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('patientAppointment.hospital')}</label>
                    <div className="relative">
                      <select
                        value={formData.hospital}
                        onChange={(e) => handleInputChange('hospital', e.target.value)}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none text-sm sm:text-base ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">{t('patientAppointment.selectHospital')}</option>
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                      </select>
                      <ChevronDown className={`absolute right-3 top-2.5 sm:top-3.5 h-4 w-4 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('patientAppointment.appointmentDate')}</label>
                    <input
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'border-gray-200'
                      }`}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('patientAppointment.appointmentTime')}</label>
                    <input
                      type="time"
                      step="900" /* 15 minutes */
                      value={formData.appointmentTime}
                      onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'border-gray-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('patientAppointment.appointmentType')}</label>
                    <div className="relative">
                      <select
                        value={formData.appointmentType}
                        onChange={(e) => handleInputChange('appointmentType', e.target.value)}
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
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('patientAppointment.additionalNote')}</label>
                  <textarea
                    value={formData.additionalNote}
                    onChange={(e) => handleInputChange('additionalNote', e.target.value)}
                    rows={4}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none text-sm sm:text-base ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'border-gray-200'
                    }`}
                    placeholder={t('patientAppointment.additionalNotePlaceholder')}
                  />
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                  <button
                    type="submit"
                    className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-400 hover:bg-emerald-500'} text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-colors font-medium text-sm sm:text-base`}
                  >
                    {t('patientAppointment.submit')}
                  </button>
                  <button
                    type="button"
                    onClick={openDoctorModal}
                    className={`border rounded-lg px-6 sm:px-8 py-2 sm:py-3 transition-colors font-medium text-sm sm:text-base ${
                      darkMode 
                        ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('patientAppointment.searchDoctor')}
                  </button>
                  <button
                    type="button"
                    className={`border rounded-lg px-6 sm:px-8 py-2 sm:py-3 transition-colors font-medium text-sm sm:text-base ${
                      darkMode 
                        ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('patientAppointment.yearlyLookup')}
                  </button>
                </div>
              </form>
            </div>

            {/* Upcoming Appointments */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-4 sm:mb-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('patientAppointment.upcomingAppointment')}</h3>
              
              {loading && (
                <div className={`text-sm py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('patientAppointment.loadingUpcoming')}</div>
              )}
              {!loading && upcomingAppointments.length === 0 && (
                <div className={`text-sm py-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('patientAppointment.noUpcoming')}</div>
              )}
              {!loading && upcomingAppointments.length > 0 && upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3 sm:p-4`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="text-center sm:text-left">
                        <div className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{appointment.date}</div>
                        <div className={`text-xs sm:text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`}>{t('patientAppointment.inDays', { days: appointment.daysUntil })}</div>
                      </div>
                      <div className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{appointment.time}</div>
                      <div className="flex-1">
                        <div className={`font-semibold mb-1 text-sm sm:text-base ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{appointment.description}</div>
                        <div className={`flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="text-red-500">{appointment.hospital}</span>
                          <span>{appointment.room}</span>
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openRescheduleModal(appointment)} className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-400 hover:bg-emerald-500'} text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-2 text-sm`}>
                        <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{t('patientAppointment.reschedule')}</span>
                      </button>
                      <button onClick={() => handleCancelClick(appointment)} className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm">{t('patientAppointment.cancel')}</button>
                      <button onClick={() => handleNoShow(appointment.id)} className={`${darkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'} text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm`}>{t('patientAppointment.noShow')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Past Appointments */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-4 sm:mb-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('patientAppointment.pastAppointments')}</h3>
              
              {loading && (
                <div className={`text-sm py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('patientAppointment.loadingPast')}</div>
              )}
              {!loading && pastAppointments.length === 0 && (
                <div className={`text-sm py-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('patientAppointment.noPast')}</div>
              )}
              {!loading && pastAppointments.length > 0 && pastAppointments.map((appointment) => (
                <div key={appointment.id} className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3 sm:p-4`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="text-center sm:text-left">
                        <div className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{appointment.date}</div>
                        <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('patientAppointment.past')}</div>
                      </div>
                      <div className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{appointment.time}</div>
                      <div className="flex-1">
                        <div className={`font-semibold mb-1 text-sm sm:text-base ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{appointment.description}</div>
                        <div className={`flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="text-red-500">{appointment.hospital}</span>
                          <span>{appointment.room}</span>
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSummaryClick(appointment)}
                      className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-400 hover:bg-emerald-500'} text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-2 text-sm`}
                    >
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{t('patientAppointment.summary')}</span>
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
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl max-w-md w-full p-6 border-2 ${darkMode ? 'border-emerald-600' : 'border-emerald-400'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('patientAppointment.rescheduleAppointment')}</h3>
              <button
                onClick={closeRescheduleModal}
                className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label={t('patientAppointment.closeModal')}
              >
                <X className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>

            {rescheduleAppointment && (
              <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('patientAppointment.currentAppointment')}:</p>
                <p className={`font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  {rescheduleAppointment.date} {t('patientAppointment.at')} {rescheduleAppointment.time}
                </p>
                {rescheduleAppointment.description && (
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{rescheduleAppointment.description}</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t('patientAppointment.newAppointmentDate')}
                </label>
                <input
                  type="date"
                  value={rescheduleData.appointmentDate}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'border-gray-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t('patientAppointment.newAppointmentTime')}
                </label>
                <input
                  type="time"
                  step="900"
                  value={rescheduleData.appointmentTime}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'border-gray-200'
                  }`}
                />
              </div>
            </div>

            {error && (
              <div className={`mt-4 p-3 rounded-lg text-sm border ${
                darkMode 
                  ? 'bg-red-900/30 border-red-700 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`}>
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeRescheduleModal}
                disabled={loading}
                className={`px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 ${
                  darkMode 
                    ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('patientAppointment.cancel')}
              </button>
              <button
                onClick={handleReschedule}
                disabled={loading || !rescheduleData.appointmentDate || !rescheduleData.appointmentTime}
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-emerald-400 hover:bg-emerald-500'
                } text-white`}
              >
                {loading ? t('patientAppointment.rescheduling') : t('patientAppointment.reschedule')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && appointmentToCancel && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl max-w-md w-full p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('patientAppointment.cancelAppointment')}</h3>
              <button
                onClick={handleCancelCancel}
                className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className={`mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {t('patientAppointment.confirmCancel')}
              </p>
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-4 space-y-2`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>{t('patientAppointment.date')}:</strong> {appointmentToCancel.date}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>{t('patientAppointment.time')}:</strong> {appointmentToCancel.time}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>{t('patientAppointment.hospital')}:</strong> {appointmentToCancel.hospital}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>{t('patientAppointment.type')}:</strong> {appointmentToCancel.type}
                </p>
              </div>
              <p className={`text-sm mt-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {t('patientAppointment.cancelWarning')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelCancel}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {t('patientAppointment.keepAppointment')}
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={loading}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('patientAppointment.cancelling') : t('patientAppointment.yesCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointment;