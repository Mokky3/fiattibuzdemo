// Unified Lab service layer calling backend API.

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? `${import.meta.env.VITE_API_BASE_URL}/lab`
  : 'http://localhost:8000/api/v1/lab'

function authHeaders(extra = {}) {
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function http(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  // Some endpoints may return 204
  if (res.status === 204) return null
  return res.json()
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

export async function getOrders(params = {}) {
  const query = buildQuery(params, { date: 'date_filter' })
  const data = await http(`/orders${query}`)
  return Array.isArray(data?.items) ? data.items : []
}

export async function getOrderById(id) {
  return await http(`/orders/${encodeURIComponent(id)}`)
}

export async function updateOrderStatus(id, status) {
  return await http(`/orders/${encodeURIComponent(id)}/status`, { method: 'POST', body: { status } })
}

export async function submitOrderResults(id, results) {
  // Create lab result for the order then advance order status
  // Expect minimal fields in results; map to backend LabResultCreate
  const now = new Date()
  const toHHMM = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  const payload = {
    id: results?.id || undefined,
    patientName: results?.patientName || '',
    patientId: results?.patientId || '',
    orderId: id,
    testType: results?.testType || (Array.isArray(results?.results) && results.results[0]?.test) || '',
    testCategory: results?.testCategory || 'general',
    orderDate: results?.orderDate || new Date().toISOString().slice(0,10),
    completedDate: results?.completedDate || new Date().toISOString().slice(0,10),
    time: results?.time || toHHMM(now),
    physician: results?.physician || '',
    status: results?.status || 'completed',
    priority: results?.priority || 'routine',
    technician: results?.technician || undefined,
    results: Array.isArray(results?.results) ? results.results.map(r => ({
      test: r.test,
      value: r.value,
      unit: r.unit,
      range: r.range,
      status: r.status,
    })) : [],
    flags: Array.isArray(results?.flags) ? results.flags : [],
    notes: results?.notes || undefined,
  }
  await http(`/results`, { method: 'POST', body: payload })
  const nextStatus = results?.nextStatus || 'ready'
  await updateOrderStatus(id, nextStatus)
  return { id, ok: true, status: nextStatus }
}

export async function getResults(params = {}) {
  const mapped = { ...params }
  if (mapped.category) {
    mapped.test_category = mapped.category
    delete mapped.category
  }
  const query = buildQuery(mapped, { date: 'date_filter' })
  const data = await http(`/results${query}`)
  return Array.isArray(data?.items) ? data.items : []
}

export async function getReports(params = {}) {
  const mapped = { ...params }
  if (mapped.type) {
    mapped.report_type = mapped.type
    delete mapped.type
  }
  const query = buildQuery(mapped, { date: 'date_filter' })
  const data = await http(`/reports${query}`)
  return Array.isArray(data?.items) ? data.items : []
}

export async function getReportById(id) {
  return await http(`/reports/${encodeURIComponent(id)}`)
}

export async function getReportResults(id) {
  return await http(`/reports/${encodeURIComponent(id)}/results`)
}

export async function getDashboardSummary() {
  return await http('/dashboard/summary')
}

// Lab Patients API
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
  const response = await http(`/patients/${encodeURIComponent(id)}`)
  console.log('[labService] getPatientById response:', response)
  console.log('[labService] response.data:', response?.data)
  console.log('[labService] response.data keys:', response?.data ? Object.keys(response.data) : [])
  return response
}

export async function createReport(reportData) {
  // Use the new endpoint that handles test results
  return await http('/reports/with-tests', { method: 'POST', body: reportData })
}

// Lab Settings API
export async function getSettings() {
  return await http('/settings')
}

export async function replaceSettings(envelope) {
  return await http('/settings', { method: 'PUT', body: envelope })
}

export async function patchSettings(patch) {
  return await http('/settings', { method: 'PATCH', body: patch })
}

export async function getGeneralSettings() {
  return await http('/settings/general')
}

export async function replaceGeneralSettings(data) {
  return await http('/settings/general', { method: 'PUT', body: data })
}

export async function patchGeneralSettings(patch) {
  return await http('/settings/general', { method: 'PATCH', body: patch })
}

export async function getSystemSettings() {
  return await http('/settings/system')
}

export async function replaceSystemSettings(data) {
  return await http('/settings/system', { method: 'PUT', body: data })
}

export async function patchSystemSettings(patch) {
  return await http('/settings/system', { method: 'PATCH', body: patch })
}

export async function getNotificationSettings() {
  return await http('/settings/notifications')
}

export async function replaceNotificationSettings(data) {
  return await http('/settings/notifications', { method: 'PUT', body: data })
}

export async function patchNotificationSettings(patch) {
  return await http('/settings/notifications', { method: 'PATCH', body: patch })
}

export async function getEquipmentSettings() {
  return await http('/settings/equipment')
}

export async function replaceEquipmentDefaults(data) {
  return await http('/settings/equipment/defaults', { method: 'PUT', body: data })
}

export async function patchEquipmentDefaults(patch) {
  return await http('/settings/equipment/defaults', { method: 'PATCH', body: patch })
}

export async function addInstrument(payload) {
  return await http('/settings/equipment/instruments', { method: 'POST', body: payload })
}

export async function replaceInstrument(instrumentId, payload) {
  return await http(`/settings/equipment/instruments/${encodeURIComponent(instrumentId)}`, { method: 'PUT', body: payload })
}

export async function patchInstrument(instrumentId, patch) {
  return await http(`/settings/equipment/instruments/${encodeURIComponent(instrumentId)}`, { method: 'PATCH', body: patch })
}

export async function deleteInstrument(instrumentId) {
  return await http(`/settings/equipment/instruments/${encodeURIComponent(instrumentId)}`, { method: 'DELETE' })
}

export async function getUserSettings() {
  return await http('/settings/users')
}

export async function getIntegrationSettings() {
  return await http('/settings/integrations')
}

// Profile functions
export async function getProfile() {
  return http('/profile', {
    method: 'GET',
  });
}

export async function updateProfile(profileData) {
  return http('/profile', {
    method: 'PUT',
    body: { profileData },
  });
}

export async function patchProfile(profileData) {
  return http('/profile', {
    method: 'PATCH',
    body: { profileData },
  });
}

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  return http('/profile/password', {
    method: 'POST',
    body: { currentPassword, newPassword, confirmPassword },
  });
}

