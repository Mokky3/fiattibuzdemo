import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import { 
  Filter,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { patientRecordsAPI } from '../../services/apiService';
import { handlePatientAuthError } from '../../utils/patientAuth';

const Records = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);

  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Filter categories with translations
  const filterCategories = [
    { key: 'Medical card', name: t('patientRecords.filterMedicalCard'), color: 'bg-emerald-400', active: true },
    { key: 'Consultations', name: t('patientRecords.filterConsultations'), color: 'bg-gray-100', active: false },
    { key: 'Radiology', name: t('patientRecords.filterRadiology'), color: 'bg-gray-100', active: false },
    { key: 'Dermatologist', name: t('patientRecords.filterDermatologist'), color: 'bg-gray-100', active: false },
    { key: 'Cardiologist', name: t('patientRecords.filterCardiologist'), color: 'bg-gray-100', active: false },
    { key: 'Psychologist', name: t('patientRecords.filterPsychologist'), color: 'bg-gray-100', active: false },
    { key: 'Allergist', name: t('patientRecords.filterAllergist'), color: 'bg-gray-100', active: false },
    { key: 'pregnancy', name: t('patientRecords.filterPregnancy'), color: 'bg-gray-100', active: false },
    { key: 'Therapist', name: t('patientRecords.filterTherapist'), color: 'bg-gray-100', active: false },
    { key: 'Surgery', name: t('patientRecords.filterSurgery'), color: 'bg-gray-100', active: false },
    { key: 'Dentist', name: t('patientRecords.filterDentist'), color: 'bg-gray-100', active: false },
    { key: 'Diagnosis', name: t('patientRecords.filterDiagnosis'), color: 'bg-gray-100', active: false }
  ];

  const [selectedFilter, setSelectedFilter] = useState('Medical card');

  const filterMap = {
    'Medical card': 'all',
    'Consultations': 'consultation',
    'Radiology': 'imaging',
    'Dermatologist': 'imaging',
    'Cardiologist': 'consultation',
    'Psychologist': 'consultation',
    'Allergist': 'lab',
    'pregnancy': 'document',
    'Therapist': 'consultation',
    'Surgery': 'document',
    'Dentist': 'consultation',
    'Diagnosis': 'diagnostic'
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const recordType = filterMap[selectedFilter] || 'all';
        const { items, total: t } = await patientRecordsAPI.list({ recordType, page: currentPage, size: recordsPerPage });
        setRecords(items);
        setTotal(t);
      } catch (e) {
        // Handle authentication errors and redirect if needed
        if (handlePatientAuthError(e)) {
          return; // Redirected, exit early
        }
        
        setError(e?.message || t('patientRecords.errorLoadFailed'));
        setRecords([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedFilter, currentPage, recordsPerPage]);

  const totalPages = Math.max(1, Math.ceil(total / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, total);
  const currentRecords = records;

  const handleFilterChange = (filterName) => {
    setSelectedFilter(filterName);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handleSummaryClick = (record) => {
    // Navigate to the record summary page with the record data
    navigate(`/patient/records/${record.id}`, { state: { record } });
  };

  const handleDownload = async (record) => {
    try {
      await patientRecordsAPI.download(record.id);
    } catch (err) {
      console.error('Error downloading record:', err);
      alert(t('patientRecords.errorDownloadFailed'));
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Filters */}
          <div className="w-80 flex-shrink-0">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6`}>
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <Filter className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`} />
                <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('patientRecords.filterRecords')}</h3>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {filterCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => handleFilterChange(category.key)}
                    className={`
                      w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 border text-xs sm:text-sm
                      ${selectedFilter === category.key 
                        ? darkMode 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                          : 'bg-emerald-400 text-white border-emerald-400 shadow-md'
                        : darkMode 
                          ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:border-gray-500' 
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }
                    `}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area - Records */}
          <div className="flex-1 min-w-0">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} overflow-hidden`}>
              {/* Header */}
              <div className={`${darkMode ? 'bg-emerald-700' : 'bg-emerald-400'} px-4 sm:px-6 py-3 sm:py-4`}>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  {filterCategories.find(cat => cat.key === selectedFilter)?.name || selectedFilter}
                </h2>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {error && (
                  <div className={`px-4 py-3 text-sm border-b ${
                    darkMode 
                      ? 'bg-red-900/30 border-red-700 text-red-300' 
                      : 'text-red-700 bg-red-100 border-red-200'
                  }`}>{error}</div>
                )}
                {loading && !error && (
                  <div className={`px-4 py-3 text-sm border-b ${darkMode ? 'text-gray-400 border-gray-700' : 'text-gray-600'}`}>{t('patientRecords.loadingRecords')}</div>
                )}
                <table className="w-full">
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-emerald-100'}>
                    <tr>
                      <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t('patientRecords.date')}</th>
                      <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t('patientRecords.recordType')}</th>
                      <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t('patientRecords.description')}</th>
                      <th className={`px-3 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t('patientRecords.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                    {(!loading && currentRecords.length === 0) && (
                      <tr>
                        <td colSpan={4} className={`px-3 sm:px-6 py-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('patientRecords.noRecordsFound')}</td>
                      </tr>
                    )}
                    {currentRecords.map((record, index) => (
                      <tr key={record.id} className={`${index % 2 === 0 
                        ? darkMode ? 'bg-gray-800' : 'bg-white' 
                        : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                      } ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'} transition-colors`}>
                        <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {record.date}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`font-medium text-xs sm:text-sm cursor-pointer underline ${
                            darkMode 
                              ? 'text-blue-400 hover:text-blue-300' 
                              : 'text-blue-600 hover:text-blue-800'
                          }`}>
                            {record.recordType}
                          </span>
                        </td>
                        <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div>
                            <div className="font-medium">{record.description}</div>
                            <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {record.doctor} • {record.hospital}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-col sm:flex-row justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <button 
                              onClick={() => handleSummaryClick(record)}
                              className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-400 hover:bg-emerald-500'} text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors text-xs sm:text-sm font-medium flex items-center justify-center space-x-1`}
                            >
                              <FileText className="h-2 w-2 sm:h-3 sm:w-3" />
                              <span>{t('patientRecords.summary')}</span>
                            </button>
                            <button 
                              onClick={() => handleDownload(record)}
                              className={`${darkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-400 hover:bg-gray-500'} text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors text-xs sm:text-sm font-medium flex items-center justify-center space-x-1`}
                            >
                              <Download className="h-2 w-2 sm:h-3 sm:w-3" />
                              <span>{t('patientRecords.download')}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} px-4 sm:px-6 py-3 sm:py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className={`text-xs sm:text-sm text-center sm:text-left ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t('patientRecords.showingRecords', { start: total === 0 ? 0 : startIndex + 1, end: endIndex, total })}
                  </div>
                  
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <button 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 ${
                        darkMode 
                          ? 'border-gray-600 hover:bg-gray-600' 
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span className="hidden sm:inline">{t('patientRecords.previous')}</span>
                    </button>
                    
                    {generatePageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                        disabled={page === '...'}
                        className={`
                          px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md
                          ${page === currentPage 
                            ? darkMode 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-emerald-400 text-white border-emerald-400'
                            : page === '...' 
                              ? 'border-transparent cursor-default' 
                              : darkMode 
                                ? 'border-gray-600 hover:bg-gray-600' 
                                : 'border-gray-300 hover:bg-gray-100'
                          }
                        `}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 ${
                        darkMode 
                          ? 'border-gray-600 hover:bg-gray-600' 
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span className="hidden sm:inline">{t('patientRecords.next')}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Records;
