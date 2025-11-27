import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Monitor, Bell } from 'lucide-react'

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

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [darkMode])
  
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notificationCount, setNotificationCount] = useState(3)
  const dropdownRef = useRef(null)

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