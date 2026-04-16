import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Smart API URL detection: works for both localhost and production
const getApiUrl = () => {
  // In production, use VITE_API_URL_PROD if set
  if (import.meta.env.PROD) {
    const prodApiUrl = import.meta.env.VITE_API_URL_PROD;
    if (prodApiUrl) {
      // Use the full production URL (e.g., https://your-app.onrender.com/api)
      return prodApiUrl;
    }
    // Fallback to relative URL if VITE_API_URL_PROD is not set
    // This will work if you deploy frontend and backend on the same domain
    return '/api';
  }
  
  // In development, use VITE_API_URL or default to /api (for Vite proxy)
  const devApiUrl = import.meta.env.VITE_API_URL;
  return devApiUrl || '/api';
};

axios.defaults.baseURL = getApiUrl();
axios.defaults.withCredentials = true;

// Add request interceptor to include token from localStorage as fallback
axios.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage (fallback for cross-origin)
    const token = localStorage.getItem('token');
    if (token && !config.headers['x-auth-token']) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add global response interceptor to handle 401 errors silently
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 401 errors to console (expected when not authenticated)
    if (error.response?.status === 401) {
      // Silently reject - user needs to login
      return Promise.reject(error);
    }
    
    // Log all other errors
    if (error.response?.status && error.response?.status !== 401) {
      console.error(`API Error ${error.response?.status}:`, error.response?.data?.msg || error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper to get cookie value
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// CSRF token interceptor removed - CSRF protection disabled

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await axios.get('/auth');
      // Ensure consistency with login/register response structure
      setUser(res.data.user || res.data || null);
    } catch (err) {
      // Don't log 401 errors as they are expected when a user is not logged in
      if (err.response?.status !== 401) {
        console.error('Failed to load user session:', err.response?.data || err.message);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    console.log('🔐 Attempting login with:', { email, baseURL: axios.defaults.baseURL });
    try {
      const res = await axios.post('/auth/login', { email, password });
      console.log('✅ Login successful:', res.data);
      
      // Store token in localStorage as fallback for cross-origin requests
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        console.log('💾 Token stored in localStorage');
      }
      
      setUser(res.data.user);
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    console.log('📝 Attempting registration with:', { username, email, baseURL: axios.defaults.baseURL });
    try {
      const res = await axios.post('/auth/register', { username, email, password });
      console.log('✅ Registration successful:', res.data);
      
      // Store token in localStorage as fallback for cross-origin requests
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        console.log('💾 Token stored in localStorage');
      }
      
      setUser(res.data.user);
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
      setUser(null);
      // Clear localStorage token to properly logout
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Even if logout fails, clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axios.put('/users/profile', profileData);
      // Update local user state
      setUser(prevUser => ({ ...prevUser, ...res.data.user }));
      return res.data;
    } catch (error) {
      console.error('❌ Profile update failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const updateProfilePhoto = async (profilePhotoUrl) => {
    try {
      const res = await axios.put('/users/profile/photo', { profilePhotoUrl });
      // Update local user state - use profile_picture (aliased from profile_photo_url)
      setUser(prevUser => ({ ...prevUser, profile_picture: res.data.profilePhotoUrl }));
      return res.data;
    } catch (error) {
      console.error('❌ Profile photo update failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const uploadProfilePhoto = async (file) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await axios.post('/users/profile/photo/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update local user state - use profile_picture (aliased from profile_photo_url)
      setUser(prevUser => ({ ...prevUser, profile_picture: res.data.profilePhotoUrl }));
      return res.data;
    } catch (error) {
      console.error('❌ Profile photo upload failed:', error.response?.data || error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, updateProfilePhoto, uploadProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
};