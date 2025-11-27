import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { authAPI } from '../../services/apiService'

const ResetPassword = () => {
  const { t, i18n } = useTranslation()
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [codeValidated, setCodeValidated] = useState(false)
  const [validatingCode, setValidatingCode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Dark mode state - read from saved preference (no toggle)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }))
    } else {
      // If no email parameter, redirect back to forgot password
      navigate('/forgot-password')
    }
  }, [searchParams, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear any previous errors when user starts typing
    if (error) setError('')
  }

  const validatePassword = (password) => {
    const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}/
    return passwordRegex.test(password)
  }

  const getPasswordValidationDetails = (password) => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*#?&]/.test(password)
    }
    
    const missing = []
    if (!checks.length) missing.push(t('minLength'))
    if (!checks.lowercase) missing.push(t('lowercase'))
    if (!checks.uppercase) missing.push(t('uppercase'))
    if (!checks.number) missing.push(t('number'))
    if (!checks.special) missing.push(t('specialChar'))
    
    return { checks, missing, isValid: missing.length === 0 }
  }

  const handleCodeValidation = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.code || formData.code.length !== 6) {
      setError(t('invalidCode'))
      return
    }

    if (!/^\d{6}$/.test(formData.code)) {
      setError(t('invalidNumericCode'))
      return
    }

    setValidatingCode(true)
    
    try {
      const response = await authAPI.validateResetCode(formData.email, formData.code)
      
      if (response.valid) {
        setCodeValidated(true)
        setError('')
      } else {
        setError(response.message || t('invalidResetCode'))
      }
    } catch (err) {
      console.error('Code validation error:', err)
      setError(err?.message || t('codeValidationError'))
    } finally {
      setValidatingCode(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords with detailed feedback
    const passwordValidation = getPasswordValidationDetails(formData.password)
    if (!passwordValidation.isValid) {
      setError(`Password must contain: ${passwordValidation.missing.join(', ')}`)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      return
    }

    setSubmitting(true)
    
    try {
      await authAPI.resetPassword(formData.email, formData.code, formData.password)
      setSuccess(true)
      // Redirect to sign in after 3 seconds
      setTimeout(() => navigate('/signin'), 3000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError(err?.message || t('passwordResetError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleBackToForgotPassword = () => {
    navigate('/forgot-password')
  }

  // Success state
  if (success) {
    return (
      <div className={`flex flex-col h-screen transition-colors duration-500 ${
        darkMode 
          ? 'bg-[#050C0F] text-[#F5FEFF]' 
          : 'bg-gray-50 text-gray-900'
      }`}>
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
              }`}>{t('resetPasswordTitle')}</p>
            </div>
            
            <div className="text-center">
              <div className="mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  darkMode ? 'bg-[#062412]' : 'bg-green-100'
                }`}>
                  <CheckCircle className={`w-8 h-8 ${
                    darkMode ? 'text-[#4ADE80]' : 'text-green-600'
                  }`} />
                </div>
                <h2 className={`text-xl font-semibold mb-2 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                }`}>{t('passwordResetSuccessful')}</h2>
                <p className={`mb-4 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>
                  {t('passwordResetSuccessMessage')}
                </p>
                <p className={`text-sm mb-6 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>
                  {t('redirectingToSignIn')}
                </p>
              </div>
              
              <Link
                to="/signin"
                className={`w-full py-3 px-4 font-medium rounded-md text-lg mb-4 inline-block text-center transition-colors ${
                  darkMode
                    ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                    : 'bg-[#5ACCC3] text-white hover:bg-[#4DB6B0]'
                }`}
              >
                {t('goToSignIn')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-screen transition-colors duration-500 ${
      darkMode 
        ? 'bg-[#050C0F] text-[#F5FEFF]' 
        : 'bg-gray-50 text-gray-900'
    }`}>
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
            }`}>
              {codeValidated ? t('setNewPassword') : t('enterResetCode')}
            </p>
          </div>
          
          <div className="mb-6">
            <p className={`text-center ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>
              {codeValidated 
                ? t('newPasswordDescription')
                : t('resetCodeDescription').replace('{email}', formData.email)
              }
            </p>
          </div>
          
          {error ? (
            <div className={`text-sm mb-3 px-1 rounded-md p-3 ${
              darkMode
                ? 'bg-[#2A0E15] text-[#FB7185]'
                : 'bg-red-50 text-red-600'
            }`}>{error}</div>
          ) : null}
          
          {!codeValidated ? (
            // Code validation form
            <form onSubmit={handleCodeValidation} className="mt-8">
              <div className="mb-8">
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder={t('enterCode')}
                  maxLength="6"
                  className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 text-center text-2xl tracking-widest transition-colors ${
                    darkMode
                      ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2]'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-[#5ACCC3] focus:ring-[#5ACCC3]'
                  }`}
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={validatingCode || formData.code.length !== 6}
                className={`w-full py-3 px-4 font-medium rounded-md text-lg disabled:opacity-70 transition-colors ${
                  darkMode
                    ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                    : 'bg-[#5ACCC3] text-white hover:bg-[#4DB6B0]'
                }`}
              >
                {validatingCode ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className={`w-5 h-5 animate-spin mr-2 ${
                      darkMode ? 'text-[#050C0F]' : 'text-white'
                    }`} />
                    {t('validating')}
                  </div>
                ) : (
                  t('validateCode')
                )}
              </button>
            </form>
          ) : (
            // Password reset form
            <form onSubmit={handlePasswordReset} className="mt-8">
              <div className="mb-6">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('newPassword')}
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
                
                {/* Password requirements */}
                {formData.password && (
                  <div className={`mt-3 p-3 rounded-md ${
                    darkMode ? 'bg-[#10262D]' : 'bg-gray-50'
                  }`}>
                    <div className={`text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                    }`}>{t('passwordRequirements')}</div>
                    <div className="space-y-1">
                      {(() => {
                        const validation = getPasswordValidationDetails(formData.password)
                        const reqList = [
                          { key: 'length', label: t('minLength'), met: validation.checks.length },
                          { key: 'uppercase', label: t('uppercase'), met: validation.checks.uppercase },
                          { key: 'lowercase', label: t('lowercase'), met: validation.checks.lowercase },
                          { key: 'number', label: t('number'), met: validation.checks.number },
                          { key: 'special', label: t('specialChar'), met: validation.checks.special }
                        ];
                        return reqList.map(req => (
                          <div key={req.key} className="flex items-center text-xs">
                            <span className={`mr-2 ${req.met ? (darkMode ? 'text-[#4ADE80]' : 'text-green-600') : (darkMode ? 'text-[#8AA2A7]' : 'text-gray-500')}`}>
                              {req.met ? '✓' : '○'}
                            </span>
                            <span className={req.met ? (darkMode ? 'text-[#4ADE80]' : 'text-green-600') : (darkMode ? 'text-[#8AA2A7]' : 'text-gray-600')}>
                              {req.label}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-8">
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('confirmNewPassword')}
                    className={`w-full px-4 py-4 pr-12 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? darkMode
                          ? 'border-[#FB7185] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#FB7185] focus:ring-[#FB7185]'
                          : 'border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                        : formData.confirmPassword && formData.password === formData.confirmPassword
                          ? darkMode
                            ? 'border-[#4ADE80] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#4ADE80] focus:ring-[#4ADE80]'
                            : 'border-green-500 bg-white text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
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
                
                {/* Password match indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2 flex items-center text-xs">
                    {formData.password === formData.confirmPassword ? (
                      <div className={`flex items-center ${
                        darkMode ? 'text-[#4ADE80]' : 'text-green-600'
                      }`}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('passwordsMatch')}
                      </div>
                    ) : (
                      <div className={`flex items-center ${
                        darkMode ? 'text-[#FB7185]' : 'text-red-600'
                      }`}>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {t('passwordsDoNotMatch')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={submitting || !getPasswordValidationDetails(formData.password).isValid || formData.password !== formData.confirmPassword}
                className={`w-full py-3 px-4 font-medium rounded-md text-lg disabled:opacity-70 transition-colors ${
                  darkMode
                    ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                    : 'bg-[#5ACCC3] text-white hover:bg-[#4DB6B0]'
                }`}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className={`w-5 h-5 animate-spin mr-2 ${
                      darkMode ? 'text-[#050C0F]' : 'text-white'
                    }`} />
                    {t('resetting')}
                  </div>
                ) : (
                  t('resetPassword')
                )}
              </button>
            </form>
          )}
          
          <div className="mt-8 text-center">
            <button
              onClick={handleBackToForgotPassword}
              className={`text-sm hover:underline flex items-center justify-center mx-auto ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
              }`}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('backToForgotPassword')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword