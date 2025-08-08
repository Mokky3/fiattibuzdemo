import React, { useState } from 'react';
import Navbar from './Navbar';
import {
  MapPin,
  Clock,
  Calendar,
  Pill,
  RefreshCw,
  DollarSign,
  Eye,
  Navigation,
  Search
} from 'lucide-react';

const Prescription = () => {
  const [medicineSearch, setMedicineSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Active');

  const tabs = ['Active', 'Expired', 'All prescriptions'];

  const nearbyPharmacies = [
    {
      id: 1,
      name: 'Pharmacy A',
      address: '123 Tashkent Street, Yunusobod District',
      distance: '0.5 km',
      price: '$12.50',
      rating: 4.8,
      isOpen: true
    },
    {
      id: 2,
      name: 'Pharmacy B', 
      address: '456 Chilonzor Avenue, Chilonzor District',
      distance: '1.2 km',
      price: '$11.80',
      rating: 4.6,
      isOpen: true
    },
    {
      id: 3,
      name: 'Dorixona Medline',
      address: '789 Amir Temur Street, Shaykhontokhur',
      distance: '2.1 km',
      price: '$13.20',
      rating: 4.9,
      isOpen: false
    }
  ];

  const prescriptions = [
    {
      id: 1,
      medicineName: 'Lisinopril',
      knownAs: 'ACE Inhibitor',
      description: 'Take one tablet daily with water, preferably in the morning. Do not skip doses.',
      prescribedDate: '27.06.2025',
      endDate: '27.08.2025',
      prescribedBy: 'Dr. Abdulla Karimov',
      hospital: 'Akfa Medline',
      refillInfo: '4 times/30 tablets',
      remainingRefills: 3,
      totalRefills: 4,
      dosage: '10mg',
      frequency: 'Once daily',
      purpose: 'This medicine was prescribed to lower your blood pressure and protect your heart.',
      status: 'active',
      price: '$15.50'
    },
    {
      id: 2,
      medicineName: 'Metformin',
      knownAs: 'Antidiabetic medication',
      description: 'Take with meals twice daily. Monitor blood sugar levels regularly.',
      prescribedDate: '15.06.2025',
      endDate: '15.09.2025',
      prescribedBy: 'Dr. Mavluda Sharipova',
      hospital: 'Tashkent Medical City',
      refillInfo: '3 times/60 tablets',
      remainingRefills: 2,
      totalRefills: 3,
      dosage: '500mg',
      frequency: 'Twice daily',
      purpose: 'Prescribed to help control blood sugar levels in type 2 diabetes.',
      status: 'active',
      price: '$8.75'
    },
    {
      id: 3,
      medicineName: 'Amoxicillin',
      knownAs: 'Antibiotic',
      description: 'Complete the full course even if you feel better. Take every 8 hours.',
      prescribedDate: '01.05.2025',
      endDate: '15.05.2025',
      prescribedBy: 'Dr. Nodir Azizov',
      hospital: 'International Clinic Tashkent',
      refillInfo: '0 times/21 tablets',
      remainingRefills: 0,
      totalRefills: 0,
      dosage: '500mg',
      frequency: 'Three times daily',
      purpose: 'Antibiotic treatment for bacterial infection.',
      status: 'expired',
      price: '$12.30'
    }
  ];

  const getFilteredPrescriptions = () => {
    if (activeTab === 'Active') {
      return prescriptions.filter(p => p.status === 'active');
    } else if (activeTab === 'Expired') {
      return prescriptions.filter(p => p.status === 'expired');
    }
    return prescriptions;
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'text-green-600' : 'text-red-600';
  };

  const isExpiringSoon = (endDate) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Medicine Search */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-400 mb-3 sm:mb-4">Search for medicine</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH"
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent pl-10 text-sm sm:text-base"
                />
                <Search className="absolute left-3 top-2.5 sm:top-3.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Nearby Pharmacies */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-400 mb-3 sm:mb-4">Nearby pharmacies</h3>
              
              {/* Map Placeholder */}
              <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 sm:p-8 mb-4 sm:mb-6 flex items-center justify-center">
                <div className="text-center">
                  <Navigation className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-blue-600 font-medium text-sm sm:text-base">Interactive Map</p>
                  <p className="text-blue-500 text-xs sm:text-sm">Pharmacies in your area</p>
                </div>
              </div>

              {/* Pharmacy List */}
              <div className="space-y-3 sm:space-y-4">
                {nearbyPharmacies.map((pharmacy) => (
                  <div key={pharmacy.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        <h4 className="font-semibold text-emerald-600 text-sm sm:text-base">{pharmacy.name}</h4>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="truncate">{pharmacy.address}</span>
                        </div>
                        <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 mt-2">
                          <span className="text-xs text-gray-500">{pharmacy.distance}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            pharmacy.isOpen 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {pharmacy.isOpen ? 'Open' : 'Closed'}
                          </span>
                          <span className="text-xs text-yellow-600">★ {pharmacy.rating}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-semibold text-gray-800">PRICE</div>
                        <div className="text-base sm:text-lg font-bold text-emerald-600">{pharmacy.price}</div>
                      </div>
                    </div>
                    <button className="w-full bg-emerald-400 text-white py-2 rounded-lg hover:bg-emerald-500 transition-colors text-xs sm:text-sm font-medium">
                      view
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Prescriptions */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-lg mb-4 sm:mb-6">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium rounded-t-xl transition-colors ${
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

            {/* Prescription Cards */}
            <div className="space-y-4 sm:space-y-6">
              {getFilteredPrescriptions().map((prescription) => (
                <div key={prescription.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-3 sm:mb-4 space-y-3 lg:space-y-0">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800">{prescription.medicineName}</h3>
                      <p className="text-xs sm:text-sm text-emerald-600 font-medium">known as: {prescription.knownAs}</p>
                      {isExpiringSoon(prescription.endDate) && (
                        <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded-lg p-2">
                          <p className="text-yellow-800 text-xs sm:text-sm font-medium">⚠️ Expiring soon! Please refill.</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm sm:text-lg font-bold text-gray-800">PRICE</div>
                      <div className="text-lg sm:text-2xl font-bold text-emerald-600">{prescription.price}</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <p className="text-gray-700 mb-3 text-sm sm:text-base">{prescription.description}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500">Prescribed:</span>
                        <p className="font-semibold">{prescription.prescribedDate}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">End date:</span>
                        <p className="font-semibold">{prescription.endDate}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Dosage:</span>
                        <p className="font-semibold">{prescription.dosage}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Frequency:</span>
                        <p className="font-semibold">{prescription.frequency}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">
                        <span className="font-medium">Prescribed by:</span> {prescription.prescribedBy}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">{prescription.hospital}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">
                        <span className="font-medium">Refill info:</span> {prescription.refillInfo}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-emerald-400 h-2 rounded-full" 
                            style={{ width: `${(prescription.remainingRefills / prescription.totalRefills) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {prescription.remainingRefills}/{prescription.totalRefills} left
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 sm:mb-4">
                    <p className="text-blue-800 text-xs sm:text-sm">{prescription.purpose}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    <button className="bg-emerald-400 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-emerald-500 transition-colors font-medium flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>look up...</span>
                    </button>
                    {prescription.status === 'active' && prescription.remainingRefills > 0 && (
                      <button className="bg-gray-400 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors font-medium flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm">
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>refill</span>
                      </button>
                    )}
                    {prescription.status === 'expired' && (
                      <button className="bg-blue-400 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm">
                        <Pill className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>request new prescription</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prescription;