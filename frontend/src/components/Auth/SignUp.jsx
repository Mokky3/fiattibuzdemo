import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    pinfl: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle sign up logic here
    console.log('Sign up attempt with:', formData)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="w-full max-w-md border border-[#5DC692] rounded-lg p-10" style={{ borderColor: '#5DC692' }}>
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
            <p className="text-gray-700 text-lg">Bemor portali</p>
          </div>
          
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="mb-4">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="ismingiz"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="familyangiz"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                name="pinfl"
                value={formData.pinfl}
                onChange={handleChange}
                placeholder="PINFL"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            
            <div className="mb-4">
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Telefon raqamingiz"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            
            <div className="mb-4">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@gmail.com"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            
            <div className="mb-4">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="parol"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            
            <div className="mb-6">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="parolingizni yana bir bor kiriting"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                style={{ borderColor: '#5DC692' }}
                required
              />
            </div>
            
            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="mr-2 h-4 w-4 accent-[#5DC692]"
                required
              />
              <label className="text-[#5DC692] text-sm">
                terms and conditions
                <span className="block text-gray-500 text-xs">read before you agree</span>
              </label>
            </div>
            
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg mb-4"
            >
              Ro'yxatdan o'tish
            </button>
            
            <div className="text-center">
              <Link to="/doctor/signin" className="text-sm text-[#5DC692] hover:underline">Kirish</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignUp