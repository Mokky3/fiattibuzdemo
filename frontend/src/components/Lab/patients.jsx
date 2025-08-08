import React, { useState, useEffect } from 'react';
import { Search, Filter, User, FileText, Calendar, Download, Plus, Eye, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
// Import the header component
import LabHeader from './header';

const LabPatientsModule = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock patients data
  const [patients] = useState([
    {
      id: 'P-025',
      name: 'Muhammad Hariton',
      dateOfBirth: '30.06.2004',
      age: 20,
      gender: 'Male',
      bloodGroup: 'O+',
      rhFactor: 'Positive',
      height: '175 cm',
      weight: '70 kg',
      bmi: '22.9',
      lastMeasured: '2025-06-28',
      address: '123 Main Street, City Center',
      temporaryAddress: 'Same as permanent',
      workPlace: 'Tech Solutions Inc.',
      occupation: 'Software Developer',
      avatar: 'MH',
      recentTests: [
        {
          id: 'LT-001',
          date: '30.06.2023',
          time: '14:00',
          type: 'Lab Results (CT)',
          description: 'Complete Blood Count and Metabolic Panel',
          physician: 'Dr. Johnson',
          status: 'completed',
          results: [
            { test: 'Hemoglobin', value: '14.2', unit: 'g/dL', range: '12.0-16.0', status: 'normal' },
            { test: 'White Blood Cells', value: '7500', unit: '/μL', range: '4500-11000', status: 'normal' },
            { test: 'Glucose', value: '95', unit: 'mg/dL', range: '70-100', status: 'normal' }
          ]
        },
        {
          id: 'LT-002',
          date: '25.06.2023',
          time: '10:30',
          type: 'Lipid Panel',
          description: 'Cholesterol and triglycerides screening',
          physician: 'Dr. Smith',
          status: 'completed',
          results: [
            { test: 'Total Cholesterol', value: '185', unit: 'mg/dL', range: '<200', status: 'normal' },
            { test: 'HDL Cholesterol', value: '45', unit: 'mg/dL', range: '>40', status: 'normal' },
            { test: 'LDL Cholesterol', value: '120', unit: 'mg/dL', range: '<100', status: 'high' }
          ]
        }
      ]
    },
    {
      id: 'P-031',
      name: 'Abu Ali',
      dateOfBirth: '15.03.1985',
      age: 39,
      gender: 'Male',
      bloodGroup: 'A+',
      rhFactor: 'Positive',
      height: '180 cm',
      weight: '85 kg',
      bmi: '26.2',
      lastMeasured: '2025-06-27',
      address: '456 Oak Avenue, Downtown',
      temporaryAddress: 'Visiting family at 789 Pine St',
      workPlace: 'City Hospital',
      occupation: 'Nurse',
      avatar: 'AA',
      recentTests: [
        {
          id: 'LT-003',
          date: '28.06.2023',
          time: '09:00',
          type: 'Annual Physical',
          description: 'Routine health screening',
          physician: 'Dr. Wilson',
          status: 'pending',
          results: []
        }
      ]
    },
    {
      id: 'P-025-1',
      name: 'Amir Temur',
      dateOfBirth: '22.08.1992',
      age: 31,
      gender: 'Male',
      bloodGroup: 'B+',
      rhFactor: 'Positive',
      height: '172 cm',
      weight: '75 kg',
      bmi: '25.3',
      lastMeasured: '2025-06-26',
      address: '321 Elm Street, Suburbs',
      temporaryAddress: 'Same as permanent',
      workPlace: 'University Medical Center',
      occupation: 'Medical Technician',
      avatar: 'AT',
      recentTests: [
        {
          id: 'LT-004',
          date: '26.06.2023',
          time: '11:15',
          type: 'Diabetes Screening',
          description: 'HbA1c and glucose tolerance test',
          physician: 'Dr. Brown',
          status: 'completed',
          results: [
            { test: 'HbA1c', value: '5.8', unit: '%', range: '<5.7', status: 'borderline' },
            { test: 'Fasting Glucose', value: '105', unit: 'mg/dL', range: '70-100', status: 'high' }
          ]
        }
      ]
    },
    {
      id: 'P-096',
      name: 'Beruniy',
      dateOfBirth: '10.12.1988',
      age: 35,
      gender: 'Female',
      bloodGroup: 'AB-',
      rhFactor: 'Negative',
      height: '165 cm',
      weight: '62 kg',
      bmi: '22.8',
      lastMeasured: '2025-06-25',
      address: '654 Maple Drive, Westside',
      temporaryAddress: 'Same as permanent',
      workPlace: 'Research Institute',
      occupation: 'Lab Researcher',
      avatar: 'B',
      recentTests: [
        {
          id: 'LT-005',
          date: '25.06.2023',
          time: '13:45',
          type: 'Thyroid Function',
          description: 'TSH, T3, T4 levels',
          physician: 'Dr. Davis',
          status: 'completed',
          results: [
            { test: 'TSH', value: '2.1', unit: 'mIU/L', range: '0.4-4.0', status: 'normal' },
            { test: 'Free T4', value: '1.2', unit: 'ng/dL', range: '0.8-1.8', status: 'normal' }
          ]
        }
      ]
    }
  ]);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.id.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'recent' && patient.recentTests.some(test => 
                           new Date(test.date.split('.').reverse().join('-')) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                         ));
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50';
      case 'high': 
      case 'low': 
      case 'borderline': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const PatientCard = ({ patient }) => (
    <div 
      className={`bg-white rounded-lg border p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        selectedPatient?.id === patient.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
      }`}
      onClick={() => setSelectedPatient(patient)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-lg bg-teal-500 flex items-center justify-center text-white font-semibold text-sm">
          {patient.avatar}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{patient.name}</h3>
          <p className="text-sm text-gray-500">#{patient.id}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">{patient.age} y.o.</div>
          <div className="text-xs text-gray-500">{patient.gender}</div>
        </div>
      </div>
    </div>
  );

  const PatientDetails = ({ patient }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Patient Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
            <p className="text-gray-600">{patient.dateOfBirth} ({patient.age} y.o.) • {patient.gender}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-teal-500 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors">
            <Eye className="w-4 h-4 inline mr-2" />
            View
          </button>
          <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
            <Plus className="w-4 h-4 inline mr-2" />
            Add Report
          </button>
        </div>
      </div>

      {/* Medical Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Blood Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Blood Group:</span>
                <span className="font-medium">{patient.bloodGroup || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">RH Factor:</span>
                <span className="font-medium">{patient.rhFactor || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Physical Measurements</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Height:</span>
                <span className="font-medium">{patient.height || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weight:</span>
                <span className="font-medium">{patient.weight || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">BMI:</span>
                <span className="font-medium">{patient.bmi || '—'}</span>
              </div>
              {patient.lastMeasured && (
                <p className="text-xs text-gray-500 mt-2">Last measured: {patient.lastMeasured}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600 text-sm">Address:</span>
                <p className="font-medium text-sm">{patient.address || '—'}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Temporary:</span>
                <p className="font-medium text-sm">{patient.temporaryAddress || '—'}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Work Place:</span>
                <p className="font-medium text-sm">{patient.workPlace || '—'}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Occupation:</span>
                <p className="font-medium text-sm">{patient.occupation || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Lab Reports
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Test History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Lab Reports</h3>
            <div className="flex space-x-2">
              <button className="text-sm text-gray-500 hover:text-gray-700">
                <Filter className="w-4 h-4 inline mr-1" />
                Filter
              </button>
              <button className="text-sm text-teal-600 hover:text-teal-700">
                <Download className="w-4 h-4 inline mr-1" />
                Export All
              </button>
            </div>
          </div>

          {patient.recentTests.map((test) => (
            <div key={test.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg text-sm font-medium">
                    {test.time}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{test.type}</h4>
                    <p className="text-sm text-gray-600">{test.description}</p>
                    <p className="text-xs text-gray-500">Provider: {test.physician}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {getTestStatusIcon(test.status)}
                    <span className="text-sm text-gray-600 capitalize">{test.status}</span>
                  </div>
                  <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors">
                    View
                  </button>
                </div>
              </div>

              {test.results && test.results.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-3">Test Results:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {test.results.map((result, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm text-gray-900">{result.test}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {result.value} <span className="text-sm font-normal text-gray-500">{result.unit}</span>
                        </div>
                        <div className="text-xs text-gray-500">Range: {result.range}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Complete Test History</h3>
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Complete test history view coming soon</p>
            <p className="text-sm text-gray-500">This will show a chronological timeline of all lab tests</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <header className="bg-[#5ACCC3] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-2xl tracking-wider">
            <span className="mr-1">LAB PORTAL</span>
          </div>
          <nav className="flex space-x-8">
            <button className="text-white font-medium py-1 hover:border-b-2 hover:border-white transition-all">ORDERS</button>
            <button className="text-white font-medium py-1 border-b-2 border-white">PATIENTS</button>
            <button className="text-white font-medium py-1 hover:border-b-2 hover:border-white transition-all">RESULTS</button>
            <button className="text-white font-medium py-1 hover:border-b-2 hover:border-white transition-all">REPORTS</button>
            <button className="text-white font-medium py-1 hover:border-b-2 hover:border-white transition-all">MESSAGES</button>
          </nav>
          <div className="flex items-center space-x-5">
            <div className="flex items-center bg-white rounded-full px-4 py-1.5">
              <input
                type="text"
                placeholder="SEARCH"
                className="bg-transparent border-none outline-none text-gray-800 text-sm w-28 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="h-4 w-4 text-gray-600" />
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm">
              LT
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patients List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                  Patients List
                </h2>
                <button className="text-gray-400 hover:text-gray-600">
                  <Filter className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('recent')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filterStatus === 'recent'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Recent Tests
                </button>
              </div>

              {/* Patients List */}
              <div className="space-y-3">
                {filteredPatients.map((patient) => (
                  <PatientCard key={patient.id} patient={patient} />
                ))}
              </div>

              {filteredPatients.length === 0 && (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No patients found</p>
                </div>
              )}
            </div>
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-3">
            {selectedPatient ? (
              <PatientDetails patient={selectedPatient} />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <User className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Patient</h3>
                <p className="text-gray-600">Choose a patient from the list to view their lab reports and medical information</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabPatientsModule;