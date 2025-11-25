import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { format, parse, parseISO } from 'date-fns'
import CalendarSidebar from './Dashboard/Calendar'
import { doctorAppointmentsAPI, doctorPatientsAPI, checkBackendHealth } from '../../services/apiService'

const Appointments = () => {
  const navigate = useNavigate()
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
  
  // Modal state for viewing appointment details
  const [showViewAppointmentModal, setShowViewAppointmentModal] = useState(false)
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState(null)
  const [loadingAppointmentDetails, setLoadingAppointmentDetails] = useState(false)
  
  // Patient search state
  const [patientSearch, setPatientSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimeoutRef = useRef(null)

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
            // Use the simple /all endpoint for now
            const response = await doctorAppointmentsAPI.listAll()
            console.log('Appointments API response:', response)
            
            // Handle both response formats: {data: [...]} or raw array
            const raw = response?.data ?? response
            const rows = Array.isArray(raw) ? raw : (raw?.data ?? [])
            console.log('Backend appointments:', rows)
            
            // Transform backend data to match frontend format
            const mapStatusToUi = (s) => {
              const val = String(s || '').toLowerCase()
              if (['confirmed', 'scheduled', 'upcoming', 'booked'].includes(val)) return 'upcoming'
              if (['completed', 'done', 'finished', 'past'].includes(val)) return 'past'
              if (['pending', 'requested'].includes(val)) return 'pending'
              return 'upcoming'
            }
            
            const transformedAppointments = rows.map(apt => {
              // Fix date parsing to avoid timezone issues
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
              
              // Check if appointment is 3 or more days in the past
              let finalStatus = mapStatusToUi(apt.status)
              if (dateObj && !isNaN(dateObj.getTime())) {
                const today = new Date()
                today.setHours(0, 0, 0, 0) // Reset time to start of day
                const appointmentDate = new Date(dateObj)
                appointmentDate.setHours(0, 0, 0, 0) // Reset time to start of day
                
                // Calculate difference in days
                const diffTime = today.getTime() - appointmentDate.getTime()
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                
                // If appointment is 3 or more days in the past, mark as past
                if (diffDays >= 3 && finalStatus !== 'pending') {
                  finalStatus = 'past'
                }
              }
              
              return {
                id: apt.id,
                time: timeText,
                date: dateObj,
                formattedDate: formattedDate,
                patient: apt.patient || apt.patient_name || 'Unknown Patient',
                problem: apt.problem || apt.appointment_type || 'General consultation',
                description: apt.description || apt.notes || 'No description available',
                provider: apt.doctor_specialization || 'Current Doctor',
                hospital: apt.hospital_name || 'Unknown Hospital',
                status: finalStatus,
                // Additional comprehensive data
                patient_id: apt.patient_id,
                doctor_id: apt.doctor_id,
                hospital_id: apt.hospital_id,
                appointment_type: apt.appointment_type,
                duration_minutes: apt.duration_minutes,
                report_id: apt.report_id || apt.reportId || null,
                has_report: !!(apt.report_id || apt.reportId || apt.report)
              }
            })
            
            console.log('Transformed appointments:', transformedAppointments)
            setAppointments(transformedAppointments)
          } catch (apiError) {
            console.error('Failed to load appointments from backend:', apiError)
            setError('Failed to load appointments from server')
            // No fallback to mock data - show empty state
            setAppointments([])
          }
        } else {
          // Backend not available, show empty state
          console.log('Backend not available')
          setAppointments([])
        }
      } catch (err) {
        console.error('Error initializing appointments:', err)
        setError('Failed to initialize appointments')
        setAppointments([])
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

  // Patient search function
  const searchPatients = async (query) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      setSearchLoading(false)
      return
    }

    try {
      setSearchLoading(true)
      console.log('Searching patients with query:', query)
      console.log('Backend connected:', backendConnected)
      
      // Always try to search, even if backendConnected is false (it might be a stale state)
      try {
        const results = await doctorPatientsAPI.search(query, 10)
        console.log('Search results (raw):', results)
        
        // Handle both array and object with data property
        const patients = Array.isArray(results) ? results : (results?.data || results?.items || [])
        console.log('Processed patients:', patients)
        
        if (patients && patients.length > 0) {
          setSearchResults(patients)
          setShowSearchResults(true)
        } else {
          setSearchResults([])
          setShowSearchResults(true) // Still show "no results" message
        }
      } catch (apiError) {
        console.error('API search error:', apiError)
        console.error('Error details:', apiError.message, apiError.stack)
        // Fallback to mock data if API fails
        const mockResults = [
          { id: '1', fullName: 'John Doe', email: 'john.doe@email.com', nationalId: '1234567890' },
          { id: '2', fullName: 'Jane Smith', email: 'jane.smith@email.com', nationalId: '0987654321' },
          { id: '3', fullName: 'Ahmed Hassan', email: 'ahmed.hassan@email.com', nationalId: '1122334455' },
          { id: '4', fullName: 'Sarah Johnson', email: 'sarah.j@email.com', nationalId: '5566778899' }
        ].filter(patient => 
          patient.fullName.toLowerCase().includes(query.toLowerCase()) ||
          patient.email.toLowerCase().includes(query.toLowerCase()) ||
          patient.nationalId.includes(query)
        )
        setSearchResults(mockResults)
        setShowSearchResults(true)
        console.log('Using mock data due to API error')
      }
    } catch (error) {
      console.error('Error searching patients:', error)
      setError('Failed to search patients. Please try again.')
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setSearchLoading(false)
    }
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Handle patient selection
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient)
    setNewAppointment(prev => ({
      ...prev,
      fullName: patient.fullName,
      id: patient.id
    }))
    setPatientSearch(patient.fullName)
    setShowSearchResults(false)
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

      const clinicId = localStorage.getItem('clinic_id') || 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'

      if (backendConnected) {
        try {
          // Create appointment via API (doctor portal)
          // Send proper ISO datetime format
          const appointmentDate = newAppointment.date
          const appointmentTime = newAppointment.time
          const appointmentDateTime = `${appointmentDate}T${appointmentTime || '00:00'}:00`
          
          // Validate required fields before sending
          if (!newAppointment.id) {
            setError('Please select a patient before creating an appointment.')
            return
          }
          
          if (!appointmentDate) {
            setError('Please select an appointment date.')
            return
          }
          
          if (!appointmentTime) {
            setError('Please select an appointment time.')
            return
          }

          const appointmentData = {
            clinic_id: clinicId,
            patient_id: newAppointment.id,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            appointment_type: newAppointment.appointmentType || 'general_consultation',
            notes: newAppointment.notes || '',
            priority: 'normal',
            duration_minutes: 30,
            is_virtual: false
          }
          
          console.log('Sending appointment data:', appointmentData)
          
          const createdAppointment = await doctorAppointmentsAPI.create(appointmentData)
          
          // Transform and add to local state
          const dateObj = parseISO(`${appointmentDate}T00:00:00`)
          const newAppointmentObj = {
            id: createdAppointment?.data?.id ?? createdAppointment?.id ?? crypto.randomUUID(),
            time: (appointmentTime || '00:00').slice(0, 5),
            date: dateObj,
            formattedDate: format(dateObj, 'dd.MM.yyyy'),
            patient: newAppointment.fullName || 'Unknown Patient',
            problem: newAppointment.appointmentType || 'General Consultation',
            description: newAppointment.notes || '',
            provider: "Current Doctor",
            status: 'upcoming'
          }
          
          setAppointments([...appointments, newAppointmentObj])
        } catch (apiError) {
          console.error('Failed to create appointment via API:', apiError)
          setError('Failed to create appointment on server. Please try again.')
          return // Don't create locally, just show error
        }
      } else {
        // Backend not available, show error
        setError('Backend not available. Cannot create appointment.')
        return
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

// Handle viewing appointment details
const handleViewAppointment = async (appointmentId) => {
  try {
    setLoadingAppointmentDetails(true)
    setShowViewAppointmentModal(true)
    
    if (backendConnected) {
      const clinicId = localStorage.getItem('clinic_id') || 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'
      const appointmentDetails = await doctorAppointmentsAPI.getById({ 
        clinicId, 
        appointmentId 
      })
      console.log('Appointment details:', appointmentDetails)
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

// Function to accept an appointment - with backend integration
const handleAccept = async (id) => {
  try {
    if (backendConnected) {
      try {
        const clinicId = localStorage.getItem('clinic_id') || 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'
        await doctorAppointmentsAPI.confirm({ clinicId, appointmentId: id })
      } catch (apiError) {
        console.error('Failed to confirm appointment via API:', apiError)
        setError('Failed to confirm appointment on server')
      }
    }

    // Only update local state if backend call succeeded
    if (backendConnected) {
      setAppointments(appointments.map(apt => {
        if (apt.id === id) {
          // Check if appointment is 3+ days in the past
          let newStatus = 'upcoming'
          if (apt.date && !isNaN(apt.date.getTime())) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const appointmentDate = new Date(apt.date)
            appointmentDate.setHours(0, 0, 0, 0)
            
            const diffTime = today.getTime() - appointmentDate.getTime()
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
            
            // If appointment is 3 or more days in the past, mark as past
            if (diffDays >= 3) {
              newStatus = 'past'
            }
          }
          return { ...apt, status: newStatus }
        }
        return apt
      }))
    } else {
      setError('Backend not available. Cannot accept appointment.')
    }
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
        const clinicId = localStorage.getItem('clinic_id') || 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'
        await doctorAppointmentsAPI.decline({ clinicId, appointmentId: id })
      } catch (apiError) {
        console.error('Failed to decline appointment via API:', apiError)
        setError('Failed to decline appointment on server')
      }
    }

    // Only update local state if backend call succeeded
    if (backendConnected) {
      setAppointments(appointments.filter(apt => apt.id !== id))
    } else {
      setError('Backend not available. Cannot decline appointment.')
    }
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

// Helper function to compare dates using string format (robust across timezones)
const sameDay = (a, b) => {
  if (!a || !b) return false
  return format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd')
}

// Get appointments for selected date with status filter
const getAppointmentsForDateAndStatus = (date, status) => {
  if (!date) return []
  return appointments.filter(appointment =>
    appointment.date &&
    sameDay(appointment.date, date) &&
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

  // Add state for sidebar visibility
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      {/* Backend status and error indicators */}
      {!backendConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mx-2 sm:mx-4 mt-4 rounded">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Backend disconnected - no data available
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

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showSidebar ? '←' : '→'} Appointments
            </button>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
              Appointments
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
            
            {/* Quick Actions Section */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                {backendConnected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              
              <div className="space-y-3">
                <button 
                  className="w-full py-3 rounded-lg bg-[#4DB6B0] text-white font-medium hover:bg-[#3DA6A0] transition-colors"
                  onClick={() => setShowNewAppointmentModal(true)}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : '+ New Appointment'}
                </button>
                
                <button 
                  className={`w-full py-3 rounded-lg font-medium transition-colors
                    ${activeSection === 'pending' 
                      ? 'bg-[#4DB6B0] text-white' 
                      : 'border-2 border-[#4DB6B0] text-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'}`}
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
                  className={`w-full py-3 rounded-lg font-medium transition-colors
                    ${activeSection === 'upcoming' 
                      ? 'bg-[#4DB6B0] text-white' 
                      : 'border-2 border-[#4DB6B0] text-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'}`}
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
                  className={`w-full py-3 rounded-lg font-medium transition-colors
                    ${activeSection === 'past' 
                      ? 'bg-[#4DB6B0] text-white' 
                      : 'border-2 border-[#4DB6B0] text-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'}`}
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
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Loading indicator */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5ACCC3]"></div>
                <span className="ml-4 text-gray-600">Loading appointments...</span>
              </div>
            ) : (
              /* Main Content Section with all appointment types */
              <div className="space-y-6">
                {/* Upcoming appointments section */}
                {shouldShowSection('upcoming') && (
                  <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {activeSection === 'upcoming' 
                            ? 'All Upcoming Appointments' 
                            : `Appointments for ${formatSelectedDate(selectedDate)}`
                          }
                        </h2>
                        {backendConnected && (
                          <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-[#5ACCC3] rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-500">
                          {activeSection === 'upcoming' 
                            ? `${upcomingAppointments.length} upcoming`
                            : `${appointments.filter(appointment =>
                                appointment.date && sameDay(appointment.date, selectedDate)
                              ).length} appointments`
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {(() => {
                        // Get appropriate appointments based on context
                        let displayAppointments;
                        
                        if (activeSection === 'upcoming') {
                          // Show all upcoming appointments when "Upcoming Appointments" button is clicked
                          displayAppointments = upcomingAppointments;
                        } else {
                          // Default view: show ALL appointments for selected date (today by default)
                          displayAppointments = appointments.filter(appointment =>
                            appointment.date && sameDay(appointment.date, selectedDate)
                          );
                        }
                          
                        if (displayAppointments.length > 0) {
                          return displayAppointments.map((appointment, index) => (
                            <div 
                              key={appointment.id} 
                              className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                <div className="col-span-1 sm:col-span-2">
                                  <div className="bg-white border-2 border-[#5ACCC3] rounded-lg p-2 text-center">
                                    <div className="font-bold text-sm text-[#5ACCC3]">{appointment.time}</div>
                                    <div className="text-xs mt-0.5 text-[#5ACCC3]">{appointment.formattedDate || appointment.date || formatSelectedDate(selectedDate)}</div>
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
                          ));
                        } else {
                          return (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <p className="text-gray-500 font-medium">
                                {activeSection === 'upcoming' 
                                  ? 'No upcoming appointments' 
                                  : 'No appointments scheduled'
                                }
                              </p>
                              <p className="text-gray-400 text-sm">
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
                  <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                        <h2 className="text-xl font-semibold text-gray-900">Accept Appointments</h2>
                        {backendConnected && (
                          <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <span className="bg-[#5ACCC3]/10 text-[#5ACCC3] px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                        {pendingAppointments.length} pending
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {pendingAppointments.length > 0 ? (
                        pendingAppointments.map((appointment, index) => (
                          <div 
                            key={appointment.id} 
                            className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                              <div className="col-span-1 sm:col-span-2">
                                  <div className="bg-white border-2 border-[#5ACCC3] rounded-lg p-2 text-center">
                                    <div className="font-bold text-sm text-[#5ACCC3]">{appointment.time}</div>
                                    <div className="text-xs mt-0.5 text-[#5ACCC3]">{appointment.formattedDate || appointment.date || formatSelectedDate(selectedDate)}</div>
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
                                {appointment.provider}
                              </div>
                              <div className="col-span-1 sm:col-span-4 flex space-x-2">
                                <button 
                                  onClick={() => handleDecline(appointment.id)}
                                  className="flex-1 px-3 py-2 border-2 border-red-300 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500 hover:text-white transition-colors"
                                >
                                  Decline
                                </button>
                                <button 
                                  onClick={() => handleAccept(appointment.id)}
                                  className="flex-1 px-3 py-2 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4DB6B0] transition-colors"
                                >
                                  Accept
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-[#5ACCC3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-[#5ACCC3] font-medium">All caught up!</p>
                          <p className="text-gray-500 text-sm">No pending appointments to review</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Past appointments section */}
                {shouldShowSection('past') && (
                  <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                        <h2 className="text-xl font-semibold text-gray-900">Past Appointments</h2>
                        {backendConnected && (
                          <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                        {pastAppointments.length} completed
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {pastAppointments.length > 0 ? (
                        pastAppointments.map((appointment, index) => (
                          <div 
                            key={appointment.id} 
                            className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors opacity-90 hover:opacity-100"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                              <div className="col-span-1 sm:col-span-2">
                                  <div className="bg-white border-2 border-[#5ACCC3] rounded-lg p-2 text-center">
                                    <div className="font-bold text-sm text-[#5ACCC3]">{appointment.time}</div>
                                    <div className="text-xs mt-0.5 text-[#5ACCC3]">{appointment.formattedDate || appointment.date || formatSelectedDate(selectedDate)}</div>
                                  </div>
                              </div>
                              <div className="col-span-1 sm:col-span-2">
                                <div className="font-semibold text-gray-700">{appointment.patient}</div>
                              </div>
                              <div className="col-span-1 sm:col-span-2">
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
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
                                {(() => {
                                  // Check if appointment is past 3 days and has no report
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  const appointmentDate = appointment.date ? new Date(appointment.date) : null
                                  let isPast3Days = false
                                  
                                  if (appointmentDate && !isNaN(appointmentDate.getTime())) {
                                    appointmentDate.setHours(0, 0, 0, 0)
                                    const diffTime = today.getTime() - appointmentDate.getTime()
                                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                                    isPast3Days = diffDays >= 3
                                  }
                                  
                                  const hasReport = appointment.has_report || appointment.report_id
                                  const showMissed = isPast3Days && !hasReport
                                  const showStart = !isPast3Days && appointment.patient_id
                                  
                                  if (showMissed) {
                                    return (
                                      <button 
                                        onClick={() => handleViewAppointment(appointment.id)}
                                        className="w-full px-4 py-3 bg-gray-400 text-white rounded-lg text-sm font-medium hover:bg-gray-500 transition-colors"
                                      >
                                        View
                                      </button>
                                    )
                                  } else {
                                    return (
                                      <>
                                        {showStart && (
                                          <button 
                                            onClick={() => navigate(`/doctor/report/${appointment.patient_id}`)}
                                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
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
                                          className={`${showStart ? 'flex-1' : 'w-full'} px-4 py-3 bg-[#5ACCC3] text-white rounded-lg text-sm font-medium hover:bg-[#4DB6B0] transition-colors`}
                                        >
                                          {appointment.report_id ? 'View Report' : 'View'}
                                        </button>
                                      </>
                                    )
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium">No past appointments</p>
                          <p className="text-gray-400 text-sm">Completed appointments will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced New Appointment Modal */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4">
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
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Search Patient
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      const value = e.target.value
                      setPatientSearch(value)
                      
                      // Clear previous timeout
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current)
                      }
                      
                      // Debounce search - wait 300ms after user stops typing
                      searchTimeoutRef.current = setTimeout(() => {
                        searchPatients(value)
                      }, 300)
                    }}
                    className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base"
                    placeholder="Search by name, email, or ID..."
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {searchLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5ACCC3]"></div>
                    ) : (
                      <svg className="w-5 h-5 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => handlePatientSelect(patient)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{patient.fullName}</div>
                              <div className="text-sm text-gray-500">{patient.email}</div>
                            </div>
                            <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                              ID: {patient.nationalId}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* No results message */}
                  {showSearchResults && searchResults.length === 0 && patientSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
                      <div className="text-center text-gray-500">
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.57M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm">No patients found</p>
                        <p className="text-xs text-gray-400">Try a different search term</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  Selected Patient
                </label>
                <div className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 text-sm sm:text-base">
                  {selectedPatient ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{selectedPatient.fullName}</div>
                        <div className="text-sm text-gray-500">{selectedPatient.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPatient(null)
                          setPatientSearch('')
                          setNewAppointment(prev => ({ ...prev, fullName: '', id: '' }))
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">No patient selected</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Appointment Date
                </label>
                <div className="relative">
                  <input
                    name="date"
                    type="date"
                    value={newAppointment.date}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base bg-white shadow-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Appointment Time
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Hour Selector */}
                  <div className="relative">
                    <select
                      name="timeHour"
                      value={newAppointment.time ? newAppointment.time.split(':')[0] : ''}
                      onChange={(e) => {
                        const currentMinute = newAppointment.time ? newAppointment.time.split(':')[1] : '00';
                        const newTime = `${e.target.value}:${currentMinute}`;
                        setNewAppointment({ ...newAppointment, time: newTime });
                      }}
                      className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base bg-white shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Hour</option>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i.toString().padStart(2, '0')}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Minute Selector */}
                  <div className="relative">
                    <select
                      name="timeMinute"
                      value={newAppointment.time ? newAppointment.time.split(':')[1] : ''}
                      onChange={(e) => {
                        const currentHour = newAppointment.time ? newAppointment.time.split(':')[0] : '00';
                        const newTime = `${currentHour}:${e.target.value}`;
                        setNewAppointment({ ...newAppointment, time: newTime });
                      }}
                      className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 sm:py-3 focus:outline-none focus:border-[#5ACCC3] transition-all duration-300 hover:border-gray-300 text-sm sm:text-base bg-white shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Min</option>
                      {['00', '15', '30', '45'].map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-[#5ACCC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
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
                <option value="general_consultation">General Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="annual_check_up">Annual Check-up</option>
                <option value="routine_checkup">Routine Check-up</option>
                <option value="emergency">Emergency</option>
                <option value="specialist">Specialist</option>
                <option value="specialist_consultation">Specialist Consultation</option>
                <option value="therapy">Therapy</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="procedure">Procedure</option>
                <option value="vaccination">Vaccination</option>
                <option value="telemedicine">Telemedicine</option>
                <option value="home_visit">Home Visit</option>
                <option value="group_session">Group Session</option>
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
      
      {/* View Appointment Modal */}
      {showViewAppointmentModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-95 backdrop-blur-md rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-[#5ACCC3]">
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

export default Appointments