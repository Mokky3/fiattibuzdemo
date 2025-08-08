import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import {
  FiArrowLeft, FiRefreshCw, FiTrendingUp, FiActivity, FiUsers, FiCalendar,
  FiBarChart2, FiClock, FiFilter, FiSearch, FiChevronLeft, FiChevronRight
} from 'react-icons/fi'

// API service functions
const userStatsService = {
  async fetchUserStats(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  async fetchUserInfo(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch user info');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  },

  async fetchUserActivityHistory(userId, page = 1, limit = 20, filter = 'all') {
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity?page=${page}&limit=${limit}&filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch activity history');
      return await response.json();
    } catch (error) {
      console.error('Error fetching activity history:', error);
      throw error;
    }
  }
}

const AdminUserStats = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [userStats, setUserStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activityFilter, setActivityFilter] = useState('all')
  const [activitySearch, setActivitySearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    loadUserStats()
  }, [id])

  const loadUserStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const [userInfo, statsData, activityData] = await Promise.all([
        userStatsService.fetchUserInfo(id),
        userStatsService.fetchUserStats(id),
        userStatsService.fetchUserActivityHistory(id)
      ])

      setUserStats({
        user: userInfo,
        stats: statsData.stats,
        performance: statsData.performance,
        weeklyActivity: statsData.weeklyActivity,
        health: statsData.health,
        recentActivity: statsData.recentActivity,
        activityHistory: activityData
      })
    } catch (err) {
      setError('Failed to load user statistics. Please try again.')
      console.error('Error loading user stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Activity filtering and pagination
  const getFilteredActivities = () => {
    if (!userStats?.activityHistory?.activities) return []
    
    let filtered = userStats.activityHistory.activities
    
    // Apply type filter
    if (activityFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === activityFilter)
    }
    
    // Apply search filter
    if (activitySearch.trim()) {
      const searchTerm = activitySearch.toLowerCase()
      filtered = filtered.filter(activity => 
        activity.action.toLowerCase().includes(searchTerm) ||
        activity.details.toLowerCase().includes(searchTerm)
      )
    }
    
    return filtered
  }

  const getPaginatedActivities = () => {
    const filtered = getFilteredActivities()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filtered.slice(startIndex, endIndex)
  }

  const getTotalPages = () => {
    return Math.ceil(getFilteredActivities().length / itemsPerPage)
  }

  const getActivityIcon = (type) => {
    const icons = {
      appointment: '📅',
      prescription: '💊',
      login: '🔐',
      consultation: '👨‍⚕️',
      report: '📊',
      system: '⚙️',
      vitals: '🩺',
      medication: '💉',
      shift: '⏰',
      emergency: '🚨',
      documentation: '📝',
      training: '🎓',
      handoff: '🤝',
      assessment: '📋',
      lab: '🧪',
      portal: '💻',
      registration: '📋'
    }
    return icons[type] || '📌'
  }

  const getActivityTypeOptions = () => {
    if (!userStats?.activityHistory?.activities) return []
    
    const types = [...new Set(userStats.activityHistory.activities.map(activity => activity.type))]
    return types.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }))
  }

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      success: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      updated: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
      scheduled: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      recorded: 'bg-gray-100 text-gray-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading user statistics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !userStats) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => navigate(-1)} 
              className="text-gray-600 hover:text-[#4DB6B0] flex items-center gap-1 text-sm transition-colors"
            >
              <FiArrowLeft /> Back
            </button>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error || 'User not found'}</p>
              <button
                onClick={loadUserStats}
                className="bg-[#4DB6B0] text-white px-4 py-2 rounded-md hover:bg-[#43b0a8] transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { user, stats, performance, weeklyActivity, health, recentActivity, activityHistory } = userStats

  const getTrendIcon = (trend) => {
    if (trend > 0) return <span className="text-green-500">↗️</span>
    if (trend < 0) return <span className="text-red-500">↘️</span>
    return <span className="text-gray-500">→</span>
  }

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const StatCard = ({ icon, title, value, subtitle, trend, color = 'bg-[#4DB6B0]' }) => (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`${color} text-white p-3 rounded-lg`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1">
            {getTrendIcon(trend)}
            <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        <p className="text-sm text-gray-600">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )

  const renderDoctorStats = () => (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FiCalendar />}
          title="Total Appointments"
          value={stats.appointments.total}
          subtitle={`${stats.appointments.thisMonth} this month`}
          trend={stats.appointments.trend}
        />
        <StatCard
          icon={<FiActivity />}
          title="Prescriptions Written"
          value={stats.prescriptions.total}
          subtitle={`${stats.prescriptions.thisMonth} this month`}
          trend={stats.prescriptions.trend}
          color="bg-blue-500"
        />
        <StatCard
          icon={<FiUsers />}
          title="Total Patients"
          value={stats.patients.total}
          subtitle={`${stats.patients.active} active, ${stats.patients.new} new`}
          trend={stats.patients.trend}
          color="bg-green-500"
        />
        <StatCard
          icon={<FiTrendingUp />}
          title="Revenue Generated"
          value={`$${stats.revenue.total.toLocaleString()}`}
          subtitle={`$${stats.revenue.thisMonth.toLocaleString()} this month`}
          trend={stats.revenue.trend}
          color="bg-purple-500"
        />
      </div>

      {/* Performance Metrics */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FiBarChart2 className="text-[#4DB6B0]" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.punctuality}%</div>
            <div className="text-sm text-gray-600">Punctuality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.patientSatisfaction}/5</div>
            <div className="text-sm text-gray-600">Patient Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.responseTime}m</div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.completionRate}%</div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderNurseStats = () => (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FiActivity />}
          title="Vitals Recorded"
          value={stats.vitalsTaken.total}
          subtitle={`${stats.vitalsTaken.thisMonth} this month`}
          trend={stats.vitalsTaken.trend}
        />
        <StatCard
          icon={<FiClock />}
          title="Shifts Completed"
          value={stats.shifts.total}
          subtitle={`${stats.shifts.thisMonth} this month, ${stats.shifts.overtime} overtime`}
          trend={stats.shifts.trend}
          color="bg-blue-500"
        />
        <StatCard
          icon={<FiUsers />}
          title="Patients Assisted"
          value={stats.patients.total}
          subtitle={`${stats.patients.assisted} this month, ${stats.patients.critical} critical`}
          trend={stats.patients.trend}
          color="bg-green-500"
        />
        <StatCard
          icon={<FiTrendingUp />}
          title="Emergency Response"
          value={`${stats.emergencies.response}%`}
          subtitle={`${stats.emergencies.thisMonth} emergencies this month`}
          trend={stats.emergencies.trend}
          color="bg-red-500"
        />
      </div>

      {/* Performance Metrics */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FiBarChart2 className="text-[#4DB6B0]" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.punctuality}%</div>
            <div className="text-sm text-gray-600">Punctuality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.efficiency}%</div>
            <div className="text-sm text-gray-600">Efficiency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.teamwork}/5</div>
            <div className="text-sm text-gray-600">Teamwork Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{performance.accuracy}%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPatientStats = () => (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FiCalendar />}
          title="Total Appointments"
          value={stats.appointments.total}
          subtitle={`${stats.appointments.completed} completed, ${stats.appointments.upcoming} upcoming`}
          color="bg-[#4DB6B0]"
        />
        <StatCard
          icon={<FiActivity />}
          title="Active Treatments"
          value={stats.treatments.ongoing}
          subtitle={`${stats.treatments.completed} completed treatments`}
          color="bg-blue-500"
        />
        <StatCard
          icon={<FiUsers />}
          title="Total Visits"
          value={stats.visits.total}
          subtitle={`${stats.visits.thisYear} this year`}
          color="bg-green-500"
        />
        <StatCard
          icon={<FiTrendingUp />}
          title="Prescriptions"
          value={stats.prescriptions.total}
          subtitle={`${stats.prescriptions.active} active prescriptions`}
          color="bg-purple-500"
        />
      </div>

      {/* Health Overview */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FiActivity className="text-[#4DB6B0]" />
          Health Overview
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{health.bloodPressure}</div>
            <div className="text-sm text-gray-600">Blood Pressure</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{health.heartRate}</div>
            <div className="text-sm text-gray-600">Heart Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{health.weight}</div>
            <div className="text-sm text-gray-600">Weight Trend</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{health.overallHealth}</div>
            <div className="text-sm text-gray-600">Overall Health</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FiClock className="text-[#4DB6B0]" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="font-medium text-gray-800">{activity.type}</div>
                <div className="text-sm text-gray-600">{activity.doctor}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-800">{activity.date}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  activity.status === 'Completed' ? 'bg-green-100 text-green-700' :
                  activity.status === 'Normal' ? 'bg-blue-100 text-blue-700' :
                  activity.status === 'Filled' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {activity.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const roleStatsMap = {
    Doctor: renderDoctorStats,
    Nurse: renderNurseStats,
    Patient: renderPatientStats,
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />
      
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="text-gray-600 hover:text-[#4DB6B0] flex items-center gap-1 text-sm transition-colors"
            >
              <FiArrowLeft /> Back
            </button>
          </div>
          <button
            onClick={loadUserStats}
            disabled={loading}
            className="text-gray-600 hover:text-[#4DB6B0] p-2 transition-colors"
            title="Refresh Statistics"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* User Info Header */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#4DB6B0] mb-2">{user.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-medium">{user.role}</span>
                <span>•</span>
                <span>{user.clinic}</span>
                <span>•</span>
                <span>ID: {user.id}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span>Joined: {user.joinDate}</span>
                <span>•</span>
                <span>Last {user.role === 'Patient' ? 'Visit' : 'Login'}: {user.lastLogin || user.lastVisit}</span>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {user.status}
            </div>
          </div>
        </div>

        {/* Statistics Content */}
        {roleStatsMap[user.role] ? (
          roleStatsMap[user.role]()
        ) : (
          <div className="bg-white p-8 rounded-xl shadow border border-gray-100 text-center">
            <div className="text-gray-400 text-lg mb-2">📊</div>
            <p className="text-gray-600">No statistics available for this role.</p>
          </div>
        )}

        {/* Weekly Activity Chart */}
        {weeklyActivity && (
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-[#4DB6B0]" />
              Weekly Activity
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {weeklyActivity.map((day, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-600 mb-2">{day.day}</div>
                  <div className="bg-gray-100 rounded-md p-3">
                    <div className="text-sm font-medium text-gray-800">
                      {user.role === 'Doctor' ? day.appointments : day.patients || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.role === 'Doctor' ? 'appts' : 'patients'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {day.hours}h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity History Section */}
        {activityHistory && (
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <FiClock className="text-[#4DB6B0]" />
                Activity History
                <span className="text-sm font-normal text-gray-500">
                  ({activityHistory.total} total activities)
                </span>
              </h3>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex items-center gap-2">
                <FiFilter className="text-gray-400" />
                <select
                  value={activityFilter}
                  onChange={(e) => {
                    setActivityFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                >
                  <option value="all">All Activities</option>
                  {getActivityTypeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <FiSearch className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={activitySearch}
                  onChange={(e) => {
                    setActivitySearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                />
              </div>
            </div>

            {/* Activity List */}
            <div className="space-y-3">
              {getPaginatedActivities().length > 0 ? (
                getPaginatedActivities().map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-lg">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 mb-1">
                            {activity.action}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {activity.details}
                          </div>
                          <div className="text-xs text-gray-500">
                            {activity.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {activity.type}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiActivity className="mx-auto text-2xl mb-2" />
                  <p>No activities found matching your criteria.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredActivities().length)} of {getFilteredActivities().length} activities
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: getTotalPages() }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        return page === 1 || 
                               page === getTotalPages() || 
                               Math.abs(page - currentPage) <= 1
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const showEllipsis = index > 0 && page - array[index - 1] > 1
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 text-sm rounded-md ${
                                currentPage === page
                                  ? 'bg-[#4DB6B0] text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        )
                      })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
                    disabled={currentPage === getTotalPages()}
                    className="p-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate(`/admin/users/${id}`)}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {user.role === 'Patient' ? 'View Profile' : 'Edit Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminUserStats