// 1. UPDATE YOUR REACT COMPONENT - PatientRegister.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ReceptionistHeader } from './ReceptionHeader';
import { User, Phone, Mail, MapPin, UserPlus, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Configure axios base URL
const API_BASE_URL = 'http://localhost:8000/api/v1';

const PatientRegister = () => {
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    phone_number: '',
    email: '',
    address: '',
    emergency_contact: '',
    pinfl: '',
  });

  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // REAL API CALL - Fetch patients
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/patients`, {
        params: {
          page: 1,
          size: 50,
          search: searchTerm
        }
      });
      
      // Transform backend response to match frontend expectation
      const transformedPatients = response.data.map(patient => ({
        id: patient.id,
        full_name: `${patient.first_name} ${patient.last_name}`.trim(),
        date_of_birth: patient.date_of_birth
      }));
      
      setPatients(transformedPatients);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setPatients([]); // Set empty array on error
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // REAL API CALL - Register patient
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/patients/register`, form);
      
      setSuccess(true);
      showMessage('Patient registered successfully!', 'success');
      
      // Reset form
      setForm({
        full_name: '',
        date_of_birth: '',
        gender: '',
        phone_number: '',
        email: '',
        address: '',
        emergency_contact: '',
        pinfl: '',
      });
      
      // Refresh patient list
      fetchPatients();
      
    } catch (err) {
      console.error('Registration error:', err);
      setSuccess(false);
      
      // Handle different error types
      if (err.response?.status === 409) {
        showMessage(err.response.data.detail || 'Patient already exists', 'error');
      } else if (err.response?.status === 400) {
        showMessage(err.response.data.detail || 'Invalid data provided', 'error');
      } else {
        showMessage('Registration failed. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // REAL API CALL - Find and invite patient
  const handleFindAndInvite = async () => {
    if (!form.full_name && !form.date_of_birth && !form.pinfl) {
      showMessage('Please fill in at least one search field (Name, Date of Birth, or PINFL)', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // First, search for the patient
      const searchResponse = await axios.get(`${API_BASE_URL}/patients/search`, {
        params: {
          full_name: form.full_name,
          date_of_birth: form.date_of_birth,
          pinfl: form.pinfl,
        }
      });
      
      if (searchResponse.data?.id) {
        // Patient found, send invitation
        const inviteResponse = await axios.post(`${API_BASE_URL}/patients/invite`, {
          patient_id: searchResponse.data.id
        });
        
        showMessage('Invitation sent to patient successfully!', 'success');
      }
      
    } catch (err) {
      console.error('Find and invite error:', err);
      
      if (err.response?.status === 404) {
        showMessage('No patient found with the provided information.', 'warning');
      } else {
        showMessage('Failed to send invitation. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getMessageStyles = () => {
    switch (messageType) {
      case 'success': return 'bg-green-50 text-green-700 border-green-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ReceptionistHeader />

      <div className="flex flex-col lg:flex-row max-w-screen-xl mx-auto px-2 sm:px-4 py-6 sm:py-10 gap-4 sm:gap-8">
        {/* Enhanced Sidebar */}
        <div className="lg:w-1/4 bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
          <div className="p-3 sm:p-4 border-b border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-[#4DB6B0] mb-3">Registered Patients</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  fetchPatients(); // Refresh search results
                }}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="p-3 sm:p-4 max-h-96 overflow-y-auto">
            {filteredPatients.length > 0 ? (
              <div className="space-y-3">
                {filteredPatients.map((p) => (
                  <div key={p.id} className="border border-gray-100 rounded-lg p-3 text-sm hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="font-medium text-gray-800 text-sm">{p.full_name}</div>
                    <div className="text-gray-500 text-xs mt-1">{p.date_of_birth}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-8">
                <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {searchTerm ? 'No patients found' : 'No patients registered yet'}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Form Panel */}
        <div className="lg:w-3/4">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-[#4DB6B0]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#4DB6B0]">Register New Patient</h2>
          </div>

          {/* Enhanced Message Display */}
          {message && (
            <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border flex items-center gap-3 ${getMessageStyles()}`}>
              {getMessageIcon()}
              <span className="font-medium text-sm sm:text-base">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-1">Patient Information</h3>
              <p className="text-xs sm:text-sm text-gray-600">Fill in the patient's details below</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Enhanced Input Fields */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      className="w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PINFL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pinfl"
                    value={form.pinfl}
                    onChange={handleChange}
                    placeholder="Enter PINFL number"
                    maxLength={14}
                    className="w-full px-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      name="phone_number"
                      value={form.phone_number}
                      onChange={handleChange}
                      placeholder="+998XXXXXXXXX"
                      className="w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter email address"
                      className="w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="emergency_contact"
                      value={form.emergency_contact}
                      onChange={handleChange}
                      placeholder="Emergency contact number"
                      className="w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="relative sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Enter full address"
                      className="w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6B0] focus:border-transparent transition-colors text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#4DB6B0] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-[#45a9a3] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Register Patient
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleFindAndInvite}
                  disabled={isLoading}
                  className="bg-indigo-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Find & Invite Patient
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientRegister;