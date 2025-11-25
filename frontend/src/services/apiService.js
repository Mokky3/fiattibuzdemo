// src/services/apiService.js
// Unified API service for Medical Dashboard - FastAPI Backend Integration

import { useState } from 'react';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';
const API_BASE = API_BASE_URL.endsWith(API_VERSION) ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`;

// Utility functions
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  console.log('[API] getAuthHeaders - token exists:', !!token);
  console.log('[API] getAuthHeaders - token preview:', token ? token.substring(0, 20) + '...' : 'null');
  
  // Ensure token is a valid string
  const validToken = token && typeof token === 'string' && token.trim().length > 0;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(validToken && { 'Authorization': `Bearer ${token.trim()}` })
  };
  
  console.log('[API] getAuthHeaders - final headers:', {
    ...headers,
    Authorization: headers.Authorization ? headers.Authorization.substring(0, 30) + '...' : 'none'
  });
  
  return headers;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!(token && user);
};

// Get current user info
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

const handleResponse = async (response, isLoginRequest = false) => {
  if (!response.ok) {
    let error;
    try {
      const text = await response.text();
      console.error(`[API] Error response body (raw):`, text);
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(text);
        // If it's a JSON string (e.g., "Doctor is not associated with a clinic"), wrap it
        if (typeof parsed === 'string') {
          error = { detail: parsed };
        } 
        // If it's a JSON object (e.g., {"detail": "..."})
        else if (typeof parsed === 'object' && parsed !== null) {
          error = parsed;
        }
        else {
          error = { detail: String(parsed) };
        }
      } catch (jsonError) {
        // Not valid JSON, treat as plain text
        if (text && text.trim()) {
          error = { detail: text.trim() };
        } else {
          error = { detail: 'An error occurred' };
        }
      }
      console.error(`[API] Error response body (parsed):`, error);
    } catch (parseError) {
      // Fallback - create a basic error object
      error = { detail: `An error occurred (${response.status}: ${response.statusText})` };
      console.error(`[API] Failed to parse error response:`, parseError);
    }
    
    // Handle authentication errors - but not during login attempts
    // Only clear token for actual authentication failures, not permission errors
    if ((response.status === 401 || response.status === 403) && !isLoginRequest) {
      const errorDetail = error?.detail || error?.message || '';
      const isAuthError = 
        errorDetail.includes('Not authenticated') ||
        errorDetail.includes('Could not validate credentials') ||
        errorDetail.includes('Authentication required') ||
        errorDetail.includes('Invalid token') ||
        errorDetail.includes('Token expired') ||
        response.status === 401; // 401 always means auth failure
      
      // Only clear tokens for actual authentication failures, not permission/role errors
      if (isAuthError) {
        console.warn('[API] Authentication failed, clearing token:', errorDetail);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Check if we're in the patient, doctor, lab, or nurse portal and redirect to sign-in
        const currentPath = window.location.pathname;
        const isPatientPortal = 
          currentPath.startsWith('/patient/') ||
          currentPath.startsWith('/patients/') ||
          currentPath.includes('/patient') ||
          currentPath === '/patient' ||
          currentPath === '/patients';
        
        const isDoctorPortal = 
          currentPath.startsWith('/doctor/') ||
          currentPath.startsWith('/doctors/') ||
          currentPath.includes('/doctor') ||
          currentPath === '/doctor' ||
          currentPath === '/doctors';
        
        const isLabPortal = 
          currentPath.startsWith('/lab/') ||
          currentPath.startsWith('/labs/') ||
          currentPath.includes('/lab') ||
          currentPath === '/lab' ||
          currentPath === '/labs';
        
        const isNursePortal = 
          currentPath.startsWith('/nurse/') ||
          currentPath.startsWith('/nurses/') ||
          currentPath.includes('/nurse') ||
          currentPath === '/nurse' ||
          currentPath === '/nurses';
        
        if (isPatientPortal) {
          console.warn('[API] Patient portal authentication expired, redirecting to sign-in...');
          // Redirect to sign-in page immediately
          // Use setTimeout to ensure redirect happens after error is thrown
          setTimeout(() => {
            window.location.href = '/signin';
          }, 100);
        } else if (isDoctorPortal) {
          console.warn('[API] Doctor portal authentication expired, redirecting to sign-in...');
          // Redirect to sign-in page immediately
          // Use setTimeout to ensure redirect happens after error is thrown
          setTimeout(() => {
            window.location.href = '/signin';
          }, 100);
        } else if (isLabPortal) {
          console.warn('[API] Lab portal authentication expired, redirecting to sign-in...');
          // Redirect to sign-in page immediately
          // Use setTimeout to ensure redirect happens after error is thrown
          setTimeout(() => {
            window.location.href = '/signin';
          }, 100);
        } else if (isNursePortal) {
          console.warn('[API] Nurse portal authentication expired, redirecting to sign-in...');
          // Redirect to sign-in page immediately
          // Use setTimeout to ensure redirect happens after error is thrown
          setTimeout(() => {
            window.location.href = '/signin';
          }, 100);
        }
        
        throw new Error('Authentication required. Please log in.');
      } else {
        // Permission/role error - don't clear token, just throw the error
        console.warn('[API] Permission denied:', errorDetail);
        throw new Error(errorDetail || 'Access denied. Insufficient permissions.');
      }
    }
    
    // For login requests with 401/403, extract the specific error message
    if (isLoginRequest && (response.status === 401 || response.status === 403)) {
      const errorMessage = error.detail || error.message || error.error || 'Login failed';
      throw new Error(errorMessage);
    }
    
    // Handle validation errors (422)
    if (response.status === 422) {
      console.error('Validation error details:', error);
      const errorMessage = error.detail || error.message || JSON.stringify(error);
      throw new Error(`Validation error: ${errorMessage}`);
    }
    
    // Handle 400 errors with detailed message
    if (response.status === 400) {
      console.error('Bad request error details:', error);
      let errorMessage;
      
      // If detail is a string, use it directly
      if (typeof error.detail === 'string' && error.detail.trim()) {
        errorMessage = error.detail.trim();
      }
      // If the error itself is a string (plain text response)
      else if (typeof error === 'string' && error.trim()) {
        errorMessage = error.trim();
      }
      // If detail is an array (validation errors), format it nicely
      else if (Array.isArray(error.detail)) {
        const validationErrors = error.detail.map(e => {
          const field = e.loc ? e.loc.join('.') : 'unknown';
          return `${field}: ${e.msg}`;
        }).join('; ');
        errorMessage = `Validation error: ${validationErrors}`;
      }
      // If detail is an object with nested structure
      else if (error.detail && typeof error.detail === 'object') {
        errorMessage = error.detail.detail || error.detail.message || JSON.stringify(error.detail);
      }
      // Fallback - try to extract any message from the error object
      else {
        errorMessage = error.detail || error.message || error.error || (typeof error === 'string' ? error : JSON.stringify(error)) || `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error(`[API] Extracted error message:`, errorMessage);
      throw new Error(errorMessage);
    }
    
    // Handle other errors
    let errorMessage = error.detail || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`;
    
    // If detail is an array (validation errors), format it nicely
    if (Array.isArray(error.detail)) {
      const validationErrors = error.detail.map(e => {
        const field = e.loc ? e.loc.join('.') : 'unknown';
        return `${field}: ${e.msg}`;
      }).join('; ');
      errorMessage = `Validation error: ${validationErrors}`;
    }
    
    throw new Error(errorMessage);
  }
  
  // Handle 204 No Content responses (like password changes)
  if (response.status === 204) {
    return { success: true };
  }
  
  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return { success: true };
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return { success: true, message: 'Operation completed successfully' };
  }
};

// Generic API request function
export const apiRequest = async (endpoint, options = {}) => {
  const url = (endpoint.startsWith('/api/') || endpoint.startsWith('/api/v1/'))
    ? `${API_BASE_URL}${endpoint}`
    : `${API_BASE}${endpoint}`;
  
  // Get auth headers
  const authHeaders = getAuthHeaders();
  
  // Merge headers properly - options.headers takes precedence
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {}),
  };
  
  // Create config with merged headers
  const config = {
    ...options,
    headers: mergedHeaders,
  };

  console.log(`[API] Making request to: ${url}`);
  console.log(`[API] Request method: ${config.method || 'GET'}`);
  console.log(`[API] Request headers:`, config.headers);
  console.log(`[API] Token in headers:`, !!config.headers.Authorization);
  console.log(`[API] Token value:`, config.headers.Authorization ? config.headers.Authorization.substring(0, 30) + '...' : 'null');

  try {
    const response = await fetch(url, config);
    console.log(`[API] Response status: ${response.status}`);
    console.log(`[API] Response headers:`, Object.fromEntries(response.headers.entries()));
    return await handleResponse(response);
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await handleResponse(response, true); // Mark as login request
    
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },

  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');
    
    return apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  changePassword: async (oldPassword, newPassword) => {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
  },

  forgotPassword: async (email) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  validateEmail: async (email) => {
    return apiRequest('/auth/validate-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  validateResetCode: async (email, code) => {
    return apiRequest('/auth/validate-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  resetPassword: async (email, code, newPassword) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
        new_password: newPassword,
      }),
    });
  },
};

// Patient Public Auth API
export const patientAuthAPI = {
  login: async ({ usernameOrEmail, password }) => {
    const base = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
    const res = await fetch(`${base}/patient/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
    })
    const data = await handleResponse(res, true) // Mark as login request
    if (data?.access_token) {
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user || {}))
    }
    return data
  },
  register: async (payload) => {
    const base = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}${API_VERSION}`
    const res = await fetch(`${base}/patient/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleResponse(res)
  },
}

