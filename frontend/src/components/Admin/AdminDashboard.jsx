import React, { useEffect, useState } from 'react'
import {
  FiUsers, FiActivity, FiSettings, FiFileText, FiShield,
  FiBarChart2, FiServer, FiBell, FiAlertTriangle, FiMessageCircle
} from 'react-icons/fi'
import AdminHeader from './AdminHeader'

const AdminDashboard = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    { title: 'Total Users', value: 256, icon: <FiUsers className="text-xl text-[#4DB6B0]" /> },
    { title: 'Active Clinics', value: 18, icon: <FiActivity className="text-xl text-[#4DB6B0]" /> },
    { title: 'System Logs', value: 934, icon: <FiServer className="text-xl text-[#4DB6B0]" /> },
    { title: 'Custom Roles', value: 12, icon: <FiShield className="text-xl text-[#4DB6B0]" /> },
    { title: 'Reports Generated', value: 67, icon: <FiBarChart2 className="text-xl text-[#4DB6B0]" /> },
    { title: 'Announcements Sent', value: 5, icon: <FiBell className="text-xl text-[#4DB6B0]" /> },
  ]

  const alerts = [
    { type: 'Error', message: 'Backup failed on Clinic Server 2', icon: <FiAlertTriangle className="text-red-500" /> },
    { type: 'Alert', message: 'High memory usage detected', icon: <FiActivity className="text-yellow-500" /> },
    { type: 'Notification', message: 'System upgrade scheduled for tonight 2AM', icon: <FiBell className="text-blue-500" /> },
    { type: 'Message', message: 'Support replied to your ticket', icon: <FiMessageCircle className="text-green-500" /> }
  ]

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdminHeader />

      <div className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] bg-clip-text text-transparent">Admin Dashboard</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {stats.map((s, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-white border border-gray-100 shadow hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">{s.title}</div>
                    <div className="text-3xl font-bold text-gray-800 mt-2">{s.value}</div>
                  </div>
                  <div>{s.icon}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Quick Admin Actions</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                <li>Manage User Accounts & Bulk Import</li>
                <li>Configure Clinics, Departments & Policies</li>
                <li>Create & Assign Custom Roles</li>
                <li>Audit Logs & Monitor System Activity</li>
                <li>Manage Notifications & Communication Gateway</li>
                <li>Import / Export Clinical Data</li>
                <li>Edit Module Access & Feature Toggles</li>
              </ul>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <h4 className="text-md font-semibold mb-3 text-gray-700">System Alerts & Messages</h4>
              <ul className="space-y-3">
                {alerts.map((alert, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-600">
                    <span className="mr-2">{alert.icon}</span>
                    <span>{alert.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
