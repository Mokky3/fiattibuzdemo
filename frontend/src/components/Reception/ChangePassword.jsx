import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ReceptionistHeader } from './ReceptionHeader'
import { receptionAPI } from '../../services/apiService'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

const ChangePassword = () => {
  const { t } = useTranslation()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
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

  // Password validation function
  const getPasswordValidationDetails = (password) => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
    const isValid = Object.values(checks).every(check => check === true)
    return { checks, isValid }
  }

  const checkPasswordRequirements = (password) => {
    const validation = getPasswordValidationDetails(password)
    return validation.isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!checkPasswordRequirements(newPassword)) {
      setMessage({ type: 'error', text: t('passwordDoesNotMeetRequirements') })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('newPasswordsDoNotMatch') })
      return
    }

    try {
      await receptionAPI.changePassword({
        currentPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      }, 'default-clinic')
      
      setMessage({ type: 'success', text: t('passwordUpdatedSuccessfully') })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password change error:', error)
      setMessage({
        type: 'error',
        text: error.message || t('somethingWentWrongWhileUpdatingPassword')
      })
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <ReceptionistHeader />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className={`p-8 rounded-xl shadow-lg border transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 text-center ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
          }`}>
            {t('changePassword')}
          </h2>

          {message && (
            <div
              className={`mb-4 text-sm px-4 py-2 rounded-lg transition-colors ${
                message.type === 'success'
                  ? darkMode
                    ? 'bg-[#062412] text-[#4ADE80] border border-[#4ADE80] border-opacity-30'
                    : 'bg-green-50 text-green-700 border border-green-200'
                  : darkMode
                    ? 'bg-[#2A0E15] text-[#FB7185] border border-[#FB7185] border-opacity-30'
                    : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {typeof message.text === 'string' ? message.text : t('error')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>
                {t('oldPassword')}
              </label>
              <div className="relative mt-1">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t('enterOldPassword')}
                  required
                  className={`w-full px-4 py-2 border rounded-md pr-12 focus:ring-2 focus:ring-offset-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2] focus:ring-offset-[#0D2026]'
                      : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-[#4DB6B0] focus:ring-offset-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(prev => !prev)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                    darkMode ? 'text-[#C1D9DD] hover:bg-[#133037]' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  aria-label={showOldPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showOldPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
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
                  placeholder={t('enterNewPassword')}
                  required
                  className={`w-full px-4 py-2 border rounded-md pr-12 focus:ring-2 focus:ring-offset-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2] focus:ring-offset-[#0D2026]'
                      : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-[#4DB6B0] focus:ring-offset-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                    darkMode ? 'text-[#C1D9DD] hover:bg-[#133037]' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  aria-label={showNewPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password requirements */}
              {newPassword && (
                <div className={`mt-3 p-3 rounded-md transition-colors ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className={`text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('passwordRequirements')}</div>
                  <div className="space-y-1">
                    {(() => {
                      const validation = getPasswordValidationDetails(newPassword)
                      const labels = {
                        length: t('minLength'),
                        lowercase: t('lowercase'),
                        uppercase: t('uppercase'),
                        number: t('number'),
                        special: t('specialChar')
                      }
                      return Object.entries(validation.checks).map(([key, isValid]) => (
                        <div key={key} className="flex items-center text-xs">
                          <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${
                            isValid
                              ? darkMode ? 'bg-[#4ADE80]' : 'bg-green-500'
                              : darkMode ? 'bg-[#133037]' : 'bg-gray-300'
                          }`}>
                            {isValid && <CheckCircle className="w-2 h-2 text-white" />}
                          </div>
                          <span className={isValid ? (darkMode ? 'text-[#4ADE80]' : 'text-green-600') : (darkMode ? 'text-[#8AA2A7]' : 'text-gray-500')}>
                            {labels[key]}
                          </span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
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
                  placeholder={t('confirmNewPasswordPlaceholder')}
                  required
                  className={`w-full px-4 py-2 border rounded-md pr-12 focus:ring-2 focus:ring-offset-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2] focus:ring-offset-[#0D2026]'
                      : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-[#4DB6B0] focus:ring-offset-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                    darkMode ? 'text-[#C1D9DD] hover:bg-[#133037]' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {confirmPassword && newPassword && (
                <div className={`mt-2 text-xs ${
                  confirmPassword === newPassword
                    ? darkMode ? 'text-[#4ADE80]' : 'text-green-600'
                    : darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>
                  {confirmPassword === newPassword ? t('passwordsMatch') : t('passwordsDoNotMatch')}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`w-full mt-4 font-medium py-2 rounded-md transition-all ${
                darkMode
                  ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] text-[#050C0F] hover:scale-105'
                  : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white hover:scale-105'
              }`}
            >
              {t('updatePassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
