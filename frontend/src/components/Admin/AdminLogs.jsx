import React, { useState, useEffect } from 'react'
import {
  FiClock, FiSearch, FiAlertCircle, FiLogIn, FiActivity, FiUsers, FiShield, FiAlertTriangle
} from 'react-icons/fi'
import AdminHeader from './AdminHeader'
import { adminAPI } from '../../services/apiService'

const logTypes = ['All', 'Activities', 'System', 'Errors', 'Warnings']
const logLevels = ['All', 'INFO', 'WARN', 'ERROR', 'DEBUG']

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [filterType, setFilterType] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedClinic, setSelectedClinic] = useState('global')
  const [clinics, setClinics] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Fetch clinics for filtering
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        console.log('Fetching clinics...')
        const clinicsData = await adminAPI.getClinics()
        console.log('Clinics data received:', clinicsData)
        
        // Handle different response structures
        let clinicsList = []
        if (clinicsData && Array.isArray(clinicsData)) {
          // Direct array response
          clinicsList = clinicsData
          console.log('Using direct array response')
        } else if (clinicsData && clinicsData.data && Array.isArray(clinicsData.data)) {
          // Paginated response with data array
          clinicsList = clinicsData.data
          console.log('Using data array from paginated response')
        } else if (clinicsData && clinicsData.items && Array.isArray(clinicsData.items)) {
          // Direct paginated response
          clinicsList = clinicsData.items
          console.log('Using items from paginated response')
        } else {
          console.log('No valid clinics data found, structure:', Object.keys(clinicsData || {}))
          console.log('Full response:', clinicsData)
        }
        
        console.log('Processed clinics list:', clinicsList)
        console.log('Number of clinics:', clinicsList.length)
        setClinics(clinicsList)
      } catch (err) {
        console.error('Failed to fetch clinics:', err)
        console.error('Error details:', err.message)
        setClinics([])
      }
    }
    fetchClinics()
  }, [])

  // Fetch logs based on selected clinic and filters
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        let logsData
        const params = {
          page: 1,
          size: 100,
          log_type: filterType === 'All' ? 'all' : filterType.toLowerCase()
        }
        
        // Only add date filters if they have values
        if (dateFrom) {
          params.date_from = dateFrom
        }
        if (dateTo) {
          params.date_to = dateTo
        }

        if (selectedClinic === 'global') {
          // Get global audit trail
          logsData = await adminAPI.getAuditTrail(params)
        } else {
          // Get clinic-specific logs
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const API_VERSION = '/api/v1'
          const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
          
          const queryParams = new URLSearchParams(params).toString()
          const response = await fetch(`${API_BASE}/admin/clinic/${selectedClinic}?${queryParams}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            logsData = await response.json()
          } else {
            throw new Error(`Failed to fetch clinic logs: ${response.status}`)
          }
        }
        
        const list = logsData?.data?.items || logsData?.data || logsData || []
        
        // Normalize to UI shape: {id, time, user, action, status, type, level}
        const normalized = (Array.isArray(list) ? list : []).map(item => {
          const timestamp = item.timestamp || item.created_at || ''
          const user = item.user_name || item.admin_name || item.user_id || 'System'
          const action = item.action || item.description || item.message || ''
          
          // Determine log type and level
          let type = 'Action'
          let level = 'INFO'
          
          if (item.new_values?.level) {
            level = item.new_values.level
            if (level === 'ERROR' || level === 'CRITICAL') {
              type = 'Error'
            } else if (level === 'WARN' || level === 'WARNING') {
              type = 'Warning'
            } else if (level === 'INFO' || level === 'DEBUG') {
              type = 'System'
            }
          } else if (item.resource_type) {
            if (item.resource_type.includes('error') || item.resource_type.includes('Error')) {
              type = 'Error'
            } else if (item.resource_type.includes('system') || item.resource_type.includes('System')) {
              type = 'System'
            } else {
              type = 'Activities'
            }
          }
          
          return {
            id: item.id,
            time: timestamp,
            user: user,
            action: action,
            status: 'Success',
            type: type,
            level: level,
            resource_type: item.resource_type || 'unknown',
            ip_address: item.ip_address,
            user_agent: item.user_agent
          }
        })
        
        setLogs(normalized)
      } catch (err) {
        console.error('Failed to fetch logs:', err)
        setLogs([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [selectedClinic, filterType, dateFrom, dateTo])

  const filteredLogs = logs.filter(log =>
    (filterType === 'All' || log.type === filterType) &&
    (log.user.toLowerCase().includes(search.toLowerCase()) ||
     log.action.toLowerCase().includes(search.toLowerCase()))
  )

  const getIcon = (type) => {
    switch (type) {
      case 'Activities': return <FiActivity className="text-green-500" />
      case 'System': return <FiShield className="text-blue-500" />
      case 'Error': return <FiAlertCircle className="text-red-500" />
      case 'Warning': return <FiAlertTriangle className="text-yellow-500" />
      default: return <FiClock className="text-gray-400" />
    }
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-100'
      case 'WARN': return 'text-yellow-600 bg-yellow-100'
      case 'INFO': return 'text-blue-600 bg-blue-100'
      case 'DEBUG': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#4DB6B0]">System Logs</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Clinic:</span>
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
            >
              <option value="global">All Clinics</option>
              {clinics.length > 0 ? (
                clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))
              ) : (
                <option disabled>No clinics available</option>
              )}
            </select>
            {/* Debug info */}
            <div className="text-xs text-gray-500 ml-2">
              ({clinics.length} clinics loaded)
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Log Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Log Type</label>
              <div className="flex gap-2 flex-wrap">
                {logTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all 
                      ${filterType === type
                        ? 'bg-[#5ACCC3] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="flex items-center border border-gray-300 rounded-md px-3 py-2">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search user or action..."
                  className="text-sm w-full outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4DB6B0]"></div>
              <span className="ml-2 text-gray-600">Loading logs...</span>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Level</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(log.time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-[#4DB6B0] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {log.user.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{log.user}</div>
                          {log.ip_address && (
                            <div className="text-xs text-gray-500">{log.ip_address}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate" title={log.action}>
                        {log.action}
                      </div>
                      {log.resource_type && (
                        <div className="text-xs text-gray-500 mt-1">
                          {log.resource_type}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getIcon(log.type)}
                        <span className="text-gray-700">{log.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'Success' ? 'bg-green-100 text-green-700' :
                        log.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-[#4DB6B0] hover:text-[#43b0a8] text-xs">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-gray-400">
                      {isLoading ? 'Loading logs...' : 'No logs found for the selected criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminLogs
