import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Bell, User, Menu, X, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
    { path: '/patient/appointment', label: t('patientNavbar.appointment') },
    { path: '/patient/records', label: t('patientNavbar.records') },
    { path: '/patient/prescription', label: t('patientNavbar.prescription') },
    { path: '/patient/hospital', label: t('patientNavbar.hospital') }
  ];

  return (
    <nav className={`${darkMode ? 'bg-gray-800' : 'bg-[#10b981]'} shadow-lg ${darkMode ? 'dark:shadow-gray-900' : ''} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Logo and Navigation */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            <button
              onClick={() => handleNavigation('/patient/dashboard')}
              className={`text-white text-xl sm:text-2xl font-bold transition-all duration-200 px-3 py-2 rounded-md ${
                isActive('/patient/dashboard')
                  ? darkMode ? 'bg-gray-700' : 'bg-[#059669]'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#10b981] hover:bg-opacity-80'
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
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 text-white ${
                    isActive(item.path) 
                      ? darkMode ? 'bg-gray-700' : 'bg-[#059669]'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#10b981] hover:bg-opacity-80'
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
                placeholder={t('patientNavbar.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-32 sm:w-48 px-4 py-2 pl-10 text-white placeholder-white border-none rounded-full focus:outline-none focus:ring-2 transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-700 placeholder-white/70 focus:ring-gray-500' 
                    : 'bg-white bg-opacity-20 placeholder-white placeholder-opacity-70 focus:ring-white focus:ring-opacity-50'
                }`}
              />
              <Search className={`absolute left-3 top-2.5 h-4 w-4 ${darkMode ? 'text-white/70' : 'text-white text-opacity-70'}`} />
            </div>

            {/* Notification bell */}
            <button className={`flex text-white p-2 rounded-full transition-all duration-200 ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-white hover:bg-opacity-20'
            }`}>
              <Bell className="h-5 w-5" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center space-x-1 text-white px-3 py-2 rounded-full transition-all duration-200 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-[#059669] hover:bg-[#047857]'
                }`}
              >
                <User className="h-5 w-5" />
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Profile dropdown menu */}
              {profileDropdownOpen && (
                <>
                  <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                    darkMode ? 'bg-gray-800 shadow-gray-900' : 'bg-white'
                  }`}>
                    <button
                      onClick={() => {
                        handleNavigation('/patient/profile');
                        setProfileDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('patientNavbar.myProfile')}
                    </button>
                    <button
                      onClick={() => {
                        handleNavigation('/patient/settings');
                        setProfileDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('patientNavbar.settings')}
                    </button>
                    <div className={`border-t my-1 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />
                    <button
                      onClick={() => {
                        handleNavigation('/signin');
                        setProfileDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('patientNavbar.logout')}
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
              className={`md:hidden text-white p-2 rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-white hover:bg-opacity-20'
              }`}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className={`md:hidden px-4 py-4 space-y-2 ${darkMode ? 'bg-gray-800' : 'bg-[#10b981] bg-opacity-95'}`}>
          {/* Mobile search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={t('patientNavbar.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-3 pl-10 text-white placeholder-white border-none rounded-full focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 placeholder-white/70 focus:ring-gray-500' 
                  : 'bg-white bg-opacity-20 placeholder-white placeholder-opacity-70 focus:ring-white focus:ring-opacity-50'
              }`}
            />
            <Search className={`absolute left-3 top-3.5 h-4 w-4 ${darkMode ? 'text-white/70' : 'text-white text-opacity-70'}`} />
          </div>

          {/* Mobile navigation links */}
          {navigationItems.map((item) => (
            <button 
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 text-white ${
                isActive(item.path) 
                  ? darkMode ? 'bg-gray-700' : 'bg-[#059669]'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Mobile profile section */}
          <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-white/20' : 'border-white border-opacity-20'}`}>
            <button 
              onClick={() => handleNavigation('/patient/profile')}
              className={`flex items-center space-x-2 text-white px-4 py-3 rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              <User className="h-5 w-5" />
              <span>{t('patientNavbar.profile')}</span>
            </button>
            <button 
              onClick={() => handleNavigation('/patient/settings')}
              className={`w-full text-left px-4 py-3 text-sm font-medium text-white rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              {t('patientNavbar.settings')}
            </button>
            <button 
              onClick={() => handleNavigation('/signin')}
              className={`w-full text-left px-4 py-3 text-sm font-medium text-white rounded-md transition-all duration-200 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#059669]'
              }`}
            >
              {t('patientNavbar.logout')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;