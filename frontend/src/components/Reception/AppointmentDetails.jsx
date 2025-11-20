import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReceptionistHeader } from './ReceptionHeader';
import { FiArrowLeft, FiPrinter, FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiFileText, FiMapPin } from 'react-icons/fi';
import { receptionAPI } from '../../services/apiService';

const AppointmentDetails = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAppointment = async () => {
      try {
        setLoading(true);
        const data = await receptionAPI.getAppointmentDetails(appointmentId);
        setAppointment(data);
      } catch (e) {
        console.error('Failed to load appointment details', e);
        setError(e.message || 'Failed to load appointment details');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <ReceptionistHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <ReceptionistHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <p className="text-red-600 mb-4">{error || 'Appointment not found'}</p>
            <button
              onClick={() => navigate('/reception/appointments')}
              className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* Action Buttons - Hidden when printing */}
        <div className="mb-6 print:hidden flex items-center justify-between">
          <button
            onClick={() => navigate('/reception/appointments')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FiArrowLeft className="text-sm" />
            <span className="text-sm font-medium">Back to Appointments</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiPrinter className="text-sm" />
            <span>Print</span>
          </button>
        </div>

        {/* Appointment Details Card - Print-friendly */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 print:shadow-none print:border-2">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Appointment Confirmation</h1>
            {appointment.clinic_name && (
              <p className="text-lg text-gray-700 font-semibold">{appointment.clinic_name}</p>
            )}
          </div>

          {/* Appointment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Date & Time */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <FiCalendar className="text-[#4DB6B0] text-xl" />
                <h3 className="font-semibold text-gray-900">Date</h3>
              </div>
              <p className="text-gray-700 text-lg">{appointment.appointment_date}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <FiClock className="text-[#4DB6B0] text-xl" />
                <h3 className="font-semibold text-gray-900">Time</h3>
              </div>
              <p className="text-gray-700 text-lg">{appointment.appointment_time}</p>
              <p className="text-sm text-gray-500 mt-1">Duration: {appointment.duration_minutes} minutes</p>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiUser className="text-[#4DB6B0]" />
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Patient Name</p>
                <p className="text-lg font-semibold text-gray-900">{appointment.patient_name}</p>
              </div>
              {appointment.patient_email && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <FiMail className="text-xs" />
                    Email
                  </p>
                  <p className="text-lg text-gray-900">{appointment.patient_email}</p>
                </div>
              )}
              {appointment.patient_phone && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <FiPhone className="text-xs" />
                    Phone
                  </p>
                  <p className="text-lg text-gray-900">{appointment.patient_phone}</p>
                </div>
              )}
              {appointment.patient_id && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Patient ID</p>
                  <p className="text-lg text-gray-900 font-mono">{appointment.patient_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Information */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiUser className="text-[#4DB6B0]" />
              Doctor Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Doctor Name</p>
                <p className="text-lg font-semibold text-gray-900">{appointment.doctor_name}</p>
              </div>
              {appointment.doctor_specialty && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Specialty</p>
                  <p className="text-lg text-gray-900">{appointment.doctor_specialty}</p>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiFileText className="text-[#4DB6B0]" />
              Appointment Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Appointment Type</p>
                <p className="text-lg text-gray-900 font-semibold">{appointment.appointment_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'confirmed' || appointment.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
              </div>
              {appointment.reason && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reason for Visit</p>
                  <p className="text-lg text-gray-900">{appointment.reason}</p>
                </div>
              )}
              {appointment.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-lg text-gray-900 whitespace-pre-wrap">{appointment.notes}</p>
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
                    <h4 className="font-semibold text-gray-700 mb-2">Working Diagnoses:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.working.map((diag, idx) => (
                        <li key={idx} className="text-gray-700">
                          {diag.term || diag.code || JSON.stringify(diag)}
                          {diag.code && <span className="text-gray-500 text-sm ml-2">({diag.code})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              if (parsed.ddx && Array.isArray(parsed.ddx) && parsed.ddx.length > 0) {
                result.push(
                  <div key="ddx" className="mb-3">
                    <h4 className="font-semibold text-gray-700 mb-2">Differential Diagnoses:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.ddx.map((diag, idx) => (
                        <li key={idx} className="text-gray-700">
                          {diag.term || diag.code || JSON.stringify(diag)}
                          {diag.code && <span className="text-gray-500 text-sm ml-2">({diag.code})</span>}
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
                    <h4 className="font-semibold text-gray-700 mb-2">Medications:</h4>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Medication</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Dose</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Route</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Frequency</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.med_changes.map((med, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-2 px-3 text-gray-700">{med.med || 'N/A'}</td>
                              <td className="py-2 px-3 text-gray-700">{med.dose || 'N/A'}</td>
                              <td className="py-2 px-3 text-gray-700">{med.route || 'N/A'}</td>
                              <td className="py-2 px-3 text-gray-700">{med.freq || 'N/A'}</td>
                              <td className="py-2 px-3 text-gray-700">{med.duration || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsed.med_changes.some(m => m.instructions) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h5 className="font-semibold text-gray-700 mb-1 text-sm">Instructions:</h5>
                          {parsed.med_changes.map((med, idx) => (
                            med.instructions && (
                              <p key={idx} className="text-gray-600 text-sm mb-1">
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
                    <h4 className="font-semibold text-gray-700 mb-2">Tests Ordered:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.tests.map((test, idx) => (
                        <li key={idx} className="text-gray-700">{typeof test === 'string' ? test : JSON.stringify(test)}</li>
                      ))}
                    </ul>
                  </div>
                );
              }
              
              if (parsed.referrals && Array.isArray(parsed.referrals) && parsed.referrals.length > 0) {
                result.push(
                  <div key="referrals" className="mb-3">
                    <h4 className="font-semibold text-gray-700 mb-2">Referrals:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.referrals.map((ref, idx) => (
                        <li key={idx} className="text-gray-700">{typeof ref === 'string' ? ref : JSON.stringify(ref)}</li>
                      ))}
                    </ul>
                  </div>
                );
              }
              
              if (parsed.lifestyle && Array.isArray(parsed.lifestyle) && parsed.lifestyle.length > 0) {
                result.push(
                  <div key="lifestyle" className="mb-3">
                    <h4 className="font-semibold text-gray-700 mb-2">Lifestyle Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {parsed.lifestyle.map((item, idx) => (
                        <li key={idx} className="text-gray-700">{typeof item === 'string' ? item : JSON.stringify(item)}</li>
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
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiFileText className="text-[#4DB6B0]" />
                  Report Details
                </h2>
                <div className="space-y-6">
                  {/* Chief Complaint */}
                  {(appointment.report_content.chief_complaint || (formattedContent && formattedContent.chief_complaint)) && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-2">Chief Complaint</h3>
                      <p className="text-gray-700">{appointment.report_content.chief_complaint || formattedContent.chief_complaint}</p>
                    </div>
                  )}

                  {/* Subjective */}
                  {appointment.report_content.subjective && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-2">Subjective</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{appointment.report_content.subjective}</p>
                    </div>
                  )}

                  {/* Objective */}
                  {appointment.report_content.objective && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-2">Objective</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{appointment.report_content.objective}</p>
                    </div>
                  )}

                  {/* Assessment - Formatted */}
                  {(formattedAssessment || appointment.report_content.assessment) && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-3">Assessment</h3>
                      {formattedAssessment ? (
                        <div>{formattedAssessment}</div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">{appointment.report_content.assessment}</p>
                      )}
                    </div>
                  )}

                  {/* Plan - Formatted */}
                  {(formattedPlan || appointment.report_content.plan) && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-3">Plan</h3>
                      {formattedPlan ? (
                        <div>{formattedPlan}</div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">{appointment.report_content.plan}</p>
                      )}
                    </div>
                  )}

                  {/* Lab Report Content */}
                  {appointment.report_content.title && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-2">Report Title</h3>
                      <p className="text-gray-700">{appointment.report_content.title}</p>
                    </div>
                  )}
                  {appointment.report_content.summary && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{appointment.report_content.summary}</p>
                    </div>
                  )}
                  {appointment.report_content.lab_results && appointment.report_content.lab_results.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-3">Lab Results</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-300">Test Name</th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-300">Value</th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-300">Unit</th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-300">Reference Range</th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {appointment.report_content.lab_results.map((result, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="px-4 py-2 border border-gray-300 text-gray-700">{result.test_name || 'N/A'}</td>
                                <td className="px-4 py-2 border border-gray-300 text-gray-700">{result.value || 'N/A'}</td>
                                <td className="px-4 py-2 border border-gray-300 text-gray-700">{result.unit || 'N/A'}</td>
                                <td className="px-4 py-2 border border-gray-300 text-gray-700">{result.reference_range || 'N/A'}</td>
                                <td className="px-4 py-2 border border-gray-300">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    result.abnormality === 'normal' ? 'bg-green-100 text-green-800' :
                                    result.abnormality === 'abnormal' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {result.abnormality || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {appointment.report_content.lab_results.some(r => r.interpretation) && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-800 mb-2">Interpretation</h4>
                          {appointment.report_content.lab_results.map((result, idx) => (
                            result.interpretation && (
                              <p key={idx} className="text-gray-700 mb-2 whitespace-pre-wrap">{result.interpretation}</p>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visit Summary */}
                  {(appointment.report_content.visit_summary || (formattedContent && formattedContent.summary)) && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-2">Visit Summary</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{appointment.report_content.visit_summary || formattedContent.summary}</p>
                    </div>
                  )}

                  {/* Additional Content Fields (if content is JSON, show key fields) */}
                  {formattedContent && typeof formattedContent === 'object' && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-3">Additional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formattedContent.bloodPressure && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Blood Pressure</p>
                            <p className="text-gray-700 font-medium">{formattedContent.bloodPressure}</p>
                          </div>
                        )}
                        {formattedContent.temperature && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Temperature</p>
                            <p className="text-gray-700 font-medium">{formattedContent.temperature}°C</p>
                          </div>
                        )}
                        {formattedContent.weight && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Weight</p>
                            <p className="text-gray-700 font-medium">{formattedContent.weight} kg</p>
                          </div>
                        )}
                        {formattedContent.height && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Height</p>
                            <p className="text-gray-700 font-medium">{formattedContent.height} cm</p>
                          </div>
                        )}
                        {formattedContent.bmi && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">BMI</p>
                            <p className="text-gray-700 font-medium">{formattedContent.bmi}</p>
                          </div>
                        )}
                        {formattedContent.allergies && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600 mb-1">Allergies</p>
                            <p className="text-gray-700">{formattedContent.allergies}</p>
                          </div>
                        )}
                        {formattedContent.currentMedications && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600 mb-1">Current Medications</p>
                            <p className="text-gray-700">{formattedContent.currentMedications}</p>
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
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiMapPin className="text-[#4DB6B0]" />
                Clinic Information
              </h2>
              <div className="space-y-2">
                {appointment.clinic_name && (
                  <p className="text-lg text-gray-900 font-semibold">{appointment.clinic_name}</p>
                )}
                {appointment.clinic_address && (
                  <p className="text-gray-700">{appointment.clinic_address}</p>
                )}
                {appointment.clinic_phone && (
                  <p className="text-gray-700 flex items-center gap-1">
                    <FiPhone className="text-xs" />
                    {appointment.clinic_phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200 text-center text-sm text-gray-500">
            <p>Appointment ID: {appointment.appointment_id}</p>
            <p className="mt-2">Please arrive 10 minutes before your scheduled appointment time.</p>
            <p className="mt-1">If you need to reschedule or cancel, please contact the clinic at least 24 hours in advance.</p>
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

