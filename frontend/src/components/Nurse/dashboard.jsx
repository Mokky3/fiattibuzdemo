import React, { useState } from 'react';
import { Calendar, User, Pill, CheckCircle } from 'lucide-react';
import NurseHeader from './header';

const NursePortalDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(28);
  
  // Sample data
  const patients = [
    { id: 1, name: "Sarah Johnson", room: "101A", condition: "Post-surgery", time: "08:00", provider: "Dr. Smith", status: "vitals-due" },
    { id: 2, name: "Robert Chen", room: "102B", condition: "Diabetes", time: "08:30", provider: "Dr. Williams", status: "medication-due" },
    { id: 3, name: "Maria Garcia", room: "103A", condition: "Hypertension", time: "09:00", provider: "Dr. Johnson", status: "completed" },
    { id: 4, name: "James Wilson", room: "104B", condition: "Cardiac care", time: "09:30", provider: "Dr. Brown", status: "medication-due" }
  ];

  const medications = [
    { patient: "Sarah Johnson", medication: "Morphine 5mg", time: "08:15", status: "pending" },
    { patient: "Robert Chen", medication: "Insulin 10 units", time: "08:45", status: "pending" },
    { patient: "Maria Garcia", medication: "Lisinopril 10mg", time: "12:00", status: "given" }
  ];

  const messages = [
    { name: "Dr. Smith", message: "Patient in 101A needs extra monitoring", time: "5 min ago", online: true },
    { name: "Supervisor Jane", message: "Shift handover notes ready", time: "15 min ago", online: true },
    { name: "Dr. Williams", message: "Update on Room 102B medication", time: "1 hour ago", online: false }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'vitals-due': return 'bg-orange-100 text-orange-700';
      case 'medication-due': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'vitals-due': return 'Vitals Due';
      case 'medication-due': return 'Medication Due';
      case 'completed': return 'Completed';
      default: return 'Pending';
    }
  };

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      days.push(i);
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use the separate Header component */}
      <NurseHeader />

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-80 bg-white p-6 shadow-lg">
          {/* Calendar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Calendar
              </h3>
            </div>
            <div className="text-center mb-4">
              <div className="flex items-center justify-between">
                <button>&lt;</button>
                <span className="font-semibold">JUNE</span>
                <button>&gt;</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="p-2 font-medium text-gray-600">{day}</div>
              ))}
              {generateCalendarDays().map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`p-2 rounded ${
                    day === selectedDate 
                      ? 'bg-teal-500 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Today's Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Today's Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Patients:</span>
                <span className="font-semibold text-teal-600">12</span>
              </div>
              <div className="flex justify-between">
                <span>Medications Due:</span>
                <span className="font-semibold text-red-600">8</span>
              </div>
              <div className="flex justify-between">
                <span>Vitals Pending:</span>
                <span className="font-semibold text-orange-600">5</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Tasks:</span>
                <span className="font-semibold text-green-600">15</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div>
            <h4 className="font-semibold mb-3 text-teal-600">Messages</h4>
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {msg.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    {msg.online && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{msg.name}</div>
                    <div className="text-xs text-gray-600 truncate">{msg.message}</div>
                    <div className="text-xs text-gray-400">{msg.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Patient Assignments */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-teal-600 flex items-center">
                <User className="mr-2 h-5 w-5" />
                Patient Assignments for June 28, 2025
              </h2>
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  12 patients assigned
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {patients.map(patient => (
                <div key={patient.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-teal-500 text-white px-3 py-1 rounded text-sm font-medium">
                        {patient.time}
                      </div>
                      <div>
                        <div className="font-semibold">{patient.name}</div>
                        <div className="text-sm text-gray-600">Room {patient.room}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                        {getStatusText(patient.status)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        Provider: {patient.provider}
                      </div>
                      <button className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medication Schedule */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-teal-600 flex items-center">
                <Pill className="mr-2 h-5 w-5" />
                Medication Schedule
              </h2>
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                  2 pending
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {medications.map((med, index) => (
                <div key={index} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded text-sm font-medium ${
                        med.status === 'pending' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      }`}>
                        {med.time}
                      </div>
                      <div>
                        <div className="font-semibold">{med.patient}</div>
                        <div className="text-sm text-gray-600">{med.medication}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {med.status === 'pending' ? (
                        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center">
                          <Pill className="mr-1 h-4 w-4" />
                          Administer
                        </button>
                      ) : (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Given
                        </span>
                      )}
                      <input type="checkbox" className="ml-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NursePortalDashboard;