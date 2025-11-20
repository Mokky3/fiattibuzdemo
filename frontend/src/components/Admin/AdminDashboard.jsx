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
  doctors: <FiUsers className="text-xl text-blue-500" />,
  nurses: <FiUsers className="text-xl text-purple-500" />,
  patients: <FiUsers className="text-xl text-green-500" />,
  appointments: <FiFileText className="text-xl text-orange-500" />,
  activities: <FiActivity className="text-xl text-indigo-500" />,
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

        console.log('Dashboard - Raw stats data:', statsData)
        console.log('Dashboard - Raw alerts data:', alertsData)

        // Backend returns SuccessResponse with data field, extract it properly
        const statsArray = Array.isArray(statsData?.data) ? statsData.data : (Array.isArray(statsData) ? statsData : [])
        const alertsArray = Array.isArray(alertsData?.data) ? alertsData.data : (Array.isArray(alertsData) ? alertsData : [])

        // Map icons to stats
        const preparedStats = statsArray.map(stat => ({
          ...stat,
          icon: iconMap[stat.key] || <FiSettings className="text-xl text-[#4DB6B0]" />
        }))

        const preparedAlerts = alertsArray.map(alert => ({
          ...alert,
          icon: iconMap[alert.type?.toLowerCase()] || <FiBell className="text-blue-500" />
        }))

        console.log('Dashboard - Prepared stats:', preparedStats)
        console.log('Dashboard - Prepared alerts:', preparedAlerts)

        setStats(preparedStats)
        setAlerts(preparedAlerts)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        setError('Failed to load dashboard data. Please try again.')
        
        // Set fallback data for testing - 8 boxes total with sample chart data
        const generateSampleChartData = (baseValue, variation = 0.3) => {
          return Array.from({ length: 30 }, (_, i) => {
            const trend = Math.sin(i * 0.2) * variation;
            return Math.max(0, Math.round(baseValue * (1 + trend)));
          });
        };

        const fallbackStats = [
          {"key": "users", "title": "Total Users", "value": 8, "trend": 12.5, "description": "Active system users across all clinics", "chartData": generateSampleChartData(8, 0.2)},
          {"key": "clinics", "title": "Active Clinics", "value": 1, "trend": 0.0, "description": "Clinics currently operational", "chartData": generateSampleChartData(1, 0.1)},
          {"key": "doctors", "title": "Doctors", "value": 1, "trend": 0.0, "description": "Medical professionals in the system", "chartData": generateSampleChartData(1, 0.1)},
          {"key": "nurses", "title": "Nurses", "value": 1, "trend": 0.0, "description": "Nursing staff members", "chartData": generateSampleChartData(1, 0.1)},
          {"key": "patients", "title": "Patients", "value": 1, "trend": 0.0, "description": "Registered patients", "chartData": generateSampleChartData(1, 0.1)},
          {"key": "appointments", "title": "Appointments Today", "value": 0, "trend": -5.2, "description": "Scheduled appointments today", "chartData": generateSampleChartData(2, 0.8)},
          {"key": "activities", "title": "Recent Activities", "value": 10, "trend": 8.3, "description": "Admin activities in last 7 days", "chartData": generateSampleChartData(10, 0.6)},
          {"key": "roles", "title": "User Roles", "value": 9, "trend": 0.0, "description": "Different user roles configured", "chartData": generateSampleChartData(9, 0.05)},
        ]
        
        const preparedFallbackStats = fallbackStats.map(stat => ({
          ...stat,
          icon: iconMap[stat.key] || <FiSettings className="text-xl text-[#4DB6B0]" />
        }))
        
        setStats(preparedFallbackStats)
        setAlerts([])
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
                <p className="text-sm text-red-600 mt-2">If you continue to see this error, please contact your system administrator.</p>
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

      <div className={`w-full px-2 lg:px-4 py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Admin Dashboard</h2>

        <div className="flex flex-row gap-8">
          {/* Left Sidebar - 1/4 of width */}
          <div className="w-1/4 space-y-3">
            {/* Quick Actions */}
            <div className="bg-white p-3 rounded-xl shadow border border-gray-100">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
                <FiSettings className="mr-2 text-[#4DB6B0]" />
                Quick Admin Actions
              </h4>
              <ul className="text-xs text-gray-600 space-y-1.5">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-[#4DB6B0] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Manage User Accounts & Bulk Import</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-[#4DB6B0] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Configure Clinics, Departments & Policies</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-[#4DB6B0] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Create & Assign Custom Roles</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-[#4DB6B0] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Audit Logs & Monitor System Activity</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-[#4DB6B0] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Manage Notifications & Communication Gateway</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-[#4DB6B0] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Import / Export Clinical Data</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-[#4DB6B0] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Edit Module Access & Feature Toggles</span>
                </li>
              </ul>
            </div>

            {/* System Status */}
            <div className="bg-white p-3 rounded-xl shadow border border-gray-100">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
                <FiServer className="mr-2 text-[#4DB6B0]" />
                System Status
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Database</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Operational</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">API Services</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Operational</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Background Jobs</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Operational</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Uptime</span>
                  <span className="text-gray-800 font-medium">99.9%</span>
                </div>
              </div>
            </div>

            {/* System Alerts & Messages */}
            <div className="bg-white p-3 rounded-xl shadow border border-gray-100">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
                <FiBell className="mr-2 text-[#4DB6B0]" />
                System Alerts & Messages
              </h4>
              {alerts.length === 0 ? (
                <div className="text-center py-3">
                  <FiBell className="mx-auto text-xl text-gray-300 mb-1" />
                  <p className="text-xs text-gray-500">No alerts at this time</p>
                  <p className="text-xs text-gray-400 mt-1">You have nothing yet. Alerts will appear here when there are system notifications.</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {alerts.map((alert, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <span className="mr-2 mt-0.5">{alert.icon}</span>
                      <div>
                        <span className="block">{alert.message}</span>
                        {alert.timestamp && (
                          <span className="text-xs text-gray-400">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Activity Summary */}
            <div className="bg-white p-3 rounded-xl shadow border border-gray-100">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
                <FiActivity className="mr-2 text-[#4DB6B0]" />
                Recent Activity
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last 24 hours</span>
                  <span className="text-gray-800 font-medium">
                    {stats.find(s => s.key === 'activities')?.value || 0} activities
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New users (7 days)</span>
                  <span className="text-gray-800 font-medium">
                    {stats.find(s => s.key === 'activities')?.description?.match(/\((\d+) new users\)/)?.[1] || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active sessions</span>
                  <span className="text-gray-800 font-medium">-</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Panel - Data Boxes - 3/4 of width */}
          <div className="w-3/4">
            {/* Section Header */}
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Data for last 30 days</h3>
            
            {/* Statistics Grid - 4 rows × 2 columns */}
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              {stats.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-white rounded-xl border border-gray-100 shadow">
                  <FiBarChart2 className="mx-auto text-4xl text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Statistics Available</h3>
                  <p className="text-sm text-gray-500">You have nothing yet. Statistics will appear here once you start using the system.</p>
                </div>
              ) : (
                stats.map((s, idx) => (
                  <div key={idx} className="p-4 lg:p-6 rounded-xl bg-white border border-gray-100 shadow hover:shadow-lg hover:scale-[1.02] transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-500 font-medium">{s.title}</div>
                      <div className="text-2xl">{s.icon}</div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">{s.value}</div>
                    <div className="text-xs text-gray-400 mb-3">{s.description}</div>
                    
                    {/* Line Chart Area - 30 days */}
                    <div className="h-16 bg-gray-50 rounded-lg p-2 mb-3">
                      <div className="h-full flex items-end justify-between space-x-0.5">
                        {s.chartData && s.chartData.length > 0 ? (
                          s.chartData.map((value, i) => {
                            // Calculate height percentage based on max value in dataset
                            const maxValue = Math.max(...s.chartData);
                            const minValue = Math.min(...s.chartData);
                            const range = maxValue - minValue;
                            const height = range > 0 ? ((value - minValue) / range) * 80 + 10 : 50;
                            
                            return (
                              <div
                                key={i}
                                className="bg-[#4DB6B0] rounded-t transition-all duration-300 hover:bg-[#3DA6A0]"
                                style={{ height: `${height}%`, width: '3px' }}
                                title={`Day ${i + 1}: ${value}`}
                              />
                            );
                          })
                        ) : (
                          // Fallback if no chart data
                          Array.from({ length: 30 }, (_, i) => (
                            <div
                              key={i}
                              className="bg-gray-300 rounded-t"
                              style={{ height: '20%', width: '3px' }}
                            />
                          ))
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 text-center">30-day trend</div>
                    </div>
                    
                    {s.trend !== undefined && (
                      <div className={`text-xs flex items-center ${s.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-1">{s.trend >= 0 ? '↗' : '↘'}</span>
                        {s.trend >= 0 ? '+' : ''}{s.trend}% from last period
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
