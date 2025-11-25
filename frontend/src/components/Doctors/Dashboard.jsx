import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { useNavigate } from 'react-router-dom'
import { format, isSameDay, parseISO } from 'date-fns'
import CalendarSidebar from './Dashboard/Calendar'
import { dashboardAPI, isAuthenticated, getCurrentUser, doctorAppointmentsAPI, checkBackendHealth } from '../../services/apiService'

const Dashboard = () => {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoaded, setIsLoaded] = useState(false)

  const [appointments, setAppointments] = useState([])
  const [messages, setMessages] = useState([])
  const [todos, setTodos] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [user, setUser] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  
  // Modal state for viewing appointment details
  const [showViewAppointmentModal, setShowViewAppointmentModal] = useState(false)
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState(null)
  const [loadingAppointmentDetails, setLoadingAppointmentDetails] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check authentication first
        const isAuth = isAuthenticated()
        const currentUser = getCurrentUser()
        setAuthenticated(isAuth)
        setUser(currentUser)

        if (!isAuth) {
          setError('Please log in to access the dashboard')
          setLoading(false)
          return
        }

        // Check backend health
        const health = await fetch('http://localhost:8000/health').then(r => r.ok).catch(() => false)
        setBackendConnected(health)

        if (!health) {
          setError('Backend is not connected')
          setLoading(false)
          return
        }

        // Load data only if authenticated
        const [messagesData, todosData] = await Promise.all([
          dashboardAPI.getMessages().catch((err) => {
            console.error('Failed to load messages:', err)
            if (err.message.includes('Authentication required')) {
              setAuthenticated(false)
              setUser(null)
            }
            return []
          }),
          dashboardAPI.getTodos().catch((err) => {
            console.error('Failed to load todos:', err)
            if (err.message.includes('Authentication required')) {
              setAuthenticated(false)
              setUser(null)
            }
            return []
          })
        ])

        setMessages(messagesData)
        setTodos(todosData)
      } catch (err) {
        console.error('Failed to initialize data:', err)
        if (err.message.includes('Authentication required')) {
          setAuthenticated(false)
          setUser(null)
          setError('Please log in to access the dashboard')
        } else {
          setError('Failed to load initial data')
        }
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  useEffect(() => {
    const loadAllAppointments = async () => {
      try {
        setLoading(true)
        if (!backendConnected || !authenticated) return

        // Load all appointments using the same API as the Appointments page
        const response = await doctorAppointmentsAPI.listAll()
        console.log('Dashboard appointments API response:', response)
        
        if (response && response.data) {
          const rows = response.data
          console.log('Dashboard backend appointments:', rows)
          
          // Transform appointments to match the expected format
          const transformedAppointments = rows.map(apt => {
            // Safe date parsing with error handling
            let dateObj = null
            let formattedDate = ''
            
            if (apt.date) {
              try {
                // If apt.date is already in YYYY-MM-DD format, use it directly
                if (apt.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  dateObj = parseISO(`${apt.date}T00:00:00`)
                } else {
                  // Try to parse as-is first
                  dateObj = parseISO(apt.date)
                }
                
                if (dateObj && !isNaN(dateObj.getTime())) {
                  formattedDate = format(dateObj, 'dd.MM.yyyy')
                } else {
                  console.warn('Invalid date format:', apt.date)
                  formattedDate = 'Invalid Date'
                }
              } catch (error) {
                console.warn('Date parsing error:', error, 'for date:', apt.date)
                formattedDate = 'Invalid Date'
              }
            }
            
            const timeText = (apt.time || '').slice(0, 5) || '00:00'
            
            return {
              id: apt.id,
              date: dateObj,
              formattedDate: formattedDate,
              time: timeText,
              patient: apt.patient || apt.patient_name || 'Unknown Patient',
              problem: apt.problem || apt.appointment_type || 'General Consultation',
              description: apt.description || apt.notes || '',
              status: apt.status || 'pending',
              hospital: apt.hospital || apt.hospital_name || 'Main Hospital',
              provider: apt.provider || apt.doctor_specialization || 'General Medicine',
              patient_id: apt.patient_id,
              report_id: apt.report_id || apt.reportId || null
            }
          })
          
          console.log('Dashboard transformed appointments:', transformedAppointments)
          setAppointments(transformedAppointments)
        } else {
          console.log('Dashboard: No appointments data received')
          setAppointments([])
        }
      } catch (err) {
        console.error('Failed to load appointments:', err)
        if (err.message.includes('Authentication required')) {
          setAuthenticated(false)
          setUser(null)
          setError('Please log in to access the dashboard')
        } else {
          setError('Failed to load appointments')
        }
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    loadAllAppointments()
  }, [backendConnected, authenticated]) // Removed selectedDate dependency

  const handleDateClick = (day) => setSelectedDate(day)
  const handleMonthChange = (newDate) => {
    setCurrentDate(newDate)
    // Optionally reload appointments when month changes to ensure we have all data
    // This is optional since we're loading all appointments at once
  }

  // Handle viewing appointment details
  const handleViewAppointment = async (appointmentId) => {
    try {
      setLoadingAppointmentDetails(true)
      setShowViewAppointmentModal(true)
      
      if (backendConnected && authenticated) {
        const clinicId = localStorage.getItem('clinic_id') || 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'
        const appointmentDetails = await doctorAppointmentsAPI.getById({ 
          clinicId, 
          appointmentId 
        })
        console.log('Dashboard appointment details:', appointmentDetails)
        setSelectedAppointmentDetails(appointmentDetails)
      } else {
        setError('Backend not available. Cannot view appointment details.')
        setShowViewAppointmentModal(false)
      }
    } catch (err) {
      console.error('Error viewing appointment:', err)
      setError('Failed to load appointment details')
      setShowViewAppointmentModal(false)
    } finally {
      setLoadingAppointmentDetails(false)
    }
  }

  const toggleTodoCompletion = async (id) => {
    try {
      if (backendConnected && authenticated) {
        await dashboardAPI.toggleTodo(id)
        setTodos(todos.map(todo =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ))
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err)
      if (err.message.includes('Authentication required')) {
        setAuthenticated(false)
        setUser(null)
        setError('Please log in to access the dashboard')
      } else {
        setError('Failed to update todo')
      }
    }
  }

  // Helper function to compare dates using string format (robust across timezones)
  const sameDay = (a, b) => {
    if (!a || !b) return false
    return format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd')
  }

  const getAppointmentsForDate = (date) => {
    const filteredAppointments = appointments.filter(appointment =>
      appointment.date &&
      sameDay(appointment.date, date)
    )
    console.log(`Dashboard: Getting appointments for ${format(date, 'yyyy-MM-dd')}:`, {
      totalAppointments: appointments.length,
      filteredCount: filteredAppointments.length,
      appointments: appointments.map(apt => ({
        id: apt.id,
        date: apt.date ? format(apt.date, 'yyyy-MM-dd') : 'no-date',
        patient: apt.patient
      }))
    })
    return filteredAppointments
  }

  // Show login prompt if not authenticated
  if (!authenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access the doctor dashboard.</p>
            <button 
              onClick={() => window.location.href = '/signin'}
              className="w-full bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white py-3 px-6 rounded-lg font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50 focus:ring-offset-2"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      {/* Backend status indicator */}
      {!backendConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mx-2 sm:mx-4 mt-4 rounded">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Backend disconnected - showing mock data
          </div>
        </div>
      )}
      
      {/* Error banner */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-2 sm:mx-4 mt-4 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showSidebar ? '←' : '→'} Dashboard
            </button>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
              Doctor Dashboard
            </h2>
          </div>
        </div>

        {/* Mobile Overlay */}
        {showSidebar && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main Layout: Sidebar + Content */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className={`${showSidebar ? 'block' : 'hidden'} lg:block w-80 flex-shrink-0 relative z-30 lg:z-auto lg:relative fixed lg:static top-0 left-0 h-full lg:h-auto bg-white lg:bg-transparent p-4 lg:p-0 lg:shadow-none shadow-lg`}>
            {/* Calendar Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
              </div>
              <CalendarSidebar
                selectedDate={selectedDate}
                onDateSelect={handleDateClick}
                currentDate={currentDate}
                onMonthChange={handleMonthChange}
                appointments={appointments}
              />
            </div>
            
            {/* Messages Section */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                {backendConnected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.length > 0 ? messages.map((message, index) => (
                  <div 
                    key={message.id} 
                    className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white font-semibold mr-3 text-sm">
                        {message.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm truncate">{message.name}</div>
                        <div className="text-xs text-gray-500 truncate">{message.lastMessage}</div>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No messages available
                  </div>
                )}
              </div>
              <button className="mt-4 w-full py-2 bg-[#4DB6B0] text-white rounded-lg text-sm font-medium hover:bg-[#3DA6A0] transition-colors">
                View All Messages
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Appointments Section */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Appointments for {format(selectedDate, 'MMMM d, yyyy')}
                  </h2>
                  {backendConnected && (
                    <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {loading ? (
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                  <span className="text-sm text-gray-500">
                    {loading ? 'Loading...' : `${getAppointmentsForDate(selectedDate).length} appointments`}
                  </span>
                </div>
              </div>
            
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5ACCC3]"></div>
                  <span className="ml-3 text-gray-500">Loading appointments...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {getAppointmentsForDate(selectedDate).length > 0 ? (
                    getAppointmentsForDate(selectedDate).map((appointment, index) => (
                      <div 
                        key={appointment.id} 
                        className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                          <div className="col-span-1 sm:col-span-2">
                            <div className="bg-white border-2 border-[#5ACCC3] rounded-lg p-2 text-center">
                              <div className="font-bold text-sm text-[#5ACCC3]">{appointment.time}</div>
                              <div className="text-xs mt-0.5 text-[#5ACCC3]">{appointment.formattedDate || appointment.date || format(selectedDate, 'MMM d, yyyy')}</div>
                            </div>
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <div className="font-semibold text-gray-800">{appointment.patient}</div>
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                              {appointment.problem}
                            </span>
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-gray-600 text-sm">
                            {appointment.description}
                          </div>
                          <div className="col-span-1 sm:col-span-1 text-gray-500 text-xs">
                            {appointment.hospital || 'Unknown Hospital'}
                          </div>
                          <div className="col-span-1 sm:col-span-1 text-gray-500 text-xs">
                            {appointment.provider}
                          </div>
                          <div className="col-span-1 sm:col-span-3 flex space-x-2">
                            {appointment.patient_id && (
                              <button 
                                onClick={() => navigate(`/doctor/report/${appointment.patient_id}`)}
                                className="flex-1 px-4 py-3 bg-white border-2 border-[#5ACCC3] text-[#5ACCC3] rounded-lg text-sm font-medium hover:bg-[#5ACCC3]/10 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                if (appointment.report_id) {
                                  // Navigate to report page if report exists
                                  navigate(`/reports/${appointment.report_id}`)
                                } else {
                                  // Show appointment details if no report
                                  handleViewAppointment(appointment.id)
                                }
                              }}
                              className={`${appointment.patient_id ? 'flex-1' : 'w-full'} px-4 py-3 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4DB6B0] transition-colors`}
                            >
                              {appointment.report_id ? 'View Report' : 'View'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">No appointments scheduled</p>
                      <p className="text-gray-400 text-sm">for {format(selectedDate, 'MMMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* To-Do Section */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                  <h2 className="text-xl font-semibold text-gray-900">To-Do</h2>
                  {backendConnected && (
                    <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {todos.filter(todo => !todo.completed).length} pending
                </span>
              </div>
              <div className="space-y-4">
                {todos.length > 0 ? todos.map((todo, index) => (
                  <div 
                    key={todo.id} 
                    className={`bg-gray-50 rounded-lg border p-4 hover:bg-gray-100 transition-colors ${
                      todo.completed 
                        ? 'border-green-200 bg-green-50 opacity-75' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                      <div className="col-span-1 sm:col-span-2">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          {todo.date}
                        </span>
                      </div>
                      <div className={`col-span-1 sm:col-span-6 transition-all duration-300 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                        {todo.description}
                      </div>
                      <div className="col-span-1 sm:col-span-2 text-gray-500 text-sm">
                        {todo.provider}
                      </div>
                      <div className="col-span-1">
                        <button className="w-full px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors">
                          Docs
                        </button>
                      </div>
                      <div className="col-span-1 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={todo.completed}
                            onChange={() => toggleTodoCompletion(todo.id)}
                            disabled={loading}
                            className="w-5 h-5 text-[#5ACCC3] rounded border-2 border-gray-300 focus:ring-[#5ACCC3] focus:ring-2 transition-all duration-200"
                          />
                          <span className="ml-2 sr-only">Mark as completed</span>
                        </label>
                      </div>
                    </div>
                    {todo.completed && (
                      <div className="h-1 bg-green-500 animate-pulse mt-2 rounded"></div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    No tasks available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* View Appointment Modal */}
      {showViewAppointmentModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
                <button
                  onClick={() => {
                    setShowViewAppointmentModal(false)
                    setSelectedAppointmentDetails(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingAppointmentDetails ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5ACCC3]"></div>
                  <span className="ml-3 text-gray-600">Loading appointment details...</span>
                </div>
              ) : selectedAppointmentDetails ? (
                <div className="space-y-6">
                  {/* Patient Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                        <p className="text-gray-900">{selectedAppointmentDetails.patient_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
                        <p className="text-gray-900">{selectedAppointmentDetails.patient_id || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Appointment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <p className="text-gray-900">{selectedAppointmentDetails.formatted_date || selectedAppointmentDetails.date || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <p className="text-gray-900">{selectedAppointmentDetails.time || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedAppointmentDetails.status === 'booked' ? 'bg-green-100 text-green-800' :
                          selectedAppointmentDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedAppointmentDetails.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedAppointmentDetails.status || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <p className="text-gray-900">{selectedAppointmentDetails.appointment_type || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Clinical Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Problem/Reason</label>
                        <p className="text-gray-900">{selectedAppointmentDetails.problem || selectedAppointmentDetails.description || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <p className="text-gray-900">{selectedAppointmentDetails.notes || 'No notes available'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        setShowViewAppointmentModal(false)
                        setSelectedAppointmentDetails(null)
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No appointment details available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard