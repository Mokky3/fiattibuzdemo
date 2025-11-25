import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { ArrowLeft, Printer, Download, FileText, Calendar, User, Building2, Monitor, Eye } from 'lucide-react';
import { patientRecordsAPI, patientPrescriptionsAPI } from '../../services/apiService';
import SpecialtyReportView from './SpecialtyReportView';

// Reusable Section Component
const Section = ({ title, content, italic = false }) => {
  if (!content) return null;
  return (
    <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
      <h3 className="text-md font-bold text-emerald-400 mb-2">{title}</h3>
      <p className={`text-gray-800 whitespace-pre-line ${italic ? 'italic' : ''}`}>
        {content || 'No data available'}
      </p>
    </div>
  );
};

const RecordSummary = () => {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setLoading(true);
        
        // First, try to get record from location state (passed from Records page)
        let recordData = null;
        if (location.state?.record) {
          const stateRecord = location.state.record;
          // Try to fetch full details from API
          try {
            recordData = await patientRecordsAPI.get(recordId);
            setRecord(recordData);
          } catch (apiError) {
            // If API fails, use state record
            console.warn('Failed to fetch full record details, using state record:', apiError);
            recordData = stateRecord;
            setRecord(stateRecord);
          }
        } else {
          // Fetch from API
          recordData = await patientRecordsAPI.get(recordId);
          setRecord(recordData);
        }
        
        // Fetch medications for this record date
        if (recordData?.date) {
          try {
            const result = await patientPrescriptionsAPI.list({ scope: 'all', page: 1, size: 100 });
            const recordDate = recordData.date;
            if (result?.items) {
              // Filter medications prescribed on or around the record date
              const recordMedications = result.items.filter(med => {
                const medDate = med.prescribedDate;
                if (!medDate) return false;
                // Check if medication date matches record date (format: YYYY-MM-DD or DD.MM.YYYY)
                const normalizedMedDate = medDate.includes('.') 
                  ? medDate.split('.').reverse().join('-') 
                  : medDate;
                return normalizedMedDate.startsWith(recordDate) || normalizedMedDate === recordDate;
              });
              setMedications(recordMedications);
            }
          } catch (err) {
            console.warn('Error fetching medications:', err);
            setMedications([]);
          }
        }
      } catch (err) {
        console.error('Error fetching record:', err);
        setError('Unable to load record');
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      fetchRecord();
    } else {
      setError('No record ID provided');
      setLoading(false);
    }
  }, [recordId, location.state]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      await patientRecordsAPI.download(recordId);
    } catch (err) {
      console.error('Error downloading record:', err);
      alert('Failed to download record. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-gray-500">Loading record...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-red-500 mb-4">{error || 'Record not found'}</div>
            <button
              onClick={() => navigate('/patient/records')}
              className="px-4 py-2 bg-emerald-400 text-white rounded-md hover:bg-emerald-500 transition-colors"
            >
              Back to Records
            </button>
          </div>
        </div>
      </div>
    );
  }

  const detailedNotes = record?.detailedNotes || {};
  const isSOAPNote = detailedNotes.note_type && (detailedNotes.subjective || detailedNotes.objective || detailedNotes.assessment || detailedNotes.plan);
  const isGeneralReport = detailedNotes.report_type || detailedNotes.chief_complaint;
  
  // Detect specialty from doc_type or reportData
  const docType = detailedNotes.doc_type || detailedNotes.reportData?.doc_type || detailedNotes.template_data?.doc_type;
  const reportData = detailedNotes.reportData || detailedNotes.template_data || {};
  
  // Transform record to match ViewReport format for specialty views
  const reportForSpecialtyView = {
    ...record,
    reportData: reportData,
    doc_type: docType,
    specialty: docType?.startsWith('oph.') ? 'Ophthalmology' :
               docType?.startsWith('neu.') ? 'Neurology' :
               docType?.startsWith('trauma.') ? 'Traumatology' :
               docType?.startsWith('midwifery.') || docType?.startsWith('gynecology.') ? 'Midwifery' :
               docType?.startsWith('uro.') ? 'Urology' :
               docType?.startsWith('onc.') ? 'Oncology' :
               docType?.startsWith('cardiology.') ? 'Cardiology' :
               docType?.startsWith('allergy.') ? 'Allergy & Immunology' : null,
    chiefComplaint: detailedNotes.chief_complaint || record.summary,
    historyOfPresentIllness: detailedNotes.hpi || detailedNotes.hpi_free_text,
    physicalExamination: detailedNotes.physical_examination,
    diagnosis: detailedNotes.diagnosis,
    treatmentPlan: detailedNotes.treatment_plan || detailedNotes.plan
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-emerald-400 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/patient/records')}
              className="text-white hover:text-gray-100 flex items-center transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Records
            </button>
            <h1 className="text-xl font-bold text-white">Record Summary</h1>
            <div className="flex items-center space-x-2">
              {/* View in PACS button - only show for imaging records */}
              {(() => {
                // Check if this is an imaging record with study data
                const attachments = record?.attachments || [];
                const radiologyStudy = attachments.find(att => att.type === 'radiology_study');
                const studyInstanceUID = radiologyStudy?.studyInstanceUID;
                
                if (studyInstanceUID) {
                  return (
                    <button
                      onClick={() => {
                        navigate('/patient/pacs', {
                          state: {
                            studyInstanceUID: studyInstanceUID,
                            orthancStudyId: radiologyStudy?.orthancStudyId
                          }
                        });
                      }}
                      className="bg-white text-emerald-400 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center"
                    >
                      <Monitor className="h-5 w-5 mr-2" />
                      View in PACS
                    </button>
                  );
                }
                return null;
              })()}
              <button
                onClick={handleDownload}
                className="bg-white text-emerald-400 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center"
              >
                <Download className="h-5 w-5 mr-2" />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="bg-white text-emerald-400 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center"
              >
                <Printer className="h-5 w-5 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:px-0 print:py-0 print:max-w-none">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Record Header */}
          <div className="bg-gradient-to-r from-emerald-400/10 to-emerald-400/20 border-b-2 border-emerald-400 px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 mr-2 text-emerald-400" />
                  {record.title || record.recordType || 'Medical Record'}
                </h2>
                <p className="text-md text-gray-700 mt-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date: {record.date}
                </p>
              </div>
              <div className="mt-4 md:mt-0 text-right bg-white p-4 rounded-lg shadow-sm border border-emerald-400/20">
                <p className="font-bold text-emerald-400 flex items-center justify-end">
                  <User className="h-4 w-4 mr-2" />
                  {record.doctor || 'Unknown Doctor'}
                </p>
                <p className="text-md text-gray-700 mt-1 flex items-center justify-end">
                  <Building2 className="h-4 w-4 mr-2" />
                  {record.hospital || 'General Clinic'}
                </p>
              </div>
            </div>
          </div>

          {/* Record Sections */}
          <div className="px-6 py-6 space-y-6">
            {/* Vitals Section - Display at the beginning */}
            {(() => {
              const detailedNotes = record?.detailedNotes || {};
              const vitals = detailedNotes.vitals || detailedNotes.reportData?.vitals || {};
              const hasVitals = vitals && typeof vitals === 'object' && Object.keys(vitals).length > 0 && 
                (vitals.bp_right || vitals.bp_left || vitals.hr || vitals.temp || vitals.spo2 || 
                 vitals.weight || vitals.height || vitals.bmi || vitals.respiratory_rate);
              
              if (!hasVitals) return null;
              
              return (
                <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                  <h3 className="text-md font-bold text-emerald-400 mb-2">Vitals</h3>
                  <div className="text-gray-800 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {vitals.bp_right && <p><strong>BP Right:</strong> {vitals.bp_right}</p>}
                    {vitals.bp_left && <p><strong>BP Left:</strong> {vitals.bp_left}</p>}
                    {vitals.hr && <p><strong>Heart Rate:</strong> {vitals.hr} bpm</p>}
                    {vitals.temp && <p><strong>Temperature:</strong> {vitals.temp}°C</p>}
                    {vitals.spo2 && <p><strong>SpO2:</strong> {vitals.spo2}%</p>}
                    {vitals.respiratory_rate && <p><strong>Respiratory Rate:</strong> {vitals.respiratory_rate} /min</p>}
                    {vitals.weight && <p><strong>Weight:</strong> {vitals.weight} kg</p>}
                    {vitals.height && <p><strong>Height:</strong> {vitals.height} cm</p>}
                    {vitals.bmi && <p><strong>BMI:</strong> {vitals.bmi}</p>}
                  </div>
                </div>
              );
            })()}
            
            {/* Report Metadata */}
            {(detailedNotes.report_code || detailedNotes.report_type || detailedNotes.status) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Report Information</h3>
                <div className="text-gray-800 space-y-1">
                  {detailedNotes.report_code && <p><strong>Report Code:</strong> {detailedNotes.report_code}</p>}
                  {detailedNotes.report_type && <p><strong>Report Type:</strong> {detailedNotes.report_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                  {detailedNotes.status && <p><strong>Status:</strong> {detailedNotes.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                </div>
              </div>
            )}
            
            {/* Specialty-specific report view if doc_type is present */}
            {docType && reportData && Object.keys(reportData).length > 0 ? (
              <SpecialtyReportView 
                report={reportForSpecialtyView} 
                docType={docType}
                specialty={reportForSpecialtyView.specialty}
                medications={medications}
              />
            ) : (
              <>
                {/* Chief Complaint */}
                {detailedNotes.chief_complaint && (
                  <Section title="Chief Complaint" content={detailedNotes.chief_complaint} />
                )}

            {/* History of Present Illness (HPI) */}
            {(detailedNotes.hpi || detailedNotes.hpi_free_text) && (
              <Section title="History of Present Illness" content={detailedNotes.hpi || detailedNotes.hpi_free_text || 'No data available'} />
            )}

            {/* HPI Details (if available) */}
            {(detailedNotes.hpi_onset || detailedNotes.hpi_duration || detailedNotes.hpi_course || detailedNotes.onset_time || detailedNotes.info_source || detailedNotes.hpi_modifiers || detailedNotes.hpi_associated_symptoms) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">History of Present Illness Details</h3>
                <div className="text-gray-800 space-y-2">
                  {detailedNotes.onset_time && <p><strong>Onset Time:</strong> {detailedNotes.onset_time}</p>}
                  {detailedNotes.info_source && <p><strong>Information Source:</strong> {detailedNotes.info_source}</p>}
                  {detailedNotes.hpi_onset && <p><strong>Onset:</strong> {detailedNotes.hpi_onset}</p>}
                  {detailedNotes.hpi_duration && <p><strong>Duration:</strong> {detailedNotes.hpi_duration}</p>}
                  {detailedNotes.hpi_course && <p><strong>Course:</strong> {detailedNotes.hpi_course}</p>}
                  {detailedNotes.hpi_modifiers && Array.isArray(detailedNotes.hpi_modifiers) && detailedNotes.hpi_modifiers.length > 0 && (
                    <p><strong>Modifiers:</strong> {detailedNotes.hpi_modifiers.join(', ')}</p>
                  )}
                  {detailedNotes.hpi_associated_symptoms && Array.isArray(detailedNotes.hpi_associated_symptoms) && detailedNotes.hpi_associated_symptoms.length > 0 && (
                    <p><strong>Associated Symptoms:</strong> {detailedNotes.hpi_associated_symptoms.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Past Medical History */}
            {(detailedNotes.past_medical_history || detailedNotes.pmh_conditions || detailedNotes.pmh_surgeries) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Past Medical History</h3>
                <div className="text-gray-800 whitespace-pre-line">
                  {detailedNotes.past_medical_history ? (
                    <p>{detailedNotes.past_medical_history}</p>
                  ) : (
                    <>
                      {detailedNotes.pmh_conditions && (
                        <p><strong>Conditions:</strong> {Array.isArray(detailedNotes.pmh_conditions) ? detailedNotes.pmh_conditions.join(', ') : detailedNotes.pmh_conditions}</p>
                      )}
                      {detailedNotes.pmh_surgeries && (
                        <p><strong>Surgeries:</strong> {detailedNotes.pmh_surgeries}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Family History */}
            {(detailedNotes.family_history || detailedNotes.fh_cardio || detailedNotes.fh_diabetes || detailedNotes.fh_cancer || detailedNotes.fh_notes) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Family History</h3>
                <div className="text-gray-800 whitespace-pre-line">
                  {detailedNotes.family_history ? (
                    <p>{detailedNotes.family_history}</p>
                  ) : (
                    <div className="space-y-1">
                      {detailedNotes.fh_cardio && <p><strong>Cardiovascular:</strong> {detailedNotes.fh_cardio}</p>}
                      {detailedNotes.fh_diabetes && <p><strong>Diabetes:</strong> {detailedNotes.fh_diabetes}</p>}
                      {detailedNotes.fh_cancer && <p><strong>Cancer:</strong> {detailedNotes.fh_cancer}</p>}
                      {detailedNotes.fh_notes && <p><strong>Notes:</strong> {detailedNotes.fh_notes}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Social History */}
            {(detailedNotes.social_history || detailedNotes.social_smoking || detailedNotes.social_audit_c !== undefined || detailedNotes.social_exercise) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Social History</h3>
                <div className="text-gray-800">
                  {detailedNotes.social_history ? (
                    <p className="whitespace-pre-line">{detailedNotes.social_history}</p>
                  ) : (
                    <div className="space-y-1">
                      {detailedNotes.social_smoking && <p><strong>Smoking:</strong> {detailedNotes.social_smoking}</p>}
                      {detailedNotes.social_audit_c !== undefined && detailedNotes.social_audit_c !== null && (
                        <p><strong>AUDIT-C Score:</strong> {detailedNotes.social_audit_c}</p>
                      )}
                      {detailedNotes.social_exercise && <p><strong>Exercise:</strong> {detailedNotes.social_exercise}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SOAP Format Sections (for Clinical Notes) */}
            {isSOAPNote && (
              <>
                {detailedNotes.subjective && (
                  <Section title="Subjective" content={detailedNotes.subjective} />
                )}
                {detailedNotes.objective && (
                  <Section title="Objective" content={detailedNotes.objective} />
                )}
                {detailedNotes.assessment && (
                  <Section 
                    title="Assessment" 
                    content={typeof detailedNotes.assessment === 'string' && detailedNotes.assessment.trim().startsWith('{') 
                      ? (() => {
                          try {
                            const parsed = JSON.parse(detailedNotes.assessment);
                            if (parsed.working && Array.isArray(parsed.working)) {
                              const working = parsed.working.map(d => 
                                typeof d === 'object' ? `${d.code || ''} ${d.term || ''}`.trim() : String(d)
                              ).filter(d => d).join(', ');
                              const ddx = parsed.ddx && Array.isArray(parsed.ddx) ? parsed.ddx.map(d => 
                                typeof d === 'object' ? `${d.code || ''} ${d.term || ''}`.trim() : String(d)
                              ).filter(d => d).join(', ') : '';
                              return `Working Diagnosis: ${working || 'None'}\n${ddx ? `Differential Diagnoses: ${ddx}` : ''}`.trim();
                            }
                            return detailedNotes.assessment;
                          } catch {
                            return detailedNotes.assessment;
                          }
                        })()
                      : detailedNotes.assessment} 
                  />
                )}
                {detailedNotes.plan && (
                  <Section 
                    title="Plan" 
                    content={typeof detailedNotes.plan === 'string' && detailedNotes.plan.trim().startsWith('{')
                      ? (() => {
                          try {
                            const parsed = JSON.parse(detailedNotes.plan);
                            const parts = [];
                            if (parsed.tests && Array.isArray(parsed.tests) && parsed.tests.length > 0) {
                              parts.push(`Tests: ${parsed.tests.map(t => typeof t === 'object' ? (t.name || t.label || JSON.stringify(t)) : t).join(', ')}`);
                            }
                            if (parsed.referrals && Array.isArray(parsed.referrals) && parsed.referrals.length > 0) {
                              parts.push(`Referrals: ${parsed.referrals.map(r => typeof r === 'object' ? (r.specialty || r.name || JSON.stringify(r)) : r).join(', ')}`);
                            }
                            if (parsed.med_changes && Array.isArray(parsed.med_changes) && parsed.med_changes.length > 0) {
                              parts.push(`Medication Changes: ${parsed.med_changes.map(m => typeof m === 'object' ? (m.med || m.name || JSON.stringify(m)) : m).join(', ')}`);
                            }
                            if (parsed.lifestyle && Array.isArray(parsed.lifestyle) && parsed.lifestyle.length > 0) {
                              parts.push(`Lifestyle: ${parsed.lifestyle.map(l => typeof l === 'object' ? (l.recommendation || l.name || JSON.stringify(l)) : l).join(', ')}`);
                            }
                            if (parsed.follow_up) {
                              parts.push(`Follow-up: ${parsed.follow_up}`);
                            }
                            return parts.length > 0 ? parts.join('\n') : 'No plan specified';
                          } catch {
                            return detailedNotes.plan;
                          }
                        })()
                      : detailedNotes.plan} 
                  />
                )}
              </>
            )}

            {/* Physical Examination */}
            {(detailedNotes.physical_examination || detailedNotes.pe_notes || detailedNotes.pe_general || detailedNotes.pe_lungs || detailedNotes.pe_heart || detailedNotes.pe_abdomen || detailedNotes.pe_neuro || detailedNotes.pe_extremities) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Physical Examination</h3>
                <div className="text-gray-800">
                  {detailedNotes.physical_examination ? (
                    <p className="whitespace-pre-line">{detailedNotes.physical_examination}</p>
                  ) : (
                    <div className="space-y-2">
                      {(detailedNotes.pe_general || detailedNotes.pe_lungs || detailedNotes.pe_heart || detailedNotes.pe_abdomen || detailedNotes.pe_neuro || detailedNotes.pe_extremities) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {detailedNotes.pe_general && <p><strong>General:</strong> {detailedNotes.pe_general}</p>}
                          {detailedNotes.pe_lungs && <p><strong>Lungs:</strong> {detailedNotes.pe_lungs}</p>}
                          {detailedNotes.pe_heart && <p><strong>Heart:</strong> {detailedNotes.pe_heart}</p>}
                          {detailedNotes.pe_abdomen && <p><strong>Abdomen:</strong> {detailedNotes.pe_abdomen}</p>}
                          {detailedNotes.pe_neuro && <p><strong>Neurological:</strong> {detailedNotes.pe_neuro}</p>}
                          {detailedNotes.pe_extremities && <p><strong>Extremities:</strong> {detailedNotes.pe_extremities}</p>}
                        </div>
                      )}
                      {detailedNotes.pe_notes && (
                        <div className="mt-2">
                          {typeof detailedNotes.pe_notes === 'object' ? (
                            <div className="space-y-1">
                              {Object.entries(detailedNotes.pe_notes).map(([key, value]) => (
                                value && <p key={key}><strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="whitespace-pre-line">{detailedNotes.pe_notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review of Systems */}
            {(detailedNotes.review_of_systems || detailedNotes.ros_notes || detailedNotes.ros_respiratory || detailedNotes.ros_cardio || detailedNotes.ros_gi || detailedNotes.ros_neuro || detailedNotes.ros_gu || detailedNotes.ros_derm || detailedNotes.ros_ent || detailedNotes.ros_msk) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Review of Systems</h3>
                <div className="text-gray-800 space-y-2">
                  {detailedNotes.review_of_systems ? (
                    <p className="whitespace-pre-line">{detailedNotes.review_of_systems}</p>
                  ) : typeof detailedNotes.ros_notes === 'object' ? (
                    <div className="space-y-2">
                      {Object.entries(detailedNotes.ros_notes).map(([key, value]) => (
                        value && <p key={key}><strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}</p>
                      ))}
                    </div>
                  ) : detailedNotes.ros_notes ? (
                    <p className="whitespace-pre-line">{detailedNotes.ros_notes}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {detailedNotes.ros_respiratory && detailedNotes.ros_respiratory !== 'normal' && (
                        <p><strong>Respiratory:</strong> {detailedNotes.ros_respiratory}</p>
                      )}
                      {detailedNotes.ros_cardio && detailedNotes.ros_cardio !== 'normal' && (
                        <p><strong>Cardiovascular:</strong> {detailedNotes.ros_cardio}</p>
                      )}
                      {detailedNotes.ros_gi && detailedNotes.ros_gi !== 'normal' && (
                        <p><strong>Gastrointestinal:</strong> {detailedNotes.ros_gi}</p>
                      )}
                      {detailedNotes.ros_neuro && detailedNotes.ros_neuro !== 'normal' && (
                        <p><strong>Neurological:</strong> {detailedNotes.ros_neuro}</p>
                      )}
                      {detailedNotes.ros_gu && detailedNotes.ros_gu !== 'normal' && (
                        <p><strong>Genitourinary:</strong> {detailedNotes.ros_gu}</p>
                      )}
                      {detailedNotes.ros_derm && detailedNotes.ros_derm !== 'normal' && (
                        <p><strong>Dermatological:</strong> {detailedNotes.ros_derm}</p>
                      )}
                      {detailedNotes.ros_ent && detailedNotes.ros_ent !== 'normal' && (
                        <p><strong>ENT:</strong> {detailedNotes.ros_ent}</p>
                      )}
                      {detailedNotes.ros_msk && detailedNotes.ros_msk !== 'normal' && (
                        <p><strong>Musculoskeletal:</strong> {detailedNotes.ros_msk}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {(detailedNotes.diagnosis || detailedNotes.working_diagnoses) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Diagnosis</h3>
                <div className="text-gray-800 whitespace-pre-line">
                  {detailedNotes.diagnosis ? (
                    <p>{detailedNotes.diagnosis}</p>
                  ) : Array.isArray(detailedNotes.working_diagnoses) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {detailedNotes.working_diagnoses.map((diag, index) => (
                        <li key={index}>
                          {typeof diag === 'object' ? (
                            <span>
                              {diag.code && <span className="font-mono text-sm">{diag.code}</span>}
                              {diag.code && diag.term && ' - '}
                              {diag.term || ''}
                            </span>
                          ) : (
                            <span>{diag}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{String(detailedNotes.working_diagnoses || 'No diagnosis available')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Differential Diagnoses */}
            {detailedNotes.differential_diagnoses && Array.isArray(detailedNotes.differential_diagnoses) && detailedNotes.differential_diagnoses.length > 0 && (
              <div className="bg-white p-4 border-l-4 border-blue-400/60 shadow-sm">
                <h3 className="text-md font-bold text-blue-400 mb-2">Differential Diagnoses</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-800">
                  {detailedNotes.differential_diagnoses.map((diag, index) => (
                    <li key={index}>
                      {typeof diag === 'object' ? (
                        <span>
                          {diag.code && <span className="font-mono text-sm">{diag.code}</span>}
                          {diag.code && diag.term && ' - '}
                          {diag.term || ''}
                        </span>
                      ) : (
                        <span>{diag}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Treatment Plan (only show if not already shown in Plan section for SOAP notes) */}
            {!isSOAPNote && (detailedNotes.treatment_plan || detailedNotes.plan_tests || detailedNotes.plan_referrals || detailedNotes.plan_med_changes || detailedNotes.plan_lifestyle || detailedNotes.plan_follow_up) && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Treatment Plan</h3>
                <div className="text-gray-800">
                  {detailedNotes.treatment_plan ? (
                    <p className="whitespace-pre-line">{detailedNotes.treatment_plan}</p>
                  ) : (
                    <div className="space-y-3">
                      {detailedNotes.plan_tests && Array.isArray(detailedNotes.plan_tests) && detailedNotes.plan_tests.length > 0 && (
                        <div>
                          <strong>Tests Ordered:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_tests.map((test, index) => (
                              <li key={index}>{typeof test === 'object' ? test.name || JSON.stringify(test) : test}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_referrals && Array.isArray(detailedNotes.plan_referrals) && detailedNotes.plan_referrals.length > 0 && (
                        <div>
                          <strong>Referrals:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_referrals.map((ref, index) => (
                              <li key={index}>{typeof ref === 'object' ? ref.specialty || JSON.stringify(ref) : ref}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_med_changes && Array.isArray(detailedNotes.plan_med_changes) && detailedNotes.plan_med_changes.length > 0 && (
                        <div>
                          <strong>Medication Changes:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_med_changes.map((med, index) => (
                              <li key={index}>{typeof med === 'object' ? med.name || JSON.stringify(med) : med}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_lifestyle && Array.isArray(detailedNotes.plan_lifestyle) && detailedNotes.plan_lifestyle.length > 0 && (
                        <div>
                          <strong>Lifestyle Recommendations:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_lifestyle.map((rec, index) => (
                              <li key={index}>{typeof rec === 'object' ? rec.recommendation || JSON.stringify(rec) : rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_follow_up && (
                        <div>
                          <strong>Follow-up:</strong> {detailedNotes.plan_follow_up}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visit Summary */}
            {detailedNotes.visit_summary && (
              <Section title="Visit Summary" content={detailedNotes.visit_summary} />
            )}

            {/* Prescribed Medications - Display at the end */}
            {medications && medications.length > 0 && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-3">Prescribed Medications</h3>
                <div className="text-gray-800 space-y-4">
                  {medications.map((med, index) => (
                    <div key={med.id || index} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{med.medicineName || med.knownAs || 'Unknown Medication'}</p>
                          {med.knownAs && med.knownAs !== med.medicineName && (
                            <p className="text-sm text-gray-600 italic">({med.knownAs})</p>
                          )}
                          {med.purpose && (
                            <p className="text-sm text-gray-600 mt-1">{med.purpose}</p>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          {med.dosage && <p><strong>Dosage:</strong> {med.dosage}</p>}
                          {med.frequency && <p><strong>Frequency:</strong> {med.frequency}</p>}
                          {med.prescribedDate && <p><strong>Prescribed:</strong> {med.prescribedDate}</p>}
                          {med.endDate && <p><strong>End Date:</strong> {med.endDate}</p>}
                          {med.remainingRefills !== undefined && med.remainingRefills > 0 && (
                            <p><strong>Remaining Refills:</strong> {med.remainingRefills}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {detailedNotes.plan_follow_up && (
              <div className="bg-white p-4 border-l-4 border-emerald-400/80 shadow-sm">
                <h3 className="text-md font-bold text-emerald-400 mb-2">Follow-up</h3>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-emerald-400/10 p-3 rounded-md">
                  <p className="text-gray-800 font-medium">{detailedNotes.plan_follow_up || 'No follow-up reason specified'}</p>
                </div>
              </div>
            )}

            {/* General Summary/Description (fallback) */}
            {record.summary && !detailedNotes.chief_complaint && !detailedNotes.subjective && (
              <Section title="Summary" content={record.summary} />
            )}

            {/* Additional Notes */}
            {record.notes && !detailedNotes && (
              <Section title="Additional Notes" content={record.notes} italic />
            )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 print:hidden">
            <div className="flex justify-end">
              <button
                onClick={() => navigate('/patient/records')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back to Records
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordSummary;
