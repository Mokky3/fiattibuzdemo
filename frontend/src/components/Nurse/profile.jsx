// src/components/Nurse/profile.jsx

import React, { useEffect, useState } from 'react';
import NurseHeader from './header';
import { getProfile, saveProfile } from '../../services/nurseService';

const NurseProfile = () => {
  const [nurse, setNurse] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    licenseNumber: '',
    experience: '',
  })
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        console.log('🔍 [NurseProfile] Fetching profile data...')
        console.log('🔍 [NurseProfile] Token exists:', !!localStorage.getItem('token'))
        console.log('🔍 [NurseProfile] User exists:', !!localStorage.getItem('user'))
        
        const response = await getProfile()
        console.log('🔍 [NurseProfile] Profile response:', response)
        
        if (!active) return
        
        // Handle SuccessResponse format: { data: { profileData: {...}, lastUpdated: "..." }, message: "..." }
        if (response && response.data && response.data.profileData) {
          console.log('✅ [NurseProfile] Setting profile data:', response.data.profileData)
          setNurse(response.data.profileData)
        } else if (response && response.profileData) {
          // Fallback for direct profileData format
          console.log('✅ [NurseProfile] Setting profile data (fallback):', response.profileData)
          setNurse(response.profileData)
        } else {
          console.log('❌ [NurseProfile] No profile data in response')
          console.log('❌ [NurseProfile] Response structure:', Object.keys(response || {}))
        }
      } catch (e) {
        console.error('❌ [NurseProfile] Error fetching profile:', e)
        console.error('❌ [NurseProfile] Error details:', e.message)
        
        // If it's an auth error, clear the auth and redirect to login
        if (e.message && (e.message.includes('401') || e.message.includes('403') || e.message.includes('Authentication'))) {
          console.log('🔄 [NurseProfile] Auth error detected, clearing auth...')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          // Redirect to login with return URL
          window.location.href = '/signin?returnUrl=/nurse/profile'
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  // Edit functions
  const handleEdit = () => {
    // Only copy editable fields
    setEditingData({
      fullName: nurse.fullName,
      email: nurse.email,
      phone: nurse.phone
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditingData({})
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log('🔍 [NurseProfile] Saving profile data:', editingData)
      
      // Save to backend (only editable fields)
      const response = await saveProfile(editingData)
      console.log('🔍 [NurseProfile] Save response:', response)
      
      // Update local state with saved data
      if (response && response.data && response.data.profileData) {
        setNurse(response.data.profileData)
      } else {
        // Merge editable fields with existing data
        setNurse(prev => ({
          ...prev,
          ...editingData
        }))
      }
      
      setIsEditing(false)
      setEditingData({})
      
      console.log('✅ [NurseProfile] Profile saved successfully')
    } catch (error) {
      console.error('❌ [NurseProfile] Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Check authentication state
  const isAuthenticated = !!localStorage.getItem('token') && !!localStorage.getItem('user')
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <div className="min-h-screen bg-gray-50">
      <NurseHeader />
      <div className="p-6 max-w-xl mx-auto bg-white shadow rounded mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Nurse Profile</h2>
          {!loading && isAuthenticated && !isEditing && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-[#5ACCC3] text-white rounded hover:bg-[#4AB3A8] transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
        
        {/* Authentication Status */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Authentication Status</h3>
          <div className="space-y-1 text-sm">
            <div><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</div>
            <div><strong>User Role:</strong> {currentUser.role || 'Unknown'}</div>
            <div><strong>User ID:</strong> {currentUser.id || 'Unknown'}</div>
            <div><strong>Token Exists:</strong> {localStorage.getItem('token') ? '✅ Yes' : '❌ No'}</div>
          </div>
          {!isAuthenticated && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
              <p className="text-red-700 text-sm">
                <strong>Not authenticated!</strong> Please log in again.
              </p>
              <button 
                onClick={() => window.location.href = '/signin?returnUrl=/nurse/profile'}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        {/* Profile Data */}
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5ACCC3] mr-3"></div>
              <span className="text-gray-600">Loading profile data...</span>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            {/* Editable Fields */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-3">Editable Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingData.fullName || ''}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Read-only Fields */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-3">System Information (Read-only)</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Department:</strong> {nurse.department || 'Not provided'}</div>
                <div><strong>License Number:</strong> {nurse.licenseNumber || 'Not provided'}</div>
                <div><strong>Experience:</strong> {nurse.experience || 'Not provided'}</div>
              </div>
            </div>
            
            {/* Save and Cancel Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div><strong>Full Name:</strong> {nurse.fullName || 'Not provided'}</div>
            <div><strong>Email:</strong> {nurse.email || 'Not provided'}</div>
            <div><strong>Phone:</strong> {nurse.phone || 'Not provided'}</div>
            <div><strong>Department:</strong> {nurse.department || 'Not provided'}</div>
            <div><strong>License Number:</strong> {nurse.licenseNumber || 'Not provided'}</div>
            <div><strong>Experience:</strong> {nurse.experience || 'Not provided'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseProfile;
