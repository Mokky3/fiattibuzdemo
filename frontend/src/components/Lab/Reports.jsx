import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, FileText, Download, Eye, Calendar, Clock, CheckCircle, AlertTriangle, BarChart3, TrendingUp, Printer, Mail, Share2, Plus, Users, Activity, PieChart } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getReports, getReportResults } from '../../services/labService';

const LabReportsModule = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
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
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeTab, setActiveTab] = useState('generated');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);

  const [labReports, setLabReports] = useState([]);

  const loadReports = async () => {
    try {
      const data = await getReports();
      setLabReports(data);
    } catch (e) {
      console.error('Error loading lab reports:', e);
      setLabReports([]);
    }
  };

  useEffect(() => {
    let active = true;
    loadReports();
    return () => { active = false };
  }, []);

  // Refresh reports when navigating back from report creation
  useEffect(() => {
    if (location.pathname === '/lab/reports') {
      loadReports();
    }
  }, [location.pathname]);

  // Report templates - removed mock data
  const [reportTemplates] = useState([]);

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
    if (darkMode) {
      switch (status) {
        case 'completed': return 'text-green-300 bg-green-900 bg-opacity-30 border-green-700';
        case 'pending': return 'text-yellow-300 bg-yellow-900 bg-opacity-30 border-yellow-700';
        case 'failed': return 'text-red-300 bg-red-900 bg-opacity-30 border-red-700';
        case 'processing': return 'text-blue-300 bg-blue-900 bg-opacity-30 border-blue-700';
        default: return 'text-gray-300 bg-gray-700 bg-opacity-30 border-gray-600';
      }
    } else {
      switch (status) {
        case 'completed': return 'text-green-600 bg-green-50 border-green-200';
        case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'failed': return 'text-red-600 bg-red-50 border-red-200';
        case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'statistics': return <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />;
      case 'patient': return <Users className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />;
      case 'quality': return <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />;
      case 'alerts': return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
      case 'performance': return <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />;
      case 'inventory': return <Activity className={`w-4 h-4 ${darkMode ? 'text-teal-400' : 'text-teal-500'}`} />;
      default: return <FileText className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
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
      className={`rounded-lg border p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}
      onClick={() => setSelectedReport(report)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getTypeIcon(report.type)}
          <div>
            <h3 className={`font-semibold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{report.title}</h3>
            <p className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{report.description}</p>
            <p className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{t('id')}: {report.id} • {t('generatedBy')}: {report.generatedBy}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
            {report.status === 'completed' ? t('completed') : 
             report.status === 'pending' ? t('pending') : 
             report.status === 'processing' ? t('processing') : 
             report.status === 'failed' ? t('failed') : 
             report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </span>
          <div className="text-center">
            <div className="text-lg">{getFormatIcon(report.format)}</div>
            <div className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{report.format}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('generated')}</span>
          <div className={`text-sm font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{report.generatedDate}</div>
          <div className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{report.generatedTime}</div>
        </div>
        <div>
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('period')}</span>
          <div className={`text-sm font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{report.period}</div>
        </div>
        <div>
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('size')}</span>
          <div className={`text-sm font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{report.size}</div>
          <div className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{report.pages} {t('pages')}</div>
        </div>
        <div>
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('downloads')}</span>
          <div className={`text-sm font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{report.downloadCount}</div>
          {report.lastAccessed && (
            <div className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{t('last')}: {report.lastAccessed.split(' ')[1]}</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('category')}: {report.category}</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
          }`}>•</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('recipients')}: {report.recipients.length}</span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle download
            }}
            className={darkMode ? 'text-[#79CAC2] hover:text-[#58B4AA] p-1' : 'text-teal-600 hover:text-teal-700 p-1'}
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle share
            }}
            className={darkMode ? 'text-[#C1D9DD] hover:text-[#79CAC2] p-1' : 'text-gray-600 hover:text-gray-700 p-1'}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const TemplateCard = ({ template }) => (
    <div className={`rounded-lg border p-6 hover:shadow-md transition-all duration-200 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`font-semibold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{template.name}</h3>
          <p className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{template.description}</p>
          <p className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('category')}: {template.category}</p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{template.frequency}</div>
          <div className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{template.estimatedTime}</div>
        </div>
      </div>
      <div className="mb-4">
        <span className={`text-xs ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
        }`}>{t('parameters')}:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {template.parameters.map((param, index) => (
            <span key={index} className={`px-2 py-1 rounded text-xs ${
              darkMode
                ? 'bg-[#07181D] text-[#C1D9DD]'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {param}
            </span>
          ))}
        </div>
      </div>
      <button className={`w-full py-2 px-4 rounded-lg transition-colors ${
        darkMode
          ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
          : 'bg-teal-500 hover:bg-teal-600 text-white'
      }`}>
        {t('generateReport')}
      </button>
    </div>
  );

  // Helper function to render structured test data
  const renderTestData = (result) => {
    const testData = result.attachments?.fullTestData || result.attachments?.panel_data?.fullTestData || {};
    const testType = testData.testType || result.attachments?.testType;
    
    // For cytogenetics tests
    if (testType === 'conventional_karyotyping') {
      return (
        <div className={`mt-3 pt-3 border-t space-y-3 ${
          darkMode ? 'border-[#133037]' : 'border-gray-200'
        }`}>
          <h5 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('karyotypingDetails')}</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testData.specimenType && (
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('specimenType')}:</span>
                <div className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{testData.specimenType}</div>
              </div>
            )}
            {testData.cultureType && (
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('cultureType')}:</span>
                <div className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{testData.cultureType}</div>
              </div>
            )}
            {testData.totalMetaphases && (
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('totalMetaphasesAnalyzed')}:</span>
                <div className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{testData.totalMetaphases}</div>
              </div>
            )}
            {testData.normalMetaphases !== undefined && (
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('normalMetaphases')}:</span>
                <div className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{testData.normalMetaphases}</div>
              </div>
            )}
            {testData.abnormalMetaphases !== undefined && (
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('abnormalMetaphases')}:</span>
                <div className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{testData.abnormalMetaphases}</div>
              </div>
            )}
            {testData.modalChromosomeNumber && (
              <div>
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('modalChromosomeNumber')}:</span>
                <div className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{testData.modalChromosomeNumber}</div>
              </div>
            )}
          </div>
          {testData.karyotypeResult && (
            <div className="mt-3">
              <span className={`text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>{t('karyotypeResultISCN')}:</span>
              <div className={`font-medium mt-1 p-2 rounded ${
                darkMode
                  ? 'bg-blue-900 bg-opacity-30 text-[#F5FEFF]'
                  : 'bg-blue-50 text-gray-900'
              }`}>{testData.karyotypeResult}</div>
            </div>
          )}
          {testData.interpretation && (
            <div className="mt-3">
              <span className={`text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>{t('interpretation')}:</span>
              <div className={`text-sm mt-1 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{testData.interpretation}</div>
            </div>
          )}
          {testData.conclusion && (
            <div className="mt-3">
              <span className={`text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>{t('conclusion')}:</span>
              <div className={`font-medium mt-1 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{testData.conclusion}</div>
            </div>
          )}
        </div>
      );
    }
    
    // For panel tests with parameters
    if (testData.parameters || testData.numericParameters) {
      const parameters = testData.parameters || testData.numericParameters || [];
      if (parameters.length > 0) {
        return (
          <div className={`mt-3 pt-3 border-t ${
            darkMode ? 'border-[#133037]' : 'border-gray-200'
          }`}>
            <h5 className={`font-semibold mb-3 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('testParameters')}</h5>
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${
                darkMode ? 'divide-[#133037]' : 'divide-gray-200'
              }`}>
                <thead className={darkMode ? 'bg-[#07181D]' : 'bg-gray-100'}>
                  <tr>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('parameter')}</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('result')}</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('unit')}</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('referenceRange')}</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('status')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  darkMode ? 'bg-[#0D2026] divide-[#133037]' : 'bg-white divide-gray-200'
                }`}>
                  {parameters.map((param, idx) => (
                    <tr key={idx}>
                      <td className={`px-4 py-2 text-sm ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{param.name || param.code || `${t('parameter')} ${idx + 1}`}</td>
                      <td className={`px-4 py-2 text-sm font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>
                        {param.resultValue || param.percentValue || param.absoluteValue || '-'}
                      </td>
                      <td className={`px-4 py-2 text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{param.unit || '-'}</td>
                      <td className={`px-4 py-2 text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{param.ref || param.ref_percent || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {param.isAbnormal ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            param.abnormalityType === 'high' || param.abnormalityType === 'HIGH'
                              ? darkMode
                                ? 'bg-yellow-900 bg-opacity-30 text-yellow-300'
                                : 'bg-yellow-100 text-yellow-800'
                              : param.abnormalityType === 'low' || param.abnormalityType === 'LOW'
                                ? darkMode
                                  ? 'bg-orange-900 bg-opacity-30 text-orange-300'
                                  : 'bg-orange-100 text-orange-800'
                                : darkMode
                                  ? 'bg-red-900 bg-opacity-30 text-red-300'
                                  : 'bg-red-100 text-red-800'
                          }`}>
                            {param.abnormalityType || t('abnormal')}
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            darkMode
                              ? 'bg-green-900 bg-opacity-30 text-green-300'
                              : 'bg-green-100 text-green-800'
                          }`}>{t('normal')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    }
    
    // For other structured tests, show key-value pairs
    if (Object.keys(testData).length > 0 && testType !== 'conventional_karyotyping') {
      // Filter out internal fields
      const displayFields = Object.entries(testData).filter(([key]) => 
        !['testType', 'testName', 'testCode', 'testCategory', 'fullTestData', 'panel_data'].includes(key)
      );
      
      if (displayFields.length > 0) {
        return (
          <div className={`mt-3 pt-3 border-t ${
            darkMode ? 'border-[#133037]' : 'border-gray-200'
          }`}>
            <h5 className={`font-semibold mb-3 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('testDetails')}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayFields.map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null;
                if (typeof value === 'object' && !Array.isArray(value)) return null; // Skip nested objects
                return (
                  <div key={key}>
                    <span className={`text-sm capitalize ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <div className={`font-medium mt-1 ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }
    
    return null;
  };

  const ReportDetails = ({ report }) => {
    // Local state for this component
    const [reportResults, setReportResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);
    
    // Fetch test results when report is selected
    useEffect(() => {
      // Reset state when report changes
      setReportResults([]);
      setLoadingResults(false);
      
      if (!report || !report.id) {
        return;
      }
      
      let cancelled = false;
      setLoadingResults(true);
      
      getReportResults(report.id)
        .then(results => {
          if (!cancelled) {
            setReportResults(results || []);
          }
        })
        .catch(err => {
          if (!cancelled) {
            console.error('Error loading report results:', err);
            setReportResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingResults(false);
          }
        });
      
      // Cleanup function to cancel if component unmounts or report changes
      return () => {
        cancelled = true;
      };
    }, [report?.id]); // Only depend on report.id, not the entire report object

    return (
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
          }`}>{report.title}</h2>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{report.description}</p>
          <p className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('reportId')}: {report.id}</p>
        </div>
        <div className="flex space-x-2">
          <button className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}>
            <Download className="w-4 h-4" />
            {t('download')}
          </button>
          <button className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            <Mail className="w-4 h-4" />
            {t('email')}
          </button>
          <button className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            <Printer className="w-4 h-4" />
            {t('print')}
          </button>
          <button 
            onClick={() => setSelectedReport(null)}
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

      {/* Generation Info */}
      <div className="mb-6">
        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('generationInfo')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('generated')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{report.generatedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('time')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{report.generatedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('period')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{report.period}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="mb-6">
        <h3 className={`font-semibold mb-3 ${
          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
        }`}>{t('recipients')}</h3>
        <div className="flex flex-wrap gap-2">
          {/* Always show patient name if available */}
          {report.patientInfo && report.patientInfo.name && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              darkMode
                ? 'bg-blue-900 bg-opacity-30 text-blue-300'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {report.patientInfo.name}
            </span>
          )}
          {/* Show other recipients */}
          {report.recipients && report.recipients.map((recipient, index) => (
            <span key={index} className={`px-3 py-1 rounded-full text-sm ${
              darkMode
                ? 'bg-blue-900 bg-opacity-30 text-blue-300'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {recipient}
            </span>
          ))}
        </div>
      </div>

      {/* Data Summary (if available) */}
      {report.data && (
        <div className="mb-6">
          <h3 className={`font-semibold mb-3 border-l-4 pl-3 text-sm ${
            darkMode
              ? 'text-[#F5FEFF] border-[#79CAC2]'
              : 'text-gray-900 border-teal-500'
          }`}>{t('reportDataSummary')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(report.data)
              .filter(([key]) => key.toLowerCase() !== 'resultids') // Remove resultIds
              .map(([key, value]) => (
                <div key={key} className={`border rounded-lg p-3 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-xs capitalize mb-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                  }`}>{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className={`text-sm font-semibold ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Info (if patient report) */}
      {report.patientInfo && (
        <div className={`rounded-lg p-4 border-l-4 ${
          darkMode
            ? 'bg-blue-900 bg-opacity-30 border-blue-700'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('patientInformation')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('name')}:</span>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{report.patientInfo.name}</div>
            </div>
            <div>
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('patientId')}:</span>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{report.patientInfo.id}</div>
            </div>
            <div>
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('age')}:</span>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{report.patientInfo.age}</div>
            </div>
            <div>
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('gender')}:</span>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{report.patientInfo.gender}</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="mb-6">
        <h3 className={`font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-[#79CAC2]'
            : 'text-gray-900 border-teal-500'
        }`}>{t('testResults')}</h3>
        {loadingResults ? (
          <div className="text-center py-8">
            <div className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
              {t('loadingTestResults')}
            </div>
          </div>
        ) : reportResults.length === 0 ? (
          <div className={`text-center py-8 rounded-lg ${
            darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
          }`}>
            <div className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
              {t('noTestResultsFoundForThisReport')}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reportResults.map((result, index) => (
              <div key={result.id || index} className={`rounded-lg border p-4 ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037]'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className={`font-semibold ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{result.testName}</h4>
                    {result.testCode && (
                      <p className={`text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('code')}: {result.testCode}</p>
                    )}
                    {result.panelName && (
                      <p className={`text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('panel')}: {result.panelName}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.isAbnormal && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.abnormalityType === 'HIGH'
                          ? darkMode
                            ? 'bg-yellow-900 bg-opacity-30 text-yellow-300'
                            : 'bg-yellow-100 text-yellow-800'
                          : result.abnormalityType === 'LOW'
                            ? darkMode
                              ? 'bg-orange-900 bg-opacity-30 text-orange-300'
                              : 'bg-orange-100 text-orange-800'
                            : darkMode
                              ? 'bg-red-900 bg-opacity-30 text-red-300'
                              : 'bg-red-100 text-red-800'
                      }`}>
                        {result.abnormalityType || t('abnormal')}
                      </span>
                    )}
                    {result.isCritical && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode
                          ? 'bg-red-900 bg-opacity-30 text-red-300'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {t('critical')}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{t('resultValue')}:</span>
                    <div className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>
                      {result.resultValue} {result.resultUnit && <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>({result.resultUnit})</span>}
                    </div>
                  </div>
                  {result.referenceRange && (
                    <div>
                      <span className={`text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('referenceRange')}:</span>
                      <div className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{result.referenceRange}</div>
                    </div>
                  )}
                  {result.testCategory && (
                    <div>
                      <span className={`text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('category')}:</span>
                      <div className={`font-medium ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{result.testCategory}</div>
                    </div>
                  )}
                  {result.status && (
                    <div>
                      <span className={`text-sm ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                      }`}>{t('status')}:</span>
                      <div className={`font-medium capitalize ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{result.status.toLowerCase()}</div>
                    </div>
                  )}
                </div>

                {result.interpretation && (
                  <div className={`mt-3 pt-3 border-t ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    <span className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{t('interpretation')}:</span>
                    <div className={`text-sm mt-1 ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{result.interpretation}</div>
                  </div>
                )}

                {result.comments && (
                  <div className="mt-2">
                    <span className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{t('comments')}:</span>
                    <div className={`text-sm mt-1 ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{result.comments}</div>
                  </div>
                )}

                {/* Display structured test data for complex tests */}
                {(() => {
                  const structuredView = renderTestData(result);
                  if (structuredView) {
                    return structuredView;
                  }
                  // Fallback: Display raw JSON if structured rendering didn't work
                  if (result.attachments && result.attachments.fullTestData) {
                    return (
                      <div className={`mt-3 pt-3 border-t ${
                        darkMode ? 'border-[#133037]' : 'border-gray-200'
                      }`}>
                        <details className="text-sm">
                          <summary className={`cursor-pointer font-medium ${
                            darkMode
                              ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                              : 'text-teal-600 hover:text-teal-700'
                          }`}>
                            {t('viewRawTestData')}
                          </summary>
                          <pre className={`mt-2 p-3 rounded text-xs overflow-auto max-h-64 ${
                            darkMode
                              ? 'bg-[#0D2026] text-[#C1D9DD]'
                              : 'bg-gray-100'
                          }`}>
                            {JSON.stringify(result.attachments.fullTestData, null, 2)}
                          </pre>
                        </details>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  };

  // Statistics
  const stats = {
    total: labReports.length,
    completed: labReports.filter(r => r.status === 'completed').length,
    pending: labReports.filter(r => r.status === 'pending').length,
    templates: reportTemplates.length,
    totalDownloads: labReports.reduce((sum, r) => sum + r.downloadCount, 0)
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
              }`}>{t('reportStatistics')}</h3>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-gradient-to-br from-[#0D2026] to-[#07181D] border-[#133037]'
                  : 'bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <FileText className={`w-6 h-6 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{stats.total}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('totalReports')}</div>
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
                  <PieChart className={`w-6 h-6 ${
                    darkMode ? 'text-purple-400' : 'text-purple-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-purple-400' : 'text-purple-600'
                }`}>{stats.templates}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('templates')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Download className={`w-6 h-6 ${
                    darkMode ? 'text-blue-400' : 'text-blue-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>{stats.totalDownloads}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('downloads')}</div>
              </div>
            </div>
              </div>
            </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {!selectedReport ? (
              <>
            {/* Reports Management */}
            <div className={`rounded-lg border p-6 ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              {/* Header with Actions */}
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                  darkMode
                    ? 'text-[#F5FEFF] border-[#79CAC2]'
                    : 'text-gray-900 border-teal-500'
                }`}>
                  {t('labReports')}
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowNewReportForm(true)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      darkMode
                        ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    {t('generateReport')}
                  </button>
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
                    <option value="title">{t('sortByTitle')}</option>
                    <option value="type">{t('sortByType')}</option>
                    <option value="downloads">{t('sortByDownloads')}</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className={`rounded-lg p-4 mb-6 ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="all">{t('allTypes')}</option>
                      <option value="statistics">{t('statistics')}</option>
                      <option value="patient">{t('patient')}</option>
                      <option value="quality">{t('quality')}</option>
                      <option value="alerts">{t('alerts')}</option>
                      <option value="performance">{t('performance')}</option>
                      <option value="inventory">{t('inventory')}</option>
                    </select>
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
                      <option value="processing">{t('processing')}</option>
                      <option value="failed">{t('failed')}</option>
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
                      <option value="month">{t('thisMonth')}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={t('searchReports')}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                          : 'border-gray-300'
                      }`}
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
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t('clearFilters')}
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className={`border-b mb-6 ${
                darkMode ? 'border-[#133037]' : 'border-gray-200'
              }`}>
                <nav className="flex space-x-8">
                  {[
                    { id: 'generated', label: t('generatedReports'), count: filteredReports.length },
                    { id: 'scheduled', label: t('scheduled'), count: labReports.filter(r => r.status === 'pending').length },
                    { id: 'templates', label: t('templates'), count: reportTemplates.length }
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
                        <FileText className={`w-20 h-20 mx-auto mb-4 ${
                          darkMode ? 'text-[#133037]' : 'text-gray-300'
                        }`} />
                        <h3 className={`text-lg font-semibold mb-2 ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{t('noReportsFound')}</h3>
                        <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                          {t('tryAdjustingYourSearchCriteriaOrFilters')}
                        </p>
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
      </div>
    </div>
  );
};

export default LabReportsModule;