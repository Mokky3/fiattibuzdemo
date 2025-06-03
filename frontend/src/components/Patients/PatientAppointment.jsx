import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Bell,
  User,
  ChevronDown,
  Edit3,
  FileText
} from 'lucide-react';
import DoctorSearchModal from './DoctorSearchModal';

const PatientAppointment = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 5, 17)); // June 2024
  const [searchQuery, setSearchQuery] = useState('');
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
      <nav className="bg-emerald-400 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="text-white text-xl font-bold">FIATTIR</div>
              <div className="hidden md:flex items-center space-x-6">
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  APPOINTMENT
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  RECORDS
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  PRESCRIPTION
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  INSURANCE
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  HOSPITAL
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/20 text-white placeholder-white/70 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              </div>
              <button className="text-white hover:text-emerald-100">
                <Bell className="h-5 w-5" />
              </button>
              <div className="bg-emerald-600 rounded-full p-2">
                <User className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((day, index) => (
                  <div
                    key={index}
                    className={`
                      text-center py-2 text-sm rounded-lg cursor-pointer transition-colors
                      ${day === null ? '' : 'hover:bg-emerald-50'}
                      ${day === 17 ? 'bg-emerald-400 text-white font-semibold' : 'text-gray-700'}
                    `}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Columns - Appointment Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Book an Appointment Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-emerald-400 mb-6">Book an appointment</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hospital</label>
                    <div className="relative">
                      <select
                        value={formData.hospital}
                        onChange={(e) => handleInputChange('hospital', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="">Value</option>
                        {hospitals.map((hospital) => (
                          <option key={hospital} value={hospital}>{hospital}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appointment date</label>
                    <input
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appointment time</label>
                    <input
                      type="time"
                      value={formData.appointmentTime}
                      onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appointment type</label>
                    <div className="relative">
                      <select
                        value={formData.appointmentType}
                        onChange={(e) => handleInputChange('appointmentType', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="">Select type</option>
                        {appointmentTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional note (optional)</label>
                  <textarea
                    value={formData.additionalNote}
                    onChange={(e) => handleInputChange('additionalNote', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none"
                    placeholder="Value"
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    type="submit"
                    className="bg-emerald-400 text-white px-8 py-3 rounded-lg hover:bg-emerald-500 transition-colors font-medium"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={openDoctorModal}
                    className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Search a doctor
                  </button>
                  <button
                    type="button"
                    className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Yearly look up
                  </button>
                </div>
              </form>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-emerald-400 mb-6">Upcoming appointment</h3>
              
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">{appointment.date}</div>
                        <div className="text-sm text-emerald-500">in {appointment.daysUntil} days</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">{appointment.time}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1">{appointment.description}</div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="text-red-500">{appointment.hospital}</span>
                          <span>{appointment.room}</span>
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>
                    <button className="bg-emerald-400 text-white px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors flex items-center space-x-2">
                      <Edit3 className="h-4 w-4" />
                      <span>edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Past Appointments */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-emerald-400 mb-6">Past appointments</h3>
              
              {pastAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">{appointment.date}</div>
                        <div className="text-sm text-gray-500">past</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">{appointment.time}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1">{appointment.description}</div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="text-red-500">{appointment.hospital}</span>
                          <span>{appointment.room}</span>
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>
                    <button className="bg-emerald-400 text-white px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
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