import React, { useState } from 'react';
import { Search, Filter, Clock, CheckCircle, AlertTriangle, Eye, Pill, Calendar } from 'lucide-react';
import NurseHeader from './header';

const NurseMedicationsModule = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('2025-06-28');

  // Sample medications data
  const medications = [
    {
      id: 1,
      patient: 'John Doe',
      room: '101A',
      medication: 'Paracetamol',
      dosage: '500 mg',
      frequency: 'Every 6 hrs',
      route: 'Oral',
      timeToAdminister: '08:00, 14:00, 20:00',
      status: 'given',
      statusTime: '08:01',
      nextDue: '14:00'
    },
    {
      id: 2,
      patient: 'Sarah Lee',
      room: '102B',
      medication: 'Ceftriaxone',
      dosage: '1 g',
      frequency: 'Once daily',
      route: 'IV',
      timeToAdminister: '10:00',
      status: 'pending',
      statusTime: null,
      nextDue: '10:00'
    },
    {
      id: 3,
      patient: 'Amir Rahimov',
      room: '103A',
      medication: 'Salbutamol',
      dosage: '2 puffs',
      frequency: 'PRN',
      route: 'Inhaler',
      timeToAdminister: 'As needed',
      status: 'skipped',
      statusTime: '09:00',
      nextDue: 'PRN'
    },
    {
      id: 4,
      patient: 'Lucy Zhang',
      room: '104B',
      medication: 'Metformin',
      dosage: '850 mg',
      frequency: 'Twice daily',
      route: 'Oral',
      timeToAdminister: '09:00, 21:00',
      status: 'given',
      statusTime: '09:05',
      nextDue: '21:00'
    },
    {
      id: 5,
      patient: 'Maria Lopez',
      room: '105A',
      medication: 'Insulin (Humalog)',
      dosage: '6 units',
      frequency: 'Before meals',
      route: 'SubQ',
      timeToAdminister: '12:30',
      status: 'due-soon',
      statusTime: null,
      nextDue: '12:30'
    },
    {
      id: 6,
      patient: 'Ahmed Hassan',
      room: '106B',
      medication: 'Lisinopril',
      dosage: '10 mg',
      frequency: 'Once daily',
      route: 'Oral',
      timeToAdminister: '08:00',
      status: 'overdue',
      statusTime: null,
      nextDue: '08:00'
    }
  ];

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

  const getActionButton = (status, medication) => {
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
          <button className="bg-[#5ACCC3] text-white px-3 py-1 rounded text-sm hover:bg-teal-600 flex items-center">
            <Pill className="w-3 h-3 mr-1" />
            Administer
          </button>
        );
      case 'skipped':
        return (
          <button className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600">
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

  const filteredMedications = medications.filter(med => {
    const matchesSearch = med.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         med.medication.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         med.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || med.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    return medications.reduce((acc, med) => {
      acc[med.status] = (acc[med.status] || 0) + 1;
      return acc;
    }, {});
  };

  const statusCounts = getStatusCounts();

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
              <div className="text-2xl font-bold text-green-600">{statusCounts.given || 0}</div>
              <div className="text-sm text-gray-600">Given</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
              <div className="text-2xl font-bold text-orange-600">{statusCounts['due-soon'] || 0}</div>
              <div className="text-sm text-gray-600">Due Soon</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{statusCounts.overdue || 0}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
              <div className="text-2xl font-bold text-gray-600">{statusCounts.skipped || 0}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#5ACCC3]">
              <div className="text-2xl font-bold text-[#5ACCC3]">{medications.length}</div>
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
            
            <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>

        {/* Medications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      {med.nextDue !== 'PRN' && (
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredMedications.length} of {medications.length} medications for {selectedDate}
        </div>
      </div>
    </div>
  );
};

export default NurseMedicationsModule;