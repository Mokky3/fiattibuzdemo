import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceptionistHeader } from './ReceptionHeader';
import { FiClock, FiUser, FiArrowLeft, FiSearch, FiCalendar } from 'react-icons/fi';
import { receptionAPI } from '../../services/apiService';

const AllPastAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

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
      className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/reception/appointments/${appt.appointmentId || appt.id}`)}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gray-100 p-2 rounded-lg">
              <FiClock className="text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{appt.time}</p>
              <p className="text-sm text-gray-500">{appt.date}</p>
            </div>
          </div>
          <div className="ml-12">
            <h3 className="font-semibold text-gray-900 mb-1">{appt.patient}</h3>
            <p className="text-sm text-gray-600 mb-1">
              <FiUser className="inline mr-1" />
              {appt.doctor}
            </p>
            <p className="text-sm text-gray-500">{appt.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
            {appt.status}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/reception/appointments')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="text-sm" />
            <span className="text-sm font-medium">Back to Appointments</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">All Past Appointments</h1>
          <p className="text-gray-600">View all completed appointments and medical records</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search patients, doctors, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              />
            </div>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {filteredAppointments.length} of {appointments.length} past appointments
                </p>
              </div>
              <div className="space-y-4">
                {filteredAppointments.map(appt => renderCard(appt))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FiClock className="text-4xl mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium mb-1">No past appointments found</p>
              <p className="text-sm">
                {searchTerm || selectedDate 
                  ? 'Try adjusting your search or date filter'
                  : 'No past appointments available'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllPastAppointments;

