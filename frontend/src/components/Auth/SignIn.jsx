import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api, { authAPI, patientAuthAPI } from '../../services/apiService'

const SignIn = () => {
  const { t, i18n } = useTranslation()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      // 1) Try patient portal auth first (backward compatible)
      // BUT: Only redirect to patient dashboard if role is actually PATIENT
      try {
        const patientData = await patientAuthAPI.login({ usernameOrEmail: formData.username, password: formData.password })
        console.log('Patient login successful:', patientData)
        
        // Safety check: Verify the user is actually a PATIENT before redirecting
        const patientRole = (patientData?.user?.role || '').toUpperCase().trim()
        console.log('Patient login role check:', patientRole)
        
        if (patientRole === 'PATIENT') {
          console.log('→ Confirmed PATIENT role, navigating to /patient/dashboard')
        navigate('/patient/dashboard')
        return
        } else {
          // User authenticated but role is not PATIENT - this shouldn't happen but handle it
          console.warn('⚠️ Patient login succeeded but role is not PATIENT:', patientRole, '- falling through to unified auth')
          // Clear the patient login tokens and fall through to unified auth
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          // Fall through to unified auth below
        }
      } catch (patientErr) {
        console.log('Patient login failed, trying unified auth:', patientErr.message)
        // fall through to unified auth
      }

      // 2) Fallback to unified auth for staff/admin/others
      console.log('Attempting unified auth for:', formData.username)
      const data = await authAPI.login(formData.username, formData.password)
      console.log('Unified auth successful:', data)
      
      const role = (data && data.user && data.user.role) || ''
      console.log('User role:', role, 'Type:', typeof role)
      console.log('Full user object:', data?.user)
      
      // Normalize role for comparison (handle case variations)
      const normalizedRole = role ? role.toUpperCase().trim() : ''
      console.log('Normalized role:', normalizedRole)
      
      // If there's a return URL and it matches the user's role, use it
      if (returnUrl) {
        console.log('🔄 [SignIn] Return URL found:', returnUrl)
        if (normalizedRole === 'NURSE' && returnUrl.startsWith('/nurse/')) {
          navigate(returnUrl)
          return
        } else if (normalizedRole === 'DOCTOR' && returnUrl.startsWith('/doctor/')) {
          navigate(returnUrl)
          return
        } else if ((normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'CLINIC_ADMIN') && returnUrl.startsWith('/admin/')) {
          navigate(returnUrl)
          return
        }
        // If return URL doesn't match role, fall through to default navigation
      }
      
      // Default navigation based on role
      console.log('🔀 [SignIn] Navigating based on role:', normalizedRole)
      if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'CLINIC_ADMIN') {
        console.log('→ Navigating to /admin/dashboard')
        navigate('/admin/dashboard')
      } else if (normalizedRole === 'DOCTOR') {
        console.log('→ Navigating to /doctor/dashboard')
        navigate('/doctor/dashboard')
      } else if (normalizedRole === 'NURSE') {
        console.log('→ Navigating to /nurse/dashboard')
        navigate('/nurse/dashboard')
      } else if (normalizedRole === 'RECEPTIONIST') {
        console.log('→ Navigating to /reception/dashboard')
        navigate('/reception/dashboard')
      } else if (normalizedRole === 'LAB_TECHNICIAN') {
        console.log('→ Navigating to /lab/dashboard')
        navigate('/lab/dashboard')
      } else if (normalizedRole === 'RADIOLOGIST') {
        console.log('→ Navigating to /radiology/dashboard')
        navigate('/radiology/dashboard')
      } else {
        console.warn('⚠️ [SignIn] Unknown role, defaulting to /patient/dashboard. Role was:', role, 'Normalized:', normalizedRole)
        // Only navigate to patient dashboard if role is actually PATIENT
        if (normalizedRole === 'PATIENT') {
        navigate('/patient/dashboard')
        } else {
          // For unknown roles, show error instead of redirecting to wrong portal
          setError(`Access denied. Role '${role}' is not supported. Please contact support.`)
          return
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      
      // Extract specific error message from the response
      let errorMessage = 'Login failed'
      
      if (err?.message) {
        // Check for specific error messages from backend
        if (err.message.includes('User not found')) {
          errorMessage = 'User not found. Please check your email/username and try again.'
        } else if (err.message.includes('Incorrect password')) {
          errorMessage = 'Incorrect password. Please check your password and try again.'
        } else if (err.message.includes('account is inactive')) {
          errorMessage = 'Your account is inactive. Please contact support for assistance.'
        } else if (err.message.includes('Access denied')) {
          errorMessage = 'Access denied. Please use the correct portal for your role.'
        } else if (err.message.includes('Invalid credentials')) {
          errorMessage = 'Invalid credentials. Please check your email/username and password.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
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

      <div className="flex-1 flex justify-center items-center">
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
            }`}>{t('portalSignIn')}</p>
          </div>
          {error ? (
            <div className={`text-sm mb-4 px-4 py-3 rounded-md ${
              darkMode
                ? 'bg-[#2A0E15] border-[#FB7185] text-[#FB7185]'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-6">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder={t('email')}
                className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  darkMode
                    ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                }`}
                required
              />
            </div>
            <div className="mb-8 relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('password')}
                className={`w-full px-4 py-4 pr-12 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  darkMode
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
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-4 font-medium rounded-md text-lg disabled:opacity-70 transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-[#5ACCC3] text-white hover:bg-[#4DB6B0]'
              }`}
            >
              {submitting ? t('signingIn') : t('signIn')}
            </button>
          </form>
          <div className={`mt-8 flex justify-between text-sm px-4 ${
            darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
          }`}>
            <Link to="/signup" className="hover:underline">{t('createAccount')}</Link>
            <Link to="/forgot-password" className="hover:underline">{t('forgotPassword')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn