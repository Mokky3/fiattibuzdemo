import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Clock, Eye, FileText, Monitor, AlertCircle, CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';
// Import the radiology header component
import RadiologyHeader from './header';
import StudyListItem from './shared/StudyListItem';
import StudyGridItem from './shared/StudyGridItem';
import { getModalityIcon, getPriorityColor, getReadingStatusColor } from './shared/studyUtils';
import { getWorklistStudies, getWorklistStats, getWorklistCollection, updateStudyStatus, assignStudy } from '../../services/radiologyService';

const RadiologyWorklist = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
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
  const [selectedFilter, setSelectedFilter] = useState('unread');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [showFilters, setShowFilters] = useState(false);
  const [expandedStudy, setExpandedStudy] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({});

  // Advanced filters
  const [filters, setFilters] = useState({
    modality: 'all',
    priority: 'all',
    bodyPart: 'all',
    physician: 'all',
    timeRange: 'today'
  });

  const [worklistStudies, setWorklistStudies] = useState([]);
  const [worklistStats, setWorklistStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 50,
    total: 0
  });

  useEffect(() => {
    let mounted = true;
    const fetchWorklistData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [studiesData, statsData] = await Promise.all([
          getWorklistCollection({
            readingStatus: selectedFilter === 'all' ? undefined : selectedFilter,
            modality: filters.modality === 'all' ? undefined : filters.modality,
            priority: filters.priority === 'all' ? undefined : filters.priority,
            timeRange: filters.timeRange === 'all' ? undefined : filters.timeRange,
            search: searchTerm || undefined,
            sortBy: sortBy,
            sortOrder: sortOrder,
            page: pagination.page,
            size: pagination.size
          }),
          getWorklistStats()
        ]);
        
        if (mounted) {
          setWorklistStudies(studiesData.items || []);
          setWorklistStats(statsData);
          setPagination(prev => ({
            ...prev,
            total: studiesData.total || 0
          }));
        }
      } catch (err) {
        console.error('Error fetching worklist data:', err);
        if (mounted) {
          setError(err.message);
          setWorklistStudies([]);
          setWorklistStats({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchWorklistData();
    return () => { mounted = false };
  }, [selectedFilter, filters, searchTerm, sortBy, sortOrder, pagination.page, pagination.size]);

  // Since filtering and sorting is now done on the backend, we use the studies directly
  const filteredStudies = worklistStudies;
  const sortedStudies = worklistStudies; // Backend handles sorting

  // Handle toggle expand for "More" button
  const handleToggleExpand = (studyId) => {
    setExpandedStudy(expandedStudy === studyId ? null : studyId);
  };

  // Handle "Read" button - update status to "reading" and open study detail modal
  const handleReadStudy = async (study) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [study.id]: true }));
      
      // Update study status to "reading" if it's currently "unread"
      if (study.readingStatus === 'unread') {
        await updateStudyStatus(study.id, 'reading');
        
        // Refresh the worklist to get updated status
        const studiesData = await getWorklistCollection({
          readingStatus: selectedFilter === 'all' ? undefined : selectedFilter,
          modality: filters.modality === 'all' ? undefined : filters.modality,
          priority: filters.priority === 'all' ? undefined : filters.priority,
          timeRange: filters.timeRange === 'all' ? undefined : filters.timeRange,
          search: searchTerm || undefined,
          sortBy: sortBy,
          sortOrder: sortOrder,
          page: pagination.page,
          size: pagination.size
        });
        
        setWorklistStudies(studiesData.items || []);
      }
      
      // Open study detail modal
      setSelectedStudy(study);
      } catch (err) {
        console.error('Error updating study status:', err);
        alert(t('failedToUpdateStudyStatus') + ': ' + (err.message || t('unknownError')));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [study.id]: false }));
    }
  };

  const WorklistHeader = () => (
    <div className={`rounded-lg shadow-sm border p-6 mb-6 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Filter Tabs */}
          <div className={`flex rounded-lg p-1 ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-100'
          }`}>
            {[
              { key: 'unread', label: t('unread'), count: worklistStats.unread || worklistStudies.filter(s => s.readingStatus === 'unread').length },
              { key: 'reading', label: t('reading'), count: worklistStats.reading || worklistStudies.filter(s => s.readingStatus === 'reading').length },
              { key: 'preliminary', label: t('preliminary'), count: worklistStats.preliminary || worklistStudies.filter(s => s.readingStatus === 'preliminary').length },
              { key: 'all', label: t('all'), count: worklistStats.total || worklistStudies.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedFilter(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === tab.key
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

          {/* View Mode */}
          <div className={`flex rounded-lg p-1 ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-100'
          }`}>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'list'
                  ? darkMode
                    ? 'bg-[#133037] shadow-sm text-[#79CAC2]'
                    : 'bg-white shadow-sm'
                  : darkMode
                    ? 'hover:bg-[#133037]'
                    : 'hover:bg-gray-200'
              }`}
            >
              {t('list')}
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'grid'
                  ? darkMode
                    ? 'bg-[#133037] shadow-sm text-[#79CAC2]'
                    : 'bg-white shadow-sm'
                  : darkMode
                    ? 'hover:bg-[#133037]'
                    : 'hover:bg-gray-200'
              }`}
            >
              {t('grid')}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
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
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
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
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                : 'border-gray-300 focus:ring-teal-500'
            }`}
          >
            <option value="priority-desc">{t('priorityHighToLow')}</option>
            <option value="time-asc">{t('timeOldestFirst')}</option>
            <option value="time-desc">{t('timeNewestFirst')}</option>
            <option value="patient-asc">{t('patientNameAZ')}</option>
            <option value="modality-asc">{t('modality')}</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className={`mt-4 p-4 rounded-lg border ${
          darkMode
            ? 'bg-[#07181D] border-[#133037]'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('modality')}</label>
              <select
                value={filters.modality}
                onChange={(e) => setFilters(prev => ({ ...prev, modality: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
              >
                <option value="all">{t('all')}</option>
                <option value="CT">CT</option>
                <option value="MRI">MRI</option>
                <option value="XR">{t('xRay')}</option>
                <option value="US">{t('ultrasound')}</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('priority')}</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
              >
                <option value="all">{t('all')}</option>
                <option value="STAT">STAT</option>
                <option value="Urgent">{t('urgent')}</option>
                <option value="Routine">{t('routine')}</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('bodyPart')}</label>
              <select
                value={filters.bodyPart}
                onChange={(e) => setFilters(prev => ({ ...prev, bodyPart: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
              >
                <option value="all">{t('all')}</option>
                <option value="Head">{t('head')}</option>
                <option value="Chest">{t('chest')}</option>
                <option value="Abdomen">{t('abdomen')}</option>
                <option value="Pelvis">{t('pelvis')}</option>
                <option value="Extremities">{t('extremities')}</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('timeRange')}</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
              >
                <option value="today">{t('today')}</option>
                <option value="yesterday">{t('yesterday')}</option>
                <option value="week">{t('thisWeek')}</option>
                <option value="month">{t('thisMonth')}</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Using shared StudyListItem and StudyGridItem components

  // Worklist Stats Component (for sidebar) - Separate boxes
  const WorklistStats = () => (
    <div className="space-y-4">
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
          {worklistStats.statCount || worklistStudies.filter(s => s.priority === 'STAT').length}
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
          {worklistStats.reading || worklistStudies.filter(s => s.readingStatus === 'reading').length}
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
          {worklistStats.final || worklistStudies.filter(s => s.readingStatus === 'final').length}
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
          }`}>{t('critical')}</p>
          <AlertCircle className={`w-4 h-4 ${
            darkMode ? 'text-orange-400' : 'text-orange-600'
          }`} />
        </div>
        <p className={`text-2xl font-bold ${
          darkMode ? 'text-orange-400' : 'text-orange-600'
        }`}>
          {worklistStats.criticalCount || worklistStudies.filter(s => s.criticalFlag).length}
        </p>
      </div>
    </div>
  );

  const StudyDetailModal = ({ study }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto ${
        darkMode ? 'bg-[#0D2026]' : 'bg-white'
      }`}>
        <div className={`p-6 border-b ${
          darkMode ? 'border-[#133037]' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{study.patientName || t('unknownPatient')}</h2>
              {study.studyDescription && (
                <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                  {study.studyDescription}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedStudy(null)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <h3 className={`font-semibold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('patientInformation')}</h3>
                <div className={`rounded-lg p-4 space-y-2 text-sm ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('name')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.patientName || t('nA')}</span>
                  </div>
                  {study.mrn && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('mrn')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{study.mrn}</span>
                    </div>
                  )}
                  {study.dob && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('dob')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{format(parseISO(study.dob), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {(study.age || study.gender) && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('ageGender')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{study.age || '?'}Y {study.gender || ''}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className={`font-semibold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('studyDetails')}</h3>
                <div className={`rounded-lg p-4 space-y-2 text-sm ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  {study.accessionNumber && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('accession')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{study.accessionNumber}</span>
                    </div>
                  )}
                  {study.studyDate && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('studyDate')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{format(parseISO(study.studyDate), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  )}
                  {study.modality && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('modality')}:</span>
                      <span className={`font-medium flex items-center space-x-1 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>
                        {getModalityIcon(study.modality)}
                        <span>{study.modality}</span>
                      </span>
                    </div>
                  )}
                  {study.bodyPart && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('bodyPart')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{study.bodyPart}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('images')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.imageCount} ({study.seriesCount} {t('series')})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className={`font-semibold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('clinicalInformation')}</h3>
                <div className={`rounded-lg p-4 space-y-2 text-sm ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  {study.indication && (
                    <div>
                      <span className={`block ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                      }`}>{t('indication')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{study.indication}</span>
                    </div>
                  )}
                  {study.orderingPhysician && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('orderingPhysician')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{study.orderingPhysician}</span>
                    </div>
                  )}
                  {study.location && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('location')}:</span>
                      <span className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{study.location}</span>
                    </div>
                  )}
                  {study.priority && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('priority')}:</span>
                      <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                        {study.priority}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className={`font-semibold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('technicalDetails')}</h3>
                <div className={`rounded-lg p-4 space-y-2 text-sm ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('protocol')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.protocolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('contrast')}:</span>
                    <span className={`font-medium ${
                      study.contrast
                        ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                        : darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                    }`}>
                      {study.contrast ? t('yes') : t('no')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('technologist')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.technologist}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('studySize')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.studySize}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {study.preliminaryFindings && (
            <div className={`mb-6 p-4 rounded-lg border ${
              darkMode
                ? 'bg-purple-900 bg-opacity-30 border-purple-700'
                : 'bg-purple-50 border-purple-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                darkMode ? 'text-purple-300' : 'text-purple-900'
              }`}>{t('preliminaryFindings')}</h3>
              <p className={darkMode ? 'text-purple-200' : 'text-purple-800'}>
                {study.preliminaryFindings}
              </p>
            </div>
          )}

          {study.finalReport && (
            <div className={`mb-6 p-4 rounded-lg border ${
              darkMode
                ? 'bg-green-900 bg-opacity-30 border-green-700'
                : 'bg-green-50 border-green-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                darkMode ? 'text-green-300' : 'text-green-900'
              }`}>{t('finalReport')}</h3>
              <div className="space-y-3">
                <div>
                  <h4 className={`font-medium ${
                    darkMode ? 'text-green-200' : 'text-green-800'
                  }`}>{t('impression')}:</h4>
                  <p className={darkMode ? 'text-green-200' : 'text-green-700'}>
                    {study.finalReport.impression}
                  </p>
                </div>
                <div>
                  <h4 className={`font-medium ${
                    darkMode ? 'text-green-200' : 'text-green-800'
                  }`}>{t('findings')}:</h4>
                  <p className={darkMode ? 'text-green-200' : 'text-green-700'}>
                    {study.finalReport.findings}
                  </p>
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-green-300' : 'text-green-600'
                }`}>
                  {t('reportedBy')} {study.finalReport.radiologist} {t('on')} {format(parseISO(study.finalReport.reportDate), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
            </div>
          )}

          <div className={`flex justify-between items-center pt-4 border-t ${
            darkMode ? 'border-[#133037]' : 'border-gray-200'
          }`}>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-lg text-sm border ${getReadingStatusColor(study.readingStatus)}`}>
                {study.readingStatus === 'unread' ? t('unread') :
                 study.readingStatus === 'reading' ? t('reading') :
                 study.readingStatus === 'preliminary' ? t('preliminary') :
                 study.readingStatus === 'final' ? t('final') :
                 study.readingStatus}
              </span>
              {study.priorStudies > 0 && (
                <button className={`text-sm transition-colors ${
                  darkMode
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-800'
                }`}>
                  {t('viewPriorStudies', { count: study.priorStudies })}
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => {
                  // Navigate to PACS page with studyInstanceUID and orthancStudyId
                  if (study.studyInstanceUID || study.orthancStudyId) {
                    navigate('/radiology/pacs', { 
                      state: { 
                        studyInstanceUID: study.studyInstanceUID,
                        orthancStudyId: study.orthancStudyId
                      } 
                    });
                  } else {
                    alert(t('studyInstanceUIDOrOrthancStudyIDNotAvailable'));
                  }
                }}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>{t('openInPACS')}</span>
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (study.readingStatus === 'unread') {
                      await updateStudyStatus(study.id, 'reading');
                      // Refresh the worklist
                      const studiesData = await getWorklistCollection({
                        readingStatus: selectedFilter === 'all' ? undefined : selectedFilter,
                        modality: filters.modality === 'all' ? undefined : filters.modality,
                        priority: filters.priority === 'all' ? undefined : filters.priority,
                        timeRange: filters.timeRange === 'all' ? undefined : filters.timeRange,
                        search: searchTerm || undefined,
                        sortBy: sortBy,
                        sortOrder: sortOrder,
                        page: pagination.page,
                        size: pagination.size
                      });
                      setWorklistStudies(studiesData.items || []);
                      // Update selected study
                      const updatedStudy = studiesData.items?.find(s => s.id === study.id);
                      if (updatedStudy) {
                        setSelectedStudy(updatedStudy);
                        // Navigate to PACS page with studyInstanceUID and orthancStudyId
                        if (updatedStudy.studyInstanceUID || updatedStudy.orthancStudyId) {
                          navigate('/radiology/pacs', { 
                            state: { 
                              studyInstanceUID: updatedStudy.studyInstanceUID,
                              orthancStudyId: updatedStudy.orthancStudyId
                            } 
                          });
                        } else {
                          alert(t('studyInstanceUIDOrOrthancStudyIDNotAvailable'));
                        }
                      }
                    } else {
                      // Navigate to PACS page with studyInstanceUID and orthancStudyId
                      if (study.studyInstanceUID || study.orthancStudyId) {
                        navigate('/radiology/pacs', { 
                          state: { 
                            studyInstanceUID: study.studyInstanceUID,
                            orthancStudyId: study.orthancStudyId
                          } 
                        });
                      } else {
                        alert(t('studyInstanceUIDOrOrthancStudyIDNotAvailable'));
                      }
                    }
                  } catch (err) {
                    console.error('Error starting reading:', err);
                    alert(t('failedToStartReading') + ': ' + (err.message || t('unknownError')));
                  }
                }}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  darkMode
                    ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t('startReading')}</span>
              </button>
            </div>
          </div>
        </div>
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
            {!loading && !error && <WorklistStats />}
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <WorklistHeader />
            
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                  darkMode ? 'border-[#79CAC2]' : 'border-teal-500'
                }`}></div>
                <span className={`ml-3 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('loadingWorklist')}</span>
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
                    }`}>{t('errorLoadingWorklist')}</h3>
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
              {selectedFilter === 'all' ? t('allStudies') : `${t(selectedFilter)} ${t('studies')}`}
            </h2>
            <span className={`text-sm ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>
              {sortedStudies.length} {t('of')} {pagination.total} {t('studies')}
            </span>
          </div>

            {sortedStudies.length === 0 ? (
              <div className="text-center py-12">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#133037] to-[#07181D]'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200'
                }`}>
                  <Eye className={`w-10 h-10 ${
                    darkMode ? 'text-[#133037]' : 'text-gray-400'
                  }`} />
                </div>
                <p className={`font-medium ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-500'
                }`}>{t('noStudiesFound')}</p>
                <p className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`}>{t('tryAdjustingYourFiltersOrSearchTerms')}</p>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {sortedStudies.map(study => (
                    viewMode === 'grid' ? (
                      <StudyGridItem 
                        key={study.id} 
                        study={study}
                        onSelect={handleReadStudy}
                        isUpdating={updatingStatus[study.id] || false}
                      />
                    ) : (
                      <StudyListItem 
                        key={study.id} 
                        study={study}
                        expandedId={expandedStudy}
                        onToggleExpand={handleToggleExpand}
                        onSelect={handleReadStudy}
                        isUpdating={updatingStatus[study.id] || false}
                      />
                    )
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
          </div>
        </div>

        {selectedStudy && <StudyDetailModal study={selectedStudy} />}
      </div>
    </div>
  );
};

export default RadiologyWorklist;