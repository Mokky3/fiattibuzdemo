// Radiology service wired to backend API (FastAPI)

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';

// Handle the case where VITE_API_URL already includes /api/v1
const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const err = await response.json();
      errorDetail = err?.detail || err?.error || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }
  return response.json();
};

const apiGet = async (endpoint) => {
  // Remove /api/v1 from endpoint if it's already in API_BASE
  const cleanEndpoint = endpoint.startsWith('/api/v1') ? endpoint.substring(7) : endpoint;
  const url = `${API_BASE}${cleanEndpoint}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse(res);
};

const apiSend = async (endpoint, method, body) => {
  // Remove /api/v1 from endpoint if it's already in API_BASE
  const cleanEndpoint = endpoint.startsWith('/api/v1') ? endpoint.substring(7) : endpoint;
  const url = `${API_BASE}${cleanEndpoint}`;
  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
};

export async function getWorklistStudies(filters = {}) {
  const params = new URLSearchParams();
  if (filters.modality && filters.modality !== 'all') params.append('modality', filters.modality);
  if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
  if (filters.bodyPart && filters.bodyPart !== 'all') params.append('body_part', filters.bodyPart);
  if (filters.physician && filters.physician !== 'all') params.append('physician', filters.physician);
  if (filters.readingStatus && filters.readingStatus !== 'all') params.append('status', filters.readingStatus);
  params.append('time_range', filters.timeRange || 'today');
  params.append('sort_by', filters.sortBy || 'priority');
  params.append('sort_order', filters.sortOrder || 'desc');
  params.append('page', filters.page || '1');
  params.append('size', filters.size || '200');

  const res = await apiGet(`/api/v1/radiology/worklist?${params.toString()}`);
  const data = res?.data || res; // SuccessResponse wrapper or raw
  // Expecting { items, total, page, size, summary }
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  // Fallback if backend returns array directly
  return Array.isArray(data) ? data : [];
}

export async function getStudyById(id) {
  const res = await apiGet(`/api/v1/radiology/worklist/${encodeURIComponent(id)}`);
  return res?.data || res || null;
}

export async function updateStudyStatus(id, status, preliminaryFindings = null) {
  const payload = { readingStatus: status };
  if (preliminaryFindings !== null) payload.preliminaryFindings = preliminaryFindings;
  const res = await apiSend(`/api/v1/radiology/worklist/${encodeURIComponent(id)}/reading-status`, 'POST', payload);
  return res?.data || res;
}

export async function assignStudy(id) {
  const res = await apiSend(`/api/v1/radiology/worklist/${encodeURIComponent(id)}/assign`, 'POST', {});
  return res?.data || res;
}

// Dashboard-specific functions
export async function getDashboardSummary() {
  const res = await apiGet('/api/v1/radiology/dashboard/summary');
  return res?.data || res || {};
}

export async function getWorklistStats() {
  const res = await apiGet('/api/v1/radiology/worklist/stats');
  return res?.data || res || {};
}

export async function getRecentActivity() {
  const res = await apiGet('/api/v1/radiology/dashboard/activity');
  return res?.data || res || [];
}

// Studies-specific functions
export async function getStudies(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.modality && filters.modality !== 'all') params.append('modality', filters.modality);
  if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
  if (filters.search) params.append('search', filters.search);
  if (filters.patientId) params.append('patient_id', filters.patientId);
  if (filters.scheduledFrom) params.append('scheduled_from', filters.scheduledFrom);
  if (filters.scheduledTo) params.append('scheduled_to', filters.scheduledTo);
  params.append('page', filters.page || '1');
  params.append('size', filters.size || '50');

  const res = await apiGet(`/api/v1/radiology/studies?${params.toString()}`);
  return res?.data || res || { items: [], total: 0, page: 1, size: 50, summary: {} };
}

export async function getStudyDetailsById(id) {
  const res = await apiGet(`/api/v1/radiology/studies/${encodeURIComponent(id)}`);
  return res?.data || res || null;
}

export async function createStudy(studyData) {
  const res = await apiSend('/api/v1/radiology/studies', 'POST', studyData);
  return res?.data || res;
}

export async function updateStudy(id, studyData) {
  const res = await apiSend(`/api/v1/radiology/studies/${encodeURIComponent(id)}`, 'PATCH', studyData);
  return res?.data || res;
}

export async function deleteStudy(id) {
  const res = await apiSend(`/api/v1/radiology/studies/${encodeURIComponent(id)}`, 'DELETE');
  return res?.data || res;
}

export async function getStudyStats() {
  const res = await apiGet('/api/v1/radiology/studies/stats');
  return res?.data || res || {};
}

export async function uploadDicomStudy(formData) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const API_VERSION = '/api/v1';
  const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`;
  
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}/radiology/studies/upload-dicom`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const err = await res.json();
      errorDetail = err?.detail || err?.error || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }
  
  const data = await res.json();
  return data?.data || data;
}

// Templates-specific functions
export async function getTemplates(filters = {}) {
  const params = new URLSearchParams();
  if (filters.tab && filters.tab !== 'all') params.append('tab', filters.tab);
  if (filters.modality && filters.modality !== 'all') params.append('modality', filters.modality);
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.author && filters.author !== 'all') params.append('author', filters.author);
  if (filters.search) params.append('search', filters.search);
  if (filters.favorite !== undefined) params.append('favorite', filters.favorite);
  if (filters.private !== undefined) params.append('private', filters.private);
  params.append('page', filters.page || '1');
  params.append('size', filters.size || '50');

  const res = await apiGet(`/api/v1/radiology/templates?${params.toString()}`);
  return res?.data || res || { items: [], total: 0, page: 1, size: 50, summary: {} };
}

export async function getTemplateById(id) {
  const res = await apiGet(`/api/v1/radiology/templates/${encodeURIComponent(id)}`);
  return res?.data || res || null;
}

export async function createTemplate(templateData) {
  const res = await apiSend('/api/v1/radiology/templates', 'POST', templateData);
  return res?.data || res;
}

export async function updateTemplate(id, templateData) {
  const res = await apiSend(`/api/v1/radiology/templates/${encodeURIComponent(id)}`, 'PATCH', templateData);
  return res?.data || res;
}

export async function deleteTemplate(id) {
  const res = await apiSend(`/api/v1/radiology/templates/${encodeURIComponent(id)}`, 'DELETE');
  return res?.data || res;
}

export async function duplicateTemplate(id, duplicateData) {
  const res = await apiSend(`/api/v1/radiology/templates/${encodeURIComponent(id)}/duplicate`, 'POST', duplicateData);
  return res?.data || res;
}

export async function updateTemplateUsage(id, usageData) {
  const res = await apiSend(`/api/v1/radiology/templates/${encodeURIComponent(id)}/usage`, 'POST', usageData);
  return res?.data || res;
}

export async function getTemplateStats() {
  const res = await apiGet('/api/v1/radiology/templates/stats');
  return res?.data || res || {};
}

// PACS-specific functions
export async function getPACSViewer(studyId) {
  const res = await apiGet(`/api/v1/radiology/pacs/viewer/${encodeURIComponent(studyId)}`);
  return res?.data || res || null;
}

export async function getPACSStudies(filters = {}) {
  const params = new URLSearchParams();
  if (filters.modality && filters.modality !== 'all') params.append('modality', filters.modality);
  if (filters.bodyPart && filters.bodyPart !== 'all') params.append('bodyPart', filters.bodyPart);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);
  params.append('page', filters.page || '1');
  params.append('size', filters.size || '50');

  const res = await apiGet(`/api/v1/radiology/pacs/studies?${params.toString()}`);
  return res?.data || res || { items: [], total: 0, page: 1, size: 50 };
}

export async function getPACSStudyDetails(studyId) {
  const res = await apiGet(`/api/v1/radiology/pacs/studies/${encodeURIComponent(studyId)}`);
  return res?.data || res || null;
}

export async function getPACSSeries(studyId) {
  const res = await apiGet(`/api/v1/radiology/pacs/studies/${encodeURIComponent(studyId)}/series`);
  return res?.data || res || [];
}

export async function getPACSImages(studyId, seriesId) {
  const res = await apiGet(`/api/v1/radiology/pacs/studies/${encodeURIComponent(studyId)}/series/${encodeURIComponent(seriesId)}/images`);
  return res?.data || res || [];
}

export async function getPACSImage(studyId, seriesId, imageId) {
  const res = await apiGet(`/api/v1/radiology/pacs/studies/${encodeURIComponent(studyId)}/series/${encodeURIComponent(seriesId)}/images/${encodeURIComponent(imageId)}`);
  return res?.data || res || null;
}

export async function savePACSAnnotations(studyId, seriesId, imageId, annotations) {
  const res = await apiSend(`/api/v1/radiology/pacs/studies/${encodeURIComponent(studyId)}/series/${encodeURIComponent(seriesId)}/images/${encodeURIComponent(imageId)}/annotations`, 'POST', annotations);
  return res?.data || res;
}

export async function getPACSAnnotations(studyId, seriesId, imageId) {
  const res = await apiGet(`/api/v1/radiology/pacs/studies/${encodeURIComponent(studyId)}/series/${encodeURIComponent(seriesId)}/images/${encodeURIComponent(imageId)}/annotations`);
  return res?.data || res || [];
}

export async function getPACSStats() {
  const res = await apiGet('/api/v1/radiology/pacs/stats');
  return res?.data || res || {};
}

// Radiologist Profile functions
export async function getRadiologistProfile() {
  const res = await apiGet('/api/v1/radiology/profile');
  return res?.data || res || null;
}

export async function updateRadiologistProfile(profileData) {
  // Backend expects { profileData: {...} } structure
  const payload = { profileData };
  const res = await apiSend('/api/v1/radiology/profile', 'PATCH', payload);
  // Backend returns envelope with profileData, statsData, activityData
  return res?.data || res;
}

export async function changeRadiologistPassword(passwordData) {
  const res = await apiSend('/api/v1/radiology/profile/password', 'POST', passwordData);
  return res?.data || res;
}

export async function getRadiologistStats() {
  const res = await apiGet('/api/v1/radiology/profile/stats');
  return res?.data || res || {};
}

export async function getRadiologistActivity() {
  const res = await apiGet('/api/v1/radiology/profile/activity');
  return res?.data || res || [];
}

export async function updateRadiologistPreferences(preferences) {
  const res = await apiSend('/api/v1/radiology/profile/preferences', 'PATCH', preferences);
  return res?.data || res;
}

export async function updateRadiologistNotifications(notifications) {
  const res = await apiSend('/api/v1/radiology/profile/notifications', 'PATCH', notifications);
  return res?.data || res;
}

export async function updateRadiologistSecurity(security) {
  const res = await apiSend('/api/v1/radiology/profile/security', 'PATCH', security);
  return res?.data || res;
}

// General Settings functions
export async function getGeneralSettings() {
  const res = await apiGet('/api/v1/radiology/settings/general');
  // Backend returns GeneralSettings directly (not wrapped in SuccessResponse)
  return res || null;
}

export async function updateGeneralSettings(generalSettings) {
  const res = await apiSend('/api/v1/radiology/settings/general', 'PATCH', generalSettings);
  // Backend returns GeneralSettings directly (not wrapped in SuccessResponse)
  return res;
}

// Notification Settings functions
export async function getNotificationSettings() {
  const res = await apiGet('/api/v1/radiology/settings/notifications');
  // Backend returns NotificationSettings directly (not wrapped in SuccessResponse)
  return res || null;
}

export async function updateNotificationSettings(notificationSettings) {
  const res = await apiSend('/api/v1/radiology/settings/notifications', 'PATCH', notificationSettings);
  // Backend returns NotificationSettings directly (not wrapped in SuccessResponse)
  return res;
}

// Patient Search functions
export async function searchPatients(query, limit = 10) {
  if (!query || query.length < 2) {
    return [];
  }
  const params = new URLSearchParams({ q: query, limit: limit.toString() });
  const res = await apiGet(`/api/v1/radiology/studies/patients/search?${params.toString()}`);
  // Backend returns array directly
  return res || [];
}

export async function getWorklistCollection(filters = {}) {
  const params = new URLSearchParams();
  if (filters.modality && filters.modality !== 'all') params.append('modality', filters.modality);
  if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
  if (filters.bodyPart && filters.bodyPart !== 'all') params.append('body_part', filters.bodyPart);
  if (filters.physician && filters.physician !== 'all') params.append('physician', filters.physician);
  if (filters.readingStatus && filters.readingStatus !== 'all') params.append('status', filters.readingStatus);
  if (filters.search) params.append('search', filters.search);
  params.append('time_range', filters.timeRange || 'today');
  params.append('sort_by', filters.sortBy || 'priority');
  params.append('sort_order', filters.sortOrder || 'desc');
  params.append('page', filters.page || '1');
  params.append('size', filters.size || '200');

  const res = await apiGet(`/api/v1/radiology/worklist?${params.toString()}`);
  return res?.data || res || { items: [], total: 0, page: 1, size: 200, summary: {} };
}

export default {
  getWorklistStudies,
  getStudyById,
  updateStudyStatus,
  assignStudy,
  getDashboardSummary,
  getWorklistStats,
  getWorklistCollection,
  getRecentActivity,
  getStudies,
  getStudyDetailsById,
  createStudy,
  updateStudy,
  deleteStudy,
  getStudyStats,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  updateTemplateUsage,
  getTemplateStats,
  getPACSViewer,
  getPACSStudies,
  getPACSStudyDetails,
  getPACSSeries,
  getPACSImages,
  getPACSImage,
  savePACSAnnotations,
  getPACSAnnotations,
  getPACSStats,
  getRadiologistProfile,
  updateRadiologistProfile,
  changeRadiologistPassword,
  getRadiologistStats,
  getRadiologistActivity,
  updateRadiologistPreferences,
  updateRadiologistNotifications,
  updateRadiologistSecurity,
};