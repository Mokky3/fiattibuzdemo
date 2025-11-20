import React, { useState, useEffect } from 'react'
import { ReceptionistHeader } from './ReceptionHeader'
import { FiUser, FiSettings, FiBell, FiSave, FiEdit3, FiMail, FiPhone, FiMapPin, FiCalendar, FiClock, FiCamera, FiDownload, FiUpload, FiVolume2 } from 'react-icons/fi'
import { receptionAPI } from '../../services/apiService'

const ReceptionProfile = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [profileImage, setProfileImage] = useState(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  
  // Recent Activities State
  const [recentActivities, setRecentActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    birthDate: '',
    employeeId: '',
    department: 'Reception',
    startDate: '',
    emergencyContact: '',
    emergencyPhone: ''
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
    const load = async () => {
      try {
        console.log('🔄 Loading reception profile...')
        const token = localStorage.getItem('token')
        console.log('🔑 Token exists:', !!token)
        
        const dto = await receptionAPI.getProfile('default-clinic')
        console.log('📊 Profile data received:', dto)
        
        // Handle both nested and direct profile data structures
        const profileData = dto?.personalInfo || dto
        if (profileData) {
          console.log('✅ Setting personal info from API:', profileData)
          setPersonalInfo({
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
            city: profileData.city || '',
            state: profileData.state || '',
            zipCode: profileData.zipCode || '',
            birthDate: profileData.birthDate || '',
            employeeId: profileData.employeeId || '',
            department: profileData.department || 'Reception',
            startDate: profileData.startDate || '',
            emergencyContact: profileData.emergencyContact || '',
            emergencyPhone: profileData.emergencyPhone || ''
          })
        } else {
          console.log('⚠️ No personal info in response, keeping empty state')
        }
        
        // Handle notifications from API
        if (dto?.notifications) {
          console.log('🔔 Setting notifications from API:', dto.notifications)
          setNotifications(dto.notifications)
        } else {
          console.log('🔔 No notifications data from API, keeping defaults')
        }
        
        // Handle system preferences from API
        if (dto?.systemPrefs || (dto && (dto.timezone || dto.language))) {
          console.log('⚙️ Setting system preferences from API')
          const systemData = dto?.systemPrefs || {
            timezone: dto.timezone,
            language: dto.language
          }
          console.log('⚙️ System preferences data:', systemData)
          setSystemPrefs(systemData)
        } else {
          console.log('⚙️ No system preferences data from API, keeping defaults')
        }
        if (dto?.profileImage || dto?.profileImageUrl) {
          console.log('🖼️ Setting profile image from API')
          setProfileImage(dto.profileImage || dto.profileImageUrl)
        }
        
        // Load recent activities
        await loadRecentActivities()
      } catch (e) {
        console.error('❌ Failed to load reception profile:', e)
        console.error('Error details:', e.message)
        // Show error message to user
        setSaveMessage('Failed to load profile data. Please check your authentication.')
      } finally {
        setIsLoaded(true)
      }
    }
    load()
  }, [])

  const handlePersonalInfoChange = (field, value) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
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

  const handleSaveChanges = async () => {
    setSaveMessage('')
    setSaveLoading(true)
    
    // Send all personal info fields to the backend
    const dto = {
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      middleName: personalInfo.middleName || null,
      phone: personalInfo.phone,
      email: personalInfo.email || null,
      address: personalInfo.address || null,
      city: personalInfo.city || null,
      state: personalInfo.state || null,
      zipCode: personalInfo.zipCode || null,
      birthDate: personalInfo.birthDate || null,
      employeeId: personalInfo.employeeId || null,
      department: personalInfo.department || null,
      startDate: personalInfo.startDate || null,
      emergencyContact: personalInfo.emergencyContact || null,
      emergencyPhone: personalInfo.emergencyPhone || null,
      timezone: systemPrefs.timezone || null,
      language: systemPrefs.language || null,
      notifications: notifications,
      systemPrefs: systemPrefs
    }
    
        try {
          await receptionAPI.updateProfile(dto, 'default-clinic')
          setUnsavedChanges(false)
          setSaveMessage('Changes saved')
        } catch (e) {
          console.error('Failed to save profile', e)
          setSaveMessage('Failed to save changes')
        }
    setSaveLoading(false)
  }


  // Load recent activities
  const loadRecentActivities = async () => {
    try {
      setActivitiesLoading(true)
      const activities = await receptionAPI.getRecentActivities(10, 168) // Last 7 days
      setRecentActivities(activities || [])
    } catch (error) {
      console.error('Failed to load recent activities:', error)
      setRecentActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }

  // Format activity time
  const formatActivityTime = (timeString) => {
    if (!timeString) return 'Recently'
    
    try {
      const time = new Date(timeString)
      const now = new Date()
      const diffMs = now - time
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffHours < 1) return 'Just now'
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return time.toLocaleDateString()
    } catch (error) {
      return 'Recently'
    }
  }

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: <FiUser /> },
    { id: 'notifications', label: 'Notifications', icon: <FiBell /> },
    { id: 'preferences', label: 'Preferences', icon: <FiSettings /> }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />

      <div className={`max-w-screen-2xl mx-auto px-2 sm:px-4 py-6 sm:py-10 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        
        <div className="flex flex-row gap-4 sm:gap-6">
          {/* Fixed Width Left Sidebar - Reception Information */}
          <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 h-fit sticky top-6">
            <div className="p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span>
                        {(() => {
                          const first = personalInfo.firstName?.[0] || '';
                          const last = personalInfo.lastName?.[0] || '';
                          return first + last || 'R';
                        })()}
                      </span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-lg cursor-pointer hover:bg-gray-50">
                    <FiCamera className="text-gray-600 text-sm" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {personalInfo.firstName || personalInfo.lastName 
                    ? `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim()
                    : 'Receptionist'}
                </h3>
                <p className="text-sm text-gray-600 mb-1">{personalInfo.department || 'Reception'}</p>
                {personalInfo.employeeId && (
                  <p className="text-xs text-gray-500">Employee ID: {personalInfo.employeeId}</p>
                )}
              </div>
              
              {/* Information Box */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-4">Information</h4>
                <div className="space-y-3 text-sm">
                  {personalInfo.startDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium text-gray-800">
                        {new Date(personalInfo.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Active</span>
                  </div>
                  {personalInfo.email && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                      <FiMail className="text-gray-400 text-xs" />
                      <span className="text-xs text-gray-600 truncate">{personalInfo.email}</span>
                    </div>
                  )}
                  {personalInfo.phone && (
                    <div className="flex items-center space-x-2">
                      <FiPhone className="text-gray-400 text-xs" />
                      <span className="text-xs text-gray-600">{personalInfo.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Profile Settings</h2>
              
              {!isLoaded && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading profile...</span>
                </div>
              )}
              
              {(unsavedChanges || saveMessage) && (
                <div className="flex items-center space-x-4">
                  {unsavedChanges && <span className="text-orange-600 text-sm">You have unsaved changes</span>}
                  {saveMessage && <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{saveMessage}</span>}
                  <button 
                    onClick={handleSaveChanges}
                    disabled={saveLoading}
                    className="bg-[#4DB6B0] hover:bg-[#5ACCC3] disabled:bg-[#4DB6B0]/60 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <FiSave className="text-sm" />
                    <span>{saveLoading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                                  {key === 'desktopNotifications' && <FiBell className="text-gray-600" />}
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
      </div>
    </div>
  )
}

export default ReceptionProfile