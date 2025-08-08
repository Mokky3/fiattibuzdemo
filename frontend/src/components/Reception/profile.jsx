import React, { useState, useEffect } from 'react'
import { ReceptionistHeader } from './ReceptionHeader'
import { FiUser, FiSettings, FiBell, FiLock, FiSave, FiEdit3, FiMail, FiPhone, FiMapPin, FiCalendar, FiClock, FiEye, FiEyeOff, FiCamera, FiDownload, FiUpload, FiShield, FiMonitor, FiVolume2 } from 'react-icons/fi'

const ReceptionProfile = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [showPassword, setShowPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    firstName: 'Sarah',
    lastName: 'Roberts',
    email: 'sarah.roberts@fiattib.com',
    phone: '+1 (555) 123-4567',
    address: '123 Medical Center Drive',
    city: 'Healthcare City',
    state: 'HC',
    zipCode: '12345',
    birthDate: '1985-06-15',
    employeeId: 'REC001',
    department: 'Reception',
    startDate: '2020-03-15',
    emergencyContact: 'John Roberts',
    emergencyPhone: '+1 (555) 987-6543'
  })

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    appointmentReminders: true,
    newPatientAlerts: true,
    systemUpdates: false,
    emergencyAlerts: true,
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true,
    soundAlerts: true
  })

  // System Preferences
  const [systemPrefs, setSystemPrefs] = useState({
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12',
    theme: 'light',
    fontSize: 'medium',
    autoLogout: '30',
    defaultView: 'dashboard'
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handlePersonalInfoChange = (field, value) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (field, value) => {
    setNotifications(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handleSystemPrefChange = (field, value) => {
    setSystemPrefs(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target.result)
        setUnsavedChanges(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveChanges = () => {
    // API call to save changes
    console.log('Saving changes...')
    setUnsavedChanges(false)
    // Show success message
  }

  const handlePasswordUpdate = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    // API call to update password
    console.log('Updating password...')
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: <FiUser /> },
    { id: 'security', label: 'Security', icon: <FiLock /> },
    { id: 'notifications', label: 'Notifications', icon: <FiBell /> },
    { id: 'preferences', label: 'Preferences', icon: <FiSettings /> }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />

      <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Profile Settings</h2>
          
          {unsavedChanges && (
            <div className="flex items-center space-x-4">
              <span className="text-orange-600 text-sm">You have unsaved changes</span>
              <button 
                onClick={handleSaveChanges}
                className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FiSave className="text-sm" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Profile Summary Card */}
          <div className="lg:w-1/4">
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100 sticky top-24">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      `${personalInfo.firstName[0]}${personalInfo.lastName[0]}`
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-lg cursor-pointer hover:bg-gray-50">
                    <FiCamera className="text-gray-600 text-sm" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{personalInfo.firstName} {personalInfo.lastName}</h3>
                <p className="text-sm text-gray-600 mb-1">{personalInfo.department}</p>
                <p className="text-xs text-gray-500">Employee ID: {personalInfo.employeeId}</p>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Start Date:</span>
                      <span className="font-medium">{new Date(personalInfo.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-[#4DB6B0] text-[#4DB6B0]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Personal Information Tab */}
                {activeTab === 'personal' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <FiUser className="text-[#4DB6B0]" />
                        <span>Personal Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                          <input
                            type="text"
                            value={personalInfo.firstName}
                            onChange={(e) => handlePersonalInfoChange('firstName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                          <input
                            type="text"
                            value={personalInfo.lastName}
                            onChange={(e) => handlePersonalInfoChange('lastName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <div className="relative">
                            <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="email"
                              value={personalInfo.email}
                              onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <div className="relative">
                            <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="tel"
                              value={personalInfo.phone}
                              onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                          <div className="relative">
                            <FiMapPin className="absolute left-3 top-3 text-gray-400" />
                            <input
                              type="text"
                              value={personalInfo.address}
                              onChange={(e) => handlePersonalInfoChange('address', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                          <input
                            type="text"
                            value={personalInfo.city}
                            onChange={(e) => handlePersonalInfoChange('city', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
                          <div className="relative">
                            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="date"
                              value={personalInfo.birthDate}
                              onChange={(e) => handlePersonalInfoChange('birthDate', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                          <input
                            type="text"
                            value={personalInfo.emergencyContact}
                            onChange={(e) => handlePersonalInfoChange('emergencyContact', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                          <input
                            type="tel"
                            value={personalInfo.emergencyPhone}
                            onChange={(e) => handlePersonalInfoChange('emergencyPhone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <FiLock className="text-[#4DB6B0]" />
                        <span>Password & Security</span>
                      </h3>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2">
                          <FiShield className="text-blue-600" />
                          <span className="text-sm text-blue-800 font-medium">Security Status: Strong</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">Last password change: 30 days ago</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={handlePasswordUpdate}
                          className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-6 py-2 rounded-lg transition-colors"
                        >
                          Update Password
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Login Activity</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FiMonitor className="text-gray-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">Desktop - Chrome</p>
                              <p className="text-xs text-gray-500">Current session</p>
                            </div>
                          </div>
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <FiBell className="text-[#4DB6B0]" />
                        <span>Notification Preferences</span>
                      </h3>
                      
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-md font-semibold text-gray-800 mb-3">Email Notifications</h4>
                          <div className="space-y-3">
                            {Object.entries({
                              appointmentReminders: 'Appointment Reminders',
                              newPatientAlerts: 'New Patient Alerts',
                              systemUpdates: 'System Updates',
                              emergencyAlerts: 'Emergency Alerts'
                            }).map(([key, label]) => (
                              <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                                <span className="text-sm text-gray-700">{label}</span>
                                <input
                                  type="checkbox"
                                  checked={notifications[key]}
                                  onChange={(e) => handleNotificationChange(key, e.target.checked)}
                                  className="w-4 h-4 text-[#4DB6B0] border-gray-300 rounded focus:ring-[#4DB6B0]"
                                />
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-md font-semibold text-gray-800 mb-3">Delivery Methods</h4>
                          <div className="space-y-3">
                            {Object.entries({
                              emailNotifications: 'Email Notifications',
                              smsNotifications: 'SMS Notifications',
                              desktopNotifications: 'Desktop Notifications',
                              soundAlerts: 'Sound Alerts'
                            }).map(([key, label]) => (
                              <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3">
                                  {key === 'emailNotifications' && <FiMail className="text-gray-600" />}
                                  {key === 'smsNotifications' && <FiPhone className="text-gray-600" />}
                                  {key === 'desktopNotifications' && <FiMonitor className="text-gray-600" />}
                                  {key === 'soundAlerts' && <FiVolume2 className="text-gray-600" />}
                                  <span className="text-sm text-gray-700">{label}</span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notifications[key]}
                                  onChange={(e) => handleNotificationChange(key, e.target.checked)}
                                  className="w-4 h-4 text-[#4DB6B0] border-gray-300 rounded focus:ring-[#4DB6B0]"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <FiSettings className="text-[#4DB6B0]" />
                        <span>System Preferences</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                          <select
                            value={systemPrefs.language}
                            onChange={(e) => handleSystemPrefChange('language', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                          <select
                            value={systemPrefs.timezone}
                            onChange={(e) => handleSystemPrefChange('timezone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          >
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                          <select
                            value={systemPrefs.dateFormat}
                            onChange={(e) => handleSystemPrefChange('dateFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          >
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                          <select
                            value={systemPrefs.timeFormat}
                            onChange={(e) => handleSystemPrefChange('timeFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          >
                            <option value="12">12 Hour</option>
                            <option value="24">24 Hour</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                          <select
                            value={systemPrefs.theme}
                            onChange={(e) => handleSystemPrefChange('theme', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Auto Logout (minutes)</label>
                          <select
                            value={systemPrefs.autoLogout}
                            onChange={(e) => handleSystemPrefChange('autoLogout', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="never">Never</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Data Management</h4>
                      <div className="space-y-3">
                        <button className="w-full md:w-auto flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <FiDownload className="text-sm" />
                          <span>Export Profile Data</span>
                        </button>
                        <button className="w-full md:w-auto flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <FiUpload className="text-sm" />
                          <span>Import Settings</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </div>
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                      Reset to Default
                    </button>
                    <button 
                      onClick={handleSaveChanges}
                      disabled={!unsavedChanges}
                      className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                        unsavedChanges 
                          ? 'bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <FiSave className="text-sm" />
                      <span>Save All Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log Card */}
        <div className="mt-8 bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {[
              { action: 'Profile updated', time: '2 hours ago', details: 'Phone number changed' },
              { action: 'Password changed', time: '1 week ago', details: 'Security update completed' },
              { action: 'Notification settings modified', time: '2 weeks ago', details: 'Email preferences updated' },
              { action: 'Profile photo uploaded', time: '1 month ago', details: 'New profile image added' }
            ].map((activity, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-[#4DB6B0] rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.details}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-gray-50 text-center">
            <button className="text-sm text-[#4DB6B0] hover:text-[#5ACCC3] font-medium">
              View All Activity
            </button>
          </div>
        </div>

        {/* Help & Support Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Need Help?</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    📚
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">User Guide</p>
                    <p className="text-xs text-gray-500">Learn how to use the system</p>
                  </div>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    💬
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Contact Support</p>
                    <p className="text-xs text-gray-500">Get help from our team</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-medium text-gray-800">FIATTIB v2.1.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Update</span>
                <span className="text-sm font-medium text-gray-800">March 15, 2024</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">License</span>
                <span className="text-sm font-medium text-gray-800">Professional</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Support Until</span>
                <span className="text-sm font-medium text-gray-800">March 2025</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceptionProfile