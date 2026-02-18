import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, User, Settings, Bell, Shield, Key, Camera, Edit, Save, X, Check, Mail, Phone, MapPin, Calendar, Award, Activity, Clock, Download, Monitor, Eye, FileText, Stethoscope, AlertCircle } from 'lucide-react';
// Import the radiology header component
import RadiologyHeader from './header';
import { getRadiologistProfile, updateRadiologistProfile, getRadiologistStats, getRadiologistActivity, updateRadiologistSecurity } from '../../services/radiologyService';

const RadiologyProfileModule = () => {
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
  // Real profile data from API
  const [profileData, setProfileData] = useState({});
  const [statsData, setStatsData] = useState({});
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch profile data from API
  useEffect(() => {
    let mounted = true;
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const profileResponse = await getRadiologistProfile();
        
        if (mounted) {
          // Backend returns an envelope with profileData, statsData, and activityData
          if (profileResponse && profileResponse.profileData) {
            setProfileData(profileResponse.profileData || {});
            setStatsData(profileResponse.statsData || {});
            setActivityData(profileResponse.activityData || []);
          } else {
            // Fallback: try separate endpoints if envelope structure not available
            const [stats, activity] = await Promise.all([
              getRadiologistStats(),
              getRadiologistActivity()
            ]);
            setProfileData(profileResponse || {});
            setStatsData(stats || {});
            setActivityData(activity || []);
          }
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        if (mounted) {
          setError(err.message);
          // Set fallback data
          setProfileData({
            firstName: 'Dr. Sarah',
            lastName: 'Anderson',
            email: 'sarah.anderson@radportal.com',
            phone: '+1 (555) 123-4567',
            address: '123 Medical Center Drive',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            dateOfBirth: '1985-03-15',
            employeeId: 'RAD-001',
            position: 'Staff Radiologist',
            department: 'Diagnostic Radiology',
            supervisor: 'Dr. Michael Chen, MD',
            hireDate: '2020-06-15',
            certification: 'Board Certified Diagnostic Radiologist',
            licenseNumber: 'MD-NY-12345',
            licenseExpiry: '2026-03-15',
            subspecialty: 'Abdominal Imaging',
            medicalSchool: 'Johns Hopkins School of Medicine',
            residency: 'Massachusetts General Hospital',
            fellowship: 'Stanford University - Abdominal Imaging',
            emailNotifications: true,
            smsNotifications: false,
            criticalAlerts: true,
            weeklyReports: true,
            systemUpdates: false,
            pacsAlerts: true,
            reportReminders: true,
            twoFactorAuth: true,
            sessionTimeout: 30,
            loginAlerts: true,
            theme: 'dark',
            language: 'en',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12-hour',
            pacsLayout: 'quad',
            windowingPreset: 'auto'
          });
          setStatsData({
            totalStudies: 1247,
            reportsFinalized: 1189,
            avgReportTime: '18 minutes',
            criticalFindings: 23,
            consultations: 45,
            accuracy: '99.7%',
            productivity: '15.2 RVUs/day',
            thisWeek: {
              studiesRead: 89,
              reportsFinalized: 86,
              criticalFindings: 3,
              hoursWorked: 45,
              avgTurnaroundTime: '16 minutes'
            },
            thisMonth: {
              studiesRead: 384,
              reportsFinalized: 378,
              criticalFindings: 12,
              hoursWorked: 180,
              avgTurnaroundTime: '18 minutes'
            },
            modalityBreakdown: {
              CT: 45,
              MRI: 25,
              XR: 20,
              US: 10
            }
          });
          setActivityData([
            {
              id: 1,
              action: 'Finalized CT Chest Report',
              timestamp: '2025-06-29 14:30',
              type: 'report',
              details: 'CT Chest W/O Contrast - Acc: CTG2025001'
            },
            {
              id: 2,
              action: 'Critical Finding Notification',
              timestamp: '2025-06-29 11:45',
              type: 'critical',
              details: 'Pneumothorax identified - Emergency physician notified'
            },
            {
              id: 3,
              action: 'Reviewed MRI Brain Study',
              timestamp: '2025-06-29 09:15',
              type: 'review',
              details: 'MRI Brain W/ & W/O Contrast - Acc: MRI2025042'
            }
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfileData();
    return () => { mounted = false };
  }, []);

  const [tempProfileData, setTempProfileData] = useState({});

  // Update tempProfileData when profileData changes
  useEffect(() => {
    setTempProfileData(profileData);
  }, [profileData]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await updateRadiologistProfile(tempProfileData);
      // Backend returns envelope with profileData, statsData, activityData
      if (response && response.profileData) {
        setProfileData(response.profileData);
        if (response.statsData) setStatsData(response.statsData);
        if (response.activityData) setActivityData(response.activityData);
      } else {
        // Fallback: use the data we sent
        setProfileData(tempProfileData);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(t('failedToSaveProfileChanges'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setTempProfileData(profileData);
    setIsEditing(false);
  };

  const handleSecurityChange = async (field, value) => {
    try {
      setSaving(true);
      const securityData = {
        ...profileData,
        [field]: value
      };
      await updateRadiologistSecurity({ [field]: value });
      setProfileData(securityData);
    } catch (err) {
      console.error('Error updating security settings:', err);
      setError(t('failedToUpdateSecuritySettings'));
    } finally {
      setSaving(false);
    }
  };

  const ProfileSection = () => (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className={`rounded-lg border p-6 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('profileInformation')}</h2>
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  darkMode
                    ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
              >
                <Edit className="w-4 h-4" />
                {t('editProfile')}
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
                    darkMode
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white'
                      : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('save')}
                    </>
                  )}
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
                    : 'border-gray-300 bg-gray-50'
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
                    : 'border-gray-300 bg-gray-50'
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
                    : 'border-gray-300 bg-gray-50'
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
                    : 'border-gray-300 bg-gray-50'
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
                    : 'border-gray-300 bg-gray-50'
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
                    : 'border-gray-300 bg-gray-50'
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
                    : 'border-gray-300 bg-gray-50'
              }`}
            />
          </div>
        </div>
        </div>

        {/* Professional Information */}
        <div className="mb-8">
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
            }`}>{t('subspecialty')}</label>
            <input
              type="text"
              value={tempProfileData.subspecialty}
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
            }`}>{t('medicalLicense')}</label>
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
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('licenseExpiry')}</label>
            <input
              type="date"
              value={tempProfileData.licenseExpiry}
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

        {/* Education & Training */}
        <div>
          <h4 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
            darkMode
              ? 'text-[#F5FEFF] border-[#79CAC2]'
              : 'text-gray-900 border-teal-500'
          }`}>
            {t('educationTraining')}
          </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('medicalSchool')}</label>
            <input
              type="text"
              value={tempProfileData.medicalSchool}
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
            }`}>{t('residency')}</label>
            <input
              type="text"
              value={tempProfileData.residency}
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
            }`}>{t('fellowship')}</label>
            <input
              type="text"
              value={tempProfileData.fellowship}
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
            }`}>{t('boardCertification')}</label>
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
            { key: 'criticalAlerts', label: 'Critical Finding Alerts', description: 'Get notified of critical findings requiring immediate attention' },
            { key: 'pacsAlerts', label: 'PACS Alerts', description: 'Receive alerts about study availability and technical issues' },
            { key: 'reportReminders', label: 'Report Reminders', description: 'Get reminders for pending reports' },
            { key: 'weeklyReports', label: 'Weekly Performance Reports', description: 'Receive weekly productivity and performance reports' },
            { key: 'systemUpdates', label: 'System Updates', description: 'Get notified about system updates and maintenance' }
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

      {/* PACS Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          PACS & Viewing Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default PACS Layout</label>
            <select
              value={profileData.pacsLayout}
              onChange={(e) => setProfileData({...profileData, pacsLayout: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="single">Single Viewport</option>
              <option value="quad">Quad Layout</option>
              <option value="compare">Compare Layout</option>
              <option value="stack">Stack Mode</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Windowing</label>
            <select
              value={profileData.windowingPreset}
              onChange={(e) => setProfileData({...profileData, windowingPreset: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="auto">Auto</option>
              <option value="lung">Lung Window</option>
              <option value="mediastinum">Mediastinum</option>
              <option value="bone">Bone Window</option>
              <option value="soft-tissue">Soft Tissue</option>
              <option value="brain">Brain Window</option>
            </select>
          </div>
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
              <option value="dark">Dark (Recommended for Reading)</option>
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
                checked={profileData.twoFactorAuth || false}
                onChange={(e) => handleSecurityChange('twoFactorAuth', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-disabled:opacity-50 ${
                darkMode
                  ? 'bg-gray-700 peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
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
                checked={profileData.loginAlerts || false}
                onChange={(e) => handleSecurityChange('loginAlerts', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-disabled:opacity-50 ${
                darkMode
                  ? 'bg-gray-700 peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 peer-checked:bg-teal-500 after:border-gray-300'
              }`}></div>
            </label>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('sessionTimeout')}</label>
            <select
              value={profileData.sessionTimeout || 30}
              onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
              disabled={saving}
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
              {activity.type === 'critical' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {activity.type === 'review' && <Eye className="w-5 h-5 text-green-500" />}
              {activity.type === 'login' && <User className="w-5 h-5 text-gray-500" />}
              {activity.type === 'settings' && <Settings className="w-5 h-5 text-purple-500" />}
              {activity.type === 'consultation' && <Stethoscope className="w-5 h-5 text-orange-500" />}
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
      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Productivity (RVUs/day)</span>
              <span className="font-semibold text-gray-900">{statsData.productivity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Accuracy Rate</span>
              <span className="font-semibold text-green-600">{statsData.accuracy}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Consultations Provided</span>
              <span className="font-semibold text-gray-900">{statsData.consultations}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">This Week</div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Studies Read:</span>
                  <span className="font-medium">{statsData?.thisWeek?.studiesRead || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reports Finalized:</span>
                  <span className="font-medium">{statsData?.thisWeek?.reportsFinalized || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Critical Findings:</span>
                  <span className="font-medium">{statsData?.thisWeek?.criticalFindings || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Turnaround:</span>
                  <span className="font-medium">{statsData?.thisWeek?.avgTurnaroundTime || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">This Month</div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Studies Read:</span>
                  <span className="font-medium">{statsData?.thisMonth?.studiesRead || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reports Finalized:</span>
                  <span className="font-medium">{statsData?.thisMonth?.reportsFinalized || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Critical Findings:</span>
                  <span className="font-medium">{statsData?.thisMonth?.criticalFindings || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Turnaround:</span>
                  <span className="font-medium">{statsData?.thisMonth?.avgTurnaroundTime || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modality Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Study Distribution by Modality
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(statsData.modalityBreakdown).map(([modality, percentage]) => (
            <div key={modality} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
              <div className="text-sm text-gray-600">{modality}</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-teal-500 h-2 rounded-full" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Header Component */}
      <RadiologyHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
                darkMode ? 'border-[#79CAC2]' : 'border-teal-500'
              }`}></div>
              <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                {t('loadingProfileData')}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`border rounded-lg p-4 mb-6 ${
            darkMode
              ? 'bg-red-900 bg-opacity-30 border-red-700'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <X className={`w-5 h-5 mr-2 ${
                darkMode ? 'text-red-400' : 'text-red-500'
              }`} />
              <div>
                <h3 className={`text-sm font-medium ${
                  darkMode ? 'text-red-300' : 'text-red-800'
                }`}>{t('errorLoadingProfile')}</h3>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-300' : 'text-red-600'
                }`}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div className="flex gap-6">
            {/* Left Sidebar */}
            <div className="w-80 flex-shrink-0">
              {/* Profile Summary Card */}
              <div className={`rounded-lg shadow-sm border p-6 mb-6 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-100'
              }`}>
                <div className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold mb-4 ${
                    darkMode
                      ? 'bg-[#79CAC2] text-[#050C0F]'
                      : 'bg-teal-500 text-white'
                  }`}>
                    {profileData.firstName?.[0] || 'R'}{profileData.lastName?.[0] || 'D'}
                  </div>
                  <h3 className={`text-xl font-semibold mb-1 ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>
                    {profileData.firstName || t('radiologist')} {profileData.lastName || t('user')}
                  </h3>
                  <p className={`mb-1 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                  }`}>{profileData.position || t('staffRadiologist')}</p>
                  <p className={`text-sm mb-4 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{t('employeeId')}: {profileData.employeeId || 'RAD-001'}</p>
                  <div className={`w-full space-y-2 text-sm ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                  }`}>
                    <div className="flex items-center justify-center space-x-1">
                      <Mail className={`w-4 h-4 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                      }`} />
                      <span className="text-xs">{profileData.email || 'radiologist@example.com'}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <Phone className={`w-4 h-4 ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                      }`} />
                      <span className="text-xs">{profileData.phone || '+1 (555) 123-4567'}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <Monitor className={`w-4 h-4 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                      <span className={`text-xs ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>{profileData.subspecialty || t('diagnosticRadiology')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className={`mt-6 rounded-lg shadow-sm border p-4 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-100'
              }`}>
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
                              ? 'bg-[#133037] text-[#79CAC2]'
                              : 'bg-teal-100 text-teal-700'
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
                </nav>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              {activeTab === 'profile' && <ProfileSection />}
              {activeTab === 'security' && <SecuritySection />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RadiologyProfileModule;