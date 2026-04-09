import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PrivateChat from './PrivateChat';
import GlobalChat from './GlobalChat';
import NotificationsBell from './NotificationsBell';
import FriendRequests from './FriendRequests';
import axios from 'axios';
import { MessageCircle, Globe, Bell, Users, X } from 'lucide-react';

const ChatLayout = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('private'); // 'private', 'global', 'friends', 'notifications'
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/notifications/unread/count', {
          headers: { 'x-auth-token': token }
        });
        setUnreadCount(res.data.count);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'private':
        return <PrivateChat />;
      case 'global':
        return <GlobalChat />;
      case 'friends':
        return <FriendRequests onClose={() => setActiveTab('private')} />;
      case 'notifications':
        return (
          <div className="p-4">
            <NotificationsBell />
          </div>
        );
      default:
        return <PrivateChat />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Chat Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="md:hidden p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
          >
            <X size={20} />
          </button>
          <h1 className="text-xl font-bold flex items-center space-x-2">
            <MessageCircle className="w-6 h-6" />
            <span className="hidden sm:inline">Chat</span>
          </h1>
          
          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex space-x-2 ml-4">
            <button
              onClick={() => setActiveTab('private')}
              className={`px-4 py-2 rounded-lg transition flex items-center space-x-2 ${
                activeTab === 'private'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <MessageCircle size={18} />
              <span>Private</span>
            </button>
            
            <button
              onClick={() => setActiveTab('global')}
              className={`px-4 py-2 rounded-lg transition flex items-center space-x-2 ${
                activeTab === 'global'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Globe size={18} />
              <span>Global</span>
            </button>
            
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 rounded-lg transition flex items-center space-x-2 ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Users size={18} />
              <span>Friends</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setActiveTab('notifications')}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Close Button */}
          <button
            onClick={() => navigate(-1)}
            className="hidden md:block p-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="md:hidden bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('private')}
            className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center space-x-2 ${
              activeTab === 'private'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <MessageCircle size={16} />
            <span>Private</span>
          </button>
          
          <button
            onClick={() => setActiveTab('global')}
            className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center space-x-2 ${
              activeTab === 'global'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Globe size={16} />
            <span>Global</span>
          </button>
          
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center space-x-2 ${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Users size={16} />
            <span>Friends</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default ChatLayout;
