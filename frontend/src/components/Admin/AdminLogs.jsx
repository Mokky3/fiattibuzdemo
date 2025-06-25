import React, { useState } from 'react'
import { FiClock, FiSearch, FiAlertCircle, FiLogIn, FiActivity } from 'react-icons/fi'
import AdminHeader from './AdminHeader'

const dummyLogs = [
  { id: 1, type: 'Login', user: 'Dr. A. Aliyev', action: 'Login Success', status: 'Success', time: '2025-06-23 09:22' },
  { id: 2, type: 'Action', user: 'Admin A. Johnson', action: 'Updated clinic settings', status: 'Success', time: '2025-06-23 09:10' },
  { id: 3, type: 'Error', user: 'System', action: 'Failed backup at 03:00', status: 'Error', time: '2025-06-23 03:00' },
  { id: 4, type: 'Login', user: 'Nurse T. Kim', action: 'Login Failed', status: 'Failed', time: '2025-06-22 19:41' }
]

const logTypes = ['All', 'Login', 'Action', 'Error', 'System']

const AdminLogs = () => {
  const [logs] = useState(dummyLogs)
  const [filterType, setFilterType] = useState('All')
  const [search, setSearch] = useState('')

  const filteredLogs = logs.filter(log =>
    (filterType === 'All' || log.type === filterType) &&
    (log.user.toLowerCase().includes(search.toLowerCase()) || log.action.toLowerCase().includes(search.toLowerCase()))
  )

  const getIcon = (type) => {
    switch (type) {
      case 'Login': return <FiLogIn className="text-blue-500" />
      case 'Action': return <FiActivity className="text-green-500" />
      case 'Error': return <FiAlertCircle className="text-red-500" />
      default: return <FiClock className="text-gray-400" />
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#4DB6B0]">System Logs</h2>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
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
          <div className="flex items-center border border-gray-300 rounded-md px-3 py-1">
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

        {/* Logs Table */}
        <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-3 text-gray-500">{log.time}</td>
                  <td className="px-4 py-3">{log.user}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'Success' ? 'bg-green-100 text-green-700' :
                      log.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{getIcon(log.type)}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-gray-400">
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminLogs
