import React, { useState, useEffect } from 'react';
import { Clock, Eye, FileText, Monitor, Camera, AlertCircle, CheckCircle, Flag, X, BarChart3, ArrowUp } from 'lucide-react';
import RadiologyHeader from './header';
import { getWorklistStudies, getDashboardSummary, getWorklistStats, getWorklistCollection, getRecentActivity } from '../../services/radiologyService';
import { getModalityIcon, getPriorityColor, getReadingStatusColor, getTimeAgo } from './shared/studyUtils';

const RadiologyDashboard = () => {
  const [selectedFilter, setSelectedFilter] = useState('unread');
  const [selectedStudy, setSelectedStudy] = useState(null);

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


  // Dashboard Stats Component (for sidebar) - Merged into single card
  const DashboardStats = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-600 text-xs">Total Studies</p>
            <BarChart3 className="w-3 h-3 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {dashboardSummary.total || worklistStudies.length}
          </p>
          <div className="flex items-center mt-0.5">
            <ArrowUp className="w-2.5 h-2.5 text-green-500 mr-0.5" />
            <span className="text-green-500 text-xs">
              {dashboardSummary.completionRate ? `${dashboardSummary.completionRate}%` : '+12%'}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-600 text-xs">Pending</p>
            <AlertCircle className="w-3 h-3 text-red-600" />
          </div>
          <p className="text-xl font-bold text-red-600">
            {dashboardSummary.unread || worklistStats.unread || worklistStudies.filter(s => s.readingStatus === 'unread').length}
          </p>
          <div className="flex items-center mt-0.5">
            <Clock className="w-2.5 h-2.5 text-orange-500 mr-0.5" />
            <span className="text-orange-500 text-xs">
              {dashboardSummary.avgTatHours ? `${Math.round(dashboardSummary.avgTatHours * 60)}m` : '45m'}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-600 text-xs">Completed</p>
            <CheckCircle className="w-3 h-3 text-green-600" />
          </div>
          <p className="text-xl font-bold text-green-600">
            {dashboardSummary.final || worklistStats.final || worklistStudies.filter(s => s.readingStatus === 'final').length}
          </p>
          <div className="flex items-center mt-0.5">
            <CheckCircle className="w-2.5 h-2.5 text-green-500 mr-0.5" />
            <span className="text-green-500 text-xs">
              {dashboardSummary.completionRate && dashboardSummary.completionRate > 80 ? 'On track' : 'Keep pace'}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-600 text-xs">Critical</p>
            <Flag className="w-3 h-3 text-orange-600" />
          </div>
          <p className="text-xl font-bold text-orange-600">
            {dashboardSummary.stat || worklistStats.statCount || worklistStudies.filter(s => s.priority === 'STAT').length}
          </p>
          <div className="flex items-center mt-0.5">
            <Flag className="w-2.5 h-2.5 text-red-500 mr-0.5" />
            <span className="text-red-500 text-xs">
              {dashboardSummary.critical > 0 ? 'Attention' : 'All clear'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Quick Actions Component (for sidebar)
  const QuickActions = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        <button 
          onClick={() => setSelectedFilter('unread')}
          className="w-full flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-xs"
        >
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Unread Studies</span>
          </div>
          <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs">
            {worklistStudies.filter(s => s.readingStatus === 'unread').length}
          </span>
        </button>
        
        <button 
          onClick={() => setSelectedFilter('reading')}
          className="w-full flex items-center justify-between p-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-xs"
        >
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="font-medium text-yellow-900">Continue Reading</span>
          </div>
          <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs">
            {worklistStudies.filter(s => s.readingStatus === 'reading').length}
          </span>
        </button>
        
        <button className="w-full flex items-center justify-between p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-xs">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-900">Generate Reports</span>
          </div>
          <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs">
            {worklistStudies.filter(s => s.readingStatus === 'preliminary').length}
          </span>
        </button>
      </div>
    </div>
  );

  // Study Distribution Component (for sidebar)
  const StudyDistribution = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Study Distribution</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-700">CT Scans</span>
          </div>
          <span className="font-medium text-gray-900 text-sm">
            {dashboardSummary.ct || worklistStats.byModality?.CT || worklistStudies.filter(s => s.modality === 'CT').length}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-700">MRI</span>
          </div>
          <span className="font-medium text-gray-900 text-sm">
            {dashboardSummary.mri || worklistStats.byModality?.MRI || worklistStudies.filter(s => s.modality === 'MRI').length}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-700">X-Ray</span>
          </div>
          <span className="font-medium text-gray-900 text-sm">
            {dashboardSummary.xr || worklistStats.byModality?.XR || worklistStudies.filter(s => s.modality === 'XR').length}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-700">Ultrasound</span>
          </div>
          <span className="font-medium text-gray-900 text-sm">
            {dashboardSummary.us || worklistStats.byModality?.US || worklistStudies.filter(s => s.modality === 'US').length}
          </span>
        </div>
      </div>
    </div>
  );

  // Weekly Overview Component (for sidebar)
  const WeeklyOverview = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Weekly Overview</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Total Studies</span>
          <span className="font-semibold text-gray-900 text-sm">
            {dashboardSummary.weeklyTotal ?? 0}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Average per Day</span>
          <span className="font-semibold text-gray-900 text-sm">
            {dashboardSummary.dailyAverage ?? 0}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Critical Findings</span>
          <span className="font-semibold text-red-600 text-sm">
            {dashboardSummary.weeklyCritical ?? 0}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Quality Score</span>
          <span className="font-semibold text-green-600 text-sm">
            {dashboardSummary.qualityScore ?? 0}%
          </span>
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

  // Common utilities imported from shared


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
          <div className="flex gap-6">
            {/* Left Sidebar */}
            <div className="w-80 flex-shrink-0">
              {/* Info Boxes */}
              <div className="mb-6">
                <DashboardStats />
              </div>

              {/* Quick Actions */}
              <QuickActions />

              {/* Study Distribution */}
              <StudyDistribution />

              {/* Weekly Overview */}
              <WeeklyOverview />
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              {/* Priority Cases */}
              <PriorityCases />

              {/* Recent Studies */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Studies</h3>
                  <button 
                    onClick={() => window.location.href = '/radiology/studies'}
                    className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                  >
                    View All Studies
                  </button>
                </div>
                
                <div className="space-y-4">
                  {worklistStudies.length > 0 ? (
                    worklistStudies.slice(0, 10).map(study => (
                      <div key={study.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
            </div>
          </div>
        )}
      </div>

      {selectedStudy && <StudyDetailModal study={selectedStudy} />}
    </div>
  );
};

export default RadiologyDashboard;