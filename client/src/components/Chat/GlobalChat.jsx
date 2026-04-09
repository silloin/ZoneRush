import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { Send, Globe, Trash2, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserProfileModal from './UserProfileModal';

const GlobalChat = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get('/global-chat/global?limit=100');
      // Ensure it's always an array
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching global messages:', err);
      // Set empty array on error
      setMessages([]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/global-chat/global',
        { content: messageInput },
        {
          headers: { 'x-auth-token': token }
        }
      );

      // Add message to local state - ensure it's an array
      setMessages(prev => [...Array.isArray(prev) ? prev : [], res.data.messageData]);
      setMessageInput('');
      setShowEmojiPicker(false); // Close emoji picker after sending
    } catch (err) {
      console.error('Error sending global message:', err);
      alert(err.response?.data?.message || 'Failed to send message');
    }
  };

  // Emoji picker handler
  const onEmojiClick = (emojiData) => {
    setMessageInput(prev => prev + emojiData.emoji);
  };

  const deleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/global-chat/global/${messageId}`, {
        headers: { 'x-auth-token': token }
      });

      // Remove from local state
      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  const handleUserClick = (senderId, senderUsername) => {
    if (senderId !== user.id) {
      setSelectedUser({ id: senderId, username: senderUsername });
      setIsProfileModalOpen(true);
    }
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedUser(null);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      return `${Math.floor(diff / (1000 * 60))}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-3">
          <Globe size={24} className="text-green-500" />
          <div>
            <h2 className="text-lg font-semibold">Global Chat</h2>
            <p className="text-sm text-gray-400">Public chatroom for all users</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p>No messages yet. Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[70%]">
                <div className="flex items-center space-x-2 mb-1">
                  <span 
                    className="font-semibold text-blue-400 cursor-pointer hover:text-blue-300 transition hover:underline"
                    onClick={() => handleUserClick(msg.sender_id, msg.sender_username)}
                    title="Click to view profile"
                  >
                    {msg.sender_username}
                  </span>
                  <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                  {msg.sender_id === user.id && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="text-gray-500 hover:text-red-400 transition"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div
                  className={`rounded-lg p-3 ${
                    msg.sender_id === user.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.deleted ? (
                    <em className="text-gray-400">Message deleted</em>
                  ) : (
                    <div>{msg.content}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="relative">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message to everyone..."
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition flex-shrink-0"
            >
              <Smile size={20} />
            </button>
            <button
              type="submit"
              disabled={!messageInput.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition flex items-center space-x-2"
            >
              <Send size={20} />
              <span>Send</span>
            </button>
          </form>
          
          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full right-0 mb-2 z-50"
              >
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  theme="dark"
                  width={300}
                  height={350}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Max 500 characters • Be respectful!
        </p>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        userId={selectedUser?.id}
        username={selectedUser?.username}
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />
    </div>
  );
};

export default GlobalChat;
