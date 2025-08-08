import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { format, isSameDay } from 'date-fns'
import CalendarSidebar from './Dashboard/Calendar'
import { dashboardAPI } from '../../services/apiService'

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoaded, setIsLoaded] = useState(false)

  const [appointments, setAppointments] = useState([])
  const [messages, setMessages] = useState([])
  const [todos, setTodos] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const initializeData = async () => {
      try {
        const health = await fetch('http://localhost:8000/health').then(r => r.ok).catch(() => false)
        setBackendConnected(health)

        if (!health) {
          setError('Backend is not connected')
          return
        }

        const [messagesData, todosData] = await Promise.all([
          dashboardAPI.getMessages().catch(() => []),
          dashboardAPI.getTodos().catch(() => [])
        ])

        setMessages(messagesData)
        setTodos(todosData)
      } catch (err) {
        console.error('Failed to initialize data:', err)
        setError('Failed to load initial data')
      }
    }

    initializeData()
  }, [])

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true)
        if (!backendConnected) return

        const dateString = selectedDate.toISOString().split('T')[0]
        const appointmentData = await dashboardAPI.getAppointments(dateString)
        setAppointments(appointmentData)
      } catch (err) {
        console.error('Failed to load appointments:', err)
        setError('Failed to load appointments')
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [selectedDate, backendConnected])

  const handleDateClick = (day) => setSelectedDate(day)
  const handleMonthChange = (newDate) => setCurrentDate(newDate)

  const toggleTodoCompletion = async (id) => {
    try {
      if (backendConnected) await dashboardAPI.toggleTodo(id)
      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ))
    } catch (err) {
      console.error('Failed to toggle todo:', err)
      setError('Failed to update todo')
    }
  }

  const getAppointmentsForDate = (date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.date || selectedDate), date)
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
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
              onDateClick={handleDateClick}
              currentDate={currentDate}
              onMonthChange={handleMonthChange}
            />
          </div>
          
          {/* Messages Section */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
              <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Messages</h2>
              {backendConnected && (
                <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="space-y-3">
              {messages.length > 0 ? messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-50 transform transition-all duration-300 hover:shadow-md hover:scale-105 hover:border-[#5ACCC3]/20 cursor-pointer"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white font-semibold mr-3 shadow-md transform transition-transform duration-200 hover:scale-110 text-xs sm:text-sm">
                      {message.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">{message.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500 truncate">{message.lastMessage}</div>
                    </div>
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-br from-green-400 to-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 text-sm sm:text-base">
                  No messages available
                </div>
              )}
            </div>
            <button className="mt-4 sm:mt-6 w-full py-2 sm:py-3 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-xs sm:text-sm font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50 focus:ring-offset-2">
              View All Messages
            </button>
          </div>
        </div>
        
        <div className="lg:w-2/3 xl:w-3/4 space-y-4 sm:space-y-6">
          {/* Appointments Section */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
                  Appointments for {format(selectedDate, 'MMMM d, yyyy')}
                </h2>
                {backendConnected && (
                  <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {loading ? (
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                ) : (
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                )}
                <span className="text-xs sm:text-sm text-gray-500">
                  {loading ? 'Loading...' : `${getAppointmentsForDate(selectedDate).length} appointments`}
                </span>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#5ACCC3]"></div>
                <span className="ml-3 text-gray-500 text-sm sm:text-base">Loading appointments...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {getAppointmentsForDate(selectedDate).length > 0 ? (
                  getAppointmentsForDate(selectedDate).map((appointment, index) => (
                    <div 
                      key={appointment.id} 
                      className="bg-white rounded-lg border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-[#5ACCC3]/30"
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-0">
                        <div className="col-span-1 p-3 sm:p-4 text-center">
                          <div className="bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg p-2 font-bold text-xs sm:text-sm shadow-md min-w-[60px] sm:min-w-[80px]">
                            {appointment.time}
                          </div>
                        </div>
                        <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                          <div className="font-semibold text-gray-800 text-sm sm:text-base">{appointment.patient}</div>
                        </div>
                        <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
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
                  ))
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium text-sm sm:text-base">No appointments scheduled</p>
                    <p className="text-gray-400 text-xs sm:text-sm">for {format(selectedDate, 'MMMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* To-Do Section */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">To-Do</h2>
                {backendConnected && (
                  <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
                {todos.filter(todo => !todo.completed).length} pending
              </span>
            </div>
            <div className="space-y-3">
              {todos.length > 0 ? todos.map((todo, index) => (
                <div 
                  key={todo.id} 
                  className={`bg-white rounded-lg border overflow-hidden transform transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${
                    todo.completed 
                      ? 'border-green-200 bg-gradient-to-r from-green-50 to-white opacity-75' 
                      : 'border-gray-100 hover:border-[#5ACCC3]/30'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-0">
                    <div className="col-span-1 sm:col-span-2 p-3 sm:p-4">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        {todo.date}
                      </span>
                    </div>
                    <div className={`col-span-1 sm:col-span-6 p-3 sm:p-4 transition-all duration-300 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-600'} text-sm sm:text-base`}>
                      {todo.description}
                    </div>
                    <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 text-gray-500 text-xs">
                      Provider: {todo.provider}
                    </div>
                    <div className="col-span-1 p-3 sm:p-4">
                      <button className="w-full sm:w-auto px-2 sm:px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                        Docs
                      </button>
                    </div>
                    <div className="col-span-1 p-3 sm:p-4 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={todo.completed}
                          onChange={() => toggleTodoCompletion(todo.id)}
                          disabled={loading}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-[#5ACCC3] rounded border-2 border-gray-300 focus:ring-[#5ACCC3] focus:ring-2 transition-all duration-200 transform hover:scale-110 disabled:opacity-50"
                        />
                        <span className="ml-2 sr-only">Mark as completed</span>
                      </label>
                    </div>
                  </div>
                  {todo.completed && (
                    <div className="h-1 bg-gradient-to-r from-green-400 to-green-500 animate-pulse"></div>
                  )}
                </div>
              )) : (
                <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
                  No tasks available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard