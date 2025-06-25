import React, { useState } from 'react'
import { Header } from './Header'
import { FiSend } from 'react-icons/fi'

const DoctorMessages = () => {
  const [selectedPatient, setSelectedPatient] = useState('Muhammad Hariton')
  const [message, setMessage] = useState('')

  const patients = [
    { id: 1, name: 'Muhammad Hariton', issue: 'Anxiety problems', active: true },
    { id: 2, name: 'Muhammad Hariton', issue: 'Anxiety problems' },
    { id: 3, name: 'Muhammad Hariton', issue: 'Anxiety problems' },
    { id: 4, name: 'Muhammad Hariton', issue: 'Anxiety problems' }
  ]

  const handleSend = () => {
    // Later: send to backend
    console.log('Sent:', message)
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-[80vh]">
          
          {/* Left Sidebar - Patient List */}
          <div className="w-1/3 border-r bg-gray-50 p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Patients List</h2>
            <div className="space-y-3 overflow-y-auto h-full pr-2">
              {patients.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p.name)}
                  className={`rounded-lg border px-4 py-2 cursor-pointer shadow-sm ${
                    p.active || p.name === selectedPatient
                      ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white font-semibold'
                      : 'bg-white hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm">{p.name}</div>
                  <div className={`text-xs ${p.active ? 'text-white/80' : 'text-gray-500'}`}>
                    {p.issue}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="w-2/3 flex flex-col relative">
            {/* Header */}
            <div className="border-b px-6 py-4 text-lg font-semibold text-center text-[#4DB6B0] bg-gray-50">
              {selectedPatient}
            </div>

            {/* Message body */}
            <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
              {/* Placeholder: message history */}
              <div className="w-full h-full bg-gray-300 rounded-xl animate-pulse"></div>
            </div>

            {/* Input box */}
            <div className="flex items-center border-t px-4 py-3 bg-white">
              <input
                type="text"
                placeholder="Message TABIB"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
              />
              <button
                onClick={handleSend}
                className="ml-3 p-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] rounded-full text-white hover:scale-110 transition"
              >
                <FiSend />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorMessages
