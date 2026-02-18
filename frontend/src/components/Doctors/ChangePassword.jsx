import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { useTranslation } from 'react-i18next'
import { doctorSettingsAPI } from '../../services/apiService'

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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('newPasswordsDoNotMatch') })
      return
    }

    try {
      await doctorSettingsAPI.changePassword({
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
          t('somethingWentWrongWhileUpdatingPassword')
      })
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode
        ? 'bg-[#050C0F]'
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <Header />
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
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:ring-2 focus:outline-none transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0] focus:border-[#4DB6B0]'
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
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:ring-2 focus:outline-none transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0] focus:border-[#4DB6B0]'
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
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:ring-2 focus:outline-none transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#4DB6B0] focus:border-[#4DB6B0]'
                  }`}
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
            </div>

            <button
              type="submit"
              className={`w-full mt-4 font-medium py-2 rounded-md hover:scale-105 transition ${
                darkMode
                  ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] text-[#050C0F] hover:from-[#58B4AA] hover:to-[#79CAC2]'
                  : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white hover:from-[#4DB6B0] hover:to-[#5ACCC3]'
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
