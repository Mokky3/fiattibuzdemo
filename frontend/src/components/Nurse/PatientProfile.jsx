import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      alert('Failed to record vital sign: ' + (e.message || 'Unknown error'));
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
      alert('Failed to record observation: ' + (e.message || 'Unknown error'));
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
      alert('Failed to add allergy: ' + (e.message || 'Unknown error'));
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
      alert('Failed to add immunization: ' + (e.message || 'Unknown error'));
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
      alert('Failed to mark treatment as administered: ' + (e.message || 'Unknown error'));
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
      <div className="min-h-screen bg-gray-50">
        <NurseHeader />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading patient profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NurseHeader />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">Error: {error || 'Patient profile not found'}</div>
            <button
              onClick={() => navigate('/nurse/patients')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { overview, clinical, documents } = profile;

  return (
    <div className="min-h-screen bg-gray-50">
      <NurseHeader />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/nurse/patients')}
            className="text-teal-600 hover:text-teal-800 flex items-center"
          >
            ← Back to Patients
          </button>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar - Patient Overview */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              {/* Patient Photo */}
              <div className="text-center mb-6">
                <div className="w-32 h-32 mx-auto rounded-full bg-teal-500 flex items-center justify-center text-white text-4xl font-bold">
                  {overview.firstName?.[0]}{overview.lastName?.[0]}
                </div>
                <h2 className="text-xl font-semibold mt-4 text-gray-900">
                  {overview.fullName}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Patient ID: {overview.patientId}</p>
              </div>

              {/* Demographics */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Age</label>
                  <p className="text-sm font-medium">{overview.age} years</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Gender</label>
                  <p className="text-sm font-medium">{overview.gender || 'N/A'}</p>
                </div>
                {overview.phone && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Phone</label>
                    <p className="text-sm font-medium">{maskPhone(overview.phone)}</p>
                  </div>
                )}
                {overview.email && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Email</label>
                    <p className="text-sm font-medium">{maskEmail(overview.email)}</p>
                  </div>
                )}
                {overview.roomBed && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Room/Bed</label>
                    <p className="text-sm font-medium">
                      {overview.roomBed.roomNumber || 'N/A'} / {overview.roomBed.bedNumber || 'N/A'}
                    </p>
                  </div>
                )}
                {overview.department && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Department</label>
                    <p className="text-sm font-medium">{overview.department}</p>
                  </div>
                )}
              </div>

              {/* Assigned Doctors */}
              {overview.assignedDoctors && overview.assignedDoctors.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <label className="text-xs text-gray-500 uppercase mb-2 block">Assigned Doctors</label>
                  <div className="space-y-2">
                    {overview.assignedDoctors.map((doc) => (
                      <div key={doc.id} className="text-sm">
                        <p className="font-medium">{doc.name}</p>
                        {doc.department && <p className="text-gray-500 text-xs">{doc.department}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {overview.emergencyContact && (
                <div className="mt-6 border-t pt-4">
                  <label className="text-xs text-gray-500 uppercase mb-2 block">Emergency Contact</label>
                  <div className="text-sm">
                    <p className="font-medium">{overview.emergencyContact.name || 'N/A'}</p>
                    <p className="text-gray-500">{overview.emergencyContact.relationship || ''}</p>
                    {overview.emergencyContact.phone && (
                      <p className="text-gray-500">{maskPhone(overview.emergencyContact.phone)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-lg mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {['overview', 'vitals', 'observations', 'medications', 'lab-results', 'notes'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 ${
                        activeTab === tab
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Medical History</h3>
                      {clinical.medicalHistory && clinical.medicalHistory.length > 0 ? (
                        <div className="space-y-3">
                          {clinical.medicalHistory.map((item) => (
                            <div key={item.id} className="border-l-4 border-teal-500 pl-4 py-2 bg-gray-50 rounded">
                              <p className="font-medium">{item.condition}</p>
                              <p className="text-sm text-gray-600">
                                {item.diagnosisDate && `Diagnosed: ${formatDate(item.diagnosisDate)}`}
                                {item.status && ` • Status: ${item.status}`}
                              </p>
                              {item.notes && <p className="text-sm text-gray-500 mt-1">{item.notes}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No medical history recorded</p>
                      )}
                    </div>

                    <div>
                      <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Allergies</h3>
                        {!showAllergyForm && (
                          <button
                            onClick={() => setShowAllergyForm(true)}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                          >
                            + Add Allergy
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
                              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                {allergy.allergen}
                              </span>
                              {allergy.severity && (
                                <span className="text-sm text-gray-600">({allergy.severity})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No known allergies</p>
                      )}
                    </div>

                    <div>
                      <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Immunizations</h3>
                        {!showImmunizationForm && (
                          <button
                            onClick={() => setShowImmunizationForm(true)}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                          >
                            + Add Immunization
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
                            <div key={imm.id} className="flex justify-between items-center border-b pb-2">
                              <div className="flex flex-col">
                                <span className="font-medium">{imm.vaccine}</span>
                                {imm.lotNumber && (
                                  <span className="text-xs text-gray-500">Lot: {imm.lotNumber}</span>
                                )}
                              </div>
                              <span className="text-sm text-gray-600">{formatDate(imm.date)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No immunizations recorded</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Vitals Tab */}
                {activeTab === 'vitals' && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Vital Signs</h3>
                      {!showVitalForm && (
                        <button
                          onClick={() => setShowVitalForm(true)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                        >
                          + Record Vital Signs
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
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">Date/Time</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Temp (°C)</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">BP</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Heart Rate</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Respiratory</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">SpO₂</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Pain</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[...clinical.vitalSigns]
                              .sort((a, b) => {
                                // Sort by date, latest first
                                const dateA = new Date(a.measuredAt || a.createdAt || 0);
                                const dateB = new Date(b.measuredAt || b.createdAt || 0);
                                return dateB - dateA;
                              })
                              .map((vital) => (
                              <tr key={vital.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm">{formatDateTime(vital.measuredAt)}</td>
                                <td className="px-4 py-2 text-sm">{vital.temperature != null ? vital.temperature : 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{vital.bloodPressure || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{vital.heartRate != null ? vital.heartRate : 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{vital.respiratoryRate != null ? vital.respiratoryRate : 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{vital.oxygenSaturation != null ? `${vital.oxygenSaturation}%` : 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{vital.painScale != null ? `${vital.painScale}/10` : 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500">No vital signs recorded</p>
                    )}
                  </div>
                )}

                {/* Observations Tab */}
                {activeTab === 'observations' && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Clinical Observations</h3>
                      {!showObservationForm && (
                        <button
                          onClick={() => setShowObservationForm(true)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                        >
                          + Add Observation
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
                          <div key={obs.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded">
                            <p className="font-medium">{obs.observation}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatDateTime(obs.recordedAt)} • {obs.recordedBy}
                            </p>
                            {obs.category && (
                              <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {obs.category}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No clinical observations recorded</p>
                    )}
                  </div>
                )}

                {/* Medications Tab */}
                {activeTab === 'medications' && (
                  <div>
                    {clinical.medications && clinical.medications.length > 0 ? (
                      <div className="space-y-4">
                        {clinical.medications.map((med) => (
                          <div key={med.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-lg">{med.name}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {med.dosage && `Dosage: ${med.dosage}`}
                                  {med.frequency && ` • Frequency: ${med.frequency}`}
                                  {med.route && ` • Route: ${med.route}`}
                                </p>
                                {med.prescribedBy && (
                                  <p className="text-xs text-gray-500 mt-1">Prescribed by: {med.prescribedBy}</p>
                                )}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                med.status === 'active' ? 'bg-green-100 text-green-800' :
                                med.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {med.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No medications recorded</p>
                    )}

                    {/* Treatment Plans */}
                    {clinical.treatmentPlans && clinical.treatmentPlans.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-md font-semibold mb-4">Active Treatment Plans</h4>
                        <div className="space-y-3">
                          {clinical.treatmentPlans.map((plan) => (
                            <div key={plan.id} className="border rounded-lg p-4 bg-blue-50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{plan.description}</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Type: {plan.type} • Ordered: {formatDateTime(plan.orderedAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    plan.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {plan.status}
                                  </span>
                                  {plan.status === 'pending' && (
                                    <button
                                      onClick={() => {
                                        const notes = prompt('Enter notes (optional):');
                                        if (notes !== null) {
                                          handleMarkAdministered(plan.id, notes || '');
                                        }
                                      }}
                                      className="px-3 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700"
                                      disabled={submitting}
                                    >
                                      {submitting ? 'Marking...' : 'Mark Administered'}
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
                          <div key={lab.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-lg">{lab.testName}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {lab.result && `Result: ${lab.result}`}
                                  {lab.value !== null && lab.unit && ` • ${lab.value} ${lab.unit}`}
                                  {lab.referenceRange && ` • Range: ${lab.referenceRange}`}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {lab.completedAt && `Completed: ${formatDateTime(lab.completedAt)}`}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                lab.status === 'normal' ? 'bg-green-100 text-green-800' :
                                lab.status === 'abnormal' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {lab.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No lab results available</p>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Clinical Notes</h3>
                      <p className="text-sm text-gray-600">Clinical notes and documentation</p>
                    </div>
                    {clinical.notes && clinical.notes.length > 0 ? (
                      <div className="space-y-4">
                        {clinical.notes.map((note) => (
                          <div key={note.id} className="border-l-4 border-purple-500 pl-4 py-3 bg-gray-50 rounded">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900 capitalize">{note.noteType || 'Clinical Note'}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {formatDateTime(note.noteDate)} {note.createdBy && `• ${note.createdBy}`}
                                </p>
                              </div>
                            </div>
                            
                            {/* SOAP Format */}
                            {(note.subjective || note.objective || note.assessment || note.plan) ? (
                              <div className="mt-3 space-y-2">
                                {note.subjective && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 uppercase">Subjective</p>
                                    <p className="text-sm text-gray-800 mt-1">{note.subjective}</p>
                                  </div>
                                )}
                                {note.objective && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 uppercase">Objective</p>
                                    <p className="text-sm text-gray-800 mt-1">{note.objective}</p>
                                  </div>
                                )}
                                {note.assessment && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 uppercase">Assessment</p>
                                    <p className="text-sm text-gray-800 mt-1">{note.assessment}</p>
                                  </div>
                                )}
                                {note.plan && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 uppercase">Plan</p>
                                    <p className="text-sm text-gray-800 mt-1">{note.plan}</p>
                                  </div>
                                )}
                              </div>
                            ) : note.content ? (
                              <div className="mt-3">
                                <p className="text-sm text-gray-800">{note.content}</p>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No clinical notes available</p>
                    )}
                    
                    {/* Documents Section */}
                    <div className="mt-8 pt-6 border-t">
                      <h3 className="text-lg font-semibold mb-4">Documents</h3>
                      {documents.documents && documents.documents.length > 0 ? (
                        <div className="space-y-2">
                          {documents.documents.map((doc) => (
                            <div key={doc.id} className="border rounded p-3 flex justify-between items-center">
                              <div>
                                <p className="font-medium">{doc.name}</p>
                                <p className="text-sm text-gray-500">{formatDateTime(doc.uploadedAt)}</p>
                              </div>
                              {doc.url && (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 text-sm">
                                  View
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No documents uploaded</p>
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

