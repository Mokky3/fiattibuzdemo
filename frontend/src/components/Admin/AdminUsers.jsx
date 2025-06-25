import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminHeader from './AdminHeader'

// API service functions
const userService = {
  // Fetch all users from backend
  async fetchUsers() {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      return await response.json()
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  },

  // Send invitation to create profile
  async sendUserInvitation(userData) {
    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
      if (!response.ok) throw new Error('Failed to send invitation')
      return await response.json()
    } catch (error) {
      console.error('Error sending invitation:', error)
      throw error
    }
  },

  // Delete user
  async deleteUser(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to delete user')
      return await response.json()
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  },

  // Update user status
  async updateUserStatus(userId, status) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      if (!response.ok) throw new Error('Failed to update user status')
      return await response.json()
    } catch (error) {
      console.error('Error updating user status:', error)
      throw error
    }
  }
}
// Dummy data for development (remove when connecting to backend)
const dummyUsers = [
  { id: 1, name: 'Dr. A. Aliyev', role: 'Doctor', status: 'Active', clinic: 'Main Hospital', note: 'Experienced cardiologist', provider: 'Clinic Admin' },
  { id: 2, name: 'Nurse T. Kim', role: 'Nurse', status: 'Active', clinic: 'Main Hospital', note: 'Shift nurse for ER', provider: 'Chief Nurse' },
  { id: 3, name: 'Admin A. Johnson', role: 'Admin', status: 'Active', clinic: 'All Clinics', note: 'System administrator', provider: 'Super Admin' },
  { id: 4, name: 'Receptionist K. Robin', role: 'Receptionist', status: 'Active', clinic: 'Downtown Clinic', note: 'Front desk', provider: 'Clinic Admin' },
  { id: 5, name: 'John Smith', role: 'Patient', status: 'Active', clinic: 'Main Hospital', note: 'Routine checkup', provider: 'Dr. A. Aliyev' },
  { id: 6, name: 'Jane Doe', role: 'Patient', status: 'Inactive', clinic: 'Downtown Clinic', note: 'Former patient', provider: 'Dr. A. Aliyev' },
  { id: 7, name: 'Dr. M. Wilson', role: 'Doctor', status: 'Inactive', clinic: 'Downtown Clinic', note: 'Retired physician', provider: 'Clinic Admin' }
]

