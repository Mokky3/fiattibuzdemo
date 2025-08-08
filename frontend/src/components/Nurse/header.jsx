import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export const NurseHeader = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
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
          <Link to="/nurse/dashboard" className="text-white no-underline hover:text-opacity-90 transition-all flex items-center">
            <span className="mr-1">NURSECAREPLUS</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8">
          {[
            { name: "PATIENTS", path: "/nurse/patients" },
            { name: "MEDICATIONS", path: "/nurse/medications" },
            { name: "VITALS", path: "/nurse/vitals" },
            { name: "TASKS", path: "/nurse/tasks" },
            { name: "REPORTS", path: "/nurse/reports" }
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
              className="bg-transparent border-none outline-none text-gray-800 text-sm w-28 placeholder-gray-400"
            />
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Profile Dropdown (click-to-toggle) */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm shadow-md hover:bg-gray-600 transition-colors cursor-pointer"
            >
              SN
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Link
                  to="/nurse/profile"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  👤 My Profile
                </Link>
                <Link
                  to="/nurse/change-password"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  🔐 Change Password
                </Link>
                <Link
                  to="/nurse/shift-schedule"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                >
                  📅 Shift Schedule
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
    </header>
  )
}

export default NurseHeader