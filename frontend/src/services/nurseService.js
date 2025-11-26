// Unified Nurse service layer calling backend API.

import { API_BASE } from '../config/api.js';

const API_BASE_NURSE = `${API_BASE}/nurse`

function authHeaders(extra = {}) {
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function http(path, { method = 'GET', body, headers } = {}) {
  const url = `${API_BASE_NURSE}${path}`
  const requestHeaders = authHeaders(headers)
  
  console.log(`🔍 [nurseService] Making ${method} request to:`, url)
  console.log('🔍 [nurseService] Headers:', requestHeaders)
  
  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  
  console.log(`🔍 [nurseService] Response status:`, res.status)
  
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`❌ [nurseService] HTTP ${res.status} error:`, text)
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  
  if (res.status === 204) return null
  const result = await res.json()
  console.log('✅ [nurseService] Response data:', result)
  return result
}

function buildQuery(params = {}, mapping = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return
    const apiKey = mapping[key] || key
    qs.set(apiKey, String(value))
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

// Dashboard
export async function getDashboardSummary() {
  return await http('/dashboard/summary')
}

export async function getDashboardPatients(date = null) {
  const query = date ? `?target_date=${date}` : ''
  return await http(`/dashboard/patients${query}`)
}

export async function getDashboardMedications(date = null) {
  const query = date ? `?target_date=${date}` : ''
  return await http(`/dashboard/medications${query}`)
}

export async function getDashboardTasks(date = null) {
  const query = date ? `?target_date=${date}` : ''
  return await http(`/dashboard/tasks${query}`)
}

export async function getDashboardMessages() {
  return await http('/dashboard/messages')
}

// Patients
export async function getPatients(params = {}) {
  const query = buildQuery(params)
  const response = await http(`/patients${query}`)
  // Handle SuccessResponse format: { data: { items: [...], total: N }, message: "..." }
  if (response?.data?.items) {
    return response.data
  }
  // Fallback for direct array or other formats
  return Array.isArray(response?.items) ? response : (Array.isArray(response) ? { items: response, total: response.length } : { items: [], total: 0 })
}
export async function getPatientById(id) {
  return await http(`/patients/${encodeURIComponent(id)}`)
}
export async function getPatientProfile(id) {
  const response = await http(`/patients/${encodeURIComponent(id)}/profile`)
  console.log('🔍 [nurseService] getPatientProfile raw response:', response)
  console.log('🔍 [nurseService] response.data:', response?.data)
  console.log('🔍 [nurseService] response.data?.clinical:', response?.data?.clinical)
  console.log('🔍 [nurseService] response.data?.clinical?.vitalSigns:', response?.data?.clinical?.vitalSigns)
  const profile = response?.data || response
  console.log('🔍 [nurseService] returning profile:', profile)
  console.log('🔍 [nurseService] profile.clinical:', profile?.clinical)
  console.log('🔍 [nurseService] profile.clinical?.vitalSigns:', profile?.clinical?.vitalSigns)
  return profile
}

// Patient Profile Actions
export async function createPatientVital(patientId, vitalData) {
  return await http(`/patients/${encodeURIComponent(patientId)}/vitals`, {
    method: 'POST',
    body: { ...vitalData, patientId }
  })
}

export async function createPatientObservation(patientId, observationData) {
  return await http(`/patients/${encodeURIComponent(patientId)}/observations`, {
    method: 'POST',
    body: { ...observationData, patientId }
  })
}

export async function addPatientAllergy(patientId, allergyData) {
  return await http(`/patients/${encodeURIComponent(patientId)}/allergies`, {
    method: 'POST',
    body: { ...allergyData, patientId }
  })
}

export async function addPatientImmunization(patientId, immunizationData) {
  return await http(`/patients/${encodeURIComponent(patientId)}/immunizations`, {
    method: 'POST',
    body: { ...immunizationData, patientId }
  })
}

export async function markTreatmentAdministered(patientId, treatmentId, notes) {
  return await http(`/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(treatmentId)}/administer`, {
    method: 'POST',
    body: { notes }
  })
}

// Vitals
export async function getVitals(params = {}) {
  const query = buildQuery(params, { date: 'date_filter' })
  const response = await http(`/vitals${query}`)
  // Handle SuccessResponse format
  if (response?.data?.items) {
    return response.data
  }
  return Array.isArray(response?.items) ? response : (Array.isArray(response) ? { items: response, total: response.length } : { items: [], total: 0 })
}
export async function createVital(payload) {
  return await http('/vitals', { method: 'POST', body: payload })
}
export async function getVitalById(id) {
  return await http(`/vitals/${encodeURIComponent(id)}`)
}

// Tasks
export async function getTasks(params = {}) {
  const query = buildQuery(params, { date: 'date_filter' })
  const response = await http(`/tasks${query}`)
  // Handle SuccessResponse format
  if (response?.data?.items) {
    return response.data
  }
  return Array.isArray(response?.items) ? response : (Array.isArray(response) ? { items: response, total: response.length } : { items: [], total: 0 })
}
export async function createTask(payload) {
  return await http('/tasks', { method: 'POST', body: payload })
}
export async function updateTaskStatus(id, status) {
  return await http(`/tasks/${encodeURIComponent(id)}/status`, { method: 'POST', body: { status } })
}
export async function getTaskById(id) {
  return await http(`/tasks/${encodeURIComponent(id)}`)
}

// Medications
export async function getMedications(params = {}) {
  const query = buildQuery(params, { date: 'date_filter' })
  const response = await http(`/medications${query}`)
  // Handle SuccessResponse format: { data: { items: [...], total: N, given: N, ... }, message: "..." }
  if (response?.data?.items) {
    return response.data
  }
  // Fallback for direct array or other formats
  return Array.isArray(response?.items) ? response : (Array.isArray(response) ? { items: response, total: response.length } : { items: [], total: 0 })
}
export async function administerMedication(id, payload = {}) {
  return await http(`/medications/${encodeURIComponent(id)}/administer`, { method: 'POST', body: payload })
}
export async function skipMedication(id, reason) {
  return await http(`/medications/${encodeURIComponent(id)}/skip`, { method: 'POST', body: { reason } })
}

// Settings & Profile
export async function getSettings() { return await http('/settings') }
export async function saveSettings(settings) { return await http('/settings', { method: 'PUT', body: settings }) }
export async function getProfile() { 
  console.log('🔍 [nurseService] getProfile called')
  console.log('🔍 [nurseService] Token exists:', !!localStorage.getItem('token'))
  try {
    const result = await http('/profile')
    console.log('✅ [nurseService] getProfile success:', result)
    return result
  } catch (error) {
    console.error('❌ [nurseService] getProfile error:', error)
    throw error
  }
}

export async function saveProfile(profileData) {
  console.log('🔍 [nurseService] saveProfile called with:', profileData)
  console.log('🔍 [nurseService] Token exists:', !!localStorage.getItem('token'))
  try {
    // Wrap the data in profileData field as expected by backend
    const requestBody = { profileData }
    console.log('🔍 [nurseService] Request body:', requestBody)
    
    // Use PATCH for partial updates instead of PUT
    const result = await http('/profile', {
      method: 'PATCH',
      body: requestBody
    })
    console.log('✅ [nurseService] saveProfile success:', result)
    return result
  } catch (error) {
    console.error('❌ [nurseService] saveProfile error:', error)
    throw error
  }
}

export async function changePassword(passwordData) {
  console.log('🔍 [nurseService] changePassword called')
  console.log('🔍 [nurseService] Token exists:', !!localStorage.getItem('token'))
  try {
    const result = await http('/profile/change-password', {
      method: 'POST',
      body: passwordData
    })
    console.log('✅ [nurseService] changePassword success:', result)
    return result
  } catch (error) {
    console.error('❌ [nurseService] changePassword error:', error)
    throw error
  }
}

// Messages API
export const messagesAPI = {
  // Get all messages
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/conversations${queryParams ? `?${queryParams}` : ''}`);
  },

  // Send message
  send: async (messageData) => {
    return http('/messages/send', {
      method: 'POST',
      body: messageData,
    });
  },

  // Mark as read
  markAsRead: async (messageId) => {
    return http(`/messages/messages/${messageId}/read`, {
      method: 'PUT',
    });
  },

  // Get received messages
  getReceived: async () => {
    return http('/messages/unread');
  },

  // Get patients for messaging
  getPatients: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/patients${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get patient documents (reports, lab results, imaging, prescriptions)
  getPatientDocuments: async (patientId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/patients/${patientId}/documents${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get conversation messages
  getConversationMessages: async (patientId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/conversations/${patientId}/messages${queryParams ? `?${queryParams}` : ''}`);
  },

  // Mark conversation as read
  markConversationRead: async (recipientId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/conversations/${recipientId}/mark-read${queryParams ? `?${queryParams}` : ''}`, {
      method: 'POST',
    });
  },

  // Get conversations list
  getConversations: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/conversations${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get message stats
  getStats: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/stats${queryParams ? `?${queryParams}` : ''}`);
  },
};

export default {
  getDashboardSummary,
  getPatients, getPatientById,
  getVitals, createVital, getVitalById,
  getTasks, createTask, updateTaskStatus, getTaskById,
  getMedications, administerMedication, skipMedication,
  getSettings, saveSettings, getProfile, saveProfile, changePassword,
  messagesAPI,
}





