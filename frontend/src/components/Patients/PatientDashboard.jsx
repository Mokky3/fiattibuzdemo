import React, { useState } from 'react';
import Navbar from './Navbar';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Send,
  Info,
  Eye,
  Settings
} from 'lucide-react';

export const PatientDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 5, 17)); // June 2024
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
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Column - Calendar */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-8">
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

            {/* Prescriptions Reminder */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">PRESCRIPTIONS REMINDER</h3>
              <div className="space-y-3 sm:space-y-4">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                        A
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-sm sm:text-base">{prescription.title}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{prescription.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                        prescription.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-between mt-3 sm:mt-4 space-y-2 sm:space-y-0 sm:space-x-2">
                <button className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm">
                  INFO
                </button>
                <button className="px-3 sm:px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors text-xs sm:text-sm">
                  LOOK UP
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column - Body Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">BODY INFO</h3>
              <div className="space-y-3 sm:space-y-4">
                {bodyInfo.map((info, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-100 last:border-b-0 space-y-1 sm:space-y-0">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">{info.label}</span>
                    <span className="text-gray-800 font-semibold text-sm sm:text-base">{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - TABIB.AI */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex flex-col" style={{ minHeight: '600px', maxHeight: '710px' }}>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">TABIB.AI</h3>
              <div className="flex-1 bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 overflow-y-auto min-h-0">
                <div className="text-gray-500 text-center text-sm sm:text-base">
                  Start a conversation with your AI assistant
                </div>
              </div>
              <div className="flex space-x-2 mt-auto">
                <input
                  type="text"
                  placeholder="message TABIB"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base"
                />
                <button className="bg-emerald-400 text-white p-2 rounded-lg hover:bg-emerald-500 transition-colors">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
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
