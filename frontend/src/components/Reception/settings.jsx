import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ReceptionistHeader } from './ReceptionHeader'
import { FiBell, FiMonitor, FiClock, FiMail, FiPhone, FiAlertTriangle, FiRefreshCw, FiSave, FiDownload, FiUpload, FiActivity } from 'react-icons/fi'

const ReceptionSettings = () => {
  const { t } = useTranslation()
  const [isLoaded, setIsLoaded] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  
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

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    systemAlerts: true,
    emergencyNotifications: true,
    marketingEmails: false,
    reminderTime: 24,
    escalationTime: 60
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleNotificationChange = (field, value) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handleSaveChanges = () => {
    console.log('Saving notification settings...')
    setUnsavedChanges(false)
    // API calls to save notification settings
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <ReceptionistHeader />

      <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <h2 className={`text-2xl font-bold ${
            darkMode
              ? 'text-[#F5FEFF]'
              : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent'
          }`}>{t('systemSettings')}</h2>
          
          {unsavedChanges && (
            <div className="flex items-center space-x-4">
              <span className={`text-sm ${
                darkMode ? 'text-[#FACC15]' : 'text-orange-600'
              }`}>{t('youHaveUnsavedChanges')}</span>
              <button 
                onClick={handleSaveChanges}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  darkMode
                    ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                    : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
                }`}
              >
                <FiSave className="text-sm" />
                <span>{t('saveAllChanges')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className={`rounded-xl shadow border overflow-hidden transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
        }`}>
          <div className="p-6">
            {/* Notifications Settings */}
            <div className="space-y-8">
              {/* General Notification Settings */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                }`}>
                  <FiBell className={darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'} />
                  <span>{t('notificationSettings')}</span>
                </h3>
                
                <div className="space-y-4">
                    {Object.entries({
                      emailNotifications: t('emailNotifications'),
                      smsNotifications: t('smsNotifications'),
                      appointmentReminders: t('appointmentReminders'),
                      systemAlerts: t('systemAlerts'),
                      emergencyNotifications: t('emergencyNotifications'),
                      marketingEmails: t('marketingEmails')
                    }).map(([key, label]) => (
                      <label key={key} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        darkMode ? 'border-[#133037]' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center space-x-3">
                          {key === 'emailNotifications' && <FiMail className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'} />}
                          {key === 'smsNotifications' && <FiPhone className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'} />}
                          {key === 'appointmentReminders' && <FiClock className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'} />}
                          {key === 'systemAlerts' && <FiMonitor className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'} />}
                          {key === 'emergencyNotifications' && <FiAlertTriangle className={darkMode ? 'text-[#FB7185]' : 'text-red-500'} />}
                          {key === 'marketingEmails' && <FiMail className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'} />}
                          <span className={`text-sm ${
                            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                          }`}>{label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationSettings[key]}
                          onChange={(e) => handleNotificationChange(key, e.target.checked)}
                          className={`w-4 h-4 rounded focus:ring-2 ${
                            darkMode
                              ? 'text-[#79CAC2] border-[#133037] focus:ring-[#79CAC2]'
                              : 'text-[#4DB6B0] border-gray-300 focus:ring-[#4DB6B0]'
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Timing Settings */}
                <div className={`border-t pt-8 transition-colors ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                  }`}>{t('timingSettings')}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{t('appointmentReminderTime')}</label>
                      <input
                        type="number"
                        value={notificationSettings.reminderTime}
                        onChange={(e) => handleNotificationChange('reminderTime', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2] focus:border-transparent'
                            : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-transparent'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                      }`}>{t('escalationTime')}</label>
                      <input
                        type="number"
                        value={notificationSettings.escalationTime}
                        onChange={(e) => handleNotificationChange('escalationTime', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2] focus:border-transparent'
                            : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-transparent'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Template Settings */}
                <div className={`border-t pt-8 transition-colors ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                  }`}>{t('messageTemplates')}</h3>
                  
                  <div className="space-y-4">
                    <div className={`p-4 border rounded-lg transition-colors ${
                      darkMode ? 'border-[#133037] bg-[#07181D]' : 'border-gray-200'
                    }`}>
                      <h4 className={`font-medium mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('appointmentReminder')}</h4>
                      <textarea
                        rows="3"
                        placeholder="Dear [PATIENT_NAME], this is a reminder for your appointment on [DATE] at [TIME] with [DOCTOR]."
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-transparent'
                            : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-transparent'
                        }`}
                      />
                    </div>
                    <div className={`p-4 border rounded-lg transition-colors ${
                      darkMode ? 'border-[#133037] bg-[#07181D]' : 'border-gray-200'
                    }`}>
                      <h4 className={`font-medium mb-2 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                      }`}>{t('appointmentConfirmation')}</h4>
                      <textarea
                        rows="3"
                        placeholder="Your appointment has been confirmed for [DATE] at [TIME]. Please arrive 15 minutes early."
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors ${
                          darkMode
                            ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-transparent'
                            : 'border-gray-300 focus:ring-[#4DB6B0] focus:border-transparent'
                        }`}
                      />
                    </div>
                  </div>
                </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`border-t px-6 py-4 transition-colors ${
            darkMode ? 'border-[#133037] bg-[#07181D]' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>
                {t('lastUpdated')}: {new Date().toLocaleDateString()} {t('at')} {new Date().toLocaleTimeString()}
              </div>
              <div className="flex space-x-3">
                <button className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}>
                  {t('resetToDefault')}
                </button>
                <button className={`px-4 py-2 border rounded-lg transition-colors flex items-center space-x-2 ${
                  darkMode
                    ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}>
                  <FiRefreshCw className="text-sm" />
                  <span>{t('refreshSettings')}</span>
                </button>
                <button 
                  onClick={handleSaveChanges}
                  disabled={!unsavedChanges}
                  className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    unsavedChanges
                      ? darkMode
                        ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                        : 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white'
                      : darkMode
                        ? 'bg-[#133037] text-[#8AA2A7] cursor-not-allowed'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FiSave className="text-sm" />
                  <span>{t('saveAllSettings')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className={`mt-8 rounded-xl shadow border p-6 transition-colors ${
          darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-100'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
          }`}>{t('quickActions')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className={`p-4 rounded-lg border transition-colors group ${
              darkMode
                ? 'border-[#133037] text-[#C1D9DD] hover:border-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                : 'border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'
            }`}>
              <FiDownload className={`text-2xl mb-2 mx-auto ${
                darkMode
                  ? 'text-[#79CAC2] group-hover:text-[#050C0F]'
                  : 'text-[#4DB6B0] group-hover:text-white'
              }`} />
              <span className="text-sm font-medium block">{t('exportSettings')}</span>
            </button>
            <button className={`p-4 rounded-lg border transition-colors group ${
              darkMode
                ? 'border-[#133037] text-[#C1D9DD] hover:border-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                : 'border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'
            }`}>
              <FiUpload className={`text-2xl mb-2 mx-auto ${
                darkMode
                  ? 'text-[#79CAC2] group-hover:text-[#050C0F]'
                  : 'text-[#4DB6B0] group-hover:text-white'
              }`} />
              <span className="text-sm font-medium block">{t('importSettings')}</span>
            </button>
            <button className={`p-4 rounded-lg border transition-colors group ${
              darkMode
                ? 'border-[#133037] text-[#C1D9DD] hover:border-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                : 'border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'
            }`}>
              <FiRefreshCw className={`text-2xl mb-2 mx-auto ${
                darkMode
                  ? 'text-[#79CAC2] group-hover:text-[#050C0F]'
                  : 'text-[#4DB6B0] group-hover:text-white'
              }`} />
              <span className="text-sm font-medium block">{t('resetSystem')}</span>
            </button>
            <button className={`p-4 rounded-lg border transition-colors group ${
              darkMode
                ? 'border-[#133037] text-[#C1D9DD] hover:border-[#79CAC2] hover:bg-[#79CAC2] hover:text-[#050C0F]'
                : 'border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white'
            }`}>
              <FiActivity className={`text-2xl mb-2 mx-auto ${
                darkMode
                  ? 'text-[#79CAC2] group-hover:text-[#050C0F]'
                  : 'text-[#4DB6B0] group-hover:text-white'
              }`} />
              <span className="text-sm font-medium block">{t('systemLogs')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceptionSettings