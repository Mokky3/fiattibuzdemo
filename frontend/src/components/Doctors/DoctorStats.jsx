import React, { useEffect, useState } from 'react'
import { Header } from './Header'
import { FiUsers, FiCalendar, FiFileText, FiCheckCircle } from 'react-icons/fi'
import { apiRequest, checkBackendHealth, isAuthenticated, getCurrentUser } from '../../services/apiService'

const DoctorStats = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [stats, setStats] = useState([])
  const [error, setError] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check authentication first
        const isAuth = isAuthenticated()
        setAuthenticated(isAuth)

        if (!isAuth) {
          setError('Please log in to view statistics')
          setIsLoaded(true)
          return
        }

        // Check backend health
        const isHealthy = await checkBackendHealth()
        setBackendConnected(isHealthy)
        
        if (isHealthy) {
          try {
            // Use dedicated stats endpoint
            const statsData = await apiRequest('/doctor/stats')
            const data = statsData?.data || statsData || {}

            setStats([
              {
                id: 1,
                title: 'Patients Seen',
                value: data.patients_seen ?? 0,
                icon: <FiUsers className="text-3xl text-[#4DB6B0]" />,
                bg: 'from-green-50 to-white'
              },
              {
                id: 2,
                title: 'Appointments Today',
                value: data.appointments_today ?? 0,
                icon: <FiCalendar className="text-3xl text-[#4DB6B0]" />,
                bg: 'from-blue-50 to-white'
              },
              {
                id: 3,
                title: 'Prescriptions Written',
                value: data.prescriptions_written ?? 0,
                icon: <FiFileText className="text-3xl text-[#4DB6B0]" />,
                bg: 'from-purple-50 to-white'
              },
              {
                id: 4,
                title: 'Tasks Pending',
                value: data.tasks_pending ?? 0,
                icon: <FiCheckCircle className="text-3xl text-[#4DB6B0]" />,
                bg: 'from-yellow-50 to-white'
              },
              {
                id: 5,
                title: 'Reports Submitted',
                value: data.reports_submitted ?? 0,
                icon: <FiFileText className="text-3xl text-[#4DB6B0]" />,
                bg: 'from-indigo-50 to-white'
              }
            ])
          } catch (apiError) {
            console.error('Failed to load stats from backend:', apiError)
            if (apiError.message.includes('Authentication required')) {
              setAuthenticated(false)
              setError('Please log in to view statistics')
            } else {
              setError('Failed to load statistics from server')
            }
          }
        } else {
          console.log('Backend not available')
          setError('Backend server is not connected. Please ensure the server is running.')
        }
      } catch (err) {
        if (err.message.includes('Authentication required')) {
          setAuthenticated(false)
          setError('Please log in to view statistics')
        } else {
          setError('Failed to load statistics. Please try again.')
        }
        console.error(err)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchStats()
  }, [])

  // Show login prompt if not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to view your statistics.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />
      
      {/* Backend status and error indicators */}
      {!backendConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mx-2 sm:mx-4 mt-4 rounded">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Backend not connected - Please ensure the server is running
          </div>
        </div>
      )}

      <div
        className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-700 transform ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
            My Stats Overview
          </h2>
          {backendConnected && (
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-6 rounded">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
