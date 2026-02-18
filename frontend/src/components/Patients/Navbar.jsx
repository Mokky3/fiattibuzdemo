import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Bell, User, Menu, X, ChevronDown } from 'lucide-react';
import i18n from '../../i18n';

const Navbar = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const languageDropdownRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Current language
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    // Dispatch custom event for theme change
    window.dispatchEvent(new Event('themechange'));
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Handle language change
  const handleLanguageChange = async (lang) => {
    try {
      // Ensure language is normalized (remove any region codes)
      const normalizedLang = lang.split('-')[0];
      
      // Save to localStorage first
      localStorage.setItem('i18nextLng', normalizedLang);
      
      // Change language and wait for it to complete
      await i18n.changeLanguage(normalizedLang);
      
      // Update state
      setCurrentLanguage(normalizedLang);
      setLanguageDropdownOpen(false);
      
      // Double-check localStorage was saved
      if (localStorage.getItem('i18nextLng') !== normalizedLang) {
        localStorage.setItem('i18nextLng', normalizedLang);
      }
    } catch (error) {
      console.error('Error changing language:', error);
      // Fallback: still try to set it
      localStorage.setItem('i18nextLng', lang);
      i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
    }
  };

  // Available languages
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
  ];

  // Handle click outside mobile menu and language dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false);
      }
    };

    if (mobileMenuOpen || languageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen, languageDropdownOpen]);

  // Navigation handler using React Router
  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false); // Close mobile menu when navigating
  };

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { path: '/patient/appointment', label: t('patientNavbar.appointment') },
    { path: '/patient/records', label: t('patientNavbar.records') },
    { path: '/patient/prescription', label: t('patientNavbar.prescription') },
    { path: '/patient/hospital', label: t('patientNavbar.hospital') }
  ];

  return (
    <nav className={`${darkMode ? 'bg-gray-800' : 'bg-[#10b981]'} shadow-lg ${darkMode ? 'dark:shadow-gray-900' : ''} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Logo and Navigation */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            <button
              onClick={() => handleNavigation('/patient/dashboard')}
              className={`text-white text-xl sm:text-2xl font-bold transition-all duration-200 px-3 py-2 rounded-md ${
                isActive('/patient/dashboard')
                  ? darkMode ? 'bg-gray-700' : 'bg-[#059669]'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#10b981] hover:bg-opacity-80'
              }`}
            >
              FIATTIB
            </button>

            {/* Navigation links */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {navigationItems.map((item) => (
                <button 
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 text-white ${
                    isActive(item.path) 
                      ? darkMode ? 'bg-gray-700' : 'bg-[#059669]'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#10b981] hover:bg-opacity-80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right section - Search, Language, Dark Mode, Notifications, Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search bar */}
            <div className="flex relative">
              <input
                type="text"
                placeholder={t('patientNavbar.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-32 sm:w-48 px-4 py-2 pl-10 text-white placeholder-white border-none rounded-full focus:outline-none focus:ring-2 transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-700 placeholder-white/70 focus:ring-gray-500' 
                    : 'bg-white bg-opacity-20 placeholder-white placeholder-opacity-70 focus:ring-white focus:ring-opacity-50'
                }`}
              />
              <Search className={`absolute left-3 top-2.5 h-4 w-4 ${darkMode ? 'text-white/70' : 'text-white text-opacity-70'}`} />
            </div>

            {/* Language Selector */}
            <div className="relative" ref={languageDropdownRef}>
              <button
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className={`flex items-center space-x-1 px-2 py-2 rounded-full transition-all duration-200 ${
                  darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-white hover:bg-opacity-20 text-white'
                }`}
                aria-label="Select language"
              >
                <span className="text-sm sm:text-base">
                  {languages.find(lang => lang.code === currentLanguage)?.flag || '🌐'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {languageDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-40 rounded-md shadow-lg py-1 z-50 ${
                  darkMode ? 'bg-gray-800 shadow-gray-900' : 'bg-white'
                }`}>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2 ${
                        currentLanguage === lang.code
                          ? darkMode
                            ? 'bg-gray-700 text-green-400'
                            : 'bg-gray-100 text-gray-900'
                          : darkMode
                          ? 'text-gray-200 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <span className="ml-auto">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-white hover:bg-opacity-20 text-white'
              }`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Notification bell */}
            <button className={`flex text-white p-2 rounded-full transition-all duration-200 ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-white hover:bg-opacity-20'
            }`}>
              <Bell className="h-5 w-5" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center space-x-1 text-white px-3 py-2 rounded-full transition-all duration-200 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-[#059669] hover:bg-[#047857]'
                }`}
              >
                <User className="h-5 w-5" />
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Profile dropdown menu */}
              {profileDropdownOpen && (
                <>
                  <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                    darkMode ? 'bg-gray-800 shadow-gray-900' : 'bg-white'
                  }`}>
                    <button
                      onClick={() => {
                        handleNavigation('/patient/profile');
                        setProfileDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('patientNavbar.myProfile')}
                    </button>
                    <button
                      onClick={() => {
                        handleNavigation('/patient/settings');
                        setProfileDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('patientNavbar.settings')}
                    </button>
                    <div className={`border-t my-1 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />
                    <button
                      onClick={() => {
                        handleNavigation('/signin');
                        setProfileDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('patientNavbar.logout')}
                    </button>
                  </div>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                </>
              )}
            </div>

            {/* Mobile hamburger menu */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className={`md:hidden text-white p-2 rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-white hover:bg-opacity-20'
              }`}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className={`md:hidden px-4 py-4 space-y-2 ${darkMode ? 'bg-gray-800' : 'bg-[#10b981] bg-opacity-95'}`}>
          {/* Mobile search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={t('patientNavbar.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-3 pl-10 text-white placeholder-white border-none rounded-full focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 placeholder-white/70 focus:ring-gray-500' 
                  : 'bg-white bg-opacity-20 placeholder-white placeholder-opacity-70 focus:ring-white focus:ring-opacity-50'
              }`}
            />
            <Search className={`absolute left-3 top-3.5 h-4 w-4 ${darkMode ? 'text-white/70' : 'text-white text-opacity-70'}`} />
          </div>

          {/* Mobile Language Selector */}
          <div className={`mb-4 p-3 rounded-md ${
            darkMode ? 'bg-gray-700' : 'bg-white bg-opacity-20'
          }`}>
            <label className={`block text-xs font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-white text-opacity-80'
            }`}>
              Language
            </label>
            <div className="flex space-x-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                    currentLanguage === lang.code
                      ? darkMode
                        ? 'bg-gray-600 text-green-400'
                        : 'bg-white bg-opacity-30 text-white'
                      : darkMode
                      ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                      : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                  }`}
                >
                  {lang.flag} {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Dark Mode Toggle */}
          <div className={`mb-4 p-3 rounded-md flex items-center justify-between ${
            darkMode ? 'bg-gray-700' : 'bg-white bg-opacity-20'
          }`}>
            <span className={`text-sm font-medium ${
              darkMode ? 'text-gray-200' : 'text-white'
            }`}>
              Dark Mode
            </span>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-green-500' : 'bg-white bg-opacity-30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Mobile navigation links */}
          {navigationItems.map((item) => (
            <button 
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 text-white ${
                isActive(item.path) 
                  ? darkMode ? 'bg-gray-700' : 'bg-[#059669]'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Mobile profile section */}
          <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-white/20' : 'border-white border-opacity-20'}`}>
            <button 
              onClick={() => handleNavigation('/patient/profile')}
              className={`flex items-center space-x-2 text-white px-4 py-3 rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              <User className="h-5 w-5" />
              <span>{t('patientNavbar.profile')}</span>
            </button>
            <button 
              onClick={() => handleNavigation('/patient/settings')}
              className={`w-full text-left px-4 py-3 text-sm font-medium text-white rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              {t('patientNavbar.settings')}
            </button>
            <button 
              onClick={() => handleNavigation('/signin')}
              className={`w-full text-left px-4 py-3 text-sm font-medium text-white rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              {t('patientNavbar.logout')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;