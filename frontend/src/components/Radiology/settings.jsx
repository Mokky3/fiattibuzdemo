import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Settings, Bell, Shield, Database, Users, Monitor, Printer, Wifi, Server, Clock, Mail, Phone, Globe, Save, X, Check, AlertTriangle, Info, Plus, Trash2, Edit, Eye, Camera } from 'lucide-react';
// Import the radiology header component
import RadiologyHeader from './header';
import { getGeneralSettings, updateGeneralSettings, getNotificationSettings, updateNotificationSettings } from '../../services/radiologyService';

const RadiologySettingsModule = () => {
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
  
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    departmentName: 'Diagnostic Radiology Department',
    departmentCode: 'RAD-001',
    address: '123 Medical Center Drive, New York, NY 10001',
    phone: '+1 (555) 123-4567',
    email: 'radiology@hospitalcenter.com',
    website: 'www.hospitalcenter.com/radiology',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    language: 'en',
    currency: 'USD',
    operatingHours: {
      start: '06:00',
      end: '22:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }
  });

  // Fetch general settings on mount
  useEffect(() => {
    let mounted = true;
    const fetchGeneralSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const settings = await getGeneralSettings();
        if (mounted && settings) {
          setGeneralSettings(settings);
        }
      } catch (err) {
        console.error('Error fetching general settings:', err);
        if (mounted) {
          setError(err.message || t('failedToLoadGeneralSettings'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (activeTab === 'general') {
      fetchGeneralSettings();
    }
    return () => { mounted = false };
  }, [activeTab]);

  // Fetch notification settings on mount
  useEffect(() => {
    let mounted = true;
    const fetchNotificationSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const settings = await getNotificationSettings();
        if (mounted && settings) {
          // Ensure all required fields are present with defaults
          setNotificationSettings({
            emailNotifications: settings.emailNotifications ?? true,
            smsNotifications: settings.smsNotifications ?? true,
            pushNotifications: settings.pushNotifications ?? true,
            criticalAlerts: {
              enabled: settings.criticalAlerts?.enabled ?? true,
              methods: settings.criticalAlerts?.methods || ['email', 'sms', 'push'],
              recipients: settings.criticalAlerts?.recipients || []
            },
            reportDelivery: {
              enabled: settings.reportDelivery?.enabled ?? true,
              schedule: settings.reportDelivery?.schedule || 'immediate',
              day: settings.reportDelivery?.day || 'daily',
              time: settings.reportDelivery?.time || 'realtime'
            }
          });
        }
      } catch (err) {
        console.error('Error fetching notification settings:', err);
        if (mounted) {
          setError(err.message || t('failedToLoadNotificationSettings'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (activeTab === 'notifications') {
      fetchNotificationSettings();
    }
    return () => { mounted = false };
  }, [activeTab]);

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 90,
    systemMaintenance: {
      enabled: true,
      time: '02:00',
      day: 'sunday'
    },
    sessionTimeout: 45,
    maxLoginAttempts: 3,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 60
    },
    auditLogging: true,
    errorReporting: true
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    criticalAlerts: {
      enabled: true,
      methods: ['email', 'sms', 'push'],
      recipients: ['radiologist@hospitalcenter.com', 'supervisor@hospitalcenter.com']
    },
    reportDelivery: {
      enabled: true,
      schedule: 'immediate',
      day: 'daily',
      time: 'realtime'
    }
  });

  // Equipment Settings
  const [equipmentSettings, setEquipmentSettings] = useState({
    modalities: [
      {
        id: 'CT-001',
        name: 'Siemens SOMATOM Force',
        type: 'CT',
        status: 'active',
        location: 'CT Suite 1',
        calibrationDue: '2025-07-15',
        maintenanceDue: '2025-08-01',
        settings: {
          autoSend: true,
          qualityControl: 'daily',
          dataBackup: true
        }
      },
      {
        id: 'MRI-001',
        name: 'GE Signa Premier',
        type: 'MRI',
        status: 'active',
        location: 'MRI Suite 1',
        calibrationDue: '2025-07-20',
        maintenanceDue: '2025-07-30',
        settings: {
          autoSend: true,
          qualityControl: 'daily',
          dataBackup: true
        }
      },
      {
        id: 'XR-001',
        name: 'Philips DigitalDiagnost C90',
        type: 'XR',
        status: 'maintenance',
        location: 'X-Ray Room 1',
        calibrationDue: '2025-06-30',
        maintenanceDue: '2025-06-29',
        settings: {
          autoSend: false,
          qualityControl: 'weekly',
          dataBackup: true
        }
      }
    ],
    defaultSettings: {
      calibrationInterval: 90,
      maintenanceInterval: 180,
      qualityControlFrequency: 'daily',
      alertThresholds: {
        diskSpaceLow: 15,
        temperatureHigh: 75,
        networkLatency: 500
      }
    }
  });

  // User Management Settings
  const [userSettings, setUserSettings] = useState({
    defaultRole: 'radiologist',
    autoApproval: false,
    userRoles: [
      {
        id: 'admin',
        name: 'System Administrator',
        permissions: ['all'],
        description: 'Full system access and configuration'
      },
      {
        id: 'chief',
        name: 'Chief Radiologist',
        permissions: ['manage_users', 'view_reports', 'manage_worklist', 'critical_findings'],
        description: 'Departmental oversight and management'
      },
      {
        id: 'radiologist',
        name: 'Staff Radiologist',
        permissions: ['read_studies', 'create_reports', 'view_worklist'],
        description: 'Standard radiologist access'
      },
      {
        id: 'tech',
        name: 'Radiology Technologist',
        permissions: ['operate_modalities', 'view_worklist'],
        description: 'Technical operation access'
      }
    ],
    accountSettings: {
      passwordExpiry: 60,
      lockoutDuration: 30,
      inactivityTimeout: 45
    }
  });

  // Integration Settings
  const [integrationSettings, setIntegrationSettings] = useState({
    pacs: {
      enabled: true,
      endpoint: 'https://pacs.hospitalcenter.com/api',
      vendor: 'Philips IntelliSpace',
      syncFrequency: 'realtime'
    },
    ris: {
      enabled: true,
      provider: 'Epic Radiant',
      endpoint: 'https://ris.hospitalcenter.com/api/v1',
      apiKey: '••••••••••••••••'
    },
    hl7: {
      enabled: true,
      provider: 'HL7 Interface',
      autoSync: true,
      version: '2.5.1'
    },
    dicom: {
      provider: 'DICOM Gateway',
      endpoint: 'https://dicom.hospitalcenter.com',
      compression: true,
      archiving: 'cloud'
    }
  });

  const handleSaveSettings = async (section) => {
    try {
      setSaving(true);
      setError(null);
      
      if (section === 'General') {
        await updateGeneralSettings(generalSettings);
        setShowSaveDialog(true);
        setTimeout(() => {
          setShowSaveDialog(false);
          setHasChanges(false);
        }, 1000);
      } else if (section === 'Notifications') {
        // Ensure data structure matches backend schema
        // Filter out empty recipient strings and ensure at least one recipient
        const filteredRecipients = (notificationSettings.criticalAlerts?.recipients || [])
          .filter(r => r && r.trim() !== '');
        const finalRecipients = filteredRecipients.length > 0 
          ? filteredRecipients 
          : ['admin@hospitalcenter.com'];
        
        // Ensure at least one method
        const finalMethods = (notificationSettings.criticalAlerts?.methods && notificationSettings.criticalAlerts.methods.length > 0)
          ? notificationSettings.criticalAlerts.methods
          : ['email'];
        
        const payload = {
          emailNotifications: notificationSettings.emailNotifications ?? true,
          smsNotifications: notificationSettings.smsNotifications ?? true,
          pushNotifications: notificationSettings.pushNotifications ?? true,
          criticalAlerts: {
            enabled: notificationSettings.criticalAlerts?.enabled ?? true,
            methods: finalMethods,
            recipients: finalRecipients
          },
          reportDelivery: {
            enabled: notificationSettings.reportDelivery?.enabled ?? true,
            schedule: notificationSettings.reportDelivery?.schedule || 'immediate',
            day: notificationSettings.reportDelivery?.day || 'daily',
            time: notificationSettings.reportDelivery?.time || 'realtime'
          }
        };
        
        await updateNotificationSettings(payload);
        // Update local state with the validated payload
        setNotificationSettings(payload);
        setShowSaveDialog(true);
        setTimeout(() => {
          setShowSaveDialog(false);
          setHasChanges(false);
        }, 1000);
      } else {
        // For other sections, show placeholder message
        setShowSaveDialog(true);
        setTimeout(() => {
          setShowSaveDialog(false);
          setHasChanges(false);
          alert(t('settingsSavedSuccessfully', { section }));
        }, 1000);
      }
    } catch (err) {
      console.error(`Error saving ${section} settings:`, err);
      setError(err.message || t('failedToSaveSettingsPleaseTryAgain', { section }));
      setShowSaveDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    if (darkMode) {
      switch (status) {
        case 'active': return 'text-green-300 bg-green-900 bg-opacity-30 border-green-700';
        case 'maintenance': return 'text-yellow-300 bg-yellow-900 bg-opacity-30 border-yellow-700';
        case 'offline': return 'text-red-300 bg-red-900 bg-opacity-30 border-red-700';
        default: return 'text-gray-300 bg-gray-700 bg-opacity-30 border-gray-600';
      }
    } else {
      switch (status) {
        case 'active': return 'text-green-600 bg-green-50 border-green-200';
        case 'maintenance': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'offline': return 'text-red-600 bg-red-50 border-red-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
  };

  const getModalityIcon = (type) => {
    switch (type) {
      case 'CT': return <Monitor className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />;
      case 'MRI': return <Monitor className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />;
      case 'XR': return <Camera className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />;
      case 'US': return <Eye className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />;
      default: return <Monitor className={`w-4 h-4 ${darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}`} />;
    }
  };

  const GeneralSection = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
              darkMode ? 'border-[#79CAC2]' : 'border-teal-500'
            }`}></div>
            <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
              {t('loadingGeneralSettings')}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className={`border rounded-lg p-4 ${
            darkMode
              ? 'bg-red-900 bg-opacity-30 border-red-700'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <AlertTriangle className={`w-5 h-5 mr-2 ${
                darkMode ? 'text-red-400' : 'text-red-500'
              }`} />
              <div>
                <h3 className={`text-sm font-medium ${
                  darkMode ? 'text-red-300' : 'text-red-800'
                }`}>{t('error')}</h3>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-300' : 'text-red-600'
                }`}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Department Information */}
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
          {t('radiologyDepartmentInformation')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('departmentName')}</label>
            <input
              type="text"
              value={generalSettings.departmentName}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, departmentName: e.target.value});
                setHasChanges(true);
              }}
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
            }`}>{t('departmentCode')}</label>
            <input
              type="text"
              value={generalSettings.departmentCode}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, departmentCode: e.target.value});
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('address')}</label>
            <input
              type="text"
              value={generalSettings.address}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, address: e.target.value});
                setHasChanges(true);
              }}
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
            }`}>{t('phone')}</label>
            <input
              type="tel"
              value={generalSettings.phone}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, phone: e.target.value});
                setHasChanges(true);
              }}
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
            }`}>{t('email')}</label>
            <input
              type="email"
              value={generalSettings.email}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, email: e.target.value});
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Regional Settings */}
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
          {t('regionalSettings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('timezone')}</label>
            <select
              value={generalSettings.timezone}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, timezone: e.target.value});
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            >
              <option value="America/New_York">{t('easternTimeET')}</option>
              <option value="America/Chicago">{t('centralTimeCT')}</option>
              <option value="America/Denver">{t('mountainTimeMT')}</option>
              <option value="America/Los_Angeles">{t('pacificTimePT')}</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('language')}</label>
            <select
              value={generalSettings.language}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, language: e.target.value});
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            >
              <option value="en">{t('english')}</option>
              <option value="es">{t('spanish')}</option>
              <option value="fr">{t('french')}</option>
              <option value="de">{t('german')}</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('dateFormat')}</label>
            <select
              value={generalSettings.dateFormat}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, dateFormat: e.target.value});
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('currency')}</label>
            <select
              value={generalSettings.currency}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, currency: e.target.value});
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            >
              <option value="USD">USD - {t('usDollar')}</option>
              <option value="EUR">EUR - {t('euro')}</option>
              <option value="GBP">GBP - {t('britishPound')}</option>
              <option value="CAD">CAD - {t('canadianDollar')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Operating Hours */}
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
          {t('operatingHours')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('startTime')}</label>
            <input
              type="time"
              value={generalSettings.operatingHours.start}
              onChange={(e) => {
                setGeneralSettings({
                  ...generalSettings,
                  operatingHours: {...generalSettings.operatingHours, start: e.target.value}
                });
                setHasChanges(true);
              }}
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
            }`}>{t('endTime')}</label>
            <input
              type="time"
              value={generalSettings.operatingHours.end}
              onChange={(e) => {
                setGeneralSettings({
                  ...generalSettings,
                  operatingHours: {...generalSettings.operatingHours, end: e.target.value}
                });
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('operatingDays')}</label>
          <div className="flex flex-wrap gap-2">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
              <label key={day} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={generalSettings.operatingHours.days.includes(day)}
                  onChange={(e) => {
                    const days = e.target.checked
                      ? [...generalSettings.operatingHours.days, day]
                      : generalSettings.operatingHours.days.filter(d => d !== day);
                    setGeneralSettings({
                      ...generalSettings,
                      operatingHours: {...generalSettings.operatingHours, days}
                    });
                    setHasChanges(true);
                  }}
                  className={`rounded focus:ring-2 transition-colors ${
                    darkMode
                      ? 'border-[#133037] text-[#79CAC2] focus:ring-[#79CAC2]'
                      : 'border-gray-300 text-teal-600 focus:ring-teal-500'
                  }`}
                />
                <span className={`text-sm capitalize ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>{t(day)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings('General')}
          disabled={!hasChanges || saving}
          className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] disabled:bg-gray-700 text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white'
          }`}
        >
          {saving ? (
            <>
              <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                darkMode ? 'border-[#050C0F]' : 'border-white'
              }`}></div>
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t('saveChanges')}
            </>
          )}
        </button>
      </div>
    </div>
    );
  };

  const SystemSection = () => (
    <div className="space-y-6">
      {/* Backup Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Backup & Maintenance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Automatic Backup</div>
              <div className="text-sm text-gray-500">Automatically backup DICOM data and system configurations</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.autoBackup}
                onChange={(e) => setSystemSettings({...systemSettings, autoBackup: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>

          {systemSettings.autoBackup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                <select
                  value={systemSettings.backupFrequency}
                  onChange={(e) => setSystemSettings({...systemSettings, backupFrequency: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Retention (Days)</label>
                <input
                  type="number"
                  value={systemSettings.backupRetention}
                  onChange={(e) => setSystemSettings({...systemSettings, backupRetention: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Security Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              value={systemSettings.sessionTimeout}
              onChange={(e) => setSystemSettings({...systemSettings, sessionTimeout: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
            <input
              type="number"
              value={systemSettings.maxLoginAttempts}
              onChange={(e) => setSystemSettings({...systemSettings, maxLoginAttempts: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Password Policy</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
              <input
                type="number"
                value={systemSettings.passwordPolicy.minLength}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  passwordPolicy: {...systemSettings.passwordPolicy, minLength: parseInt(e.target.value)}
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry (Days)</label>
              <input
                type="number"
                value={systemSettings.passwordPolicy.expiryDays}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  passwordPolicy: {...systemSettings.passwordPolicy, expiryDays: parseInt(e.target.value)}
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { key: 'requireUppercase', label: 'Require Uppercase Letters' },
              { key: 'requireNumbers', label: 'Require Numbers' },
              { key: 'requireSpecialChars', label: 'Require Special Characters' }
            ].map(policy => (
              <div key={policy.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={systemSettings.passwordPolicy[policy.key]}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    passwordPolicy: {...systemSettings.passwordPolicy, [policy.key]: e.target.checked}
                  })}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">{policy.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings('System')}
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const NotificationSection = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
              darkMode ? 'border-[#79CAC2]' : 'border-teal-500'
            }`}></div>
            <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
              {t('loadingNotificationSettings')}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className={`border rounded-lg p-4 ${
            darkMode
              ? 'bg-red-900 bg-opacity-30 border-red-700'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <AlertTriangle className={`w-5 h-5 mr-2 ${
                darkMode ? 'text-red-400' : 'text-red-500'
              }`} />
              <div>
                <h3 className={`text-sm font-medium ${
                  darkMode ? 'text-red-300' : 'text-red-800'
                }`}>{t('error')}</h3>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-red-300' : 'text-red-600'
                }`}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notification Methods */}
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
          {t('notificationMethods')}
        </h3>
        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: t('emailNotifications'), icon: Mail },
            { key: 'smsNotifications', label: t('smsNotifications'), icon: Phone },
            { key: 'pushNotifications', label: t('pushNotifications'), icon: Bell }
          ].map(method => {
            const Icon = method.icon;
            return (
              <div key={method.key} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                  }`} />
                  <div className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{method.label}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings[method.key] || false}
                    onChange={(e) => {
                      setNotificationSettings({...notificationSettings, [method.key]: e.target.checked});
                      setHasChanges(true);
                    }}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    darkMode
                      ? 'bg-gray-700 peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
                      : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 peer-checked:bg-teal-500 after:border-gray-300'
                  }`}></div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Alerts */}
      <div className={`rounded-lg border p-6 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-red-500'
            : 'text-gray-900 border-red-500'
        }`}>
          {t('criticalFindingsAlerts')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('enableCriticalFindingsAlerts')}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('sendImmediateNotificationsForCriticalRadiologyFindings')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.criticalAlerts?.enabled || false}
                onChange={(e) => {
                  setNotificationSettings({
                    ...notificationSettings,
                    criticalAlerts: {...notificationSettings.criticalAlerts, enabled: e.target.checked}
                  });
                  setHasChanges(true);
                }}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                darkMode
                  ? 'bg-gray-700 peer-focus:ring-4 peer-focus:ring-red-400 peer-checked:bg-red-500 after:border-gray-600'
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 peer-checked:bg-red-500 after:border-gray-300'
              }`}></div>
            </label>
          </div>

          {notificationSettings.criticalAlerts?.enabled && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('alertRecipients')}</label>
              <div className="space-y-2">
                {(notificationSettings.criticalAlerts?.recipients || []).map((recipient, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="email"
                      value={recipient}
                      onChange={(e) => {
                        const newRecipients = [...(notificationSettings.criticalAlerts?.recipients || [])];
                        newRecipients[index] = e.target.value;
                        setNotificationSettings({
                          ...notificationSettings,
                          criticalAlerts: {...notificationSettings.criticalAlerts, recipients: newRecipients}
                        });
                        setHasChanges(true);
                      }}
                      className={`flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                          : 'border-gray-300 focus:ring-teal-500'
                      }`}
                    />
                    <button
                      onClick={() => {
                        const newRecipients = (notificationSettings.criticalAlerts?.recipients || []).filter((_, i) => i !== index);
                        setNotificationSettings({
                          ...notificationSettings,
                          criticalAlerts: {...notificationSettings.criticalAlerts, recipients: newRecipients}
                        });
                        setHasChanges(true);
                      }}
                      className={`p-2 transition-colors ${
                        darkMode
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setNotificationSettings({
                      ...notificationSettings,
                      criticalAlerts: {
                        ...notificationSettings.criticalAlerts,
                        recipients: [...(notificationSettings.criticalAlerts?.recipients || []), '']
                      }
                    });
                    setHasChanges(true);
                  }}
                  className={`flex items-center space-x-2 transition-colors ${
                    darkMode
                      ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                      : 'text-teal-600 hover:text-teal-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('addRecipient')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings('Notifications')}
          disabled={!hasChanges || saving}
          className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] disabled:bg-gray-700 text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white'
          }`}
        >
          {saving ? (
            <>
              <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                darkMode ? 'border-[#050C0F]' : 'border-white'
              }`}></div>
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t('saveChanges')}
            </>
          )}
        </button>
      </div>
    </div>
    );
  };

  const EquipmentSection = () => (
    <div className="space-y-6">
      {/* Equipment List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
            Imaging Equipment
          </h3>
          <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Equipment
          </button>
        </div>

        <div className="space-y-4">
          {equipmentSettings.modalities.map(modality => (
            <div key={modality.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {getModalityIcon(modality.type)}
                    <h4 className="font-medium text-gray-900">{modality.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(modality.status)}`}>
                      {modality.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {modality.type} • {modality.location}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Calibration Due:</span>
                  <div className="text-gray-600">{modality.calibrationDue}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Maintenance Due:</span>
                  <div className="text-gray-600">{modality.maintenanceDue}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">QC Frequency:</span>
                  <div className="text-gray-600">{modality.settings.qualityControl}</div>
                </div>
              </div>

              <div className="mt-3 flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={modality.settings.autoSend}
                    onChange={(e) => {
                      const updatedModalities = equipmentSettings.modalities.map(mod =>
                        mod.id === modality.id
                          ? {...mod, settings: {...mod.settings, autoSend: e.target.checked}}
                          : mod
                      );
                      setEquipmentSettings({...equipmentSettings, modalities: updatedModalities});
                    }}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Auto Send</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={modality.settings.dataBackup}
                    onChange={(e) => {
                      const updatedModalities = equipmentSettings.modalities.map(mod =>
                        mod.id === modality.id
                          ? {...mod, settings: {...mod.settings, dataBackup: e.target.checked}}
                          : mod
                      );
                      setEquipmentSettings({...equipmentSettings, modalities: updatedModalities});
                    }}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Data Backup</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Default Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">
          Default Equipment Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Calibration Interval (days)</label>
            <input
              type="number"
              value={equipmentSettings.defaultSettings.calibrationInterval}
              onChange={(e) => setEquipmentSettings({
                ...equipmentSettings,
                defaultSettings: {...equipmentSettings.defaultSettings, calibrationInterval: parseInt(e.target.value)}
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Interval (days)</label>
            <input
              type="number"
              value={equipmentSettings.defaultSettings.maintenanceInterval}
              onChange={(e) => setEquipmentSettings({
                ...equipmentSettings,
                defaultSettings: {...equipmentSettings.defaultSettings, maintenanceInterval: parseInt(e.target.value)}
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">QC Frequency</label>
            <select
              value={equipmentSettings.defaultSettings.qualityControlFrequency}
              onChange={(e) => setEquipmentSettings({
                ...equipmentSettings,
                defaultSettings: {...equipmentSettings.defaultSettings, qualityControlFrequency: e.target.value}
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disk Space Low Alert (%)</label>
            <input
              type="number"
              value={equipmentSettings.defaultSettings.alertThresholds.diskSpaceLow}
              onChange={(e) => setEquipmentSettings({
                ...equipmentSettings,
                defaultSettings: {
                  ...equipmentSettings.defaultSettings,
                  alertThresholds: {...equipmentSettings.defaultSettings.alertThresholds, diskSpaceLow: parseInt(e.target.value)}
                }
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings('Equipment')}
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const UserSection = () => (
    <div className="space-y-6">
      {/* Locked Notice */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management Locked</h3>
            <p className="text-gray-600 mb-4 max-w-md">
              Advanced user management features require administrator privileges. Contact your system administrator to unlock this section.
            </p>
            <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-lg cursor-not-allowed flex items-center gap-2 mx-auto">
              <Shield className="w-4 h-4" />
              Request Access
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content (Disabled) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50 pointer-events-none">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-gray-300 pl-3">
            User Roles & Permissions
          </h3>
          <button className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Role
          </button>
        </div>

        <div className="space-y-4">
          {userSettings.userRoles.slice(0, 2).map(role => (
            <div key={role.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-600">{role.name}</h4>
                  <div className="text-sm text-gray-400 mt-1">{role.description}</div>
                </div>
                <div className="flex space-x-2 opacity-50">
                  <Edit className="w-4 h-4 text-gray-400" />
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions.slice(0, 3).map(permission => (
                  <span key={permission} className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200">
                    {permission.replace('_', ' ')}
                  </span>
                ))}
                <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-full border border-gray-200">
                  ...
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const IntegrationSection = () => (
    <div className="space-y-6">
      {/* Locked Notice */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Integration Features Locked</h3>
            <p className="text-gray-600 mb-4 max-w-md">
              Advanced integrations require a Premium license. Upgrade your plan to connect with PACS, RIS, and hospital systems.
            </p>
            <div className="flex space-x-3">
              <button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Upgrade Plan
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content (Disabled) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50 pointer-events-none">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-gray-300 pl-3">
          PACS Integration
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-600">Enable PACS Integration</div>
              <div className="text-sm text-gray-400">Connect to Picture Archiving and Communication System</div>
            </div>
            <div className="w-11 h-6 bg-gray-200 rounded-full relative">
              <div className="absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">PACS Endpoint</label>
              <input
                type="url"
                value="https://pacs.hospitalcenter.com/api"
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Vendor</label>
              <input
                type="text"
                value="Philips IntelliSpace"
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Preview Sections */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50 pointer-events-none">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-gray-300 pl-3">
          RIS Integration
        </h3>
        <div className="text-sm text-gray-400 flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Premium feature - upgrade to unlock</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50 pointer-events-none">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-gray-300 pl-3">
          HL7 Integration
        </h3>
        <div className="text-sm text-gray-400 flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Premium feature - upgrade to unlock</span>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: t('general'), icon: Settings, component: GeneralSection, locked: false },
    { id: 'system', label: t('system'), icon: Server, component: SystemSection, locked: true },
    { id: 'notifications', label: t('notifications'), icon: Bell, component: NotificationSection, locked: false },
    { id: 'equipment', label: t('equipment'), icon: Monitor, component: EquipmentSection, locked: true },
    { id: 'users', label: t('users'), icon: Users, component: UserSection, locked: true },
    { id: 'integrations', label: t('integrations'), icon: Globe, component: IntegrationSection, locked: true }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <RadiologyHeader />

      {/* Page Header */}
      <div className={`border-b ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className={`text-2xl font-bold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('radiologySettings')}</h1>
              <p className={`mt-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>{t('configureYourRadiologyInformationSystem')}</p>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                  darkMode
                    ? 'text-yellow-400 bg-yellow-900 bg-opacity-30'
                    : 'text-yellow-600 bg-yellow-50'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{t('unsavedChanges')}</span>
                </div>
              )}
              <button
                onClick={() => setShowSaveDialog(true)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  darkMode
                    ? 'bg-[#133037] hover:bg-[#07181D] text-[#C1D9DD]'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                {t('exportSettings')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.locked && setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors relative ${
                      activeTab === tab.id
                        ? darkMode
                          ? 'bg-[#133037] text-[#79CAC2] border-r-2 border-[#79CAC2]'
                          : 'bg-teal-50 text-teal-700 border-r-2 border-teal-500'
                        : tab.locked
                        ? darkMode
                          ? 'text-[#133037] cursor-not-allowed'
                          : 'text-gray-400 cursor-not-allowed'
                        : darkMode
                          ? 'text-[#C1D9DD] hover:bg-[#133037] hover:text-[#F5FEFF]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{t(tab.id === 'general' ? 'general' : tab.id === 'system' ? 'system' : tab.id === 'notifications' ? 'notifications' : tab.id === 'equipment' ? 'equipment' : tab.id === 'users' ? 'users' : 'integrations')}</span>
                    {tab.locked && (
                      <Shield className={`w-4 h-4 ml-auto ${
                        darkMode ? 'text-[#133037]' : 'text-gray-400'
                      }`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {tabs.find(tab => tab.id === activeTab)?.component()}
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-sm w-full mx-4 ${
            darkMode ? 'bg-[#0D2026]' : 'bg-white'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode
                  ? 'bg-[#133037]'
                  : 'bg-teal-100'
              }`}>
                <Check className={`w-6 h-6 ${
                  darkMode ? 'text-[#79CAC2]' : 'text-teal-600'
                }`} />
              </div>
              <div>
                <h3 className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{t('savingSettings')}</h3>
                <p className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{t('pleaseWait')}</p>
              </div>
            </div>
            <div className={`w-full rounded-full h-2 ${
              darkMode ? 'bg-[#133037]' : 'bg-gray-200'
            }`}>
              <div className={`h-2 rounded-full animate-pulse ${
                darkMode ? 'bg-[#79CAC2]' : 'bg-teal-500'
              }`} style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologySettingsModule;