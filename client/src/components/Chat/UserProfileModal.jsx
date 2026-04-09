import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Trophy, Award, Activity } from 'lucide-react';
import SendFriendRequestButton from './SendFriendRequestButton';
import axios from 'axios';

const UserProfileModal = ({ userId, username, isOpen, onClose }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/users/${userId}/profile`);
      setUserProfile(res.data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (message) => {
    // Could show toast here
    console.log('Success:', message);
  };

  const handleError = (message) => {
    setError(message);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black bg-opacity-30 hover:bg-opacity-50 rounded-full p-2 transition"
          >
            <X size={20} className="text-white" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-3xl font-bold border-4 border-white border-opacity-30">
              {userProfile?.profile_photo_url ? (
                <img 
                  src={userProfile.profile_photo_url} 
                  alt={username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                username?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{username}</h2>
              {userProfile?.city && (
                <div className="flex items-center text-white text-opacity-80 mt-1">
                  <MapPin size={14} className="mr-1" />
                  <span className="text-sm">{userProfile.city}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              Loading profile...
            </div>
          ) : error ? (
            <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              {userProfile && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <Trophy size={20} className="text-yellow-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">{userProfile.level || 1}</div>
                    <div className="text-xs text-gray-400">Level</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <Award size={20} className="text-purple-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">{userProfile.xp || 0}</div>
                    <div className="text-xs text-gray-400">XP</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <Activity size={20} className="text-green-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">
                      {((userProfile.total_distance || 0) / 1000).toFixed(1)} km
                    </div>
                    <div className="text-xs text-gray-400">Distance</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <User size={20} className="text-blue-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">{userProfile.total_tiles || 0}</div>
                    <div className="text-xs text-gray-400">Tiles</div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <SendFriendRequestButton
                  targetUserId={userId}
                  targetUsername={username}
                  onSuccess={handleSuccess}
                  onError={handleError}
                  size="large"
                />
                
                <button
                  onClick={onClose}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition font-semibold"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
