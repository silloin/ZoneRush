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
  // 1. Check if explicitly set in environment
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // 2. Check if API URL is set (use same host for socket)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 3. Production build without explicit socket URL
  if (import.meta.env.PROD) {
    return window.location.origin; // Same origin as frontend
  }
  
  // 4. Local development - use localhost backend
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
