import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Clock, CheckCircle, AlertTriangle, Eye, Plus, Calendar, User, Clipboard, Flag, MoreVertical } from 'lucide-react';
import NurseHeader from './header';
import { getTasks, updateTaskStatus } from '../../services/nurseService';

const NurseTasksModule = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('table');
  
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

  const [tasksData, setTasksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await getTasks({ 
          search: searchTerm,
          status: statusFilter,
          priority: priorityFilter,
          date_filter: selectedDate
        })
        if (active) {
          // Handle both array response and object with items
          if (Array.isArray(response)) {
            setTasksData(response)
            setTotal(response.length)
          } else if (response && response.items) {
            setTasksData(response.items)
            setTotal(response.total || response.items.length)
          } else {
            setTasksData([])
            setTotal(0)
          }
        }
      } catch (e) {
        console.error('Error loading tasks:', e)
        if (active) {
          setTasksData([])
          setTotal(0)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [searchTerm, statusFilter, priorityFilter, selectedDate])

  const onStart = async (task) => {
    try {
      await updateTaskStatus(task.id, 'in-progress')
      setTasksData(prev => prev.map(t => t.id === task.id ? { ...t, status: 'in-progress' } : t))
    } catch (e) {}
  }
  const onComplete = async (task) => {
    try {
      await updateTaskStatus(task.id, 'completed')
      setTasksData(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' } : t))
    } catch (e) {}
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return darkMode ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-green-100 text-green-800';
      case 'in-progress':
        return darkMode ? 'bg-blue-900 bg-opacity-30 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'pending':
        return darkMode ? 'bg-yellow-900 bg-opacity-30 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return darkMode ? 'bg-red-900 bg-opacity-30 text-red-300' : 'bg-red-100 text-red-800';
      default:
        return darkMode ? 'bg-[#133037] text-[#8AA2A7]' : 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high':
        return darkMode ? 'bg-red-900 bg-opacity-30 text-red-300' : 'bg-red-100 text-red-800';
      case 'medium':
        return darkMode ? 'bg-yellow-900 bg-opacity-30 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'low':
        return darkMode ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-green-100 text-green-800';
      default:
        return darkMode ? 'bg-[#133037] text-[#8AA2A7]' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed':
        return <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />;
      case 'in-progress':
        return <Clock className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />;
      case 'pending':
        return <Clock className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />;
      case 'overdue':
        return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />;
      default:
        return <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />;
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
          <button className={`border px-3 py-1 rounded text-sm flex items-center transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            <Eye className="w-3 h-3 mr-1" />
            {t('view')}
          </button>
        );
      case 'in-progress':
        return (
          <button 
            onClick={() => onComplete(task)} 
            className={`px-3 py-1 rounded text-sm flex items-center transition-colors ${
              darkMode
                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                : 'bg-[#5ACCC3] text-white hover:bg-teal-600'
            }`}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('complete')}
          </button>
        );
      case 'pending':
      case 'overdue':
        return (
          <button 
            onClick={() => onStart(task)} 
            className={`px-3 py-1 rounded text-sm flex items-center transition-colors ${
              darkMode
                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                : 'bg-[#5ACCC3] text-white hover:bg-teal-600'
            }`}
          >
            <Clock className="w-3 h-3 mr-1" />
            {t('start')}
          </button>
        );
      default:
        return (
          <button className={`px-3 py-1 rounded text-sm transition-colors ${
            darkMode
              ? 'bg-[#133037] text-[#C1D9DD] hover:bg-[#1a3d44]'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}>
            {t('view')}
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
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <NurseHeader />
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-2xl font-bold flex items-center ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
            }`}>
              <Clipboard className="mr-3 h-6 w-6" />
              {t('nursingTasks')}
            </h1>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                }`}
              />
              <button className={`px-4 py-2 rounded flex items-center transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-teal-600'
              }`}>
                <Plus className="w-4 h-4 mr-2" />
                {t('addTask')}
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-green-500 border-[#133037]'
                : 'bg-white border-green-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`}>{statusCounts.completed || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('completed')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-blue-500 border-[#133037]'
                : 'bg-white border-blue-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>{statusCounts['in-progress'] || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('inProgress')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-yellow-500 border-[#133037]'
                : 'bg-white border-yellow-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`}>{statusCounts.pending || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('pending')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-red-500 border-[#133037]'
                : 'bg-white border-red-500'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`}>{statusCounts.overdue || 0}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('overdue')}</div>
            </div>
            <div className={`p-4 rounded-lg shadow border-l-4 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-[#79CAC2] border-[#133037]'
                : 'bg-white border-[#5ACCC3]'
            }`}>
              <div className={`text-2xl font-bold ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
              }`}>{total}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
              }`}>{t('totalTasks')}</div>
            </div>
          </div>

          {/* Filters and View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder={t('searchPatientTaskOrRoom')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3]'
                  }`}
                />
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`} />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                }`}
              >
                <option value="all">{t('allStatus')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="in-progress">{t('inProgress')}</option>
                <option value="completed">{t('completed')}</option>
                <option value="overdue">{t('overdue')}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                }`}
              >
                <option value="all">{t('allPriority')}</option>
                <option value="high">{t('high')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="low">{t('low')}</option>
              </select>
              
              <button className={`flex items-center px-3 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
                <Filter className="w-4 h-4 mr-2" />
                {t('filter')}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded transition-colors ${
                  viewMode === 'table'
                    ? darkMode
                      ? 'bg-[#79CAC2] text-[#050C0F]'
                      : 'bg-[#5ACCC3] text-white'
                    : darkMode
                    ? 'bg-[#0D2026] border border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('table')}
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded transition-colors ${
                  viewMode === 'cards'
                    ? darkMode
                      ? 'bg-[#79CAC2] text-[#050C0F]'
                      : 'bg-[#5ACCC3] text-white'
                    : darkMode
                    ? 'bg-[#0D2026] border border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('cards')}
              </button>
            </div>
          </div>
        </div>

        {/* Tasks Display */}
        {viewMode === 'table' ? (
          <div className={`rounded-lg shadow overflow-hidden transition-colors ${
            darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b transition-colors ${
                  darkMode ? 'bg-[#07181D] border-[#133037]' : 'bg-gray-50 border-gray-200'
                }`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('patient')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('task')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('priority')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('scheduledTime')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('duration')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('assignedBy')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('status')}</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('action')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${
                  darkMode ? 'divide-[#133037]' : 'divide-gray-200 bg-white'
                }`}>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className={`px-6 py-8 text-center ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        <div className="flex items-center justify-center">
                          <div className={`animate-spin rounded-full h-6 w-6 border-b-2 mr-2 ${
                            darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
                          }`}></div>
                          {t('loadingTasks')}
                        </div>
                      </td>
                    </tr>
                  ) : filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="8" className={`px-6 py-8 text-center ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        {t('noTasksFound')}
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                    <tr key={task.id} className={`transition-colors ${
                      darkMode ? 'hover:bg-[#133037]' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className={`font-medium ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>{task.patient}</div>
                          <div className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('room')} {task.room}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getCategoryIcon(task.category)}</span>
                          <div>
                            <div className={`font-medium ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{task.task}</div>
                            <div className={`text-sm ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                            }`}>{task.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          <Flag className="w-3 h-3 mr-1" />
                          {t(task.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{task.scheduledTime}</div>
                        <div className={`text-xs ${
                          darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                        }`}>{selectedDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{task.estimatedDuration}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{task.assignedBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(task.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {t(task.status === 'in-progress' ? 'inProgress' : task.status)}
                          </span>
                        </div>
                        {task.completedTime && (
                          <div className={`text-xs mt-1 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>
                            {t('completedAt', { time: task.completedTime })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionButton(task.status, task)}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className={`flex items-center ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>
                  <div className={`animate-spin rounded-full h-6 w-6 border-b-2 mr-2 ${
                    darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
                  }`}></div>
                  {t('loadingTasks')}
                </div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className={`col-span-full text-center py-12 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                {t('noTasksFound')}
              </div>
            ) : (
              filteredTasks.map((task) => (
              <div key={task.id} className={`rounded-lg shadow p-6 hover:shadow-lg transition-all ${
                darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getCategoryIcon(task.category)}</span>
                    <div>
                      <h3 className={`font-bold ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{task.patient}</h3>
                      <p className={`text-sm ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>{t('room')} {task.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(task.status)}
                    <button className={`transition-colors ${
                      darkMode ? 'text-[#8AA2A7] hover:text-[#C1D9DD]' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className={`font-semibold mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{task.task}</h4>
                  <p className={`text-sm mb-3 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>{task.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <Clock className={`w-4 h-4 mr-1 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                      }`} />
                      <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{task.scheduledTime}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'}>•</span>
                      <span className={`ml-1 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{task.estimatedDuration}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {t(task.priority)}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {t(task.status === 'in-progress' ? 'inProgress' : task.status)}
                  </span>
                </div>

                {task.notes && (
                  <div className={`mb-4 p-3 rounded text-sm ${
                    darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                  }`}>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('notes')}: </span>
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{task.notes}</span>
                  </div>
                )}
                
                <div className={`flex justify-between items-center pt-4 border-t ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <span className={`text-xs ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>
                    {t('assignedBy')}: {task.assignedBy}
                  </span>
                  {getActionButton(task.status, task)}
                </div>
              </div>
              ))
            )}
          </div>
        )}

        {/* Summary Footer */}
        <div className={`mt-6 text-sm text-center ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
        }`}>
          {t('showingTasks', { 
            count: filteredTasks.length, 
            total: total, 
            date: selectedDate 
          })}
        </div>
      </div>
    </div>
  );
};

export default NurseTasksModule;