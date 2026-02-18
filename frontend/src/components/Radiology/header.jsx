import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Monitor, Bell } from 'lucide-react'
import i18n from '../../i18n'

export const RadiologyHeader = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  // Current language
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en')

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    // Dispatch custom event for theme change
    window.dispatchEvent(new Event('themechange'))
  }, [darkMode])

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev)
  }

  // Handle language change
  const handleLanguageChange = async (lang) => {
    try {
      // Ensure language is normalized (remove any region codes)
      const normalizedLang = lang.split('-')[0]
      
      // Save to localStorage first
      localStorage.setItem('i18nextLng', normalizedLang)
      
      // Change language and wait for it to complete
      await i18n.changeLanguage(normalizedLang)
      
      // Update state
      setCurrentLanguage(normalizedLang)
      setLanguageDropdownOpen(false)
      
      // Double-check localStorage was saved
      if (localStorage.getItem('i18nextLng') !== normalizedLang) {
        localStorage.setItem('i18nextLng', normalizedLang)
      }
    } catch (error) {
      console.error('Error changing language:', error)
      // Fallback: still try to set it
      localStorage.setItem('i18nextLng', lang)
      i18n.changeLanguage(lang)
      setCurrentLanguage(lang)
    }
  }

  // Available languages
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
  ]
  
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notificationCount, setNotificationCount] = useState(3)
  const dropdownRef = useRef(null)
  const languageDropdownRef = useRef(null)

  const isActive = (path) => {
    if (location.pathname === path) {
      return darkMode ? "border-b-2 border-[#79CAC2]" : "border-b-2 border-white"
    }
    return ""
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className={`shadow-lg sticky top-0 z-50 transition-colors duration-500 ${
      darkMode
        ? 'bg-[#0D2026] text-[#F5FEFF] border-b border-[#133037]'
        : 'bg-[#5ACCC3] text-white'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-2xl tracking-wider">
          <Link 
            to="/radiology/dashboard" 
            className={`no-underline transition-all flex items-center ${
              darkMode
                ? 'text-[#F5FEFF] hover:text-[#79CAC2]'
                : 'text-white hover:text-opacity-90'
            }`}
          >
            <span className="mr-1">{t('radiologyPortal')}</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8">
          {[
            { name: t('studies'), path: "/radiology/studies" },
            { name: t('worklist'), path: "/radiology/worklist" },
            { name: t('reports'), path: "/radiology/reports" },
            { name: t('pacs'), path: "/radiology/pacs" }
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-medium py-1 transition-all ${
                darkMode
                  ? `hover:border-b-2 hover:border-[#79CAC2] ${isActive(item.path)}`
                  : `text-white hover:border-b-2 hover:border-white ${isActive(item.path)}`
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-5 relative">
          {/* Search Bar */}
          <div className={`flex items-center rounded-full px-4 py-1.5 shadow-inner transition-all hover:shadow-md focus-within:ring-2 ${
            darkMode
              ? 'bg-[#07181D] focus-within:ring-[#79CAC2] focus-within:ring-opacity-50'
              : 'bg-white focus-within:ring-white focus-within:ring-opacity-50'
          }`}>
            <input
              type="text"
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-transparent border-none outline-none text-sm w-28 ${
                darkMode
                  ? 'text-[#F5FEFF] placeholder-[#8AA2A7]'
                  : 'text-gray-800 placeholder-gray-400'
              }`}
            />
            <button className={`transition-colors ${
              darkMode
                ? 'text-[#8AA2A7] hover:text-[#C1D9DD]'
                : 'text-gray-600 hover:text-gray-800'
            }`}>
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Language Selector */}
          <div className="relative" ref={languageDropdownRef}>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-[#133037] text-[#F5FEFF]'
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
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-[#133037] text-[#F5FEFF]'
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

          {/* Quick Access Icons */}
          <div className="flex items-center space-x-3">
            {/* PACS Viewer Quick Access */}
            <button 
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-[#133037] hover:bg-[#07181D]'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={t('pacsViewer')}
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className={`relative p-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-[#133037] hover:bg-[#07181D]'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}>
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${
                  darkMode ? 'bg-red-500' : 'bg-red-500'
                }`}>
                  {notificationCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-[#133037] text-[#F5FEFF] hover:bg-[#07181D]'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              RT
            </div>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 ${
                darkMode
                  ? 'bg-[#0D2026] border border-[#133037]'
                  : 'bg-white border border-gray-200'
              }`}>
                <Link
                  to="/radiology/profile"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👤 {t('myProfile')}
                </Link>
                <Link
                  to="/radiology/settings"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  ⚙️ {t('settings')}
                </Link>
                <Link
                  to="/radiology/change-password"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🔐 {t('changePassword')}
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    navigate('/signin')
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-red-400 hover:bg-red-900 hover:bg-opacity-30'
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
    </header>
  )
}

export default RadiologyHeader