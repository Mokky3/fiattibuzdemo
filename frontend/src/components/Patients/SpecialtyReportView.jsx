import React from 'react';

// Reusable Section Component (matching patient portal color scheme)
const Section = ({ title, content, italic = false }) => {
  if (!content && content !== 0 && content !== false) return null;
  return (
    <div className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
      <h3 className="text-md font-bold text-emerald-400 mb-2">{title}</h3>
      <p className={`text-gray-800 whitespace-pre-line ${italic ? 'italic' : ''}`}>
        {typeof content === 'object' && content !== null ? JSON.stringify(content, null, 2) : String(content || 'No data available')}
      </p>
    </div>
  );
};

// Helper to check if section has data
const hasData = (obj) => {
  if (!obj) return false;
  if (typeof obj === 'string') return true;
  if (typeof obj === 'boolean') return true;
  if (typeof obj === 'number') return true;
  if (Array.isArray(obj)) return obj.length > 0;
  if (typeof obj === 'object') {
    return Object.keys(obj).length > 0;
  }
  return Boolean(obj);
};

// Helper to check if a field value should be displayed
const shouldDisplay = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0 || value === '';
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

// Recursively render all fields from reportData
const renderField = (key, value, depth = 0) => {
  if (!shouldDisplay(value)) return null;
  
  const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div key={key} className={depth > 0 ? 'ml-4 mt-2' : 'bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm'}>
        {depth === 0 && <h3 className="text-md font-bold text-emerald-400 mb-2">{formattedKey}</h3>}
        <ul className={`list-disc list-inside mt-1 ${depth > 0 ? 'ml-4' : ''}`}>
          {value.map((item, idx) => (
            <li key={idx} className="text-gray-800">
              {typeof item === 'object' && item !== null ? (
                <div className="ml-2 mt-1 space-y-1">
                  {Object.entries(item).map(([k, v]) => (
                    <p key={k} className="text-sm">
                      <strong>{k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(v || 'N/A')}
                    </p>
                  ))}
                </div>
              ) : (
                String(item)
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  
  if (typeof value === 'object' && value !== null) {
    const hasNestedData = Object.values(value).some(v => shouldDisplay(v));
    if (!hasNestedData) return null;
    
    return (
      <div key={key} className={depth > 0 ? 'ml-4 mt-2 border-l-2 border-gray-200 pl-4' : 'bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm'}>
        <h3 className={`${depth === 0 ? 'text-md font-bold text-emerald-400 mb-2' : 'text-sm font-semibold text-gray-700 mb-1'}`}>
          {formattedKey}
        </h3>
        <div className="text-gray-800 space-y-1">
          {Object.entries(value).map(([k, v]) => renderField(k, v, depth + 1))}
        </div>
      </div>
    );
  }
  
  // For boolean values, show Yes/No
  if (typeof value === 'boolean') {
    return (
      <p key={key} className={depth > 0 ? 'ml-4 text-sm' : ''}>
        <strong>{formattedKey}:</strong> {value ? 'Yes' : 'No'}
      </p>
    );
  }
  
  return (
    <p key={key} className={depth > 0 ? 'ml-4 text-sm' : ''}>
      <strong>{formattedKey}:</strong> {String(value)}
    </p>
  );
};

// Format diagnosis helper
const formatDiagnosis = (diagnosis) => {
  if (!diagnosis) return 'No diagnosis specified';
  if (typeof diagnosis === 'string') return diagnosis;
  
  const main = diagnosis.main || {};
  const secondary = diagnosis.secondary || [];
  const codes = diagnosis.codes || [];
  
  let text = '';
  if (main.code || main.term || (typeof main === 'object' && Object.keys(main).length > 0)) {
    if (typeof main === 'object') {
      text = `Main Diagnosis: ${main.code || ''} ${main.term || ''}`.trim();
    } else {
      text = `Main Diagnosis: ${main}`;
    }
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
  
  return text || 'No diagnosis specified';
};

// Format plan helper
const formatPlan = (plan) => {
  if (!plan) return 'No treatment plan specified';
  if (typeof plan === 'string') return plan;
  
  const parts = [];
  
  if (plan.meds && Array.isArray(plan.meds) && plan.meds.length > 0) {
    parts.push('Medications:\n' + plan.meds.map(m => {
      if (typeof m === 'object') {
        return `- ${m.med || m.name || ''} ${m.conc_strength || m.dosage || ''} ${m.route || ''} ${m.freq || m.frequency || ''} ${m.duration || ''}`.trim();
      }
      return `- ${m}`;
    }).join('\n'));
  }
  
  if (plan.tests && Array.isArray(plan.tests) && plan.tests.length > 0) {
    parts.push('Tests:\n' + plan.tests.map(t => {
      if (typeof t === 'object') {
        return `- ${t.name || t.label || ''} ${t.date || ''}`.trim();
      }
      return `- ${t}`;
    }).join('\n'));
  }
  
  if (plan.procedures_planned && Array.isArray(plan.procedures_planned) && plan.procedures_planned.length > 0) {
    parts.push('Planned Procedures:\n' + plan.procedures_planned.map(p => {
      if (typeof p === 'object') {
        return `- ${p.name || ''} ${p.date || ''}`.trim();
      }
      return `- ${p}`;
    }).join('\n'));
  }
  
  if (plan.referrals && Array.isArray(plan.referrals) && plan.referrals.length > 0) {
    parts.push('Referrals:\n' + plan.referrals.map(r => {
      if (typeof r === 'object') {
        return `- ${r.specialty || r.name || ''} ${r.date || ''}`.trim();
      }
      return `- ${r}`;
    }).join('\n'));
  }
  
  if (plan.counseling && Array.isArray(plan.counseling) && plan.counseling.length > 0) {
    parts.push('Counseling: ' + plan.counseling.join(', '));
  }
  
  if (plan.follow_up) {
    parts.push(`Follow-up: ${plan.follow_up}${plan.follow_up_date ? ` (${plan.follow_up_date})` : ''}`);
  }
  
  if (plan.immobilization && plan.immobilization.applied) {
    const immo = plan.immobilization;
    parts.push(`Immobilization: ${immo.type || 'N/A'} - ${immo.side || 'N/A'} ${immo.region || ''}`.trim());
  }
  
  if (plan.weight_bearing) {
    parts.push(`Weight Bearing: ${plan.weight_bearing}`);
  }
  
  if (plan.dvt_prophylaxis) {
    parts.push(`DVT Prophylaxis: ${plan.dvt_prophylaxis}`);
  }
  
  if (plan.sick_leave_days) {
    parts.push(`Sick Leave: ${plan.sick_leave_days} days`);
  }
  
  if (plan.work_restrictions) {
    parts.push(`Work Restrictions: ${plan.work_restrictions}`);
  }
  
  if (plan.physio) {
    parts.push(`Physiotherapy: ${plan.physio}`);
  }
  
  return parts.join('\n\n') || 'No treatment plan specified';
};

// Generic specialty report view that renders all fields
const SpecialtyReportView = ({ report, docType, specialty, medications = [] }) => {
  const reportData = report.reportData || {};
  
  // Format diagnosis and plan
  const diagnosisText = formatDiagnosis(reportData.diagnosis);
  const planText = formatPlan(reportData.plan);
  
  // Extract top-level sections with proper rendering
  const sections = [];
  
  // Vitals Section - Display at the beginning
  const vitals = reportData.vitals || {};
  const hasVitals = vitals && typeof vitals === 'object' && Object.keys(vitals).length > 0 && 
    (vitals.bp_right || vitals.bp_left || vitals.hr || vitals.temp || vitals.spo2 || 
     vitals.weight || vitals.height || vitals.bmi || vitals.respiratory_rate);
  
  if (hasVitals) {
    sections.push(
      <div key="vitals" className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
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
  }
  
  // Chief Complaint
  if (reportData.chief_complaint || report.chiefComplaint) {
    sections.push(
      <Section key="chief_complaint" title="Chief Complaint" content={reportData.chief_complaint || report.chiefComplaint} />
    );
  }
  
  // HPI - render with details if it's an object
  if (hasData(reportData.hpi)) {
    if (typeof reportData.hpi === 'object') {
      const hpiContent = [
        reportData.hpi.description && `Description: ${reportData.hpi.description}`,
        reportData.hpi.ocular_history && `Ocular History: ${reportData.hpi.ocular_history}`,
        reportData.hpi.systemic_history && `Systemic History: ${reportData.hpi.systemic_history}`,
        reportData.hpi.onset_type && `Onset Type: ${reportData.hpi.onset_type}`,
        reportData.hpi.lkw_time && `Last Known Well: ${reportData.hpi.lkw_time}`,
        reportData.hpi.course && `Course: ${reportData.hpi.course}`,
        reportData.hpi.triggers && `Triggers: ${reportData.hpi.triggers}`,
        reportData.hpi.associated_symptoms && Array.isArray(reportData.hpi.associated_symptoms) && reportData.hpi.associated_symptoms.length > 0 && `Associated Symptoms: ${reportData.hpi.associated_symptoms.join(', ')}`,
        reportData.hpi.meds && `Medications: ${reportData.hpi.meds}`,
        reportData.hpi.allergies && `Allergies: ${reportData.hpi.allergies}`,
        reportData.hpi.pmh && `Past Medical History: ${reportData.hpi.pmh}`,
        reportData.hpi.family && `Family History: ${reportData.hpi.family}`,
        reportData.hpi.social && `Social History: ${reportData.hpi.social}`,
        reportData.hpi.free_text && reportData.hpi.free_text
      ].filter(Boolean).join('\n\n');
      
      if (hpiContent) {
        sections.push(
          <div key="hpi" className="bg-white p-4 border-l-4 border-emerald-400/60 shadow-sm">
            <h3 className="text-md font-bold text-emerald-400 mb-2">History of Present Illness</h3>
            <div className="text-gray-800 whitespace-pre-line">{hpiContent}</div>
          </div>
        );
      }
    } else if (reportData.hpi_free_text || reportData.hpi) {
      sections.push(
        <Section key="hpi" title="History of Present Illness" content={reportData.hpi_free_text || reportData.hpi || report.historyOfPresentIllness} />
      );
    }
  }
  
  // Get all fields from reportData, excluding already-rendered ones
  const excludedKeys = new Set(['chief_complaint', 'hpi', 'hpi_free_text', 'diagnosis', 'plan', 'meta', 'doc_type', 'vitals']);
  
  // Render all other fields using the recursive renderField function
  const otherFields = Object.entries(reportData)
    .filter(([key]) => !excludedKeys.has(key))
    .filter(([_, value]) => hasData(value))
    .map(([key, value]) => renderField(key, value, 0));
  
  return (
    <>
      {sections}
      {otherFields}
      {diagnosisText !== 'No diagnosis specified' && (
        <Section title="Diagnosis" content={diagnosisText} />
      )}
      {planText !== 'No treatment plan specified' && (
        <Section title="Treatment Plan" content={planText} />
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
    </>
  );
};

export default SpecialtyReportView;

