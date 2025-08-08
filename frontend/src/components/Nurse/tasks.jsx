import React, { useState } from 'react';
import { Search, Filter, Clock, CheckCircle, AlertTriangle, Eye, Plus, Calendar, User, Clipboard, Flag, MoreVertical } from 'lucide-react';
import NurseHeader from './header';

const NurseTasksModule = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('2025-06-28');
  const [viewMode, setViewMode] = useState('table');

  // Sample tasks data
  const tasksData = [
    {
      id: 1,
      patient: 'John Doe',
      room: '101A',
      task: 'Wound dressing change',
      description: 'Change surgical wound dressing on abdomen',
      priority: 'high',
      status: 'pending',
      scheduledTime: '08:00',
      estimatedDuration: '15 min',
      assignedBy: 'Dr. Smith',
      category: 'wound-care',
      notes: 'Patient reports mild pain at incision site',
      completedTime: null,
      completedBy: null
    },
    {
      id: 2,
      patient: 'Sarah Lee',
      room: '102B',
      task: 'IV line check',
      description: 'Check IV patency and insertion site',
      priority: 'medium',
      status: 'completed',
      scheduledTime: '07:30',
      estimatedDuration: '5 min',
      assignedBy: 'Dr. Williams',
      category: 'iv-care',
      notes: 'IV site clean, no signs of infiltration',
      completedTime: '07:35',
      completedBy: 'Sarah Johnson'
    },
    {
      id: 3,
      patient: 'Amir Rahimov',
      room: '103A',
      task: 'Patient ambulation',
      description: 'Assist patient with walking exercise',
      priority: 'medium',
      status: 'in-progress',
      scheduledTime: '09:00',
      estimatedDuration: '20 min',
      assignedBy: 'Physical Therapist',
      category: 'mobility',
      notes: 'Patient requires walker assistance',
      completedTime: null,
      completedBy: null
    },
    {
      id: 4,
      patient: 'Lucy Zhang',
      room: '104B',
      task: 'Blood glucose check',
      description: 'Monitor blood glucose levels before lunch',
      priority: 'high',
      status: 'overdue',
      scheduledTime: '11:30',
      estimatedDuration: '5 min',
      assignedBy: 'Dr. Brown',
      category: 'monitoring',
      notes: 'Patient is diabetic, check before meals',
      completedTime: null,
      completedBy: null
    },
    {
      id: 5,
      patient: 'Maria Lopez',
      room: '105A',
      task: 'Discharge preparation',
      description: 'Prepare discharge paperwork and education',
      priority: 'low',
      status: 'pending',
      scheduledTime: '14:00',
      estimatedDuration: '30 min',
      assignedBy: 'Discharge Coordinator',
      category: 'discharge',
      notes: 'Patient discharge planned for tomorrow',
      completedTime: null,
      completedBy: null
    },
    {
      id: 6,
      patient: 'Ahmed Hassan',
      room: '106B',
      task: 'Pre-op preparation',
      description: 'Prepare patient for surgery - NPO status check',
      priority: 'high',
      status: 'completed',
      scheduledTime: '06:00',
      estimatedDuration: '25 min',
      assignedBy: 'Dr. Johnson',
      category: 'pre-op',
      notes: 'Patient NPO since midnight, IV started',
      completedTime: '06:20',
      completedBy: 'Night Nurse'
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'wound-care':
        return '🩹';
      case 'iv-care':
        return '💉';
      case 'mobility':
        return '🚶';
      case 'monitoring':
        return '📊';
      case 'discharge':
        return '🏠';
      case 'pre-op':
        return '🏥';
      default:
        return '📋';
    }
  };

  const getActionButton = (status, task) => {
    switch(status) {
      case 'completed':
        return (
          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 flex items-center">
            <Eye className="w-3 h-3 mr-1" />
            View
          </button>
        );
      case 'in-progress':
        return (
          <button className="bg-[#5ACCC3] text-white px-3 py-1 rounded text-sm hover:bg-teal-600 flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </button>
        );
      case 'pending':
      case 'overdue':
        return (
          <button className="bg-[#5ACCC3] text-white px-3 py-1 rounded text-sm hover:bg-teal-600 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Start
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

  const filteredTasks = tasksData.filter(task => {
    const matchesSearch = task.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusCounts = () => {
    return tasksData.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
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
              <Clipboard className="mr-3 h-6 w-6" />
              Nursing Tasks
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
                Add Task
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{statusCounts.completed || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{statusCounts['in-progress'] || 0}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{statusCounts.overdue || 0}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#5ACCC3]">
              <div className="text-2xl font-bold text-[#5ACCC3]">{tasksData.length}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
          </div>

          {/* Filters and View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search patient, task, or room..."
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
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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

        {/* Tasks Display */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Scheduled Time</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Assigned By</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{task.patient}</div>
                          <div className="text-sm text-gray-500">Room {task.room}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getCategoryIcon(task.category)}</span>
                          <div>
                            <div className="font-medium text-gray-900">{task.task}</div>
                            <div className="text-sm text-gray-500">{task.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          <Flag className="w-3 h-3 mr-1" />
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{task.scheduledTime}</div>
                        <div className="text-xs text-gray-500">{selectedDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{task.estimatedDuration}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{task.assignedBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(task.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                        </div>
                        {task.completedTime && (
                          <div className="text-xs text-gray-500 mt-1">
                            Completed at {task.completedTime}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionButton(task.status, task)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getCategoryIcon(task.category)}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{task.patient}</h3>
                      <p className="text-sm text-gray-500">Room {task.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(task.status)}
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-1">{task.task}</h4>
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      <span>{task.scheduledTime}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-400">•</span>
                      <span className="ml-1">{task.estimatedDuration}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                </div>

                {task.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                    <span className="font-medium text-gray-700">Notes: </span>
                    <span className="text-gray-600">{task.notes}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Assigned by: {task.assignedBy}
                  </span>
                  {getActionButton(task.status, task)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-6 text-sm text-gray-600 text-center">
          Showing {filteredTasks.length} of {tasksData.length} tasks for {selectedDate}
        </div>
      </div>
    </div>
  );
};

export default NurseTasksModule;