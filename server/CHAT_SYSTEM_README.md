# 🚀 Chat & Notification System Documentation

## Overview
Complete real-time chat and notification system integrated into the Location Tracker app.

## Features

### ✅ **Implemented Backend Features**

1. **Friend Request System**
   - Send friend requests
   - Accept/reject friend requests  
   - View pending requests
   - List all friends
   - Check friendship status

2. **Private Messaging (1-on-1)**
   - Send private messages to friends only
   - Get conversation history
   - View all conversations with unread counts
   - Mark messages as read
   - Soft delete messages

3. **Global Chat (Public)**
   - Send messages to all users
   - Get recent global messages
   - Delete own messages
   - Real-time broadcasting

4. **Notifications System**
   - Friend request notifications
   - Private message notifications
   - Achievement notifications
   - System notifications
   - Mark as read / mark all as read
   - Delete notifications

5. **Push Notifications (FCM)**
   - Save FCM tokens
   - Deactivate tokens
   - Ready for Firebase integration

## Database Setup

### Step 1: Run Migration
```bash
cd server
node setup-chat-system.js
```

This will create:
- `friend_requests` table
- `messages` table (private)
- `global_messages` table
- `notifications` table
- `user_fcm_tokens` table
- `user_conversations` view
- All necessary indexes

### Step 2: Verify Tables
```sql
\dt  -- PostgreSQL command to list tables
```

## API Endpoints

### Friend Requests
```
POST   /api/friend-requests/send          - Send friend request
GET    /api/friend-requests/received      - Get received requests
POST   /api/friend-requests/accept/:id    - Accept request
POST   /api/friend-requests/reject/:id    - Reject request
GET    /api/friend-requests/list          - Get friends list
GET    /api/friend-requests/status/:id    - Check friendship status
```

### Private Messages
```
POST   /api/messages/private              - Send private message
GET    /api/messages/conversations        - Get all conversations
GET    /api/messages/conversation/:id     - Get conversation with user
PUT    /api/messages/read/:id             - Mark message as read
DELETE /api/messages/:id                  - Delete message
```

### Global Chat
```
POST   /api/global-chat/global            - Send global message
GET    /api/global-chat/global            - Get global messages
DELETE /api/global-chat/global/:id        - Delete global message
```

### Notifications
```
GET    /api/notifications                 - Get all notifications
GET    /api/notifications/unread/count    - Get unread count
PUT    /api/notifications/read/:id        - Mark as read
PUT    /api/notifications/read-all        - Mark all as read
DELETE /api/notifications/:id            - Delete notification
POST   /api/notifications/fcm-token       - Save FCM token
DELETE /api/notifications/fcm-token/:id  - Deactivate FCM token
```

## Socket.IO Events

### Client → Server
```javascript
// Friend events
socket.emit('send-friend-request', { receiverId })
socket.emit('accept-friend-request', { requestId })

// Message events
socket.emit('send-private-message', { receiverId, content })
socket.emit('send-global-message', { content })

// Notification events
socket.emit('mark-notification-read', { notificationId })
```

### Server → Client
```javascript
// Friend events
socket.on('friend-request-received', (data) => {})
socket.on('friend-request-accepted', (data) => {})

// Message events
socket.on('message-received', (data) => {})
socket.on('global-message', (data) => {})
socket.on('global-message-deleted', (data) => {})

// Notification events
socket.on('notification-received', (data) => {})
```

## Usage Examples

### Send Friend Request
```javascript
const response = await axios.post('/api/friend-requests/send', {
  receiverId: 2
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Send Private Message
```javascript
const response = await axios.post('/api/messages/private', {
  receiverId: 2,
  content: 'Hello!'
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Get Conversations
```javascript
const response = await axios.get('/api/messages/conversations', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Get Notifications
```javascript
const response = await axios.get('/api/notifications?unread=true', {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Next Steps (Frontend Implementation)

### Phase 1: Components to Create
1. **Chat Navigation Bar**
   - Private Chat tab
   - Global Chat tab
   - Notifications bell icon

2. **Private Chat Component**
   - Friends list sidebar
   - Conversation view
   - Message input

3. **Global Chat Component**
   - Message feed
   - Message input
   - User avatars

4. **Notifications Bell Component**
   - Badge showing unread count
   - Dropdown with notifications
   - Mark as read functionality

### Phase 2: Firebase Push Notifications
1. Install Firebase SDK in client
2. Configure Firebase project
3. Request notification permissions
4. Save FCM tokens to backend
5. Send push notifications from backend

## Security Features

✅ JWT Authentication required for all endpoints
✅ Users can only message their friends
✅ Users can only see their own notifications
✅ Soft delete for privacy
✅ Input validation on message length
✅ SQL injection prevention via parameterized queries

## Performance Optimizations

✅ Indexed columns for fast lookups
✅ Pagination support for messages
✅ Partial indexes for unread items
✅ Conversation view for efficient querying
✅ Socket.IO for real-time updates (no polling)
