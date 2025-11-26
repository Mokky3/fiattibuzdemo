// API Configuration
// This file centralizes API URL configuration

// Get API URL from environment variable or use default
export const getApiBaseUrl = () => {
  // Check for production environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Check if we're in production (deployed)
  if (import.meta.env.PROD) {
    // Production default - update this to your actual production URL
    return 'https://fiattib-backend-677633413590.us-east4.run.app';
  }
  
  // Development default
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_VERSION = '/api/v1';
export const API_BASE = API_BASE_URL.endsWith(API_VERSION) 
  ? API_BASE_URL 
  : `${API_BASE_URL}${API_VERSION}`;

// WebSocket URL helper
export const getWebSocketUrl = (token) => {
  const baseUrl = API_BASE_URL;
  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const wsBaseUrl = baseUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
  return `${wsProtocol}://${wsBaseUrl}/ws?token=${token}`;
};

