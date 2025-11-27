import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NurseHeader from './header';
import { getPatients } from '../../services/nurseService';

const NursePatients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

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
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <NurseHeader />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-semibold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('patientList')}</h1>
          <div className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
          }`}>
            {loading ? t('loading') : t('patientsFound', { count: total })}
          </div>
        </div>
        
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchByNameOrPatientId')}
            className={`border rounded-lg px-4 py-2 w-full max-w-md focus:ring-2 focus:outline-none transition-colors ${
              darkMode
                ? 'border-[#133037] bg-[#0D2026] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500'
            }`}
          />
        </div>
        
        <div className={`rounded-lg shadow overflow-hidden transition-colors ${
          darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
        }`}>
          {loading ? (
            <div className="p-8 text-center">
              <div className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                {t('loadingPatients')}
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className={`border-b transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037]'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-medium uppercase tracking-wider ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('patient')}</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium uppercase tracking-wider ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('id')}</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium uppercase tracking-wider ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('age')}</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium uppercase tracking-wider ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('gender')}</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium uppercase tracking-wider ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('contact')}</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium uppercase tracking-wider ${
                    darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                  }`}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors ${
                darkMode
                  ? 'bg-[#0D2026] divide-[#133037]'
                  : 'bg-white divide-gray-200'
              }`}>
                {patients.map((p) => (
                  <tr 
                    key={p.id} 
                    className={`transition-colors ${
                      darkMode
                        ? 'hover:bg-[#133037]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            darkMode
                              ? 'bg-gradient-to-br from-[#79CAC2] to-[#58B4AA]'
                              : 'bg-teal-500'
                          }`}>
                            <span className="text-white text-sm font-medium">
                              {p.firstName?.[0]}{p.lastName?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${
                            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                          }`}>
                            {p.firstName} {p.lastName}
                          </div>
                          {p.address && (
                            <div className={`text-sm truncate max-w-xs ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                            }`}>
                              {p.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-mono ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{p.patientId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{p.age} {t('years')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        p.gender?.toLowerCase() === 'male' 
                          ? darkMode
                            ? 'bg-blue-900 bg-opacity-30 text-blue-300'
                            : 'bg-blue-100 text-blue-800'
                          : p.gender?.toLowerCase() === 'female'
                          ? darkMode
                            ? 'bg-pink-900 bg-opacity-30 text-pink-300'
                            : 'bg-pink-100 text-pink-800'
                          : darkMode
                          ? 'bg-[#133037] text-[#8AA2A7]'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {p.gender || t('unknown')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{p.phone || t('notAvailable')}</div>
                      {p.email && (
                        <div className={`text-sm ${
                          darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                        }`}>{p.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/nurse/patients/${p.id}/profile`)}
                        className={`transition-colors ${
                          darkMode
                            ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                            : 'text-teal-600 hover:text-teal-900'
                        }`}
                      >
                        {t('view')}
                      </button>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && !loading && (
                  <tr>
                    <td className={`px-6 py-8 text-center ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`} colSpan={6}>
                      {search ? t('noPatientsFoundMatchingSearch') : t('noPatientsFound')}
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