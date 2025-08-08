import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { initialAppointments } from './AppointmentsData'
import { format, parse } from 'date-fns'
import CalendarSidebar from './Dashboard/Calendar'
import { appointmentsAPI, checkBackendHealth } from '../../services/apiService'

const Appointments = () => {
  // Current date and selected date
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Backend connection state
  const [backendConnected, setBackendConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Load animation effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])
  
  // Appointments state - now connected to backend
  const [appointments, setAppointments] = useState([])
  
  // Active section filter (null means show all sections)
  const [activeSection, setActiveSection] = useState(null)
  
  // Modal state for new appointment
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  const [newAppointment, setNewAppointment] = useState({
    fullName: '',
    id: '',
    date: '',
    time: '',
    appointmentType: '',
    notes: ''
  })

  // Check backend connection and load appointments
  useEffect(() => {
    const initializeAppointments = async () => {
      try {
        setLoading(true)
        
        // Check backend health
        const isHealthy = await checkBackendHealth()
        setBackendConnected(isHealthy)
        
        if (isHealthy) {
          // Try to load appointments from backend
          try {
            const backendAppointments = await appointmentsAPI.getAll()
            
            // Transform backend data to match frontend format
            const transformedAppointments = backendAppointments.map(apt => ({
              id: apt.id,
              time: apt.time || apt.appointment_time || '00:00',
              date: new Date(apt.date || apt.appointment_date),
              formattedDate: format(new Date(apt.date || apt.appointment_date), 'dd.MM.yyyy'),
              patient: apt.patient || `${apt.patient_name || 'Unknown Patient'}`,
              problem: apt.problem || apt.appointment_type || 'General consultation',
              description: apt.description || apt.notes || 'No description available',
              provider: apt.provider || apt.doctor_name || 'Current Doctor',
              status: apt.status || 'upcoming'
            }))
            
            setAppointments(transformedAppointments)
          } catch (apiError) {
            console.error('Failed to load appointments from backend:', apiError)
            setError('Failed to load appointments from server')
            // Fallback to mock data
            setAppointments(initialAppointments)
          }
        } else {
          // Backend not available, use mock data
          console.log('Backend not available, using mock data')
          setAppointments(initialAppointments)
        }
      } catch (err) {
        console.error('Error initializing appointments:', err)
        setError('Failed to initialize appointments')
        setAppointments(initialAppointments)
      } finally {
        setLoading(false)
      }
    }

    initializeAppointments()
  }, [])

  // Function to handle input changes for new appointment
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewAppointment({
      ...newAppointment,
      [name]: value
    })
  }

  // Function to add new appointment - with backend integration
  const handleAddAppointment = async () => {
    try {
      // Parse the date string to a Date object
      let appointmentDate
      try {
        appointmentDate = parse(newAppointment.date, 'yyyy-MM-dd', new Date())
      } catch {
        appointmentDate = new Date()
      }

      const appointmentData = {
        patient_name: newAppointment.fullName,
        patient_id: newAppointment.id || null,
        appointment_date: newAppointment.date,
        appointment_time: newAppointment.time,
        appointment_type: newAppointment.appointmentType,
        notes: newAppointment.notes,
        status: 'upcoming'
      }

      if (backendConnected) {
        try {
          // Create appointment via API
          const createdAppointment = await appointmentsAPI.create(appointmentData)
          
          // Transform and add to local state
          const newAppointmentObj = {
            id: createdAppointment.id,
            time: newAppointment.time,
            date: appointmentDate,
            formattedDate: format(appointmentDate, 'dd.MM.yyyy'),
            patient: newAppointment.fullName,
            problem: newAppointment.appointmentType,
            description: newAppointment.notes,
            provider: "Current Doctor",
            status: 'upcoming'
          }
          
          setAppointments([...appointments, newAppointmentObj])
        } catch (apiError) {
          console.error('Failed to create appointment via API:', apiError)
          setError('Failed to create appointment on server')
          
          // Fallback to local creation
          const newAppointmentObj = {
            id: Date.now(), // Use timestamp as ID for local fallback
            time: newAppointment.time,
            date: appointmentDate,
            formattedDate: format(appointmentDate, 'dd.MM.yyyy'),
            patient: newAppointment.fullName,
            problem: newAppointment.appointmentType,
            description: newAppointment.notes,
            provider: "Current Doctor",
            status: 'upcoming'
          }
          
          setAppointments([...appointments, newAppointmentObj])
        }
      } else {
        // Backend not available, create locally
        const newAppointmentObj = {
          id: Date.now(),
          time: newAppointment.time,
          date: appointmentDate,
          formattedDate: format(appointmentDate, 'dd.MM.yyyy'),
          patient: newAppointment.fullName,
          problem: newAppointment.appointmentType,
          description: newAppointment.notes,
          provider: "Current Doctor",
          status: 'upcoming'
        }
        
        setAppointments([...appointments, newAppointmentObj])
      }
      
      // Reset form and close modal
      setNewAppointment({
        fullName: '',
        id: '',
        date: '',
        time: '',
        appointmentType: '',
        notes: ''
      })
      setShowNewAppointmentModal(false)
      
    } catch (err) {
      console.error('Error creating appointment:', err)
      setError('Failed to create appointment')
    }
  }
  // Filter appointments based on status
