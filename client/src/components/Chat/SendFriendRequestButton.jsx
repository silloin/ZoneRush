import React, { useState, useEffect, useContext } from 'react';
import { UserPlus, UserCheck, Clock, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import UserService from '../../services/userService';
import axios from 'axios';

const SendFriendRequestButton = ({ targetUserId, targetUsername, onSuccess, onError, size = 'default' }) => {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState('not_friends'); // not_friends, pending_outgoing, pending_incoming, friends
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(null);

  // Check friendship status on mount
  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    checkFriendshipStatus();
  }, [user, targetUserId]);

  const checkFriendshipStatus = async () => {
    try {
      const res = await axios.get(`/friend-requests/status/${targetUserId}`);
      setStatus(res.data.status);
      if (res.data.request) {
        setRequestId(res.data.request.id);
      }
    } catch (err) {
      console.error('Error checking friendship status:', err);
    }
  };

  const handleSendRequest = async () => {
    if (!user) {
      onError?.('Please log in to send friend requests');
      return;
    }

    if (user.id === targetUserId) {
      onError?.('Cannot send friend request to yourself');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/friend-requests/send', { receiverId: targetUserId });
      setStatus('pending_outgoing');
      onSuccess?.('Friend request sent successfully!');
    } catch (err) {
      console.error('Error sending friend request:', err);
      onError?.(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      await UserService.acceptFriendRequest(requestId);
      setStatus('friends');
      onSuccess?.('Friend request accepted!');
    } catch (err) {
      console.error('Error accepting request:', err);
      onError?.('Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      await UserService.rejectFriendRequest(requestId);
      setStatus('not_friends');
      setRequestId(null);
    } catch (err) {
      console.error('Error rejecting request:', err);
      onError?.('Failed to reject friend request');
    } finally {
      setLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    default: 'px-3 py-2 text-sm',
    large: 'px-4 py-3 text-base'
  };

  const iconSizes = {
    small: 14,
    default: 16,
    large: 20
  };

  // Render based on status
  if (status === 'friends') {
    return (
      <button
        disabled
        className={`flex items-center gap-2 ${sizeClasses[size]} bg-green-600/20 text-green-400 rounded-lg cursor-default`}
      >
        <UserCheck size={iconSizes[size]} />
        <span>Friends</span>
      </button>
    );
  }

  if (status === 'pending_outgoing') {
    return (
      <button
        disabled
        className={`flex items-center gap-2 ${sizeClasses[size]} bg-yellow-600/20 text-yellow-400 rounded-lg cursor-default`}
      >
        <Clock size={iconSizes[size]} />
        <span>Request Sent</span>
      </button>
    );
  }

  if (status === 'pending_incoming') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleAcceptRequest}
          disabled={loading}
          className={`flex items-center gap-2 ${sizeClasses[size]} bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50`}
        >
          <UserCheck size={iconSizes[size]} />
          <span>Accept</span>
        </button>
        <button
          onClick={handleRejectRequest}
          disabled={loading}
          className={`p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition disabled:opacity-50`}
        >
          <X size={iconSizes[size]} />
        </button>
      </div>
    );
  }

  // not_friends - default send button
  return (
    <button
      onClick={handleSendRequest}
      disabled={loading}
      className={`flex items-center gap-2 ${sizeClasses[size]} bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50`}
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : (
        <UserPlus size={iconSizes[size]} />
      )}
      <span>Add Friend</span>
    </button>
  );
};

export default SendFriendRequestButton;
