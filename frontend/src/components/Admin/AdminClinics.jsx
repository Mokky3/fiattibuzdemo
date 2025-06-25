import React, { useState, useEffect } from 'react'
import { FiMapPin, FiEdit2, FiTrash2, FiPlus, FiHome, FiSearch, FiFilter, FiChevronDown, FiX, FiSave, FiUsers, FiActivity, FiEye, FiChevronUp, FiShield, FiLock, FiArrowLeft } from 'react-icons/fi'
import AdminHeader from './AdminHeader'

const dummyClinics = [
  { id: 1, name: 'Main Hospital', city: 'Tashkent', departments: ['Cardiology', 'Pediatrics', 'Emergency'], status: 'Active', doctors: 15, patients: 245, founded: '2010', address: '123 Medical Street' },
  { id: 2, name: 'Downtown Clinic', city: 'Samarkand', departments: ['Radiology'], status: 'Inactive', doctors: 3, patients: 89, founded: '2018', address: '456 Health Ave' },
  { id: 3, name: 'Eastside Branch', city: 'Andijan', departments: ['Dermatology', 'Neurology'], status: 'Active', doctors: 8, patients: 156, founded: '2015', address: '789 Care Boulevard' },
  { id: 4, name: 'North Medical Center', city: 'Tashkent', departments: ['Orthopedics', 'Physical Therapy'], status: 'Active', doctors: 12, patients: 198, founded: '2012', address: '321 Wellness Road' },
  { id: 5, name: 'Westside Clinic', city: 'Bukhara', departments: ['General Medicine', 'Pediatrics'], status: 'Active', doctors: 6, patients: 134, founded: '2019', address: '654 Treatment Lane' },
  { id: 6, name: 'Central Hospital', city: 'Namangan', departments: ['Surgery', 'ICU', 'Emergency'], status: 'Active', doctors: 20, patients: 312, founded: '2008', address: '987 Hospital Drive' }
]

const departments = ['Cardiology', 'Pediatrics', 'Emergency', 'Radiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Physical Therapy', 'General Medicine', 'Surgery', 'ICU']

// Mock user data - in real app this would come from authentication context
const mockUsers = {
  superadmin: {
    id: 1,
    name: 'Super Admin',
    role: 'superadmin',
    email: 'superadmin@medadmin.com',
    clinicId: null // null means access to all clinics
  },
  clinicadmin: {
    id: 2,
    name: 'Clinic Admin',
    role: 'clinic_admin',
    email: 'admin@mainhospital.com',
    clinicId: 1 // can only access clinic with id 1
  }
}

