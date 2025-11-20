import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import { adminAPI } from '../../services/apiService'

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedClinic, setSelectedClinic] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [newUser, setNewUser] = useState({
    contact: '',
    contactType: 'email',
    role: 'DOCTOR',
    clinicId: ''
  })

  const navigate = useNavigate()

  // Define constants that were missing - matching backend enum values
  const roles = [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'CLINIC_ADMIN', label: 'Clinic Admin' },
    { value: 'DOCTOR', label: 'Doctor' },
    { value: 'NURSE', label: 'Nurse' },
    { value: 'RECEPTIONIST', label: 'Receptionist' },
    { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
    { value: 'RADIOLOGIST', label: 'Radiologist' },
    { value: 'PHARMACIST', label: 'Pharmacist' },
    { value: 'PATIENT', label: 'Patient' }
  ]
  const statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']

  useEffect(() => {
    loadUsers()
    loadClinics()
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('[AdminUsers] Loading timeout reached, setting error')
        setError('Loading timeout - please check your authentication and try again')
        setLoading(false)
      }
    }, 900000) // 15 minute timeout
    
    return () => clearTimeout(timeout)
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[AdminUsers] Loading users...')
      
      // Check authentication token
      const token = localStorage.getItem('token')
      console.log('[AdminUsers] Token exists:', !!token)
      if (token) {
        console.log('[AdminUsers] Token preview:', token.substring(0, 20) + '...')
      }
      
      const userData = await adminAPI.getUsers()
      console.log('[AdminUsers] Users data received:', userData)
      console.log('[AdminUsers] First user structure:', userData[0])
      setUsers(userData)
    } catch (err) {
      console.error('Error loading users:', err)
      
      // Check if it's an authentication error
      if (err.message && (err.message.includes('401') || err.message.includes('Not authenticated'))) {
        setError('Authentication failed. Please log in again.')
      } else if (err.message && err.message.includes('403')) {
        setError('Access denied. You do not have permission to view users.')
      } else {
        setError('Failed to load users. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadClinics = async () => {
    try {
      console.log('[AdminUsers] Loading clinics...')
      const clinicData = await adminAPI.getClinics()
      console.log('[AdminUsers] Clinics data received:', clinicData)
      console.log('[AdminUsers] First clinic structure:', clinicData[0])
      setClinics(clinicData)
    } catch (err) {
      console.error('Error loading clinics:', err)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return

    try {
      await adminAPI.deleteUser(userId)
      await loadUsers()
      alert('User deleted successfully')
    } catch (err) {
      alert('Failed to delete user. Please try again.')
    }
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await adminAPI.updateUserStatus(userId, newStatus)
      await loadUsers()
      alert('User status updated successfully')
    } catch (err) {
      alert('Failed to update user status. Please try again.')
    }
  }

  const handleAddUser = async () => {
    if (!newUser.contact.trim()) {
      alert('Please enter an email or phone number')
      return
    }

    if (!newUser.clinicId) {
      alert('Please select a clinic')
      return
    }

    if (newUser.contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newUser.contact)) {
        alert('Please enter a valid email address')
        return
      }
    }

    if (newUser.contactType === 'phone') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      if (!phoneRegex.test(newUser.contact.replace(/\s/g, ''))) {
        alert('Please enter a valid phone number')
        return
      }
    }

    try {
      setAddingUser(true)
      await adminAPI.sendUserInvitation({
        [newUser.contactType]: newUser.contact,
        role: newUser.role,
        clinic_id: newUser.clinicId
      })

      alert(`Invitation sent successfully to ${newUser.contact}!`)
      setShowAddUserModal(false)
      setNewUser({
        contact: '',
        contactType: 'email',
        role: 'doctor',
        clinicId: ''
      })
      await loadUsers()
    } catch (err) {
      alert('Failed to send invitation. Please try again.')
    } finally {
      setAddingUser(false)
    }
  }

  // Filtering logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.clinic && user.clinic.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRole = !selectedRole || user.role === selectedRole
    const matchesStatus = !selectedStatus || user.status === selectedStatus
    const matchesClinic = !selectedClinic || user.clinic === selectedClinic

    return matchesSearch && matchesRole && matchesStatus && matchesClinic
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRole, selectedStatus, selectedClinic])

  const getUsersByRole = (role) => filteredUsers.filter(user => user.role === role).length
  const getActiveUsers = () => filteredUsers.filter(user => user.status === 'ACTIVE').length
  const getInactiveUsers = () => filteredUsers.filter(user => user.status === 'INACTIVE').length
  const getSuspendedUsers = () => filteredUsers.filter(user => user.status === 'SUSPENDED').length
  const getPendingUsers = () => filteredUsers.filter(user => user.status === 'PENDING').length
  
  const formatRole = (role) => {
    const roleObj = roles.find(r => r.value === role)
    return roleObj ? roleObj.label : role
  }

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
              <div className="text-red-400 text-xl mr-3">⚠️</div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {error.includes('authentication') || error.includes('timeout') ? (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800">Possible solutions:</p>
                    <ul className="text-sm text-red-700 mt-1 list-disc list-inside space-y-1">
                      <li>Make sure you are logged in</li>
                      <li>Check if your session has expired</li>
                      <li>Try refreshing the page</li>
                    </ul>
                  </div>
                ) : null}
                <div className="mt-3 space-x-2">
                  <button 
                    onClick={loadUsers}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Try again
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('token')
                      window.location.href = '/signin'
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />

        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showSidebar ? '←' : '→'} Filters
            </button>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
              User Management
            </h2>
          </div>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-[#4DB6B0] text-white px-4 py-2 rounded-lg hover:bg-[#3DA6A0] transition-colors"
          >
            Add User
          </button>
        </div>

        {/* Mobile Overlay */}
        {showSidebar && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main Layout: Sidebar + Content */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className={`${showSidebar ? 'block' : 'hidden'} lg:block w-80 flex-shrink-0 relative z-30 lg:z-auto lg:relative fixed lg:static top-0 left-0 h-full lg:h-auto bg-white lg:bg-transparent p-4 lg:p-0 lg:shadow-none shadow-lg`}>
            {/* Filters - Top */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedRole('')
                    setSelectedStatus('')
                    setSelectedClinic('')
                    setCurrentPage(1)
                  }}
                  className="text-sm text-[#4DB6B0] hover:text-[#3DA6A0] font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="">All Roles</option>
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="">All Statuses</option>
                    {statuses.map(status => (
                      <option key={status} value={status}>
                        {status === 'ACTIVE' ? 'Active' :
                         status === 'INACTIVE' ? 'Inactive' :
                         status === 'SUSPENDED' ? 'Suspended' :
                         status === 'PENDING' ? 'Pending' : status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                  <select
                    value={selectedClinic}
                    onChange={(e) => setSelectedClinic(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="">All Clinics</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id || clinic} value={clinic.id || clinic}>
                        {clinic.name || clinic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Cards - Bottom */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Users</div>
                <div className="text-2xl font-bold text-gray-800">{filteredUsers.length}</div>
                <div className="text-xs text-gray-400 mt-1">of {users.length} total</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Active Users</div>
                <div className="text-2xl font-bold text-green-600">{getActiveUsers()}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {getInactiveUsers()} inactive, {getSuspendedUsers()} suspended
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Doctors</div>
                <div className="text-2xl font-bold text-blue-600">{getUsersByRole('DOCTOR')}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {getUsersByRole('RADIOLOGIST')} radiologists
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Nurses</div>
                <div className="text-2xl font-bold text-purple-600">{getUsersByRole('NURSE')}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {getUsersByRole('RECEPTIONIST')} receptionists
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Lab Staff</div>
                <div className="text-2xl font-bold text-orange-600">{getUsersByRole('LAB_TECHNICIAN')}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {getUsersByRole('PHARMACIST')} pharmacists
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Patients</div>
                <div className="text-2xl font-bold text-indigo-600">{getUsersByRole('PATIENT')}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {getPendingUsers()} pending
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clinic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-[#4DB6B0] flex items-center justify-center text-white font-semibold">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.clinic}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                            user.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.status === 'ACTIVE' ? 'Active' :
                             user.status === 'INACTIVE' ? 'Inactive' :
                             user.status === 'SUSPENDED' ? 'Suspended' :
                             user.status === 'PENDING' ? 'Pending' : user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                              className="text-[#4DB6B0] hover:text-[#3DA6A0]"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleStatusChange(user.id, user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex items-center">
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">{startIndex + 1}</span>
                    {' '}to{' '}
                    <span className="font-medium">{Math.min(endIndex, filteredUsers.length)}</span>
                    {' '}of{' '}
                    <span className="font-medium">{filteredUsers.length}</span>
                    {' '}results
                  </p>
                  <div className="ml-4 flex items-center">
                    <label htmlFor="items-per-page" className="text-sm text-gray-700 mr-2">
                      Show:
                    </label>
                    <select
                      id="items-per-page"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-[#4DB6B0] border-[#4DB6B0] text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-[#4DB6B0] shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Add New User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type
                  </label>
                  <select
                    value={newUser.contactType}
                    onChange={(e) => setNewUser({...newUser, contactType: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newUser.contactType === 'email' ? 'Email' : 'Phone'}
                  </label>
                  <input
                    type={newUser.contactType === 'email' ? 'email' : 'tel'}
                    value={newUser.contact}
                    onChange={(e) => setNewUser({...newUser, contact: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                    placeholder={newUser.contactType === 'email' ? 'user@example.com' : '+998 90 123 4567'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinic
                  </label>
                  <select
                    value={newUser.clinicId}
                    onChange={(e) => setNewUser({...newUser, clinicId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="">Select a clinic</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id || clinic} value={clinic.id || clinic}>
                        {clinic.name || clinic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={addingUser}
                  className="px-4 py-2 bg-[#4DB6B0] text-white rounded-lg hover:bg-[#3DA6A0] disabled:opacity-50"
                >
                  {addingUser ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default AdminUsers