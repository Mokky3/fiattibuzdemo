import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const SignIn = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle sign in logic here
    console.log('Sign in attempt with:', formData)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="w-full max-w-md border-2 border-[#5DC692] rounded-lg p-10" style={{ borderColor: '#5DC692' }}>
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
            <p className="text-gray-700 text-lg">patient portal</p>
          </div>
          
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-6">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="username"
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
              className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg"
            >
              Sign In
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