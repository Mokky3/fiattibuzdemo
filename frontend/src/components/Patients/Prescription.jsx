import React, { useEffect, useState } from 'react';
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

import { patientPrescriptionsAPI } from '../../services/apiService';

const Prescription = () => {
  const [medicineSearch, setMedicineSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);

  const tabs = ['Active', 'Expired', 'All prescriptions'];

  // TODO: Wire pharmacies to API; mock data removed
  const nearbyPharmacies = [];

  const loadList = async () => {
    setLoading(true);
    setError('');
    try {
      const scope = activeTab === 'All prescriptions' ? 'all' : activeTab.toLowerCase();
      const { items } = await patientPrescriptionsAPI.list({ scope, page: 1, size: 50 });
      setList(items);
    } catch (e) {
      // Handle authentication errors and redirect if needed
      if (handlePatientAuthError(e)) {
        return; // Redirected, exit early
      }
      
      setError(e?.message || 'Failed to load prescriptions');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getFilteredPrescriptions = () => list.filter(p => {
    if (activeTab === 'Active') return (p.status || 'active') === 'active';
    if (activeTab === 'Expired') return (p.status || '') !== 'active';
    return true;
  }).filter(p => !medicineSearch || (p.medicineName || '').toLowerCase().includes(medicineSearch.toLowerCase()));

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

  const requestRefill = async (prescriptionId) => {
    try {
      setLoading(true);
      await patientPrescriptionsAPI.requestRefill({ prescriptionId, reason: 'Refill via portal', urgent: false });
      await loadList();
    } catch (e) {
      setError(e?.message || 'Failed to request refill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-6">
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
                {nearbyPharmacies.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No nearby pharmacies found</p>
                  </div>
                )}
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

          {/* Main Content Area - Prescriptions */}
          <div className="flex-1 min-w-0">
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
              {error && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg">{error}</div>
              )}
              {loading && (
                <div className="p-3 text-sm text-gray-600 text-center py-8">Loading prescriptions...</div>
              )}
              {!loading && getFilteredPrescriptions().length === 0 && (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-lg">No prescriptions found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {activeTab === 'Active' ? 'You have no active prescriptions' : 
                     activeTab === 'Expired' ? 'You have no expired prescriptions' : 
                     'You have no prescriptions'}
                  </p>
                </div>
              )}
              {!loading && getFilteredPrescriptions().map((prescription) => (
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
                      <button onClick={() => requestRefill(prescription.id)} className="bg-gray-400 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors font-medium flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm">
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