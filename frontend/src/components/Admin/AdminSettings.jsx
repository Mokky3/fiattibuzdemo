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
    themeColor: '', // {{ settings.general.theme_color }}
    
    // Security settings
    sessionTimeout: 0, // {{ settings.security.session_timeout }}
    maxLoginAttempts: 0, // {{ settings.security.max_login_attempts }}
    enableTwoFactor: false, // {{ settings.security.enable_two_factor }}
    enableEncryption: false, // {{ settings.security.enable_encryption }}
    enableAuditLogs: false, // {{ settings.security.enable_audit_logs }}
    
    // Feature settings
    aiModule: false, // {{ settings.features.ai_module }}
    
    // Notification settings
    enableNotifications: false, // {{ settings.notifications.enable_notifications }}
    emailNotifications: false, // {{ settings.notifications.email_notifications }}
    smsNotifications: false, // {{ settings.notifications.sms_notifications }}
    
    // Backup settings
    backupFrequency: '', // {{ settings.backup.backup_frequency }}
    dataRetentionYears: 0 // {{ settings.backup.data_retention_years }}
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
      fetchSettings(selectedClinic)
    }
  }, [selectedClinic])

  // TODO: Implement API call to fetch available clinics
  const fetchClinics = async () => {
    try {
      // const response = await fetch('/api/admin/clinics', {
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // const data = await response.json()
      // setClinics(data)
      
      // Temporary mock data - remove when API is implemented
      setClinics([
        { id: 'clinic1', name: 'Main Hospital' },
        { id: 'clinic2', name: 'Downtown Branch' },
        { id: 'clinic3', name: 'Eastside Clinic' }
      ])
    } catch (error) {
      console.error('Error fetching clinics:', error)
      // Handle error (show toast notification, etc.)
    }
  }

  // TODO: Implement API call to fetch settings
  const fetchSettings = async (clinicId) => {
    setIsLoading(true)
    setErrors({})
    setSaveStatus('')
    
    try {
      // const endpoint = clinicId === 'global' 
      //   ? '/api/admin/settings/global' 
      //   : `/api/admin/settings/${clinicId}`
      // 
      // const response = await fetch(endpoint, {
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to fetch settings')
      // }
      // 
      // const data = await response.json()
      // 
      // // Map API response to component state
      // const mappedSettings = {
      //   timezone: data.general.timezone,
      //   language: data.general.language,
      //   themeColor: data.general.theme_color,
      //   sessionTimeout: data.security.session_timeout,
      //   maxLoginAttempts: data.security.max_login_attempts,
      //   enableTwoFactor: data.security.enable_two_factor,
      //   enableEncryption: data.security.enable_encryption,
      //   enableAuditLogs: data.security.enable_audit_logs,
      //   aiModule: data.features.ai_module,
      //   enableNotifications: data.notifications.enable_notifications,
      //   emailNotifications: data.notifications.email_notifications,
      //   smsNotifications: data.notifications.sms_notifications,
      //   backupFrequency: data.backup.backup_frequency,
      //   dataRetentionYears: data.backup.data_retention_years
      // }
      // 
      // setSettings(mappedSettings)
      // setOriginalSettings({...mappedSettings})
      
      // Temporary default values - remove when API is implemented
      const defaultSettings = {
        timezone: 'Asia/Tashkent',
        language: 'en',
        themeColor: '#5ACCC3',
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        enableTwoFactor: false,
        enableEncryption: true,
        enableAuditLogs: true,
        aiModule: true,
        enableNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        backupFrequency: 'Weekly',
        dataRetentionYears: 5
      }
      
      setSettings(defaultSettings)
      setOriginalSettings({...defaultSettings})
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

  // TODO: Implement API call to save settings
  const handleSave = async () => {
    if (!validateSettings()) {
      setSaveStatus('Please fix the errors above')
      return
    }

    setIsLoading(true)
    setSaveStatus('Saving...')
    
    try {
      // Map component state to API format
      // const payload = {
      //   general: {
      //     timezone: settings.timezone,
      //     language: settings.language,
      //     theme_color: settings.themeColor
      //   },
      //   security: {
      //     session_timeout: settings.sessionTimeout,
      //     max_login_attempts: settings.maxLoginAttempts,
      //     enable_two_factor: settings.enableTwoFactor,
      //     enable_encryption: settings.enableEncryption,
      //     enable_audit_logs: settings.enableAuditLogs
      //   },
      //   features: {
      //     ai_module: settings.aiModule
      //   },
      //   notifications: {
      //     enable_notifications: settings.enableNotifications,
      //     email_notifications: settings.emailNotifications,
      //     sms_notifications: settings.smsNotifications
      //   },
      //   backup: {
      //     backup_frequency: settings.backupFrequency,
      //     data_retention_years: settings.dataRetentionYears
      //   }
      // }
      // 
      // const endpoint = selectedClinic === 'global' 
      //   ? '/api/admin/settings/global' 
      //   : `/api/admin/settings/${selectedClinic}`
      // 
      // const response = await fetch(endpoint, {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(payload)
      // })
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to save settings')
      // }
      // 
      // const updatedSettings = await response.json()
      
      // Simulate API call delay - remove when API is implemented
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Saving settings for:', selectedClinic)
      console.log('Payload:', settings)
      
      // TODO: Log admin activity
      // await logAdminActivity({
      //   action: `Updated system settings for ${selectedClinic}`,
      //   action_type: 'config',
      //   details: `Modified settings: ${Object.keys(settings).join(', ')}`
      // })
      
      setOriginalSettings({...settings})
      setHasUnsavedChanges(false)
      setSaveStatus('Settings saved successfully!')
      
      // Clear success message after 3 seconds
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

          {/* Branding */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Branding</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Theme Color</label>
              <div className="flex items-center space-x-3">
                <input 
                  type="color" 
                  value={settings.themeColor || '#5ACCC3'} 
                  onChange={e => handleChange('themeColor', e.target.value)} 
                  className="w-16 h-10 p-0 border rounded" 
                  disabled={!canModifySettings()}
                />
                <input 
                  type="text" 
                  value={settings.themeColor || ''} 
                  onChange={e => handleChange('themeColor', e.target.value)} 
                  className="border rounded px-3 py-2 text-sm w-24"
                  placeholder="#5ACCC3"
                  disabled={!canModifySettings()}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo Upload</label>
              {/* TODO: Implement logo upload functionality */}
              {/* 
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-sm"
                disabled={!canModifySettings()}
              />
              */}
              <input type="file" disabled className="text-sm text-gray-400" />
              <p className="text-xs text-gray-500 mt-1">Logo upload functionality will be implemented with backend integration</p>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Modules & Features</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Tabib AI Assistant</span>
              <input 
                type="checkbox" 
                checked={settings.aiModule} 
                onChange={e => handleChange('aiModule', e.target.checked)} 
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