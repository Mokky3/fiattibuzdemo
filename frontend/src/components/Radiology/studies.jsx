import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Calendar, Clock, Edit, Monitor, Camera, Eye, FileText, Phone, Mail, MapPin, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload, Loader } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import RadiologyHeader from './header';
import { getStudies, updateStudy, deleteStudy, uploadDicomStudy, searchPatients } from '../../services/radiologyService';

const RadiologyStudies = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [savingStudy, setSavingStudy] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedStudy, setExpandedStudy] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadForm, setUploadForm] = useState({
    patient_id: '',
    modality: '',
    body_part: '',
    description: '',
    source: 'external_cd',
    study_date: format(new Date(), 'yyyy-MM-dd'),
    file: null
  });
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const patientSearchRef = useRef(null);

  const [filters, setFilters] = useState({
    modality: 'all',
    status: 'all',
    priority: 'all'
  });

  // Real studies data from API
  const [studies, setStudies] = useState([]);
  const [studyStats, setStudyStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 50,
    total: 0
  });

  // Fetch studies data from API
  useEffect(() => {
    const fetchStudiesData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const studiesData = await getStudies({
          status: activeTab === 'all' ? undefined : activeTab,
          modality: filters.modality === 'all' ? undefined : filters.modality,
          priority: filters.priority === 'all' ? undefined : filters.priority,
          search: searchTerm || undefined,
          page: pagination.page,
          size: pagination.size
        });
        
        // Extract data from response
        const items = studiesData.items || [];
        const summary = studiesData.summary || {};
        
        setStudies(items);
        setStudyStats({
          total: studiesData.total || 0,
          statusCounts: summary.statusCounts || {},
          priorityCounts: summary.priorityCounts || {},
          modalityCounts: summary.modalityCounts || {},
          scheduledToday: summary.scheduledToday || 0,
          statPriority: summary.statPriority || 0
        });
        setPagination(prev => ({
          ...prev,
          total: studiesData.total || 0
        }));
      } catch (err) {
        console.error('Error fetching studies data:', err);
        setError(err.message || 'Failed to load studies');
        setStudies([]);
        setStudyStats({
          total: 0,
          statusCounts: {},
          priorityCounts: {},
          modalityCounts: {},
          scheduledToday: 0,
          statPriority: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudiesData();
  }, [activeTab, filters, searchTerm, pagination.page, pagination.size]);

  // Initialize edit form data when study is selected
  useEffect(() => {
    if (selectedStudy) {
      // Helper function to format date for datetime-local input
      const formatDateTimeLocal = (dateValue) => {
        if (!dateValue) return '';
        try {
          const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
          return format(date, 'yyyy-MM-dd\'T\'HH:mm');
        } catch (e) {
          return '';
        }
      };

      setEditFormData({
        accessionNumber: selectedStudy.accessionNumber || '',
        patientName: selectedStudy.patientName || '',
        mrn: selectedStudy.mrn || '',
        age: selectedStudy.age || '',
        gender: selectedStudy.gender || 'O',
        dob: selectedStudy.dob || '',
        orderDate: formatDateTimeLocal(selectedStudy.orderDate),
        scheduledDate: formatDateTimeLocal(selectedStudy.scheduledDate),
        modality: selectedStudy.modality || '',
        bodyPart: selectedStudy.bodyPart || '',
        studyDescription: selectedStudy.studyDescription || '',
        indication: selectedStudy.indication || '',
        priority: selectedStudy.priority || 'Routine',
        status: selectedStudy.status || 'scheduled',
        orderingPhysician: selectedStudy.orderingPhysician || '',
        technologist: selectedStudy.technologist || '',
        location: selectedStudy.location || '',
        room: selectedStudy.room || '',
        contrast: selectedStudy.contrast || false,
        preparation: selectedStudy.preparation || '',
        duration: selectedStudy.duration || 0,
        notes: selectedStudy.notes || '',
        insurance: selectedStudy.insurance || '',
        authorization: selectedStudy.authorization || '',
        cptCode: selectedStudy.cptCode || '',
      });
      setSaveError(null);
    }
  }, [selectedStudy]);

  // Handle save study
  const handleSaveStudy = async () => {
    if (!selectedStudy || !editFormData) return;

    try {
      setSavingStudy(true);
      setSaveError(null);

      // Helper function to convert datetime-local to ISO string
      const convertToISO = (dateTimeLocal) => {
        if (!dateTimeLocal) return undefined;
        try {
          // datetime-local format is 'YYYY-MM-DDTHH:mm', convert to ISO
          const date = new Date(dateTimeLocal);
          return date.toISOString();
        } catch (e) {
          return undefined;
        }
      };

      // Prepare update payload (only include editable fields - exclude patient info, insurance, and clinical fields)
      const updatePayload = {
        orderDate: convertToISO(editFormData.orderDate),
        scheduledDate: convertToISO(editFormData.scheduledDate),
        modality: editFormData.modality || undefined,
        bodyPart: editFormData.bodyPart || undefined,
        studyDescription: editFormData.studyDescription || undefined,
        contrast: editFormData.contrast !== undefined ? editFormData.contrast : undefined,
        preparation: editFormData.preparation || undefined,
        duration: editFormData.duration ? parseInt(editFormData.duration) : undefined,
        notes: editFormData.notes || undefined,
      };

      // Remove undefined values (keep empty strings and false values as they are valid updates)
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      await updateStudy(selectedStudy.id, updatePayload);

      // Refresh studies list
      const studiesData = await getStudies({
        status: activeTab === 'all' ? undefined : activeTab,
        modality: filters.modality === 'all' ? undefined : filters.modality,
        priority: filters.priority === 'all' ? undefined : filters.priority,
        search: searchTerm || undefined,
        page: pagination.page,
        size: pagination.size
      });

      const items = studiesData.items || [];
      const summary = studiesData.summary || {};

      setStudies(items);
      setStudyStats({
        total: studiesData.total || 0,
        statusCounts: summary.statusCounts || {},
        priorityCounts: summary.priorityCounts || {},
        modalityCounts: summary.modalityCounts || {},
        scheduledToday: summary.scheduledToday || 0,
        statPriority: summary.statPriority || 0
      });

      // Update selected study with new data
      const updatedStudy = items.find(s => s.id === selectedStudy.id);
      if (updatedStudy) {
        setSelectedStudy(updatedStudy);
      } else {
        setSelectedStudy(null);
      }
    } catch (err) {
      console.error('Error saving study:', err);
      setSaveError(err.message || 'Failed to save study');
    } finally {
      setSavingStudy(false);
    }
  };

  // Mock studies data for fallback
  const mockStudies = [
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
  ];

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

  // Since filtering is now done on the backend, we use the studies directly
  const filteredStudies = studies;

  const StudyCard = ({ study }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex flex-col items-center space-y-2">
            {study.modality && (
              <div className="flex items-center space-x-1">
                {getModalityIcon(study.modality)}
                <span className="text-xs font-medium text-gray-600">{study.modality}</span>
              </div>
            )}
            {study.priority && (
              <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                {study.priority}
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="font-semibold text-gray-900">{study.patientName || 'Unknown Patient'}</h3>
              {(study.age || study.gender) && (
                <span className="text-sm text-gray-500">
                  ({study.age || '?'}{study.gender || ''})
                </span>
              )}
              {study.mrn && (
                <span className="text-sm text-gray-400">MRN: {study.mrn}</span>
              )}
            </div>
            {study.studyDescription && (
              <p className="text-gray-700 font-medium mb-1">{study.studyDescription}</p>
            )}
            <p className="text-gray-600 text-sm mb-2">{study.indication || 'No indication provided'}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {study.accessionNumber && <span>Acc: {study.accessionNumber}</span>}
              <span>Scheduled: {study.scheduledDate ? format(parseISO(study.scheduledDate), 'MMM d, HH:mm') : 'N/A'}</span>
              {study.location && <span>{study.location}</span>}
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

  const StudyModal = ({ study }) => {
    if (!editFormData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-screen overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Study</h2>
                <p className="text-gray-600">{study.patientName || 'Study Management'}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedStudy(null);
                  setEditFormData(null);
                  setSaveError(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {saveError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 m-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{saveError}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="block text-gray-600 mb-1">Patient Name</label>
                      <input
                        type="text"
                        value={editFormData.patientName || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">MRN</label>
                      <input
                        type="text"
                        value={editFormData.mrn || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-600 mb-1">Age</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={editFormData.age || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">Gender</label>
                        <input
                          type="text"
                          value={editFormData.gender === 'M' ? 'Male' : editFormData.gender === 'F' ? 'Female' : 'Other'}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={editFormData.dob || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Study Details</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="block text-gray-600 mb-1">Modality</label>
                      <input
                        type="text"
                        value={editFormData.modality || ''}
                        onChange={(e) => setEditFormData({...editFormData, modality: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Body Part</label>
                      <input
                        type="text"
                        value={editFormData.bodyPart || ''}
                        onChange={(e) => setEditFormData({...editFormData, bodyPart: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Study Description</label>
                      <input
                        type="text"
                        value={editFormData.studyDescription || ''}
                        onChange={(e) => setEditFormData({...editFormData, studyDescription: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-600 mb-1">Duration (min)</label>
                        <input
                          type="number"
                          min="0"
                          value={editFormData.duration || 0}
                          onChange={(e) => setEditFormData({...editFormData, duration: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFormData.contrast || false}
                            onChange={(e) => setEditFormData({...editFormData, contrast: e.target.checked})}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-gray-600">Contrast</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-gray-600 mb-1">Preparation Instructions</label>
                <textarea
                  value={editFormData.preparation || ''}
                  onChange={(e) => setEditFormData({...editFormData, preparation: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Notes</label>
                <textarea
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 mb-1">Order Date</label>
                  <input
                    type="datetime-local"
                    value={editFormData.orderDate || ''}
                    onChange={(e) => setEditFormData({...editFormData, orderDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={editFormData.scheduledDate || ''}
                    onChange={(e) => setEditFormData({...editFormData, scheduledDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedStudy(null);
                  setEditFormData(null);
                  setSaveError(null);
                }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                disabled={savingStudy}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStudy}
                disabled={savingStudy}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingStudy ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Info Boxes Component (for sidebar)
  const InfoBoxes = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">Today's Studies</p>
          <Calendar className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-2xl font-bold text-blue-600">
          {studyStats.scheduledToday || 0}
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">STAT Studies</p>
          <AlertCircle className="w-4 h-4 text-red-600" />
        </div>
        <p className="text-2xl font-bold text-red-600">
          {studyStats.statPriority || studyStats.priorityCounts?.STAT || 0}
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">In Progress</p>
          <Clock className="w-4 h-4 text-yellow-600" />
        </div>
        <p className="text-2xl font-bold text-yellow-600">
          {studyStats.statusCounts?.in_progress || 0}
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">Completed</p>
          <CheckCircle className="w-4 h-4 text-green-600" />
        </div>
        <p className="text-2xl font-bold text-green-600">
          {studyStats.statusCounts?.completed || 0}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <RadiologyHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0">
            {/* Info Boxes */}
            {!loading && !error && <InfoBoxes />}
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All', count: studyStats.total || 0 },
                  { key: 'scheduled', label: 'Scheduled', count: studyStats.statusCounts?.scheduled || 0 },
                  { key: 'in_progress', label: 'In Progress', count: studyStats.statusCounts?.in_progress || 0 },
                  { key: 'completed', label: 'Completed', count: studyStats.statusCounts?.completed || 0 }
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

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload DICOM</span>
                </button>
              </div>
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            <span className="ml-3 text-gray-600">Loading studies...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error loading studies</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

                {/* Studies List */}
            {!loading && !error && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'all' ? 'All Studies' : `${activeTab.replace('_', ' ')} Studies`}
              </h2>
              <span className="text-gray-500 text-sm">
                {filteredStudies.length} of {pagination.total} studies
              </span>
            </div>

            {filteredStudies.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No studies found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {filteredStudies.map(study => (
                    <StudyCard key={study.id} study={study} />
                  ))}
                </div>
                
                {/* Pagination */}
                {pagination.total > pagination.size && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {((pagination.page - 1) * pagination.size) + 1} to {Math.min(pagination.page * pagination.size, pagination.total)} of {pagination.total} studies
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Page {pagination.page} of {Math.ceil(pagination.total / pagination.size)}
                      </span>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= Math.ceil(pagination.total / pagination.size)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
              </div>
            )}

            {selectedStudy && <StudyModal study={selectedStudy} />}
      
            {/* Upload DICOM Modal */}
            {showUploadModal && (
              <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Upload DICOM Study</h2>
                  <p className="text-gray-600 text-sm mt-1">Upload DICOM files (ZIP or single file) from CD or folder</p>
                </div>
                <button 
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError(null);
                    setUploadForm({
                      patient_id: '',
                      modality: '',
                      body_part: '',
                      description: '',
                      source: 'external_cd',
                      study_date: format(new Date(), 'yyyy-MM-dd'),
                      file: null
                    });
                    setPatientSearchQuery('');
                    setPatientSearchResults([]);
                    setShowPatientDropdown(false);
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
                    </div>
                  </div>

                  <div className="p-6">
              {uploadError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-800">{uploadError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!uploadForm.file) {
                  setUploadError('Please select a file');
                  return;
                }
                if (!uploadForm.patient_id) {
                  setUploadError('Please enter patient ID');
                  return;
                }

                setUploading(true);
                setUploadError(null);

                try {
                  const formData = new FormData();
                  formData.append('patient_id', uploadForm.patient_id);
                  formData.append('file', uploadForm.file);
                  if (uploadForm.modality) formData.append('modality', uploadForm.modality);
                  if (uploadForm.body_part) formData.append('body_part', uploadForm.body_part);
                  if (uploadForm.description) formData.append('description', uploadForm.description);
                  formData.append('source', uploadForm.source);
                  if (uploadForm.study_date) formData.append('study_date', uploadForm.study_date);

                  const result = await uploadDicomStudy(formData);
                  
                  // Refresh studies list
                  const studiesData = await getStudies({
                    status: activeTab === 'all' ? undefined : activeTab,
                    modality: filters.modality === 'all' ? undefined : filters.modality,
                    priority: filters.priority === 'all' ? undefined : filters.priority,
                    search: searchTerm || undefined,
                    page: pagination.page,
                    size: pagination.size
                  });
                  
                  setStudies(studiesData.items || []);
                  setPagination(prev => ({
                    ...prev,
                    total: studiesData.total || 0
                  }));

                  setShowUploadModal(false);
                  setUploadForm({
                    patient_id: '',
                    modality: '',
                    body_part: '',
                    description: '',
                    source: 'external_cd',
                    study_date: format(new Date(), 'yyyy-MM-dd'),
                    file: null
                  });
                } catch (err) {
                  setUploadError(err.message || 'Failed to upload DICOM study');
                } finally {
                  setUploading(false);
                }
              }}>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        ref={patientSearchRef}
                        value={patientSearchQuery}
                        onChange={async (e) => {
                          const query = e.target.value;
                          setPatientSearchQuery(query);
                          
                          if (query.length >= 2) {
                            setSearchingPatients(true);
                            try {
                              const results = await searchPatients(query, 10);
                              setPatientSearchResults(results);
                              setShowPatientDropdown(true);
                            } catch (err) {
                              console.error('Error searching patients:', err);
                              setPatientSearchResults([]);
                            } finally {
                              setSearchingPatients(false);
                            }
                          } else {
                            setPatientSearchResults([]);
                            setShowPatientDropdown(false);
                          }
                        }}
                        onFocus={() => {
                          if (patientSearchResults.length > 0) {
                            setShowPatientDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow click on dropdown item
                          setTimeout(() => setShowPatientDropdown(false), 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Search by name, ID, phone, or email"
                      />
                      {searchingPatients && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                      )}
                      {showPatientDropdown && patientSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {patientSearchResults.map((patient) => (
                            <div
                              key={patient.id}
                              onClick={() => {
                                setUploadForm(prev => ({ ...prev, patient_id: patient.id }));
                                setPatientSearchQuery(patient.fullName || `Patient ${patient.id.substring(0, 8)}`);
                                setShowPatientDropdown(false);
                              }}
                              className="px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{patient.fullName}</div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {patient.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-1" />{patient.phone}</span>}
                                    {patient.email && <span className="flex items-center mt-1"><Mail className="w-3 h-3 mr-1" />{patient.email}</span>}
                                    <span className="text-xs text-gray-400 mt-1 block">ID: {patient.id.substring(0, 8)}...</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showPatientDropdown && patientSearchResults.length === 0 && patientSearchQuery.length >= 2 && !searchingPatients && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                          No patients found
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
                      <select
                        value={uploadForm.modality}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, modality: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select modality</option>
                        <option value="CT">CT</option>
                        <option value="MR">MRI</option>
                        <option value="CR">CR</option>
                        <option value="DX">DX</option>
                        <option value="US">US</option>
                        <option value="MG">MG</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body Part</label>
                      <input
                        type="text"
                        value={uploadForm.body_part}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, body_part: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., Chest, Head, Abdomen"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      rows="3"
                      placeholder="Study description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <select
                        value={uploadForm.source}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, source: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="external_cd">External CD</option>
                        <option value="external_clinic">External Clinic</option>
                        <option value="internal">Internal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Study Date</label>
                      <input
                        type="date"
                        value={uploadForm.study_date}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, study_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DICOM File <span className="text-red-500">*</span>
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
                    >
                      {uploadForm.file ? (
                        <div>
                          <FileText className="w-12 h-12 text-teal-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-900">{uploadForm.file.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadForm(prev => ({ ...prev, file: null }));
                            }}
                            className="mt-2 text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ZIP file or DICOM files (.dcm, .dicom)
                          </p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip,.dcm,.dicom"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadForm(prev => ({ ...prev, file }));
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadError(null);
                      setUploadForm({
                        patient_id: '',
                        modality: '',
                        body_part: '',
                        description: '',
                        source: 'external_cd',
                        study_date: format(new Date(), 'yyyy-MM-dd'),
                        file: null
                      });
                      setPatientSearchQuery('');
                      setPatientSearchResults([]);
                      setShowPatientDropdown(false);
                    }}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadForm.file || !uploadForm.patient_id}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload DICOM</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadiologyStudies;