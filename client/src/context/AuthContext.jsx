import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Smart API URL detection: works for both localhost and production
const getApiUrl = () => {
  // If explicitly set in env, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For production (same domain), use relative URL
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // For development, use relative URL (Vite proxy will forward to localhost:5000)
  return '/api';
};

axios.defaults.baseURL = getApiUrl();
axios.defaults.withCredentials = true;

// Helper to get cookie value
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Add CSRF token to all state-changing requests
axios.interceptors.request.use((config) => {
  const token = getCookie('csrf-token');
  if (token && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
    config.headers['x-csrf-token'] = token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

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
    } catch (error) {
      console.error('❌ Logout failed:', error);
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
      // Update local user state
      setUser(prevUser => ({ ...prevUser, profile_photo_url: res.data.profilePhotoUrl }));
      return res.data;
    } catch (error) {
      console.error('❌ Profile photo update failed:', error.response?.data || error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
};