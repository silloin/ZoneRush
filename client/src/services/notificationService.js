/**
 * Notification Service - Frontend API layer
 * Handles all notification-related API calls
 */

import axios from 'axios';

const API_URL = '/api/notifications';

export const notificationService = {
  // Get all notifications for the user
  getNotifications: async (limit = 50, unreadOnly = false) => {
    try {
      const response = await axios.get(`${API_URL}?limit=${limit}&unread=${unreadOnly}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await axios.get(`${API_URL}/unread/count`);
      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  // Get notification statistics
  getStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  },

  // Create a scheduled notification
  createScheduledNotification: async (title, content, triggerTime, data = {}) => {
    try {
      const response = await axios.post(API_URL, {
        type: 'scheduled',
        title,
        content,
        triggerTime,
        data
      });
      return response.data;
    } catch (error) {
      console.error('Error creating scheduled notification:', error);
      throw error;
    }
  },

  // Create a delayed notification
  createDelayedNotification: async (title, content, delayMinutes, data = {}) => {
    try {
      const response = await axios.post(API_URL, {
        type: 'delayed',
        title,
        content,
        delayMinutes,
        data
      });
      return response.data;
    } catch (error) {
      console.error('Error creating delayed notification:', error);
      throw error;
    }
  },

  // Create an immediate event notification
  createEventNotification: async (title, content, data = {}) => {
    try {
      const response = await axios.post(API_URL, {
        type: 'event',
        title,
        content,
        data
      });
      return response.data;
    } catch (error) {
      console.error('Error creating event notification:', error);
      throw error;
    }
  },

  // Mark a notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await axios.put(`${API_URL}/read/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await axios.put(`${API_URL}/read-all`);
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete a notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await axios.delete(`${API_URL}/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Get notification preferences
  getPreferences: async () => {
    try {
      const response = await axios.get(`${API_URL}/preferences`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    try {
      const response = await axios.put(`${API_URL}/preferences`, preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
};

export default notificationService;
