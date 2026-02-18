import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { authAPI } from '../../services/apiService'

const ForgotPassword = () => {
  const { t, i18n } = useTranslation()
  const [formData, setFormData] = useState({
    email: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [emailValidation, setEmailValidation] = useState({
    isValidating: false,
    exists: null,
    message: ''
  })
  const navigate = useNavigate()

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

  // Debounced email validation
  useEffect(() => {
    const validateEmail = async () => {
      if (!formData.email || formData.email.length < 5) {
        setEmailValidation({ isValidating: false, exists: null, message: '' })
        return
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setEmailValidation({ 
          isValidating: false, 
          exists: false, 
          message: t('invalidEmail')
        })
        return
      }

      setEmailValidation(prev => ({ ...prev, isValidating: true }))

      try {
        const response = await authAPI.validateEmail(formData.email)
        setEmailValidation({
          isValidating: false,
          exists: response.exists,
          message: response.exists ? t('emailExists') : t('emailNotExists')
        })
      } catch (err) {
        console.error('Email validation error:', err)
        setEmailValidation({
          isValidating: false,
          exists: null,
          message: t('emailValidationError')
        })
      }
    }

    const timeoutId = setTimeout(validateEmail, 500) // 500ms debounce
    return () => clearTimeout(timeoutId)
  }, [formData.email])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear any previous errors when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Check if email validation is still in progress
    if (emailValidation.isValidating) {
      setError(t('pleaseWait'))
      return
    }
    
    // Check if email doesn't exist
    if (emailValidation.exists === false) {
      setError(emailValidation.message || t('emailNotExists'))
      return
    }
    
    setSubmitting(true)
    
    try {
      // Call the forgot password API
      await authAPI.forgotPassword(formData.email)
      // Redirect to reset password page with email parameter
      navigate(`/reset-password?email=${encodeURIComponent(formData.email)}`)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError(err?.message || 'Failed to send reset email')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBackToSignIn = () => {
    navigate('/signin')
  }


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
            }`}>{t('forgotPasswordTitle')}</p>
          </div>
          
          <div className="mb-6">
            <p className={`text-center ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>
              {t('forgotPasswordDescription')}
            </p>
          </div>
          
          {error ? (
            <div className={`text-sm mb-3 px-1 rounded-md p-3 ${
              darkMode
                ? 'bg-[#2A0E15] text-[#FB7185]'
                : 'bg-red-50 text-red-600'
            }`}>{error}</div>
          ) : null}
          
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-6">
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('email')}
                  className={`w-full px-4 py-4 pr-12 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    emailValidation.exists === false 
                      ? darkMode
                        ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                        : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                      : emailValidation.exists === true 
                        ? darkMode
                          ? 'border-[#4ADE80] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#4ADE80] focus:ring-[#4ADE80]'
                          : 'border-green-500 bg-white text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                        : darkMode
                        ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                  }`}
                  required
                />
                
                {/* Email validation icon */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {emailValidation.isValidating && (
                    <Loader2 className={`w-5 h-5 animate-spin ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                    }`} />
                  )}
                  {!emailValidation.isValidating && emailValidation.exists === true && (
                    <CheckCircle className={`w-5 h-5 ${
                      darkMode ? 'text-[#4ADE80]' : 'text-green-500'
                    }`} />
                  )}
                  {!emailValidation.isValidating && emailValidation.exists === false && (
                    <AlertCircle className={`w-5 h-5 ${
                      darkMode ? 'text-[#FB7185]' : 'text-red-500'
                    }`} />
                  )}
                </div>
              </div>
              
              {/* Email validation message */}
              {emailValidation.message && (
                <div className={`mt-2 text-sm px-1 ${
                  emailValidation.exists === false 
                    ? darkMode ? 'text-[#FB7185]' : 'text-red-600'
                    : emailValidation.exists === true 
                      ? darkMode ? 'text-[#4ADE80]' : 'text-green-600'
                      : darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                }`}>
                  {emailValidation.message}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={submitting || emailValidation.isValidating || emailValidation.exists === false}
              className={`w-full py-3 px-4 font-medium rounded-md text-lg disabled:opacity-70 transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-[#4DB6B0]'
              }`}
            >
              {submitting ? t('sending') : t('sendResetCode')}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <Link to="/signin" className={`text-sm hover:underline ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
            }`}>
              {t('backToSignIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
