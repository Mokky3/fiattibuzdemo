import React, { useState, useEffect } from 'react'
import { ReceptionistHeader } from './ReceptionHeader'
import CalendarSidebar from '../Doctors/Dashboard/Calendar'
import { FiUserPlus, FiClipboard, FiCheckCircle, FiClock, FiPhone, FiUser, FiCalendar, FiSearch, FiBell, FiX, FiCheck, FiAlertCircle, FiEdit3, FiRefreshCw } from 'react-icons/fi'
import { receptionAPI } from '../../services/apiService'
import { useNavigate } from 'react-router-dom'

const ReceptionistDashboard = () => {
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
          { title: 'Total Appointments Today', value: overview.total_today || 0, icon: <FiClipboard className="text-xl text-[#4DB6B0]" />, change: '' },
          { title: 'Patients Checked In', value: overview.completed || 0, icon: <FiCheckCircle className="text-xl text-[#4DB6B0]" />, change: `${overview.completion_rate || 0}% completion` },
          { title: 'Walk-Ins Registered', value: Math.max(0, (overview.total_today || 0) - (overview.completed || 0)), icon: <FiUserPlus className="text-xl text-[#4DB6B0]" />, change: '' },
          { title: 'Waiting Patients', value: overview.pending || 0, icon: <FiClock className="text-xl text-orange-500" />, change: '' }
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
        { title: 'Total Appointments Today', value: overview.total_today || 0, icon: <FiClipboard className="text-xl text-[#4DB6B0]" />, change: '' },
        { title: 'Patients Checked In', value: overview.completed || 0, icon: <FiCheckCircle className="text-xl text-[#4DB6B0]" />, change: `${overview.completion_rate || 0}% completion` },
        { title: 'Walk-Ins Registered', value: Math.max(0, (overview.total_today || 0) - (overview.completed || 0)), icon: <FiUserPlus className="text-xl text-[#4DB6B0]" />, change: '' },
        { title: 'Waiting Patients', value: overview.pending || 0, icon: <FiClock className="text-xl text-orange-500" />, change: '' }
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
      return 'bg-green-100 text-green-800'
    }
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />

      <div className={`max-w-screen-xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4DB6B0]"></div>
              <span className="text-gray-700">Loading dashboard data...</span>
            </div>
          </div>
        )}
        
        {/* Header with Search and Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Reception Dashboard</h2>

          {/* Search Bar */}
          <div className="relative order-3 w-full md:order-2 md:flex-1 md:max-w-xl">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent text-sm"
            />
          </div>

          {/* Quick Actions */}
          <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3">
            <button 
              onClick={refreshData} 
              disabled={isLoading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm disabled:opacity-50"
            >
              <FiRefreshCw className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button onClick={() => navigate('/reception/register')} className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm">
              <FiUserPlus className="text-sm" />
              <span>New Patient</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-[#4DB6B0] relative"
              >
                <FiBell className="text-xl" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {quickActions?.unread_notifications ?? notifications.length}
                </span>
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 text-sm">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}>
                      <FiX className="text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <FiAlertCircle className={`mt-1 text-sm ${notif.type === 'urgent' ? 'text-red-500' : notif.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-120px)] gap-4 sm:gap-6">
          {/* Left Sidebar: Calendar and Quick Actions */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
              {/* Calendar */}
              <div className="bg-white rounded-lg border border-gray-100 p-4">
            <CalendarSidebar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              currentDate={selectedDate}
              onMonthChange={setSelectedDate}
              appointments={[]} // Optional hook later
            />
              </div>
            
              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-100 p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => navigate('/reception/register')} 
                    className="p-3 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group flex items-center space-x-3"
                  >
                    <FiUserPlus className="text-xl text-[#4DB6B0] group-hover:text-white" />
                    <span className="text-sm font-medium">Register Walk-In</span>
                  </button>
                  <button 
                    className="p-3 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group flex items-center space-x-3"
                  >
                    <FiClipboard className="text-xl text-[#4DB6B0] group-hover:text-white" />
                    <span className="text-sm font-medium">Print Reports</span>
                  </button>
                  <button 
                    className="p-3 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group flex items-center space-x-3"
                  >
                    <FiCalendar className="text-xl text-[#4DB6B0] group-hover:text-white" />
                    <span className="text-sm font-medium">Schedule Appointment</span>
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
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">Upcoming Appointments</h3>
                  <FiCalendar className="text-[#4DB6B0]" />
                </div>
                <div className="space-y-3">
                    {upcomingAppointments.length > 0 ? (
                      upcomingAppointments.map((apt) => (
                        <div key={apt.id || apt.appointment_id} className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <FiClock className="text-[#4DB6B0] text-sm" />
                          <span className="font-medium text-gray-800 text-sm sm:text-base">{apt.time}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-sm text-gray-600 mb-1">
                        <FiUser className="text-xs" />
                        <span className="text-xs sm:text-sm">{apt.patient}</span>
                      </div>
                          <div className="text-xs sm:text-sm text-gray-500 mb-2">
                        {apt.doctor} • {apt.type}
                          </div>
                          {apt.status !== 'checked-in' && apt.status !== 'arrived' && (
                            <button
                              onClick={() => handleMarkArrived(apt.appointment_id || apt.id)}
                              className="w-full mt-2 px-3 py-2 bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                            >
                              <FiCheckCircle className="text-sm" />
                              <span>Mark as Arrived</span>
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No upcoming appointments
                      </div>
                    )}
                </div>
              </div>

              {/* Enhanced To-Do Tasks */}
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">Today's Tasks</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {tasks.filter(t => !t.completed).length} pending
                    </span>
                    <button className="p-1 text-gray-400 hover:text-[#4DB6B0]">
                      <FiEdit3 className="text-sm" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                    {tasks.length > 0 ? (
                      tasks.map((t) => (
                    <div key={t.id} className={`p-3 sm:p-4 rounded-lg border-l-4 transition ${getPriorityColor(t.priority)} ${t.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                          <button
                            onClick={() => toggleTask(t.id)}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              t.completed 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'border-gray-300 hover:border-[#4DB6B0]'
                            }`}
                          >
                            {t.completed && <FiCheck className="text-xs" />}
                          </button>
                          <span className={`flex-1 text-xs sm:text-sm ${t.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                            {t.task}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          t.priority === 'high' ? 'bg-red-100 text-red-700' :
                          t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No tasks for today
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