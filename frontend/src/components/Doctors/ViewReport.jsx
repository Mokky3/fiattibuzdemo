import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ViewReport = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();

  // This would be fetched from your API
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

  const handlePrint = () => {
    window.print();
  };

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
                <p className="text-md text-gray-700 mt-1">Date: {mockReport.date}</p>
              </div>
              <div className="mt-4 md:mt-0 text-right bg-white p-4 rounded-lg shadow-sm border border-[#5ACCC3]/20">
                <p className="font-bold text-[#5ACCC3]">{mockReport.doctor.name}</p>
                <p className="text-md text-gray-700">{mockReport.doctor.specialty}</p>
                <p className="text-sm text-gray-600">{mockReport.doctor.department}</p>
              </div>
            </div>
          </div>

          {/* Report Sections */}
          <div className="px-6 py-6 space-y-8">
            {/* Chief Complaint */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3] shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Chief Complaint</h3>
              <p className="text-gray-800">{mockReport.chiefComplaint}</p>
            </div>

            {/* History of Present Illness */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/80 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">History of Present Illness</h3>
              <p className="text-gray-800 whitespace-pre-line">{mockReport.historyOfPresentIllness}</p>
            </div>

            {/* Physical Examination */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Physical Examination</h3>
              <p className="text-gray-800 whitespace-pre-line">{mockReport.physicalExamination}</p>
            </div>

            {/* Diagnosis */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/90 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Diagnosis</h3>
              <p className="text-gray-800 whitespace-pre-line">{mockReport.diagnosis}</p>
            </div>

            {/* Treatment Plan */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/70 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Treatment Plan</h3>
              <p className="text-gray-800 whitespace-pre-line">{mockReport.treatmentPlan}</p>
            </div>

            {/* Medications */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3] shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Prescribed Medications</h3>
              <div className="mt-3 border border-[#5ACCC3]/20 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#5ACCC3]/10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5ACCC3] uppercase tracking-wider">Medication</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5ACCC3] uppercase tracking-wider">Dosage</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5ACCC3] uppercase tracking-wider">Frequency</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5ACCC3] uppercase tracking-wider">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockReport.medications.map((med, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#5ACCC3]/5'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{med.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.dosage}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.frequency}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Follow-up */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/80 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Follow-up</h3>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#5ACCC3]/10 p-3 rounded-md">
                <p className="text-gray-800 font-medium">{mockReport.followUp.reason}</p>
                <p className="text-[#5ACCC3] font-medium mt-2 md:mt-0 bg-white px-3 py-1 rounded-full shadow-sm border border-[#5ACCC3]/20">{mockReport.followUp.date}</p>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/60 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Additional Notes</h3>
              <p className="text-gray-800 italic">{mockReport.additionalNotes}</p>
            </div>
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

export default ViewReport;
