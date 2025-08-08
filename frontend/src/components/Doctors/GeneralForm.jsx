import React from 'react';

const GeneralForm = ({ report }) => {
  if (!report) {
    return (
      <div className="p-6 text-center text-gray-500">Loading report data...</div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Medical Report</h2>
            <p className="text-sm text-gray-500">Date: {report.date || '—'}</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-800">{report.doctor?.name || 'Doctor not assigned'}</p>
            <p className="text-sm text-gray-600">{report.doctor?.specialty || '—'}</p>
            <p className="text-sm text-gray-500">{report.doctor?.department || '—'}</p>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {/* Chief Complaint */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Chief Complaint</h3>
          <p className="text-gray-800">{report.chiefComplaint?.trim() || 'Not provided'}</p>
        </div>

        {/* History of Present Illness */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">History of Present Illness</h3>
          <p className="text-gray-800 whitespace-pre-line">
            {report.historyOfPresentIllness?.trim() || 'Not provided'}
          </p>
        </div>

        {/* Physical Examination */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Physical Examination</h3>
          <p className="text-gray-800 whitespace-pre-line">
            {report.physicalExamination?.trim() || 'Not provided'}
          </p>
        </div>

        {/* Diagnosis */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Diagnosis</h3>
          <p className="text-gray-800 whitespace-pre-line">
            {report.diagnosis?.trim() || 'Not provided'}
          </p>
        </div>

        {/* Treatment Plan */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Treatment Plan</h3>
          <p className="text-gray-800 whitespace-pre-line">
            {report.treatmentPlan?.trim() || 'Not provided'}
          </p>
        </div>

        {/* Medications */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Prescribed Medications</h3>
          {report.medications && report.medications.length > 0 ? (
            <div className="space-y-3">
              {report.medications.map((med, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-800">{med.name || '—'}</p>
                    <p className="text-sm text-gray-600">{med.dosage || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{med.frequency || '—'}</p>
                    <p className="text-sm text-gray-500">{med.duration || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No medications listed.</p>
          )}
        </div>

        {/* Follow-up */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Follow-up</h3>
          <div className="flex justify-between items-center">
            <p className="text-gray-800">{report.followUp?.reason || '—'}</p>
            <p className="text-gray-600">{report.followUp?.date || '—'}</p>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Notes</h3>
          <p className="text-gray-800">{report.additionalNotes?.trim() || 'None'}</p>
        </div>
      </div>
    </div>
  );
};

export default GeneralForm;
