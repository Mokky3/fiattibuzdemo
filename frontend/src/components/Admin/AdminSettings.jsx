import React, { useState, useEffect } from 'react'
import AdminHeader from './AdminHeader'

const AdminSettings = () => {
  // TODO: Replace with authentication context/hook
  // const { user, hasPermission } = useAuth()
  // const userRole = user.role // 'HeadAdmin' or 'BranchAdmin'
  // const assignedClinicId = user.clinic_id // for branch admin
  const userRole = 'HeadAdmin' // {{ user.role }}
  const assignedClinicId = 'clinic1' // {{ user.clinic_id }}
  
  // TODO: Replace with API call to fetch available clinics
  // API endpoint: GET /api/admin/clinics
  // Expected response: [{ id: string, name: string }]
  const [clinics, setClinics] = useState([])
  
  const [selectedClinic, setSelectedClinic] = useState(userRole === 'HeadAdmin' ? 'global' : assignedClinicId)
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [errors, setErrors] = useState({})
  const [staffSecurityStatus, setStaffSecurityStatus] = useState([])
  const [clinicLogo, setClinicLogo] = useState(null)
  const [backupList, setBackupList] = useState([])
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)

  // TODO: Replace with API call to fetch system settings
  // API endpoint: GET /api/admin/settings/{clinic_id} or GET /api/admin/settings/global
  // Expected response structure:
  // {
  //   general: {
  //     timezone: string,
  //     language: string,
  //     theme_color: string
  //   },
  //   security: {
  //     session_timeout: number,
  //     max_login_attempts: number,
  //     enable_two_factor: boolean,
  //     enable_encryption: boolean,
  //     enable_audit_logs: boolean
  //   },
  //   features: {
  //     ai_module: boolean
  //   },
  //   notifications: {
  //     enable_notifications: boolean,
  //     email_notifications: boolean,
  //     sms_notifications: boolean
  //   },
  //   backup: {
  //     backup_frequency: string,
  //     data_retention_years: number
  //   }
  // }
  const [settings, setSettings] = useState({
    // General settings
    timezone: '', // {{ settings.general.timezone }}
    language: '', // {{ settings.general.language }}
    
    // Security settings
    sessionTimeout: 30, // Default: 30 minutes
    maxLoginAttempts: 5, // Default: 5 attempts
    enableTwoFactor: false, // {{ settings.security.enable_two_factor }}
    enableEncryption: false, // {{ settings.security.enable_encryption }}
    enableAuditLogs: true, // Default: enabled
    
    // Feature settings
    tabibAiEnabled: false, // {{ settings.features.tabib_ai_enabled }}
    notificationsEnabled: true, // {{ settings.features.notifications_enabled }}
    
    // Notification settings
    enableNotifications: false, // {{ settings.notifications.enable_notifications }}
    emailNotifications: false, // {{ settings.notifications.email_notifications }}
    smsNotifications: false, // {{ settings.notifications.sms_notifications }}
    
    // Backup settings
    backupFrequency: 'Weekly', // Default: Weekly backup
    dataRetentionYears: 7 // Default: 7 years retention
  })

  const [originalSettings, setOriginalSettings] = useState({...settings})

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasUnsavedChanges(hasChanges)
  }, [settings, originalSettings])

  // Initialize data on component mount
  useEffect(() => {
    fetchClinics()
    if (selectedClinic) {
      fetchSettings(selectedClinic)
    }
  }, [])

  // Load settings when clinic changes
  useEffect(() => {
    if (selectedClinic) {
      console.log('Clinic changed to:', selectedClinic)
      // Clear previous logo before fetching new one
      setClinicLogo(null)
      console.log('Cleared clinic logo, now fetching for:', selectedClinic)
      
      fetchSettings(selectedClinic)
      if (selectedClinic !== 'global') {
        fetchStaffSecurityStatus()
        fetchClinicLogo()
      } else {
        fetchClinicLogo() // Also fetch logo for global
      }
      fetchBackupList() // Fetch backup list for both global and specific clinics
    }
  }, [selectedClinic])

  // Implement API call to fetch available clinics
  const fetchClinics = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      const response = await fetch(`${API_BASE}/admin/clinics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch clinics')
      const json = await response.json()
      const list = json?.data ?? json
      setClinics((Array.isArray(list) ? list : []).map(c => ({ id: c.id, name: c.name })))
    } catch (error) {
      console.error('Error fetching clinics:', error)
      // Handle error (show toast notification, etc.)
    }
  }

  // Implement API call to fetch settings using new SettingsBundle system
  const fetchSettings = async (clinicId) => {
    setIsLoading(true)
    setErrors({})
    setSaveStatus('')
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      
      // Use clinic-specific settings endpoint if clinicId is provided, otherwise global
      const endpoint = clinicId 
        ? `${API_BASE}/admin/settings/${clinicId}`
        : `${API_BASE}/admin/settings/global`
      
      const settingsRes = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      let mapped = { ...settings }
      if (settingsRes.ok) {
        const settingsJson = await settingsRes.json()
        const settingsData = settingsJson?.data ?? settingsJson
        
        // Map the new SettingsBundle structure to frontend state
        mapped = {
          ...mapped,
          // General settings
          timezone: settingsData.general?.timezone || mapped.timezone,
          language: settingsData.general?.language || mapped.language,
          
          // Security settings
          sessionTimeout: settingsData.security?.sessionTimeout ? parseInt(settingsData.security.sessionTimeout) : mapped.sessionTimeout,
          maxLoginAttempts: settingsData.security?.maxFailedAttempts !== undefined ? settingsData.security.maxFailedAttempts : mapped.maxLoginAttempts,
          enableTwoFactor: settingsData.security?.twoFactorEnabled !== undefined ? !!settingsData.security.twoFactorEnabled : mapped.enableTwoFactor,
          enableEncryption: settingsData.security?.enableEncryption !== undefined ? !!settingsData.security.enableEncryption : mapped.enableEncryption,
          enableAuditLogs: settingsData.security?.enableAuditLogs !== undefined ? !!settingsData.security.enableAuditLogs : mapped.enableAuditLogs,
          
          // Feature settings
          tabibAiEnabled: settingsData.features?.tabib_ai_enabled !== undefined ? !!settingsData.features.tabib_ai_enabled : mapped.tabibAiEnabled,
          notificationsEnabled: settingsData.features?.notifications_enabled !== undefined ? !!settingsData.features.notifications_enabled : mapped.notificationsEnabled,
          
          // Notification settings
          enableNotifications: settingsData.notifications?.emailNotifications !== undefined ? !!settingsData.notifications.emailNotifications : mapped.enableNotifications,
          emailNotifications: settingsData.notifications?.emailNotifications !== undefined ? !!settingsData.notifications.emailNotifications : mapped.emailNotifications,
          smsNotifications: settingsData.notifications?.smsNotifications !== undefined ? !!settingsData.notifications.smsNotifications : mapped.smsNotifications,
          
          // Backup settings
          backupFrequency: settingsData.backup?.backup_frequency || mapped.backupFrequency,
          dataRetentionYears: settingsData.backup?.data_retention_years || mapped.dataRetentionYears,
        }
      }
      
      setSettings(mapped)
      setOriginalSettings({ ...mapped })
      setHasUnsavedChanges(false)
      
    } catch (error) {
      console.error('Error fetching settings:', error)
      setSaveStatus('Failed to load settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const validateSettings = () => {
    const newErrors = {}
    
    if (settings.dataRetentionYears < 1 || settings.dataRetentionYears > 50) {
      newErrors.dataRetentionYears = 'Data retention must be between 1 and 50 years'
    }
    
    if (settings.sessionTimeout < 5 || settings.sessionTimeout > 480) {
      newErrors.sessionTimeout = 'Session timeout must be between 5 and 480 minutes'
    }
    
    if (settings.maxLoginAttempts < 3 || settings.maxLoginAttempts > 10) {
      newErrors.maxLoginAttempts = 'Max login attempts must be between 3 and 10'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Implement API call to save settings
  const handleSave = async () => {
    if (!validateSettings()) {
      setSaveStatus('Please fix the errors above')
      return
    }

    setIsLoading(true)
    setSaveStatus('Saving...')
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      
      // Validate sessionTimeout is one of the allowed values
      const sessionTimeoutValue = settings.sessionTimeout || 30
      const sessionTimeoutString = String(sessionTimeoutValue)
      const allowedTimeouts = ['15', '30', '60', '120', '0']
      const validSessionTimeout = allowedTimeouts.includes(sessionTimeoutString) ? sessionTimeoutString : '30'
      
      // Create SettingsBundle payload for new settings system
      const payload = {
        general: {
          timezone: settings.timezone || "Asia/Tashkent",
          language: settings.language || "en"
        },
        security: {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          twoFactorEnabled: !!settings.enableTwoFactor,
          loginAlerts: !!settings.enableAuditLogs,
          sessionTimeout: validSessionTimeout,
          passwordExpiryDays: 90,
          maxFailedAttempts: Math.max(settings.maxLoginAttempts || 5, 3),
          lockoutDurationMinutes: 15,
          requireStrongPassword: true,
          sessionConcurrencyLimit: 3,
          enableEncryption: !!settings.enableEncryption,
          enableAuditLogs: !!settings.enableAuditLogs
        },
        features: {
          tabib_ai_enabled: !!settings.tabibAiEnabled,
          notifications_enabled: !!settings.notificationsEnabled
        },
        notifications: {
          emailNotifications: !!settings.emailNotifications,
          smsNotifications: !!settings.smsNotifications,
          pushNotifications: true,
          appointmentReminders: true,
          patientMessages: true,
          systemUpdates: true,
          marketingEmails: false,
          reminderTiming: "1hour"
        },
        backup: {
          backup_frequency: settings.backupFrequency || "Weekly",
          data_retention_years: settings.dataRetentionYears || 7
        }
      }
      
      // Use clinic-specific settings endpoint if clinicId is provided, otherwise global
      const endpoint = selectedClinic 
        ? `${API_BASE}/admin/settings/${selectedClinic}`
        : `${API_BASE}/admin/settings/global`
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to save settings')

      // Refresh settings from backend to ensure UI shows updated values
      await fetchSettings(selectedClinic)
      
      setHasUnsavedChanges(false)
      setSaveStatus('Settings saved successfully!')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveStatus('Failed to save settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (hasUnsavedChanges && !window.confirm('Are you sure you want to discard all changes?')) {
      return
    }
    setSettings({...originalSettings})
    setErrors({})
    setSaveStatus('')
  }

  const handleClinicChange = (clinicId) => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to switch clinics?')) {
      return
    }
    setSelectedClinic(clinicId)
  }

  // TODO: Implement function to log admin activity
  const logAdminActivity = async (activityData) => {
    try {
      // await fetch('/api/admin/activity', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(activityData)
      // })
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  // Helper function to check if user has permission to modify settings
  const canModifySettings = () => {
    // TODO: Implement permission checking
    // return hasPermission('MODIFY_SYSTEM_SETTINGS')
    return true
  }

  const fetchStaffSecurityStatus = async () => {
    if (selectedClinic === 'global') return
    
    setIsLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      const response = await fetch(`${API_BASE}/admin/settings/${selectedClinic}/staff-security`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStaffSecurityStatus(data.data?.staff_members || [])
      } else {
        console.error('Failed to fetch staff security status')
        setStaffSecurityStatus([])
      }
    } catch (error) {
      console.error('Error fetching staff security status:', error)
      setStaffSecurityStatus([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Global logo upload is now supported

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      
      let response
      if (selectedClinic === 'global') {
        // Upload global logo
        response = await fetch(`${API_BASE}/admin/clinics/logo/global`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
      } else {
        // Upload specific clinic logo
        response = await fetch(`${API_BASE}/admin/clinics/${selectedClinic}/logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
      }

      if (response.ok) {
        const data = await response.json()
        setClinicLogo(data.data.logo_url)
        setSaveStatus('Logo uploaded successfully')
        setTimeout(() => setSaveStatus(''), 3000)
      } else {
        const errorData = await response.json()
        alert(`Failed to upload logo: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo')
    } finally {
      setIsLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleLogoDelete = async () => {
    // Global logo deletion is now supported

    if (!clinicLogo) {
      alert('No logo to delete')
      return
    }

    if (!confirm('Are you sure you want to delete the clinic logo?')) {
      return
    }

    setIsLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      
      let response
      if (selectedClinic === 'global') {
        // Delete global logo
        response = await fetch(`${API_BASE}/admin/clinics/logo/global`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      } else {
        // Delete specific clinic logo
        response = await fetch(`${API_BASE}/admin/clinics/${selectedClinic}/logo`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      }

      if (response.ok) {
        setClinicLogo(null)
        setSaveStatus('Logo deleted successfully')
        setTimeout(() => setSaveStatus(''), 3000)
      } else {
        const errorData = await response.json()
        alert(`Failed to delete logo: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting logo:', error)
      alert('Failed to delete logo')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClinicLogo = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      
      let response
      if (selectedClinic === 'global') {
        // Fetch global logo
        console.log('Fetching global logo from:', `${API_BASE}/admin/clinics/logo/global`)
        response = await fetch(`${API_BASE}/admin/clinics/logo/global`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      } else {
        // Fetch specific clinic logo
        console.log('Fetching clinic logo from:', `${API_BASE}/admin/clinics/${selectedClinic}/logo`)
        response = await fetch(`${API_BASE}/admin/clinics/${selectedClinic}/logo`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      }

      console.log('Logo fetch response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Logo fetch response data:', data)
        const logoUrl = data.data?.logo_url || null
        console.log('Setting clinic logo to:', logoUrl)
        setClinicLogo(logoUrl)
      } else {
        console.error('Failed to fetch logo, status:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        setClinicLogo(null)
      }
    } catch (error) {
      console.error('Error fetching logo:', error)
      setClinicLogo(null)
    }
  }

  const fetchBackupList = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      
      const clinicParam = selectedClinic !== 'global' ? `?clinic_id=${selectedClinic}` : ''
      const response = await fetch(`${API_BASE}/admin/settings/backup/list${clinicParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBackupList(data.data?.backups || [])
      } else {
        console.error('Failed to fetch backup list, status:', response.status)
        setBackupList([])
      }
    } catch (error) {
      console.error('Error fetching backup list:', error)
      setBackupList([])
    }
  }

  const createBackup = async () => {
    setIsCreatingBackup(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const API_VERSION = '/api/v1'
      const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
      
      let endpoint
      if (selectedClinic === 'global') {
        endpoint = `${API_BASE}/admin/settings/backup/global`
      } else {
        endpoint = `${API_BASE}/admin/settings/backup/${selectedClinic}`
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Backup created successfully:', data)
        setSaveStatus('Backup created successfully!')
        // Refresh backup list
        await fetchBackupList()
      } else {
        const errorText = await response.text()
        console.error('Failed to create backup:', errorText)
        setSaveStatus('Failed to create backup. Please try again.')
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      setSaveStatus('Failed to create backup. Please try again.')
    } finally {
      setIsCreatingBackup(false)
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#4DB6B0] mb-4">System Settings</h2>
          {hasUnsavedChanges && (
            <span className="text-amber-600 text-sm font-medium">• Unsaved changes</span>
          )}
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className={`p-3 rounded-md text-sm ${
            saveStatus.includes('successfully') 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : saveStatus.includes('Failed') || saveStatus.includes('fix')
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {saveStatus}
          </div>
        )}

        {/* Clinic Scope Dropdown */}
        {userRole === 'HeadAdmin' && (
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <label className="block text-sm font-medium mb-1">Apply Settings To:</label>
            <select 
              value={selectedClinic} 
              onChange={e => handleClinicChange(e.target.value)} 
              className="w-full border rounded px-3 py-2 text-sm"
              disabled={isLoading}
            >
              <option value="global">🌐 Global (All Clinics)</option>
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4DB6B0]"></div>
            <p className="mt-2 text-sm text-gray-600">Loading settings...</p>
          </div>
        )}

        <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
          {/* General Settings */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">General</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select 
                value={settings.timezone} 
                onChange={e => handleChange('timezone', e.target.value)} 
                className="w-full border rounded px-3 py-2 text-sm"
                disabled={!canModifySettings()}
              >
                <option value="">Select timezone...</option>
                <option value="Asia/Tashkent">Asia/Tashkent (GMT+5)</option>
                <option value="Europe/Moscow">Europe/Moscow (GMT+3)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select 
                value={settings.language} 
                onChange={e => handleChange('language', e.target.value)} 
                className="w-full border rounded px-3 py-2 text-sm"
                disabled={!canModifySettings()}
              >
                <option value="">Select language...</option>
                <option value="en">English</option>
                <option value="ru">Russian</option>
                <option value="uz">Uzbek</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Security</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
              <input 
                type="number" 
                min={5} 
                max={480} 
                value={settings.sessionTimeout || ''} 
                onChange={e => handleChange('sessionTimeout', parseInt(e.target.value) || 0)} 
                className={`w-full border rounded px-3 py-2 text-sm ${errors.sessionTimeout ? 'border-red-500' : ''}`}
                disabled={!canModifySettings()}
                placeholder="Enter session timeout in minutes"
              />
              {errors.sessionTimeout && <p className="text-red-500 text-xs mt-1">{errors.sessionTimeout}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
              <input 
                type="number" 
                min={3} 
                max={10} 
                value={settings.maxLoginAttempts || ''} 
                onChange={e => handleChange('maxLoginAttempts', parseInt(e.target.value) || 0)} 
                className={`w-full border rounded px-3 py-2 text-sm ${errors.maxLoginAttempts ? 'border-red-500' : ''}`}
                disabled={!canModifySettings()}
                placeholder="Enter max login attempts"
              />
              {errors.maxLoginAttempts && <p className="text-red-500 text-xs mt-1">{errors.maxLoginAttempts}</p>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Two-Factor Authentication</span>
              <input 
                type="checkbox" 
                checked={settings.enableTwoFactor} 
                onChange={e => handleChange('enableTwoFactor', e.target.checked)} 
                className="w-5 h-5" 
                disabled={!canModifySettings()}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Data Encryption</span>
              <input 
                type="checkbox" 
                checked={settings.enableEncryption} 
                onChange={e => handleChange('enableEncryption', e.target.checked)} 
                className="w-5 h-5" 
                disabled={!canModifySettings()}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Audit Logs</span>
              <input 
                type="checkbox" 
                checked={settings.enableAuditLogs} 
                onChange={e => handleChange('enableAuditLogs', e.target.checked)} 
                className="w-5 h-5" 
                disabled={!canModifySettings()}
              />
            </div>
          </div>

          {/* Staff Security Status */}
          {selectedClinic !== 'global' && (
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-700">Staff Security Status</h3>
                <button
                  onClick={fetchStaffSecurityStatus}
                  className="px-3 py-1 bg-[#4DB6B0] text-white text-sm rounded hover:bg-[#43b0a8]"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Refresh Status'}
                </button>
              </div>
              {staffSecurityStatus.length > 0 ? (
                <div className="space-y-3">
                  {staffSecurityStatus.map((staff, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#4DB6B0] rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{staff.name}</div>
                          <div className="text-sm text-gray-500">{staff.email} • {staff.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Login Attempts</div>
                          <div className={`font-medium ${staff.failed_login_attempts > 3 ? 'text-red-600' : 'text-gray-900'}`}>
                            {staff.failed_login_attempts}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Status</div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            staff.is_locked 
                              ? 'bg-red-100 text-red-700' 
                              : staff.failed_login_attempts > 2 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-green-100 text-green-700'
                          }`}>
                            {staff.is_locked ? 'Locked' : staff.failed_login_attempts > 2 ? 'Warning' : 'Active'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">2FA</div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            staff.two_factor_enabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {staff.two_factor_enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Encryption</div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            staff.encryption_enabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {staff.encryption_enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Audit Logs</div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            staff.audit_logs_enabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {staff.audit_logs_enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No staff members found for this clinic.</p>
                </div>
              )}
            </div>
          )}

          {/* Branding */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Branding</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Logo Upload</label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-sm"
                    disabled={!canModifySettings()}
                    id="logo-upload"
                  />
                  <button
                    onClick={handleLogoDelete}
                    disabled={!canModifySettings() || !clinicLogo}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Delete Logo
                  </button>
                </div>
                {clinicLogo && (
                  <div className="flex items-center space-x-3">
                    <img 
                      src={clinicLogo} 
                      alt="Clinic Logo" 
                      className="w-16 h-16 object-cover rounded border"
                      onError={(e) => {
                        console.error('Logo image failed to load:', clinicLogo)
                        console.error('Current clinic:', selectedClinic)
                        e.target.style.display = 'none'
                      }}
                      onLoad={() => {
                        console.log('Logo image loaded successfully:', clinicLogo)
                        console.log('Current clinic:', selectedClinic)
                      }}
                    />
                    <div>
                      <p className="text-sm text-gray-600">Current logo</p>
                      <p className="text-xs text-gray-500">Click "Delete Logo" to remove</p>
                      <p className="text-xs text-gray-400">URL: {clinicLogo}</p>
                      <p className="text-xs text-gray-300">Clinic: {selectedClinic}</p>
                    </div>
                  </div>
                )}
                {!clinicLogo && (
                  <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm text-gray-500">No logo uploaded</p>
                    <p className="text-xs text-gray-400">Upload an image file (PNG, JPG, GIF)</p>
                    <p className="text-xs text-gray-300">Debug: clinicLogo = {clinicLogo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Modules & Features</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Tabib AI for Staff</span>
              <input 
                type="checkbox" 
                checked={settings.tabibAiEnabled} 
                onChange={e => handleChange('tabibAiEnabled', e.target.checked)} 
                className="w-5 h-5" 
                disabled={!canModifySettings()}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Notifications for Staff</span>
              <input 
                type="checkbox" 
                checked={settings.notificationsEnabled} 
                onChange={e => handleChange('notificationsEnabled', e.target.checked)} 
                className="w-5 h-5" 
                disabled={!canModifySettings()}
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Notifications</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable System Notifications</span>
              <input 
                type="checkbox" 
                checked={settings.enableNotifications} 
                onChange={e => handleChange('enableNotifications', e.target.checked)} 
                className="w-5 h-5"
                disabled={!canModifySettings()}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Notifications</span>
              <input 
                type="checkbox" 
                checked={settings.emailNotifications} 
                onChange={e => handleChange('emailNotifications', e.target.checked)} 
                className="w-5 h-5"
                disabled={!settings.enableNotifications || !canModifySettings()}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SMS Notifications</span>
              <input 
                type="checkbox" 
                checked={settings.smsNotifications} 
                onChange={e => handleChange('smsNotifications', e.target.checked)} 
                className="w-5 h-5"
                disabled={!settings.enableNotifications || !canModifySettings()}
              />
            </div>
          </div>

          {/* Backup & Retention */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Backup & Data Policy</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Backup Frequency</label>
              <select 
                value={settings.backupFrequency} 
                onChange={e => handleChange('backupFrequency', e.target.value)} 
                className="w-full border rounded px-3 py-2 text-sm"
                disabled={!canModifySettings()}
              >
                <option value="">Select backup frequency...</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Retention (Years)</label>
              <input 
                type="number" 
                min={1} 
                max={50} 
                value={settings.dataRetentionYears || ''} 
                onChange={e => handleChange('dataRetentionYears', parseInt(e.target.value) || 0)} 
                className={`w-full border rounded px-3 py-2 text-sm ${errors.dataRetentionYears ? 'border-red-500' : ''}`}
                disabled={!canModifySettings()}
                placeholder="Enter data retention period in years"
              />
              {errors.dataRetentionYears && <p className="text-red-500 text-xs mt-1">{errors.dataRetentionYears}</p>}
            </div>
            
            {/* Backup Management */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-700">Backup Management</h4>
                <button
                  onClick={createBackup}
                  disabled={isCreatingBackup || !canModifySettings()}
                  className="bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCreatingBackup && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{isCreatingBackup ? 'Creating...' : 'Create Backup'}</span>
                </button>
              </div>
              
              {/* Backup List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {backupList.length > 0 ? (
                  backupList.map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">
                            {backup.clinic_name || 'Global Backup'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(backup.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Size: {(backup.file_size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {backup.backup_type}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No backups found</p>
                    <p className="text-xs">Create your first backup to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button 
              onClick={handleReset}
              disabled={!hasUnsavedChanges || isLoading || !canModifySettings()}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Changes
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading || !canModifySettings()}
              className="bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings