/**
 * Patient Portal Authentication Utilities
 * Handles automatic redirect to sign-in page when credentials expire
 */

/**
 * Check if an error is an authentication error and redirect to sign-in if so
 * @param {Error|string} error - The error object or error message
 * @returns {boolean} - True if error was handled (redirected), false otherwise
 */
export const handlePatientAuthError = (error) => {
  const errorMessage = error?.message || String(error) || '';
  const errorDetail = error?.detail || error?.error || '';
  const fullErrorText = `${errorMessage} ${errorDetail}`.toLowerCase();
  
  // Check if it's an authentication error
  const isAuthError = 
    errorMessage.includes('Authentication required') || 
    errorMessage.includes('Not authenticated') ||
    errorMessage.includes('Please log in') ||
    errorMessage.includes('Token expired') ||
    errorMessage.includes('Invalid token') ||
    errorMessage.includes('Could not validate credentials') ||
    fullErrorText.includes('authentication') ||
    fullErrorText.includes('token expired') ||
    fullErrorText.includes('invalid token') ||
    fullErrorText.includes('credentials');
  
  if (isAuthError) {
    console.warn('[Patient Auth] Authentication error detected, redirecting to sign-in...', errorMessage || errorDetail);
    
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    
    // Redirect to sign-in page immediately
    window.location.href = '/signin';
    return true; // Error was handled
  }
  
  return false; // Error was not an auth error
};

