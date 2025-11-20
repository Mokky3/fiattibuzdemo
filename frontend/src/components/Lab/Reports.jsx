import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, FileText, Download, Eye, Calendar, Clock, CheckCircle, AlertTriangle, BarChart3, TrendingUp, Printer, Mail, Share2, Plus, Users, Activity, PieChart } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getReports, getReportResults } from '../../services/labService';

const LabReportsModule = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Helper function to render structured test data
  const renderTestData = (result) => {
    const testData = result.attachments?.fullTestData || result.attachments?.panel_data?.fullTestData || {};
    const testType = testData.testType || result.attachments?.testType;
    
    // For cytogenetics tests
    if (testType === 'conventional_karyotyping') {
      return (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
          <h5 className="font-semibold text-gray-900 mb-3">Karyotyping Details</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testData.specimenType && (
              <div>
                <span className="text-sm text-gray-600">Specimen Type:</span>
                <div className="font-medium text-gray-900">{testData.specimenType}</div>
              </div>
            )}
            {testData.cultureType && (
              <div>
                <span className="text-sm text-gray-600">Culture Type:</span>
                <div className="font-medium text-gray-900">{testData.cultureType}</div>
              </div>
            )}
            {testData.totalMetaphases && (
              <div>
                <span className="text-sm text-gray-600">Total Metaphases Analyzed:</span>
                <div className="font-medium text-gray-900">{testData.totalMetaphases}</div>
              </div>
            )}
            {testData.normalMetaphases !== undefined && (
              <div>
                <span className="text-sm text-gray-600">Normal Metaphases:</span>
                <div className="font-medium text-gray-900">{testData.normalMetaphases}</div>
              </div>
            )}
            {testData.abnormalMetaphases !== undefined && (
              <div>
                <span className="text-sm text-gray-600">Abnormal Metaphases:</span>
                <div className="font-medium text-gray-900">{testData.abnormalMetaphases}</div>
              </div>
            )}
            {testData.modalChromosomeNumber && (
              <div>
                <span className="text-sm text-gray-600">Modal Chromosome Number:</span>
                <div className="font-medium text-gray-900">{testData.modalChromosomeNumber}</div>
              </div>
            )}
          </div>
          {testData.karyotypeResult && (
            <div className="mt-3">
              <span className="text-sm text-gray-600">Karyotype Result (ISCN):</span>
              <div className="font-medium text-gray-900 mt-1 bg-blue-50 p-2 rounded">{testData.karyotypeResult}</div>
            </div>
          )}
          {testData.interpretation && (
            <div className="mt-3">
              <span className="text-sm text-gray-600">Interpretation:</span>
              <div className="text-sm text-gray-900 mt-1">{testData.interpretation}</div>
            </div>
          )}
          {testData.conclusion && (
            <div className="mt-3">
              <span className="text-sm text-gray-600">Conclusion:</span>
              <div className="font-medium text-gray-900 mt-1">{testData.conclusion}</div>
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
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3">Test Parameters</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Parameter</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Result</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Reference Range</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parameters.map((param, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{param.name || param.code || `Parameter ${idx + 1}`}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {param.resultValue || param.percentValue || param.absoluteValue || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{param.unit || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{param.ref || param.ref_percent || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {param.isAbnormal ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            param.abnormalityType === 'high' || param.abnormalityType === 'HIGH' ? 'bg-yellow-100 text-yellow-800' :
                            param.abnormalityType === 'low' || param.abnormalityType === 'LOW' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {param.abnormalityType || 'Abnormal'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Normal</span>
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
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3">Test Details</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayFields.map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null;
                if (typeof value === 'object' && !Array.isArray(value)) return null; // Skip nested objects
                return (
                  <div key={key}>
                    <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <div className="font-medium text-gray-900 mt-1">
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

      {/* Generation Info */}
      <div className="mb-6">
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
              <span className="text-gray-600">Period:</span>
              <span className="font-medium">{report.period}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Recipients</h3>
        <div className="flex flex-wrap gap-2">
          {/* Always show patient name if available */}
          {report.patientInfo && report.patientInfo.name && (
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              {report.patientInfo.name}
            </span>
          )}
          {/* Show other recipients */}
          {report.recipients && report.recipients.map((recipient, index) => (
            <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
              {recipient}
            </span>
          ))}
        </div>
      </div>

      {/* Data Summary (if available) */}
      {report.data && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 border-l-4 border-teal-500 pl-3 text-sm">Report Data Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(report.data)
              .filter(([key]) => key.toLowerCase() !== 'resultids') // Remove resultIds
              .map(([key, value]) => (
                <div key={key} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-600 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-sm font-semibold text-gray-900">{value}</div>
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

      {/* Test Results */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Test Results</h3>
        {loadingResults ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading test results...</div>
          </div>
        ) : reportResults.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="text-gray-500">No test results found for this report.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {reportResults.map((result, index) => (
              <div key={result.id || index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{result.testName}</h4>
                    {result.testCode && (
                      <p className="text-sm text-gray-600">Code: {result.testCode}</p>
                    )}
                    {result.panelName && (
                      <p className="text-sm text-gray-600">Panel: {result.panelName}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.isAbnormal && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.abnormalityType === 'HIGH' ? 'bg-yellow-100 text-yellow-800' :
                        result.abnormalityType === 'LOW' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.abnormalityType || 'Abnormal'}
                      </span>
                    )}
                    {result.isCritical && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Critical
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-sm text-gray-600">Result Value:</span>
                    <div className="font-medium text-gray-900">
                      {result.resultValue} {result.resultUnit && <span className="text-gray-600">({result.resultUnit})</span>}
                    </div>
                  </div>
                  {result.referenceRange && (
                    <div>
                      <span className="text-sm text-gray-600">Reference Range:</span>
                      <div className="font-medium text-gray-900">{result.referenceRange}</div>
                    </div>
                  )}
                  {result.testCategory && (
                    <div>
                      <span className="text-sm text-gray-600">Category:</span>
                      <div className="font-medium text-gray-900">{result.testCategory}</div>
                    </div>
                  )}
                  {result.status && (
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <div className="font-medium text-gray-900 capitalize">{result.status.toLowerCase()}</div>
                    </div>
                  )}
                </div>

                {result.interpretation && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Interpretation:</span>
                    <div className="text-sm text-gray-900 mt-1">{result.interpretation}</div>
                  </div>
                )}

                {result.comments && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Comments:</span>
                    <div className="text-sm text-gray-900 mt-1">{result.comments}</div>
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
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-teal-600 hover:text-teal-700 font-medium">
                            View Raw Test Data
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Statistics Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">Report Statistics</h3>
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="w-6 h-6 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
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
                  <PieChart className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-purple-600">{stats.templates}</div>
                <div className="text-sm text-gray-600">Templates</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Download className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalDownloads}</div>
                <div className="text-sm text-gray-600">Downloads</div>
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
      </div>
    </div>
  );
};

export default LabReportsModule;