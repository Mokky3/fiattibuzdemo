import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReceptionistHeader } from './ReceptionHeader';
import { FiClock, FiUser, FiArrowLeft, FiSearch, FiCalendar } from 'react-icons/fi';
import { receptionAPI } from '../../services/apiService';

const AllPastAppointments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
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

  const clinicId = localStorage.getItem('clinic_id') || 'default-clinic';

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const pastResp = await receptionAPI.getPast(100); // Load more appointments
      const pastItems = Array.isArray(pastResp) ? pastResp : (pastResp?.data || pastResp?.items || []);
      const pastMapped = pastItems.map(apt => ({
        id: apt.appointment_id || apt.id,
        time: apt.time || '',
        date: apt.date || '',
        patient: apt.patient || 'Unknown Patient',
        doctor: apt.doctor || 'Unknown Doctor',
        type: apt.type || 'General Consultation',
        status: apt.status || 'completed',
        patientId: apt.patient_id || '',
        appointmentId: apt.appointment_id || apt.id
      }));
      setAppointments(pastMapped);
    } catch (e) {
      console.error('Failed to load past appointments', e);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Filter appointments based on search and date
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = !searchTerm || 
      apt.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !selectedDate || apt.date === selectedDate;
    
    return matchesSearch && matchesDate;
  });

  const renderCard = (appt) => (
    <div 
      key={appt.id} 
      className={`rounded-lg p-4 border hover:shadow-md transition-all cursor-pointer ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037] hover:border-[#79CAC2]'
          : 'bg-white border-gray-200'
      }`}
      onClick={() => navigate(`/reception/appointments/${appt.appointmentId || appt.id}`)}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'bg-[#07181D]' : 'bg-gray-100'
            }`}>
              <FiClock className={darkMode ? 'text-[#79CAC2]' : 'text-gray-600'} />
            </div>
            <div>
              <p className={`font-semibold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{appt.time}</p>
              <p className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{appt.date}</p>
            </div>
          </div>
          <div className="ml-12">
            <h3 className={`font-semibold mb-1 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{appt.patient}</h3>
            <p className={`text-sm mb-1 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>
              <FiUser className="inline mr-1" />
              {appt.doctor}
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{appt.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            darkMode
              ? 'bg-[#062412] text-[#4ADE80]'
              : 'bg-green-100 text-green-800'
          }`}>
            {t(appt.status) || appt.status}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <ReceptionistHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/reception/appointments')}
            className={`flex items-center gap-2 mb-4 transition-colors ${
              darkMode
                ? 'text-[#C1D9DD] hover:text-[#79CAC2]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiArrowLeft className="text-sm" />
            <span className="text-sm font-medium">{t('backToAppointments')}</span>
          </button>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('allPastAppointments')}</h1>
          <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>
            {t('viewAllCompletedAppointmentsAndMedicalRecords')}
          </p>
        </div>

        {/* Search and Filters */}
        <div className={`rounded-xl p-4 sm:p-6 shadow-sm border mb-6 transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder={t('searchPatientsDoctorsOrType')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
                }`}
              />
            </div>
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
          </div>
        </div>

        {/* Appointments List */}
        <div className={`rounded-xl p-4 sm:p-6 shadow-sm border transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
        }`}>
          {loading ? (
            <div className="text-center py-12">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
                darkMode ? 'border-[#79CAC2]' : 'border-[#4DB6B0]'
              }`}></div>
              <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>
                {t('loadingAppointments')}...
              </p>
            </div>
          ) : filteredAppointments.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>
                  {t('showing')} {filteredAppointments.length} {t('of')} {appointments.length} {t('pastAppointments')}
                </p>
              </div>
              <div className="space-y-4">
                {filteredAppointments.map(appt => renderCard(appt))}
              </div>
            </>
          ) : (
            <div className={`text-center py-12 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>
              <FiClock className={`text-4xl mx-auto mb-3 ${
                darkMode ? 'text-[#133037]' : 'text-gray-300'
              }`} />
              <p className={`text-lg font-medium mb-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('noPastAppointmentsFound')}</p>
              <p className="text-sm">
                {searchTerm || selectedDate 
                  ? t('tryAdjustingYourSearchOrDateFilter')
                  : t('noPastAppointmentsAvailable')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllPastAppointments;

