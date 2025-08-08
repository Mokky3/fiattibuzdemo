import React, { useState } from 'react'
import Navbar from './Navbar'
import { 
  Bell, Lock, Globe, Eye, EyeOff, Smartphone, Mail, 
  MessageSquare, Calendar, Shield, Moon, Sun, Volume2,
  ChevronRight, Save, AlertCircle, Check, X, Key,
  UserCheck, Clock, Download, Trash2, LogOut
} from 'lucide-react'

const PatientSettings = () => {
  const [activeTab, setActiveTab] = useState('notifications')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  
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
  
  // Security settings
  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: '30',
    deviceManagement: true,
    passwordStrength: 'strong'
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

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="h-4 w-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Globe className="h-4 w-4" /> }
  ]

  const handleSave = async () => {
    setLoading(true)
    setSaveStatus('')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setSaveStatus('error')
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

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Visibility</h3>
        
        <div className="space-y-3">
          {[
            { value: 'private', label: 'Private', desc: 'Only you can see your profile' },
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Sharing & Privacy</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Share Health Data with Providers</p>
              <p className="text-sm text-gray-500">Allow healthcare providers to access your medical history</p>
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
              <p className="text-sm text-gray-500">Track login history and app usage for security</p>
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

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Management</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention Period</label>
            <select
              value={privacy.dataRetention}
              onChange={(e) => setPrivacy({ ...privacy, dataRetention: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
            >
              <option value="1year">1 Year</option>
              <option value="3years">3 Years</option>
              <option value="5years">5 Years</option>
              <option value="10years">10 Years</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Download My Data
            </button>
            <button className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </button>
          </div>
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
          
          <button className="px-6 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors">
            Update Password
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
              onClick={() => setSecurity({ ...security, twoFactor: !security.twoFactor })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
              onClick={() => setSecurity({ ...security, loginAlerts: !security.loginAlerts })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
              onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
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

      {/* Active Sessions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Sessions</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Smartphone className="h-5 w-5 mr-3 text-gray-600" />
              <div>
                <p className="font-medium text-gray-700">iPhone 13 Pro</p>
                <p className="text-sm text-gray-500">Tashkent, UZ • Current session</p>
              </div>
            </div>
            <span className="text-xs text-emerald-600 font-medium">Active now</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Globe className="h-5 w-5 mr-3 text-gray-600" />
              <div>
                <p className="font-medium text-gray-700">Chrome on Windows</p>
                <p className="text-sm text-gray-500">Tashkent, UZ • Last active 2 hours ago</p>
              </div>
            </div>
            <button className="text-sm text-red-600 hover:text-red-700">
              End Session
            </button>
          </div>
        </div>
        
        <button className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium">
          Sign Out All Other Sessions
        </button>
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

      {/* Accessibility */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Volume2 className="h-5 w-5 mr-2 text-emerald-500" />
          Accessibility
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Sound Effects</p>
              <p className="text-sm text-gray-500">Play sounds for notifications and actions</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, soundEnabled: !preferences.soundEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.soundEnabled ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-700">Auto-play Videos</p>
              <p className="text-sm text-gray-500">Automatically play educational videos</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, autoPlayVideos: !preferences.autoPlayVideos })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.autoPlayVideos ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.autoPlayVideos ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
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