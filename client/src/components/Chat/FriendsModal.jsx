import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus } from 'lucide-react';
import FriendRequests from './FriendRequests';
import UserService from '../../services/userService';

const FriendsModal = ({ isOpen, onClose, initialTab = 'friends' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchPendingCount();
    }
  }, [isOpen]);

  const fetchPendingCount = async () => {
    try {
      const res = await UserService.getReceivedRequests();
      const count = Array.isArray(res.data) ? res.data.length : 0;
      setPendingCount(count);
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-white">Friends</h2>
              <p className="text-xs text-gray-400">Manage your friend requests and connections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          <FriendRequests onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default FriendsModal;
