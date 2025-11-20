import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMapPin, FiEdit2, FiTrash2, FiPlus, FiHome, FiSearch, FiFilter, FiChevronDown, FiSave, FiUsers, FiActivity, FiEye, FiChevronUp, FiShield, FiLock, FiArrowLeft } from 'react-icons/fi'
import AdminHeader from './AdminHeader'
import { adminAPI } from '../../services/apiService'

const departments = ['Cardiology', 'Pediatrics', 'Emergency', 'Radiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Physical Therapy', 'General Medicine', 'Surgery', 'ICU']

const AdminClinics = () => {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [cityFilter, setCityFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    hospital_type: 'General Hospital',
    status: 'Active',
    address: '',
    phone: '',
    email: '',
    website: '',
    capacity: 0,
    established_date: '',
    license_number: '',
    accreditation: ''
  })

  // Fetch current user and clinics on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch clinics using admin API
        const clinicsData = await adminAPI.getClinics()
        // Transform backend response to match frontend expectations
        const transformedClinics = clinicsData.map(clinic => ({
          id: clinic.id,
          name: clinic.name,
          type: clinic.hospital_type || 'General Hospital',
          status: clinic.status || 'Active',
          address: clinic.address || '',
          city: clinic.address ? clinic.address.split(',')[2]?.trim() || 'Unknown' : 'Unknown',
          phone: clinic.phone || '',
          email: clinic.email || '',
          website: clinic.website || '',
          logo_url: clinic.logo_url || '',
          beds: clinic.beds || 0, // Use new 'beds' field from backend
          founded: clinic.established_date ? new Date(clinic.established_date).getFullYear().toString() : '',
          departments: clinic.departments || [], // Use new 'departments' field from backend
          doctors: 0, // TODO: Fetch doctors count separately
          patients: 0, // TODO: Fetch patients count separately
          created_at: clinic.created_at,
          updated_at: clinic.updated_at
        }))
        setClinics(transformedClinics)

        // For now, we'll use a mock current user since we don't have auth API yet
        setCurrentUser({
          role: 'superadmin',
          clinicId: null
        })
      } catch (err) {
        console.error('Failed to fetch data', err)
        setError('Failed to load clinics. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const isSuperAdmin = currentUser?.role === 'superadmin'
  const isClinicAdmin = currentUser?.role === 'clinic_admin'

  const getAccessibleClinics = () => {
    if (isSuperAdmin) {
      return clinics
    } else if (isClinicAdmin && currentUser?.clinicId) {
      return clinics.filter(clinic => clinic.id === currentUser.clinicId)
    }
    return []
  }

  const accessibleClinics = getAccessibleClinics()
  const cities = [...new Set(accessibleClinics.map(c => c.city))]

  let filteredClinics = accessibleClinics.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.departments.some(dept => dept.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter
    const matchesCity = cityFilter === 'All' || c.city === cityFilter
    return matchesSearch && matchesStatus && matchesCity
  })

  filteredClinics.sort((a, b) => {
    let aValue = a[sortBy]
    let bValue = b[sortBy]

    if (sortBy === 'departments') {
      aValue = a.departments.length
      bValue = b.departments.length
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
  })

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClinics = filteredClinics.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredClinics.length / itemsPerPage);

  const handleToggleStatus = async (clinicId) => {
    try {
      const clinic = clinics.find(c => c.id === clinicId)
      const newStatus = clinic.status === 'Active' ? 'Inactive' : 'Active'
      
      await adminAPI.updateClinic(clinicId, { ...clinic, status: newStatus })
      
      // Update local state
      setClinics(clinics.map(c => 
        c.id === clinicId ? { ...c, status: newStatus } : c
      ))
    } catch (err) {
      console.error('Failed to toggle clinic status', err)
      alert('Failed to update clinic status. Please try again.')
    }
  }

  const handleSaveClinic = async () => {
    try {
      if (selectedClinic) {
        // Update existing clinic
        await adminAPI.updateClinic(selectedClinic.id, formData)
        setClinics(clinics.map(c => 
          c.id === selectedClinic.id ? { ...c, ...formData } : c
        ))
      } else {
        // Create new clinic
        const newClinic = await adminAPI.createClinic(formData)
        setClinics([...clinics, newClinic])
      }

      setShowAddModal(false)
      setShowEditModal(false)
      setSelectedClinic(null)
      setFormData({
        name: '',
        hospital_type: 'General Hospital',
        status: 'Active',
        address: '',
        phone: '',
        email: '',
        website: '',
        capacity: 0,
        established_date: '',
        license_number: '',
        accreditation: ''
      })
    } catch (err) {
      console.error('Failed to save clinic', err)
      alert('Failed to save clinic. Please try again.')
    }
  }

  const handleConfirmDelete = async () => {
    try {
      await adminAPI.deleteClinic(selectedClinic.id)
      setClinics(clinics.filter(c => c.id !== selectedClinic.id))
      setShowDeleteModal(false)
      setSelectedClinic(null)
    } catch (err) {
      console.error('Failed to delete clinic', err)
      alert('Failed to delete clinic. Please try again.')
    }
  }

  const handleRoleSwitch = async (role) => {
    // This would typically update the current user's role
    // For now, we'll just update the local state
    setCurrentUser(prev => ({ ...prev, role }))
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6B0]"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400 text-xl mr-3">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  return (
    <>
      <div className="bg-gray-50 min-h-screen">
        <AdminHeader />

        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showSidebar ? '←' : '→'} Filters
            </button>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">
              Clinic Management
            </h2>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setSelectedClinic(null)
                setFormData({
                  name: '',
                  hospital_type: 'General Hospital',
                  status: 'Active',
                  address: '',
                  phone: '',
                  email: '',
                  website: '',
                  capacity: 0,
                  established_date: '',
                  license_number: '',
                  accreditation: ''
                })
                setShowAddModal(true)
              }}
              className="bg-[#4DB6B0] text-white px-4 py-2 rounded-lg hover:bg-[#3DA6A0] transition-colors"
            >
              Add Clinic
            </button>
          )}
        </div>

        {/* Mobile Overlay */}
        {showSidebar && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main Layout: Sidebar + Content */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className={`${showSidebar ? 'block' : 'hidden'} lg:block w-80 flex-shrink-0 relative z-30 lg:z-auto lg:relative fixed lg:static top-0 left-0 h-full lg:h-auto bg-white lg:bg-transparent p-4 lg:p-0 lg:shadow-none shadow-lg`}>
            {/* Filters - Top */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('All')
                    setCityFilter('All')
                    setSortBy('name')
                    setSortOrder('asc')
                    setCurrentPage(1)
                  }}
                  className="text-sm text-[#4DB6B0] hover:text-[#3DA6A0] font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search clinics..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    disabled={cities.length <= 1}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0] disabled:bg-gray-100"
                  >
                    <option value="All">All Cities</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-')
                      setSortBy(field)
                      setSortOrder(order)
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  >
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="city-asc">City A-Z</option>
                    <option value="city-desc">City Z-A</option>
                    <option value="doctors-desc">Most Doctors</option>
                    <option value="patients-desc">Most Patients</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Boxes - Bottom */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Clinics</div>
                <div className="text-2xl font-bold text-[#4DB6B0]">{accessibleClinics.length}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {accessibleClinics.filter(c => c.status === 'Active').length} active, {accessibleClinics.filter(c => c.status === 'Inactive').length} inactive
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Beds</div>
                <div className="text-2xl font-bold text-blue-600">{accessibleClinics.reduce((sum, c) => sum + (c.beds || 0), 0)}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {accessibleClinics.length > 0 ? Math.round(accessibleClinics.reduce((sum, c) => sum + (c.beds || 0), 0) / accessibleClinics.length) : 0} avg per clinic
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Cities</div>
                <div className="text-2xl font-bold text-green-600">{cities.length}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {cities.slice(0, 2).join(', ')}{cities.length > 2 ? '...' : ''}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Departments</div>
                <div className="text-2xl font-bold text-purple-600">{accessibleClinics.reduce((sum, c) => sum + c.departments.length, 0)}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Across all clinics
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Clinics Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clinic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Departments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedClinics.map((clinic) => {
                      const canView = isSuperAdmin || (isClinicAdmin && currentUser.clinicId === clinic.id)
                      const canEdit = isSuperAdmin || (isClinicAdmin && currentUser.clinicId === clinic.id)
                      const canDelete = isSuperAdmin
                      const canToggleStatus = isSuperAdmin || (isClinicAdmin && currentUser.clinicId === clinic.id)
                      
                      return (
                        <tr key={clinic.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {clinic.logo_url ? (
                                  <img 
                                    src={clinic.logo_url} 
                                    alt={`${clinic.name} logo`}
                                    className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className={`h-10 w-10 rounded-full bg-[#4DB6B0] flex items-center justify-center text-white font-semibold ${clinic.logo_url ? 'hidden' : 'flex'}`}
                                >
                                  <FiHome />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{clinic.name}</div>
                                <div className="text-sm text-gray-500">Founded {clinic.founded}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FiMapPin className="text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm text-gray-900">{clinic.city}</div>
                                <div className="text-sm text-gray-500">{clinic.address}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {clinic.departments.slice(0, 2).map(dept => (
                                <span key={dept} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                  {dept}
                                </span>
                              ))}
                              {clinic.departments.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  +{clinic.departments.length - 2} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <FiUsers className="text-gray-400 mr-2" />
                              {clinic.beds} beds
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => canToggleStatus && handleToggleStatus(clinic.id)}
                              disabled={!canToggleStatus}
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                                clinic.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' + (canToggleStatus ? ' hover:bg-green-200 cursor-pointer' : ' cursor-not-allowed opacity-75')
                                  : 'bg-gray-100 text-gray-600' + (canToggleStatus ? ' hover:bg-gray-200 cursor-pointer' : ' cursor-not-allowed opacity-75')
                              }`}
                            >
                              {clinic.status}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  if (canView) {
                                    navigate(`/admin/clinics/${clinic.id}`)
                                  }
                                }}
                                className={`transition-colors ${
                                  canView 
                                    ? 'text-gray-400 hover:text-blue-600' 
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title={canView ? "View Clinic Profile" : "No permission to view"}
                              >
                                <FiEye />
                              </button>
                              <button 
                                onClick={() => {
                                  if (canEdit) {
                                    setSelectedClinic(clinic)
                                    setFormData(clinic)
                                    setShowEditModal(true)
                                  }
                                }}
                                disabled={!canEdit}
                                className={`transition-colors ${
                                  canEdit 
                                    ? 'text-gray-400 hover:text-blue-600' 
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title={canEdit ? "Edit Clinic" : "No permission to edit"}
                              >
                                <FiEdit2 />
                              </button>
                              <button 
                                onClick={() => {
                                  if (canDelete) {
                                    setSelectedClinic(clinic)
                                    setShowDeleteModal(true)
                                  }
                                }}
                                disabled={!canDelete}
                                className={`transition-colors ${
                                  canDelete 
                                    ? 'text-gray-400 hover:text-red-600' 
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title={canDelete ? "Delete Clinic" : "Only Super Admin can delete"}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {paginatedClinics.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          <FiHome className="mx-auto text-4xl mb-2" />
                          <div>No clinics found matching your criteria</div>
                          <div className="text-sm">Try adjusting your search or filters</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClinics.length)} of {filteredClinics.length} clinics
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded-md text-sm ${
                        currentPage === page
                          ? 'bg-[#4DB6B0] text-white border-[#4DB6B0]'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-[#4DB6B0] shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {selectedClinic ? 'Edit Clinic' : 'Add New Clinic'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter clinic name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.hospital_type}
                  onChange={e => setFormData(prev => ({ ...prev, hospital_type: e.target.value }))}
                >
                  <option value="General Hospital">General Hospital</option>
                  <option value="Specialty Hospital">Specialty Hospital</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Medical Center">Medical Center</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter full address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.website}
                  onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="Enter website URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Beds)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.capacity}
                  onChange={e => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter number of beds"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Established Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.established_date}
                  onChange={e => setFormData(prev => ({ ...prev, established_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.license_number}
                  onChange={e => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                  placeholder="Enter license number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4DB6B0]"
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                  setSelectedClinic(null)
                  setFormData({
                    name: '',
                    hospital_type: 'General Hospital',
                    status: 'Active',
                    address: '',
                    phone: '',
                    email: '',
                    website: '',
                    capacity: 0,
                    established_date: '',
                    license_number: '',
                    accreditation: ''
                  })
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClinic}
                className="px-4 py-2 bg-[#4DB6B0] text-white rounded-lg hover:bg-[#3DA6A0]"
              >
                {selectedClinic ? 'Update' : 'Create'} Clinic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-[#4DB6B0] shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Delete Clinic</h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{selectedClinic?.name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedClinic(null)
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete Clinic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminClinics