import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
        const res = await fetch(`/api/doctor/reports/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch report');
        const data = await res.json();
        setReport(data);
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
                <p className="font-bold text-[#5ACCC3]">{report.doctor.name}</p>
                <p className="text-md text-gray-700">{report.doctor.specialty}</p>
                <p className="text-sm text-gray-600">{report.doctor.department}</p>
              </div>
            </div>
          </div>

          {/* Report Sections */}
          <div className="px-6 py-6 space-y-8">
            <Section title="Chief Complaint" content={report.chiefComplaint} />
            <Section title="History of Present Illness" content={report.historyOfPresentIllness} />
            <Section title="Physical Examination" content={report.physicalExamination} />
            <Section title="Diagnosis" content={report.diagnosis} />
            <Section title="Treatment Plan" content={report.treatmentPlan} />

            {/* Medications Table */}
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

            {/* Follow-up */}
            <div className="bg-white p-4 border-l-4 border-[#5ACCC3]/80 shadow-sm">
              <h3 className="text-md font-bold text-[#5ACCC3] mb-2">Follow-up</h3>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#5ACCC3]/10 p-3 rounded-md">
                <p className="text-gray-800 font-medium">{report.followUp.reason}</p>
                <p className="text-[#5ACCC3] font-medium mt-2 md:mt-0 bg-white px-3 py-1 rounded-full shadow-sm border border-[#5ACCC3]/20">{report.followUp.date}</p>
              </div>
            </div>

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
    <p className={`text-gray-800 whitespace-pre-line ${italic ? 'italic' : ''}`}>{content}</p>
  </div>
);

export default ViewReport;
