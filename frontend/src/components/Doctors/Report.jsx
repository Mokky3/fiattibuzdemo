import React, { useState } from 'react';
import { Header } from './Header';
import MidwiferyForm from './MidwiferyForm';
import GeneralForm from './GeneralForm';
import { useNavigate } from 'react-router-dom';

const Report = () => {
  const navigate = useNavigate();
  const [selectedSpecialty, setSelectedSpecialty] = useState('midwifery & gynecology');
  const [selectedCode, setSelectedCode] = useState('#025');
  
  // Patient info (would be passed as props in real implementation)
  const patient = {
    name: 'Muhammad Hariton',
    gender: 'male',
    dob: '30.06.2004',
    age: '20 y.o.',
    height: '',
    weight: '',
    bmi: '',
    temperature: '',
    bloodPressure: '',
    bloodGroup: '',
    rhFactor: '',
    phoneNumber: '',
    emailAddress: '',
    address: '',
    temporaryAddress: '',
    workPlace: '',
    occupation: '',
    hazards: '',
    deregistration: '',
    registration: '',
    anotherInstitution: ''
  };

  // Available specialties
  const specialties = [
    'general', 
    'ophthalmology', 
    'neurology', 
    'traumatology', 
    'midwifery & gynecology', 
    'urology', 
    'general oncology', 
    'cardiology', 
    'allergology'
  ];
  
  // Available codes
  const codes = ['#025', '#003-1', '#025-1', '#096'];

  // Render the appropriate form based on selected specialty
  const renderSpecialtyForm = () => {
    if (selectedSpecialty === 'midwifery & gynecology' && selectedCode === '#025') {
      return <MidwiferyForm />;
    }
    if (selectedSpecialty === 'general') {
      return <GeneralForm />;
    }
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <p>This specialty form is not implemented yet.</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      
      <div className="flex md:flex-row gap-6 bg-white relative px-8 py-4">
        {/* Medical illustrations background */}
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="w-full h-full bg-repeat" style={{ backgroundImage: "url('/medical-icons.svg')" }}></div>
        </div>
        
        {/* Left sidebar - Patient info */}
        <div className="md:w-1/5 lg:w-1/6">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[#5ACCC3] font-medium text-sm">Patient portal</h2>
              <button className="text-[#5ACCC3]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 5a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <button 
              onClick={() => navigate('/patients')}
              className="text-gray-600 text-sm mb-4 hover:text-[#5ACCC3]"
            >
              &larr; back
            </button>
            
            <div className="border border-gray-200 rounded-md p-4 mb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-md"></div>
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-[#5ACCC3] font-medium">{patient.name} {patient.gender === 'male' ? '♂' : '♀'}</h3>
                <p className="text-sm text-gray-600">{patient.dob} ({patient.age})</p>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <p className="text-gray-600 text-xs">Height:</p>
                  <p className="text-sm">{patient.height || ''}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">Weight:</p>
                  <p className="text-sm">{patient.weight || ''}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">BMI:</p>
                  <p className="text-sm">{patient.bmi || ''}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <p className="text-gray-600 text-xs">Temperature:</p>
                  <p className="text-sm">{patient.temperature || ''}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">Blood Pressure:</p>
                  <p className="text-sm">{patient.bloodPressure || ''}</p>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 text-center mb-4">Last measured:</p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <p className="text-gray-600 text-xs">Blood Group:</p>
                  <p className="text-sm">{patient.bloodGroup || ''}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">Blood rh factor:</p>
                  <p className="text-sm">{patient.rhFactor || ''}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-gray-600 text-xs">phone number:</p>
                <p className="text-sm">{patient.phoneNumber || ''}</p>
              </div>
              
              <div className="mb-3">
                <p className="text-gray-600 text-xs">email address:</p>
                <p className="text-sm">{patient.emailAddress || ''}</p>
              </div>
              
              <div className="mb-3">
                <p className="text-gray-600 text-xs">address:</p>
                <p className="text-sm">{patient.address || ''}</p>
              </div>
              
              <div className="mb-1">
                <p className="text-gray-600 text-xs">temporary address:</p>
                <p className="text-sm">{patient.temporaryAddress || ''}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtle vertical divider */}
        <div className="hidden md:block w-px bg-gray-200 h-auto"></div>
        
        {/* Main content - Report form */}
        <div className="md:w-4/5 lg:w-5/6">
          <div className="bg-white">
            {/* Specialty tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {specialties.map(specialty => (
                <button
                  key={specialty}
                  onClick={() => setSelectedSpecialty(specialty)}
                  className={`px-3 py-1 text-sm rounded-md ${selectedSpecialty === specialty ? 'bg-[#5ACCC3] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {specialty}
                </button>
              ))}
            </div>
            
            {/* Report codes */}
            <div className="bg-[#5ACCC3]/10 rounded-md p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {codes.map(code => (
                  <button
                    key={code}
                    onClick={() => setSelectedCode(code)}
                    className={`px-3 py-1 text-sm rounded-md ${selectedCode === code ? 'bg-[#5ACCC3] text-white' : 'text-[#5ACCC3] bg-white'}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Report content area */}
            <div className="bg-white rounded-md border border-gray-200">
              {renderSpecialtyForm()}
              
              <div className="flex justify-end p-4 border-t">
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm mr-2"
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-[#5ACCC3] text-white rounded-md text-sm"
                >
                  Save Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;