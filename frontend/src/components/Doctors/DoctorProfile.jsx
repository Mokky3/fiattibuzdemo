import React, { useEffect, useState } from 'react'
import { Header } from './Header'
import { doctorsAPI } from '../../services/apiService'
import { Edit, Save, X } from 'lucide-react'

const DoctorProfile = () => {
  const [doctor, setDoctor] = useState(null)
  const [tempDoctor, setTempDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

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
        setError('Failed to load profile. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchDoctorProfile()
  }, [])

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
      setError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <Header />
        <div className="flex justify-center items-center h-96 text-gray-600">Loading profile...</div>
      </div>
    )
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <Header />
        <div className="flex justify-center items-center h-96 text-red-500">{error}</div>
      </div>
    )
  }

  if (!doctor || !tempDoctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <Header />
        <div className="flex justify-center items-center h-96 text-gray-600">No profile data available</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          {/* Header with Edit button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-sm font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Status messages */}
          {saveStatus === 'success' && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              Profile saved successfully!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              Failed to save profile. Please try again.
            </div>
          )}

          {/* Profile Content */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Profile image */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md">
              {doctor.initials}
            </div>

            {/* Doctor Info */}
            {!isEditing ? (
              <>
                <h2 className="text-2xl font-semibold text-gray-800 mb-1">{doctor.fullName}</h2>
                <p className="text-gray-500 text-sm mb-4">{doctor.email}</p>
              </>
            ) : (
              <>
                <div className="w-full max-w-md mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Full Name</label>
                  <input
                    type="text"
                    value={tempDoctor.fullName}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:outline-none"
                  />
                </div>
                <div className="w-full max-w-md mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Email</label>
                  <input
                    type="email"
                    value={tempDoctor.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-left">Email cannot be changed</p>
                </div>
              </>
            )}
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            {!isEditing ? (
              <>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="text-gray-600">{doctor.phone || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Specialty:</span>
                  <span className="text-gray-600">{doctor.specialty || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">License Number:</span>
                  <span className="text-gray-600">{doctor.licenseNumber || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Organization:</span>
                  <span className="text-gray-600">{doctor.organization || 'Not specified'}</span>
                </div>
                {doctor.address && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Address:</span>
                    <span className="text-gray-600">{doctor.address}</span>
                  </div>
                )}
                {doctor.bio && (
                  <div className="py-2">
                    <span className="font-medium text-gray-700 block mb-2">Bio:</span>
                    <p className="text-gray-600 text-sm">{doctor.bio}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={tempDoctor.phone || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:outline-none"
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={tempDoctor.specialty || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, specialty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:outline-none"
                    placeholder="e.g., Cardiology, Pediatrics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    value={tempDoctor.licenseNumber || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, licenseNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:outline-none"
                    placeholder="License number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <input
                    type="text"
                    value={tempDoctor.organization || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, organization: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:outline-none"
                    placeholder="Hospital or clinic name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={tempDoctor.address || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:outline-none"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={tempDoctor.bio || ''}
                    onChange={(e) => setTempDoctor({ ...tempDoctor, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:outline-none resize-none"
                    placeholder="Tell patients about your experience and specializations..."
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
