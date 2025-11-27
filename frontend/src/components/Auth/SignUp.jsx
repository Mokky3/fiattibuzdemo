import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { patientAuthAPI } from '../../services/apiService'

export const SignUp = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    pinfl: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    const root = document.documentElement;
    if (newDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Password requirements checker
  const checkPasswordRequirements = (password) => {
    return {
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[@$!%*#?&]/.test(password)
    };
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'firstName':
      case 'surname':
        if (!value.trim()) error = t('fieldRequired');
        break;
      case 'email':
        if (!value.trim()) {
          error = t('fieldRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = t('invalidEmail');
        }
        break;
      case 'pinfl':
        if (!value.trim()) {
          error = t('fieldRequired');
        } else if (!/^\d{14}$/.test(value)) {
          error = t('invalidPinfl');
        }
        break;
      case 'phoneNumber':
        if (!value.trim()) {
          error = t('fieldRequired');
        } else if (!/^\+998\d{9}$/.test(value)) {
          error = t('invalidPhone');
        }
        break;
      case 'password':
        if (!value.trim()) {
          error = t('fieldRequired');
        } else {
          const requirements = checkPasswordRequirements(value);
          if (!Object.values(requirements).every(req => req)) {
            error = t('passwordRequirements');
          }
        }
        break;
      case 'confirmPassword':
        if (!value.trim()) {
          error = t('fieldRequired');
        } else if (value !== formData.password) {
          error = t('passwordsMatch');
        }
        break;
      case 'termsAccepted':
        if (!value) error = t('fieldRequired');
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Validate on change if field has been touched
    if (touched[name]) {
      const error = validateField(name, type === 'checkbox' ? checked : value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
    
    // Special handling for confirm password
    if (name === 'password' && touched.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, type === 'checkbox' ? checked : value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    
    setErrors(newErrors);

    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const payload = {
      email: formData.email,
      password: formData.password,
      confirm_password: formData.confirmPassword,
      first_name: formData.firstName,
      last_name: formData.surname,
      phone: formData.phoneNumber,
      date_of_birth: '1990-01-01', // minimal required, can add DOB field later
      gender: 'other',
      national_id: formData.pinfl,
      clinic_id: null,
    };

    try {
      const data = await patientAuthAPI.register(payload)
      alert("Ro'yxatdan o'tish muvaffaqiyatli! Iltimos, kirish uchun parolingiz bilan tizimga kiring.");
      navigate('/signin');
    } catch (error) {
      console.error('Registration failed:', error?.message);
      alert("Xatolik: " + (error?.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi'));
    }
  };

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
            className="h-8 w-auto cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>
        <div className="flex items-center gap-4">
          {/* Language Dropdown */}
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
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

      <div className="flex-1 flex justify-center items-center overflow-y-auto py-8">
        <div className={`w-full max-w-md border rounded-lg p-10 transition-colors duration-500 ${
          darkMode
            ? 'border-[#133037] bg-[#0D2026]'
            : 'border-gray-300 bg-white'
        }`}>
          <div className="text-center mb-10">
            <h1 className={`text-4xl font-bold mb-3 ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
            }`}>FIATTIB</h1>
            <p className={`text-lg ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{t('patientPortal')}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="mb-4">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={t('firstName')}
                className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  errors.firstName && touched.firstName
                    ? darkMode
                      ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                      : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                    : darkMode
                    ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                }`}
                required
              />
              {errors.firstName && touched.firstName && (
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.firstName}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={t('surname')}
                className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  errors.surname && touched.surname
                    ? darkMode
                      ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                      : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                    : darkMode
                    ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                }`}
                required
              />
              {errors.surname && touched.surname && (
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.surname}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                type="text"
                name="pinfl"
                value={formData.pinfl}
                onChange={(e) => {
                  if (e.target.value.length > 14) return;
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, pinfl: value }));
                  if (touched.pinfl) {
                    const error = validateField('pinfl', value);
                    setErrors(prev => ({ ...prev, pinfl: error }));
                  }
                }}
                onBlur={handleBlur}
                placeholder={t('pinfl')}
                pattern="^\d{14}$"
                title="PINFL 14 raqamdan iborat bo'lishi kerak"
                maxLength={14}
                className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  errors.pinfl && touched.pinfl
                    ? darkMode
                      ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                      : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                    : darkMode
                    ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                }`}
                required
              />
              {errors.pinfl && touched.pinfl && (
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.pinfl}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onFocus={() => {
                  if (!formData.phoneNumber.startsWith('+998')) {
                    setFormData(prev => ({ ...prev, phoneNumber: '+998' }));
                  }
                }}
                onChange={(e) => {
                  const input = e.target.value;
                  if (!input.startsWith('+998')) return;
                  const cleaned = '+998' + input.slice(4).replace(/\D/g, '').slice(0, 9);
                  setFormData(prev => ({ ...prev, phoneNumber: cleaned }));
                  if (touched.phoneNumber) {
                    const error = validateField('phoneNumber', cleaned);
                    setErrors(prev => ({ ...prev, phoneNumber: error }));
                  }
                }}
                onBlur={handleBlur}
                placeholder="+998901234567"
                pattern="^\+998\d{9}$"
                title="Telefon raqam +998 bilan boshlanib, jami 13 raqamdan iborat bo'lishi kerak"
                maxLength={13}
                className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  errors.phoneNumber && touched.phoneNumber
                    ? darkMode
                      ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                      : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                    : darkMode
                    ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                }`}
                required
              />
              {errors.phoneNumber && touched.phoneNumber && (
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.phoneNumber}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={t('email')}
                className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  errors.email && touched.email
                    ? darkMode
                      ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                      : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                    : darkMode
                    ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                }`}
                required
              />
              {errors.email && touched.email && (
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.email}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={() => setTouched(prev => ({ ...prev, password: true }))}
                  placeholder={t('passwordPlaceholder')}
                  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$"
                  title="Kamida 8 belgi, katta-kichik harf, raqam va belgi bo'lishi kerak"
                  className={`w-full px-4 py-4 pr-12 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    errors.password && touched.password
                      ? darkMode
                        ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                        : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                      : darkMode
                      ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:text-[#F5FEFF] hover:bg-[#10262D]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42L21 21M12 12l.01.01" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Password Requirements */}
              {touched.password && (
                <div className={`mt-2 p-3 rounded-md ${
                  darkMode ? 'bg-[#10262D]' : 'bg-gray-50'
                }`}>
                  <p className={`text-xs font-medium mb-2 ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('passwordRequirements')}</p>
                  <ul className="space-y-1">
                    {(() => {
                      const requirements = checkPasswordRequirements(formData.password);
                      const reqList = [
                        { key: 'minLength', label: t('minLength'), met: requirements.minLength },
                        { key: 'uppercase', label: t('uppercase'), met: requirements.uppercase },
                        { key: 'lowercase', label: t('lowercase'), met: requirements.lowercase },
                        { key: 'number', label: t('number'), met: requirements.number },
                        { key: 'specialChar', label: t('specialChar'), met: requirements.specialChar }
                      ];
                      return reqList.map(req => (
                        <li key={req.key} className="flex items-center text-xs">
                          <span className={`mr-2 ${req.met ? (darkMode ? 'text-[#4ADE80]' : 'text-green-600') : (darkMode ? 'text-[#8AA2A7]' : 'text-gray-400')}`}>
                            {req.met ? '✓' : '○'}
                          </span>
                          <span className={req.met ? (darkMode ? 'text-[#4ADE80]' : 'text-green-600') : (darkMode ? 'text-[#8AA2A7]' : 'text-gray-600')}>
                            {req.label}
                          </span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              )}
              {errors.password && touched.password && (
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.password}</p>
              )}
            </div>

            <div className="mb-6">
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t('confirmPasswordPlaceholder')}
                  className={`w-full px-4 py-4 pr-12 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    errors.confirmPassword && touched.confirmPassword
                      ? darkMode
                        ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                        : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                      : darkMode
                      ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:text-[#F5FEFF] hover:bg-[#10262D]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42L21 21M12 12l.01.01" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && touched.confirmPassword && (
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.confirmPassword}</p>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 mr-2 h-4 w-4 ${
                    darkMode ? 'accent-[#79CAC2]' : 'accent-[#5ACCC3]'
                  }`}
                  required
                />
                <label className={`text-sm ${
                  darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
                }`}>
                  {t('termsAccepted')}
                  <span className={`block text-xs ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{t('termsNote')}</span>
                </label>
              </div>
              {errors.termsAccepted && touched.termsAccepted && (
                <p className={`mt-1 ml-6 text-xs ${
                  darkMode ? 'text-[#FB7185]' : 'text-red-600'
                }`}>{errors.termsAccepted}</p>
              )}
            </div>

            <button
              type="submit"
              className={`w-full py-3 px-4 font-medium rounded-md text-lg mb-4 transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-[#4DB6B0]'
              }`}
            >
              {t('register')}
            </button>

            <div className="text-center">
              <Link to="/signin" className={`text-sm hover:underline ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
              }`}>
                {t('signIn')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
