import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { patientAPI, patientRecordsAPI, patientPrescriptionsAPI } from '../../services/apiService';
import { handlePatientAuthError } from '../../utils/patientAuth';

const PatientDashboard = () => {
  const { t } = useTranslation();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1)); // Current month
  const [chatMessage, setChatMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upcoming, setUpcoming] = useState([]);

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

  const [prescriptions, setPrescriptions] = useState([]);

  const [bodyInfo, setBodyInfo] = useState([
    { label: 'Height', value: '—' },
    { label: 'Weight', value: '—' },
    { label: 'BMI', value: '—' },
    { label: 'FAT %', value: '—' },
    { label: 'Blood pressure (sis/dis)', value: '—' },
    { label: 'Reach', value: '—' },
    { label: 'Blood group', value: '—' },
    { label: 'Blood Rh', value: '—' },
    { label: 'Allergies', value: '—' },
    { label: 'Visual acuity (L/R)', value: '—' },
    { label: 'Mental health status', value: '—' }
  ]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await patientAPI.getProfile();
        const pdata = profile?.data || profile;

        // Prefer DB fields from profile; fallback to vitals array if present
        const vitals = Array.isArray(pdata?.vitals) ? pdata.vitals : [];
        const findVital = (code) => {
          const v = vitals.find((x) => x.code === code);
          return v ? (v.value || '') : '';
        };

        const height = pdata?.height ?? findVital('height');
        const weight = pdata?.weight ?? findVital('weight');
        const bmi = pdata?.bmi ?? findVital('bmi');
        const bpSis = pdata?.blood_pressure_systolic ?? '';
        const bpDia = pdata?.blood_pressure_diastolic ?? '';
        const bpRaw = (bpSis || bpDia) ? `${bpSis || '—'}/${bpDia || '—'}` : (findVital('blood_pressure') || '');
        const bp = bpRaw && bpRaw !== '—' && !bpRaw.includes('mmHg') ? `${bpRaw} mmHg` : bpRaw;
        const allergies = Array.isArray(pdata?.allergies) ? pdata.allergies.join(', ') : '—';

        // Format values with units if they're numbers
        const formatHeight = (val) => {
          if (!val || val === '—') return '—';
          if (typeof val === 'number') return `${val} cm`;
          if (typeof val === 'string' && val.includes('cm')) return val;
          return `${val} cm`;
        };
        const formatWeight = (val) => {
          if (!val || val === '—') return '—';
          if (typeof val === 'number') return `${val} kg`;
          if (typeof val === 'string' && val.includes('kg')) return val;
          return `${val} kg`;
        };
        const formatBMI = (val) => {
          if (!val || val === '—') return '—';
          return typeof val === 'number' ? val.toFixed(1) : val;
        };

        setBodyInfo([
          { label: t('patientDashboard.bodyInfoHeight'), value: formatHeight(height) },
          { label: t('patientDashboard.bodyInfoWeight'), value: formatWeight(weight) },
          { label: t('patientDashboard.bodyInfoBMI'), value: formatBMI(bmi) },
          { label: t('patientDashboard.bodyInfoFatPercent'), value: '—' },
          { label: t('patientDashboard.bodyInfoBloodPressure'), value: bp || '—' },
          { label: t('patientDashboard.bodyInfoReach'), value: '—' },
          { label: t('patientDashboard.bodyInfoBloodGroup'), value: pdata?.blood_group || pdata?.blood_type || '—' },
          { label: t('patientDashboard.bodyInfoBloodRh'), value: pdata?.rh_factor || pdata?.blood_rh || '—' },
          { label: t('patientDashboard.bodyInfoAllergies'), value: allergies || '—' },
          { label: t('patientDashboard.bodyInfoVisualAcuity'), value: '—' },
          { label: t('patientDashboard.bodyInfoMentalHealth'), value: '—' }
        ]);

        const summary = await patientRecordsAPI.summary();
        const sdata = summary?.data || summary;
        setUpcoming(Array.isArray(sdata?.upcoming_appointments) ? sdata.upcoming_appointments : []);

        // Load active prescriptions
        try {
          const prescriptionsData = await patientPrescriptionsAPI.list({ scope: 'active', page: 1, size: 10 });
          const prescriptionsList = prescriptionsData?.items || prescriptionsData?.data || [];
          
          // Format prescriptions for display
          const formattedPrescriptions = prescriptionsList.map((prescription) => {
            // Parse end date - handle different formats (DD.MM.YYYY, YYYY-MM-DD, etc.)
            let endDate = null;
            let daysUntilEnd = null;
            if (prescription.endDate) {
              try {
                // Try parsing DD.MM.YYYY format first (common in backend)
                if (prescription.endDate.includes('.')) {
                  const [day, month, year] = prescription.endDate.split('.');
                  endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else {
                  endDate = new Date(prescription.endDate);
                }
                if (!isNaN(endDate.getTime())) {
                  daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                }
              } catch (e) {
                console.warn('Failed to parse end date:', prescription.endDate);
              }
            }
            
            // Determine priority based on end date (high if expiring within 7 days)
            const priority = daysUntilEnd !== null && daysUntilEnd <= 7 && daysUntilEnd >= 0 ? 'high' : 'normal';
            
            // Format subtitle with dosage and frequency
            const subtitleParts = [];
            if (prescription.dosage) subtitleParts.push(prescription.dosage);
            if (prescription.frequency) subtitleParts.push(prescription.frequency);
            if (endDate && !isNaN(endDate.getTime())) {
              const endDateFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              subtitleParts.push(`Until ${endDateFormatted}`);
            }
            const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : prescription.description || prescription.purpose || '';

            return {
              id: prescription.id || prescription.medicineName,
              title: prescription.medicineName || prescription.knownAs || 'Unknown Medication',
              subtitle: subtitle,
              priority: priority
            };
          });
          
          setPrescriptions(formattedPrescriptions);
        } catch (prescriptionError) {
          console.error('Failed to load prescriptions:', prescriptionError);
          setPrescriptions([]);
        }
      } catch (e) {
        // Handle authentication errors and redirect if needed
        if (handlePatientAuthError(e)) {
          return; // Redirected, exit early
        }
        
        setError(e?.message || t('patientDashboard.failedToLoadDashboard'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}
        {/* Main Layout: Flexbox like Doctor Dashboard */}
        <div className="flex gap-6">
          {/* Left Sidebar - Calendar and Prescriptions (1 part) */}
          <div className="w-80 flex-shrink-0 space-y-6">
            {/* Calendar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label={t('patientDashboard.previousMonth')}
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label={t('patientDashboard.nextMonth')}
                >
                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
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
                  <div key={`${day}-${idx}`} className="text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 py-1 sm:py-2">
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
                      ${day === null ? '' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30'}
                      ${day && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear() && day === today.getDate() ? 'bg-emerald-400 dark:bg-emerald-600 text-white font-semibold' : 'text-gray-700 dark:text-gray-300'}
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">{t('patientDashboard.prescriptionsReminder')}</h3>
              <div className="space-y-3 sm:space-y-4">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-400 dark:bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                        {(prescription.title || 'M')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base">{prescription.title}</div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prescription.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                        prescription.priority === 'high' ? 'bg-red-400 dark:bg-red-500' : 'bg-yellow-400 dark:bg-yellow-500'
                      }`} />
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                ))}
                {prescriptions.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('patientDashboard.noPrescriptionReminders')}</div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row justify-between mt-3 sm:mt-4 space-y-2 sm:space-y-0 sm:space-x-2">
                <button className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs sm:text-sm">
                  {t('patientDashboard.info')}
                </button>
                <button className="px-3 sm:px-4 py-2 bg-emerald-400 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 dark:hover:bg-emerald-700 transition-colors text-xs sm:text-sm">
                  {t('patientDashboard.lookUp')}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area - Body Info (2 parts) */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">{t('patientDashboard.bodyInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {bodyInfo.map((info, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <span className="text-gray-600 dark:text-gray-300 font-medium text-sm sm:text-base mb-1 sm:mb-0">{info.label}</span>
                    <span className="text-gray-800 dark:text-gray-100 font-semibold text-sm sm:text-base">{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - TABIB.AI (1 part) */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-4 sm:p-6 flex flex-col h-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">TABIB.AI</h3>
              <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 overflow-y-auto min-h-[220px] max-h-[600px]">
                <div className="text-gray-500 dark:text-gray-400 text-center text-sm sm:text-base">
                  {t('patientDashboard.startConversationWithAI')}
                </div>
              </div>
              <div className="flex space-x-2 mt-auto">
                <input
                  type="text"
                  placeholder={t('patientDashboard.messageTabib')}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-600 focus:border-transparent text-sm sm:text-base"
                />
                <button className="bg-emerald-400 dark:bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-500 dark:hover:bg-emerald-700 transition-colors flex-shrink-0">
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
