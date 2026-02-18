import React, { useEffect, useState } from 'react'
import { Header } from './Header'
import { useTranslation } from 'react-i18next'
import { FiUsers, FiCalendar, FiFileText, FiCheckCircle } from 'react-icons/fi'
import { apiRequest, checkBackendHealth, isAuthenticated, getCurrentUser } from '../../services/apiService'

const DoctorStats = () => {
  const { t } = useTranslation()
  const [isLoaded, setIsLoaded] = useState(false)
  const [stats, setStats] = useState([])
  const [error, setError] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  
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
    const fetchStats = async () => {
      try {
        // Check authentication first
        const isAuth = isAuthenticated()
        setAuthenticated(isAuth)

        if (!isAuth) {
          setError(t('pleaseLogInToViewStatistics'))
          setIsLoaded(true)
          return
        }

        // Check backend health
        const isHealthy = await checkBackendHealth()
        setBackendConnected(isHealthy)
        
        if (isHealthy) {
          try {
            // Use dedicated stats endpoint
            const statsData = await apiRequest('/doctor/stats')
            const data = statsData?.data || statsData || {}

            setStats([
              {
                id: 1,
                title: t('patientsSeen'),
                value: data.patients_seen ?? 0,
                iconType: 'users',
                bgLight: 'from-green-50 to-white',
                bgDark: 'from-[#062412] to-[#0D2026]'
              },
              {
                id: 2,
                title: t('appointmentsToday'),
                value: data.appointments_today ?? 0,
                iconType: 'calendar',
                bgLight: 'from-blue-50 to-white',
                bgDark: 'from-[#0D1B2A] to-[#0D2026]'
              },
              {
                id: 3,
                title: t('prescriptionsWritten'),
                value: data.prescriptions_written ?? 0,
                iconType: 'fileText',
                bgLight: 'from-purple-50 to-white',
                bgDark: 'from-[#1A0D2E] to-[#0D2026]'
              },
              {
                id: 4,
                title: t('tasksPending'),
                value: data.tasks_pending ?? 0,
                iconType: 'checkCircle',
                bgLight: 'from-yellow-50 to-white',
                bgDark: 'from-[#251F07] to-[#0D2026]'
              },
              {
                id: 5,
                title: t('reportsSubmitted'),
                value: data.reports_submitted ?? 0,
                iconType: 'fileText',
                bgLight: 'from-indigo-50 to-white',
                bgDark: 'from-[#1A1B3A] to-[#0D2026]'
              }
            ])
          } catch (apiError) {
            console.error('Failed to load stats from backend:', apiError)
            if (apiError.message.includes('Authentication required')) {
              setAuthenticated(false)
              setError(t('pleaseLogInToViewStatistics'))
            } else {
              setError(t('failedToLoadStatisticsFromServer'))
            }
          }
        } else {
          console.log('Backend not available')
          setError(t('backendNotConnected'))
        }
      } catch (err) {
        if (err.message.includes('Authentication required')) {
          setAuthenticated(false)
          setError(t('pleaseLogInToViewStatistics'))
        } else {
          setError(t('failedToLoadStatisticsPleaseTryAgain'))
        }
        console.error(err)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchStats()
  }, [])

  // Show login prompt if not authenticated
  if (!authenticated) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode
          ? 'bg-[#050C0F]'
          : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
      }`}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className={`rounded-xl shadow-lg border p-8 max-w-md w-full text-center transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border-[#133037]'
              : 'bg-white border-gray-100'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
              darkMode
                ? 'bg-gradient-to-br from-[#79CAC2] to-[#58B4AA]'
                : 'bg-gradient-to-br from-[#5ACCC3] to-[#4DB6B0]'
            }`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-4 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
            }`}>{t('authenticationRequired')}</h2>
            <p className={`mb-6 ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('pleaseLogInToViewYourStatistics')}</p>
            <button 
              onClick={() => window.location.href = '/signin'}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                darkMode
                  ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] text-[#050C0F] hover:from-[#58B4AA] hover:to-[#79CAC2] focus:ring-[#79CAC2]/50 focus:ring-offset-[#050C0F]'
                  : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white hover:from-[#4DB6B0] hover:to-[#5ACCC3] focus:ring-[#5ACCC3]/50 focus:ring-offset-gray-50'
              }`}
            >
              {t('goToLogin')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode
        ? 'bg-[#050C0F]'
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <Header />
      
      {/* Backend status and error indicators */}
      {!backendConnected && (
        <div className={`border px-4 py-3 mx-2 sm:mx-4 mt-4 rounded transition-colors ${
          darkMode
            ? 'bg-[#251F07] border-[#FACC15] text-[#FACC15]'
            : 'bg-yellow-100 border-yellow-400 text-yellow-700'
        }`}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('backendNotConnected')}
          </div>
        </div>
      )}

      <div
        className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-700 transform ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className={`text-3xl font-bold bg-clip-text text-transparent ${
            darkMode
              ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA]'
              : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0]'
          }`}>
            {t('myStatsOverview')}
          </h2>
          {backendConnected && (
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full animate-pulse mr-2 ${
                darkMode ? 'bg-[#4ADE80]' : 'bg-green-500'
              }`}></div>
              <span className={`text-sm ${
                darkMode ? 'text-[#4ADE80]' : 'text-green-600'
              }`}>{t('connected')}</span>
            </div>
          )}
        </div>

        {error && (
          <div className={`border px-4 py-3 mb-6 rounded transition-colors ${
            darkMode
              ? 'bg-[#2A0E15] border-[#FB7185] text-[#FB7185]'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {error}
            <button 
              onClick={() => setError(null)}
              className={`float-right transition-colors ${
                darkMode ? 'text-[#FB7185] hover:text-[#FB7185]' : 'text-red-700 hover:text-red-900'
              }`}
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {stats.length > 0 ? (
            stats.map((stat) => {
              const getIcon = () => {
                const iconClass = `text-3xl ${darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'}`
                switch (stat.iconType) {
                  case 'users':
                    return <FiUsers className={iconClass} />
                  case 'calendar':
                    return <FiCalendar className={iconClass} />
                  case 'fileText':
                    return <FiFileText className={iconClass} />
                  case 'checkCircle':
                    return <FiCheckCircle className={iconClass} />
                  default:
                    return <FiFileText className={iconClass} />
                }
              }
              
              return (
                <div
                  key={stat.id}
                  className={`rounded-xl p-6 shadow-md border hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                    darkMode
                      ? `bg-gradient-to-br ${stat.bgDark} border-[#133037]`
                      : `bg-gradient-to-br ${stat.bgLight} border-gray-100`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`font-semibold text-lg ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
                    }`}>{stat.title}</div>
                    {getIcon()}
                  </div>
                  <div className={`mt-4 text-4xl font-bold ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                  }`}>{stat.value}</div>
                </div>
              )
            })
          ) : (
            <div className={`col-span-full text-center ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{t('loadingStatistics')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorStats
