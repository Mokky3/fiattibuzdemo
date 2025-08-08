import React, { useState, useEffect } from 'react';
import { Search, Filter, User, Settings, Bell, Shield, Key, Camera, Edit, Save, X, Check, Mail, Phone, MapPin, Calendar, Award, Activity, Clock, Download } from 'lucide-react';
// Import the header component
import LabHeader from './header';

const LabProfileModule = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profileData, setProfileData] = useState({
    // Personal Information
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@labportal.com',
    phone: '+1 (555) 123-4567',
    address: '123 Medical Center Drive',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    dateOfBirth: '1985-03-15',
    
    // Professional Information
    employeeId: 'LT-001',
    position: 'Senior Lab Technician',
    department: 'Clinical Laboratory',
    supervisor: 'Dr. Sarah Johnson',
    hireDate: '2020-06-15',
    certification: 'Medical Laboratory Technician (MLT)',
    licenseNumber: 'MLT-NY-12345',
    licenseExpiry: '2026-03-15',
    
    // Contact Preferences
    emailNotifications: true,
    smsNotifications: false,
    criticalAlerts: true,
    weeklyReports: true,
    systemUpdates: false,
    
    // Security Settings
    twoFactorAuth: true,
    sessionTimeout: 30,
    loginAlerts: true,
    
    // Display Preferences
    theme: 'light',
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour'
  });

  const [tempProfileData, setTempProfileData] = useState(profileData);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Activity data
  const [activityData] = useState([
    {
      id: 1,
      action: 'Generated Weekly Statistics Report',
      timestamp: '2025-06-28 14:30',
      type: 'report',
      details: 'Weekly Lab Statistics Report (RPT-001)'
    },
    {
      id: 2,
      action: 'Updated Order Status',
      timestamp: '2025-06-28 11:45',
      type: 'order',
      details: 'Order LO-003 marked as completed'
    },
    {
      id: 3,
      action: 'Processed Test Results',
      timestamp: '2025-06-28 09:15',
      type: 'test',
      details: 'Blood glucose results entered for Patient P-047'
    },
    {
      id: 4,
      action: 'Login to System',
      timestamp: '2025-06-28 08:00',
      type: 'login',
      details: 'Successful login from IP: 192.168.1.100'
    },
    {
      id: 5,
      action: 'Changed Password',
      timestamp: '2025-06-25 16:20',
      type: 'security',
      details: 'Password successfully updated'
    }
  ]);

  // Statistics data
  const [statsData] = useState({
    totalOrders: 156,
    completedTests: 142,
    reportsGenerated: 23,
    avgProcessingTime: '2.3 hours',
    accuracy: '99.2%',
    thisWeek: {
      ordersProcessed: 28,
      reportsGenerated: 5,
      hoursWorked: 40
    },
    thisMonth: {
      ordersProcessed: 120,
      reportsGenerated: 18,
      hoursWorked: 160
    }
  });

  const handleSaveProfile = () => {
    setProfileData(tempProfileData);
    setIsEditing(false);
    // Here you would typically make an API call to save the data
  };

  const handleCancelEdit = () => {
    setTempProfileData(profileData);
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    // Here you would typically make an API call to change the password
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordForm(false);
    alert('Password changed successfully');
  };

  const ProfileSection = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveProfile}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center space-x-6 mb-8">
        <div className="relative">
          <div className="w-24 h-24 bg-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profileData.firstName[0]}{profileData.lastName[0]}
          </div>
          {isEditing && (
            <button className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-2 hover:bg-gray-50">
              <Camera className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {profileData.firstName} {profileData.lastName}
          </h3>
          <p className="text-gray-600">{profileData.position}</p>
          <p className="text-sm text-gray-500">{profileData.department}</p>
          <p className="text-sm text-gray-500">Employee ID: {profileData.employeeId}</p>
        </div>
      </div>

      {/* Personal Information */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Personal Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              value={tempProfileData.firstName}
              onChange={(e) => setTempProfileData({...tempProfileData, firstName: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              value={tempProfileData.lastName}
              onChange={(e) => setTempProfileData({...tempProfileData, lastName: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={tempProfileData.email}
              onChange={(e) => setTempProfileData({...tempProfileData, email: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={tempProfileData.phone}
              onChange={(e) => setTempProfileData({...tempProfileData, phone: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={tempProfileData.address}
              onChange={(e) => setTempProfileData({...tempProfileData, address: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={tempProfileData.city}
              onChange={(e) => setTempProfileData({...tempProfileData, city: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              type="text"
              value={tempProfileData.state}
              onChange={(e) => setTempProfileData({...tempProfileData, state: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Professional Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <input
              type="text"
              value={tempProfileData.position}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <input
              type="text"
              value={tempProfileData.department}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Supervisor</label>
            <input
              type="text"
              value={tempProfileData.supervisor}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hire Date</label>
            <input
              type="date"
              value={tempProfileData.hireDate}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certification</label>
            <input
              type="text"
              value={tempProfileData.certification}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
            <input
              type="text"
              value={tempProfileData.licenseNumber}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsSection = () => (
    <div className="space-y-6">
      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Notification Preferences
        </h3>
        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
            { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS' },
            { key: 'criticalAlerts', label: 'Critical Alerts', description: 'Get notified of critical test results' },
            { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly performance reports' },
            { key: 'systemUpdates', label: 'System Updates', description: 'Get notified about system updates' }
          ].map(setting => (
            <div key={setting.key} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{setting.label}</div>
                <div className="text-sm text-gray-500">{setting.description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profileData[setting.key]}
                  onChange={(e) => setProfileData({...profileData, [setting.key]: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Display Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            <select
              value={profileData.theme}
              onChange={(e) => setProfileData({...profileData, theme: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={profileData.language}
              onChange={(e) => setProfileData({...profileData, language: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={profileData.timezone}
              onChange={(e) => setProfileData({...profileData, timezone: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
            <select
              value={profileData.dateFormat}
              onChange={(e) => setProfileData({...profileData, dateFormat: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const SecuritySection = () => (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Password & Security
        </h3>
        
        {!showPasswordForm ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Password</div>
              <div className="text-sm text-gray-500">Last changed 3 days ago</div>
            </div>
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Change Password
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePasswordChange}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Update Password
              </button>
              <button
                onClick={() => setShowPasswordForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Security Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Two-Factor Authentication</div>
              <div className="text-sm text-gray-500">Add an extra layer of security to your account</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profileData.twoFactorAuth}
                onChange={(e) => setProfileData({...profileData, twoFactorAuth: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Login Alerts</div>
              <div className="text-sm text-gray-500">Get notified when someone logs into your account</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profileData.loginAlerts}
                onChange={(e) => setProfileData({...profileData, loginAlerts: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
            <select
              value={profileData.sessionTimeout}
              onChange={(e) => setProfileData({...profileData, sessionTimeout: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const ActivitySection = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {activityData.map(activity => (
          <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {activity.type === 'report' && <FileText className="w-5 h-5 text-blue-500" />}
              {activity.type === 'order' && <Activity className="w-5 h-5 text-green-500" />}
              {activity.type === 'test' && <Check className="w-5 h-5 text-purple-500" />}
              {activity.type === 'login' && <User className="w-5 h-5 text-gray-500" />}
              {activity.type === 'security' && <Shield className="w-5 h-5 text-red-500" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{activity.action}</div>
              <div className="text-sm text-gray-600">{activity.details}</div>
              <div className="text-xs text-gray-500">{activity.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const StatisticsSection = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{statsData.totalOrders}</div>
          <div className="text-sm text-gray-600">Total Orders Processed</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{statsData.completedTests}</div>
          <div className="text-sm text-gray-600">Tests Completed</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{statsData.reportsGenerated}</div>
          <div className="text-sm text-gray-600">Reports Generated</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Processing Time</span>
              <span className="font-semibold text-gray-900">{statsData.avgProcessingTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Accuracy Rate</span>
              <span className="font-semibold text-green-600">{statsData.accuracy}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">This Week</div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Orders Processed:</span>
                  <span className="font-medium">{statsData.thisWeek.ordersProcessed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reports Generated:</span>
                  <span className="font-medium">{statsData.thisWeek.reportsGenerated}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hours Worked:</span>
                  <span className="font-medium">{statsData.thisWeek.hoursWorked}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">This Month</div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Orders Processed:</span>
                  <span className="font-medium">{statsData.thisMonth.ordersProcessed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reports Generated:</span>
                  <span className="font-medium">{statsData.thisMonth.reportsGenerated}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hours Worked:</span>
                  <span className="font-medium">{statsData.thisMonth.hoursWorked}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <LabHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Profile Summary */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  {profileData.firstName[0]}{profileData.lastName[0]}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {profileData.firstName} {profileData.lastName}
                </h3>
                <p className="text-gray-600">{profileData.position}</p>
                <p className="text-sm text-gray-500">{profileData.employeeId}</p>
              </div>

              {/* Quick Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{profileData.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{profileData.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{profileData.city}, {profileData.state}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Joined {profileData.hireDate}</span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'security', label: 'Security', icon: Shield },
                  { id: 'activity', label: 'Activity', icon: Activity },
                  { id: 'statistics', label: 'Statistics', icon: Award }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-teal-100 text-teal-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && <ProfileSection />}
            {activeTab === 'settings' && <SettingsSection />}
            {activeTab === 'security' && <SecuritySection />}
            {activeTab === 'activity' && <ActivitySection />}
            {activeTab === 'statistics' && <StatisticsSection />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabProfileModule;