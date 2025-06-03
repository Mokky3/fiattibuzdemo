import React from 'react';

const GeneralForm = ({ report }) => {
  // This would come from your database
  const mockReport = {
    doctor: {
      name: "Dr. Sarah Johnson",
      specialty: "General Medicine",
      department: "Internal Medicine"
    },
    date: "2024-03-20",
    chiefComplaint: "Patient presents with persistent cough and fever for the past 5 days",
    historyOfPresentIllness: "Patient reports onset of symptoms 5 days ago, starting with sore throat followed by dry cough. Fever developed on day 2, reaching 38.5°C. No previous similar episodes in the past year.",
    physicalExamination: "Temperature: 38.2°C\nBlood Pressure: 120/80 mmHg\nRespiratory Rate: 20/min\nOxygen Saturation: 98%\nLungs: Bilateral crackles in lower lobes\nHeart: Regular rate and rhythm",
    diagnosis: "Acute Bronchitis\nUpper Respiratory Tract Infection",
    treatmentPlan: "1. Rest and adequate hydration\n2. Acetaminophen 500mg every 6 hours as needed for fever\n3. Saline nasal irrigation\n4. Follow-up in 1 week if symptoms persist",
    additionalNotes: "Patient advised to return if symptoms worsen or if fever persists beyond 3 days. Recommended to avoid smoking and exposure to cold air.",
    medications: [
      { name: "Acetaminophen", dosage: "500mg", frequency: "Every 6 hours", duration: "As needed" },
      { name: "Saline Nasal Spray", dosage: "As directed", frequency: "3 times daily", duration: "7 days" }
    ],
    followUp: {
      date: "2024-03-27",
      reason: "Reassessment of symptoms"
    }
  };

  // Use the mock data for now, replace with actual report prop when available
  const data = report || mockReport;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Medical Report</h2>
            <p className="text-sm text-gray-500">Date: {data.date}</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-800">{data.doctor.name}</p>
            <p className="text-sm text-gray-600">{data.doctor.specialty}</p>
            <p className="text-sm text-gray-500">{data.doctor.department}</p>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {/* Chief Complaint */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Chief Complaint</h3>
          <p className="text-gray-800">{data.chiefComplaint}</p>
        </div>

        {/* History of Present Illness */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">History of Present Illness</h3>
          <p className="text-gray-800 whitespace-pre-line">{data.historyOfPresentIllness}</p>
        </div>

        {/* Physical Examination */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Physical Examination</h3>
          <p className="text-gray-800 whitespace-pre-line">{data.physicalExamination}</p>
        </div>

        {/* Diagnosis */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Diagnosis</h3>
          <p className="text-gray-800 whitespace-pre-line">{data.diagnosis}</p>
        </div>

        {/* Treatment Plan */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Treatment Plan</h3>
          <p className="text-gray-800 whitespace-pre-line">{data.treatmentPlan}</p>
        </div>

        {/* Medications */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Prescribed Medications</h3>
          <div className="space-y-3">
            {data.medications.map((med, index) => (
              <div key={index} className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{med.name}</p>
                  <p className="text-sm text-gray-600">{med.dosage}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{med.frequency}</p>
                  <p className="text-sm text-gray-500">{med.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Follow-up</h3>
          <div className="flex justify-between items-center">
            <p className="text-gray-800">{data.followUp.reason}</p>
            <p className="text-gray-600">{data.followUp.date}</p>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Notes</h3>
          <p className="text-gray-800">{data.additionalNotes}</p>
        </div>
      </div>
    </div>
  );
};

export default GeneralForm;