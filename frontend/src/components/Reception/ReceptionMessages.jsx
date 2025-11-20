import React, { useState } from 'react'
import { ReceptionistHeader } from './ReceptionHeader'

const ReceptionMessages = () => {
  const [selectedPatient, setSelectedPatient] = useState('Sarah Johnson')
  const [message, setMessage] = useState('')

  const patients = [
    { id: 1, name: 'Sarah Johnson', issue: 'Appointment inquiry', active: true, lastMessage: '2 min ago' },
    { id: 2, name: 'David Chen', issue: 'Insurance question', lastMessage: '15 min ago' },
    { id: 3, name: 'Maria Rodriguez', issue: 'Schedule change', lastMessage: '1 hour ago' },
    { id: 4, name: 'John Smith', issue: 'Prescription refill', lastMessage: '2 hours ago' },
    { id: 5, name: 'Emily Davis', issue: 'Test results inquiry', lastMessage: '3 hours ago' }
  ]

  const messages = [
    { id: 1, sender: 'patient', text: 'Hi, I need to reschedule my appointment for tomorrow', time: '10:30 AM' },
    { id: 2, sender: 'reception', text: 'Hello! I can help you with that. What time would work better for you?', time: '10:32 AM' },
    { id: 3, sender: 'patient', text: 'Would Friday afternoon be possible?', time: '10:35 AM' },
    { id: 4, sender: 'reception', text: 'Let me check the schedule. We have availability at 2:30 PM or 4:00 PM on Friday.', time: '10:37 AM' },
    { id: 5, sender: 'patient', text: '2:30 PM would be perfect, thank you!', time: '10:40 AM' }
  ]

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sent:', message)
      setMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />
      <div className="max-w-screen-xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-[70vh] sm:h-[80vh]">
          
          {/* Left Sidebar - Patient List */}
          <div className="w-full lg:w-1/3 border-r bg-gray-50 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-700">Patient Messages</h2>
              <span className="bg-[#4DB6B0] text-white text-xs px-2 py-1 rounded-full">
                {patients.length}
              </span>
            </div>
            
            <div className="space-y-2 sm:space-y-3 overflow-y-auto h-full pr-2">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient.name)}
                  className={`rounded-lg border px-3 sm:px-4 py-2 sm:py-3 cursor-pointer shadow-sm transition-all duration-200 ${
                    patient.active || patient.name === selectedPatient
                      ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white font-semibold transform scale-[1.02]'
                      : 'bg-white hover:bg-gray-100 text-gray-800 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">{patient.name}</div>
                    <div className={`text-xs ${patient.active || patient.name === selectedPatient ? 'text-white/80' : 'text-gray-400'}`}>
                      {patient.lastMessage}
                    </div>
                  </div>
                  <div className={`text-xs ${patient.active || patient.name === selectedPatient ? 'text-white/80' : 'text-gray-500'}`}>
                    {patient.issue}
                  </div>
                  {patient.active && (
                    <div className="mt-2">
                      <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="w-full lg:w-2/3 flex flex-col relative">
            {/* Chat Header */}
            <div className="border-b px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#4DB6B0]">{selectedPatient}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Patient Communication</p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors">
                    Active
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 sm:p-6 bg-gray-100 overflow-y-auto">
              <div className="space-y-3 sm:space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'reception' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs sm:max-w-sm lg:max-w-md px-3 sm:px-4 py-2 rounded-lg shadow-sm ${
                        msg.sender === 'reception'
                          ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white'
                          : 'bg-white text-gray-800 border'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'reception' ? 'text-white/70' : 'text-gray-500'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t px-3 sm:px-4 py-2 sm:py-3 bg-white">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type your message to patient..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 sm:px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className={`p-2 rounded-full text-white transition-all duration-200 ${
                    message.trim() 
                      ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] hover:scale-110 hover:shadow-lg' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap space-x-2 mt-2 sm:mt-3">
                <button className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 transition-colors">
                  Schedule Appointment
                </button>
                <button className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs hover:bg-green-200 transition-colors">
                  Send Forms
                </button>
                <button className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs hover:bg-purple-200 transition-colors">
                  Insurance Info
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceptionMessages