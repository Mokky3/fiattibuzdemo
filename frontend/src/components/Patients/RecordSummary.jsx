import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import { ArrowLeft, Printer, Download, FileText, Calendar, User, Building2, Monitor, Eye } from 'lucide-react';
import { patientRecordsAPI, patientPrescriptionsAPI } from '../../services/apiService';
import SpecialtyReportView from './SpecialtyReportView';

// Reusable Section Component
const Section = ({ title, content, italic = false, darkMode = false, t }) => {
  if (!content) return null;
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
      <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{title}</h3>
      <p className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} whitespace-pre-line ${italic ? 'italic' : ''}`}>
        {content || (t ? t('recordSummary.noDataAvailable') : 'No data available')}
      </p>
    </div>
  );
};

const RecordSummary = () => {
  const { t } = useTranslation();
  const { recordId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medications, setMedications] = useState([]);

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
        setError(t('recordSummary.errorLoadFailed'));
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      fetchRecord();
    } else {
      setError(t('recordSummary.errorNoRecordId'));
      setLoading(false);
    }
  }, [recordId, location.state, t]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      await patientRecordsAPI.download(recordId);
    } catch (err) {
      console.error('Error downloading record:', err);
      alert(t('recordSummary.errorDownloadFailed'));
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-8 text-center`}>
            <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{t('recordSummary.loadingRecord')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-8 text-center`}>
            <div className={`mb-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>{error || t('recordSummary.recordNotFound')}</div>
            <button
              onClick={() => navigate('/patient/records')}
              className={`px-4 py-2 rounded-md transition-colors ${
                darkMode 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-emerald-400 hover:bg-emerald-500'
              } text-white`}
            >
              {t('recordSummary.backToRecords')}
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
    <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
      <Navbar />
      
      {/* Header */}
      <div className={`${darkMode ? 'bg-emerald-700' : 'bg-emerald-400'} text-white shadow-md print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/patient/records')}
              className="text-white hover:text-gray-100 flex items-center transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('recordSummary.backToRecords')}
            </button>
            <h1 className="text-xl font-bold text-white">{t('recordSummary.recordSummary')}</h1>
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
                      className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} text-emerald-400 px-4 py-2 rounded-md transition-colors flex items-center`}
                    >
                      <Monitor className="h-5 w-5 mr-2" />
                      {t('recordSummary.viewInPACS')}
                    </button>
                  );
                }
                return null;
              })()}
              <button
                onClick={handleDownload}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} text-emerald-400 px-4 py-2 rounded-md transition-colors flex items-center`}
              >
                <Download className="h-5 w-5 mr-2" />
                {t('recordSummary.download')}
              </button>
              <button
                onClick={handlePrint}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} text-emerald-400 px-4 py-2 rounded-md transition-colors flex items-center`}
              >
                <Printer className="h-5 w-5 mr-2" />
                {t('recordSummary.print')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:px-0 print:py-0 print:max-w-none">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} rounded-lg overflow-hidden print:shadow-none print:rounded-none`}>
          {/* Record Header */}
          <div className={`bg-gradient-to-r ${darkMode ? 'from-emerald-600/20 to-emerald-600/30' : 'from-emerald-400/10 to-emerald-400/20'} border-b-2 ${darkMode ? 'border-emerald-500' : 'border-emerald-400'} px-6 py-6`}>
            <div className="flex flex-col md:flex-row justify-between items-start">
              <div>
                <h2 className={`text-xl font-bold flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  <FileText className={`h-6 w-6 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`} />
                  {record.title || record.recordType || t('recordSummary.medicalRecord')}
                </h2>
                <p className={`text-md mt-2 flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('recordSummary.date')}: {record.date}
                </p>
              </div>
              <div className={`mt-4 md:mt-0 text-right p-4 rounded-lg shadow-sm border ${darkMode ? 'bg-gray-700 border-emerald-500/30' : 'bg-white border-emerald-400/20'}`}>
                <p className={`font-bold flex items-center justify-end ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>
                  <User className="h-4 w-4 mr-2" />
                  {record.doctor || t('recordSummary.unknownDoctor')}
                </p>
                <p className={`text-md mt-1 flex items-center justify-end ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Building2 className="h-4 w-4 mr-2" />
                  {record.hospital || t('recordSummary.generalClinic')}
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
                <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                  <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.vitals')}</h3>
                  <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {vitals.bp_right && <p><strong>{t('recordSummary.bpRight')}:</strong> {vitals.bp_right}</p>}
                    {vitals.bp_left && <p><strong>{t('recordSummary.bpLeft')}:</strong> {vitals.bp_left}</p>}
                    {vitals.hr && <p><strong>{t('recordSummary.heartRate')}:</strong> {vitals.hr} {t('recordSummary.bpm')}</p>}
                    {vitals.temp && <p><strong>{t('recordSummary.temperature')}:</strong> {vitals.temp}°C</p>}
                    {vitals.spo2 && <p><strong>{t('recordSummary.spo2')}:</strong> {vitals.spo2}%</p>}
                    {vitals.respiratory_rate && <p><strong>{t('recordSummary.respiratoryRate')}:</strong> {vitals.respiratory_rate} {t('recordSummary.perMin')}</p>}
                    {vitals.weight && <p><strong>{t('recordSummary.weight')}:</strong> {vitals.weight} {t('recordSummary.kg')}</p>}
                    {vitals.height && <p><strong>{t('recordSummary.height')}:</strong> {vitals.height} {t('recordSummary.cm')}</p>}
                    {vitals.bmi && <p><strong>{t('recordSummary.bmi')}:</strong> {vitals.bmi}</p>}
                  </div>
                </div>
              );
            })()}
            
            {/* Report Metadata */}
            {(detailedNotes.report_code || detailedNotes.report_type || detailedNotes.status) && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.reportInformation')}</h3>
                <div className={`space-y-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {detailedNotes.report_code && <p><strong>{t('recordSummary.reportCode')}:</strong> {detailedNotes.report_code}</p>}
                  {detailedNotes.report_type && <p><strong>{t('recordSummary.reportType')}:</strong> {detailedNotes.report_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                  {detailedNotes.status && <p><strong>{t('recordSummary.status')}:</strong> {detailedNotes.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
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
                  <Section title={t('recordSummary.chiefComplaint')} content={detailedNotes.chief_complaint} darkMode={darkMode} t={t} />
                )}

            {/* History of Present Illness (HPI) */}
            {(detailedNotes.hpi || detailedNotes.hpi_free_text) && (
              <Section title={t('recordSummary.historyOfPresentIllness')} content={detailedNotes.hpi || detailedNotes.hpi_free_text || t('recordSummary.noDataAvailable')} darkMode={darkMode} t={t} />
            )}

            {/* HPI Details (if available) */}
            {(detailedNotes.hpi_onset || detailedNotes.hpi_duration || detailedNotes.hpi_course || detailedNotes.onset_time || detailedNotes.info_source || detailedNotes.hpi_modifiers || detailedNotes.hpi_associated_symptoms) && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.hpiDetails')}</h3>
                <div className={`space-y-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {detailedNotes.onset_time && <p><strong>{t('recordSummary.onsetTime')}:</strong> {detailedNotes.onset_time}</p>}
                  {detailedNotes.info_source && <p><strong>{t('recordSummary.informationSource')}:</strong> {detailedNotes.info_source}</p>}
                  {detailedNotes.hpi_onset && <p><strong>{t('recordSummary.onset')}:</strong> {detailedNotes.hpi_onset}</p>}
                  {detailedNotes.hpi_duration && <p><strong>{t('recordSummary.duration')}:</strong> {detailedNotes.hpi_duration}</p>}
                  {detailedNotes.hpi_course && <p><strong>{t('recordSummary.course')}:</strong> {detailedNotes.hpi_course}</p>}
                  {detailedNotes.hpi_modifiers && Array.isArray(detailedNotes.hpi_modifiers) && detailedNotes.hpi_modifiers.length > 0 && (
                    <p><strong>{t('recordSummary.modifiers')}:</strong> {detailedNotes.hpi_modifiers.join(', ')}</p>
                  )}
                  {detailedNotes.hpi_associated_symptoms && Array.isArray(detailedNotes.hpi_associated_symptoms) && detailedNotes.hpi_associated_symptoms.length > 0 && (
                    <p><strong>{t('recordSummary.associatedSymptoms')}:</strong> {detailedNotes.hpi_associated_symptoms.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Past Medical History */}
            {(detailedNotes.past_medical_history || detailedNotes.pmh_conditions || detailedNotes.pmh_surgeries) && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.pastMedicalHistory')}</h3>
                <div className={`whitespace-pre-line ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {detailedNotes.past_medical_history ? (
                    <p>{detailedNotes.past_medical_history}</p>
                  ) : (
                    <>
                      {detailedNotes.pmh_conditions && (
                        <p><strong>{t('recordSummary.conditions')}:</strong> {Array.isArray(detailedNotes.pmh_conditions) ? detailedNotes.pmh_conditions.join(', ') : detailedNotes.pmh_conditions}</p>
                      )}
                      {detailedNotes.pmh_surgeries && (
                        <p><strong>{t('recordSummary.surgeries')}:</strong> {detailedNotes.pmh_surgeries}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Family History */}
            {(detailedNotes.family_history || detailedNotes.fh_cardio || detailedNotes.fh_diabetes || detailedNotes.fh_cancer || detailedNotes.fh_notes) && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.familyHistory')}</h3>
                <div className={`whitespace-pre-line ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {detailedNotes.family_history ? (
                    <p>{detailedNotes.family_history}</p>
                  ) : (
                    <div className="space-y-1">
                      {detailedNotes.fh_cardio && <p><strong>{t('recordSummary.cardiovascular')}:</strong> {detailedNotes.fh_cardio}</p>}
                      {detailedNotes.fh_diabetes && <p><strong>{t('recordSummary.diabetes')}:</strong> {detailedNotes.fh_diabetes}</p>}
                      {detailedNotes.fh_cancer && <p><strong>{t('recordSummary.cancer')}:</strong> {detailedNotes.fh_cancer}</p>}
                      {detailedNotes.fh_notes && <p><strong>{t('recordSummary.notes')}:</strong> {detailedNotes.fh_notes}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Social History */}
            {(detailedNotes.social_history || detailedNotes.social_smoking || detailedNotes.social_audit_c !== undefined || detailedNotes.social_exercise) && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.socialHistory')}</h3>
                <div className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                  {detailedNotes.social_history ? (
                    <p className="whitespace-pre-line">{detailedNotes.social_history}</p>
                  ) : (
                    <div className="space-y-1">
                      {detailedNotes.social_smoking && <p><strong>{t('recordSummary.smoking')}:</strong> {detailedNotes.social_smoking}</p>}
                      {detailedNotes.social_audit_c !== undefined && detailedNotes.social_audit_c !== null && (
                        <p><strong>{t('recordSummary.auditCScore')}:</strong> {detailedNotes.social_audit_c}</p>
                      )}
                      {detailedNotes.social_exercise && <p><strong>{t('recordSummary.exercise')}:</strong> {detailedNotes.social_exercise}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SOAP Format Sections (for Clinical Notes) */}
            {isSOAPNote && (
              <>
                {detailedNotes.subjective && (
                  <Section title={t('recordSummary.subjective')} content={detailedNotes.subjective} darkMode={darkMode} t={t} />
                )}
                {detailedNotes.objective && (
                  <Section title={t('recordSummary.objective')} content={detailedNotes.objective} darkMode={darkMode} t={t} />
                )}
                {detailedNotes.assessment && (
                  <Section 
                    title={t('recordSummary.assessment')} 
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
                              return `${t('recordSummary.workingDiagnosis')}: ${working || t('recordSummary.none')}\n${ddx ? `${t('recordSummary.differentialDiagnoses')}: ${ddx}` : ''}`.trim();
                            }
                            return detailedNotes.assessment;
                          } catch {
                            return detailedNotes.assessment;
                          }
                        })()
                      : detailedNotes.assessment}
                    darkMode={darkMode}
                    t={t}
                  />
                )}
                {detailedNotes.plan && (
                  <Section 
                    title={t('recordSummary.plan')} 
                    content={typeof detailedNotes.plan === 'string' && detailedNotes.plan.trim().startsWith('{')
                      ? (() => {
                          try {
                            const parsed = JSON.parse(detailedNotes.plan);
                            const parts = [];
                            if (parsed.tests && Array.isArray(parsed.tests) && parsed.tests.length > 0) {
                              parts.push(`${t('recordSummary.tests')}: ${parsed.tests.map(test => typeof test === 'object' ? (test.name || test.label || JSON.stringify(test)) : test).join(', ')}`);
                            }
                            if (parsed.referrals && Array.isArray(parsed.referrals) && parsed.referrals.length > 0) {
                              parts.push(`${t('recordSummary.referrals')}: ${parsed.referrals.map(r => typeof r === 'object' ? (r.specialty || r.name || JSON.stringify(r)) : r).join(', ')}`);
                            }
                            if (parsed.med_changes && Array.isArray(parsed.med_changes) && parsed.med_changes.length > 0) {
                              parts.push(`${t('recordSummary.medicationChanges')}: ${parsed.med_changes.map(m => typeof m === 'object' ? (m.med || m.name || JSON.stringify(m)) : m).join(', ')}`);
                            }
                            if (parsed.lifestyle && Array.isArray(parsed.lifestyle) && parsed.lifestyle.length > 0) {
                              parts.push(`${t('recordSummary.lifestyle')}: ${parsed.lifestyle.map(l => typeof l === 'object' ? (l.recommendation || l.name || JSON.stringify(l)) : l).join(', ')}`);
                            }
                            if (parsed.follow_up) {
                              parts.push(`${t('recordSummary.followUp')}: ${parsed.follow_up}`);
                            }
                            return parts.length > 0 ? parts.join('\n') : t('recordSummary.noPlanSpecified');
                          } catch {
                            return detailedNotes.plan;
                          }
                        })()
                      : detailedNotes.plan}
                    darkMode={darkMode}
                    t={t}
                  />
                )}
              </>
            )}

            {/* Physical Examination */}
            {(detailedNotes.physical_examination || detailedNotes.pe_notes || detailedNotes.pe_general || detailedNotes.pe_lungs || detailedNotes.pe_heart || detailedNotes.pe_abdomen || detailedNotes.pe_neuro || detailedNotes.pe_extremities) && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.physicalExamination')}</h3>
                <div className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                  {detailedNotes.physical_examination ? (
                    <p className="whitespace-pre-line">{detailedNotes.physical_examination}</p>
                  ) : (
                    <div className="space-y-2">
                      {(detailedNotes.pe_general || detailedNotes.pe_lungs || detailedNotes.pe_heart || detailedNotes.pe_abdomen || detailedNotes.pe_neuro || detailedNotes.pe_extremities) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {detailedNotes.pe_general && <p><strong>{t('recordSummary.general')}:</strong> {detailedNotes.pe_general}</p>}
                          {detailedNotes.pe_lungs && <p><strong>{t('recordSummary.lungs')}:</strong> {detailedNotes.pe_lungs}</p>}
                          {detailedNotes.pe_heart && <p><strong>{t('recordSummary.heart')}:</strong> {detailedNotes.pe_heart}</p>}
                          {detailedNotes.pe_abdomen && <p><strong>{t('recordSummary.abdomen')}:</strong> {detailedNotes.pe_abdomen}</p>}
                          {detailedNotes.pe_neuro && <p><strong>{t('recordSummary.neurological')}:</strong> {detailedNotes.pe_neuro}</p>}
                          {detailedNotes.pe_extremities && <p><strong>{t('recordSummary.extremities')}:</strong> {detailedNotes.pe_extremities}</p>}
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
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.reviewOfSystems')}</h3>
                <div className={`space-y-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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
                        <p><strong>{t('recordSummary.respiratory')}:</strong> {detailedNotes.ros_respiratory}</p>
                      )}
                      {detailedNotes.ros_cardio && detailedNotes.ros_cardio !== 'normal' && (
                        <p><strong>{t('recordSummary.cardiovascular')}:</strong> {detailedNotes.ros_cardio}</p>
                      )}
                      {detailedNotes.ros_gi && detailedNotes.ros_gi !== 'normal' && (
                        <p><strong>{t('recordSummary.gastrointestinal')}:</strong> {detailedNotes.ros_gi}</p>
                      )}
                      {detailedNotes.ros_neuro && detailedNotes.ros_neuro !== 'normal' && (
                        <p><strong>{t('recordSummary.neurological')}:</strong> {detailedNotes.ros_neuro}</p>
                      )}
                      {detailedNotes.ros_gu && detailedNotes.ros_gu !== 'normal' && (
                        <p><strong>{t('recordSummary.genitourinary')}:</strong> {detailedNotes.ros_gu}</p>
                      )}
                      {detailedNotes.ros_derm && detailedNotes.ros_derm !== 'normal' && (
                        <p><strong>{t('recordSummary.dermatological')}:</strong> {detailedNotes.ros_derm}</p>
                      )}
                      {detailedNotes.ros_ent && detailedNotes.ros_ent !== 'normal' && (
                        <p><strong>{t('recordSummary.ent')}:</strong> {detailedNotes.ros_ent}</p>
                      )}
                      {detailedNotes.ros_msk && detailedNotes.ros_msk !== 'normal' && (
                        <p><strong>{t('recordSummary.musculoskeletal')}:</strong> {detailedNotes.ros_msk}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {(detailedNotes.diagnosis || detailedNotes.working_diagnoses) && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.diagnosis')}</h3>
                <div className={`whitespace-pre-line ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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
                    <p>{String(detailedNotes.working_diagnoses || t('recordSummary.noDiagnosisAvailable'))}</p>
                  )}
                </div>
              </div>
            )}

            {/* Differential Diagnoses */}
            {detailedNotes.differential_diagnoses && Array.isArray(detailedNotes.differential_diagnoses) && detailedNotes.differential_diagnoses.length > 0 && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-blue-500' : 'border-blue-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-400'}`}>{t('recordSummary.differentialDiagnoses')}</h3>
                <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.treatmentPlan')}</h3>
                <div className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                  {detailedNotes.treatment_plan ? (
                    <p className="whitespace-pre-line">{detailedNotes.treatment_plan}</p>
                  ) : (
                    <div className="space-y-3">
                      {detailedNotes.plan_tests && Array.isArray(detailedNotes.plan_tests) && detailedNotes.plan_tests.length > 0 && (
                        <div>
                          <strong>{t('recordSummary.testsOrdered')}:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_tests.map((test, index) => (
                              <li key={index}>{typeof test === 'object' ? test.name || JSON.stringify(test) : test}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_referrals && Array.isArray(detailedNotes.plan_referrals) && detailedNotes.plan_referrals.length > 0 && (
                        <div>
                          <strong>{t('recordSummary.referrals')}:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_referrals.map((ref, index) => (
                              <li key={index}>{typeof ref === 'object' ? ref.specialty || JSON.stringify(ref) : ref}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_med_changes && Array.isArray(detailedNotes.plan_med_changes) && detailedNotes.plan_med_changes.length > 0 && (
                        <div>
                          <strong>{t('recordSummary.medicationChanges')}:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_med_changes.map((med, index) => (
                              <li key={index}>{typeof med === 'object' ? med.name || JSON.stringify(med) : med}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_lifestyle && Array.isArray(detailedNotes.plan_lifestyle) && detailedNotes.plan_lifestyle.length > 0 && (
                        <div>
                          <strong>{t('recordSummary.lifestyleRecommendations')}:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {detailedNotes.plan_lifestyle.map((rec, index) => (
                              <li key={index}>{typeof rec === 'object' ? rec.recommendation || JSON.stringify(rec) : rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailedNotes.plan_follow_up && (
                        <div>
                          <strong>{t('recordSummary.followUp')}:</strong> {detailedNotes.plan_follow_up}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visit Summary */}
            {detailedNotes.visit_summary && (
              <Section title={t('recordSummary.visitSummary')} content={detailedNotes.visit_summary} darkMode={darkMode} />
            )}

            {/* Prescribed Medications - Display at the end */}
            {medications && medications.length > 0 && (
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/60'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.prescribedMedications')}</h3>
                <div className={`space-y-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {medications.map((med, index) => (
                    <div key={med.id || index} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} pb-3 last:border-b-0 last:pb-0`}>
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                        <div className="flex-1">
                          <p className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{med.medicineName || med.knownAs || t('recordSummary.unknownMedication')}</p>
                          {med.knownAs && med.knownAs !== med.medicineName && (
                            <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>({med.knownAs})</p>
                          )}
                          {med.purpose && (
                            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{med.purpose}</p>
                          )}
                        </div>
                        <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {med.dosage && <p><strong>{t('recordSummary.dosage')}:</strong> {med.dosage}</p>}
                          {med.frequency && <p><strong>{t('recordSummary.frequency')}:</strong> {med.frequency}</p>}
                          {med.prescribedDate && <p><strong>{t('recordSummary.prescribed')}:</strong> {med.prescribedDate}</p>}
                          {med.endDate && <p><strong>{t('recordSummary.endDate')}:</strong> {med.endDate}</p>}
                          {med.remainingRefills !== undefined && med.remainingRefills > 0 && (
                            <p><strong>{t('recordSummary.remainingRefills')}:</strong> {med.remainingRefills}</p>
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
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-white'} p-4 border-l-4 ${darkMode ? 'border-emerald-500' : 'border-emerald-400/80'} shadow-sm`}>
                <h3 className={`text-md font-bold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>{t('recordSummary.followUp')}</h3>
                <div className={`flex flex-col md:flex-row justify-between items-start md:items-center ${darkMode ? 'bg-emerald-600/20' : 'bg-emerald-400/10'} p-3 rounded-md`}>
                  <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{detailedNotes.plan_follow_up || t('recordSummary.noFollowUpReason')}</p>
                </div>
              </div>
            )}

            {/* General Summary/Description (fallback) */}
            {record.summary && !detailedNotes.chief_complaint && !detailedNotes.subjective && (
              <Section title={t('recordSummary.summary')} content={record.summary} darkMode={darkMode} />
            )}

            {/* Additional Notes */}
            {record.notes && !detailedNotes && (
              <Section title={t('recordSummary.additionalNotes')} content={record.notes} italic darkMode={darkMode} />
            )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t print:hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-end">
              <button
                onClick={() => navigate('/patient/records')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {t('recordSummary.backToRecords')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordSummary;
