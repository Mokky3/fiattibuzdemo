import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import { FiArrowLeft, FiRefreshCw, FiTrendingUp, FiActivity, FiUsers, FiCalendar, FiBarChart2, FiClock, FiFilter, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

// API service functions
const userStatsService = {
  // Fetch user statistics by ID
  async fetchUserStats(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch user stats')
      return await response.json()
    } catch (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }
  },

  // Fetch user basic info
  async fetchUserInfo(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch user info')
      return await response.json()
    } catch (error) {
      console.error('Error fetching user info:', error)
      throw error
    }
  },

  // Fetch user activity history
  async fetchUserActivityHistory(userId, page = 1, limit = 20, filter = 'all') {
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity?page=${page}&limit=${limit}&filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch activity history')
      return await response.json()
    } catch (error) {
      console.error('Error fetching activity history:', error)
      throw error
    }
  }
}

// Enhanced dummy data for development (remove when connecting to backend)
const dummyUserStats = {
  1: {
    user: {
      id: 1,
      name: 'Dr. A. Aliyev',
      role: 'Doctor',
      email: 'aliyev@example.com',
      clinic: 'Main Hospital',
      status: 'Active',
      joinDate: '2023-01-15',
      lastLogin: '2025-06-22 14:30'
    },
    stats: {
      appointments: { total: 152, thisMonth: 24, lastMonth: 28, trend: -14.3 },
      prescriptions: { total: 89, thisMonth: 15, lastMonth: 18, trend: -16.7 },
      patients: { total: 87, active: 65, new: 12, trend: 18.5 },
      consultations: { total: 142, avgDuration: 25, satisfaction: 4.7 },
      revenue: { total: 45600, thisMonth: 7800, lastMonth: 8200, trend: -4.9 }
    },
    performance: {
      punctuality: 94,
      patientSatisfaction: 4.7,
      responseTime: 12,
      completionRate: 96
    },
    weeklyActivity: [
      { day: 'Mon', appointments: 8, hours: 9 },
      { day: 'Tue', appointments: 6, hours: 8 },
      { day: 'Wed', appointments: 9, hours: 10 },
      { day: 'Thu', appointments: 7, hours: 8 },
      { day: 'Fri', appointments: 5, hours: 7 },
      { day: 'Sat', appointments: 3, hours: 4 },
      { day: 'Sun', appointments: 0, hours: 0 }
    ],
    activityHistory: {
      total: 156,
      activities: [
        { id: 1, type: 'appointment', action: 'Completed appointment with John Smith', timestamp: '2025-06-22 14:30', status: 'completed', details: 'Regular checkup, prescribed medication' },
        { id: 2, type: 'prescription', action: 'Prescribed Lisinopril 10mg to Maria Garcia', timestamp: '2025-06-22 11:15', status: 'active', details: 'For hypertension management' },
        { id: 3, type: 'login', action: 'Logged into system', timestamp: '2025-06-22 08:00', status: 'success', details: 'IP: 192.168.1.100' },
        { id: 4, type: 'consultation', action: 'Video consultation with Sarah Johnson', timestamp: '2025-06-21 16:45', status: 'completed', details: 'Follow-up consultation, 25 minutes' },
        { id: 5, type: 'appointment', action: 'Cancelled appointment with Mike Wilson', timestamp: '2025-06-21 14:20', status: 'cancelled', details: 'Patient requested reschedule' },
        { id: 6, type: 'prescription', action: 'Updated prescription for David Brown', timestamp: '2025-06-21 10:30', status: 'updated', details: 'Dosage adjustment for diabetes medication' },
        { id: 7, type: 'report', action: 'Generated monthly patient report', timestamp: '2025-06-20 17:00', status: 'completed', details: '45 patients reviewed' },
        { id: 8, type: 'appointment', action: 'Completed appointment with Lisa Chen', timestamp: '2025-06-20 15:15', status: 'completed', details: 'Annual physical examination' },
        { id: 9, type: 'system', action: 'Updated patient records system', timestamp: '2025-06-20 09:45', status: 'success', details: 'Bulk update of 15 patient records' },
        { id: 10, type: 'consultation', action: 'Phone consultation with Robert Davis', timestamp: '2025-06-19 13:30', status: 'completed', details: 'Discussed lab results, 15 minutes' },
        { id: 11, type: 'appointment', action: 'Scheduled appointment for next week', timestamp: '2025-06-19 10:00', status: 'scheduled', details: 'Follow-up for chronic condition' },
        { id: 12, type: 'prescription', action: 'Renewed prescription for chronic medication', timestamp: '2025-06-18 14:45', status: 'active', details: 'Extended prescription for 3 months' }
      ]
    }
  },
  2: {
    user: {
      id: 2,
      name: 'Nurse T. Kim',
      role: 'Nurse',
      email: 'kim@example.com',
      clinic: 'Main Hospital',
      status: 'Active',
      joinDate: '2023-03-20',
      lastLogin: '2025-06-22 16:45'
    },
    stats: {
      vitalsTaken: { total: 324, thisMonth: 45, lastMonth: 52, trend: -13.5 },
      shifts: { total: 89, thisMonth: 12, overtime: 3, trend: 8.3 },
      patients: { total: 156, assisted: 45, critical: 8, trend: 12.1 },
      emergencies: { total: 23, thisMonth: 4, response: 95, trend: 25.0 },
      medications: { administered: 234, thisMonth: 38, errors: 0 }
    },
    performance: {
      punctuality: 98,
      efficiency: 92,
      teamwork: 4.8,
      accuracy: 99
    },
    weeklyActivity: [
      { day: 'Mon', patients: 12, hours: 12 },
      { day: 'Tue', patients: 15, hours: 12 },
      { day: 'Wed', patients: 11, hours: 8 },
      { day: 'Thu', patients: 14, hours: 12 },
      { day: 'Fri', patients: 13, hours: 12 },
      { day: 'Sat', patients: 0, hours: 0 },
      { day: 'Sun', patients: 0, hours: 0 }
    ],
    activityHistory: {
      total: 89,
      activities: [
        { id: 1, type: 'vitals', action: 'Recorded vitals for patient #2847', timestamp: '2025-06-22 16:30', status: 'completed', details: 'BP: 130/85, HR: 76, Temp: 98.6°F' },
        { id: 2, type: 'medication', action: 'Administered insulin to patient #1923', timestamp: '2025-06-22 14:15', status: 'completed', details: '10 units Humalog, subcutaneous' },
        { id: 3, type: 'shift', action: 'Started day shift', timestamp: '2025-06-22 07:00', status: 'active', details: 'ICU Ward, 12-hour shift' },
        { id: 4, type: 'emergency', action: 'Responded to Code Blue in Room 304', timestamp: '2025-06-21 22:45', status: 'resolved', details: 'Patient stabilized, vital signs normal' },
        { id: 5, type: 'documentation', action: 'Updated patient care plans', timestamp: '2025-06-21 20:30', status: 'completed', details: '8 patients updated' },
        { id: 6, type: 'vitals', action: 'Routine vitals check - Room 301-306', timestamp: '2025-06-21 18:00', status: 'completed', details: '6 patients checked, all stable' },
        { id: 7, type: 'medication', action: 'Prepared and administered evening medications', timestamp: '2025-06-21 19:30', status: 'completed', details: '12 patients, no adverse reactions' },
        { id: 8, type: 'training', action: 'Completed CPR recertification', timestamp: '2025-06-20 14:00', status: 'completed', details: 'Score: 98%, Certificate updated' },
        { id: 9, type: 'handoff', action: 'Shift handoff to night nurse', timestamp: '2025-06-20 19:00', status: 'completed', details: '10 patients transferred, all notes updated' },
        { id: 10, type: 'assessment', action: 'Conducted patient assessments', timestamp: '2025-06-20 08:30', status: 'completed', details: '14 patients assessed, 2 flagged for physician review' }
      ]
    }
  },
  5: {
    user: {
      id: 5,
      name: 'John Smith',
      role: 'Patient',
      email: 'smith@example.com',
      clinic: 'Main Hospital',
      status: 'Active',
      joinDate: '2024-05-10',
      lastVisit: '2025-06-20 10:30'
    },
    stats: {
      appointments: { total: 8, completed: 7, cancelled: 1, upcoming: 2 },
      treatments: { total: 12, ongoing: 2, completed: 10 },
      prescriptions: { total: 5, active: 2, filled: 15 },
      vitals: { last: '2025-06-20', bp: '120/80', heartRate: 72, weight: 75 },
      visits: { total: 8, thisYear: 6, emergency: 1 }
    },
    health: {
      bloodPressure: 'Normal',
      heartRate: 'Normal',
      weight: 'Stable',
      overallHealth: 'Good'
    },
    recentActivity: [
      { date: '2025-06-20', type: 'Checkup', doctor: 'Dr. A. Aliyev', status: 'Completed' },
      { date: '2025-06-15', type: 'Lab Results', doctor: 'Lab Tech', status: 'Normal' },
      { date: '2025-06-10', type: 'Prescription', doctor: 'Dr. A. Aliyev', status: 'Filled' },
      { date: '2025-06-05', type: 'Consultation', doctor: 'Dr. A. Aliyev', status: 'Completed' }
    ],
    activityHistory: {
      total: 34,
      activities: [
        { id: 1, type: 'appointment', action: 'Attended regular checkup with Dr. A. Aliyev', timestamp: '2025-06-20 10:30', status: 'completed', details: 'Annual physical, all vitals normal' },
        { id: 2, type: 'prescription', action: 'Picked up prescription at pharmacy', timestamp: '2025-06-18 15:20', status: 'completed', details: 'Lisinopril 10mg, 30-day supply' },
        { id: 3, type: 'lab', action: 'Completed blood work', timestamp: '2025-06-15 09:15', status: 'completed', details: 'Fasting glucose, lipid panel - Results normal' },
        { id: 4, type: 'portal', action: 'Logged into patient portal', timestamp: '2025-06-14 19:45', status: 'success', details: 'Viewed lab results and appointment history' },
        { id: 5, type: 'appointment', action: 'Scheduled follow-up appointment', timestamp: '2025-06-12 14:30', status: 'scheduled', details: 'Next visit: July 15, 2025' },
        { id: 6, type: 'prescription', action: 'Refill requested for blood pressure medication', timestamp: '2025-06-10 11:00', status: 'approved', details: 'Approved by Dr. A. Aliyev' },
        { id: 7, type: 'vitals', action: 'Self-reported blood pressure readings', timestamp: '2025-06-08 08:30', status: 'recorded', details: 'Weekly readings: Avg 125/82' },
        { id: 8, type: 'consultation', action: 'Phone consultation with Dr. A. Aliyev', timestamp: '2025-06-05 16:00', status: 'completed', details: 'Discussed medication side effects' },
        { id: 9, type: 'appointment', action: 'Cancelled appointment due to illness', timestamp: '2025-06-01 10:00', status: 'cancelled', details: 'Rescheduled for June 20' },
        { id: 10, type: 'registration', action: 'Updated insurance information', timestamp: '2025-05-28 13:15', status: 'completed', details: 'New insurance card uploaded' }
      ]
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
      
      // For development, use dummy data. Replace with actual API calls:
      // const [userInfo, statsData] = await Promise.all([
      //   userStatsService.fetchUserInfo(id),
      //   userStatsService.fetchUserStats(id)
      // ])
      // setUserStats({ user: userInfo, ...statsData })
      
      const userData = dummyUserStats[id] // Remove this line when connecting to backend
      setUserStats(userData)
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