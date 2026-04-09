import React, { useState, useEffect, useContext, useRef } from 'react';
import { Bell, X, UserPlus, MessageSquare, Check } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import UserService from '../../services/userService';
import axios from 'axios';

const NotificationBell = ({ onOpenFriends }) => {
  const { user } = useContext(AuthContext);
  const { unreadCounts, notifications, clearNotification, markFriendRequestsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const dropdownRef = useRef(null);

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

  // Combine socket notifications with local state
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

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
  const totalUnread = unreadCounts.messages + pendingRequests + unreadCounts.notifications;

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      markFriendRequestsRead();
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
      default:
        return <Bell size={16} className="text-gray-400" />;
    }
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
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifications</h3>
            {totalUnread > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                {totalUnread} new
              </span>
            )}
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
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {localNotifications.length === 0 && pendingRequests === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No new notifications
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
                {localNotifications.map((notif, index) => (
                  <div
                    key={index}
                    className="p-3 border-b border-gray-700 hover:bg-gray-700 flex items-start gap-3 group"
                  >
                    <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">
                        {notif.title || 'New Notification'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notif.content || notif.message || ''}
                      </p>
                      {notif.senderUsername && (
                        <p className="text-xs text-blue-400 mt-1">
                          From: {notif.senderUsername}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDismissNotification(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition"
                    >
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-700">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-xs text-gray-400 hover:text-white py-1 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
