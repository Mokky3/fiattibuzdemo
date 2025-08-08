import React, { useEffect, useState } from 'react'
import {
  FiUsers, FiActivity, FiSettings, FiFileText, FiShield,
  FiBarChart2, FiServer, FiBell, FiAlertTriangle, FiMessageCircle
} from 'react-icons/fi'
import AdminHeader from './AdminHeader'
import { adminAPI } from '../../services/apiService'

const iconMap = {
  users: <FiUsers className="text-xl text-[#4DB6B0]" />,
  clinics: <FiActivity className="text-xl text-[#4DB6B0]" />,
  logs: <FiServer className="text-xl text-[#4DB6B0]" />,
  roles: <FiShield className="text-xl text-[#4DB6B0]" />,
  reports: <FiBarChart2 className="text-xl text-[#4DB6B0]" />,
  announcements: <FiBell className="text-xl text-[#4DB6B0]" />,
  error: <FiAlertTriangle className="text-red-500" />,
  alert: <FiActivity className="text-yellow-500" />,
  notification: <FiBell className="text-blue-500" />,
  message: <FiMessageCircle className="text-green-500" />
}

const AdminDashboard = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [stats, setStats] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch stats and alerts in parallel
        const [statsData, alertsData] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getAlerts()
        ])

        // Map icons to stats
        const preparedStats = statsData.map(stat => ({
          ...stat,
          icon: iconMap[stat.key] || <FiSettings className="text-xl text-[#4DB6B0]" />
        }))

        const preparedAlerts = alertsData.map(alert => ({
          ...alert,
          icon: iconMap[alert.type?.toLowerCase()] || <FiBell className="text-blue-500" />
        }))

        setStats(preparedStats)
        setAlerts(preparedAlerts)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0]"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <FiAlertTriangle className="text-red-400 text-xl mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Admin Dashboard</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {stats.map((s, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-white border border-gray-100 shadow hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">{s.title}</div>
                    <div className="text-3xl font-bold text-gray-800 mt-2">{s.value}</div>
                    {s.trend && (
                      <div className={`text-sm mt-1 ${s.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {s.trend >= 0 ? '+' : ''}{s.trend}% from last period
                      </div>
                    )}
                  </div>
                  <div>{s.icon}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Quick Admin Actions</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                <li>Manage User Accounts & Bulk Import</li>
                <li>Configure Clinics, Departments & Policies</li>
                <li>Create & Assign Custom Roles</li>
                <li>Audit Logs & Monitor System Activity</li>
                <li>Manage Notifications & Communication Gateway</li>
                <li>Import / Export Clinical Data</li>
                <li>Edit Module Access & Feature Toggles</li>
              </ul>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <h4 className="text-md font-semibold mb-3 text-gray-700">System Alerts & Messages</h4>
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-500">No alerts at this time</p>
              ) : (
                <ul className="space-y-3">
                  {alerts.map((alert, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <span className="mr-2">{alert.icon}</span>
                      <span>{alert.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
