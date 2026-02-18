import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'

export const Header = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const languageDropdownRef = useRef(null)
  
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
      
      // Verify language was changed
      console.log('Header: Language changed to', normalizedLang, 'i18n.language is now:', i18n.language);
      
      // Check if resources are loaded
      const resources = i18n.getResourceBundle(normalizedLang, 'translation');
      console.log('Header: Resources for', normalizedLang, ':', resources ? 'Loaded' : 'NOT LOADED');
      
      // Check all available languages
      console.log('Header: All available languages:', i18n.languages);
      console.log('Header: Current language:', i18n.language);
      console.log('Header: Resource store:', i18n.store?.data);
      
      if (resources) {
        console.log('Header: doctorReport exists:', !!resources.doctorReport);
        console.log('Header: doctorReport.patientPortal:', resources.doctorReport?.patientPortal);
      } else {
        // Try to access resources directly from options
        const optionsResources = i18n.options?.resources?.[normalizedLang]?.translation;
        console.log('Header: Resources from options:', optionsResources ? 'Found' : 'NOT FOUND');
        if (optionsResources) {
          console.log('Header: doctorReport from options:', optionsResources.doctorReport?.patientPortal);
        }
      }
      
      // Test translation
      const testTranslation = i18n.t('doctorReport.patientPortal');
      console.log('Header: Test translation for doctorReport.patientPortal:', testTranslation);

      // Update state
      setCurrentLanguage(normalizedLang);
      setLanguageDropdownOpen(false);

      // Double-check localStorage was saved
      if (localStorage.getItem('i18nextLng') !== normalizedLang) {
        localStorage.setItem('i18nextLng', normalizedLang);
      }

      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: normalizedLang } }));
      
      // Force a small delay to ensure all components update
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: normalizedLang } }));
      }, 100);

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

  const isActive = (path) => {
    const active = location.pathname === path
    return active ? (darkMode ? "border-b-2 border-[#79CAC2]" : "border-b-2 border-white") : ""
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false)
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navigationItems = [
    { name: t('appointment'), path: "/doctor/appointment" },
    { name: t('patient'), path: "/doctor/patient" },
    { name: t('data'), path: "/doctor/stats" },
    // { name: t('resources'), path: "/doctor/resources" }, // Disabled
    { name: t('messages'), path: "/doctor/messages" }
  ]

  return (
    <header className={`shadow-lg sticky top-0 z-50 transition-colors duration-500 ${
      darkMode
        ? 'bg-[#0D2026] border-b border-[#133037]'
        : 'bg-[#5ACCC3]'
    } text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-xl sm:text-2xl tracking-wider">
          <Link to="/doctor/dashboard" className="text-white no-underline hover:opacity-90 transition-all flex items-center">
            <span className="mr-1">FIATTIB</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-4 lg:space-x-8">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-medium py-1 transition-all text-sm lg:text-base uppercase ${
                location.pathname === item.path
                  ? darkMode
                    ? 'border-b-2 border-[#79CAC2] text-[#79CAC2]'
                    : 'border-b-2 border-white text-white'
                  : darkMode
                  ? 'text-[#C1D9DD] hover:text-[#79CAC2] hover:border-b-2 hover:border-[#79CAC2]'
                  : 'text-white hover:border-b-2 hover:border-white'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-3 sm:space-x-5 relative">
          {/* Search Bar - Hidden on mobile */}
          <div className={`hidden sm:flex items-center rounded-full px-3 sm:px-4 py-1.5 shadow-inner transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-opacity-50 ${
            darkMode
              ? 'bg-[#07181D] focus-within:ring-[#79CAC2]'
              : 'bg-white focus-within:ring-white'
          }`}>
            <input
              type="text"
              placeholder={t('search')}
              className={`bg-transparent border-none outline-none text-sm w-20 sm:w-28 ${
                darkMode
                  ? 'text-[#F5FEFF] placeholder-[#8AA2A7]'
                  : 'text-gray-800 placeholder-gray-400'
              }`}
            />
            <button className={`transition-colors ${
              darkMode
                ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                : 'text-gray-600 hover:text-gray-800'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Language Selector */}
          <div className="relative" ref={languageDropdownRef}>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-md transition-colors ${
                darkMode
                  ? 'hover:bg-[#133037] text-white'
                  : 'hover:bg-white hover:bg-opacity-20 text-white'
              }`}
              aria-label="Select language"
            >
              <span className="text-sm sm:text-base">
                {languages.find(lang => lang.code === currentLanguage)?.flag || '🌐'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {languageDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-40 rounded-lg shadow-lg z-50 border transition-colors ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2 ${
                      currentLanguage === lang.code
                        ? darkMode
                          ? 'bg-[#133037] text-[#79CAC2]'
                          : 'bg-gray-100 text-gray-900'
                        : darkMode
                        ? 'text-[#F5FEFF] hover:bg-[#133037]'
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
            className={`p-2 rounded-md transition-colors ${
              darkMode
                ? 'hover:bg-[#133037] text-white'
                : 'hover:bg-white hover:bg-opacity-20 text-white'
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-md transition-colors"
            aria-label={t('toggleMobileMenu')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-[#133037] hover:bg-[#1A3A3A]'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              SR
            </div>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-40 sm:w-48 rounded-lg shadow-lg z-50 border transition-colors ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <Link
                  to="/doctor/profile"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#F5FEFF] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👤 {t('myProfile')}
                </Link>
                <Link
                  to="/doctor/change-password"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#F5FEFF] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🔐 {t('changePassword')}
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    navigate('/')
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#FB7185] hover:bg-[#2A0E15]'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  🚪 {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className={`md:hidden border-t transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border-[#133037]'
              : 'bg-[#5ACCC3] border-white border-opacity-20'
          }`}
        >
          <div className="px-4 py-2 space-y-1">
            {/* Mobile Search */}
            <div className={`flex items-center rounded-full px-4 py-2 mb-4 transition-colors ${
              darkMode
                ? 'bg-[#07181D]'
                : 'bg-white'
            }`}>
              <input
                type="text"
                placeholder={t('search')}
                className={`bg-transparent border-none outline-none text-sm flex-1 ${
                  darkMode
                    ? 'text-[#F5FEFF] placeholder-[#8AA2A7]'
                    : 'text-gray-800 placeholder-gray-400'
                }`}
              />
              <button className={`transition-colors ${
                darkMode
                  ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>

            {/* Mobile Language Selector */}
            <div className={`mb-4 p-3 rounded-md ${
              darkMode ? 'bg-[#07181D]' : 'bg-white bg-opacity-20'
            }`}>
              <label className={`block text-xs font-medium mb-2 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-white text-opacity-80'
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
                          ? 'bg-[#133037] text-[#79CAC2]'
                          : 'bg-white bg-opacity-30 text-white'
                        : darkMode
                        ? 'bg-[#133037] text-[#C1D9DD] hover:bg-[#1A3A3A]'
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
              darkMode ? 'bg-[#07181D]' : 'bg-white bg-opacity-20'
            }`}>
              <span className={`text-sm font-medium ${
                darkMode ? 'text-[#C1D9DD]' : 'text-white'
              }`}>
                Dark Mode
              </span>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-[#79CAC2]' : 'bg-white bg-opacity-30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 font-medium rounded-md transition-all text-sm uppercase ${
                  location.pathname === item.path
                    ? darkMode
                      ? 'bg-[#133037] text-[#79CAC2] border-l-2 border-[#79CAC2]'
                      : 'bg-white bg-opacity-20 text-white border-l-2 border-white'
                    : darkMode
                    ? 'text-[#C1D9DD] hover:bg-[#133037] hover:text-[#79CAC2]'
                    : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
