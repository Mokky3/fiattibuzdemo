import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Header } from './Header'

const DoctorProfile = () => {
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/api/doctor/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const data = response.data
        setDoctor({
          fullName: data.full_name,
          email: data.email,
          specialty: data.specialty,
          licenseNumber: data.license_number,
          organization: data.organization,
          initials: getInitials(data.full_name)
        })
      } catch (err) {
        console.error('Failed to fetch doctor profile:', err)
        setError('Failed to load profile. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchDoctorProfile()
  }, [])

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <Header />
        <div className="flex justify-center items-center h-96 text-gray-600">Loading profile...</div>
      </div>
    )
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
        <Header />
        <div className="flex justify-center items-center h-96 text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <Header />
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex flex-col items-center text-center">
          {/* Profile image */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md">
            {doctor.initials}
          </div>

          {/* Doctor Info */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">{doctor.fullName}</h2>
          <p className="text-gray-500 text-sm mb-4">{doctor.email}</p>

          <div className="text-left w-full space-y-3">
            <div>
              <span className="font-medium text-gray-700">Specialty: </span>
              <span className="text-gray-600">{doctor.specialty}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">License Number: </span>
              <span className="text-gray-600">{doctor.licenseNumber}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Organization: </span>
              <span className="text-gray-600">{doctor.organization}</span>
            </div>
          </div>

          {/* Future: Edit button */}
          <button className="mt-6 px-6 py-2 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white rounded-lg text-sm font-medium hover:from-[#4DB6B0] hover:to-[#5ACCC3] transition hover:scale-105">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  )
}

export default DoctorProfile
