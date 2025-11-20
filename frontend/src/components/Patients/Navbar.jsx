import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, Menu, X, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Handle click outside mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Navigation handler using React Router
  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false); // Close mobile menu when navigating
  };

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { path: '/patient/appointment', label: 'APPOINTMENT' },
    { path: '/patient/records', label: 'RECORDS' },
    { path: '/patient/prescription', label: 'PRESCRIPTION' },
    { path: '/patient/hospital', label: 'HOSPITAL' }
  ];

  return (
    <nav className="bg-[#10b981] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Logo and Navigation */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            <button
              onClick={() => handleNavigation('/patient/dashboard')}
              className={`text-white text-xl sm:text-2xl font-bold transition-all duration-200 px-3 py-2 rounded-md ${
                isActive('/patient/dashboard')
                  ? 'bg-[#059669]'
                  : 'hover:bg-[#10b981] hover:bg-opacity-80'
              }`}
            >
              FIATTIB
            </button>

            {/* Navigation links */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {navigationItems.map((item) => (
                <button 
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    isActive(item.path) 
                      ? 'bg-[#059669] text-white' 
                      : 'text-white hover:bg-[#10b981] hover:bg-opacity-80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right section - Search, Notifications, Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search bar */}
            <div className="flex relative">
              <input
                type="text"
                placeholder="SEARCH"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 sm:w-48 px-4 py-2 pl-10 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all duration-200"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white text-opacity-70" />
            </div>

            {/* Notification bell */}
            <button className="flex text-white p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200">
              <Bell className="h-5 w-5" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-1 bg-[#059669] text-white px-3 py-2 rounded-full hover:bg-[#047857] transition-all duration-200"
              >
                <User className="h-5 w-5" />
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Profile dropdown menu */}
              {profileDropdownOpen && (
                <>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        handleNavigation('/patient/profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        handleNavigation('/patient/settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        handleNavigation('/signin');
                        setProfileDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                </>
              )}
            </div>

            {/* Mobile hamburger menu */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden text-white p-2 rounded-md hover:bg-white hover:bg-opacity-20 transition-all duration-200"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden bg-[#10b981] bg-opacity-95 px-4 py-4 space-y-2">
          {/* Mobile search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            />
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-white text-opacity-70" />
          </div>

          {/* Mobile navigation links */}
          {navigationItems.map((item) => (
            <button 
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                isActive(item.path) 
                  ? 'bg-[#059669] text-white' 
                  : 'text-white hover:bg-[#059669]'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Mobile profile section */}
          <div className="border-t border-white border-opacity-20 pt-4 mt-4">
            <button 
              onClick={() => handleNavigation('/patient/profile')}
              className="flex items-center space-x-2 text-white px-4 py-3 rounded-md hover:bg-[#059669] transition-all duration-200"
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </button>
            <button 
              onClick={() => handleNavigation('/patient/settings')}
              className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-[#059669] rounded-md transition-all duration-200"
            >
              Settings
            </button>
            <button 
              onClick={() => handleNavigation('/signin')}
              className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-[#059669] rounded-md transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;