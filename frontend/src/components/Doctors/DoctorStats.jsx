import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Header } from './Header'
import { FiUsers, FiCalendar, FiFileText, FiCheckCircle } from 'react-icons/fi'

const DoctorStats = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [stats, setStats] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/doctor/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const data = response.data

        setStats([
          {
            id: 1,
            title: 'Patients Seen',
            value: data.patients_seen,
            icon: <FiUsers className="text-3xl text-[#4DB6B0]" />,
            bg: 'from-green-50 to-white'
          },
          {
            id: 2,
            title: 'Appointments Today',
            value: data.appointments_today,
            icon: <FiCalendar className="text-3xl text-[#4DB6B0]" />,
            bg: 'from-blue-50 to-white'
          },
          {
            id: 3,
            title: 'Prescriptions Written',
            value: data.prescriptions_written,
            icon: <FiFileText className="text-3xl text-[#4DB6B0]" />,
            bg: 'from-purple-50 to-white'
          },
          {
            id: 4,
            title: 'Tasks Pending',
            value: data.tasks_pending,
            icon: <FiCheckCircle className="text-3xl text-[#4DB6B0]" />,
            bg: 'from-yellow-50 to-white'
          }
        ])
      } catch (err) {
        setError('Failed to load statistics. Please try again.')
        console.error(err)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />

      <div
        className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-700 transform ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
          My Stats Overview
        </h2>

        {error && (
          <div className="text-red-500 mb-6 text-sm text-center">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.length > 0 ? (
            stats.map((stat) => (
              <div
                key={stat.id}
                className={`rounded-xl p-6 shadow-md border border-gray-100 bg-gradient-to-br ${stat.bg} hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-gray-700 font-semibold text-lg">{stat.title}</div>
                  {stat.icon}
                </div>
                <div className="mt-4 text-4xl font-bold text-gray-800">{stat.value}</div>
              </div>
            ))
          ) : (
            <div className="text-gray-500 col-span-full text-center">Loading statistics...</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorStats
