import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Pill, CheckCircle } from 'lucide-react';
import NurseHeader from './header';
import { 
  getDashboardSummary, 
  getDashboardPatients, 
  getDashboardMedications, 
  getDashboardTasks,
  getDashboardMessages,
  administerMedication
} from '../../services/nurseService';

const NursePortalDashboard = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [currentDate] = useState(new Date());
  
  // State for real data
  const [patients, setPatients] = useState([]);
  const [medications, setMedications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState({ totalPatients: 0, medsDue: 0, vitalsPending: 0, completedTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [administering, setAdministering] = useState({});
  const [medicationsTotal, setMedicationsTotal] = useState(0);

  const fetchDashboardData = async (targetDate = null) => {
    try {
      setLoading(true);
      
      // Format date for API if provided
      const dateParam = targetDate ? targetDate.toISOString().split('T')[0] : null;
      
      // Fetch all dashboard data in parallel
      const [summaryRes, patientsRes, medicationsRes, tasksRes, messagesRes] = await Promise.all([
        getDashboardSummary(),
        getDashboardPatients(dateParam),
        getDashboardMedications(dateParam),
        getDashboardTasks(dateParam),
        getDashboardMessages()
      ]);
      
      // Set summary data
      const summaryData = summaryRes.data || summaryRes;
      setSummary({
        totalPatients: summaryData.totalPatients ?? summaryData.patients_total ?? 0,
        medsDue: summaryData.medsDue ?? summaryData.medications_due ?? 0,
        vitalsPending: summaryData.vitalsPending ?? summaryData.vitals_pending ?? 0,
        completedTasks: summaryData.completedTasks ?? summaryData.tasks_completed ?? 0,
      });
      
      // Set patients data
      const patientsData = patientsRes.data || patientsRes;
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      
      // Set medications data - handle both array and object with items/total
      const medicationsData = medicationsRes.data || medicationsRes;
      if (medicationsData && medicationsData.items) {
        setMedications(medicationsData.items || []);
        setMedicationsTotal(medicationsData.total || 0);
      } else if (Array.isArray(medicationsData)) {
        setMedications(medicationsData);
        setMedicationsTotal(medicationsData.length);
      } else {
        setMedications([]);
        setMedicationsTotal(0);
      }
      
      // Set tasks data
      const tasksData = tasksRes.data || tasksRes;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      
      // Set messages data
      const messagesData = messagesRes.data || messagesRes;
      setMessages(Array.isArray(messagesData) ? messagesData : []);
      
    } catch (e) {
      console.error('Error loading dashboard data:', e);
      // Fallback to empty data on error
      setSummary({ totalPatients: 0, medsDue: 0, vitalsPending: 0, completedTasks: 0 });
      setPatients([]);
      setMedications([]);
      setTasks([]);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true
    ;(async () => {
      await fetchDashboardData();
    })()
    return () => { active = false }
  }, [])

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

  const handleAdministerMedication = async (medication) => {
    if (!medication.id) {
      console.error('Medication ID is missing');
      return;
    }

    try {
      setAdministering({ ...administering, [medication.id]: true });
      await administerMedication(medication.id, {});
      
      // Refresh dashboard data
      const selectedDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate);
      await fetchDashboardData(selectedDateObj);
    } catch (e) {
      console.error('Error administering medication:', e);
      alert('Error administering medication: ' + (e.message || 'Unknown error'));
    } finally {
      setAdministering({ ...administering, [medication.id]: false });
    }
  };

  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NurseHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

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
                <span className="font-semibold">{currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()}</span>
                <button>&gt;</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={`day-header-${index}`} className="p-2 font-medium text-gray-600">{day}</div>
              ))}
              {generateCalendarDays().map(day => (
                <button
                  key={`calendar-day-${day}`}
                  onClick={() => {
                    setSelectedDate(day);
                    // Create a new date for the selected day
                    const selectedDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    fetchDashboardData(selectedDateObj);
                  }}
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
                <span className="font-semibold text-teal-600">{summary.totalPatients}</span>
              </div>
              <div className="flex justify-between">
                <span>Medications Due:</span>
                <span className="font-semibold text-red-600">{summary.medsDue}</span>
              </div>
              <div className="flex justify-between">
                <span>Vitals Pending:</span>
                <span className="font-semibold text-orange-600">{summary.vitalsPending}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Tasks:</span>
                <span className="font-semibold text-green-600">{summary.completedTasks}</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div>
            <h4 className="font-semibold mb-3 text-teal-600">Messages</h4>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  No recent messages
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={msg.id || index} className="flex items-start space-x-3">
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
                ))
              )}
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
                Patient Assignments for {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  {patients.length} patients assigned
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {patients.length === 0 ? (
                <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500">
                  No patients assigned for today
                </div>
              ) : (
                patients.map(patient => (
                  <div key={patient.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-teal-500 text-white px-3 py-1 rounded text-sm font-medium">
                          {patient.time}
                        </div>
                        <div>
                          <div className="font-semibold">{patient.name}</div>
                          <div className="text-sm text-gray-600">{patient.room}</div>
                          <div className="text-xs text-gray-500">
                            {patient.age} years old, {patient.gender}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                          {getStatusText(patient.status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                          Provider: {patient.provider}
                        </div>
                        <button 
                          onClick={() => navigate(`/nurse/patients/${patient.id}/profile`)}
                          className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
                  {medicationsTotal} pending
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {medications.length === 0 ? (
                <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500">
                  No pending medications for today
                </div>
              ) : (
                <>
                  {medications.map((med, index) => (
                    <div key={med.id || index} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="px-3 py-1 rounded text-sm font-medium bg-red-500 text-white">
                            {med.time}
                          </div>
                          <div>
                            <div className="font-semibold">{med.patient}</div>
                            <div className="text-sm text-gray-600">{med.medication}</div>
                            <div className="text-xs text-gray-500">{med.dosage} - {med.route}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleAdministerMedication(med)}
                            disabled={administering[med.id]}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Pill className="mr-1 h-4 w-4" />
                            {administering[med.id] ? 'Administering...' : 'Administer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => navigate('/nurse/medications')}
                      className="bg-teal-500 text-white px-6 py-2 rounded hover:bg-teal-600"
                    >
                      Show All
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NursePortalDashboard;