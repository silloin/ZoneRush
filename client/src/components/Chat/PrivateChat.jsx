import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { Send, User, Users, Trash2, MoreVertical, Smile, MessageCircle } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../Avatar';
import Card from '../ui/Card';

const PrivateChat = ({ onChatStateChange }) => {
  const { user } = useContext(AuthContext);
  const { socket, isConnected, markMessagesRead } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Notify parent about chat state
  useEffect(() => {
    if (onChatStateChange) {
      onChatStateChange(!!selectedUser);
    }
  }, [selectedUser, onChatStateChange]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' | 'friends'
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showDeleteMenu, setShowDeleteMenu] = useState(null); // messageId of message with open menu
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(320);

  // Calculate responsive emoji picker width
  useEffect(() => {
    const updateWidth = () => {
      setEmojiPickerWidth(Math.min(320, window.innerWidth - 32));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (selectedUser && data.senderId === selectedUser.id) {
        setMessages(prev => [...prev, {
          id: data.messageId || Date.now(),
          sender_id: data.senderId,
          receiver_id: user.id,
          content: data.content,
          created_at: new Date().toISOString(),
          sender_username: data.senderUsername
        }]);
        markMessagesRead(1);
      } else {
        fetchConversations();
      }
    };

    socket.on('message-received', handleNewMessage);

    return () => {
      socket.off('message-received', handleNewMessage);
    };
  }, [socket, selectedUser, user.id, markMessagesRead]);

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

  const fetchConversations = async () => {
    try {
      const res = await axios.get('/messages/conversations');
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setConversations([]);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get('/friends/list');
      setFriends(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setFriends([]);
    }
  };

  const selectConversation = async (otherUserId, otherUsername) => {
    setSelectedUser({ id: otherUserId, username: otherUsername });
    setLoading(true);
    
    try {
      const res = await axios.get(`/messages/conversation/${otherUserId}`);
      const messagesData = Array.isArray(res.data) ? res.data : [];
      setMessages(messagesData);
      
      const unreadCount = messagesData.filter(m => m.receiver_id === user.id && !m.is_read).length;
      if (unreadCount > 0) {
        markMessagesRead(unreadCount);
        fetchConversations();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUser) return;

    const tempMessage = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: messageInput,
      created_at: new Date().toISOString(),
      sender_username: user.username,
      pending: true
    };

    setMessages(prev => [...prev, tempMessage]);
    setMessageInput('');
    setShowEmojiPicker(false); // Close emoji picker after sending

    try {
      const res = await axios.post('/messages/private', {
        receiverId: selectedUser.id,
        content: messageInput
      });

      setMessages(prev => 
        prev.map(m => m.id === tempMessage.id ? { ...res.data.messageData, pending: false } : m)
      );
      
      fetchConversations();
      
      if (socket && isConnected) {
        socket.emit('send-message', {
          receiverId: selectedUser.id,
          content: messageInput,
          messageId: res.data.messageData.id
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
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

  const handleBack = () => {
    setSelectedUser(null);
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      await axios.delete(`/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setShowDeleteMenu(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      alert(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const toggleDeleteMenu = (e, messageId) => {
    e.stopPropagation();
    setShowDeleteMenu(showDeleteMenu === messageId ? null : messageId);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Conversations Sidebar - WhatsApp Style */}
      <div 
        className={`
          w-full md:w-96 border-r border-gray-700/50 flex flex-col bg-gray-900/50 backdrop-blur-md md:backdrop-blur-xl flex-shrink-0 transition-all
          ${!selectedUser ? 'flex' : 'hidden md:flex'}
        `}
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-700/50 flex-shrink-0 bg-gray-800/40">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 px-4 py-3.5 flex items-center justify-center gap-2 transition-all relative ${
              activeTab === 'conversations'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
          >
            {activeTab === 'conversations' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-600 to-red-500"
              />
            )}
            <MessageCircle size={18} />
            <span className="text-sm font-semibold">Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 px-4 py-3.5 flex items-center justify-center gap-2 transition-all relative ${
              activeTab === 'friends'
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
          >
            {activeTab === 'friends' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-600 to-red-500"
              />
            )}
            <Users size={18} />
            <span className="text-sm font-semibold">Friends</span>
            {friends.length > 0 && (
              <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {friends.length}
              </span>
            )}
          </button>
        </div>

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
                <MessageCircle size={64} className="mb-4 opacity-30" />
                <p className="text-base font-medium mb-2">No conversations yet</p>
                <button
                  onClick={() => setActiveTab('friends')}
                  className="text-orange-400 text-sm hover:text-orange-300 transition mt-2"
                >
                  Start chatting with friends →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-700/30">
                {conversations.map((conv) => (
                  <motion.div
                    key={conv.other_user_id}
                    onClick={() => selectConversation(conv.other_user_id, conv.other_username)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedUser?.id === conv.other_user_id ? 'bg-gray-700/40' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar
                          imageUrl={conv.other_user_profile_picture}
                          username={conv.other_username}
                          size="md"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-white truncate text-[15px]">{conv.other_username}</div>
                          {conv.last_message_at && (
                            <div className="text-[11px] text-gray-500 flex-shrink-0 ml-2">
                              {formatTime(conv.last_message_at)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {conv.last_message_content ? (
                            <div className="text-sm text-gray-400 truncate pr-2">
                              {conv.last_message_sender === user.username ? (
                                <span className="text-orange-400/70">You: </span>
                              ) : null}
                              {conv.last_message_content}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">Start a conversation</div>
                          )}
                          {conv.unread_count > 0 && (
                            <span className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 shadow-lg shadow-orange-500/30">
                              {conv.unread_count > 9 ? '9+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
                <Users size={64} className="mb-4 opacity-30" />
                <p className="text-base font-medium mb-2">No friends yet</p>
                <p className="text-sm text-center text-gray-600">Add friends from the leaderboard or global chat</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700/30">
                {friends.map((friend) => (
                  <motion.div
                    key={friend.id}
                    onClick={() => selectConversation(friend.id, friend.username)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedUser?.id === friend.id ? 'bg-gray-700/40' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar
                          imageUrl={friend.profile_picture}
                          username={friend.username}
                          size="md"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-gray-900 rounded-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate text-[15px] mb-0.5">{friend.username}</div>
                        <div className="text-xs text-gray-500">Tap to message</div>
                      </div>
                      <div className="text-orange-400/70 flex-shrink-0">
                        <Send size={16} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div 
        className={`
          flex-1 flex flex-col bg-gray-900 min-w-0 overflow-hidden 
          ${selectedUser ? 'flex' : 'hidden md:flex'}
        `}
      >
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/60 backdrop-blur-md md:backdrop-blur-xl flex items-center space-x-3 flex-shrink-0">
              {/* Mobile Back Button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-700/50 transition flex-shrink-0"
              >
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <Avatar
                imageUrl={selectedUser.profile_picture}
                username={selectedUser.username}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate text-white text-base">{selectedUser.username}</div>
                <div className="text-xs text-green-400 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-3 py-3 bg-gray-900/50 min-h-0"
              style={{ 
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 107, 53, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(33, 150, 243, 0.03) 0%, transparent 50%)',
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-3">Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageCircle size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm mt-2">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: '2px' }}>
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
                    const dateString = messageDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end gap-1.5 group`}
                        style={{ marginTop: '0', marginBottom: '0', paddingTop: '1px', paddingBottom: '1px' }}
                      >
                        {/* Avatar for received messages */}
                        {!isOwnMessage && (
                          <div className={`w-7 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                            <Avatar
                              imageUrl={selectedUser?.profile_picture}
                              username={selectedUser?.username}
                              size="sm"
                            />
                          </div>
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
                          <div className="text-[15px] sm:text-base leading-relaxed break-words pr-16">
                            {msg.content}
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

            {/* Message Input - Inside Chat Area for proper mobile layout */}
            <div 




              className="px-5 py-5 border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-xl flex-shrink-0 shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              id="message-input-container"
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
                      onFocus={() => {
                        // Scroll to bottom when input is focused (keyboard opens)
                        setTimeout(() => {
                          if (messagesContainerRef.current) {
                            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                          }
                          // Scroll input into view on mobile
                          const inputContainer = document.getElementById('message-input-container');
                          if (inputContainer) {
                            inputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
                          }
                        }, 300);
                      }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                        // Scroll to bottom as textarea grows
                        if (messagesContainerRef.current) {
                          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent text-white px-3 py-2.5 sm:px-3 sm:py-2.5 md:px-3 md:py-2.5 focus:outline-none min-w-0 text-sm sm:text-sm placeholder-gray-400 resize-none max-h-32 scrollbar-none leading-relaxed min-h-[40px]"
                      rows="1"
                      style={{ caretColor: '#F97316' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-1.5 mr-1 transition-all flex-shrink-0 hover:scale-110 active:scale-95 rounded-xl ${
                        showEmojiPicker ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <Smile size={18} />
                    </button>
                  </div>
                  
                  {/* Send Button - WhatsApp Style */}
                  <motion.button
                    type="submit"
                    disabled={!messageInput.trim()}
                    whileHover={{ scale: messageInput.trim() ? 1.05 : 1 }}
                    whileTap={{ scale: messageInput.trim() ? 0.95 : 1 }}
                    className={`p-2 rounded-xl transition-all flex-shrink-0 shadow-lg ${
                      messageInput.trim()
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-orange-500/30'
                        : 'bg-gray-700/60 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {messageInput.trim() ? (
                      <Send size={16} className="rotate-45" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 14.5c1.38 0 2.5-1.12 2.5-2.5S13.38 9.5 12 9.5 9.5 10.62 9.5 12s1.12 2.5 2.5 2.5zm0-1.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                        <path d="M17.5 12c0-3.04-2.46-5.5-5.5-5.5S6.5 8.96 6.5 12s2.46 5.5 5.5 5.5 5.5-2.46 5.5-5.5zm-1.5 0c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z"/>
                      </svg>
                    )}
                  </motion.button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-900">
            {/* Empty state removed - user should select a conversation from sidebar */}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivateChat;