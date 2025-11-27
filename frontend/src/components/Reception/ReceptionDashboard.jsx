import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ReceptionistHeader } from './ReceptionHeader'
import CalendarSidebar from '../Doctors/Dashboard/Calendar'
import { FiUserPlus, FiClipboard, FiCheckCircle, FiClock, FiPhone, FiUser, FiCalendar, FiSearch, FiBell, FiX, FiCheck, FiAlertCircle, FiEdit3, FiRefreshCw } from 'react-icons/fi'
import { receptionAPI } from '../../services/apiService'
import { useNavigate } from 'react-router-dom'

const ReceptionistDashboard = () => {
  const { t } = useTranslation()
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [tasks, setTasks] = useState([])
  const [quickOverview, setQuickOverview] = useState({ total_today: 0, completed: 0, pending: 0, completion_rate: 0 })
  const [statsCards, setStatsCards] = useState([
    { title: 'Total Appointments Today', value: 0, icon: <FiClipboard className="text-xl text-[#4DB6B0]" />, change: '' },
    { title: 'Patients Checked In', value: 0, icon: <FiCheckCircle className="text-xl text-[#4DB6B0]" />, change: '' },
    { title: 'Walk-Ins Registered', value: 0, icon: <FiUserPlus className="text-xl text-[#4DB6B0]" />, change: '' },
    { title: 'Waiting Patients', value: 0, icon: <FiClock className="text-xl text-orange-500" />, change: '' }
  ])
  const [quickActions, setQuickActions] = useState(null)
  
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

  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        console.log('Loading reception dashboard data...')
        
        // Check if user is authenticated
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        if (!token || !user) {
          console.error('No authentication token found. Redirecting to login...')
          alert('You are not logged in. Please log in again.')
          window.location.href = '/login'
          return
        }
        
        console.log('Token exists:', !!token)
        console.log('User exists:', !!user)
        
        const [overview, upcoming, notifs, tasksResp, qa] = await Promise.all([
          receptionAPI.getQuickOverview(),
          receptionAPI.getUpcoming(4, 24),
          receptionAPI.getNotifications({ limit: 5 }),
          receptionAPI.getTasks({ limit: 6 }),
          receptionAPI.getQuickActions()
        ])

        console.log('API responses:', { overview, upcoming, notifs, tasksResp, qa })

        // Update stats cards with real data
        setStatsCards([
          { title: t('totalAppointmentsToday'), value: overview.total_today || 0, icon: <FiClipboard className={`text-xl ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`} />, change: '' },
          { title: t('patientsCheckedIn'), value: overview.completed || 0, icon: <FiCheckCircle className={`text-xl ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`} />, change: `${overview.completion_rate || 0}% ${t('completion')}` },
          { title: t('walkInsRegistered'), value: Math.max(0, (overview.total_today || 0) - (overview.completed || 0)), icon: <FiUserPlus className={`text-xl ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`} />, change: '' },
          { title: t('waitingPatients'), value: overview.pending || 0, icon: <FiClock className={`text-xl ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />, change: '' }
        ])

        // Update quick overview
        setQuickOverview({
          total_today: overview.total_today || 0,
          completed: overview.completed || 0,
          pending: overview.pending || 0,
          completion_rate: overview.completion_rate || 0
        })

        // Set data from API responses
        setUpcomingAppointments(upcoming || [])
        setNotifications(notifs || [])
        setTasks(tasksResp || [])
        setQuickActions(qa || null)

        console.log('Dashboard data loaded successfully')
      } catch (e) {
        console.error('Failed to load reception dashboard:', e)
        
        // Check if it's an authentication error
        const errorMessage = e?.message || String(e);
        if (errorMessage.includes('Authentication required') || 
            errorMessage.includes('Not authenticated') ||
            errorMessage.includes('Please log in')) {
          console.warn('Authentication error detected, redirecting to login...')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return
        }
        
        // Set fallback data on error
        setQuickOverview({ total_today: 0, completed: 0, pending: 0, completion_rate: 0 })
        setUpcomingAppointments([])
        setNotifications([])
        setTasks([])
        setQuickActions(null)
        
        // Show error message to user (only if not redirecting)
        console.error('Dashboard load error:', errorMessage)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  

  const [upcomingAppointments, setUpcomingAppointments] = useState([])

  const [notifications, setNotifications] = useState([])

  const handleMarkArrived = async (appointmentId) => {
    if (!appointmentId) {
      console.error('No appointment ID provided')
      return
    }

    try {
      setIsLoading(true)
      await receptionAPI.markPatientArrived(appointmentId)
      
      // Refresh the appointments list
      const upcoming = await receptionAPI.getUpcoming(4, 24)
      setUpcomingAppointments(upcoming || [])
      
      // Also refresh overview to update stats
      const overview = await receptionAPI.getQuickOverview()
      setQuickOverview({
        total_today: overview.total_today || 0,
        completed: overview.completed || 0,
        pending: overview.pending || 0,
        completion_rate: overview.completion_rate || 0
      })
      
      console.log('Patient marked as arrived successfully')
    } catch (error) {
      console.error('Failed to mark patient as arrived:', error)
      alert(error?.message || 'Failed to mark patient as arrived. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    try {
      setIsLoading(true)
      console.log('Refreshing dashboard data...')
      const [overview, upcoming, notifs, tasksResp, qa] = await Promise.all([
        receptionAPI.getQuickOverview(),
        receptionAPI.getUpcoming(4, 24),
        receptionAPI.getNotifications({ limit: 5 }),
        receptionAPI.getTasks({ limit: 6 }),
        receptionAPI.getQuickActions()
      ])
      
      console.log('Refreshed data:', { overview, upcoming, notifs, tasksResp, qa })

      setStatsCards([
        { title: t('totalAppointmentsToday'), value: overview.total_today || 0, icon: <FiClipboard className={`text-xl ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`} />, change: '' },
        { title: t('patientsCheckedIn'), value: overview.completed || 0, icon: <FiCheckCircle className={`text-xl ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`} />, change: `${overview.completion_rate || 0}% ${t('completion')}` },
        { title: t('walkInsRegistered'), value: Math.max(0, (overview.total_today || 0) - (overview.completed || 0)), icon: <FiUserPlus className={`text-xl ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`} />, change: '' },
        { title: t('waitingPatients'), value: overview.pending || 0, icon: <FiClock className={`text-xl ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />, change: '' }
      ])

      setQuickOverview({
        total_today: overview.total_today || 0,
        completed: overview.completed || 0,
        pending: overview.pending || 0,
        completion_rate: overview.completion_rate || 0
      })

      setUpcomingAppointments(upcoming || [])
      setNotifications(notifs || [])
      setTasks(tasksResp || [])
      setQuickActions(qa || null)
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTask = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) {
        console.warn('Task not found:', taskId)
        return
      }

      // Optimistically update UI
      const newCompletedState = !task.completed
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, completed: newCompletedState } : t
      ))

      // Update task on backend
      const updatedTask = await receptionAPI.updateTask(taskId, { 
        completed: newCompletedState 
      })
      
      // Refresh tasks from backend to ensure consistency
      const refreshedTasks = await receptionAPI.getTasks({ limit: 6 })
      setTasks(refreshedTasks || [])
      
      console.log('Task updated successfully:', updatedTask)
    } catch (error) {
      console.error('Failed to update task:', error)
      // Revert the change on error by refreshing from backend
      try {
        const refreshedTasks = await receptionAPI.getTasks({ limit: 6 })
        setTasks(refreshedTasks || [])
      } catch (refreshError) {
        console.error('Failed to refresh tasks:', refreshError)
        // Fallback: revert to original state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, completed: task.completed } : task
      ))
      }
      alert(error?.message || 'Failed to update task. Please try again.')
    }
  }

  const getStatusColor = (status) => {
    // Handle both FHIR statuses and frontend statuses
    const statusLower = (status || '').toLowerCase()
    if (statusLower === 'arrived' || statusLower === 'checked-in') {
      return darkMode ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-green-100 text-green-800'
    }
    switch (status) {
      case 'confirmed': return darkMode ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-green-100 text-green-800'
      case 'waiting': return darkMode ? 'bg-yellow-900 bg-opacity-30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
      case 'pending': return darkMode ? 'bg-red-900 bg-opacity-30 text-red-300' : 'bg-red-100 text-red-800'
      default: return darkMode ? 'bg-[#133037] text-[#8AA2A7]' : 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return darkMode ? 'border-l-red-500' : 'border-l-red-500'
      case 'medium': return darkMode ? 'border-l-yellow-500' : 'border-l-yellow-500'
      case 'low': return darkMode ? 'border-l-green-500' : 'border-l-green-500'
      default: return darkMode ? 'border-l-[#133037]' : 'border-l-gray-300'
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <ReceptionistHeader />

      <div className={`max-w-screen-xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 transition-colors ${
            darkMode ? 'bg-[#050C0F]/80 backdrop-blur-sm' : 'bg-black bg-opacity-50'
          }`}>
            <div className={`p-6 rounded-lg shadow-lg flex items-center space-x-3 transition-colors ${
              darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
            }`}>
              <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${
                darkMode ? 'border-[#79CAC2]' : 'border-[#4DB6B0]'
              }`}></div>
              <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'}>{t('loadingDashboardData')}</span>
            </div>
          </div>
        )}
        
        {/* Header with Search and Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h2 className={`text-xl sm:text-2xl font-bold ${
            darkMode
              ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent'
          }`}>{t('receptionDashboard')}</h2>

          {/* Search Bar */}
          <div className="relative order-3 w-full md:order-2 md:flex-1 md:max-w-xl">
            <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder={t('searchPatients')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0]'
              }`}
            />
          </div>

          {/* Quick Actions */}
          <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3">
            <button 
              onClick={refreshData} 
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm disabled:opacity-50 ${
                darkMode
                  ? 'bg-[#0D2026] border border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <FiRefreshCw className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </button>
            <button 
              onClick={() => navigate('/reception/register')} 
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
              }`}
            >
              <FiUserPlus className="text-sm" />
              <span>{t('newPatient')}</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 relative transition-colors ${
                  darkMode
                    ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                    : 'text-gray-600 hover:text-[#4DB6B0]'
                }`}
              >
                <FiBell className="text-xl" />
                <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ${
                  darkMode ? 'bg-red-500' : 'bg-red-500'
                }`}>
                  {quickActions?.unread_notifications ?? notifications.length}
                </span>
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50 transition-colors ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className={`p-4 border-b flex justify-between items-center transition-colors ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    <h3 className={`font-semibold text-sm ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                    }`}>{t('notifications')}</h3>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className={darkMode ? 'text-[#8AA2A7] hover:text-[#C1D9DD]' : 'text-gray-400 hover:text-gray-600'}
                    >
                      <FiX />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-3 border-b transition-colors ${
                            darkMode
                              ? 'border-[#133037] hover:bg-[#133037]'
                              : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <FiAlertCircle className={`mt-1 text-sm ${
                              notif.type === 'urgent' 
                                ? darkMode ? 'text-red-400' : 'text-red-500'
                                : notif.type === 'warning'
                                ? darkMode ? 'text-yellow-400' : 'text-yellow-500'
                                : darkMode ? 'text-blue-400' : 'text-blue-500'
                            }`} />
                            <div className="flex-1">
                              <p className={`text-sm ${
                                darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                              }`}>{notif.message}</p>
                              <p className={`text-xs mt-1 ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                              }`}>{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`p-4 text-center text-sm ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        {t('noNotifications')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-120px)] gap-4 sm:gap-6">
          {/* Left Sidebar: Calendar and Quick Actions */}
          <div className={`w-80 border-r overflow-y-auto transition-colors ${
            darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
          }`}>
            <div className="p-4 sm:p-6 space-y-6">
              {/* Calendar */}
              <div className={`rounded-lg border p-4 transition-colors ${
                darkMode ? 'bg-[#07181D] border-[#133037]' : 'bg-white border-gray-100'
              }`}>
            <CalendarSidebar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              currentDate={selectedDate}
              onMonthChange={setSelectedDate}
              appointments={[]} // Optional hook later
              darkMode={darkMode}
            />
              </div>
            
              {/* Quick Actions */}
              <div className={`rounded-lg border p-4 transition-colors ${
                darkMode ? 'bg-[#07181D] border-[#133037]' : 'bg-white border-gray-100'
              }`}>
                <h3 className={`text-base sm:text-lg font-semibold mb-4 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                }`}>{t('quickActions')}</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => navigate('/reception/register')} 
                    className={`p-3 rounded-lg border transition-colors group flex items-center space-x-3 ${
                      darkMode
                        ? 'bg-[#0D2026] border-[#133037] text-[#C1D9DD] hover:border-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'
                    }`}
                  >
                    <FiUserPlus className={`text-xl ${
                      darkMode
                        ? 'text-[#79CAC2] group-hover:text-[#050C0F]'
                        : 'text-[#4DB6B0] group-hover:text-white'
                    }`} />
                    <span className="text-sm font-medium">{t('registerWalkIn')}</span>
                  </button>
                  <button 
                    className={`p-3 rounded-lg border transition-colors group flex items-center space-x-3 ${
                      darkMode
                        ? 'bg-[#0D2026] border-[#133037] text-[#C1D9DD] hover:border-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'
                    }`}
                  >
                    <FiClipboard className={`text-xl ${
                      darkMode
                        ? 'text-[#79CAC2] group-hover:text-[#050C0F]'
                        : 'text-[#4DB6B0] group-hover:text-white'
                    }`} />
                    <span className="text-sm font-medium">{t('printReports')}</span>
                  </button>
                  <button 
                    className={`p-3 rounded-lg border transition-colors group flex items-center space-x-3 ${
                      darkMode
                        ? 'bg-[#0D2026] border-[#133037] text-[#C1D9DD] hover:border-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'
                    }`}
                  >
                    <FiCalendar className={`text-xl ${
                      darkMode
                        ? 'text-[#79CAC2] group-hover:text-[#050C0F]'
                        : 'text-[#4DB6B0] group-hover:text-white'
                    }`} />
                    <span className="text-sm font-medium">{t('scheduleAppointment')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Upcoming Appointments */}
              <div className={`p-4 sm:p-6 rounded-xl shadow border transition-colors ${
                darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base sm:text-lg font-semibold ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('upcomingAppointments')}</h3>
                  <FiCalendar className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                </div>
                <div className="space-y-3">
                    {upcomingAppointments.length > 0 ? (
                      upcomingAppointments.map((apt) => (
                        <div 
                          key={apt.id || apt.appointment_id} 
                          className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                            darkMode
                              ? 'bg-[#07181D] border-[#133037] hover:border-[#79CAC2]'
                              : 'bg-white border-gray-200 hover:border-[#4DB6B0]'
                          }`}
                        >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <FiClock className={`text-sm ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`} />
                          <span className={`font-medium text-sm sm:text-base ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                          }`}>{apt.time}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                          {t(apt.status === 'checked-in' ? 'checkedIn' : apt.status === 'arrived' ? 'arrived' : apt.status || 'pending')}
                        </span>
                      </div>
                      <div className={`flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-sm mb-1 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                      }`}>
                        <FiUser className="text-xs" />
                        <span className="text-xs sm:text-sm">{apt.patient}</span>
                      </div>
                          <div className={`text-xs sm:text-sm mb-2 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>
                        {apt.doctor} • {apt.type}
                          </div>
                          {apt.status !== 'checked-in' && apt.status !== 'arrived' && (
                            <button
                              onClick={() => handleMarkArrived(apt.appointment_id || apt.id)}
                              className={`w-full mt-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                                darkMode
                                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                                  : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
                              }`}
                            >
                              <FiCheckCircle className="text-sm" />
                              <span>{t('markAsArrived')}</span>
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-8 text-sm ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        {t('noUpcomingAppointments')}
                      </div>
                    )}
                </div>
              </div>

              {/* Enhanced To-Do Tasks */}
              <div className={`p-4 sm:p-6 rounded-xl shadow border transition-colors ${
                darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base sm:text-lg font-semibold ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('todaysTasks')}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs sm:text-sm px-2 py-1 rounded-full ${
                      darkMode
                        ? 'bg-blue-900 bg-opacity-30 text-blue-300'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {tasks.filter(t => !t.completed).length} {t('pending')}
                    </span>
                    <button className={`p-1 transition-colors ${
                      darkMode
                        ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                        : 'text-gray-400 hover:text-[#4DB6B0]'
                    }`}>
                      <FiEdit3 className="text-sm" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                    {tasks.length > 0 ? (
                      tasks.map((t) => (
                    <div 
                      key={t.id} 
                      className={`p-3 sm:p-4 rounded-lg border-l-4 transition ${getPriorityColor(t.priority)} ${
                        t.completed
                          ? darkMode
                            ? 'bg-green-900 bg-opacity-30 border-green-500'
                            : 'bg-green-50 border-green-200'
                          : darkMode
                          ? 'bg-[#07181D] border-[#133037]'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                          <button
                            onClick={() => toggleTask(t.id)}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              t.completed 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : darkMode
                                ? 'border-[#133037] hover:border-[#79CAC2]'
                                : 'border-gray-300 hover:border-[#4DB6B0]'
                            }`}
                          >
                            {t.completed && <FiCheck className="text-xs" />}
                          </button>
                          <span className={`flex-1 text-xs sm:text-sm ${
                            t.completed
                              ? darkMode ? 'text-[#8AA2A7] line-through' : 'text-gray-500 line-through'
                              : darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                          }`}>
                            {t.task}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          t.priority === 'high'
                            ? darkMode ? 'bg-red-900 bg-opacity-30 text-red-300' : 'bg-red-100 text-red-700'
                            : t.priority === 'medium'
                            ? darkMode ? 'bg-yellow-900 bg-opacity-30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                            : darkMode ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-green-100 text-green-700'
                        }`}>
                          {t(t.priority)}
                        </span>
                      </div>
                    </div>
                      ))
                    ) : (
                      <div className={`text-center py-8 text-sm ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                      }`}>
                        {t('noTasksForToday')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceptionistDashboard