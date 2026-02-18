import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Search, User, Settings, LogOut } from 'lucide-react'

const getUserInitials = () => {
  // Try to get user info from localStorage
  const userInfo = localStorage.getItem('user')
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo)
      const firstName = user.firstName || user.first_name || ''
      const lastName = user.lastName || user.last_name || ''
      if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      }
    } catch (e) {
      console.error('Failed to parse user info:', e)
    }
  }
  return "SR" // fallback
}

export const ReceptionistHeader = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [darkMode])

  const isActive = (path) => {
    if (location.pathname === path) {
      return darkMode ? "border-b-2 border-[#79CAC2]" : "border-b-2 border-white"
    }
    return ""
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navigationItems = [
    { name: t('dashboard'), path: "/reception/dashboard" },
    { name: t('registerPatient'), path: "/reception/register" },
    { name: t('appointments'), path: "/reception/appointments" },
    { name: t('messages'), path: "/reception/messages" }
  ]

  return (
    <header className={`shadow-lg sticky top-0 z-50 transition-colors ${
      darkMode 
        ? 'bg-[#0D2026] border-b border-[#133037]' 
        : 'bg-[#4DB6B0]'
    }`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between ${
        darkMode ? 'text-[#F5FEFF]' : 'text-white'
      }`}>
        {/* Logo */}
        <div className="font-bold text-xl sm:text-2xl tracking-wider">
          <Link 
            to="/reception/dashboard" 
            className={`no-underline hover:opacity-90 transition-all flex items-center ${
              darkMode ? 'text-[#F5FEFF]' : 'text-white'
            }`}
          >
            <span className="mr-1">FIATTIB</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex overflow-x-auto whitespace-nowrap space-x-4 lg:space-x-6">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`shrink-0 font-medium py-1 px-2 transition-all text-sm lg:text-base uppercase ${
                darkMode
                  ? location.pathname === item.path
                    ? 'text-[#79CAC2] border-b-2 border-[#79CAC2]'
                    : 'text-[#C1D9DD] hover:text-[#79CAC2] hover:border-b-2 hover:border-[#79CAC2]'
                  : location.pathname === item.path
                    ? 'text-white border-b-2 border-white'
                    : 'text-white hover:border-b-2 hover:border-white'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center space-x-3 sm:space-x-5 relative">
          {/* Search Bar */}
          <div className={`hidden sm:flex items-center rounded-full px-3 sm:px-4 py-1.5 shadow-inner hover:shadow-md focus-within:ring-2 focus-within:ring-opacity-50 transition-colors ${
            darkMode
              ? 'bg-[#07181D] focus-within:ring-[#79CAC2]'
              : 'bg-white focus-within:ring-white'
          }`}>
            <input
              type="text"
              placeholder={t('search')}
              className={`bg-transparent border-none outline-none text-sm w-24 sm:w-28 transition-colors ${
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
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-md cursor-pointer transition-colors ${
                darkMode
                  ? 'bg-[#133037] text-[#79CAC2] hover:bg-[#1a3d47]'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {getUserInitials()}
            </div>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 border rounded-lg shadow-lg z-50 transition-colors ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <Link
                  to="/reception/profile"
                  className={`block px-4 py-3 text-sm flex items-center gap-2 transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <User className="h-4 w-4" />
                  {t('myProfile')}
                </Link>
                <Link
                  to="/reception/settings"
                  className={`block px-4 py-3 text-sm flex items-center gap-2 transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  {t('settings')}
                </Link>
                <Link
                  to="/reception/change-password"
                  className={`block px-4 py-3 text-sm flex items-center gap-2 transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  {t('changePassword')}
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    navigate('/')
                  }}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 transition-colors ${
                    darkMode
                      ? 'text-red-400 hover:bg-[#2A0E15]'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-md transition-colors ${
              darkMode
                ? 'text-[#C1D9DD] hover:bg-[#133037]'
                : 'text-white hover:bg-white hover:bg-opacity-20'
            }`}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className={`md:hidden border-t transition-colors ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-[#4DB6B0] bg-opacity-95 border-white border-opacity-20'
        }`}>
          <div className="px-4 py-4 space-y-3">
            {/* Mobile search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder={t('search')}
                className={`w-full pl-10 pr-4 py-2 rounded-full text-sm border-none outline-none transition-colors ${
                  darkMode
                    ? 'bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7]'
                    : 'bg-white text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Mobile navigation */}
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block font-medium py-2 px-3 rounded-lg transition-all text-sm uppercase ${
                    darkMode
                      ? location.pathname === item.path
                        ? 'text-[#79CAC2] bg-[#133037] border-l-4 border-[#79CAC2]'
                        : 'text-[#C1D9DD] hover:bg-[#133037]'
                      : location.pathname === item.path
                        ? 'text-white bg-white bg-opacity-20 border-l-4 border-white'
                        : 'text-white hover:bg-white hover:bg-opacity-20'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Mobile profile section */}
            <div className={`border-t pt-3 mt-3 transition-colors ${
              darkMode ? 'border-[#133037]' : 'border-white border-opacity-20'
            }`}>
              <Link
                to="/reception/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`block font-medium py-2 px-3 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'text-[#C1D9DD] hover:bg-[#133037]'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <User className="h-4 w-4" />
                {t('myProfile')}
              </Link>
              <Link
                to="/reception/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`block font-medium py-2 px-3 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'text-[#C1D9DD] hover:bg-[#133037]'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <Settings className="h-4 w-4" />
                {t('settings')}
              </Link>
              <Link
                to="/reception/change-password"
                onClick={() => setMobileMenuOpen(false)}
                className={`block font-medium py-2 px-3 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'text-[#C1D9DD] hover:bg-[#133037]'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <Settings className="h-4 w-4" />
                {t('changePassword')}
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  navigate('/')
                  setMobileMenuOpen(false)
                }}
                className={`w-full text-left font-medium py-2 px-3 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'text-red-400 hover:bg-[#2A0E15]'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <LogOut className="h-4 w-4" />
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default ReceptionistHeader
