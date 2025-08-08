import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from './Header';
import MidwiferyForm from './MidwiferyForm';
import GeneralForm from './GeneralForm';

const Report = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [selectedSpecialty, setSelectedSpecialty] = useState('midwifery & gynecology');
  const [selectedCode, setSelectedCode] = useState('#025');
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/doctor/patients/${patientId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch patient');
        const data = await res.json();
        setPatient(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPatient();
  }, [patientId]);

  const handleSaveReport = async () => {
    try {
      const res = await fetch('/api/doctor/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId,
          specialty: selectedSpecialty,
          code: selectedCode,
          data: formData
        })
      });
      if (!res.ok) throw new Error('Failed to save report');
      const data = await res.json();
      navigate(`/doctor/reports/${data.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save report');
    }
  };

  const specialties = [
    'general', 'ophthalmology', 'neurology', 'traumatology',
    'midwifery & gynecology', 'urology', 'general oncology',
    'cardiology', 'allergology'
  ];

  const codes = ['#025', '#003-1', '#025-1', '#096'];

  const renderSpecialtyForm = () => {
    const props = { formData, setFormData };

    if (selectedSpecialty === 'midwifery & gynecology' && selectedCode === '#025') {
      return <MidwiferyForm {...props} />;
    }
    if (selectedSpecialty === 'general') {
      return <GeneralForm {...props} />;
    }
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <p>This specialty form is not implemented yet.</p>
      </div>
    );
  };

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">Loading patient info...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />

      <div className="flex md:flex-row gap-6 bg-white relative px-8 py-4">
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="w-full h-full bg-repeat" style={{ backgroundImage: "url('/medical-icons.svg')" }}></div>
        </div>

        {/* Patient Sidebar */}
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

            <button onClick={() => navigate('/patients')} className="text-gray-600 text-sm mb-4 hover:text-[#5ACCC3]">
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
                <Info label="Height" value={patient.height} />
                <Info label="Weight" value={patient.weight} />
                <Info label="BMI" value={patient.bmi} />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Info label="Temperature" value={patient.temperature} />
                <Info label="Blood Pressure" value={patient.bloodPressure} />
              </div>

              <p className="text-xs text-gray-400 text-center mb-4">Last measured:</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Info label="Blood Group" value={patient.bloodGroup} />
                <Info label="Blood rh factor" value={patient.rhFactor} />
              </div>

              <Info label="Phone Number" value={patient.phoneNumber} />
              <Info label="Email Address" value={patient.emailAddress} />
              <Info label="Address" value={patient.address} />
              <Info label="Temporary Address" value={patient.temporaryAddress} />
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="hidden md:block w-px bg-gray-200 h-auto"></div>

        {/* Form Area */}
        <div className="md:w-4/5 lg:w-5/6">
          <div className="bg-white">
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
                  onClick={handleSaveReport}
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

const Info = ({ label, value }) => (
  <div className="mb-3">
    <p className="text-gray-600 text-xs">{label}:</p>
    <p className="text-sm">{value || '-'}</p>
  </div>
);

export default Report;
