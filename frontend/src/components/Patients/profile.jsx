import React, { useState, useEffect } from 'react'
import Navbar from './Navbar'
import { patientAPI, patientAppointmentsAPI, patientRecordsAPI, patientPrescriptionsAPI, patientMedicalHistoryAPI } from '../../services/apiService'
import { handlePatientAuthError } from '../../utils/patientAuth'
import { 
  User, Mail, Phone, MapPin, Calendar, Heart, Shield, 
  Edit2, Save, X, Camera, AlertCircle, Activity, FileText,
  Droplets, Users, Pill, Stethoscope, ClipboardList
} from 'lucide-react'

const PatientProfile = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('personal')
  
  // Patient profile data
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    profileImage: null,
    patientId: '',
    registrationDate: ''
  })
  
  // Medical information
  const [medicalInfo, setMedicalInfo] = useState({
    bloodGroup: '',
    bloodRh: '-',
    height: '',
    weight: '',
    bmi: '',
    bloodPressure: '',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    immunizations: []
  })
  
  // Insurance information
  const [insurance, setInsurance] = useState({
    provider: '',
    policyNumber: '',
    groupNumber: '',
    validUntil: '',
    coverageType: ''
  })
  
  // Form data for editing
  const [formData, setFormData] = useState(profile)
  const [medicalFormData, setMedicalFormData] = useState(medicalInfo)
  const [insuranceFormData, setInsuranceFormData] = useState(insurance)
  const [medicalHistoryFormData, setMedicalHistoryFormData] = useState({
    allergies: [],
    chronicConditions: [],
    immunizations: []
  })
  
  // Real data from backend
  const [appointments, setAppointments] = useState([])
  const [records, setRecords] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loadingData, setLoadingData] = useState(false)

  // Helper to map API -> UI state (resilient to different response shapes)
  const mapFromApi = (response) => {
    console.log('[PROFILE] mapFromApi input:', response);
    
    // Handle different response shapes
    let data = response;
    if (response?.data) {
      data = response.data;
    } else if (response?.success && response?.data) {
      data = response.data;
    } else if (response?.message && response?.data) {
      data = response.data;
    }
    
    console.log('[PROFILE] mapFromApi extracted data:', data);
    
    const vitals = Array.isArray(data.vitals) ? data.vitals : []
    const findVital = (code) => (vitals.find((x) => x.code === code)?.value ?? '')

    const profileData = {
      fullName:
        data.full_name ??
        [data.first_name, data.last_name].filter(Boolean).join(' ') ??
        data.fullName ??
        '',
      email: data.email || '',
      phone: data.phone || '',
      dateOfBirth: data.date_of_birth || data.birthDate || '',
      gender: (data.gender || '').toLowerCase(),
      address: data.address || '',
      // Emergency contact can be an object (from backend) or a string
      emergencyContact: (() => {
        const ec = data.emergency_contact;
        console.log('[PROFILE] Emergency contact raw data:', ec, 'type:', typeof ec);
        if (typeof ec === 'object' && ec !== null) {
          const name = ec.name || ec.emergency_contact || '';
          console.log('[PROFILE] Extracted emergency contact name:', name);
          return name;
        }
        const name = ec || '';
        console.log('[PROFILE] Emergency contact as string:', name);
        return name;
      })(),
      emergencyPhone: (() => {
        const ec = data.emergency_contact;
        if (typeof ec === 'object' && ec !== null) {
          const phone = ec.phone || data.emergency_phone || '';
          console.log('[PROFILE] Extracted emergency phone:', phone);
          return phone;
        }
        const phone = data.emergency_phone || '';
        console.log('[PROFILE] Emergency phone as string:', phone);
        return phone;
      })(),
      profileImage: data.profile_image || null,
      patientId: data.patient_id || data.id || '',
      registrationDate: data.registration_date || data.created_at || ''
    }

    const medicalData = {
      bloodGroup: data.blood_group || data.blood_type || '',
      bloodRh: data.blood_rh || '-',
      height: data.height || findVital('height'),
      weight: data.weight || findVital('weight'),
      bmi: data.bmi || findVital('bmi'),
      bloodPressure: data.blood_pressure_systolic && data.blood_pressure_diastolic 
        ? `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic}`
        : findVital('blood_pressure'),
      allergies: Array.isArray(data.allergies) ? data.allergies : [],
      chronicConditions: Array.isArray(data.chronic_conditions) ? data.chronic_conditions : [],
      currentMedications: Array.isArray(data.medications) ? data.medications : [],
      immunizations: Array.isArray(data.immunizations)
        ? data.immunizations.map((i) => ({
            name: i.vaccine || i.name || 'Vaccine',
            date: i.date || '',
            status: i.status || '',
          }))
        : []
    }

    const insuranceData = data.insurance
      ? {
          provider: data.insurance.provider || '',
          policyNumber: data.insurance.policy_number || '',
          groupNumber: data.insurance.group_number || '',
          validUntil: data.insurance.valid_until || '',
          coverageType: data.insurance.coverage_type || '',
        }
      : { provider: '', policyNumber: '', groupNumber: '', validUntil: '', coverageType: '' }

    console.log('[PROFILE] mapFromApi final mapped data:', { profileData, medicalData, insuranceData });
    return { profileData, medicalData, insuranceData }
  }

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError('')
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('token')
        console.log('[PROFILE] Auth check - token exists:', !!token)
        console.log('[PROFILE] Auth check - token preview:', token ? token.substring(0, 20) + '...' : 'null')
        if (!token) {
          console.error('[PROFILE] No token found - user not authenticated')
          setError('Please log in to view your profile')
          return
        }
        
        console.log('[PROFILE] Loading profile data...')
        const data = await patientAPI.getProfile()
        console.log('[PROFILE] Received data:', data)
        console.log('[PROFILE] Data type:', typeof data)
        console.log('[PROFILE] Data keys:', Object.keys(data || {}))
        const { profileData, medicalData, insuranceData } = mapFromApi(data)
        
        // Load medical history (allergies, chronic conditions) separately to ensure we have the latest data
        try {
          const medicalHistoryData = await patientMedicalHistoryAPI.get()
          console.log('[PROFILE] Initial load - medical history:', medicalHistoryData)
          
          if (medicalHistoryData) {
            // Override allergies and chronic conditions from medical history endpoint (source of truth)
            const allergies = medicalHistoryData.allergies?.map(a => a.name || a) || []
            const chronicConditions = medicalHistoryData.chronic_conditions?.map(c => c.condition || c) || []
            
            medicalData.allergies = allergies
            medicalData.chronicConditions = chronicConditions
            
            // Update form data with medical history data
            setMedicalHistoryFormData({
              allergies: allergies,
              chronicConditions: chronicConditions,
              immunizations: medicalData.immunizations || []
            })
          }
        } catch (error) {
          console.warn('[PROFILE] Error loading medical history on initial load (will use profile data):', error)
          // Check if it's an authentication error and redirect
          if (handlePatientAuthError(error)) {
            return; // Redirected, exit early
          }
          // Fallback to profile data if medical history endpoint fails
        }
        
        setProfile(profileData)
        setMedicalInfo(medicalData)
        setInsurance(insuranceData)
        setFormData((prev) => ({ ...prev, ...profileData }))
        setMedicalFormData((prev) => ({ ...prev, ...medicalData }))
      } catch (e) {
        console.error('[PROFILE] Error loading profile:', e)
        
        // Handle authentication errors and redirect if needed
        if (handlePatientAuthError(e)) {
          return; // Redirected, exit early
        }
        
        setError(e?.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
    loadMedicalHistoryData()
  }, [])

  // Load medical history data (appointments, records, prescriptions, allergies, chronic conditions)
  const loadMedicalHistoryData = async () => {
    setLoadingData(true)
    try {
      console.log('[PROFILE] Loading medical history data...')
      
      // Load appointments (past visits)
      const appointmentsData = await patientAppointmentsAPI.list('past')
      console.log('[PROFILE] Loaded appointments:', appointmentsData)
      setAppointments(appointmentsData || [])
      
      // Load records (lab results, consultations, reports, etc.) - sorted by date, newest first
      const recordsData = await patientRecordsAPI.list({ recordType: 'all', page: 1, size: 50 })
      console.log('[PROFILE] Loaded records:', recordsData)
      console.log('[PROFILE] Records items:', recordsData.items)
      // Records are already sorted by date (newest first) from the backend
      // Ensure we have an array and sort by date if needed (newest first)
      const recordsList = recordsData.items || []
      // Additional sort by date to ensure newest first (in case backend doesn't sort)
      const sortedRecords = [...recordsList].sort((a, b) => {
        const dateA = a.date ? new Date(a.date.split('.').reverse().join('-')) : new Date(0)
        const dateB = b.date ? new Date(b.date.split('.').reverse().join('-')) : new Date(0)
        return dateB - dateA // Newest first
      })
      console.log('[PROFILE] Sorted records (first 5):', sortedRecords.slice(0, 5))
      setRecords(sortedRecords)
      
      // Load prescriptions (medications)
      const prescriptionsData = await patientPrescriptionsAPI.list({ scope: 'active', page: 1, size: 10 })
      console.log('[PROFILE] Loaded prescriptions:', prescriptionsData)
      setPrescriptions(prescriptionsData.items || [])
      
      // Load medical history (allergies, chronic conditions) from dedicated endpoint
      // This is the source of truth for allergies and chronic conditions
      try {
        const medicalHistoryData = await patientMedicalHistoryAPI.get()
        console.log('[PROFILE] Loaded medical history:', medicalHistoryData)
        console.log('[PROFILE] Medical history allergies:', medicalHistoryData?.allergies)
        console.log('[PROFILE] Medical history chronic conditions:', medicalHistoryData?.chronic_conditions)
        
        if (medicalHistoryData) {
          // Extract allergies - handle both object format (AllergyItem) and string format
          const allergies = medicalHistoryData.allergies?.map(a => {
            if (typeof a === 'string') return a
            return a.name || a.condition || a
          }).filter(a => a) || []
          
          // Extract chronic conditions - handle both object format (ChronicConditionItem) and string format
          const chronicConditions = medicalHistoryData.chronic_conditions?.map(c => {
            if (typeof c === 'string') return c
            return c.condition || c.name || c
          }).filter(c => c) || []
          
          console.log('[PROFILE] Extracted allergies:', allergies)
          console.log('[PROFILE] Extracted chronic conditions:', chronicConditions)
          
          // Update medical info with allergies and chronic conditions from medical history (source of truth)
          setMedicalInfo(prev => ({
            ...prev,
            allergies: allergies,
            chronicConditions: chronicConditions
          }))
          
          // Update form data for editing
          setMedicalHistoryFormData(prev => ({
            allergies: allergies,
            chronicConditions: chronicConditions,
            immunizations: prev.immunizations || []
          }))
        } else {
          console.warn('[PROFILE] Medical history data is empty or null')
        }
      } catch (error) {
        console.warn('[PROFILE] Error loading medical history (will use profile data):', error)
        // Check if it's an authentication error and redirect
        if (handlePatientAuthError(error)) {
          return; // Redirected, exit early
        }
        // Fallback to profile data if medical history endpoint fails
      }
      
    } catch (error) {
      console.error('[PROFILE] Error loading medical history data:', error)
      // Check if it's an authentication error and redirect
      if (handlePatientAuthError(error)) {
        return; // Redirected, exit early
      }
      setError('Failed to load medical history data')
    } finally {
      setLoadingData(false)
    }
  }
  
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

  // Phone number input handler - only allows numbers and enforces max length
  const handlePhoneChange = (field, value) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, '')
    // Limit to 15 digits (international phone number standard)
    const limitedValue = numericValue.slice(0, 15)
    setFormData({ ...formData, [field]: limitedValue })
  }

  const handleSave = async () => {
    setLoading(true)
    setSaveStatus('')
    setError('')
    
    try {
      if (activeTab === 'personal') {
        const payload = {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          emergency_contact: formData.emergencyContact,
          emergency_phone: formData.emergencyPhone,
          profile_image: formData.profileImage || undefined,
        }
        console.log('[PROFILE] Saving payload:', payload)
        const result = await patientAPI.updateProfile(payload)
        console.log('[PROFILE] Save result:', result)

        // Small delay to ensure database commit and FHIR sync are complete
        await new Promise(resolve => setTimeout(resolve, 500))

        // Refetch canonical state from server
        console.log('[PROFILE] Refetching after save...')
        const fresh = await patientAPI.getProfile()
        console.log('[PROFILE] Fresh data from server:', fresh)
        console.log('[PROFILE] Fresh data type:', typeof fresh)
        console.log('[PROFILE] Fresh data keys:', Object.keys(fresh || {}))
        console.log('[PROFILE] Fresh data emergency_contact:', fresh?.emergency_contact)
        console.log('[PROFILE] Fresh data emergency_contact type:', typeof fresh?.emergency_contact)
        
        const { profileData, medicalData, insuranceData } = mapFromApi(fresh)
        console.log('[PROFILE] Mapped fresh data:', { profileData, medicalData, insuranceData })
        console.log('[PROFILE] Setting state with fresh data...')
        
        // Force a complete state update to ensure UI reflects changes
        setProfile({ ...profileData })
        setMedicalInfo({ ...medicalData })
        setInsurance({ ...insuranceData })
        setFormData({ ...profileData })
        setIsEditing(false) // Exit edit mode after successful save
        
        setSaveStatus('Profile updated successfully!')
        setTimeout(() => setSaveStatus(''), 3000)
        
        console.log('[PROFILE] State updated, profile should now show:', profileData)
        console.log('[PROFILE] Key fields - Name:', profileData.fullName, 'Email:', profileData.email, 'Phone:', profileData.phone, 'Address:', profileData.address)
      } else if (activeTab === 'medical') {
        // Save medical info to backend
        const medicalPayload = {
          height: medicalFormData.height,
          weight: medicalFormData.weight,
          blood_group: medicalFormData.bloodGroup,
          blood_pressure_systolic: medicalFormData.bloodPressure?.split('/')[0],
          blood_pressure_diastolic: medicalFormData.bloodPressure?.split('/')[1],
        }
        console.log('[PROFILE] Saving medical payload:', medicalPayload)
        const result = await patientAPI.updateProfile(medicalPayload)
        console.log('[PROFILE] Medical save result:', result)

        // Refetch canonical state from server
        console.log('[PROFILE] Refetching after medical save...')
        const fresh = await patientAPI.getProfile()
        console.log('[PROFILE] Fresh medical data from server:', fresh)
        
        const { profileData, medicalData, insuranceData } = mapFromApi(fresh)
        console.log('[PROFILE] Mapped fresh medical data:', { profileData, medicalData, insuranceData })
        
        setProfile(profileData)
        setMedicalInfo(medicalData)
        setInsurance(insuranceData)
        setMedicalFormData(medicalData)
      } else if (activeTab === 'insurance') {
        // Save insurance info to backend
        const insurancePayload = {
          insurance_provider: insuranceFormData.provider,
          insurance_policy_number: insuranceFormData.policyNumber,
          insurance_group_number: insuranceFormData.groupNumber,
          insurance_coverage_type: insuranceFormData.coverageType,
          insurance_valid_until: insuranceFormData.validUntil,
        }
        console.log('[PROFILE] Saving insurance payload:', insurancePayload)
        const result = await patientAPI.updateProfile(insurancePayload)
        console.log('[PROFILE] Insurance save result:', result)

        // Refetch canonical state from server
        console.log('[PROFILE] Refetching after insurance save...')
        const fresh = await patientAPI.getProfile()
        console.log('[PROFILE] Fresh insurance data from server:', fresh)
        
        const { profileData, medicalData, insuranceData } = mapFromApi(fresh)
        console.log('[PROFILE] Mapped fresh insurance data:', { profileData, medicalData, insuranceData })
        
        setProfile(profileData)
        setMedicalInfo(medicalData)
        setInsurance(insuranceData)
        setInsuranceFormData(insuranceData)
      } else if (activeTab === 'history') {
        // Save medical history info to dedicated backend endpoint
        const medicalHistoryPayload = {
          allergies: medicalHistoryFormData.allergies,
          chronic_conditions: medicalHistoryFormData.chronicConditions,
        }
        console.log('[PROFILE] Saving medical history payload:', medicalHistoryPayload)
        const result = await patientMedicalHistoryAPI.update(medicalHistoryPayload)
        console.log('[PROFILE] Medical history save result:', result)

        // Save immunizations via profile update (they're handled separately)
        if (medicalHistoryFormData.immunizations && medicalHistoryFormData.immunizations.length > 0) {
          try {
            await patientAPI.updateProfile({
              immunizations: medicalHistoryFormData.immunizations
            })
          } catch (error) {
            console.warn('[PROFILE] Error saving immunizations:', error)
          }
        }

        // Refetch medical history from dedicated endpoint
        console.log('[PROFILE] Refetching medical history after save...')
        const freshHistory = await patientMedicalHistoryAPI.get()
        console.log('[PROFILE] Fresh medical history data from server:', freshHistory)
        
        if (freshHistory) {
          const allergies = freshHistory.allergies?.map(a => a.name || a) || []
          const chronicConditions = freshHistory.chronic_conditions?.map(c => c.condition || c) || []
          
          console.log('[PROFILE] Extracted allergies after save:', allergies)
          console.log('[PROFILE] Extracted chronic conditions after save:', chronicConditions)
          
          // Update medical info with fresh medical history data
          setMedicalInfo(prev => ({
            ...prev,
            allergies: allergies,
            chronicConditions: chronicConditions
          }))
          
          // Update form data
        setMedicalHistoryFormData({
            allergies: allergies,
            chronicConditions: chronicConditions,
            immunizations: medicalHistoryFormData.immunizations || []
          })
        } else {
          console.warn('[PROFILE] No medical history data returned after save')
        }
        
        // Also refetch profile for immunizations and other medical data
        try {
          const fresh = await patientAPI.getProfile()
          const { profileData, medicalData, insuranceData } = mapFromApi(fresh)
          setProfile(profileData)
          // Merge profile medical data with medical history data (medical history takes precedence for allergies/conditions)
          setMedicalInfo(prev => ({
            ...prev,
            ...medicalData,
            // Keep allergies and chronic conditions from medical history (source of truth)
            allergies: freshHistory?.allergies?.map(a => a.name || a) || prev.allergies || medicalData.allergies,
            chronicConditions: freshHistory?.chronic_conditions?.map(c => c.condition || c) || prev.chronicConditions || medicalData.chronicConditions
          }))
          setInsurance(insuranceData)
        } catch (error) {
          console.warn('[PROFILE] Error refetching profile after medical history save:', error)
        }
      }
      
      setIsEditing(false)
      setSaveStatus('success')
      
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('[PROFILE] Error saving profile:', error)
      // Check if it's an authentication error and redirect
      if (handlePatientAuthError(error)) {
        return; // Redirected, exit early
      }
      setSaveStatus('error')
      setError(error?.message || 'Failed to save changes')
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
                  onChange={(e) => handlePhoneChange('phone', e.target.value)}
                  maxLength={15}
                  placeholder="Enter phone number (numbers only)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.phone.length}/15 digits</p>
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
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
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
                  onChange={(e) => handlePhoneChange('emergencyPhone', e.target.value)}
                  maxLength={15}
                  placeholder="Enter phone number (numbers only)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.emergencyPhone.length}/15 digits</p>
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
                  Born: {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '—'}
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
                  Registered on: {profile.registrationDate ? new Date(profile.registrationDate).toLocaleDateString() : '—'}
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
      
      {isEditing && activeTab === 'insurance' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
                <input
                  type="text"
                  value={insuranceFormData.provider}
                  onChange={(e) => setInsuranceFormData({...insuranceFormData, provider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter insurance provider"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Policy Number</label>
                <input
                  type="text"
                  value={insuranceFormData.policyNumber}
                  onChange={(e) => setInsuranceFormData({...insuranceFormData, policyNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter policy number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Number</label>
                <input
                  type="text"
                  value={insuranceFormData.groupNumber}
                  onChange={(e) => setInsuranceFormData({...insuranceFormData, groupNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter group number"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Coverage Type</label>
                <select
                  value={insuranceFormData.coverageType}
                  onChange={(e) => setInsuranceFormData({...insuranceFormData, coverageType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select coverage type</option>
                  <option value="HMO">HMO</option>
                  <option value="PPO">PPO</option>
                  <option value="EPO">EPO</option>
                  <option value="POS">POS</option>
                  <option value="Medicare">Medicare</option>
                  <option value="Medicaid">Medicaid</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <input
                  type="date"
                  value={insuranceFormData.validUntil}
                  onChange={(e) => setInsuranceFormData({...insuranceFormData, validUntil: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Insurance Provider</p>
              <p className="font-semibold text-gray-800">{insurance.provider || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Policy Number</p>
              <p className="font-semibold text-gray-800">{insurance.policyNumber || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Group Number</p>
              <p className="font-semibold text-gray-800">{insurance.groupNumber || 'Not provided'}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Coverage Type</p>
              <p className="font-semibold text-gray-800">{insurance.coverageType || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valid Until</p>
              <p className="font-semibold text-gray-800">
                {insurance.validUntil ? new Date(insurance.validUntil).toLocaleDateString() : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {insurance.provider ? 'Active' : 'Not configured'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
        <p className="text-sm text-emerald-800">
          <AlertCircle className="inline h-4 w-4 mr-1" />
          {insurance.provider ? 'Your insurance is active and covers comprehensive medical services' : 'Please add your insurance information to ensure proper coverage'}
        </p>
      </div>
    </div>
  )

  const renderMedicalHistory = () => {
    // Filter records to show only consultations, visits, and reports (not lab results or vitals)
    // Records are already sorted by date (newest first) from the backend
    const recentVisits = records.filter(record => {
      // Check multiple possible field names for record type
      const recordType = (
        record.recordType?.toLowerCase() || 
        record.type?.toLowerCase() || 
        record.record_type?.toLowerCase() || 
        record.fhirType?.toLowerCase() ||
        ''
      )
      
      // Also check title and description for report indicators
      const title = (record.title || record.description || record.summary || '').toLowerCase()
      
      // Include if it's a consultation, visit, report, document, or clinical note
      const isVisitOrReport = 
        recordType.includes('consultation') || 
        recordType.includes('visit') || 
        recordType.includes('report') ||
        recordType.includes('document') ||
        recordType === 'general report' ||
        recordType === 'clinical note' ||
        recordType === 'soap note' ||
        title.includes('consultation') ||
        title.includes('report') ||
        title.includes('visit')
      
      // Exclude lab results, observations, and vitals
      const isExcluded = 
        recordType.includes('lab') ||
        recordType.includes('observation') ||
        recordType.includes('vital') ||
        recordType.includes('diagnostic') ||
        title.includes('lab result') ||
        title.includes('vital sign')
      
      return isVisitOrReport && !isExcluded
    }).slice(0, 5) // Show latest 5 visits
    
    return (
    <div className="space-y-6">
      {/* Recent Visits */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Stethoscope className="h-5 w-5 mr-2 text-emerald-500" />
            Recent Visits & Reports
        </h3>
        
        {loadingData ? (
          <div className="text-center py-8 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
            <p>Loading visit history...</p>
          </div>
          ) : recentVisits.length > 0 ? (
          <div className="space-y-4">
              {recentVisits.map((visit, index) => (
                <div key={visit.id || visit.fhirId || visit.fhir_resource_id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {visit.title || visit.description || visit.summary || 'Visit'}
                    </p>
                  <p className="text-sm text-gray-600">
                      {visit.hospital || visit.clinic || 'Hospital'} • {visit.date || 'Date not available'}
                      {visit.doctor && ` • Dr. ${visit.doctor}`}
                  </p>
                    {(visit.recordType || visit.type || visit.record_type) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {visit.recordType || visit.type || visit.record_type}
                      </p>
                    )}
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {visit.status || 'Completed'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Stethoscope className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No visit history found</p>
          </div>
        )}
        
          <button 
            onClick={() => window.location.href = '/patient/records'}
            className="mt-4 w-full text-center text-emerald-600 hover:text-emerald-700 font-medium"
          >
          View All History
        </button>
      </div>

      {/* Allergies */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
          Allergies
        </h3>
        
        {isEditing && activeTab === 'history' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Known Allergies</label>
              <textarea
                value={medicalHistoryFormData.allergies.join(', ')}
                onChange={(e) => setMedicalHistoryFormData({
                  ...medicalHistoryFormData,
                  allergies: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter allergies separated by commas (e.g., Penicillin, Shellfish, Pollen)"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {medicalInfo.allergies.length > 0 ? (
              medicalInfo.allergies.map((allergy, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="font-medium text-gray-800">{allergy}</span>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Allergy
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No known allergies</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chronic Conditions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Heart className="h-5 w-5 mr-2 text-blue-500" />
          Chronic Conditions
        </h3>
        
        {isEditing && activeTab === 'history' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chronic Conditions</label>
              <textarea
                value={medicalHistoryFormData.chronicConditions.join(', ')}
                onChange={(e) => setMedicalHistoryFormData({
                  ...medicalHistoryFormData,
                  chronicConditions: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter chronic conditions separated by commas (e.g., Diabetes, Hypertension, Asthma)"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {medicalInfo.chronicConditions.length > 0 ? (
              medicalInfo.chronicConditions.map((condition, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="font-medium text-gray-800">{condition}</span>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Chronic
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Heart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No chronic conditions recorded</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Medications */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Pill className="h-5 w-5 mr-2 text-orange-500" />
          Current Medications
        </h3>
        
        {loadingData ? (
          <div className="text-center py-8 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
            <p>Loading medications...</p>
          </div>
        ) : prescriptions.length > 0 ? (
          <div className="space-y-3">
            {prescriptions.slice(0, 5).map((medication, index) => (
              <div key={medication.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{medication.medicineName || medication.knownAs}</p>
                  <p className="text-sm text-gray-600">
                    {medication.dosage} • {medication.frequency}
                  </p>
                  <p className="text-xs text-gray-500">
                    Prescribed by {medication.prescribedBy} • {medication.prescribedDate}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  medication.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {medication.status || 'Active'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active medications</p>
          </div>
        )}
      </div>

      {/* Lab Results */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-purple-500" />
          Recent Lab Results
        </h3>
        
        {loadingData ? (
          <div className="text-center py-8 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
            <p>Loading lab results...</p>
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-3">
            {records.filter(record => 
              record.recordType?.toLowerCase().includes('lab') || 
              record.recordType?.toLowerCase().includes('diagnostic') ||
              record.description?.toLowerCase().includes('lab')
            ).slice(0, 5).map((result, index) => (
              <div key={result.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{result.description || result.recordType || 'Lab Test'}</p>
                  <p className="text-sm text-gray-600">
                    {result.date ? new Date(result.date).toLocaleDateString() : 'Date not available'}
                  </p>
                  {result.doctor && (
                    <p className="text-xs text-gray-500">Ordered by {result.doctor}</p>
                  )}
                </div>
                <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                  View Report
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No lab results found</p>
          </div>
        )}
      </div>
    </div>
  )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Navbar />
      
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
            {profile.email && (
              <p className="text-sm text-gray-600 mt-1">Logged in as: {profile.email}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isEditing && (activeTab === 'personal' || activeTab === 'medical' || activeTab === 'insurance' || activeTab === 'history') && (
              <button
                onClick={handleEdit}
                className="flex items-center px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Save Status and Error Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
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