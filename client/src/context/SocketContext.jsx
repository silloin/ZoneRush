import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

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

    // Smart URL detection: works for both localhost and production
    const getSocketUrl = () => {
      // If explicitly set, use it
      if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
      }
      
      // For production, use the Render backend URL
      if (import.meta.env.PROD) {
        return 'https://zonerush-api.onrender.com';
      }
      
      // For development, use localhost
      return 'http://localhost:5000';
    };

    const SOCKET_URL = getSocketUrl();
    
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      setIsConnected(true);
      
      // Join user-specific room for private notifications
      newSocket.emit('join-user-room', user.id);
      
      // Announce presence
      newSocket.emit('user-join', {
        userId: user.id,
        username: user.username
      });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
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
