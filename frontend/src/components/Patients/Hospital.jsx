import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Search, 
  Bell,
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
  Settings,
  CreditCard,
  Link,
  LogOut,
  Info,
  ChevronDown
} from 'lucide-react';

const Hospital = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Hospital info');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('AKFA MEDLINE');

  const tabs = ['Hospital info', 'Departments', 'Doctors'];

  const hospitals = [
    {
      name: 'AKFA MEDLINE',
      address: '78, Amir Temur Avenue, Tashkent, Uzbekistan',
      phone: '+998 71 140 0808',
      rating: 4.8,
      type: 'Multi-specialty Hospital',
      established: '2019',
      beds: '250+',
      departments: 15,
      doctors: 120
    },
    {
      name: 'Tashkent Medical City',
      address: '2A, Farobiy Street, Tashkent, Uzbekistan',
      phone: '+998 71 202 9999',
      rating: 4.6,
      type: 'General Hospital',
      established: '2015',
      beds: '180+',
      departments: 12,
      doctors: 85
    },
    {
      name: 'Seoul National University Hospital',
      address: 'Yunusobod District, Tashkent, Uzbekistan',
      phone: '+998 71 230 7777',
      rating: 4.9,
      type: 'International Hospital',
      established: '2020',
      beds: '300+',
      departments: 18,
      doctors: 150
    },
    {
      name: 'International Clinic Tashkent',
      address: '31, Bunyodkor Avenue, Tashkent, Uzbekistan',
      phone: '+998 71 120 8080',
      rating: 4.7,
      type: 'Private Clinic',
      established: '2018',
      beds: '100+',
      departments: 10,
      doctors: 60
    }
  ];

  const departments = [
    { name: 'Cardiology', icon: Heart, description: 'Comprehensive heart care and cardiovascular treatments', doctors: 8 },
    { name: 'Neurology', icon: Brain, description: 'Advanced brain and nervous system treatments', doctors: 6 },
    { name: 'Ophthalmology', icon: Eye, description: 'Complete eye care and vision correction services', doctors: 4 },
    { name: 'Pediatrics', icon: Baby, description: 'Specialized medical care for children and infants', doctors: 10 },
    { name: 'Surgery', icon: Scissors, description: 'Advanced surgical procedures and operations', doctors: 12 },
    { name: 'Emergency Medicine', icon: Activity, description: '24/7 emergency care and critical treatment', doctors: 15 },
    { name: 'Internal Medicine', icon: Stethoscope, description: 'General adult medical care and treatment', doctors: 8 },
    { name: 'Oncology', icon: Shield, description: 'Cancer treatment and specialized oncology care', doctors: 5 }
  ];

  const doctors = [
    {
      name: 'Dr. Abdulla Karimov',
      specialty: 'Cardiology',
      experience: '15 years',
      education: 'MD, Tashkent Medical Academy',
      languages: ['Uzbek', 'Russian', 'English'],
      rating: 4.9,
      image: '/api/placeholder/100/100'
    },
    {
      name: 'Dr. Gulnoza Rahimova',
      specialty: 'Dermatology',
      experience: '12 years',
      education: 'MD, PhD, Moscow Medical University',
      languages: ['Uzbek', 'Russian'],
      rating: 4.8,
      image: '/api/placeholder/100/100'
    },
    {
      name: 'Dr. Jasur Nabiev',
      specialty: 'Orthopedics',
      experience: '18 years',
      education: 'MD, Seoul National University',
      languages: ['Uzbek', 'Korean', 'English'],
      rating: 4.9,
      image: '/api/placeholder/100/100'
    },
    {
      name: 'Dr. Mavluda Sharipova',
      specialty: 'Endocrinology',
      experience: '10 years',
      education: 'MD, Tashkent Medical Academy',
      languages: ['Uzbek', 'Russian', 'English'],
      rating: 4.7,
      image: '/api/placeholder/100/100'
    }
  ];

  const getCurrentHospital = () => {
    return hospitals.find(h => h.name === selectedHospital) || hospitals[0];
  };

  const userMenuItems = [
    { icon: Settings, label: 'Settings', color: 'text-gray-600' },
    { icon: Info, label: 'My information', color: 'text-gray-600' },
    { icon: CreditCard, label: 'Payments', color: 'text-gray-600' },
    { icon: Link, label: 'Linked accounts', color: 'text-gray-600' },
    { icon: LogOut, label: 'Log out', color: 'text-red-600' }
  ];

  const renderTabContent = () => {
    const hospital = getCurrentHospital();

    switch (activeTab) {
      case 'Hospital info':
        return (
          <div className="space-y-8">
            {/* Hospital Overview */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Hospital Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <Building className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{hospital.beds}</div>
                  <div className="text-sm text-gray-600">Hospital Beds</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{hospital.doctors}+</div>
                  <div className="text-sm text-gray-600">Medical Staff</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Stethoscope className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{hospital.departments}</div>
                  <div className="text-sm text-gray-600">Departments</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{hospital.rating}</div>
                  <div className="text-sm text-gray-600">Patient Rating</div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h4 className="text-xl font-semibold text-gray-800 mb-4">About {hospital.name}</h4>
                <p className="text-gray-600 mb-4">
                  {hospital.name} is a leading healthcare institution in Uzbekistan, established in {hospital.established}. 
                  We provide comprehensive medical services with state-of-the-art technology and highly qualified medical professionals.
                </p>
                <p className="text-gray-600 mb-6">
                  Our hospital is committed to delivering exceptional patient care through innovative treatments, 
                  advanced medical equipment, and a patient-centered approach. We strive to be the premier healthcare 
                  destination in Central Asia, offering world-class medical services to our community.
                </p>

                <h4 className="text-xl font-semibold text-gray-800 mb-4">Services & Facilities</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center"><Shield className="h-4 w-4 text-emerald-600 mr-2" /> 24/7 Emergency Services</li>
                    <li className="flex items-center"><Activity className="h-4 w-4 text-emerald-600 mr-2" /> Advanced ICU & CCU</li>
                    <li className="flex items-center"><Eye className="h-4 w-4 text-emerald-600 mr-2" /> Modern Diagnostic Center</li>
                    <li className="flex items-center"><Scissors className="h-4 w-4 text-emerald-600 mr-2" /> Advanced Surgical Suites</li>
                  </ul>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center"><Heart className="h-4 w-4 text-emerald-600 mr-2" /> Cardiac Catheterization Lab</li>
                    <li className="flex items-center"><Brain className="h-4 w-4 text-emerald-600 mr-2" /> Neurosurgery Unit</li>
                    <li className="flex items-center"><Baby className="h-4 w-4 text-emerald-600 mr-2" /> Maternity & NICU</li>
                    <li className="flex items-center"><Calendar className="h-4 w-4 text-emerald-600 mr-2" /> Outpatient Clinics</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Departments':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-emerald-100 rounded-lg mr-4">
                    <dept.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{dept.name}</h3>
                    <p className="text-sm text-gray-500">{dept.doctors} doctors available</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{dept.description}</p>
                <button className="w-full bg-emerald-400 text-white py-2 rounded-lg hover:bg-emerald-500 transition-colors font-medium">
                  View Department
                </button>
              </div>
            ))}
          </div>
        );

      case 'Doctors':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{doctor.name}</h3>
                  <p className="text-emerald-600 font-medium">{doctor.specialty}</p>
                  <div className="flex items-center justify-center mt-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">{doctor.rating}</span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div><span className="font-medium">Experience:</span> {doctor.experience}</div>
                  <div><span className="font-medium">Education:</span> {doctor.education}</div>
                  <div><span className="font-medium">Languages:</span> {doctor.languages.join(', ')}</div>
                </div>
                
                <button className="w-full mt-4 bg-emerald-400 text-white py-2 rounded-lg hover:bg-emerald-500 transition-colors font-medium">
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
      <nav className="bg-emerald-400 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="text-white text-xl font-bold">FIATTIR</div>
              <div className="hidden md:flex items-center space-x-6">
                <RouterLink to="/patient/appointment" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  APPOINTMENT
                </RouterLink>
                <RouterLink to="/patient/records" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  RECORDS
                </RouterLink>
                <RouterLink to="/patient/prescription" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  PRESCRIPTION
                </RouterLink>
                <RouterLink to="/patient/insurance" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  INSURANCE
                </RouterLink>
                <RouterLink to="/patient/hospital" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                  HOSPITAL
                </RouterLink>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/20 text-white placeholder-white/70 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              </div>
              <button className="text-white hover:text-emerald-100">
                <Bell className="h-5 w-5" />
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="bg-emerald-600 rounded-full p-2 flex items-center space-x-2 hover:bg-emerald-700 transition-colors"
                >
                  <User className="h-5 w-5 text-white" />
                  <span className="text-white text-sm hidden md:block">Kubaymurodov Diyor...</span>
                  <ChevronDown className="h-4 w-4 text-white" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">Kubaymurodov Diyor...</p>
                      <p className="text-xs text-gray-500">14.09.2024</p>
                    </div>
                    {userMenuItems.map((item, index) => (
                      <button
                        key={index}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center space-x-2 ${item.color}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hospital Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-red-500 mb-2">{getCurrentHospital().name}</h1>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{getCurrentHospital().address}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  <span>{getCurrentHospital().phone}</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-yellow-500" />
                  <span>{getCurrentHospital().rating} Rating</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
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
                className="w-full lg:w-80 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent pl-10"
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 px-6 text-sm font-medium rounded-t-xl transition-colors ${
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
    </div>
  );
};

export default Hospital;