// Messaging API (staff-only)
export const messagesAPI = {
  // Send message to staff member
  send: async (payload) => {
    return http('/messages/send', {
      method: 'POST',
      body: payload,
    });
  },

  // Upload attachment
  uploadAttachment: async (file, recipientId, clinicId) => {
    const formData = new FormData();
    formData.append('file', file);
    const queryParams = new URLSearchParams({ recipient_id: recipientId, clinic_id: clinicId }).toString();
    return http(`/messages/upload-attachment?${queryParams}`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },

  // Get unread messages
  getUnread: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/unread${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get staff members for messaging
  getStaff: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/staff${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get conversation messages
  getConversationMessages: async (recipientId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/conversations/${recipientId}/messages${queryParams ? `?${queryParams}` : ''}`);
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

  // Delete message
  deleteMessage: async (messageId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return http(`/messages/messages/${messageId}${queryParams ? `?${queryParams}` : ''}`, {
      method: 'DELETE',
    });
  },
};

export default {
  getOrders,
  getOrderById,
  updateOrderStatus,
  submitOrderResults,
  getResults,
  getReports,
  getDashboardSummary,
  // profile
  getProfile,
  updateProfile,
  patchProfile,
  changePassword,
  // settings
  getSettings,
  replaceSettings,
  patchSettings,
  getGeneralSettings,
  replaceGeneralSettings,
  patchGeneralSettings,
  getSystemSettings,
  replaceSystemSettings,
  patchSystemSettings,
  getNotificationSettings,
  replaceNotificationSettings,
  patchNotificationSettings,
  getEquipmentSettings,
  replaceEquipmentDefaults,
  patchEquipmentDefaults,
  addInstrument,
  replaceInstrument,
  patchInstrument,
  deleteInstrument,
  getUserSettings,
  getIntegrationSettings,
  // messaging
  messagesAPI,
}


