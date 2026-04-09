import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { Bell, Check, Trash2, X } from 'lucide-react';
import UserService from '../../services/userService';

const NotificationsBell = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await UserService.getNotifications();
      // Ensure it's always an array
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Set empty array on error
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await UserService.markNotificationRead(notificationId);
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await UserService.markAllNotificationsRead();
      
      // Update all as read
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await UserService.deleteNotification(notificationId);
      
      // Remove from local state
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return '👥';
      case 'message':
        return '💬';
      case 'global_message':
        return '🌍';
      case 'achievement':
        return '🏆';
      default:
        return '🔔';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      return `${Math.floor(diff / (1000 * 60))}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell size={24} className="text-yellow-500" />
          <h2 className="text-xl font-bold">Notifications</h2>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-400 hover:text-blue-300 transition flex items-center space-x-1"
          >
            <Check size={16} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell size={48} className="mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-700 transition hover:bg-gray-750 ${
                !notification.is_read ? 'bg-blue-900 bg-opacity-20' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{notification.title}</div>
                    {notification.content && (
                      <div className="text-sm text-gray-400 mt-1">
                        {notification.content}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 text-green-400 hover:text-green-300 transition"
                      title="Mark as read"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1 text-red-400 hover:text-red-300 transition"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsBell;
