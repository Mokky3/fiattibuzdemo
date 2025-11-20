import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { authAPI } from '../../services/apiService'

const ResetPassword = () => {
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

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
    if (!checks.length) missing.push('at least 8 characters')
    if (!checks.lowercase) missing.push('lowercase letter')
    if (!checks.uppercase) missing.push('uppercase letter')
    if (!checks.number) missing.push('number')
    if (!checks.special) missing.push('special character (@$!%*#?&)')
    
    return { checks, missing, isValid: missing.length === 0 }
  }

  const handleCodeValidation = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.code || formData.code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    if (!/^\d{6}$/.test(formData.code)) {
      setError('Please enter a valid 6-digit numeric code')
      return
    }

    setValidatingCode(true)
    
    try {
      const response = await authAPI.validateResetCode(formData.email, formData.code)
      
      if (response.valid) {
        setCodeValidated(true)
        setError('')
      } else {
        setError(response.message || 'Invalid reset code. Please check your email and try again.')
      }
    } catch (err) {
      console.error('Code validation error:', err)
      setError(err?.message || 'Failed to validate code. Please try again.')
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
      setError('Passwords do not match')
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
      setError(err?.message || 'Failed to reset password')
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
      <div className="flex flex-col h-screen">
        <div className="flex-1 flex justify-center items-center bg-white">
          <div className="w-full max-w-md border-2 border-[#5DC692] rounded-lg p-10" style={{ borderColor: '#5DC692' }}>
            <div className="text-center mb-10">
              <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
              <p className="text-gray-700 text-lg">Password Reset</p>
            </div>
            
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Password Reset Successful!</h2>
                <p className="text-gray-600 mb-4">
                  Your password has been successfully reset.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  You will be redirected to the sign-in page shortly.
                </p>
              </div>
              
              <Link
                to="/signin"
                className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg mb-4 inline-block text-center"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="w-full max-w-md border-2 border-[#5DC692] rounded-lg p-10" style={{ borderColor: '#5DC692' }}>
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
            <p className="text-gray-700 text-lg">
              {codeValidated ? 'Set New Password' : 'Enter Reset Code'}
            </p>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 text-center">
              {codeValidated 
                ? 'Please enter your new password below.'
                : `We've sent a 6-digit reset code to ${formData.email}. Please enter it below.`
              }
            </p>
          </div>
          
          {error ? (<div className="text-red-600 text-sm mb-3 px-1">{error}</div>) : null}
          
          {!codeValidated ? (
            // Code validation form
            <form onSubmit={handleCodeValidation} className="mt-8">
              <div className="mb-8">
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  className="w-full px-4 py-4 border-2 border-[#5DC692] rounded-md focus:outline-none text-center text-2xl tracking-widest"
                  style={{ borderColor: '#5DC692' }}
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={validatingCode || formData.code.length !== 6}
                className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg disabled:opacity-70"
              >
                {validatingCode ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Validating...
                  </div>
                ) : (
                  'Validate Code'
                )}
              </button>
            </form>
          ) : (
            // Password reset form
            <form onSubmit={handlePasswordReset} className="mt-8">
              <div className="mb-6">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="New password"
                  className="w-full px-4 py-4 border-2 border-[#5DC692] rounded-md focus:outline-none"
                  style={{ borderColor: '#5DC692' }}
                  required
                />
                
                {/* Password requirements */}
                {formData.password && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</div>
                    <div className="space-y-1">
                      {(() => {
                        const validation = getPasswordValidationDetails(formData.password)
                        return Object.entries(validation.checks).map(([key, isValid]) => {
                          const labels = {
                            length: 'At least 8 characters',
                            lowercase: 'Lowercase letter (a-z)',
                            uppercase: 'Uppercase letter (A-Z)',
                            number: 'Number (0-9)',
                            special: 'Special character (@$!%*#?&)'
                          }
                          return (
                            <div key={key} className="flex items-center text-xs">
                              <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${
                                isValid ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                                {isValid && <CheckCircle className="w-2 h-2 text-white" />}
                              </div>
                              <span className={isValid ? 'text-green-600' : 'text-gray-500'}>
                                {labels[key]}
                              </span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-8">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-500'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                        ? 'border-green-500'
                        : 'border-[#5DC692]'
                  }`}
                  style={{ 
                    borderColor: formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? '#ef4444'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                        ? '#10b981'
                        : '#5DC692'
                  }}
                  required
                />
                
                {/* Password match indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2 flex items-center text-xs">
                    {formData.password === formData.confirmPassword ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Passwords match
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Passwords do not match
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={submitting || !getPasswordValidationDetails(formData.password).isValid || formData.password !== formData.confirmPassword}
                className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg disabled:opacity-70"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Resetting...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}
          
          <div className="mt-8 text-center">
            <button
              onClick={handleBackToForgotPassword}
              className="text-sm text-[#5DC692] hover:underline flex items-center justify-center mx-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Forgot Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword