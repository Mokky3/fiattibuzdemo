import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { authAPI } from '../../services/apiService'

const ForgotPassword = () => {
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
          message: 'Please enter a valid email address' 
        })
        return
      }

      setEmailValidation(prev => ({ ...prev, isValidating: true }))

      try {
        const response = await authAPI.validateEmail(formData.email)
        setEmailValidation({
          isValidating: false,
          exists: response.exists,
          message: response.message
        })
      } catch (err) {
        console.error('Email validation error:', err)
        setEmailValidation({
          isValidating: false,
          exists: null,
          message: 'Unable to validate email. Please try again.'
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
      setError('Please wait while we validate your email...')
      return
    }
    
    // Check if email doesn't exist
    if (emailValidation.exists === false) {
      setError(emailValidation.message)
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
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="w-full max-w-md border-2 border-[#5DC692] rounded-lg p-10" style={{ borderColor: '#5DC692' }}>
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
            <p className="text-gray-700 text-lg">forgot password</p>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 text-center">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          
          {error ? (<div className="text-red-600 text-sm mb-3 px-1">{error}</div>) : null}
          
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-6">
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email"
                  className={`w-full px-4 py-4 border-2 rounded-md focus:outline-none pr-12 ${
                    emailValidation.exists === false 
                      ? 'border-red-500' 
                      : emailValidation.exists === true 
                        ? 'border-green-500' 
                        : 'border-[#5DC692]'
                  }`}
                  style={{ 
                    borderColor: emailValidation.exists === false 
                      ? '#ef4444' 
                      : emailValidation.exists === true 
                        ? '#10b981' 
                        : '#5DC692' 
                  }}
                  required
                />
                
                {/* Email validation icon */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {emailValidation.isValidating && (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {!emailValidation.isValidating && emailValidation.exists === true && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {!emailValidation.isValidating && emailValidation.exists === false && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              
              {/* Email validation message */}
              {emailValidation.message && (
                <div className={`mt-2 text-sm px-1 ${
                  emailValidation.exists === false 
                    ? 'text-red-600' 
                    : emailValidation.exists === true 
                      ? 'text-green-600' 
                      : 'text-gray-600'
                }`}>
                  {emailValidation.message}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={submitting || emailValidation.isValidating || emailValidation.exists === false}
              className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg disabled:opacity-70"
            >
              {submitting ? 'Sending...' : 'Send Reset Code & Continue'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <Link to="/signin" className="text-sm text-[#5DC692] hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
