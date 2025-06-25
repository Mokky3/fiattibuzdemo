import React, { useEffect, useState } from 'react'
import { Header } from './Header'
import { FiUsers, FiCalendar, FiFileText, FiCheckCircle } from 'react-icons/fi'

const DoctorStats = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    {
      id: 1,
      title: 'Patients Seen',
      value: 128,
      icon: <FiUsers className="text-3xl text-[#4DB6B0]" />,
      bg: 'from-green-50 to-white'
    },
    {
      id: 2,
      title: 'Appointments Today',
      value: 6,
      icon: <FiCalendar className="text-3xl text-[#4DB6B0]" />,
      bg: 'from-blue-50 to-white'
    },
    {
      id: 3,
      title: 'Prescriptions Written',
      value: 94,
      icon: <FiFileText className="text-3xl text-[#4DB6B0]" />,
      bg: 'from-purple-50 to-white'
    },
    {
      id: 4,
      title: 'Tasks Pending',
      value: 3,
      icon: <FiCheckCircle className="text-3xl text-[#4DB6B0]" />,
      bg: 'from-yellow-50 to-white'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />

      <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
          My Stats Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
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
          ))}
        </div>
      </div>
    </div>
  )
}

export default DoctorStats
