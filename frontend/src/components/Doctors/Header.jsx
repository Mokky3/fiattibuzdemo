import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)

  const isActive = (path) => location.pathname === path ? "border-b-2 border-white" : ""

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
    { name: "APPOINTMENT", path: "/doctor/appointment" },
    { name: "PATIENT", path: "/doctor/patient" },
    { name: "DATA", path: "/doctor/stats" },
    { name: "RESOURCES", path: "/doctor/resources" },
    { name: "MESSAGES", path: "/doctor/messages" }
  ]

  return (
    <header className="bg-[#5ACCC3] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-xl sm:text-2xl tracking-wider">
          <Link to="/doctor/dashboard" className="text-white no-underline hover:text-opacity-90 transition-all flex items-center">
            <span className="mr-1">FIATTIB</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-4 lg:space-x-8">
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

        {/* Actions */}
        <div className="flex items-center space-x-3 sm:space-x-5 relative">
          {/* Search Bar - Hidden on mobile */}
          <div className="hidden sm:flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 shadow-inner transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-white focus-within:ring-opacity-50">
            <input
              type="text"
              placeholder="SEARCH"
              className="bg-transparent border-none outline-none text-gray-800 text-sm w-20 sm:w-28 placeholder-gray-400"
            />
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-md transition-colors"
            aria-label="Toggle mobile menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md hover:bg-gray-600 transition-colors cursor-pointer"
            >
              SR
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Link
                  to="/doctor/profile"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  👤 My Profile
                </Link>
                <Link
                  to="/doctor/change-password"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  🔐 Change Password
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    navigate('/')
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  🚪 Logout
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
          className="md:hidden bg-[#5ACCC3] border-t border-white border-opacity-20"
        >
          <div className="px-4 py-2 space-y-1">
            {/* Mobile Search */}
            <div className="flex items-center bg-white rounded-full px-4 py-2 mb-4">
              <input
                type="text"
                placeholder="SEARCH"
                className="bg-transparent border-none outline-none text-gray-800 text-sm flex-1"
              />
              <button className="text-gray-600 hover:text-gray-800 transition-colors">
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
                className={`block px-4 py-3 text-white font-medium hover:bg-white hover:bg-opacity-10 rounded-md transition-all text-sm ${isActive(item.path)}`}
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