const AdminClinics = () => {
  // Mock current user - in real app this would come from auth context
  const [currentUser, setCurrentUser] = useState(mockUsers.superadmin) // Change to mockUsers.clinicadmin to test clinic admin view
  
  const [clinics, setClinics] = useState(dummyClinics)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [cityFilter, setCityFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    departments: [],
    status: 'Active',
    address: '',
    founded: ''
  })

  // Role-based access control
  const isSuperAdmin = currentUser.role === 'superadmin'
  const isClinicAdmin = currentUser.role === 'clinic_admin'

  // Filter clinics based on user role
  const getAccessibleClinics = () => {
    if (isSuperAdmin) {
      return clinics // Super admin sees all clinics
    } else if (isClinicAdmin && currentUser.clinicId) {
      return clinics.filter(clinic => clinic.id === currentUser.clinicId) // Clinic admin sees only their clinic
    }
    return [] // No access
  }

  const accessibleClinics = getAccessibleClinics()

  // Get unique cities for filter (only from accessible clinics)
  const cities = [...new Set(accessibleClinics.map(c => c.city))]

  // Filter and sort clinics
  let filteredClinics = accessibleClinics.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.departments.some(dept => dept.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter
    const matchesCity = cityFilter === 'All' || c.city === cityFilter
    return matchesSearch && matchesStatus && matchesCity
  })

  // Sort clinics
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
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Pagination
  const totalPages = Math.ceil(filteredClinics.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedClinics = filteredClinics.slice(startIndex, startIndex + itemsPerPage)

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleViewClinic = (clinicId) => {
    // Check if user has permission to view this clinic
    const canView = isSuperAdmin || (isClinicAdmin && currentUser.clinicId === clinicId)
    if (!canView) return

    // Navigate to clinic profile route
    window.location.href = `/admin/clinics/${clinicId}`
  }

  const handleBackToList = () => {
    setCurrentView('list')
    setSelectedClinicId(null)
  }

  const handleAddClinic = () => {
    // Only superadmin can add new clinics
    if (!isSuperAdmin) return
    
    setFormData({
      name: '',
      city: '',
      departments: [],
      status: 'Active',
      address: '',
      founded: ''
    })
    setShowAddModal(true)
  }

  const handleEditClinic = (clinic) => {
    // Check if user has permission to edit this clinic
    if (isClinicAdmin && currentUser.clinicId !== clinic.id) return
    
    setSelectedClinic(clinic)
    setFormData({
      name: clinic.name,
      city: clinic.city,
      departments: clinic.departments,
      status: clinic.status,
      address: clinic.address,
      founded: clinic.founded
    })
    setShowEditModal(true)
  }

  const handleDeleteClinic = (clinic) => {
    // Only superadmin can delete clinics
    if (!isSuperAdmin) return
    
    setSelectedClinic(clinic)
    setShowDeleteModal(true)
  }

  const handleToggleStatus = (clinicId) => {
    // Check if user has permission to toggle status
    if (isClinicAdmin && currentUser.clinicId !== clinicId) return
    
    setClinics(prev => prev.map(clinic => 
      clinic.id === clinicId 
        ? { ...clinic, status: clinic.status === 'Active' ? 'Inactive' : 'Active' }
        : clinic
    ))
  }

  const handleSaveClinic = () => {
    if (selectedClinic) {
      // Edit existing clinic - check permissions
      if (isClinicAdmin && currentUser.clinicId !== selectedClinic.id) return
      
      setClinics(prev => prev.map(clinic => 
        clinic.id === selectedClinic.id 
          ? { ...clinic, ...formData, doctors: clinic.doctors, patients: clinic.patients }
          : clinic
      ))
      setShowEditModal(false)
    } else {
      // Add new clinic - only superadmin can do this
      if (!isSuperAdmin) return
      
      const newClinic = {
        id: Math.max(...clinics.map(c => c.id)) + 1,
        ...formData,
        doctors: 0,
        patients: 0
      }
      setClinics(prev => [...prev, newClinic])
      setShowAddModal(false)
    }
    setSelectedClinic(null)
  }

  const handleConfirmDelete = () => {
    // Only superadmin can delete
    if (!isSuperAdmin) return
    
    setClinics(prev => prev.filter(clinic => clinic.id !== selectedClinic.id))
    setShowDeleteModal(false)
    setSelectedClinic(null)
  }

  const handleDepartmentToggle = (dept) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept]
    }))
  }

  // User role switcher for demo purposes
  const handleRoleSwitch = (role) => {
    setCurrentUser(mockUsers[role])
    setCurrentPage(1) // Reset pagination
    setSearchTerm('') // Reset search
    setStatusFilter('All') // Reset filters
    setCityFilter('All')
    setCurrentView('list') // Reset to list view
    setSelectedClinicId(null)
  }

  const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX />
            </button>
          </div>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Role Switcher - Remove in production */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiShield className="text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Demo: Switch User Role</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRoleSwitch('superadmin')}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  currentUser.role === 'superadmin' 
                    ? 'bg-yellow-200 text-yellow-800' 
                    : 'bg-white text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                Super Admin
              </button>
              <button
                onClick={() => handleRoleSwitch('clinicadmin')}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  currentUser.role === 'clinic_admin' 
                    ? 'bg-yellow-200 text-yellow-800' 
                    : 'bg-white text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                Clinic Admin
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-[#4DB6B0]">Clinics</h2>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                {isSuperAdmin ? (
                  <>
                    <FiShield className="text-green-600 text-xs" />
                    <span className="text-xs text-green-600 font-medium">Super Admin</span>
                  </>
                ) : (
                  <>
                    <FiLock className="text-blue-600 text-xs" />
                    <span className="text-xs text-blue-600 font-medium">Clinic Admin</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              {isSuperAdmin 
                ? 'Manage all healthcare facilities and their information' 
                : `Managing ${accessibleClinics[0]?.name || 'your clinic'}`
              }
            </p>
          </div>
          {isSuperAdmin && (
            <button 
              onClick={handleAddClinic}
              className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              <FiPlus />
              Add Clinic
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {isSuperAdmin ? 'Total Clinics' : 'Your Clinic'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{accessibleClinics.length}</p>
              </div>
              <FiHome className="text-[#4DB6B0] text-2xl" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clinics</p>
                <p className="text-2xl font-bold text-green-600">
                  {accessibleClinics.filter(c => c.status === 'Active').length}
                </p>
              </div>
              <FiActivity className="text-green-500 text-2xl" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Doctors</p>
                <p className="text-2xl font-bold text-blue-600">
                  {accessibleClinics.reduce((sum, c) => sum + c.doctors, 0)}
                </p>
              </div>
              <FiUsers className="text-blue-500 text-2xl" />
            </div>
          </div>
        </div>

        {/* Access Control Notice */}
        {isClinicAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <FiLock className="text-blue-600" />
              <span className="text-sm text-blue-800">
                <strong>Clinic Admin Access:</strong> You can only view and manage your assigned clinic: {accessibleClinics[0]?.name}
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search clinics..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              disabled={cities.length <= 1}
            >
              <option value="All">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field)
                setSortOrder(order)
              }}
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

        {/* Clinics Table */}
        <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Clinic Name
                    {sortBy === 'name' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('city')}>
                  <div className="flex items-center gap-1">
                    City
                    {sortBy === 'city' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Departments</th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('doctors')}>
                  <div className="flex items-center gap-1">
                    Staff
                    {sortBy === 'doctors' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'status' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClinics.map(clinic => {
                const canView = isSuperAdmin || (isClinicAdmin && currentUser.clinicId === clinic.id)
                const canEdit = isSuperAdmin || (isClinicAdmin && currentUser.clinicId === clinic.id)
                const canDelete = isSuperAdmin
                const canToggleStatus = isSuperAdmin || (isClinicAdmin && currentUser.clinicId === clinic.id)
                
                return (
                  <tr key={clinic.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FiHome className="text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{clinic.name}</div>
                          <div className="text-xs text-gray-500">Founded {clinic.founded}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <FiMapPin className="text-gray-400" />
                        <div>
                          <div className="text-gray-900">{clinic.city}</div>
                          <div className="text-xs text-gray-500">{clinic.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <FiUsers className="text-gray-400" />
                          <span>{clinic.doctors} doctors</span>
                        </div>
                        <div className="text-xs text-gray-500">{clinic.patients} patients</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => canToggleStatus && handleToggleStatus(clinic.id)}
                        disabled={!canToggleStatus}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          clinic.status === 'Active' 
                            ? 'bg-green-100 text-green-700' + (canToggleStatus ? ' hover:bg-green-200 cursor-pointer' : ' cursor-not-allowed opacity-75')
                            : 'bg-gray-100 text-gray-600' + (canToggleStatus ? ' hover:bg-gray-200 cursor-pointer' : ' cursor-not-allowed opacity-75')
                        }`}
                      >
                        {clinic.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewClinic(clinic.id)}
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
                          onClick={() => canEdit && handleEditClinic(clinic)}
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
                          onClick={() => canDelete && handleDeleteClinic(clinic)}
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
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    <FiHome className="mx-auto text-4xl mb-2" />
                    <div>No clinics found matching your criteria</div>
                    <div className="text-sm">Try adjusting your search或filters</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

      {/* Add/Edit Modal */}
      <Modal 
        show={showAddModal || showEditModal} 
        onClose={() => {
          setShowAddModal(false)
          setShowEditModal(false)
          setSelectedClinic(null)
        }}
        title={selectedClinic ? 'Edit Clinic' : 'Add New Clinic'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter clinic name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.city}
              onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.founded}
              onChange={e => setFormData(prev => ({ ...prev, founded: e.target.value }))}
              placeholder="e.g., 2020"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Departments</label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {departments.map(dept => (
                <label key={dept} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.departments.includes(dept)}
                    onChange={() => handleDepartmentToggle(dept)}
                    className="rounded border-gray-300 text-[#4DB6B0] focus:ring-[#4DB6B0]"
                  />
                  <span className="text-sm text-gray-700">{dept}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowAddModal(false)
                setShowEditModal(false)
                setSelectedClinic(null)
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClinic}
              className="flex items-center gap-2 bg-[#4DB6B0] hover:bg-[#43b0a8] text-white px-4 py-2 rounded-md text-sm"
            >
              <FiSave />
              {selectedClinic ? 'Update' : 'Create'} Clinic
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedClinic(null)
        }}
        title="Delete Clinic"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedClinic?.name}</strong>? 
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedClinic(null)
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Delete Clinic
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminClinics