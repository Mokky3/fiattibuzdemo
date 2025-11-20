import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, Eye, FileText, Monitor, Camera, AlertCircle, CheckCircle, User, ChevronDown, ChevronUp, Flag, X, Activity, BarChart3, ArrowUp } from 'lucide-react';
import RadiologyHeader from './header';
import StudyListItem from './shared/StudyListItem';
import StudyGridItem from './shared/StudyGridItem';
import { getWorklistStudies, getDashboardSummary, getWorklistStats, getWorklistCollection, getRecentActivity } from '../../services/radiologyService';
import { getModalityIcon, getPriorityColor, getReadingStatusColor, getTimeAgo } from './shared/studyUtils';

const RadiologyDashboard = () => {
  const [selectedFilter, setSelectedFilter] = useState('unread');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [showFilters, setShowFilters] = useState(false);
  const [expandedStudy, setExpandedStudy] = useState(null);

  // Advanced filters
  const [filters, setFilters] = useState({
    modality: 'all',
    priority: 'all',
    bodyPart: 'all',
    physician: 'all',
    timeRange: 'today'
  });

  const [worklistStudies, setWorklistStudies] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({});
  const [worklistStats, setWorklistStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard summary and worklist data in parallel
        const [summaryData, statsData, studiesData, activityData] = await Promise.all([
          getDashboardSummary(),
          getWorklistStats(),
          getWorklistCollection({ 
            readingStatus: selectedFilter, 
            modality: filters.modality, 
            priority: filters.priority,
            timeRange: filters.timeRange,
            size: 50
          }),
          getRecentActivity()
        ]);
        
        if (mounted) {
          setDashboardSummary(summaryData);
          setWorklistStats(statsData);
          setWorklistStudies(studiesData.items || []);
          setRecentActivity(activityData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (mounted) {
          setError(err.message);
          // Fallback to empty data
          setDashboardSummary({});
          setWorklistStats({});
          setWorklistStudies([]);
          setRecentActivity([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { mounted = false };
  }, [selectedFilter, filters.modality, filters.priority, filters.timeRange]);


  // Dashboard Stats Component
  const DashboardStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Total Studies Today</p>
            <p className="text-3xl font-bold text-gray-900">
              {dashboardSummary.total || worklistStudies.length}
            </p>
            <div className="flex items-center mt-2">
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 text-sm">
                {dashboardSummary.completionRate ? `${dashboardSummary.completionRate}% completion rate` : '+12% from yesterday'}
              </span>
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Pending Studies</p>
            <p className="text-3xl font-bold text-red-600">
              {dashboardSummary.unread || worklistStats.unread || worklistStudies.filter(s => s.readingStatus === 'unread').length}
            </p>
            <div className="flex items-center mt-2">
              <Clock className="w-4 h-4 text-orange-500 mr-1" />
              <span className="text-orange-500 text-sm">
                Avg wait: {dashboardSummary.avgTatHours ? `${Math.round(dashboardSummary.avgTatHours * 60)} min` : '45 min'}
              </span>
            </div>
          </div>
          <div className="bg-red-100 p-3 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Completed Today</p>
            <p className="text-3xl font-bold text-green-600">
              {dashboardSummary.final || worklistStats.final || worklistStudies.filter(s => s.readingStatus === 'final').length}
            </p>
            <div className="flex items-center mt-2">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 text-sm">
                {dashboardSummary.completionRate && dashboardSummary.completionRate > 80 ? 'On track for goals' : 'Keep up the pace'}
              </span>
            </div>
          </div>
          <div className="bg-green-100 p-3 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Critical Studies</p>
            <p className="text-3xl font-bold text-orange-600">
              {dashboardSummary.stat || worklistStats.statCount || worklistStudies.filter(s => s.priority === 'STAT').length}
            </p>
            <div className="flex items-center mt-2">
              <Flag className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-500 text-sm">
                {dashboardSummary.critical > 0 ? 'Requires attention' : 'All clear'}
              </span>
            </div>
          </div>
          <div className="bg-orange-100 p-3 rounded-lg">
            <Flag className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );

  // Quick Actions Component
  const QuickActions = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button 
            onClick={() => setSelectedFilter('unread')}
            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">View Unread Studies</span>
            </div>
            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-sm">
              {worklistStudies.filter(s => s.readingStatus === 'unread').length}
            </span>
          </button>
          
          <button 
            onClick={() => setSelectedFilter('reading')}
            className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-900">Continue Reading</span>
            </div>
            <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-sm">
              {worklistStudies.filter(s => s.readingStatus === 'reading').length}
            </span>
          </button>
          
          <button className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Generate Reports</span>
            </div>
            <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-sm">
              {worklistStudies.filter(s => s.readingStatus === 'preliminary').length}
            </span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => {
              const getIcon = () => {
                switch (activity.icon) {
                  case 'check': return <CheckCircle className="w-4 h-4 text-green-600" />;
                  case 'eye': return <Eye className="w-4 h-4 text-blue-600" />;
                  case 'alert': return <AlertCircle className="w-4 h-4 text-red-600" />;
                  default: return <Activity className="w-4 h-4 text-gray-600" />;
                }
              };
              
              const getBgColor = () => {
                switch (activity.color) {
                  case 'green': return 'bg-green-100';
                  case 'blue': return 'bg-blue-100';
                  case 'red': return 'bg-red-100';
                  default: return 'bg-gray-100';
                }
              };
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`${getBgColor()} p-1 rounded-full`}>
                    {getIcon()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.patient}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Distribution</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-700">CT Scans</span>
            </div>
            <span className="font-medium text-gray-900">
              {dashboardSummary.ct || worklistStats.byModality?.CT || worklistStudies.filter(s => s.modality === 'CT').length}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-700">MRI</span>
            </div>
            <span className="font-medium text-gray-900">
              {dashboardSummary.mri || worklistStats.byModality?.MRI || worklistStudies.filter(s => s.modality === 'MRI').length}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">X-Ray</span>
            </div>
            <span className="font-medium text-gray-900">
              {dashboardSummary.xr || worklistStats.byModality?.XR || worklistStudies.filter(s => s.modality === 'XR').length}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-700">Ultrasound</span>
            </div>
            <span className="font-medium text-gray-900">
              {dashboardSummary.us || worklistStats.byModality?.US || worklistStudies.filter(s => s.modality === 'US').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Priority Cases Component
  const PriorityCases = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Priority Cases</h3>
        <button className="text-teal-600 hover:text-teal-800 text-sm font-medium">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {worklistStudies
          .filter(study => study.priority === 'STAT' || study.criticalFlag)
          .slice(0, 3)
          .map(study => (
            <div key={study.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {study.criticalFlag && <Flag className="w-5 h-5 text-red-500" />}
                  {getModalityIcon(study.modality)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{study.patientName}</p>
                  <p className="text-sm text-gray-600">{study.studyDescription}</p>
                  <p className="text-xs text-gray-500">{getTimeAgo(study.studyDate)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                  {study.priority}
                </span>
                <button
                  onClick={() => setSelectedStudy(study)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Review Now
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  // Performance Metrics Component
  const PerformanceMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Studies Read</span>
            <span className="font-semibold text-gray-900">
              {dashboardSummary.studiesRead || worklistStudies.filter(s => s.readingStatus === 'final').length}/
              {dashboardSummary.studiesTotal || worklistStudies.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-teal-500 h-2 rounded-full" 
              style={{ 
                width: `${dashboardSummary.completionRate || (worklistStudies.filter(s => s.readingStatus === 'final').length / worklistStudies.length) * 100}%` 
              }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Average TAT</span>
            <span className="font-semibold text-gray-900">
              {dashboardSummary.avgTatHours || 1.2} hours
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Reports Pending</span>
            <span className="font-semibold text-orange-600">
              {dashboardSummary.pendingReports || worklistStudies.filter(s => s.readingStatus === 'preliminary').length}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Studies</span>
            <span className="font-semibold text-gray-900">
              {dashboardSummary.weeklyTotal || 247}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Average per Day</span>
            <span className="font-semibold text-gray-900">
              {dashboardSummary.dailyAverage || 35.3}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Critical Findings</span>
            <span className="font-semibold text-red-600">
              {dashboardSummary.weeklyCritical || dashboardSummary.criticalFindings || 12}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Quality Score</span>
            <span className="font-semibold text-green-600">
              {dashboardSummary.qualityScore || 98.5}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
  // Common utilities imported from shared

  // Filtering and sorting logic
  const filteredStudies = worklistStudies.filter(study => {
    const matchesFilter = selectedFilter === 'all' || study.readingStatus === selectedFilter;
    const matchesSearch = study.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         study.accessionNumber.includes(searchTerm) ||
                         study.mrn.includes(searchTerm) ||
                         study.studyDescription.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModalityFilter = filters.modality === 'all' || study.modality === filters.modality;
    const matchesPriorityFilter = filters.priority === 'all' || study.priority === filters.priority;
    
    return matchesFilter && matchesSearch && matchesModalityFilter && matchesPriorityFilter;
  });

  const sortedStudies = [...filteredStudies].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { 'STAT': 3, 'Urgent': 2, 'Routine': 1 };
        comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
        break;
      case 'time':
        comparison = new Date(a.studyDate) - new Date(b.studyDate);
        break;
      case 'patient':
        comparison = a.patientName.localeCompare(b.patientName);
        break;
      case 'modality':
        comparison = a.modality.localeCompare(b.modality);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });


  // Stats Component
  const WorklistStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Unread Studies</p>
            <p className="text-3xl font-bold text-blue-600">
              {worklistStudies.filter(s => s.readingStatus === 'unread').length}
            </p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg">
            <Eye className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">STAT Studies</p>
            <p className="text-3xl font-bold text-red-600">
              {worklistStudies.filter(s => s.priority === 'STAT').length}
            </p>
          </div>
          <div className="bg-red-100 p-3 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">In Progress</p>
            <p className="text-3xl font-bold text-yellow-600">
              {worklistStudies.filter(s => s.readingStatus === 'reading').length}
            </p>
          </div>
          <div className="bg-yellow-100 p-3 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Completed Today</p>
            <p className="text-3xl font-bold text-green-600">
              {worklistStudies.filter(s => s.readingStatus === 'final').length}
            </p>
          </div>
          <div className="bg-green-100 p-3 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );

  // Main Header Component
  const WorklistHeader = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Radiology Worklist</h1>
          <p className="text-gray-600">Studies awaiting interpretation</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Filter Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'unread', label: 'Unread', count: worklistStudies.filter(s => s.readingStatus === 'unread').length },
              { key: 'reading', label: 'Reading', count: worklistStudies.filter(s => s.readingStatus === 'reading').length },
              { key: 'preliminary', label: 'Preliminary', count: worklistStudies.filter(s => s.readingStatus === 'preliminary').length },
              { key: 'all', label: 'All', count: worklistStudies.length }
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

  // Use shared StudyListItem and StudyGridItem

  // Study Detail Modal Component
  const StudyDetailModal = ({ study }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{study.patientName}</h2>
              <p className="text-gray-600">{study.studyDescription}</p>
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
                    <span className="font-medium">{study.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MRN:</span>
                    <span className="font-medium">{study.mrn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">DOB:</span>
                    <span className="font-medium">{new Date(study.dob).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age/Gender:</span>
                    <span className="font-medium">{study.age}Y {study.gender}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Study Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accession:</span>
                    <span className="font-medium">{study.accessionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Study Date:</span>
                    <span className="font-medium">{new Date(study.studyDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
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
                  <div>
                    <span className="text-gray-600 block">Indication:</span>
                    <span className="font-medium">{study.indication}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ordering Physician:</span>
                    <span className="font-medium">{study.orderingPhysician}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{study.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                      {study.priority}
                    </span>
                  </div>
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
                  Reported by {study.finalReport.radiologist} on {new Date(study.finalReport.reportDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2">
                <Monitor className="w-4 h-4" />
                <span>Open in PACS</span>
              </button>
              <button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Start Reading</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main Component Return
  return (
    <div className="min-h-screen bg-gray-50">
      <RadiologyHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, Dr. Johnson. Here's your radiology overview for today.</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error loading dashboard data</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && (
          <>
            {/* Dashboard Stats */}
            <DashboardStats />

            {/* Priority Cases */}
            <PriorityCases />

            {/* Quick Actions and Info */}
            <QuickActions />

            {/* Performance Metrics */}
            <PerformanceMetrics />

            {/* Recent Studies Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Studies</h3>
                <button 
                  onClick={() => setViewMode('list')}
                  className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                >
                  View All Studies
                </button>
              </div>
              
              <div className="space-y-4">
                {worklistStudies.length > 0 ? (
                  worklistStudies.slice(0, 5).map(study => (
                    <div key={study.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getModalityIcon(study.modality)}
                          <span className="text-sm font-medium text-gray-600">{study.modality}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{study.patientName}</p>
                          <p className="text-sm text-gray-600">{study.studyDescription}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs border ${getReadingStatusColor(study.readingStatus)}`}>
                          {study.readingStatus}
                        </span>
                        <span className="text-sm text-gray-500">{getTimeAgo(study.studyDate)}</span>
                        <button
                          onClick={() => setSelectedStudy(study)}
                          className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No studies found for the selected filters.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedStudy && <StudyDetailModal study={selectedStudy} />}
    </div>
  );
};

export default RadiologyDashboard;