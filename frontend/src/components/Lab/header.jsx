import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export const LabHeader = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

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

  const isActive = (path) => location.pathname === path ? "border-b-2 border-white" : ""

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
        ? 'bg-[#0D2026] text-[#F5FEFF]'
        : 'bg-[#5ACCC3] text-white'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-2xl tracking-wider">
          <Link to="/lab/dashboard" className={`no-underline transition-all flex items-center ${
            darkMode
              ? 'text-[#F5FEFF] hover:text-[#79CAC2]'
              : 'text-white hover:text-opacity-90'
          }`}>
            <span className="mr-1">{t('labPortal')}</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8">
          {[
            { name: t('orders'), path: "/lab/orders" },
            { name: t('patients'), path: "/lab/patients" },
            { name: t('results'), path: "/lab/results" },
            { name: t('reports'), path: "/lab/reports" },
            { name: t('messages'), path: "/lab/messages" }
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-medium py-1 transition-all ${
                darkMode
                  ? isActive(item.path)
                    ? 'border-b-2 border-[#79CAC2] text-[#79CAC2]'
                    : 'text-[#C1D9DD] hover:border-b-2 hover:border-[#79CAC2] hover:text-[#79CAC2]'
                  : isActive(item.path)
                    ? 'border-b-2 border-white text-white'
                    : 'text-white hover:border-b-2 hover:border-white'
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
                ? 'text-[#8AA2A7] hover:text-[#79CAC2]'
                : 'text-gray-600 hover:text-gray-800'
            }`}>
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Profile Dropdown (click-to-toggle) */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-[#133037] text-[#79CAC2] hover:bg-[#1a3f47]'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              LT
            </div>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 border rounded-lg shadow-lg z-50 ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <Link
                  to="/lab/profile"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👤 {t('myProfile')}
                </Link>
                <Link
                  to="/lab/settings"
                  className={`block px-4 py-3 text-sm transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:bg-[#133037]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  ⚙️ {t('settings')}
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    navigate('/')
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

export default LabHeader