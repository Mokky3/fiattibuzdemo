import React, { useState, useEffect } from 'react'
import AdminHeader from './AdminHeader'
import { FiUser, FiShield, FiSettings, FiRefreshCw, FiSave, FiEdit2, FiActivity, FiBell } from 'react-icons/fi'
import { adminAPI } from '../../services/apiService'

const AdminProfile = () => {
  
  const [profile, setProfile] = useState(null)
  const [activityStats, setActivityStats] = useState(null)
  const [recentActivities, setRecentActivities] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedProfile, setEditedProfile] = useState({})

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all profile data in parallel
      const [profileData, statsData, activitiesData, permissionsData] = await Promise.allSettled([
        adminAPI.getProfile(),
        adminAPI.getActivityStats(),
        adminAPI.getRecentActivities(),
        adminAPI.getPermissions()
      ])

      // Handle profile data
      if (profileData.status === 'fulfilled') {
        const profile = profileData.value?.data || profileData.value
        setProfile(profile)
        setEditedProfile(profile)
      } else {
        console.error('Failed to load profile:', profileData.reason)
      }

      // Handle activity stats
      if (statsData.status === 'fulfilled') {
        const stats = statsData.value?.data || statsData.value
        setActivityStats({
          active_devices: stats?.activeDevices || 0,
          devices_logged_in: stats?.devicesLoggedIn || 0,
          total_devices: stats?.totalDevices || 0
        })
      } else {
        console.error('Failed to load activity stats:', statsData.reason)
      }

      // Handle recent activities
      if (activitiesData.status === 'fulfilled') {
        const activities = activitiesData.value?.data || activitiesData.value || []
        setRecentActivities(activities)
      } else {
        console.error('Failed to load recent activities:', activitiesData.reason)
      }

      // Handle permissions
      if (permissionsData.status === 'fulfilled') {
        const perms = permissionsData.value?.data || permissionsData.value || []
        setPermissions(perms)
      } else {
        console.error('Failed to load permissions:', permissionsData.reason)
      }

    } catch (err) {
      console.error('Error loading profile data:', err)
      setError('Failed to load profile data. Please try again.')
      
      // Set fallback data so the page still shows something
      setProfile({
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@example.com',
        phone: '',
        role: 'super_admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      setEditedProfile({
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@example.com',
        phone: '',
        role: 'super_admin'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log('Saving profile with data:', editedProfile)
      
      // Only send the fields that can be updated
      const updateData = {
        first_name: editedProfile.first_name,
        last_name: editedProfile.last_name,
        email: editedProfile.email,
        phone: editedProfile.phone
      }
      
      console.log('Sending update data:', updateData)
      const result = await adminAPI.updateProfile(updateData)
      console.log('Update result:', result)
      
      // Reload the profile to get the updated data with new timestamps
      await loadProfileData()
      setEditing(false)
      alert('Profile updated successfully!')
    } catch (err) {
      console.error('Error updating profile:', err)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setEditing(false)
  }

  const handleChange = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-3xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadProfileData}
                className="bg-[#4DB6B0] text-white px-4 py-2 rounded-md hover:bg-[#43b0a8] transition"
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#4DB6B0]">Admin Profile</h1>
            <p className="text-gray-600 mt-1">Manage your account and view system information</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadProfileData}
              disabled={loading}
              className="text-gray-600 hover:text-[#4DB6B0] p-2 transition"
              title="Refresh"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
            {!editing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm transition-colors"
                >
                  <FiEdit2 />
                  Edit Profile
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                >
                  <FiSave />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <FiUser className="text-[#4DB6B0]" />
                <h2 className="text-xl font-semibold text-gray-700">Basic Information</h2>
              </div>
              
              {profile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editedProfile.first_name || ''}
                        onChange={e => handleChange('first_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        placeholder="First Name"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {profile.first_name || 'Not set'}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editedProfile.last_name || ''}
                        onChange={e => handleChange('last_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        placeholder="Last Name"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {profile.last_name || 'Not set'}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    {editing ? (
                      <input
                        type="email"
                        value={editedProfile.email || ''}
                        onChange={e => handleChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        placeholder="Email address"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.email || 'Not set'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editedProfile.phone || ''}
                        onChange={e => handleChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        placeholder="Phone number"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.phone || 'Not set'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <div className="flex items-center gap-2">
                      <FiShield className="text-[#4DB6B0]" />
                      <span className="px-2 py-1 bg-[#4DB6B0] text-white text-xs rounded-full">
                        {profile.role || 'Admin'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiUser className="mx-auto text-4xl text-gray-300 mb-4" />
                  <p className="text-gray-500">No profile information available</p>
                </div>
              )}
            </div>

            {/* Activity Statistics */}
            {activityStats && (
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <FiActivity className="text-[#4DB6B0]" />
                  <h2 className="text-xl font-semibold text-gray-700">Activity Statistics</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-2">
                      {activityStats.active_devices || 0}
                    </div>
                    <div className="text-sm text-gray-600">Active Devices</div>
                    <div className="text-xs text-gray-500 mt-1">Last 7 days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-2">
                      {activityStats.devices_logged_in || 0}
                    </div>
                    <div className="text-sm text-gray-600">Devices Logged In</div>
                    <div className="text-xs text-gray-500 mt-1">Recent logins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 mb-2">
                      {activityStats.total_devices || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Devices</div>
                    <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activities */}
            {recentActivities.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <FiBell className="text-[#4DB6B0]" />
                  <h2 className="text-xl font-semibold text-gray-700">Recent Activities</h2>
                </div>
                
                <div className="space-y-4">
                  {recentActivities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-[#4DB6B0] rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.action || 'Activity'}</p>
                        <p className="text-xs text-gray-500">{activity.timestamp || 'Recently'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Permissions & System Info */}
          <div className="space-y-6">
            {/* Permissions */}
            {permissions.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <FiShield className="text-[#4DB6B0]" />
                  <h2 className="text-xl font-semibold text-gray-700">Permissions</h2>
                </div>
                
                <div className="space-y-3">
                  {permissions.map((permission, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${permission.granted ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-700">{permission.permission || permission.name || permission}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        permission.access_level === 'Full Access' ? 'bg-green-100 text-green-700' :
                        permission.access_level === 'Read Only' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {permission.access_level || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Information */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <FiSettings className="text-[#4DB6B0]" />
                <h2 className="text-xl font-semibold text-gray-700">System Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile Created</label>
                  <p className="text-sm text-gray-600">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <p className="text-sm text-gray-600">
                    {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default AdminProfile
