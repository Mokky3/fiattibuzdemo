import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NurseHeader from './header';
import { getPatients } from '../../services/nurseService';

const NursePatients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await getPatients({ search })
        if (active) {
          // Handle both array response and object with items
          if (Array.isArray(response)) {
            setPatients(response)
            setTotal(response.length)
          } else if (response && response.items) {
            setPatients(response.items)
            setTotal(response.total || response.items.length)
          } else {
            setPatients([])
            setTotal(0)
          }
        }
      } catch (e) {
        console.error('Error loading patients:', e)
        if (active) {
          setPatients([])
          setTotal(0)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [search])

  return (
    <div className="min-h-screen bg-gray-50">
      <NurseHeader />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Patient List</h1>
          <div className="text-sm text-gray-600">
            {loading ? 'Loading...' : `${total} patients found`}
          </div>
        </div>
        
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or patient ID..."
            className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading patients...</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {p.firstName?.[0]}{p.lastName?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {p.firstName} {p.lastName}
                          </div>
                          {p.address && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {p.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{p.patientId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{p.age} years</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        p.gender?.toLowerCase() === 'male' 
                          ? 'bg-blue-100 text-blue-800' 
                          : p.gender?.toLowerCase() === 'female'
                          ? 'bg-pink-100 text-pink-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {p.gender || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{p.phone || 'N/A'}</div>
                      {p.email && (
                        <div className="text-sm text-gray-500">{p.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/nurse/patients/${p.id}/profile`)}
                        className="text-teal-600 hover:text-teal-900 mr-3"
                      >
                        View
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && !loading && (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500" colSpan={6}>
                      {search ? 'No patients found matching your search' : 'No patients found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default NursePatients;