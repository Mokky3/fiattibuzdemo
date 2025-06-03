import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { format, isSameDay } from 'date-fns'
import CalendarSidebar from './Dashboard/Calendar'

const Dashboard = () => {
  // Current date and month states
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Load animation effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])
  
  // Mock data for appointments
  const [appointments] = useState([
    {
      id: 1,
      time: '10:00',
      patient: 'Muhammad Hariton',
      problem: 'Anxiety problems',
      description: 'Description of problems and notes are written here',
      provider: 'Name of physician',
      date: new Date()
    },
    {
      id: 2,
      time: '10:30',
      patient: 'Muhammad Hariton',
      problem: 'Anxiety problems',
      description: 'Description of problems and notes are written here',
      provider: 'Name of physician',
      date: new Date()
    },
    {
      id: 3,
      time: '11:00',
      patient: 'Muhammad Hariton',
      problem: 'Anxiety problems',
      description: 'Description of problems and notes are written here',
      provider: 'Name of physician',
      date: new Date()
    },
    {
      id: 4,
      time: '14:00',
      patient: 'Muhammad Hariton',
      problem: 'Anxiety problems',
      description: 'Description of problems and notes are written here',
      provider: 'Name of physician',
      date: new Date()
    }
  ])

  // Mock data for messages
  const [messages] = useState([
    { id: 1, name: 'Ava', lastMessage: 'last message', avatar: 'A' },
    { id: 2, name: 'Mir', lastMessage: 'last message', avatar: 'M' },
    { id: 3, name: 'Ali', lastMessage: 'last message', avatar: 'A' }
  ])

  // Mock data for to-do items
  const [todos, setTodos] = useState([
    { 
      id: 1, 
      date: '13 May - 30 June', 
      description: 'Description of problems and notes are written here',
      provider: 'Name of physician',
      completed: false
    },
    { 
      id: 2, 
      date: '13 May - 30 June', 
      description: 'Description of problems and notes are written here',
      provider: 'Name of physician',
      completed: false
    }
  ])

  // Function to get filtered appointments for selected date
  const getAppointmentsForDate = (date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.date), date)
    );
  }
  
  // Handle date selection
  const handleDateClick = (day) => {
    setSelectedDate(day)
  }

  // Handle month change
  const handleMonthChange = (newDate) => {
    setCurrentDate(newDate)
  }

  // Toggle todo completion
  const toggleTodoCompletion = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />
      
      <div className={`flex flex-col md:flex-row p-4 gap-6 relative transition-all duration-1000 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        {/* Enhanced medical illustrations background */}
        <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
          <div className="w-full h-full bg-repeat animate-pulse" style={{ backgroundImage: "url('/medical-icons.svg')" }}></div>
        </div>
        
        <div className="md:w-1/3 lg:w-1/4 space-y-6">
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
          
          {/* Messages Section */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Messages</h2>
            </div>
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-50 transform transition-all duration-300 hover:shadow-md hover:scale-105 hover:border-[#5ACCC3]/20 cursor-pointer"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white font-semibold mr-3 shadow-md transform transition-transform duration-200 hover:scale-110">
                      {message.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{message.name}</div>
                      <div className="text-sm text-gray-500">{message.lastMessage}</div>
                    </div>
                    <div className="w-3 h-3 bg-gradient-to-br from-green-400 to-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full py-3 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-sm font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50 focus:ring-offset-2">
              View All Messages
            </button>
          </div>
        </div>
        
        <div className="md:w-2/3 lg:w-3/4 space-y-6">
          {/* Appointments Section */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-6 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
                  Appointments for {format(selectedDate, 'MMMM d, yyyy')}
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">{getAppointmentsForDate(selectedDate).length} appointments</span>
              </div>
            </div>
            <div className="space-y-3">
              {getAppointmentsForDate(selectedDate).length > 0 ? (
                getAppointmentsForDate(selectedDate).map((appointment, index) => (
                  <div 
                    key={appointment.id} 
                    className="bg-white rounded-lg border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-[#5ACCC3]/30"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-1 p-4 text-center">
                        <div className="bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg p-2 font-bold text-sm shadow-md">
                          {appointment.time}
                        </div>
                      </div>
                      <div className="col-span-2 p-4">
                        <div className="font-semibold text-gray-800">{appointment.patient}</div>
                      </div>
                      <div className="col-span-2 p-4">
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          {appointment.problem}
                        </span>
                      </div>
                      <div className="col-span-4 p-4 text-gray-600 text-sm">
                        {appointment.description}
                      </div>
                      <div className="col-span-2 p-4 text-gray-500 text-xs">
                        Provider: {appointment.provider}
                      </div>
                      <div className="col-span-1 p-4">
                        <button className="px-4 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-xs font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]/50">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No appointments scheduled</p>
                  <p className="text-gray-400 text-sm">for {format(selectedDate, 'MMMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* To-Do Section */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-6 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-[#5ACCC3] to-[#4DB6B0] rounded-full mr-3"></div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">To-Do</h2>
              </div>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                {todos.filter(todo => !todo.completed).length} pending
              </span>
            </div>
            <div className="space-y-3">
              {todos.map((todo, index) => (
                <div 
                  key={todo.id} 
                  className={`bg-white rounded-lg border overflow-hidden transform transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${
                    todo.completed 
                      ? 'border-green-200 bg-gradient-to-r from-green-50 to-white opacity-75' 
                      : 'border-gray-100 hover:border-[#5ACCC3]/30'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="grid grid-cols-12 items-center">
                    <div className="col-span-2 p-4">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        {todo.date}
                      </span>
                    </div>
                    <div className={`col-span-6 p-4 transition-all duration-300 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                      {todo.description}
                    </div>
                    <div className="col-span-2 p-4 text-gray-500 text-xs">
                      Provider: {todo.provider}
                    </div>
                    <div className="col-span-1 p-4">
                      <button className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                        Docs
                      </button>
                    </div>
                    <div className="col-span-1 p-4 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={todo.completed}
                          onChange={() => toggleTodoCompletion(todo.id)}
                          className="w-5 h-5 text-[#5ACCC3] rounded border-2 border-gray-300 focus:ring-[#5ACCC3] focus:ring-2 transition-all duration-200 transform hover:scale-110"
                        />
                        <span className="ml-2 sr-only">Mark as completed</span>
                      </label>
                    </div>
                  </div>
                  {todo.completed && (
                    <div className="h-1 bg-gradient-to-r from-green-400 to-green-500 animate-pulse"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard