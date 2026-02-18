import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, User, Bell, Shield, Key, Camera, Edit, Save, X, Check, Mail, Phone, MapPin, Calendar, Clock, Download, Settings, Wrench } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getProfile, updateProfile, patchProfile, changePassword } from '../../services/labService';

const LabProfileModule = () => {
  const { t } = useTranslation();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);
  
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
        if (active) setError(t('failedToLoadProfileData'));
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
      setError(t('failedToSaveProfileChanges'));
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
      setError(t('newPasswordsDoNotMatch'));
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError(t('newPasswordMustBeAtLeast8CharactersLong'));
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
    alert(t('passwordChangedSuccessfully'));
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.message || t('failedToChangePasswordPleaseCheckYourCurrentPassword');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const ProfileSection = () => (
    <div className={`rounded-lg border p-6 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-200'
    }`}>
      {/* Error Display */}
      {error && (
        <div className={`mb-4 border px-4 py-3 rounded-lg ${
          darkMode
            ? 'bg-red-900 bg-opacity-30 border-red-700 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-bold ${
          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
        }`}>{t('profileInformation')}</h2>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                setError(null);
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
              }`}
              disabled={loading}
            >
              <Edit className="w-4 h-4" />
              {t('editProfile')}
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveProfile}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? t('saving') : t('save')}
              </button>
              <button
                onClick={handleCancelEdit}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  darkMode
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                <X className="w-4 h-4" />
                {t('cancel')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center space-x-6 mb-8">
        <div className="relative">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
            darkMode ? 'bg-[#79CAC2]' : 'bg-teal-500'
          }`}>
            {profileData.firstName?.[0] || 'L'}{profileData.lastName?.[0] || 'T'}
          </div>
          {isEditing && (
            <button className={`absolute bottom-0 right-0 border rounded-full p-2 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037] hover:bg-[#133037]'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}>
              <Camera className={`w-4 h-4 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`} />
            </button>
          )}
        </div>
        <div>
          <h3 className={`text-xl font-semibold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>
            {profileData.firstName || t('lab')} {profileData.lastName || t('technician')}
          </h3>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
            {profileData.position || t('labTechnician')}
          </p>
          <p className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{profileData.department || t('clinicalLaboratory')}</p>
          <p className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('employeeId')}: {profileData.employeeId || t('nA')}</p>
        </div>
      </div>

      {/* Personal Information */}
      <div className="mb-8">
        <h4 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-[#79CAC2]'
            : 'text-gray-900 border-teal-500'
        }`}>
          {t('personalInformation')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('firstName')}</label>
            <input
              type="text"
              value={tempProfileData.firstName}
              onChange={(e) => setTempProfileData({...tempProfileData, firstName: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('lastName')}</label>
            <input
              type="text"
              value={tempProfileData.lastName}
              onChange={(e) => setTempProfileData({...tempProfileData, lastName: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('email')}</label>
            <input
              type="email"
              value={tempProfileData.email}
              onChange={(e) => setTempProfileData({...tempProfileData, email: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('phone')}</label>
            <input
              type="tel"
              value={tempProfileData.phone}
              onChange={(e) => setTempProfileData({...tempProfileData, phone: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('address')}</label>
            <input
              type="text"
              value={tempProfileData.address}
              onChange={(e) => setTempProfileData({...tempProfileData, address: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('city')}</label>
            <input
              type="text"
              value={tempProfileData.city}
              onChange={(e) => setTempProfileData({...tempProfileData, city: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('state')}</label>
            <input
              type="text"
              value={tempProfileData.state}
              onChange={(e) => setTempProfileData({...tempProfileData, state: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div>
        <h4 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-[#79CAC2]'
            : 'text-gray-900 border-teal-500'
        }`}>
          {t('professionalInformation')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('position')}</label>
            <input
              type="text"
              value={tempProfileData.position}
              disabled
              className={`w-full border rounded-lg px-3 py-2 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : 'bg-gray-50 border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('department')}</label>
            <input
              type="text"
              value={tempProfileData.department}
              disabled
              className={`w-full border rounded-lg px-3 py-2 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : 'bg-gray-50 border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('supervisor')}</label>
            <input
              type="text"
              value={tempProfileData.supervisor}
              disabled
              className={`w-full border rounded-lg px-3 py-2 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : 'bg-gray-50 border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('hireDate')}</label>
            <input
              type="date"
              value={tempProfileData.hireDate}
              onChange={(e) => setTempProfileData({...tempProfileData, hireDate: e.target.value})}
              disabled={!isEditing}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? isEditing
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : isEditing
                    ? 'border-gray-300 focus:ring-teal-500'
                    : 'bg-gray-50'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('certification')}</label>
            <input
              type="text"
              value={tempProfileData.certification}
              disabled
              className={`w-full border rounded-lg px-3 py-2 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : 'bg-gray-50 border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('licenseNumber')}</label>
            <input
              type="text"
              value={tempProfileData.licenseNumber}
              disabled
              className={`w-full border rounded-lg px-3 py-2 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037] text-[#8AA2A7]'
                  : 'bg-gray-50 border-gray-300'
              }`}
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
      setError(t('failedToSaveSecuritySettingsPleaseTryAgain'));
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

  const SecuritySection = () => (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className={`border px-4 py-3 rounded-lg ${
          darkMode
            ? 'bg-red-900 bg-opacity-30 border-red-700 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}
      {/* Password Change */}
      <div className={`rounded-lg border p-6 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-[#79CAC2]'
            : 'text-gray-900 border-teal-500'
        }`}>
          {t('passwordSecurity')}
        </h3>
        
        {!showPasswordForm ? (
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('password')}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('lastChanged3DaysAgo')}</div>
            </div>
            <button
              onClick={handleShowPasswordForm}
              className={`px-4 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
              }`}
              disabled={loading}
            >
              {t('changePassword')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('currentPassword')}</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={handleCurrentPasswordChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('newPassword')}</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={handleNewPasswordChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('confirmNewPassword')}</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                    : 'border-gray-300 focus:ring-teal-500'
                }`}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePasswordChange}
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                disabled={loading}
              >
                {loading ? t('updating') : t('updatePassword')}
              </button>
              <button
                onClick={handleCancelPasswordForm}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className={`rounded-lg border p-6 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-[#79CAC2]'
            : 'text-gray-900 border-teal-500'
        }`}>
          {t('securitySettings')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('twoFactorAuthentication')}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('addAnExtraLayerOfSecurityToYourAccount')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profileData.twoFactorAuth}
                onChange={(e) => handleSecuritySettingChange('twoFactorAuth', e.target.checked)}
                disabled={loading}
                className="sr-only peer disabled:opacity-50"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all disabled:opacity-50 ${
                darkMode
                  ? 'bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 peer-checked:bg-teal-500 after:border-gray-300'
              }`}></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('loginAlerts')}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('getNotifiedWhenSomeoneLogsIntoYourAccount')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profileData.loginAlerts}
                onChange={(e) => handleSecuritySettingChange('loginAlerts', e.target.checked)}
                disabled={loading}
                className="sr-only peer disabled:opacity-50"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all disabled:opacity-50 ${
                darkMode
                  ? 'bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 peer-checked:bg-teal-500 after:border-gray-300'
              }`}></div>
            </label>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('sessionTimeout')}</label>
            <select
              value={profileData.sessionTimeout}
              onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
              disabled={loading}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            >
              <option value={15}>15 {t('minutes')}</option>
              <option value={30}>30 {t('minutes')}</option>
              <option value={60}>1 {t('hour')}</option>
              <option value={120}>2 {t('hours')}</option>
              <option value={240}>4 {t('hours')}</option>
            </select>
          </div>
          
          {/* Save/Cancel buttons - only show when changes are made */}
          {securitySettingsChanged && (
            <div className={`flex items-center justify-end space-x-3 pt-4 border-t ${
              darkMode ? 'border-[#133037]' : 'border-gray-200'
            }`}>
              <button
                onClick={handleCancelSecuritySettings}
                disabled={loading}
                className={`px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveSecuritySettings}
                disabled={loading}
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                  darkMode
                    ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>{t('saving')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('saveChanges')}</span>
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
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className={`w-80 border-r overflow-y-auto ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-6">
              {/* Profile Summary */}
              <div className="text-center mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 ${
                  darkMode ? 'bg-[#79CAC2]' : 'bg-teal-500'
                }`}>
                {profileData.firstName?.[0] || 'L'}{profileData.lastName?.[0] || 'T'}
                </div>
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>
                {profileData.firstName || t('lab')} {profileData.lastName || t('technician')}
                </h3>
              <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                {profileData.position || t('labTechnician')}
              </p>
              <p className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{profileData.employeeId || t('nA')}</p>
              </div>

              {/* Quick Info */}
            <div className={`space-y-3 mb-6 pb-6 border-b ${
              darkMode ? 'border-[#133037]' : 'border-gray-200'
            }`}>
                <div className="flex items-center space-x-3">
                  <Mail className={`w-4 h-4 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                  }`} />
                <span className={`text-sm truncate ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{profileData.email || t('nA')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className={`w-4 h-4 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                  }`} />
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{profileData.phone || t('nA')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className={`w-4 h-4 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                  }`} />
                <span className={`text-sm truncate ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>
                  {profileData.city || t('nA')}{profileData.state ? `, ${profileData.state}` : ''}
                </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className={`w-4 h-4 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                  }`} />
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>
                  {profileData.hireDate ? `${t('joined')} ${profileData.hireDate}` : t('nA')}
                </span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
              {[
                  { id: 'profile', label: t('profile'), icon: User },
                { id: 'security', label: t('security'), icon: Shield }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                        ? darkMode
                          ? 'bg-[#133037] text-[#79CAC2] border-l-4 border-[#79CAC2]'
                          : 'bg-teal-100 text-teal-700 border-l-4 border-teal-500'
                          : darkMode
                            ? 'text-[#C1D9DD] hover:bg-[#133037]'
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
                { id: 'settings', label: t('settings'), icon: Settings, locked: true },
                { id: 'notifications', label: t('notifications'), icon: Bell, locked: true },
                { id: 'equipment', label: t('equipment'), icon: Wrench, locked: true }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left opacity-50 cursor-not-allowed relative ${
                      darkMode ? 'hover:bg-[#133037]' : ''
                    }`}
                    title={t('thisModuleIsLockedAndUnavailable')}
                  >
                    <Icon className={`w-4 h-4 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`} />
                    <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'}>{item.label}</span>
                    <span className={`ml-auto text-xs ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`}>🔒</span>
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
              <div className={`rounded-lg border p-12 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="text-6xl mb-4">🔒</div>
                <h2 className={`text-2xl font-bold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('moduleLocked')}</h2>
                <p className={`mb-4 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>
                  {t('theModuleIsCurrentlyLockedAndUnavailable', { module: t(activeTab) })}
                </p>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                      : 'bg-teal-500 hover:bg-teal-600 text-white'
                  }`}
                >
                  {t('returnToProfile')}
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