// src/components/Nurse/profile.jsx

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NurseHeader from './header';
import { getProfile, saveProfile } from '../../services/nurseService';

const NurseProfile = () => {
  const { t } = useTranslation();
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
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

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
      alert(t('failedToSaveProfile'))
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
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <NurseHeader />
      <div className={`p-6 max-w-xl mx-auto shadow rounded mt-6 transition-colors ${
        darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-semibold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('nurseProfile')}</h2>
          {!loading && isAuthenticated && !isEditing && (
            <button
              onClick={handleEdit}
              className={`px-4 py-2 rounded transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-[#4AB3A8]'
              }`}
            >
              {t('editProfile')}
            </button>
          )}
        </div>
        
        {/* Authentication Status */}
        <div className={`mb-6 p-4 rounded-lg transition-colors ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-100'
        }`}>
          <h3 className={`text-lg font-medium mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('authenticationStatus')}</h3>
          <div className={`space-y-1 text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>
            <div><strong>{t('authenticated')}:</strong> {isAuthenticated ? '✅ ' + t('yes') : '❌ ' + t('no')}</div>
            <div><strong>{t('userRole')}:</strong> {currentUser.role || t('unknown')}</div>
            <div><strong>{t('userId')}:</strong> {currentUser.id || t('unknown')}</div>
            <div><strong>{t('tokenExists')}:</strong> {localStorage.getItem('token') ? '✅ ' + t('yes') : '❌ ' + t('no')}</div>
          </div>
          {!isAuthenticated && (
            <div className={`mt-3 p-3 border rounded transition-colors ${
              darkMode
                ? 'bg-red-900 bg-opacity-30 border-red-500'
                : 'bg-red-100 border-red-300'
            }`}>
              <p className={`text-sm ${
                darkMode ? 'text-red-300' : 'text-red-700'
              }`}>
                <strong>{t('notAuthenticated')}!</strong> {t('pleaseLogInAgain')}
              </p>
              <button 
                onClick={() => window.location.href = '/signin?returnUrl=/nurse/profile'}
                className={`mt-2 px-4 py-2 rounded transition-colors ${
                  darkMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {t('goToLogin')}
              </button>
            </div>
          )}
        </div>

        {/* Profile Data */}
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mr-3 ${
                darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'
              }`}></div>
              <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>{t('loadingProfileData')}</span>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            {/* Editable Fields */}
            <div className={`p-4 rounded-lg transition-colors ${
              darkMode ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50'
            }`}>
              <h3 className={`text-lg font-medium mb-3 ${
                darkMode ? 'text-blue-300' : 'text-blue-900'
              }`}>{t('editableInformation')}</h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('fullName')}</label>
                  <input
                    type="text"
                    value={editingData.fullName || ''}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('email')}</label>
                  <input
                    type="email"
                    value={editingData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('phone')}</label>
                  <input
                    type="tel"
                    value={editingData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2]'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-[#5ACCC3]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Read-only Fields */}
            <div className={`p-4 rounded-lg transition-colors ${
              darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
            }`}>
              <h3 className={`text-lg font-medium mb-3 ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
              }`}>{t('systemInformationReadOnly')}</h3>
              <div className={`space-y-2 text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>
                <div><strong>{t('department')}:</strong> {nurse.department || t('notProvided')}</div>
                <div><strong>{t('licenseNumber')}:</strong> {nurse.licenseNumber || t('notProvided')}</div>
                <div><strong>{t('experience')}:</strong> {nurse.experience || t('notProvided')}</div>
              </div>
            </div>
            
            {/* Save and Cancel Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 rounded transition-colors disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600'
                    : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                }`}
              >
                {saving ? t('saving') + '...' : t('saveChanges')}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className={`px-6 py-2 rounded transition-colors disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-[#133037] text-[#C1D9DD] hover:bg-[#1a3d44] disabled:bg-gray-600'
                    : 'bg-gray-500 text-white hover:bg-gray-600 disabled:bg-gray-400'
                }`}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className={`space-y-2 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>
            <div><strong>{t('fullName')}:</strong> {nurse.fullName || t('notProvided')}</div>
            <div><strong>{t('email')}:</strong> {nurse.email || t('notProvided')}</div>
            <div><strong>{t('phone')}:</strong> {nurse.phone || t('notProvided')}</div>
            <div><strong>{t('department')}:</strong> {nurse.department || t('notProvided')}</div>
            <div><strong>{t('licenseNumber')}:</strong> {nurse.licenseNumber || t('notProvided')}</div>
            <div><strong>{t('experience')}:</strong> {nurse.experience || t('notProvided')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseProfile;
