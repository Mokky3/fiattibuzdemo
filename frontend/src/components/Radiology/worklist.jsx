import React, { useState, useEffect } from 'react';
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
  const navigate = useNavigate();
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
      alert('Failed to update study status: ' + (err.message || 'Unknown error'));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [study.id]: false }));
    }
  };

  const WorklistHeader = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Filter Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'unread', label: 'Unread', count: worklistStats.unread || worklistStudies.filter(s => s.readingStatus === 'unread').length },
              { key: 'reading', label: 'Reading', count: worklistStats.reading || worklistStudies.filter(s => s.readingStatus === 'reading').length },
              { key: 'preliminary', label: 'Preliminary', count: worklistStats.preliminary || worklistStudies.filter(s => s.readingStatus === 'preliminary').length },
              { key: 'all', label: 'All', count: worklistStats.total || worklistStudies.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedFilter(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === tab.key
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-4 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name, MRN, accession number..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="priority-desc">Priority (High to Low)</option>
            <option value="time-asc">Time (Oldest First)</option>
            <option value="time-desc">Time (Newest First)</option>
            <option value="patient-asc">Patient Name (A-Z)</option>
            <option value="modality-asc">Modality</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
              <select
                value={filters.modality}
                onChange={(e) => setFilters(prev => ({ ...prev, modality: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All</option>
                <option value="CT">CT</option>
                <option value="MRI">MRI</option>
                <option value="XR">X-Ray</option>
                <option value="US">Ultrasound</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All</option>
                <option value="STAT">STAT</option>
                <option value="Urgent">Urgent</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Part</label>
              <select
                value={filters.bodyPart}
                onChange={(e) => setFilters(prev => ({ ...prev, bodyPart: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All</option>
                <option value="Head">Head</option>
                <option value="Chest">Chest</option>
                <option value="Abdomen">Abdomen</option>
                <option value="Pelvis">Pelvis</option>
                <option value="Extremities">Extremities</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">STAT Studies</p>
          <AlertCircle className="w-4 h-4 text-red-600" />
        </div>
        <p className="text-2xl font-bold text-red-600">
          {worklistStats.statCount || worklistStudies.filter(s => s.priority === 'STAT').length}
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">In Progress</p>
          <Clock className="w-4 h-4 text-yellow-600" />
        </div>
        <p className="text-2xl font-bold text-yellow-600">
          {worklistStats.reading || worklistStudies.filter(s => s.readingStatus === 'reading').length}
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">Completed</p>
          <CheckCircle className="w-4 h-4 text-green-600" />
        </div>
        <p className="text-2xl font-bold text-green-600">
          {worklistStats.final || worklistStudies.filter(s => s.readingStatus === 'final').length}
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600 text-xs">Critical</p>
          <AlertCircle className="w-4 h-4 text-orange-600" />
        </div>
        <p className="text-2xl font-bold text-orange-600">
          {worklistStats.criticalCount || worklistStudies.filter(s => s.criticalFlag).length}
        </p>
      </div>
    </div>
  );

  const StudyDetailModal = ({ study }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{study.patientName || 'Unknown Patient'}</h2>
              {study.studyDescription && (
                <p className="text-gray-600">{study.studyDescription}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedStudy(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{study.patientName || 'N/A'}</span>
                  </div>
                  {study.mrn && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">MRN:</span>
                      <span className="font-medium">{study.mrn}</span>
                    </div>
                  )}
                  {study.dob && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">DOB:</span>
                      <span className="font-medium">{format(parseISO(study.dob), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {(study.age || study.gender) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age/Gender:</span>
                      <span className="font-medium">{study.age || '?'}Y {study.gender || ''}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Study Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  {study.accessionNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accession:</span>
                      <span className="font-medium">{study.accessionNumber}</span>
                    </div>
                  )}
                  {study.studyDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Study Date:</span>
                      <span className="font-medium">{format(parseISO(study.studyDate), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  )}
                  {study.modality && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modality:</span>
                      <span className="font-medium flex items-center space-x-1">
                        {getModalityIcon(study.modality)}
                        <span>{study.modality}</span>
                      </span>
                    </div>
                  )}
                  {study.bodyPart && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Body Part:</span>
                      <span className="font-medium">{study.bodyPart}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Images:</span>
                    <span className="font-medium">{study.imageCount} ({study.seriesCount} series)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Clinical Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  {study.indication && (
                    <div>
                      <span className="text-gray-600 block">Indication:</span>
                      <span className="font-medium">{study.indication}</span>
                    </div>
                  )}
                  {study.orderingPhysician && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordering Physician:</span>
                      <span className="font-medium">{study.orderingPhysician}</span>
                    </div>
                  )}
                  {study.location && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{study.location}</span>
                    </div>
                  )}
                  {study.priority && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority:</span>
                      <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                        {study.priority}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Technical Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protocol:</span>
                    <span className="font-medium">{study.protocolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contrast:</span>
                    <span className={`font-medium ${study.contrast ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {study.contrast ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Technologist:</span>
                    <span className="font-medium">{study.technologist}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Study Size:</span>
                    <span className="font-medium">{study.studySize}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {study.preliminaryFindings && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Preliminary Findings</h3>
              <p className="text-purple-800">{study.preliminaryFindings}</p>
            </div>
          )}

          {study.finalReport && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">Final Report</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-green-800">Impression:</h4>
                  <p className="text-green-700">{study.finalReport.impression}</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800">Findings:</h4>
                  <p className="text-green-700">{study.finalReport.findings}</p>
                </div>
                <div className="text-sm text-green-600">
                  Reported by {study.finalReport.radiologist} on {format(parseISO(study.finalReport.reportDate), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-lg text-sm border ${getReadingStatusColor(study.readingStatus)}`}>
                {study.readingStatus}
              </span>
              {study.priorStudies > 0 && (
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  View {study.priorStudies} Prior Studies
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
                    alert('Study Instance UID or Orthanc Study ID not available for this study');
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Monitor className="w-4 h-4" />
                <span>Open in PACS</span>
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
                          alert('Study Instance UID or Orthanc Study ID not available for this study');
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
                        alert('Study Instance UID or Orthanc Study ID not available for this study');
                      }
                    }
                  } catch (err) {
                    console.error('Error starting reading:', err);
                    alert('Failed to start reading: ' + (err.message || 'Unknown error'));
                  }
                }}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Start Reading</span>
              </button>
            </div>
          </div>
        </div>
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
            {!loading && !error && <WorklistStats />}
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <WorklistHeader />
            
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                <span className="ml-3 text-gray-600">Loading worklist...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error loading worklist</h3>
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
              {selectedFilter === 'all' ? 'All Studies' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Studies`}
            </h2>
            <span className="text-gray-500 text-sm">
              {sortedStudies.length} of {pagination.total} studies
            </span>
          </div>

            {sortedStudies.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No studies found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
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
          </div>
        </div>

        {selectedStudy && <StudyDetailModal study={selectedStudy} />}
      </div>
    </div>
  );
};

export default RadiologyWorklist;