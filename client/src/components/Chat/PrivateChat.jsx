import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { Send, User, Users, ArrowLeft, Trash2, MoreVertical, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';

const PrivateChat = () => {
  const { user } = useContext(AuthContext);
  const { socket, isConnected, markMessagesRead } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' | 'friends'
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showDeleteMenu, setShowDeleteMenu] = useState(null); // messageId of message with open menu
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
    <div className="flex h-full relative overflow-hidden">
      {/* Conversations Sidebar */}
      <div 
        className={`
          w-80 border-r border-gray-700 flex flex-col bg-gray-900
          md:static md:block
          ${selectedUser ? 'hidden' : 'block absolute inset-0 z-10 w-full'}
        `}
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-700 flex-shrink-0">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 p-3 flex items-center justify-center gap-2 transition ${
              activeTab === 'conversations'
                ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:bg-gray-800/50'
            }`}
          >
            <User size={18} />
            <span className="text-sm font-semibold">Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 p-3 flex items-center justify-center gap-2 transition ${
              activeTab === 'friends'
                ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:bg-gray-800/50'
            }`}
          >
            <Users size={18} />
            <span className="text-sm font-semibold">Friends</span>
            {friends.length > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {friends.length}
              </span>
            )}
          </button>
        </div>

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversations.length === 0 ? (
              <div className="p-4 text-gray-400 text-center">
                <p className="mb-2">No conversations yet</p>
                <button
                  onClick={() => setActiveTab('friends')}
                  className="text-blue-400 text-sm hover:underline"
                >
                  Start chatting with friends →
                </button>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.other_user_id}
                  onClick={() => selectConversation(conv.other_user_id, conv.other_username)}
                  className={`p-4 cursor-pointer transition border-b border-gray-700 hover:bg-gray-800 ${
                    selectedUser?.id === conv.other_user_id ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                        {conv.other_username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{conv.other_username}</div>
                        {conv.last_message_content && (
                          <div className="text-sm text-gray-400 truncate">
                            {conv.last_message_sender === user.username ? 'You: ' : ''}
                            {conv.last_message_content}
                          </div>
                        )}
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ml-2">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  {conv.last_message_at && (
                    <div className="text-xs text-gray-500 mt-2">
                      {formatTime(conv.last_message_at)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {friends.length === 0 ? (
              <div className="p-4 text-gray-400 text-center">
                <p>No friends yet</p>
                <p className="text-sm mt-2">Add friends from the leaderboard or global chat</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => selectConversation(friend.id, friend.username)}
                  className={`p-4 cursor-pointer transition border-b border-gray-700 hover:bg-gray-800 ${
                    selectedUser?.id === friend.id ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold flex-shrink-0">
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{friend.username}</div>
                      <div className="text-xs text-gray-400">Click to start chatting</div>
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 flex-shrink-0">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div 
        className={`
          flex-1 flex flex-col bg-gray-900
          md:block
          ${!selectedUser ? 'hidden' : 'block absolute inset-0 z-20 w-full'}
        `}
      >
        {selectedUser ? (
          <>
            {/* Chat Header with Back Button */}
            <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={handleBack}
                className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold flex-shrink-0">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{selectedUser.username}</div>
                <div className="text-xs text-green-400">● Online</div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 min-h-0 flex flex-col"
            >
              {loading ? (
                <div className="text-center text-gray-400">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p>No messages yet</p>
                  <p className="text-sm mt-2">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = String(msg.sender_id) === String(user.id);
                  return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} relative group`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] rounded-lg p-3 break-words relative ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      } ${msg.pending ? 'opacity-70' : ''} ${msg.failed ? 'bg-red-600' : ''}`}
                    >
                      <div className="break-words">{msg.content}</div>
                      <div className="text-xs opacity-70 mt-1 flex items-center gap-1 justify-between">
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                        {msg.pending && <span className="animate-pulse">Sending...</span>}
                        {msg.failed && <span className="text-red-200">Failed</span>}
                      </div>
                      
                      {/* Delete button - only show for own messages */}
                      {isOwnMessage && !msg.pending && !msg.failed && (
                        <button
                          onClick={(e) => toggleDeleteMenu(e, msg.id)}
                          className="absolute -top-2 -right-2 bg-gray-800 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                          title="Delete message"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      
                      {/* Delete confirmation menu */}
                      {showDeleteMenu === msg.id && (
                        <div 
                          className="absolute top-0 right-0 mt-8 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1 min-w-[120px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2 text-sm"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800 flex-shrink-0">
              <div className="relative">
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-0"
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
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition flex-shrink-0"
                  >
                    <Send size={20} />
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <User size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivateChat;
