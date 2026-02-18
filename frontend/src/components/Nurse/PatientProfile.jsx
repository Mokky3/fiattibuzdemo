import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NurseHeader from './header';
import {
  getPatientProfile,
  createPatientVital,
  createPatientObservation,
  addPatientAllergy,
  addPatientImmunization,
  markTreatmentAdministered,
} from '../../services/nurseService';
import {
  VitalSignForm,
  ObservationForm,
  AllergyForm,
  ImmunizationForm,
} from './PatientProfileForms';

const NursePatientProfile = () => {
  const { t } = useTranslation();
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [showImmunizationForm, setShowImmunizationForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
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
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getPatientProfile(patientId);
        console.log('📊 Patient Profile Data:', data);
        console.log('📊 Clinical Data:', data?.clinical);
        console.log('📊 Vital Signs:', data?.clinical?.vitalSigns);
        setProfile(data);
      } catch (e) {
        console.error('Error loading patient profile:', e);
        setError(e.message || 'Failed to load patient profile');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchProfile();
    }
  }, [patientId]);

  const refreshProfile = async () => {
    try {
      const data = await getPatientProfile(patientId);
      console.log('🔄 Refreshed Profile Data:', data);
      console.log('🔄 Refreshed Profile Data (full):', JSON.stringify(data, null, 2));
      console.log('🔄 Refreshed Clinical:', data?.clinical);
      console.log('🔄 Refreshed Clinical (full):', JSON.stringify(data?.clinical, null, 2));
      console.log('🔄 Refreshed Vital Signs:', data?.clinical?.vitalSigns);
      console.log('🔄 Refreshed Vital Signs (full):', JSON.stringify(data?.clinical?.vitalSigns, null, 2));
      console.log('🔄 Vital Signs length:', data?.clinical?.vitalSigns?.length);
      console.log('🔄 Refreshed Observations:', data?.clinical?.observations);
      console.log('🔄 Refreshed Observations (full):', JSON.stringify(data?.clinical?.observations, null, 2));
      console.log('🔄 Observations length:', data?.clinical?.observations?.length);
      setProfile(data);
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  };

  const handleCreateVital = async (vitalData) => {
    try {
      setSubmitting(true);
      await createPatientVital(patientId, vitalData);
      setShowVitalForm(false);
      await refreshProfile();
    } catch (e) {
      console.error('Error creating vital:', e);
      alert(t('failedToRecordVitalSign') + ': ' + (e.message || t('unknownError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateObservation = async (observationData) => {
    try {
      setSubmitting(true);
      await createPatientObservation(patientId, observationData);
      setShowObservationForm(false);
      await refreshProfile();
    } catch (e) {
      console.error('Error creating observation:', e);
      alert(t('failedToRecordObservation') + ': ' + (e.message || t('unknownError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAllergy = async (allergyData) => {
    try {
      setSubmitting(true);
      await addPatientAllergy(patientId, allergyData);
      setShowAllergyForm(false);
      await refreshProfile();
    } catch (e) {
      console.error('Error adding allergy:', e);
      alert(t('failedToAddAllergy') + ': ' + (e.message || t('unknownError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddImmunization = async (immunizationData) => {
    try {
      setSubmitting(true);
      await addPatientImmunization(patientId, immunizationData);
      setShowImmunizationForm(false);
      await refreshProfile();
    } catch (e) {
      console.error('Error adding immunization:', e);
      alert(t('failedToAddImmunization') + ': ' + (e.message || t('unknownError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAdministered = async (treatmentId, notes) => {
    try {
      setSubmitting(true);
      await markTreatmentAdministered(patientId, treatmentId, notes);
      await refreshProfile();
    } catch (e) {
      console.error('Error marking treatment as administered:', e);
      alert(t('failedToMarkTreatmentAsAdministered') + ': ' + (e.message || t('unknownError')));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const maskPhone = (phone) => {
    if (!phone) return 'N/A';
    if (phone.length <= 4) return phone;
    return `***-***-${phone.slice(-4)}`;
  };

  const maskEmail = (email) => {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local.slice(0, 2)}***@${domain}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
      }`}>
        <NurseHeader />
        <div className="p-6">
          <div className="text-center py-12">
            <div className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
              {t('loadingPatientProfile')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
      }`}>
        <NurseHeader />
        <div className="p-6">
          <div className="text-center py-12">
            <div className={`mb-4 ${
              darkMode ? 'text-[#FB7185]' : 'text-red-600'
            }`}>
              {t('error')}: {error || t('patientProfileNotFound')}
            </div>
            <button
              onClick={() => navigate('/nurse/patients')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {t('backToPatients')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { overview, clinical, documents } = profile;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      <NurseHeader />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/nurse/patients')}
            className={`flex items-center transition-colors ${
              darkMode
                ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                : 'text-teal-600 hover:text-teal-800'
            }`}
          >
            ← {t('backToPatients')}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar - Patient Overview */}
          <div className="w-80 flex-shrink-0">
            <div className={`rounded-lg shadow-lg p-6 sticky top-6 transition-colors ${
              darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
            }`}>
              {/* Patient Photo */}
              <div className="text-center mb-6">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-white text-4xl font-bold ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#79CAC2] to-[#58B4AA]'
                    : 'bg-teal-500'
                }`}>
                  {overview.firstName?.[0]}{overview.lastName?.[0]}
                </div>
                <h2 className={`text-xl font-semibold mt-4 ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>
                  {overview.fullName}
                </h2>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{t('patientId')}: {overview.patientId}</p>
              </div>

              {/* Demographics */}
              <div className={`space-y-4 border-t pt-4 ${
                darkMode ? 'border-[#133037]' : 'border-gray-200'
              }`}>
                <div>
                  <label className={`text-xs uppercase ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{t('age')}</label>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{overview.age} {t('years')}</p>
                </div>
                <div>
                  <label className={`text-xs uppercase ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{t('gender')}</label>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>{overview.gender || t('notAvailable')}</p>
                </div>
                {overview.phone && (
                  <div>
                    <label className={`text-xs uppercase ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{t('phone')}</label>
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{maskPhone(overview.phone)}</p>
                  </div>
                )}
                {overview.email && (
                  <div>
                    <label className={`text-xs uppercase ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{t('email')}</label>
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{maskEmail(overview.email)}</p>
                  </div>
                )}
                {overview.roomBed && (
                  <div>
                    <label className={`text-xs uppercase ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{t('roomBed')}</label>
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>
                      {overview.roomBed.roomNumber || t('notAvailable')} / {overview.roomBed.bedNumber || t('notAvailable')}
                    </p>
                  </div>
                )}
                {overview.department && (
                  <div>
                    <label className={`text-xs uppercase ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>{t('department')}</label>
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{overview.department}</p>
                  </div>
                )}
              </div>

              {/* Assigned Doctors */}
              {overview.assignedDoctors && overview.assignedDoctors.length > 0 && (
                <div className={`mt-6 border-t pt-4 ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <label className={`text-xs uppercase mb-2 block ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{t('assignedDoctors')}</label>
                  <div className="space-y-2">
                    {overview.assignedDoctors.map((doc) => (
                      <div key={doc.id} className="text-sm">
                        <p className={`font-medium ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{doc.name}</p>
                        {doc.department && (
                          <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500 text-xs'}>
                            {doc.department}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {overview.emergencyContact && (
                <div className={`mt-6 border-t pt-4 ${
                  darkMode ? 'border-[#133037]' : 'border-gray-200'
                }`}>
                  <label className={`text-xs uppercase mb-2 block ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`}>{t('emergencyContact')}</label>
                  <div className="text-sm">
                    <p className={`font-medium ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{overview.emergencyContact.name || t('notAvailable')}</p>
                    <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                      {overview.emergencyContact.relationship || ''}
                    </p>
                    {overview.emergencyContact.phone && (
                      <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                        {maskPhone(overview.emergencyContact.phone)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Tabs */}
            <div className={`rounded-lg shadow-lg mb-6 transition-colors ${
              darkMode ? 'bg-[#0D2026] border border-[#133037]' : 'bg-white'
            }`}>
              <div className={`border-b ${
                darkMode ? 'border-[#133037]' : 'border-gray-200'
              }`}>
                <nav className="flex -mb-px">
                  {[
                    { key: 'overview', label: t('overview') },
                    { key: 'vitals', label: t('vitals') },
                    { key: 'observations', label: t('observations') },
                    { key: 'medications', label: t('medications') },
                    { key: 'lab-results', label: t('labResults') },
                    { key: 'notes', label: t('notes') }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? darkMode
                            ? 'border-[#79CAC2] text-[#79CAC2]'
                            : 'border-teal-500 text-teal-600'
                          : darkMode
                          ? 'border-transparent text-[#8AA2A7] hover:text-[#C1D9DD] hover:border-[#133037]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{t('medicalHistory')}</h3>
                      {clinical.medicalHistory && clinical.medicalHistory.length > 0 ? (
                        <div className="space-y-3">
                          {clinical.medicalHistory.map((item) => (
                            <div key={item.id} className={`border-l-4 pl-4 py-2 rounded transition-colors ${
                              darkMode
                                ? 'border-[#79CAC2] bg-[#07181D]'
                                : 'border-teal-500 bg-gray-50'
                            }`}>
                              <p className={`font-medium ${
                                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                              }`}>{item.condition}</p>
                              <p className={`text-sm ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                              }`}>
                                {item.diagnosisDate && `${t('diagnosed')}: ${formatDate(item.diagnosisDate)}`}
                                {item.status && ` • ${t('status')}: ${item.status}`}
                              </p>
                              {item.notes && (
                                <p className={`text-sm mt-1 ${
                                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                }`}>{item.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                          {t('noMedicalHistoryRecorded')}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-4 flex justify-between items-center">
                        <h3 className={`text-lg font-semibold ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{t('allergies')}</h3>
                        {!showAllergyForm && (
                          <button
                            onClick={() => setShowAllergyForm(true)}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              darkMode
                                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                          >
                            + {t('addAllergy')}
                          </button>
                        )}
                      </div>
                      {showAllergyForm && (
                        <div className="mb-6">
                          <AllergyForm
                            onSubmit={handleAddAllergy}
                            onCancel={() => setShowAllergyForm(false)}
                            submitting={submitting}
                          />
                        </div>
                      )}
                      {clinical.allergies && clinical.allergies.length > 0 ? (
                        <div className="space-y-2">
                          {clinical.allergies.map((allergy) => (
                            <div key={allergy.id} className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                darkMode
                                  ? 'bg-red-900 bg-opacity-30 text-red-300'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {allergy.allergen}
                              </span>
                              {allergy.severity && (
                                <span className={`text-sm ${
                                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                                }`}>({allergy.severity})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                          {t('noKnownAllergies')}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-4 flex justify-between items-center">
                        <h3 className={`text-lg font-semibold ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{t('immunizations')}</h3>
                        {!showImmunizationForm && (
                          <button
                            onClick={() => setShowImmunizationForm(true)}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              darkMode
                                ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                          >
                            + {t('addImmunization')}
                          </button>
                        )}
                      </div>
                      {showImmunizationForm && (
                        <div className="mb-6">
                          <ImmunizationForm
                            onSubmit={handleAddImmunization}
                            onCancel={() => setShowImmunizationForm(false)}
                            submitting={submitting}
                          />
                        </div>
                      )}
                      {clinical.immunizations && clinical.immunizations.length > 0 ? (
                        <div className="space-y-2">
                          {clinical.immunizations.map((imm) => (
                            <div key={imm.id} className={`flex justify-between items-center border-b pb-2 ${
                              darkMode ? 'border-[#133037]' : 'border-gray-200'
                            }`}>
                              <div className="flex flex-col">
                                <span className={`font-medium ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{imm.vaccine}</span>
                                {imm.lotNumber && (
                                  <span className={`text-xs ${
                                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                  }`}>{t('lot')}: {imm.lotNumber}</span>
                                )}
                              </div>
                              <span className={`text-sm ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                              }`}>{formatDate(imm.date)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                          {t('noImmunizationsRecorded')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Vitals Tab */}
                {activeTab === 'vitals' && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className={`text-lg font-semibold ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{t('vitalSigns')}</h3>
                      {!showVitalForm && (
                        <button
                          onClick={() => setShowVitalForm(true)}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                            darkMode
                              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                              : 'bg-teal-600 text-white hover:bg-teal-700'
                          }`}
                        >
                          + {t('recordVitalSigns')}
                        </button>
                      )}
                    </div>
                    {showVitalForm && (
                      <div className="mb-6">
                        <VitalSignForm
                          onSubmit={handleCreateVital}
                          onCancel={() => setShowVitalForm(false)}
                          submitting={submitting}
                        />
                      </div>
                    )}
                    {clinical.vitalSigns && clinical.vitalSigns.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className={darkMode ? 'bg-[#07181D]' : 'bg-gray-50'}>
                            <tr>
                              <th className={`px-4 py-2 text-left text-sm font-medium ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{t('dateTime')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-medium ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{t('temp')} (°C)</th>
                              <th className={`px-4 py-2 text-left text-sm font-medium ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{t('bloodPressure')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-medium ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{t('heartRate')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-medium ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{t('respiratory')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-medium ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{t('spo2')}</th>
                              <th className={`px-4 py-2 text-left text-sm font-medium ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                              }`}>{t('pain')}</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${
                            darkMode ? 'divide-[#133037]' : 'divide-gray-200'
                          }`}>
                            {[...clinical.vitalSigns]
                              .sort((a, b) => {
                                // Sort by date, latest first
                                const dateA = new Date(a.measuredAt || a.createdAt || 0);
                                const dateB = new Date(b.measuredAt || b.createdAt || 0);
                                return dateB - dateA;
                              })
                              .map((vital) => (
                              <tr 
                                key={vital.id} 
                                className={`transition-colors ${
                                  darkMode ? 'hover:bg-[#133037]' : 'hover:bg-gray-50'
                                }`}
                              >
                                <td className={`px-4 py-2 text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{formatDateTime(vital.measuredAt)}</td>
                                <td className={`px-4 py-2 text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{vital.temperature != null ? vital.temperature : t('notAvailable')}</td>
                                <td className={`px-4 py-2 text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{vital.bloodPressure || t('notAvailable')}</td>
                                <td className={`px-4 py-2 text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{vital.heartRate != null ? vital.heartRate : t('notAvailable')}</td>
                                <td className={`px-4 py-2 text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{vital.respiratoryRate != null ? vital.respiratoryRate : t('notAvailable')}</td>
                                <td className={`px-4 py-2 text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{vital.oxygenSaturation != null ? `${vital.oxygenSaturation}%` : t('notAvailable')}</td>
                                <td className={`px-4 py-2 text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{vital.painScale != null ? `${vital.painScale}/10` : t('notAvailable')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                        {t('noVitalSignsRecorded')}
                      </p>
                    )}
                  </div>
                )}

                {/* Observations Tab */}
                {activeTab === 'observations' && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className={`text-lg font-semibold ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{t('clinicalObservations')}</h3>
                      {!showObservationForm && (
                        <button
                          onClick={() => setShowObservationForm(true)}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                            darkMode
                              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                              : 'bg-teal-600 text-white hover:bg-teal-700'
                          }`}
                        >
                          + {t('addObservation')}
                        </button>
                      )}
                    </div>
                    {showObservationForm && (
                      <div className="mb-6">
                        <ObservationForm
                          onSubmit={handleCreateObservation}
                          onCancel={() => setShowObservationForm(false)}
                          submitting={submitting}
                        />
                      </div>
                    )}
                    {clinical.observations && clinical.observations.length > 0 ? (
                      <div className="space-y-4">
                        {clinical.observations.map((obs) => (
                          <div key={obs.id} className={`border-l-4 pl-4 py-3 rounded transition-colors ${
                            darkMode
                              ? 'border-[#79CAC2] bg-[#07181D]'
                              : 'border-blue-500 bg-gray-50'
                          }`}>
                            <p className={`font-medium ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{obs.observation}</p>
                            <p className={`text-sm mt-1 ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                            }`}>
                              {formatDateTime(obs.recordedAt)} • {obs.recordedBy}
                            </p>
                            {obs.category && (
                              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                                darkMode
                                  ? 'bg-blue-900 bg-opacity-30 text-blue-300'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {obs.category}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                        {t('noClinicalObservationsRecorded')}
                      </p>
                    )}
                  </div>
                )}

                {/* Medications Tab */}
                {activeTab === 'medications' && (
                  <div>
                    {clinical.medications && clinical.medications.length > 0 ? (
                      <div className="space-y-4">
                        {clinical.medications.map((med) => (
                          <div key={med.id} className={`border rounded-lg p-4 transition-colors ${
                            darkMode ? 'border-[#133037] bg-[#0D2026]' : 'border-gray-200 bg-white'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className={`font-medium text-lg ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{med.name}</p>
                                <p className={`text-sm mt-1 ${
                                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                                }`}>
                                  {med.dosage && `${t('dosage')}: ${med.dosage}`}
                                  {med.frequency && ` • ${t('frequency')}: ${med.frequency}`}
                                  {med.route && ` • ${t('route')}: ${med.route}`}
                                </p>
                                {med.prescribedBy && (
                                  <p className={`text-xs mt-1 ${
                                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                  }`}>{t('prescribedBy')}: {med.prescribedBy}</p>
                                )}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                med.status === 'active' 
                                  ? darkMode
                                    ? 'bg-green-900 bg-opacity-30 text-green-300'
                                    : 'bg-green-100 text-green-800'
                                  : med.status === 'completed'
                                  ? darkMode
                                    ? 'bg-[#133037] text-[#8AA2A7]'
                                    : 'bg-gray-100 text-gray-800'
                                  : darkMode
                                  ? 'bg-red-900 bg-opacity-30 text-red-300'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {med.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                        {t('noMedicationsRecorded')}
                      </p>
                    )}

                    {/* Treatment Plans */}
                    {clinical.treatmentPlans && clinical.treatmentPlans.length > 0 && (
                      <div className="mt-8">
                        <h4 className={`text-md font-semibold mb-4 ${
                          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                        }`}>{t('activeTreatmentPlans')}</h4>
                        <div className="space-y-3">
                          {clinical.treatmentPlans.map((plan) => (
                            <div key={plan.id} className={`border rounded-lg p-4 transition-colors ${
                              darkMode
                                ? 'border-[#133037] bg-[#07181D]'
                                : 'border-gray-200 bg-blue-50'
                            }`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className={`font-medium ${
                                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                  }`}>{plan.description}</p>
                                  <p className={`text-sm mt-1 ${
                                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                                  }`}>
                                    {t('type')}: {plan.type} • {t('ordered')}: {formatDateTime(plan.orderedAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    plan.status === 'completed'
                                      ? darkMode
                                        ? 'bg-green-900 bg-opacity-30 text-green-300'
                                        : 'bg-green-100 text-green-800'
                                      : plan.status === 'in-progress'
                                      ? darkMode
                                        ? 'bg-blue-900 bg-opacity-30 text-blue-300'
                                        : 'bg-blue-100 text-blue-800'
                                      : darkMode
                                      ? 'bg-yellow-900 bg-opacity-30 text-yellow-300'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {plan.status}
                                  </span>
                                  {plan.status === 'pending' && (
                                    <button
                                      onClick={() => {
                                        const notes = prompt(t('enterNotesOptional'));
                                        if (notes !== null) {
                                          handleMarkAdministered(plan.id, notes || '');
                                        }
                                      }}
                                      className={`px-3 py-1 rounded text-xs transition-colors ${
                                        darkMode
                                          ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
                                          : 'bg-teal-600 text-white hover:bg-teal-700'
                                      }`}
                                      disabled={submitting}
                                    >
                                      {submitting ? t('marking') : t('markAdministered')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Lab Results Tab */}
                {activeTab === 'lab-results' && (
                  <div>
                    {clinical.labResults && clinical.labResults.length > 0 ? (
                      <div className="space-y-4">
                        {clinical.labResults.map((lab) => (
                          <div key={lab.id} className={`border rounded-lg p-4 transition-colors ${
                            darkMode ? 'border-[#133037] bg-[#0D2026]' : 'border-gray-200 bg-white'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className={`font-medium text-lg ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{lab.testName}</p>
                                <p className={`text-sm mt-1 ${
                                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                                }`}>
                                  {lab.result && `${t('result')}: ${lab.result}`}
                                  {lab.value !== null && lab.unit && ` • ${lab.value} ${lab.unit}`}
                                  {lab.referenceRange && ` • ${t('range')}: ${lab.referenceRange}`}
                                </p>
                                <p className={`text-xs mt-1 ${
                                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                }`}>
                                  {lab.completedAt && `${t('completed')}: ${formatDateTime(lab.completedAt)}`}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                lab.status === 'normal'
                                  ? darkMode
                                    ? 'bg-green-900 bg-opacity-30 text-green-300'
                                    : 'bg-green-100 text-green-800'
                                  : lab.status === 'abnormal'
                                  ? darkMode
                                    ? 'bg-yellow-900 bg-opacity-30 text-yellow-300'
                                    : 'bg-yellow-100 text-yellow-800'
                                  : darkMode
                                  ? 'bg-red-900 bg-opacity-30 text-red-300'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {lab.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                        {t('noLabResultsAvailable')}
                      </p>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div>
                    <div className="mb-4">
                      <h3 className={`text-lg font-semibold ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{t('clinicalNotes')}</h3>
                      <p className={`text-sm ${
                        darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                      }`}>{t('clinicalNotesAndDocumentation')}</p>
                    </div>
                    {clinical.notes && clinical.notes.length > 0 ? (
                      <div className="space-y-4">
                        {clinical.notes.map((note) => (
                          <div key={note.id} className={`border-l-4 pl-4 py-3 rounded transition-colors ${
                            darkMode
                              ? 'border-[#79CAC2] bg-[#07181D]'
                              : 'border-purple-500 bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className={`font-medium capitalize ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{note.noteType || t('clinicalNote')}</p>
                                <p className={`text-sm mt-1 ${
                                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
                                }`}>
                                  {formatDateTime(note.noteDate)} {note.createdBy && `• ${note.createdBy}`}
                                </p>
                              </div>
                            </div>
                            
                            {/* SOAP Format */}
                            {(note.subjective || note.objective || note.assessment || note.plan) ? (
                              <div className="mt-3 space-y-2">
                                {note.subjective && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase ${
                                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                                    }`}>{t('subjective')}</p>
                                    <p className={`text-sm mt-1 ${
                                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                                    }`}>{note.subjective}</p>
                                  </div>
                                )}
                                {note.objective && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase ${
                                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                                    }`}>{t('objective')}</p>
                                    <p className={`text-sm mt-1 ${
                                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                                    }`}>{note.objective}</p>
                                  </div>
                                )}
                                {note.assessment && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase ${
                                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                                    }`}>{t('assessment')}</p>
                                    <p className={`text-sm mt-1 ${
                                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                                    }`}>{note.assessment}</p>
                                  </div>
                                )}
                                {note.plan && (
                                  <div>
                                    <p className={`text-xs font-semibold uppercase ${
                                      darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                                    }`}>{t('plan')}</p>
                                    <p className={`text-sm mt-1 ${
                                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                                    }`}>{note.plan}</p>
                                  </div>
                                )}
                              </div>
                            ) : note.content ? (
                              <div className="mt-3">
                                <p className={`text-sm ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                                }`}>{note.content}</p>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                        {t('noClinicalNotesAvailable')}
                      </p>
                    )}
                    
                    {/* Documents Section */}
                    <div className={`mt-8 pt-6 border-t ${
                      darkMode ? 'border-[#133037]' : 'border-gray-200'
                    }`}>
                      <h3 className={`text-lg font-semibold mb-4 ${
                        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                      }`}>{t('documents')}</h3>
                      {documents.documents && documents.documents.length > 0 ? (
                        <div className="space-y-2">
                          {documents.documents.map((doc) => (
                            <div key={doc.id} className={`border rounded p-3 flex justify-between items-center transition-colors ${
                              darkMode
                                ? 'border-[#133037] bg-[#0D2026]'
                                : 'border-gray-200 bg-white'
                            }`}>
                              <div>
                                <p className={`font-medium ${
                                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                                }`}>{doc.name}</p>
                                <p className={`text-sm ${
                                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                                }`}>{formatDateTime(doc.uploadedAt)}</p>
                              </div>
                              {doc.url && (
                                <a 
                                  href={doc.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className={`text-sm transition-colors ${
                                    darkMode
                                      ? 'text-[#79CAC2] hover:text-[#58B4AA]'
                                      : 'text-teal-600 hover:text-teal-800'
                                  }`}
                                >
                                  {t('view')}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'}>
                          {t('noDocumentsUploaded')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NursePatientProfile;

