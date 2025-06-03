import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Send, 
  Info, 
  Eye, 
  Settings,
  Bell,
  User
} from 'lucide-react';

export const PatientDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 5, 17)); // June 2024
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessage, setChatMessage] = useState('');

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

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

  const prescriptions = [
    { id: 1, title: 'Header', subtitle: 'Subhead', priority: 'high' },
    { id: 2, title: 'Header', subtitle: 'Subhead', priority: 'medium' },
    { id: 3, title: 'Header', subtitle: 'Subhead', priority: 'high' },
  ];

  const bodyInfo = [
    { label: 'Height', value: '180 cm' },
    { label: 'Weight', value: '70 kg' },
    { label: 'BMI', value: '21.6 (normal)' },
    { label: 'FAT %', value: '17 % (normal)' },
    { label: 'Blood pressure (sis/dis)', value: '120/80' },
    { label: 'Reach', value: '180 cm' },
    { label: 'Blood group', value: 'A' },
    { label: 'Blood Rh', value: '-' },
    { label: 'Allergies', value: 'none' },
    { label: 'Visual acuity (L/R)', value: '0.9/1' },
    { label: 'Mental health status', value: 'good' }
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
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
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

            {/* Prescriptions Reminder */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">PRESCRIPTIONS REMINDER</h3>
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        A
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{prescription.title}</div>
                        <div className="text-sm text-gray-500">{prescription.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        prescription.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <Settings className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4">
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                  INFO
                </button>
                <button className="px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors">
                  LOOK UP
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column - Body Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">BODY INFO</h3>
              <div className="space-y-4">
                {bodyInfo.map((info, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-600 font-medium">{info.label}</span>
                    <span className="text-gray-800 font-semibold">{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - TABIB.AI */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col" style={{ height: '710px' }}>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">TABIB.AI</h3>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto min-h-0">
                <div className="text-gray-500 text-center">
                  Start a conversation with your AI assistant
                </div>
              </div>
              <div className="flex space-x-2 mt-auto">
                <input
                  type="text"
                  placeholder="message TABIB"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
                <button className="bg-emerald-400 text-white p-2 rounded-lg hover:bg-emerald-500 transition-colors">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
