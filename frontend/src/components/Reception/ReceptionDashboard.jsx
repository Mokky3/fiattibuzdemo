import React, { useState, useEffect } from 'react'
import { ReceptionistHeader } from './ReceptionHeader'
import CalendarSidebar from '../Doctors/Dashboard/Calendar'
import { FiUserPlus, FiClipboard, FiCheckCircle, FiClock, FiPhone, FiUser, FiCalendar, FiSearch, FiBell, FiX, FiCheck, FiAlertCircle, FiEdit3 } from 'react-icons/fi'

const ReceptionistDashboard = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [tasks, setTasks] = useState([
    { id: 1, task: 'Verify patient insurance for 11:00 AM visit', completed: false, priority: 'high' },
    { id: 2, task: 'Print reports for cardiology', completed: true, priority: 'medium' },
    { id: 3, task: 'Prepare files for new intake', completed: false, priority: 'low' },
    { id: 4, task: 'Call patient to confirm tomorrow appointment', completed: false, priority: 'high' }
  ])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    { title: 'Total Appointments Today', value: 24, icon: <FiClipboard className="text-xl text-[#4DB6B0]" />, change: '+3 from yesterday' },
    { title: 'Patients Checked In', value: 18, icon: <FiCheckCircle className="text-xl text-[#4DB6B0]" />, change: '75% completion rate' },
    { title: 'Walk-Ins Registered', value: 6, icon: <FiUserPlus className="text-xl text-[#4DB6B0]" />, change: '+2 from average' },
    { title: 'Waiting Patients', value: 4, icon: <FiClock className="text-xl text-orange-500" />, change: 'Avg wait: 12 min' }
  ]

  const upcomingAppointments = [
    { id: 1, time: '10:30 AM', patient: 'Sarah Johnson', doctor: 'Dr. Smith', type: 'Check-up', status: 'confirmed' },
    { id: 2, time: '11:00 AM', patient: 'Michael Brown', doctor: 'Dr. Wilson', type: 'Follow-up', status: 'waiting' },
    { id: 3, time: '11:30 AM', patient: 'Emma Davis', doctor: 'Dr. Johnson', type: 'Consultation', status: 'confirmed' },
    { id: 4, time: '12:00 PM', patient: 'David Lee', doctor: 'Dr. Smith', type: 'Procedure', status: 'pending' }
  ]

  const notifications = [
    { id: 1, message: 'New walk-in patient registered', time: '5 min ago', type: 'info' },
    { id: 2, message: 'Dr. Smith running 15 minutes late', time: '10 min ago', type: 'warning' },
    { id: 3, message: 'Insurance verification needed', time: '20 min ago', type: 'urgent' }
  ]

  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ))
  }

  const getStatusColor = (status) => {
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
        
        {/* Header with Search and Quick Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 sm:mb-6 space-y-4 lg:space-y-0">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Reception Dashboard</h2>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-auto">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent text-sm"
              />
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <button className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg flex items-center justify-center sm:justify-start space-x-2 transition-colors text-sm">
                <FiUserPlus className="text-sm" />
                <span>New Patient</span>
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:text-[#4DB6B0] relative w-full sm:w-auto"
                >
                  <FiBell className="text-xl" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
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
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          {/* Left Sidebar: Calendar */}
          <div className="lg:w-1/4 space-y-4 sm:space-y-6">
            <CalendarSidebar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              currentDate={selectedDate}
              onMonthChange={setSelectedDate}
              appointments={[]} // Optional hook later
            />
            
            {/* Quick Stats Summary */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm sm:text-base">Quick Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Total Today</span>
                  <span className="font-semibold text-[#4DB6B0] text-sm sm:text-base">24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600 text-sm sm:text-base">18</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Pending</span>
                  <span className="font-semibold text-orange-600 text-sm sm:text-base">6</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div className="bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] h-2 rounded-full" style={{width: '75%'}}></div>
                </div>
                <p className="text-xs text-gray-500 text-center">75% Complete</p>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:w-3/4 space-y-6 sm:space-y-10">
            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {stats.map((s, idx) => (
                <div key={idx} className="p-4 sm:p-6 rounded-xl bg-white border border-gray-100 shadow hover:shadow-lg hover:scale-[1.02] transition-all">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div>{s.icon}</div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-800">{s.value}</div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">{s.title}</div>
                  <div className="text-xs text-gray-500">{s.change}</div>
                </div>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
              {/* Upcoming Appointments */}
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">Upcoming Appointments</h3>
                  <FiCalendar className="text-[#4DB6B0]" />
                </div>
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] transition-colors">
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
                      <div className="text-xs sm:text-sm text-gray-500">
                        {apt.doctor} • {apt.type}
                      </div>
                    </div>
                  ))}
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
                  {tasks.map((t) => (
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
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow border border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <button className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
                  <FiPhone className="text-xl sm:text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
                  <span className="text-xs sm:text-sm font-medium">Call Patient</span>
                </button>
                <button className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
                  <FiUserPlus className="text-xl sm:text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
                  <span className="text-xs sm:text-sm font-medium">Register Walk-In</span>
                </button>
                <button className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
                  <FiClipboard className="text-xl sm:text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
                  <span className="text-xs sm:text-sm font-medium">Print Reports</span>
                </button>
                <button className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
                  <FiCalendar className="text-xl sm:text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
                  <span className="text-xs sm:text-sm font-medium">Schedule Appointment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceptionistDashboard