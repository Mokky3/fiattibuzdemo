import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import { FiArrowLeft, FiSave, FiUser, FiShield, FiSettings, FiRefreshCw } from 'react-icons/fi'

// API service functions
const userProfileService = {
  async fetchUserProfile(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch user profile')
      return await response.json()
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  },

  async updateUserProfile(userId, userData) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
      if (!response.ok) throw new Error('Failed to update user profile')
      return await response.json()
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  },

  async resetUserPassword(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to reset password')
      return await response.json()
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  },

  async fetchClinics() {
    try {
      const response = await fetch('/api/admin/clinics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch clinics')
      return await response.json()
    } catch (error) {
      console.error('Error fetching clinics:', error)
      throw error
    }
  }
}

const accessOptionsByRole = {
  Doctor: ['viewHistory', 'prescribe', 'editMedical', 'accessAnalytics'],
  Nurse: ['viewHistory', 'editMedical'],
  Receptionist: ['viewHistory'],
  Lab: ['viewHistory', 'accessAnalytics'],
  Admin: ['viewHistory', 'editMedical', 'accessAnalytics'],
  Patient: []
}

const accessLabels = {
  viewHistory: 'View Full Patient History',
  prescribe: 'Prescribe Medication',
  editMedical: 'Edit Medical Information',
  accessAnalytics: 'Access Analytics & Reports'
}

