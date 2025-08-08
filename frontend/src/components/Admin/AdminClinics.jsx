import React, { useState, useEffect } from 'react'
import { FiMapPin, FiEdit2, FiTrash2, FiPlus, FiHome, FiSearch, FiFilter, FiChevronDown, FiX, FiSave, FiUsers, FiActivity, FiEye, FiChevronUp, FiShield, FiLock, FiArrowLeft } from 'react-icons/fi'
import AdminHeader from './AdminHeader'
import { adminAPI } from '../../services/apiService'

const departments = ['Cardiology', 'Pediatrics', 'Emergency', 'Radiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Physical Therapy', 'General Medicine', 'Surgery', 'ICU']

const AdminClinics = () => {
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

  // Fetch current user and clinics on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch clinics using admin API
        const clinicsData = await adminAPI.getClinics()
        setClinics(clinicsData)

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
        city: '',
        departments: [],
        status: 'Active',
        address: '',
        founded: ''
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

  // Modal component
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
        {/* DEV ONLY: Role Switcher */}
        {process.env.NODE_ENV !== 'production' && currentUser && (
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
                    currentUser?.role === 'superadmin'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-white text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  Super Admin
                </button>
                <button
                  onClick={() => handleRoleSwitch('clinicadmin')}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    currentUser?.role === 'clinic_admin'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-white text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  Clinic Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
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
                : `Managing ${accessibleClinics[0]?.name || 'your clinic'}`}
            </p>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => {
                setSelectedClinic(null)
                setFormData({
                  name: '',
                  city: '',
                  departments: [],
                  status: 'Active',
                  address: '',
                  founded: ''
                })
                setShowAddModal(true)
              }}
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
                  {accessibleClinics.reduce((sum, c) => sum + (c.doctors || 0), 0)}
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
                <strong>Clinic Admin Access:</strong> You can only view and manage your assigned clinic: <strong>{accessibleClinics[0]?.name || 'N/A'}</strong>
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
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => {}}>
                    <div className="flex items-center gap-1">
                      Clinic Name
                      {/* {sortBy === 'name' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)} */}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => {}}>
                    <div className="flex items-center gap-1">
                      City
                      {/* {sortBy === 'city' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)} */}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">Departments</th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => {}}>
                    <div className="flex items-center gap-1">
                      Staff
                      {/* {sortBy === 'doctors' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)} */}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => {}}>
                    <div className="flex items-center gap-1">
                      Status
                      {/* {sortBy === 'status' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)} */}
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
                            onClick={() => {}} // handleViewClinic(clinic.id)}
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
          setFormData({
            name: '',
            city: '',
            departments: [],
            status: 'Active',
            address: '',
            founded: ''
          })
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
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      departments: prev.departments.includes(dept)
                        ? prev.departments.filter(d => d !== dept)
                        : [...prev.departments, dept]
                    }))}
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
                setFormData({
                  name: '',
                  city: '',
                  departments: [],
                  status: 'Active',
                  address: '',
                  founded: ''
                })
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