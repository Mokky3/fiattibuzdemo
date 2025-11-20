import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, User, Bell, Shield, Key, Camera, Edit, Save, X, Check, Mail, Phone, MapPin, Calendar, Clock, Download, Settings, Wrench } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getProfile, updateProfile, patchProfile, changePassword } from '../../services/labService';

const LabProfileModule = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profileData, setProfileData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    
    // Professional Information
    employeeId: '',
    position: '',
    department: '',
    supervisor: '',
    hireDate: '',
    certification: '',
    licenseNumber: '',
    licenseExpiry: '',
    
    // Contact Preferences
    emailNotifications: true,
    smsNotifications: false,
    criticalAlerts: true,
    weeklyReports: true,
    systemUpdates: false,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginAlerts: true,
    
    // Display Preferences
    theme: 'light',
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour'
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tempProfileData, setTempProfileData] = useState(profileData);
  
  // Track security settings changes
  const [securitySettingsChanged, setSecuritySettingsChanged] = useState(false);
  const [originalSecuritySettings, setOriginalSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: 30
  });
  
  // Fetch profile data from backend
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await getProfile();
        if (active && response.data) {
          setProfileData(response.data.profileData);
          setTempProfileData(response.data.profileData);
          // Update original security settings when profile is loaded
          setOriginalSecuritySettings({
            twoFactorAuth: response.data.profileData.twoFactorAuth || false,
            loginAlerts: response.data.profileData.loginAlerts !== undefined ? response.data.profileData.loginAlerts : true,
            sessionTimeout: response.data.profileData.sessionTimeout || 30
          });
          setSecuritySettingsChanged(false);
        }
      } catch (e) {
        console.error('Error loading profile:', e);
        if (active) setError('Failed to load profile data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, []);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      // Make API call to save the data
      const response = await patchProfile(tempProfileData);
      // Update local state with the response from backend
      if (response?.data?.profileData) {
        setProfileData(response.data.profileData);
        setTempProfileData(response.data.profileData);
        // Update original security settings when profile is loaded
        setOriginalSecuritySettings({
          twoFactorAuth: response.data.profileData.twoFactorAuth || false,
          loginAlerts: response.data.profileData.loginAlerts !== undefined ? response.data.profileData.loginAlerts : true,
          sessionTimeout: response.data.profileData.sessionTimeout || 30
        });
        setSecuritySettingsChanged(false);
      } else {
        // Fallback: use tempProfileData if response structure is different
      setProfileData(tempProfileData);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setTempProfileData(profileData);
    setIsEditing(false);
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      );
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordForm(false);
      // Show success message (you could use a toast notification here)
    alert('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.message || 'Failed to change password. Please check your current password.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const ProfileSection = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                setError(null);
              }}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveProfile}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save'}
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
            {profileData.firstName?.[0] || 'L'}{profileData.lastName?.[0] || 'T'}
          </div>
          {isEditing && (
            <button className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-2 hover:bg-gray-50">
              <Camera className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {profileData.firstName || 'Lab'} {profileData.lastName || 'Technician'}
          </h3>
          <p className="text-gray-600">{profileData.position || 'Lab Technician'}</p>
          <p className="text-sm text-gray-500">{profileData.department || 'Clinical Laboratory'}</p>
          <p className="text-sm text-gray-500">Employee ID: {profileData.employeeId || 'N/A'}</p>
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
              onChange={(e) => setTempProfileData({...tempProfileData, hireDate: e.target.value})}
              disabled={!isEditing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
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


  const handleSecuritySettingChange = (field, value) => {
    // Update local state immediately for better UX
    const updatedData = { ...profileData, [field]: value };
    setProfileData(updatedData);
    
    // Check if security settings have changed from original
    const newSecuritySettings = {
      ...originalSecuritySettings,
      [field]: value
    };
    
    const hasChanged = 
      newSecuritySettings.twoFactorAuth !== originalSecuritySettings.twoFactorAuth ||
      newSecuritySettings.loginAlerts !== originalSecuritySettings.loginAlerts ||
      newSecuritySettings.sessionTimeout !== originalSecuritySettings.sessionTimeout;
    
    setSecuritySettingsChanged(hasChanged);
  };

  const handleSaveSecuritySettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare security settings to save
      const securityUpdates = {
        twoFactorAuth: profileData.twoFactorAuth,
        loginAlerts: profileData.loginAlerts,
        sessionTimeout: profileData.sessionTimeout
      };
      
      // Save to backend
      const response = await patchProfile(securityUpdates);
      if (response?.data?.profileData) {
        setProfileData(response.data.profileData);
        // Update original settings after successful save
        setOriginalSecuritySettings({
          twoFactorAuth: response.data.profileData.twoFactorAuth || false,
          loginAlerts: response.data.profileData.loginAlerts !== undefined ? response.data.profileData.loginAlerts : true,
          sessionTimeout: response.data.profileData.sessionTimeout || 30
        });
        setSecuritySettingsChanged(false);
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
      setError('Failed to save security settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSecuritySettings = () => {
    // Revert to original security settings
    const revertedData = {
      ...profileData,
      twoFactorAuth: originalSecuritySettings.twoFactorAuth,
      loginAlerts: originalSecuritySettings.loginAlerts,
      sessionTimeout: originalSecuritySettings.sessionTimeout
    };
    setProfileData(revertedData);
    setSecuritySettingsChanged(false);
    setError(null);
  };

  // Memoize password change handlers to prevent recreation on each render
  const handleCurrentPasswordChange = useCallback((e) => {
    setPasswordData(prev => ({...prev, currentPassword: e.target.value}));
  }, []);

  const handleNewPasswordChange = useCallback((e) => {
    setPasswordData(prev => ({...prev, newPassword: e.target.value}));
  }, []);

  const handleConfirmPasswordChange = useCallback((e) => {
    setPasswordData(prev => ({...prev, confirmPassword: e.target.value}));
  }, []);

  const handleShowPasswordForm = useCallback(() => {
    setShowPasswordForm(true);
    setError(null);
  }, []);

  const handleCancelPasswordForm = useCallback(() => {
    setShowPasswordForm(false);
    setError(null);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  }, []);

  const SecuritySection = (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
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
              onClick={handleShowPasswordForm}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors"
              disabled={loading}
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
                onChange={handleCurrentPasswordChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={handleNewPasswordChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePasswordChange}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
              <button
                onClick={handleCancelPasswordForm}
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
                onChange={(e) => handleSecuritySettingChange('twoFactorAuth', e.target.checked)}
                disabled={loading}
                className="sr-only peer disabled:opacity-50"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500 disabled:opacity-50"></div>
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
                onChange={(e) => handleSecuritySettingChange('loginAlerts', e.target.checked)}
                disabled={loading}
                className="sr-only peer disabled:opacity-50"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500 disabled:opacity-50"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
            <select
              value={profileData.sessionTimeout}
              onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
          
          {/* Save/Cancel buttons - only show when changes are made */}
          {securitySettingsChanged && (
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancelSecuritySettings}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSecuritySettings}
                disabled={loading}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
              {/* Profile Summary */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                {profileData.firstName?.[0] || 'L'}{profileData.lastName?.[0] || 'T'}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                {profileData.firstName || 'Lab'} {profileData.lastName || 'Technician'}
                </h3>
              <p className="text-gray-600">{profileData.position || 'Lab Technician'}</p>
              <p className="text-sm text-gray-500">{profileData.employeeId || 'N/A'}</p>
              </div>

              {/* Quick Info */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 truncate">{profileData.email || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{profileData.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 truncate">
                  {profileData.city || 'N/A'}{profileData.state ? `, ${profileData.state}` : ''}
                </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {profileData.hireDate ? `Joined ${profileData.hireDate}` : 'N/A'}
                </span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
              {[
                  { id: 'profile', label: 'Profile', icon: User },
                { id: 'security', label: 'Security', icon: Shield }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                        ? 'bg-teal-100 text-teal-700 border-l-4 border-teal-500'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              {/* Locked/Disabled Modules */}
              {[
                { id: 'settings', label: 'Settings', icon: Settings, locked: true },
                { id: 'notifications', label: 'Notifications', icon: Bell, locked: true },
                { id: 'equipment', label: 'Equipment', icon: Wrench, locked: true }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left opacity-50 cursor-not-allowed relative"
                    title="This module is locked and unavailable"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">{item.label}</span>
                    <span className="ml-auto text-xs text-gray-400">🔒</span>
                  </div>
                );
              })}
              </nav>
            </div>
          </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'profile' && <ProfileSection />}
            {activeTab === 'security' && <SecuritySection />}
            {/* Locked modules - show message if somehow accessed */}
            {(activeTab === 'settings' || activeTab === 'notifications' || activeTab === 'equipment') && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Module Locked</h2>
                <p className="text-gray-600 mb-4">
                  The {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} module is currently locked and unavailable.
                </p>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Return to Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabProfileModule;