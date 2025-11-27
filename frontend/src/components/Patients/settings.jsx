import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'
import { 
  Bell, Lock, Globe, Eye, EyeOff, Smartphone, Mail, 
  MessageSquare, Calendar, Shield, Moon, Sun, Volume2,
  ChevronRight, Save, AlertCircle, Check, X, Key,
  UserCheck, Clock, Download, Trash2, LogOut
} from 'lucide-react'
import { patientSettingsAPI, patientSecurityAPI } from '../../services/apiService'
import { handlePatientAuthError } from '../../utils/patientAuth'

const PatientSettings = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('notifications')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [error, setError] = useState('')

  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: {
      appointments: true,
      reminders: true,
      labResults: true,
      prescriptions: true,
      newsletters: false
    },
    sms: {
      appointments: true,
      reminders: true,
      emergencyOnly: false
    },
    push: {
      enabled: true,
      appointments: true,
      messages: true,
      updates: false
    },
    reminderTiming: '24hours'
  })
  
  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'doctors-only',
    shareHealthData: true,
    allowResearch: false,
    dataRetention: '5years',
    activityTracking: true
  })
  
  // Security settings (unified state)
  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: '30',
    deviceManagement: true,
    passwordStrength: 'strong',
    last_password_change: null,
    failed_login_attempts: 0,
    account_locked: false
  })
  
  // Preferences
  const [preferences, setPreferences] = useState({
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12hour',
    theme: 'light',
    fontSize: 'medium',
    soundEnabled: true,
    autoPlayVideos: false
  })
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false
  })
  
  // Sessions data
  const [sessions, setSessions] = useState([])
  const [securityActivity, setSecurityActivity] = useState([])
  
  // 2FA setup state
  const [twoFactorSetup, setTwoFactorSetup] = useState({
    qrCode: null,
    secret: null,
    verificationRequired: false
  })
  const [twoFactorToken, setTwoFactorToken] = useState('')

  // Load security data
  const loadSecurityData = async () => {
    try {
      console.log('[SECURITY] Loading security data...')
      const [securitySettings, sessionsData, activityData] = await Promise.all([
        patientSecurityAPI.getSecuritySettings(),
        patientSecurityAPI.listSessions(),
        patientSecurityAPI.getSecurityActivity()
      ])
      
      console.log('[SECURITY] Security settings:', securitySettings)
      console.log('[SECURITY] Sessions:', sessionsData)
      console.log('[SECURITY] Activity:', activityData)
      
      if (securitySettings) {
        // Map backend response to unified security state
        setSecurity({
          twoFactor: securitySettings.two_factor_enabled ?? false,
          loginAlerts: securitySettings.login_alerts ?? true,
          sessionTimeout: String(securitySettings.session_timeout ?? 30),
          deviceManagement: securitySettings.device_management ?? true,
          passwordStrength: securitySettings.password_strength ?? 'strong',
          last_password_change: securitySettings.last_password_change ?? null,
          failed_login_attempts: securitySettings.failed_login_attempts ?? 0,
          account_locked: securitySettings.account_locked ?? false
        })
      }
      
      if (sessionsData?.sessions) {
        setSessions(sessionsData.sessions)
      } else if (Array.isArray(sessionsData)) {
        setSessions(sessionsData)
      }
      
      if (activityData?.activities) {
        setSecurityActivity(activityData.activities)
      } else if (activityData?.data?.activities) {
        setSecurityActivity(activityData.data.activities)
      }
    } catch (error) {
      console.error('[SECURITY] Failed to load security data:', error)
      
      // Handle authentication errors and redirect if needed
      if (handlePatientAuthError(error)) {
        return; // Redirected, exit early
      }
    }
  }

  // Handle password change
  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setError(t('settings.passwordsDoNotMatch'))
      return
    }
    
    if (passwordForm.new.length < 8) {
      setError(t('settings.passwordMinLength'))
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const result = await patientSecurityAPI.changePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.new,
        confirm_password: passwordForm.confirm
      })
      
      console.log('[SECURITY] Password change result:', result)
      setSaveStatus('success')
      
      // Clear form
      setPasswordForm({
        current: '',
        new: '',
        confirm: '',
        showCurrent: false,
        showNew: false,
        showConfirm: false
      })
      
      // Reload security data
      await loadSecurityData()
      
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setError(error?.message || t('settings.errorPasswordChangeFailed'))
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Handle 2FA setup
  const handleTwoFactorSetup = async (enable) => {
    try {
      setLoading(true)
      setError('')
      
      const result = await patientSecurityAPI.setupTwoFactor(enable)
      console.log('[SECURITY] 2FA setup result:', result)
      
      if (enable && result.qr_code) {
        setTwoFactorSetup({
          qrCode: result.qr_code,
          secret: result.secret,
          verificationRequired: true
        })
      } else {
        setTwoFactorSetup({
          qrCode: null,
          secret: null,
          verificationRequired: false
        })
        // Update security state
        setSecurity({ ...security, twoFactor: enable })
        setSaveStatus('success')
        await loadSecurityData()
        setTimeout(() => setSaveStatus(''), 3000)
      }
    } catch (error) {
      setError(error?.message || t('settings.error2FAFailed'))
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Handle 2FA verification
  const handleTwoFactorVerify = async () => {
    if (twoFactorToken.length !== 6) {
      setError(t('settings.enter6DigitCode'))
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const result = await patientSecurityAPI.verifyTwoFactor(twoFactorToken)
      console.log('[SECURITY] 2FA verification result:', result)
      
      setTwoFactorSetup({
        qrCode: null,
        secret: null,
        verificationRequired: false
      })
      setTwoFactorToken('')
      setSaveStatus('success')
      
      await loadSecurityData()
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setError(error?.message || t('settings.invalidVerificationCode'))
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Handle session termination
  const handleEndSession = async (sessionId) => {
    try {
      setLoading(true)
      setError('')
      
      const result = await patientSecurityAPI.endSession(sessionId)
      console.log('[SECURITY] End session result:', result)
      
      setSaveStatus('success')
      await loadSecurityData()
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setError(error?.message || t('settings.errorEndSessionFailed'))
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Handle logout all sessions
  const handleLogoutAllSessions = async () => {
    if (!confirm(t('settings.confirmLogoutAllSessions'))) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const result = await patientSecurityAPI.logoutAllSessions()
      console.log('[SECURITY] Logout all sessions result:', result)
      
      setSaveStatus('success')
      await loadSecurityData()
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setError(error?.message || t('settings.errorLogoutAllFailed'))
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        console.log('[SETTINGS] Loading initial settings...')
        const data = await patientSettingsAPI.getSettings()
        console.log('[SETTINGS] Raw initial data:', data)
        const blob = data?.data || data
        console.log('[SETTINGS] Processed initial blob:', blob)
        if (blob?.notifications) setNotifications({
          email: {
            appointments: blob.notifications.email?.appointments ?? true,
            reminders: blob.notifications.email?.reminders ?? true,
            labResults: blob.notifications.email?.labResults ?? true,
            prescriptions: blob.notifications.email?.prescriptions ?? true,
            newsletters: blob.notifications.email?.newsletters ?? false
          },
          sms: {
            appointments: blob.notifications.sms?.appointments ?? true,
            reminders: blob.notifications.sms?.reminders ?? true,
            emergencyOnly: blob.notifications.sms?.emergencyOnly ?? false
          },
          push: {
            enabled: blob.notifications.push?.enabled ?? true,
            appointments: blob.notifications.push?.appointments ?? true,
            messages: blob.notifications.push?.messages ?? true,
            updates: blob.notifications.push?.updates ?? false
          },
          reminderTiming: blob.notifications.reminderTiming || '24hours'
        })

        if (blob?.privacy) setPrivacy({
          profileVisibility: blob.privacy.profileVisibility || 'doctors-only',
          shareHealthData: blob.privacy.shareHealthData ?? true,
          allowResearch: blob.privacy.allowResearch ?? false,
          dataRetention: blob.privacy.dataRetention || '5years',
          activityTracking: blob.privacy.activityTracking ?? true
        })

        if (blob?.security) setSecurity({
          twoFactor: blob.security.twoFactor ?? false,
          loginAlerts: blob.security.loginAlerts ?? true,
          sessionTimeout: blob.security.sessionTimeout || '30',
          deviceManagement: blob.security.deviceManagement ?? true,
          passwordStrength: security.passwordStrength || 'strong',
          last_password_change: security.last_password_change,
          failed_login_attempts: security.failed_login_attempts,
          account_locked: security.account_locked
        })

        if (blob?.preferences) setPreferences({
          language: blob.preferences.language || 'en',
          dateFormat: blob.preferences.dateFormat || 'MM/DD/YYYY',
          timeFormat: blob.preferences.timeFormat || '12hour',
          theme: blob.preferences.theme || 'light',
          fontSize: blob.preferences.fontSize || 'medium',
          soundEnabled: blob.preferences.soundEnabled ?? true,
          autoPlayVideos: blob.preferences.autoPlayVideos ?? false
        })
        
        // Load security data
        await loadSecurityData()
      } catch (e) {
        setError(e?.message || t('settings.errorLoadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const tabs = [
    { id: 'notifications', label: t('settings.notifications'), icon: <Bell className="h-4 w-4" /> },
    { id: 'privacy', label: t('settings.privacy'), icon: <Shield className="h-4 w-4" /> },
    { id: 'security', label: t('settings.security'), icon: <Lock className="h-4 w-4" /> },
    { id: 'preferences', label: t('settings.preferences'), icon: <Globe className="h-4 w-4" /> }
  ]

  const handleSave = async () => {
    setLoading(true)
    setSaveStatus('')
    setError('')
    
    try {
      const settingsBlob = {
        notifications: {
          email: {
            appointments: notifications.email.appointments,
            reminders: notifications.email.reminders,
            labResults: notifications.email.labResults,
            prescriptions: notifications.email.prescriptions,
            newsletters: notifications.email.newsletters
          },
          sms: {
            appointments: notifications.sms.appointments,
            reminders: notifications.sms.reminders,
            emergencyOnly: notifications.sms.emergencyOnly
          },
          push: {
            enabled: notifications.push.enabled,
            appointments: notifications.push.appointments,
            messages: notifications.push.messages,
            updates: notifications.push.updates
          },
          reminderTiming: notifications.reminderTiming,
        },
        privacy: {
          profileVisibility: privacy.profileVisibility,
          shareHealthData: privacy.shareHealthData,
          allowResearch: privacy.allowResearch,
          dataRetention: privacy.dataRetention,
          activityTracking: privacy.activityTracking,
        },
        security: {
          twoFactor: security.twoFactor,
          loginAlerts: security.loginAlerts,
          sessionTimeout: security.sessionTimeout,
          deviceManagement: security.deviceManagement,
        },
        preferences: {
          language: preferences.language,
          dateFormat: preferences.dateFormat,
          timeFormat: preferences.timeFormat,
          theme: preferences.theme,
          fontSize: preferences.fontSize,
          soundEnabled: preferences.soundEnabled,
          autoPlayVideos: preferences.autoPlayVideos,
        }
      }
      console.log('[SETTINGS] Saving settings blob:', JSON.stringify(settingsBlob, null, 2))
      const saveResult = await patientSettingsAPI.saveSettings(settingsBlob)
      console.log('[SETTINGS] Save result:', saveResult)
      setSaveStatus('success')
      
      // Small delay to ensure database commit is complete before refetching
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refetch settings from server to update UI state
      console.log('[SETTINGS] Refetching settings after save...')
      const data = await patientSettingsAPI.getSettings()
      console.log('[SETTINGS] Raw refetch data:', JSON.stringify(data, null, 2))
      const blob = data?.data || data
      console.log('[SETTINGS] Processed blob:', JSON.stringify(blob, null, 2))
      
      // Compare saved vs refetched to verify they match
      console.log('[SETTINGS] Comparing saved vs refetched:')
      console.log('[SETTINGS] Saved notifications.email.appointments:', settingsBlob.notifications?.email?.appointments)
      console.log('[SETTINGS] Refetched notifications.email.appointments:', blob?.notifications?.email?.appointments)
      
      if (blob?.notifications) {
        const newNotifications = {
          email: {
            appointments: blob.notifications.email?.appointments ?? true,
            reminders: blob.notifications.email?.reminders ?? true,
            labResults: blob.notifications.email?.labResults ?? true,
            prescriptions: blob.notifications.email?.prescriptions ?? true,
            newsletters: blob.notifications.email?.newsletters ?? false
          },
          sms: {
            appointments: blob.notifications.sms?.appointments ?? true,
            reminders: blob.notifications.sms?.reminders ?? true,
            emergencyOnly: blob.notifications.sms?.emergencyOnly ?? false
          },
          push: {
            enabled: blob.notifications.push?.enabled ?? true,
            appointments: blob.notifications.push?.appointments ?? true,
            messages: blob.notifications.push?.messages ?? true,
            updates: blob.notifications.push?.updates ?? false
          },
          reminderTiming: blob.notifications.reminderTiming || '24hours'
        }
        console.log('[SETTINGS] Updating notifications state:', JSON.stringify(newNotifications, null, 2))
        setNotifications(newNotifications)
      }

      if (blob?.privacy) {
        const newPrivacy = {
          profileVisibility: blob.privacy.profileVisibility || 'doctors-only',
          shareHealthData: blob.privacy.shareHealthData ?? true,
          allowResearch: blob.privacy.allowResearch ?? false,
          dataRetention: blob.privacy.dataRetention || '5years',
          activityTracking: blob.privacy.activityTracking ?? true
        }
        console.log('[SETTINGS] Updating privacy state:', JSON.stringify(newPrivacy, null, 2))
        setPrivacy(newPrivacy)
      }

      if (blob?.security) {
        const newSecurity = {
          twoFactor: blob.security.twoFactor ?? false,
          loginAlerts: blob.security.loginAlerts ?? true,
          sessionTimeout: blob.security.sessionTimeout || '30',
          deviceManagement: blob.security.deviceManagement ?? true,
          passwordStrength: security.passwordStrength || 'strong',
          last_password_change: security.last_password_change,
          failed_login_attempts: security.failed_login_attempts,
          account_locked: security.account_locked
        }
        console.log('[SETTINGS] Updating security state:', JSON.stringify(newSecurity, null, 2))
        setSecurity(newSecurity)
      }

      if (blob?.preferences) {
        const newPreferences = {
          language: blob.preferences.language || 'en',
          dateFormat: blob.preferences.dateFormat || 'MM/DD/YYYY',
          timeFormat: blob.preferences.timeFormat || '12hour',
          theme: blob.preferences.theme || 'light',
          fontSize: blob.preferences.fontSize || 'medium',
          soundEnabled: blob.preferences.soundEnabled ?? true,
          autoPlayVideos: blob.preferences.autoPlayVideos ?? false
        }
        console.log('[SETTINGS] Updating preferences state:', JSON.stringify(newPreferences, null, 2))
        setPreferences(newPreferences)
      }
      
      console.log('[SETTINGS] Settings refetched and UI updated')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setSaveStatus('error')
      setError(error?.message || t('settings.errorSaveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Mail className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.emailNotifications')}
        </h3>
        
        <div className="space-y-4">
          {Object.entries(notifications.email).map(([key, value]) => (
            <div key={key} className={`flex items-center justify-between py-3 border-b last:border-0 ${
              darkMode ? 'border-gray-700' : 'border-gray-100'
            }`}>
              <div>
                <p className={`font-medium capitalize ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t(`settings.email${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {key === 'appointments' && t('settings.emailAppointmentsDesc')}
                  {key === 'reminders' && t('settings.emailRemindersDesc')}
                  {key === 'labResults' && t('settings.emailLabResultsDesc')}
                  {key === 'prescriptions' && t('settings.emailPrescriptionsDesc')}
                  {key === 'newsletters' && t('settings.emailNewslettersDesc')}
                </p>
              </div>
              <button
                onClick={() => setNotifications({
                  ...notifications,
                  email: { ...notifications.email, [key]: !value }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value 
                    ? darkMode ? 'bg-emerald-600' : 'bg-emerald-400'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SMS Notifications */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Smartphone className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.smsNotifications')}
        </h3>
        
        <div className="space-y-4">
          {Object.entries(notifications.sms).map(([key, value]) => (
            <div key={key} className={`flex items-center justify-between py-3 border-b last:border-0 ${
              darkMode ? 'border-gray-700' : 'border-gray-100'
            }`}>
              <div>
                <p className={`font-medium capitalize ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t(`settings.sms${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {key === 'appointments' && t('settings.smsAppointmentsDesc')}
                  {key === 'reminders' && t('settings.smsRemindersDesc')}
                  {key === 'emergencyOnly' && t('settings.smsEmergencyOnlyDesc')}
                </p>
              </div>
              <button
                onClick={() => setNotifications({
                  ...notifications,
                  sms: { ...notifications.sms, [key]: !value }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value 
                    ? darkMode ? 'bg-emerald-600' : 'bg-emerald-400'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reminder Timing */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Clock className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.reminderTiming')}
        </h3>
        
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {t('settings.sendAppointmentReminders')}
          </label>
          <select
            value={notifications.reminderTiming}
            onChange={(e) => setNotifications({ ...notifications, reminderTiming: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
              darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
            }`}
          >
            <option value="15min">{t('settings.reminder15min')}</option>
            <option value="30min">{t('settings.reminder30min')}</option>
            <option value="1hour">{t('settings.reminder1hour')}</option>
            <option value="2hours">{t('settings.reminder2hours')}</option>
            <option value="24hours">{t('settings.reminder24hours')}</option>
            <option value="48hours">{t('settings.reminder48hours')}</option>
          </select>
        </div>
      </div>
    </div>
  )

  // Download data handler
  const handleDownloadData = async () => {
    if (!confirm(t('settings.confirmDownloadData'))) {
      return
    }
    
    setLoading(true)
    setError('')
    try {
      const result = await patientSettingsAPI.exportData({
        export_type: 'patient',
        format: 'json',
        since: null,
        email_confirmation: true,
        sms_confirmation: false
      })
      console.log('[PRIVACY] Export result:', result)
      
      // If the result contains a download URL or file, trigger download
      if (result?.download_url) {
        window.open(result.download_url, '_blank')
        setSaveStatus('success')
        setTimeout(() => setSaveStatus(''), 3000)
      } else if (result?.export_job_id) {
        // Export job initiated, show message
        setSaveStatus('success')
        setError('')
        alert(`Data export initiated. Job ID: ${result.export_job_id}. You will receive a notification when your data is ready for download.`)
        setTimeout(() => setSaveStatus(''), 5000)
      } else if (result?.data) {
        // Create a blob and download
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `patient_data_export_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setSaveStatus('success')
        setTimeout(() => setSaveStatus(''), 3000)
      } else {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus(''), 3000)
      }
    } catch (error) {
        setError(error?.message || t('settings.errorExportFailed'))
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Delete account handler
  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      t('settings.deleteAccountWarning') + '\n\n' + t('settings.typeDeleteToConfirm')
    )
    
    if (confirmation !== 'DELETE') {
      return
    }
    
    setLoading(true)
    setError('')
    try {
      const result = await patientSettingsAPI.deleteAccount({
        reason: 'User requested account deletion',
        confirmation_code: confirmation,
        resource_types: ['Patient', 'Observation', 'MedicationRequest', 'Immunization', 'AllergyIntolerance']
      })
      console.log('[PRIVACY] Delete account result:', result)
      
      setSaveStatus('success')
      alert('Your account deletion has been initiated. You will be logged out shortly.')
      
      // Logout and redirect to home
      localStorage.removeItem('token')
      window.location.href = '/'
    } catch (error) {
      setError(error?.message || t('settings.errorDeleteAccountFailed'))
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Eye className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.profileVisibility')}
        </h3>
        
        <div className="space-y-3">
          {[
            { value: 'private', label: t('settings.private'), desc: t('settings.privateDesc') },
            { value: 'doctors-only', label: t('settings.healthcareProvidersOnly'), desc: t('settings.healthcareProvidersOnlyDesc') },
            { value: 'public', label: t('settings.public'), desc: t('settings.publicDesc') }
          ].map(option => (
            <label key={option.value} className={`flex items-start cursor-pointer p-3 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={privacy.profileVisibility === option.value}
                onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                className="mt-1 text-emerald-400 focus:ring-emerald-400"
              />
              <div className="ml-3">
                <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{option.label}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Data Sharing */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Shield className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.dataSharingPrivacy')}
        </h3>
        
        <div className="space-y-4">
          <div className={`flex items-center justify-between py-3 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.shareHealthData')}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('settings.shareHealthDataDesc')}</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, shareHealthData: !privacy.shareHealthData })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.shareHealthData 
                  ? darkMode ? 'bg-emerald-600' : 'bg-emerald-400'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                privacy.shareHealthData ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className={`flex items-center justify-between py-3 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.contributeToResearch')}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('settings.contributeToResearchDesc')}</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, allowResearch: !privacy.allowResearch })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.allowResearch 
                  ? darkMode ? 'bg-emerald-600' : 'bg-emerald-400'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                privacy.allowResearch ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.activityTracking')}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('settings.activityTrackingDesc')}</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, activityTracking: !privacy.activityTracking })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.activityTracking 
                  ? darkMode ? 'bg-emerald-600' : 'bg-emerald-400'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                privacy.activityTracking ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Clock className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.dataRetention')}
        </h3>
        
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {t('settings.dataRetentionQuestion')}
          </label>
          <select
            value={privacy.dataRetention}
            onChange={(e) => setPrivacy({ ...privacy, dataRetention: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
              darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
            }`}
          >
            <option value="1year">{t('settings.retention1year')}</option>
            <option value="3years">{t('settings.retention3years')}</option>
            <option value="5years">{t('settings.retention5years')}</option>
            <option value="10years">{t('settings.retention10years')}</option>
            <option value="indefinite">{t('settings.retentionIndefinite')}</option>
          </select>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('settings.dataRetentionNote')}
          </p>
        </div>
      </div>

      {/* Data Management */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Download className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.dataManagement')}
        </h3>
        
        <div className="space-y-4">
          <div className="flex space-x-3">
            <button 
              onClick={handleDownloadData}
              disabled={loading}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? t('settings.exporting') : t('settings.downloadMyData')}
            </button>
            <button 
              onClick={handleDeleteAccount}
              disabled={loading}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode 
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.deleteMyAccount')}
            </button>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('settings.dataManagementNote')}
          </p>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      {/* Change Password */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Key className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.changePassword')}
        </h3>
        
        <div className="space-y-4 max-w-md">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.currentPassword')}</label>
            <div className="relative">
              <input
                type={passwordForm.showCurrent ? 'text' : 'password'}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-400 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setPasswordForm({ ...passwordForm, showCurrent: !passwordForm.showCurrent })}
                className={`absolute right-2 top-2.5 transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {passwordForm.showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.newPassword')}</label>
            <div className="relative">
              <input
                type={passwordForm.showNew ? 'text' : 'password'}
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-400 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setPasswordForm({ ...passwordForm, showNew: !passwordForm.showNew })}
                className={`absolute right-2 top-2.5 transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {passwordForm.showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.confirmNewPassword')}</label>
            <div className="relative">
              <input
                type={passwordForm.showConfirm ? 'text' : 'password'}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-400 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setPasswordForm({ ...passwordForm, showConfirm: !passwordForm.showConfirm })}
                className={`absolute right-2 top-2.5 transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {passwordForm.showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <button 
            onClick={handlePasswordChange}
            disabled={loading || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
            className={`px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-emerald-400 hover:bg-emerald-500'
            } text-white`}
          >
            {loading ? t('settings.updating') : t('settings.updatePassword')}
          </button>
        </div>
      </div>

      {/* Security Options */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('settings.securityOptions')}</h3>
        
        <div className="space-y-4">
          <div className={`flex items-center justify-between py-3 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.twoFactorAuth')}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('settings.twoFactorAuthDesc')}</p>
            </div>
            <button
              onClick={() => handleTwoFactorSetup(!security.twoFactor)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                security.twoFactor 
                  ? darkMode ? 'bg-emerald-600' : 'bg-emerald-400'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                security.twoFactor ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className={`flex items-center justify-between py-3 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.loginAlerts')}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('settings.loginAlertsDesc')}</p>
            </div>
            <button
              onClick={async () => {
                const newValue = !security.loginAlerts
                setLoading(true)
                try {
                  await patientSecurityAPI.updateSecuritySettings({ login_alerts: newValue })
                  setSecurity({ ...security, loginAlerts: newValue })
                  setSaveStatus('success')
                  setTimeout(() => setSaveStatus(''), 2000)
                } catch (error) {
                  setError(error?.message || t('settings.errorUpdateLoginAlerts'))
                  setSaveStatus('error')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                security.loginAlerts 
                  ? darkMode ? 'bg-emerald-600' : 'bg-emerald-400'
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                security.loginAlerts ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="py-3">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.autoLogout')}</label>
            <select
              value={security.sessionTimeout}
              onChange={async (e) => {
                const newValue = e.target.value
                setLoading(true)
                try {
                  await patientSecurityAPI.updateSecuritySettings({ session_timeout: parseInt(newValue) })
                  setSecurity({ ...security, sessionTimeout: newValue })
                  setSaveStatus('success')
                  setTimeout(() => setSaveStatus(''), 2000)
                } catch (error) {
                  setError(error?.message || t('settings.errorUpdateSessionTimeout'))
                  setSaveStatus('error')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
              }`}
            >
              <option value="15">{t('settings.timeout15min')}</option>
              <option value="30">{t('settings.timeout30min')}</option>
              <option value="60">{t('settings.timeout1hour')}</option>
              <option value="120">{t('settings.timeout2hours')}</option>
              <option value="0">{t('settings.timeoutNever')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {twoFactorSetup.verificationRequired && (
        <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900/80' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50`}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('settings.complete2FASetup')}</h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('settings.scanQRCode')}
                </p>
                {twoFactorSetup.qrCode && (
                  <img 
                    src={twoFactorSetup.qrCode} 
                    alt="2FA QR Code" 
                    className={`mx-auto border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                  />
                )}
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('settings.enterCodeManually')}: <code className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>{twoFactorSetup.secret}</code>
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t('settings.enter6DigitCode')}
                </label>
                <input
                  type="text"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 text-center text-lg tracking-widest ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'border-gray-300'
                  }`}
                  maxLength={6}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleTwoFactorVerify}
                  disabled={loading || twoFactorToken.length !== 6}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-emerald-400 hover:bg-emerald-500'
                  } text-white`}
                >
                  {loading ? t('settings.verifying') : t('settings.verifyEnable')}
                </button>
                <button
                  onClick={() => setTwoFactorSetup({ qrCode: null, secret: null, verificationRequired: false })}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('settings.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Smartphone className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.activeSessions')}
        </h3>
        
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.session_id} className={`flex items-center justify-between p-3 border rounded-lg ${
              darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'
                }`}>
                  <Smartphone className={`h-5 w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{session.device_info}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {session.ip_address} • {session.location}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                    {t('settings.lastActivity')}: {new Date(session.last_activity).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {session.is_current && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    darkMode 
                      ? 'bg-emerald-900/50 text-emerald-300' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {t('settings.current')}
                  </span>
                )}
                {!session.is_current && (
                  <button
                    onClick={() => handleEndSession(session.session_id)}
                    disabled={loading}
                    className={`px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                      darkMode 
                        ? 'text-red-400 hover:bg-red-900/30' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    {t('settings.endSession')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {sessions.length > 1 && (
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={handleLogoutAllSessions}
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                darkMode 
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {loading ? t('settings.loggingOut') : t('settings.logoutAllOtherSessions')}
            </button>
          </div>
        )}
      </div>

      {/* Security Activity */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Shield className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.recentSecurityActivity')}
        </h3>
        
        <div className="space-y-3">
          {securityActivity.map((activity, index) => (
            <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${
              darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.status === 'success' 
                    ? darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'
                    : darkMode ? 'bg-red-900/30' : 'bg-red-100'
                }`}>
                  {activity.status === 'success' ? (
                    <Check className={`h-4 w-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  ) : (
                    <X className={`h-4 w-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  )}
                </div>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{activity.activity}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {activity.ip_address} • {activity.location}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  activity.status === 'success' 
                    ? darkMode
                      ? 'bg-emerald-900/50 text-emerald-300'
                      : 'bg-emerald-100 text-emerald-700'
                    : darkMode
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPreferences = () => (
    <div className="space-y-6">
      {/* Language & Region */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <Globe className="h-5 w-5 mr-2 text-emerald-500" />
          {t('settings.languageRegion')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.language')}</label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
              }`}
            >
              <option value="en">{t('settings.english')}</option>
              <option value="uz">{t('settings.uzbek')}</option>
              <option value="ru">{t('settings.russian')}</option>
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.dateFormat')}</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
              }`}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.timeFormat')}</label>
            <select
              value={preferences.timeFormat}
              onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
              }`}
            >
              <option value="12hour">{t('settings.time12hour')}</option>
              <option value="24hour">{t('settings.time24hour')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('settings.appearance')}</h3>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.theme')}</label>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setPreferences({ ...preferences, theme: 'light' })
                  setDarkMode(false)
                }}
                className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                  preferences.theme === 'light' 
                    ? darkMode
                      ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                      : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : darkMode
                      ? 'border-gray-600 text-gray-300'
                      : 'border-gray-200 text-gray-600'
                }`}
              >
                <Sun className="h-4 w-4 mr-2" />
                {t('settings.light')}
              </button>
              <button
                onClick={() => {
                  setPreferences({ ...preferences, theme: 'dark' })
                  setDarkMode(true)
                }}
                className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                  preferences.theme === 'dark' 
                    ? darkMode
                      ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                      : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : darkMode
                      ? 'border-gray-600 text-gray-300'
                      : 'border-gray-200 text-gray-600'
                }`}
              >
                <Moon className="h-4 w-4 mr-2" />
                {t('settings.dark')}
              </button>
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('settings.fontSize')}</label>
            <select
              value={preferences.fontSize}
              onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'
              }`}
            >
              <option value="small">{t('settings.fontSmall')}</option>
              <option value="medium">{t('settings.fontMedium')}</option>
              <option value="large">{t('settings.fontLarge')}</option>
              <option value="extra-large">{t('settings.fontExtraLarge')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('settings.settings')}</h1>

        {/* Save Status */}
        {saveStatus === 'success' && (
          <div className={`mb-4 p-3 border rounded-lg flex items-center ${
            darkMode 
              ? 'bg-green-900/30 border-green-700 text-green-300' 
              : 'bg-green-100 border-green-400 text-green-700'
          }`}>
            <Check className="h-5 w-5 mr-2" />
            {t('settings.settingsSavedSuccess')}
          </div>
        )}
        {saveStatus === 'error' && (
          <div className={`mb-4 p-3 border rounded-lg flex items-center ${
            darkMode 
              ? 'bg-red-900/30 border-red-700 text-red-300' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <AlertCircle className="h-5 w-5 mr-2" />
            {t('settings.errorSavingSettings')}
          </div>
        )}
        {error && (
          <div className={`mb-4 p-3 border rounded-lg ${
            darkMode 
              ? 'bg-red-900/30 border-red-700 text-red-300' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`flex space-x-1 mb-8 rounded-lg p-1 shadow-sm overflow-x-auto ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? darkMode
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-400 text-white shadow-md'
                  : darkMode
                    ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'privacy' && renderPrivacySettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'preferences' && renderPreferences()}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className={`font-medium transition-colors ${
              darkMode 
                ? 'text-gray-300 hover:text-gray-100' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t('settings.cancel')}
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-emerald-400 hover:bg-emerald-500'
            } text-white`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('settings.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('settings.saveChanges')}
              </>
            )}
          </button>
        </div>

        {/* Danger Zone */}
        <div className={`mt-12 rounded-xl p-6 border ${
          darkMode 
            ? 'bg-red-900/20 border-red-800' 
            : 'bg-red-50 border-red-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            darkMode ? 'text-red-300' : 'text-red-800'
          }`}>{t('settings.dangerZone')}</h3>
          <div className="space-y-3">
            <button 
              onClick={() => {
                localStorage.removeItem('token')
                window.location.href = '/signin'
              }}
              className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-800 text-red-400 border-red-800 hover:bg-gray-700' 
                  : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
              }`}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('settings.signOut')}
            </button>
            <button 
              onClick={handleDeleteAccount}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.deleteAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientSettings