import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Landing = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Detect saved theme or system preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-500">
      {/* Header */}
      <div className="flex justify-between items-center px-10 py-6">
        <div className="text-[#5DC692] text-xl font-semibold">Fiattib</div>
        <div className="flex items-center gap-4">
          {/* Language Dropdown */}
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="border border-[#5DC692] rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-white transition-colors"
          >
            <option value="uz">UZ 🇺🇿</option>
            <option value="en">EN 🇺🇸</option>
          </select>

          {/* Theme Toggle Switch */}
          <div
            onClick={toggleDarkMode}
            className="w-12 h-6 bg-[#5DC692] rounded-full p-[2px] cursor-pointer flex items-center transition-colors"
          >
            <div
              className={`h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                darkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex justify-center items-center">
        <div className="w-full max-w-md border border-[#5DC692] rounded-lg p-10 bg-white dark:bg-gray-800 dark:border-green-500 transition-colors duration-500">
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] dark:text-[#f87171] text-4xl font-bold mb-3">
              {t('title')}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg">{t('subtitle')}</p>
          </div>

          <div className="flex flex-col gap-6">
            <button
              onClick={() => navigate('/signin')}
              className="w-full py-3 px-4 bg-white text-[#5DC692] font-medium rounded-md text-lg border border-[#5DC692] hover:bg-[#e6f9f0] dark:bg-gray-700 dark:text-green-300 dark:border-green-400 dark:hover:bg-gray-600 transition"
            >
              {t('signIn')}
            </button>

            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg hover:bg-[#48b07b] dark:bg-green-600 dark:hover:bg-green-700 transition"
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
