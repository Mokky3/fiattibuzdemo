import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Download, Eye, Calendar, Clock, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, BarChart3, Users, Activity } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getResults } from '../../services/labService';

const LabResultsModule = () => {
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
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50 border-green-200';
      case 'high': 
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-500" />;
      case 'stable': return <Minus className="w-3 h-3 text-gray-400" />;
      default: return null;
    }
  };

  const ResultCard = ({ result }) => (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => setSelectedResult(result)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg text-sm font-medium">
            {result.time || 'Pending'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{result.patientName}</h3>
            <p className="text-sm text-gray-600">{result.testType}</p>
            <p className="text-xs text-gray-500">ID: {result.patientId} • Order: {result.orderId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {getStatusIcon(result.status)}
            <span className="text-sm text-gray-600 capitalize">{result.status}</span>
          </div>
          {result.priority === 'urgent' && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs border border-red-200">
              Urgent
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <span className="text-sm text-gray-600">Category: {result.testCategory}</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-600">Provider: {result.physician}</span>
        </div>
        <div className="flex items-center space-x-2">
          {result.flags.length > 0 && (
            <div className="flex space-x-1">
              {result.flags.map((flag, index) => (
                <span key={index} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
                  {flag}
                </span>
              ))}
            </div>
          )}
          <span className="text-xs text-gray-500">{result.completedDate || result.orderDate}</span>
        </div>
      </div>
    </div>
  );

  const ResultDetails = ({ result }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{result.testType}</h2>
          <p className="text-gray-600">{result.patientName} • ID: {result.patientId}</p>
          <p className="text-sm text-gray-500">Order: {result.orderId} • Category: {result.testCategory}</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-teal-500 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors">
            <Download className="w-4 h-4 inline mr-2" />
            Export PDF
          </button>
          <button 
            onClick={() => setSelectedResult(null)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Test Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Test Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date:</span>
              <span className="font-medium">{result.orderDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className="font-medium">{result.completedDate || 'Pending'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className={`font-medium capitalize ${result.priority === 'urgent' ? 'text-red-600' : 'text-gray-900'}`}>
                {result.priority}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Technician:</span>
              <span className="font-medium">{result.technician}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Provider Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Physician:</span>
              <span className="font-medium">{result.physician}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <div className="flex items-center space-x-1">
                {getStatusIcon(result.status)}
                <span className="font-medium capitalize">{result.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Flags & Alerts</h3>
          <div className="space-y-2">
            {result.flags.length > 0 ? (
              result.flags.map((flag, index) => (
                <span key={index} className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs mr-1">
                  {flag}
                </span>
              ))
            ) : (
              <span className="text-gray-500 text-sm">No flags</span>
            )}
          </div>
        </div>
      </div>

      {/* Test Results */}
      {result.results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Test Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.results.map((testResult, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{testResult.test}</h4>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(testResult.trend)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(testResult.status)}`}>
                      {testResult.status}
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {testResult.value} <span className="text-sm font-normal text-gray-500">{testResult.unit}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Normal Range: {testResult.range}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes */}
      {result.notes && (
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-900 mb-2">Clinical Notes</h3>
          <p className="text-gray-700">{result.notes}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Statistics Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">Result Statistics</h3>
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Results</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.abnormal}</div>
                <div className="text-sm text-gray-600">Abnormal</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
                <div className="text-sm text-gray-600">Urgent</div>
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Header with Filters */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                  Lab Results
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="patient">Sort by Patient</option>
                    <option value="test">Sort by Test</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                    </select>
                    <select
                      value={testTypeFilter}
                      onChange={(e) => setTestTypeFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Categories</option>
                      <option value="hematology">Hematology</option>
                      <option value="chemistry">Chemistry</option>
                      <option value="microbiology">Microbiology</option>
                      <option value="endocrinology">Endocrinology</option>
                    </select>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search results..."
                      className="border border-gray-300 rounded-md px-3 py-2"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                  {[
                    { id: 'all', label: 'All Results', count: filteredResults.length },
                    { id: 'abnormal', label: 'Abnormal', count: filteredResults.filter(r => r.flags.length > 0).length },
                    { id: 'critical', label: 'Critical', count: filteredResults.filter(r => r.priority === 'urgent').length },
                    { id: 'pending', label: 'Pending', count: filteredResults.filter(r => r.status === 'pending').length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-teal-500 text-teal-600'
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
                    <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                    <p className="text-gray-600">Try adjusting your search criteria or filters</p>
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