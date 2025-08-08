import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Search, User, Settings, LogOut } from 'lucide-react'

const getUserInitials = () => "SR" // or any dummy initials

export const ReceptionistHeader = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)

  const isActive = (path) => location.pathname === path ? "border-b-2 border-white" : ""

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
    { name: "DASHBOARD", path: "/reception/dashboard" },
    { name: "REGISTER", path: "/reception/register" },
    { name: "APPOINTMENTS", path: "/reception/appointments" },
    { name: "MESSAGES", path: "/reception/messages" }
  ]

  return (
    <header className="bg-[#4DB6B0] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-xl sm:text-2xl tracking-wider">
          <Link to="/reception/dashboard" className="text-white no-underline hover:text-opacity-90 transition-all flex items-center">
            <span className="mr-1">FIATTIB</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-4 lg:space-x-6">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-white font-medium py-1 hover:border-b-2 hover:border-white transition-all text-sm lg:text-base ${isActive(item.path)}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center space-x-3 sm:space-x-5 relative">
          {/* Search Bar */}
          <div className="hidden sm:flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 shadow-inner hover:shadow-md focus-within:ring-2 focus-within:ring-white focus-within:ring-opacity-50">
            <input
              type="text"
              placeholder="SEARCH"
              className="bg-transparent border-none outline-none text-gray-800 text-sm w-24 sm:w-28 placeholder-gray-400"
            />
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm shadow-md hover:bg-gray-600 cursor-pointer"
            >
              {getUserInitials()}
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Link
                  to="/reception/profile"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  👤 My Profile
                </Link>
                <Link
                  to="/reception/change-password"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  🔐 Change Password
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    navigate('/')
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  🚪 Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden bg-[#4DB6B0] bg-opacity-95 border-t border-white border-opacity-20">
          <div className="px-4 py-4 space-y-3">
            {/* Mobile search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="SEARCH"
                className="w-full pl-10 pr-4 py-2 bg-white rounded-full text-gray-800 text-sm placeholder-gray-400 border-none outline-none"
              />
            </div>

            {/* Mobile navigation */}
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-white font-medium py-2 px-3 rounded-lg transition-all text-sm ${
                    isActive(item.path) 
                      ? 'bg-white bg-opacity-20 border-l-4 border-white' 
                      : 'hover:bg-white hover:bg-opacity-20'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Mobile profile section */}
            <div className="border-t border-white border-opacity-20 pt-3 mt-3">
              <Link
                to="/reception/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white font-medium py-2 px-3 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all text-sm flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                👤 My Profile
              </Link>
              <Link
                to="/reception/change-password"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white font-medium py-2 px-3 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all text-sm flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                🔐 Change Password
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  navigate('/')
                  setMobileMenuOpen(false)
                }}
                className="w-full text-left text-white font-medium py-2 px-3 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all text-sm flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default ReceptionistHeader
