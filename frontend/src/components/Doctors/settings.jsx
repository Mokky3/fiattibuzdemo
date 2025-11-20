import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { doctorsAPI, doctorSettingsAPI } from '../../services/apiService';
import {
  FiUser, FiBell, FiLock, FiCalendar, FiCamera,
  FiMail, FiSmartphone, FiToggleRight, FiToggleLeft,
  FiAlertCircle, FiSave
} from 'react-icons/fi';

const DoctorSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    organization: '',
    bio: '',
    address: '',
    profileImage: null
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    patientMessages: true,
    systemUpdates: true,
    marketingEmails: false,
    reminderTiming: '1hour'
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: '30',
    passwordExpiryDays: 90,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    requireStrongPassword: true,
    sessionConcurrencyLimit: 3
  });

  const [availability, setAvailability] = useState({
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    lunchBreak: {
      enabled: true,
      start: '12:00',
      end: '13:00'
    },
    consultationDuration: '30',
    bufferTime: '10'
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <FiUser /> },
    { id: 'notifications', label: 'Notifications', icon: <FiBell /> },
    { id: 'security', label: 'Security', icon: <FiLock /> },
    { id: 'availability', label: 'Availability', icon: <FiCalendar /> }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prof, settings] = await Promise.all([
          doctorsAPI.getProfile().catch(() => null),
          doctorSettingsAPI.getSettings().catch(() => null)
        ])

        if (prof) {
          // Extract data from wrapped response
          const profileData = prof.data || prof
          setProfile({
            fullName: profileData.fullName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            specialty: profileData.specialty || '',
            licenseNumber: profileData.licenseNumber || '',
            organization: profileData.organization || '',
            bio: profileData.bio || '',
            address: profileData.address || '',
            profileImage: profileData.profileImage || null,
          })
        }

        if (settings) {
          setNotifications(settings.notifications || notifications)
          // Remove password fields from security settings
          const { currentPassword, newPassword, confirmPassword, ...cleanSecurity } = settings.security || security
          setSecurity(cleanSecurity)
          setAvailability(settings.availability || availability)
        }
      } catch (err) {
        console.error('Error fetching settings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSaveProfile = async () => {
    setLoading(true);
    setSaveStatus('');
    try {
      await doctorsAPI.updateProfile(profile)
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true)
    setSaveStatus('')
    try {
      await doctorSettingsAPI.saveNotifications(notifications)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      console.error('Error saving notifications:', err)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSecurity = async () => {
    setLoading(true)
    setSaveStatus('')
    try {
      await doctorSettingsAPI.saveSecurity(security)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      console.error('Error saving security:', err)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAvailability = async () => {
    setLoading(true)
    setSaveStatus('')
    try {
      await doctorSettingsAPI.saveAvailability(availability)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      console.error('Error saving availability:', err)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>

        <div className="flex items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white text-3xl font-bold">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                (profile.fullName || 'MH').split(' ').map(word => word[0]).join('')
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50">
              <FiCamera className="text-gray-600" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="ml-6">
            <p className="text-sm text-gray-600">Upload a profile picture</p>
            <p className="text-xs text-gray-400">JPG, PNG. Max size 2MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
            <select
              value={profile.specialty}
              onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3]"
            >
              <option value="">Select specialty</option>
              <option value="Psychiatry">Psychiatry</option>
              <option value="Psychology">Psychology</option>
              <option value="General Practice">General Practice</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Pediatrics">Pediatrics</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
            <input
              type="text"
              value={profile.licenseNumber}
              onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={profile.organization}
              onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] resize-none"
              placeholder="Tell patients about your experience and specializations..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg font-medium hover:bg-[#4BB5AC] transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {saveStatus === 'success' && (
          <p className="mt-2 text-green-600 text-sm">Profile saved successfully.</p>
        )}
        {saveStatus === 'error' && (
          <p className="mt-2 text-red-600 text-sm">Failed to save profile. Please try again.</p>
        )}
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center">
              <FiMail className="text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-700">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, emailNotifications: !notifications.emailNotifications })}
              className="text-4xl"
            >
              {notifications.emailNotifications ? 
                <FiToggleRight className="text-[#5ACCC3]" /> : 
                <FiToggleLeft className="text-gray-400" />
              }
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center">
              <FiSmartphone className="text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-700">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via SMS</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, smsNotifications: !notifications.smsNotifications })}
              className="text-4xl"
            >
              {notifications.smsNotifications ? 
                <FiToggleRight className="text-[#5ACCC3]" /> : 
                <FiToggleLeft className="text-gray-400" />
              }
            </button>
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-3">Notification Types</h4>
            
            {[
              { key: 'appointmentReminders', label: 'Appointment Reminders', desc: 'Get reminded about upcoming appointments' },
              { key: 'patientMessages', label: 'Patient Messages', desc: 'Notifications for new patient messages' },
              { key: 'systemUpdates', label: 'System Updates', desc: 'Important system and feature updates' },
              { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Promotional content and newsletters' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-700">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                  className="text-3xl"
                >
                  {notifications[item.key] ? 
                    <FiToggleRight className="text-[#5ACCC3]" /> : 
                    <FiToggleLeft className="text-gray-400" />
                  }
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Reminder Timing</label>
            <select
              value={notifications.reminderTiming}
              onChange={(e) => setNotifications({ ...notifications, reminderTiming: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            >
              <option value="15min">15 minutes before</option>
              <option value="30min">30 minutes before</option>
              <option value="1hour">1 hour before</option>
              <option value="2hours">2 hours before</option>
              <option value="1day">1 day before</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveNotifications}
            disabled={loading}
            className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg font-medium hover:bg-[#4BB5AC] transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <button
              onClick={() => setSecurity({ ...security, twoFactorEnabled: !security.twoFactorEnabled })}
              className="text-4xl"
            >
              {security.twoFactorEnabled ? 
                <FiToggleRight className="text-[#5ACCC3]" /> : 
                <FiToggleLeft className="text-gray-400" />
              }
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Login Alerts</p>
              <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
            </div>
            <button
              onClick={() => setSecurity({ ...security, loginAlerts: !security.loginAlerts })}
              className="text-4xl"
            >
              {security.loginAlerts ? 
                <FiToggleRight className="text-[#5ACCC3]" /> : 
                <FiToggleLeft className="text-gray-400" />
              }
            </button>
          </div>
          
          <div className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
            <select
              value={security.sessionTimeout}
              onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="0">Never</option>
            </select>
          </div>
          
          <div className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (Days)</label>
            <input
              type="number"
              value={security.passwordExpiryDays}
              onChange={(e) => setSecurity({ ...security, passwordExpiryDays: parseInt(e.target.value) })}
              min="30"
              max="365"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            />
          </div>
          
          <div className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Failed Login Attempts</label>
            <input
              type="number"
              value={security.maxFailedAttempts}
              onChange={(e) => setSecurity({ ...security, maxFailedAttempts: parseInt(e.target.value) })}
              min="3"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            />
          </div>
          
          <div className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Lockout Duration (Minutes)</label>
            <input
              type="number"
              value={security.lockoutDurationMinutes}
              onChange={(e) => setSecurity({ ...security, lockoutDurationMinutes: parseInt(e.target.value) })}
              min="5"
              max="60"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-700">Require Strong Password</p>
              <p className="text-sm text-gray-500">Enforce complex password requirements</p>
            </div>
            <button
              onClick={() => setSecurity({ ...security, requireStrongPassword: !security.requireStrongPassword })}
              className="text-4xl"
            >
              {security.requireStrongPassword ? 
                <FiToggleRight className="text-[#5ACCC3]" /> : 
                <FiToggleLeft className="text-gray-400" />
              }
            </button>
          </div>
          
          <div className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Concurrency Limit</label>
            <input
              type="number"
              value={security.sessionConcurrencyLimit}
              onChange={(e) => setSecurity({ ...security, sessionConcurrencyLimit: parseInt(e.target.value) })}
              min="1"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveAvailability}
            disabled={loading}
            className="px-6 py-2 bg-[#5ACCC3] text-white rounded-lg font-medium hover:bg-[#4BB5AC] transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  )

  const workingDaysOptions = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]

  const consultationDurations = ['15', '30', '45', '60']
  const bufferTimes = ['0', '5', '10', '15', '30']

  const renderAvailabilitySettings = () => (
    <div className="space-y-6">
      {/* Working Days */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Working Days</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {workingDaysOptions.map(day => (
            <label key={day} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={availability.workingDays.includes(day)}
                onChange={(e) => {
                  const updatedDays = e.target.checked
                    ? [...availability.workingDays, day]
                    : availability.workingDays.filter(d => d !== day)
                  setAvailability({ ...availability, workingDays: updatedDays })
                }}
                className="w-4 h-4 text-[#5ACCC3] rounded focus:ring-[#5ACCC3]"
              />
              <span className="ml-2 text-gray-700 capitalize">{day}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Working Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={availability.workingHours.start}
              onChange={(e) =>
                setAvailability({
                  ...availability,
                  workingHours: { ...availability.workingHours, start: e.target.value }
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={availability.workingHours.end}
              onChange={(e) =>
                setAvailability({
                  ...availability,
                  workingHours: { ...availability.workingHours, end: e.target.value }
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            />
          </div>
        </div>

        {/* Lunch Break */}
        <div className="mt-6">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={availability.lunchBreak.enabled}
              onChange={(e) =>
                setAvailability({
                  ...availability,
                  lunchBreak: { ...availability.lunchBreak, enabled: e.target.checked }
                })
              }
              className="w-4 h-4 text-[#5ACCC3] rounded focus:ring-[#5ACCC3]"
            />
            <label className="ml-2 text-gray-700">Enable Lunch Break</label>
          </div>

          {availability.lunchBreak.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lunch Start</label>
                <input
                  type="time"
                  value={availability.lunchBreak.start}
                  onChange={(e) =>
                    setAvailability({
                      ...availability,
                      lunchBreak: { ...availability.lunchBreak, start: e.target.value }
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lunch End</label>
                <input
                  type="time"
                  value={availability.lunchBreak.end}
                  onChange={(e) =>
                    setAvailability({
                      ...availability,
                      lunchBreak: { ...availability.lunchBreak, end: e.target.value }
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Duration</label>
            <select
              value={availability.consultationDuration}
              onChange={(e) => setAvailability({ ...availability, consultationDuration: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            >
              {consultationDurations.map(time => (
                <option key={time} value={time}>{time === '60' ? '1 hour' : `${time} minutes`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Time Between Appointments</label>
            <select
              value={availability.bufferTime}
              onChange={(e) => setAvailability({ ...availability, bufferTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5ACCC3] focus:border-transparent"
            >
              {bufferTimes.map(time => (
                <option key={time} value={time}>{time === '0' ? 'No buffer' : `${time} minutes`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
          Settings
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white shadow-md'
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
          {activeTab === 'profile' && renderProfileSettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'availability' && renderAvailabilitySettings()}
        </div>
        
        {/* Save Button */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {saveStatus === 'success' && (
              <div className="flex items-center text-green-600">
                <FiAlertCircle className="mr-2" />
                <span>Settings saved successfully!</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center text-red-600">
                <FiAlertCircle className="mr-2" />
                <span>Error saving settings. Please try again.</span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              if (activeTab === 'profile') return handleSaveProfile()
              if (activeTab === 'notifications') return handleSaveNotifications()
              if (activeTab === 'security') return handleSaveSecurity()
              if (activeTab === 'availability') return handleSaveAvailability()
            }}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DoctorSettings