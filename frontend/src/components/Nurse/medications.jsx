import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, AlertTriangle, Eye, Pill, Calendar, MoreVertical } from 'lucide-react';
import NurseHeader from './header';
import { getMedications, administerMedication, skipMedication } from '../../services/nurseService';

const NurseMedicationsModule = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    given: 0,
    pending: 0,
    'due-soon': 0,
    overdue: 0,
    skipped: 0
  });

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await getMedications({ 
          date: selectedDate,
          status: statusFilter,
          search: searchTerm 
        })
        if (active) {
          // Handle both array response and object with items
          if (Array.isArray(response)) {
            setMedications(response)
            // Calculate status counts from array
            const counts = response.reduce((acc, med) => {
              acc[med.status] = (acc[med.status] || 0) + 1
              acc.total = (acc.total || 0) + 1
              return acc
            }, { total: 0, given: 0, pending: 0, 'due-soon': 0, overdue: 0, skipped: 0 })
            setStatusCounts(counts)
          } else if (response && response.items) {
            setMedications(response.items)
            setStatusCounts({
              total: response.total || response.items.length,
              given: response.given || 0,
              pending: response.pending || 0,
              'due-soon': response.dueSoon || 0,
              overdue: response.overdue || 0,
              skipped: response.skipped || 0
            })
          } else {
            setMedications([])
            setStatusCounts({ total: 0, given: 0, pending: 0, 'due-soon': 0, overdue: 0, skipped: 0 })
          }
        }
      } catch (e) {
        console.error('Error loading medications:', e)
        if (active) {
          setMedications([])
          setStatusCounts({ total: 0, given: 0, pending: 0, 'due-soon': 0, overdue: 0, skipped: 0 })
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [selectedDate, statusFilter, searchTerm])

  const onAdminister = async (med) => {
    try {
      const response = await administerMedication(med.id)
      if (response && response.data) {
        // Update the medication with the response from backend
        setMedications(prev => prev.map(m => m.id === med.id ? response.data : m))
        // Refresh the data to get updated status counts
        const updatedResponse = await getMedications({ 
          date: selectedDate,
          status: statusFilter,
          search: searchTerm 
        })
        if (updatedResponse && updatedResponse.items) {
          setStatusCounts({
            total: updatedResponse.total || updatedResponse.items.length,
            given: updatedResponse.given || 0,
            pending: updatedResponse.pending || 0,
            'due-soon': updatedResponse.dueSoon || 0,
            overdue: updatedResponse.overdue || 0,
            skipped: updatedResponse.skipped || 0
          })
        }
      }
    } catch (e) {
      console.error('Error administering medication:', e)
    }
  }
  
  const onSkip = async (med) => {
    try {
      const response = await skipMedication(med.id, 'Skipped via UI')
      if (response && response.data) {
        // Update the medication with the response from backend
        setMedications(prev => prev.map(m => m.id === med.id ? response.data : m))
        // Refresh the data to get updated status counts
        const updatedResponse = await getMedications({ 
          date: selectedDate,
          status: statusFilter,
          search: searchTerm 
        })
        if (updatedResponse && updatedResponse.items) {
          setStatusCounts({
            total: updatedResponse.total || updatedResponse.items.length,
            given: updatedResponse.given || 0,
            pending: updatedResponse.pending || 0,
            'due-soon': updatedResponse.dueSoon || 0,
            overdue: updatedResponse.overdue || 0,
            skipped: updatedResponse.skipped || 0
          })
        }
      }
    } catch (e) {
      console.error('Error skipping medication:', e)
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'given':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'due-soon':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'skipped':
        return <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">S</span>
        </div>;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status, statusTime) => {
    switch(status) {
      case 'given':
        return `Given at ${statusTime}`;
      case 'pending':
        return 'Pending';
      case 'due-soon':
        return 'Due soon';
      case 'overdue':
        return 'Overdue';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'given':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'due-soon':
        return 'bg-orange-100 text-orange-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSkipFromMenu = async (medication) => {
    setOpenMenuId(null);
    await onSkip(medication);
  };

  const getActionButton = (status, medication) => {
    const isMenuOpen = openMenuId === medication.id;
    
    switch(status) {
      case 'given':
        return (
          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50">
            View
          </button>
        );
      case 'pending':
      case 'due-soon':
      case 'overdue':
        return (
          <div className="flex items-center space-x-2 relative">
            <button 
              onClick={() => onAdminister(medication)} 
              className="bg-[#5ACCC3] text-white px-3 py-1 rounded text-sm hover:bg-teal-600 flex items-center"
            >
              <Pill className="w-3 h-3 mr-1" />
              Administer
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : medication.id);
                }}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setOpenMenuId(null)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSkipFromMenu(medication);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <span className="mr-2">⏭️</span>
                        Skip Medication
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case 'skipped':
        return (
          <button onClick={() => onSkip(medication)} className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600">
            Reason
          </button>
        );
      default:
        return (
          <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
            View
          </button>
        );
    }
  };

  // Since we're now filtering on the backend, we can use medications directly
  const filteredMedications = medications;

  return (
    <div className="min-h-screen bg-gray-50">
      <NurseHeader />
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#5ACCC3] flex items-center">
              <Pill className="mr-3 h-6 w-6" />
              Medication Administration
            </h1>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button className="bg-[#5ACCC3] text-white px-4 py-2 rounded hover:bg-teal-600 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : statusCounts.given || 0}
              </div>
              <div className="text-sm text-gray-600">Given</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-2xl font-bold text-yellow-600">
                {loading ? '...' : statusCounts.pending || 0}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
              <div className="text-2xl font-bold text-orange-600">
                {loading ? '...' : statusCounts['due-soon'] || 0}
              </div>
              <div className="text-sm text-gray-600">Due Soon</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">
                {loading ? '...' : statusCounts.overdue || 0}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
              <div className="text-2xl font-bold text-gray-600">
                {loading ? '...' : statusCounts.skipped || 0}
              </div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#5ACCC3]">
              <div className="text-2xl font-bold text-[#5ACCC3]">
                {loading ? '...' : statusCounts.total || 0}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search patient, medication, or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="due-soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="given">Given</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
        </div>

        {/* Medications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading medications...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Medication</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Dosage</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Frequency</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Route</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Time to Administer</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMedications.map((med) => (
                    <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{med.patient}</div>
                          <div className="text-sm text-gray-500">Room {med.room}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{med.medication}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{med.dosage}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{med.frequency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{med.route}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{med.timeToAdminister}</div>
                        {med.nextDue && med.nextDue !== 'PRN' && (
                          <div className="text-xs text-gray-500">Next: {med.nextDue}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(med.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(med.status)}`}>
                            {getStatusText(med.status, med.statusTime)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionButton(med.status, med)}
                      </td>
                    </tr>
                  ))}
                  {filteredMedications.length === 0 && !loading && (
                    <tr>
                      <td className="px-6 py-8 text-center text-gray-500" colSpan={8}>
                        {searchTerm || statusFilter !== 'all' 
                          ? 'No medications found matching your criteria' 
                          : 'No medications found for the selected date'
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          {loading ? (
            'Loading...'
          ) : (
            `Showing ${filteredMedications.length} of ${statusCounts.total} medications for ${selectedDate}`
          )}
        </div>
      </div>
    </div>
  );
};

export default NurseMedicationsModule;