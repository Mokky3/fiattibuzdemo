import React from 'react'
import { useNavigate } from 'react-router-dom'

const Landing = () => {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center px-10 py-6">
        <div className="text-[#5DC692] text-xl font-medium">Fiattib</div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-6 bg-[#5DC692] rounded-full flex items-center p-[2px]">
            <div className="h-5 w-5 rounded-full bg-white ml-auto"></div>
          </div>
          <div className="text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="w-full max-w-md border border-[#5DC692] rounded-lg p-10" style={{ borderColor: '#5DC692' }}>
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
            <p className="text-gray-700 text-lg">Bemor Portali</p>
          </div>
          <div className="flex flex-col gap-6">
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg hover:bg-[#48b07b] transition"
            >
              Bemor (Patient) Sign Up
            </button>
            <button
              onClick={() => navigate('/doctor/signup')}
              className="w-full py-3 px-4 bg-white text-[#5DC692] font-medium rounded-md text-lg border border-[#5DC692] hover:bg-[#e6f9f0] transition"
            >
              Shifokor (Doctor) Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Landing
