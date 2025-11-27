import React, { useEffect, useState } from 'react'
import { Header } from './Header'
import { useTranslation } from 'react-i18next'
import { doctorsAPI } from '../../services/apiService'
import { Edit, Save, X } from 'lucide-react'

const DoctorProfile = () => {
  const { t } = useTranslation()
  const [doctor, setDoctor] = useState(null)
  const [tempDoctor, setTempDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  
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
    const fetchDoctorProfile = async () => {
      try {
        const response = await doctorsAPI.getProfile()
        // Extract the data field from the API response
        const profileData = response.data || response
        console.log('Profile data received:', profileData)
        
        const doctorData = {
          fullName: profileData.fullName || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          specialty: profileData.specialty || '',
          licenseNumber: profileData.licenseNumber || '',
          organization: profileData.organization || '',
          bio: profileData.bio || '',
          address: profileData.address || '',
          initials: getInitials(profileData.fullName || '')
        }
        
        setDoctor(doctorData)
        setTempDoctor(doctorData)
      } catch (err) {
        console.error('Failed to fetch doctor profile:', err)
        setError(t('failedToLoadProfile'))
      } finally {
        setLoading(false)
      }
    }

    fetchDoctorProfile()
  }, [t])

  // Update tempDoctor when doctor changes
  useEffect(() => {
    if (doctor) {
      setTempDoctor(doctor)
    }
  }, [doctor])

  const getInitials = (name) => {
    if (!name) return 'DR'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const handleEdit = () => {
    setIsEditing(true)
    setTempDoctor({ ...doctor })
    setSaveStatus('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempDoctor({ ...doctor })
    setSaveStatus('')
  }

  const handleSave = async () => {
    if (!tempDoctor) return
    
    setSaving(true)
    setSaveStatus('')
    
    try {
      const updateData = {
        fullName: tempDoctor.fullName,
        email: tempDoctor.email, // Usually read-only, but include it
        phone: tempDoctor.phone || null,
        specialty: tempDoctor.specialty || null,
        licenseNumber: tempDoctor.licenseNumber || null,
        organization: tempDoctor.organization || null,
        bio: tempDoctor.bio || null,
        address: tempDoctor.address || null
      }
      
      await doctorsAPI.updateProfile(updateData)
      
      // Update the doctor state with the saved data
      const updatedDoctor = {
        ...tempDoctor,
        initials: getInitials(tempDoctor.fullName)
      }
      setDoctor(updatedDoctor)
      setIsEditing(false)
      setSaveStatus('success')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      console.error('Failed to update doctor profile:', err)
      setSaveStatus('error')
      setError(t('failedToSaveProfile'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode
          ? 'bg-[#050C0F]'
          : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
      }`}>
        <Header />
        <div className={`flex justify-center items-center h-96 ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
        }`}>{t('loadingProfile')}</div>
      </div>
    )
  }

  if (error || !doctor) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode
          ? 'bg-[#050C0F]'
          : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
      }`}>
        <Header />
        <div className={`flex justify-center items-center h-96 ${
          darkMode ? 'text-[#FB7185]' : 'text-red-500'
        }`}>{error || t('failedToLoadProfile')}</div>
      </div>
    )
  }

  if (!doctor || !tempDoctor) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode
          ? 'bg-[#050C0F]'
          : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
      }`}>
        <Header />
        <div className={`flex justify-center items-center h-96 ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
        }`}>{t('noProfileDataAvailable')}</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode
        ? 'bg-[#050C0F]'
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <Header />
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className={`rounded-xl shadow-lg border p-8 transition-colors ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-100'
        }`}>
          {/* Header with Edit button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className={`text-2xl font-bold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
            }`}>{t('myProfile')}</h1>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] text-[#050C0F] hover:from-[#58B4AA] hover:to-[#79CAC2]'
                    : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white hover:from-[#4DB6B0] hover:to-[#5ACCC3]'
                }`}
              >
                <Edit className="w-4 h-4" />
                {t('editProfile')}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'bg-[#4ADE80] text-[#050C0F] hover:bg-[#3BC970]'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                        darkMode ? 'border-[#050C0F]' : 'border-white'
                      }`}></div>
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('save')}
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                    darkMode
                      ? 'bg-[#133037] text-[#F5FEFF] hover:bg-[#1A3A3A]'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                  {t('cancel')}
                </button>
              </div>
            )}
          </div>

          {/* Status messages */}
          {saveStatus === 'success' && (
            <div className={`mb-4 p-3 border rounded-lg text-sm transition-colors ${
              darkMode
                ? 'bg-[#062412] border-[#4ADE80] text-[#4ADE80]'
                : 'bg-green-100 border-green-400 text-green-700'
            }`}>
              {t('profileSavedSuccessfully')}
            </div>
          )}
          {saveStatus === 'error' && (
            <div className={`mb-4 p-3 border rounded-lg text-sm transition-colors ${
              darkMode
                ? 'bg-[#2A0E15] border-[#FB7185] text-[#FB7185]'
                : 'bg-red-100 border-red-400 text-red-700'
            }`}>
              {t('failedToSaveProfilePleaseTryAgain')}
            </div>
          )}

          {/* Profile Content */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Profile image */}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md ${
              darkMode
                ? 'bg-gradient-to-br from-[#79CAC2] to-[#58B4AA]'
                : 'bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0]'
            }`}>
              {doctor.initials}
            </div>

            {/* Doctor Info */}
            {!isEditing ? (
              <>
                <h2 className={`text-2xl font-semibold mb-1 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                }`}>{doctor.fullName}</h2>
                <p className={`text-sm mb-4 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{doctor.email}</p>
              </>
            ) : (
              <>
                <div className="w-full max-w-md mb-4">
                  <label className={`block text-sm font-medium mb-1 text-left ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('fullName')}</label>
                  <input
                    type="text"
                    value={tempDoctor.fullName}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, fullName: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]'
                    }`}
                  />
                </div>
                <div className="w-full max-w-md mb-4">
                  <label className={`block text-sm font-medium mb-1 text-left ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('email')}</label>
                  <input
                    type="email"
                    value={tempDoctor.email}
                    disabled
                    className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#8AA2A7]'
                        : 'border-gray-300 bg-gray-50 text-gray-500'
                    }`}
                  />
                  <p className={`text-xs mt-1 text-left ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{t('emailCannotBeChanged')}</p>
                </div>
              </>
            )}
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            {!isEditing ? (
              <>
                <div className={`flex justify-between py-2 border-b transition-colors ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('phone')}:</span>
                  <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                    {doctor.phone || t('notSpecified')}
                  </span>
                </div>
                <div className={`flex justify-between py-2 border-b transition-colors ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('specialty')}:</span>
                  <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                    {doctor.specialty || t('notSpecified')}
                  </span>
                </div>
                <div className={`flex justify-between py-2 border-b transition-colors ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('licenseNumber')}:</span>
                  <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                    {doctor.licenseNumber || t('notSpecified')}
                  </span>
                </div>
                <div className={`flex justify-between py-2 border-b transition-colors ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('organization')}:</span>
                  <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                    {doctor.organization || t('notSpecified')}
                  </span>
                </div>
                {doctor.address && (
                  <div className={`flex justify-between py-2 border-b transition-colors ${
                    darkMode ? 'border-[#133037]' : 'border-gray-200'
                  }`}>
                    <span className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                    }`}>{t('address')}:</span>
                    <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                      {doctor.address}
                    </span>
                  </div>
                )}
                {doctor.bio && (
                  <div className="py-2">
                    <span className={`font-medium block mb-2 ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                    }`}>{t('bio')}:</span>
                    <p className={`text-sm ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                    }`}>{doctor.bio}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('phone')}</label>
                  <input
                    type="tel"
                    value={tempDoctor.phone || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, phone: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]'
                    }`}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('specialty')}</label>
                  <input
                    type="text"
                    value={tempDoctor.specialty || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, specialty: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]'
                    }`}
                    placeholder={t('specialtyPlaceholder')}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('licenseNumber')}</label>
                  <input
                    type="text"
                    value={tempDoctor.licenseNumber || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, licenseNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]'
                    }`}
                    placeholder={t('licenseNumberPlaceholder')}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('organization')}</label>
                  <input
                    type="text"
                    value={tempDoctor.organization || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, organization: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]'
                    }`}
                    placeholder={t('organizationPlaceholder')}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('address')}</label>
                  <input
                    type="text"
                    value={tempDoctor.address || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, address: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]'
                    }`}
                    placeholder={t('addressPlaceholder')}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('bio')}</label>
                  <textarea
                    value={tempDoctor.bio || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, bio: e.target.value })}
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none resize-none transition-colors ${
                      darkMode
                        ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]'
                    }`}
                    placeholder={t('bioPlaceholder')}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorProfile
