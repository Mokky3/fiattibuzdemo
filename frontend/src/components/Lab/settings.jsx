import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Settings, Bell, Shield, Database, Users, Monitor, Printer, Wifi, Server, Clock, Mail, Phone, Globe, Save, X, Check, AlertTriangle, Info, Plus, Trash2, Edit } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { 
  getGeneralSettings, 
  patchGeneralSettings,
  getSystemSettings,
  patchSystemSettings,
  getNotificationSettings,
  patchNotificationSettings,
  getEquipmentSettings,
  patchEquipmentDefaults
} from '../../services/labService';


const LabSettingsModule = () => {
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
  const [error, setError] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    labName: 'Central Medical Laboratory',
    labCode: 'CML-001',
    address: '123 Medical Center Drive, New York, NY 10001',
    phone: '+1 (555) 123-4567',
    email: 'admin@centralmedlab.com',
    website: 'www.centralmedlab.com',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    language: 'en',
    currency: 'USD',
    workingHours: {
      start: '08:00',
      end: '18:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    systemMaintenance: {
      enabled: true,
      time: '02:00',
      day: 'sunday'
    },
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90
    },
    auditLogging: true,
    errorReporting: true
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    criticalAlerts: {
      enabled: true,
      methods: ['email', 'sms', 'push'],
      recipients: ['admin@centralmedlab.com', 'supervisor@centralmedlab.com']
    },
    reportDelivery: {
      enabled: true,
      schedule: 'weekly',
      day: 'monday',
      time: '09:00'
    },
    systemAlerts: {
      downtime: true,
      maintenance: true,
      backupStatus: true,
      lowStorage: true
    }
  });

  // Equipment Settings
  const [equipmentSettings, setEquipmentSettings] = useState({
    instruments: [
      {
        id: 'INST-001',
        name: 'Hematology Analyzer XN-1000',
        type: 'Hematology',
        status: 'active',
        location: 'Lab Room A',
        calibrationDue: '2025-07-15',
        maintenanceDue: '2025-08-01',
        settings: {
          autoStart: true,
          qualityControl: 'daily',
          dataBackup: true
        }
      },
      {
        id: 'INST-002',
        name: 'Chemistry Analyzer AU-5800',
        type: 'Chemistry',
        status: 'active',
        location: 'Lab Room B',
        calibrationDue: '2025-07-20',
        maintenanceDue: '2025-07-30',
        settings: {
          autoStart: true,
          qualityControl: 'daily',
          dataBackup: true
        }
      },
      {
        id: 'INST-003',
        name: 'PCR System 7500',
        type: 'Molecular',
        status: 'maintenance',
        location: 'Lab Room C',
        calibrationDue: '2025-06-30',
        maintenanceDue: '2025-06-29',
        settings: {
          autoStart: false,
          qualityControl: 'weekly',
          dataBackup: true
        }
      }
    ],
    defaultSettings: {
      calibrationInterval: 30,
      maintenanceInterval: 90,
      qualityControlFrequency: 'daily',
      alertThresholds: {
        reagentLow: 10,
        controlOutOfRange: 2,
        instrumentError: 'immediate'
      }
    }
  });

  // User Management Settings
  const [userSettings, setUserSettings] = useState({
    defaultRole: 'technician',
    autoApproval: false,
    userRoles: [
      {
        id: 'admin',
        name: 'Administrator',
        permissions: ['all'],
        description: 'Full system access'
      },
      {
        id: 'supervisor',
        name: 'Lab Supervisor',
        permissions: ['manage_orders', 'manage_results', 'manage_reports', 'view_all'],
        description: 'Supervisory access to lab operations'
      },
      {
        id: 'technician',
        name: 'Lab Technician',
        permissions: ['process_orders', 'enter_results', 'generate_reports'],
        description: 'Standard technician access'
      },
      {
        id: 'viewer',
        name: 'Viewer',
        permissions: ['view_results', 'view_reports'],
        description: 'Read-only access'
      }
    ],
    accountSettings: {
      passwordExpiry: 90,
      lockoutDuration: 15,
      inactivityTimeout: 30
    }
  });

  // Integration Settings
  const [integrationSettings, setIntegrationSettings] = useState({
    lis: {
      enabled: true,
      endpoint: 'https://api.hospitallis.com/v1',
      apiKey: '••••••••••••••••',
      syncFrequency: 'realtime'
    },
    billing: {
      enabled: true,
      provider: 'MedBill Pro',
      endpoint: 'https://api.medbillpro.com/v2',
      apiKey: '••••••••••••••••'
    },
    qc: {
      enabled: true,
      provider: 'QC Manager',
      autoSync: true,
      alertThreshold: 2
    },
    backup: {
      provider: 'Cloud Backup Pro',
      endpoint: 'https://backup.cloudpro.com',
      encryption: true,
      frequency: 'daily'
    }
  });

  // Fetch settings from backend on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [general, system, notification, equipment] = await Promise.all([
          getGeneralSettings().catch(() => null),
          getSystemSettings().catch(() => null),
          getNotificationSettings().catch(() => null),
          getEquipmentSettings().catch(() => null),
        ]);
        
        if (general) setGeneralSettings(general);
        if (system) setSystemSettings(system);
        if (notification) setNotificationSettings(notification);
        if (equipment) setEquipmentSettings(equipment);
      } catch (err) {
        console.error('Error loading settings:', err);
        setError(t('failedToLoadSettings'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Function to refresh specific settings section
  const refreshSettingsSection = async (section) => {
    try {
      switch (section) {
        case 'General':
          const general = await getGeneralSettings();
          if (general) setGeneralSettings(general);
          break;
        case 'System':
          const system = await getSystemSettings();
          if (system) setSystemSettings(system);
          break;
        case 'Notifications':
          const notification = await getNotificationSettings();
          if (notification) setNotificationSettings(notification);
          break;
        case 'Equipment':
          const equipment = await getEquipmentSettings();
          if (equipment) setEquipmentSettings(equipment);
          break;
        case 'Display':
          // Display settings don't exist in backend, skip refresh
          console.log('Display settings refresh skipped - no backend endpoint');
          break;
      }
    } catch (err) {
      console.error(`Error refreshing ${section} settings:`, err);
    }
  };

  const handleSaveSettings = async (section) => {
    try {
      setShowSaveDialog(true);
      
      // Make API calls to save the settings based on section
      switch (section) {
        case 'General':
          await patchGeneralSettings(generalSettings);
          break;
        case 'System':
          await patchSystemSettings(systemSettings);
          break;
        case 'Notifications':
          await patchNotificationSettings(notificationSettings);
          break;
        case 'Equipment':
          // Save equipment default settings
          await patchEquipmentDefaults(equipmentSettings.defaultSettings);
          break;
        case 'Display':
          // Display settings don't exist in backend, skip save
          console.log('Display settings save skipped - no backend endpoint');
          break;
        default:
          console.log(`Saving ${section} settings...`);
      }
      
      // Refresh the saved section from backend to get the latest data
      await refreshSettingsSection(section);
      
      setHasChanges(false);
      setSuccessMessage(t('settingsSavedSuccessfully', { section: t(section.toLowerCase()) }));
      setShowSuccessMessage(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
    } catch (err) {
      console.error(`Error saving ${section} settings:`, err);
      setSuccessMessage(t('failedToSaveSettingsPleaseTryAgain', { section: t(section.toLowerCase()) }));
      setShowSuccessMessage(true);
      
      // Hide error message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } finally {
      setShowSaveDialog(false);
    }
  };

  const getStatusColor = (status) => {
    if (darkMode) {
      switch (status) {
        case 'active': return 'text-green-300 bg-green-900 bg-opacity-30 border-green-700';
        case 'maintenance': return 'text-yellow-300 bg-yellow-900 bg-opacity-30 border-yellow-700';
        case 'inactive': return 'text-red-300 bg-red-900 bg-opacity-30 border-red-700';
        default: return 'text-gray-300 bg-gray-700 bg-opacity-30 border-gray-600';
      }
    } else {
      switch (status) {
        case 'active': return 'text-green-600 bg-green-50 border-green-200';
        case 'maintenance': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'inactive': return 'text-red-600 bg-red-50 border-red-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
  };

  const GeneralSection = () => (
    <div className="space-y-6">
      {/* Lab Information */}
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
          {t('laboratoryInformation')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('labName')}</label>
            <input
              type="text"
              value={generalSettings.labName}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, labName: e.target.value});
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
            }`}>{t('labCode')}</label>
            <input
              type="text"
              value={generalSettings.labCode}
              onChange={(e) => {
                setGeneralSettings({...generalSettings, labCode: e.target.value});
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

      {/* Working Hours */}
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
          {t('workingHours')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('startTime')}</label>
            <input
              type="time"
              value={generalSettings.workingHours.start}
              onChange={(e) => {
                setGeneralSettings({
                  ...generalSettings,
                  workingHours: {...generalSettings.workingHours, start: e.target.value}
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
              value={generalSettings.workingHours.end}
              onChange={(e) => {
                setGeneralSettings({
                  ...generalSettings,
                  workingHours: {...generalSettings.workingHours, end: e.target.value}
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
          }`}>{t('workingDays')}</label>
          <div className="flex flex-wrap gap-2">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
              <label key={day} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={generalSettings.workingHours.days.includes(day)}
                  onChange={(e) => {
                    const days = e.target.checked
                      ? [...generalSettings.workingHours.days, day]
                      : generalSettings.workingHours.days.filter(d => d !== day);
                    setGeneralSettings({
                      ...generalSettings,
                      workingHours: {...generalSettings.workingHours, days}
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
          disabled={!hasChanges}
          className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? hasChanges
                ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                : 'bg-gray-700 text-gray-500'
              : hasChanges
                ? 'bg-teal-500 hover:bg-teal-600 text-white'
                : 'bg-gray-300 text-gray-500'
          }`}
        >
          <Save className="w-4 h-4" />
          {t('saveChanges')}
        </button>
      </div>
    </div>
  );

  const SystemSection = () => (
    <div className="space-y-6">
      {/* Backup Settings */}
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
          {t('backupMaintenance')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('automaticBackup')}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('automaticallyBackupSystemData')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.autoBackup}
                onChange={(e) => {
                  setSystemSettings({...systemSettings, autoBackup: e.target.checked});
                  setHasChanges(true);
                }}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                darkMode
                  ? 'bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 peer-checked:bg-teal-500 after:border-gray-300'
              }`}></div>
            </label>
          </div>

          {systemSettings.autoBackup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>{t('backupFrequency')}</label>
                <select
                  value={systemSettings.backupFrequency}
                  onChange={(e) => {
                    setSystemSettings({...systemSettings, backupFrequency: e.target.value});
                    setHasChanges(true);
                  }}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500'
                  }`}
                >
                  <option value="hourly">{t('hourly')}</option>
                  <option value="daily">{t('daily')}</option>
                  <option value="weekly">{t('weekly')}</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>{t('retentionDays')}</label>
                <input
                  type="number"
                  value={systemSettings.backupRetention}
                  onChange={(e) => {
                    setSystemSettings({...systemSettings, backupRetention: parseInt(e.target.value)});
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
          )}
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('sessionTimeoutMinutes')}</label>
            <input
              type="number"
              value={systemSettings.sessionTimeout}
              onChange={(e) => {
                setSystemSettings({...systemSettings, sessionTimeout: parseInt(e.target.value)});
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
            }`}>{t('maxLoginAttempts')}</label>
            <input
              type="number"
              value={systemSettings.maxLoginAttempts}
              onChange={(e) => {
                setSystemSettings({...systemSettings, maxLoginAttempts: parseInt(e.target.value)});
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

        <div className="mt-6">
          <h4 className={`font-medium mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('passwordPolicy')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('minimumLength')}</label>
              <input
                type="number"
                value={systemSettings.passwordPolicy.minLength}
                onChange={(e) => {
                  setSystemSettings({
                    ...systemSettings,
                    passwordPolicy: {...systemSettings.passwordPolicy, minLength: parseInt(e.target.value)}
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
              }`}>{t('expiryDays')}</label>
              <input
                type="number"
                value={systemSettings.passwordPolicy.expiryDays}
                onChange={(e) => {
                  setSystemSettings({
                    ...systemSettings,
                    passwordPolicy: {...systemSettings.passwordPolicy, expiryDays: parseInt(e.target.value)}
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
          <div className="mt-4 space-y-2">
            {[
              { key: 'requireUppercase', label: t('requireUppercaseLetters') },
              { key: 'requireNumbers', label: t('requireNumbers') },
              { key: 'requireSpecialChars', label: t('requireSpecialCharacters') }
            ].map(policy => (
              <div key={policy.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={systemSettings.passwordPolicy[policy.key]}
                  onChange={(e) => {
                    setSystemSettings({
                      ...systemSettings,
                      passwordPolicy: {...systemSettings.passwordPolicy, [policy.key]: e.target.checked}
                    });
                    setHasChanges(true);
                  }}
                  className={`rounded focus:ring-2 transition-colors ${
                    darkMode
                      ? 'border-[#133037] text-[#79CAC2] focus:ring-[#79CAC2]'
                      : 'border-gray-300 text-teal-600 focus:ring-teal-500'
                  }`}
                />
                <span className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>{policy.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings('System')}
          className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {t('saveChanges')}
        </button>
      </div>
    </div>
  );

  const NotificationSection = () => (
    <div className="space-y-6">
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
                    checked={notificationSettings[method.key]}
                    onChange={(e) => {
                      setNotificationSettings({...notificationSettings, [method.key]: e.target.checked});
                      setHasChanges(true);
                    }}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    darkMode
                      ? 'bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
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
          {t('criticalAlerts')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{t('enableCriticalAlerts')}</div>
              <div className={`text-sm ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
              }`}>{t('sendImmediateNotificationsForCriticalResults')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.criticalAlerts.enabled}
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
                  ? 'bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-400 peer-checked:bg-red-500 after:border-gray-600'
                  : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 peer-checked:bg-red-500 after:border-gray-300'
              }`}></div>
            </label>
          </div>

          {notificationSettings.criticalAlerts.enabled && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
              }`}>{t('alertRecipients')}</label>
              <div className="space-y-2">
                {notificationSettings.criticalAlerts.recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="email"
                      value={recipient}
                      onChange={(e) => {
                        const newRecipients = [...notificationSettings.criticalAlerts.recipients];
                        newRecipients[index] = e.target.value;
                        setNotificationSettings({
                          ...notificationSettings,
                          criticalAlerts: {...notificationSettings.criticalAlerts, recipients: newRecipients}
                        });
                      }}
                      className={`flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                        darkMode
                          ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                          : 'border-gray-300 focus:ring-teal-500'
                      }`}
                    />
                    <button
                      onClick={() => {
                        const newRecipients = notificationSettings.criticalAlerts.recipients.filter((_, i) => i !== index);
                        setNotificationSettings({
                          ...notificationSettings,
                          criticalAlerts: {...notificationSettings.criticalAlerts, recipients: newRecipients}
                        });
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
                        recipients: [...notificationSettings.criticalAlerts.recipients, '']
                      }
                    });
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

      {/* System Alerts */}
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
          {t('systemAlerts')}
        </h3>
        <div className="space-y-4">
          {[
            { key: 'downtime', label: t('systemDowntime'), description: t('alertWhenSystemGoesOffline') },
            { key: 'maintenance', label: t('maintenanceSchedules'), description: t('upcomingMaintenanceNotifications') },
            { key: 'backupStatus', label: t('backupStatus'), description: t('backupSuccessFailureNotifications') },
            { key: 'lowStorage', label: t('lowStorage'), description: t('alertWhenStorageSpaceIsLow') }
          ].map(alert => (
            <div key={alert.key} className="flex items-center justify-between">
              <div>
                <div className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{alert.label}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{alert.description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.systemAlerts[alert.key]}
                  onChange={(e) => {
                    setNotificationSettings({
                      ...notificationSettings,
                      systemAlerts: {...notificationSettings.systemAlerts, [alert.key]: e.target.checked}
                    });
                    setHasChanges(true);
                  }}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  darkMode
                    ? 'bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#79CAC2] peer-checked:bg-[#79CAC2] after:border-gray-600'
                    : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 peer-checked:bg-teal-500 after:border-gray-300'
                }`}></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings('Notifications')}
          className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {t('saveChanges')}
        </button>
      </div>
    </div>
  );

  const EquipmentSection = () => (
    <div className="space-y-6">
      {/* Equipment List */}
      <div className={`rounded-lg border p-6 ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold border-l-4 pl-3 ${
            darkMode
              ? 'text-[#F5FEFF] border-[#79CAC2]'
              : 'text-gray-900 border-teal-500'
          }`}>
            {t('laboratoryEquipment')}
          </h3>
          <button className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}>
            <Plus className="w-4 h-4" />
            {t('addEquipment')}
          </button>
        </div>

        <div className="space-y-4">
          {equipmentSettings.instruments.map(instrument => (
            <div key={instrument.id} className={`border rounded-lg p-4 ${
              darkMode
                ? 'border-[#133037] bg-[#07181D]'
                : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{instrument.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(instrument.status)}`}>
                      {instrument.status === 'active' ? t('active') : 
                       instrument.status === 'maintenance' ? t('maintenance') : 
                       instrument.status === 'inactive' ? t('inactive') : 
                       instrument.status}
                    </span>
                  </div>
                  <div className={`text-sm mt-1 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>
                    {instrument.type} • {instrument.location}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className={darkMode ? 'text-[#8AA2A7] hover:text-[#79CAC2]' : 'text-gray-400 hover:text-gray-600'}>
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('calibrationDue')}:</span>
                  <div className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{instrument.calibrationDue}</div>
                </div>
                <div>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('maintenanceDue')}:</span>
                  <div className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{instrument.maintenanceDue}</div>
                </div>
                <div>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('qcFrequency')}:</span>
                  <div className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{instrument.settings.qualityControl}</div>
                </div>
              </div>

              <div className="mt-3 flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={instrument.settings.autoStart}
                    onChange={(e) => {
                      const updatedInstruments = equipmentSettings.instruments.map(inst =>
                        inst.id === instrument.id
                          ? {...inst, settings: {...inst.settings, autoStart: e.target.checked}}
                          : inst
                      );
                      setEquipmentSettings({...equipmentSettings, instruments: updatedInstruments});
                      setHasChanges(true);
                    }}
                    className={`rounded focus:ring-2 transition-colors ${
                      darkMode
                        ? 'border-[#133037] text-[#79CAC2] focus:ring-[#79CAC2]'
                        : 'border-gray-300 text-teal-600 focus:ring-teal-500'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('autoStart')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={instrument.settings.dataBackup}
                    onChange={(e) => {
                      const updatedInstruments = equipmentSettings.instruments.map(inst =>
                        inst.id === instrument.id
                          ? {...inst, settings: {...inst.settings, dataBackup: e.target.checked}}
                          : inst
                      );
                      setEquipmentSettings({...equipmentSettings, instruments: updatedInstruments});
                      setHasChanges(true);
                    }}
                    className={`rounded focus:ring-2 transition-colors ${
                      darkMode
                        ? 'border-[#133037] text-[#79CAC2] focus:ring-[#79CAC2]'
                        : 'border-gray-300 text-teal-600 focus:ring-teal-500'
                    }`}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('dataBackup')}</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Default Settings */}
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
          {t('defaultEquipmentSettings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('calibrationIntervalDays')}</label>
            <input
              type="number"
              value={equipmentSettings.defaultSettings.calibrationInterval}
              onChange={(e) => {
                setEquipmentSettings({
                  ...equipmentSettings,
                  defaultSettings: {...equipmentSettings.defaultSettings, calibrationInterval: parseInt(e.target.value)}
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
            }`}>{t('maintenanceIntervalDays')}</label>
            <input
              type="number"
              value={equipmentSettings.defaultSettings.maintenanceInterval}
              onChange={(e) => {
                setEquipmentSettings({
                  ...equipmentSettings,
                  defaultSettings: {...equipmentSettings.defaultSettings, maintenanceInterval: parseInt(e.target.value)}
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
            }`}>{t('qcFrequency')}</label>
            <select
              value={equipmentSettings.defaultSettings.qualityControlFrequency}
              onChange={(e) => {
                setEquipmentSettings({
                  ...equipmentSettings,
                  defaultSettings: {...equipmentSettings.defaultSettings, qualityControlFrequency: e.target.value}
                });
                setHasChanges(true);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2]'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            >
              <option value="daily">{t('daily')}</option>
              <option value="weekly">{t('weekly')}</option>
              <option value="monthly">{t('monthly')}</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('reagentLowAlert')}</label>
            <input
              type="number"
              value={equipmentSettings.defaultSettings.alertThresholds.reagentLow}
              onChange={(e) => {
                setEquipmentSettings({
                  ...equipmentSettings,
                  defaultSettings: {
                    ...equipmentSettings.defaultSettings,
                    alertThresholds: {...equipmentSettings.defaultSettings.alertThresholds, reagentLow: parseInt(e.target.value)}
                  }
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
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings('Equipment')}
          className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {t('saveChanges')}
        </button>
      </div>
    </div>
  );

  const UserSection = () => (
    <div className="space-y-6">
      {/* Locked Notice */}
      <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
        darkMode
          ? 'bg-[#07181D] border-[#133037]'
          : 'bg-gray-50 border-gray-300'
      }`}>
        <div className="flex flex-col items-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-[#133037]' : 'bg-gray-200'
          }`}>
            <Shield className={`w-8 h-8 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('userManagementLocked')}</h3>
            <p className={`mb-4 max-w-md ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>
              {t('advancedUserManagementFeaturesRequireAdministratorPrivileges')}
            </p>
            <button className={`px-6 py-2 rounded-lg cursor-not-allowed flex items-center gap-2 mx-auto ${
              darkMode
                ? 'bg-[#133037] text-[#8AA2A7]'
                : 'bg-gray-300 text-gray-500'
            }`}>
              <Shield className="w-4 h-4" />
              {t('requestAccess')}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content (Disabled) */}
      <div className={`rounded-lg border p-6 opacity-50 pointer-events-none ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold border-l-4 pl-3 ${
            darkMode
              ? 'text-[#8AA2A7] border-[#133037]'
              : 'text-gray-900 border-gray-300'
          }`}>
            {t('userRolesPermissions')}
          </h3>
          <button className={`px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2 ${
            darkMode
              ? 'bg-[#133037] text-[#8AA2A7]'
              : 'bg-gray-300 text-gray-500'
          }`}>
            <Plus className="w-4 h-4" />
            {t('addRole')}
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
      <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
        darkMode
          ? 'bg-[#07181D] border-[#133037]'
          : 'bg-gray-50 border-gray-300'
      }`}>
        <div className="flex flex-col items-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-[#133037]' : 'bg-gray-200'
          }`}>
            <Shield className={`w-8 h-8 ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{t('integrationFeaturesLocked')}</h3>
            <p className={`mb-4 max-w-md ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>
              {t('thirdPartyIntegrationsRequirePremiumLicense')}
            </p>
            <div className="flex space-x-3">
              <button className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                darkMode
                  ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
              }`}>
                <Globe className="w-4 h-4" />
                {t('upgradePlan')}
              </button>
              <button className={`px-6 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-[#133037] hover:bg-[#1a3f47] text-[#C1D9DD]'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}>
                {t('learnMore')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content (Disabled) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50 pointer-events-none">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-gray-300 pl-3">
          Laboratory Information System (LIS)
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-600">Enable LIS Integration</div>
              <div className="text-sm text-gray-400">Connect to hospital LIS system</div>
            </div>
            <div className="w-11 h-6 bg-gray-200 rounded-full relative">
              <div className="absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">API Endpoint</label>
              <input
                type="url"
                value="https://api.hospitallis.com/v1"
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">API Key</label>
              <input
                type="password"
                value="••••••••••••••••"
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
          Billing Integration
        </h3>
        <div className="text-sm text-gray-400 flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Premium feature - upgrade to unlock</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50 pointer-events-none">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-gray-300 pl-3">
          Quality Control Integration
        </h3>
        <div className="text-sm text-gray-400 flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Premium feature - upgrade to unlock</span>
        </div>
      </div>
    </div>
  );

  // Define tabs array with locked status
  const tabs = [
    { id: 'general', label: t('general'), icon: Settings, component: GeneralSection, locked: false },
    { id: 'system', label: t('system'), icon: Server, component: SystemSection, locked: true },
    { id: 'notifications', label: t('notifications'), icon: Bell, component: NotificationSection, locked: true },
    { id: 'equipment', label: t('equipment'), icon: Monitor, component: EquipmentSection, locked: true },
    { id: 'users', label: t('users'), icon: Users, component: UserSection, locked: true },
    { id: 'integrations', label: t('integrations'), icon: Globe, component: IntegrationSection, locked: true }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <LabHeader />

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
              }`}>{t('laboratorySettings')}</h1>
              <p className={`mt-1 ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>{t('configureYourLaboratoryManagementSystem')}</p>
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
                    ? 'bg-[#133037] hover:bg-[#1a3f47] text-[#C1D9DD]'
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
                          ? 'text-[#8AA2A7] cursor-not-allowed'
                          : 'text-gray-400 cursor-not-allowed'
                        : darkMode
                          ? 'text-[#C1D9DD] hover:bg-[#133037] hover:text-[#F5FEFF]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                    {tab.locked && (
                      <Shield className={`w-4 h-4 ml-auto ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                      }`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {(() => {
              const currentTab = tabs.find(tab => tab.id === activeTab);
              if (currentTab?.locked) {
                // Show locked message for locked tabs
                return (
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
                      {t('theModuleIsCurrentlyLockedAndUnavailable', { module: currentTab.label })}
                    </p>
                    <button
                      onClick={() => setActiveTab('general')}
                      className={`px-6 py-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                          : 'bg-teal-500 hover:bg-teal-600 text-white'
                      }`}
                    >
                      {t('returnToGeneralSettings')}
                    </button>
                  </div>
                );
              }
              return currentTab?.component();
            })()}
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
                darkMode ? 'bg-[#133037]' : 'bg-teal-100'
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

      {/* Success/Error Message Popup */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`rounded-lg p-4 shadow-lg max-w-sm ${
            successMessage.includes(t('failed')) 
              ? darkMode
                ? 'bg-red-900 bg-opacity-30 border border-red-700'
                : 'bg-red-50 border border-red-200'
              : darkMode
                ? 'bg-green-900 bg-opacity-30 border border-green-700'
                : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                successMessage.includes(t('failed'))
                  ? darkMode
                    ? 'bg-red-900 bg-opacity-50'
                    : 'bg-red-100'
                  : darkMode
                    ? 'bg-green-900 bg-opacity-50'
                    : 'bg-green-100'
              }`}>
                {successMessage.includes(t('failed')) ? (
                  <X className={`w-5 h-5 ${
                    darkMode ? 'text-red-300' : 'text-red-600'
                  }`} />
                ) : (
                  <Check className={`w-5 h-5 ${
                    darkMode ? 'text-green-300' : 'text-green-600'
                  }`} />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  successMessage.includes(t('failed'))
                    ? darkMode
                      ? 'text-red-300'
                      : 'text-red-800'
                    : darkMode
                      ? 'text-green-300'
                      : 'text-green-800'
                }`}>
                  {successMessage}
                </p>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className={`ml-2 transition-colors ${
                  successMessage.includes(t('failed'))
                    ? darkMode
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-red-400 hover:text-red-600'
                    : darkMode
                      ? 'text-green-400 hover:text-green-300'
                      : 'text-green-400 hover:text-green-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabSettingsModule;