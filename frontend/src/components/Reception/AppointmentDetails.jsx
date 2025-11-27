import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReceptionistHeader } from './ReceptionHeader';
import { FiArrowLeft, FiPrinter, FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiFileText, FiMapPin } from 'react-icons/fi';
import { receptionAPI } from '../../services/apiService';

const AppointmentDetails = () => {
  const { t } = useTranslation();
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

  useEffect(() => {
    const loadAppointment = async () => {
      try {
        setLoading(true);
        const data = await receptionAPI.getAppointmentDetails(appointmentId);
        setAppointment(data);
      } catch (e) {
        console.error('Failed to load appointment details', e);
        setError(e.message || t('failedToLoadAppointmentDetails'));
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      loadAppointment();
    }
  }, [appointmentId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
      }`}>
        <ReceptionistHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
              darkMode ? 'border-[#79CAC2]' : 'border-[#4DB6B0]'
            }`}></div>
            <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('loadingAppointmentDetails')}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
      }`}>
        <ReceptionistHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className={`rounded-xl p-6 shadow-sm border text-center transition-colors ${
            darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
          }`}>
            <p className={`mb-4 ${
              darkMode ? 'text-red-400' : 'text-red-600'
            }`}>{error || t('appointmentNotFound')}</p>
            <button
              onClick={() => navigate('/reception/appointments')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
              }`}
            >
              {t('backToAppointments')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <ReceptionistHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* Action Buttons - Hidden when printing */}
        <div className="mb-6 print:hidden flex items-center justify-between">
          <button
            onClick={() => navigate('/reception/appointments')}
            className={`flex items-center gap-2 transition-colors ${
              darkMode
                ? 'text-[#C1D9DD] hover:text-[#79CAC2]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiArrowLeft className="text-sm" />
            <span className="text-sm font-medium">{t('backToAppointments')}</span>
          </button>
          <button
            onClick={handlePrint}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
            }`}
          >
            <FiPrinter className="text-sm" />
            <span>{t('print')}</span>
          </button>
        </div>

        {/* Appointment Details Card - Print-friendly */}
        <div className={`rounded-xl shadow-lg border p-6 sm:p-8 print:shadow-none print:border-2 transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`text-center mb-8 pb-6 border-b-2 transition-colors ${
            darkMode ? 'border-[#133037]' : 'border-gray-200'
          }`}>
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('appointmentConfirmation')}</h1>
            {appointment.clinic_name && (
              <p className={`text-lg font-semibold ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{appointment.clinic_name}</p>
            )}
          </div>

          {/* Appointment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Date & Time */}
            <div className={`rounded-lg p-4 transition-colors ${
              darkMode ? 'bg-[#07181D]' : 'bg-blue-50'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <FiCalendar className={`text-xl ${
                  darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
                }`} />
                <h3 className={`font-semibold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('date')}</h3>
              </div>
              <p className={`text-lg ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{appointment.appointment_date}</p>
            </div>

            <div className={`rounded-lg p-4 transition-colors ${
              darkMode ? 'bg-[#07181D]' : 'bg-blue-50'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <FiClock className={`text-xl ${
                  darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
                }`} />
                <h3 className={`font-semibold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('time')}</h3>
              </div>
              <p className={`text-lg ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{appointment.appointment_time}</p>
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('duration')}: {appointment.duration_minutes} {t('minutes')}</p>
            </div>
          </div>

          {/* Patient Information */}
          <div className={`rounded-lg p-6 mb-6 transition-colors ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>
              <FiUser className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
              {t('patientInformation')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-sm mb-1 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>{t('patientName')}</p>
                <p className={`text-lg font-semibold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{appointment.patient_name}</p>
              </div>
              {appointment.patient_email && (
                <div>
                  <p className={`text-sm mb-1 flex items-center gap-1 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>
                    <FiMail className="text-xs" />
                    {t('email')}
                  </p>
                  <p className={`text-lg ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{appointment.patient_email}</p>
                </div>
              )}
              {appointment.patient_phone && (
                <div>
                  <p className={`text-sm mb-1 flex items-center gap-1 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>
                    <FiPhone className="text-xs" />
                    {t('phone')}
                  </p>
                  <p className={`text-lg ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{appointment.patient_phone}</p>
                </div>
              )}
              {appointment.patient_id && (
                <div>
                  <p className={`text-sm mb-1 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>{t('patientId')}</p>
                  <p className={`text-lg font-mono ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{appointment.patient_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Information */}
          <div className={`rounded-lg p-6 mb-6 transition-colors ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>
              <FiUser className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
              {t('doctorInformation')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-sm mb-1 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>{t('doctorName')}</p>
                <p className={`text-lg font-semibold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{appointment.doctor_name}</p>
              </div>
              {appointment.doctor_specialty && (
                <div>
                  <p className={`text-sm mb-1 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>{t('specialty')}</p>
                  <p className={`text-lg ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{appointment.doctor_specialty}</p>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="mb-6">
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>
              <FiFileText className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
              {t('appointmentDetails')}
            </h2>
            <div className="space-y-4">
              <div>
                <p className={`text-sm mb-1 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>{t('appointmentType')}</p>
                <p className={`text-lg font-semibold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{appointment.appointment_type}</p>
              </div>
              <div>
                <p className={`text-sm mb-1 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>{t('status')}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  appointment.status === 'completed' 
                    ? darkMode ? 'bg-[#062412] text-[#4ADE80]' : 'bg-green-100 text-green-800'
                    : appointment.status === 'confirmed' || appointment.status === 'booked'
                      ? darkMode ? 'bg-[#07181D] text-[#79CAC2]' : 'bg-blue-100 text-blue-800'
                      : appointment.status === 'pending'
                        ? darkMode ? 'bg-[#251F07] text-[#FACC15]' : 'bg-yellow-100 text-yellow-800'
                        : darkMode ? 'bg-[#07181D] text-[#C1D9DD]' : 'bg-gray-100 text-gray-800'
                }`}>
                  {t(appointment.status) || (appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1))}
                </span>
              </div>
              {appointment.reason && (
                <div>
                  <p className={`text-sm mb-1 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>{t('reasonForVisit')}</p>
                  <p className={`text-lg ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{appointment.reason}</p>
                </div>
              )}
              {appointment.notes && (
                <div>
                  <p className={`text-sm mb-1 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>{t('notes')}</p>
                  <p className={`text-lg whitespace-pre-wrap ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{appointment.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Report Content - Display detailed report information */}
          {appointment.report_content && (() => {
            // Helper function to parse JSON strings
            const parseJson = (value) => {
              if (!value) return null;
              if (typeof value === 'string') {
                try {
                  return JSON.parse(value);
                } catch {
                  return value;
                }
              }
              return value;
            };

            // Helper function to format assessment
            const formatAssessment = (assessment) => {
              if (!assessment) return null;
              const parsed = parseJson(assessment);
              if (typeof parsed === 'string') return parsed;
              
              const result = [];
              if (parsed.working && Array.isArray(parsed.working) && parsed.working.length > 0) {
                result.push(
                  <div key="working" className="mb-3">
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('workingDiagnoses')}:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.working.map((diag, idx) => (
                        <li key={idx} className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                          {diag.term || diag.code || JSON.stringify(diag)}
                          {diag.code && <span className={`text-sm ml-2 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>({diag.code})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              if (parsed.ddx && Array.isArray(parsed.ddx) && parsed.ddx.length > 0) {
                result.push(
                  <div key="ddx" className="mb-3">
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('differentialDiagnoses')}:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.ddx.map((diag, idx) => (
                        <li key={idx} className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                          {diag.term || diag.code || JSON.stringify(diag)}
                          {diag.code && <span className={`text-sm ml-2 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>({diag.code})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return result.length > 0 ? result : null;
            };

            // Helper function to format plan
            const formatPlan = (plan) => {
              if (!plan) return null;
              const parsed = parseJson(plan);
              if (typeof parsed === 'string') return parsed;
              
              const result = [];
              
              if (parsed.med_changes && Array.isArray(parsed.med_changes) && parsed.med_changes.length > 0) {
                result.push(
                  <div key="medications" className="mb-4">
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('medications')}:</h4>
                    <div className={`rounded-lg border p-4 transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <table className="min-w-full">
                        <thead>
                          <tr className={`border-b transition-colors ${
                            darkMode ? 'border-[#133037]' : 'border-gray-200'
                          }`}>
                            <th className={`text-left py-2 px-3 text-sm font-semibold ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{t('medication')}</th>
                            <th className={`text-left py-2 px-3 text-sm font-semibold ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{t('dose')}</th>
                            <th className={`text-left py-2 px-3 text-sm font-semibold ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{t('route')}</th>
                            <th className={`text-left py-2 px-3 text-sm font-semibold ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{t('frequency')}</th>
                            <th className={`text-left py-2 px-3 text-sm font-semibold ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{t('duration')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.med_changes.map((med, idx) => (
                            <tr key={idx} className={`border-b transition-colors ${
                              darkMode ? 'border-[#133037]' : 'border-gray-100'
                            }`}>
                              <td className={`py-2 px-3 ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{med.med || t('notAvailable')}</td>
                              <td className={`py-2 px-3 ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{med.dose || t('notAvailable')}</td>
                              <td className={`py-2 px-3 ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{med.route || t('notAvailable')}</td>
                              <td className={`py-2 px-3 ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{med.freq || t('notAvailable')}</td>
                              <td className={`py-2 px-3 ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{med.duration || t('notAvailable')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsed.med_changes.some(m => m.instructions) && (
                        <div className={`mt-3 pt-3 border-t transition-colors ${
                          darkMode ? 'border-[#133037]' : 'border-gray-200'
                        }`}>
                          <h5 className={`font-semibold mb-1 text-sm ${
                            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                          }`}>{t('instructions')}:</h5>
                          {parsed.med_changes.map((med, idx) => (
                            med.instructions && (
                              <p key={idx} className={`text-sm mb-1 ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                              }`}>
                                <span className="font-medium">{med.med}:</span> {med.instructions}
                              </p>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              
              if (parsed.tests && Array.isArray(parsed.tests) && parsed.tests.length > 0) {
                result.push(
                  <div key="tests" className="mb-3">
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('testsOrdered')}:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.tests.map((test, idx) => (
                        <li key={idx} className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                          {typeof test === 'string' ? test : JSON.stringify(test)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              
              if (parsed.referrals && Array.isArray(parsed.referrals) && parsed.referrals.length > 0) {
                result.push(
                  <div key="referrals" className="mb-3">
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('referrals')}:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.referrals.map((ref, idx) => (
                        <li key={idx} className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                          {typeof ref === 'string' ? ref : JSON.stringify(ref)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              
              if (parsed.lifestyle && Array.isArray(parsed.lifestyle) && parsed.lifestyle.length > 0) {
                result.push(
                  <div key="lifestyle" className="mb-3">
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('lifestyleRecommendations')}:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.lifestyle.map((item, idx) => (
                        <li key={idx} className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                          {typeof item === 'string' ? item : JSON.stringify(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              
              return result.length > 0 ? result : null;
            };

            // Helper function to format content JSON
            const formatContent = (content) => {
              if (!content) return null;
              const parsed = parseJson(content);
              if (typeof parsed === 'string') {
                try {
                  return JSON.parse(parsed);
                } catch {
                  return content;
                }
              }
              return parsed;
            };

            const formattedContent = formatContent(appointment.report_content.content);
            const formattedAssessment = formatAssessment(appointment.report_content.assessment);
            const formattedPlan = formatPlan(appointment.report_content.plan);

            return (
              <div className={`rounded-lg p-6 mb-6 transition-colors ${
                darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
              }`}>
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>
                  <FiFileText className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                  {t('reportDetails')}
                </h2>
                <div className="space-y-6">
                  {/* Chief Complaint */}
                  {(appointment.report_content.chief_complaint || (formattedContent && formattedContent.chief_complaint)) && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('chiefComplaint')}</h3>
                      <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                        {appointment.report_content.chief_complaint || formattedContent.chief_complaint}
                      </p>
                    </div>
                  )}

                  {/* Subjective */}
                  {appointment.report_content.subjective && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('subjective')}</h3>
                      <p className={`whitespace-pre-wrap ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{appointment.report_content.subjective}</p>
                    </div>
                  )}

                  {/* Objective */}
                  {appointment.report_content.objective && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('objective')}</h3>
                      <p className={`whitespace-pre-wrap ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{appointment.report_content.objective}</p>
                    </div>
                  )}

                  {/* Assessment - Formatted */}
                  {(formattedAssessment || appointment.report_content.assessment) && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-3 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('assessment')}</h3>
                      {formattedAssessment ? (
                        <div>{formattedAssessment}</div>
                      ) : (
                        <p className={`whitespace-pre-wrap ${
                          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                        }`}>{appointment.report_content.assessment}</p>
                      )}
                    </div>
                  )}

                  {/* Plan - Formatted */}
                  {(formattedPlan || appointment.report_content.plan) && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-3 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('plan')}</h3>
                      {formattedPlan ? (
                        <div>{formattedPlan}</div>
                      ) : (
                        <p className={`whitespace-pre-wrap ${
                          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                        }`}>{appointment.report_content.plan}</p>
                      )}
                    </div>
                  )}

                  {/* Lab Report Content */}
                  {appointment.report_content.title && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('reportTitle')}</h3>
                      <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                        {appointment.report_content.title}
                      </p>
                    </div>
                  )}
                  {appointment.report_content.summary && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('summary')}</h3>
                      <p className={`whitespace-pre-wrap ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{appointment.report_content.summary}</p>
                    </div>
                  )}
                  {appointment.report_content.lab_results && appointment.report_content.lab_results.length > 0 && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-3 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('labResults')}</h3>
                      <div className="overflow-x-auto">
                        <table className={`min-w-full border transition-colors ${
                          darkMode ? 'border-[#133037]' : 'border-gray-300'
                        }`}>
                          <thead className={darkMode ? 'bg-[#07181D]' : 'bg-gray-200'}>
                            <tr>
                              <th className={`px-4 py-2 text-left text-sm font-semibold border transition-colors ${
                                darkMode 
                                  ? 'text-[#C1D9DD] border-[#133037]' 
                                  : 'text-gray-700 border-gray-300'
                              }`}>{t('testName')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-semibold border transition-colors ${
                                darkMode 
                                  ? 'text-[#C1D9DD] border-[#133037]' 
                                  : 'text-gray-700 border-gray-300'
                              }`}>{t('value')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-semibold border transition-colors ${
                                darkMode 
                                  ? 'text-[#C1D9DD] border-[#133037]' 
                                  : 'text-gray-700 border-gray-300'
                              }`}>{t('unit')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-semibold border transition-colors ${
                                darkMode 
                                  ? 'text-[#C1D9DD] border-[#133037]' 
                                  : 'text-gray-700 border-gray-300'
                              }`}>{t('referenceRange')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-semibold border transition-colors ${
                                darkMode 
                                  ? 'text-[#C1D9DD] border-[#133037]' 
                                  : 'text-gray-700 border-gray-300'
                              }`}>{t('status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {appointment.report_content.lab_results.map((result, idx) => (
                              <tr key={idx} className={darkMode ? 'bg-[#0D2026]' : 'bg-white'}>
                                <td className={`px-4 py-2 border transition-colors ${
                                  darkMode 
                                    ? 'text-[#C1D9DD] border-[#133037]' 
                                    : 'text-gray-700 border-gray-300'
                                }`}>{result.test_name || t('notAvailable')}</td>
                                <td className={`px-4 py-2 border transition-colors ${
                                  darkMode 
                                    ? 'text-[#C1D9DD] border-[#133037]' 
                                    : 'text-gray-700 border-gray-300'
                                }`}>{result.value || t('notAvailable')}</td>
                                <td className={`px-4 py-2 border transition-colors ${
                                  darkMode 
                                    ? 'text-[#C1D9DD] border-[#133037]' 
                                    : 'text-gray-700 border-gray-300'
                                }`}>{result.unit || t('notAvailable')}</td>
                                <td className={`px-4 py-2 border transition-colors ${
                                  darkMode 
                                    ? 'text-[#C1D9DD] border-[#133037]' 
                                    : 'text-gray-700 border-gray-300'
                                }`}>{result.reference_range || t('notAvailable')}</td>
                                <td className={`px-4 py-2 border transition-colors ${
                                  darkMode ? 'border-[#133037]' : 'border-gray-300'
                                }`}>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    result.abnormality === 'normal' 
                                      ? darkMode ? 'bg-[#062412] text-[#4ADE80]' : 'bg-green-100 text-green-800'
                                      : result.abnormality === 'abnormal'
                                        ? darkMode ? 'bg-[#2A0E15] text-[#FB7185]' : 'bg-red-100 text-red-800'
                                        : darkMode ? 'bg-[#07181D] text-[#C1D9DD]' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {result.abnormality || t('notAvailable')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {appointment.report_content.lab_results.some(r => r.interpretation) && (
                        <div className="mt-4">
                          <h4 className={`font-semibold mb-2 ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                          }`}>{t('interpretation')}</h4>
                          {appointment.report_content.lab_results.map((result, idx) => (
                            result.interpretation && (
                              <p key={idx} className={`mb-2 whitespace-pre-wrap ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{result.interpretation}</p>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visit Summary */}
                  {(appointment.report_content.visit_summary || (formattedContent && formattedContent.summary)) && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('visitSummary')}</h3>
                      <p className={`whitespace-pre-wrap ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{appointment.report_content.visit_summary || formattedContent.summary}</p>
                    </div>
                  )}

                  {/* Additional Content Fields (if content is JSON, show key fields) */}
                  {formattedContent && typeof formattedContent === 'object' && (
                    <div className={`rounded-lg p-4 border transition-colors ${
                      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
                    }`}>
                      <h3 className={`font-semibold mb-3 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('additionalInformation')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formattedContent.bloodPressure && (
                          <div>
                            <p className={`text-sm mb-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>{t('bloodPressure')}</p>
                            <p className={`font-medium ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{formattedContent.bloodPressure}</p>
                          </div>
                        )}
                        {formattedContent.temperature && (
                          <div>
                            <p className={`text-sm mb-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>{t('temperature')}</p>
                            <p className={`font-medium ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{formattedContent.temperature}°C</p>
                          </div>
                        )}
                        {formattedContent.weight && (
                          <div>
                            <p className={`text-sm mb-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>{t('weight')}</p>
                            <p className={`font-medium ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{formattedContent.weight} kg</p>
                          </div>
                        )}
                        {formattedContent.height && (
                          <div>
                            <p className={`text-sm mb-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>{t('height')}</p>
                            <p className={`font-medium ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{formattedContent.height} cm</p>
                          </div>
                        )}
                        {formattedContent.bmi && (
                          <div>
                            <p className={`text-sm mb-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>BMI</p>
                            <p className={`font-medium ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                            }`}>{formattedContent.bmi}</p>
                          </div>
                        )}
                        {formattedContent.allergies && (
                          <div className="md:col-span-2">
                            <p className={`text-sm mb-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>{t('allergies')}</p>
                            <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                              {formattedContent.allergies}
                            </p>
                          </div>
                        )}
                        {formattedContent.currentMedications && (
                          <div className="md:col-span-2">
                            <p className={`text-sm mb-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>{t('currentMedications')}</p>
                            <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                              {formattedContent.currentMedications}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Clinic Information */}
          {(appointment.clinic_name || appointment.clinic_address || appointment.clinic_phone) && (
            <div className={`rounded-lg p-6 mb-6 transition-colors ${
              darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
            }`}>
              <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>
                <FiMapPin className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                {t('clinicInformation')}
              </h2>
              <div className="space-y-2">
                {appointment.clinic_name && (
                  <p className={`text-lg font-semibold ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{appointment.clinic_name}</p>
                )}
                {appointment.clinic_address && (
                  <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>
                    {appointment.clinic_address}
                  </p>
                )}
                {appointment.clinic_phone && (
                  <p className={`flex items-center gap-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>
                    <FiPhone className="text-xs" />
                    {appointment.clinic_phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={`mt-8 pt-6 border-t-2 text-center text-sm transition-colors ${
            darkMode ? 'border-[#133037] text-[#8AA2A7]' : 'border-gray-200 text-gray-500'
          }`}>
            <p>{t('appointmentId')}: {appointment.appointment_id}</p>
            <p className="mt-2">{t('pleaseArrive10MinutesBefore')}</p>
            <p className="mt-1">{t('ifYouNeedToRescheduleOrCancel')}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-2 {
            border-width: 2px !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default AppointmentDetails;