const roles = ['Doctor', 'Nurse', 'Receptionist', 'Admin', 'Patient']
const statuses = ['Active', 'Inactive']
const clinics = ['Main Hospital', 'Downtown Clinic', 'All Clinics']

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedClinic, setSelectedClinic] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [newUser, setNewUser] = useState({
    contact: '',
    contactType: 'email',
    role: 'Doctor',
    clinic: 'Main Hospital'
  })

  const navigate = useNavigate()

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For development, use dummy data. Replace with actual API call:
      // const userData = await userService.fetchUsers()
      const userData = dummyUsers // Remove this line when connecting to backend
      
      setUsers(userData)
    } catch (err) {
      setError('Failed to load users. Please try again.')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    
    try {
      await userService.deleteUser(userId)
      await loadUsers() // Refresh the list
      alert('User deleted successfully')
    } catch (err) {
      alert('Failed to delete user. Please try again.')
    }
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await userService.updateUserStatus(userId, newStatus)
      await loadUsers() // Refresh the list
      alert('User status updated successfully')
    } catch (err) {
      alert('Failed to update user status. Please try again.')
    }
  }

  const handleAddUser = async () => {
    // Basic validation
    if (!newUser.contact.trim()) {
      alert('Please enter an email or phone number')
      return
    }

    // Email validation
    if (newUser.contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newUser.contact)) {
        alert('Please enter a valid email address')
        return
      }
    }

    // Phone validation
    if (newUser.contactType === 'phone') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      if (!phoneRegex.test(newUser.contact.replace(/\s/g, ''))) {
        alert('Please enter a valid phone number')
        return
      }
    }

    try {
      setAddingUser(true)
      await userService.sendUserInvitation({
        [newUser.contactType]: newUser.contact,
        role: newUser.role,
        clinic: newUser.clinic
      })
      
      alert(`Invitation sent successfully to ${newUser.contact}!`)
      setShowAddUserModal(false)
      setNewUser({
        contact: '',
        contactType: 'email',
        role: 'Doctor',
        clinic: 'Main Hospital'
      })
      await loadUsers() // Refresh the list
    } catch (err) {
      alert('Failed to send invitation. Please try again.')
    } finally {
      setAddingUser(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.clinic.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = !selectedRole || user.role === selectedRole
    const matchesStatus = !selectedStatus || user.status === selectedStatus
    const matchesClinic = !selectedClinic || user.clinic === selectedClinic

    return matchesSearch && matchesRole && matchesStatus && matchesClinic
  })

  const clearAllFilters = () => {
    setSelectedRole('')
    setSelectedStatus('')
    setSelectedClinic('')
    setSearchTerm('')
  }

  const hasActiveFilters = selectedRole || selectedStatus || selectedClinic || searchTerm

  const getUsersByRole = (role) => users.filter(user => user.role === role).length
  const getActiveUsers = () => users.filter(user => user.status === 'Active').length

  // Show loading state
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadUsers}
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

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#4DB6B0]">Clinic Users</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredUsers.length} of {users.length} users shown • {getActiveUsers()} active
            </p>
          </div>
          <button
            className="bg-[#4DB6B0] text-white px-4 py-2 rounded-md text-sm hover:bg-[#43b0a8] transition-colors"
            onClick={() => setShowAddUserModal(true)}
          >
            Add User
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main User Cards */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name, role, or clinic..."
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600">Filters:</span>
                {selectedRole && (
                  <span className="bg-[#4DB6B0] text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    Role: {selectedRole}
                    <button onClick={() => setSelectedRole('')} className="ml-1 hover:bg-[#43b0a8] rounded-full">✕</button>
                  </span>
                )}
                {selectedStatus && (
                  <span className="bg-[#4DB6B0] text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    Status: {selectedStatus}
                    <button onClick={() => setSelectedStatus('')} className="ml-1 hover:bg-[#43b0a8] rounded-full">✕</button>
                  </span>
                )}
                {selectedClinic && (
                  <span className="bg-[#4DB6B0] text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    Clinic: {selectedClinic}
                    <button onClick={() => setSelectedClinic('')} className="ml-1 hover:bg-[#43b0a8] rounded-full">✕</button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* User Cards */}
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg shadow border border-gray-100 bg-white hover:shadow-md hover:scale-[1.01] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`text-white px-4 py-2 rounded-lg text-center ${
                    user.status === 'Active' ? 'bg-[#5ACCC3]' : 'bg-gray-400'
                  }`}>
                    <div className="text-sm font-bold">{user.role}</div>
                    <div className="text-xs">{user.clinic}</div>
                  </div>
                  <div>
                    <div className="text-md font-semibold text-gray-800">{user.name}</div>
                    <div className={`text-xs font-medium ${
                      user.status === 'Active' ? 'text-[#5ACCC3]' : 'text-gray-400'
                    }`}>
                      {user.status}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 flex-1 mx-4">{user.note}</div>
                <div className="text-sm text-gray-500 hidden sm:block">Provider: {user.provider}</div>
                <div className="flex items-center gap-2">
                  {user.role === 'Patient' ? (
                    // For patients, only show View Stats button
                    <button
                      className="bg-[#5ACCC3] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4db0a8] transition-colors"
                      onClick={() => navigate(`/admin/users/${user.id}/stats`)}
                    >
                      View Stats
                    </button>
                  ) : (
                    // For non-patients, show both Edit and View buttons
                    <>
                      <button
                        className="bg-[#5ACCC3] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4db0a8] transition-colors"
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        Edit
                      </button>
                      <button
                        className="ml-2 bg-gray-100 text-[#4DB6B0] px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                        onClick={() => navigate(`/admin/users/${user.id}/stats`)}
                      >
                        View Stats
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <div className="text-lg mb-2">No users found</div>
                <div className="text-sm">Try adjusting your search or filters</div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-2 text-[#4DB6B0] hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Filters */}
          <div className="space-y-4">
            {/* Role Filter */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <h4 className="text-md font-semibold mb-3 text-gray-700">Filter by Role</h4>
              <ul className="space-y-2">
                {roles.map(role => (
                  <li key={role} className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedRole(selectedRole === role ? '' : role)}
                      className={`flex-1 text-left px-3 py-2 rounded-md text-sm font-medium transition-all
                        ${selectedRole === role ? 'bg-[#5ACCC3] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {role}
                    </button>
                    <span className="text-xs text-gray-500 ml-2">
                      {getUsersByRole(role)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Status Filter */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <h4 className="text-md font-semibold mb-3 text-gray-700">Filter by Status</h4>
              <ul className="space-y-2">
                {statuses.map(status => (
                  <li key={status}>
                    <button
                      onClick={() => setSelectedStatus(selectedStatus === status ? '' : status)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all
                        ${selectedStatus === status ? 'bg-[#5ACCC3] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {status}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Clinic Filter */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <h4 className="text-md font-semibold mb-3 text-gray-700">Filter by Clinic</h4>
              <ul className="space-y-2">
                {clinics.map(clinic => (
                  <li key={clinic}>
                    <button
                      onClick={() => setSelectedClinic(selectedClinic === clinic ? '' : clinic)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all
                        ${selectedClinic === clinic ? 'bg-[#5ACCC3] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {clinic}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Stats */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <h4 className="text-md font-semibold mb-3 text-gray-700">Quick Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Users:</span>
                  <span className="font-semibold text-[#4DB6B0]">{users.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-semibold text-green-600">{getActiveUsers()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Patients:</span>
                  <span className="font-semibold text-[#4DB6B0]">{getUsersByRole('Patient')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Staff:</span>
                  <span className="font-semibold text-[#4DB6B0]">{users.length - getUsersByRole('Patient')}</span>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <button
                onClick={loadUsers}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New User</h3>
              <div className="space-y-4">
                {/* Contact Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Method</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUser(prev => ({ ...prev, contactType: 'email', contact: '' }))}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        newUser.contactType === 'email'
                          ? 'bg-[#4DB6B0] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUser(prev => ({ ...prev, contactType: 'phone', contact: '' }))}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        newUser.contactType === 'phone'
                          ? 'bg-[#4DB6B0] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Phone
                    </button>
                  </div>
                </div>

                {/* Contact Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newUser.contactType === 'email' ? 'Email Address' : 'Phone Number'}
                  </label>
                  <input
                    type={newUser.contactType === 'email' ? 'email' : 'tel'}
                    value={newUser.contact}
                    onChange={(e) => setNewUser(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder={newUser.contactType === 'email' ? 'user@example.com' : '+998901234567'}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                  >
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>

                {/* Clinic Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                  <select
                    value={newUser.clinic}
                    onChange={(e) => setNewUser(prev => ({ ...prev, clinic: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                  >
                    {clinics.map(clinic => (
                      <option key={clinic} value={clinic}>{clinic}</option>
                    ))}
                  </select>
                </div>

                {/* Info Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-700">
                    📧 An invitation link will be sent to create their profile and set up their account.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddUserModal(false)
                    setNewUser({
                      contact: '',
                      contactType: 'email',
                      role: 'Doctor',
                      clinic: 'Main Hospital'
                    })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={addingUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#4DB6B0] rounded-md hover:bg-[#43b0a8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addingUser ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsers
