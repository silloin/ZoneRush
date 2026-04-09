import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { UserCheck, UserX, X } from 'lucide-react';
import UserService from '../../services/userService';

const ALLOWED_API_ORIGIN = window.location.origin;

const FriendRequests = ({ onClose }) => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'friends'

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    } else {
      fetchFriends();
    }
  }, [activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await UserService.getReceivedRequests();
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await UserService.getFriendsList();
      setFriends(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const isSafeId = (id) => Number.isInteger(id) && id > 0;

  const acceptRequest = async (requestId) => {
    try {
      await UserService.acceptFriendRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
      fetchFriends();
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept friend request');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await UserService.rejectFriendRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject friend request');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold">Friends</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 px-4 py-2 transition ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Requests {requests.length > 0 && `(${requests.length})`}
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 px-4 py-2 transition ${
            activeTab === 'friends'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Friends {friends.length > 0 && `(${friends.length})`}
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : activeTab === 'requests' ? (
          requests.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <UserCheck size={48} className="mx-auto mb-4 opacity-50" />
              <p>No pending friend requests</p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg">
                    {request.sender_username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{request.sender_username}</div>
                    <div className="text-xs text-gray-400">
                      Sent {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptRequest(request.id)}
                    className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                    title="Accept"
                  >
                    <UserCheck size={20} />
                  </button>
                  <button
                    onClick={() => rejectRequest(request.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                    title="Reject"
                  >
                    <UserX size={20} />
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          friends.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <UserCheck size={48} className="mx-auto mb-4 opacity-50" />
              <p>No friends yet. Send some friend requests!</p>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg mb-3"
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center font-bold text-lg">
                  {friend.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{friend.username}</div>
                  <div className="text-xs text-gray-400">
                    Friends since {new Date(friend.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default FriendRequests;
