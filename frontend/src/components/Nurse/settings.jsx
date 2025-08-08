import React, { useState } from 'react';
import { Settings, Bell, Shield, Palette, Clock, Globe, Monitor, Smartphone, Volume2, Eye, Database, Download, Upload, RotateCcw, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import NurseHeader from './header';

const NurseSettingsModule = () => {
  const [activeSection, setActiveSection] = useState('notifications');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  const [settings, setSettings] = useState({
    // Notifications
    notifications: {
      email: {
        taskReminders: true,
        shiftAlerts: true,
        medicationDue: true,
        patientUpdates: false,
        systemUpdates: true,
        emergencyAlerts: true
      },
      push: {
        taskReminders: true,
        shiftAlerts: true,
        medicationDue: true,
        patientUpdates: true,
        systemUpdates: false,
        emergencyAlerts: true
      },
      sound: {
        enableSounds: true,
        volume: 70,
        emergencyTone: true,
        keyboardSounds: false
      },
      schedule: {
        quietHours: true,
        quietStart: '22:00',
        quietEnd: '07:00',
        weekendMode: false
      }
    },
    
    // Display & Interface
    display: {
      theme: 'light',
      colorScheme: 'default',
      fontSize: 'medium',
      compactMode: false,
      animations: true,
      highContrast: false
    },
    
    // Privacy & Security
    security: {
      sessionTimeout: 30,
      twoFactorAuth: false,
      biometricLogin: false,
      loginHistory: true,
      deviceTrust: true,
      dataEncryption: true
    },
    
    // Workflow Preferences
    workflow: {
      defaultView: 'table',
      autoRefresh: true,
      refreshInterval: 5,
      confirmActions: true,
      quickActions: true,
      keyboardShortcuts: true,
      autoSave: true,
      taskGrouping: 'priority'
    },
    
    // Regional Settings
    regional: {
      timezone: 'UTC+5',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      currency: 'USD',
      temperatureUnit: 'celsius',
      measurementSystem: 'metric'
    },
    
    // Data & Backup
    data: {
      autoBackup: true,
      backupFrequency: 'daily',
      dataRetention: '90days',
      exportFormat: 'csv',
      syncSettings: true
    }
  });

  const handleSettingChange = (section, subsection, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [setting]: value
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleDirectSettingChange = (section, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [setting]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = () => {
    // Simulate saving settings
    console.log('Saving settings:', settings);
    setHasUnsavedChanges(false);
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };

  const handleResetSection = (section) => {
    if (confirm('Are you sure you want to reset this section to default values?')) {
      // Reset logic would go here
      console.log(`Resetting section: ${section}`);
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5ACCC3] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
    </label>
  );

  const settingSections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display & Interface', icon: Palette },
    { id: 'security', label: 'Privacy & Security', icon: Shield },
    { id: 'workflow', label: 'Workflow Preferences', icon: Monitor },
    { id: 'regional', label: 'Regional Settings', icon: Globe },
    { id: 'data', label: 'Data & Backup', icon: Database }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NurseHeader />
      
      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-20 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Settings saved successfully!
        </div>
      )}
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#5ACCC3] flex items-center">
              <Settings className="mr-3 h-6 w-6" />
              Settings
            </h1>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <div className="flex items-center text-orange-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Unsaved changes</span>
                </div>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={!hasUnsavedChanges}
                className={`px-4 py-2 rounded flex items-center ${
                  hasUnsavedChanges 
                    ? 'bg-[#5ACCC3] text-white hover:bg-teal-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Settings Navigation */}
          <div className="w-64 mr-6">
            <div className="bg-white rounded-lg shadow p-4">
              <nav className="space-y-2">
                {settingSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left flex items-center px-3 py-2 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-[#5ACCC3] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <section.icon className="w-4 h-4 mr-3" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow">
              {/* Notifications Settings */}
              {activeSection === 'notifications' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                    <button
                      onClick={() => handleResetSection('notifications')}
                      className="text-gray-500 hover:text-gray-700 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Email Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Email Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          { key: 'taskReminders', label: 'Task Reminders', desc: 'Get notified about upcoming tasks' },
                          { key: 'shiftAlerts', label: 'Shift Alerts', desc: 'Notifications about shift changes' },
                          { key: 'medicationDue', label: 'Medication Due', desc: 'Alerts for medication administration' },
                          { key: 'patientUpdates', label: 'Patient Updates', desc: 'Important patient status changes' },
                          { key: 'systemUpdates', label: 'System Updates', desc: 'System maintenance and updates' },
                          { key: 'emergencyAlerts', label: 'Emergency Alerts', desc: 'Critical emergency notifications' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{item.label}</h4>
                              <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                            <ToggleSwitch
                              checked={settings.notifications.email[item.key]}
                              onChange={(e) => handleSettingChange('notifications', 'email', item.key, e.target.checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Push Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Smartphone className="w-5 h-5 mr-2" />
                        Push Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          { key: 'taskReminders', label: 'Task Reminders' },
                          { key: 'shiftAlerts', label: 'Shift Alerts' },
                          { key: 'medicationDue', label: 'Medication Due' },
                          { key: 'patientUpdates', label: 'Patient Updates' },
                          { key: 'systemUpdates', label: 'System Updates' },
                          { key: 'emergencyAlerts', label: 'Emergency Alerts' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3 border rounded">
                            <span className="font-medium text-gray-900">{item.label}</span>
                            <ToggleSwitch
                              checked={settings.notifications.push[item.key]}
                              onChange={(e) => handleSettingChange('notifications', 'push', item.key, e.target.checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sound Settings */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Volume2 className="w-5 h-5 mr-2" />
                        Sound Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium text-gray-900">Enable Notification Sounds</span>
                          <ToggleSwitch
                            checked={settings.notifications.sound.enableSounds}
                            onChange={(e) => handleSettingChange('notifications', 'sound', 'enableSounds', e.target.checked)}
                          />
                        </div>
                        
                        <div className="p-3 border rounded">
                          <label className="block font-medium text-gray-900 mb-2">Volume Level</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.notifications.sound.volume}
                            onChange={(e) => handleSettingChange('notifications', 'sound', 'volume', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-sm text-gray-600 mt-1">
                            <span>0%</span>
                            <span>{settings.notifications.sound.volume}%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Quiet Hours
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <span className="font-medium text-gray-900">Enable Quiet Hours</span>
                            <p className="text-sm text-gray-600">Reduce notifications during specified hours</p>
                          </div>
                          <ToggleSwitch
                            checked={settings.notifications.schedule.quietHours}
                            onChange={(e) => handleSettingChange('notifications', 'schedule', 'quietHours', e.target.checked)}
                          />
                        </div>
                        
                        {settings.notifications.schedule.quietHours && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                              <input
                                type="time"
                                value={settings.notifications.schedule.quietStart}
                                onChange={(e) => handleSettingChange('notifications', 'schedule', 'quietStart', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                              <input
                                type="time"
                                value={settings.notifications.schedule.quietEnd}
                                onChange={(e) => handleSettingChange('notifications', 'schedule', 'quietEnd', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Display & Interface Settings */}
              {activeSection === 'display' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Display & Interface</h2>
                    <button
                      onClick={() => handleResetSection('display')}
                      className="text-gray-500 hover:text-gray-700 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                        <select
                          value={settings.display.theme}
                          onChange={(e) => handleDirectSettingChange('display', 'theme', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto (System)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                        <select
                          value={settings.display.colorScheme}
                          onChange={(e) => handleDirectSettingChange('display', 'colorScheme', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                        >
                          <option value="default">Default (Teal)</option>
                          <option value="blue">Blue</option>
                          <option value="green">Green</option>
                          <option value="purple">Purple</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                        <select
                          value={settings.display.fontSize}
                          onChange={(e) => handleDirectSettingChange('display', 'fontSize', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                          <option value="extra-large">Extra Large</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing and padding for more content' },
                        { key: 'animations', label: 'Enable Animations', desc: 'Smooth transitions and visual effects' },
                        { key: 'highContrast', label: 'High Contrast Mode', desc: 'Increase contrast for better visibility' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.label}</h4>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <ToggleSwitch
                            checked={settings.display[item.key]}
                            onChange={(e) => handleDirectSettingChange('display', item.key, e.target.checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeSection === 'security' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Privacy & Security</h2>
                    <button
                      onClick={() => handleResetSection('security')}
                      className="text-gray-500 hover:text-gray-700 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                      <select
                        value={settings.security.sessionTimeout}
                        onChange={(e) => handleDirectSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                        className="w-full max-w-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={0}>Never</option>
                      </select>
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { key: 'twoFactorAuth', label: 'Two-Factor Authentication', desc: 'Add extra security layer to your account' },
                        { key: 'biometricLogin', label: 'Biometric Login', desc: 'Use fingerprint or face recognition' },
                        { key: 'loginHistory', label: 'Login History Tracking', desc: 'Keep track of login attempts' },
                        { key: 'deviceTrust', label: 'Trusted Devices', desc: 'Remember trusted devices for faster login' },
                        { key: 'dataEncryption', label: 'Data Encryption', desc: 'Encrypt sensitive data at rest', disabled: true }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.label}</h4>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <ToggleSwitch
                            checked={settings.security[item.key]}
                            onChange={(e) => handleDirectSettingChange('security', item.key, e.target.checked)}
                            disabled={item.disabled}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Workflow Preferences */}
              {activeSection === 'workflow' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Workflow Preferences</h2>
                    <button
                      onClick={() => handleResetSection('workflow')}
                      className="text-gray-500 hover:text-gray-700 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default View Mode</label>
                        <select
                          value={settings.workflow.defaultView}
                          onChange={(e) => handleDirectSettingChange('workflow', 'defaultView', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                        >
                          <option value="table">Table View</option>
                          <option value="cards">Card View</option>
                          <option value="list">List View</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Task Grouping</label>
                        <select
                          value={settings.workflow.taskGrouping}
                          onChange={(e) => handleDirectSettingChange('workflow', 'taskGrouping', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                        >
                          <option value="priority">By Priority</option>
                          <option value="patient">By Patient</option>
                          <option value="time">By Time</option>
                          <option value="status">By Status</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Auto Refresh Interval</label>
                        <select
                          value={settings.workflow.refreshInterval}
                          onChange={(e) => handleDirectSettingChange('workflow', 'refreshInterval', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                          disabled={!settings.workflow.autoRefresh}
                        >
                          <option value={1}>1 minute</option>
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={30}>30 minutes</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { key: 'autoRefresh', label: 'Auto Refresh', desc: 'Automatically refresh data periodically' },
                        { key: 'confirmActions', label: 'Confirm Actions', desc: 'Show confirmation dialogs for critical actions' },
                        { key: 'quickActions', label: 'Quick Actions', desc: 'Enable quick action buttons and shortcuts' },
                        { key: 'keyboardShortcuts', label: 'Keyboard Shortcuts', desc: 'Enable keyboard navigation and shortcuts' },
                        { key: 'autoSave', label: 'Auto Save', desc: 'Automatically save form data as you type' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.label}</h4>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <ToggleSwitch
                            checked={settings.workflow[item.key]}
                            onChange={(e) => handleDirectSettingChange('workflow', item.key, e.target.checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Regional Settings */}
              {activeSection === 'regional' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Regional Settings</h2>
                    <button
                      onClick={() => handleResetSection('regional')}
                      className="text-gray-500 hover:text-gray-700 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select
                        value={settings.regional.language}
                        onChange={(e) => handleDirectSettingChange('regional', 'language', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                      >
                        <option value="en">English</option>
                        <option value="uz">Uzbek</option>
                        <option value="ru">Russian</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select
                        value={settings.regional.timezone}
                        onChange={(e) => handleDirectSettingChange('regional', 'timezone', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                      >
                        <option value="UTC+5">UTC+5 (Tashkent)</option>
                        <option value="UTC+0">UTC+0 (GMT)</option>
                        <option value="UTC-5">UTC-5 (EST)</option>
                        <option value="UTC-8">UTC-8 (PST)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                      <select
                        value={settings.regional.dateFormat}
                        onChange={(e) => handleDirectSettingChange('regional', 'dateFormat', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                      <select
                        value={settings.regional.timeFormat}
                        onChange={(e) => handleDirectSettingChange('regional', 'timeFormat', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                      >
                        <option value="12h">12 Hour (AM/PM)</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Unit</label>
                      <select
                        value={settings.regional.temperatureUnit}
                        onChange={(e) => handleDirectSettingChange('regional', 'temperatureUnit', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                      >
                        <option value="celsius">Celsius (°C)</option>
                        <option value="fahrenheit">Fahrenheit (°F)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Measurement System</label>
                      <select
                        value={settings.regional.measurementSystem}
                        onChange={(e) => handleDirectSettingChange('regional', 'measurementSystem', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                      >
                        <option value="metric">Metric (kg, cm)</option>
                        <option value="imperial">Imperial (lbs, ft/in)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Data & Backup Settings */}
              {activeSection === 'data' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Data & Backup</h2>
                    <button
                      onClick={() => handleResetSection('data')}
                      className="text-gray-500 hover:text-gray-700 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Backup Settings */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">Automatic Backup</h4>
                            <p className="text-sm text-gray-600">Automatically backup your data</p>
                          </div>
                          <ToggleSwitch
                            checked={settings.data.autoBackup}
                            onChange={(e) => handleDirectSettingChange('data', 'autoBackup', e.target.checked)}
                          />
                        </div>
                        
                        {settings.data.autoBackup && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                              <select
                                value={settings.data.backupFrequency}
                                onChange={(e) => handleDirectSettingChange('data', 'backupFrequency', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
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
                                value={settings.data.dataRetention}
                                onChange={(e) => handleDirectSettingChange('data', 'dataRetention', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                              >
                                <option value="30days">30 Days</option>
                                <option value="90days">90 Days</option>
                                <option value="1year">1 Year</option>
                                <option value="forever">Forever</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Export/Import */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Data Export/Import</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                          <select
                            value={settings.data.exportFormat}
                            onChange={(e) => handleDirectSettingChange('data', 'exportFormat', e.target.value)}
                            className="w-full max-w-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ACCC3]"
                          >
                            <option value="csv">CSV</option>
                            <option value="excel">Excel</option>
                            <option value="json">JSON</option>
                            <option value="pdf">PDF</option>
                          </select>
                        </div>
                        
                        <div className="flex space-x-4">
                          <button className="bg-[#5ACCC3] text-white px-4 py-2 rounded hover:bg-teal-600 flex items-center">
                            <Download className="w-4 h-4 mr-2" />
                            Export Data
                          </button>
                          <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center">
                            <Upload className="w-4 h-4 mr-2" />
                            Import Data
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sync Settings */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Synchronization</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">Sync Settings Across Devices</h4>
                            <p className="text-sm text-gray-600">Keep your settings synchronized across all devices</p>
                          </div>
                          <ToggleSwitch
                            checked={settings.data.syncSettings}
                            onChange={(e) => handleDirectSettingChange('data', 'syncSettings', e.target.checked)}
                          />
                        </div>
                        
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                            <div>
                              <h4 className="font-medium text-blue-900">Data Usage Notice</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                Enabling sync will use your internet connection to keep settings updated across devices. 
                                This may impact data usage on mobile connections.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Storage Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-gray-700">Local Storage Used</span>
                          <span className="font-medium">2.3 MB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-gray-700">Cache Size</span>
                          <span className="font-medium">1.8 MB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-gray-700">Last Backup</span>
                          <span className="font-medium">Today, 3:24 AM</span>
                        </div>
                        
                        <button className="w-full mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Clear All Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseSettingsModule;