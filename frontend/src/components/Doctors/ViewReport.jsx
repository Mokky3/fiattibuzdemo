import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { medicalReportsAPI } from '../../services/apiService';

const ViewReport = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await medicalReportsAPI.getByAppointment(reportId).catch(async () => {
          // fallback to direct report endpoint shape if needed
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const url = baseUrl.endsWith('/api/v1') 
            ? `${baseUrl}/doctor/reports/${reportId}`
            : `${baseUrl}/api/v1/doctor/reports/${reportId}`
          const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
          const json = await res.json()
          return json?.data ?? json
        })
        
        // Debug: Log the fetched report data
        console.log('ViewReport.jsx: Fetched report:', {
          id: data?.id,
          specialty: data?.specialty,
          doc_type: data?.doc_type,
          hasReportData: !!data?.reportData,
          reportDataDocType: data?.reportData?.doc_type,
          chiefComplaint: data?.chiefComplaint?.substring(0, 50) || '(empty)',
          historyOfPresentIllness: data?.historyOfPresentIllness?.substring(0, 50) || '(empty)',
          diagnosis: data?.diagnosis?.substring(0, 50) || '(empty)',
          treatmentPlan: data?.treatmentPlan?.substring(0, 50) || '(empty)',
          responseKeys: Object.keys(data || {})
        });
        
        // Debug: Log reportData structure if it exists
        if (data?.reportData) {
          console.log('ViewReport.jsx: reportData keys:', Object.keys(data.reportData));
          console.log('ViewReport.jsx: reportData sample:', {
            hasHpi: !!data.reportData.hpi,
            hasExternal: !!data.reportData.external,
            hasAcuity: !!data.reportData.acuity,
            hasRefraction: !!data.reportData.refraction,
            hasPupils: !!data.reportData.pupils,
            hasMotility: !!data.reportData.motility,
            hasAlignment: !!data.reportData.alignment,
            hasConfrontationFields: !!data.reportData.confrontation_fields,
            hasIop: !!data.reportData.iop,
            hasDilation: !!data.reportData.dilation,
            hasGonioscopy: !!data.reportData.gonioscopy,
            hasAnterior: !!data.reportData.anterior,
            hasPosterior: !!data.reportData.posterior,
            hasTests: !!data.reportData.tests,
            hasImagingLinks: !!data.reportData.imaging_links,
            hasAssessment: !!data.reportData.assessment,
            hasPlan: !!data.reportData.plan,
            hasDiagnosis: !!data.reportData.diagnosis,
            hasProceduresDone: !!data.reportData.procedures_done,
            hasAttachments: !!data.reportData.attachments,
            docType: data.reportData.doc_type
          });
          // Log full structure for debugging
          console.log('ViewReport.jsx: Full reportData:', JSON.stringify(data.reportData, null, 2));
        }
        
        setReport(data)
      } catch (err) {
        console.error(err);
        setError('Unable to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading report...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!report) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#5ACCC3] text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate(-1)}
              className="text-white hover:text-gray-100 flex items-center transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-white">Medical Report</h1>
            <button
              onClick={handlePrint}
              className="bg-white text-[#5ACCC3] px-4 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm0 0V9a2 2 0 012-2h6a2 2 0 012 2v9m-6 0a2 2 0 002 2h0a2 2 0 002-2" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:px-0 print:py-0 print:max-w-none">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-[#5ACCC3]/10 to-[#5ACCC3]/20 border-b-2 border-[#5ACCC3] px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Medical Report #{reportId}</h2>
                <p className="text-md text-gray-700 mt-1">Date: {report.date}</p>
              </div>
              <div className="mt-4 md:mt-0 text-right bg-white p-4 rounded-lg shadow-sm border border-[#5ACCC3]/20">
                <p className="font-bold text-[#5ACCC3]">{report?.doctor?.name || report?.doctor_info?.name || 'Unknown Doctor'}</p>
                <p className="text-md text-gray-700">{report?.doctor?.specialty || report?.doctor_info?.specialty || 'General Medicine'}</p>
                <p className="text-sm text-gray-600">{report?.doctor?.department || report?.doctor_info?.department || 'General'}</p>
              </div>
            </div>
          </div>

          {/* Report Sections */}
          <div className="px-6 py-6 space-y-8">
            {/* Check if this is a specialty-specific report (ophthalmology, neurology, traumatology, etc.) */}
            {report.specialty === 'Ophthalmology' || report.doc_type?.startsWith('oph.') ? (
              // Ophthalmology-specific report view
              <OphthalmologyReportView report={report} />
            ) : report.specialty === 'Neurology' || report.doc_type?.startsWith('neu.') ? (
              // Neurology-specific report view
              <NeurologyReportView report={report} />
            ) : report.specialty === 'Traumatology' || report.doc_type?.startsWith('trauma.') ? (
              // Traumatology-specific report view
              <TraumaOrthoReportView report={report} />
            ) : report.specialty === 'Midwifery' || report.doc_type?.startsWith('midwifery.') ? (
              // Midwifery-specific report view
              <MidwiferyReportView report={report} />
            ) : report.specialty === 'Gynecology' || report.doc_type?.startsWith('gynecology.') ? (
              // Gynecology-specific report view
              <GynecologyReportView report={report} />
            ) : report.specialty === 'Urology' || report.doc_type?.startsWith('uro.') ? (
              // Urology-specific report view
              <UrologyReportView report={report} />
            ) : report.specialty === 'Oncology' || report.doc_type?.startsWith('onc.') ? (
              // Oncology-specific report view
              <OncologyReportView report={report} />
            ) : report.specialty === 'Cardiology' || report.doc_type?.startsWith('cardiology.') ? (
              // Cardiology-specific report view
              <CardiologyReportView report={report} />
            ) : report.specialty === 'Allergy & Immunology' || report.specialty === 'Allergology' || report.doc_type?.startsWith('allergy.') ? (
              // Allergy & Immunology-specific report view
              <AllergyImmunologyReportView report={report} />
            ) : report.specialty === 'Endocrinology' || report.doc_type?.startsWith('endocrinology.') ? (
              // Endocrinology-specific report view
              <EndocrinologyReportView report={report} />
            ) : report.specialty === 'ENT' || report.specialty === 'Otolaryngology' || report.doc_type?.startsWith('ent.') ? (
              // ENT-specific report view
              <ENTReportView report={report} />
            ) : report.specialty === 'Proctology' || report.doc_type?.startsWith('proctology.') ? (
              // Proctology-specific report view
              <ProctologyReportView report={report} />
            ) : (
              // General report view (default)
              <>
                <Section title="Chief Complaint" content={report.chiefComplaint} />
                <Section title="History of Present Illness" content={report.historyOfPresentIllness} />
                <Section title="Physical Examination" content={report.physicalExamination} />
                <Section title="Diagnosis" content={report.diagnosis} />
                <Section title="Treatment Plan" content={report.treatmentPlan} />
              </>
            )}

            {/* Medications Table */}
            {report?.medications && Array.isArray(report.medications) && report.medications.length > 0 && (
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3] shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Prescribed Medications</h3>
              <div className="mt-3 border border-[#5ACCC3]/20 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#5ACCC3]/10">
                    <tr>
                      {["Medication", "Dosage", "Frequency", "Duration"].map((header) => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-[#5ACCC3] uppercase tracking-wider">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.medications.map((med, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#5ACCC3]/5'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{med.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{med.dosage}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{med.frequency}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Follow-up */}
            {report?.followUp && (
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/80 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Follow-up</h3>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#5ACCC3]/10 p-3 rounded-md">
                <p className="text-gray-800 font-medium">{report.followUp?.reason || 'No follow-up reason specified'}</p>
                <p className="text-[#5ACCC3] font-medium mt-2 md:mt-0 bg-white px-3 py-1 rounded-full shadow-sm border border-[#5ACCC3]/20">{report.followUp?.date || 'N/A'}</p>
              </div>
            </div>
            )}

            {/* Additional Notes */}
            <Section title="Additional Notes" content={report.additionalNotes} italic />
          </div>

          {/* Footer */}
          <div className="bg-[#5ACCC3]/5 px-6 py-4 border-t border-[#5ACCC3]/20">
            <p className="text-sm text-center text-gray-500">This medical report is confidential and intended only for the addressed patient and healthcare providers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Section Component
const Section = ({ title, content, italic = false }) => (
  <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
    <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{title}</h3>
    <p className={`text-gray-800 whitespace-pre-line ${italic ? 'italic' : ''}`}>{content || 'No data available'}</p>
  </div>
);

// Ophthalmology-specific report view component
const OphthalmologyReportView = ({ report }) => {
  const reportData = report.reportData || {};
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const main = diagnosis.main || {};
    const secondary = diagnosis.secondary || [];
    
    let text = '';
    if (main.code || main.term) {
      text = `Main Diagnosis: ${main.code || ''} ${main.term || ''}`.trim();
    }
    if (secondary.length > 0) {
      const secondaryText = secondary.map(d => {
        if (typeof d === 'object') {
          return `${d.code || ''} ${d.term || ''}`.trim();
        }
        return d;
      }).filter(d => d).join(', ');
      if (secondaryText) {
        text += (text ? '\n\n' : '') + `Secondary Diagnoses: ${secondaryText}`;
      }
    }
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  // Format plan
  const formatPlan = () => {
    const plan = reportData.plan || {};
    const parts = [];
    
    if (plan.meds && plan.meds.length > 0) {
      parts.push('Medications:\n' + plan.meds.map(m => 
        `- ${m.med || ''} ${m.conc_strength || ''} ${m.route || ''} ${m.freq || ''} ${m.duration || ''}`.trim()
      ).join('\n'));
    }
    
    if (plan.procedures_planned && plan.procedures_planned.length > 0) {
      parts.push('Planned Procedures:\n' + plan.procedures_planned.map(p => 
        `- ${p.name || ''} ${p.date || ''}`.trim()
      ).join('\n'));
    }
    
    if (plan.counseling && plan.counseling.length > 0) {
      parts.push('Counseling: ' + plan.counseling.join(', '));
    }
    
    if (plan.follow_up) {
      parts.push(`Follow-up: ${plan.follow_up}${plan.follow_up_date ? ` (${plan.follow_up_date})` : ''}`);
    }
    
    return parts.join('\n\n') || report.treatmentPlan || 'No treatment plan specified';
  };
  
  // Helper to check if section has data (including "normal" and empty strings)
  // This ensures all fields are shown even if they're set to "normal" or empty
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true; // Always show strings (even empty ones)
    if (Array.isArray(obj)) return true; // Always show arrays (even empty ones)
    if (typeof obj === 'object') {
      // Check if object has any keys (even if values are empty strings or "normal")
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  // Always returns true for strings (including "normal" and empty strings)
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return true; // Show all strings including "normal" and empty
    if (typeof value === 'boolean') return true; // Show booleans
    if (typeof value === 'number') return true; // Show numbers
    if (Array.isArray(value)) return true; // Show arrays
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  return (
    <>
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint} />
      
      {/* HPI Section */}
      {hasData(reportData.hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.hpi.description && <p><strong>Description:</strong> {reportData.hpi.description}</p>}
            {reportData.hpi.ocular_history && <p><strong>Ocular History:</strong> {reportData.hpi.ocular_history}</p>}
            {reportData.hpi.systemic_history && <p><strong>Systemic History:</strong> {reportData.hpi.systemic_history}</p>}
            {reportData.hpi.meds && <p><strong>Medications:</strong> {reportData.hpi.meds}</p>}
            {reportData.hpi.allergies && <p><strong>Allergies:</strong> {reportData.hpi.allergies}</p>}
          </div>
        </div>
      )}
      
      {/* External / Adnexa */}
      {hasData(reportData.external) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">External / Adnexa</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.external.eyebrows) && <p><strong>Eyebrows:</strong> {reportData.external.eyebrows || 'Not recorded'}</p>}
            {shouldDisplay(reportData.external.lids_lashes) && <p><strong>Lids / Lashes:</strong> {reportData.external.lids_lashes || 'Not recorded'}</p>}
            {shouldDisplay(reportData.external.lacrimal) && <p><strong>Lacrimal:</strong> {reportData.external.lacrimal || 'Not recorded'}</p>}
            {shouldDisplay(reportData.external.orbit) && <p><strong>Orbit:</strong> {reportData.external.orbit || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Visual Acuity */}
      {hasData(reportData.acuity) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Visual Acuity</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.acuity.distance && (
              <div>
                <strong>Distance Vision (SC):</strong>
                <div className="ml-4 mt-1 space-x-4">
                  {shouldDisplay(reportData.acuity.distance.sc?.OD) && <span>OD: {reportData.acuity.distance.sc.OD || 'N/A'}</span>}
                  {shouldDisplay(reportData.acuity.distance.sc?.OS) && <span>OS: {reportData.acuity.distance.sc.OS || 'N/A'}</span>}
                  {shouldDisplay(reportData.acuity.distance.sc?.OU) && <span>OU: {reportData.acuity.distance.sc.OU || 'N/A'}</span>}
                </div>
                {(shouldDisplay(reportData.acuity.distance.cc?.OD) || shouldDisplay(reportData.acuity.distance.cc?.OS) || shouldDisplay(reportData.acuity.distance.cc?.OU)) && (
                  <div className="ml-4 mt-1">
                    <strong>Distance Vision (CC):</strong>
                    <span className="ml-2 space-x-4">
                      {shouldDisplay(reportData.acuity.distance.cc?.OD) && <span>OD: {reportData.acuity.distance.cc.OD || 'N/A'}</span>}
                      {shouldDisplay(reportData.acuity.distance.cc?.OS) && <span>OS: {reportData.acuity.distance.cc.OS || 'N/A'}</span>}
                      {shouldDisplay(reportData.acuity.distance.cc?.OU) && <span>OU: {reportData.acuity.distance.cc.OU || 'N/A'}</span>}
                    </span>
                  </div>
                )}
              </div>
            )}
            {reportData.acuity.near && (
              <div>
                <strong>Near Vision (SC, Jaeger):</strong>
                <div className="ml-4 mt-1 space-x-4">
                  {shouldDisplay(reportData.acuity.near.sc?.OD) && <span>OD: {reportData.acuity.near.sc.OD || 'N/A'}</span>}
                  {shouldDisplay(reportData.acuity.near.sc?.OS) && <span>OS: {reportData.acuity.near.sc.OS || 'N/A'}</span>}
                  {shouldDisplay(reportData.acuity.near.sc?.OU) && <span>OU: {reportData.acuity.near.sc.OU || 'N/A'}</span>}
                </div>
                {(shouldDisplay(reportData.acuity.near.cc?.OD) || shouldDisplay(reportData.acuity.near.cc?.OS) || shouldDisplay(reportData.acuity.near.cc?.OU)) && (
                  <div className="ml-4 mt-1">
                    <strong>Near Vision (CC, Jaeger):</strong>
                    <span className="ml-2 space-x-4">
                      {shouldDisplay(reportData.acuity.near.cc?.OD) && <span>OD: {reportData.acuity.near.cc.OD || 'N/A'}</span>}
                      {shouldDisplay(reportData.acuity.near.cc?.OS) && <span>OS: {reportData.acuity.near.cc.OS || 'N/A'}</span>}
                      {shouldDisplay(reportData.acuity.near.cc?.OU) && <span>OU: {reportData.acuity.near.cc.OU || 'N/A'}</span>}
                    </span>
                  </div>
                )}
              </div>
            )}
            {(shouldDisplay(reportData.acuity.pinhole?.OD) || shouldDisplay(reportData.acuity.pinhole?.OS)) && (
              <div>
                <strong>Pinhole:</strong>
                <div className="ml-4 mt-1 space-x-4">
                  {shouldDisplay(reportData.acuity.pinhole.OD) && <span>OD: {reportData.acuity.pinhole.OD || 'N/A'}</span>}
                  {shouldDisplay(reportData.acuity.pinhole.OS) && <span>OS: {reportData.acuity.pinhole.OS || 'N/A'}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Refraction */}
      {hasData(reportData.refraction) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Refraction</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.refraction.cycloplegic && <p><strong>Cycloplegic:</strong> Yes</p>}
            {(reportData.refraction.od || reportData.refraction.os) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['od', 'os'].map(eye => {
                  const eyeData = reportData.refraction[eye];
                  if (!eyeData) return null;
                  // Show eye data if any field exists (even if empty or "normal")
                  const hasAnyField = shouldDisplay(eyeData.sphere) || shouldDisplay(eyeData.cylinder) || shouldDisplay(eyeData.axis) || shouldDisplay(eyeData.add);
                  if (!hasAnyField) return null;
                  return (
                    <div key={eye} className="border border-gray-200 rounded p-3">
                      <strong className="uppercase">{eye}</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        {shouldDisplay(eyeData.sphere) && <p>Sphere: {eyeData.sphere || 'N/A'}</p>}
                        {shouldDisplay(eyeData.cylinder) && <p>Cylinder: {eyeData.cylinder || 'N/A'}</p>}
                        {shouldDisplay(eyeData.axis) && <p>Axis: {eyeData.axis || 'N/A'}°</p>}
                        {shouldDisplay(eyeData.add) && <p>Add: {eyeData.add || 'N/A'}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {(shouldDisplay(reportData.refraction.final_rx?.od) || shouldDisplay(reportData.refraction.final_rx?.os) || shouldDisplay(reportData.refraction.final_rx?.pd)) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <strong>Final Prescription:</strong>
                <div className="mt-2 space-y-1 text-sm">
                  {shouldDisplay(reportData.refraction.final_rx.od) && <p>OD: {reportData.refraction.final_rx.od || 'N/A'}</p>}
                  {shouldDisplay(reportData.refraction.final_rx.os) && <p>OS: {reportData.refraction.final_rx.os || 'N/A'}</p>}
                  {shouldDisplay(reportData.refraction.final_rx.pd) && <p>PD: {reportData.refraction.final_rx.pd || 'N/A'} mm</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Pupils */}
      {hasData(reportData.pupils) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Pupils</h3>
          <div className="text-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['od', 'os'].map(eye => {
                const eyeData = reportData.pupils[eye];
                if (!eyeData) return null;
                // Show eye data if any field exists (even if empty or "normal")
                const hasAnyField = shouldDisplay(eyeData.size_mm) || shouldDisplay(eyeData.reaction) || eyeData.rapd || eyeData.irregular;
                if (!hasAnyField) return null;
                return (
                  <div key={eye} className="border border-gray-200 rounded p-3">
                    <strong className="uppercase">{eye}</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      {shouldDisplay(eyeData.size_mm) && <p>Size: {eyeData.size_mm || 'N/A'} mm</p>}
                      {shouldDisplay(eyeData.reaction) && <p>Reaction: {eyeData.reaction || 'N/A'}</p>}
                      {eyeData.rapd !== undefined && <p>RAPD: {eyeData.rapd ? 'Yes' : 'No'}</p>}
                      {eyeData.irregular !== undefined && <p>Irregular: {eyeData.irregular ? 'Yes' : 'No'}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Motility */}
      {hasData(reportData.motility) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Motility</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.motility.versions) && <p><strong>Versions:</strong> {reportData.motility.versions || 'Not recorded'}</p>}
            {shouldDisplay(reportData.motility.ductions) && <p><strong>Ductions:</strong> {reportData.motility.ductions || 'Not recorded'}</p>}
            {shouldDisplay(reportData.motility.deviations) && <p><strong>Deviations:</strong> {reportData.motility.deviations || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Alignment */}
      {hasData(reportData.alignment) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Alignment (Cover Test)</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.alignment.distance && (shouldDisplay(reportData.alignment.distance.type) || shouldDisplay(reportData.alignment.distance.prism) || shouldDisplay(reportData.alignment.distance.axis)) && (
              <div>
                <strong>Distance:</strong>
                <div className="ml-4 mt-1 text-sm space-x-4">
                  {shouldDisplay(reportData.alignment.distance.type) && <span>Type: {reportData.alignment.distance.type || 'N/A'}</span>}
                  {shouldDisplay(reportData.alignment.distance.prism) && <span>Prism: {reportData.alignment.distance.prism || 'N/A'}Δ</span>}
                  {shouldDisplay(reportData.alignment.distance.axis) && <span>Axis: {reportData.alignment.distance.axis || 'N/A'}</span>}
                </div>
              </div>
            )}
            {reportData.alignment.near && (shouldDisplay(reportData.alignment.near.type) || shouldDisplay(reportData.alignment.near.prism) || shouldDisplay(reportData.alignment.near.axis)) && (
              <div>
                <strong>Near:</strong>
                <div className="ml-4 mt-1 text-sm space-x-4">
                  {shouldDisplay(reportData.alignment.near.type) && <span>Type: {reportData.alignment.near.type || 'N/A'}</span>}
                  {shouldDisplay(reportData.alignment.near.prism) && <span>Prism: {reportData.alignment.near.prism || 'N/A'}Δ</span>}
                  {shouldDisplay(reportData.alignment.near.axis) && <span>Axis: {reportData.alignment.near.axis || 'N/A'}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Color Vision */}
      {hasData(reportData.color_vision) && !reportData.color_vision.not_tested && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Color Vision</h3>
          <div className="text-gray-800 space-y-1">
            {reportData.color_vision.method && <p><strong>Method:</strong> {reportData.color_vision.method}</p>}
            {reportData.color_vision.result && <p><strong>Result:</strong> {reportData.color_vision.result}</p>}
          </div>
        </div>
      )}
      
      {/* Confrontation Fields */}
      {reportData.confrontation_fields?.summary && (
        <Section title="Confrontation Fields" content={reportData.confrontation_fields.summary} />
      )}
      
      {/* IOP */}
      {hasData(reportData.iop) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Intraocular Pressure (IOP)</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.iop.method) && <p><strong>Method:</strong> {reportData.iop.method || 'Not recorded'}</p>}
            {shouldDisplay(reportData.iop.time) && <p><strong>Time:</strong> {reportData.iop.time || 'Not recorded'}</p>}
            {(shouldDisplay(reportData.iop.od) || shouldDisplay(reportData.iop.os)) && (
              <div className="space-x-4">
                {shouldDisplay(reportData.iop.od) && <span><strong>OD:</strong> {reportData.iop.od || 'N/A'} mmHg</span>}
                {shouldDisplay(reportData.iop.os) && <span><strong>OS:</strong> {reportData.iop.os || 'N/A'} mmHg</span>}
              </div>
            )}
            {reportData.iop.post_dilation && (shouldDisplay(reportData.iop.post_dilation.od) || shouldDisplay(reportData.iop.post_dilation.os)) && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <strong>Post-dilation:</strong>
                {shouldDisplay(reportData.iop.post_dilation.time) && <span className="ml-2">Time: {reportData.iop.post_dilation.time || 'N/A'}</span>}
                <div className="ml-4 mt-1 space-x-4">
                  {shouldDisplay(reportData.iop.post_dilation.od) && <span>OD: {reportData.iop.post_dilation.od || 'N/A'} mmHg</span>}
                  {shouldDisplay(reportData.iop.post_dilation.os) && <span>OS: {reportData.iop.post_dilation.os || 'N/A'} mmHg</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Dilation */}
      {reportData.dilation?.performed && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Dilation</h3>
          <div className="text-gray-800 space-y-1">
            <p><strong>Performed:</strong> Yes</p>
            {reportData.dilation.agent && <p><strong>Agent:</strong> {reportData.dilation.agent}</p>}
            {reportData.dilation.time && <p><strong>Time:</strong> {reportData.dilation.time}</p>}
          </div>
        </div>
      )}
      
      {/* Gonioscopy */}
      {reportData.gonioscopy && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Gonioscopy</h3>
          <div className="text-gray-800">
            <p className="mb-2"><strong>Performed:</strong> {reportData.gonioscopy.performed ? 'Yes' : 'No'}</p>
            {reportData.gonioscopy.performed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['od', 'os'].map(eye => {
                  const eyeData = reportData.gonioscopy[eye];
                  if (!eyeData) return null;
                  // Show eye data if any field exists (even if empty or "normal")
                  const hasAnyField = shouldDisplay(eyeData.shaffer) || shouldDisplay(eyeData.pigmentation) || eyeData.pas !== undefined || shouldDisplay(eyeData.notes);
                  if (!hasAnyField) return null;
                  return (
                    <div key={eye} className="border border-gray-200 rounded p-3">
                      <strong className="uppercase">{eye}</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        {shouldDisplay(eyeData.shaffer) && <p>Shaffer Grade: {eyeData.shaffer || 'N/A'}</p>}
                        {shouldDisplay(eyeData.pigmentation) && <p>Pigmentation: {eyeData.pigmentation || 'N/A'}</p>}
                        {eyeData.pas !== undefined && <p>PAS: {eyeData.pas ? 'Yes' : 'No'}</p>}
                        {shouldDisplay(eyeData.notes) && <p>Notes: {eyeData.notes || 'N/A'}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Anterior Segment */}
      {hasData(reportData.anterior) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Anterior Segment (Slit Lamp)</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.anterior.lids) && <p><strong>Lids:</strong> {reportData.anterior.lids || 'Not recorded'}</p>}
            {shouldDisplay(reportData.anterior.conjunctiva) && <p><strong>Conjunctiva:</strong> {reportData.anterior.conjunctiva || 'Not recorded'}</p>}
            {shouldDisplay(reportData.anterior.cornea) && <p><strong>Cornea:</strong> {reportData.anterior.cornea || 'Not recorded'}</p>}
            {shouldDisplay(reportData.anterior.anterior_chamber) && <p><strong>Anterior Chamber:</strong> {reportData.anterior.anterior_chamber || 'Not recorded'}</p>}
            {shouldDisplay(reportData.anterior.iris) && <p><strong>Iris:</strong> {reportData.anterior.iris || 'Not recorded'}</p>}
            {shouldDisplay(reportData.anterior.lens) && <p><strong>Lens:</strong> {reportData.anterior.lens || 'Not recorded'}</p>}
            {reportData.anterior.lens_grade && (
              <p><strong>Lens Grade:</strong> {
                typeof reportData.anterior.lens_grade === 'object' 
                  ? (() => {
                      const grade = reportData.anterior.lens_grade;
                      const parts = [];
                      if (grade.nuclear) parts.push(`Nuclear: ${grade.nuclear}`);
                      if (grade.cortical) parts.push(`Cortical: ${grade.cortical}`);
                      if (grade.posterior_subcapsular) parts.push(`Posterior Subcapsular: ${grade.posterior_subcapsular}`);
                      return parts.length > 0 ? parts.join(', ') : 'Not recorded';
                    })()
                  : String(reportData.anterior.lens_grade || 'Not recorded')
              }</p>
            )}
          </div>
        </div>
      )}
      
      {/* Posterior Segment */}
      {hasData(reportData.posterior) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Posterior Segment (Fundus)</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.posterior.vitreous) && <p><strong>Vitreous:</strong> {reportData.posterior.vitreous || 'Not recorded'}</p>}
            {shouldDisplay(reportData.posterior.disc) && <p><strong>Disc:</strong> {reportData.posterior.disc || 'Not recorded'}</p>}
            {reportData.posterior.cd_ratio && (shouldDisplay(reportData.posterior.cd_ratio.OD) || shouldDisplay(reportData.posterior.cd_ratio.OS)) && (
              <p><strong>C/D Ratio:</strong> OD: {reportData.posterior.cd_ratio.OD || 'N/A'}, OS: {reportData.posterior.cd_ratio.OS || 'N/A'}</p>
            )}
            {shouldDisplay(reportData.posterior.macula) && <p><strong>Macula:</strong> {reportData.posterior.macula || 'Not recorded'}</p>}
            {shouldDisplay(reportData.posterior.vessels) && <p><strong>Vessels:</strong> {reportData.posterior.vessels || 'Not recorded'}</p>}
            {shouldDisplay(reportData.posterior.periphery) && <p><strong>Periphery:</strong> {reportData.posterior.periphery || 'Not recorded'}</p>}
            {reportData.posterior.dr_grade && (
              <p><strong>Diabetic Retinopathy Grade:</strong> {
                typeof reportData.posterior.dr_grade === 'object' 
                  ? JSON.stringify(reportData.posterior.dr_grade)
                  : String(reportData.posterior.dr_grade || 'Not recorded')
              }</p>
            )}
            {reportData.posterior.amd_grade && (
              <p><strong>AMD Grade:</strong> {
                typeof reportData.posterior.amd_grade === 'object' 
                  ? JSON.stringify(reportData.posterior.amd_grade)
                  : String(reportData.posterior.amd_grade || 'Not recorded')
              }</p>
            )}
          </div>
        </div>
      )}
      
      {/* Tests & Imaging */}
      {hasData(reportData.tests) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Tests & Imaging</h3>
          <div className="text-gray-800 space-y-3">
            {shouldDisplay(reportData.tests.notes) && <p><strong>Notes:</strong> {reportData.tests.notes || 'Not recorded'}</p>}
            
            {(shouldDisplay(reportData.tests.keratometry?.k1) || shouldDisplay(reportData.tests.keratometry?.k2) || shouldDisplay(reportData.tests.keratometry?.axis)) && (
              <div>
                <strong>Keratometry:</strong>
                <div className="ml-4 mt-1 text-sm">
                  {shouldDisplay(reportData.tests.keratometry.k1) && <p>K1: {reportData.tests.keratometry.k1 || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.keratometry.k2) && <p>K2: {reportData.tests.keratometry.k2 || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.keratometry.axis) && <p>Axis: {reportData.tests.keratometry.axis || 'N/A'}°</p>}
                </div>
              </div>
            )}
            
            {(shouldDisplay(reportData.tests.pachymetry?.cct_od) || shouldDisplay(reportData.tests.pachymetry?.cct_os)) && (
              <div>
                <strong>Pachymetry:</strong>
                <div className="ml-4 mt-1 text-sm space-x-4">
                  {shouldDisplay(reportData.tests.pachymetry.cct_od) && <span>CCT OD: {reportData.tests.pachymetry.cct_od || 'N/A'} μm</span>}
                  {shouldDisplay(reportData.tests.pachymetry.cct_os) && <span>CCT OS: {reportData.tests.pachymetry.cct_os || 'N/A'} μm</span>}
                </div>
              </div>
            )}
            
            {(shouldDisplay(reportData.tests.oct?.rnfl_od) || shouldDisplay(reportData.tests.oct?.rnfl_os) || shouldDisplay(reportData.tests.oct?.gcipl_od) || shouldDisplay(reportData.tests.oct?.gcipl_os)) && (
              <div>
                <strong>OCT Measurements:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-2 gap-2">
                  {shouldDisplay(reportData.tests.oct.rnfl_od) && <p>RNFL OD: {reportData.tests.oct.rnfl_od || 'N/A'} μm</p>}
                  {shouldDisplay(reportData.tests.oct.rnfl_os) && <p>RNFL OS: {reportData.tests.oct.rnfl_os || 'N/A'} μm</p>}
                  {shouldDisplay(reportData.tests.oct.gcipl_od) && <p>GCIPL OD: {reportData.tests.oct.gcipl_od || 'N/A'} μm</p>}
                  {shouldDisplay(reportData.tests.oct.gcipl_os) && <p>GCIPL OS: {reportData.tests.oct.gcipl_os || 'N/A'} μm</p>}
                </div>
              </div>
            )}
            
            {reportData.tests.imaging && reportData.tests.imaging.length > 0 && (
              <div>
                <strong>Imaging Tests:</strong>
                <div className="ml-4 mt-1">
                  {reportData.tests.imaging.map((test, idx) => (
                    <span key={idx} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">{test}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Imaging Studies */}
      {reportData.imaging_links && reportData.imaging_links.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Imaging Studies</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.imaging_links.map((study, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{study.modality} - {study.description}</p>
                    <p className="text-sm text-gray-600">{study.date}</p>
                    {study.note && <p className="text-sm text-gray-600 mt-1">Note: {study.note}</p>}
                  </div>
                  {study.attach && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{study.attach}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Plan & Treatment (for initial mode) */}
      {reportData.plan && <Section title="Treatment Plan" content={formatPlan()} />}
      
      {/* Outcome & Recommendations (for discharge mode) */}
      {reportData.outcome && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Outcome & Recommendations</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.outcome.condition && <p><strong>Current Condition:</strong> {reportData.outcome.condition}</p>}
            {reportData.outcome.course && <p><strong>Hospital Course:</strong> {reportData.outcome.course}</p>}
            {reportData.recommendations && reportData.recommendations.length > 0 && (
              <div>
                <strong>Recommendations:</strong>
                <ul className="ml-4 mt-1 list-disc">
                  {reportData.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Procedures Done */}
      {reportData.procedures_done && reportData.procedures_done.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Procedures Done</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.procedures_done.map((proc, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <p className="font-medium">{proc.name}</p>
                <div className="mt-1 text-sm space-y-1">
                  {proc.date && <p>Date: {proc.date}</p>}
                  {proc.eye && <p>Eye: {proc.eye}</p>}
                  {proc.anesthesia && <p>Anesthesia: {proc.anesthesia}</p>}
                  {proc.technique && <p>Technique: {proc.technique}</p>}
                  {proc.findings && <p>Findings: {proc.findings}</p>}
                  {proc.result && <p>Result: {proc.result}</p>}
                  {proc.complications && <p>Complications: {proc.complications}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {reportData.attachments && reportData.attachments.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Attachments</h3>
          <div className="text-gray-800">
            {reportData.attachments.map((att, idx) => (
              <div key={idx} className="text-sm">
                {att.label || att.id || `Attachment ${idx + 1}`} {att.type && `(${att.type})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Neurology-specific report view component
const NeurologyReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  const meta = reportData.meta || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const main = diagnosis.main || '';
    const secondary = diagnosis.secondary || [];
    const codes = diagnosis.codes || [];
    
    let text = '';
    if (main) {
      text = typeof main === 'object' ? `${main.code || ''} ${main.term || ''}`.trim() : String(main);
    }
    if (secondary.length > 0) {
      const secondaryText = secondary.map(d => {
        if (typeof d === 'object') {
          return `${d.code || ''} ${d.term || ''}`.trim();
        }
        return String(d);
      }).filter(d => d).join(', ');
      if (secondaryText) {
        text += (text ? '\n\n' : '') + `Secondary Diagnoses: ${secondaryText}`;
      }
    }
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.system || ''} ${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Diagnosis Codes: ${codesText}`;
      }
    }
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  // Format plan
  const formatPlan = () => {
    const plan = reportData.plan || {};
    const parts = [];
    
    if (plan.meds && plan.meds.length > 0) {
      parts.push('Medications:\n' + plan.meds.map(m => {
        if (typeof m === 'object') {
          return `- ${m.name || m.med || ''} ${m.dosage || ''} ${m.frequency || ''} ${m.duration || ''}`.trim();
        }
        return `- ${m}`;
      }).join('\n'));
    }
    
    if (plan.procedures_planned && plan.procedures_planned.length > 0) {
      parts.push('Planned Procedures:\n' + plan.procedures_planned.map(p => {
        if (typeof p === 'object') {
          return `- ${p.name || ''} ${p.date || ''}`.trim();
        }
        return `- ${p}`;
      }).join('\n'));
    }
    
    if (plan.counseling && plan.counseling.length > 0) {
      parts.push('Counseling: ' + plan.counseling.join(', '));
    }
    
    if (plan.rehab_referrals && plan.rehab_referrals.length > 0) {
      parts.push('Rehabilitation Referrals: ' + plan.rehab_referrals.join(', '));
    }
    
    if (plan.safety && (plan.safety.falls || plan.safety.driving_restriction)) {
      const safetyParts = [];
      if (plan.safety.falls) safetyParts.push('Fall prevention');
      if (plan.safety.driving_restriction) safetyParts.push('Driving restriction');
      parts.push('Safety: ' + safetyParts.join(', '));
    }
    
    if (plan.follow_up) {
      parts.push(`Follow-up: ${plan.follow_up}${plan.follow_up_date ? ` (${plan.follow_up_date})` : ''}`);
    }
    
    return parts.join('\n\n') || report.treatmentPlan || 'No treatment plan specified';
  };
  
  // Get patient information
  const patientName = report.patient?.name || 
    (report.patient?.first_name && report.patient?.last_name 
      ? `${report.patient.first_name} ${report.patient.last_name}` 
      : report.patient?.patient_name) || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  
  // Get clinic information
  const clinicName = t('neurologyReport.neurologyDepartment') || 'Неврологическое отделение';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || t('neurologyReport.drSmith') || 'Др. Смит';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('neurologyReport.notSavedYet') || 'Еще не сохранено');
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">Report Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('neurologyReport.patient') || 'Пациент'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('neurologyReport.years') || 'лет'}, ${patientGender})`}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('neurologyReport.clinic') || 'Клиника'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('neurologyReport.physician') || 'Врач'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('neurologyReport.encounter') || 'Встреча'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('neurologyReport.lastSaved') || 'Последнее сохранение'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint} />
      
      {/* HPI Section */}
      {hasData(reportData.hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.hpi.onset_type) && <p><strong>Onset Type:</strong> {reportData.hpi.onset_type || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.lkw_time) && <p><strong>Last Known Well (LKW):</strong> {reportData.hpi.lkw_time || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.course) && <p><strong>Course:</strong> {reportData.hpi.course || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.triggers) && <p><strong>Triggers:</strong> {reportData.hpi.triggers || 'Not recorded'}</p>}
            {reportData.hpi.associated_symptoms && reportData.hpi.associated_symptoms.length > 0 && (
              <p><strong>Associated Symptoms:</strong> {reportData.hpi.associated_symptoms.join(', ')}</p>
            )}
            {shouldDisplay(reportData.hpi.headache_profile) && <p><strong>Headache Profile:</strong> {reportData.hpi.headache_profile || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.seizure_semiology) && <p><strong>Seizure Semiology:</strong> {reportData.hpi.seizure_semiology || 'Not recorded'}</p>}
            {reportData.hpi.risk_factors && (
              <div>
                <strong>Risk Factors:</strong>
                <div className="ml-4 mt-1">
                  {Object.entries(reportData.hpi.risk_factors).map(([key, value]) => (
                    value && <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key === 'htn' ? 'HTN' : key === 'dm' ? 'DM' : key === 'af' ? 'AF' : key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.hpi.meds) && <p><strong>Current Medications:</strong> {reportData.hpi.meds || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.allergies) && <p><strong>Allergies:</strong> {reportData.hpi.allergies || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.pmh) && <p><strong>Past Medical History:</strong> {reportData.hpi.pmh || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.family) && <p><strong>Family History:</strong> {reportData.hpi.family || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.social) && <p><strong>Social History:</strong> {reportData.hpi.social || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Vitals */}
      {hasData(reportData.vitals) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Vitals</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {shouldDisplay(reportData.vitals.bp_right) && <p><strong>BP Right:</strong> {reportData.vitals.bp_right || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.bp_left) && <p><strong>BP Left:</strong> {reportData.vitals.bp_left || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.hr) && <p><strong>Heart Rate:</strong> {reportData.vitals.hr || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.temp) && <p><strong>Temperature:</strong> {reportData.vitals.temp || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.spo2) && <p><strong>SpO2:</strong> {reportData.vitals.spo2 || 'N/A'}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Mental Status */}
      {hasData(reportData.mental_status) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Mental Status</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.mental_status.consciousness) && <p><strong>Level of Consciousness:</strong> {reportData.mental_status.consciousness || 'Not recorded'}</p>}
            {reportData.mental_status.orientation && (
              <div>
                <strong>Orientation:</strong>
                <div className="ml-4 mt-1">
                  {Object.entries(reportData.mental_status.orientation).map(([key, value]) => (
                    <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key.charAt(0).toUpperCase() + key.slice(1)}: {value ? 'Yes' : 'No'}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.mental_status.attention_memory) && <p><strong>Attention & Memory:</strong> {reportData.mental_status.attention_memory || 'Not recorded'}</p>}
            {shouldDisplay(reportData.mental_status.language) && <p><strong>Language:</strong> {reportData.mental_status.language || 'Not recorded'}</p>}
            {shouldDisplay(reportData.mental_status.behavior) && <p><strong>Behavior:</strong> {reportData.mental_status.behavior || 'Not recorded'}</p>}
            {(reportData.mental_status.mmse?.score || reportData.mental_status.mmse?.date) && (
              <p><strong>MMSE:</strong> Score: {reportData.mental_status.mmse.score || 'N/A'}, Date: {reportData.mental_status.mmse.date || 'N/A'}</p>
            )}
            {(reportData.mental_status.moca?.score || reportData.mental_status.moca?.date) && (
              <p><strong>MoCA:</strong> Score: {reportData.mental_status.moca.score || 'N/A'}, Date: {reportData.mental_status.moca.date || 'N/A'}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Cranial Nerves */}
      {hasData(reportData.cranial_nerves) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Cranial Nerves</h3>
          <div className="text-gray-800 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shouldDisplay(reportData.cranial_nerves.cn1) && <p><strong>CN I (Olfactory):</strong> {reportData.cranial_nerves.cn1 || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn2_fields) && <p><strong>CN II - Visual Fields:</strong> {reportData.cranial_nerves.cn2_fields || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn2_fundoscopy) && <p><strong>CN II - Fundoscopy:</strong> {reportData.cranial_nerves.cn2_fundoscopy || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn3_4_6_eyemov) && <p><strong>CN III, IV, VI (Eye Movement):</strong> {reportData.cranial_nerves.cn3_4_6_eyemov || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn5) && <p><strong>CN V (Trigeminal):</strong> {reportData.cranial_nerves.cn5 || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn7) && <p><strong>CN VII (Facial):</strong> {reportData.cranial_nerves.cn7 || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn8) && <p><strong>CN VIII (Vestibulocochlear):</strong> {reportData.cranial_nerves.cn8 || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn9_10) && <p><strong>CN IX, X (Glossopharyngeal, Vagus):</strong> {reportData.cranial_nerves.cn9_10 || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn11) && <p><strong>CN XI (Spinal Accessory):</strong> {reportData.cranial_nerves.cn11 || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cranial_nerves.cn12) && <p><strong>CN XII (Hypoglossal):</strong> {reportData.cranial_nerves.cn12 || 'Not recorded'}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Motor Examination */}
      {hasData(reportData.motor) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Motor Examination</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.motor.tone) && <p><strong>Tone:</strong> {reportData.motor.tone || 'Not recorded'}</p>}
            {shouldDisplay(reportData.motor.bulk) && <p><strong>Bulk:</strong> {reportData.motor.bulk || 'Not recorded'}</p>}
            {reportData.motor.fasciculations !== undefined && <p><strong>Fasciculations:</strong> {reportData.motor.fasciculations ? 'Yes' : 'No'}</p>}
            {reportData.motor.strength && (
              <div>
                <strong>Strength (MRC 0-5):</strong>
                <div className="ml-4 mt-2 space-y-2">
                  {['R', 'L'].map(side => {
                    const sideData = reportData.motor.strength[side];
                    if (!sideData) return null;
                    const hasAnyStrength = Object.values(sideData).some(v => shouldDisplay(v));
                    if (!hasAnyStrength) return null;
                    return (
                      <div key={side} className="border border-gray-200 rounded p-2">
                        <strong className="uppercase">{side} Side:</strong>
                        <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {Object.entries(sideData).map(([joint, strength]) => (
                            shouldDisplay(strength) && <span key={joint}>{joint.charAt(0).toUpperCase() + joint.slice(1)}: {strength || 'N/A'}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.motor.pronator_drift) && <p><strong>Pronator Drift:</strong> {reportData.motor.pronator_drift || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Reflexes */}
      {hasData(reportData.reflexes) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Reflexes</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {shouldDisplay(reportData.reflexes.biceps) && <p><strong>Biceps:</strong> {reportData.reflexes.biceps || 'N/A'}</p>}
              {shouldDisplay(reportData.reflexes.triceps) && <p><strong>Triceps:</strong> {reportData.reflexes.triceps || 'N/A'}</p>}
              {shouldDisplay(reportData.reflexes.brachioradialis) && <p><strong>Brachioradialis:</strong> {reportData.reflexes.brachioradialis || 'N/A'}</p>}
              {shouldDisplay(reportData.reflexes.knee) && <p><strong>Knee:</strong> {reportData.reflexes.knee || 'N/A'}</p>}
              {shouldDisplay(reportData.reflexes.ankle) && <p><strong>Ankle:</strong> {reportData.reflexes.ankle || 'N/A'}</p>}
              {shouldDisplay(reportData.reflexes.plantar) && <p><strong>Plantar:</strong> {reportData.reflexes.plantar || 'N/A'}</p>}
            </div>
            {(reportData.reflexes.hoffman !== undefined || reportData.reflexes.clonus !== undefined) && (
              <div className="mt-2">
                {reportData.reflexes.hoffman !== undefined && <p><strong>Hoffman:</strong> {reportData.reflexes.hoffman ? 'Yes' : 'No'}</p>}
                {reportData.reflexes.clonus !== undefined && <p><strong>Clonus:</strong> {reportData.reflexes.clonus ? 'Yes' : 'No'}</p>}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Sensory */}
      {hasData(reportData.sensory) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Sensory Examination</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shouldDisplay(reportData.sensory.light_touch) && <p><strong>Light Touch:</strong> {reportData.sensory.light_touch || 'Not recorded'}</p>}
              {shouldDisplay(reportData.sensory.pinprick) && <p><strong>Pinprick:</strong> {reportData.sensory.pinprick || 'Not recorded'}</p>}
              {shouldDisplay(reportData.sensory.temperature) && <p><strong>Temperature:</strong> {reportData.sensory.temperature || 'Not recorded'}</p>}
              {shouldDisplay(reportData.sensory.vibration) && <p><strong>Vibration:</strong> {reportData.sensory.vibration || 'Not recorded'}</p>}
              {shouldDisplay(reportData.sensory.proprioception) && <p><strong>Proprioception:</strong> {reportData.sensory.proprioception || 'Not recorded'}</p>}
            </div>
            {shouldDisplay(reportData.sensory.dermatomes_note) && <p><strong>Dermatomes Note:</strong> {reportData.sensory.dermatomes_note || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Cerebellar */}
      {hasData(reportData.cerebellar) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Cerebellar Examination</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shouldDisplay(reportData.cerebellar.fnf) && <p><strong>Finger-to-Nose (FNF):</strong> {reportData.cerebellar.fnf || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cerebellar.hks) && <p><strong>Heel-to-Shin (HKS):</strong> {reportData.cerebellar.hks || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cerebellar.diadochokinesis) && <p><strong>Diadochokinesis:</strong> {reportData.cerebellar.diadochokinesis || 'Not recorded'}</p>}
              {shouldDisplay(reportData.cerebellar.romberg) && <p><strong>Romberg:</strong> {reportData.cerebellar.romberg || 'Not recorded'}</p>}
            </div>
            {reportData.cerebellar.gait && (
              <div>
                <strong>Gait:</strong>
                <div className="ml-4 mt-1">
                  {Object.entries(reportData.cerebellar.gait).map(([key, value]) => (
                    value && <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Autonomic */}
      {hasData(reportData.autonomic) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Autonomic Examination</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.autonomic.orthostasis_bp) && <p><strong>Orthostasis BP:</strong> {reportData.autonomic.orthostasis_bp || 'Not recorded'}</p>}
            {shouldDisplay(reportData.autonomic.bowel_bladder) && <p><strong>Bowel/Bladder:</strong> {reportData.autonomic.bowel_bladder || 'Not recorded'}</p>}
            {shouldDisplay(reportData.autonomic.sweating) && <p><strong>Sweating:</strong> {reportData.autonomic.sweating || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Meningeal */}
      {hasData(reportData.meningeal) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Meningeal Signs</h3>
          <div className="text-gray-800 space-y-1">
            {reportData.meningeal.nuchal_rigidity !== undefined && <p><strong>Nuchal Rigidity:</strong> {reportData.meningeal.nuchal_rigidity ? 'Yes' : 'No'}</p>}
            {reportData.meningeal.kernig !== undefined && <p><strong>Kernig:</strong> {reportData.meningeal.kernig ? 'Yes' : 'No'}</p>}
            {reportData.meningeal.brudzinski !== undefined && <p><strong>Brudzinski:</strong> {reportData.meningeal.brudzinski ? 'Yes' : 'No'}</p>}
          </div>
        </div>
      )}
      
      {/* Pain/Headache */}
      {hasData(reportData.pain_headache) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Pain/Headache</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.pain_headache.site) && <p><strong>Site:</strong> {reportData.pain_headache.site || 'Not recorded'}</p>}
            {shouldDisplay(reportData.pain_headache.quality) && <p><strong>Quality:</strong> {reportData.pain_headache.quality || 'Not recorded'}</p>}
            {shouldDisplay(reportData.pain_headache.severity_vas) && <p><strong>Severity (VAS):</strong> {reportData.pain_headache.severity_vas || 'N/A'}/10</p>}
            {shouldDisplay(reportData.pain_headache.triggers) && <p><strong>Triggers:</strong> {reportData.pain_headache.triggers || 'Not recorded'}</p>}
            {reportData.pain_headache.red_flags && reportData.pain_headache.red_flags.length > 0 && (
              <p><strong>Red Flags:</strong> {reportData.pain_headache.red_flags.join(', ')}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Seizure */}
      {hasData(reportData.seizure) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Seizure</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.seizure.semiology) && <p><strong>Semiology:</strong> {reportData.seizure.semiology || 'Not recorded'}</p>}
            {shouldDisplay(reportData.seizure.frequency) && <p><strong>Frequency:</strong> {reportData.seizure.frequency || 'Not recorded'}</p>}
            {shouldDisplay(reportData.seizure.triggers) && <p><strong>Triggers:</strong> {reportData.seizure.triggers || 'Not recorded'}</p>}
            {shouldDisplay(reportData.seizure.postictal) && <p><strong>Postictal:</strong> {reportData.seizure.postictal || 'Not recorded'}</p>}
            {reportData.seizure.aeds && reportData.seizure.aeds.length > 0 && (
              <p><strong>AEDs:</strong> {reportData.seizure.aeds.join(', ')}</p>
            )}
            {shouldDisplay(reportData.seizure.adherence) && <p><strong>Adherence:</strong> {reportData.seizure.adherence || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Stroke */}
      {hasData(reportData.stroke) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Stroke Assessment</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.stroke.lkw_time) && <p><strong>Last Known Well (LKW):</strong> {reportData.stroke.lkw_time || 'Not recorded'}</p>}
            {reportData.stroke.nihss && (
              <div>
                <strong>NIHSS:</strong>
                <div className="ml-4 mt-1">
                  {shouldDisplay(reportData.stroke.nihss.total) && <p>Total Score: {reportData.stroke.nihss.total || 'N/A'}</p>}
                  {reportData.stroke.nihss.items && Object.keys(reportData.stroke.nihss.items).length > 0 && (
                    <div className="mt-2">
                      <strong>Items:</strong>
                      <div className="ml-4 mt-1 text-sm space-y-1">
                        {Object.entries(reportData.stroke.nihss.items).map(([item, value]) => (
                          shouldDisplay(value) && <p key={item}>{item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value || 'N/A'}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.stroke.mrs_pre) && <p><strong>Modified Rankin Scale (Pre):</strong> {reportData.stroke.mrs_pre || 'N/A'}</p>}
            {shouldDisplay(reportData.stroke.mrs_current) && <p><strong>Modified Rankin Scale (Current):</strong> {reportData.stroke.mrs_current || 'N/A'}</p>}
            {reportData.stroke.tpa_checklist && (
              <div>
                <strong>tPA Checklist:</strong>
                <div className="ml-4 mt-1">
                  {reportData.stroke.tpa_checklist.eligible !== null && (
                    <p>Eligible: {reportData.stroke.tpa_checklist.eligible ? 'Yes' : 'No'}</p>
                  )}
                  {reportData.stroke.tpa_checklist.contraindications && reportData.stroke.tpa_checklist.contraindications.length > 0 && (
                    <p>Contraindications: {reportData.stroke.tpa_checklist.contraindications.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
            {reportData.stroke.thrombectomy_consider !== undefined && (
              <p><strong>Thrombectomy Consideration:</strong> {reportData.stroke.thrombectomy_consider ? 'Yes' : 'No'}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Localization Hypothesis */}
      {hasData(reportData.localization_hypothesis) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Localization Hypothesis</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.localization_hypothesis.lesion_site) && <p><strong>Lesion Site:</strong> {reportData.localization_hypothesis.lesion_site || 'Not recorded'}</p>}
            {shouldDisplay(reportData.localization_hypothesis.rationale) && <p><strong>Rationale:</strong> {reportData.localization_hypothesis.rationale || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Tests & Imaging */}
      {hasData(reportData.tests) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Tests & Imaging</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.tests.imaging && reportData.tests.imaging.length > 0 && (
              <div>
                <strong>Imaging:</strong>
                <div className="ml-4 mt-1 space-y-2">
                  {reportData.tests.imaging.map((img, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-2 text-sm">
                      {typeof img === 'object' ? (
                        <>
                          {img.study_uid && <p>Study UID: {img.study_uid}</p>}
                          {img.modality && <p>Modality: {img.modality}</p>}
                          {img.description && <p>Description: {img.description}</p>}
                          {img.date && <p>Date: {img.date}</p>}
                        </>
                      ) : (
                        <p>{img}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reportData.tests.eeg && (reportData.tests.eeg.date || reportData.tests.eeg.summary) && (
              <div>
                <strong>EEG:</strong>
                <div className="ml-4 mt-1 text-sm">
                  {shouldDisplay(reportData.tests.eeg.date) && <p>Date: {reportData.tests.eeg.date || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.eeg.summary) && <p>Summary: {reportData.tests.eeg.summary || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {reportData.tests.emg_ncs && (reportData.tests.emg_ncs.date || reportData.tests.emg_ncs.summary) && (
              <div>
                <strong>EMG/NCS:</strong>
                <div className="ml-4 mt-1 text-sm">
                  {shouldDisplay(reportData.tests.emg_ncs.date) && <p>Date: {reportData.tests.emg_ncs.date || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.emg_ncs.summary) && <p>Summary: {reportData.tests.emg_ncs.summary || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {reportData.tests.labs && (
              <div>
                <strong>Laboratory Tests:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
                  {shouldDisplay(reportData.tests.labs.b12) && <p>B12: {reportData.tests.labs.b12 || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.labs.tsh) && <p>TSH: {reportData.tests.labs.tsh || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.labs.a1c) && <p>A1C: {reportData.tests.labs.a1c || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.labs.ck) && <p>CK: {reportData.tests.labs.ck || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.labs.esr_crp) && <p>ESR/CRP: {reportData.tests.labs.esr_crp || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.labs.others) && <p>Others: {reportData.tests.labs.others || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {reportData.tests.lp && reportData.tests.lp.performed && (
              <div>
                <strong>Lumbar Puncture:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.tests.lp.opening_pressure) && <p>Opening Pressure: {reportData.tests.lp.opening_pressure || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.lp.cells) && <p>Cells: {reportData.tests.lp.cells || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.lp.protein) && <p>Protein: {reportData.tests.lp.protein || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.lp.glucose) && <p>Glucose: {reportData.tests.lp.glucose || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.lp.microbiology) && <p>Microbiology: {reportData.tests.lp.microbiology || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {reportData.tests.referenced_docs && reportData.tests.referenced_docs.length > 0 && (
              <div>
                <strong>Referenced Documents:</strong>
                <div className="ml-4 mt-1">
                  {reportData.tests.referenced_docs.map((doc, idx) => (
                    <p key={idx} className="text-sm">{typeof doc === 'object' ? JSON.stringify(doc) : doc}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Plan & Treatment (for initial mode) */}
      {reportData.plan && <Section title="Treatment Plan" content={formatPlan()} />}
      
      {/* Procedures Done */}
      {reportData.procedures_done && reportData.procedures_done.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Procedures Done</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.procedures_done.map((proc, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <p className="font-medium">{typeof proc === 'object' ? (proc.name || `Procedure ${idx + 1}`) : proc}</p>
                {typeof proc === 'object' && (
                  <div className="mt-1 text-sm space-y-1">
                    {proc.date && <p>Date: {proc.date}</p>}
                    {proc.description && <p>Description: {proc.description}</p>}
                    {proc.result && <p>Result: {proc.result}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Outcome (for discharge mode) */}
      {reportData.outcome && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Outcome</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.outcome.condition) && <p><strong>Condition:</strong> {reportData.outcome.condition || 'Not recorded'}</p>}
            {shouldDisplay(reportData.outcome.course) && <p><strong>Course:</strong> {reportData.outcome.course || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Recommendations (for discharge mode) */}
      {reportData.recommendations && reportData.recommendations.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Recommendations</h3>
          <div className="text-gray-800">
            <ul className="list-disc list-inside space-y-1">
              {reportData.recommendations.map((rec, idx) => (
                <li key={idx}>{typeof rec === 'object' ? JSON.stringify(rec) : rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {reportData.attachments && reportData.attachments.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Attachments</h3>
          <div className="text-gray-800">
            {reportData.attachments.map((att, idx) => (
              <div key={idx} className="text-sm">
                {typeof att === 'object' ? (att.label || att.id || `Attachment ${idx + 1}`) : att} {att.type && `(${att.type})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Traumatology-specific report view component
const TraumaOrthoReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const main = diagnosis.main || '';
    const secondary = diagnosis.secondary || [];
    const codes = diagnosis.codes || [];
    
    let text = '';
    if (main) {
      text = typeof main === 'object' ? `${main.code || ''} ${main.term || ''}`.trim() : String(main);
    }
    if (secondary.length > 0) {
      const secondaryText = secondary.map(d => {
        if (typeof d === 'object') {
          return `${d.code || ''} ${d.term || ''}`.trim();
        }
        return String(d);
      }).filter(d => d).join(', ');
      if (secondaryText) {
        text += (text ? '\n\n' : '') + `Secondary Diagnoses: ${secondaryText}`;
      }
    }
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.system || ''} ${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Diagnosis Codes: ${codesText}`;
      }
    }
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  // Format plan
  const formatPlan = () => {
    const plan = reportData.plan || {};
    const parts = [];
    
    if (plan.tests && plan.tests.length > 0) {
      parts.push(`${t('traumaOrthoReport.tests')}:\n` + plan.tests.map(t => {
        if (typeof t === 'object') {
          return `- ${t.name || ''} ${t.date || ''}`.trim();
        }
        return `- ${t}`;
      }).join('\n'));
    }
    
    if (plan.referrals && plan.referrals.length > 0) {
      parts.push(`${t('traumaOrthoReport.referrals')}:\n` + plan.referrals.map(r => {
        if (typeof r === 'object') {
          return `- ${r.name || ''} ${r.date || ''}`.trim();
        }
        return `- ${r}`;
      }).join('\n'));
    }
    
    if (plan.meds && plan.meds.length > 0) {
      parts.push(`${t('traumaOrthoReport.medications')}:\n` + plan.meds.map(m => {
        if (typeof m === 'object') {
          return `- ${m.name || m.med || ''} ${m.dosage || ''} ${m.frequency || ''} ${m.duration || ''}`.trim();
        }
        return `- ${m}`;
      }).join('\n'));
    }
    
    if (plan.immobilization && plan.immobilization.applied) {
      const immo = plan.immobilization;
      parts.push(`${t('traumaOrthoReport.immobilization')}: ${immo.type || t('traumaOrthoReport.na')} - ${immo.side || t('traumaOrthoReport.na')} ${immo.region || ''}`.trim());
    }
    
    if (plan.weight_bearing) {
      parts.push(`${t('traumaOrthoReport.weightBearing')}: ${plan.weight_bearing}`);
    }
    
    if (plan.dvt_prophylaxis) {
      parts.push(`${t('traumaOrthoReport.dvtProphylaxis')}: ${plan.dvt_prophylaxis}`);
    }
    
    if (plan.sick_leave_days && plan.sick_leave_days > 0) {
      parts.push(`${t('traumaOrthoReport.sickLeave')}: ${plan.sick_leave_days} ${t('traumaOrthoReport.days')}`);
    }
    
    if (plan.work_restrictions) {
      parts.push(`${t('traumaOrthoReport.workRestrictions')}: ${plan.work_restrictions}`);
    }
    
    if (plan.physio) {
      parts.push(`${t('traumaOrthoReport.physiotherapy')}: ${plan.physio}`);
    }
    
    if (plan.follow_up) {
      parts.push(`${t('traumaOrthoReport.followUp')}: ${plan.follow_up}`);
    }
    
    return parts.join('\n\n') || report.treatmentPlan || t('traumaOrthoReport.notRecorded');
  };
  
  // Get meta information
  const meta = reportData.meta || {};
  
  // Get patient information
  const patientName = report.patient?.first_name && report.patient?.last_name
    ? `${report.patient.first_name} ${report.patient.last_name}`
    : report.patient?.name || report.patient?.patient_name || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  
  // Get clinic information
  const clinicName = t('traumaOrthoReport.traumatologyDepartment') || 'Отделение травматологии';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || t('traumaOrthoReport.drSmith') || 'Др. Иванов';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('traumaOrthoReport.notSavedYet') || 'Еще не сохранено');
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">Report Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('traumaOrthoReport.patient') || 'Пациент'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('traumaOrthoReport.years') || 'лет'}, ${patientGender})`}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('traumaOrthoReport.clinic') || 'Клиника'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('traumaOrthoReport.physician') || 'Врач'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('traumaOrthoReport.encounter') || 'Встреча'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('traumaOrthoReport.lastSaved') || 'Последнее сохранение'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      <Section title={t('traumaOrthoReport.chiefComplaint')} content={reportData.chief_complaint || report.chiefComplaint} />
      
      {/* Injury Section */}
      {hasData(reportData.injury) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.injuryDetails')}</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.injury.date) && <p><strong>{t('traumaOrthoReport.dateOfInjury')}:</strong> {reportData.injury.date || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.injury.mechanism) && <p><strong>{t('traumaOrthoReport.mechanism')}:</strong> {reportData.injury.mechanism || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.injury.context) && <p><strong>{t('traumaOrthoReport.context')}:</strong> {reportData.injury.context || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.injury.side) && <p><strong>{t('traumaOrthoReport.side')}:</strong> {reportData.injury.side || t('traumaOrthoReport.notRecorded')}</p>}
            {reportData.injury.region && reportData.injury.region.length > 0 && (
              <p><strong>{t('traumaOrthoReport.regions')}:</strong> {reportData.injury.region.join(', ')}</p>
            )}
            {reportData.injury.type && reportData.injury.type.length > 0 && (
              <p><strong>{t('traumaOrthoReport.types')}:</strong> {reportData.injury.type.join(', ')}</p>
            )}
            {shouldDisplay(reportData.injury.open_status) && <p><strong>{t('traumaOrthoReport.openStatus')}:</strong> {reportData.injury.open_status || t('traumaOrthoReport.notRecorded')}</p>}
            {reportData.injury.pain_scale !== undefined && reportData.injury.pain_scale !== null && (
              <p><strong>{t('traumaOrthoReport.painScale')}:</strong> {reportData.injury.pain_scale}/10</p>
            )}
            {reportData.injury.red_flags && reportData.injury.red_flags.length > 0 && (
              <p><strong>{t('traumaOrthoReport.redFlags')}:</strong> {reportData.injury.red_flags.join(', ')}</p>
            )}
            {reportData.injury.work_accident !== undefined && (
              <p><strong>{t('traumaOrthoReport.workAccident')}:</strong> {reportData.injury.work_accident ? t('traumaOrthoReport.yes') : t('traumaOrthoReport.no')}</p>
            )}
            {shouldDisplay(reportData.injury.police_report_no) && <p><strong>{t('traumaOrthoReport.policeReportNumber')}:</strong> {reportData.injury.police_report_no || t('traumaOrthoReport.notRecorded')}</p>}
          </div>
        </div>
      )}
      
      {/* History Section */}
      {hasData(reportData.history) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.history')}</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.history.hpi) && <p><strong>{t('traumaOrthoReport.historyOfPresentIllness')}:</strong> {reportData.history.hpi || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.history.pmh) && <p><strong>{t('traumaOrthoReport.pastMedicalHistory')}:</strong> {reportData.history.pmh || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.history.meds) && <p><strong>{t('traumaOrthoReport.currentMedications')}:</strong> {reportData.history.meds || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.history.allergies) && <p><strong>{t('traumaOrthoReport.allergies')}:</strong> {reportData.history.allergies || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.history.tetanus_status) && <p><strong>{t('traumaOrthoReport.tetanusStatus')}:</strong> {reportData.history.tetanus_status || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.history.osteoporosis_risk) && <p><strong>{t('traumaOrthoReport.osteoporosisRisk')}:</strong> {reportData.history.osteoporosis_risk || t('traumaOrthoReport.notRecorded')}</p>}
          </div>
        </div>
      )}
      
      {/* Examination Section */}
      {hasData(reportData.examination) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.examination')}</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.examination.vitals) && <p><strong>{t('traumaOrthoReport.vitals')}:</strong> {reportData.examination.vitals || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.examination.look) && <p><strong>{t('traumaOrthoReport.lookInspection')}:</strong> {reportData.examination.look || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.examination.feel) && <p><strong>{t('traumaOrthoReport.feelPalpation')}:</strong> {reportData.examination.feel || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.examination.move) && <p><strong>{t('traumaOrthoReport.moveRangeOfMotion')}:</strong> {reportData.examination.move || t('traumaOrthoReport.notRecorded')}</p>}
            {reportData.examination.special_tests && reportData.examination.special_tests.length > 0 && (
              <div>
                <strong>{t('traumaOrthoReport.specialTests')}:</strong>
                <div className="ml-4 mt-1">
                  {reportData.examination.special_tests.map((test, idx) => (
                    <div key={idx} className="text-sm">
                      {typeof test === 'object' ? (
                        <>
                          {test.name && <p>{test.name}: {test.result || t('traumaOrthoReport.na')}</p>}
                        </>
                      ) : (
                        <p>{test}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reportData.examination.neurovascular && (
              <div>
                <strong>{t('traumaOrthoReport.neurovascularAssessment')}:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.examination.neurovascular.pulses) && <p>{t('traumaOrthoReport.pulses')}: {reportData.examination.neurovascular.pulses || t('traumaOrthoReport.na')}</p>}
                  {shouldDisplay(reportData.examination.neurovascular.cap_refill) && <p>{t('traumaOrthoReport.capillaryRefill')}: {reportData.examination.neurovascular.cap_refill || t('traumaOrthoReport.na')}</p>}
                  {shouldDisplay(reportData.examination.neurovascular.motor) && <p>{t('traumaOrthoReport.motor')}: {reportData.examination.neurovascular.motor || t('traumaOrthoReport.na')}</p>}
                  {shouldDisplay(reportData.examination.neurovascular.sensory) && <p>{t('traumaOrthoReport.sensory')}: {reportData.examination.neurovascular.sensory || t('traumaOrthoReport.na')}</p>}
                </div>
              </div>
            )}
            {reportData.examination.open_fracture && (
              <div>
                <strong>{t('traumaOrthoReport.openFractureAssessment')}:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.examination.open_fracture.gustilo) && <p>{t('traumaOrthoReport.gustiloClassification')}: {reportData.examination.open_fracture.gustilo || t('traumaOrthoReport.na')}</p>}
                  {shouldDisplay(reportData.examination.open_fracture.contamination) && <p>{t('traumaOrthoReport.contamination')}: {reportData.examination.open_fracture.contamination || t('traumaOrthoReport.na')}</p>}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.examination.soft_tissue) && <p><strong>{t('traumaOrthoReport.softTissue')}:</strong> {reportData.examination.soft_tissue || t('traumaOrthoReport.notRecorded')}</p>}
          </div>
        </div>
      )}
      
      {/* Imaging Studies */}
      {reportData.imaging_links && reportData.imaging_links.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.imagingStudies')}</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.imaging_links.map((study, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{study.modality} - {study.description}</p>
                    <p className="text-sm text-gray-600">{study.date}</p>
                    {study.study_uid && <p className="text-sm text-gray-600">{t('traumaOrthoReport.imagingStudies')} UID: {study.study_uid}</p>}
                    {study.note && <p className="text-sm text-gray-600 mt-1">{t('traumaOrthoReport.note')}: {study.note}</p>}
                  </div>
                  {study.attach && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{study.attach}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Classification */}
      {hasData(reportData.classification) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.classification')}</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.classification.site) && <p><strong>{t('traumaOrthoReport.site')}:</strong> {reportData.classification.site || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.classification.side) && <p><strong>{t('traumaOrthoReport.side')}:</strong> {reportData.classification.side || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.classification.system) && <p><strong>{t('traumaOrthoReport.system')}:</strong> {reportData.classification.system || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.classification.code) && <p><strong>{t('traumaOrthoReport.code')}:</strong> {reportData.classification.code || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.classification.displacement) && <p><strong>{t('traumaOrthoReport.displacement')}:</strong> {reportData.classification.displacement || t('traumaOrthoReport.notRecorded')}</p>}
            {reportData.classification.intra_articular !== undefined && (
              <p><strong>{t('traumaOrthoReport.intraArticular')}:</strong> {reportData.classification.intra_articular ? t('traumaOrthoReport.yes') : t('traumaOrthoReport.no')}</p>
            )}
            {shouldDisplay(reportData.classification.stability) && <p><strong>{t('traumaOrthoReport.stability')}:</strong> {reportData.classification.stability || t('traumaOrthoReport.notRecorded')}</p>}
          </div>
        </div>
      )}
      
      {/* Procedures Done */}
      {reportData.procedures && reportData.procedures.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.proceduresOperations')}</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.procedures.map((proc, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <p className="font-medium">{typeof proc === 'object' ? (proc.name || `${t('traumaOrthoReport.proceduresOperations')} ${idx + 1}`) : proc}</p>
                {typeof proc === 'object' && (
                  <div className="mt-1 text-sm space-y-1">
                    {proc.date && <p>{t('traumaOrthoReport.date')}: {proc.date}</p>}
                    {proc.description && <p>{t('traumaOrthoReport.proceduresOperations')}: {proc.description}</p>}
                    {proc.technique && <p>{t('traumaOrthoReport.technique')}: {proc.technique}</p>}
                    {proc.findings && <p>{t('traumaOrthoReport.findings')}: {proc.findings}</p>}
                    {proc.result && <p>{t('traumaOrthoReport.result')}: {proc.result}</p>}
                    {proc.complications && <p>{t('traumaOrthoReport.complications')}: {proc.complications}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title={t('traumaOrthoReport.diagnosis')} content={formatDiagnosis()} />
      
      {/* Plan & Treatment (for initial mode) */}
      {reportData.plan && <Section title={t('traumaOrthoReport.planTreatment')} content={formatPlan()} />}
      
      {/* Outcome (for discharge mode) */}
      {reportData.outcome && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.outcomeRecommendations')}</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.outcome.condition) && <p><strong>{t('traumaOrthoReport.currentCondition')}:</strong> {reportData.outcome.condition || t('traumaOrthoReport.notRecorded')}</p>}
            {shouldDisplay(reportData.outcome.course) && <p><strong>{t('traumaOrthoReport.hospitalCourse')}:</strong> {reportData.outcome.course || t('traumaOrthoReport.notRecorded')}</p>}
          </div>
        </div>
      )}
      
      {/* Recommendations (for discharge mode) */}
      {reportData.recommendations && reportData.recommendations.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">{t('traumaOrthoReport.recommendations')}</h3>
          <div className="text-gray-800">
            <ul className="list-disc list-inside space-y-1">
              {reportData.recommendations.map((rec, idx) => (
                <li key={idx}>{typeof rec === 'object' ? JSON.stringify(rec) : rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {reportData.attachments && reportData.attachments.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Attachments</h3>
          <div className="text-gray-800">
            {reportData.attachments.map((att, idx) => (
              <div key={idx} className="text-sm">
                {typeof att === 'object' ? (att.label || att.id || `Attachment ${idx + 1}`) : att} {att.type && `(${att.type})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Midwifery-specific report view component
const MidwiferyReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  const meta = reportData.meta || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Get patient information from backend
  const patientName = report.patient?.name || 
    (report.patient?.first_name && report.patient?.last_name 
      ? `${report.patient.first_name} ${report.patient.last_name}` 
      : report.patient?.patient_name) || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  const patientDob = report.patient?.dob || report.patient?.date_of_birth || null;
  const patientId = report.patient?.id || report.patient?.mrn || report.patient?.patient_id || 'N/A';
  const patientPhone = report.patient?.phone || report.patient?.phoneNumber || report.patient?.contact_number || null;
  const patientAddress = report.patient?.address || null;
  const patientEmergencyContact = report.patient?.emergency_contact || null;
  const patientMaritalStatus = report.patient?.marital_status || report.patient?.maritalStatus || null;
  
  // Get clinic information
  const clinicName = report.clinic?.name || meta.clinic_name || t('midwiferyForm.clinic') || 'Клиника';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || t('midwiferyForm.physician') || 'Врач';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('midwiferyForm.notSavedYet') || 'Еще не сохранено');
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const codes = reportData.diagnosis_codes || [];
    
    let text = '';
    if (diagnosis && typeof diagnosis === 'object' && (diagnosis.code || diagnosis.term)) {
      text = `${diagnosis.code || ''} ${diagnosis.term || ''}`.trim();
    } else if (diagnosis) {
      text = String(diagnosis);
    }
    
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Additional Diagnoses: ${codesText}`;
      }
    }
    
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">{t('midwiferyForm.patientInformation') || 'Информация о пациенте'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('midwiferyForm.patient') || 'Пациент'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('midwiferyForm.years') || 'лет'}, ${patientGender})`}
            </p>
            {patientDob && (
              <p className="text-sm text-gray-600 mt-1">{t('midwiferyForm.dateOfBirth') || 'Дата рождения'}: {new Date(patientDob).toLocaleDateString()}</p>
            )}
            {patientId && patientId !== 'N/A' && (
              <p className="text-sm text-gray-600">{t('midwiferyForm.idMrn') || 'ID/MRN'}: {patientId}</p>
            )}
            {patientPhone && (
              <p className="text-sm text-gray-600">{t('midwiferyForm.contactNumber') || 'Контактный номер'}: {patientPhone}</p>
            )}
            {patientAddress && (
              <p className="text-sm text-gray-600">{t('midwiferyForm.address') || 'Адрес'}: {patientAddress}</p>
            )}
            {patientEmergencyContact && (
              <p className="text-sm text-gray-600">{t('midwiferyForm.emergencyContact') || 'Экстренный контакт'}: {patientEmergencyContact}</p>
            )}
            {patientMaritalStatus && (
              <p className="text-sm text-gray-600">{t('midwiferyForm.maritalStatus') || 'Семейное положение'}: {patientMaritalStatus}</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('midwiferyForm.clinic') || 'Клиника'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('midwiferyForm.physician') || 'Врач'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('midwiferyForm.encounter') || 'Встреча'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('midwiferyForm.lastSaved') || 'Последнее сохранение'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      {/* Obstetric & Medical History */}
      {(hasData(reportData.obstetric_medical_history) || shouldDisplay(reportData.bloodGroup) || shouldDisplay(reportData.allergies) || shouldDisplay(reportData.previousPregnancies) || shouldDisplay(reportData.complications) || shouldDisplay(reportData.currentMedications) || shouldDisplay(reportData.familyHistory)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Obstetric & Medical History</h3>
          <div className="text-gray-800 space-y-2">
            {hasData(reportData.obstetric_medical_history?.obstetric_summary) && (
              <div>
                <h4 className="font-semibold mb-2">Obstetric Summary</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.obstetric_medical_history.obstetric_summary.gravida) && <p><strong>Gravida (G):</strong> {reportData.obstetric_medical_history.obstetric_summary.gravida}</p>}
                  {shouldDisplay(reportData.obstetric_medical_history.obstetric_summary.para) && <p><strong>Para (P):</strong> {reportData.obstetric_medical_history.obstetric_summary.para}</p>}
                  {shouldDisplay(reportData.obstetric_medical_history.obstetric_summary.abortions_miscarriages) && <p><strong>Abortions / Miscarriages:</strong> {reportData.obstetric_medical_history.obstetric_summary.abortions_miscarriages}</p>}
                  {shouldDisplay(reportData.obstetric_medical_history.obstetric_summary.living_children) && <p><strong>Living Children:</strong> {reportData.obstetric_medical_history.obstetric_summary.living_children}</p>}
                  {reportData.obstetric_medical_history.obstetric_summary.previous_modes_of_delivery && reportData.obstetric_medical_history.obstetric_summary.previous_modes_of_delivery.length > 0 && (
                    <p><strong>Previous Mode(s) of Delivery:</strong> {reportData.obstetric_medical_history.obstetric_summary.previous_modes_of_delivery.join(', ')}</p>
                  )}
                  {shouldDisplay(reportData.obstetric_medical_history.obstetric_summary.previous_obstetric_complications) && (
                    <p><strong>Previous Obstetric Complications:</strong> {reportData.obstetric_medical_history.obstetric_summary.previous_obstetric_complications}</p>
                  )}
                </div>
              </div>
            )}
            {hasData(reportData.obstetric_medical_history?.general_medical_history) && (
              <div>
                <h4 className="font-semibold mb-2">General Medical History</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.obstetric_medical_history.general_medical_history.blood_group || reportData.bloodGroup) && <p><strong>Blood Group:</strong> {reportData.obstetric_medical_history.general_medical_history.blood_group || reportData.bloodGroup || 'Not recorded'}</p>}
                  {shouldDisplay(reportData.obstetric_medical_history.general_medical_history.allergies || reportData.allergies) && <p><strong>Allergies:</strong> {reportData.obstetric_medical_history.general_medical_history.allergies || reportData.allergies || 'Not recorded'}</p>}
                  {shouldDisplay(reportData.obstetric_medical_history.general_medical_history.medical_conditions) && <p><strong>Medical Conditions:</strong> {reportData.obstetric_medical_history.general_medical_history.medical_conditions}</p>}
                  {shouldDisplay(reportData.obstetric_medical_history.general_medical_history.surgical_history) && <p><strong>Surgical History:</strong> {reportData.obstetric_medical_history.general_medical_history.surgical_history}</p>}
                  {reportData.obstetric_medical_history.general_medical_history.current_medications && reportData.obstetric_medical_history.general_medical_history.current_medications.length > 0 && (
                    <p><strong>Current Medications:</strong> {Array.isArray(reportData.obstetric_medical_history.general_medical_history.current_medications) ? reportData.obstetric_medical_history.general_medical_history.current_medications.join(', ') : reportData.obstetric_medical_history.general_medical_history.current_medications}</p>
                  )}
                  {shouldDisplay(reportData.obstetric_medical_history.general_medical_history.family_history || reportData.familyHistory) && <p><strong>Family History:</strong> {reportData.obstetric_medical_history.general_medical_history.family_history || reportData.familyHistory || 'Not recorded'}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Current Pregnancy */}
      {(hasData(reportData.current_pregnancy) || shouldDisplay(reportData.lastMenstrualPeriod) || shouldDisplay(reportData.expectedDueDate) || shouldDisplay(reportData.gestationalAge) || shouldDisplay(reportData.pregnancyType) || shouldDisplay(reportData.pregnancyNumber) || shouldDisplay(reportData.highRiskFactors)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Current Pregnancy</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.current_pregnancy?.last_menstrual_period || reportData.lastMenstrualPeriod) && <p><strong>Last Menstrual Period:</strong> {reportData.current_pregnancy?.last_menstrual_period || reportData.lastMenstrualPeriod || 'Not recorded'}</p>}
            {shouldDisplay(reportData.current_pregnancy?.estimated_due_date || reportData.expectedDueDate) && <p><strong>Expected Due Date:</strong> {reportData.current_pregnancy?.estimated_due_date || reportData.expectedDueDate || 'Not recorded'}</p>}
            {shouldDisplay(reportData.current_pregnancy?.gestational_age || reportData.gestationalAge) && <p><strong>Gestational Age:</strong> {reportData.current_pregnancy?.gestational_age || reportData.gestationalAge || 'Not recorded'}</p>}
            {shouldDisplay(reportData.current_pregnancy?.pregnancy_type || reportData.pregnancyType) && <p><strong>Pregnancy Type:</strong> {reportData.current_pregnancy?.pregnancy_type || reportData.pregnancyType || 'Not recorded'}</p>}
            {shouldDisplay(reportData.current_pregnancy?.visit_number || reportData.pregnancyNumber) && <p><strong>Visit Number:</strong> {reportData.current_pregnancy?.visit_number || reportData.pregnancyNumber || 'Not recorded'}</p>}
            {shouldDisplay(reportData.current_pregnancy?.high_risk_factors || reportData.highRiskFactors) && <p><strong>High Risk Factors:</strong> {reportData.current_pregnancy?.high_risk_factors || reportData.highRiskFactors || 'Not recorded'}</p>}
            {shouldDisplay(reportData.current_pregnancy?.current_pregnancy_complaints) && <p><strong>Current Pregnancy Complaints:</strong> {reportData.current_pregnancy.current_pregnancy_complaints}</p>}
          </div>
        </div>
      )}
      
      {/* Vital Signs */}
      {(hasData(reportData.vital_signs) || shouldDisplay(reportData.bloodPressure) || shouldDisplay(reportData.pulseRate) || shouldDisplay(reportData.temperature) || shouldDisplay(reportData.weight) || shouldDisplay(reportData.height) || shouldDisplay(reportData.bmi)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Vital Signs</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {shouldDisplay(reportData.vital_signs?.blood_pressure || reportData.bloodPressure) && <p><strong>Blood Pressure:</strong> {reportData.vital_signs?.blood_pressure || reportData.bloodPressure || 'N/A'}</p>}
              {shouldDisplay(reportData.vital_signs?.pulse_rate || reportData.pulseRate) && <p><strong>Pulse Rate:</strong> {reportData.vital_signs?.pulse_rate || reportData.pulseRate || 'N/A'} bpm</p>}
              {shouldDisplay(reportData.vital_signs?.respiratory_rate) && <p><strong>Respiratory Rate:</strong> {reportData.vital_signs.respiratory_rate || 'N/A'} breaths/min</p>}
              {shouldDisplay(reportData.vital_signs?.temperature || reportData.temperature) && <p><strong>Temperature:</strong> {reportData.vital_signs?.temperature || reportData.temperature || 'N/A'}°C</p>}
              {shouldDisplay(reportData.vital_signs?.spo2) && <p><strong>SpO₂:</strong> {reportData.vital_signs.spo2 || 'N/A'}%</p>}
              {shouldDisplay(reportData.vital_signs?.weight || reportData.weight) && <p><strong>Weight:</strong> {reportData.vital_signs?.weight || reportData.weight || 'N/A'} kg</p>}
              {shouldDisplay(reportData.vital_signs?.height || reportData.height) && <p><strong>Height:</strong> {reportData.vital_signs?.height || reportData.height || 'N/A'} cm</p>}
              {shouldDisplay(reportData.vital_signs?.bmi || reportData.bmi) && <p><strong>BMI:</strong> {reportData.vital_signs?.bmi || reportData.bmi || 'N/A'}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Obstetric Examination */}
      {(hasData(reportData.obstetric_examination) || shouldDisplay(reportData.fundalHeight) || shouldDisplay(reportData.fetalHeartRate) || shouldDisplay(reportData.fetalPosition) || shouldDisplay(reportData.fetalMovement) || shouldDisplay(reportData.cervicalDilation) || shouldDisplay(reportData.station)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Obstetric Examination</h3>
          <div className="text-gray-800 space-y-4">
            {hasData(reportData.obstetric_examination?.general) && (
              <div>
                <h4 className="font-semibold mb-2">General</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.obstetric_examination.general.general_appearance) && <p><strong>General Appearance:</strong> {reportData.obstetric_examination.general.general_appearance}</p>}
                  {shouldDisplay(reportData.obstetric_examination.general.oedema) && <p><strong>Oedema:</strong> {reportData.obstetric_examination.general.oedema}</p>}
                </div>
              </div>
            )}
            {hasData(reportData.obstetric_examination?.uterus_fetus) && (
              <div>
                <h4 className="font-semibold mb-2">Uterus & Fetus</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.obstetric_examination.uterus_fetus.fundal_height || reportData.fundalHeight) && <p><strong>Fundal Height:</strong> {reportData.obstetric_examination.uterus_fetus.fundal_height || reportData.fundalHeight || 'N/A'} cm</p>}
                  {shouldDisplay(reportData.obstetric_examination.uterus_fetus.fetal_heart_rate || reportData.fetalHeartRate) && <p><strong>Fetal Heart Rate:</strong> {reportData.obstetric_examination.uterus_fetus.fetal_heart_rate || reportData.fetalHeartRate || 'N/A'} bpm</p>}
                  {shouldDisplay(reportData.obstetric_examination.uterus_fetus.fetal_lie) && <p><strong>Fetal Lie:</strong> {reportData.obstetric_examination.uterus_fetus.fetal_lie}</p>}
                  {shouldDisplay(reportData.obstetric_examination.uterus_fetus.presentation || reportData.fetalPosition) && <p><strong>Presentation:</strong> {reportData.obstetric_examination.uterus_fetus.presentation || reportData.fetalPosition || 'N/A'}</p>}
                  {shouldDisplay(reportData.obstetric_examination.uterus_fetus.fetal_movement || reportData.fetalMovement) && <p><strong>Fetal Movement:</strong> {reportData.obstetric_examination.uterus_fetus.fetal_movement || reportData.fetalMovement || 'N/A'}</p>}
                </div>
              </div>
            )}
            {hasData(reportData.obstetric_examination?.cervical_assessment) && (
              <div>
                <h4 className="font-semibold mb-2">Cervical Assessment</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.obstetric_examination.cervical_assessment.cervical_dilation || reportData.cervicalDilation) && <p><strong>Cervical Dilation:</strong> {reportData.obstetric_examination.cervical_assessment.cervical_dilation || reportData.cervicalDilation || 'N/A'} cm</p>}
                  {shouldDisplay(reportData.obstetric_examination.cervical_assessment.effacement) && <p><strong>Effacement:</strong> {reportData.obstetric_examination.cervical_assessment.effacement}</p>}
                  {shouldDisplay(reportData.obstetric_examination.cervical_assessment.station || reportData.station) && <p><strong>Station:</strong> {reportData.obstetric_examination.cervical_assessment.station || reportData.station || 'N/A'}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Laboratory Tests */}
      {(hasData(reportData.laboratory_tests) || shouldDisplay(reportData.hemoglobin) || shouldDisplay(reportData.bloodSugar) || shouldDisplay(reportData.urineAnalysis) || shouldDisplay(reportData.hivStatus) || shouldDisplay(reportData.hepatitisB) || shouldDisplay(reportData.syphilis)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Laboratory Tests</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {shouldDisplay(reportData.laboratory_tests?.hemoglobin || reportData.hemoglobin) && <p><strong>Hemoglobin:</strong> {reportData.laboratory_tests?.hemoglobin || reportData.hemoglobin || 'N/A'} g/dL</p>}
              {shouldDisplay(reportData.laboratory_tests?.blood_sugar_glucose || reportData.bloodSugar) && <p><strong>Blood Sugar / Glucose:</strong> {reportData.laboratory_tests?.blood_sugar_glucose || reportData.bloodSugar || 'N/A'}</p>}
              {shouldDisplay(reportData.laboratory_tests?.gdm_screening_ogtt_result) && <p><strong>GDM Screening / OGTT:</strong> {reportData.laboratory_tests.gdm_screening_ogtt_result}</p>}
              {shouldDisplay(reportData.laboratory_tests?.urine_analysis || reportData.urineAnalysis) && <p><strong>Urine Analysis:</strong> {reportData.laboratory_tests?.urine_analysis || reportData.urineAnalysis || 'Not recorded'}</p>}
              {shouldDisplay(reportData.laboratory_tests?.hiv_status || reportData.hivStatus) && <p><strong>HIV Status:</strong> {reportData.laboratory_tests?.hiv_status || reportData.hivStatus || 'N/A'}</p>}
              {shouldDisplay(reportData.laboratory_tests?.hepatitis_b_status || reportData.hepatitisB) && <p><strong>Hepatitis B:</strong> {reportData.laboratory_tests?.hepatitis_b_status || reportData.hepatitisB || 'N/A'}</p>}
              {shouldDisplay(reportData.laboratory_tests?.syphilis || reportData.syphilis) && <p><strong>Syphilis:</strong> {reportData.laboratory_tests?.syphilis || reportData.syphilis || 'N/A'}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Ultrasound & Fetal Assessment */}
      {(hasData(reportData.ultrasound_fetal_assessment) || shouldDisplay(reportData.placentaPosition) || shouldDisplay(reportData.amnioticFluid) || shouldDisplay(reportData.estimatedFetalWeight) || shouldDisplay(reportData.ultrasoundDate) || shouldDisplay(reportData.additionalFindings)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Ultrasound & Fetal Assessment</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.ultrasound_fetal_assessment?.number_of_fetuses) && <p><strong>Number of Fetuses:</strong> {reportData.ultrasound_fetal_assessment.number_of_fetuses}</p>}
            {shouldDisplay(reportData.ultrasound_fetal_assessment?.ultrasound_date || reportData.ultrasoundDate) && <p><strong>Ultrasound Date:</strong> {reportData.ultrasound_fetal_assessment?.ultrasound_date || reportData.ultrasoundDate || 'Not recorded'}</p>}
            {shouldDisplay(reportData.ultrasound_fetal_assessment?.gestational_age_by_ultrasound) && <p><strong>Gestational Age by Ultrasound:</strong> {reportData.ultrasound_fetal_assessment.gestational_age_by_ultrasound}</p>}
            {shouldDisplay(reportData.ultrasound_fetal_assessment?.placenta_position || reportData.placentaPosition) && <p><strong>Placenta Position:</strong> {reportData.ultrasound_fetal_assessment?.placenta_position || reportData.placentaPosition || 'Not recorded'}</p>}
            {shouldDisplay(reportData.ultrasound_fetal_assessment?.amniotic_fluid || reportData.amnioticFluid) && <p><strong>Amniotic Fluid:</strong> {reportData.ultrasound_fetal_assessment?.amniotic_fluid || reportData.amnioticFluid || 'Not recorded'}</p>}
            {shouldDisplay(reportData.ultrasound_fetal_assessment?.estimated_fetal_weight || reportData.estimatedFetalWeight) && <p><strong>Estimated Fetal Weight:</strong> {reportData.ultrasound_fetal_assessment?.estimated_fetal_weight || reportData.estimatedFetalWeight || 'N/A'} grams</p>}
            {shouldDisplay(reportData.ultrasound_fetal_assessment?.additional_ultrasound_findings || reportData.additionalFindings) && <p><strong>Additional Findings:</strong> {reportData.ultrasound_fetal_assessment?.additional_ultrasound_findings || reportData.additionalFindings || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Risk Assessment & Summary */}
      {hasData(reportData.risk_assessment_summary) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Risk Assessment & Summary</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.risk_assessment_summary.overall_risk_category) && <p><strong>Overall Risk Category:</strong> {reportData.risk_assessment_summary.overall_risk_category}</p>}
            {shouldDisplay(reportData.risk_assessment_summary.key_risk_factors) && <p><strong>Key Risk Factors:</strong> {reportData.risk_assessment_summary.key_risk_factors}</p>}
            {shouldDisplay(reportData.risk_assessment_summary.clinical_impression) && <p><strong>Clinical Impression / Summary:</strong> {reportData.risk_assessment_summary.clinical_impression}</p>}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Care Plan & Follow-up */}
      {(hasData(reportData.care_plan_followup) || shouldDisplay(reportData.nextVisitDate) || shouldDisplay(reportData.recommendedTests) || shouldDisplay(reportData.medicationsPrescribed) || shouldDisplay(reportData.dietaryRecommendations) || shouldDisplay(reportData.activityRestrictions) || shouldDisplay(reportData.emergencyInstructions)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Care Plan & Follow-up</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.care_plan_followup?.next_visit_date || reportData.nextVisitDate) && <p><strong>Next Visit Date:</strong> {reportData.care_plan_followup?.next_visit_date || reportData.nextVisitDate || 'Not recorded'}</p>}
            {shouldDisplay(reportData.care_plan_followup?.next_visit_type) && <p><strong>Next Visit Type:</strong> {reportData.care_plan_followup.next_visit_type}</p>}
            {shouldDisplay(reportData.care_plan_followup?.recommended_tests || reportData.recommendedTests) && <p><strong>Recommended Tests:</strong> {reportData.care_plan_followup?.recommended_tests || reportData.recommendedTests || 'Not recorded'}</p>}
            {(reportData.care_plan_followup?.medications_prescribed && reportData.care_plan_followup.medications_prescribed.length > 0) || shouldDisplay(reportData.medicationsPrescribed) ? (
              <div>
                <strong>Medications Prescribed:</strong>
                {reportData.care_plan_followup?.medications_prescribed && reportData.care_plan_followup.medications_prescribed.length > 0 ? (
                  <ul className="ml-4 mt-1 list-disc">
                    {reportData.care_plan_followup.medications_prescribed.map((med, idx) => (
                      <li key={idx} className="text-sm">
                        {typeof med === 'object' ? `${med.name || med.med || ''} ${med.dosage || ''} ${med.frequency || ''}`.trim() : med}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ml-4">{reportData.medicationsPrescribed || 'Not recorded'}</p>
                )}
              </div>
            ) : null}
            {shouldDisplay(reportData.care_plan_followup?.dietary_recommendations || reportData.dietaryRecommendations) && <p><strong>Dietary Recommendations:</strong> {reportData.care_plan_followup?.dietary_recommendations || reportData.dietaryRecommendations || 'Not recorded'}</p>}
            {shouldDisplay(reportData.care_plan_followup?.activity_work_restrictions || reportData.activityRestrictions) && <p><strong>Activity & Work Restrictions:</strong> {reportData.care_plan_followup?.activity_work_restrictions || reportData.activityRestrictions || 'Not recorded'}</p>}
            {shouldDisplay(reportData.care_plan_followup?.emergency_instructions || reportData.emergencyInstructions) && <p><strong>Emergency Instructions:</strong> {reportData.care_plan_followup?.emergency_instructions || reportData.emergencyInstructions || 'Not recorded'}</p>}
            {shouldDisplay(reportData.care_plan_followup?.planned_place_of_delivery) && <p><strong>Planned Place of Delivery:</strong> {reportData.care_plan_followup.planned_place_of_delivery}</p>}
            {shouldDisplay(reportData.care_plan_followup?.planned_mode_of_delivery) && <p><strong>Planned Mode of Delivery:</strong> {reportData.care_plan_followup.planned_mode_of_delivery}</p>}
          </div>
        </div>
      )}
      
      {/* Notes, Counselling & Sign-off */}
      {(hasData(reportData.notes_counselling_signoff) || shouldDisplay(reportData.generalObservations) || shouldDisplay(reportData.patientConcerns) || shouldDisplay(reportData.providerNotes) || shouldDisplay(reportData.followUpPlan)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Notes, Counselling & Sign-off</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.notes_counselling_signoff?.general_observations || reportData.generalObservations) && <p><strong>General Observations:</strong> {reportData.notes_counselling_signoff?.general_observations || reportData.generalObservations || 'Not recorded'}</p>}
            {shouldDisplay(reportData.notes_counselling_signoff?.patient_concerns || reportData.patientConcerns) && <p><strong>Patient Concerns / Questions:</strong> {reportData.notes_counselling_signoff?.patient_concerns || reportData.patientConcerns || 'Not recorded'}</p>}
            {shouldDisplay(reportData.notes_counselling_signoff?.counselling_provided || reportData.counsellingProvided) && <p><strong>Counselling Provided:</strong> {reportData.notes_counselling_signoff?.counselling_provided || reportData.counsellingProvided || 'Not recorded'}</p>}
            {shouldDisplay(reportData.notes_counselling_signoff?.follow_up_plan_narrative || reportData.followUpPlan) && <p><strong>Follow-up Plan (narrative):</strong> {reportData.notes_counselling_signoff?.follow_up_plan_narrative || reportData.followUpPlan || 'Not recorded'}</p>}
            {shouldDisplay(reportData.notes_counselling_signoff?.provider_signature) && <p><strong>Provider Signature / Name:</strong> {reportData.notes_counselling_signoff.provider_signature}</p>}
            {shouldDisplay(reportData.notes_counselling_signoff?.documentation_date_time) && <p><strong>Date & Time of Documentation:</strong> {reportData.notes_counselling_signoff.documentation_date_time}</p>}
          </div>
        </div>
      )}
    </>
  );
};

// Gynecology-specific report view component
const GynecologyReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  const meta = reportData.meta || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Get patient information from backend
  const patientName = report.patient?.name || 
    (report.patient?.first_name && report.patient?.last_name 
      ? `${report.patient.first_name} ${report.patient.last_name}` 
      : report.patient?.patient_name) || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  const patientDob = report.patient?.dob || report.patient?.date_of_birth || null;
  const patientId = report.patient?.id || report.patient?.mrn || report.patient?.patient_id || 'N/A';
  const patientPhone = report.patient?.phone || report.patient?.phoneNumber || report.patient?.contact_number || null;
  const patientAddress = report.patient?.address || null;
  const patientEmergencyContact = report.patient?.emergency_contact || null;
  const patientMaritalStatus = report.patient?.marital_status || report.patient?.maritalStatus || null;
  const patientOccupation = report.patient?.occupation || null;
  
  // Get clinic information
  const clinicName = report.clinic?.name || meta.clinic_name || t('gynecologyForm.clinic') || 'Клиника';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || t('gynecologyForm.physician') || 'Врач';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get visit type
  const visitType = reportData.visit_type || null;
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('gynecologyForm.notSavedYet') || 'Еще не сохранено');
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const codes = reportData.diagnosis_codes || [];
    
    let text = '';
    if (diagnosis && typeof diagnosis === 'object' && (diagnosis.code || diagnosis.term)) {
      text = `${diagnosis.code || ''} ${diagnosis.term || ''}`.trim();
    } else if (diagnosis) {
      text = String(diagnosis);
    }
    
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Additional Diagnoses: ${codesText}`;
      }
    }
    
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">{t('gynecologyForm.patientInformation') || 'Информация о пациенте'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('gynecologyForm.patient') || 'Пациент'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('gynecologyForm.years') || 'лет'}, ${patientGender})`}
            </p>
            {patientDob && (
              <p className="text-sm text-gray-600 mt-1">{t('gynecologyForm.dateOfBirth') || 'Дата рождения'}: {new Date(patientDob).toLocaleDateString()}</p>
            )}
            {patientId && patientId !== 'N/A' && (
              <p className="text-sm text-gray-600">{t('gynecologyForm.idMrn') || 'ID/MRN'}: {patientId}</p>
            )}
            {patientPhone && (
              <p className="text-sm text-gray-600">{t('gynecologyForm.contactNumber') || 'Контактный номер'}: {patientPhone}</p>
            )}
            {patientAddress && (
              <p className="text-sm text-gray-600">{t('gynecologyForm.address') || 'Адрес'}: {patientAddress}</p>
            )}
            {patientEmergencyContact && (
              <p className="text-sm text-gray-600">{t('gynecologyForm.emergencyContact') || 'Экстренный контакт'}: {patientEmergencyContact}</p>
            )}
            {patientMaritalStatus && (
              <p className="text-sm text-gray-600">{t('gynecologyForm.maritalStatus') || 'Семейное положение'}: {patientMaritalStatus}</p>
            )}
            {patientOccupation && (
              <p className="text-sm text-gray-600">{t('gynecologyForm.occupation') || 'Профессия'}: {patientOccupation}</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('gynecologyForm.clinic') || 'Клиника'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('gynecologyForm.physician') || 'Врач'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('gynecologyForm.encounter') || 'Встреча'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
            {visitType && (
              <p className="text-sm text-gray-600 mt-1">{t('gynecologyForm.visitType') || 'Тип визита'}: {visitType}</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('gynecologyForm.lastSaved') || 'Последнее сохранение'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint || reportData.presenting_complaint_hpi?.presenting_complaint} />
      
      {/* Presenting Complaint & HPI */}
      {hasData(reportData.presenting_complaint_hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Presenting Complaint & History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.presenting_complaint_hpi.duration_of_symptoms) && (
              <p><strong>Duration of Symptoms:</strong> {reportData.presenting_complaint_hpi.duration_of_symptoms}</p>
            )}
            {shouldDisplay(reportData.presenting_complaint_hpi.history_of_present_illness) && (
              <p><strong>History of Present Illness:</strong> {reportData.presenting_complaint_hpi.history_of_present_illness}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Menstrual & Reproductive History */}
      {hasData(reportData.menstrual_reproductive_history) && (
        <div className="bg-white p-4 border-l-4 border-pink-500/60 shadow-sm">
          <h3 className="text-md font-bold text-pink-600 mb-2">Menstrual & Reproductive History</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.menstrual_reproductive_history.menarche_age) && (
              <p><strong>Menarche Age:</strong> {reportData.menstrual_reproductive_history.menarche_age} years</p>
            )}
            {shouldDisplay(reportData.menstrual_reproductive_history.cycle_pattern) && (
              <p><strong>Cycle Pattern:</strong> {reportData.menstrual_reproductive_history.cycle_pattern}</p>
            )}
            {shouldDisplay(reportData.menstrual_reproductive_history.last_menstrual_period) && (
              <p><strong>Last Menstrual Period:</strong> {reportData.menstrual_reproductive_history.last_menstrual_period}</p>
            )}
            {shouldDisplay(reportData.menstrual_reproductive_history.flow_amount) && (
              <p><strong>Flow Amount:</strong> {reportData.menstrual_reproductive_history.flow_amount}</p>
            )}
            {shouldDisplay(reportData.menstrual_reproductive_history.dysmenorrhea) && (
              <p><strong>Dysmenorrhea:</strong> {reportData.menstrual_reproductive_history.dysmenorrhea}</p>
            )}
            {shouldDisplay(reportData.menstrual_reproductive_history.contraception_use) && (
              <p><strong>Contraception Use:</strong> {reportData.menstrual_reproductive_history.contraception_use}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Physical Examination */}
      {hasData(reportData.physical_examination) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Physical Examination</h3>
          <div className="text-gray-800 space-y-4">
            {hasData(reportData.physical_examination.vitals) && (
              <div>
                <h4 className="font-semibold mb-2">Vital Signs</h4>
                <div className="ml-4 space-y-1 text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
                  {shouldDisplay(reportData.physical_examination.vitals.blood_pressure) && (
                    <p><strong>BP:</strong> {reportData.physical_examination.vitals.blood_pressure}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.vitals.pulse_rate) && (
                    <p><strong>Pulse:</strong> {reportData.physical_examination.vitals.pulse_rate} bpm</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.vitals.temperature) && (
                    <p><strong>Temp:</strong> {reportData.physical_examination.vitals.temperature}°C</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.vitals.weight) && (
                    <p><strong>Weight:</strong> {reportData.physical_examination.vitals.weight} kg</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.vitals.height) && (
                    <p><strong>Height:</strong> {reportData.physical_examination.vitals.height} cm</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.vitals.bmi) && (
                    <p><strong>BMI:</strong> {reportData.physical_examination.vitals.bmi}</p>
                  )}
                </div>
              </div>
            )}
            {hasData(reportData.physical_examination.pelvic_examination) && (
              <div>
                <h4 className="font-semibold mb-2">Pelvic Examination</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.physical_examination.pelvic_examination.cervix_appearance) && (
                    <p><strong>Cervix Appearance:</strong> {reportData.physical_examination.pelvic_examination.cervix_appearance}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.pelvic_examination.uterus_size) && (
                    <p><strong>Uterus Size:</strong> {reportData.physical_examination.pelvic_examination.uterus_size}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.pelvic_examination.uterus_position) && (
                    <p><strong>Uterus Position:</strong> {reportData.physical_examination.pelvic_examination.uterus_position}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.pelvic_examination.adnexal_findings) && (
                    <p><strong>Adnexal Findings:</strong> {reportData.physical_examination.pelvic_examination.adnexal_findings}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Investigations */}
      {hasData(reportData.investigations) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Investigations</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.investigations.pregnancy_test) && (
              <p><strong>Pregnancy Test:</strong> {reportData.investigations.pregnancy_test}</p>
            )}
            {shouldDisplay(reportData.investigations.laboratory_tests) && (
              <p><strong>Laboratory Tests:</strong> {reportData.investigations.laboratory_tests}</p>
            )}
            {shouldDisplay(reportData.investigations.imaging) && (
              <p><strong>Imaging:</strong> {reportData.investigations.imaging}</p>
            )}
            {shouldDisplay(reportData.investigations.cervical_screening_colposcopy) && (
              <p><strong>Cervical Screening / Colposcopy:</strong> {reportData.investigations.cervical_screening_colposcopy}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Management Plan */}
      {hasData(reportData.management_plan) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Management Plan</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.management_plan.problem_list) && (
              <p><strong>Problem List / Clinical Impression:</strong> {reportData.management_plan.problem_list}</p>
            )}
            {reportData.management_plan.medications_prescribed && reportData.management_plan.medications_prescribed.length > 0 && (
              <div>
                <strong>Medications Prescribed:</strong>
                <ul className="ml-4 mt-1 list-disc">
                  {reportData.management_plan.medications_prescribed.map((med, idx) => (
                    <li key={idx} className="text-sm">
                      {typeof med === 'object' ? `${med.name || med.med || ''} ${med.dosage || ''} ${med.frequency || ''}`.trim() : med}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {shouldDisplay(reportData.management_plan.procedures_performed_today) && (
              <p><strong>Procedures Performed Today:</strong> {reportData.management_plan.procedures_performed_today}</p>
            )}
            {shouldDisplay(reportData.management_plan.procedures_planned_referrals) && (
              <p><strong>Procedures Planned / Referrals:</strong> {reportData.management_plan.procedures_planned_referrals}</p>
            )}
            {shouldDisplay(reportData.management_plan.follow_up_plan) && (
              <p><strong>Follow-up Plan:</strong> {reportData.management_plan.follow_up_plan}</p>
            )}
            {shouldDisplay(reportData.management_plan.follow_up_date) && (
              <p><strong>Follow-up Date:</strong> {reportData.management_plan.follow_up_date}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Counselling & Sign-off */}
      {hasData(reportData.counselling_signoff) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Counselling & Sign-off</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.counselling_signoff.counselling_provided) && (
              <p><strong>Counselling Provided:</strong> {reportData.counselling_signoff.counselling_provided}</p>
            )}
            {shouldDisplay(reportData.counselling_signoff.safety_warning_signs_explained) && (
              <p><strong>Safety / Warning Signs Explained:</strong> {reportData.counselling_signoff.safety_warning_signs_explained}</p>
            )}
            {shouldDisplay(reportData.counselling_signoff.patient_questions_concerns) && (
              <p><strong>Patient Questions / Concerns:</strong> {reportData.counselling_signoff.patient_questions_concerns}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Urology-specific report view component
const UrologyReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  const meta = reportData.meta || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const main = diagnosis.main || '';
    const secondary = diagnosis.secondary || [];
    const codes = diagnosis.codes || [];
    
    let text = '';
    if (main) {
      text = typeof main === 'object' ? `${main.code || ''} ${main.term || ''}`.trim() : String(main);
    }
    if (secondary.length > 0) {
      const secondaryText = secondary.map(d => {
        if (typeof d === 'object') {
          return `${d.code || ''} ${d.term || ''}`.trim();
        }
        return String(d);
      }).filter(d => d).join(', ');
      if (secondaryText) {
        text += (text ? '\n\n' : '') + `Secondary Diagnoses: ${secondaryText}`;
      }
    }
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.system || ''} ${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Diagnosis Codes: ${codesText}`;
      }
    }
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  // Format plan
  const formatPlan = () => {
    const plan = reportData.plan || {};
    const parts = [];
    
    if (plan.meds && plan.meds.length > 0) {
      parts.push('Medications:\n' + plan.meds.map(m => {
        if (typeof m === 'object') {
          return `- ${m.name || m.med || ''} ${m.dosage || ''} ${m.frequency || ''} ${m.duration || ''}`.trim();
        }
        return `- ${m}`;
      }).join('\n'));
    }
    
    if (plan.procedures_planned && plan.procedures_planned.length > 0) {
      parts.push('Planned Procedures:\n' + plan.procedures_planned.map(p => {
        if (typeof p === 'object') {
          return `- ${p.name || ''} ${p.date || ''}`.trim();
        }
        return `- ${p}`;
      }).join('\n'));
    }
    
    if (plan.counseling && plan.counseling.length > 0) {
      parts.push('Counseling: ' + plan.counseling.join(', '));
    }
    
    if (plan.referrals && plan.referrals.length > 0) {
      parts.push('Referrals: ' + plan.referrals.join(', '));
    }
    
    if (plan.follow_up) {
      parts.push(`Follow-up: ${plan.follow_up}${plan.follow_up_date ? ` (${plan.follow_up_date})` : ''}`);
    }
    
    return parts.join('\n\n') || report.treatmentPlan || 'No treatment plan specified';
  };
  
  // Get patient information
  const patientName = report.patient?.name || 
    (report.patient?.first_name && report.patient?.last_name 
      ? `${report.patient.first_name} ${report.patient.last_name}` 
      : report.patient?.patient_name) || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  
  // Get clinic information
  const clinicName = t('urologyReport.urologyDepartment') || 'Urology Department';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || t('urologyReport.drSmith') || 'Dr. Smith';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('urologyReport.notSavedYet') || 'Not saved yet');
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">Report Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('urologyReport.patient') || 'Patient'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('urologyReport.years') || 'years'}, ${patientGender})`}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('urologyReport.clinic') || 'Clinic'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('urologyReport.physician') || 'Physician'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('urologyReport.encounter') || 'Encounter'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('urologyReport.lastSaved') || 'Last Saved'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint} />
      
      {/* Scores Section */}
      {hasData(reportData.scores) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Assessment Scores</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.scores.ipss && (
              <div>
                <strong>IPSS (International Prostate Symptom Score):</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {Object.entries(reportData.scores.ipss).map(([key, value]) => (
                    key !== 'total' && shouldDisplay(value) && <p key={key}>Q{key.replace('q', '')}: {value || 'N/A'}</p>
                  ))}
                  {shouldDisplay(reportData.scores.ipss.total) && <p className="font-semibold">Total: {reportData.scores.ipss.total || 'N/A'}</p>}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.scores.qol) && <p><strong>Quality of Life (QOL):</strong> {reportData.scores.qol || 'Not recorded'}</p>}
            {reportData.scores.iief5 && (
              <div>
                <strong>IIEF-5 (International Index of Erectile Function):</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {Object.entries(reportData.scores.iief5).map(([key, value]) => (
                    key !== 'total' && shouldDisplay(value) && <p key={key}>Q{key.replace('q', '')}: {value || 'N/A'}</p>
                  ))}
                  {shouldDisplay(reportData.scores.iief5.total) && <p className="font-semibold">Total: {reportData.scores.iief5.total || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.scores.iciq_ui_sf && (
              <div>
                <strong>ICIQ-UI-SF (Incontinence):</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {Object.entries(reportData.scores.iciq_ui_sf).map(([key, value]) => (
                    key !== 'total' && shouldDisplay(value) && <p key={key}>Q{key.replace('q', '')}: {value || 'N/A'}</p>
                  ))}
                  {shouldDisplay(reportData.scores.iciq_ui_sf.total) && <p className="font-semibold">Total: {reportData.scores.iciq_ui_sf.total || 'N/A'}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* HPI Section */}
      {hasData(reportData.hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.hpi.onset) && <p><strong>Onset:</strong> {reportData.hpi.onset || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.duration) && <p><strong>Duration:</strong> {reportData.hpi.duration || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.course) && <p><strong>Course:</strong> {reportData.hpi.course || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.triggers) && <p><strong>Triggers:</strong> {reportData.hpi.triggers || 'Not recorded'}</p>}
            {reportData.hpi.associated_symptoms && reportData.hpi.associated_symptoms.length > 0 && (
              <p><strong>Associated Symptoms:</strong> {reportData.hpi.associated_symptoms.join(', ')}</p>
            )}
            {shouldDisplay(reportData.hpi.pain_site) && <p><strong>Pain Site:</strong> {reportData.hpi.pain_site || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.pain_severity_vas) && <p><strong>Pain Severity (VAS):</strong> {reportData.hpi.pain_severity_vas || 'N/A'}/10</p>}
            {reportData.hpi.luts && (
              <div>
                <strong>Lower Urinary Tract Symptoms (LUTS):</strong>
                <div className="ml-4 mt-1">
                  {Object.entries(reportData.hpi.luts).map(([key, value]) => (
                    value && <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.hpi.hematuria) && reportData.hpi.hematuria !== 'none' && (
              <p><strong>Hematuria:</strong> {reportData.hpi.hematuria || 'Not recorded'}</p>
            )}
            {reportData.hpi.dysuria !== undefined && (
              <p><strong>Dysuria:</strong> {reportData.hpi.dysuria ? 'Yes' : 'No'}</p>
            )}
            {reportData.hpi.incontinence_types && reportData.hpi.incontinence_types.length > 0 && (
              <p><strong>Incontinence Types:</strong> {reportData.hpi.incontinence_types.join(', ')}</p>
            )}
            {reportData.hpi.sexual && (
              <div>
                <strong>Sexual History:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {reportData.hpi.sexual.ed !== undefined && <p>Erectile Dysfunction: {reportData.hpi.sexual.ed ? 'Yes' : 'No'}</p>}
                  {shouldDisplay(reportData.hpi.sexual.iief5_total) && <p>IIEF-5 Total: {reportData.hpi.sexual.iief5_total || 'N/A'}</p>}
                  {shouldDisplay(reportData.hpi.sexual.libido) && <p>Libido: {reportData.hpi.sexual.libido || 'Not recorded'}</p>}
                  {shouldDisplay(reportData.hpi.sexual.ejaculation_issues) && <p>Ejaculation Issues: {reportData.hpi.sexual.ejaculation_issues || 'Not recorded'}</p>}
                  {reportData.hpi.sexual.infertility !== undefined && <p>Infertility: {reportData.hpi.sexual.infertility ? 'Yes' : 'No'}</p>}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.hpi.meds) && <p><strong>Current Medications:</strong> {reportData.hpi.meds || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.allergies) && <p><strong>Allergies:</strong> {reportData.hpi.allergies || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.pmh) && <p><strong>Past Medical History:</strong> {reportData.hpi.pmh || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.psh) && <p><strong>Past Surgical History:</strong> {reportData.hpi.psh || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.family) && <p><strong>Family History:</strong> {reportData.hpi.family || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.social) && <p><strong>Social History:</strong> {reportData.hpi.social || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Vitals */}
      {hasData(reportData.vitals) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Vital Signs</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {shouldDisplay(reportData.vitals.bp) && <p><strong>Blood Pressure:</strong> {reportData.vitals.bp || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.hr) && <p><strong>Heart Rate:</strong> {reportData.vitals.hr || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.temp) && <p><strong>Temperature:</strong> {reportData.vitals.temp || 'N/A'}°C</p>}
              {shouldDisplay(reportData.vitals.spo2) && <p><strong>SpO2:</strong> {reportData.vitals.spo2 || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.height_cm) && <p><strong>Height:</strong> {reportData.vitals.height_cm || 'N/A'} cm</p>}
              {shouldDisplay(reportData.vitals.weight_kg) && <p><strong>Weight:</strong> {reportData.vitals.weight_kg || 'N/A'} kg</p>}
              {shouldDisplay(reportData.vitals.bmi) && <p><strong>BMI:</strong> {reportData.vitals.bmi || 'N/A'}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Examination */}
      {hasData(reportData.exam) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Physical Examination</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.exam.abdomen) && <p><strong>Abdomen:</strong> {reportData.exam.abdomen || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.cVAT) && reportData.exam.cVAT !== 'absent' && (
              <p><strong>CVA Tenderness:</strong> {reportData.exam.cVAT || 'Not recorded'}</p>
            )}
            {shouldDisplay(reportData.exam.bladder_distension) && reportData.exam.bladder_distension !== 'none' && (
              <p><strong>Bladder Distension:</strong> {reportData.exam.bladder_distension || 'Not recorded'}</p>
            )}
            {shouldDisplay(reportData.exam.male_genital) && <p><strong>Male Genital:</strong> {reportData.exam.male_genital || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.female_genital) && <p><strong>Female Genital:</strong> {reportData.exam.female_genital || 'Not recorded'}</p>}
            {reportData.exam.dre && (
              <div>
                <strong>Digital Rectal Examination (DRE):</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.exam.dre.tone) && <p>Tone: {reportData.exam.dre.tone || 'N/A'}</p>}
                  {shouldDisplay(reportData.exam.dre.prostate_size) && <p>Prostate Size: {reportData.exam.dre.prostate_size || 'N/A'}</p>}
                  {reportData.exam.dre.nodules !== undefined && <p>Nodules: {reportData.exam.dre.nodules ? 'Yes' : 'No'}</p>}
                  {reportData.exam.dre.tenderness !== undefined && <p>Tenderness: {reportData.exam.dre.tenderness ? 'Yes' : 'No'}</p>}
                  {shouldDisplay(reportData.exam.dre.comments) && <p>Comments: {reportData.exam.dre.comments || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.exam.pop_q) && <p><strong>POP-Q:</strong> {reportData.exam.pop_q || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Functional Tests */}
      {hasData(reportData.functional) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Functional Tests</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.functional.pvr_ml) && <p><strong>Post-Void Residual (PVR):</strong> {reportData.functional.pvr_ml || 'N/A'} ml</p>}
            {reportData.functional.uroflow && (
              <div>
                <strong>Uroflowmetry:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.functional.uroflow.qmax_ml_s) && <p>Qmax: {reportData.functional.uroflow.qmax_ml_s || 'N/A'} ml/s</p>}
                  {shouldDisplay(reportData.functional.uroflow.qavg_ml_s) && <p>Qavg: {reportData.functional.uroflow.qavg_ml_s || 'N/A'} ml/s</p>}
                  {shouldDisplay(reportData.functional.uroflow.voided_vol_ml) && <p>Voided Volume: {reportData.functional.uroflow.voided_vol_ml || 'N/A'} ml</p>}
                  {shouldDisplay(reportData.functional.uroflow.void_time_s) && <p>Void Time: {reportData.functional.uroflow.void_time_s || 'N/A'} s</p>}
                  {shouldDisplay(reportData.functional.uroflow.curve_notes) && <p>Curve Notes: {reportData.functional.uroflow.curve_notes || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {reportData.functional.incontinence && (
              <div>
                <strong>Incontinence:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.functional.incontinence.type) && reportData.functional.incontinence.type !== 'none' && (
                    <p>Type: {reportData.functional.incontinence.type || 'N/A'}</p>
                  )}
                  {shouldDisplay(reportData.functional.incontinence.pad_test_g) && <p>Pad Test: {reportData.functional.incontinence.pad_test_g || 'N/A'} g</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Laboratory Tests & Imaging */}
      {hasData(reportData.labs_imaging) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Laboratory Tests & Imaging</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.labs_imaging.urinalysis && (
              <div>
                <strong>Urinalysis:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
                  {shouldDisplay(reportData.labs_imaging.urinalysis.blood) && <p>Blood: {reportData.labs_imaging.urinalysis.blood || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urinalysis.protein) && <p>Protein: {reportData.labs_imaging.urinalysis.protein || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urinalysis.nitrite) && <p>Nitrite: {reportData.labs_imaging.urinalysis.nitrite || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urinalysis.leuk_esterase) && <p>Leuk Esterase: {reportData.labs_imaging.urinalysis.leuk_esterase || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urinalysis.rbc_hpf) && <p>RBC/HPF: {reportData.labs_imaging.urinalysis.rbc_hpf || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urinalysis.wbc_hpf) && <p>WBC/HPF: {reportData.labs_imaging.urinalysis.wbc_hpf || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.labs_imaging.urine_culture && (
              <div>
                <strong>Urine Culture:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.labs_imaging.urine_culture.date) && <p>Date: {reportData.labs_imaging.urine_culture.date || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urine_culture.cfu) && <p>CFU: {reportData.labs_imaging.urine_culture.cfu || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urine_culture.organism) && <p>Organism: {reportData.labs_imaging.urine_culture.organism || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urine_culture.sensitivities) && <p>Sensitivities: {reportData.labs_imaging.urine_culture.sensitivities || 'Not recorded'}</p>}
                  {shouldDisplay(reportData.labs_imaging.urine_culture.antibiotics_started) && <p>Antibiotics Started: {reportData.labs_imaging.urine_culture.antibiotics_started || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {reportData.labs_imaging.renal_panel && (
              <div>
                <strong>Renal Panel:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
                  {shouldDisplay(reportData.labs_imaging.renal_panel.bun) && <p>BUN: {reportData.labs_imaging.renal_panel.bun || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.renal_panel.creatinine) && <p>Creatinine: {reportData.labs_imaging.renal_panel.creatinine || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.renal_panel.eGFR) && <p>eGFR: {reportData.labs_imaging.renal_panel.eGFR || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.labs_imaging.psa && (
              <div>
                <strong>PSA (Prostate-Specific Antigen):</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.labs_imaging.psa.total_ng_ml) && <p>Total PSA: {reportData.labs_imaging.psa.total_ng_ml || 'N/A'} ng/mL</p>}
                  {shouldDisplay(reportData.labs_imaging.psa.free_ng_ml) && <p>Free PSA: {reportData.labs_imaging.psa.free_ng_ml || 'N/A'} ng/mL</p>}
                  {shouldDisplay(reportData.labs_imaging.psa.ratio) && <p>Free/Total Ratio: {reportData.labs_imaging.psa.ratio || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.psa.date) && <p>Date: {reportData.labs_imaging.psa.date || 'N/A'}</p>}
                  {reportData.labs_imaging.psa.pre_DRE !== undefined && (
                    <p>Pre-DRE: {reportData.labs_imaging.psa.pre_DRE ? 'Yes' : 'No'}</p>
                  )}
                </div>
              </div>
            )}
            {reportData.labs_imaging.hormones && (
              <div>
                <strong>Hormones:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
                  {shouldDisplay(reportData.labs_imaging.hormones.testosterone_total) && <p>Testosterone (Total): {reportData.labs_imaging.hormones.testosterone_total || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.hormones.prolactin) && <p>Prolactin: {reportData.labs_imaging.hormones.prolactin || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.hormones.lh) && <p>LH: {reportData.labs_imaging.hormones.lh || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.hormones.fsh) && <p>FSH: {reportData.labs_imaging.hormones.fsh || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.labs_imaging.semen_analysis && (
              <div>
                <strong>Semen Analysis:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.labs_imaging.semen_analysis.date) && <p>Date: {reportData.labs_imaging.semen_analysis.date || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs_imaging.semen_analysis.volume_ml) && <p>Volume: {reportData.labs_imaging.semen_analysis.volume_ml || 'N/A'} ml</p>}
                  {shouldDisplay(reportData.labs_imaging.semen_analysis.count_million_ml) && <p>Count: {reportData.labs_imaging.semen_analysis.count_million_ml || 'N/A'} million/ml</p>}
                  {shouldDisplay(reportData.labs_imaging.semen_analysis.motility_pct) && <p>Motility: {reportData.labs_imaging.semen_analysis.motility_pct || 'N/A'}%</p>}
                  {shouldDisplay(reportData.labs_imaging.semen_analysis.morphology_pct) && <p>Morphology: {reportData.labs_imaging.semen_analysis.morphology_pct || 'N/A'}%</p>}
                </div>
              </div>
            )}
            {reportData.labs_imaging.imaging_links && reportData.labs_imaging.imaging_links.length > 0 && (
              <div>
                <strong>Imaging Links:</strong>
                <div className="ml-4 mt-1 space-y-2">
                  {reportData.labs_imaging.imaging_links.map((study, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-2 text-sm">
                      {typeof study === 'object' ? (
                        <>
                          {study.modality && <p>Modality: {study.modality}</p>}
                          {study.description && <p>Description: {study.description}</p>}
                          {study.date && <p>Date: {study.date}</p>}
                          {study.study_uid && <p>Study UID: {study.study_uid}</p>}
                        </>
                      ) : (
                        <p>{study}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reportData.labs_imaging.referenced_docs && reportData.labs_imaging.referenced_docs.length > 0 && (
              <div>
                <strong>Referenced Documents:</strong>
                <div className="ml-4 mt-1">
                  {reportData.labs_imaging.referenced_docs.map((doc, idx) => (
                    <p key={idx} className="text-sm">{typeof doc === 'object' ? JSON.stringify(doc) : doc}</p>
                  ))}
                </div>
              </div>
            )}
            {reportData.labs_imaging.imaging && reportData.labs_imaging.imaging.length > 0 && (
              <div>
                <strong>Imaging Studies:</strong>
                <div className="ml-4 mt-1 space-y-2">
                  {reportData.labs_imaging.imaging.map((img, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-2 text-sm">
                      {typeof img === 'object' ? (
                        <>
                          {img.modality && <p>Modality: {img.modality}</p>}
                          {img.description && <p>Description: {img.description}</p>}
                          {img.date && <p>Date: {img.date}</p>}
                          {img.findings && <p>Findings: {img.findings}</p>}
                        </>
                      ) : (
                        <p>{img}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Plan & Treatment (for initial mode) */}
      {reportData.plan && <Section title="Treatment Plan" content={formatPlan()} />}
      
      {/* Procedures Done */}
      {reportData.procedures_done && reportData.procedures_done.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Procedures Done</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.procedures_done.map((proc, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <p className="font-medium">{typeof proc === 'object' ? (proc.name || `Procedure ${idx + 1}`) : proc}</p>
                {typeof proc === 'object' && (
                  <div className="mt-1 text-sm space-y-1">
                    {proc.date && <p>Date: {proc.date}</p>}
                    {proc.description && <p>Description: {proc.description}</p>}
                    {proc.result && <p>Result: {proc.result}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Outcome (for discharge mode) */}
      {reportData.outcome && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Outcome</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.outcome.condition) && <p><strong>Condition:</strong> {reportData.outcome.condition || 'Not recorded'}</p>}
            {shouldDisplay(reportData.outcome.course) && <p><strong>Course:</strong> {reportData.outcome.course || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {reportData.attachments && reportData.attachments.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Attachments</h3>
          <div className="text-gray-800">
            {reportData.attachments.map((att, idx) => (
              <div key={idx} className="text-sm">
                {typeof att === 'object' ? (att.label || att.id || `Attachment ${idx + 1}`) : att} {att.type && `(${att.type})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Oncology-specific report view component
const OncologyReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  const meta = reportData.meta || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const main = diagnosis.main || '';
    const secondary = diagnosis.secondary || [];
    const codes = diagnosis.codes || [];
    
    let text = '';
    if (main) {
      text = typeof main === 'object' ? `${main.code || ''} ${main.term || ''}`.trim() : String(main);
    }
    if (secondary.length > 0) {
      const secondaryText = secondary.map(d => {
        if (typeof d === 'object') {
          return `${d.code || ''} ${d.term || ''}`.trim();
        }
        return String(d);
      }).filter(d => d).join(', ');
      if (secondaryText) {
        text += (text ? '\n\n' : '') + `Secondary Diagnoses: ${secondaryText}`;
      }
    }
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.system || ''} ${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Diagnosis Codes: ${codesText}`;
      }
    }
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  // Format plan
  const formatPlan = () => {
    const plan = reportData.plan || {};
    const parts = [];
    
    if (shouldDisplay(plan.bsa)) {
      parts.push(`BSA: ${plan.bsa} m²`);
    }
    
    if (shouldDisplay(plan.regimen)) {
      parts.push(`Regimen: ${plan.regimen}`);
    }
    
    if (shouldDisplay(plan.line)) {
      parts.push(`Line of Therapy: ${plan.line}`);
    }
    
    if (shouldDisplay(plan.type)) {
      parts.push(`Treatment Type: ${plan.type}`);
    }
    
    if (plan.schedule) {
      const scheduleParts = [];
      if (shouldDisplay(plan.schedule.schema)) scheduleParts.push(`Schema: ${plan.schedule.schema}`);
      if (shouldDisplay(plan.schedule.cycles_planned)) scheduleParts.push(`Cycles Planned: ${plan.schedule.cycles_planned}`);
      if (shouldDisplay(plan.schedule.start_date)) scheduleParts.push(`Start Date: ${plan.schedule.start_date}`);
      if (scheduleParts.length > 0) {
        parts.push(`Schedule: ${scheduleParts.join(', ')}`);
      }
    }
    
    if (plan.dosing && plan.dosing.length > 0) {
      parts.push('Dosing:\n' + plan.dosing.map(d => {
        if (typeof d === 'object') {
          return `- ${d.agent || ''} ${d.dose || ''} ${d.unit || ''} ${d.route || ''} ${d.frequency || ''}`.trim();
        }
        return `- ${d}`;
      }).join('\n'));
    }
    
    if (shouldDisplay(plan.premedication)) {
      parts.push(`Premedication: ${plan.premedication}`);
    }
    
    if (shouldDisplay(plan.antiemesis_risk)) {
      parts.push(`Antiemesis Risk: ${plan.antiemesis_risk}`);
    }
    
    if (plan.gcsf) {
      const gcsfParts = [];
      if (shouldDisplay(plan.gcsf.strategy)) gcsfParts.push(`Strategy: ${plan.gcsf.strategy}`);
      if (shouldDisplay(plan.gcsf.agent)) gcsfParts.push(`Agent: ${plan.gcsf.agent}`);
      if (shouldDisplay(plan.gcsf.day)) gcsfParts.push(`Day: ${plan.gcsf.day}`);
      if (gcsfParts.length > 0) {
        parts.push(`G-CSF: ${gcsfParts.join(', ')}`);
      }
    }
    
    if (plan.antimicrobial_ppx) {
      const ppParts = [];
      if (plan.antimicrobial_ppx.hbv) ppParts.push('HBV');
      if (plan.antimicrobial_ppx.pjp) ppParts.push('PJP');
      if (plan.antimicrobial_ppx.hsv_vzv) ppParts.push('HSV/VZV');
      if (plan.antimicrobial_ppx.tb) ppParts.push('TB');
      if (shouldDisplay(plan.antimicrobial_ppx.notes)) ppParts.push(`Notes: ${plan.antimicrobial_ppx.notes}`);
      if (ppParts.length > 0) {
        parts.push(`Antimicrobial Prophylaxis: ${ppParts.join(', ')}`);
      }
    }
    
    if (shouldDisplay(plan.vte_prophylaxis)) {
      parts.push(`VTE Prophylaxis: ${plan.vte_prophylaxis}`);
    }
    
    if (plan.fertility) {
      const fertParts = [];
      if (plan.fertility.counseling) fertParts.push('Counseling: Yes');
      if (plan.fertility.contraception_advice) fertParts.push('Contraception Advice: Yes');
      if (fertParts.length > 0) {
        parts.push(`Fertility: ${fertParts.join(', ')}`);
      }
    }
    
    if (shouldDisplay(plan.follow_up)) {
      parts.push(`Follow-up: ${plan.follow_up}${plan.follow_up_date ? ` (${plan.follow_up_date})` : ''}`);
    }
    
    return parts.join('\n\n') || report.treatmentPlan || 'No treatment plan specified';
  };
  
  // Get patient information
  const patientName = report.patient?.name || 
    (report.patient?.first_name && report.patient?.last_name 
      ? `${report.patient.first_name} ${report.patient.last_name}` 
      : report.patient?.patient_name) || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  
  // Get clinic information
  const clinicName = t('oncologyForm.oncologyDepartment') || 'Oncology Department';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || t('oncologyForm.drSmith') || 'Dr. Smith';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('oncologyForm.notSavedYet') || 'Not saved yet');
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">Report Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('oncologyForm.patient') || 'Patient'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('oncologyForm.years') || 'years'}, ${patientGender})`}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('oncologyForm.clinic') || 'Clinic'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('oncologyForm.physician') || 'Physician'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('oncologyForm.encounter') || 'Encounter'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('oncologyForm.lastSaved') || 'Last Saved'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint} />
      
      {/* Intent & Tumor Board */}
      {(shouldDisplay(reportData.intent) || hasData(reportData.tumor_board) || hasData(reportData.consents)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Treatment Intent & Consents</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.intent) && <p><strong>Treatment Intent:</strong> {reportData.intent || 'Not recorded'}</p>}
            {reportData.tumor_board && (
              <div>
                <strong>Tumor Board:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {reportData.tumor_board.discussed !== undefined && (
                    <p>Discussed: {reportData.tumor_board.discussed ? 'Yes' : 'No'}</p>
                  )}
                  {shouldDisplay(reportData.tumor_board.date) && <p>Date: {reportData.tumor_board.date || 'N/A'}</p>}
                  {shouldDisplay(reportData.tumor_board.decisions) && <p>Decisions: {reportData.tumor_board.decisions || 'Not recorded'}</p>}
                </div>
              </div>
            )}
            {reportData.consents && (
              <div>
                <strong>Consents:</strong>
                <div className="ml-4 mt-1 text-sm">
                  {reportData.consents.chemo !== undefined && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Chemo: {reportData.consents.chemo ? 'Yes' : 'No'}</span>}
                  {reportData.consents.immuno !== undefined && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Immunotherapy: {reportData.consents.immuno ? 'Yes' : 'No'}</span>}
                  {reportData.consents.radiation !== undefined && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Radiation: {reportData.consents.radiation ? 'Yes' : 'No'}</span>}
                  {reportData.consents.surgery !== undefined && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Surgery: {reportData.consents.surgery ? 'Yes' : 'No'}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* HPI Section */}
      {hasData(reportData.hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.hpi.description) && <p><strong>Description:</strong> {reportData.hpi.description || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.duration) && <p><strong>Duration:</strong> {reportData.hpi.duration || 'Not recorded'}</p>}
            {reportData.hpi.b_symptoms && (
              <div>
                <strong>B Symptoms:</strong>
                <div className="ml-4 mt-1">
                  {Object.entries(reportData.hpi.b_symptoms).map(([key, value]) => (
                    value && <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {reportData.hpi.associated_symptoms && reportData.hpi.associated_symptoms.length > 0 && (
              <p><strong>Associated Symptoms:</strong> {reportData.hpi.associated_symptoms.join(', ')}</p>
            )}
            {shouldDisplay(reportData.hpi.risk_factors) && <p><strong>Risk Factors:</strong> {reportData.hpi.risk_factors || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.family_history) && <p><strong>Family History:</strong> {reportData.hpi.family_history || 'Not recorded'}</p>}
            {reportData.hpi.prior_therapies && reportData.hpi.prior_therapies.length > 0 && (
              <p><strong>Prior Therapies:</strong> {reportData.hpi.prior_therapies.join(', ')}</p>
            )}
            {shouldDisplay(reportData.hpi.allergies) && <p><strong>Allergies:</strong> {reportData.hpi.allergies || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.meds_current) && <p><strong>Current Medications:</strong> {reportData.hpi.meds_current || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Performance Status & Comorbidities */}
      {(hasData(reportData.performance) || shouldDisplay(reportData.comorbidities) || hasData(reportData.nutrition) || hasData(reportData.pain)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Performance Status & Comorbidities</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.performance && (
              <div className="grid grid-cols-2 gap-4">
                {shouldDisplay(reportData.performance.ecog) && <p><strong>ECOG:</strong> {reportData.performance.ecog || 'N/A'}</p>}
                {shouldDisplay(reportData.performance.karnofsky) && <p><strong>Karnofsky:</strong> {reportData.performance.karnofsky || 'N/A'}</p>}
              </div>
            )}
            {shouldDisplay(reportData.comorbidities) && <p><strong>Comorbidities:</strong> {reportData.comorbidities || 'Not recorded'}</p>}
            {reportData.nutrition && (
              <div>
                <strong>Nutrition:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.nutrition.bmi) && <p>BMI: {reportData.nutrition.bmi || 'N/A'}</p>}
                  {shouldDisplay(reportData.nutrition.nrs2002) && <p>NRS2002: {reportData.nutrition.nrs2002 || 'N/A'}</p>}
                  {reportData.nutrition.sarcopenia !== undefined && <p>Sarcopenia: {reportData.nutrition.sarcopenia ? 'Yes' : 'No'}</p>}
                </div>
              </div>
            )}
            {reportData.pain && (
              <div>
                <strong>Pain:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.pain.score) && <p>Score: {reportData.pain.score || 'N/A'}</p>}
                  {shouldDisplay(reportData.pain.scale) && <p>Scale: {reportData.pain.scale || 'N/A'}</p>}
                  {shouldDisplay(reportData.pain.analgesics) && <p>Analgesics: {reportData.pain.analgesics || 'Not recorded'}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Vitals */}
      {hasData(reportData.vitals) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Vital Signs</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {shouldDisplay(reportData.vitals.hr) && <p><strong>Heart Rate:</strong> {reportData.vitals.hr || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.bp) && <p><strong>Blood Pressure:</strong> {reportData.vitals.bp || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.temp) && <p><strong>Temperature:</strong> {reportData.vitals.temp || 'N/A'}°C</p>}
              {shouldDisplay(reportData.vitals.spo2) && <p><strong>SpO2:</strong> {reportData.vitals.spo2 || 'N/A'}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Laboratory Tests */}
      {hasData(reportData.labs) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Laboratory Tests</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.labs.cbc && (
              <div>
                <strong>CBC:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-3 gap-2">
                  {shouldDisplay(reportData.labs.cbc.wbc) && <p>WBC: {reportData.labs.cbc.wbc || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.cbc.hb) && <p>Hb: {reportData.labs.cbc.hb || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.cbc.plt) && <p>Platelets: {reportData.labs.cbc.plt || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.labs.chem && (
              <div>
                <strong>Chemistry:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                  {shouldDisplay(reportData.labs.chem.creatinine) && <p>Creatinine: {reportData.labs.chem.creatinine || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.chem.alt) && <p>ALT: {reportData.labs.chem.alt || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.chem.ast) && <p>AST: {reportData.labs.chem.ast || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.chem.bili) && <p>Bilirubin: {reportData.labs.chem.bili || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.chem.alb) && <p>Albumin: {reportData.labs.chem.alb || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.chem.glu) && <p>Glucose: {reportData.labs.chem.glu || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.chem.na) && <p>Na: {reportData.labs.chem.na || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.chem.k) && <p>K: {reportData.labs.chem.k || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.labs.coag && (
              <div>
                <strong>Coagulation:</strong>
                <div className="ml-4 mt-1 text-sm grid grid-cols-2 gap-2">
                  {shouldDisplay(reportData.labs.coag.inr) && <p>INR: {reportData.labs.coag.inr || 'N/A'}</p>}
                  {shouldDisplay(reportData.labs.coag.aptt) && <p>aPTT: {reportData.labs.coag.aptt || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.labs.infectious && (
              <div>
                <strong>Infectious Disease Screening:</strong>
                <div className="ml-4 mt-1 text-sm">
                  {Object.entries(reportData.labs.infectious).map(([key, value]) => (
                    value && <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value === true ? 'Positive' : value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {reportData.labs.tumor_markers && reportData.labs.tumor_markers.length > 0 && (
              <div>
                <strong>Tumor Markers:</strong>
                <div className="ml-4 mt-1">
                  {reportData.labs.tumor_markers.map((marker, idx) => (
                    <span key={idx} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {typeof marker === 'object' ? `${marker.name || ''}: ${marker.value || ''}` : marker}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Pathology & Staging */}
      {(hasData(reportData.pathology) || hasData(reportData.staging)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Pathology & Staging</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.pathology && (
              <div>
                <strong>Pathology:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.pathology.site) && <p>Site: {reportData.pathology.site || 'Not recorded'}</p>}
                  {shouldDisplay(reportData.pathology.histology) && <p>Histology: {reportData.pathology.histology || 'Not recorded'}</p>}
                  {shouldDisplay(reportData.pathology.grade) && <p>Grade: {reportData.pathology.grade || 'Not recorded'}</p>}
                  {shouldDisplay(reportData.pathology.margins) && <p>Margins: {reportData.pathology.margins || 'Not recorded'}</p>}
                  {reportData.pathology.lymphovascular_invasion !== undefined && (
                    <p>Lymphovascular Invasion: {reportData.pathology.lymphovascular_invasion ? 'Yes' : 'No'}</p>
                  )}
                  {reportData.pathology.perineural_invasion !== undefined && (
                    <p>Perineural Invasion: {reportData.pathology.perineural_invasion ? 'Yes' : 'No'}</p>
                  )}
                  {reportData.pathology.biomarkers && (
                    <div className="mt-2">
                      <strong>Biomarkers:</strong>
                      <div className="ml-4 mt-1 text-sm space-y-1">
                        {shouldDisplay(reportData.pathology.biomarkers.pd_l1) && <p>PD-L1: {reportData.pathology.biomarkers.pd_l1 || 'N/A'}</p>}
                        {shouldDisplay(reportData.pathology.biomarkers.msi_mmr) && <p>MSI/MMR: {reportData.pathology.biomarkers.msi_mmr || 'N/A'}</p>}
                        {shouldDisplay(reportData.pathology.biomarkers.tmb) && <p>TMB: {reportData.pathology.biomarkers.tmb || 'N/A'}</p>}
                        {/* Add more biomarker fields as needed */}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {reportData.staging && (
              <div>
                <strong>Staging:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.staging.system) && <p>System: {reportData.staging.system || 'Not recorded'}</p>}
                  {reportData.staging.system === 'TNM' && (
                    <div>
                      {shouldDisplay(reportData.staging.t) && <p>T: {reportData.staging.t || 'N/A'}</p>}
                      {shouldDisplay(reportData.staging.n) && <p>N: {reportData.staging.n || 'N/A'}</p>}
                      {shouldDisplay(reportData.staging.m) && <p>M: {reportData.staging.m || 'N/A'}</p>}
                      {shouldDisplay(reportData.staging.stage_group) && <p>Stage Group: {reportData.staging.stage_group || 'N/A'}</p>}
                    </div>
                  )}
                  {shouldDisplay(reportData.staging.imaging_summary) && <p>Imaging Summary: {reportData.staging.imaging_summary || 'Not recorded'}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnostics */}
      {hasData(reportData.diagnostics) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Diagnostics</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.diagnostics.imaging && reportData.diagnostics.imaging.length > 0 && (
              <p><strong>Imaging:</strong> {reportData.diagnostics.imaging.join(', ')}</p>
            )}
            {reportData.diagnostics.procedures && reportData.diagnostics.procedures.length > 0 && (
              <p><strong>Procedures:</strong> {reportData.diagnostics.procedures.join(', ')}</p>
            )}
            {shouldDisplay(reportData.diagnostics.endoscopy) && <p><strong>Endoscopy:</strong> {reportData.diagnostics.endoscopy || 'Not recorded'}</p>}
            {shouldDisplay(reportData.diagnostics.notes) && <p><strong>Notes:</strong> {reportData.diagnostics.notes || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Plan & Treatment (for initial mode) */}
      {reportData.plan && <Section title="Treatment Plan" content={formatPlan()} />}
      
      {/* Surgery */}
      {reportData.surgery && reportData.surgery.planned && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Surgery</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.surgery.type) && <p><strong>Type:</strong> {reportData.surgery.type || 'Not recorded'}</p>}
            {shouldDisplay(reportData.surgery.p_tnm) && <p><strong>Pathological TNM:</strong> {reportData.surgery.p_tnm || 'Not recorded'}</p>}
            {shouldDisplay(reportData.surgery.margins) && <p><strong>Margins:</strong> {reportData.surgery.margins || 'Not recorded'}</p>}
            {shouldDisplay(reportData.surgery.complications) && <p><strong>Complications:</strong> {reportData.surgery.complications || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Radiation */}
      {reportData.radiation && reportData.radiation.planned && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Radiation Therapy</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.radiation.intent) && <p><strong>Intent:</strong> {reportData.radiation.intent || 'Not recorded'}</p>}
            {shouldDisplay(reportData.radiation.technique) && <p><strong>Technique:</strong> {reportData.radiation.technique || 'Not recorded'}</p>}
            {shouldDisplay(reportData.radiation.total_dose_gy) && <p><strong>Total Dose:</strong> {reportData.radiation.total_dose_gy || 'N/A'} Gy</p>}
            {shouldDisplay(reportData.radiation.fractions) && <p><strong>Fractions:</strong> {reportData.radiation.fractions || 'N/A'}</p>}
            {shouldDisplay(reportData.radiation.organs_at_risk) && <p><strong>Organs at Risk:</strong> {reportData.radiation.organs_at_risk || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Toxicities */}
      {reportData.toxicities && reportData.toxicities.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Toxicities</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.toxicities.map((tox, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-2 text-sm">
                {typeof tox === 'object' ? (
                  <>
                    {tox.term && <p><strong>Term:</strong> {tox.term}</p>}
                    {tox.grade && <p><strong>Grade:</strong> {tox.grade}</p>}
                    {tox.onset && <p><strong>Onset:</strong> {tox.onset}</p>}
                    {tox.resolution && <p><strong>Resolution:</strong> {tox.resolution}</p>}
                  </>
                ) : (
                  <p>{tox}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Response */}
      {hasData(reportData.response) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Treatment Response</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.response.criteria) && <p><strong>Criteria:</strong> {reportData.response.criteria || 'Not recorded'}</p>}
            {shouldDisplay(reportData.response.timepoint) && <p><strong>Timepoint:</strong> {reportData.response.timepoint || 'Not recorded'}</p>}
            {shouldDisplay(reportData.response.best_response) && <p><strong>Best Response:</strong> {reportData.response.best_response || 'Not recorded'}</p>}
            {reportData.response.target_lesions && reportData.response.target_lesions.length > 0 && (
              <p><strong>Target Lesions:</strong> {reportData.response.target_lesions.join(', ')}</p>
            )}
            {shouldDisplay(reportData.response.non_target_findings) && (
              <p><strong>Non-Target Findings:</strong> {reportData.response.non_target_findings || 'Not recorded'}</p>
            )}
            {shouldDisplay(reportData.response.new_lesions) && (
              <p><strong>New Lesions:</strong> {reportData.response.new_lesions || 'Not recorded'}</p>
            )}
            {reportData.response.mrd && (
              <div>
                <strong>MRD (Minimal Residual Disease):</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {reportData.response.mrd.assessed !== undefined && <p>Assessed: {reportData.response.mrd.assessed ? 'Yes' : 'No'}</p>}
                  {shouldDisplay(reportData.response.mrd.method) && <p>Method: {reportData.response.mrd.method || 'N/A'}</p>}
                  {shouldDisplay(reportData.response.mrd.value) && <p>Value: {reportData.response.mrd.value || 'N/A'}</p>}
                  {shouldDisplay(reportData.response.mrd.threshold) && <p>Threshold: {reportData.response.mrd.threshold || 'N/A'}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Imaging Links */}
      {reportData.imaging_links && reportData.imaging_links.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Imaging Studies</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.imaging_links.map((study, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-2 text-sm">
                {typeof study === 'object' ? (
                  <>
                    {study.modality && <p>Modality: {study.modality}</p>}
                    {study.description && <p>Description: {study.description}</p>}
                    {study.date && <p>Date: {study.date}</p>}
                    {study.study_uid && <p>Study UID: {study.study_uid}</p>}
                  </>
                ) : (
                  <p>{study}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Outcome (for discharge mode) */}
      {reportData.outcome && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Outcome</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.outcome.condition) && <p><strong>Condition:</strong> {reportData.outcome.condition || 'Not recorded'}</p>}
            {shouldDisplay(reportData.outcome.course) && <p><strong>Course:</strong> {reportData.outcome.course || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {reportData.recommendations && reportData.recommendations.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Recommendations</h3>
          <div className="text-gray-800">
            <ul className="list-disc list-inside space-y-1">
              {reportData.recommendations.map((rec, idx) => (
                <li key={idx}>{typeof rec === 'object' ? JSON.stringify(rec) : rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {reportData.attachments && reportData.attachments.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Attachments</h3>
          <div className="text-gray-800">
            {reportData.attachments.map((att, idx) => (
              <div key={idx} className="text-sm">
                {typeof att === 'object' ? (att.label || att.id || `Attachment ${idx + 1}`) : att} {att.type && `(${att.type})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Cardiology-specific report view component
const CardiologyReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  const meta = reportData.meta || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const main = diagnosis.main || '';
    const comorbid = diagnosis.comorbid || '';
    const complications = diagnosis.complications || '';
    const codes = diagnosis.codes || [];
    
    let text = '';
    if (main) {
      text = typeof main === 'object' ? `${main.code || ''} ${main.term || ''}`.trim() : String(main);
    }
    if (comorbid) {
      text += (text ? '\n\n' : '') + `Comorbid Conditions: ${typeof comorbid === 'object' ? `${comorbid.code || ''} ${comorbid.term || ''}`.trim() : comorbid}`;
    }
    if (complications) {
      text += (text ? '\n\n' : '') + `Complications: ${typeof complications === 'object' ? `${complications.code || ''} ${complications.term || ''}`.trim() : complications}`;
    }
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.system || ''} ${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Diagnosis Codes: ${codesText}`;
      }
    }
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  // Format plan
  const formatPlan = () => {
    const plan = reportData.plan || {};
    const parts = [];
    
    if (plan.tests && plan.tests.length > 0) {
      parts.push('Planned Tests:\n' + plan.tests.map(t => {
        if (typeof t === 'object') {
          return `- ${t.name || ''} ${t.date || ''}`.trim();
        }
        return `- ${t}`;
      }).join('\n'));
    }
    
    if (plan.referrals && plan.referrals.length > 0) {
      parts.push('Referrals:\n' + plan.referrals.map(r => {
        if (typeof r === 'object') {
          return `- ${r.specialty || ''} ${r.reason || ''}`.trim();
        }
        return `- ${r}`;
      }).join('\n'));
    }
    
    if (plan.meds && plan.meds.length > 0) {
      parts.push('Medications:\n' + plan.meds.map(m => {
        if (typeof m === 'object') {
          return `- ${m.name || m.med || ''} ${m.dosage || ''} ${m.frequency || ''} ${m.duration || ''}`.trim();
        }
        return `- ${m}`;
      }).join('\n'));
    }
    
    if (plan.lifestyle && plan.lifestyle.length > 0) {
      parts.push('Lifestyle Modifications: ' + plan.lifestyle.join(', '));
    }
    
    if (plan.follow_up) {
      parts.push(`Follow-up: ${plan.follow_up}`);
    }
    
    return parts.join('\n\n') || report.treatmentPlan || 'No treatment plan specified';
  };
  
  // Get patient information
  const patientName = report.patient?.name || 
    (report.patient?.first_name && report.patient?.last_name 
      ? `${report.patient.first_name} ${report.patient.last_name}` 
      : report.patient?.patient_name) || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  
  // Get clinic information
  const clinicName = t('cardiologyReport.cardiologyDepartment') || 'Cardiology Department';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || t('cardiologyReport.drSmith') || 'Dr. Smith';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('cardiologyReport.notSavedYet') || 'Not saved yet');
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">Report Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('cardiologyReport.patient') || 'Patient'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('cardiologyReport.years') || 'years'}, ${patientGender})`}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('cardiologyReport.clinic') || 'Clinic'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('cardiologyReport.physician') || 'Physician'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('cardiologyReport.encounter') || 'Encounter'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('cardiologyReport.lastSaved') || 'Last Saved'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint} />
      
      {/* History */}
      {hasData(reportData.history) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">History</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.history.illness) && <p><strong>History of Present Illness:</strong> {reportData.history.illness || 'Not recorded'}</p>}
            {shouldDisplay(reportData.history.past) && <p><strong>Past Medical History:</strong> {reportData.history.past || 'Not recorded'}</p>}
            {shouldDisplay(reportData.history.family) && <p><strong>Family History:</strong> {reportData.history.family || 'Not recorded'}</p>}
            {shouldDisplay(reportData.history.allergies) && <p><strong>Allergies:</strong> {reportData.history.allergies || 'Not recorded'}</p>}
            {shouldDisplay(reportData.history.epidemiology) && <p><strong>Epidemiology:</strong> {reportData.history.epidemiology || 'Not recorded'}</p>}
            {reportData.history.triggers && reportData.history.triggers.length > 0 && (
              <p><strong>Triggers:</strong> {reportData.history.triggers.join(', ')}</p>
            )}
            {reportData.history.risk_factors && reportData.history.risk_factors.length > 0 && (
              <p><strong>Risk Factors:</strong> {reportData.history.risk_factors.join(', ')}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Objective */}
      {hasData(reportData.objective) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Objective</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.objective.general) && <p><strong>General:</strong> {reportData.objective.general || 'Not recorded'}</p>}
            {shouldDisplay(reportData.objective.cardio) && <p><strong>Cardiovascular:</strong> {reportData.objective.cardio || 'Not recorded'}</p>}
            {shouldDisplay(reportData.objective.respiratory) && <p><strong>Respiratory:</strong> {reportData.objective.respiratory || 'Not recorded'}</p>}
            {shouldDisplay(reportData.objective.edema) && <p><strong>Edema:</strong> {reportData.objective.edema || 'Not recorded'}</p>}
            {shouldDisplay(reportData.objective.other) && <p><strong>Other:</strong> {reportData.objective.other || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Review of Systems */}
      {hasData(reportData.ros) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Review of Systems</h3>
          <div className="text-gray-800 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.ros).map(([key, value]) => {
                if (key === 'notes') return null;
                if (value === 'normal') return null;
                return (
                  <div key={key}>
                    <strong>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:</strong> {value || 'N/A'}
                    {reportData.ros.notes && reportData.ros.notes[key] && (
                      <span className="text-sm text-gray-600 ml-2">({reportData.ros.notes[key]})</span>
                    )}
                  </div>
                );
              })}
            </div>
            {reportData.ros.notes && Object.keys(reportData.ros.notes).length > 0 && (
              <div className="mt-2 text-sm">
                {Object.entries(reportData.ros.notes).map(([key, note]) => (
                  <p key={key}><strong>{key}:</strong> {note}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Physical Examination */}
      {hasData(reportData.pe) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Physical Examination</h3>
          <div className="text-gray-800 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(reportData.pe).map(([key, value]) => {
                if (key === 'notes') return null;
                if (value === 'normal') return null;
                return (
                  <div key={key}>
                    <strong>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:</strong> {value || 'N/A'}
                    {reportData.pe.notes && reportData.pe.notes[key] && (
                      <span className="text-sm text-gray-600 ml-2">({reportData.pe.notes[key]})</span>
                    )}
                  </div>
                );
              })}
            </div>
            {reportData.pe.notes && Object.keys(reportData.pe.notes).length > 0 && (
              <div className="mt-2 text-sm">
                {Object.entries(reportData.pe.notes).map(([key, note]) => (
                  <p key={key}><strong>{key}:</strong> {note}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Investigations */}
      {hasData(reportData.investigations) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Investigations</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.investigations.notes) && <p><strong>Notes:</strong> {reportData.investigations.notes || 'Not recorded'}</p>}
            {reportData.investigations.referenced_docs && reportData.investigations.referenced_docs.length > 0 && (
              <div>
                <strong>Referenced Documents:</strong>
                <div className="ml-4 mt-1">
                  {reportData.investigations.referenced_docs.map((doc, idx) => (
                    <p key={idx} className="text-sm">{typeof doc === 'object' ? JSON.stringify(doc) : doc}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Imaging Links */}
      {reportData.imaging_links && reportData.imaging_links.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Imaging Studies</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.imaging_links.map((study, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-2 text-sm">
                {typeof study === 'object' ? (
                  <>
                    {study.modality && <p>Modality: {study.modality}</p>}
                    {study.description && <p>Description: {study.description}</p>}
                    {study.date && <p>Date: {study.date}</p>}
                    {study.study_uid && <p>Study UID: {study.study_uid}</p>}
                    {study.note && <p>Note: {study.note}</p>}
                  </>
                ) : (
                  <p>{study}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Plan & Treatment (for initial mode) */}
      {reportData.plan && <Section title="Treatment Plan" content={formatPlan()} />}
      
      {/* Procedure */}
      {reportData.procedure && (reportData.procedure.name || reportData.procedure.date || reportData.procedure.notes) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Procedure</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.procedure.name) && <p><strong>Name:</strong> {reportData.procedure.name || 'Not recorded'}</p>}
            {shouldDisplay(reportData.procedure.date) && <p><strong>Date:</strong> {reportData.procedure.date || 'Not recorded'}</p>}
            {shouldDisplay(reportData.procedure.notes) && <p><strong>Notes:</strong> {reportData.procedure.notes || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Outcome (for discharge mode) */}
      {reportData.outcome && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Outcome</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.outcome.condition) && <p><strong>Condition:</strong> {reportData.outcome.condition || 'Not recorded'}</p>}
            {shouldDisplay(reportData.outcome.course) && <p><strong>Course:</strong> {reportData.outcome.course || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {reportData.recommendations && reportData.recommendations.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Recommendations</h3>
          <div className="text-gray-800">
            <ul className="list-disc list-inside space-y-1">
              {reportData.recommendations.map((rec, idx) => (
                <li key={idx}>{typeof rec === 'object' ? JSON.stringify(rec) : rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {reportData.attachments && reportData.attachments.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Attachments</h3>
          <div className="text-gray-800">
            {reportData.attachments.map((att, idx) => (
              <div key={idx} className="text-sm">
                {typeof att === 'object' ? (att.label || att.id || `Attachment ${idx + 1}`) : att} {att.type && `(${att.type})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Allergy & Immunology-specific report view component
const AllergyImmunologyReportView = ({ report }) => {
  const { t } = useTranslation();
  const reportData = report.reportData || {};
  const meta = reportData.meta || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Get patient information from backend
  const patientName = report.patient?.name || 
    (report.patient?.first_name && report.patient?.last_name 
      ? `${report.patient.first_name} ${report.patient.last_name}` 
      : report.patient?.patient_id) || 'N/A';
  const patientAge = report.patient?.age || meta.patient_age || null;
  const patientGender = report.patient?.gender || meta.patient_gender || null;
  
  // Get clinic information
  const clinicName = report.clinic?.name || meta.clinic_name || meta.clinic_id || t('allergyImmunologyReport.clinic') || 'Клиника';
  
  // Get physician information
  const physicianName = report.doctor?.name || report.doctor_info?.name || meta.physician_id || t('allergyImmunologyReport.physician') || 'Врач';
  
  // Get encounter information
  const encounterId = meta.encounter_id || 'N/A';
  const encounterDate = meta.datetime ? new Date(meta.datetime).toLocaleString() : (report.date || 'N/A');
  
  // Get last saved information
  const lastSaved = report.updated_at || report.date || null;
  const lastSavedText = lastSaved ? new Date(lastSaved).toLocaleString() : (t('allergyImmunologyReport.notSavedYet') || 'Еще не сохранено');
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const main = diagnosis.main || '';
    const secondary = diagnosis.secondary || [];
    const codes = diagnosis.codes || [];
    
    let text = '';
    if (main) {
      text = typeof main === 'object' ? `${main.code || ''} ${main.term || ''}`.trim() : String(main);
    }
    if (secondary.length > 0) {
      const secondaryText = secondary.map(d => {
        if (typeof d === 'object') {
          return `${d.code || ''} ${d.term || ''}`.trim();
        }
        return String(d);
      }).filter(d => d).join(', ');
      if (secondaryText) {
        text += (text ? '\n\n' : '') + `Secondary Diagnoses: ${secondaryText}`;
      }
    }
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.system || ''} ${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Diagnosis Codes: ${codesText}`;
      }
    }
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  // Format plan
  const formatPlan = () => {
    const plan = reportData.plan || {};
    const parts = [];
    
    if (plan.meds && plan.meds.length > 0) {
      parts.push('Medications:\n' + plan.meds.map(m => {
        if (typeof m === 'object') {
          return `- ${m.name || m.med || ''} ${m.dosage || ''} ${m.frequency || ''} ${m.duration || ''}`.trim();
        }
        return `- ${m}`;
      }).join('\n'));
    }
    
    if (plan.avoidance && plan.avoidance.length > 0) {
      parts.push('Avoidance Measures: ' + plan.avoidance.join(', '));
    }
    
    if (plan.emergency_action_plan) {
      const eapParts = [];
      if (plan.emergency_action_plan.epinephrine_auto_injector_prescribed) {
        eapParts.push('Epinephrine Auto-Injector Prescribed: Yes');
        if (plan.emergency_action_plan.dose_mg) eapParts.push(`Dose: ${plan.emergency_action_plan.dose_mg} mg`);
        if (plan.emergency_action_plan.devices) eapParts.push(`Devices: ${plan.emergency_action_plan.devices}`);
      }
      if (plan.emergency_action_plan.training_provided) eapParts.push('Training Provided: Yes');
      if (plan.emergency_action_plan.written_plan_given) eapParts.push('Written Plan Given: Yes');
      if (eapParts.length > 0) {
        parts.push('Emergency Action Plan:\n' + eapParts.join('\n'));
      }
    }
    
    if (plan.immunotherapy) {
      const itParts = [];
      if (plan.immunotherapy.candidate) {
        itParts.push('Candidate: Yes');
        if (plan.immunotherapy.modality !== 'None') itParts.push(`Modality: ${plan.immunotherapy.modality}`);
        if (plan.immunotherapy.allergens && plan.immunotherapy.allergens.length > 0) {
          itParts.push(`Allergens: ${plan.immunotherapy.allergens.join(', ')}`);
        }
        if (plan.immunotherapy.start_date) itParts.push(`Start Date: ${plan.immunotherapy.start_date}`);
        if (plan.immunotherapy.build_up_scheme) itParts.push(`Build-up Scheme: ${plan.immunotherapy.build_up_scheme}`);
        if (plan.immunotherapy.maintenance_interval_w) itParts.push(`Maintenance Interval: ${plan.immunotherapy.maintenance_interval_w} weeks`);
        if (plan.immunotherapy.expected_duration_y) itParts.push(`Expected Duration: ${plan.immunotherapy.expected_duration_y} years`);
      }
      if (itParts.length > 0) {
        parts.push('Immunotherapy:\n' + itParts.join('\n'));
      }
    }
    
    if (plan.biologics && plan.biologics.length > 0) {
      parts.push('Biologics: ' + plan.biologics.join(', '));
    }
    
    if (plan.education && plan.education.length > 0) {
      parts.push('Education Topics: ' + plan.education.join(', '));
    }
    
    if (plan.vaccinations && plan.vaccinations.length > 0) {
      parts.push('Vaccinations: ' + plan.vaccinations.join(', '));
    }
    
    if (plan.referrals && plan.referrals.length > 0) {
      parts.push('Referrals: ' + plan.referrals.join(', '));
    }
    
    if (plan.follow_up) {
      parts.push(`Follow-up: ${plan.follow_up}${plan.follow_up_date ? ` (${plan.follow_up_date})` : ''}`);
    }
    
    return parts.join('\n\n') || report.treatmentPlan || 'No treatment plan specified';
  };
  
  return (
    <>
      {/* Report Header Information */}
      <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm mb-6">
        <h3 className="text-md font-bold text-[#5ACCC3] mb-4">{t('allergyImmunologyReport.patientInformation') || 'Информация о пациенте'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div>
            <p className="font-semibold text-gray-700">{t('allergyImmunologyReport.patient') || 'Пациент'}</p>
            <p className="text-gray-800">
              {patientName}
              {patientAge && patientGender && ` (${patientAge} ${t('allergyImmunologyReport.years') || 'лет'}, ${patientGender})`}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('allergyImmunologyReport.clinic') || 'Клиника'}</p>
            <p className="text-gray-800">{clinicName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('allergyImmunologyReport.physician') || 'Врач'}</p>
            <p className="text-gray-800">{physicianName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('allergyImmunologyReport.encounter') || 'Встреча'}</p>
            <p className="text-gray-800">{encounterId} - {encounterDate}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('allergyImmunologyReport.lastSaved') || 'Последнее сохранение'}</p>
            <p className="text-gray-800">{lastSavedText}</p>
          </div>
        </div>
      </div>
      
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint} />
      
      {/* Scores Section */}
      {hasData(reportData.scores) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Assessment Scores</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.scores.rcat?.total) && <p><strong>RCAT (Rhinitis Control Assessment Test):</strong> {reportData.scores.rcat.total || 'N/A'}/30</p>}
            {shouldDisplay(reportData.scores.act?.total) && <p><strong>ACT (Asthma Control Test):</strong> {reportData.scores.act.total || 'N/A'}/25</p>}
            {shouldDisplay(reportData.scores.uas7?.total) && <p><strong>UAS7 (Urticaria Activity Score):</strong> {reportData.scores.uas7.total || 'N/A'}/42</p>}
          </div>
        </div>
      )}
      
      {/* HPI Section */}
      {hasData(reportData.hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.hpi.onset) && <p><strong>Onset:</strong> {reportData.hpi.onset || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.duration) && <p><strong>Duration:</strong> {reportData.hpi.duration || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.course) && <p><strong>Course:</strong> {reportData.hpi.course || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.index_exposure_time) && <p><strong>Index Exposure Time:</strong> {reportData.hpi.index_exposure_time || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.last_reaction_time) && <p><strong>Last Reaction Time:</strong> {reportData.hpi.last_reaction_time || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.latency_to_symptoms) && <p><strong>Latency to Symptoms:</strong> {reportData.hpi.latency_to_symptoms || 'Not recorded'}</p>}
            
            {reportData.hpi.triggers && (
              <div>
                <strong>Triggers:</strong>
                <div className="ml-4 mt-1 space-y-1">
                  {reportData.hpi.triggers.food && reportData.hpi.triggers.food.length > 0 && (
                    <p>Food: {reportData.hpi.triggers.food.join(', ')}</p>
                  )}
                  {reportData.hpi.triggers.drug && reportData.hpi.triggers.drug.length > 0 && (
                    <p>Drug: {reportData.hpi.triggers.drug.join(', ')}</p>
                  )}
                  {reportData.hpi.triggers.insect && reportData.hpi.triggers.insect.length > 0 && (
                    <p>Insect: {reportData.hpi.triggers.insect.join(', ')}</p>
                  )}
                  {reportData.hpi.triggers.aeroallergens && reportData.hpi.triggers.aeroallergens.length > 0 && (
                    <p>Aeroallergens: {reportData.hpi.triggers.aeroallergens.join(', ')}</p>
                  )}
                  {reportData.hpi.triggers.contact && reportData.hpi.triggers.contact.length > 0 && (
                    <p>Contact: {reportData.hpi.triggers.contact.join(', ')}</p>
                  )}
                  <div className="mt-1">
                    {reportData.hpi.triggers.latex && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Latex</span>}
                    {reportData.hpi.triggers.cold && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Cold</span>}
                    {reportData.hpi.triggers.exercise && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Exercise</span>}
                    {reportData.hpi.triggers.nsaid && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">NSAID</span>}
                    {reportData.hpi.triggers.alcohol && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Alcohol</span>}
                  </div>
                </div>
              </div>
            )}
            
            {reportData.hpi.reaction_pattern && (
              <div>
                <strong>Reaction Pattern:</strong>
                <div className="ml-4 mt-1">
                  {reportData.hpi.reaction_pattern.ige_mediated && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">IgE Mediated</span>}
                  {reportData.hpi.reaction_pattern.non_ige && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Non-IgE</span>}
                  {reportData.hpi.reaction_pattern.mixed && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Mixed</span>}
                </div>
              </div>
            )}
            
            {reportData.hpi.systems_involved && (
              <div>
                <strong>Systems Involved:</strong>
                <div className="ml-4 mt-1">
                  {Object.entries(reportData.hpi.systems_involved).map(([key, value]) => (
                    value && <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {shouldDisplay(reportData.hpi.symptom_details) && <p><strong>Symptom Details:</strong> {reportData.hpi.symptom_details || 'Not recorded'}</p>}
            
            {reportData.hpi.anaphylaxis && (
              <div>
                <strong>Anaphylaxis:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {reportData.hpi.anaphylaxis.occurred !== undefined && <p>Occurred: {reportData.hpi.anaphylaxis.occurred ? 'Yes' : 'No'}</p>}
                  {shouldDisplay(reportData.hpi.anaphylaxis.grade) && <p>Grade: {reportData.hpi.anaphylaxis.grade || 'N/A'}</p>}
                  {reportData.hpi.anaphylaxis.epinephrine_given !== undefined && <p>Epinephrine Given: {reportData.hpi.anaphylaxis.epinephrine_given ? 'Yes' : 'No'}</p>}
                  {reportData.hpi.anaphylaxis.ed_visit !== undefined && <p>ED Visit: {reportData.hpi.anaphylaxis.ed_visit ? 'Yes' : 'No'}</p>}
                  {shouldDisplay(reportData.hpi.anaphylaxis.tryptase_acute) && <p>Tryptase (Acute): {reportData.hpi.anaphylaxis.tryptase_acute || 'N/A'}</p>}
                  {shouldDisplay(reportData.hpi.anaphylaxis.tryptase_baseline) && <p>Tryptase (Baseline): {reportData.hpi.anaphylaxis.tryptase_baseline || 'N/A'}</p>}
                </div>
              </div>
            )}
            
            {reportData.hpi.atopic_history && (
              <div>
                <strong>Atopic History:</strong>
                <div className="ml-4 mt-1">
                  {Object.entries(reportData.hpi.atopic_history).map(([key, value]) => (
                    value && <span key={key} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {shouldDisplay(reportData.hpi.occupational_exposure) && <p><strong>Occupational Exposure:</strong> {reportData.hpi.occupational_exposure || 'Not recorded'}</p>}
            
            {reportData.hpi.home_env && (
              <div>
                <strong>Home Environment:</strong>
                <div className="ml-4 mt-1">
                  {reportData.hpi.home_env.pets && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Pets</span>}
                  {reportData.hpi.home_env.smoke_exposure && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Smoke Exposure</span>}
                  {reportData.hpi.home_env.dust_mites_mattress && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Dust Mites (Mattress)</span>}
                  {reportData.hpi.home_env.visible_mold && <span className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-sm">Visible Mold</span>}
                  {shouldDisplay(reportData.hpi.home_env.seasonality) && reportData.hpi.home_env.seasonality !== 'none' && (
                    <p>Seasonality: {reportData.hpi.home_env.seasonality || 'Not recorded'}</p>
                  )}
                </div>
              </div>
            )}
            
            {shouldDisplay(reportData.hpi.meds_current) && <p><strong>Current Medications:</strong> {reportData.hpi.meds_current || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.meds_contra) && <p><strong>Contraindicated Medications:</strong> {reportData.hpi.meds_contra || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.allergies_noted) && <p><strong>Allergies Noted:</strong> {reportData.hpi.allergies_noted || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.pmh) && <p><strong>Past Medical History:</strong> {reportData.hpi.pmh || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.psh) && <p><strong>Past Surgical History:</strong> {reportData.hpi.psh || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.family) && <p><strong>Family History:</strong> {reportData.hpi.family || 'Not recorded'}</p>}
            {shouldDisplay(reportData.hpi.social) && <p><strong>Social History:</strong> {reportData.hpi.social || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Vitals */}
      {hasData(reportData.vitals) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Vital Signs</h3>
          <div className="text-gray-800 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {shouldDisplay(reportData.vitals.bp) && <p><strong>Blood Pressure:</strong> {reportData.vitals.bp || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.hr) && <p><strong>Heart Rate:</strong> {reportData.vitals.hr || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.temp) && <p><strong>Temperature:</strong> {reportData.vitals.temp || 'N/A'}°C</p>}
              {shouldDisplay(reportData.vitals.spo2) && <p><strong>SpO2:</strong> {reportData.vitals.spo2 || 'N/A'}</p>}
              {shouldDisplay(reportData.vitals.height_cm) && <p><strong>Height:</strong> {reportData.vitals.height_cm || 'N/A'} cm</p>}
              {shouldDisplay(reportData.vitals.weight_kg) && <p><strong>Weight:</strong> {reportData.vitals.weight_kg || 'N/A'} kg</p>}
              {shouldDisplay(reportData.vitals.bmi) && <p><strong>BMI:</strong> {reportData.vitals.bmi || 'N/A'}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Physical Examination */}
      {hasData(reportData.exam) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Physical Examination</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.exam.skin) && <p><strong>Skin:</strong> {reportData.exam.skin || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.eyes) && <p><strong>Eyes:</strong> {reportData.exam.eyes || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.nose) && <p><strong>Nose:</strong> {reportData.exam.nose || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.throat) && <p><strong>Throat:</strong> {reportData.exam.throat || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.lungs) && <p><strong>Lungs:</strong> {reportData.exam.lungs || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.heart) && <p><strong>Heart:</strong> {reportData.exam.heart || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.abdomen) && <p><strong>Abdomen:</strong> {reportData.exam.abdomen || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.skin_urticaria) && <p><strong>Skin Urticaria:</strong> {reportData.exam.skin_urticaria || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.angioedema) && <p><strong>Angioedema:</strong> {reportData.exam.angioedema || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.ad_severity) && <p><strong>Atopic Dermatitis Severity:</strong> {reportData.exam.ad_severity || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.nasal_findings) && <p><strong>Nasal Findings:</strong> {reportData.exam.nasal_findings || 'Not recorded'}</p>}
            {shouldDisplay(reportData.exam.wheeze) && <p><strong>Wheeze:</strong> {reportData.exam.wheeze || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Tests */}
      {hasData(reportData.tests) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Tests & Investigations</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.tests.spt && reportData.tests.spt.length > 0 && (
              <div>
                <strong>Skin Prick Test (SPT):</strong>
                <div className="ml-4 mt-1 space-y-1">
                  {reportData.tests.spt.map((test, idx) => (
                    <p key={idx} className="text-sm">{typeof test === 'object' ? JSON.stringify(test) : test}</p>
                  ))}
                </div>
              </div>
            )}
            {reportData.tests.idt && reportData.tests.idt.length > 0 && (
              <div>
                <strong>Intradermal Test (IDT):</strong>
                <div className="ml-4 mt-1 space-y-1">
                  {reportData.tests.idt.map((test, idx) => (
                    <p key={idx} className="text-sm">{typeof test === 'object' ? JSON.stringify(test) : test}</p>
                  ))}
                </div>
              </div>
            )}
            {reportData.tests.specific_ige && reportData.tests.specific_ige.length > 0 && (
              <div>
                <strong>Specific IgE:</strong>
                <div className="ml-4 mt-1 space-y-1">
                  {reportData.tests.specific_ige.map((test, idx) => (
                    <p key={idx} className="text-sm">{typeof test === 'object' ? `${test.allergen || ''}: ${test.value || ''}` : test}</p>
                  ))}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.tests.total_ige) && <p><strong>Total IgE:</strong> {reportData.tests.total_ige || 'N/A'}</p>}
            {shouldDisplay(reportData.tests.eos_abs) && <p><strong>Eosinophils (Absolute):</strong> {reportData.tests.eos_abs || 'N/A'}</p>}
            {shouldDisplay(reportData.tests.tryptase_baseline) && <p><strong>Tryptase (Baseline):</strong> {reportData.tests.tryptase_baseline || 'N/A'}</p>}
            {shouldDisplay(reportData.tests.feNO_ppb) && <p><strong>FeNO:</strong> {reportData.tests.feNO_ppb || 'N/A'} ppb</p>}
            {reportData.tests.spirometry && (
              <div>
                <strong>Spirometry:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.tests.spirometry.fev1_pct) && <p>FEV1%: {reportData.tests.spirometry.fev1_pct || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.spirometry.fev1_fvc) && <p>FEV1/FVC: {reportData.tests.spirometry.fev1_fvc || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.spirometry.bronchodilator_response) && <p>Bronchodilator Response: {reportData.tests.spirometry.bronchodilator_response || 'N/A'}</p>}
                  {shouldDisplay(reportData.tests.spirometry.date) && <p>Date: {reportData.tests.spirometry.date || 'N/A'}</p>}
                </div>
              </div>
            )}
            {reportData.tests.peak_flow && (
              <div>
                <strong>Peak Flow:</strong>
                <div className="ml-4 mt-1 text-sm space-y-1">
                  {shouldDisplay(reportData.tests.peak_flow.best_l_min) && <p>Best: {reportData.tests.peak_flow.best_l_min || 'N/A'} L/min</p>}
                  {shouldDisplay(reportData.tests.peak_flow.variability_pct) && <p>Variability: {reportData.tests.peak_flow.variability_pct || 'N/A'}%</p>}
                </div>
              </div>
            )}
            {shouldDisplay(reportData.tests.labs_other) && <p><strong>Other Labs:</strong> {reportData.tests.labs_other || 'Not recorded'}</p>}
            {reportData.tests.challenge && reportData.tests.challenge.length > 0 && (
              <div>
                <strong>Challenge Tests:</strong>
                <div className="ml-4 mt-1 space-y-1">
                  {reportData.tests.challenge.map((challenge, idx) => (
                    <p key={idx} className="text-sm">{typeof challenge === 'object' ? JSON.stringify(challenge) : challenge}</p>
                  ))}
                </div>
              </div>
            )}
            {reportData.tests.desensitization && reportData.tests.desensitization.length > 0 && (
              <div>
                <strong>Desensitization:</strong>
                <div className="ml-4 mt-1 space-y-1">
                  {reportData.tests.desensitization.map((desens, idx) => (
                    <p key={idx} className="text-sm">{typeof desens === 'object' ? JSON.stringify(desens) : desens}</p>
                  ))}
                </div>
              </div>
            )}
            {reportData.tests.imaging && reportData.tests.imaging.length > 0 && (
              <div>
                <strong>Imaging:</strong>
                <div className="ml-4 mt-1 space-y-1">
                  {reportData.tests.imaging.map((img, idx) => (
                    <p key={idx} className="text-sm">{typeof img === 'object' ? JSON.stringify(img) : img}</p>
                  ))}
                </div>
              </div>
            )}
            {reportData.tests.imaging_links && reportData.tests.imaging_links.length > 0 && (
              <div>
                <strong>Imaging Links:</strong>
                <div className="ml-4 mt-1 space-y-2">
                  {reportData.tests.imaging_links.map((study, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-2 text-sm">
                      {typeof study === 'object' ? (
                        <>
                          {study.modality && <p>Modality: {study.modality}</p>}
                          {study.description && <p>Description: {study.description}</p>}
                          {study.date && <p>Date: {study.date}</p>}
                          {study.study_uid && <p>Study UID: {study.study_uid}</p>}
                        </>
                      ) : (
                        <p>{study}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Plan & Treatment (for initial mode) */}
      {reportData.plan && <Section title="Treatment Plan" content={formatPlan()} />}
      
      {/* Procedures Done */}
      {reportData.procedures_done && reportData.procedures_done.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Procedures Done</h3>
          <div className="text-gray-800 space-y-3">
            {reportData.procedures_done.map((proc, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-3">
                <p className="font-medium">{typeof proc === 'object' ? (proc.name || `Procedure ${idx + 1}`) : proc}</p>
                {typeof proc === 'object' && (
                  <div className="mt-1 text-sm space-y-1">
                    {proc.date && <p>Date: {proc.date}</p>}
                    {proc.description && <p>Description: {proc.description}</p>}
                    {proc.result && <p>Result: {proc.result}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Outcome (for discharge mode) */}
      {reportData.outcome && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Outcome</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.outcome.condition) && <p><strong>Condition:</strong> {reportData.outcome.condition || 'Not recorded'}</p>}
            {shouldDisplay(reportData.outcome.course) && <p><strong>Course:</strong> {reportData.outcome.course || 'Not recorded'}</p>}
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {reportData.attachments && reportData.attachments.length > 0 && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Attachments</h3>
          <div className="text-gray-800">
            {reportData.attachments.map((att, idx) => (
              <div key={idx} className="text-sm">
                {typeof att === 'object' ? (att.label || att.id || `Attachment ${idx + 1}`) : att} {att.type && `(${att.type})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Endocrinology-specific report view component
const EndocrinologyReportView = ({ report }) => {
  const reportData = report.reportData || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const codes = reportData.diagnosis_codes || [];
    
    let text = '';
    if (diagnosis && typeof diagnosis === 'object' && (diagnosis.code || diagnosis.term)) {
      text = `${diagnosis.code || ''} ${diagnosis.term || ''}`.trim();
    } else if (diagnosis) {
      text = String(diagnosis);
    }
    
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Additional Diagnoses: ${codesText}`;
      }
    }
    
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  return (
    <>
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint || reportData.main_reason_for_visit} />
      
      {/* Visit Context */}
      {(shouldDisplay(reportData.visit_type) || shouldDisplay(reportData.primary_endocrine_problem)) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Visit Context</h3>
          <div className="text-gray-800 space-y-1">
            {shouldDisplay(reportData.visit_type) && <p><strong>Visit Type:</strong> {reportData.visit_type}</p>}
            {reportData.primary_endocrine_problem && reportData.primary_endocrine_problem.length > 0 && (
              <p><strong>Primary Endocrine Problem:</strong> {reportData.primary_endocrine_problem.join(', ')}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Diabetes Section */}
      {hasData(reportData.diabetes) && (
        <div className="bg-white p-4 border-l-4 border-green-500/60 shadow-sm">
          <h3 className="text-md font-bold text-green-600 mb-2">Diabetes Section</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.diabetes.diabetes_type) && <p><strong>Diabetes Type:</strong> {reportData.diabetes.diabetes_type}</p>}
            {shouldDisplay(reportData.diabetes.year_of_diagnosis) && <p><strong>Year of Diagnosis:</strong> {reportData.diabetes.year_of_diagnosis}</p>}
            {reportData.diabetes.current_treatment_regimen && reportData.diabetes.current_treatment_regimen.length > 0 && (
              <p><strong>Current Treatment Regimen:</strong> {reportData.diabetes.current_treatment_regimen.join(', ')}</p>
            )}
            {shouldDisplay(reportData.diabetes.adherence) && <p><strong>Adherence:</strong> {reportData.diabetes.adherence}</p>}
            {shouldDisplay(reportData.diabetes.recent_hba1c) && <p><strong>Recent HbA1c:</strong> {reportData.diabetes.recent_hba1c}%</p>}
            {shouldDisplay(reportData.diabetes.date_of_last_hba1c) && <p><strong>Date of Last HbA1c:</strong> {reportData.diabetes.date_of_last_hba1c}</p>}
            {reportData.diabetes.microvascular_complications && reportData.diabetes.microvascular_complications.length > 0 && (
              <p><strong>Microvascular Complications:</strong> {reportData.diabetes.microvascular_complications.join(', ')}</p>
            )}
            {reportData.diabetes.macrovascular_complications && reportData.diabetes.macrovascular_complications.length > 0 && (
              <p><strong>Macrovascular Complications:</strong> {reportData.diabetes.macrovascular_complications.join(', ')}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Thyroid Section */}
      {hasData(reportData.thyroid) && (
        <div className="bg-white p-4 border-l-4 border-yellow-500/60 shadow-sm">
          <h3 className="text-md font-bold text-yellow-600 mb-2">Thyroid Section</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.thyroid.main_thyroid_syndrome) && <p><strong>Main Thyroid Syndrome:</strong> {reportData.thyroid.main_thyroid_syndrome}</p>}
            {reportData.thyroid.key_symptoms && reportData.thyroid.key_symptoms.length > 0 && (
              <p><strong>Key Symptoms:</strong> {reportData.thyroid.key_symptoms.join(', ')}</p>
            )}
            {shouldDisplay(reportData.thyroid.goiter) && <p><strong>Goiter:</strong> {reportData.thyroid.goiter}</p>}
            {shouldDisplay(reportData.thyroid.nodules_palpable) && <p><strong>Nodules Palpable:</strong> {reportData.thyroid.nodules_palpable}</p>}
            {shouldDisplay(reportData.thyroid.latest_thyroid_function_summary) && (
              <p><strong>Latest Thyroid Function Summary:</strong> {reportData.thyroid.latest_thyroid_function_summary}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Obesity & Metabolic Section */}
      {hasData(reportData.obesity_metabolic) && (
        <div className="bg-white p-4 border-l-4 border-purple-500/60 shadow-sm">
          <h3 className="text-md font-bold text-purple-600 mb-2">Obesity & Metabolic / Lipid Section</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.obesity_metabolic.weight_trend) && <p><strong>Weight Trend:</strong> {reportData.obesity_metabolic.weight_trend}</p>}
            {shouldDisplay(reportData.obesity_metabolic.waist_circumference) && <p><strong>Waist Circumference:</strong> {reportData.obesity_metabolic.waist_circumference} cm</p>}
            {shouldDisplay(reportData.obesity_metabolic.physical_activity) && <p><strong>Physical Activity:</strong> {reportData.obesity_metabolic.physical_activity}</p>}
            {shouldDisplay(reportData.obesity_metabolic.smoking_status) && <p><strong>Smoking Status:</strong> {reportData.obesity_metabolic.smoking_status}</p>}
            {shouldDisplay(reportData.obesity_metabolic.lipid_control_summary) && (
              <p><strong>Lipid Control Summary:</strong> {reportData.obesity_metabolic.lipid_control_summary}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Physical Exam */}
      {hasData(reportData.physical_exam) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Physical Examination</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.physical_exam.general_appearance) && <p><strong>General Appearance:</strong> {reportData.physical_exam.general_appearance}</p>}
            {shouldDisplay(reportData.physical_exam.skin_hair) && <p><strong>Skin & Hair:</strong> {reportData.physical_exam.skin_hair}</p>}
            {shouldDisplay(reportData.physical_exam.fat_distribution) && <p><strong>Fat Distribution:</strong> {reportData.physical_exam.fat_distribution}</p>}
            {shouldDisplay(reportData.physical_exam.edema) && <p><strong>Edema:</strong> {reportData.physical_exam.edema}</p>}
            {shouldDisplay(reportData.physical_exam.other_key_signs) && <p><strong>Other Key Signs:</strong> {reportData.physical_exam.other_key_signs}</p>}
          </div>
        </div>
      )}
      
      {/* Investigations */}
      {hasData(reportData.investigations) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Investigations</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.investigations.labs_reviewed_today && reportData.investigations.labs_reviewed_today.length > 0 && (
              <p><strong>Labs Reviewed Today:</strong> {reportData.investigations.labs_reviewed_today.join(', ')}</p>
            )}
            {shouldDisplay(reportData.investigations.main_interpretation_abnormalities) && (
              <p><strong>Main Interpretation / Abnormalities:</strong> {reportData.investigations.main_interpretation_abnormalities}</p>
            )}
            {reportData.investigations.imaging_reviewed_ordered && reportData.investigations.imaging_reviewed_ordered.length > 0 && (
              <p><strong>Imaging Reviewed / Ordered:</strong> {reportData.investigations.imaging_reviewed_ordered.join(', ')}</p>
            )}
            {shouldDisplay(reportData.investigations.key_imaging_impressions) && (
              <p><strong>Key Imaging Impressions:</strong> {reportData.investigations.key_imaging_impressions}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Management Plan */}
      {hasData(reportData.management_plan) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Management Plan</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.management_plan.medication_changes_made_today) && (
              <p><strong>Medication Changes Made Today:</strong> {reportData.management_plan.medication_changes_made_today}</p>
            )}
            {shouldDisplay(reportData.management_plan.new_prescriptions) && (
              <p><strong>New Prescriptions:</strong> {reportData.management_plan.new_prescriptions}</p>
            )}
            {reportData.management_plan.lifestyle_counselling_provided && reportData.management_plan.lifestyle_counselling_provided.length > 0 && (
              <p><strong>Lifestyle Counselling Provided:</strong> {reportData.management_plan.lifestyle_counselling_provided.join(', ')}</p>
            )}
            {shouldDisplay(reportData.management_plan.target_hba1c) && (
              <p><strong>Target HbA1c:</strong> {reportData.management_plan.target_hba1c}</p>
            )}
            {shouldDisplay(reportData.management_plan.next_clinic_visit) && (
              <p><strong>Next Clinic Visit:</strong> {reportData.management_plan.next_clinic_visit}</p>
            )}
            {reportData.management_plan.referrals && reportData.management_plan.referrals.length > 0 && (
              <p><strong>Referrals:</strong> {reportData.management_plan.referrals.join(', ')}</p>
            )}
            {shouldDisplay(reportData.management_plan.patient_instructions) && (
              <div>
                <strong>Patient Instructions:</strong>
                <p className="mt-1 whitespace-pre-wrap">{reportData.management_plan.patient_instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ENT-specific report view component
const ENTReportView = ({ report }) => {
  const reportData = report.reportData || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const codes = reportData.diagnosis_codes || [];
    
    let text = '';
    if (diagnosis && typeof diagnosis === 'object' && (diagnosis.code || diagnosis.term)) {
      text = `${diagnosis.code || ''} ${diagnosis.term || ''}`.trim();
    } else if (diagnosis) {
      text = String(diagnosis);
    }
    
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Additional Diagnoses: ${codesText}`;
      }
    }
    
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  return (
    <>
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint || reportData.reason_hpi?.presenting_ent_complaint} />
      
      {/* Reason for ENT Visit & HPI */}
      {hasData(reportData.reason_hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Reason for ENT Visit & History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.reason_hpi.duration_of_main_complaint) && <p><strong>Duration:</strong> {reportData.reason_hpi.duration_of_main_complaint}</p>}
            {shouldDisplay(reportData.reason_hpi.symptom_course) && <p><strong>Symptom Course:</strong> {reportData.reason_hpi.symptom_course}</p>}
            {shouldDisplay(reportData.reason_hpi.history_of_present_illness) && (
              <p><strong>History of Present Illness:</strong> {reportData.reason_hpi.history_of_present_illness}</p>
            )}
            {shouldDisplay(reportData.reason_hpi.impact_on_daily_life) && (
              <p><strong>Impact on Daily Life:</strong> {reportData.reason_hpi.impact_on_daily_life}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Ear Symptoms */}
      {hasData(reportData.ear_symptoms) && (
        <div className="bg-white p-4 border-l-4 border-green-500/60 shadow-sm">
          <h3 className="text-md font-bold text-green-600 mb-2">Ear Symptoms</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.ear_symptoms.ear_symptoms_present && reportData.ear_symptoms.ear_symptoms_present.length > 0 && (
              <p><strong>Ear Symptoms Present:</strong> {reportData.ear_symptoms.ear_symptoms_present.join(', ')}</p>
            )}
            {shouldDisplay(reportData.ear_symptoms.laterality) && <p><strong>Laterality:</strong> {reportData.ear_symptoms.laterality}</p>}
            {shouldDisplay(reportData.ear_symptoms.hearing_loss_details) && (
              <p><strong>Hearing Loss Details:</strong> {reportData.ear_symptoms.hearing_loss_details}</p>
            )}
            {shouldDisplay(reportData.ear_symptoms.tinnitus_details) && (
              <p><strong>Tinnitus Details:</strong> {reportData.ear_symptoms.tinnitus_details}</p>
            )}
            {shouldDisplay(reportData.ear_symptoms.dizziness_vertigo_details) && (
              <p><strong>Dizziness / Vertigo Details:</strong> {reportData.ear_symptoms.dizziness_vertigo_details}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Nose & Sinus Symptoms */}
      {hasData(reportData.nose_sinus_symptoms) && (
        <div className="bg-white p-4 border-l-4 border-yellow-500/60 shadow-sm">
          <h3 className="text-md font-bold text-yellow-600 mb-2">Nose & Sinus Symptoms</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.nose_sinus_symptoms.nasal_symptoms_present && reportData.nose_sinus_symptoms.nasal_symptoms_present.length > 0 && (
              <p><strong>Nasal Symptoms Present:</strong> {reportData.nose_sinus_symptoms.nasal_symptoms_present.join(', ')}</p>
            )}
            {shouldDisplay(reportData.nose_sinus_symptoms.nasal_obstruction_details) && (
              <p><strong>Nasal Obstruction Details:</strong> {reportData.nose_sinus_symptoms.nasal_obstruction_details}</p>
            )}
            {shouldDisplay(reportData.nose_sinus_symptoms.allergic_symptoms) && (
              <p><strong>Allergic Symptoms:</strong> {reportData.nose_sinus_symptoms.allergic_symptoms}</p>
            )}
            {shouldDisplay(reportData.nose_sinus_symptoms.epistaxis) && (
              <p><strong>Epistaxis:</strong> {reportData.nose_sinus_symptoms.epistaxis}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Throat, Voice & Swallowing */}
      {hasData(reportData.throat_voice_swallowing) && (
        <div className="bg-white p-4 border-l-4 border-purple-500/60 shadow-sm">
          <h3 className="text-md font-bold text-purple-600 mb-2">Throat, Voice & Swallowing</h3>
          <div className="text-gray-800 space-y-2">
            {reportData.throat_voice_swallowing.throat_voice_symptoms_present && reportData.throat_voice_swallowing.throat_voice_symptoms_present.length > 0 && (
              <p><strong>Throat & Voice Symptoms Present:</strong> {reportData.throat_voice_swallowing.throat_voice_symptoms_present.join(', ')}</p>
            )}
            {shouldDisplay(reportData.throat_voice_swallowing.voice_change_hoarseness) && (
              <p><strong>Voice Change / Hoarseness:</strong> {reportData.throat_voice_swallowing.voice_change_hoarseness}</p>
            )}
            {shouldDisplay(reportData.throat_voice_swallowing.dysphagia) && (
              <p><strong>Dysphagia:</strong> {reportData.throat_voice_swallowing.dysphagia}</p>
            )}
            {shouldDisplay(reportData.throat_voice_swallowing.reflux_symptoms) && (
              <p><strong>Reflux Symptoms:</strong> {reportData.throat_voice_swallowing.reflux_symptoms}</p>
            )}
          </div>
        </div>
      )}
      
      {/* ENT Examination */}
      {hasData(reportData.ent_examination) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">ENT Examination</h3>
          <div className="text-gray-800 space-y-4">
            {hasData(reportData.ent_examination.ear) && (
              <div>
                <h4 className="font-semibold mb-2">Ear Examination</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.ent_examination.ear.right_tympanic_membrane) && (
                    <p><strong>Right Tympanic Membrane:</strong> {reportData.ent_examination.ear.right_tympanic_membrane}</p>
                  )}
                  {shouldDisplay(reportData.ent_examination.ear.left_tympanic_membrane) && (
                    <p><strong>Left Tympanic Membrane:</strong> {reportData.ent_examination.ear.left_tympanic_membrane}</p>
                  )}
                  {shouldDisplay(reportData.ent_examination.ear.hearing_screening) && (
                    <p><strong>Hearing Screening:</strong> {reportData.ent_examination.ear.hearing_screening}</p>
                  )}
                </div>
              </div>
            )}
            {hasData(reportData.ent_examination.nose_sinuses) && (
              <div>
                <h4 className="font-semibold mb-2">Nose & Sinuses Examination</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.ent_examination.nose_sinuses.septum) && (
                    <p><strong>Septum:</strong> {reportData.ent_examination.nose_sinuses.septum}</p>
                  )}
                  {shouldDisplay(reportData.ent_examination.nose_sinuses.turbinates) && (
                    <p><strong>Turbinates:</strong> {reportData.ent_examination.nose_sinuses.turbinates}</p>
                  )}
                  {shouldDisplay(reportData.ent_examination.nose_sinuses.nasal_endoscopy_findings) && (
                    <p><strong>Nasal Endoscopy Findings:</strong> {reportData.ent_examination.nose_sinuses.nasal_endoscopy_findings}</p>
                  )}
                </div>
              </div>
            )}
            {hasData(reportData.ent_examination.oral_cavity_oropharynx_larynx) && (
              <div>
                <h4 className="font-semibold mb-2">Oral Cavity, Oropharynx & Larynx</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.ent_examination.oral_cavity_oropharynx_larynx.tonsils) && (
                    <p><strong>Tonsils:</strong> {reportData.ent_examination.oral_cavity_oropharynx_larynx.tonsils}</p>
                  )}
                  {shouldDisplay(reportData.ent_examination.oral_cavity_oropharynx_larynx.laryngoscopy_stroboscopy_findings) && (
                    <p><strong>Laryngoscopy / Stroboscopy Findings:</strong> {reportData.ent_examination.oral_cavity_oropharynx_larynx.laryngoscopy_stroboscopy_findings}</p>
                  )}
                </div>
              </div>
            )}
            {hasData(reportData.ent_examination.neck_cranial_nerve) && (
              <div>
                <h4 className="font-semibold mb-2">Neck & Cranial Nerve Examination</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.ent_examination.neck_cranial_nerve.lymph_nodes) && (
                    <p><strong>Lymph Nodes:</strong> {reportData.ent_examination.neck_cranial_nerve.lymph_nodes}</p>
                  )}
                  {shouldDisplay(reportData.ent_examination.neck_cranial_nerve.thyroid_examination) && (
                    <p><strong>Thyroid Examination:</strong> {reportData.ent_examination.neck_cranial_nerve.thyroid_examination}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* ENT Investigations */}
      {hasData(reportData.ent_investigations) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">ENT Investigations</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.ent_investigations.audiology_summary) && (
              <p><strong>Audiology Summary:</strong> {reportData.ent_investigations.audiology_summary}</p>
            )}
            {shouldDisplay(reportData.ent_investigations.tympanometry_acoustic_reflexes) && (
              <p><strong>Tympanometry & Acoustic Reflexes:</strong> {reportData.ent_investigations.tympanometry_acoustic_reflexes}</p>
            )}
            {shouldDisplay(reportData.ent_investigations.imaging) && (
              <p><strong>Imaging:</strong> {reportData.ent_investigations.imaging}</p>
            )}
            {shouldDisplay(reportData.ent_investigations.laboratory_tests) && (
              <p><strong>Laboratory Tests:</strong> {reportData.ent_investigations.laboratory_tests}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Management Plan */}
      {hasData(reportData.management_plan) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Management Plan</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.management_plan.problem_list) && (
              <p><strong>Problem List / Clinical Impression:</strong> {reportData.management_plan.problem_list}</p>
            )}
            {shouldDisplay(reportData.management_plan.medical_treatment_plan) && (
              <p><strong>Medical Treatment Plan:</strong> {reportData.management_plan.medical_treatment_plan}</p>
            )}
            {shouldDisplay(reportData.management_plan.procedures_performed_today) && (
              <p><strong>Procedures Performed Today:</strong> {reportData.management_plan.procedures_performed_today}</p>
            )}
            {shouldDisplay(reportData.management_plan.planned_ent_procedures_surgery) && (
              <p><strong>Planned ENT Procedures / Surgery:</strong> {reportData.management_plan.planned_ent_procedures_surgery}</p>
            )}
            {shouldDisplay(reportData.management_plan.referrals_multidisciplinary) && (
              <p><strong>Referrals / Multidisciplinary Input:</strong> {reportData.management_plan.referrals_multidisciplinary}</p>
            )}
            {shouldDisplay(reportData.management_plan.follow_up_plan) && (
              <p><strong>Follow-up Plan:</strong> {reportData.management_plan.follow_up_plan}</p>
            )}
            {shouldDisplay(reportData.management_plan.follow_up_date) && (
              <p><strong>Follow-up Date:</strong> {reportData.management_plan.follow_up_date}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Patient Education & Counselling */}
      {hasData(reportData.patient_education) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Patient Education & Counselling</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.patient_education.key_explanations_given) && (
              <p><strong>Key Explanations Given:</strong> {reportData.patient_education.key_explanations_given}</p>
            )}
            {shouldDisplay(reportData.patient_education.lifestyle_preventive_advice) && (
              <p><strong>Lifestyle & Preventive Advice:</strong> {reportData.patient_education.lifestyle_preventive_advice}</p>
            )}
            {shouldDisplay(reportData.patient_education.warning_signs_discussed) && (
              <p><strong>Warning Signs Discussed:</strong> {reportData.patient_education.warning_signs_discussed}</p>
            )}
            {shouldDisplay(reportData.patient_education.patient_understanding_agreement) && (
              <p><strong>Patient Understanding & Agreement:</strong> {reportData.patient_education.patient_understanding_agreement}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Proctology-specific report view component
const ProctologyReportView = ({ report }) => {
  const reportData = report.reportData || {};
  
  // Helper to check if section has data
  const hasData = (obj) => {
    if (!obj) return false;
    if (typeof obj === 'string') return true;
    if (Array.isArray(obj)) return true;
    if (typeof obj === 'object') {
      return Object.keys(obj).length > 0;
    }
    return Boolean(obj);
  };
  
  // Helper to check if a field value should be displayed
  const shouldDisplay = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  // Format diagnosis
  const formatDiagnosis = () => {
    const diagnosis = reportData.diagnosis || {};
    const codes = reportData.diagnosis_codes || [];
    
    let text = '';
    if (diagnosis && typeof diagnosis === 'object' && (diagnosis.code || diagnosis.term)) {
      text = `${diagnosis.code || ''} ${diagnosis.term || ''}`.trim();
    } else if (diagnosis) {
      text = String(diagnosis);
    }
    
    if (codes.length > 0) {
      const codesText = codes.map(c => {
        if (typeof c === 'object') {
          return `${c.code || ''} ${c.term || ''}`.trim();
        }
        return String(c);
      }).filter(c => c).join(', ');
      if (codesText) {
        text += (text ? '\n\n' : '') + `Additional Diagnoses: ${codesText}`;
      }
    }
    
    return text || report.diagnosis || 'No diagnosis specified';
  };
  
  return (
    <>
      <Section title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint || reportData.presenting_complaint_hpi?.presenting_complaint} />
      
      {/* Presenting Complaint & HPI */}
      {hasData(reportData.presenting_complaint_hpi) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Presenting Complaint & History of Present Illness</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.presenting_complaint_hpi.duration_of_symptoms) && (
              <p><strong>Duration of Symptoms:</strong> {reportData.presenting_complaint_hpi.duration_of_symptoms}</p>
            )}
            {shouldDisplay(reportData.presenting_complaint_hpi.history_of_present_illness) && (
              <p><strong>History of Present Illness:</strong> {reportData.presenting_complaint_hpi.history_of_present_illness}</p>
            )}
            {shouldDisplay(reportData.presenting_complaint_hpi.pain_score) && (
              <p><strong>Pain Score:</strong> {reportData.presenting_complaint_hpi.pain_score}/10</p>
            )}
            {shouldDisplay(reportData.presenting_complaint_hpi.pain_character) && (
              <p><strong>Pain Character:</strong> {reportData.presenting_complaint_hpi.pain_character}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Bowel Habit & Stool Characteristics */}
      {hasData(reportData.bowel_habit) && (
        <div className="bg-white p-4 border-l-4 border-green-500/60 shadow-sm">
          <h3 className="text-md font-bold text-green-600 mb-2">Bowel Habit & Stool Characteristics</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.bowel_habit.frequency_of_bowel_movements) && (
              <p><strong>Frequency of Bowel Movements:</strong> {reportData.bowel_habit.frequency_of_bowel_movements}</p>
            )}
            {shouldDisplay(reportData.bowel_habit.stool_consistency) && (
              <p><strong>Stool Consistency:</strong> {reportData.bowel_habit.stool_consistency}</p>
            )}
            {shouldDisplay(reportData.bowel_habit.straining_during_defecation) && (
              <p><strong>Straining During Defecation:</strong> {reportData.bowel_habit.straining_during_defecation}</p>
            )}
            {shouldDisplay(reportData.bowel_habit.feeling_of_incomplete_evacuation) && (
              <p><strong>Feeling of Incomplete Evacuation:</strong> {reportData.bowel_habit.feeling_of_incomplete_evacuation}</p>
            )}
            {shouldDisplay(reportData.bowel_habit.fecal_incontinence) && (
              <p><strong>Fecal Incontinence:</strong> {reportData.bowel_habit.fecal_incontinence}</p>
            )}
            {shouldDisplay(reportData.bowel_habit.fecal_incontinence_description) && (
              <p><strong>Fecal Incontinence Description:</strong> {reportData.bowel_habit.fecal_incontinence_description}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Rectal Bleeding & Discharge */}
      {hasData(reportData.rectal_bleeding_discharge) && (
        <div className="bg-white p-4 border-l-4 border-red-500/60 shadow-sm">
          <h3 className="text-md font-bold text-red-600 mb-2">Rectal Bleeding & Discharge</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.rectal_bleeding_discharge.rectal_bleeding) && (
              <p><strong>Rectal Bleeding:</strong> {reportData.rectal_bleeding_discharge.rectal_bleeding}</p>
            )}
            {shouldDisplay(reportData.rectal_bleeding_discharge.rectal_bleeding_amount) && (
              <p><strong>Amount:</strong> {reportData.rectal_bleeding_discharge.rectal_bleeding_amount}</p>
            )}
            {shouldDisplay(reportData.rectal_bleeding_discharge.rectal_bleeding_color) && (
              <p><strong>Color:</strong> {reportData.rectal_bleeding_discharge.rectal_bleeding_color}</p>
            )}
            {shouldDisplay(reportData.rectal_bleeding_discharge.mucus_pus_discharge) && (
              <p><strong>Mucus / Pus Discharge:</strong> {reportData.rectal_bleeding_discharge.mucus_pus_discharge}</p>
            )}
            {shouldDisplay(reportData.rectal_bleeding_discharge.mucus_pus_discharge_description) && (
              <p><strong>Description:</strong> {reportData.rectal_bleeding_discharge.mucus_pus_discharge_description}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Anal Symptoms */}
      {hasData(reportData.anal_symptoms) && (
        <div className="bg-white p-4 border-l-4 border-yellow-500/60 shadow-sm">
          <h3 className="text-md font-bold text-yellow-600 mb-2">Anal Pain, Itching & Prolapse</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.anal_symptoms.anal_pain) && (
              <p><strong>Anal Pain:</strong> {reportData.anal_symptoms.anal_pain}</p>
            )}
            {shouldDisplay(reportData.anal_symptoms.anal_pain_description) && (
              <p><strong>Anal Pain Description:</strong> {reportData.anal_symptoms.anal_pain_description}</p>
            )}
            {shouldDisplay(reportData.anal_symptoms.anal_itching) && (
              <p><strong>Anal Itching:</strong> {reportData.anal_symptoms.anal_itching}</p>
            )}
            {shouldDisplay(reportData.anal_symptoms.anal_lump_swelling) && (
              <p><strong>Anal Lump / Swelling:</strong> {reportData.anal_symptoms.anal_lump_swelling}</p>
            )}
            {shouldDisplay(reportData.anal_symptoms.prolapse_from_anus) && (
              <p><strong>Prolapse from Anus:</strong> {reportData.anal_symptoms.prolapse_from_anus}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Physical Examination */}
      {hasData(reportData.physical_examination) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Physical Examination</h3>
          <div className="text-gray-800 space-y-4">
            {hasData(reportData.physical_examination.general_abdominal) && (
              <div>
                <h4 className="font-semibold mb-2">General & Abdominal Examination</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.physical_examination.general_abdominal.general_appearance) && (
                    <p><strong>General Appearance:</strong> {reportData.physical_examination.general_abdominal.general_appearance}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.general_abdominal.signs_of_anemia_jaundice_edema) && (
                    <p><strong>Signs of Anemia / Jaundice / Edema:</strong> {reportData.physical_examination.general_abdominal.signs_of_anemia_jaundice_edema}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.general_abdominal.abdominal_examination) && (
                    <p><strong>Abdominal Examination:</strong> {reportData.physical_examination.general_abdominal.abdominal_examination}</p>
                  )}
                </div>
              </div>
            )}
            {hasData(reportData.physical_examination.perianal_rectal) && (
              <div>
                <h4 className="font-semibold mb-2">Perianal & Digital Rectal Examination</h4>
                <div className="ml-4 space-y-1 text-sm">
                  {shouldDisplay(reportData.physical_examination.perianal_rectal.perianal_inspection) && (
                    <p><strong>Perianal Inspection:</strong> {reportData.physical_examination.perianal_rectal.perianal_inspection}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.perianal_rectal.digital_rectal_examination) && (
                    <p><strong>Digital Rectal Examination:</strong> {reportData.physical_examination.perianal_rectal.digital_rectal_examination}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.perianal_rectal.anal_canal_findings) && (
                    <p><strong>Anal Canal Findings:</strong> {reportData.physical_examination.perianal_rectal.anal_canal_findings}</p>
                  )}
                  {shouldDisplay(reportData.physical_examination.perianal_rectal.rectal_ampulla_findings) && (
                    <p><strong>Rectal Ampulla Findings:</strong> {reportData.physical_examination.perianal_rectal.rectal_ampulla_findings}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Endoscopic Findings */}
      {hasData(reportData.endoscopic_findings) && (
        <div className="bg-white p-4 border-l-4 border-purple-500/60 shadow-sm">
          <h3 className="text-md font-bold text-purple-600 mb-2">Proctoscopy / Anoscopy / Sigmoidoscopy</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.endoscopic_findings.procedure_performed) && (
              <p><strong>Procedure Performed:</strong> {reportData.endoscopic_findings.procedure_performed}</p>
            )}
            {shouldDisplay(reportData.endoscopic_findings.findings) && (
              <p><strong>Findings:</strong> {reportData.endoscopic_findings.findings}</p>
            )}
            {shouldDisplay(reportData.endoscopic_findings.hemorrhoids) && (
              <p><strong>Hemorrhoids:</strong> {reportData.endoscopic_findings.hemorrhoids}</p>
            )}
            {shouldDisplay(reportData.endoscopic_findings.fissures) && (
              <p><strong>Fissures:</strong> {reportData.endoscopic_findings.fissures}</p>
            )}
            {shouldDisplay(reportData.endoscopic_findings.polyps_masses) && (
              <p><strong>Polyps / Masses:</strong> {reportData.endoscopic_findings.polyps_masses}</p>
            )}
            {shouldDisplay(reportData.endoscopic_findings.biopsies_taken) && (
              <p><strong>Biopsies Taken:</strong> {reportData.endoscopic_findings.biopsies_taken}</p>
            )}
            {shouldDisplay(reportData.endoscopic_findings.biopsies_taken_site_purpose) && (
              <p><strong>Biopsies Site & Purpose:</strong> {reportData.endoscopic_findings.biopsies_taken_site_purpose}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Investigations */}
      {hasData(reportData.investigations) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Investigations</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.investigations.laboratory_tests) && (
              <p><strong>Laboratory Tests:</strong> {reportData.investigations.laboratory_tests}</p>
            )}
            {shouldDisplay(reportData.investigations.imaging) && (
              <p><strong>Imaging:</strong> {reportData.investigations.imaging}</p>
            )}
            {shouldDisplay(reportData.investigations.endoscopy) && (
              <p><strong>Endoscopy:</strong> {reportData.investigations.endoscopy}</p>
            )}
            {shouldDisplay(reportData.investigations.other_specialized_tests) && (
              <p><strong>Other Specialized Tests:</strong> {reportData.investigations.other_specialized_tests}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis */}
      <Section title="Diagnosis" content={formatDiagnosis()} />
      
      {/* Management Plan */}
      {hasData(reportData.management_plan) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Management Plan</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.management_plan.problem_list) && (
              <p><strong>Problem List / Clinical Impression:</strong> {reportData.management_plan.problem_list}</p>
            )}
            {shouldDisplay(reportData.management_plan.conservative_management) && (
              <p><strong>Conservative Management:</strong> {reportData.management_plan.conservative_management}</p>
            )}
            {reportData.management_plan.medications_prescribed && reportData.management_plan.medications_prescribed.length > 0 && (
              <div>
                <strong>Medications Prescribed:</strong>
                <ul className="ml-4 mt-1 list-disc">
                  {reportData.management_plan.medications_prescribed.map((med, idx) => (
                    <li key={idx} className="text-sm">
                      {typeof med === 'object' ? `${med.name || med.med || ''} ${med.dosage || ''} ${med.frequency || ''}`.trim() : med}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {shouldDisplay(reportData.management_plan.procedures_performed_today) && (
              <p><strong>Procedures Performed Today:</strong> {reportData.management_plan.procedures_performed_today}</p>
            )}
            {shouldDisplay(reportData.management_plan.surgical_plan_referrals) && (
              <p><strong>Surgical Plan / Referrals:</strong> {reportData.management_plan.surgical_plan_referrals}</p>
            )}
            {shouldDisplay(reportData.management_plan.pain_management_plan) && (
              <p><strong>Pain Management Plan:</strong> {reportData.management_plan.pain_management_plan}</p>
            )}
            {shouldDisplay(reportData.management_plan.bowel_regimen_plan) && (
              <p><strong>Bowel Regimen Plan:</strong> {reportData.management_plan.bowel_regimen_plan}</p>
            )}
            {shouldDisplay(reportData.management_plan.follow_up_plan) && (
              <p><strong>Follow-up Plan:</strong> {reportData.management_plan.follow_up_plan}</p>
            )}
            {shouldDisplay(reportData.management_plan.follow_up_date) && (
              <p><strong>Follow-up Date:</strong> {reportData.management_plan.follow_up_date}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Patient Education & Counselling */}
      {hasData(reportData.patient_education) && (
        <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
          <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Patient Education & Counselling</h3>
          <div className="text-gray-800 space-y-2">
            {shouldDisplay(reportData.patient_education.counselling_provided) && (
              <p><strong>Counselling Provided:</strong> {reportData.patient_education.counselling_provided}</p>
            )}
            {shouldDisplay(reportData.patient_education.advice_on_hygiene_lifestyle) && (
              <p><strong>Advice on Hygiene & Lifestyle:</strong> {reportData.patient_education.advice_on_hygiene_lifestyle}</p>
            )}
            {shouldDisplay(reportData.patient_education.warning_signs_explained) && (
              <p><strong>Warning Signs Explained:</strong> {reportData.patient_education.warning_signs_explained}</p>
            )}
            {shouldDisplay(reportData.patient_education.patient_understanding_agreement) && (
              <p><strong>Patient Understanding & Agreement:</strong> {reportData.patient_education.patient_understanding_agreement}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ViewReport;
