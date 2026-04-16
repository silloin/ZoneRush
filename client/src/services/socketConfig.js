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
  // If explicitly set socket URL exists, prefer it
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // In production, use VITE_API_URL_PROD if set
  if (import.meta.env.PROD) {
    const prodApiUrl = import.meta.env.VITE_API_URL_PROD;
    if (prodApiUrl) {
      // Extract base URL from API URL (strip /api)
      return prodApiUrl.replace('/api', '');
    }
    // Fallback to current window location
    return window.location.origin;
  }
  
  // In development, use VITE_API_URL or default to localhost
  const devApiUrl = import.meta.env.VITE_API_URL;
  if (devApiUrl) {
    return devApiUrl.replace('/api', '');
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
