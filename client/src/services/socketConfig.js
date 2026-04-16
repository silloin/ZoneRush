/**
 * Socket.IO Configuration Helper
 * 
 * Automatically detects the correct Socket.IO server URL based on environment:
 * 1. Explicit VITE_SOCKET_URL environment variable
 * 2. VITE_API_URL (uses same host for socket)
 * 3. Production build (uses window.location.origin)
 * 4. Local development (defaults to http://localhost:5000)
 */

export const getSocketURL = () => {
  // Use VITE_API_URL_PROD in production mode, otherwise use VITE_API_URL
  const API = import.meta.env.MODE === "production" 
    ? import.meta.env.VITE_API_URL_PROD 
    : import.meta.env.VITE_API_URL;
  
  // If explicitly set socket URL exists, prefer it
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // Extract base URL from API URL (strip /api)
  if (API) {
    return API.replace('/api', '');
  }
  
  // Fallback to default production backend if no env var set
  if (import.meta.env.PROD) {
    // In production, use current window location (should be same as backend)
    // Or set VITE_SOCKET_URL environment variable
    return window.location.origin;
  }
  
  // Default development socket URL
  return 'http://localhost:5000';
};

/**
 * Default Socket.IO connection options
 */
export const getSocketOptions = () => ({
  transports: ['websocket', 'polling'],
  withCredentials: true,
  timeout: 60000, // 60 seconds instead of 10s to account for Render cold starts
  forceNew: true
});
