import React, { useEffect, useState } from 'react'
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
  const [activeTab, setActiveTab] = useState('notifications')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [error, setError] = useState('')
  
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
      setError('Passwords do not match')
      return
    }
    
    if (passwordForm.new.length < 8) {
      setError('Password must be at least 8 characters long')
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
      setError(error?.message || 'Failed to change password')
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
      setError(error?.message || 'Failed to setup 2FA')
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Handle 2FA verification
  const handleTwoFactorVerify = async () => {
    if (twoFactorToken.length !== 6) {
      setError('Please enter a 6-digit code')
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
      setError(error?.message || 'Invalid verification code')
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
      setError(error?.message || 'Failed to end session')
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Handle logout all sessions
  const handleLogoutAllSessions = async () => {
    if (!confirm('Are you sure you want to logout from all other sessions? This will end all sessions except the current one.')) {
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
      setError(error?.message || 'Failed to logout from all sessions')
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
        setError(e?.message || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="h-4 w-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Globe className="h-4 w-4" /> }
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
      setError(error?.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Mail className="h-5 w-5 mr-2 text-emerald-500" />
          Email Notifications
        </h3>
        
        <div className="space-y-4">
          {Object.entries(notifications.email).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm text-gray-500">
                  {key === 'appointments' && 'Receive email updates about your appointments'}
                  {key === 'reminders' && 'Get reminder emails before appointments'}
                  {key === 'labResults' && 'Notification when lab results are ready'}
                  {key === 'prescriptions' && 'Updates about prescription refills'}
                  {key === 'newsletters' && 'Health tips and clinic newsletters'}
                </p>
              </div>
              <button
                onClick={() => setNotifications({
                  ...notifications,
                  email: { ...notifications.email, [key]: !value }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-emerald-400' : 'bg-gray-200'
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Smartphone className="h-5 w-5 mr-2 text-emerald-500" />
          SMS Notifications
        </h3>
        
        <div className="space-y-4">
          {Object.entries(notifications.sms).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm text-gray-500">
                  {key === 'appointments' && 'SMS alerts for appointment confirmations'}
                  {key === 'reminders' && 'Text message reminders'}
                  {key === 'emergencyOnly' && 'Only receive urgent/emergency messages'}
                </p>
              </div>
              <button
                onClick={() => setNotifications({
                  ...notifications,
                  sms: { ...notifications.sms, [key]: !value }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-emerald-400' : 'bg-gray-200'
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-emerald-500" />
          Reminder Timing
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Send appointment reminders
          </label>
          <select
            value={notifications.reminderTiming}
            onChange={(e) => setNotifications({ ...notifications, reminderTiming: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          >
            <option value="15min">15 minutes before</option>
            <option value="30min">30 minutes before</option>
            <option value="1hour">1 hour before</option>
            <option value="2hours">2 hours before</option>
            <option value="24hours">24 hours before</option>
            <option value="48hours">48 hours before</option>
          </select>
        </div>
      </div>
    </div>
  )

  // Download data handler
  const handleDownloadData = async () => {
    if (!confirm('This will download all your medical data. Do you want to continue?')) {
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
      setError(error?.message || 'Failed to export data')
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Delete account handler
  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      'This action cannot be undone. All your data will be permanently deleted.\n\n' +
      'Type "DELETE" to confirm:'
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
      setError(error?.message || 'Failed to delete account')
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2 text-emerald-500" />
          Profile Visibility
        </h3>
        
        <div className="space-y-3">
          {[
            { value: 'private', label: 'Private', desc: 'Only you can view your profile' },
            { value: 'doctors-only', label: 'Healthcare Providers Only', desc: 'Your doctors and healthcare team can view' },
            { value: 'public', label: 'Public', desc: 'Anyone with the link can view your profile' }
          ].map(option => (
            <label key={option.value} className="flex items-start cursor-pointer p-3 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={privacy.profileVisibility === option.value}
                onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                className="mt-1 text-emerald-400 focus:ring-emerald-400"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-700">{option.label}</p>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Data Sharing */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-emerald-500" />
          Data Sharing & Privacy
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Share Health Data</p>
              <p className="text-sm text-gray-500">Allow healthcare providers to access your health data for treatment</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, shareHealthData: !privacy.shareHealthData })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.shareHealthData ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                privacy.shareHealthData ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Contribute to Medical Research</p>
              <p className="text-sm text-gray-500">Anonymously share data for research purposes</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, allowResearch: !privacy.allowResearch })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.allowResearch ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                privacy.allowResearch ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-700">Activity Tracking</p>
              <p className="text-sm text-gray-500">Track your account activity for security purposes</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, activityTracking: !privacy.activityTracking })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.activityTracking ? 'bg-emerald-400' : 'bg-gray-200'
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-emerald-500" />
          Data Retention
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How long should we keep your data?
          </label>
          <select
            value={privacy.dataRetention}
            onChange={(e) => setPrivacy({ ...privacy, dataRetention: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          >
            <option value="1year">1 year</option>
            <option value="3years">3 years</option>
            <option value="5years">5 years</option>
            <option value="10years">10 years</option>
            <option value="indefinite">Indefinite</option>
          </select>
          <p className="text-sm text-gray-500 mt-2">
            Your data will be retained according to your selection and legal requirements
          </p>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Download className="h-5 w-5 mr-2 text-emerald-500" />
          Data Management
        </h3>
        
        <div className="space-y-4">
          <div className="flex space-x-3">
            <button 
              onClick={handleDownloadData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Exporting...' : 'Download My Data'}
            </button>
            <button 
              onClick={handleDeleteAccount}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Download your data or permanently delete your account. Account deletion cannot be undone.
          </p>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2 text-emerald-500" />
          Change Password
        </h3>
        
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={passwordForm.showCurrent ? 'text' : 'password'}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={() => setPasswordForm({ ...passwordForm, showCurrent: !passwordForm.showCurrent })}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {passwordForm.showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={passwordForm.showNew ? 'text' : 'password'}
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={() => setPasswordForm({ ...passwordForm, showNew: !passwordForm.showNew })}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {passwordForm.showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={passwordForm.showConfirm ? 'text' : 'password'}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={() => setPasswordForm({ ...passwordForm, showConfirm: !passwordForm.showConfirm })}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {passwordForm.showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <button 
            onClick={handlePasswordChange}
            disabled={loading || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
            className="px-6 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Security Options */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Options</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <button
              onClick={() => handleTwoFactorSetup(!security.twoFactor)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                security.twoFactor ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                security.twoFactor ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Login Alerts</p>
              <p className="text-sm text-gray-500">Get notified of new login attempts</p>
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
                  setError(error?.message || 'Failed to update login alerts')
                  setSaveStatus('error')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                security.loginAlerts ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                security.loginAlerts ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Logout After Inactivity</label>
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
                  setError(error?.message || 'Failed to update session timeout')
                  setSaveStatus('error')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="0">Never</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {twoFactorSetup.verificationRequired && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Complete 2FA Setup</h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {twoFactorSetup.qrCode && (
                  <img 
                    src={twoFactorSetup.qrCode} 
                    alt="2FA QR Code" 
                    className="mx-auto border border-gray-200 rounded-lg"
                  />
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Or enter this code manually: <code className="bg-gray-100 px-2 py-1 rounded">{twoFactorSetup.secret}</code>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 6-digit verification code
                </label>
                <input
                  type="text"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleTwoFactorVerify}
                  disabled={loading || twoFactorToken.length !== 6}
                  className="flex-1 px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button
                  onClick={() => setTwoFactorSetup({ qrCode: null, secret: null, verificationRequired: false })}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Smartphone className="h-5 w-5 mr-2 text-emerald-500" />
          Active Sessions
        </h3>
        
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.session_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{session.device_info}</p>
                  <p className="text-sm text-gray-500">
                    {session.ip_address} • {session.location}
                  </p>
                  <p className="text-xs text-gray-400">
                    Last activity: {new Date(session.last_activity).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {session.is_current && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                    Current
                  </span>
                )}
                {!session.is_current && (
                  <button
                    onClick={() => handleEndSession(session.session_id)}
                    disabled={loading}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    End Session
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {sessions.length > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleLogoutAllSessions}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging out...' : 'Logout from All Other Sessions'}
            </button>
          </div>
        )}
      </div>

      {/* Security Activity */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-emerald-500" />
          Recent Security Activity
        </h3>
        
        <div className="space-y-3">
          {securityActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {activity.status === 'success' ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{activity.activity}</p>
                  <p className="text-sm text-gray-500">
                    {activity.ip_address} • {activity.location}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  activity.status === 'success' 
                    ? 'bg-emerald-100 text-emerald-700' 
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-emerald-500" />
          Language & Region
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
            >
              <option value="en">English</option>
              <option value="uz">Uzbek</option>
              <option value="ru">Russian</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
            <select
              value={preferences.timeFormat}
              onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
            >
              <option value="12hour">12-hour (AM/PM)</option>
              <option value="24hour">24-hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Appearance</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
            <div className="flex space-x-3">
              <button
                onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                  preferences.theme === 'light' 
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <Sun className="h-4 w-4 mr-2" />
                Light
              </button>
              <button
                onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                  preferences.theme === 'dark' 
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
            <select
              value={preferences.fontSize}
              onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
            >
              <option value="small">Small</option>
              <option value="medium">Medium (Default)</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>

        {/* Save Status */}
        {saveStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Settings saved successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error saving settings. Please try again.
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-400 text-white shadow-md'
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
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-emerald-400 text-white rounded-lg font-medium hover:bg-emerald-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 bg-red-50 rounded-xl p-6 border border-red-200">
          <h3 className="text-lg font-semibold text-red-800 mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <button className="flex items-center px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
            <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientSettings