import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api, { authAPI, patientAuthAPI } from '../../services/apiService'

const SignIn = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')

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
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="w-full max-w-md border-2 border-[#5DC692] rounded-lg p-10" style={{ borderColor: '#5DC692' }}>
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
            <p className="text-gray-700 text-lg">portal sign in</p>
          </div>
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm mb-4 px-4 py-3 rounded-md">
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
                placeholder="email"
                className="w-full px-4 py-4 border-2 border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            <div className="mb-8">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="password"
                className="w-full px-4 py-4 border-2 border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg disabled:opacity-70"
            >
              {submitting ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
          <div className="mt-8 flex justify-between text-sm text-[#5DC692] px-4">
            <Link to="/signup" className="hover:underline">create an account</Link>
            <Link to="/forgot-password" className="hover:underline">forgot password</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn