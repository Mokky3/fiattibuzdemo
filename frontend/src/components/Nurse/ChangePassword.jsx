import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle } from 'lucide-react'
import NurseHeader from './header'
import { changePassword } from '../../services/nurseService'

const NurseChangePassword = () => {
  const { t } = useTranslation()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
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

  // Password requirements checker
  const getPasswordValidationDetails = (password) => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*#?&]/.test(password)
    };
    const allValid = Object.values(checks).every(v => v);
    return { checks, allValid };
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('newPasswordsDoNotMatch') })
      setLoading(false)
      return
    }

    const validation = getPasswordValidationDetails(newPassword)
    if (!validation.allValid) {
      setMessage({ type: 'error', text: t('passwordDoesNotMeetRequirements') })
      setLoading(false)
      return
    }

    try {
      await changePassword({
        currentPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      })
      setMessage({ type: 'success', text: t('passwordUpdatedSuccessfully') })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Change password error:', error)
      setMessage({
        type: 'error',
        text: error.message || t('somethingWentWrongWhileUpdatingPassword')
      })
    } finally {
      setLoading(false)
    }
  }

  const validation = getPasswordValidationDetails(newPassword)

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <NurseHeader />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className={`p-8 rounded-xl shadow-lg border transition-colors ${
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
              className={`mb-4 text-sm px-4 py-2 rounded-lg border transition-colors ${
                message.type === 'success'
                  ? darkMode
                    ? 'bg-[#062412] border-[#4ADE80] text-[#4ADE80]'
                    : 'bg-green-50 text-green-700 border-green-200'
                  : darkMode
                  ? 'bg-[#2A0E15] border-[#FB7185] text-[#FB7185]'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
              }`}>
                {t('oldPassword')}
              </label>
              <div className="relative mt-1">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:ring-2 focus:outline-none transition-colors disabled:cursor-not-allowed ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2] disabled:bg-[#133037]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] disabled:bg-gray-100'
                  }`}
                  placeholder={t('enterOldPassword')}
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a1.17 1.17 0 0 1 1.66-1.66M10.5 5.17A10.07 10.07 0 0 1 12 4c7 0 10 7 10 7a1.17 1.17 0 0 1-1.66 1.66L16 10.5M16 16l-3.5-3.5M2 2l20 20"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
              }`}>
                {t('newPassword')}
              </label>
              <div className="relative mt-1">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:ring-2 focus:outline-none transition-colors disabled:cursor-not-allowed ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2] disabled:bg-[#133037]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] disabled:bg-gray-100'
                  }`}
                  placeholder={t('enterNewPassword')}
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a1.17 1.17 0 0 1 1.66-1.66M10.5 5.17A10.07 10.07 0 0 1 12 4c7 0 10 7 10 7a1.17 1.17 0 0 1-1.66 1.66L16 10.5M16 16l-3.5-3.5M2 2l20 20"/></svg>
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div className={`mt-3 p-3 rounded-md transition-colors ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className={`text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                  }`}>{t('passwordRequirements')}</div>
                  <div className="space-y-1">
                    {(() => {
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
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
              }`}>
                {t('confirmNewPassword')}
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:ring-2 focus:outline-none transition-colors disabled:cursor-not-allowed ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2] disabled:bg-[#133037]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] disabled:bg-gray-100'
                  } ${confirmPassword && newPassword !== confirmPassword ? (darkMode ? 'border-red-500' : 'border-red-300') : ''}`}
                  placeholder={t('confirmNewPasswordPlaceholder')}
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a1.17 1.17 0 0 1 1.66-1.66M10.5 5.17A10.07 10.07 0 0 1 12 4c7 0 10 7 10 7a1.17 1.17 0 0 1-1.66 1.66L16 10.5M16 16l-3.5-3.5M2 2l20 20"/></svg>
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>{t('passwordsDoNotMatch')}</p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword && (
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>{t('passwordsMatch')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !validation.allValid || (confirmPassword && newPassword !== confirmPassword)}
              className={`w-full mt-6 font-medium py-2 rounded-md transition-colors disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] text-[#050C0F] hover:from-[#58B4AA] hover:to-[#79CAC2] disabled:bg-gray-600 disabled:text-gray-400'
                  : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white hover:from-[#4DB6B0] hover:to-[#5ACCC3] disabled:bg-gray-400 disabled:text-gray-500'
              }`}
            >
              {loading ? t('updatingPassword') + '...' : t('updatePassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default NurseChangePassword
