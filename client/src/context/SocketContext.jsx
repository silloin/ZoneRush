import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { getSocketURL, getSocketOptions } from '../services/socketConfig';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    friendRequests: 0,
    notifications: 0
  });

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const SOCKET_URL = getSocketURL();
    
    const newSocket = io(SOCKET_URL, getSocketOptions());

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      setIsConnected(true);
      
      // Authenticate user with socket server
      if (user && user.id) {
        // Try to get user's current position to send with authentication
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              newSocket.emit('authenticate', {
                userId: user.id,
                username: user.username,
                initialPosition: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                }
              });
            },
            (error) => {
              console.warn('Unable to get position for authentication:', error);
              // Authenticate without position
              newSocket.emit('authenticate', {
                userId: user.id,
                username: user.username
              });
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        } else {
          // Geolocation not available
          newSocket.emit('authenticate', {
            userId: user.id,
            username: user.username
          });
        }
      } else {
        console.warn('Socket connected but user not authenticated yet');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      // Suppress "Invalid namespace" errors - these are non-critical
      if (error.message && error.message.includes('Invalid namespace')) {
        console.warn('⚠️ Socket namespace warning (non-critical):', error.message);
        return;
      }
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // Online users update
    socket.on('users-online', (users) => {
      setOnlineUsers(users);
    });

    // Friend request notification
    socket.on('notification-received', (data) => {
      console.log('📬 Notification received:', data);
      setNotifications(prev => [data, ...prev]);
      
      if (data.type === 'friend_request') {
        setUnreadCounts(prev => ({
          ...prev,
          friendRequests: prev.friendRequests + 1
        }));
      }
    });

    // Friend request accepted
    socket.on('friend-request-accepted', (data) => {
      console.log('🤝 Friend request accepted:', data);
      setNotifications(prev => [{
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        content: `${data.accepterUsername} accepted your friend request`,
        ...data
      }, ...prev]);
    });

    // New message received
    socket.on('message-received', (data) => {
      console.log('💬 Message received:', data);
      setUnreadCounts(prev => ({
        ...prev,
        messages: prev.messages + 1
      }));
    });

    // Cleanup
    return () => {
      socket.off('users-online');
      socket.off('notification-received');
      socket.off('friend-request-accepted');
      socket.off('message-received');
    };
  }, [socket]);

  // Send message via socket (optional, falls back to REST)
  const sendSocketMessage = useCallback((receiverId, content) => {
    if (!socket || !isConnected) return false;
    
    socket.emit('send-message', {
      receiverId,
      content,
      timestamp: new Date().toISOString()
    });
    return true;
  }, [socket, isConnected]);

  // Mark messages as read
  const markMessagesRead = useCallback((count = 0) => {
    setUnreadCounts(prev => ({
      ...prev,
      messages: Math.max(0, prev.messages - count)
    }));
  }, []);

  // Mark friend requests as read
  const markFriendRequestsRead = useCallback(() => {
    setUnreadCounts(prev => ({
      ...prev,
      friendRequests: 0
    }));
  }, []);

  // Clear notification
  const clearNotification = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Check if user is online
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.some(u => u.userId === userId);
  }, [onlineUsers]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    notifications,
    unreadCounts,
    sendSocketMessage,
    markMessagesRead,
    markFriendRequestsRead,
    clearNotification,
    isUserOnline
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
