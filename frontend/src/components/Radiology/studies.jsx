import React, { useState } from 'react';
import { Search, Filter, Calendar, Clock, Plus, Edit, Monitor, Camera, Eye, FileText, Phone, Mail, MapPin, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import RadiologyHeader from './header';

const RadiologyStudies = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedStudy, setExpandedStudy] = useState(null);

  const [filters, setFilters] = useState({
    modality: 'all',
    status: 'all',
    priority: 'all'
  });

  // Mock studies data
  const [studies] = useState([
    {
      id: 'RAD-001',
      accessionNumber: 'ACC2025001',
      patientName: 'Smith, John',
      mrn: 'MRN001234',
      age: 45,
      gender: 'M',
      dob: '1980-03-15',
      phone: '(555) 123-4567',
      email: 'john.smith@email.com',
      address: '123 Main St, City, State 12345',
      orderDate: '2025-06-29T08:00:00',
      scheduledDate: '2025-06-29T10:00:00',
      modality: 'CT',
      bodyPart: 'Chest',
      studyDescription: 'CT Chest W/O Contrast',
      indication: 'Chest pain, rule out pulmonary embolism',
      priority: 'STAT',
      status: 'scheduled',
      orderingPhysician: 'Dr. Johnson, Emergency',
      technologist: 'Sarah Chen',
      location: 'Emergency Department',
      room: 'CT Room 1',
      contrast: false,
      preparation: 'No preparation required',
      duration: 30,
      notes: 'Patient has contrast allergy',
      insurance: 'Blue Cross Blue Shield',
      authorization: 'AUTH123456',
      cptCode: '71250'
    },
    {
      id: 'RAD-002',
      accessionNumber: 'ACC2025002',
      patientName: 'Davis, Sarah',
      mrn: 'MRN001235',
      age: 32,
      gender: 'F',
      dob: '1993-07-22',
      phone: '(555) 234-5678',
      email: 'sarah.davis@email.com',
      address: '456 Oak Ave, City, State 12345',
      orderDate: '2025-06-28T14:00:00',
      scheduledDate: '2025-06-29T11:00:00',
      modality: 'MRI',
      bodyPart: 'Brain',
      studyDescription: 'MRI Brain W/ and W/O Contrast',
      indication: 'Headaches, rule out space-occupying lesion',
      priority: 'Routine',
      status: 'completed',
      orderingPhysician: 'Dr. Wilson, Neurology',
      technologist: 'Mike Rodriguez',
      location: 'Neurology Clinic',
      room: 'MRI Suite 2',
      contrast: true,
      preparation: 'Remove all metal objects',
      duration: 45,
      notes: 'Patient claustrophobic - sedation administered',
      insurance: 'United Healthcare',
      authorization: 'AUTH789012',
      cptCode: '70553'
    },
    {
      id: 'RAD-003',
      accessionNumber: 'ACC2025003',
      patientName: 'Johnson, Mike',
      mrn: 'MRN001236',
      age: 28,
      gender: 'M',
      dob: '1997-01-10',
      phone: '(555) 345-6789',
      email: 'mike.johnson@email.com',
      address: '789 Pine Rd, City, State 12345',
      orderDate: '2025-06-29T09:00:00',
      scheduledDate: '2025-06-29T14:00:00',
      modality: 'XR',
      bodyPart: 'Chest',
      studyDescription: 'Chest X-Ray 2 Views',
      indication: 'Cough and fever, rule out pneumonia',
      priority: 'Urgent',
      status: 'in_progress',
      orderingPhysician: 'Dr. Brown, Internal Medicine',
      technologist: 'Lisa Park',
      location: 'Internal Medicine',
      room: 'X-Ray Room 3',
      contrast: false,
      preparation: 'Remove jewelry and clothing from waist up',
      duration: 15,
      notes: 'Patient cooperative',
      insurance: 'Aetna',
      authorization: 'AUTH345678',
      cptCode: '71020'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'STAT': return 'bg-red-100 text-red-800 border-red-200';
      case 'Urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Routine': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModalityIcon = (modality) => {
    switch (modality) {
      case 'CT': return <Monitor className="w-4 h-4 text-blue-600" />;
      case 'MRI': return <Monitor className="w-4 h-4 text-purple-600" />;
      case 'XR': return <Camera className="w-4 h-4 text-gray-600" />;
      case 'US': return <Eye className="w-4 h-4 text-green-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredStudies = studies.filter(study => {
    const matchesTab = activeTab === 'all' || study.status === activeTab;
    const matchesSearch = study.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         study.accessionNumber.includes(searchTerm) ||
                         study.mrn.includes(searchTerm);
    const matchesFilters = filters.modality === 'all' || study.modality === filters.modality;
    return matchesTab && matchesSearch && matchesFilters;
  });

  const StudyCard = ({ study }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-1">
              {getModalityIcon(study.modality)}
              <span className="text-xs font-medium text-gray-600">{study.modality}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
              {study.priority}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="font-semibold text-gray-900">{study.patientName}</h3>
              <span className="text-sm text-gray-500">({study.age}{study.gender})</span>
              <span className="text-sm text-gray-400">MRN: {study.mrn}</span>
            </div>
            <p className="text-gray-700 font-medium mb-1">{study.studyDescription}</p>
            <p className="text-gray-600 text-sm mb-2">{study.indication}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Acc: {study.accessionNumber}</span>
              <span>Scheduled: {format(parseISO(study.scheduledDate), 'MMM d, HH:mm')}</span>
              <span>{study.location}</span>
              {study.contrast && <span className="text-yellow-600">Contrast</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-3">
          <span className={`px-3 py-1 rounded-lg text-sm border ${getStatusColor(study.status)}`}>
            {study.status}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setExpandedStudy(expandedStudy === study.id ? null : study.id)}
              className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              {expandedStudy === study.id ? 'Less' : 'Details'}
            </button>
            <button
              onClick={() => setSelectedStudy(study)}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-1"
            >
              <Edit className="w-4 h-4" />
              <span>Manage</span>
            </button>
          </div>
        </div>
      </div>

      {expandedStudy === study.id && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Patient Details</h4>
              <div className="space-y-1 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3 h-3" />
                  <span>{study.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3 h-3" />
                  <span>{study.email}</span>
                </div>
                <div>Insurance: {study.insurance}</div>
                <div>Auth: {study.authorization}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Clinical Info</h4>
              <div className="space-y-1 text-gray-600">
                <div>Physician: {study.orderingPhysician}</div>
                <div>Room: {study.room}</div>
                <div>Duration: {study.duration} min</div>
                <div>CPT: {study.cptCode}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-600 text-sm">{study.notes}</p>
              {study.preparation && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  <strong>Prep:</strong> {study.preparation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const StudyModal = ({ study }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{study.patientName}</h2>
              <p className="text-gray-600">{study.studyDescription}</p>
            </div>
            <button onClick={() => setSelectedStudy(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">MRN:</span>
                    <span className="font-medium">{study.mrn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">DOB:</span>
                    <span className="font-medium">{format(parseISO(study.dob), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age/Gender:</span>
                    <span className="font-medium">{study.age}Y {study.gender}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 mt-2">
                    <Phone className="w-3 h-3" />
                    <span>{study.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Insurance</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium">{study.insurance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Authorization:</span>
                    <span className="font-medium">{study.authorization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPT Code:</span>
                    <span className="font-medium">{study.cptCode}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Study Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modality:</span>
                    <span className="font-medium flex items-center space-x-1">
                      {getModalityIcon(study.modality)}
                      <span>{study.modality}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Body Part:</span>
                    <span className="font-medium">{study.bodyPart}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contrast:</span>
                    <span className={`font-medium ${study.contrast ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {study.contrast ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{study.duration} minutes</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Clinical</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 block">Indication:</span>
                    <span className="font-medium">{study.indication}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Physician:</span>
                    <span className="font-medium">{study.orderingPhysician}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                      {study.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {study.preparation && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Preparation Instructions</h3>
              <p className="text-blue-800">{study.preparation}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
              Reschedule
            </button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>View Images</span>
            </button>
            <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Edit Study</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <RadiologyHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Studies Management</h1>
              <p className="text-gray-600">Manage radiology studies and patient information</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All', count: studies.length },
                  { key: 'scheduled', label: 'Scheduled', count: studies.filter(s => s.status === 'scheduled').length },
                  { key: 'in_progress', label: 'In Progress', count: studies.filter(s => s.status === 'in_progress').length },
                  { key: 'completed', label: 'Completed', count: studies.filter(s => s.status === 'completed').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Study</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, MRN, accession number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filters.modality}
                  onChange={(e) => setFilters(prev => ({ ...prev, modality: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Modalities</option>
                  <option value="CT">CT</option>
                  <option value="MRI">MRI</option>
                  <option value="XR">X-Ray</option>
                  <option value="US">Ultrasound</option>
                </select>
                
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="STAT">STAT</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Routine">Routine</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Today's Studies</p>
                <p className="text-3xl font-bold text-blue-600">
                  {studies.filter(s => isSameDay(parseISO(s.scheduledDate), new Date())).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">STAT Studies</p>
                <p className="text-3xl font-bold text-red-600">
                  {studies.filter(s => s.priority === 'STAT').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">In Progress</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {studies.filter(s => s.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-green-600">
                  {studies.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Studies List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'all' ? 'All Studies' : `${activeTab.replace('_', ' ')} Studies`}
            </h2>
            <span className="text-gray-500 text-sm">
              {filteredStudies.length} of {studies.length} studies
            </span>
          </div>

          {filteredStudies.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No studies found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudies.map(study => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedStudy && <StudyModal study={selectedStudy} />}
    </div>
  );
};

export default RadiologyStudies;