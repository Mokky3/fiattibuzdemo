import React, { useState, useEffect } from 'react'
import { ReceptionistHeader } from './ReceptionHeader'
import { FiSettings, FiUsers, FiShield, FiDatabase, FiBell, FiMonitor, FiClock, FiGlobe, FiMail, FiPhone, FiPrinter, FiWifi, FiHardDrive, FiActivity, FiAlertTriangle, FiCheck, FiX, FiEdit3, FiTrash2, FiPlus, FiDownload, FiUpload, FiRefreshCw, FiSave } from 'react-icons/fi'

const ReceptionSettings = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    clinicName: 'FIATTIB Medical Center',
    address: '123 Healthcare Avenue, Medical City, HC 12345',
    phone: '+1 (555) 123-4567',
    email: 'info@fiattib.com',
    website: 'www.fiattib.com',
    timezone: 'America/New_York',
    language: 'en',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12',
    workingHours: {
      start: '08:00',
      end: '18:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }
  })

  // User Management State
  const [users, setUsers] = useState([
    { id: 1, name: 'Sarah Roberts', role: 'Receptionist', email: 'sarah@fiattib.com', status: 'active', lastLogin: '2 hours ago' },
    { id: 2, name: 'Dr. Michael Smith', role: 'Doctor', email: 'msmith@fiattib.com', status: 'active', lastLogin: '30 min ago' },
    { id: 3, name: 'Dr. Emily Johnson', role: 'Doctor', email: 'ejohnson@fiattib.com', status: 'active', lastLogin: '1 hour ago' },
    { id: 4, name: 'Lisa Wilson', role: 'Nurse', email: 'lwilson@fiattib.com', status: 'inactive', lastLogin: '3 days ago' }
  ])

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: '7years',
    maintenanceMode: false,
    debugMode: false,
    allowRemoteAccess: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableAuditLog: true,
    autoUpdates: false
  })

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

  // Integration Settings State
  const [integrationSettings, setIntegrationSettings] = useState({
    emailServer: 'smtp.fiattib.com',
    emailPort: '587',
    emailSecurity: 'tls',
    smsProvider: 'twilio',
    paymentGateway: 'stripe',
    insuranceApi: 'enabled',
    labIntegration: 'enabled',
    pharmacyIntegration: 'disabled'
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleGeneralChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setGeneralSettings(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }))
    } else {
      setGeneralSettings(prev => ({ ...prev, [field]: value }))
    }
    setUnsavedChanges(true)
  }

  const handleSystemChange = (field, value) => {
    setSystemSettings(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handleNotificationChange = (field, value) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handleIntegrationChange = (field, value) => {
    setIntegrationSettings(prev => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  const handleWorkingDayToggle = (day) => {
    const newDays = generalSettings.workingHours.days.includes(day)
      ? generalSettings.workingHours.days.filter(d => d !== day)
      : [...generalSettings.workingHours.days, day]
    
    handleGeneralChange('workingHours.days', newDays)
  }

  const handleSaveChanges = () => {
    console.log('Saving all settings...')
    setUnsavedChanges(false)
    // API calls to save settings
  }

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== userId))
      setUnsavedChanges(true)
    }
  }

  const handleToggleUserStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ))
    setUnsavedChanges(true)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: <FiSettings /> },
    { id: 'users', label: 'User Management', icon: <FiUsers /> },
    { id: 'system', label: 'System', icon: <FiDatabase /> },
    { id: 'notifications', label: 'Notifications', icon: <FiBell /> },
    { id: 'integrations', label: 'Integrations', icon: <FiGlobe /> }
  ]

  const weekDays = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <ReceptionistHeader />

      <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">System Settings</h2>
          
          {unsavedChanges && (
            <div className="flex items-center space-x-4">
              <span className="text-orange-600 text-sm">You have unsaved changes</span>
              <button 
                onClick={handleSaveChanges}
                className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FiSave className="text-sm" />
                <span>Save All Changes</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors whitespace-nowrap ${
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
            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <div className="space-y-8">
                {/* Clinic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiSettings className="text-[#4DB6B0]" />
                    <span>Clinic Information</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Name</label>
                      <input
                        type="text"
                        value={generalSettings.clinicName}
                        onChange={(e) => handleGeneralChange('clinicName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={generalSettings.phone}
                          onChange={(e) => handleGeneralChange('phone', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        value={generalSettings.address}
                        onChange={(e) => handleGeneralChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={generalSettings.email}
                          onChange={(e) => handleGeneralChange('email', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <div className="relative">
                        <FiGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="url"
                          value={generalSettings.website}
                          onChange={(e) => handleGeneralChange('website', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Localization */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Localization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select
                        value={generalSettings.timezone}
                        onChange={(e) => handleGeneralChange('timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select
                        value={generalSettings.language}
                        onChange={(e) => handleGeneralChange('language', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select
                        value={generalSettings.currency}
                        onChange={(e) => handleGeneralChange('currency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiClock className="text-[#4DB6B0]" />
                    <span>Working Hours</span>
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <input
                          type="time"
                          value={generalSettings.workingHours.start}
                          onChange={(e) => handleGeneralChange('workingHours.start', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                        <input
                          type="time"
                          value={generalSettings.workingHours.end}
                          onChange={(e) => handleGeneralChange('workingHours.end', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Working Days</label>
                      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                        {weekDays.map((day) => (
                          <label key={day.key} className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={generalSettings.workingHours.days.includes(day.key)}
                              onChange={() => handleWorkingDayToggle(day.key)}
                              className="w-4 h-4 text-[#4DB6B0] border-gray-300 rounded focus:ring-[#4DB6B0]"
                            />
                            <span className="text-sm text-gray-700">{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                    <FiUsers className="text-[#4DB6B0]" />
                    <span>User Management</span>
                  </h3>
                  <button 
                    onClick={() => setShowAddUser(true)}
                    className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <FiPlus className="text-sm" />
                    <span>Add User</span>
                  </button>
                </div>

                {/* Users Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white text-sm font-bold">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.lastLogin}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button 
                                onClick={() => handleToggleUserStatus(user.id)}
                                className="text-[#4DB6B0] hover:text-[#5ACCC3]"
                              >
                                <FiEdit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Roles & Permissions */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Role Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-2">Receptionist</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Manage appointments</li>
                        <li>• Register patients</li>
                        <li>• Handle messages</li>
                        <li>• View basic reports</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-2">Doctor</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Access patient records</li>
                        <li>• Create prescriptions</li>
                        <li>• Schedule procedures</li>
                        <li>• View medical reports</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-2">Admin</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Full system access</li>
                        <li>• User management</li>
                        <li>• System settings</li>
                        <li>• All reports</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'system' && (
              <div className="space-y-8">
                {/* Security Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiShield className="text-[#4DB6B0]" />
                    <span>Security & Access</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={systemSettings.sessionTimeout}
                        onChange={(e) => handleSystemChange('sessionTimeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                      <input
                        type="number"
                        value={systemSettings.maxLoginAttempts}
                        onChange={(e) => handleSystemChange('maxLoginAttempts', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {Object.entries({
                      allowRemoteAccess: 'Allow Remote Access',
                      enableAuditLog: 'Enable Audit Logging',
                      autoUpdates: 'Automatic Updates'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <span className="text-sm text-gray-700">{label}</span>
                        <input
                          type="checkbox"
                          checked={systemSettings[key]}
                          onChange={(e) => handleSystemChange(key, e.target.checked)}
                          className="w-4 h-4 text-[#4DB6B0] border-gray-300 rounded focus:ring-[#4DB6B0]"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Backup Settings */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiHardDrive className="text-[#4DB6B0]" />
                    <span>Backup & Data</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                      <select
                        value={systemSettings.backupFrequency}
                        onChange={(e) => handleSystemChange('backupFrequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention</label>
                      <select
                        value={systemSettings.dataRetention}
                        onChange={(e) => handleSystemChange('dataRetention', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="1year">1 Year</option>
                        <option value="3years">3 Years</option>
                        <option value="5years">5 Years</option>
                        <option value="7years">7 Years</option>
                        <option value="indefinite">Indefinite</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-4">
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <FiDownload className="text-sm" />
                      <span>Create Backup Now</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <FiUpload className="text-sm" />
                      <span>Restore from Backup</span>
                    </button>
                  </div>

                  <div className="mt-6">
                    <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-700">Enable Automatic Backup</span>
                      <input
                        type="checkbox"
                        checked={systemSettings.autoBackup}
                        onChange={(e) => handleSystemChange('autoBackup', e.target.checked)}
                        className="w-4 h-4 text-[#4DB6B0] border-gray-300 rounded focus:ring-[#4DB6B0]"
                      />
                    </label>
                  </div>
                </div>

                {/* System Monitoring */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiActivity className="text-[#4DB6B0]" />
                    <span>System Monitoring</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800">Server Status</span>
                        <FiCheck className="text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-800">Online</div>
                      <div className="text-xs text-green-600">Uptime: 99.9%</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">Database</span>
                        <FiDatabase className="text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-800">Active</div>
                      <div className="text-xs text-blue-600">Response: 45ms</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-yellow-800">Storage</span>
                        <FiHardDrive className="text-yellow-600" />
                      </div>
                      <div className="text-2xl font-bold text-yellow-800">78%</div>
                      <div className="text-xs text-yellow-600">156GB / 200GB</div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {Object.entries({
                      maintenanceMode: 'Maintenance Mode',
                      debugMode: 'Debug Mode'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-700">{label}</span>
                          {key === 'maintenanceMode' && (
                            <FiAlertTriangle className="text-orange-500 text-sm" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={systemSettings[key]}
                          onChange={(e) => handleSystemChange(key, e.target.checked)}
                          className="w-4 h-4 text-[#4DB6B0] border-gray-300 rounded focus:ring-[#4DB6B0]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-8">
                {/* General Notification Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiBell className="text-[#4DB6B0]" />
                    <span>Notification Settings</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {Object.entries({
                      emailNotifications: 'Email Notifications',
                      smsNotifications: 'SMS Notifications',
                      appointmentReminders: 'Appointment Reminders',
                      systemAlerts: 'System Alerts',
                      emergencyNotifications: 'Emergency Notifications',
                      marketingEmails: 'Marketing Emails'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          {key === 'emailNotifications' && <FiMail className="text-gray-600" />}
                          {key === 'smsNotifications' && <FiPhone className="text-gray-600" />}
                          {key === 'appointmentReminders' && <FiClock className="text-gray-600" />}
                          {key === 'systemAlerts' && <FiMonitor className="text-gray-600" />}
                          {key === 'emergencyNotifications' && <FiAlertTriangle className="text-red-500" />}
                          {key === 'marketingEmails' && <FiMail className="text-gray-600" />}
                          <span className="text-sm text-gray-700">{label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationSettings[key]}
                          onChange={(e) => handleNotificationChange(key, e.target.checked)}
                          className="w-4 h-4 text-[#4DB6B0] border-gray-300 rounded focus:ring-[#4DB6B0]"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Timing Settings */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Timing Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Reminder Time (hours before)</label>
                      <input
                        type="number"
                        value={notificationSettings.reminderTime}
                        onChange={(e) => handleNotificationChange('reminderTime', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Escalation Time (minutes)</label>
                      <input
                        type="number"
                        value={notificationSettings.escalationTime}
                        onChange={(e) => handleNotificationChange('escalationTime', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Template Settings */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Message Templates</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-2">Appointment Reminder</h4>
                      <textarea
                        rows="3"
                        placeholder="Dear [PATIENT_NAME], this is a reminder for your appointment on [DATE] at [TIME] with [DOCTOR]."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-2">Appointment Confirmation</h4>
                      <textarea
                        rows="3"
                        placeholder="Your appointment has been confirmed for [DATE] at [TIME]. Please arrive 15 minutes early."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-8">
                {/* Email Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiMail className="text-[#4DB6B0]" />
                    <span>Email Configuration</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Server</label>
                      <input
                        type="text"
                        value={integrationSettings.emailServer}
                        onChange={(e) => handleIntegrationChange('emailServer', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                      <input
                        type="text"
                        value={integrationSettings.emailPort}
                        onChange={(e) => handleIntegrationChange('emailPort', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Security</label>
                      <select
                        value={integrationSettings.emailSecurity}
                        onChange={(e) => handleIntegrationChange('emailSecurity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="none">None</option>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button className="w-full bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg transition-colors">
                        Test Connection
                      </button>
                    </div>
                  </div>
                </div>

                {/* Third-Party Integrations */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <FiGlobe className="text-[#4DB6B0]" />
                    <span>Third-Party Integrations</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SMS Provider</label>
                      <select
                        value={integrationSettings.smsProvider}
                        onChange={(e) => handleIntegrationChange('smsProvider', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="twilio">Twilio</option>
                        <option value="nexmo">Nexmo</option>
                        <option value="messagebird">MessageBird</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Gateway</label>
                      <select
                        value={integrationSettings.paymentGateway}
                        onChange={(e) => handleIntegrationChange('paymentGateway', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      >
                        <option value="stripe">Stripe</option>
                        <option value="paypal">PayPal</option>
                        <option value="square">Square</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* API Integrations */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">API Integrations</h3>
                  
                  <div className="space-y-4">
                    {Object.entries({
                      insuranceApi: 'Insurance Verification API',
                      labIntegration: 'Laboratory Integration',
                      pharmacyIntegration: 'Pharmacy Integration'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            integrationSettings[key] === 'enabled' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={integrationSettings[key]}
                            onChange={(e) => handleIntegrationChange(key, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                          >
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                          </select>
                          <button className="px-3 py-1 text-sm text-[#4DB6B0] hover:text-[#5ACCC3] border border-[#4DB6B0] rounded hover:bg-[#4DB6B0] hover:text-white transition-colors">
                            Configure
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webhook Configuration */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Webhook Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                      <input
                        type="url"
                        placeholder="https://your-system.com/webhook"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                      <input
                        type="password"
                        placeholder="Enter webhook secret"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                      />
                    </div>
                    <button className="bg-[#4DB6B0] hover:bg-[#5ACCC3] text-white px-4 py-2 rounded-lg transition-colors">
                      Test Webhook
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
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2">
                  <FiRefreshCw className="text-sm" />
                  <span>Refresh Settings</span>
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
                  <span>Save All Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="mt-8 bg-white rounded-xl shadow border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
              <FiDownload className="text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
              <span className="text-sm font-medium block">Export Settings</span>
            </button>
            <button className="p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
              <FiUpload className="text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
              <span className="text-sm font-medium block">Import Settings</span>
            </button>
            <button className="p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
              <FiRefreshCw className="text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
              <span className="text-sm font-medium block">Reset System</span>
            </button>
            <button className="p-4 rounded-lg border border-gray-200 hover:border-[#4DB6B0] hover:bg-[#4DB6B0] hover:text-white transition-colors group">
              <FiActivity className="text-2xl mb-2 text-[#4DB6B0] group-hover:text-white mx-auto" />
              <span className="text-sm font-medium block">System Logs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceptionSettings