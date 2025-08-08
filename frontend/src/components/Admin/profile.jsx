import React, { useState, useEffect } from 'react'
import AdminHeader from './AdminHeader'
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiShield, FiEdit2, FiSave, FiX, FiCamera, FiKey, FiActivity, FiClock, FiSettings } from 'react-icons/fi'

const AdminProfile = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  
  // TODO: Replace with API call to fetch admin profile
  // API endpoint: GET /api/admin/profile
  // Expected response structure:
  // {
  //   id: string,
  //   fullName: string,
  //   email: string,
  //   phone: string,
  //   role: string,
  //   department: string,
  //   employeeId: string,
  //   address: string,
  //   joinDate: string (ISO format),
  //   lastLogin: string (ISO format),
  //   bio: string,
  //   profileImage: string (URL or base64),
  //   permissions: array
  // }
  const [profile, setProfile] = useState({
    fullName: '', // {{ admin.full_name }}
    email: '', // {{ admin.email }}
    phone: '', // {{ admin.phone }}
    role: '', // {{ admin.role }}
    department: '', // {{ admin.department }}
    employeeId: '', // {{ admin.employee_id }}
    address: '', // {{ admin.address }}
    joinDate: '', // {{ admin.join_date }}
    lastLogin: '', // {{ admin.last_login }}
    initials: '', // {{ admin.initials }}
    bio: '', // {{ admin.bio }}
    profileImage: null // {{ admin.profile_image }}
  })
  
  // Form data for editing
  const [formData, setFormData] = useState(profile)
  
  // TODO: Replace with API call to fetch admin activity stats
  // API endpoint: GET /api/admin/activity-stats
  // Expected response structure:
  // {
  //   totalLogins: number,
  //   configChanges: number,
  //   userManagementActions: number,
  //   systemAlerts: number
  // }
  const [activityStats, setActivityStats] = useState({
    totalLogins: 0, // {{ activity_stats.total_logins }}
    configChanges: 0, // {{ activity_stats.config_changes }}
    userManagementActions: 0, // {{ activity_stats.user_management_actions }}
    systemAlerts: 0 // {{ activity_stats.system_alerts }}
  })
  
  // TODO: Replace with API call to fetch recent activities
  // API endpoint: GET /api/admin/recent-activities
  // Expected response structure:
  // [
  //   {
  //     id: string,
  //     action: string,
  //     timestamp: string (ISO format),
  //     type: string (for icon selection)
  //   }
  // ]
  const [recentActivities, setRecentActivities] = useState([])
  
  // TODO: Replace with API call to fetch admin permissions
  // API endpoint: GET /api/admin/permissions
  // Expected response structure:
  // [
  //   {
  //     permission: string,
  //     access_level: string,
  //     granted: boolean
  //   }
  // ]
  const [permissions, setPermissions] = useState([])

  useEffect(() => {
    // TODO: Initialize data fetching
    fetchAdminProfile()
    fetchActivityStats()
    fetchRecentActivities()
    fetchPermissions()
    
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // TODO: Implement API call to fetch admin profile
  const fetchAdminProfile = async () => {
    try {
      // const response = await fetch('/api/admin/profile', {
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // const data = await response.json()
      // setProfile(data)
      // setFormData(data)
    } catch (error) {
      console.error('Error fetching admin profile:', error)
      // Handle error (show toast notification, etc.)
    }
  }

  // TODO: Implement API call to fetch activity stats
  const fetchActivityStats = async () => {
    try {
      // const response = await fetch('/api/admin/activity-stats', {
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // const data = await response.json()
      // setActivityStats(data)
    } catch (error) {
      console.error('Error fetching activity stats:', error)
    }
  }

  // TODO: Implement API call to fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      // const response = await fetch('/api/admin/recent-activities', {
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // const data = await response.json()
      // setRecentActivities(data)
    } catch (error) {
      console.error('Error fetching recent activities:', error)
    }
  }

  // TODO: Implement API call to fetch permissions
  const fetchPermissions = async () => {
    try {
      // const response = await fetch('/api/admin/permissions', {
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // const data = await response.json()
      // setPermissions(data)
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }

  const handleEdit = () => {
    setFormData(profile)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData(profile)
    setIsEditing(false)
  }

  // TODO: Implement API call to update admin profile
  const handleSave = async () => {
    setLoading(true)
    setSaveStatus('')
    
    try {
      // const response = await fetch('/api/admin/profile', {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(formData)
      // })
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to update profile')
      // }
      // 
      // const updatedProfile = await response.json()
      // setProfile(updatedProfile)
      
      setProfile(formData) // TODO: Remove this line when API is implemented
      setIsEditing(false)
      setSaveStatus('success')
      
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // TODO: Implement API call to upload profile image
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        // const formData = new FormData()
        // formData.append('profile_image', file)
        // 
        // const response = await fetch('/api/admin/profile/image', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${localStorage.getItem('token')}`
        //   },
        //   body: formData
        // })
        // 
        // if (!response.ok) {
        //   throw new Error('Failed to upload image')
        // }
        // 
        // const data = await response.json()
        // setFormData({ ...formData, profileImage: data.imageUrl })
        
        // Temporary local preview - remove when API is implemented
        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData({ ...formData, profileImage: reader.result })
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('Error uploading image:', error)
        // Handle error (show toast notification, etc.)
      }
    }
  }

  // TODO: Implement functions for quick actions
  const handleChangePassword = () => {
    // Navigate to change password page or open modal
    // window.location.href = '/admin/change-password'
  }

  const handleSecuritySettings = () => {
    // Navigate to security settings page
    // window.location.href = '/admin/security-settings'
  }

  const handleViewActivityLog = () => {
    // Navigate to activity log page
    // window.location.href = '/admin/activity-log'
  }

  const handleViewAllActivities = () => {
    // Navigate to all activities page
    // window.location.href = '/admin/activities'
  }

  // Helper function to get activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'config':
        return <FiSettings className="text-blue-500" />
      case 'security':
        return <FiShield className="text-green-500" />
      case 'activity':
        return <FiActivity className="text-purple-500" />
      case 'auth':
        return <FiKey className="text-orange-500" />
      default:
        return <FiActivity className="text-gray-500" />
    }
  }

  // Helper function to format time
  const formatTime = (timestamp) => {
    // TODO: Implement proper time formatting
    // const date = new Date(timestamp)
    // return formatDistanceToNow(date, { addSuffix: true })
    return timestamp
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
            Admin Profile
          </h2>
          
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300"
            >
              <FiEdit2 className="mr-2" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Save Status */}
        {saveStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            Profile updated successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            Error updating profile. Please try again.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start">
                {/* Profile Image */}
                <div className="relative mr-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                    {isEditing && formData.profileImage ? (
                      <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : profile.profileImage ? (
                      <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      profile.initials || profile.fullName?.split(' ').map(n => n[0]).join('') || 'AD'
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50">
                      <FiCamera className="text-gray-600" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-2xl font-semibold text-gray-800">{profile.fullName || 'Loading...'}</h3>
                      <p className="text-[#4DB6B0] font-medium mb-2">{profile.role || 'Loading...'}</p>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FiMail className="mr-2 text-gray-400" />
                          {profile.email || 'Loading...'}
                        </div>
                        <div className="flex items-center">
                          <FiPhone className="mr-2 text-gray-400" />
                          {profile.phone || 'Loading...'}
                        </div>
                        <div className="flex items-center">
                          <FiMapPin className="mr-2 text-gray-400" />
                          {profile.address || 'Loading...'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                        placeholder="Enter department"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                        placeholder="Enter address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent resize-none"
                        placeholder="Enter bio"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Employee ID:</span>
                      <span className="ml-2 font-medium text-gray-700">{profile.employeeId || 'Loading...'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Department:</span>
                      <span className="ml-2 font-medium text-gray-700">{profile.department || 'Loading...'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Join Date:</span>
                      <span className="ml-2 font-medium text-gray-700">
                        {profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : 'Loading...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Login:</span>
                      <span className="ml-2 font-medium text-gray-700">
                        {profile.lastLogin ? formatTime(profile.lastLogin) : 'Loading...'}
                      </span>
                    </div>
                    <div className="col-span-2 mt-2">
                      <span className="text-gray-500">Bio:</span>
                      <p className="mt-1 text-gray-700">{profile.bio || 'No bio available'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FiX className="inline mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiSave className="inline mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Activity Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Activity Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#4DB6B0]">{activityStats.totalLogins}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Logins</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#4DB6B0]">{activityStats.configChanges}</div>
                  <div className="text-sm text-gray-600 mt-1">Config Changes</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#4DB6B0]">{activityStats.userManagementActions}</div>
                  <div className="text-sm text-gray-600 mt-1">User Actions</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#4DB6B0]">{activityStats.systemAlerts}</div>
                  <div className="text-sm text-gray-600 mt-1">System Alerts</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleChangePassword}
                  className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
                >
                  <FiKey className="mr-3 text-[#4DB6B0]" />
                  <span className="text-sm font-medium text-gray-700">Change Password</span>
                </button>
                <button 
                  onClick={handleSecuritySettings}
                  className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
                >
                  <FiShield className="mr-3 text-[#4DB6B0]" />
                  <span className="text-sm font-medium text-gray-700">Security Settings</span>
                </button>
                <button 
                  onClick={handleViewActivityLog}
                  className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
                >
                  <FiActivity className="mr-3 text-[#4DB6B0]" />
                  <span className="text-sm font-medium text-gray-700">View Activity Log</span>
                </button>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activities</h3>
              <div className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.map(activity => (
                    <div key={activity.id} className="flex items-start">
                      <div className="mr-3 mt-1">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">No recent activities</p>
                  </div>
                )}
              </div>
              <button 
                onClick={handleViewAllActivities}
                className="mt-4 w-full text-center text-sm text-[#4DB6B0] hover:text-[#5ACCC3] font-medium"
              >
                View All Activities
              </button>
            </div>

            {/* Access Permissions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Access Permissions</h3>
              <div className="space-y-2 text-sm">
                {permissions.length > 0 ? (
                  permissions.map((perm, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-gray-600">{perm.permission}</span>
                      <span className={`font-medium ${perm.granted ? 'text-green-600' : 'text-red-600'}`}>
                        {perm.granted ? '✓ ' : '✗ '}
                        {perm.access_level}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    {/* TODO: Remove these default permissions when API is implemented */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">User Management</span>
                      <span className="text-green-600 font-medium">✓ Full Access</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">System Configuration</span>
                      <span className="text-green-600 font-medium">✓ Full Access</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Audit Logs</span>
                      <span className="text-green-600 font-medium">✓ Full Access</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Data Export</span>
                      <span className="text-green-600 font-medium">✓ Full Access</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminProfile