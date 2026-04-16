import React, { useState, useEffect, useContext, useRef } from 'react';
import { Bell, X, UserPlus, MessageSquare, Check, MapPin, Clock, Trophy, AlertTriangle, Settings } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import notificationService from '../../services/notificationService';
import UserService from '../../services/userService';

const NotificationBell = ({ onOpenFriends, onOpenSettings }) => {
  const { user } = useContext(AuthContext);
  const { socket, notifications: socketNotifications, clearNotification } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications and unread count
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const [notificationsRes, unreadRes] = await Promise.all([
          notificationService.getNotifications(50),
          notificationService.getUnreadCount()
        ]);
        setDbNotifications(notificationsRes);
        setUnreadCount(unreadRes);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
    
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch pending friend requests count
  useEffect(() => {
    if (!user) return;
    
    const fetchPendingCount = async () => {
      try {
        const res = await UserService.getReceivedRequests();
        const count = Array.isArray(res.data) ? res.data.length : 0;
        setPendingRequests(count);
      } catch (err) {
        console.error('Error fetching pending requests:', err);
      }
    };

    fetchPendingCount();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket) return;

    const handleNotification = async (data) => {
      // Play notification sound (optional)
      // const audio = new Audio('/notification-sound.mp3');
      // audio.play().catch(() => {});
      
      // Refresh notifications
      try {
        const [notificationsRes, unreadRes] = await Promise.all([
          notificationService.getNotifications(50),
          notificationService.getUnreadCount()
        ]);
        setDbNotifications(notificationsRes);
        setUnreadCount(unreadRes);
      } catch (err) {
        console.error('Error refreshing notifications:', err);
      }
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

  // Combine socket notifications with database notifications
  const combinedNotifications = [...dbNotifications, ...socketNotifications];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate total unread
  const totalUnread = unreadCount + pendingRequests;

  const handleBellClick = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Refresh notifications when opening
      try {
        const [notificationsRes, unreadRes] = await Promise.all([
          notificationService.getNotifications(50),
          notificationService.getUnreadCount()
        ]);
        setDbNotifications(notificationsRes);
        setUnreadCount(unreadRes);
      } catch (err) {
        console.error('Error refreshing notifications:', err);
      }
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setDbNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setDbNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Recalculate unread count
      const unreadRes = await notificationService.getUnreadCount();
      setUnreadCount(unreadRes);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleOpenFriends = () => {
    setIsOpen(false);
    onOpenFriends?.();
  };

  const handleDismissNotification = (index) => {
    clearNotification(index);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus size={16} className="text-blue-400" />;
      case 'friend_accepted':
        return <Check size={16} className="text-green-400" />;
      case 'message':
        return <MessageSquare size={16} className="text-purple-400" />;
      case 'tile_captured':
        return <MapPin size={16} className="text-red-400" />;
      case 'scheduled':
      case 'delayed':
        return <Clock size={16} className="text-yellow-400" />;
      case 'achievement':
        return <Trophy size={16} className="text-amber-400" />;
      case 'system':
      case 'event':
        return <AlertTriangle size={16} className="text-orange-400" />;
      default:
        return <Bell size={16} className="text-gray-400" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-gray-800 transition"
        aria-label="Notifications"
      >
        <Bell size={24} className="text-gray-300" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:right-0 md:mt-2 md:w-80">
          {/* Backdrop for mobile */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 md:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-4 top-16 w-80 max-w-[calc(100vw-2rem)] bg-gray-800 rounded-lg shadow-xl border border-gray-700 md:relative md:right-auto md:top-auto md:mt-0 md:w-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">Notifications</h3>
                {totalUnread > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {totalUnread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {totalUnread > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                    title="Mark all as read"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => onOpenSettings?.()}
                  className="text-gray-400 hover:text-white transition"
                  title="Notification Settings"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-2 border-b border-gray-700 flex gap-2">
              <button
                onClick={handleOpenFriends}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition"
              >
                <UserPlus size={16} />
                Friend Requests
                {pendingRequests > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingRequests}
                  </span>
                )}
              </button>
              <button
                onClick={() => onOpenSettings?.()}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition"
              >
                <Settings size={16} />
                Settings
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {combinedNotifications.length === 0 && pendingRequests === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                <>
                  {/* Friend Request Notification */}
                  {pendingRequests > 0 && (
                    <div
                      onClick={handleOpenFriends}
                      className="p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer flex items-start gap-3"
                    >
                      <div className="mt-1">{getNotificationIcon('friend_request')}</div>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          You have {pendingRequests} pending friend request{pendingRequests > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Click to view</p>
                      </div>
                    </div>
                  )}

                  {/* Other Notifications */}
                  {combinedNotifications.map((notif) => (
                    <div
                      key={notif.id || `temp-${notif.title}`}
                      className={`p-3 border-b border-gray-700 hover:bg-gray-700 flex items-start gap-3 group ${
                        !notif.is_read ? 'bg-gray-800/50' : ''
                      }`}
                      onClick={() => notif.id && !notif.is_read && handleMarkAsRead(notif.id)}
                    >
                      <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {notif.title || 'New Notification'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {notif.content || notif.message || ''}
                        </p>
                        {notif.senderUsername && (
                          <p className="text-xs text-blue-400 mt-1">
                            From: {notif.senderUsername}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(notif.created_at || notif.triggered_at)}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                      {notif.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition flex-shrink-0"
                        >
                          <X size={14} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
