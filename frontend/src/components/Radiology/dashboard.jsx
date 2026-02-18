import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Eye, FileText, Monitor, Camera, AlertCircle, CheckCircle, Flag, X, BarChart3, ArrowUp } from 'lucide-react';
import RadiologyHeader from './header';
import { getWorklistStudies, getDashboardSummary, getWorklistStats, getWorklistCollection, getRecentActivity } from '../../services/radiologyService';
import { getModalityIcon, getPriorityColor, getReadingStatusColor, getTimeAgo } from './shared/studyUtils';

const RadiologyDashboard = () => {
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
          setError(err.message || t('errorLoadingDashboardData'));
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
    <div className={`rounded-lg shadow-sm border p-4 mb-4 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-100'
    }`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>{t('totalStudies')}</p>
            <BarChart3 className={`w-3 h-3 ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
          <p className={`text-xl font-bold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
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
            <p className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>{t('pending')}</p>
            <AlertCircle className={`w-3 h-3 ${
              darkMode ? 'text-red-400' : 'text-red-600'
            }`} />
          </div>
          <p className={`text-xl font-bold ${
            darkMode ? 'text-red-400' : 'text-red-600'
          }`}>
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
            <p className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>{t('completed')}</p>
            <CheckCircle className={`w-3 h-3 ${
              darkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
          <p className={`text-xl font-bold ${
            darkMode ? 'text-green-400' : 'text-green-600'
          }`}>
            {dashboardSummary.final || worklistStats.final || worklistStudies.filter(s => s.readingStatus === 'final').length}
          </p>
          <div className="flex items-center mt-0.5">
            <CheckCircle className="w-2.5 h-2.5 text-green-500 mr-0.5" />
            <span className="text-green-500 text-xs">
              {dashboardSummary.completionRate && dashboardSummary.completionRate > 80 ? t('onTrack') : t('keepPace')}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>{t('critical')}</p>
            <Flag className={`w-3 h-3 ${
              darkMode ? 'text-orange-400' : 'text-orange-600'
            }`} />
          </div>
          <p className={`text-xl font-bold ${
            darkMode ? 'text-orange-400' : 'text-orange-600'
          }`}>
            {dashboardSummary.stat || worklistStats.statCount || worklistStudies.filter(s => s.priority === 'STAT').length}
          </p>
          <div className="flex items-center mt-0.5">
            <Flag className="w-2.5 h-2.5 text-red-500 mr-0.5" />
            <span className="text-red-500 text-xs">
              {dashboardSummary.critical > 0 ? t('attention') : t('allClear')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Quick Actions Component (for sidebar)
  const QuickActions = () => (
    <div className={`rounded-lg shadow-sm border p-4 mb-4 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-100'
    }`}>
      <h3 className={`text-sm font-semibold mb-3 ${
        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
      }`}>{t('quickActions')}</h3>
      <div className="space-y-2">
        <button 
          onClick={() => setSelectedFilter('unread')}
          className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-xs ${
            darkMode
              ? 'bg-blue-900 bg-opacity-30 hover:bg-blue-900 hover:bg-opacity-40'
              : 'bg-blue-50 hover:bg-blue-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Eye className={`w-4 h-4 ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
            <span className={`font-medium ${
              darkMode ? 'text-blue-300' : 'text-blue-900'
            }`}>{t('unreadStudies')}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${
            darkMode
              ? 'bg-blue-800 text-blue-200'
              : 'bg-blue-200 text-blue-800'
          }`}>
            {worklistStudies.filter(s => s.readingStatus === 'unread').length}
          </span>
        </button>
        
        <button 
          onClick={() => setSelectedFilter('reading')}
          className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-xs ${
            darkMode
              ? 'bg-yellow-900 bg-opacity-30 hover:bg-yellow-900 hover:bg-opacity-40'
              : 'bg-yellow-50 hover:bg-yellow-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${
              darkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
            <span className={`font-medium ${
              darkMode ? 'text-yellow-300' : 'text-yellow-900'
            }`}>{t('continueReading')}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${
            darkMode
              ? 'bg-yellow-800 text-yellow-200'
              : 'bg-yellow-200 text-yellow-800'
          }`}>
            {worklistStudies.filter(s => s.readingStatus === 'reading').length}
          </span>
        </button>
        
        <button className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-xs ${
          darkMode
            ? 'bg-green-900 bg-opacity-30 hover:bg-green-900 hover:bg-opacity-40'
            : 'bg-green-50 hover:bg-green-100'
        }`}>
          <div className="flex items-center space-x-2">
            <FileText className={`w-4 h-4 ${
              darkMode ? 'text-green-400' : 'text-green-600'
            }`} />
            <span className={`font-medium ${
              darkMode ? 'text-green-300' : 'text-green-900'
            }`}>{t('generateReports')}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${
            darkMode
              ? 'bg-green-800 text-green-200'
              : 'bg-green-200 text-green-800'
          }`}>
            {worklistStudies.filter(s => s.readingStatus === 'preliminary').length}
          </span>
        </button>
      </div>
    </div>
  );

  // Study Distribution Component (for sidebar)
  const StudyDistribution = () => (
    <div className={`rounded-lg shadow-sm border p-4 mb-4 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-100'
    }`}>
      <h3 className={`text-sm font-semibold mb-3 ${
        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
      }`}>{t('studyDistribution')}</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className={`w-4 h-4 ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
            <span className={`text-xs ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('ctScans')}</span>
          </div>
          <span className={`font-medium text-sm ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
            {dashboardSummary.ct || worklistStats.byModality?.CT || worklistStudies.filter(s => s.modality === 'CT').length}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className={`w-4 h-4 ${
              darkMode ? 'text-purple-400' : 'text-purple-600'
            }`} />
            <span className={`text-xs ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('mri')}</span>
          </div>
          <span className={`font-medium text-sm ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
            {dashboardSummary.mri || worklistStats.byModality?.MRI || worklistStudies.filter(s => s.modality === 'MRI').length}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className={`w-4 h-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <span className={`text-xs ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('xRay')}</span>
          </div>
          <span className={`font-medium text-sm ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
            {dashboardSummary.xr || worklistStats.byModality?.XR || worklistStudies.filter(s => s.modality === 'XR').length}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className={`w-4 h-4 ${
              darkMode ? 'text-green-400' : 'text-green-600'
            }`} />
            <span className={`text-xs ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('ultrasound')}</span>
          </div>
          <span className={`font-medium text-sm ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
            {dashboardSummary.us || worklistStats.byModality?.US || worklistStudies.filter(s => s.modality === 'US').length}
          </span>
        </div>
      </div>
    </div>
  );

  // Weekly Overview Component (for sidebar)
  const WeeklyOverview = () => (
    <div className={`rounded-lg shadow-sm border p-4 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-100'
    }`}>
      <h3 className={`text-sm font-semibold mb-3 ${
        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
      }`}>{t('weeklyOverview')}</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('totalStudies')}</span>
          <span className={`font-semibold text-sm ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
            {dashboardSummary.weeklyTotal ?? 0}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('averagePerDay')}</span>
          <span className={`font-semibold text-sm ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
            {dashboardSummary.dailyAverage ?? 0}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('criticalFindings')}</span>
          <span className={`font-semibold text-sm ${
            darkMode ? 'text-red-400' : 'text-red-600'
          }`}>
            {dashboardSummary.weeklyCritical ?? 0}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>{t('qualityScore')}</span>
          <span className={`font-semibold text-sm ${
            darkMode ? 'text-green-400' : 'text-green-600'
          }`}>
            {dashboardSummary.qualityScore ?? 0}%
          </span>
        </div>
      </div>
    </div>
  );

  // Priority Cases Component
  const PriorityCases = () => (
    <div className={`rounded-lg shadow-sm border p-6 mb-8 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${
          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
        }`}>{t('priorityCases')}</h3>
        <button className={`text-sm font-medium transition-colors ${
          darkMode
            ? 'text-[#79CAC2] hover:text-[#58B4AA]'
            : 'text-teal-600 hover:text-teal-800'
        }`}>
          {t('viewAll')}
        </button>
      </div>
      
      <div className="space-y-4">
        {worklistStudies
          .filter(study => study.priority === 'STAT' || study.criticalFlag)
          .slice(0, 3)
          .map(study => (
            <div key={study.id} className={`flex items-center justify-between p-4 border rounded-lg ${
              darkMode
                ? 'bg-red-900 bg-opacity-30 border-red-700'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {study.criticalFlag && <Flag className={`w-5 h-5 ${
                    darkMode ? 'text-red-400' : 'text-red-500'
                  }`} />}
                  {getModalityIcon(study.modality)}
                </div>
                <div>
                  <p className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{study.patientName}</p>
                  <p className={`text-sm ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                  }`}>{study.studyDescription}</p>
                  <p className={`text-xs ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{getTimeAgo(study.studyDate)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                  {study.priority}
                </span>
                <button
                  onClick={() => setSelectedStudy(study)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    darkMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {t('reviewNow')}
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
              }`}>{study.patientName}</h2>
              <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{study.studyDescription}</p>
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
                    }`}>{study.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('mrn')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.mrn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('dob')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{new Date(study.dob).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('ageGender')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.age}Y {study.gender}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`font-semibold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('studyDetails')}</h3>
                <div className={`rounded-lg p-4 space-y-2 text-sm ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('accession')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.accessionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('studyDate')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{new Date(study.studyDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('modality')}:</span>
                    <span className={`font-medium flex items-center space-x-1 ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>
                      {getModalityIcon(study.modality)}
                      <span>{study.modality}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('bodyPart')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.bodyPart}</span>
                  </div>
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
                  <div>
                    <span className={`block ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                    }`}>{t('indication')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.indication}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('orderingPhysician')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.orderingPhysician}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('location')}:</span>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{study.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('priority')}:</span>
                    <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
                      {study.priority}
                    </span>
                  </div>
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
              <p className={darkMode ? 'text-purple-200' : 'text-purple-800'}>{study.preliminaryFindings}</p>
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
                  <p className={darkMode ? 'text-green-200' : 'text-green-700'}>{study.finalReport.impression}</p>
                </div>
                <div>
                  <h4 className={`font-medium ${
                    darkMode ? 'text-green-200' : 'text-green-800'
                  }`}>{t('findings')}:</h4>
                  <p className={darkMode ? 'text-green-200' : 'text-green-700'}>{study.finalReport.findings}</p>
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-green-300' : 'text-green-600'
                }`}>
                  {t('reportedBy')} {study.finalReport.radiologist} {t('on')} {new Date(study.finalReport.reportDate).toLocaleDateString('en-US', { 
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

          <div className={`flex justify-between items-center pt-4 border-t ${
            darkMode ? 'border-[#133037]' : 'border-gray-200'
          }`}>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-lg text-sm border ${getReadingStatusColor(study.readingStatus)}`}>
                {study.readingStatus}
              </span>
              {study.priorStudies > 0 && (
                <button className={`text-sm transition-colors ${
                  darkMode
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-800'
                }`}>
                  {t('view')} {study.priorStudies} {t('priorStudies')}
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}>
                <Monitor className="w-4 h-4" />
                <span>{t('openInPACS')}</span>
              </button>
              <button className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                darkMode
                  ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
              }`}>
                <FileText className="w-4 h-4" />
                <span>{t('startReading')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main Component Return
  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <RadiologyHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('dashboard')}</h1>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
              darkMode ? 'border-[#79CAC2]' : 'border-teal-500'
            }`}></div>
            <span className={`ml-3 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('loadingDashboardData')}</span>
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
                }`}>{t('errorLoadingDashboardData')}</h3>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-300' : 'text-red-600'
                }`}>{error}</p>
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
              <div className={`rounded-lg shadow-sm border p-6 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{t('recentStudies')}</h3>
                  <button 
                    onClick={() => window.location.href = '/radiology/studies'}
                    className={`text-sm font-medium transition-colors ${
                      darkMode
                        ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                        : 'text-teal-600 hover:text-teal-800'
                    }`}
                  >
                    {t('viewAllStudies')}
                  </button>
                </div>
                
                <div className="space-y-4">
                  {worklistStudies.length > 0 ? (
                    worklistStudies.slice(0, 10).map(study => (
                      <div key={study.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-[#07181D] hover:bg-[#133037]'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getModalityIcon(study.modality)}
                            <span className={`text-sm font-medium ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                            }`}>{study.modality}</span>
                          </div>
                          <div>
                            <p className={`font-medium ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{study.patientName}</p>
                            <p className={`text-sm ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                            }`}>{study.studyDescription}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded text-xs border ${getReadingStatusColor(study.readingStatus)}`}>
                            {study.readingStatus}
                          </span>
                          <span className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{getTimeAgo(study.studyDate)}</span>
                          <button
                            onClick={() => setSelectedStudy(study)}
                            className={`text-sm font-medium transition-colors ${
                              darkMode
                                ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                                : 'text-teal-600 hover:text-teal-800'
                            }`}
                          >
                            {t('view')}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-8 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>
                      <Monitor className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-[#133037]' : 'text-gray-300'
                      }`} />
                      <p>{t('noStudiesFoundForTheSelectedFilters')}</p>
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