// Dashboard API - Enhanced for FastAPI integration
export const dashboardAPI = {
  // Get appointments for dashboard
  getAppointments: async (date = null) => {
    try {
      // Use the new /all endpoint to get all appointments
      const response = await doctorAppointmentsAPI.listAll();
      const raw = response?.data ?? response;
      const allAppointments = Array.isArray(raw) ? raw : (raw?.data ?? []);
      
      // Filter appointments for the specified date
      if (date) {
        const filteredAppointments = allAppointments.filter(apt => apt.date === date);
        return filteredAppointments.map(apt => ({
          id: apt.id,
          date: apt.date,
          time: apt.time,
          patient: apt.patient,
          problem: apt.problem,
          description: apt.description,
          provider: apt.provider,
          status: apt.status,
        }));
      } else {
        // Return all appointments if no date specified
        return allAppointments.map(apt => ({
          id: apt.id,
          date: apt.date,
          time: apt.time,
          patient: apt.patient,
          problem: apt.problem,
          description: apt.description,
          provider: apt.provider,
          status: apt.status,
        }));
      }
    } catch (error) {
      console.error('Dashboard appointments error:', error);
      throw error;
    }
  },

  // Get messages for dashboard
  getMessages: async () => {
    try {
      const response = await apiRequest('/doctor/dashboard/messages');
      const messages = response?.data || response || [];
      return Array.isArray(messages) ? messages.map(msg => ({
        id: msg.id,
        name: msg.name || 'Unknown',
        lastMessage: msg.lastMessage || '',
        avatar: msg.avatar || (msg.name ? msg.name.split(' ').map(n => n[0]).join('') : 'U'),
        status: msg.unread ? 'unread' : 'read',
        created_at: msg.timestamp,
      })) : [];
    } catch (error) {
      console.error('Dashboard messages error:', error);
      throw error;
    }
  },

  // Get todos/pending tasks
  getTodos: async () => {
    try {
      const response = await apiRequest('/doctor/dashboard/todos');
      const todos = response?.data || response || [];
      return Array.isArray(todos) ? todos.map(todo => ({
        id: todo.id,
        description: todo.description,
        completed: todo.completed,
        priority: todo.priority,
        date: todo.date,
        provider: todo.provider || 'Current Doctor',
      })) : [];
    } catch (error) {
      console.error('Dashboard todos error:', error);
      throw error;
    }
  },

  // Toggle todo completion
  toggleTodo: async (todoId) => {
    return apiRequest(`/doctor/dashboard/todos/${todoId}`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  // Get dashboard statistics
  getSummary: async () => {
    return apiRequest('/doctor/stats');
  },
};

// Receptionist API (Dashboard, tasks, notifications)
export const receptionAPI = {
  getDashboard: async (date = null) => {
    const params = date ? `?date_filter=${encodeURIComponent(date)}` : '';
    return apiRequest(`/reception/dashboard${params}`);
  },
  getStats: async (date = null) => {
    const params = date ? `?date_filter=${encodeURIComponent(date)}` : '';
    return apiRequest(`/reception/stats${params}`);
  },
  getUpcoming: async (limit = 4, hoursAhead = 24) => {
    const params = new URLSearchParams({ limit, hours_ahead: hoursAhead }).toString();
    return apiRequest(`/reception/upcoming?${params}`);
  },
  getPending: async (limit = 50) => {
    const params = new URLSearchParams({ limit }).toString();
    return apiRequest(`/reception/pending?${params}`);
  },
  getPast: async (limit = 50) => {
    const params = new URLSearchParams({ limit }).toString();
    return apiRequest(`/reception/past?${params}`);
  },
  getAppointmentDetails: async (appointmentId) => {
    return apiRequest(`/reception/appointments/${appointmentId}`);
  },
  getDoctors: async () => {
    return apiRequest('/reception/doctors');
  },
  bookAppointment: async (appointmentData) => {
    return apiRequest('/reception/appointments/book', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },
  getTasks: async ({ completed = null, priority = null, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (completed !== null) params.append('completed', completed);
    if (priority) params.append('priority', priority);
    if (limit) params.append('limit', limit);
    const qs = params.toString();
    return apiRequest(`/reception/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: async (task) => {
    return apiRequest('/reception/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },
  updateTask: async (taskId, updates) => {
    return apiRequest(`/reception/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  deleteTask: async (taskId) => {
    return apiRequest(`/reception/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },
  getNotifications: async ({ unreadOnly = false, type = null, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unread_only', 'true');
    if (type) params.append('type_filter', type);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return apiRequest(`/reception/notifications${qs ? `?${qs}` : ''}`);
  },
  markNotificationRead: async (notificationId) => {
    return apiRequest(`/reception/notifications/${notificationId}/mark-read`, {
      method: 'POST',
    });
  },
  markAllNotificationsRead: async () => {
    return apiRequest('/reception/notifications/mark-all-read', {
      method: 'POST',
    });
  },
  getQuickActions: async () => {
    return apiRequest('/reception/quick-actions');
  },
  getQuickOverview: async (date = null) => {
    const params = date ? `?date_filter=${encodeURIComponent(date)}` : '';
    return apiRequest(`/reception/overview${params}`);
  },
  markPatientArrived: async (appointmentId) => {
    return apiRequest(`/reception/appointments/${appointmentId}/mark-arrived`, {
      method: 'POST',
    });
  },
  // Reception profile
    getProfile: async (clinicId = 'default-clinic') => {
      return apiRequest(`/reception/profile?clinic_id=${clinicId}`);
    },
  updateProfile: async (profileDto, clinicId = 'default-clinic') => {
    return apiRequest(`/reception/profile?clinic_id=${clinicId}`, {
      method: 'PUT',
      body: JSON.stringify(profileDto),
    });
  },
  changePassword: async ({ currentPassword, newPassword, confirmPassword }, clinicId = 'default-clinic') => {
    return apiRequest(`/reception/profile/password?clinic_id=${clinicId}`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },
  // Get recent activities
  getRecentActivities: async (limit = 10, hoursBack = 24) => {
    return apiRequest(`/reception/activity-feed?limit=${limit}&hours_back=${hoursBack}`);
  },
  // Registration & patient list/search
  listPatients: async ({ clinicId, page = 1, size = 50, search = '' } = {}) => {
    const params = new URLSearchParams({ clinic_id: clinicId, page, size })
    if (search) params.append('search', search)
    return apiRequest(`/reception/patients?${params.toString()}`)
  },
  getPatientsList: async (search = '') => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    return apiRequest(`/reception/patients/list?${params.toString()}`)
  },
  registerPatient: async (payload) => {
    return apiRequest('/reception/simple-register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  searchPatients: async ({ clinicId, q = '', pinfl = '', phone = '', page = 1, size = 20 } = {}) => {
    const params = new URLSearchParams({ clinic_id: clinicId, q, pinfl, phone, page, size })
    return apiRequest(`/reception/search?${params.toString()}`)
  },
  // Appointments module
  listAppointments: async ({ clinicId, patientId = '', doctorId = '', status = '', dateFrom = '', dateTo = '', page = 1, size = 100 } = {}) => {
    const params = new URLSearchParams({ clinic_id: clinicId, page, size })
    if (patientId) params.append('patient_id', patientId)
    if (doctorId) params.append('doctor_id', doctorId)
    if (status) params.append('status', status)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    return apiRequest(`/reception/appointments?${params.toString()}`)
  },
  createAppointment: async ({ clinicId, patientId, practitionerId, appointmentDate, appointmentTime, appointmentType, reason = '', description = '', priority = 'medium', duration = '30' }) => {
    const payload = {
      clinic_id: clinicId,
      patient_id: patientId,
      practitioner_id: practitionerId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_type: appointmentType,
      reason,
      description,
      priority,
      duration
    }
    return apiRequest('/reception/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  confirmAppointment: async ({ clinicId, appointmentId }) => {
    const params = new URLSearchParams({ clinic_id: clinicId })
    return apiRequest(`/reception/appointments/${appointmentId}/confirm?${params.toString()}`, { method: 'POST' })
  },
  cancelAppointment: async ({ clinicId, appointmentId, reason = '' }) => {
    const params = new URLSearchParams({ clinic_id: clinicId })
    if (reason) params.append('reason', reason)
    return apiRequest(`/reception/appointments/${appointmentId}/cancel?${params.toString()}`, { method: 'POST' })
  },
  deleteAppointment: async ({ clinicId, appointmentId }) => {
    const params = new URLSearchParams({ clinic_id: clinicId })
    return apiRequest(`/reception/appointments/${appointmentId}?${params.toString()}`, { method: 'DELETE' })
  },
};

// Appointments API - Full CRUD operations
export const appointmentsAPI = {
  // Get all appointments
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const appointments = await apiRequest(`/appointments${queryParams ? `?${queryParams}` : ''}`);
    
    return appointments.map(apt => ({
      id: apt.id,
      time: apt.appointment_time,
      date: apt.appointment_date,
      formattedDate: new Date(apt.appointment_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '.'),
      patient: apt.patient_name || 'Unknown Patient',
      problem: apt.appointment_type || 'General consultation',
      description: apt.notes || 'No description available',
      provider: `Dr. ${apt.doctor?.first_name} ${apt.doctor?.last_name}` || 'Current Doctor',
      status: apt.status,
      patient_id: apt.patient_id,
      doctor_id: apt.doctor_id,
      appointment_type: apt.appointment_type,
      notes: apt.notes
    }));
  },

  // Get appointment by ID
  getById: async (id) => {
    return apiRequest(`/appointments/${id}`);
  },

  // Create new appointment
  create: async (appointmentData) => {
    const backendData = {
      patient_id: appointmentData.patient_id,
      doctor_id: appointmentData.doctor_id,
      appointment_date: appointmentData.appointment_date,
      appointment_time: appointmentData.appointment_time,
      appointment_type: appointmentData.appointment_type,
      notes: appointmentData.notes,
      status: appointmentData.status || 'scheduled'
    };

    return apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  },

  // Update appointment
  update: async (id, appointmentData) => {
    return apiRequest(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  },

  // Update appointment status
  updateStatus: async (appointmentId, status) => {
    return apiRequest(`/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Delete appointment
  delete: async (id) => {
    return apiRequest(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  // Get appointments by status
  getByStatus: async (status) => {
    return apiRequest(`/appointments/status/${status}`);
  },

  // Get available time slots
  getAvailableSlots: async (date, doctorId) => {
    return apiRequest(`/appointments/available-slots?date=${date}&doctor_id=${doctorId}`);
  },
};

// Doctor Appointments API (Doctor portal specific)
export const doctorAppointmentsAPI = {
  // List all doctor appointments using simple endpoint
  listAll: async () => {
    try {
      const res = await apiRequest(`/doctor/appointments/all`);
      return res;
    } catch (error) {
      console.error('Failed to load appointments:', error);
      throw error;
    }
  },

  // Get comprehensive appointments with full relationship data
  getComprehensive: async () => {
    try {
      const res = await apiRequest(`/doctor/appointments/comprehensive`);
      return res;
    } catch (error) {
      console.error('Failed to load comprehensive appointments:', error);
      throw error;
    }
  },

  // List doctor appointments using enhanced endpoint (with pagination)
  list: async ({ clinicId, patientId = '', status = '', dateFrom = '', dateTo = '', page = 1, size = 100 } = {}) => {
    try {
      // Use enhanced appointments endpoint with pagination
      const params = new URLSearchParams({
        clinic_id: clinicId,
        page: page.toString(),
        size: size.toString()
      });
      
      if (patientId) params.append('patient_id', patientId);
      if (status) params.append('status', status);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const res = await apiRequest(`/doctor/appointments?${params}`);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      
      return list.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        patient_name: apt.patient,
        patient_id: apt.patient_id,
        problem: apt.problem || apt.appointment_type || 'General consultation',
        description: apt.description || apt.notes || '',
        status: apt.status,
        appointment_type: apt.appointment_type,
        notes: apt.description,
      }));
    } catch (error) {
      console.error('Failed to load appointments:', error);
      return [];
    }
  },

  // Get appointment by ID
  getById: async ({ clinicId, appointmentId }) => {
    const params = new URLSearchParams({ clinic_id: clinicId }).toString();
    const res = await apiRequest(`/doctor/appointments/${appointmentId}?${params}`);
    const data = res?.data ?? res;
    return data;
  },

  // Create new appointment
  create: async ({ clinic_id, patient_id, appointment_date, appointment_time, appointment_type, notes = '', priority = 'normal', duration_minutes = 30, is_virtual = false }) => {
    const payload = {
      clinic_id,
      patient_id,
      appointment_date,
      appointment_time,
      appointment_type,
      notes,
      priority,
      duration_minutes,
      is_virtual
    };
    console.log('[API] Creating appointment with payload:', payload);
    const res = await apiRequest('/doctor/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },

  // Confirm appointment
  confirm: async ({ clinicId, appointmentId }) => {
    const params = new URLSearchParams({ clinic_id: clinicId }).toString();
    const res = await apiRequest(`/doctor/appointments/${appointmentId}/confirm?${params}`, {
      method: 'POST',
    });
    return res?.data ?? res;
  },

  // Decline appointment
  decline: async ({ clinicId, appointmentId, reason = '' }) => {
    const params = new URLSearchParams({ clinic_id: clinicId });
    if (reason) params.append('reason', reason);
    const res = await apiRequest(`/doctor/appointments/${appointmentId}/decline?${params.toString()}`, {
      method: 'POST',
    });
    return res?.data ?? res;
  },

  // Complete appointment
  complete: async ({ clinicId, appointmentId, notes = '' }) => {
    const params = new URLSearchParams({ clinic_id: clinicId });
    if (notes) params.append('notes', notes);
    const res = await apiRequest(`/doctor/appointments/${appointmentId}/complete?${params.toString()}`, {
      method: 'POST',
    });
    return res?.data ?? res;
  },

  // Delete appointment
  delete: async ({ clinicId, appointmentId }) => {
    const params = new URLSearchParams({ clinic_id: clinicId }).toString();
    const res = await apiRequest(`/doctor/appointments/${appointmentId}?${params}`, {
      method: 'DELETE',
    });
    return res?.data ?? res;
  },

  // Check availability for date
  availability: async ({ clinicId, date }) => {
    const payload = { clinic_id: clinicId, date };
    const res = await apiRequest('/doctor/appointments/availability', {
      method: 'GET',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },
};

// Patients API - Enhanced for your patient management
export const patientsAPI = {
  // Get all patients
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const patients = await apiRequest(`/patients${queryParams ? `?${queryParams}` : ''}`);
    
    return patients.map(patient => ({
      id: patient.id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email || '',
      phone: patient.phone || '',
      date_of_birth: patient.date_of_birth,
      gender: patient.gender || 'unknown',
      address: patient.address || '',
      patient_code: patient.patient_code || `P${patient.id}`,
      blood_group: patient.blood_group || '',
      rh_factor: patient.rh_factor || '',
      height: patient.height || '',
      weight: patient.weight || '',
      bmi: patient.bmi || '',
      age: patient.age || calculateAge(patient.date_of_birth),
      temporary_address: patient.temporary_address || '',
      work_place: patient.work_place || '',
      occupation: patient.occupation || ''
    }));
  },

  // Get patient by ID
  getById: async (id) => {
    return apiRequest(`/patients/${id}`);
  },

  // Create new patient
  create: async (patientData) => {
    return apiRequest('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  // Update patient
  update: async (id, patientData) => {
    return apiRequest(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    });
  },

  // Search patients
  search: async (query) => {
    return apiRequest(`/patients/search?q=${encodeURIComponent(query)}`);
  },

  // Get patient reports
  getReports: async (patientId) => {
    const reports = await apiRequest(`/patients/${patientId}/reports`);
    
    return reports.map(report => ({
      id: report.id,
      time: report.time,
      date: report.date,
      patient_id: report.patient_id,
      doctor_id: report.doctor_id,
      problem: report.problem,
      description: report.description,
      doctor_name: report.doctor_name,
      diagnosis: report.diagnosis || '',
      treatment: report.treatment || '',
      created_at: report.created_at
    }));
  },

  // Get patient prescriptions
  getPrescriptions: async (patientId) => {
    const prescriptions = await apiRequest(`/patients/${patientId}/prescriptions`);
    
    return prescriptions.map(prescription => ({
      id: prescription.id,
      patient_id: prescription.patient_id,
      doctor_id: prescription.doctor_id,
      medication_name: prescription.medication_name,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      instructions: prescription.instructions || '',
      status: prescription.status,
      prescribed_date: prescription.prescribed_date,
      doctor_name: prescription.doctor_name || 'Current Doctor'
    }));
  },

  // Create prescription
  createPrescription: async (patientId, prescriptionData) => {
    return apiRequest(`/patients/${patientId}/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(prescriptionData),
    });
  },

  // Update prescription status
  updatePrescriptionStatus: async (prescriptionId, status) => {
    return apiRequest(`/prescriptions/${prescriptionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Delete prescription
  deletePrescription: async (prescriptionId) => {
    return apiRequest(`/prescriptions/${prescriptionId}`, {
      method: 'DELETE',
    });
  },
};

// Doctor Patients API (Doctor portal specific)
export const doctorPatientsAPI = {
  // List patients for doctor portal
  list: async () => {
    return apiRequest('/doctor/patients');
  },

  // Search patients
  search: async (query, limit = 10) => {
    const params = new URLSearchParams({ q: query, limit: limit.toString() }).toString();
    const res = await apiRequest(`/doctor/patients/search?${params}`);
    // Handle both {data: [...]} and direct array responses
    return res?.data || res || [];
  },

  // Get patient by ID
  getById: async (patientId) => {
    return apiRequest(`/doctor/patients/${patientId}`);
  },

  // Reports
  getReports: async (patientId) => {
    return apiRequest(`/doctor/patients/${patientId}/reports`);
  },
  deleteReport: async (reportId) => {
    return apiRequest(`/doctor/patients/reports/${reportId}`, { method: 'DELETE' });
  },

  // Prescriptions
  getPrescriptions: async (patientId) => {
    return apiRequest(`/doctor/patients/${patientId}/prescriptions`);
  },
  getAllergies: async (patientId) => {
    const res = await apiRequest(`/doctor/patients/${patientId}/allergies`);
    console.log('[API] getAllergies response:', res);
    // Handle SuccessResponse format: { data: [...], message: "..." }
    // or direct array: [...]
    if (res && res.data && Array.isArray(res.data)) {
      return res.data;
    } else if (Array.isArray(res)) {
      return res;
    } else {
      console.warn('[API] Unexpected allergies response format:', res);
      return [];
    }
  },
  getMedications: async (patientId, activeOnly = true) => {
    const params = new URLSearchParams({ active_only: activeOnly }).toString();
    const res = await apiRequest(`/doctor/patients/${patientId}/medications?${params}`);
    console.log('[API] getMedications response:', res);
    // Handle SuccessResponse format: { data: [...], message: "..." }
    // or direct array: [...]
    if (res && res.data && Array.isArray(res.data)) {
      return res.data;
    } else if (Array.isArray(res)) {
      return res;
    } else {
      console.warn('[API] Unexpected medications response format:', res);
      return [];
    }
  },
  getVitals: async (patientId) => {
    const res = await apiRequest(`/doctor/patients/${patientId}/vitals`);
    console.log('[API] getVitals response:', res);
    // Handle SuccessResponse format: { data: [...], message: "..." }
    // or direct array: [...]
    if (res && res.data && Array.isArray(res.data)) {
      return res.data;
    } else if (Array.isArray(res)) {
      return res;
    } else {
      console.warn('[API] Unexpected vitals response format:', res);
      return [];
    }
  },
  getImmunizations: async (patientId) => {
    const res = await apiRequest(`/doctor/patients/${patientId}/immunizations`);
    console.log('[API] getImmunizations response:', res);
    // Handle SuccessResponse format: { data: [...], message: "..." }
    // or direct array: [...]
    if (res && res.data && Array.isArray(res.data)) {
      return res.data;
    } else if (Array.isArray(res)) {
      return res;
    } else {
      console.warn('[API] Unexpected immunizations response format:', res);
      return [];
    }
  },
  createPrescription: async (patientId, payload) => {
    return apiRequest(`/doctor/prescriptions/patients/${patientId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updatePrescriptionStatus: async (prescriptionId, status) => {
    return apiRequest(`/doctor/prescriptions/${prescriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  deletePrescription: async (prescriptionId) => {
    return apiRequest(`/doctor/prescriptions/${prescriptionId}`, {
      method: 'DELETE',
    });
  },
};

// Medications API
export const medicationsAPI = {
  // Search medications
  search: async (query, limit = 20) => {
    if (!query || query.trim().length === 0) {
      return { products: [], total: 0 };
    }
    const params = new URLSearchParams({
      q: query.trim(),
      limit: limit.toString(),
    }).toString();
    return apiRequest(`/medications/search?${params}`);
  },
};

// Doctors API
export const doctorsAPI = {
  // Get all doctors
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctors${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get doctor by ID
  getById: async (id) => {
    return apiRequest(`/doctors/${id}`);
  },

  // Create new doctor
  create: async (doctorData) => {
    return apiRequest('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  },

  // Update doctor
  update: async (id, doctorData) => {
    return apiRequest(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(doctorData),
    });
  },

  // Get current doctor profile
  getProfile: async () => {
    return apiRequest('/doctor/profile');
  },

  // Update doctor profile
  updateProfile: async (profileData) => {
    return apiRequest('/doctor/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// Patient (self) API
export const patientAPI = {
  // Get current patient profile
  getProfile: async () => {
    // Disable caching and unwrap data envelope
    console.log('[API] Calling patientAPI.getProfile...');
    const res = await apiRequest('/patient', {
      cache: 'no-store',
    });
    console.log('[API] Raw response:', res);
    
    // Normalize API response - handle both envelope and direct response
    let patientData = res;
    if (res?.data) {
      patientData = res.data;
    } else if (res?.success && res?.data) {
      patientData = res.data;
    } else if (res?.message && res?.data) {
      patientData = res.data;
    }
    
    console.log('[API] Normalized patient data:', patientData);
    return patientData;
  },

  // Update demographics/profile
  updateProfile: async (profileUpdates) => {
    console.log('[API] Calling patientAPI.updateProfile with:', profileUpdates);
    const res = await apiRequest('/patient', {
      method: 'PATCH',
      body: JSON.stringify(profileUpdates),
    });
    console.log('[API] Update response:', res);
    
    // Normalize response
    let result = res;
    if (res?.data) {
      result = res.data;
    } else if (res?.success && res?.data) {
      result = res.data;
    } else if (res?.message && res?.data) {
      result = res.data;
    }
    
    console.log('[API] Normalized update result:', result);
    return result;
  },
};

// Patient Medical History API
export const patientMedicalHistoryAPI = {
  // Get medical history
  get: async () => {
    console.log('[API] Calling patientMedicalHistoryAPI.get...');
    const res = await apiRequest('/patient/medical-history', {
      cache: 'no-store',
    });
    console.log('[API] Medical history response:', res);
    
    // Normalize API response
    let data = res;
    if (res?.data) {
      data = res.data;
    } else if (res?.success && res?.data) {
      data = res.data;
    } else if (res?.message && res?.data) {
      data = res.data;
    }
    
    console.log('[API] Normalized medical history data:', data);
    return data;
  },

  // Update medical history
  update: async (updates) => {
    console.log('[API] Calling patientMedicalHistoryAPI.update with:', updates);
    const res = await apiRequest('/patient/medical-history', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    console.log('[API] Medical history update response:', res);
    
    // Normalize response
    let result = res;
    if (res?.data) {
      result = res.data;
    } else if (res?.success && res?.data) {
      result = res.data;
    } else if (res?.message && res?.data) {
      result = res.data;
    }
    
    console.log('[API] Normalized medical history update result:', result);
    return result;
  },
};

// Doctor Settings API
export const doctorSettingsAPI = {
  // Get all settings
  getSettings: async () => {
    try {
      const response = await apiRequest('/doctor/settings');
      const settings = response.data || response;
      
      return {
        notifications: settings.notifications || {},
        security: settings.security || {},
        availability: settings.availability || {}
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw error;
    }
  },

  // Save profile settings (use profile endpoint)
  saveProfile: async (profileData) => {
    return apiRequest('/doctor/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Save notification settings
  saveNotifications: async (notificationData) => {
    const response = await apiRequest('/doctor/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(notificationData),
    });
    return response.data || response;
  },

  // Save security settings (without password fields)
  saveSecurity: async (securityData) => {
    // Remove password fields from security data
    const { currentPassword, newPassword, confirmPassword, ...cleanSecurityData } = securityData;
    
    const response = await apiRequest('/doctor/settings/security', {
      method: 'PUT',
      body: JSON.stringify(cleanSecurityData),
    });
    return response.data || response;
  },

  // Save availability settings
  saveAvailability: async (availabilityData) => {
    const response = await apiRequest('/doctor/settings/availability', {
      method: 'PUT',
      body: JSON.stringify(availabilityData),
    });
    return response.data || response;
  },

  // Change password
  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    return apiRequest('/doctor/settings/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },

  // Upload profile image
  uploadProfileImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/doctor/profile/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });

    return handleResponse(response);
  },
};

// Patient Settings API
export const patientSettingsAPI = {
  // Get settings blob
  getSettings: async () => {
    const res = await apiRequest('/patient/settings');
    return res?.data ?? res;
  },

  // Save settings blob
  saveSettings: async (settingsBlob) => {
    const res = await apiRequest('/patient/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsBlob),
    });
    return res?.data ?? res;
  },

  // Export patient data
  exportData: async (payload) => {
    const res = await apiRequest('/patient/export', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },

  // Delete account
  deleteAccount: async (payload) => {
    const res = await apiRequest('/patient/erase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },

  // Change password
  changePassword: async ({ current, new: next, confirm }) => {
    return apiRequest('/patient/security/change-password', {
      method: 'POST',
      body: JSON.stringify({ current, new: next, confirm }),
    });
  },

  // Sessions
  listSessions: async () => {
    const res = await apiRequest('/patient/security/sessions');
    return res?.data ?? res;
  },
  endSession: async (sessionId) => {
    return apiRequest(`/patient/security/sessions/${sessionId}`, { method: 'DELETE' });
  },
};

// Medical Reports API
export const medicalReportsAPI = {
  // Get report by appointment ID
  getByAppointment: async (appointmentId) => {
    const response = await apiRequest(`/medical-reports/appointment/${appointmentId}`);
    // Unwrap SuccessResponse data field
    const report = response?.data || response;
    
    return {
      id: report.id,
      doctor: {
        name: report.doctor_info?.name || report.doctor?.name || 'Current Doctor',
        specialty: report.doctor_info?.specialty || report.doctor?.specialty || 'General Medicine',
        department: report.doctor_info?.department || report.doctor?.department || 'General'
      },
      date: report.date,
      specialty: report.specialty, // Include specialty from backend
      doc_type: report.doc_type, // Include doc_type from backend
      chiefComplaint: report.chiefComplaint || report.chief_complaint || '',
      historyOfPresentIllness: report.historyOfPresentIllness || report.history_of_present_illness || '',
      physicalExamination: report.physicalExamination || report.physical_examination || '',
      diagnosis: report.diagnosis || '',
      treatmentPlan: report.treatmentPlan || report.treatment_plan || '',
      additionalNotes: report.additionalNotes || report.additional_notes || '',
      medications: report.medications?.map(med => ({
        name: med.name,
        dosage: med.dosage || 'As directed',
        frequency: med.frequency || 'As needed',
        duration: med.duration || 'Until finished'
      })) || [],
      followUp: {
        date: report.followUp?.date || report.follow_up?.date || '',
        reason: report.followUp?.reason || report.follow_up?.reason || ''
      },
      // CRITICAL: Include reportData for specialty-specific reports (ophthalmology, etc.)
      reportData: report.reportData || {}
    };
  },

  // Create new medical report
  create: async (reportData) => {
    return apiRequest('/medical-reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },

  // Update medical report
  update: async (reportId, reportData) => {
    return apiRequest(`/medical-reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(reportData),
    });
  },

  // Get reports by patient
  getByPatient: async (patientId) => {
    return apiRequest(`/medical-reports/patient/${patientId}`);
  },

  // Delete report
  delete: async (reportId) => {
    return apiRequest(`/medical-reports/${reportId}`, {
      method: 'DELETE',
    });
  },
};

// Doctor Reports API (Doctor portal specific)
export const doctorReportsAPI = {
  // Create report
  create: async ({ patientId, specialty, code, data, clinicId }) => {
    // Sanitize data to remove circular references and non-serializable objects
    const sanitize = (obj, visited = new WeakSet()) => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj === 'function') return null;
      if (typeof obj !== 'object') return obj;
      
      // Handle circular references
      if (visited.has(obj)) return null;
      visited.add(obj);
      
      // Handle Window and global objects (global doesn't exist in browser, only window)
      if (obj === window || obj === self || obj === globalThis) {
        return null;
      }
      
      // Handle DOM elements
      if (obj instanceof HTMLElement || obj instanceof Node || (obj.nodeType !== undefined && obj.nodeType !== null)) {
        return null;
      }
      
      // Handle React elements and fibers
      if (obj.$$typeof || obj._owner || obj.__reactFiber || obj.stateNode) {
        return null;
      }
      
      // Handle Date
      if (obj instanceof Date) return obj.toISOString();
      
      try {
        if (Array.isArray(obj)) {
          return obj.map(item => sanitize(item, visited)).filter(item => item !== null);
        }
        const sanitized = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            // Skip React internal properties
            if (key.startsWith('__react') || key.startsWith('__') || key === 'stateNode' || key === 'ref' || key === '_owner') {
              continue;
            }
            const value = sanitize(obj[key], visited);
            if (value !== null) {
              sanitized[key] = value;
            }
          }
        }
        return sanitized;
      } catch (e) {
        console.warn('Failed to sanitize object:', e);
        return null;
      }
    };
    
    const sanitizedData = sanitize(data);
    
    const payload = {
      patient_id: patientId,
      specialty,
      code,
      data: sanitizedData,
      clinic_id: clinicId,
    };
    
    const res = await apiRequest('/doctor/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },

  // Get report details
  getById: async (reportId) => {
    const res = await apiRequest(`/doctor/reports/${reportId}`);
    return res?.data ?? res;
  },
};

// Patient Prescriptions API
export const patientPrescriptionsAPI = {
  list: async ({ scope = 'active', page = 1, size = 20 } = {}) => {
    const params = new URLSearchParams({ scope, page, size }).toString();
    const res = await apiRequest(`/patient/prescriptions?${params}`);
    const data = res?.data ?? res?.items ?? res;
    const total = res?.total ?? res?.meta?.total ?? (Array.isArray(data) ? data.length : 0);
    const items = (Array.isArray(data) ? data : []).map((p) => ({
      id: p.id,
      medicineName: p.medicine_name || p.medicineName,
      knownAs: p.known_as || p.knownAs,
      description: p.description || '',
      prescribedDate: p.prescribed_date || p.prescribedDate,
      endDate: p.end_date || p.endDate,
      prescribedBy: p.prescribed_by || p.prescribedBy,
      hospital: p.hospital || '',
      refillInfo: p.total_refills ? `${p.total_refills} times` : '',
      remainingRefills: p.remaining_refills ?? 0,
      totalRefills: p.total_refills ?? 0,
      dosage: p.dosage || '',
      frequency: p.frequency || '',
      purpose: p.description || '',
      status: p.status || 'active',
      price: p.price || '',
    }));
    return { items, total };
  },

  requestRefill: async ({ prescriptionId, reason = '', urgent = false, pharmacyId = '' }) => {
    const res = await apiRequest(`/patient/prescriptions/${prescriptionId}/refill`, {
      method: 'POST',
      body: JSON.stringify({ reason, urgent, pharmacy_id: pharmacyId }),
    });
    return res?.data ?? res;
  },
};

// Patient Doctor Search API
// Doctor Imaging API - Medical imaging (OHIF/DICOM) for doctors
export const doctorImagingAPI = {
  // Get OHIF viewer URL for a specific study
  getViewerUrl: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.study_id) queryParams.append('study_id', params.study_id);
      if (params.study_instance_uid) queryParams.append('study_instance_uid', params.study_instance_uid);
      if (params.patient_id) queryParams.append('patient_id', params.patient_id);
      
      const response = await apiRequest(`/doctor/imaging/viewer?${queryParams.toString()}`);
      return response?.data || response;
    } catch (error) {
      console.error('Doctor imaging get viewer URL error:', error);
      throw error;
    }
  },

  // Get study details
  getStudyDetails: async (studyId) => {
    try {
      const response = await apiRequest(`/doctor/imaging/studies/${studyId}`);
      return response?.data || response;
    } catch (error) {
      console.error('Doctor imaging get study details error:', error);
      throw error;
    }
  },

  // List studies (optional patient filter)
  listStudies: async (patientId = null) => {
    try {
      const queryParams = patientId ? `?patient_id=${patientId}` : '';
      const response = await apiRequest(`/doctor/imaging/studies${queryParams}`);
      return response?.data || response;
    } catch (error) {
      console.error('Doctor imaging list studies error:', error);
      throw error;
    }
  },
};

// Patient Imaging API - Medical imaging (OHIF/DICOM) for patients
export const patientImagingAPI = {
  // Get OHIF viewer URL for a specific study
  getViewerUrl: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.study_id) queryParams.append('study_id', params.study_id);
      if (params.study_instance_uid) queryParams.append('study_instance_uid', params.study_instance_uid);
      
      const response = await apiRequest(`/patient/imaging/viewer?${queryParams.toString()}`);
      return response?.data || response;
    } catch (error) {
      console.error('Patient imaging get viewer URL error:', error);
      throw error;
    }
  },

  // Get study details
  getStudyDetails: async (studyId) => {
    try {
      const response = await apiRequest(`/patient/imaging/studies/${studyId}`);
      return response?.data || response;
    } catch (error) {
      console.error('Patient imaging get study details error:', error);
      throw error;
    }
  },

  // List patient's studies
  listStudies: async () => {
    try {
      const response = await apiRequest(`/patient/imaging/studies`);
      return response?.data || response;
    } catch (error) {
      console.error('Patient imaging list studies error:', error);
      throw error;
    }
  },
};

export const patientDoctorSearchAPI = {
  // Search doctors (backend doctorsearch_enhanced router)
  search: async ({ q = '', specialty = '', hospital = '', page = 1, size = 20 } = {}) => {
    const params = new URLSearchParams();
    if (q) params.append('full_name', q);
    if (specialty) params.append('specialty', specialty);
    if (hospital) params.append('hospital', hospital);
    params.append('limit', size);
    
    const res = await apiRequest(`/patient/search?${params.toString()}`);
    
    // Backend returns SuccessResponse with data = DoctorSearchResult { doctors: [...], ... }
    // So we need to access res.data.doctors
    let doctors = [];
    if (res?.data) {
      // Check if data is an object with doctors property (DoctorSearchResult)
      if (res.data.doctors && Array.isArray(res.data.doctors)) {
        doctors = res.data.doctors;
      } 
      // Or if data is directly an array
      else if (Array.isArray(res.data)) {
        doctors = res.data;
      }
    }
    // Fallback checks
    if (doctors.length === 0) {
      doctors = res?.doctors ?? res?.items ?? (Array.isArray(res) ? res : []);
    }
    
    return doctors;
  },

  // Book appointment directly (patient portal)
  bookAppointment: async ({ hospital, appointmentDate, appointmentTime, appointmentType, additionalNote = '', doctor_id = '' }) => {
    // Use the appointments router endpoint (not doctorsearch/appointments)
    return apiRequest('/patient/appointments', {
      method: 'POST',
      body: JSON.stringify({ 
        hospital, 
        appointmentDate, 
        appointmentTime, 
        appointmentType, 
        additionalNote: additionalNote || '', 
        doctor_id: doctor_id || '' 
      }),
    });
  },
};

// Patient Hospitals API (reads clinics list and maps to patient UI)
export const patientHospitalsAPI = {
  list: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await apiRequest(`/patient/hospitals${queryParams ? `?${queryParams}` : ''}`);
    const data = res?.data ?? res;
    return (Array.isArray(data) ? data : []).map((c) => ({
      id: c.id,
      name: c.name || 'Hospital',
      address: c.address || '',
      phone: c.phone || '',
      rating: c.rating || 4.7,
      type: c.type || c.hospital_type || 'General Hospital',
      established: c.established || '',
      beds: c.beds || '—',
      departments: c.departments || 0,
      doctors: c.doctors || 0,
    }));
  },

  departments: async (hospitalId) => {
    const res = await apiRequest(`/patient/hospitals/${hospitalId}/departments`);
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  doctors: async (hospitalId) => {
    const res = await apiRequest(`/patient/hospitals/${hospitalId}/doctors`);
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  departmentDoctors: async (hospitalId, departmentId) => {
    const res = await apiRequest(`/patient/hospitals/${hospitalId}/departments/${departmentId}/doctors`);
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
  },
};

// Patient Appointments API
export const patientAppointmentsAPI = {
  // List my appointments (upcoming or past)
  list: async (scope = 'upcoming') => {
    const params = new URLSearchParams({ scope }).toString();
    const res = await apiRequest(`/patient/appointments?${params}`);
    const data = res?.data ?? res;
    return Array.isArray(data) ? data.map((e) => ({
      id: e.id,
      date: e.date,
      time: e.time,
      daysUntil: e.daysUntil,
      description: e.description,
      hospital: e.hospital,
      room: e.room,
      type: e.type,
    })) : [];
  },

  // Create a new appointment
  create: async ({ hospital, appointmentDate, appointmentTime, appointmentType, additionalNote, doctor_id }) => {
    return apiRequest(`/patient/appointments`, {
      method: 'POST',
      body: JSON.stringify({ hospital, appointmentDate, appointmentTime, appointmentType, additionalNote, doctor_id })
    });
  },

  // Update appointment (e.g., cancel or reschedule)
  update: async (appointmentId, updates) => {
    return apiRequest(`/patient/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
};

// Patient Records API
export const patientRecordsAPI = {
  // List records with optional type and pagination
  list: async ({ recordType = 'all', page = 1, size = 20 } = {}) => {
    const params = new URLSearchParams({ record_type: recordType, page, size }).toString();
    const res = await apiRequest(`/patient/records?${params}`);
    const data = res?.data ?? res?.items ?? res; // support both SuccessResponse and direct payloads
    const total = res?.total ?? res?.meta?.total ?? (Array.isArray(data) ? data.length : 0);
    const pageNum = res?.page ?? page;
    const pageSize = res?.size ?? size;
    // Normalize items to UI expectations
    const items = (Array.isArray(data) ? data : []).map((r) => ({
      id: r.id,
      date: r.date,
      recordType: r.record_type || r.type || 'Record',
      description: r.description || r.title || '',
      summary: r.summary || r.description || r.title || '',
      title: r.title || '',
      doctor: r.doctor || '',
      hospital: r.hospital || r.clinic || '',
      fhirType: r.fhir_resource_type,
      fhirId: r.fhir_resource_id,
      attachments: r.attachments || [],
    }));
    return { items, total, page: pageNum, size: pageSize };
  },

  // Summary
  summary: async () => {
    const res = await apiRequest('/patient/records/summary');
    return res?.data ?? res;
  },

  // Vitals trends
  vitals: async (days = 90) => {
    const params = new URLSearchParams({ days }).toString();
    const res = await apiRequest(`/patient/records/vitals?${params}`);
    return res?.data ?? res;
  },

  // Get single record detail
  get: async (recordId) => {
    const res = await apiRequest(`/patient/records/${recordId}`);
    const data = res?.data ?? res;
    // Parse notes if it's a JSON string
    if (data.notes && typeof data.notes === 'string') {
      try {
        data.detailedNotes = JSON.parse(data.notes);
      } catch (e) {
        // If not JSON, keep as is
        data.detailedNotes = null;
      }
    }
    return data;
  },

  // Download record as PDF or text
  download: async (recordId) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const url = `${baseUrl}/patient/records/${recordId}/download`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `record-${recordId}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    // Create download link
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    
    return { success: true, filename };
  },
};

// Messages API
export const messagesAPI = {
  // Get all messages
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctor/messages/conversations${queryParams ? `?${queryParams}` : ''}`);
  },

  // Send message
  send: async (messageData) => {
    return apiRequest('/doctor/messages/send', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  // Mark as read
  markAsRead: async (messageId) => {
    return apiRequest(`/doctor/messages/messages/${messageId}/read`, {
      method: 'PUT',
    });
  },

  // Get received messages
  getReceived: async () => {
    return apiRequest('/doctor/messages/unread');
  },

  // Get patients for messaging
  getPatients: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctor/messages/patients${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get conversation messages
  getConversationMessages: async (patientId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctor/messages/conversations/${patientId}/messages${queryParams ? `?${queryParams}` : ''}`);
  },

  // Mark conversation as read
  markConversationRead: async (recipientId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctor/messages/conversations/${recipientId}/mark-read${queryParams ? `?${queryParams}` : ''}`, {
      method: 'POST',
    });
  },

  // Get conversations list
  getConversations: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctor/messages/conversations${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get message stats
  getStats: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctor/messages/stats${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get patient documents (reports, lab results, imaging, prescriptions)
  getPatientDocuments: async (patientId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/doctor/messages/patients/${patientId}/documents${queryParams ? `?${queryParams}` : ''}`);
  },
};

// Todos API
export const todosAPI = {
  // Get all todos
  getAll: async (completed = null) => {
    const params = completed !== null ? `?completed=${completed}` : '';
    return apiRequest(`/todos${params}`);
  },

  // Create todo
  create: async (todoData) => {
    return apiRequest('/todos', {
      method: 'POST',
      body: JSON.stringify(todoData),
    });
  },

  // Update todo
  update: async (todoId, todoData) => {
    return apiRequest(`/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify(todoData),
    });
  },

  // Delete todo
  delete: async (todoId) => {
    return apiRequest(`/todos/${todoId}`, {
      method: 'DELETE',
    });
  },

  // Toggle completion
  toggleComplete: async (todoId) => {
    return apiRequest(`/todos/${todoId}/toggle`, {
      method: 'PUT',
    });
  },
};

// Search API
export const searchAPI = {
  // Global search
  global: async (query, resourceType = null) => {
    const params = new URLSearchParams({ query });
    if (resourceType) params.append('resource_type', resourceType);
    
    return apiRequest(`/search?${params}`);
  },

  // Search patients
  patients: async (query) => {
    return patientsAPI.search(query);
  },

  // Search appointments
  appointments: async (query) => {
    return apiRequest(`/appointments/search?q=${encodeURIComponent(query)}`);
  },
};

// ICD Codes API - For searching ICD-11 codes
export const icdCodesAPI = {
  // Search ICD codes by code or description
  search: async (query, version = 'ICD-11', limit = 50) => {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }
    const params = new URLSearchParams({
      query: query.trim(),  // Fixed: changed from 'q' to 'query' to match backend parameter
      version: version,
      limit: limit.toString()
    }).toString();
    const response = await apiRequest(`/doctor/general-reports/icd-codes/search?${params}`);
    // Handle the SuccessResponse wrapper
    return response?.data || response || { results: [], total: 0 };
  },

  // Get ICD code by code value
  getByCode: async (code, version = 'ICD-11') => {
    try {
      const response = await apiRequest(`/doctor/general-reports/icd-codes/${code}?version=${version}`);
      // Handle the SuccessResponse wrapper
      return response?.data || response;
    } catch (error) {
      console.error('Error fetching ICD code:', error);
      return null;
    }
  },

  // Select ICD code (POST method)
  select: async (code, version = 'ICD-11') => {
    try {
      const response = await apiRequest(`/doctor/general-reports/icd-codes/select`, {
        method: 'POST',
        body: JSON.stringify({ code, version })
      });
      // Handle the SuccessResponse wrapper
      return response?.data || response;
    } catch (error) {
      console.error('Error selecting ICD code:', error);
      return null;
    }
  }
};

// Admin API - Enhanced for admin portal
export const adminAPI = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      console.log('[AdminAPI] Calling getStats...');
      const res = await apiRequest('/admin/stats');
      console.log('[AdminAPI] getStats response:', res);
      // Backend returns SuccessResponse with data field
      const data = res?.data || res;
      console.log('[AdminAPI] getStats extracted data:', data);
      return data;
    } catch (error) {
      console.error('Admin stats error:', error);
      throw error;
    }
  },

  // Get system alerts
  getAlerts: async () => {
    try {
      const res = await apiRequest('/admin/alerts');
      return res?.data ?? res;
    } catch (error) {
      console.error('Admin alerts error:', error);
      throw error;
    }
  },

  // Get all users
  getUsers: async (params = {}) => {
    try {
      console.log('[AdminAPI] Calling getUsers with params:', params);
      const queryParams = new URLSearchParams(params).toString();
      const res = await apiRequest(`/admin/users${queryParams ? `?${queryParams}` : ''}`);
      console.log('[AdminAPI] getUsers response:', res);
      const list = res?.data ?? res;
      console.log('[AdminAPI] getUsers extracted list:', list);
      
      // Fetch clinics to map organization_id to clinic name
      let clinicMap = {};
      try {
        const clinicsRes = await apiRequest('/admin/clinics');
        const clinics = clinicsRes?.data || clinicsRes || [];
        clinicMap = clinics.reduce((map, clinic) => {
          map[clinic.id] = clinic.name;
          return map;
        }, {});
        console.log('[AdminAPI] Clinic mapping:', clinicMap);
      } catch (clinicError) {
        console.warn('[AdminAPI] Could not fetch clinics for mapping:', clinicError);
      }
      
      // Map backend fields to UI expectations
      const mappedUsers = (Array.isArray(list) ? list : []).map(u => ({
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
        email: u.email,
        role: u.role,
        clinic: u.organization_id ? (clinicMap[u.organization_id] || u.organization_id) : '',
        status: u.status,
        lastLogin: u.last_login,
        isActive: u.is_active,
      }));
      console.log('[AdminAPI] getUsers mapped users:', mappedUsers);
      return mappedUsers;
    } catch (error) {
      console.error('Admin users error:', error);
      throw error;
    }
  },

  // Get user by ID
  getUser: async (userId) => {
    try {
      return await apiRequest(`/admin/users/${userId}`);
    } catch (error) {
      console.error('Admin user error:', error);
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    try {
      // Use dedicated activate/deactivate endpoints when possible
      if (String(status).toLowerCase() === 'active') {
        return await apiRequest(`/admin/${userId}/activate`, {
          method: 'POST',
        });
      }
      if (String(status).toLowerCase() === 'inactive') {
        return await apiRequest(`/admin/${userId}/deactivate`, {
          method: 'POST',
        });
      }
      // Fallback to updating user with status
      return await apiRequest(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Admin update user status error:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      return await apiRequest(`/admin/users/delete/${userId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Admin delete user error:', error);
      throw error;
    }
  },

  // Send user invitation
  sendUserInvitation: async (userData) => {
    try {
      console.log('[AdminAPI] Sending user invitation:', userData);
      
      // Determine contact type and value
      const contactType = userData.contactType || (userData.email ? 'EMAIL' : 'PHONE');
      const contact = userData.contact || userData.email || userData.phone;
      
      if (!contact) {
        throw new Error('Contact information is required');
      }

      const payload = {
        contact: contact,
        contact_type: contactType,
        role: userData.role || 'DOCTOR',
        organization_id: userData.clinicId || userData.clinic_id,
        first_name: userData.firstName || userData.first_name,
        last_name: userData.lastName || userData.last_name,
        expires_in_hours: 72 // 3 days
      };

      console.log('[AdminAPI] Invitation payload:', payload);
      
      const response = await apiRequest('/admin/invitations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log('[AdminAPI] Invitation response:', response);
      return response;
    } catch (error) {
      console.error('Admin send invitation error:', error);
      throw error;
    }
  },

  // Get user invitations
  getInvitations: async (params = {}) => {
    try {
      console.log('[AdminAPI] Calling getInvitations with params:', params);
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiRequest(`/admin/invitations${queryParams ? `?${queryParams}` : ''}`);
      console.log('[AdminAPI] getInvitations response:', response);
      return response?.data || response;
    } catch (error) {
      console.error('Admin get invitations error:', error);
      throw error;
    }
  },

  // Get invitation statistics
  getInvitationStats: async () => {
    try {
      console.log('[AdminAPI] Calling getInvitationStats...');
      const response = await apiRequest('/admin/invitations/stats');
      console.log('[AdminAPI] getInvitationStats response:', response);
      return response?.data || response;
    } catch (error) {
      console.error('Admin get invitation stats error:', error);
      throw error;
    }
  },

  // Resend invitation
  resendInvitation: async (invitationId) => {
    try {
      console.log('[AdminAPI] Resending invitation:', invitationId);
      const response = await apiRequest(`/admin/invitations/${invitationId}/resend`, {
        method: 'POST'
      });
      console.log('[AdminAPI] Resend invitation response:', response);
      return response;
    } catch (error) {
      console.error('Admin resend invitation error:', error);
      throw error;
    }
  },

  // Cancel invitation
  cancelInvitation: async (invitationId) => {
    try {
      console.log('[AdminAPI] Cancelling invitation:', invitationId);
      const response = await apiRequest(`/admin/invitations/${invitationId}`, {
        method: 'DELETE'
      });
      console.log('[AdminAPI] Cancel invitation response:', response);
      return response;
    } catch (error) {
      console.error('Admin cancel invitation error:', error);
      throw error;
    }
  },

  // Get clinics
  getClinics: async (params = {}) => {
    try {
      console.log('[AdminAPI] Calling getClinics with params:', params);
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiRequest(`/admin/clinics${queryParams ? `?${queryParams}` : ''}`);
      console.log('[AdminAPI] getClinics response:', response);
      
      // Handle paginated response structure
      if (response && response.data && Array.isArray(response.data)) {
        // Paginated response with data.items
        return response.data;
      } else if (response && response.items && Array.isArray(response.items)) {
        // Direct paginated response
        return response.items;
      } else if (Array.isArray(response)) {
        // Direct array response
        return response;
      } else {
        console.warn('[AdminAPI] Unexpected clinics response structure:', response);
        return [];
      }
    } catch (error) {
      console.error('Admin clinics error:', error);
      throw error;
    }
  },

  // Get clinic by ID
  getClinic: async (clinicId) => {
    try {
      return await apiRequest(`/admin/clinics/${clinicId}`);
    } catch (error) {
      console.error('Admin clinic error:', error);
      throw error;
    }
  },

  // Create clinic
  createClinic: async (clinicData) => {
    try {
      return await apiRequest('/admin/clinics', {
        method: 'POST',
        body: JSON.stringify(clinicData),
      });
    } catch (error) {
      console.error('Admin create clinic error:', error);
      throw error;
    }
  },

  // Update clinic
  updateClinic: async (clinicId, clinicData) => {
    try {
      return await apiRequest(`/admin/clinics/${clinicId}`, {
        method: 'PUT',
        body: JSON.stringify(clinicData),
      });
    } catch (error) {
      console.error('Admin update clinic error:', error);
      throw error;
    }
  },

  // Delete clinic
  deleteClinic: async (clinicId) => {
    try {
      return await apiRequest(`/admin/clinics/${clinicId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Admin delete clinic error:', error);
      throw error;
    }
  },

  // Get system logs
  getLogs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const logs = await apiRequest(`/admin/logs${queryParams ? `?${queryParams}` : ''}`);
      return logs;
    } catch (error) {
      console.error('Admin logs error:', error);
      throw error;
    }
  },

  // Get audit trail
  getAuditTrail: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const auditTrail = await apiRequest(`/admin/audit-trail${queryParams ? `?${queryParams}` : ''}`);
      return auditTrail;
    } catch (error) {
      console.error('Admin audit trail error:', error);
      throw error;
    }
  },

  // Get user statistics
  getUserStats: async (userId) => {
    try {
      return await apiRequest(`/admin/users/${userId}/stats`);
    } catch (error) {
      console.error('Admin user stats error:', error);
      throw error;
    }
  },

  // Get user activity log
  getUserActivityLog: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      return await apiRequest(`/admin/users/${userId}/activity-log${queryParams ? `?${queryParams}` : ''}`);
    } catch (error) {
      console.error('Admin user activity log error:', error);
      throw error;
    }
  },

  // Send user notification
  sendUserNotification: async (userId, notificationData) => {
    try {
      return await apiRequest(`/admin/users/${userId}/send-notification`, {
        method: 'POST',
        body: JSON.stringify(notificationData),
      });
    } catch (error) {
      console.error('Admin send notification error:', error);
      throw error;
    }
  },

  // Get system status
  getSystemStatus: async () => {
    try {
      return await apiRequest('/admin/system-status');
    } catch (error) {
      console.error('Admin system status error:', error);
      throw error;
    }
  },

  // Get quick actions
  getQuickActions: async () => {
    try {
      return await apiRequest('/admin/quick-actions');
    } catch (error) {
      console.error('Admin quick actions error:', error);
      throw error;
    }
  },

  // Mark alert as read
  markAlertRead: async (alertId) => {
    try {
      return await apiRequest(`/admin/alerts/${alertId}/mark-read`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Admin mark alert read error:', error);
      throw error;
    }
  },

  // Get admin profile
  getProfile: async () => {
    try {
      return await apiRequest('/admin/profile');
    } catch (error) {
      console.error('Admin profile error:', error);
      throw error;
    }
  },

  // Update admin profile
  updateProfile: async (profileData) => {
    try {
      return await apiRequest('/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    } catch (error) {
      console.error('Admin update profile error:', error);
      throw error;
    }
  },

  // Change admin password
  changePassword: async (passwordData) => {
    try {
      console.log('[AdminAPI] Calling changePassword with:', { currentPassword: '***', newPassword: '***', confirmPassword: '***' });
      return await apiRequest('/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordData),
      });
    } catch (error) {
      console.error('Admin change password error:', error);
      throw error;
    }
  },

  // Get admin activity stats
  getActivityStats: async () => {
    try {
      return await apiRequest('/admin/activity-stats');
    } catch (error) {
      console.error('Admin activity stats error:', error);
      throw error;
    }
  },

  // Get recent activities
  getRecentActivities: async () => {
    try {
      return await apiRequest('/admin/recent-activities');
    } catch (error) {
      console.error('Admin recent activities error:', error);
      throw error;
    }
  },

  // Get permissions
  getPermissions: async () => {
    try {
      return await apiRequest('/admin/permissions');
    } catch (error) {
      console.error('Admin permissions error:', error);
      throw error;
    }
  },
};

// React Hook for API calls with loading and error states
export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return { makeRequest, loading, error, clearError };
};

// Utility functions
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return '';
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return `${age} y.o.`;
};

const formatDateRange = (date) => {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });
  return `${formatter.format(d)} - ${formatter.format(new Date(d.getTime() + 17 * 24 * 60 * 60 * 1000))}`;
};

// Health check functions
export const checkBackendHealth = async () => {
  try {
    // Use the correct health endpoint URL (without /api/v1)
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const healthUrl = baseUrl.includes('/api/v1') ? baseUrl.replace('/api/v1', '') + '/health' : `${baseUrl}/health`;
    console.log('[HEALTH CHECK] Checking backend health at:', healthUrl);
    const response = await fetch(healthUrl);
    console.log('[HEALTH CHECK] Response status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

export const checkDatabaseHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health/database`);
    return response.ok;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// WebSocket connection for real-time updates
export const connectWebSocket = (onMessage) => {
  const token = localStorage.getItem('token');
  const wsUrl = `ws://localhost:8000/ws?token=${token}`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return ws;
};

// Error handling wrapper
export const withErrorHandling = (apiCall) => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };
};

// Token refresh setup
export const setupTokenRefresh = (refreshCallback) => {
  const originalFetch = window.fetch;
  
  window.fetch = async (url, options) => {
    const response = await originalFetch(url, options);
    
    if (response.status === 401) {
      try {
        await authAPI.refreshToken();
        // Retry the original request
        return originalFetch(url, options);
      } catch (error) {
        refreshCallback();
        throw error;
      }
    }
    
    return response;
  };
};


// Patient Security API
export const patientSecurityAPI = {
  // Get security settings
  getSecuritySettings: async () => {
    console.log('[SECURITY] Calling patientSecurityAPI.getSecuritySettings')
    const response = await apiRequest('/patient/security/settings', {
      method: 'GET',
      headers: getAuthHeaders()
    })
    console.log('[SECURITY] Security settings response:', response)
    return response?.data || response
  },

  // Update security settings
  updateSecuritySettings: async (settings) => {
    console.log('[SECURITY] Calling patientSecurityAPI.updateSecuritySettings with:', settings)
    const response = await apiRequest('/patient/security/settings', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    })
    console.log('[SECURITY] Update security settings response:', response)
    return response?.data || response
  },

  // Change password
  changePassword: async (passwordData) => {
    console.log('[SECURITY] Calling patientSecurityAPI.changePassword')
    const response = await apiRequest('/patient/security/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(passwordData)
    })
    console.log('[SECURITY] Change password response:', response)
    return response?.data || response
  },

  // Setup 2FA
  setupTwoFactor: async (enable) => {
    console.log('[SECURITY] Calling patientSecurityAPI.setupTwoFactor with enable:', enable)
    const response = await apiRequest('/patient/security/2fa/setup', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enable })
    })
    console.log('[SECURITY] Setup 2FA response:', response)
    return response?.data || response
  },

  // Verify 2FA
  verifyTwoFactor: async (token) => {
    console.log('[SECURITY] Calling patientSecurityAPI.verifyTwoFactor')
    const response = await apiRequest('/patient/security/2fa/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ token })
    })
    console.log('[SECURITY] Verify 2FA response:', response)
    return response?.data || response
  },

  // List sessions
  listSessions: async () => {
    console.log('[SECURITY] Calling patientSecurityAPI.listSessions')
    const response = await apiRequest('/patient/security/sessions', {
      method: 'GET',
      headers: getAuthHeaders()
    })
    console.log('[SECURITY] List sessions response:', response)
    return response?.data || response
  },

  // End session
  endSession: async (sessionId) => {
    console.log('[SECURITY] Calling patientSecurityAPI.endSession with sessionId:', sessionId)
    const response = await apiRequest(`/patient/security/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    console.log('[SECURITY] End session response:', response)
    return response?.data || response
  },

  // Logout all sessions
  logoutAllSessions: async () => {
    console.log('[SECURITY] Calling patientSecurityAPI.logoutAllSessions')
    const response = await apiRequest('/patient/security/logout-all', {
      method: 'POST',
      headers: getAuthHeaders()
    })
    console.log('[SECURITY] Logout all sessions response:', response)
    return response?.data || response
  },

  // Get security activity
  getSecurityActivity: async () => {
    console.log('[SECURITY] Calling patientSecurityAPI.getSecurityActivity')
    const response = await apiRequest('/patient/security/activity', {
      method: 'GET',
      headers: getAuthHeaders()
    })
    console.log('[SECURITY] Security activity response:', response)
    return response?.data || response
  }
}

// Pricing API - Service pricing management
export const pricingAPI = {
  // Get service prices for a clinic
  getPrices: async (clinicId) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/pricing`);
      return response?.data || response;
    } catch (error) {
      console.error('Pricing get prices error:', error);
      throw error;
    }
  },

  // Add new service price
  addPrice: async (clinicId, priceData) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/pricing`, {
        method: 'POST',
        body: JSON.stringify(priceData),
      });
      return response?.data || response;
    } catch (error) {
      console.error('Pricing add price error:', error);
      throw error;
    }
  },

  // Update service price
  updatePrice: async (clinicId, priceId, priceData) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/pricing/${priceId}`, {
        method: 'PUT',
        body: JSON.stringify(priceData),
      });
      return response?.data || response;
    } catch (error) {
      console.error('Pricing update price error:', error);
      throw error;
    }
  },

  // Delete service price
  deletePrice: async (clinicId, priceId) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/pricing/${priceId}`, {
        method: 'DELETE',
      });
      return response?.data || response;
    } catch (error) {
      console.error('Pricing delete price error:', error);
      throw error;
    }
  },
};

// Department API - Department management
export const departmentAPI = {
  // Get departments for a clinic
  getDepartments: async (clinicId) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/departments`);
      return response?.data || response;
    } catch (error) {
      console.error('Department get departments error:', error);
      throw error;
    }
  },

  // Add new department
  addDepartment: async (clinicId, departmentData) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/departments`, {
        method: 'POST',
        body: JSON.stringify(departmentData),
      });
      return response?.data || response;
    } catch (error) {
      console.error('Department add department error:', error);
      throw error;
    }
  },

  // Update department
  updateDepartment: async (clinicId, departmentId, departmentData) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/departments/${departmentId}`, {
        method: 'PUT',
        body: JSON.stringify(departmentData),
      });
      return response?.data || response;
    } catch (error) {
      console.error('Department update department error:', error);
      throw error;
    }
  },

  // Delete department
  deleteDepartment: async (clinicId, departmentId) => {
    try {
      const response = await apiRequest(`/admin/clinics/${clinicId}/departments/${departmentId}`, {
        method: 'DELETE',
      });
      return response?.data || response;
    } catch (error) {
      console.error('Department delete department error:', error);
      throw error;
    }
  },
};

// Default export for backward compatibility
export default {
  auth: authAPI,
  dashboard: dashboardAPI,
  appointments: appointmentsAPI,
  patients: patientsAPI,
  doctors: doctorsAPI,
  settings: doctorSettingsAPI,
  reports: medicalReportsAPI,
  messages: messagesAPI,
  todos: todosAPI,
  search: searchAPI,
  admin: adminAPI,
  pricing: pricingAPI,
  department: departmentAPI,
  useAPI,
  apiRequest,
  isAuthenticated,
  getCurrentUser,
  checkBackendHealth,
  checkDatabaseHealth,
  patientAuth: patientAuthAPI,
};