// src/services/apiService.js
// API service for Medical Dashboard - connects to your FastAPI backend

import { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Generic API helper function
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Dashboard-specific API calls (matches your Dashboard component needs)
export const dashboardAPI = {
  // Get appointments for a specific date
  getAppointments: async (dateString) => {
    const params = dateString ? `?appointment_date=${dateString}` : '';
    return apiCall(`/dashboard/appointments${params}`);
  },

  // Get messages/users for the messages section
  getMessages: async () => {
    return apiCall('/dashboard/messages');
  },

  // Get todos (pending medical histories)
  getTodos: async () => {
    return apiCall('/dashboard/todos');
  },

  // Toggle todo completion
  toggleTodo: async (todoId) => {
    return apiCall(`/dashboard/todos/${todoId}/toggle`, {
      method: 'POST',
    });
  },

  // Get dashboard summary statistics
  getSummary: async () => {
    return apiCall('/dashboard/summary');
  },
};

// Individual entity APIs for other components
export const appointmentsAPI = {
  getAll: async () => apiCall('/appointments'),
  getById: async (id) => apiCall(`/appointments/${id}`),
  create: async (data) => apiCall('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: async (id, data) => apiCall(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: async (id) => apiCall(`/appointments/${id}`, {
    method: 'DELETE',
  }),
};

export const patientsAPI = {
  getAll: async () => apiCall('/patients'),
  getById: async (id) => apiCall(`/patients/${id}`),
  create: async (data) => apiCall('/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: async (id, data) => apiCall(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export const doctorsAPI = {
  getAll: async () => apiCall('/doctors'),
  getById: async (id) => apiCall(`/doctors/${id}`),
  create: async (data) => apiCall('/doctors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// React Hook for API calls with loading and error states
export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = async (apiFunction) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return { makeRequest, loading, error };
};

// Health check function
export const checkBackendHealth = async () => {
  try {
    const response = await fetch('http://localhost:8000/health');
    return response.ok;
  } catch {
    return false;
  }
};

export default {
  dashboardAPI,
  appointmentsAPI,
  patientsAPI,
  doctorsAPI,
  useAPI,
  checkBackendHealth,
};