import React, { useState } from 'react';
import Navbar from './Navbar';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit3,
  FileText
} from 'lucide-react';
import DoctorSearchModal from './DoctorSearchModal';

const PatientAppointment = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 5, 17)); // June 2024
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [formData, setFormData] = useState({
    hospital: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: '',
    additionalNote: ''
  });

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const hospitals = [
    'Akfa Medline',
    'Tashkent Medical City',
    'International Clinic Tashkent',
    'Seoul National University Hospital',
    'Republican Research Center of Emergency Medicine'
  ];

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
    const startDay = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Appointment booked:', formData);
  };

  const openDoctorModal = () => {
    setShowDoctorModal(true);
  };

  const closeDoctorModal = () => {
    setShowDoctorModal(false);
  };

  const upcomingAppointments = [
    {
      id: 1,
      date: '30.06.2025',
      daysUntil: 5,
      time: '10:00',
      description: 'Upcoming consultation with Dr. Ayzek',
      hospital: 'Akfa Medline',
      room: 'room #104',
      type: 'yearly check up'
    }
  ];

  const pastAppointments = [
    {
      id: 1,
      date: '03.06.2025',
      time: '10:00',
      description: 'Past consultation with Dr. Ayzek',
      hospital: 'Akfa Medline',
      room: 'room #104',
      type: 'yearly check up'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Column - Calendar */}
          <div className="lg:col-span-1">
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
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((day, index) => (
                  <div
                    key={index}
                    className={`
                      text-center py-1 sm:py-2 text-xs sm:text-sm rounded-lg cursor-pointer transition-colors
                      ${day === null ? '' : 'hover:bg-emerald-50'}
                      ${day === 17 ? 'bg-emerald-400 text-white font-semibold' : 'text-gray-700'}
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

          {/* Right Columns - Appointment Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
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
                        <option value="">Value</option>
                        {hospitals.map((hospital) => (
                          <option key={hospital} value={hospital}>{hospital}</option>
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
              
              {upcomingAppointments.map((appointment) => (
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
                    <button className="bg-emerald-400 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center sm:justify-start space-x-2 text-sm">
                      <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Past Appointments */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-400 mb-4 sm:mb-6">Past appointments</h3>
              
              {pastAppointments.map((appointment) => (
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
      />
    </div>
  );
};

export default PatientAppointment;