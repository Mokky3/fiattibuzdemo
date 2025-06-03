import React, { useState } from 'react';
import { Header } from './Header';
import { useNavigate } from 'react-router-dom';

const Patient = () => {
  const [selectedPatient, setSelectedPatient] = useState(0);
  const [activeTab, setActiveTab] = useState('reports');
  const navigate = useNavigate();

  // Mock patient data
  const patients = [
    {
      id: 1,
      code: '#025',
      name: 'Muhammad Hariton',
      dob: '30.06.2004',
      age: '20 y.o.',
      gender: 'male',
      bloodGroup: '',
      rhFactor: '',
      height: '',
      weight: '',
      bmi: '',
      phoneNumber: '',
      email: '',
      address: '',
      temporaryAddress: '',
      workPlace: '',
      occupation: '',
      appointments: [
        {
          id: 1,
          time: '14:00',
          date: '30.06.2023',
          problem: 'Anxiety problems',
          description: 'Description of problems and notes are written here',
          provider: 'Name of physician'
        },
        {
          id: 2,
          time: '14:00',
          date: '30.06.2023',
          problem: 'Lab Results (CT)',
          description: 'Description of problems and notes are written here',
          provider: 'Name of physician'
        }
      ]
    },
    {
      id: 2,
      code: '#003-1',
      name: 'Abu Ali',
      dob: '12.04.1995',
      age: '29 y.o.',
      gender: 'male',
      bloodGroup: 'A+',
      rhFactor: 'Positive',
      height: '175 cm',
      weight: '70 kg',
      bmi: '22.9',
      phoneNumber: '',
      email: '',
      address: '',
      temporaryAddress: '',
      workPlace: '',
      occupation: '',
      appointments: []
    },
    {
      id: 3,
      code: '#025-1',
      name: 'Amir Temur',
      dob: '09.04.1336',
      age: '688 y.o.',
      gender: 'male',
      bloodGroup: '',
      rhFactor: '',
      height: '',
      weight: '',
      bmi: '',
      phoneNumber: '',
      email: '',
      address: '',
      temporaryAddress: '',
      workPlace: '',
      occupation: '',
      appointments: []
    },
    {
      id: 4,
      code: '#096',
      name: 'Beruniy',
      dob: '04.09.973',
      age: '1051 y.o.',
      gender: 'male',
      bloodGroup: '',
      rhFactor: '',
      height: '',
      weight: '',
      bmi: '',
      phoneNumber: '',
      email: '',
      address: '',
      temporaryAddress: '',
      workPlace: '',
      occupation: '',
      appointments: []
    }
  ];

  const handleAddReport = () => {
    // Navigate to the report page with the selected patient's ID
    navigate(`/doctor/report/${patients[selectedPatient].id}`);
  };

  const handleViewReport = (reportId) => {
    // Navigate to the view report page with the report ID
    navigate(`/reports/${reportId}`);
  };

  const renderContent = () => {
    const currentPatient = patients[selectedPatient];
    
    if (activeTab === 'reports') {
      return (
        <div className="space-y-4">
          {currentPatient.appointments.length > 0 ? (
            currentPatient.appointments.map((appointment) => (
              <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8">
                    <div className="text-center min-w-[80px]">
                      <div className="text-lg font-semibold text-gray-900">{appointment.time}</div>
                      <div className="text-xs text-gray-500 font-medium">{appointment.date}</div>
                    </div>
                    
                    <div className="min-w-[140px]">
                      <div className="font-semibold text-gray-900">{currentPatient.name}</div>
                      <div className="text-xs text-gray-500">{currentPatient.code}</div>
                    </div>
                    
                    <div className="min-w-[160px]">
                      <div className="font-semibold text-gray-900">{appointment.problem}</div>
                    </div>
                    
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-gray-600 text-sm leading-relaxed">{appointment.description}</div>
                    </div>
                    
                    <div className="min-w-[120px]">
                      <div className="text-gray-600 text-sm font-medium">{appointment.provider}</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleViewReport(appointment.id)}
                    className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors duration-200 shadow-sm"
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No reports found</p>
              <p className="text-sm text-gray-400 mt-1">This patient doesn't have any reports yet.</p>
            </div>
          )}
        </div>
      );
    }
    
    if (activeTab === 'prescriptions') {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p className="text-lg font-medium">No prescriptions found</p>
          <p className="text-sm text-gray-400 mt-1">This patient doesn't have any prescriptions yet.</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex md:flex-row gap-8 bg-gray-50 relative px-8 py-6">
        {/* Medical illustrations background */}
        <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
          <div className="w-full h-full bg-repeat" style={{ backgroundImage: "url('/medical-icons.svg')" }}></div>
        </div>
        
        {/* Left sidebar - Patient list */}
        <div className="md:w-1/5 lg:w-1/6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#5ACCC3] font-semibold text-base">Patients List</h2>
                <button className="text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 p-1 rounded-md transition-colors duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 5a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {patients.map((patient, index) => (
                <div 
                  key={patient.id} 
                  onClick={() => setSelectedPatient(index)}
                  className={`py-4 px-4 cursor-pointer border rounded-xl text-center transition-all duration-200 ${
                    selectedPatient === index 
                      ? 'bg-[#5ACCC3] text-white shadow-md transform scale-105' 
                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-[#5ACCC3] hover:shadow-sm'
                  }`}
                >
                  <h3 className={`font-semibold text-sm ${selectedPatient === index ? 'text-white' : 'text-gray-900'}`}>
                    {patient.name}
                  </h3>
                  <p className={`text-xs mt-1 ${selectedPatient === index ? 'text-white text-opacity-90' : 'text-gray-500'}`}>
                    {patient.code}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main content - Patient details */}
        <div className="md:w-4/5 lg:w-5/6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            {patients[selectedPatient] && (
              <>
                <div className="flex mb-10">
                  {/* Patient photo and basic info */}
                  <div className="w-36 h-36 bg-gradient-to-br from-gray-100 to-gray-200 mr-10 flex-shrink-0 rounded-xl shadow-inner flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mt-2">
                    <h2 className="text-2xl font-bold text-[#5ACCC3] mb-3">{patients[selectedPatient].name}</h2>
                    <div className="flex items-center space-x-4 mb-2">
                      <p className="text-gray-700 text-base font-medium">
                        {patients[selectedPatient].dob} ({patients[selectedPatient].age})
                      </p>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <p className="text-gray-700 text-base font-medium capitalize">
                        {patients[selectedPatient].gender}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-x-12 gap-y-4 mt-8">
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Blood Group</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].bloodGroup || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Blood Rh Factor</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].rhFactor || '—'}</p>
                      </div>
                      <div></div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Height</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].height || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Weight</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].weight || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">BMI</p>
                        <p className="text-base font-semibold text-gray-900">{patients[selectedPatient].bmi || '—'}</p>
                        <p className="text-xs text-gray-400">Last measured</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-auto space-y-6">
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Address</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].address || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Temporary Address</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].temporaryAddress || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Work Place</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].workPlace || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Occupation</p>
                      <p className="text-sm text-gray-900">{patients[selectedPatient].occupation || '—'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setActiveTab('reports')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          activeTab === 'reports' 
                            ? 'bg-[#5ACCC3] text-white shadow-sm' 
                            : 'text-[#5ACCC3] hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        Reports
                      </button>
                      <button 
                        onClick={() => setActiveTab('prescriptions')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          activeTab === 'prescriptions' 
                            ? 'bg-[#5ACCC3] text-white shadow-sm' 
                            : 'text-[#5ACCC3] hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        Prescriptions
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 p-2 rounded-md transition-colors duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 5a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleViewReport(patients[selectedPatient].id)}
                        className="px-6 py-2 border-2 border-[#5ACCC3] text-[#5ACCC3] rounded-lg text-sm font-medium hover:bg-[#5ACCC3] hover:text-white transition-all duration-200"
                      >
                        View
                      </button>
                      <button 
                        onClick={handleAddReport}
                        className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4BB5AC] transition-colors duration-200 shadow-sm"
                      >
                        Add Report
                      </button>
                    </div>
                  </div>
                  
                  {/* Render content based on patient code */}
                  {renderContent()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Patient;