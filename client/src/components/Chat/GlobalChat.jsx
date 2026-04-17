import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { Send, Globe, Trash2, Smile, ArrowLeft, MoreVertical, MessageCircle, Users } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../Avatar';
import { useNavigate } from 'react-router-dom';

const GlobalChat = ({ onChatStateChange }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(320);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Notify parent about chat state
  useEffect(() => {
    if (onChatStateChange) {
      onChatStateChange(isChatOpen);
    }
  }, [isChatOpen, onChatStateChange]);

  // Calculate responsive emoji picker width
  useEffect(() => {
    const updateWidth = () => {
      setEmojiPickerWidth(Math.min(320, window.innerWidth - 32));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }, 0);
    }
  }, [messages]);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDeleteMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

    const tempMessage = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      content: messageInput,
      created_at: new Date().toISOString(),
      sender_username: user.username,
      pending: true
    };

    setMessages(prev => [...Array.isArray(prev) ? prev : [], tempMessage]);
    setMessageInput('');
    setShowEmojiPicker(false);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/global-chat/global',
        { content: messageInput },
        {
          headers: { 'x-auth-token': token }
        }
      );

      // Replace temp message with actual message
      setMessages(prev => 
        prev.map(m => m.id === tempMessage.id ? { ...res.data.messageData, pending: false } : m)
      );
    } catch (err) {
      console.error('Error sending global message:', err);
      setMessages(prev => 
        prev.map(m => m.id === tempMessage.id ? { ...m, failed: true, pending: false } : m)
      );
      alert(err.response?.data?.message || 'Failed to send message');
    }
  };

  // Emoji picker handler
  const onEmojiClick = (emojiData) => {
    setMessageInput(prev => prev + emojiData.emoji);
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/global-chat/global/${messageId}`, {
        headers: { 'x-auth-token': token }
      });

      // Remove from local state
      setMessages(messages.filter(msg => msg.id !== messageId));
      setShowDeleteMenu(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  const toggleDeleteMenu = (e, messageId) => {
    e.stopPropagation();
    setShowDeleteMenu(showDeleteMenu === messageId ? null : messageId);
  };

  const handleUserClick = (senderId, senderUsername, profilePicture) => {
    if (senderId !== user.id) {
      setSelectedUser({ id: senderId, username: senderUsername, profile_picture: profilePicture });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      return `${Math.floor(diff / (1000 * 60))}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-full w-full">
      {/* Debug info */}
      {console.log('GlobalChat render - isChatOpen:', isChatOpen)}
      
      {/* Global Chat Sidebar - WhatsApp Style */}
      <div 
        className={`
          w-full md:w-96 border-r border-gray-700/50 flex flex-col bg-gray-900/50 backdrop-blur-md md:backdrop-blur-xl flex-shrink-0 transition-all
          ${!isChatOpen ? 'flex' : 'hidden md:flex'}
        `}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/40 flex items-center space-x-3 flex-shrink-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
              <Globe size={20} className="text-white" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate text-white text-base">Global Chat</div>
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Public chatroom for all users</span>
            </div>
          </div>
        </div>

        {/* Enter Chat Button */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <Globe size={40} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Global Chat</h3>
            <p className="text-gray-400 mb-6">Join the public conversation with all users</p>
            <button
              onClick={() => setIsChatOpen(true)}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Enter Chat
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      {console.log('Chat area rendering - isChatOpen:', isChatOpen)}
      <div className={`flex-1 flex flex-col h-full ${!isChatOpen ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/60 backdrop-blur-md md:backdrop-blur-xl flex items-center space-x-3 flex-shrink-0">
          {/* Back button - visible only on mobile */}
          <button
            onClick={() => setIsChatOpen(false)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-700/50 transition flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-gray-300" />
          </button>
          
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
              <Globe size={20} className="text-white" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate text-white text-base">Global Chat</div>
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Public chatroom for all users</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-0 bg-gray-900/50 min-h-0 max-h-full scroll-smooth"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 107, 53, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(33, 150, 243, 0.03) 0%, transparent 50%)',
            height: 'calc(100vh - 200px)'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Globe size={64} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-2">Be the first to say hello!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg, index) => {
              const isOwnMessage = String(msg.sender_id) === String(user.id);
              const prevMsg = messages[index - 1];
              const nextMsg = messages[index + 1];
              const isSameSenderAsPrev = prevMsg && String(prevMsg.sender_id) === String(msg.sender_id);
              const isSameSenderAsNext = nextMsg && String(nextMsg.sender_id) === String(msg.sender_id);
              const showAvatar = !isSameSenderAsNext;
              
              // Format time nicely
              const messageDate = new Date(msg.created_at);
              const timeString = messageDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              });

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end gap-1.5 group`}
                >
                  {/* Avatar for received messages */}
                  {!isOwnMessage && (
                    <button
                      onClick={() => handleUserClick(msg.sender_id, msg.sender_username, msg.sender_profile_picture)}
                      className={`w-7 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'} hover:opacity-100 transition-opacity`}
                      title={`View ${msg.sender_username}'s profile`}
                    >
                      <Avatar
                        imageUrl={msg.sender_profile_picture}
                        username={msg.sender_username}
                        size="sm"
                      />
                    </button>
                  )}

                  <div
                    className={`max-w-[75%] sm:max-w-[65%] px-3.5 py-2 break-words relative transition-all hover:shadow-md ${
                      isOwnMessage
                        ? `bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 text-white ${
                            isSameSenderAsNext ? 'rounded-2xl' : 'rounded-2xl rounded-br-md'
                          }`
                        : `bg-gray-800/80 backdrop-blur-sm text-gray-100 border border-gray-700/50 ${
                            isSameSenderAsNext ? 'rounded-2xl' : 'rounded-2xl rounded-bl-md'
                          }` 
                    } ${msg.pending ? 'opacity-60' : ''} ${msg.failed ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-500' : ''}`}
                  >
                    {/* Sender name for received messages */}
                    {!isOwnMessage && !isSameSenderAsPrev && (
                      <div className="text-xs text-green-400 font-semibold mb-1 cursor-pointer hover:underline" onClick={() => handleUserClick(msg.sender_id, msg.sender_username, msg.sender_profile_picture)}>
                        {msg.sender_username}
                      </div>
                    )}
                    
                    <div className="text-[15px] sm:text-base leading-relaxed break-words pr-16">
                      {msg.deleted ? (
                        <em className="text-gray-400">Message deleted</em>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <div className={`absolute bottom-1 ${isOwnMessage ? 'right-3' : 'right-2'} flex items-center gap-1.5`}>
                      {msg.pending && (
                        <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      )}
                      {msg.failed && (
                        <svg className="w-3 h-3 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-[10px] ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                        {timeString}
                      </span>
                      {isOwnMessage && !msg.pending && !msg.failed && (
                        <svg className="w-3.5 h-3.5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Delete button - only show for own messages */}
                    {isOwnMessage && !msg.pending && !msg.failed && (
                      <button
                        onClick={(e) => toggleDeleteMenu(e, msg.id)}
                        className="absolute -top-1.5 -right-1.5 bg-gray-900/90 hover:bg-red-600 text-gray-400 hover:text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10 scale-90 hover:scale-100 backdrop-blur-sm"
                        title="Delete message"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    
                    {/* Delete confirmation menu */}
                    {showDeleteMenu === msg.id && (
                      <div 
                        className="absolute top-0 right-0 mt-6 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-20 py-1 min-w-[120px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-gray-800 flex items-center gap-2 text-sm transition"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div 
        className="px-3 sm:px-4 py-3 sm:py-4 md:px-4 md:py-3 border-t border-gray-700/50 bg-gray-800 backdrop-blur-md md:backdrop-blur-xl flex-shrink-0 shadow-lg"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="relative w-full mx-auto">
          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-0 mb-3 z-50 rounded-xl overflow-hidden shadow-2xl"
              >
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  theme="dark"
                  width={emojiPickerWidth}
                  height={380}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={sendMessage} className="flex items-end gap-2 sm:gap-3">
            {/* Input Container - WhatsApp Style */}
            <div className="flex-1 flex items-center bg-gray-700 rounded-2xl border border-gray-600 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/50 transition-all shadow-lg focus-within:overflow-visible overflow-hidden">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder="Type a message to everyone..."
                className="flex-1 bg-transparent text-white px-3 py-2 sm:px-3 sm:py-2 focus:outline-none min-w-0 text-sm sm:text-sm placeholder-gray-400 resize-none max-h-32 scrollbar-none leading-relaxed"
                rows="1"
                style={{ caretColor: '#F97316' }}
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 mr-1 transition-all flex-shrink-0 hover:scale-110 active:scale-95 rounded-xl ${
                  showEmojiPicker ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Smile size={20} />
              </button>
            </div>
            
            {/* Send Button - WhatsApp Style */}
            <motion.button
              type="submit"
              disabled={!messageInput.trim()}
              whileHover={{ scale: messageInput.trim() ? 1.05 : 1 }}
              whileTap={{ scale: messageInput.trim() ? 0.95 : 1 }}
              className={`p-2.5 sm:p-2.5 md:p-2.5 rounded-xl transition-all flex-shrink-0 shadow-lg ${
                messageInput.trim()
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-orange-500/30'
                  : 'bg-gray-700/60 text-gray-500 cursor-not-allowed'
              }`}
            >
              {messageInput.trim() ? (
                <Send size={18} className="rotate-45" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14.5c1.38 0 2.5-1.12 2.5-2.5S13.38 9.5 12 9.5 9.5 10.62 9.5 12s1.12 2.5 2.5 2.5zm0-1.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                  <path d="M17.5 12c0-3.04-2.46-5.5-5.5-5.5S6.5 8.96 6.5 12s2.46 5.5 5.5 5.5 5.5-2.46 5.5-5.5zm-1.5 0c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z"/>
                </svg>
              )}
            </motion.button>
          </form>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Max 500 characters • Be respectful!
        </p>
      </div>
      </div>
    </div>
  );
};

export default GlobalChat;