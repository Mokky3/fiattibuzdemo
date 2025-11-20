import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const Hospital = () => {
  const navigate = useNavigate();
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Hospital info');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tabs = ['Hospital info', 'Departments', 'Doctors'];

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
        setError(e?.message || 'Failed to load hospitals');
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      case 'Hospital info':
        return (
          <div className="space-y-4 sm:space-y-8">
            {/* Hospital Overview */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Hospital Overview</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="text-center p-3 sm:p-4 bg-emerald-50 rounded-lg">
                  <Building className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-gray-800">{hospital.beds}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Hospital Beds</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-gray-800">{hospital.doctors}+</div>
                  <div className="text-xs sm:text-sm text-gray-600">Medical Staff</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <Stethoscope className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-gray-800">{hospital.departments}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Departments</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                  <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-gray-800">{hospital.rating}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Patient Rating</div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">About {hospital.name}</h4>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                  {hospital.name} is a leading healthcare institution in Uzbekistan, established in {hospital.established}. 
                  We provide comprehensive medical services with state-of-the-art technology and highly qualified medical professionals.
                </p>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  Our hospital is committed to delivering exceptional patient care through innovative treatments, 
                  advanced medical equipment, and a patient-centered approach. We strive to be the premier healthcare 
                  destination in Central Asia, offering world-class medical services to our community.
                </p>

                <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Services & Facilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <ul className="space-y-2 text-gray-600 text-sm sm:text-base">
                    <li className="flex items-center"><Shield className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> 24/7 Emergency Services</li>
                    <li className="flex items-center"><Activity className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> Advanced ICU & CCU</li>
                    <li className="flex items-center"><Eye className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> Modern Diagnostic Center</li>
                    <li className="flex items-center"><Scissors className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> Advanced Surgical Suites</li>
                  </ul>
                  <ul className="space-y-2 text-gray-600 text-sm sm:text-base">
                    <li className="flex items-center"><Heart className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> Cardiac Catheterization Lab</li>
                    <li className="flex items-center"><Brain className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> Neurosurgery Unit</li>
                    <li className="flex items-center"><Baby className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> Maternity & NICU</li>
                    <li className="flex items-center"><Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 mr-2" /> Outpatient Clinics</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Departments':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {departments.map((dept, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg mr-3 sm:mr-4">
                    <dept.icon className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">{dept.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">{dept.doctors} doctors available</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">{dept.description}</p>
                <button 
                  onClick={() => handleViewDepartment(dept)}
                  className="w-full bg-emerald-400 text-white py-2 rounded-lg hover:bg-emerald-500 transition-colors font-medium text-xs sm:text-sm"
                >
                  View Department
                </button>
              </div>
            ))}
          </div>
        );

      case 'Doctors':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {doctors.map((doctor, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow">
                <div className="text-center mb-3 sm:mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">{doctor.name}</h3>
                  <p className="text-emerald-600 font-medium text-sm sm:text-base">{doctor.specialty}</p>
                  <div className="flex items-center justify-center mt-2">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                    <span className="text-xs sm:text-sm text-gray-600 ml-1">{doctor.rating}</span>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <div><span className="font-medium">Experience:</span> {doctor.experience}</div>
                  <div><span className="font-medium">Education:</span> {doctor.education}</div>
                  <div><span className="font-medium">Languages:</span> {doctor.languages.join(', ')}</div>
                </div>
                
                <button 
                  onClick={() => handleBookAppointment(doctor, getCurrentHospital())}
                  className="w-full mt-3 sm:mt-4 bg-emerald-400 text-white py-2 rounded-lg hover:bg-emerald-500 transition-colors font-medium text-xs sm:text-sm"
                >
                  Book Appointment
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Hospital Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-red-500 mb-2">{getCurrentHospital().name}</h1>
              <div className="flex items-center text-gray-600 mb-2 text-sm sm:text-base">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="truncate">{getCurrentHospital().address}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>{getCurrentHospital().phone}</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-yellow-500" />
                  <span>{getCurrentHospital().rating} Rating</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>24/7 Emergency</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search for hospital"
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                className="w-full lg:w-80 px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent pl-10 text-sm sm:text-base"
              />
              <Search className="absolute left-3 top-2.5 sm:top-3.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 text-red-700 rounded">{error}</div>
          )}
        </div>

        {/* Hospital selector list */}
        {hospitals.length > 0 && (
          <div className="bg-white rounded-xl shadow p-3 sm:p-4 mb-6 overflow-x-auto">
            <div className="flex gap-2">
              {hospitals
                .filter(h => !hospitalSearch || h.name.toLowerCase().includes(hospitalSearch.toLowerCase()))
                .map(h => (
                  <button
                    key={h.name}
                    onClick={() => setSelectedHospital(h.name)}
                    className={`px-3 py-2 rounded-lg text-sm border ${selectedHospital === h.name ? 'bg-emerald-400 text-white border-emerald-400' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                  >
                    {h.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6 sm:mb-8">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium rounded-t-xl transition-colors ${
                  activeTab === tab
                    ? 'bg-emerald-400 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
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
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white rounded-t-xl flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedDepartment.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedDepartment.description}</p>
              </div>
              <button
                onClick={handleCloseDepartmentModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
              {loadingDepartmentDoctors ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <p className="mt-4 text-gray-600">Loading doctors...</p>
                </div>
              ) : departmentDoctors.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No doctors available in this department</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {departmentDoctors.map((doctor, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow border border-gray-100">
                      <div className="text-center mb-3 sm:mb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <User className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800">{doctor.name}</h3>
                        <p className="text-emerald-600 font-medium text-sm sm:text-base">{doctor.specialty}</p>
                        <div className="flex items-center justify-center mt-2">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                          <span className="text-xs sm:text-sm text-gray-600 ml-1">{doctor.rating}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                        {doctor.experience && (
                          <div><span className="font-medium">Experience:</span> {doctor.experience}</div>
                        )}
                        {doctor.education && (
                          <div><span className="font-medium">Education:</span> {doctor.education}</div>
                        )}
                        {doctor.languages && doctor.languages.length > 0 && (
                          <div><span className="font-medium">Languages:</span> {doctor.languages.join(', ')}</div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleBookAppointment(doctor, getCurrentHospital())}
                        className="w-full mt-3 sm:mt-4 bg-emerald-400 text-white py-2 rounded-lg hover:bg-emerald-500 transition-colors font-medium text-xs sm:text-sm"
                      >
                        Book Appointment
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