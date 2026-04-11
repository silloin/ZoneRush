import axios from 'axios';

const isSafeId = (id) => {
  const n = parseInt(id, 10);
  return Number.isInteger(n) && n > 0;
};

const UserService = {
  // Friend Requests
  getReceivedRequests: async () => {
    try {
      return await axios.get('/friend-requests/received');
    } catch (error) {
      // Silently handle 401 - user not logged in
      if (error.response?.status === 401) {
        return { data: [] };
      }
      throw error;
    }
  },

  getFriendsList: async () => {
    try {
      return await axios.get('/friend-requests/list');
    } catch (error) {
      if (error.response?.status === 401) {
        return { data: [] };
      }
      throw error;
    }
  },

  acceptFriendRequest: async (requestId) => {
    if (!isSafeId(requestId)) throw new Error('Invalid request ID');
    return axios.post(`/friend-requests/accept/${requestId}`);
  },

  rejectFriendRequest: async (requestId) => {
    if (!isSafeId(requestId)) throw new Error('Invalid request ID');
    return axios.post(`/friend-requests/reject/${requestId}`);
  },

  // Notifications
  getNotifications: async () => {
    return axios.get('/notifications');
  },

  markNotificationRead: async (notificationId) => {
    if (!notificationId) throw new Error('Invalid notification ID');
    return axios.put(`/notifications/read/${notificationId}`);
  },

  markAllNotificationsRead: async () => {
    return axios.put('/notifications/read-all');
  },

  deleteNotification: async (notificationId) => {
    if (!notificationId) throw new Error('Invalid notification ID');
    return axios.delete(`/notifications/${notificationId}`);
  }
};

export default UserService;
