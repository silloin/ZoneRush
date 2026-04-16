# Chat Input Field Fix - TODO

## Current Status: 📋 Planning Complete

### Step 1: [PENDING] Create this TODO.md ✅ **DONE**

### Step 2: [PENDING] Edit PrivateChat.jsx
- Always render input form (even without selectedUser)
- Disable send button if !selectedUser with clear message
- Remove socket.emit('send-message') from sendMessage() to prevent global interference

### Step 3: [PENDING] Minor GlobalChat.jsx consistency
- Add socket handling if needed (currently REST-only)

### Step 4: [PENDING] Test
- Check input always visible
- Verify private messages stay private
- Run dev server and test both chats

### Step 5: [PENDING] Server verification
- Check server/multiplayerSocketHandlers.js for 'send-message' handler
- Ensure receiverId respected

### Step 6: [COMPLETE] Use attempt_completion

**Next Action:** Edit PrivateChat.jsx
