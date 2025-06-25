import React, { useState, useEffect } from 'react'
import AdminHeader from './AdminHeader'

const AdminSettings = () => {
  // Simulate user role and clinic assignment (replace with auth context later)
  const userRole = 'HeadAdmin' // or 'BranchAdmin'
  const assignedClinicId = 'clinic1' // for branch admin
  const clinics = [
    { id: 'clinic1', name: 'Main Hospital' },
    { id: 'clinic2', name: 'Downtown Branch' },
    { id: 'clinic3', name: 'Eastside Clinic' }
  ]

  const [selectedClinic, setSelectedClinic] = useState(userRole === 'HeadAdmin' ? 'global' : assignedClinicId)
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [errors, setErrors] = useState({})

  const [settings, setSettings] = useState({
    timezone: 'Asia/Tashkent',
    language: 'en',
    themeColor: '#5ACCC3',
    aiModule: true,
    backupFrequency: 'Weekly',
    dataRetentionYears: 5,
    // New settings
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableTwoFactor: false,
    enableAuditLogs: true,
    enableNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    enableEncryption: true
  })

  const [originalSettings, setOriginalSettings] = useState({...settings})

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasUnsavedChanges(hasChanges)
  }, [settings, originalSettings])

  // Simulate loading settings when clinic changes
  useEffect(() => {
    if (selectedClinic) {
      setIsLoading(true)
      // Simulate API call
      setTimeout(() => {
        console.log(`Loading settings for: ${selectedClinic}`)
        setIsLoading(false)
        setOriginalSettings({...settings})
        setHasUnsavedChanges(false)
      }, 500)
    }
  }, [selectedClinic])

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

  const handleSave = async () => {
    if (!validateSettings()) {
      setSaveStatus('Please fix the errors above')
      return
    }

    setIsLoading(true)
    setSaveStatus('Saving...')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Saving settings for:', selectedClinic)
      console.log('Payload:', settings)
      
      setOriginalSettings({...settings})
      setHasUnsavedChanges(false)
      setSaveStatus('Settings saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
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
              >
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
              >
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
                value={settings.sessionTimeout} 
                onChange={e => handleChange('sessionTimeout', parseInt(e.target.value))} 
                className={`w-full border rounded px-3 py-2 text-sm ${errors.sessionTimeout ? 'border-red-500' : ''}`}
              />
              {errors.sessionTimeout && <p className="text-red-500 text-xs mt-1">{errors.sessionTimeout}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
              <input 
                type="number" 
                min={3} 
                max={10} 
                value={settings.maxLoginAttempts} 
                onChange={e => handleChange('maxLoginAttempts', parseInt(e.target.value))} 
                className={`w-full border rounded px-3 py-2 text-sm ${errors.maxLoginAttempts ? 'border-red-500' : ''}`}
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
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Data Encryption</span>
              <input 
                type="checkbox" 
                checked={settings.enableEncryption} 
                onChange={e => handleChange('enableEncryption', e.target.checked)} 
                className="w-5 h-5" 
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Audit Logs</span>
              <input 
                type="checkbox" 
                checked={settings.enableAuditLogs} 
                onChange={e => handleChange('enableAuditLogs', e.target.checked)} 
                className="w-5 h-5" 
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
                  value={settings.themeColor} 
                  onChange={e => handleChange('themeColor', e.target.value)} 
                  className="w-16 h-10 p-0 border rounded" 
                />
                <input 
                  type="text" 
                  value={settings.themeColor} 
                  onChange={e => handleChange('themeColor', e.target.value)} 
                  className="border rounded px-3 py-2 text-sm w-24"
                  placeholder="#5ACCC3"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo (not functional yet)</label>
              <input type="file" disabled className="text-sm text-gray-400" />
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
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Notifications</span>
              <input 
                type="checkbox" 
                checked={settings.emailNotifications} 
                onChange={e => handleChange('emailNotifications', e.target.checked)} 
                className="w-5 h-5"
                disabled={!settings.enableNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SMS Notifications</span>
              <input 
                type="checkbox" 
                checked={settings.smsNotifications} 
                onChange={e => handleChange('smsNotifications', e.target.checked)} 
                className="w-5 h-5"
                disabled={!settings.enableNotifications}
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
              >
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
                value={settings.dataRetentionYears} 
                onChange={e => handleChange('dataRetentionYears', parseInt(e.target.value))} 
                className={`w-full border rounded px-3 py-2 text-sm ${errors.dataRetentionYears ? 'border-red-500' : ''}`}
              />
              {errors.dataRetentionYears && <p className="text-red-500 text-xs mt-1">{errors.dataRetentionYears}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button 
              onClick={handleReset}
              disabled={!hasUnsavedChanges || isLoading}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Changes
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading}
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