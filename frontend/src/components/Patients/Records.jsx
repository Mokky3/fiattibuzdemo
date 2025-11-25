import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('Medical card');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);

  const filterCategories = [
    { name: 'Medical card', color: 'bg-emerald-400', active: true },
    { name: 'Consultations', color: 'bg-gray-100', active: false },
    { name: 'Radiology', color: 'bg-gray-100', active: false },
    { name: 'Dermatologist', color: 'bg-gray-100', active: false },
    { name: 'Cardiologist', color: 'bg-gray-100', active: false },
    { name: 'Psychologist', color: 'bg-gray-100', active: false },
    { name: 'Allergist', color: 'bg-gray-100', active: false },
    { name: 'pregnancy', color: 'bg-gray-100', active: false },
    { name: 'Therapist', color: 'bg-gray-100', active: false },
    { name: 'Surgery', color: 'bg-gray-100', active: false },
    { name: 'Dentist', color: 'bg-gray-100', active: false },
    { name: 'Diagnosis', color: 'bg-gray-100', active: false }
  ];

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
        
        setError(e?.message || 'Failed to load records');
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
      alert('Failed to download record. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Filters */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Filter records</h3>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {filterCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => handleFilterChange(category.name)}
                    className={`
                      w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 border text-xs sm:text-sm
                      ${selectedFilter === category.name 
                        ? 'bg-emerald-400 text-white border-emerald-400 shadow-md' 
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-emerald-400 px-4 sm:px-6 py-3 sm:py-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">{selectedFilter}</h2>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {error && (
                  <div className="px-4 py-3 text-sm text-red-700 bg-red-100 border-b border-red-200">{error}</div>
                )}
                {loading && !error && (
                  <div className="px-4 py-3 text-sm text-gray-600 border-b">Loading records...</div>
                )}
                <table className="w-full">
                  <thead className="bg-emerald-100">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-800">Date</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-800">Record type</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-800">Description</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold text-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(!loading && currentRecords.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-3 sm:px-6 py-6 text-center text-sm text-gray-500">No records found</td>
                      </tr>
                    )}
                    {currentRecords.map((record, index) => (
                      <tr key={record.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-emerald-50 transition-colors`}>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-800 font-medium">
                          {record.date}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm cursor-pointer underline">
                            {record.recordType}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                          <div>
                            <div className="font-medium">{record.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {record.doctor} • {record.hospital}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-col sm:flex-row justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <button 
                              onClick={() => handleSummaryClick(record)}
                              className="bg-emerald-400 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md hover:bg-emerald-500 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center space-x-1"
                            >
                              <FileText className="h-2 w-2 sm:h-3 sm:w-3" />
                              <span>summary</span>
                            </button>
                            <button 
                              onClick={() => handleDownload(record)}
                              className="bg-gray-400 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md hover:bg-gray-500 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center space-x-1"
                            >
                              <Download className="h-2 w-2 sm:h-3 sm:w-3" />
                              <span>download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                    Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of {total} records
                  </div>
                  
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <button 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    
                    {generatePageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                        disabled={page === '...'}
                        className={`
                          px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md
                          ${page === currentPage 
                            ? 'bg-emerald-400 text-white border-emerald-400' 
                            : page === '...' 
                              ? 'border-transparent cursor-default' 
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
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <span className="hidden sm:inline">Next</span>
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