const AdminUserProfile = () => {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [edited, setEdited] = useState({})
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)

  useEffect(() => {
    loadUserProfile()
    loadClinics()
  }, [userId])

  useEffect(() => {
    if (user && edited) {
      const changes = JSON.stringify(user) !== JSON.stringify(edited)
      setHasChanges(changes)
    }
  }, [user, edited])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const userData = await userProfileService.fetchUserProfile(userId)
      setUser(userData)
      setEdited(userData)
    } catch (err) {
      setError('Failed to load user profile. Please try again.')
      console.error('Error loading user profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadClinics = async () => {
    try {
      const clinicData = await userProfileService.fetchClinics()
      setClinics(clinicData)
    } catch (err) {
      console.error('Error loading clinics:', err)
    }
  }

  const handleChange = (field, value) => {
    setEdited(prev => ({ ...prev, [field]: value }))
  }

  const handleAccessChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      access: {
        ...prev.access,
        [field]: value
      }
    }))
  }

  const handleRoleChange = (newRole) => {
    const newAccess = {}
    accessOptionsByRole[newRole]?.forEach(permission => {
      newAccess[permission] = false
    })

    setEdited(prev => ({
      ...prev,
      role: newRole,
      access: newAccess
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      await userProfileService.updateUserProfile(userId, edited)
      setUser(edited)
      setHasChanges(false)
      alert('User profile updated successfully!')
    } catch (err) {
      setError('Failed to save changes. Please try again.')
      console.error('Error saving user profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset this user\'s password? They will receive an email with reset instructions.'
    )
    if (!confirmed) return

    try {
      setResetPasswordLoading(true)
      await userProfileService.resetUserPassword(userId)
      alert('Password reset email sent successfully!')
    } catch (err) {
      alert('Failed to reset password. Please try again.')
      console.error('Error resetting password:', err)
    } finally {
      setResetPasswordLoading(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges && !window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      return
    }
    setEdited(user)
    setHasChanges(false)
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading user profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && !user) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-3xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadUserProfile}
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

  // Avoid rendering if user is still undefined (but not error)
  if (!user) return null

  const isPatient = edited.role === 'Patient'
  const selectedClinic = clinics.find(c => c.id === edited.clinicId)

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="text-gray-600 hover:text-[#4DB6B0] flex items-center gap-1 text-sm transition"
          >
            <FiArrowLeft /> Back
          </button>
          
          <button
            onClick={loadUserProfile}
            disabled={loading}
            className="text-gray-600 hover:text-[#4DB6B0] p-2 transition"
            title="Refresh"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {/* Title and Status */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#4DB6B0]">
              {isPatient ? 'View Patient Profile' : 'Edit User Profile'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              User ID: {user.id} • Created: {user.createdAt}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            edited.status === 'Active' ? 'bg-green-100 text-green-700' :
            edited.status === 'Inactive' ? 'bg-gray-100 text-gray-700' :
            'bg-red-100 text-red-700'
          }`}>
            {edited.status}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Unsaved Changes Warning */}
        {hasChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-center justify-between">
            <p className="text-yellow-700 text-sm">You have unsaved changes</p>
            <button
              onClick={handleCancel}
              className="text-yellow-600 hover:text-yellow-800 text-sm underline"
            >
              Cancel Changes
            </button>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FiUser className="text-[#4DB6B0]" />
            <h3 className="text-lg font-semibold text-gray-700">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
              <input 
                type="text" 
                value={edited.name} 
                onChange={e => handleChange('name', e.target.value)} 
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                  isPatient ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                disabled={isPatient} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
              <input 
                type="email" 
                value={edited.email} 
                onChange={e => handleChange('email', e.target.value)} 
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                  isPatient ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                disabled={isPatient} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Phone</label>
              <input 
                type="text" 
                value={edited.phone} 
                onChange={e => handleChange('phone', e.target.value)} 
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                  isPatient ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                disabled={isPatient} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Last Login</label>
              <input 
                type="text" 
                value={user.lastLogin} 
                className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 cursor-not-allowed"
                disabled 
              />
            </div>
          </div>
        </div>

        {/* Role & Clinic */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FiShield className="text-[#4DB6B0]" />
            <h3 className="text-lg font-semibold text-gray-700">Role & Assignment</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Role</label>
              <select 
                value={edited.role} 
                onChange={e => handleRoleChange(e.target.value)} 
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                  isPatient ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                disabled={isPatient}
              >
                <option value="Doctor">Doctor</option>
                <option value="Nurse">Nurse</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Lab">Lab Technician</option>
                <option value="Admin">Administrator</option>
                <option value="Patient">Patient</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Assigned Clinic</label>
              <select 
                value={edited.clinicId} 
                onChange={e => handleChange('clinicId', e.target.value)} 
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                  isPatient ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                disabled={isPatient}
              >
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
              {selectedClinic && (
                <p className="text-xs text-gray-500 mt-1">Currently assigned to {selectedClinic.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Access Permissions */}
        {!isPatient && accessOptionsByRole[edited.role]?.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FiSettings className="text-[#4DB6B0]" />
              <h3 className="text-lg font-semibold text-gray-700">Feature Access Permissions</h3>
            </div>
            <div className="space-y-3">
              {accessOptionsByRole[edited.role].map(key => (
                <div 
                  key={key} 
                  className="border rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleAccessChange(key, !edited.access?.[key])}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 cursor-pointer">{accessLabels[key]}</label>
                      <p className="text-xs text-gray-500">
                        {key === 'viewHistory' && 'Allow access to view complete patient medical history'}
                        {key === 'prescribe' && 'Allow prescribing medications and treatments'}
                        {key === 'editMedical' && 'Allow editing patient medical information and records'}
                        {key === 'accessAnalytics' && 'Allow access to clinic analytics and reporting tools'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={edited.access?.[key] || false}
                      onChange={e => {
                        e.stopPropagation()
                        handleAccessChange(key, e.target.checked)
                      }}
                      className="w-5 h-5 text-[#4DB6B0] focus:ring-[#4DB6B0] border-gray-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status & Security */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FiShield className="text-[#4DB6B0]" />
            <h3 className="text-lg font-semibold text-gray-700">Status & Security</h3>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Account Status</label>
            <select 
              value={edited.status} 
              onChange={e => handleChange('status', e.target.value)} 
              className={`w-full md:w-1/2 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent ${
                isPatient ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              disabled={isPatient}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {edited.status === 'Active' && 'User can access the system normally'}
              {edited.status === 'Inactive' && 'User cannot log in to the system'}
              {edited.status === 'Suspended' && 'User access is temporarily restricted'}
            </p>
          </div>
          
          {!isPatient && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Security Actions</h4>
              <button 
                onClick={handleResetPassword}
                disabled={resetPasswordLoading}
                className="text-sm text-red-600 hover:text-red-800 hover:underline transition-colors disabled:opacity-50"
              >
                {resetPasswordLoading ? 'Sending...' : 'Reset Password & Send Email'}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isPatient && (
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/admin/users/${userId}/stats`)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                View Statistics
              </button>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <button
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Patient View Actions */}
        {isPatient && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => navigate(`/admin/users/${userId}/stats`)}
              className="bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
            >
              View Patient Statistics
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUserProfile