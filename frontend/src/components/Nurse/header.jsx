import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const NurseHeader = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)
  
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
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navigationItems = [
    { name: t('patients'), path: "/nurse/patients" },
    { name: t('medications'), path: "/nurse/medications" },
    { name: t('vitals'), path: "/nurse/vitals" },
    { name: t('tasks'), path: "/nurse/tasks" },
    { name: t('messages'), path: "/nurse/messages" },
    { name: t('reports'), path: "/nurse/reports" }
  ]

  return (
    <header className={`shadow-lg sticky top-0 z-50 transition-colors duration-500 ${
      darkMode
        ? 'bg-[#0D2026] border-b border-[#133037]'
        : 'bg-[#5ACCC3]'
    } text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="font-bold text-xl sm:text-2xl tracking-wider flex-shrink-0">
          <Link to="/nurse/dashboard" className="text-white no-underline hover:opacity-90 transition-all flex items-center">
            <span className="mr-1">FIATTIB</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-2 sm:space-x-3 lg:space-x-6 flex-1 justify-center min-w-0">
          {navigationItems && navigationItems.length > 0 ? navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-medium py-1 px-1 transition-all text-xs sm:text-sm lg:text-base uppercase whitespace-nowrap flex-shrink-0 ${
                location.pathname === item.path
                  ? darkMode
                    ? 'border-b-2 border-[#79CAC2] text-[#79CAC2]'
                    : 'border-b-2 border-white text-white'
                  : darkMode
                  ? 'text-[#C1D9DD] hover:text-[#79CAC2] hover:border-b-2 hover:border-[#79CAC2]'
                  : 'text-white hover:border-b-2 hover:border-white'
              }`}
            >
              {item.name || item.path}
            </Link>
          )) : (
            <div className="text-white text-xs">Loading...</div>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-5 relative flex-shrink-0">
          {/* Search Bar */}
          <div className={`flex items-center rounded-full px-3 sm:px-4 py-1.5 shadow-inner transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-opacity-50 ${
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
            <button 
              type="button"
              className={`transition-colors flex items-center ${
                darkMode
                  ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              aria-label={t('search')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-md transition-colors ${
              darkMode
                ? 'text-white hover:bg-[#133037]'
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
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
              SN
            </div>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-40 sm:w-48 rounded-lg shadow-lg z-50 border transition-colors ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <Link
                  to="/nurse/profile"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#F5FEFF] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👤 {t('myProfile')}
                </Link>
                <Link
                  to="/nurse/change-password"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#F5FEFF] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🔐 {t('changePassword')}
                </Link>
                <Link
                  to="/nurse/shift-schedule"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#F5FEFF] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📅 {t('shiftSchedule')}
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
              <button 
                type="button"
                className={`transition-colors flex items-center ${
                  darkMode
                    ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                aria-label={t('search')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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

export default NurseHeader