import React, { useState } from 'react'
import { FiMapPin, FiEdit2, FiTrash2, FiPlus, FiHome, FiUsers, FiActivity, FiDollarSign, FiShield, FiLock, FiSave, FiX, FiEye, FiEyeOff, FiClock, FiCalendar, FiTrendingUp, FiTrendingDown, FiUserPlus, FiSettings, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import AdminHeader from './AdminHeader'

// Mock data
const mockUsers = {
  superadmin: {
    id: 1,
    name: 'Super Admin',
    role: 'superadmin',
    email: 'superadmin@medadmin.com',
    clinicId: null
  },
  clinicadmin: {
    id: 2,
    name: 'Dr. Sarah Johnson',
    role: 'clinic_admin',
    email: 'admin@mainhospital.com',
    clinicId: 1
  }
}

const clinicData = {
  id: 1,
  name: 'Main Hospital',
  city: 'Tashkent',
  address: '123 Medical Street, Tashkent',
  phone: '+998 71 123 4567',
  email: 'info@mainhospital.com',
  website: 'www.mainhospital.com',
  founded: '2010',
  status: 'Active',
  description: 'Leading healthcare facility providing comprehensive medical services with state-of-the-art equipment and experienced medical professionals.',
  departments: [
    { id: 1, name: 'Cardiology', head: 'Dr. Ahmad Karimov', staff: 5, patients: 89, status: 'Active' },
    { id: 2, name: 'Pediatrics', head: 'Dr. Malika Abdullayeva', staff: 4, patients: 156, status: 'Active' },
    { id: 3, name: 'Emergency', head: 'Dr. Bobur Rakhimov', staff: 8, patients: 234, status: 'Active' },
    { id: 4, name: 'Radiology', head: 'Dr. Elena Smirnova', staff: 3, patients: 67, status: 'Inactive' }
  ],
  staff: [
    { id: 1, name: 'Dr. Ahmad Karimov', role: 'Doctor', department: 'Cardiology', email: 'ahmad@mainhospital.com', status: 'Active', joinDate: '2015-03-15', permissions: ['view_patients', 'edit_patients', 'prescribe'] },
    { id: 2, name: 'Dr. Malika Abdullayeva', role: 'Doctor', department: 'Pediatrics', email: 'malika@mainhospital.com', status: 'Active', joinDate: '2018-07-22', permissions: ['view_patients', 'edit_patients', 'prescribe'] },
    { id: 3, name: 'Nurse Anna Petrova', role: 'Nurse', department: 'Emergency', email: 'anna@mainhospital.com', status: 'Active', joinDate: '2020-01-10', permissions: ['view_patients', 'basic_care'] },
    { id: 4, name: 'Dr. Bobur Rakhimov', role: 'Doctor', department: 'Emergency', email: 'bobur@mainhospital.com', status: 'Active', joinDate: '2012-11-05', permissions: ['view_patients', 'edit_patients', 'prescribe', 'emergency_access'] },
    { id: 5, name: 'Receptionist Maya Kim', role: 'Receptionist', department: 'General', email: 'maya@mainhospital.com', status: 'Active', joinDate: '2019-09-18', permissions: ['view_appointments', 'schedule_appointments'] }
  ],
  pricing: [
    { id: 1, service: 'General Consultation', department: 'General', price: 150000, currency: 'UZS' },
    { id: 2, service: 'Cardiology Consultation', department: 'Cardiology', price: 250000, currency: 'UZS' },
    { id: 3, service: 'Pediatric Checkup', department: 'Pediatrics', price: 180000, currency: 'UZS' },
    { id: 4, service: 'X-Ray', department: 'Radiology', price: 120000, currency: 'UZS' },
    { id: 5, service: 'Blood Test', department: 'Laboratory', price: 80000, currency: 'UZS' },
    { id: 6, service: 'Emergency Treatment', department: 'Emergency', price: 300000, currency: 'UZS' }
  ],
  stats: {
    totalPatients: 1247,
    monthlyPatients: 234,
    totalRevenue: 15750000,
    monthlyRevenue: 3240000,
    totalAppointments: 1456,
    completedAppointments: 1289,
    cancelledAppointments: 167,
    patientSatisfaction: 4.8,
    averageWaitTime: 15,
    occupancyRate: 78
  }
}

const availablePermissions = [
  { id: 'view_patients', name: 'View Patients', description: 'Can view patient information' },
  { id: 'edit_patients', name: 'Edit Patients', description: 'Can modify patient records' },
  { id: 'delete_patients', name: 'Delete Patients', description: 'Can delete patient records' },
  { id: 'prescribe', name: 'Prescribe Medicine', description: 'Can prescribe medications' },
  { id: 'view_appointments', name: 'View Appointments', description: 'Can view appointment schedules' },
  { id: 'schedule_appointments', name: 'Schedule Appointments', description: 'Can create/modify appointments' },
  { id: 'basic_care', name: 'Basic Care', description: 'Can provide basic medical care' },
  { id: 'emergency_access', name: 'Emergency Access', description: 'Can access emergency protocols' },
  { id: 'financial_access', name: 'Financial Access', description: 'Can view financial reports' },
  { id: 'admin_access', name: 'Admin Access', description: 'Can manage clinic settings' }
]

const ClinicProfile = () => {
  const [currentUser, setCurrentUser] = useState(mockUsers.clinicadmin)
  const [activeTab, setActiveTab] = useState('overview')
  const [clinic, setClinic] = useState(clinicData)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [formData, setFormData] = useState({})

  const isSuperAdmin = currentUser.role === 'superadmin'
  const isClinicAdmin = currentUser.role === 'clinic_admin'

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleRoleSwitch = (role) => {
    setCurrentUser(mockUsers[role])
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
              <h2 className="text-xl font-bold text-gray-900">{clinic.name}</h2>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <FiMapPin className="text-sm" />
                <span>{clinic.address}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>📞 {clinic.phone}</span>
                <span>✉️ {clinic.email}</span>
                <span>🌐 {clinic.website}</span>
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
        <p className="text-gray-600">{clinic.description}</p>
        <div className="flex items-center gap-4 mt-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            clinic.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {clinic.status}
          </span>
          <span className="text-sm text-gray-500">Founded: {clinic.founded}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FiUsers className="text-[#4DB6B0] text-xl" />}
          title="Total Patients"
          value={clinic.stats.totalPatients.toLocaleString()}
          subtitle={`${clinic.stats.monthlyPatients} this month`}
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          icon={<FiDollarSign className="text-[#4DB6B0] text-xl" />}
          title="Total Revenue"
          value={formatCurrency(clinic.stats.totalRevenue)}
          subtitle={`${formatCurrency(clinic.stats.monthlyRevenue)} this month`}
          trend="up"
          trendValue="+8%"
        />
        <StatCard
          icon={<FiCalendar className="text-[#4DB6B0] text-xl" />}
          title="Appointments"
          value={clinic.stats.totalAppointments.toLocaleString()}
          subtitle={`${clinic.stats.completedAppointments} completed`}
          trend="up"
          trendValue="+5%"
        />
        <StatCard
          icon={<FiClock className="text-[#4DB6B0] text-xl" />}
          title="Avg Wait Time"
          value={`${clinic.stats.averageWaitTime} min`}
          subtitle={`${clinic.stats.patientSatisfaction}/5 satisfaction`}
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
              <span className="font-medium">{clinic.departments.filter(d => d.status === 'Active').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Staff</span>
              <span className="font-medium">{clinic.departments.reduce((sum, d) => sum + d.staff, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Active Patients</span>
              <span className="font-medium">{clinic.departments.reduce((sum, d) => sum + d.patients, 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-2">Performance Metrics</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Occupancy Rate</span>
              <span className="font-medium">{clinic.stats.occupancyRate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Completed Appointments</span>
              <span className="font-medium">{((clinic.stats.completedAppointments / clinic.stats.totalAppointments) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Patient Satisfaction</span>
              <span className="font-medium">{clinic.stats.patientSatisfaction}/5.0</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-2">Financial Overview</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monthly Revenue</span>
              <span className="font-medium">{formatCurrency(clinic.stats.monthlyRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Revenue Growth</span>
              <span className="font-medium text-green-600">+8.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Services Offered</span>
              <span className="font-medium">{clinic.pricing.length}</span>
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
          <button className="flex items-center gap-2 px-4 py-2 bg-[#4DB6B0] text-white rounded-lg hover:bg-[#43b0a8] transition-colors">
            <FiPlus />
            Add Department
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clinic.departments.map(dept => (
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
                <div className="text-lg font-bold text-gray-900">{dept.staff}</div>
                <div className="text-xs text-gray-500">Staff</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{dept.patients}</div>
                <div className="text-xs text-gray-500">Patients</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#4DB6B0]">{((dept.patients / dept.staff) || 0).toFixed(1)}</div>
                <div className="text-xs text-gray-500">Ratio</div>
              </div>
            </div>

            {(isSuperAdmin || isClinicAdmin) && (
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <FiEye />
                  View
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
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
            {clinic.pricing.map(price => (
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
                      <button className="text-red-600 hover:text-red-900">
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
            {clinic.staff.map(staff => (
              <tr key={staff.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-gray-900">{staff.name}</div>
                    <div className="text-sm text-gray-500">{staff.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                    {staff.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {staff.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                    staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {staff.status === 'Active' ? <FiCheckCircle /> : <FiXCircle />}
                    {staff.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {staff.permissions.slice(0, 2).map(perm => (
                      <span key={perm} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {availablePermissions.find(p => p.id === perm)?.name || perm}
                      </span>
                    ))}
                    {staff.permissions.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        +{staff.permissions.length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                {(isSuperAdmin || isClinicAdmin) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(staff)
                          setShowPermissionModal(true)
                        }}
                        className="text-purple-600 hover:text-purple-900"
                        title="Manage Permissions"
                      >
                        <FiShield />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(staff)
                          setFormData(staff)
                          setShowUserModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEdit2 />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
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
        {/* Demo Role Switcher */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiShield className="text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Demo: Switch User Role</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRoleSwitch('superadmin')}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  currentUser.role === 'superadmin' 
                    ? 'bg-yellow-200 text-yellow-800' 
                    : 'bg-white text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                Super Admin
              </button>
              <button
                onClick={() => handleRoleSwitch('clinicadmin')}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  currentUser.role === 'clinic_admin' 
                    ? 'bg-yellow-200 text-yellow-800' 
                    : 'bg-white text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                Clinic Admin
              </button>
            </div>
          </div>
        </div>

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
              onClick={() => {
                setClinic(prev => ({ ...prev, ...formData }))
                setShowEditModal(false)
              }}
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
              {clinic.departments.map(dept => (
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
              onClick={() => {
                if (selectedItem) {
                  setClinic(prev => ({
                    ...prev,
                    pricing: prev.pricing.map(p => p.id === selectedItem.id ? { ...p, ...formData } : p)
                  }))
                } else {
                  setClinic(prev => ({
                    ...prev,
                    pricing: [...prev.pricing, { id: Date.now(), ...formData }]
                  }))
                }
                setShowPriceModal(false)
                setSelectedItem(null)
              }}
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
                {clinic.departments.map(dept => (
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
              {availablePermissions.map(perm => (
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
              onClick={() => {
                if (selectedItem) {
                  setClinic(prev => ({
                    ...prev,
                    staff: prev.staff.map(s => s.id === selectedItem.id ? { ...s, ...formData } : s)
                  }))
                } else {
                  setClinic(prev => ({
                    ...prev,
                    staff: [...prev.staff, { 
                      id: Date.now(), 
                      ...formData, 
                      status: 'Active',
                      joinDate: new Date().toISOString().split('T')[0]
                    }]
                  }))
                }
                setShowUserModal(false)
                setSelectedItem(null)
              }}
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
              {availablePermissions.map(perm => {
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
                            : [...selectedItem.permissions, perm.id]
                          
                          setClinic(prev => ({
                            ...prev,
                            staff: prev.staff.map(s => 
                              s.id === selectedItem.id 
                                ? { ...s, permissions: updatedPermissions }
                                : s
                            )
                          }))
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
              onClick={() => setShowPermissionModal(false)}
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