import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PrivateChat from './PrivateChat';
import GlobalChat from './GlobalChat';
import NotificationsBell from './NotificationsBell';
import FriendRequests from './FriendRequests';
import axios from 'axios';
import { MessageCircle, Globe, Bell, Users, X } from 'lucide-react';
import Card from '../ui/Card';

const ChatLayout = ({ onPrivateChatActiveChange }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('private'); // 'private', 'global', 'friends', 'notifications'
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    if (onPrivateChatActiveChange) {
      onPrivateChatActiveChange(isChatting);
    }
  }, [isChatting, onPrivateChatActiveChange]);

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
        return <PrivateChat onChatStateChange={setIsChatting} />;
      case 'global':
        return <GlobalChat onChatStateChange={setIsChatting} />;
      case 'friends':
        return <FriendRequests onClose={() => setActiveTab('private')} />;
      case 'notifications':
        return (
          <div className="p-4">
            <NotificationsBell />
          </div>
        );
      default:
        return <PrivateChat onChatStateChange={setIsChatting} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] md:h-full bg-gray-900/50 text-white w-full page-enter">
      {/* Chat Header */}
      {!isChatting && (
        <div className="hidden md:block bg-gray-800/60 backdrop-blur-xl border-b border-gray-700/50 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg sm:text-xl font-bold flex items-center space-x-2 gradient-text">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
              <span className="hidden sm:inline">Chat</span>
            </h1>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex space-x-2 ml-4">
              <button
                onClick={() => setActiveTab('private')}
                className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 font-semibold ${activeTab === 'private'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
              >
                <MessageCircle size={18} />
                <span>Private</span>
              </button>

              <button
                onClick={() => setActiveTab('global')}
                className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 font-semibold ${activeTab === 'global'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
              >
                <Globe size={18} />
                <span>Global</span>
              </button>

              <button
                onClick={() => setActiveTab('friends')}
                className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 font-semibold ${activeTab === 'friends'
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
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
                className="p-2 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 hover:from-blue-500/30 hover:to-purple-500/30 transition-all relative border border-blue-500/30 hover:border-blue-400/50 shadow-lg hover:shadow-blue-500/20 group"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
              >
                <Bell size={20} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-lg shadow-red-500/30 animate-pulse border-2 border-gray-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Tabs */}
      {!isChatting && (
        <div className="md:hidden bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('private')}
              className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center space-x-2 ${activeTab === 'private'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              <MessageCircle size={16} />
              <span>Private</span>
            </button>

            <button
              onClick={() => setActiveTab('global')}
              className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center space-x-2 ${activeTab === 'global'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              <Globe size={16} />
              <span>Global</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center space-x-2 ${activeTab === 'friends'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              <Users size={16} />
              <span>Friends</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 w-full flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};

export default ChatLayout;