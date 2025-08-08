import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Download, Eye, Calendar, Clock, CheckCircle, AlertTriangle, BarChart3, TrendingUp, Printer, Mail, Share2, Plus, Users, Activity, PieChart } from 'lucide-react';
// Import the header component
import LabHeader from './header';

const LabReportsModule = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeTab, setActiveTab] = useState('generated');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);

  // Mock reports data
  const [labReports, setLabReports] = useState([
    {
      id: 'RPT-001',
      title: 'Weekly Lab Statistics Report',
      type: 'statistics',
      category: 'Operational',
      generatedDate: '2025-06-28',
      generatedTime: '09:30',
      generatedBy: 'Lab Tech 001',
      status: 'completed',
      format: 'PDF',
      size: '2.4 MB',
      pages: 15,
      description: 'Comprehensive weekly statistics covering all lab departments',
      period: 'June 21-28, 2025',
      recipients: ['Dr. Johnson', 'Lab Manager', 'QA Team'],
      downloadCount: 12,
      lastAccessed: '2025-06-28 14:22',
      data: {
        totalTests: 324,
        completedTests: 298,
        pendingTests: 26,
        avgTurnaroundTime: '3.2 hours',
        abnormalResults: 45,
        criticalResults: 8
      }
    },
    {
      id: 'RPT-002',
      title: 'Patient Test Results - Muhammad Hariton',
      type: 'patient',
      category: 'Clinical',
      generatedDate: '2025-06-28',
      generatedTime: '11:15',
      generatedBy: 'Lab Tech 002',
      status: 'completed',
      format: 'PDF',
      size: '1.2 MB',
      pages: 3,
      description: 'Complete blood count and metabolic panel results',
      period: 'Single Test Session',
      recipients: ['Dr. Johnson', 'Patient'],
      downloadCount: 5,
      lastAccessed: '2025-06-28 15:45',
      patientInfo: {
        name: 'Muhammad Hariton',
        id: 'P-025',
        age: 20,
        gender: 'Male'
      }
    },
    {
      id: 'RPT-003',
      title: 'Quality Control Monthly Report',
      type: 'quality',
      category: 'Quality Assurance',
      generatedDate: '2025-06-27',
      generatedTime: '16:00',
      generatedBy: 'QA Manager',
      status: 'completed',
      format: 'Excel',
      size: '5.8 MB',
      pages: 25,
      description: 'Monthly quality control metrics and compliance review',
      period: 'May 2025',
      recipients: ['Lab Director', 'Compliance Team', 'Department Heads'],
      downloadCount: 8,
      lastAccessed: '2025-06-28 10:30',
      data: {
        controlTests: 156,
        passedTests: 152,
        failedTests: 4,
        complianceRate: '97.4%',
        calibrationEvents: 12,
        maintenanceEvents: 8
      }
    },
    {
      id: 'RPT-004',
      title: 'Abnormal Results Alert Report',
      type: 'alerts',
      category: 'Clinical',
      generatedDate: '2025-06-27',
      generatedTime: '08:45',
      generatedBy: 'Lab Tech 003',
      status: 'completed',
      format: 'PDF',
      size: '800 KB',
      pages: 4,
      description: 'Summary of all abnormal and critical results requiring attention',
      period: 'June 26-27, 2025',
      recipients: ['Dr. Wilson', 'Dr. Brown', 'Chief Resident'],
      downloadCount: 15,
      lastAccessed: '2025-06-28 12:10',
      data: {
        abnormalResults: 23,
        criticalResults: 5,
        urgentNotifications: 3,
        followUpRequired: 8
      }
    },
    {
      id: 'RPT-005',
      title: 'Department Performance Analysis',
      type: 'performance',
      category: 'Management',
      generatedDate: '2025-06-26',
      generatedTime: '14:20',
      generatedBy: 'Lab Manager',
      status: 'completed',
      format: 'PowerPoint',
      size: '12.3 MB',
      pages: 18,
      description: 'Quarterly performance analysis across all lab departments',
      period: 'Q2 2025',
      recipients: ['Hospital Administration', 'Department Heads', 'Board Members'],
      downloadCount: 22,
      lastAccessed: '2025-06-28 09:15',
      data: {
        totalOrders: 1248,
        avgProcessingTime: '2.8 hours',
        customerSatisfaction: '94.2%',
        costPerTest: '$45.60',
        efficiency: '96.8%'
      }
    },
    {
      id: 'RPT-006',
      title: 'Inventory Usage Report',
      type: 'inventory',
      category: 'Operational',
      generatedDate: '2025-06-25',
      generatedTime: '10:30',
      generatedBy: 'Inventory Manager',
      status: 'pending',
      format: 'Excel',
      size: '3.1 MB',
      pages: 8,
      description: 'Monthly inventory consumption and stock level analysis',
      period: 'June 2025',
      recipients: ['Procurement Team', 'Lab Manager', 'Finance Department'],
      downloadCount: 0,
      lastAccessed: null,
      data: {
        itemsTracked: 245,
        lowStockItems: 12,
        expiredItems: 3,
        totalValue: '$24,580',
        monthlyConsumption: '$8,240'
      }
    }
  ]);

  // Report templates
  const [reportTemplates] = useState([
    {
      id: 'TPL-001',
      name: 'Daily Lab Summary',
      description: 'Daily overview of lab operations and key metrics',
      category: 'Operational',
      frequency: 'Daily',
      estimatedTime: '5 minutes',
      parameters: ['Date Range', 'Departments', 'Test Types']
    },
    {
      id: 'TPL-002',
      name: 'Patient Test Report',
      description: 'Individual patient test results with reference ranges',
      category: 'Clinical',
      frequency: 'On Demand',
      estimatedTime: '2 minutes',
      parameters: ['Patient ID', 'Test Date', 'Test Types']
    },
    {
      id: 'TPL-003',
      name: 'Quality Control Report',
      description: 'QC metrics and compliance status',
      category: 'Quality Assurance',
      frequency: 'Weekly',
      estimatedTime: '10 minutes',
      parameters: ['Date Range', 'QC Tests', 'Instruments']
    },
    {
      id: 'TPL-004',
      name: 'Financial Summary',
      description: 'Revenue and cost analysis for lab operations',
      category: 'Financial',
      frequency: 'Monthly',
      estimatedTime: '15 minutes',
      parameters: ['Date Range', 'Cost Centers', 'Revenue Streams']
    },
    {
      id: 'TPL-005',
      name: 'Turnaround Time Analysis',
      description: 'Analysis of test processing times and bottlenecks',
      category: 'Performance',
      frequency: 'Weekly',
      estimatedTime: '8 minutes',
      parameters: ['Date Range', 'Test Categories', 'Priority Levels']
    }
  ]);

  // Filter and sort reports
  const filteredReports = labReports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.id.includes(searchTerm) ||
                         report.generatedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'today' && report.generatedDate === '2025-06-28') ||
                       (dateFilter === 'week' && new Date(report.generatedDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    const matchesTab = activeTab === 'generated' || 
                      (activeTab === 'scheduled' && report.status === 'pending') ||
                      (activeTab === 'templates');
    
    return matchesSearch && matchesType && matchesStatus && matchesDate && matchesTab;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.generatedDate + ' ' + b.generatedTime) - new Date(a.generatedDate + ' ' + a.generatedTime);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'downloads':
        return b.downloadCount - a.downloadCount;
      default:
        return 0;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'statistics': return <BarChart3 className="w-4 h-4 text-blue-500" />;
      case 'patient': return <Users className="w-4 h-4 text-green-500" />;
      case 'quality': return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'alerts': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'performance': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'inventory': return <Activity className="w-4 h-4 text-teal-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'PDF': return '📄';
      case 'Excel': return '📊';
      case 'PowerPoint': return '📋';
      case 'Word': return '📝';
      default: return '📄';
    }
  };

  const ReportCard = ({ report }) => (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => setSelectedReport(report)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getTypeIcon(report.type)}
          <div>
            <h3 className="font-semibold text-gray-900">{report.title}</h3>
            <p className="text-sm text-gray-600">{report.description}</p>
            <p className="text-xs text-gray-500">ID: {report.id} • Generated by: {report.generatedBy}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </span>
          <div className="text-center">
            <div className="text-lg">{getFormatIcon(report.format)}</div>
            <div className="text-xs text-gray-500">{report.format}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-xs text-gray-500">Generated</span>
          <div className="text-sm font-medium">{report.generatedDate}</div>
          <div className="text-xs text-gray-500">{report.generatedTime}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Period</span>
          <div className="text-sm font-medium">{report.period}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Size</span>
          <div className="text-sm font-medium">{report.size}</div>
          <div className="text-xs text-gray-500">{report.pages} pages</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Downloads</span>
          <div className="text-sm font-medium">{report.downloadCount}</div>
          {report.lastAccessed && (
            <div className="text-xs text-gray-500">Last: {report.lastAccessed.split(' ')[1]}</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <span className="text-sm text-gray-600">Category: {report.category}</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-600">Recipients: {report.recipients.length}</span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle download
            }}
            className="text-teal-600 hover:text-teal-700 p-1"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle share
            }}
            className="text-gray-600 hover:text-gray-700 p-1"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const TemplateCard = ({ template }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          <p className="text-sm text-gray-600">{template.description}</p>
          <p className="text-xs text-gray-500">Category: {template.category}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{template.frequency}</div>
          <div className="text-xs text-gray-500">{template.estimatedTime}</div>
        </div>
      </div>
      <div className="mb-4">
        <span className="text-xs text-gray-500">Parameters:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {template.parameters.map((param, index) => (
            <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
              {param}
            </span>
          ))}
        </div>
      </div>
      <button className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg transition-colors">
        Generate Report
      </button>
    </div>
  );

  const ReportDetails = ({ report }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{report.title}</h2>
          <p className="text-gray-600">{report.description}</p>
          <p className="text-sm text-gray-500">Report ID: {report.id}</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button 
            onClick={() => setSelectedReport(null)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Report Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Report Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <div className="flex items-center space-x-1">
                {getTypeIcon(report.type)}
                <span className="font-medium capitalize">{report.type}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Category:</span>
              <span className="font-medium">{report.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Format:</span>
              <span className="font-medium">{getFormatIcon(report.format)} {report.format}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Generation Info</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Generated:</span>
              <span className="font-medium">{report.generatedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">{report.generatedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Generated By:</span>
              <span className="font-medium">{report.generatedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Period:</span>
              <span className="font-medium">{report.period}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Usage Statistics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">File Size:</span>
              <span className="font-medium">{report.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pages:</span>
              <span className="font-medium">{report.pages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Downloads:</span>
              <span className="font-medium">{report.downloadCount}</span>
            </div>
            {report.lastAccessed && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Accessed:</span>
                <span className="font-medium">{report.lastAccessed}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Recipients</h3>
        <div className="flex flex-wrap gap-2">
          {report.recipients.map((recipient, index) => (
            <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
              {recipient}
            </span>
          ))}
        </div>
      </div>

      {/* Data Summary (if available) */}
      {report.data && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Report Data Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(report.data).map(([key, value]) => (
              <div key={key} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                <div className="text-xl font-bold text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Info (if patient report) */}
      {report.patientInfo && (
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-600">Name:</span>
              <div className="font-medium">{report.patientInfo.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Patient ID:</span>
              <div className="font-medium">{report.patientInfo.id}</div>
            </div>
            <div>
              <span className="text-gray-600">Age:</span>
              <div className="font-medium">{report.patientInfo.age}</div>
            </div>
            <div>
              <span className="text-gray-600">Gender:</span>
              <div className="font-medium">{report.patientInfo.gender}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Statistics
  const stats = {
    total: labReports.length,
    completed: labReports.filter(r => r.status === 'completed').length,
    pending: labReports.filter(r => r.status === 'pending').length,
    templates: reportTemplates.length,
    totalDownloads: labReports.reduce((sum, r) => sum + r.downloadCount, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <LabHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedReport ? (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="w-8 h-8 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <PieChart className="w-8 h-8 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-purple-600">{stats.templates}</div>
                <div className="text-sm text-gray-600">Templates</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Download className="w-8 h-8 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalDownloads}</div>
                <div className="text-sm text-gray-600">Downloads</div>
              </div>
            </div>

            {/* Reports Management */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Header with Actions */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                  Lab Reports
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowNewReportForm(true)}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Generate Report
                  </button>
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
                    <option value="title">Sort by Title</option>
                    <option value="type">Sort by Type</option>
                    <option value="downloads">Sort by Downloads</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Types</option>
                      <option value="statistics">Statistics</option>
                      <option value="patient">Patient</option>
                      <option value="quality">Quality</option>
                      <option value="alerts">Alerts</option>
                      <option value="performance">Performance</option>
                      <option value="inventory">Inventory</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="failed">Failed</option>
                    </select>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search reports..."
                      className="border border-gray-300 rounded-md px-3 py-2"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        setTypeFilter('all');
                        setStatusFilter('all');
                        setDateFilter('all');
                        setSearchTerm('');
                      }}
                      className="border border-gray-300 text-gray-700 rounded-md px-3 py-2 hover:bg-gray-50"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                  {[
                    { id: 'generated', label: 'Generated Reports', count: filteredReports.length },
                    { id: 'scheduled', label: 'Scheduled', count: labReports.filter(r => r.status === 'pending').length },
                    { id: 'templates', label: 'Templates', count: reportTemplates.length }
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

              {/* Content based on active tab */}
              <div className="space-y-4">
                {activeTab === 'templates' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reportTemplates.map((template) => (
                      <TemplateCard key={template.id} template={template} />
                    ))}
                  </div>
                ) : (
                  <>
                    {filteredReports.length > 0 ? (
                      filteredReports.map((report) => (
                        <ReportCard key={report.id} report={report} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports found</h3>
                        <p className="text-gray-600">Try adjusting your search criteria or filters</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <ReportDetails report={selectedReport} />
        )}
      </div>
    </div>
  );
};

export default LabReportsModule;