import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      
      // Set messages data and group by chat/contact
      const messagesData = messagesRes.data || messagesRes;
      const allMessages = Array.isArray(messagesData) ? messagesData : [];
      
      // Group messages by contact (sender) to create chats
      // Note: These are messages sent TO the nurse, so sender_id is the contact we want to chat with
      const chatsMap = new Map();
      allMessages.forEach(msg => {
        // Use sender_id as the primary identifier (the person who sent the message to the nurse)
        const chatId = msg.sender_id || msg.contact_id || msg.patient_id || msg.name;
        const contactName = msg.name || 'Unknown';
        const contactId = msg.sender_id || msg.contact_id || msg.patient_id;
        
        // Parse time string to get a sortable timestamp
        let messageTimestamp = 0;
        if (msg.time) {
          // Try to parse relative time strings like "2 min ago", "1 hour ago", etc.
          const timeStr = msg.time.toLowerCase();
          const now = Date.now();
          if (timeStr.includes('just now')) {
            messageTimestamp = now;
          } else if (timeStr.includes('min')) {
            const mins = parseInt(timeStr) || 0;
            messageTimestamp = now - (mins * 60 * 1000);
          } else if (timeStr.includes('hour')) {
            const hours = parseInt(timeStr) || 0;
            messageTimestamp = now - (hours * 60 * 60 * 1000);
          } else if (timeStr.includes('day')) {
            const days = parseInt(timeStr) || 0;
            messageTimestamp = now - (days * 24 * 60 * 60 * 1000);
          } else {
            // Try to parse as date string
            const parsed = Date.parse(msg.time);
            messageTimestamp = isNaN(parsed) ? now : parsed;
          }
        } else {
          messageTimestamp = Date.now();
        }
        
        if (!chatsMap.has(chatId)) {
          chatsMap.set(chatId, {
            id: chatId,
            contactId: contactId,
            name: contactName,
            lastMessage: msg.message || '',
            time: msg.time || 'Just now',
            online: msg.online || false,
            unread: msg.read === false || !msg.read,
            timestamp: messageTimestamp
          });
        } else {
          // Update if this message is more recent
          const existingChat = chatsMap.get(chatId);
          
          if (messageTimestamp > existingChat.timestamp) {
            existingChat.lastMessage = msg.message || existingChat.lastMessage;
            existingChat.time = msg.time || existingChat.time;
            existingChat.timestamp = messageTimestamp;
            existingChat.online = msg.online !== undefined ? msg.online : existingChat.online;
          }
          // Update unread status if any message is unread
          if (msg.read === false || !msg.read) {
            existingChat.unread = true;
          }
        }
      });
      
      // Convert to array, sort by timestamp (most recent first), and take last 3
      const chats = Array.from(chatsMap.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
      
      setMessages(chats);
      
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
    if (darkMode) {
      switch(status) {
        case 'vitals-due': return 'bg-[#251F07] text-[#FACC15]';
        case 'medication-due': return 'bg-[#2A0E15] text-[#FB7185]';
        case 'completed': return 'bg-[#062412] text-[#4ADE80]';
        default: return 'bg-[#133037] text-[#C1D9DD]';
      }
    } else {
      switch(status) {
        case 'vitals-due': return 'bg-orange-100 text-orange-700';
        case 'medication-due': return 'bg-red-100 text-red-700';
        case 'completed': return 'bg-green-100 text-green-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'vitals-due': return t('vitalsDue');
      case 'medication-due': return t('medicationDue');
      case 'completed': return t('completed');
      default: return t('pending');
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
      alert(t('errorAdministeringMedication') + ': ' + (e.message || t('unknownError')));
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
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
      }`}>
        <NurseHeader />
        <div className="flex items-center justify-center h-64">
          <div className={`text-lg ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('loadingDashboardData')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Use the separate Header component */}
      <NurseHeader />

      <div className="flex">
        {/* Left Sidebar */}
        <div className={`w-80 p-6 shadow-lg transition-colors ${
          darkMode ? 'bg-[#0D2026] border-r border-[#133037]' : 'bg-white'
        }`}>
          {/* Calendar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold flex items-center ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>
                <Calendar className={`mr-2 h-5 w-5 ${
                  darkMode ? 'text-[#79CAC2]' : 'text-teal-600'
                }`} />
                {t('calendar')}
              </h3>
            </div>
            <div className="text-center mb-4">
              <div className="flex items-center justify-between">
                <button className={`transition-colors ${
                  darkMode ? 'text-[#C1D9DD] hover:text-[#79CAC2]' : 'text-gray-600 hover:text-gray-900'
                }`}>&lt;</button>
                <span className={`font-semibold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()}</span>
                <button className={`transition-colors ${
                  darkMode ? 'text-[#C1D9DD] hover:text-[#79CAC2]' : 'text-gray-600 hover:text-gray-900'
                }`}>&gt;</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={`day-header-${index}`} className={`p-2 font-medium ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>{day}</div>
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
                  className={`p-2 rounded transition-colors ${
                    day === selectedDate 
                      ? darkMode
                        ? 'bg-[#79CAC2] text-[#050C0F]'
                        : 'bg-teal-500 text-white'
                      : darkMode
                      ? 'hover:bg-[#133037] text-[#F5FEFF]'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Today's Summary */}
          <div className={`mb-6 p-4 rounded-lg transition-colors ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <h4 className={`font-semibold mb-3 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('todaysSummary')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{t('totalPatients')}:</span>
                <span className={`font-semibold ${
                  darkMode ? 'text-[#79CAC2]' : 'text-teal-600'
                }`}>{summary.totalPatients}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{t('medicationsDue')}:</span>
                <span className={`font-semibold ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{summary.medsDue}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{t('vitalsPending')}:</span>
                <span className={`font-semibold ${
                  darkMode ? 'text-[#FACC15]' : 'text-orange-600'
                }`}>{summary.vitalsPending}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{t('completedTasks')}:</span>
                <span className={`font-semibold ${
                  darkMode ? 'text-[#4ADE80]' : 'text-green-600'
                }`}>{summary.completedTasks}</span>
              </div>
            </div>
          </div>

          {/* Messages - Show Chats */}
          <div>
            <h4 className={`font-semibold mb-3 ${
              darkMode ? 'text-[#79CAC2]' : 'text-teal-600'
            }`}>{t('messages')}</h4>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className={`text-center text-sm py-4 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>
                  {t('noRecentMessages')}
                </div>
              ) : (
                messages.map((chat, index) => (
                  <div
                    key={chat.id || index}
                    onClick={() => {
                      // Navigate to messages page with contact ID
                      navigate('/nurse/messages', {
                        state: { contactId: chat.contactId || chat.id }
                      });
                    }}
                    className={`flex items-start space-x-3 cursor-pointer transition-colors rounded-lg p-2 ${
                      darkMode
                        ? 'hover:bg-[#133037]'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        darkMode
                          ? 'bg-gradient-to-br from-[#79CAC2] to-[#58B4AA]'
                          : 'bg-teal-500'
                      }`}>
                        <span className="text-white text-xs font-bold">
                          {chat.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      {chat.online && (
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 ${
                          darkMode ? 'bg-[#4ADE80] border-[#0D2026]' : 'bg-green-400 border-white'
                        }`}></div>
                      )}
                      {chat.unread && (
                        <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                          darkMode ? 'bg-[#79CAC2]' : 'bg-teal-500'
                        }`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className={`font-medium text-sm ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{chat.name}</div>
                        <div className={`text-xs ${
                          darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                        }`}>{chat.time}</div>
                      </div>
                      <div className={`text-xs truncate mt-1 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                      }`}>{chat.lastMessage}</div>
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
              <h2 className={`text-xl font-semibold flex items-center ${
                darkMode ? 'text-[#79CAC2]' : 'text-teal-600'
              }`}>
                <User className="mr-2 h-5 w-5" />
                {t('patientAssignmentsFor')} {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <div className={`text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>
                <span className="inline-flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    darkMode ? 'bg-[#4ADE80]' : 'bg-green-400'
                  }`}></div>
                  {patients.length} {t('patientsAssigned')}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {patients.length === 0 ? (
                <div className={`p-4 rounded-lg shadow text-center transition-colors ${
                  darkMode
                    ? 'bg-[#0D2026] border border-[#133037] text-[#8AA2A7]'
                    : 'bg-white text-gray-500'
                }`}>
                  {t('noPatientsAssignedForToday')}
                </div>
              ) : (
                patients.map(patient => (
                  <div key={patient.id} className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#79CAC2]'
                      : 'bg-white border-teal-500'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`px-3 py-1 rounded text-sm font-medium ${
                          darkMode
                            ? 'bg-[#79CAC2] text-[#050C0F]'
                            : 'bg-teal-500 text-white'
                        }`}>
                          {patient.time}
                        </div>
                        <div>
                          <div className={`font-semibold ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{patient.name}</div>
                          <div className={`text-sm ${
                            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                          }`}>{patient.room}</div>
                          <div className={`text-xs ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>
                            {patient.age} {t('yearsOld')}, {patient.gender}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                          {getStatusText(patient.status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className={`text-sm ${
                          darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                        }`}>
                          {t('provider')}: {patient.provider}
                        </div>
                        <button 
                          onClick={() => navigate(`/nurse/patients/${patient.id}/profile`)}
                          className={`px-4 py-2 rounded transition-colors ${
                            darkMode
                              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                              : 'bg-teal-500 text-white hover:bg-teal-600'
                          }`}
                        >
                          {t('view')}
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
              <h2 className={`text-xl font-semibold flex items-center ${
                darkMode ? 'text-[#79CAC2]' : 'text-teal-600'
              }`}>
                <Pill className="mr-2 h-5 w-5" />
                {t('medicationSchedule')}
              </h2>
              <div className={`text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>
                <span className="inline-flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    darkMode ? 'bg-[#FB7185]' : 'bg-red-400'
                  }`}></div>
                  {medicationsTotal} {t('pending')}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {medications.length === 0 ? (
                <div className={`p-4 rounded-lg shadow text-center transition-colors ${
                  darkMode
                    ? 'bg-[#0D2026] border border-[#133037] text-[#8AA2A7]'
                    : 'bg-white text-gray-500'
                }`}>
                  {t('noPendingMedicationsForToday')}
                </div>
              ) : (
                <>
                  {medications.map((med, index) => (
                    <div key={med.id || index} className={`p-4 rounded-lg shadow transition-colors ${
                      darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded text-sm font-medium ${
                            darkMode
                              ? 'bg-[#FB7185] text-white'
                              : 'bg-red-500 text-white'
                          }`}>
                            {med.time}
                          </div>
                          <div>
                            <div className={`font-semibold ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{med.patient}</div>
                            <div className={`text-sm ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                            }`}>{med.medication}</div>
                            <div className={`text-xs ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                            }`}>{med.dosage} - {med.route}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleAdministerMedication(med)}
                            disabled={administering[med.id]}
                            className={`px-4 py-2 rounded flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              darkMode
                                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            <Pill className="mr-1 h-4 w-4" />
                            {administering[med.id] ? t('administering') : t('administer')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => navigate('/nurse/medications')}
                      className={`px-6 py-2 rounded transition-colors ${
                        darkMode
                          ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                          : 'bg-teal-500 text-white hover:bg-teal-600'
                      }`}
                    >
                      {t('showAll')}
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