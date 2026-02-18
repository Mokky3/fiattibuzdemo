import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Calendar, Clock, Edit, Monitor, Camera, Eye, FileText, Phone, Mail, MapPin, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload, Loader } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import RadiologyHeader from './header';
import { getStudies, updateStudy, deleteStudy, uploadDicomStudy, searchPatients } from '../../services/radiologyService';

const RadiologyStudies = () => {
  const { t } = useTranslation();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);
  
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
        setError(err.message || t('failedToLoadStudies'));
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
      setSaveError(err.message || t('failedToSaveStudy'));
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
    if (darkMode) {
      switch (status) {
        case 'scheduled': return 'bg-blue-900 bg-opacity-30 text-blue-300 border-blue-700';
        case 'in_progress': return 'bg-yellow-900 bg-opacity-30 text-yellow-300 border-yellow-700';
        case 'completed': return 'bg-green-900 bg-opacity-30 text-green-300 border-green-700';
        default: return 'bg-gray-700 bg-opacity-30 text-gray-300 border-gray-600';
      }
    } else {
      switch (status) {
        case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'completed': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  };

  const getPriorityColor = (priority) => {
    if (darkMode) {
      switch (priority) {
        case 'STAT': return 'bg-red-900 bg-opacity-30 text-red-300 border-red-700';
        case 'Urgent': return 'bg-orange-900 bg-opacity-30 text-orange-300 border-orange-700';
        case 'Routine': return 'bg-green-900 bg-opacity-30 text-green-300 border-green-700';
        default: return 'bg-gray-700 bg-opacity-30 text-gray-300 border-gray-600';
      }
    } else {
      switch (priority) {
        case 'STAT': return 'bg-red-100 text-red-800 border-red-200';
        case 'Urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'Routine': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  };

  const getModalityIcon = (modality) => {
    switch (modality) {
      case 'CT': return <Monitor className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />;
      case 'MRI': return <Monitor className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />;
      case 'XR': return <Camera className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />;
      case 'US': return <Eye className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />;
      default: return <FileText className={`w-4 h-4 ${darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}`} />;
    }
  };

  // Since filtering is now done on the backend, we use the studies directly
  const filteredStudies = studies;

  const StudyCard = ({ study }) => (
    <div className={`rounded-lg shadow-sm border p-6 hover:shadow-md transition-all ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex flex-col items-center space-y-2">
            {study.modality && (
              <div className="flex items-center space-x-1">
                {getModalityIcon(study.modality)}
                <span className={`text-xs font-medium ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>{study.modality}</span>
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
              <h3 className={`font-semibold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{study.patientName || t('unknownPatient')}</h3>
              {(study.age || study.gender) && (
                <span className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>
                  ({study.age || '?'}{study.gender || ''})
                </span>
              )}
              {study.mrn && (
                <span className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`}>{t('mrn')}: {study.mrn}</span>
              )}
            </div>
            {study.studyDescription && (
              <p className={`font-medium mb-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{study.studyDescription}</p>
            )}
            <p className={`text-sm mb-2 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>{study.indication || t('noIndicationProvided')}</p>
            <div className={`flex items-center space-x-4 text-sm ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>
              {study.accessionNumber && <span>{t('acc')}: {study.accessionNumber}</span>}
              <span>{t('scheduled')}: {study.scheduledDate ? format(parseISO(study.scheduledDate), 'MMM d, HH:mm') : t('nA')}</span>
              {study.location && <span>{study.location}</span>}
              {study.contrast && <span className={darkMode ? 'text-yellow-400' : 'text-yellow-600'}>{t('contrast')}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-3">
          <span className={`px-3 py-1 rounded-lg text-sm border ${getStatusColor(study.status)}`}>
            {study.status === 'scheduled' ? t('scheduled') :
             study.status === 'in_progress' ? t('inProgress') :
             study.status === 'completed' ? t('completed') :
             study.status}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setExpandedStudy(expandedStudy === study.id ? null : study.id)}
              className={`px-3 py-1 text-sm border rounded transition-colors ${
                darkMode
                  ? 'text-[#C1D9DD] border-[#133037] hover:bg-[#133037]'
                  : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {expandedStudy === study.id ? t('less') : t('details')}
            </button>
            <button
              onClick={() => setSelectedStudy(study)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-1 transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
              }`}
            >
              <Edit className="w-4 h-4" />
              <span>{t('manage')}</span>
            </button>
          </div>
        </div>
      </div>

      {expandedStudy === study.id && (
        <div className={`mt-4 pt-4 border-t ${
          darkMode ? 'border-[#133037]' : 'border-gray-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className={`font-medium mb-2 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('patientDetails')}</h4>
              <div className={`space-y-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>
                <div className="flex items-center space-x-2">
                  <Phone className={`w-3 h-3 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`} />
                  <span>{study.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className={`w-3 h-3 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`} />
                  <span>{study.email}</span>
                </div>
                <div>{t('insurance')}: {study.insurance}</div>
                <div>{t('auth')}: {study.authorization}</div>
              </div>
            </div>
            <div>
              <h4 className={`font-medium mb-2 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('clinicalInfo')}</h4>
              <div className={`space-y-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>
                <div>{t('physician')}: {study.orderingPhysician}</div>
                <div>{t('room')}: {study.room}</div>
                <div>{t('duration')}: {study.duration} {t('min')}</div>
                <div>{t('cpt')}: {study.cptCode}</div>
              </div>
            </div>
            <div>
              <h4 className={`font-medium mb-2 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('notes')}</h4>
              <p className={`text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>{study.notes}</p>
              {study.preparation && (
                <div className={`mt-2 p-2 rounded text-xs ${
                  darkMode
                    ? 'bg-blue-900 bg-opacity-30'
                    : 'bg-blue-50'
                }`}>
                  <strong>{t('prep')}:</strong> {study.preparation}
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
        <div className={`rounded-lg shadow-xl max-w-5xl w-full max-h-screen overflow-y-auto ${
          darkMode ? 'bg-[#0D2026]' : 'bg-white'
        }`}>
          <div className={`p-6 border-b ${
            darkMode ? 'border-[#133037]' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('editStudy')}</h2>
                <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                  {study.patientName || t('studyManagement')}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedStudy(null);
                  setEditFormData(null);
                  setSaveError(null);
                }} 
                className={`transition-colors ${
                  darkMode
                    ? 'text-[#8AA2A7] hover:text-[#C1D9DD]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {saveError && (
            <div className={`p-4 border-l-4 m-6 ${
              darkMode
                ? 'bg-red-900 bg-opacity-30 border-red-700'
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="flex items-center">
                <AlertCircle className={`w-5 h-5 mr-2 ${
                  darkMode ? 'text-red-400' : 'text-red-500'
                }`} />
                <p className={darkMode ? 'text-red-300' : 'text-red-700'}>{saveError}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className={`rounded-lg p-4 ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{t('patientInformation')}</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className={`block mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('patientName')}</label>
                      <input
                        type="text"
                        value={editFormData.patientName || ''}
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                          darkMode
                            ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                            : 'bg-gray-100 border-gray-300 text-gray-600'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('mrn')}</label>
                      <input
                        type="text"
                        value={editFormData.mrn || ''}
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                          darkMode
                            ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                            : 'bg-gray-100 border-gray-300 text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block mb-1 ${
                          darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                        }`}>{t('age')}</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={editFormData.age || ''}
                          disabled
                          className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                            darkMode
                              ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                              : 'bg-gray-100 border-gray-300 text-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 ${
                          darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                        }`}>{t('gender')}</label>
                        <input
                          type="text"
                          value={editFormData.gender === 'M' ? t('male') : editFormData.gender === 'F' ? t('female') : t('other')}
                          disabled
                          className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                            darkMode
                              ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                              : 'bg-gray-100 border-gray-300 text-gray-600'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('dateOfBirth')}</label>
                      <input
                        type="date"
                        value={editFormData.dob || ''}
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                          darkMode
                            ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                            : 'bg-gray-100 border-gray-300 text-gray-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-lg p-4 ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{t('studyDetails')}</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className={`block mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('modality')}</label>
                      <input
                        type="text"
                        value={editFormData.modality || ''}
                        onChange={(e) => setEditFormData({...editFormData, modality: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('bodyPart')}</label>
                      <input
                        type="text"
                        value={editFormData.bodyPart || ''}
                        onChange={(e) => setEditFormData({...editFormData, bodyPart: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('studyDescription')}</label>
                      <input
                        type="text"
                        value={editFormData.studyDescription || ''}
                        onChange={(e) => setEditFormData({...editFormData, studyDescription: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block mb-1 ${
                          darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                        }`}>{t('durationMin')}</label>
                        <input
                          type="number"
                          min="0"
                          value={editFormData.duration || 0}
                          onChange={(e) => setEditFormData({...editFormData, duration: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                            darkMode
                              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                              : 'border-gray-300 focus:ring-teal-500'
                          }`}
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFormData.contrast || false}
                            onChange={(e) => setEditFormData({...editFormData, contrast: e.target.checked})}
                            className={`w-4 h-4 rounded focus:ring-2 transition-colors ${
                              darkMode
                                ? 'text-[#79CAC2] border-[#133037] focus:ring-[#79CAC2]'
                                : 'text-teal-600 border-gray-300 focus:ring-teal-500'
                            }`}
                          />
                          <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('contrast')}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className={`block mb-1 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('preparationInstructions')}</label>
                <textarea
                  value={editFormData.preparation || ''}
                  onChange={(e) => setEditFormData({...editFormData, preparation: e.target.value})}
                  rows="3"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('notes')}</label>
                <textarea
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  rows="3"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                  }`}>{t('orderDate')}</label>
                  <input
                    type="datetime-local"
                    value={editFormData.orderDate || ''}
                    onChange={(e) => setEditFormData({...editFormData, orderDate: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'border-gray-300 focus:ring-teal-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                  }`}>{t('scheduledDate')}</label>
                  <input
                    type="datetime-local"
                    value={editFormData.scheduledDate || ''}
                    onChange={(e) => setEditFormData({...editFormData, scheduledDate: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                        : 'border-gray-300 focus:ring-teal-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`flex justify-end space-x-3 mt-6 pt-6 border-t ${
              darkMode ? 'border-[#133037]' : 'border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setSelectedStudy(null);
                  setEditFormData(null);
                  setSaveError(null);
                }}
                className={`border px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                disabled={savingStudy}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveStudy}
                disabled={savingStudy}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  darkMode
                    ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
              >
                {savingStudy ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>{t('saving')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('saveChanges')}</span>
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
      <div className={`rounded-lg shadow-sm border p-4 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('todaysStudies')}</p>
          <Calendar className={`w-4 h-4 ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
        </div>
        <p className={`text-2xl font-bold ${
          darkMode ? 'text-blue-400' : 'text-blue-600'
        }`}>
          {studyStats.scheduledToday || 0}
        </p>
      </div>
      
      <div className={`rounded-lg shadow-sm border p-4 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('statStudies')}</p>
          <AlertCircle className={`w-4 h-4 ${
            darkMode ? 'text-red-400' : 'text-red-600'
          }`} />
        </div>
        <p className={`text-2xl font-bold ${
          darkMode ? 'text-red-400' : 'text-red-600'
        }`}>
          {studyStats.statPriority || studyStats.priorityCounts?.STAT || 0}
        </p>
      </div>
      
      <div className={`rounded-lg shadow-sm border p-4 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('inProgress')}</p>
          <Clock className={`w-4 h-4 ${
            darkMode ? 'text-yellow-400' : 'text-yellow-600'
          }`} />
        </div>
        <p className={`text-2xl font-bold ${
          darkMode ? 'text-yellow-400' : 'text-yellow-600'
        }`}>
          {studyStats.statusCounts?.in_progress || 0}
        </p>
      </div>
      
      <div className={`rounded-lg shadow-sm border p-4 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('completed')}</p>
          <CheckCircle className={`w-4 h-4 ${
            darkMode ? 'text-green-400' : 'text-green-600'
          }`} />
        </div>
        <p className={`text-2xl font-bold ${
          darkMode ? 'text-green-400' : 'text-green-600'
        }`}>
          {studyStats.statusCounts?.completed || 0}
        </p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
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
            <div className={`rounded-lg shadow-sm border p-6 mb-6 ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037]'
                : 'bg-white border-gray-100'
            }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className={`flex rounded-lg p-1 ${
                darkMode ? 'bg-[#07181D]' : 'bg-gray-100'
              }`}>
                {[
                  { key: 'all', label: t('all'), count: studyStats.total || 0 },
                  { key: 'scheduled', label: t('scheduled'), count: studyStats.statusCounts?.scheduled || 0 },
                  { key: 'in_progress', label: t('inProgress'), count: studyStats.statusCounts?.in_progress || 0 },
                  { key: 'completed', label: t('completed'), count: studyStats.statusCounts?.completed || 0 }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? darkMode
                          ? 'bg-[#133037] text-[#79CAC2] shadow-sm'
                          : 'bg-white text-teal-700 shadow-sm'
                        : darkMode
                          ? 'text-[#C1D9DD] hover:text-[#F5FEFF]'
                          : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    darkMode
                      ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                      : 'bg-teal-500 hover:bg-teal-600 text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{t('uploadDICOM')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder={t('searchByPatientNameMRNAccessionNumber')}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>{t('filters')}</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFilters && (
            <div className={`mt-4 p-4 rounded-lg border ${
              darkMode
                ? 'bg-[#07181D] border-[#133037]'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filters.modality}
                  onChange={(e) => setFilters(prev => ({ ...prev, modality: e.target.value }))}
                  className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500'
                  }`}
                >
                  <option value="all">{t('allModalities')}</option>
                  <option value="CT">CT</option>
                  <option value="MRI">MRI</option>
                  <option value="XR">{t('xRay')}</option>
                  <option value="US">{t('ultrasound')}</option>
                </select>
                
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500'
                  }`}
                >
                  <option value="all">{t('allStatus')}</option>
                  <option value="scheduled">{t('scheduled')}</option>
                  <option value="in_progress">{t('inProgress')}</option>
                  <option value="completed">{t('completed')}</option>
                </select>
                
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500'
                  }`}
                >
                  <option value="all">{t('allPriorities')}</option>
                  <option value="STAT">STAT</option>
                  <option value="Urgent">{t('urgent')}</option>
                  <option value="Routine">{t('routine')}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
              darkMode ? 'border-[#79CAC2]' : 'border-teal-500'
            }`}></div>
            <span className={`ml-3 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('loadingStudies')}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`border rounded-lg p-4 mb-6 ${
            darkMode
              ? 'bg-red-900 bg-opacity-30 border-red-700'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <AlertCircle className={`w-5 h-5 mr-2 ${
                darkMode ? 'text-red-400' : 'text-red-500'
              }`} />
              <div>
                <h3 className={`text-sm font-medium ${
                  darkMode ? 'text-red-300' : 'text-red-800'
                }`}>{t('errorLoadingStudies')}</h3>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-300' : 'text-red-600'
                }`}>{error}</p>
              </div>
            </div>
          </div>
        )}

                {/* Studies List */}
            {!loading && !error && (
              <div className={`rounded-lg shadow-sm border p-6 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-100'
              }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>
                {activeTab === 'all' ? t('allStudies') : `${t(activeTab.replace('_', ''))} ${t('studies')}`}
              </h2>
              <span className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                {filteredStudies.length} {t('of')} {pagination.total} {t('studies')}
              </span>
            </div>

            {filteredStudies.length === 0 ? (
              <div className="text-center py-12">
                <FileText className={`w-12 h-12 mx-auto mb-4 ${
                  darkMode ? 'text-[#133037]' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-500'
                }`}>{t('noStudiesFound')}</p>
                <p className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`}>{t('tryAdjustingYourFiltersOrSearchTerms')}</p>
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
                  <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    <div className={`text-sm ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>
                      {t('showing')} {((pagination.page - 1) * pagination.size) + 1} {t('to')} {Math.min(pagination.page * pagination.size, pagination.total)} {t('of')} {pagination.total} {t('studies')}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1}
                        className={`px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                          darkMode
                            ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t('previous')}
                      </button>
                      <span className={`px-3 py-2 text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>
                        {t('page')} {pagination.page} {t('of')} {Math.ceil(pagination.total / pagination.size)}
                      </span>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= Math.ceil(pagination.total / pagination.size)}
                        className={`px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                          darkMode
                            ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t('next')}
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
                <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto ${
                  darkMode ? 'bg-[#0D2026]' : 'bg-white'
                }`}>
                  <div className={`p-6 border-b ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-bold ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{t('uploadDICOMStudy')}</h2>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                  }`}>{t('uploadDICOMFilesZIPOrSingleFileFromCDOrFolder')}</p>
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
                  className={`transition-colors ${
                    darkMode
                      ? 'text-[#8AA2A7] hover:text-[#C1D9DD]'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <X className="w-6 h-6" />
                </button>
                    </div>
                  </div>

                  <div className="p-6">
              {uploadError && (
                <div className={`mb-4 border rounded-lg p-4 ${
                  darkMode
                    ? 'bg-red-900 bg-opacity-30 border-red-700'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center">
                    <AlertCircle className={`w-5 h-5 mr-2 ${
                      darkMode ? 'text-red-400' : 'text-red-500'
                    }`} />
                    <p className={`text-sm ${
                      darkMode ? 'text-red-300' : 'text-red-800'
                    }`}>{uploadError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!uploadForm.file) {
                  setUploadError(t('pleaseSelectAFile'));
                  return;
                }
                if (!uploadForm.patient_id) {
                  setUploadError(t('pleaseEnterPatientID'));
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
                  setUploadError(err.message || t('failedToUploadDICOMStudy'));
                } finally {
                  setUploading(false);
                }
              }}>
                <div className="space-y-4">
                  <div className="relative">
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('patient')} <span className="text-red-500">*</span>
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
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                        placeholder={t('searchByNameIDPhoneOrEmail')}
                      />
                      {searchingPatients && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader className={`w-4 h-4 animate-spin ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                          }`} />
                        </div>
                      )}
                      {showPatientDropdown && patientSearchResults.length > 0 && (
                        <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
                          darkMode
                            ? 'bg-[#0D2026] border-[#133037]'
                            : 'bg-white border-gray-300'
                        }`}>
                          {patientSearchResults.map((patient) => (
                            <div
                              key={patient.id}
                              onClick={() => {
                                setUploadForm(prev => ({ ...prev, patient_id: patient.id }));
                                setPatientSearchQuery(patient.fullName || `${t('patient')} ${patient.id.substring(0, 8)}`);
                                setShowPatientDropdown(false);
                              }}
                              className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                                darkMode
                                  ? 'hover:bg-[#133037] border-[#133037]'
                                  : 'hover:bg-teal-50 border-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className={`font-medium ${
                                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                  }`}>{patient.fullName}</div>
                                  <div className={`text-sm mt-1 ${
                                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                  }`}>
                                    {patient.phone && <span className="flex items-center"><Phone className={`w-3 h-3 mr-1 ${
                                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                    }`} />{patient.phone}</span>}
                                    {patient.email && <span className="flex items-center mt-1"><Mail className={`w-3 h-3 mr-1 ${
                                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                    }`} />{patient.email}</span>}
                                    <span className={`text-xs mt-1 block ${
                                      darkMode ? 'text-[#133037]' : 'text-gray-400'
                                    }`}>{t('id')}: {patient.id.substring(0, 8)}...</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showPatientDropdown && patientSearchResults.length === 0 && patientSearchQuery.length >= 2 && !searchingPatients && (
                        <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg p-4 text-center ${
                          darkMode
                            ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                            : 'bg-white border-gray-300 text-gray-500'
                        }`}>
                          {t('noPatientsFound')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{t('modality')}</label>
                      <select
                        value={uploadForm.modality}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, modality: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                      >
                        <option value="">{t('selectModality')}</option>
                        <option value="CT">CT</option>
                        <option value="MR">MRI</option>
                        <option value="CR">CR</option>
                        <option value="DX">DX</option>
                        <option value="US">US</option>
                        <option value="MG">MG</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{t('bodyPart')}</label>
                      <input
                        type="text"
                        value={uploadForm.body_part}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, body_part: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                        placeholder={t('egChestHeadAbdomen')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('description')}</label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                          : 'border-gray-300 focus:ring-teal-500'
                      }`}
                      rows="3"
                      placeholder={t('studyDescription')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{t('source')}</label>
                      <select
                        value={uploadForm.source}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, source: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                      >
                        <option value="external_cd">{t('externalCD')}</option>
                        <option value="external_clinic">{t('externalClinic')}</option>
                        <option value="internal">{t('internal')}</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{t('studyDate')}</label>
                      <input
                        type="date"
                        value={uploadForm.study_date}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, study_date: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                            : 'border-gray-300 focus:ring-teal-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>
                      {t('dicomFile')} <span className="text-red-500">*</span>
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        darkMode
                          ? 'border-[#133037] hover:border-[#79CAC2]'
                          : 'border-gray-300 hover:border-teal-500'
                      }`}
                    >
                      {uploadForm.file ? (
                        <div>
                          <FileText className={`w-12 h-12 mx-auto mb-2 ${
                            darkMode ? 'text-[#79CAC2]' : 'text-teal-500'
                          }`} />
                          <p className={`text-sm font-medium ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{uploadForm.file.name}</p>
                          <p className={`text-xs mt-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>
                            {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadForm(prev => ({ ...prev, file: null }));
                            }}
                            className={`mt-2 text-sm transition-colors ${
                              darkMode
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-red-600 hover:text-red-800'
                            }`}
                          >
                            {t('remove')}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className={`w-12 h-12 mx-auto mb-2 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                          }`} />
                          <p className={`text-sm ${
                            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                          }`}>
                            {t('clickToUploadOrDragAndDrop')}
                          </p>
                          <p className={`text-xs mt-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>
                            {t('zipFileOrDICOMFiles')}
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

                <div className={`flex justify-end space-x-3 mt-6 pt-6 border-t ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
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
                    className={`border px-4 py-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    disabled={uploading}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadForm.file || !uploadForm.patient_id}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      darkMode
                        ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>{t('uploading')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>{t('uploadDICOM')}</span>
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