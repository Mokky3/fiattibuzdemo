import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, FileText, Download, Eye, Calendar, Clock, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, BarChart3, Users, Activity } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getResults } from '../../services/labService';

const LabResultsModule = () => {
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
  
  const [selectedResult, setSelectedResult] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);

  const [labResults, setLabResults] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getResults();
        if (active) setLabResults(data);
      } catch (e) {
        console.error('Error loading lab results:', e);
        if (active) setLabResults([]);
      }
    })();
    return () => { active = false };
  }, []);

  // Filter and sort results
  const filteredResults = labResults.filter(result => {
    const matchesSearch = result.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.patientId.includes(searchTerm) ||
                         result.id.includes(searchTerm) ||
                         result.testType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    const matchesTestType = testTypeFilter === 'all' || result.testCategory.toLowerCase() === testTypeFilter.toLowerCase();
    
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'today' && result.completedDate === new Date().toISOString().split('T')[0]) ||
                       (dateFilter === 'week' && new Date(result.completedDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'abnormal' && result.flags.length > 0) ||
                      (activeTab === 'critical' && result.priority === 'urgent') ||
                      (activeTab === 'pending' && result.status === 'pending');
    
    return matchesSearch && matchesStatus && matchesTestType && matchesDate && matchesTab;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.completedDate || b.orderDate) - new Date(a.completedDate || a.orderDate);
      case 'patient':
        return a.patientName.localeCompare(b.patientName);
      case 'test':
        return a.testType.localeCompare(b.testType);
      default:
        return 0;
    }
  });

  const getStatusColor = (status) => {
    if (darkMode) {
      switch (status) {
        case 'normal': return 'text-green-300 bg-green-900 bg-opacity-30 border-green-700';
        case 'high': 
        case 'low': return 'text-yellow-300 bg-yellow-900 bg-opacity-30 border-yellow-700';
        case 'critical': return 'text-red-300 bg-red-900 bg-opacity-30 border-red-700';
        default: return 'text-gray-300 bg-gray-700 bg-opacity-30 border-gray-600';
      }
    } else {
      switch (status) {
        case 'normal': return 'text-green-600 bg-green-50 border-green-200';
        case 'high': 
        case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'critical': return 'text-red-600 bg-red-50 border-red-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />;
      case 'pending': return <Clock className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />;
      case 'critical': return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
      default: return <FileText className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className={`w-3 h-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />;
      case 'down': return <TrendingDown className={`w-3 h-3 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
      case 'stable': return <Minus className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />;
      default: return null;
    }
  };

  const ResultCard = ({ result }) => (
    <div 
      className={`rounded-lg border p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}
      onClick={() => setSelectedResult(result)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            darkMode
              ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
              : 'bg-teal-100 text-teal-800'
          }`}>
            {result.time || t('pending')}
          </div>
          <div>
            <h3 className={`font-semibold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{result.patientName}</h3>
            <p className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{result.testType}</p>
            <p className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{t('id')}: {result.patientId} • {t('order')}: {result.orderId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {getStatusIcon(result.status)}
            <span className={`text-sm capitalize ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{result.status === 'completed' ? t('completed') : result.status === 'pending' ? t('pending') : result.status}</span>
          </div>
          {result.priority === 'urgent' && (
            <span className={`px-2 py-1 rounded-full text-xs border ${
              darkMode
                ? 'bg-red-900 bg-opacity-30 text-red-300 border-red-700'
                : 'bg-red-100 text-red-700 border-red-200'
            }`}>
              {t('urgent')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('category')}: {result.testCategory}</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
          }`}>•</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('provider')}: {result.physician}</span>
        </div>
        <div className="flex items-center space-x-2">
          {result.flags.length > 0 && (
            <div className="flex space-x-1">
              {result.flags.map((flag, index) => (
                <span key={index} className={`px-2 py-1 rounded-full text-xs ${
                  darkMode
                    ? 'bg-yellow-900 bg-opacity-30 text-yellow-300'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {flag}
                </span>
              ))}
            </div>
          )}
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{result.completedDate || result.orderDate}</span>
        </div>
      </div>
    </div>
  );

  const ResultDetails = ({ result }) => (
    <div className={`rounded-lg border p-6 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{result.testType}</h2>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
            {result.patientName} • {t('id')}: {result.patientId}
          </p>
          <p className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('order')}: {result.orderId} • {t('category')}: {result.testCategory}</p>
        </div>
        <div className="flex space-x-2">
          <button className={`px-4 py-2 border rounded-lg transition-colors ${
            darkMode
              ? 'border-[#79CAC2] text-[#79CAC2] hover:bg-[#133037]'
              : 'border-teal-500 text-teal-700 hover:bg-teal-50'
          }`}>
            <Download className="w-4 h-4 inline mr-2" />
            {t('exportPDF')}
          </button>
          <button 
            onClick={() => setSelectedResult(null)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            {t('close')}
          </button>
        </div>
      </div>

      {/* Test Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('testInformation')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('orderDate')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{result.orderDate}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('completed')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{result.completedDate || t('pending')}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('priority')}:</span>
              <span className={`font-medium capitalize ${
                result.priority === 'urgent'
                  ? darkMode ? 'text-red-400' : 'text-red-600'
                  : darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>
                {result.priority === 'urgent' ? t('urgent') : result.priority}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('technician')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{result.technician}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('providerInformation')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('physician')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{result.physician}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('status')}:</span>
              <div className="flex items-center space-x-1">
                {getStatusIcon(result.status)}
                <span className={`font-medium capitalize ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>
                  {result.status === 'completed' ? t('completed') : result.status === 'pending' ? t('pending') : result.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('flagsAlerts')}</h3>
          <div className="space-y-2">
            {result.flags.length > 0 ? (
              result.flags.map((flag, index) => (
                <span key={index} className={`inline-block px-2 py-1 rounded-full text-xs mr-1 ${
                  darkMode
                    ? 'bg-yellow-900 bg-opacity-30 text-yellow-300'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {flag}
                </span>
              ))
            ) : (
              <span className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('noFlags')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Test Results */}
      {result.results.length > 0 && (
        <div className="mb-6">
          <h3 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
            darkMode
              ? 'text-[#F5FEFF] border-[#79CAC2]'
              : 'text-gray-900 border-teal-500'
          }`}>{t('testResults')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.results.map((testResult, index) => (
              <div key={index} className={`border rounded-lg p-4 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{testResult.test}</h4>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(testResult.trend)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(testResult.status)}`}>
                      {testResult.status}
                    </span>
                  </div>
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>
                  {testResult.value} <span className={`text-sm font-normal ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{testResult.unit}</span>
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>
                  {t('normalRange')}: {testResult.range}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes */}
      {result.notes && (
        <div className={`rounded-lg p-4 border-l-4 ${
          darkMode
            ? 'bg-blue-900 bg-opacity-30 border-blue-700'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('clinicalNotes')}</h3>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{result.notes}</p>
        </div>
      )}
    </div>
  );

  // Statistics
  const stats = {
    total: labResults.length,
    completed: labResults.filter(r => r.status === 'completed').length,
    pending: labResults.filter(r => r.status === 'pending').length,
    abnormal: labResults.filter(r => r.flags.length > 0).length,
    urgent: labResults.filter(r => r.priority === 'urgent').length
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className={`w-80 border-r overflow-y-auto ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-6 space-y-4">
            {/* Statistics Cards */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold border-l-4 pl-3 ${
                darkMode
                  ? 'text-[#F5FEFF] border-[#79CAC2]'
                  : 'text-gray-900 border-teal-500'
              }`}>{t('resultStatistics')}</h3>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-gradient-to-br from-[#0D2026] to-[#07181D] border-[#133037]'
                  : 'bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className={`w-6 h-6 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{stats.total}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('totalResults')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className={`w-6 h-6 ${
                    darkMode ? 'text-green-400' : 'text-green-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>{stats.completed}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('completed')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Clock className={`w-6 h-6 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>{stats.pending}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('pending')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <AlertTriangle className={`w-6 h-6 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>{stats.abnormal}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('abnormal')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Activity className={`w-6 h-6 ${
                    darkMode ? 'text-red-400' : 'text-red-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>{stats.urgent}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('urgent')}</div>
              </div>
            </div>
              </div>
            </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {!selectedResult ? (
              <>
            {/* Results List */}
            <div className={`rounded-lg border p-6 ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              {/* Header with Filters */}
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                  darkMode
                    ? 'text-[#F5FEFF] border-[#79CAC2]'
                    : 'text-gray-900 border-teal-500'
                }`}>
                  {t('labResults')}
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={darkMode ? 'text-[#8AA2A7] hover:text-[#79CAC2]' : 'text-gray-500 hover:text-gray-700'}
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`border rounded-md px-3 py-1 text-sm transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF]'
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="date">{t('sortByDate')}</option>
                    <option value="patient">{t('sortByPatient')}</option>
                    <option value="test">{t('sortByTest')}</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className={`rounded-lg p-4 mb-6 ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="all">{t('allStatus')}</option>
                      <option value="completed">{t('completed')}</option>
                      <option value="pending">{t('pending')}</option>
                    </select>
                    <select
                      value={testTypeFilter}
                      onChange={(e) => setTestTypeFilter(e.target.value)}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="all">{t('allCategories')}</option>
                      <option value="hematology">{t('hematology')}</option>
                      <option value="chemistry">{t('chemistry')}</option>
                      <option value="microbiology">{t('microbiology')}</option>
                      <option value="endocrinology">{t('endocrinology')}</option>
                    </select>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="all">{t('allTime')}</option>
                      <option value="today">{t('today')}</option>
                      <option value="week">{t('thisWeek')}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={t('searchResults')}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                          : 'border-gray-300'
                      }`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className={`border-b mb-6 ${
                darkMode ? 'border-[#133037]' : 'border-gray-200'
              }`}>
                <nav className="flex space-x-8">
                  {[
                    { id: 'all', label: t('allResults'), count: filteredResults.length },
                    { id: 'abnormal', label: t('abnormal'), count: filteredResults.filter(r => r.flags.length > 0).length },
                    { id: 'critical', label: t('critical'), count: filteredResults.filter(r => r.priority === 'urgent').length },
                    { id: 'pending', label: t('pending'), count: filteredResults.filter(r => r.status === 'pending').length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? darkMode
                            ? 'border-[#79CAC2] text-[#79CAC2]'
                            : 'border-teal-500 text-teal-600'
                          : darkMode
                            ? 'border-transparent text-[#8AA2A7] hover:text-[#C1D9DD]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </nav>
              </div>

              {/* Results Grid */}
              <div className="space-y-4">
                {filteredResults.length > 0 ? (
                  filteredResults.map((result) => (
                    <ResultCard key={result.id} result={result} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <FileText className={`w-20 h-20 mx-auto mb-4 ${
                      darkMode ? 'text-[#133037]' : 'text-gray-300'
                    }`} />
                    <h3 className={`text-lg font-semibold mb-2 ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{t('noResultsFound')}</h3>
                    <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                      {t('tryAdjustingYourSearchCriteriaOrFilters')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <ResultDetails result={selectedResult} />
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabResultsModule;