import React, { useState } from 'react';
import { 
  Search, 
  Bell,
  User,
  Filter,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Records = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Medical card');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const filterCategories = [
    { name: 'Medical card', color: 'bg-emerald-400', active: true },
    { name: 'Consultations', color: 'bg-gray-100', active: false },
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

  const medicalRecords = [
    {
      id: 1,
      date: '03.06.2025',
      recordType: 'Consultation',
      description: 'yearly check up',
      doctor: 'Dr. Abdulla Karimov',
      hospital: 'Akfa Medline'
    },
    {
      id: 2,
      date: '03.06.2025',
      recordType: 'Psychologist',
      description: 'Anxiety problems',
      doctor: 'Dr. Parvina Sultanova',
      hospital: 'Republican Research Center'
    },
    {
      id: 3,
      date: '15.05.2025',
      recordType: 'Cardiologist',
      description: 'Heart examination',
      doctor: 'Dr. Abdulla Karimov',
      hospital: 'Akfa Medline'
    },
    {
      id: 4,
      date: '10.05.2025',
      recordType: 'Dermatologist',
      description: 'Skin condition checkup',
      doctor: 'Dr. Gulnoza Rahimova',
      hospital: 'Tashkent Medical City'
    },
    {
      id: 5,
      date: '28.04.2025',
      recordType: 'Surgery',
      description: 'Minor surgical procedure',
      doctor: 'Dr. Rustam Qodirov',
      hospital: 'Seoul National University Hospital'
    },
    {
      id: 6,
      date: '20.04.2025',
      recordType: 'Dentist',
      description: 'Dental cleaning and checkup',
      doctor: 'Dr. Nodir Azizov',
      hospital: 'International Clinic Tashkent'
    },
    {
      id: 7,
      date: '15.04.2025',
      recordType: 'Therapist',
      description: 'Physical therapy session',
      doctor: 'Dr. Mavluda Sharipova',
      hospital: 'Akfa Medline'
    },
    {
      id: 8,
      date: '08.04.2025',
      recordType: 'Allergist',
      description: 'Allergy testing and consultation',
      doctor: 'Dr. Jasur Nabiev',
      hospital: 'Republican Research Center'
    }
  ];

  const totalPages = Math.ceil(medicalRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = medicalRecords.slice(startIndex, endIndex);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <nav className="bg-emerald-400 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="text-white text-xl font-bold">FIATTIR</div>
              <div className="hidden md:flex items-center space-x-6">
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  APPOINTMENT
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  RECORDS
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  PRESCRIPTION
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  INSURANCE
                </a>
                <a href="#" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  HOSPITAL
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/20 text-white placeholder-white/70 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              </div>
              <button className="text-white hover:text-emerald-100">
                <Bell className="h-5 w-5" />
              </button>
              <div className="bg-emerald-600 rounded-full p-2">
                <User className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Filter className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-gray-800">Filter records</h3>
              </div>
              
              <div className="space-y-3">
                {filterCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => handleFilterChange(category.name)}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border
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

          {/* Right Content - Medical Records */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-emerald-400 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Medical card</h2>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-emerald-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800">Record type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800">Description</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentRecords.map((record, index) => (
                      <tr key={record.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-emerald-50 transition-colors`}>
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                          {record.date}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-blue-600 hover:text-blue-800 font-medium text-sm cursor-pointer underline">
                            {record.recordType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>
                            <div className="font-medium">{record.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {record.doctor} • {record.hospital}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center space-x-2">
                            <button className="bg-emerald-400 text-white px-3 py-1.5 rounded-md hover:bg-emerald-500 transition-colors text-sm font-medium flex items-center space-x-1">
                              <FileText className="h-3 w-3" />
                              <span>summary</span>
                            </button>
                            <button className="bg-gray-400 text-white px-3 py-1.5 rounded-md hover:bg-gray-500 transition-colors text-sm font-medium flex items-center space-x-1">
                              <Download className="h-3 w-3" />
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
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, medicalRecords.length)} of {medicalRecords.length} records
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span>Previous</span>
                    </button>
                    
                    {generatePageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                        disabled={page === '...'}
                        className={`
                          px-3 py-1 text-sm border rounded-md
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
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <span>Next</span>
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
