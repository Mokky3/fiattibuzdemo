import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { RadiologyHeader } from './header'
import { changeRadiologistPassword } from '../../services/radiologyService'

const ChangePassword = () => {
  const { t } = useTranslation()
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [darkMode])
  
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('newPasswordsDoNotMatch') })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: t('newPasswordMustBeAtLeast8CharactersLong') })
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
      
      setMessage({ type: 'success', text: t('passwordUpdatedSuccessfully') })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.detail ||
          error.message ||
          t('somethingWentWrongWhileUpdatingPassword')
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode
        ? 'bg-[#050C0F]'
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <RadiologyHeader />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className={`p-8 rounded-xl shadow-lg border ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-100'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 text-center ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
          }`}>
            {t('changePassword')}
          </h2>

          {message && (
            <div
              className={`mb-4 text-sm px-4 py-2 rounded-lg ${
                message.type === 'success'
                  ? darkMode
                    ? 'bg-green-900 bg-opacity-30 text-green-300 border border-green-700'
                    : 'bg-green-50 text-green-700 border border-green-200'
                  : darkMode
                    ? 'bg-red-900 bg-opacity-30 text-red-300 border border-red-700'
                    : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>
                {t('currentPassword')}
              </label>
              <div className="relative mt-1">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-2 pr-10 border rounded-md transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-[#4DB6B0]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    darkMode ? 'text-[#8AA2A7] hover:text-[#C1D9DD]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>
                {t('newPassword')}
              </label>
              <div className="relative mt-1">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className={`w-full px-4 py-2 pr-10 border rounded-md transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-[#4DB6B0]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    darkMode ? 'text-[#8AA2A7] hover:text-[#C1D9DD]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className={`mt-1 text-xs ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                {t('passwordMustBeAtLeast8CharactersLong')}
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>
                {t('confirmNewPassword')}
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className={`w-full px-4 py-2 pr-10 border rounded-md transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-[#4DB6B0]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    darkMode ? 'text-[#8AA2A7] hover:text-[#C1D9DD]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className={`w-full mt-4 font-medium py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F] disabled:hover:bg-[#79CAC2]'
                  : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white hover:scale-105 disabled:hover:scale-100'
              }`}
            >
              {loading ? t('updating') : t('updatePassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword


