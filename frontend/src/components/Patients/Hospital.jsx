import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import { 
  Search,
  User,
  MapPin,
  Phone,
  Clock,
  Star,
  Calendar,
  Users,
  Building,
  Stethoscope,
  Heart,
  Brain,
  Eye,
  Baby,
  Scissors,
  Activity,
  Shield,
  X
} from 'lucide-react';

import { patientHospitalsAPI } from '../../services/apiService';
import { handlePatientAuthError } from '../../utils/patientAuth';

const Hospital = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const tabs = [
    { key: 'info', label: t('hospital.hospitalInfo') },
    { key: 'departments', label: t('hospital.departments') },
    { key: 'doctors', label: t('hospital.doctors') }
  ];

  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await patientHospitalsAPI.list();
        setHospitals(list);
        if (list.length && !selectedHospital) setSelectedHospital(list[0].name);
      } catch (e) {
        // Handle authentication errors and redirect if needed
        if (handlePatientAuthError(e)) {
          return; // Redirected, exit early
        }
        setError(e?.message || t('hospital.errorLoadFailed'));
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const [departments, setDepartments] = useState([]);

  const [doctors, setDoctors] = useState([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentDoctors, setDepartmentDoctors] = useState([]);
  const [loadingDepartmentDoctors, setLoadingDepartmentDoctors] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      const current = hospitals.find(h => h.name === selectedHospital);
      if (!current || !current.id) return;
      try {
        const [deptList, doctorList] = await Promise.all([
          patientHospitalsAPI.departments(current.id),
          patientHospitalsAPI.doctors(current.id),
        ]);
        setDepartments(deptList.map(d => ({ id: d.id, name: d.name, icon: Stethoscope, description: d.description || '', doctors: d.doctors || 0 })));
        setDoctors(doctorList.map(doc => ({ id: doc.id, name: doc.full_name, specialty: doc.specialty || 'General', rating: doc.rating || 4.7, experience: '', education: '', languages: [] })));
      } catch (e) {
        // keep silent to avoid breaking UI
        setDepartments([]);
        setDoctors([]);
      }
    };
    if (selectedHospital && hospitals.length) {
      loadDetails();
    }
  }, [selectedHospital, hospitals]);

  const getCurrentHospital = () => {
    return hospitals.find(h => h.name === selectedHospital) || hospitals[0] || {};
  };

  const handleViewDepartment = async (department) => {
    setSelectedDepartment(department);
    setLoadingDepartmentDoctors(true);
    setDepartmentDoctors([]);
    
    try {
      const current = hospitals.find(h => h.name === selectedHospital);
      if (current && current.id && department.id) {
        const doctorsList = await patientHospitalsAPI.departmentDoctors(current.id, department.id);
        setDepartmentDoctors(doctorsList.map(doc => ({ 
          id: doc.id,
          name: doc.full_name, 
          specialty: doc.specialty || 'General', 
          rating: doc.rating || 4.7, 
          experience: '', 
          education: '', 
          languages: [] 
        })));
      }
    } catch (e) {
      console.error('Error loading department doctors:', e);
      setDepartmentDoctors([]);
    } finally {
      setLoadingDepartmentDoctors(false);
    }
  };

  const handleCloseDepartmentModal = () => {
    setSelectedDepartment(null);
    setDepartmentDoctors([]);
  };

  const handleBookAppointment = (doctor, hospital) => {
    // Navigate to appointment page with doctor and hospital pre-filled
    navigate('/patient/appointment', {
      state: {
        doctor: {
          id: doctor.id || doctor.name,
          name: doctor.name,
          specialty: doctor.specialty
        },
        hospital: hospital.name || selectedHospital
      }
    });
  };


  const renderTabContent = () => {
    const hospital = getCurrentHospital();

    switch (activeTab) {
      case 'info':
        return (
          <div className="space-y-4 sm:space-y-8">
            {/* Hospital Overview */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-8`}>
              <h3 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('hospital.hospitalOverview')}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className={`text-center p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                  <Building className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <div className={`text-lg sm:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{hospital.beds}</div>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('hospital.hospitalBeds')}</div>
                </div>
                <div className={`text-center p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <Users className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div className={`text-lg sm:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{hospital.doctors}+</div>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('hospital.medicalStaff')}</div>
                </div>
                <div className={`text-center p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <Stethoscope className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  <div className={`text-lg sm:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{hospital.departments}</div>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('hospital.departments')}</div>
                </div>
                <div className={`text-center p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <Star className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  <div className={`text-lg sm:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{hospital.rating}</div>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('hospital.patientRating')}</div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h4 className={`text-lg sm:text-xl font-semibold mb-3 sm:mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('hospital.about')} {hospital.name}</h4>
                <p className={`mb-3 sm:mb-4 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {hospital.name} {t('hospital.aboutDescription1')} {hospital.established}. {t('hospital.aboutDescription2')}
                </p>
                <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('hospital.aboutDescription3')}
                </p>

                <h4 className={`text-lg sm:text-xl font-semibold mb-3 sm:mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('hospital.servicesFacilities')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <ul className={`space-y-2 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li className="flex items-center"><Shield className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.emergencyServices')}</li>
                    <li className="flex items-center"><Activity className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.icuCcu')}</li>
                    <li className="flex items-center"><Eye className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.diagnosticCenter')}</li>
                    <li className="flex items-center"><Scissors className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.surgicalSuites')}</li>
                  </ul>
                  <ul className={`space-y-2 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li className="flex items-center"><Heart className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.cardiacLab')}</li>
                    <li className="flex items-center"><Brain className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.neurosurgeryUnit')}</li>
                    <li className="flex items-center"><Baby className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.maternityNicu')}</li>
                    <li className="flex items-center"><Calendar className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} /> {t('hospital.outpatientClinics')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'departments':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {departments.map((dept, index) => (
              <div key={index} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6 hover:shadow-xl transition-shadow`}>
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-lg mr-3 sm:mr-4 ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                    <dept.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{dept.name}</h3>
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{dept.doctors} {t('hospital.doctorsAvailable')}</p>
                  </div>
                </div>
                <p className={`mb-3 sm:mb-4 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{dept.description}</p>
                <button 
                  onClick={() => handleViewDepartment(dept)}
                  className={`w-full py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm ${
                    darkMode 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-emerald-400 hover:bg-emerald-500'
                  } text-white`}
                >
                  {t('hospital.viewDepartment')}
                </button>
              </div>
            ))}
          </div>
        );

      case 'doctors':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {doctors.map((doctor, index) => (
              <div key={index} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6 hover:shadow-xl transition-shadow`}>
                <div className="text-center mb-3 sm:mb-4">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-3 flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <User className={`h-8 w-8 sm:h-10 sm:w-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{doctor.name}</h3>
                  <p className={`font-medium text-sm sm:text-base ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{doctor.specialty}</p>
                  <div className="flex items-center justify-center mt-2">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                    <span className={`text-xs sm:text-sm ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{doctor.rating}</span>
                  </div>
                </div>
                
                <div className={`space-y-2 text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div><span className="font-medium">{t('hospital.experience')}:</span> {doctor.experience}</div>
                  <div><span className="font-medium">{t('hospital.education')}:</span> {doctor.education}</div>
                  <div><span className="font-medium">{t('hospital.languages')}:</span> {doctor.languages.join(', ')}</div>
                </div>
                
                <button 
                  onClick={() => handleBookAppointment(doctor, getCurrentHospital())}
                  className={`w-full mt-3 sm:mt-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm ${
                    darkMode 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-emerald-400 hover:bg-emerald-500'
                  } text-white`}
                >
                  {t('hospital.bookAppointment')}
                </button>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-900 to-gray-800' : 'from-emerald-50 to-teal-50'}`}>
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Hospital Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6 mb-6 sm:mb-8`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="mb-4 lg:mb-0">
              <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>{getCurrentHospital().name}</h1>
              <div className={`flex items-center mb-2 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="truncate">{getCurrentHospital().address}</span>
              </div>
              <div className={`flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="flex items-center">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>{getCurrentHospital().phone}</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-yellow-500" />
                  <span>{getCurrentHospital().rating} {t('hospital.rating')}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>{t('hospital.emergency247')}</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder={t('hospital.searchForHospital')}
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                className={`w-full lg:w-80 px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent pl-10 text-sm sm:text-base ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                    : 'border-gray-200'
                }`}
              />
              <Search className={`absolute left-3 top-2.5 sm:top-3.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
          </div>
          {error && (
            <div className={`mt-3 p-3 border rounded ${
              darkMode 
                ? 'bg-red-900/30 border-red-700 text-red-300' 
                : 'bg-red-100 border-red-200 text-red-700'
            }`}>{error}</div>
          )}
        </div>

        {/* Hospital selector list */}
        {hospitals.length > 0 && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow ${darkMode ? 'shadow-gray-900/50' : ''} p-3 sm:p-4 mb-6 overflow-x-auto`}>
            <div className="flex gap-2">
              {hospitals
                .filter(h => !hospitalSearch || h.name.toLowerCase().includes(hospitalSearch.toLowerCase()))
                .map(h => (
                  <button
                    key={h.name}
                    onClick={() => setSelectedHospital(h.name)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      selectedHospital === h.name 
                        ? darkMode
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-emerald-400 text-white border-emerald-400'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {h.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} mb-6 sm:mb-8`}>
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium rounded-t-xl transition-colors ${
                  activeTab === tab.key
                    ? darkMode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-400 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {renderTabContent()}
        </div>
      </div>

      {/* Department Doctors Modal */}
      {selectedDepartment && (
        <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900/70' : 'bg-transparent'} backdrop-blur-md flex items-center justify-center z-50 p-4`}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl ${darkMode ? 'shadow-gray-900/50' : ''} max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-t-xl flex items-center justify-between p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{selectedDepartment.name}</h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedDepartment.description}</p>
              </div>
              <button
                onClick={handleCloseDepartmentModal}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
            </div>

            {/* Modal Content */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {loadingDepartmentDoctors ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('hospital.loadingDoctors')}</p>
                </div>
              ) : departmentDoctors.length === 0 ? (
                <div className="text-center py-8">
                  <User className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{t('hospital.noDoctorsInDepartment')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {departmentDoctors.map((doctor, index) => (
                    <div key={index} className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-xl shadow-lg ${darkMode ? 'shadow-gray-900/50' : ''} p-4 sm:p-6 hover:shadow-xl transition-shadow border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                      <div className="text-center mb-3 sm:mb-4">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-3 flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <User className={`h-8 w-8 sm:h-10 sm:w-10 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                        </div>
                        <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{doctor.name}</h3>
                        <p className={`font-medium text-sm sm:text-base ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{doctor.specialty}</p>
                        <div className="flex items-center justify-center mt-2">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                          <span className={`text-xs sm:text-sm ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{doctor.rating}</span>
                        </div>
                      </div>
                      
                      <div className={`space-y-2 text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {doctor.experience && (
                          <div><span className="font-medium">{t('hospital.experience')}:</span> {doctor.experience}</div>
                        )}
                        {doctor.education && (
                          <div><span className="font-medium">{t('hospital.education')}:</span> {doctor.education}</div>
                        )}
                        {doctor.languages && doctor.languages.length > 0 && (
                          <div><span className="font-medium">{t('hospital.languages')}:</span> {doctor.languages.join(', ')}</div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleBookAppointment(doctor, getCurrentHospital())}
                        className={`w-full mt-3 sm:mt-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm ${
                          darkMode 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'bg-emerald-400 hover:bg-emerald-500'
                        } text-white`}
                      >
                        {t('hospital.bookAppointment')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hospital;