const upcomingAppointments = appointments.filter(apt => apt.status === 'upcoming')
const pendingAppointments = appointments.filter(apt => apt.status === 'pending')
const pastAppointments = appointments.filter(apt => apt.status === 'past')

// Function to accept an appointment - with backend integration
const handleAccept = async (id) => {
  try {
    if (backendConnected) {
      try {
        await appointmentsAPI.updateStatus(id, 'upcoming')
      } catch (apiError) {
        console.error('Failed to update appointment status via API:', apiError)
        setError('Failed to update appointment status on server')
      }
    }

    // Update local state regardless of backend success
    setAppointments(appointments.map(apt =>
      apt.id === id ? { ...apt, status: 'upcoming' } : apt
    ))
  } catch (err) {
    console.error('Error accepting appointment:', err)
    setError('Failed to accept appointment')
  }
}

// Function to decline an appointment - with backend integration
const handleDecline = async (id) => {
  try {
    if (backendConnected) {
      try {
        await appointmentsAPI.delete(id)
      } catch (apiError) {
        console.error('Failed to delete appointment via API:', apiError)
        setError('Failed to delete appointment on server')
      }
    }

    // Update local state regardless of backend success
    setAppointments(appointments.filter(apt => apt.id !== id))
  } catch (err) {
    console.error('Error declining appointment:', err)
    setError('Failed to decline appointment')
  }
}

// Handle date selection - reset to default view showing all sections
const handleDateClick = (day) => {
  setSelectedDate(day)
  setActiveSection(null)
}

// Handle month change
const handleMonthChange = (newDate) => {
  setCurrentDate(newDate)
}

// Get appointments for selected date with status filter
const getAppointmentsForDateAndStatus = (date, status) => {
  if (!date) return []
  return appointments.filter(appointment =>
    appointment.date &&
    new Date(appointment.date).toDateString() === date.toDateString() &&
    appointment.status === status
  )
}

// Should show section based on filter
const shouldShowSection = (sectionType) => {
  return activeSection === null || activeSection === sectionType
}

// Format the date for display
const formatSelectedDate = (date) => {
  return format(date, 'MMMM d, yyyy')
}

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />
      
      {/* Backend status and error indicators */}
      {!backendConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mx-2 sm:mx-4 mt-4 rounded">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Backend disconnected - showing local data
          </div>
        </div>
      )}
      
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
      
      <div className={`flex flex-col lg:flex-row p-2 sm:p-4 gap-4 sm:gap-6 relative transition-all duration-1000 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        {/* Enhanced medical illustrations background */}
        <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
          <div className="w-full h-full bg-repeat animate-pulse" style={{ backgroundImage: "url('/medical-icons.svg')" }}></div>
        </div>
        
        <div className="lg:w-1/3 xl:w-1/4 space-y-4 sm:space-y-6">
          {/* Calendar Section */}
          <div className="transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <CalendarSidebar
              selectedDate={selectedDate}
              onDateSelect={handleDateClick}
              currentDate={currentDate}
              onMonthChange={handleMonthChange}
              appointments={appointments}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 space-y-3 sm:space-y-4 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
              <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Quick Actions</h3>
              {backendConnected && (
                <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            
            <button 
              className="w-full py-2 sm:py-3 rounded-lg bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50 focus:ring-offset-2 text-sm sm:text-base"
              onClick={() => setShowNewAppointmentModal(true)}
              disabled={loading}
            >
              {loading ? 'Loading...' : '+ New Appointment'}
            </button>
            
            <button 
              className={`w-full py-2 sm:py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm sm:text-base
                ${activeSection === 'pending' 
                  ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white shadow-lg focus:ring-[#5ACCC3]/50' 
                  : 'border-2 border-[#5ACCC3] text-[#5ACCC3] hover:bg-gradient-to-r hover:from-[#5ACCC3] hover:to-[#4DB6B0] hover:text-white hover:shadow-lg focus:ring-[#5ACCC3]/50'}`}
              onClick={() => setActiveSection(activeSection === 'pending' ? null : 'pending')}
            >
              Accept Appointments
              {pendingAppointments.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full animate-pulse">
                  {pendingAppointments.length}
                </span>
              )}
            </button>
            
            <button 
              className={`w-full py-2 sm:py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm sm:text-base
                ${activeSection === 'upcoming' 
                  ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white shadow-lg focus:ring-[#5ACCC3]/50' 
                  : 'border-2 border-[#5ACCC3] text-[#5ACCC3] hover:bg-gradient-to-r hover:from-[#5ACCC3] hover:to-[#4DB6B0] hover:text-white hover:shadow-lg focus:ring-[#5ACCC3]/50'}`}
              onClick={() => setActiveSection(activeSection === 'upcoming' ? null : 'upcoming')}
            >
              Upcoming Appointments
              {upcomingAppointments.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-green-500 rounded-full">
                  {upcomingAppointments.length}
                </span>
              )}
            </button>
            
            <button 
              className={`w-full py-2 sm:py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm sm:text-base
                ${activeSection === 'past' 
                  ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white shadow-lg focus:ring-[#5ACCC3]/50' 
                  : 'border-2 border-[#5ACCC3] text-[#5ACCC3] hover:bg-gradient-to-r hover:from-[#5ACCC3] hover:to-[#4DB6B0] hover:text-white hover:shadow-lg focus:ring-[#5ACCC3]/50'}`}
              onClick={() => setActiveSection(activeSection === 'past' ? null : 'past')}
            >
              Past Appointments
              {pastAppointments.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gray-500 rounded-full">
                  {pastAppointments.length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        <div className="lg:w-2/3 xl:w-3/4">
          {/* Loading indicator */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5ACCC3]"></div>
              <span className="ml-4 text-gray-600">Loading appointments...</span>
            </div>
          ) : (
            /* Main Content Section with all appointment types */
            <div className="space-y-4 sm:space-y-6">
              {/* Upcoming appointments section */}
              {shouldShowSection('upcoming') && (
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center">
                      <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                      <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
                        {activeSection === 'upcoming' 
                          ? 'All Upcoming appointments' 
                          : `Upcoming appointments for ${formatSelectedDate(selectedDate)}`
                        }
                      </h2>
                      {backendConnected && (
                        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#5ACCC3] rounded-full animate-pulse"></div>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {activeSection === 'upcoming' 
                          ? `${upcomingAppointments.length} upcoming`
                          : `${getAppointmentsForDateAndStatus(selectedDate, 'upcoming').length} appointments`
                        }
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      // Get appropriate appointments based on context
                      let displayAppointments;
                      
                      if (activeSection === 'upcoming') {
                        // Show all upcoming appointments when "Upcoming Appointments" button is clicked
                        displayAppointments = upcomingAppointments;
                      } else {
                        // Default view: show upcoming appointments for selected date
                        displayAppointments = getAppointmentsForDateAndStatus(selectedDate, 'upcoming');
                      }
                        
                      if (displayAppointments.length > 0) {
                        return displayAppointments.map((appointment, index) => (
                          <div 
                            key={appointment.id} 
                            className="bg-white rounded-lg border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-[#5ACCC3]/30 cursor-pointer"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-0">
                              <div className="col-span-1 p-3 sm:p-4 text-center">
                                <div className="bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg p-2 font-bold text-xs shadow-md min-w-[60px] sm:min-w-[80px]">
                                  <div className="text-xs sm:text-sm">{appointment.time}</div>
                                  <div className="text-xs opacity-75 mt-1 whitespace-nowrap">{appointment.formattedDate}</div>
                                </div>
                              </div>
                              <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                                <div className="font-semibold text-gray-800 text-sm sm:text-base">{appointment.patient}</div>
                              </div>
                              <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                                <span className="bg-[#5ACCC3]/10 text-[#5ACCC3] px-2 py-1 rounded-full text-xs font-medium">
                                  {appointment.problem}
                                </span>
                              </div>
                              <div className="col-span-1 sm:col-span-4 p-3 sm:p-4 text-gray-600 text-xs sm:text-sm">
                                {appointment.description}
                              </div>
                              <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 text-gray-500 text-xs">
                                Provider: {appointment.provider}
                              </div>
                              <div className="col-span-1 p-3 sm:p-4">
                                <button className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-xs font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50">
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        ));
                      } else {
                        return (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-gray-500 font-medium text-sm sm:text-base">
                              {activeSection === 'upcoming' 
                                ? 'No upcoming appointments' 
                                : 'No appointments scheduled'
                              }
                            </p>
                            <p className="text-gray-400 text-xs sm:text-sm">
                              {activeSection !== 'upcoming' && `for ${formatSelectedDate(selectedDate)}`}
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
              
              {/* Accept appointments section */}
              {shouldShowSection('pending') && (
                <div className="bg-gradient-to-br from-white to-amber-50 rounded-xl shadow-lg border border-amber-100 p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center">
                      <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                      <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Accept appointments</h2>
                      {backendConnected && (
                        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <span className="bg-[#5ACCC3]/10 text-[#5ACCC3] px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                      {pendingAppointments.length} pending
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pendingAppointments.length > 0 ? (
                      pendingAppointments.map((appointment, index) => (
                        <div 
                          key={appointment.id} 
                          className="bg-white rounded-lg border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-[#5ACCC3]/30"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-0">
                            <div className="col-span-1 p-3 sm:p-4 text-center">
                              <div className="bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg p-2 font-bold text-xs shadow-md min-w-[60px] sm:min-w-[80px]">
                                <div className="text-xs sm:text-sm">{appointment.time}</div>
                                <div className="text-xs opacity-75 mt-1 whitespace-nowrap">{appointment.formattedDate}</div>
                              </div>
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                              <div className="font-semibold text-gray-800 text-sm sm:text-base">{appointment.patient}</div>
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                              <span className="bg-[#5ACCC3]/10 text-[#5ACCC3] px-2 py-1 rounded-full text-xs font-medium">
                                {appointment.problem}
                              </span>
                            </div>
                            <div className="col-span-1 sm:col-span-3 p-3 sm:p-4 text-gray-600 text-xs sm:text-sm">
                              {appointment.description}
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 text-gray-500 text-xs">
                              Provider: {appointment.provider}
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                              <button 
                                onClick={() => handleDecline(appointment.id)}
                                className="px-3 py-2 border-2 border-red-300 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                              >
                                Decline
                              </button>
                              <button 
                                onClick={() => handleAccept(appointment.id)}
                                className="px-3 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-xs font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#5ACCC3]/10 to-[#4DB6B0]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-[#5ACCC3] font-medium text-sm sm:text-base">All caught up!</p>
                        <p className="text-gray-500 text-xs sm:text-sm">No pending appointments to review</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Past appointments section */}
              {shouldShowSection('past') && (
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center">
                      <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                      <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Past appointments</h2>
                      {backendConnected && (
                        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                      {pastAppointments.length} completed
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pastAppointments.length > 0 ? (
                      pastAppointments.map((appointment, index) => (
                        <div 
                          key={appointment.id} 
                          className="bg-white rounded-lg border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-gray-300 opacity-90 hover:opacity-100"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-0">
                            <div className="col-span-1 p-3 sm:p-4 text-center">
                              <div className="bg-gradient-to-br from-gray-400 to-gray-500 text-white rounded-lg p-2 font-bold text-xs shadow-md min-w-[60px] sm:min-w-[80px]">
                                <div className="text-xs sm:text-sm">{appointment.time}</div>
                                <div className="text-xs opacity-75 mt-1 whitespace-nowrap">{appointment.formattedDate}</div>
                              </div>
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                              <div className="font-semibold text-gray-700 text-sm sm:text-base">{appointment.patient}</div>
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                                {appointment.problem}
                              </span>
                            </div>
                            <div className="col-span-1 sm:col-span-4 p-3 sm:p-4 text-gray-600 text-xs sm:text-sm">
                              {appointment.description}
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 text-gray-500 text-xs">
                              Provider: {appointment.provider}
                            </div>
                            <div className="col-span-1 p-3 sm:p-4">
                              <button className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-xs font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50">
                                Report
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium text-sm sm:text-base">No past appointments</p>
                        <p className="text-gray-400 text-xs sm:text-sm">Completed appointments will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced New Appointment Modal */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-2xl p-4 sm:p-8 max-w-2xl w-full mx-4 shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] rounded-t-2xl"></div>
            <h2 className="text-2xl sm:text-3xl font-light text-gray-800 mb-6 sm:mb-8 border-b pb-4">
              <span className="bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">New Appointment</span>
              {backendConnected && (
                <span className="ml-2 inline-flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="ml-1 text-xs text-green-600">Connected</span>
                </span>
              )}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <input
                  name="fullName"
                  type="text"
                  value={newAppointment.fullName}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base"
                  placeholder="Enter patient's full name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Patient ID</label>
                <input
                  name="id"
                  type="text"
                  value={newAppointment.id}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base"
                  placeholder="Patient ID number"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Appointment Date</label>
                <input
                  name="date"
                  type="date"
                  value={newAppointment.date}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Appointment Time</label>
                <input
                  name="time"
                  type="time"
                  value={newAppointment.time}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base"
                />
              </div>
            </div>
            
            <div className="mb-6 space-y-2">
              <label className="text-sm font-medium text-gray-700">Appointment Type</label>
              <select
                name="appointmentType"
                value={newAppointment.appointmentType}
                onChange={handleInputChange}
                className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 appearance-none bg-white text-sm sm:text-base"
              >
                <option value="">Select appointment type</option>
                <option value="Check-up">Regular Check-up</option>
                <option value="Consultation">Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Emergency">Emergency</option>
                <option value="Anxiety problems">Anxiety Problems</option>
                <option value="Routine">Routine Visit</option>
              </select>
            </div>
            
            <div className="mb-6 sm:mb-8 space-y-2">
              <label className="text-sm font-medium text-gray-700">Additional Notes <span className="text-gray-400">(optional)</span></label>
              <textarea
                name="notes"
                value={newAppointment.notes}
                onChange={handleInputChange}
                className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 resize-none text-sm sm:text-base"
                rows="4"
                placeholder="Any additional notes or special requirements..."
              ></textarea>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button 
                className="px-6 sm:px-8 py-2 sm:py-3 border-2 border-red-300 text-red-500 rounded-xl font-medium hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm sm:text-base"
                onClick={() => setShowNewAppointmentModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-xl font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50 text-sm sm:text-base"
                onClick={handleAddAppointment}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Appointments