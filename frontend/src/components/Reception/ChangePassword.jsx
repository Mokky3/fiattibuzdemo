import React, { useState } from 'react'
import { ReceptionistHeader } from './ReceptionHeader'
import { receptionAPI } from '../../services/apiService'

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    try {
      await receptionAPI.changePassword({
        currentPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      }, 'default-clinic')
      
      setMessage({ type: 'success', text: 'Password updated successfully.' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password change error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Something went wrong while updating the password.'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />
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
              {typeof message.text === 'string' ? message.text : 'An error occurred'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Old Password
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
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-[#4DB6B0] focus:border-[#4DB6B0]"
              />
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
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-[#4DB6B0] focus:border-[#4DB6B0]"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white font-medium py-2 rounded-md hover:scale-105 transition"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
