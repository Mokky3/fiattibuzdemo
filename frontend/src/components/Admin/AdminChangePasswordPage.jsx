import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import { adminAPI } from '../../services/apiService'

const AdminChangePasswordPage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear message when user starts typing
    if (message) setMessage(null)
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      setLoading(false)
      return
    }

    // Validate password strength
    const password = formData.newPassword
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' })
      setLoading(false)
      return
    }
    if (!/[A-Z]/.test(password)) {
      setMessage({ type: 'error', text: 'Password must contain at least one uppercase letter.' })
      setLoading(false)
      return
    }
    if (!/[a-z]/.test(password)) {
      setMessage({ type: 'error', text: 'Password must contain at least one lowercase letter.' })
      setLoading(false)
      return
    }
    if (!/\d/.test(password)) {
      setMessage({ type: 'error', text: 'Password must contain at least one number.' })
      setLoading(false)
      return
    }
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      setMessage({ type: 'error', text: 'Password must contain at least one special character.' })
      setLoading(false)
      return
    }

    if (formData.newPassword === formData.currentPassword) {
      setMessage({ type: 'error', text: 'New password must be different from your current password.' })
      setLoading(false)
      return
    }

    try {
      await adminAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      })
      
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      // Navigate back to profile after 2 seconds
      setTimeout(() => {
        navigate('/admin/profile')
      }, 2000)
      
    } catch (error) {
      console.error('Change password error:', error)
      
      // Handle specific error messages
      let errorMessage = 'Failed to change password. Please try again.'
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (typeof detail === 'string') {
          if (detail.includes('Current password is incorrect')) {
            errorMessage = 'Current password is incorrect. Please check and try again.'
          } else if (detail.includes('password')) {
            errorMessage = detail
          } else {
            errorMessage = detail
          }
        } else if (typeof detail === 'object' && detail.message) {
          errorMessage = detail.message
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      setMessage({
        type: 'error',
        text: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/profile')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <FiArrowLeft className="text-sm" />
            Back to Profile
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#4DB6B0] bg-opacity-10 rounded-lg">
              <FiLock className="text-[#4DB6B0] text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Change Password</h1>
              <p className="text-gray-600">Update your account password</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-[#4DB6B0] transition-colors"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-[#4DB6B0] transition-colors"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter (A-Z)</li>
                  <li>One lowercase letter (a-z)</li>
                  <li>One number (0-9)</li>
                  <li>One special character (!@#$%^&*...)</li>
                </ul>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-[#4DB6B0] transition-colors"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/profile')}
                className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#4DB6B0] hover:bg-[#3BA8A0] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminChangePasswordPage
