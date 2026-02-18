import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Landing = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Initialize state - check DOM first (set by main.jsx), then localStorage
  const [darkMode, setDarkMode] = useState(() => {
    // Check what main.jsx already set on the DOM
    const hasDarkClass = document.documentElement.classList.contains('dark');
    return hasDarkClass;
  });

  // Apply theme when darkMode state changes
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

  const toggleDarkMode = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const newDarkMode = !darkMode;
    console.log('Toggling theme from', darkMode, 'to', newDarkMode);
    
    // Update state first
    setDarkMode(newDarkMode);
    
    // Update DOM immediately
    const root = document.documentElement;
    if (newDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('Added dark class to html element. Current classes:', root.className);
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('Removed dark class from html element. Current classes:', root.className);
    }
    
    // Force a reflow to ensure styles are recalculated
    void root.offsetHeight;
  };

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  return (
    <div className={`flex flex-col h-screen transition-colors duration-500 ${
      darkMode 
        ? 'bg-[#050C0F] text-[#F5FEFF]' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center px-10 py-6">
        <div>
          <img 
            src={darkMode ? "/4darkmode.png" : "/favicon.png"} 
            alt="Fiattib" 
            className="h-8 w-auto"
          />
        </div>
        <div className="flex items-center gap-4">
          {/* Language Dropdown */}
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              darkMode
                ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] hover:bg-[#10262D] focus:ring-[#79CAC2]'
                : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:ring-[#5ACCC3]'
            }`}
          >
            <option value="uz" className={darkMode ? 'bg-[#0D2026] text-[#F5FEFF]' : 'bg-white text-gray-900'}>🇺🇿 UZ</option>
            <option value="en" className={darkMode ? 'bg-[#0D2026] text-[#F5FEFF]' : 'bg-white text-gray-900'}>🇺🇸 EN</option>
            <option value="ru" className={darkMode ? 'bg-[#0D2026] text-[#F5FEFF]' : 'bg-white text-gray-900'}>🇷🇺 RU</option>
          </select>

          {/* Theme Toggle Switch */}
          <button
            onClick={toggleDarkMode}
            type="button"
            role="switch"
            aria-checked={darkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`relative w-12 h-6 rounded-full p-[2px] cursor-pointer flex items-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              darkMode 
                ? 'bg-[#133037] focus:ring-[#79CAC2]' 
                : 'bg-[#5ACCC3] focus:ring-[#5ACCC3]'
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-300 ${
                darkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex justify-center items-center">
        <div className={`w-full max-w-md border rounded-lg p-10 transition-colors duration-500 ${
          darkMode
            ? 'border-[#133037] bg-[#0D2026]'
            : 'border-gray-300 bg-white'
        }`}>
          <div className="text-center mb-10">
            <h1 className={`text-4xl font-bold ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
            }`}>
              FIATTIB
            </h1>
          </div>

          <div className="flex flex-col gap-6">
            <button
              onClick={() => navigate('/signin')}
              className={`w-full py-3 px-4 font-medium rounded-md text-lg border transition ${
                darkMode
                  ? 'bg-[#0D2026] text-[#79CAC2] border-[#133037] hover:bg-[#10262D] hover:border-[#79CAC2]'
                  : 'bg-white text-[#5ACCC3] border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t('signIn')}
            </button>

            <button
              onClick={() => navigate('/signup')}
              className={`w-full py-3 px-4 font-medium rounded-md text-lg transition ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-[#4DB6B0]'
              }`}
            >
              {t('signUp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
