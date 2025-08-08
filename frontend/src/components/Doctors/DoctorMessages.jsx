import React, { useEffect, useState } from 'react'
import { Header } from './Header'
import { FiSend } from 'react-icons/fi'
import axios from 'axios'

const DoctorMessages = () => {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/doctor/patients', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const patientList = Array.isArray(res.data) ? res.data : []
        setPatients(patientList)
        if (patientList.length > 0) setSelectedPatient(patientList[0])
      } catch (err) {
        console.error('Failed to fetch patients:', err)
        setPatients([])
      } finally {
        setLoading(false)
      }
    }


    fetchPatients()
  }, [])

  const handleSend = async () => {
    if (!selectedPatient || !message.trim()) return
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        '/api/doctor/send-message',
        {
          recipient_id: selectedPatient.id,
          content: message.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      setMessage('')
    } catch (err) {
      console.error('Message send failed:', err)
    }
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
              {loading ? (
                <p className="text-gray-400 text-sm">Loading patients...</p>
              ) : patients.length === 0 ? (
                <p className="text-gray-400 text-sm">No patients found.</p>
              ) : (
                patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`rounded-lg border px-4 py-2 cursor-pointer shadow-sm ${
                      selectedPatient?.id === p.id
                        ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white font-semibold'
                        : 'bg-white hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.issue || '—'}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="w-2/3 flex flex-col relative">
            <div className="border-b px-6 py-4 text-lg font-semibold text-center text-[#4DB6B0] bg-gray-50">
              {selectedPatient ? selectedPatient.name : 'Select a patient'}
            </div>

            <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
              {/* Placeholder for message history */}
              <div className="w-full h-full bg-gray-300 rounded-xl animate-pulse"></div>
            </div>

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
