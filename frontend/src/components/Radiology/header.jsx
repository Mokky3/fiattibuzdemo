import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Monitor, Bell } from 'lucide-react'

export const RadiologyHeader = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notificationCount, setNotificationCount] = useState(3)
  const dropdownRef = useRef(null)

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
    <header className="bg-[#5ACCC3] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-2xl tracking-wider">
          <Link to="/radiology/dashboard" className="text-white no-underline hover:text-opacity-90 transition-all flex items-center">
            <span className="mr-1">RADIOLOGY PORTAL</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8">
          {[
            { name: "STUDIES", path: "/radiology/studies" },
            { name: "WORKLIST", path: "/radiology/worklist" },
            { name: "REPORTS", path: "/radiology/reports" },
            { name: "PACS", path: "/radiology/pacs" }
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-white font-medium py-1 hover:border-b-2 hover:border-white transition-all ${isActive(item.path)}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-5 relative">
          {/* Search Bar */}
          <div className="flex items-center bg-white rounded-full px-4 py-1.5 shadow-inner transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-white focus-within:ring-opacity-50">
            <input
              type="text"
              placeholder="SEARCH"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-800 text-sm w-28 placeholder-gray-400"
            />
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Access Icons */}
          <div className="flex items-center space-x-3">
            {/* PACS Viewer Quick Access */}
            <button 
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              title="PACS Viewer"
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm shadow-md hover:bg-gray-600 transition-colors cursor-pointer"
            >
              RT
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Link
                  to="/radiology/profile"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  👤 My Profile
                </Link>
                <Link
                  to="/radiology/settings"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  ⚙️ Settings
                </Link>
                <Link
                  to="/radiology/change-password"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  🔐 Change Password
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    navigate('/signin')
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
    </header>
  )
}

export default RadiologyHeader