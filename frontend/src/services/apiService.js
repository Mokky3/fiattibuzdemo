// src/services/apiService.js
// Unified API service for Medical Dashboard - FastAPI Backend Integration

import { useState } from 'react';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';

// Utility functions
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/api') ? endpoint : `${API_VERSION}${endpoint}`}`;
  const config = {
    headers: getAuthHeaders(),
    ...options,
  };

  try {
    const response = await fetch(url, config);
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
    
    const data = await handleResponse(response);
    
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
};

// Dashboard API - Enhanced for FastAPI integration
export const dashboardAPI = {
  // Get appointments for dashboard
  getAppointments: async (date = null) => {
    try {
      const params = date ? `?date=${date}` : '';
      const appointments = await apiRequest(`/dashboard/appointments${params}`);
      
      // Transform data to match frontend expectations
      return appointments.map(apt => ({
        id: apt.id,
        time: apt.appointment_time,
        patient: apt.patient_name || 'Unknown Patient',
        problem: apt.appointment_type || 'General consultation',
        description: apt.notes || 'No additional notes',
        provider: `Dr. ${apt.doctor?.first_name} ${apt.doctor?.last_name}` || 'Current Doctor',
        status: apt.status,
        formattedDate: new Date(apt.appointment_date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '.'),
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time
      }));
    } catch (error) {
      console.error('Dashboard appointments error:', error);
      throw error;
    }
  },

  // Get messages for dashboard
  getMessages: async () => {
    try {
      const messages = await apiRequest('/dashboard/messages');
      
      return messages.map(msg => ({
        id: msg.id,
        name: msg.sender_name || 'Unknown',
        lastMessage: msg.content?.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content,
        avatar: msg.sender_name ? msg.sender_name.split(' ').map(n => n[0]).join('') : 'U',
        status: msg.status,
        created_at: msg.created_at
      }));
    } catch (error) {
      console.error('Dashboard messages error:', error);
      throw error;
    }
  },

  // Get todos/pending tasks
  getTodos: async () => {
    try {
      const todos = await apiRequest('/dashboard/todos');
      
      return todos.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        completed: todo.completed,
        priority: todo.priority,
        due_date: todo.due_date,
        date: todo.due_date ? formatDateRange(todo.due_date) : '13 May - 30 June',
        provider: todo.assigned_doctor || 'Current Doctor'
      }));
    } catch (error) {
      console.error('Dashboard todos error:', error);
      throw error;
    }
  },

  // Toggle todo completion
  toggleTodo: async (todoId) => {
    return apiRequest(`/dashboard/todos/${todoId}/toggle`, {
      method: 'POST',
    });
  },

  // Get dashboard statistics
  getSummary: async () => {
    return apiRequest('/dashboard/summary');
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
    return apiRequest('/doctors/profile');
  },

  // Update doctor profile
  updateProfile: async (profileData) => {
    return apiRequest('/doctors/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// Doctor Settings API
export const doctorSettingsAPI = {
  // Get all settings
  getSettings: async () => {
    try {
      const settings = await apiRequest('/doctor/settings');
      
      return {
        profile: {
          fullName: settings.doctor?.fullName || 'Dr. Unknown',
          email: settings.doctor?.email || '',
          phone: settings.doctor?.phone || '',
          specialty: settings.doctor?.specialization || 'General Medicine',
          licenseNumber: settings.doctor?.license_number || '',
          organization: settings.doctor?.department || '',
          bio: settings.doctor?.bio || '',
          address: settings.doctor?.address || '',
          profileImage: settings.doctor?.profile_image || null
        },
        notifications: {
          emailNotifications: settings.email_notifications,
          smsNotifications: settings.sms_notifications,
          appointmentReminders: settings.appointment_reminders,
          patientMessages: settings.patient_messages,
          systemUpdates: settings.system_updates,
          marketingEmails: settings.marketing_emails,
          reminderTiming: settings.reminder_timing
        },
        security: {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          twoFactorEnabled: settings.two_factor_enabled,
          sessionTimeout: settings.session_timeout?.toString() || '30',
          loginAlerts: settings.login_alerts
        },
        availability: {
          workingDays: JSON.parse(settings.working_days || '[]'),
          workingHours: {
            start: settings.working_hours_start || '09:00',
            end: settings.working_hours_end || '18:00'
          },
          lunchBreak: {
            enabled: settings.lunch_break_enabled,
            start: settings.lunch_break_start || '13:00',
            end: settings.lunch_break_end || '14:00'
          },
          consultationDuration: settings.consultation_duration?.toString() || '30',
          bufferTime: settings.buffer_time?.toString() || '15'
        }
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw error;
    }
  },

  // Save profile settings
  saveProfile: async (profileData) => {
    return apiRequest('/doctor/settings/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Save notification settings
  saveNotifications: async (notificationData) => {
    return apiRequest('/doctor/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(notificationData),
    });
  },

  // Save security settings
  saveSecurity: async (securityData) => {
    return apiRequest('/doctor/settings/security', {
      method: 'PUT',
      body: JSON.stringify(securityData),
    });
  },

  // Save availability settings
  saveAvailability: async (availabilityData) => {
    return apiRequest('/doctor/settings/availability', {
      method: 'PUT',
      body: JSON.stringify(availabilityData),
    });
  },

  // Upload profile image
  uploadProfileImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/doctor/profile/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });

    return handleResponse(response);
  },
};

// Medical Reports API
export const medicalReportsAPI = {
  // Get report by appointment ID
  getByAppointment: async (appointmentId) => {
    const report = await apiRequest(`/medical-reports/appointment/${appointmentId}`);
    
    return {
      id: report.id,
      doctor: {
        name: report.doctor_info?.name || 'Current Doctor',
        specialty: report.doctor_info?.specialty || 'General Medicine',
        department: report.doctor_info?.department || 'General'
      },
      date: report.date,
      chiefComplaint: report.chief_complaint || '',
      historyOfPresentIllness: report.history_of_present_illness || '',
      physicalExamination: report.physical_examination || '',
      diagnosis: report.diagnosis || '',
      treatmentPlan: report.treatment_plan || '',
      additionalNotes: report.additional_notes || '',
      medications: report.medications?.map(med => ({
        name: med.name,
        dosage: med.dosage || 'As directed',
        frequency: med.frequency || 'As needed',
        duration: med.duration || 'Until finished'
      })) || [],
      followUp: {
        date: report.follow_up?.date || '',
        reason: report.follow_up?.reason || ''
      }
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

// Messages API
export const messagesAPI = {
  // Get all messages
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/messages${queryParams ? `?${queryParams}` : ''}`);
  },

  // Send message
  send: async (messageData) => {
    return apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  // Mark as read
  markAsRead: async (messageId) => {
    return apiRequest(`/messages/${messageId}/read`, {
      method: 'PUT',
    });
  },

  // Get received messages
  getReceived: async () => {
    return apiRequest('/messages/received');
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

// Admin API - Enhanced for admin portal
export const adminAPI = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      const stats = await apiRequest('/admin/stats');
      return stats;
    } catch (error) {
      console.error('Admin stats error:', error);
      throw error;
    }
  },

  // Get system alerts
  getAlerts: async () => {
    try {
      const alerts = await apiRequest('/admin/alerts');
      return alerts;
    } catch (error) {
      console.error('Admin alerts error:', error);
      throw error;
    }
  },

  // Get all users
  getUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const users = await apiRequest(`/admin/users${queryParams ? `?${queryParams}` : ''}`);
      return users;
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
      return await apiRequest(`/admin/users/${userId}/status`, {
        method: 'PATCH',
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
      return await apiRequest(`/admin/users/${userId}`, {
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
      return await apiRequest('/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    } catch (error) {
      console.error('Admin send invitation error:', error);
      throw error;
    }
  },

  // Get clinics
  getClinics: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const clinics = await apiRequest(`/admin/clinics${queryParams ? `?${queryParams}` : ''}`);
      return clinics;
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
    const response = await fetch(`${API_BASE_URL}/health`);
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
  useAPI,
  checkBackendHealth,
  checkDatabaseHealth,
};