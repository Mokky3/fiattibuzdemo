import React, { useState, useEffect } from 'react'
import Navbar from './Navbar'
import { 
  User, Mail, Phone, MapPin, Calendar, Heart, Shield, 
  Edit2, Save, X, Camera, AlertCircle, Activity, FileText,
  Droplets, Users, Pill, Stethoscope, ClipboardList
} from 'lucide-react'

const PatientProfile = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [activeTab, setActiveTab] = useState('personal')
  
  // Patient profile data
  const [profile, setProfile] = useState({
    fullName: 'Muhammad Hariton',
    email: 'muhammad.hariton@example.com',
    phone: '+998 90 123 4567',
    dateOfBirth: '1990-05-15',
    gender: 'Male',
    address: 'Tashkent, Uzbekistan',
    emergencyContact: 'Sarah Hariton',
    emergencyPhone: '+998 90 765 4321',
    profileImage: null,
    patientId: 'PAT-2024-001',
    registrationDate: '2024-01-15'
  })
  
  // Medical information
  const [medicalInfo, setMedicalInfo] = useState({
    bloodGroup: 'A',
    bloodRh: '-',
    height: '180 cm',
    weight: '70 kg',
    bmi: '21.6',
    bloodPressure: '120/80',
    allergies: ['None'],
    chronicConditions: ['None'],
    currentMedications: [],
    immunizations: [
      { name: 'COVID-19', date: '2023-12-01', status: 'Completed' },
      { name: 'Influenza', date: '2023-10-15', status: 'Completed' },
      { name: 'Hepatitis B', date: '2023-06-20', status: 'Completed' }
    ]
  })
  
  // Insurance information
  const [insurance, setInsurance] = useState({
    provider: 'National Health Insurance',
    policyNumber: 'NH-123456789',
    groupNumber: 'GRP-001',
    validUntil: '2025-12-31',
    coverageType: 'Comprehensive'
  })
  
  // Form data for editing
  const [formData, setFormData] = useState(profile)
  const [medicalFormData, setMedicalFormData] = useState(medicalInfo)
  
  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: <User className="h-4 w-4" /> },
    { id: 'medical', label: 'Medical Info', icon: <Heart className="h-4 w-4" /> },
    { id: 'insurance', label: 'Insurance', icon: <Shield className="h-4 w-4" /> },
    { id: 'history', label: 'Medical History', icon: <ClipboardList className="h-4 w-4" /> }
  ]

  const handleEdit = () => {
    setFormData(profile)
    setMedicalFormData(medicalInfo)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData(profile)
    setMedicalFormData(medicalInfo)
    setIsEditing(false)
  }

  const handleSave = async () => {
    setLoading(true)
    setSaveStatus('')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (activeTab === 'personal') {
        setProfile(formData)
      } else if (activeTab === 'medical') {
        setMedicalInfo(medicalFormData)
      }
      
      setIsEditing(false)
      setSaveStatus('success')
      
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const renderPersonalInfo = () => (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-start">
        {/* Profile Image */}
        <div className="relative mr-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
            {isEditing && formData.profileImage ? (
              <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : profile.profileImage ? (
              <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              'MH'
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50">
              <Camera className="h-5 w-5 text-gray-600" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        {/* Profile Details */}
        <div className="flex-1">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800">{profile.fullName}</h2>
              <p className="text-emerald-600 font-medium mb-4">Patient ID: {profile.patientId}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {profile.email}
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {profile.phone}
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  Born: {new Date(profile.dateOfBirth).toLocaleDateString()}
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  {profile.address}
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-2 text-gray-400" />
                  Emergency: {profile.emergencyContact}
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {profile.emergencyPhone}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Registered on: {new Date(profile.registrationDate).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const renderMedicalInfo = () => (
    <div className="space-y-6">
      {/* Vital Statistics */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-emerald-500" />
          Vital Statistics
        </h3>
        
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
              <input
                type="text"
                value={medicalFormData.height}
                onChange={(e) => setMedicalFormData({ ...medicalFormData, height: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <input
                type="text"
                value={medicalFormData.weight}
                onChange={(e) => setMedicalFormData({ ...medicalFormData, weight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
              <input
                type="text"
                value={medicalFormData.bloodPressure}
                onChange={(e) => setMedicalFormData({ ...medicalFormData, bloodPressure: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{medicalInfo.height}</p>
              <p className="text-sm text-gray-600 mt-1">Height</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{medicalInfo.weight}</p>
              <p className="text-sm text-gray-600 mt-1">Weight</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{medicalInfo.bmi}</p>
              <p className="text-sm text-gray-600 mt-1">BMI (Normal)</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{medicalInfo.bloodPressure}</p>
              <p className="text-sm text-gray-600 mt-1">Blood Pressure</p>
            </div>
          </div>
        )}
      </div>

      {/* Blood Information */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Droplets className="h-5 w-5 mr-2 text-red-500" />
          Blood Information
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Blood Group</span>
            <span className="font-semibold text-gray-800">{medicalInfo.bloodGroup}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Blood Rh</span>
            <span className="font-semibold text-gray-800">{medicalInfo.bloodRh}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Allergies</span>
            <span className="font-semibold text-gray-800">{medicalInfo.allergies.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Immunizations */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-500" />
          Immunization Records
        </h3>
        
        <div className="space-y-3">
          {medicalInfo.immunizations.map((vaccine, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{vaccine.name}</p>
                <p className="text-sm text-gray-600">Date: {new Date(vaccine.date).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                vaccine.status === 'Completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {vaccine.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderInsuranceInfo = () => (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
        <Shield className="h-5 w-5 mr-2 text-emerald-500" />
        Insurance Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Insurance Provider</p>
            <p className="font-semibold text-gray-800">{insurance.provider}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Policy Number</p>
            <p className="font-semibold text-gray-800">{insurance.policyNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Group Number</p>
            <p className="font-semibold text-gray-800">{insurance.groupNumber}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Coverage Type</p>
            <p className="font-semibold text-gray-800">{insurance.coverageType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Valid Until</p>
            <p className="font-semibold text-gray-800">{new Date(insurance.validUntil).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
        <p className="text-sm text-emerald-800">
          <AlertCircle className="inline h-4 w-4 mr-1" />
          Your insurance is active and covers comprehensive medical services
        </p>
      </div>
    </div>
  )

  const renderMedicalHistory = () => (
    <div className="space-y-6">
      {/* Recent Visits */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Stethoscope className="h-5 w-5 mr-2 text-emerald-500" />
          Recent Visits
        </h3>
        
        <div className="space-y-4">
          {[
            { date: '2024-01-15', doctor: 'Dr. Sarah Johnson', reason: 'Annual checkup', status: 'Completed' },
            { date: '2023-12-20', doctor: 'Dr. Michael Chen', reason: 'Flu symptoms', status: 'Completed' },
            { date: '2023-11-10', doctor: 'Dr. Emily Rodriguez', reason: 'Follow-up visit', status: 'Completed' }
          ].map((visit, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div>
                <p className="font-medium text-gray-800">{visit.reason}</p>
                <p className="text-sm text-gray-600">{visit.doctor} • {new Date(visit.date).toLocaleDateString()}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                {visit.status}
              </span>
            </div>
          ))}
        </div>
        
        <button className="mt-4 w-full text-center text-emerald-600 hover:text-emerald-700 font-medium">
          View All History
        </button>
      </div>

      {/* Current Medications */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Pill className="h-5 w-5 mr-2 text-orange-500" />
          Current Medications
        </h3>
        
        <div className="text-center py-8 text-gray-500">
          <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No active medications</p>
        </div>
      </div>

      {/* Lab Results */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-purple-500" />
          Recent Lab Results
        </h3>
        
        <div className="space-y-3">
          {[
            { test: 'Complete Blood Count', date: '2024-01-10', status: 'Normal' },
            { test: 'Lipid Panel', date: '2024-01-10', status: 'Normal' },
            { test: 'Blood Glucose', date: '2024-01-10', status: 'Normal' }
          ].map((result, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{result.test}</p>
                <p className="text-sm text-gray-600">{new Date(result.date).toLocaleDateString()}</p>
              </div>
              <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                View Report
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          
          {!isEditing && (activeTab === 'personal' || activeTab === 'medical') && (
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Save Status */}
        {saveStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Profile updated successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error updating profile. Please try again.
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-emerald-400 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'personal' && renderPersonalInfo()}
          {activeTab === 'medical' && renderMedicalInfo()}
          {activeTab === 'insurance' && renderInsuranceInfo()}
          {activeTab === 'history' && renderMedicalHistory()}
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="inline h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="inline h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientProfile