import React, { useState } from 'react'
import { RadiologyHeader } from './header'
import { changeRadiologistPassword } from '../../services/radiologyService'

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long.' })
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      
      await changeRadiologistPassword({
        currentPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      })
      
      setMessage({ type: 'success', text: 'Password updated successfully.' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.detail ||
          error.message ||
          'Something went wrong while updating the password.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <RadiologyHeader />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Change Password
          </h2>

          {message && (
            <div
              className={`mb-4 text-sm px-4 py-2 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-[#4DB6B0] focus:border-[#4DB6B0]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-[#4DB6B0] focus:border-[#4DB6B0]"
              />
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-[#4DB6B0] focus:border-[#4DB6B0]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className="w-full mt-4 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white font-medium py-2 rounded-md hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword

