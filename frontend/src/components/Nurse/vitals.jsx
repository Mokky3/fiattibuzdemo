import React, { useState } from 'react';
import { Search, Filter, Thermometer, Heart, Activity, Droplets, Eye, Plus, Calendar, Clock, User, TrendingUp, AlertTriangle } from 'lucide-react';
import NurseHeader from './header';

const NurseVitalsModule = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('2025-06-28');
  const [viewMode, setViewMode] = useState('table'); // table or cards

  // Sample vitals data
  const vitalsData = [
    {
      id: 1,
      patient: 'John Doe',
      room: '101A',
      time: '14:00',
      date: '28.06.2025',
      temperature: '36.8°C',
      bloodPressure: '120/80',
      heartRate: '72',
      respiratory: '16',
      oxygenSat: '98%',
      pain: '3/10',
      status: 'normal',
      nurse: 'Sarah Johnson',
      alerts: []
    },
    {
      id: 2,
      patient: 'Sarah Lee',
      room: '102B',
      time: '13:45',
      date: '28.06.2025',
      temperature: '38.2°C',
      bloodPressure: '135/90',
      heartRate: '88',
      respiratory: '20',
      oxygenSat: '96%',
      pain: '5/10',
      status: 'abnormal',
      nurse: 'Sarah Johnson',
      alerts: ['High Temperature', 'Elevated BP']
    },
    {
      id: 3,
      patient: 'Amir Rahimov',
      room: '103A',
      time: '13:30',
      date: '28.06.2025',
      temperature: '36.5°C',
      bloodPressure: '110/70',
      heartRate: '65',
      respiratory: '14',
      oxygenSat: '99%',
      pain: '2/10',
      status: 'normal',
      nurse: 'Sarah Johnson',
      alerts: []
    },
    {
      id: 4,
      patient: 'Lucy Zhang',
      room: '104B',
      time: '13:15',
      date: '28.06.2025',
      temperature: '37.1°C',
      bloodPressure: '125/82',
      heartRate: '78',
      respiratory: '18',
      oxygenSat: '97%',
      pain: '4/10',
      status: 'attention',
      nurse: 'Sarah Johnson',
      alerts: ['Slightly Elevated Temp']
    },
    {
      id: 5,
      patient: 'Maria Lopez',
      room: '105A',
      time: '12:00',
      date: '28.06.2025',
      temperature: '36.7°C',
      bloodPressure: '118/75',
      heartRate: '70',
      respiratory: '16',
      oxygenSat: '98%',
      pain: '1/10',
      status: 'normal',
      nurse: 'Sarah Johnson',
      alerts: []
    },
    {
      id: 6,
      patient: 'Ahmed Hassan',
      room: '106B',
      time: 'Due',
      date: '28.06.2025',
      temperature: '-',
      bloodPressure: '-',
      heartRate: '-',
      respiratory: '-',
      oxygenSat: '-',
      pain: '-',
      status: 'pending',
      nurse: '-',
      alerts: []
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'attention':
        return 'bg-yellow-100 text-yellow-800';
      case 'abnormal':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'normal':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'attention':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
      case 'abnormal':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-500" />;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  const getActionButton = (status, vital) => {
    if (status === 'pending') {
      return (
        <button className="bg-[#5ACCC3] text-white px-3 py-1 rounded text-sm hover:bg-teal-600 flex items-center">
          <Plus className="w-3 h-3 mr-1" />
          Record
        </button>
      );
    } else {
      return (
        <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 flex items-center">
          <Eye className="w-3 h-3 mr-1" />
          View
        </button>
      );
    }
  };

  const filteredVitals = vitalsData.filter(vital => {
    const matchesSearch = vital.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vital.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vital.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    return vitalsData.reduce((acc, vital) => {
      acc[vital.status] = (acc[vital.status] || 0) + 1;
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
              <Activity className="mr-3 h-6 w-6" />
              Vital Signs Management
            </h1>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
              />
              <button className="bg-[#5ACCC3] text-white px-4 py-2 rounded hover:bg-teal-600 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Record Vitals
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{statusCounts.normal || 0}</div>
              <div className="text-sm text-gray-600">Normal</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.attention || 0}</div>
              <div className="text-sm text-gray-600">Attention</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{statusCounts.abnormal || 0}</div>
              <div className="text-sm text-gray-600">Abnormal</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
              <div className="text-2xl font-bold text-gray-600">{statusCounts.pending || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#5ACCC3]">
              <div className="text-2xl font-bold text-[#5ACCC3]">{vitalsData.length}</div>
              <div className="text-sm text-gray-600">Total Patients</div>
            </div>
          </div>

          {/* Filters and View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search patient or room..."
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
                <option value="normal">Normal</option>
                <option value="attention">Attention</option>
                <option value="abnormal">Abnormal</option>
                <option value="pending">Pending</option>
              </select>
              
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded ${
                  viewMode === 'table' 
                    ? 'bg-[#5ACCC3] text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded ${
                  viewMode === 'cards' 
                    ? 'bg-[#5ACCC3] text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Vitals Display */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Temperature</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Blood Pressure</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Heart Rate</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Respiratory</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">O2 Sat</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Pain</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVitals.map((vital) => (
                    <tr key={vital.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{vital.patient}</div>
                          <div className="text-sm text-gray-500">Room {vital.room}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{vital.time}</div>
                        <div className="text-xs text-gray-500">{vital.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Thermometer className="w-4 h-4 mr-2 text-red-500" />
                          <span className="text-gray-900">{vital.temperature}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Activity className="w-4 h-4 mr-2 text-blue-500" />
                          <span className="text-gray-900">{vital.bloodPressure}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Heart className="w-4 h-4 mr-2 text-red-500" />
                          <span className="text-gray-900">{vital.heartRate}</span>
                          {vital.heartRate !== '-' && <span className="text-xs text-gray-500 ml-1">bpm</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{vital.respiratory}</div>
                        {vital.respiratory !== '-' && <div className="text-xs text-gray-500">/min</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Droplets className="w-4 h-4 mr-2 text-blue-500" />
                          <span className="text-gray-900">{vital.oxygenSat}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{vital.pain}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(vital.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vital.status)}`}>
                            {vital.status.charAt(0).toUpperCase() + vital.status.slice(1)}
                          </span>
                        </div>
                        {vital.alerts.length > 0 && (
                          <div className="mt-1">
                            {vital.alerts.map((alert, index) => (
                              <div key={index} className="flex items-center text-xs text-red-600">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {alert}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionButton(vital.status, vital)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVitals.map((vital) => (
              <div key={vital.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{vital.patient}</h3>
                    <p className="text-sm text-gray-500">Room {vital.room} • {vital.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(vital.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vital.status)}`}>
                      {vital.status.charAt(0).toUpperCase() + vital.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                {vital.status !== 'pending' ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Thermometer className="w-4 h-4 mr-2 text-red-500" />
                      <span>{vital.temperature}</span>
                    </div>
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-2 text-red-500" />
                      <span>{vital.heartRate} bpm</span>
                    </div>
                    <div className="flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-blue-500" />
                      <span>{vital.bloodPressure}</span>
                    </div>
                    <div className="flex items-center">
                      <Droplets className="w-4 h-4 mr-2 text-blue-500" />
                      <span>{vital.oxygenSat}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <p>Vitals due for recording</p>
                  </div>
                )}
                
                {vital.alerts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {vital.alerts.map((alert, index) => (
                      <div key={index} className="flex items-center text-xs text-red-600 mb-1">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {alert}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {vital.nurse !== '-' ? `Recorded by: ${vital.nurse}` : 'Not recorded'}
                  </span>
                  {getActionButton(vital.status, vital)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-6 text-sm text-gray-600 text-center">
          Showing {filteredVitals.length} of {vitalsData.length} patients for {selectedDate}
        </div>
      </div>
    </div>
  );
};

export default NurseVitalsModule;