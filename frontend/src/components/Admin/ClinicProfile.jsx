import React, { useState, useEffect } from 'react'
import { FiMapPin, FiEdit2, FiTrash2, FiPlus, FiHome, FiUsers, FiActivity, FiDollarSign, FiShield, FiLock, FiSave, FiX, FiEye, FiEyeOff, FiClock, FiCalendar, FiTrendingUp, FiTrendingDown, FiUserPlus, FiSettings, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import AdminHeader from './AdminHeader'

// TODO: Import your API service functions
// import { clinicAPI, departmentAPI, pricingAPI, staffAPI, authAPI } from '../services/api'

const ClinicProfile = () => {
  // TODO: Get current user from auth context or state management
  const [currentUser, setCurrentUser] = useState(null)
  
  const [activeTab, setActiveTab] = useState('overview')
  const [clinic, setClinic] = useState(null)
  const [departments, setDepartments] = useState([])
  const [staff, setStaff] = useState([])
  const [pricing, setPricing] = useState([])
  const [stats, setStats] = useState(null)
  const [permissions, setPermissions] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [formData, setFormData] = useState({})

  // TODO: Implement role checks based on your auth system
  const isSuperAdmin = currentUser?.role === 'superadmin'
  const isClinicAdmin = currentUser?.role === 'clinic_admin'

  useEffect(() => {
    // TODO: Fetch initial data when component mounts
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // TODO: Replace with actual API calls
      // const [clinicRes, deptRes, staffRes, pricingRes, statsRes, permsRes] = await Promise.all([
      //   clinicAPI.getClinic(currentUser.clinicId),
      //   departmentAPI.getDepartments(currentUser.clinicId),
      //   staffAPI.getStaff(currentUser.clinicId),
      //   pricingAPI.getPricing(currentUser.clinicId),
      //   clinicAPI.getStats(currentUser.clinicId),
      //   authAPI.getAvailablePermissions()
      // ])
      
      // setClinic(clinicRes.data)
      // setDepartments(deptRes.data)
      // setStaff(staffRes.data)
      // setPricing(pricingRes.data)
      // setStats(statsRes.data)
      // setPermissions(permsRes.data)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateClinic = async () => {
    try {
      // TODO: Call API to update clinic
      // const response = await clinicAPI.updateClinic(clinic.id, formData)
      // setClinic(response.data)
      setShowEditModal(false)
    } catch (err) {
      console.error('Failed to update clinic:', err)
    }
  }

  const handleAddPrice = async () => {
    try {
      // TODO: Call API to add new price
      // const response = await pricingAPI.addPrice({
      //   clinicId: clinic.id,
      //   ...formData
      // })
      // setPricing([...pricing, response.data])
      setShowPriceModal(false)
    } catch (err) {
      console.error('Failed to add price:', err)
    }
  }

  const handleUpdatePrice = async () => {
    try {
      // TODO: Call API to update price
      // const response = await pricingAPI.updatePrice(selectedItem.id, formData)
      // setPricing(pricing.map(p => p.id === selectedItem.id ? response.data : p))
      setShowPriceModal(false)
    } catch (err) {
      console.error('Failed to update price:', err)
    }
  }

  const handleDeletePrice = async (priceId) => {
    try {
      // TODO: Call API to delete price
      // await pricingAPI.deletePrice(priceId)
      // setPricing(pricing.filter(p => p.id !== priceId))
    } catch (err) {
      console.error('Failed to delete price:', err)
    }
  }

  const handleAddUser = async () => {
    try {
      // TODO: Call API to add new user
      // const response = await staffAPI.addStaff({
      //   clinicId: clinic.id,
      //   ...formData
      // })
      // setStaff([...staff, response.data])
      setShowUserModal(false)
    } catch (err) {
      console.error('Failed to add user:', err)
    }
  }

  const handleUpdateUser = async () => {
    try {
      // TODO: Call API to update user
      // const response = await staffAPI.updateStaff(selectedItem.id, formData)
      // setStaff(staff.map(s => s.id === selectedItem.id ? response.data : s))
      setShowUserModal(false)
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      // TODO: Call API to delete user
      // await staffAPI.deleteStaff(userId)
      // setStaff(staff.filter(s => s.id !== userId))
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const handleUpdatePermissions = async () => {
    try {
      // TODO: Call API to update user permissions
      // const response = await staffAPI.updatePermissions(selectedItem.id, {
      //   permissions: selectedItem.permissions
      // })
      // setStaff(staff.map(s => s.id === selectedItem.id ? response.data : s))
      setShowPermissionModal(false)
    } catch (err) {
      console.error('Failed to update permissions:', err)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  const Modal = ({ show, onClose, title, children, size = 'md' }) => {
    if (!show) return null
    
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    }
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`bg-white rounded-lg p-6 w-full ${sizeClasses[size]} mx-4 max-h-[90vh] overflow-y-auto`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX />
            </button>
          </div>
          {children}
        </div>
      </div>
    )
  }

  const StatCard = ({ icon, title, value, subtitle, trend, trendValue }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-[#4DB6B0] bg-opacity-10 rounded-lg">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-gray-600 text-sm">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Clinic Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#4DB6B0] rounded-lg flex items-center justify-center">
              <FiHome className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{clinic?.name || 'Loading...'}</h2>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <FiMapPin className="text-sm" />
                <span>{clinic?.address || 'Loading...'}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>📞 {clinic?.phone || 'Loading...'}</span>
                <span>✉️ {clinic?.email || 'Loading...'}</span>
                <span>🌐 {clinic?.website || 'Loading...'}</span>
              </div>
            </div>
          </div>
          {(isSuperAdmin || isClinicAdmin) && (
            <button
              onClick={() => {
                setSelectedItem(clinic)
                setFormData(clinic)
                setShowEditModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#4DB6B0] text-white rounded-lg hover:bg-[#43b0a8] transition-colors"
            >
              <FiEdit2 />
              Edit Info
            </button>
          )}
        </div>
        <p className="text-gray-600">{clinic?.description || 'Loading...'}</p>
        <div className="flex items-center gap-4 mt-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            clinic?.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {clinic?.status || 'Loading...'}
          </span>
          <span className="text-sm text-gray-500">Founded: {clinic?.founded || 'Loading...'}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FiUsers className="text-[#4DB6B0] text-xl" />}
          title="Total Patients"
          value={stats?.totalPatients?.toLocaleString() || '0'}
          subtitle={`${stats?.monthlyPatients || 0} this month`}
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          icon={<FiDollarSign className="text-[#4DB6B0] text-xl" />}
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          subtitle={`${formatCurrency(stats?.monthlyRevenue || 0)} this month`}
          trend="up"
          trendValue="+8%"
        />
        <StatCard
          icon={<FiCalendar className="text-[#4DB6B0] text-xl" />}
          title="Appointments"
          value={stats?.totalAppointments?.toLocaleString() || '0'}
          subtitle={`${stats?.completedAppointments || 0} completed`}
          trend="up"
          trendValue="+5%"
        />
        <StatCard
          icon={<FiClock className="text-[#4DB6B0] text-xl" />}
          title="Avg Wait Time"
          value={`${stats?.averageWaitTime || 0} min`}
          subtitle={`${stats?.patientSatisfaction || 0}/5 satisfaction`}
          trend="down"
          trendValue="-3%"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-2">Department Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Active Departments</span>
              <span className="font-medium">{departments.filter(d => d.status === 'Active').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Staff</span>
              <span className="font-medium">{departments.reduce((sum, d) => sum + (d.staff || 0), 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Active Patients</span>
              <span className="font-medium">{departments.reduce((sum, d) => sum + (d.patients || 0), 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-2">Performance Metrics</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Occupancy Rate</span>
              <span className="font-medium">{stats?.occupancyRate || 0}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Completed Appointments</span>
              <span className="font-medium">
                {stats?.totalAppointments ? 
                  ((stats.completedAppointments / stats.totalAppointments) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Patient Satisfaction</span>
              <span className="font-medium">{stats?.patientSatisfaction || 0}/5.0</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-2">Financial Overview</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monthly Revenue</span>
              <span className="font-medium">{formatCurrency(stats?.monthlyRevenue || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Revenue Growth</span>
              <span className="font-medium text-green-600">+8.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Services Offered</span>
              <span className="font-medium">{pricing.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const DepartmentsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Departments</h3>
        {(isSuperAdmin || isClinicAdmin) && (
          <button 
            onClick={() => {
              // TODO: Handle add department
              // setShowDepartmentModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#4DB6B0] text-white rounded-lg hover:bg-[#43b0a8] transition-colors"
          >
            <FiPlus />
            Add Department
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map(dept => (
          <div key={dept.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                <p className="text-gray-600 text-sm">Head: {dept.head}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                dept.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {dept.status}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{dept.staff || 0}</div>
                <div className="text-xs text-gray-500">Staff</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{dept.patients || 0}</div>
                <div className="text-xs text-gray-500">Patients</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#4DB6B0]">
                  {dept.staff ? (dept.patients / dept.staff).toFixed(1) : 0}
                </div>
                <div className="text-xs text-gray-500">Ratio</div>
              </div>
            </div>

            {(isSuperAdmin || isClinicAdmin) && (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    // TODO: Handle view department
                    // navigate(`/departments/${dept.id}`)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <FiEye />
                  View
                </button>
                <button 
                  onClick={() => {
                    // TODO: Handle edit department
                    // setSelectedDepartment(dept)
                    // setShowDepartmentModal(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  <FiEdit2 />
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const PricingTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Service Pricing</h3>
        {(isSuperAdmin || isClinicAdmin) && (
          <button
            onClick={() => {
              setSelectedItem(null)
              setFormData({ service: '', department: '', price: '', currency: 'UZS' })
              setShowPriceModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#4DB6B0] text-white rounded-lg hover:bg-[#43b0a8] transition-colors"
          >
            <FiPlus />
            Add Service
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              {(isSuperAdmin || isClinicAdmin) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pricing.map(price => (
              <tr key={price.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{price.service}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {price.department}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(price.price)}</div>
                </td>
                {(isSuperAdmin || isClinicAdmin) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(price)
                          setFormData(price)
                          setShowPriceModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this service?')) {
                            handleDeletePrice(price.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const UsersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Staff & Users</h3>
        {(isSuperAdmin || isClinicAdmin) && (
          <button
            onClick={() => {
              setSelectedItem(null)
              setFormData({ name: '', role: '', department: '', email: '', permissions: [] })
              setShowUserModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#4DB6B0] text-white rounded-lg hover:bg-[#43b0a8] transition-colors"
          >
            <FiUserPlus />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
              {(isSuperAdmin || isClinicAdmin) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staff.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                    user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.status === 'Active' ? <FiCheckCircle /> : <FiXCircle />}
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.permissions?.slice(0, 2).map(perm => (
                      <span key={perm} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {permissions.find(p => p.id === perm)?.name || perm}
                      </span>
                    ))}
                    {user.permissions?.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        +{user.permissions.length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                {(isSuperAdmin || isClinicAdmin) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(user)
                          setShowPermissionModal(true)
                        }}
                        className="text-purple-600 hover:text-purple-900"
                        title="Manage Permissions"
                      >
                        <FiShield />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(user)
                          setFormData(user)
                          setShowUserModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this user?')) {
                            handleDeleteUser(user.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Clinic Profile</h1>
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
              {isSuperAdmin ? (
                <>
                  <FiShield className="text-green-600 text-xs" />
                  <span className="text-xs text-green-600 font-medium">Super Admin</span>
                </>
              ) : (
                <>
                  <FiLock className="text-blue-600 text-xs" />
                  <span className="text-xs text-blue-600 font-medium">Clinic Admin</span>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600">Manage clinic information, pricing, staff, and permissions</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: FiHome },
                { id: 'departments', name: 'Departments', icon: FiSettings },
                { id: 'pricing', name: 'Pricing', icon: FiDollarSign },
                { id: 'users', name: 'Staff & Users', icon: FiUsers }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[#4DB6B0] text-[#4DB6B0]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'pricing' && <PricingTab />}
          {activeTab === 'users' && <UsersTab />}
        </div>
      </div>

      {/* Edit Clinic Modal */}
      <Modal 
        show={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="Edit Clinic Information"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.city || ''}
                onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.address || ''}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.phone || ''}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.email || ''}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.website || ''}
                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.description || ''}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateClinic}
              className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm"
            >
              <FiSave />
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Price Modal */}
      <Modal 
        show={showPriceModal} 
        onClose={() => setShowPriceModal(false)}
        title={selectedItem ? 'Edit Service Price' : 'Add New Service'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.service || ''}
              onChange={e => setFormData(prev => ({ ...prev, service: e.target.value }))}
              placeholder="e.g., General Consultation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.department || ''}
              onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
              <option value="General">General</option>
              <option value="Laboratory">Laboratory</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.price || ''}
                onChange={e => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                placeholder="150000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.currency || 'UZS'}
                onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              >
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => setShowPriceModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={selectedItem ? handleUpdatePrice : handleAddPrice}
              className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm"
            >
              <FiSave />
              {selectedItem ? 'Update' : 'Add'} Service
            </button>
          </div>
        </div>
      </Modal>

      {/* User Modal */}
      <Modal 
        show={showUserModal} 
        onClose={() => setShowUserModal(false)}
        title={selectedItem ? 'Edit User' : 'Add New User'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.email || ''}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@mainhospital.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.role || ''}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="">Select Role</option>
                <option value="Doctor">Doctor</option>
                <option value="Nurse">Nurse</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Administrator">Administrator</option>
                <option value="Technician">Technician</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={formData.department || ''}
                onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
                <option value="General">General</option>
                <option value="Administration">Administration</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              {permissions.map(perm => (
                <label key={perm.id} className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={(formData.permissions || []).includes(perm.id)}
                    onChange={() => {
                      const current = formData.permissions || []
                      const updated = current.includes(perm.id)
                        ? current.filter(p => p !== perm.id)
                        : [...current, perm.id]
                      setFormData(prev => ({ ...prev, permissions: updated }))
                    }}
                    className="rounded border-gray-300 text-[#4DB6B0] focus:ring-[#4DB6B0] mt-0.5"
                  />
                  <div>
                    <span className="text-sm text-gray-700 font-medium">{perm.name}</span>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={selectedItem ? handleUpdateUser : handleAddUser}
              className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm"
            >
              <FiSave />
              {selectedItem ? 'Update' : 'Add'} User
            </button>
          </div>
        </div>
      </Modal>

      {/* Permission Modal */}
      <Modal 
        show={showPermissionModal} 
        onClose={() => setShowPermissionModal(false)}
        title={`Manage Permissions - ${selectedItem?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Current User</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4DB6B0] rounded-full flex items-center justify-center text-white font-medium">
                {selectedItem?.name?.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-gray-900">{selectedItem?.name}</div>
                <div className="text-sm text-gray-500">{selectedItem?.role} - {selectedItem?.department}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Available Permissions</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {permissions.map(perm => {
                const hasPermission = selectedItem?.permissions?.includes(perm.id)
                return (
                  <div key={perm.id} className="flex items-start justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={hasPermission}
                        onChange={() => {
                          const updatedPermissions = hasPermission
                            ? selectedItem.permissions.filter(p => p !== perm.id)
                            : [...(selectedItem.permissions || []), perm.id]
                          
                          setSelectedItem(prev => ({ ...prev, permissions: updatedPermissions }))
                        }}
                        className="rounded border-gray-300 text-[#4DB6B0] focus:ring-[#4DB6B0] mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{perm.name}</div>
                        <div className="text-sm text-gray-500">{perm.description}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      hasPermission ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {hasPermission ? 'Granted' : 'Denied'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => setShowPermissionModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Close
            </button>
            <button
              onClick={handleUpdatePermissions}
              className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm"
            >
              <FiSave />
              Save Permissions
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ClinicProfile