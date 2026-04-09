const { redisClient, isRedisAvailable } = require('./middleware/rateLimiter');

module.exports = function (io) {
  // Use Redis to track connected users instead of in-memory Map if available
  const PRESENCE_KEY = 'user_presence';
  // In-memory fallback when Redis unavailable
  const memoryPresence = new Map();
  // Track user socket mappings for private messaging
  const userSocketMap = new Map(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user-specific room for private notifications
    socket.on('join-user-room', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        userSocketMap.set(userId, socket.id);
        console.log(`User ${userId} joined room user:${userId}`);
      }
    });

    // Handle private messaging
    socket.on('send-message', (data) => {
      const { receiverId, content, messageId } = data;
      
      // Emit to receiver's room
      io.to(`user:${receiverId}`).emit('message-received', {
        messageId,
        senderId: userSocketMap.get(socket.id),
        content,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Message sent to user:${receiverId}`);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { receiverId } = data;
      io.to(`user:${receiverId}`).emit('user-typing', {
        userId: userSocketMap.get(socket.id),
        timestamp: new Date().toISOString()
      });
    });

    // When a user joins/authenticates
    socket.on('user-join', async (data) => {
      const { userId, username, location } = data;
      
      // Store userId to socket mapping
      userSocketMap.set(userId, socket.id);
      socket.userId = userId;
      socket.username = username;
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      
      const userData = JSON.stringify({
        userId,
        username,
        location,
        socketId: socket.id,
        lastSeen: Date.now()
      });

      if (isRedisAvailable()) {
        // Store in Redis
        await redisClient.hSet(PRESENCE_KEY, socket.id, userData);
        // Get all online users from Redis
        const allUsersRaw = await redisClient.hGetAll(PRESENCE_KEY);
        const onlineUsers = Object.values(allUsersRaw).map(u => JSON.parse(u));
        io.emit('users-online', onlineUsers);
      } else {
        // In-memory fallback
        memoryPresence.set(socket.id, { userId, username, location, socketId: socket.id, lastSeen: Date.now() });
        io.emit('users-online', Array.from(memoryPresence.values()));
      }
      
      console.log(`${username} joined. Total online: ${isRedisAvailable() ? Object.keys(await redisClient.hGetAll(PRESENCE_KEY)).length : memoryPresence.size}`);
    });

    // Handle tile capture events
    socket.on('tile-capture', (data) => {
      const { tileGeohash, userId, username, tile } = data;

      // Broadcast tile capture to all connected clients
      io.emit('tile-captured', {
        tileGeohash,
        userId,
        username,
        tile,
        timestamp: new Date(),
      });

      console.log(`${username} captured tile: ${tileGeohash}`);
    });

    // Handle run start
    socket.on('run-start', (data) => {
      const { userId, username, startLocation } = data;

      // Notify others that user started a run
      socket.broadcast.emit('run-started', {
        userId,
        username,
        startLocation,
        timestamp: new Date(),
      });

      console.log(`${username} started a run`);
    });

    // Handle run completion
    socket.on('run-complete', (data) => {
      const { userId, username, distance, duration, route } = data;

      // Broadcast run completion to all clients
      io.emit('run-completed', {
        userId,
        username,
        distance,
        duration,
        route,
        timestamp: new Date(),
      });

      console.log(`${username} completed a run: ${distance}km`);
    });

    // Handle real-time location updates (live tracking)
    socket.on('location-update', async (data) => {
      const { userId, latitude, longitude, accuracy } = data;

      if (isRedisAvailable()) {
        // Update user's location in Redis
        const rawUser = await redisClient.hGet(PRESENCE_KEY, socket.id);
        if (rawUser) {
          const user = JSON.parse(rawUser);
          user.location = { lat: latitude, lng: longitude, accuracy };
          user.lastSeen = Date.now();
          await redisClient.hSet(PRESENCE_KEY, socket.id, JSON.stringify(user));
        }
      } else {
        // In-memory fallback
        const user = memoryPresence.get(socket.id);
        if (user) {
          user.location = { lat: latitude, lng: longitude, accuracy };
          user.lastSeen = Date.now();
        }
      }

      // Broadcast location update to all clients
      socket.broadcast.emit('location-updated', {
        userId,
        location: { lat: latitude, lng: longitude, accuracy },
        timestamp: new Date(),
      });
    });

    // Handle achievement unlock
    socket.on('achievement-unlock', (data) => {
      const { userId, username, achievementName, achievementIcon } = data;

      io.emit('achievement-unlocked', {
        userId,
        username,
        achievementName,
        achievementIcon,
        timestamp: new Date(),
      });

      console.log(`${username} unlocked achievement: ${achievementName}`);
    });

    // Handle territory capture (War mechanic)
    socket.on('territory-captured', (data) => {
      const { userId, username, territoryId, area, points, battles } = data;

      io.emit('territory-updated', {
        userId,
        username,
        territoryId,
        area,
        points,
        battles,
        timestamp: new Date(),
      });

      console.log(`${username} captured territory: ${territoryId} (${area} km², ${points} points)`);
    });

    // Handle territory stolen (War mechanic)
    socket.on('territory-stolen', (data) => {
      const { attackerId, attackerName, defenderId, defenderName, territoryId, pointsStolen } = data;

      io.emit('territory-stolen-broadcast', {
        attackerId,
        attackerName,
        defenderId,
        defenderName,
        territoryId,
        pointsStolen,
        timestamp: new Date(),
      });

      console.log(`${attackerName} stole territory from ${defenderName}: ${pointsStolen} points`);
    });

    // Handle battle initiated
    socket.on('battle-initiated', (data) => {
      const { attackerId, attackerName, defenderId, defenderName, territoryId } = data;

      // Notify both players
      io.emit('battle-notification', {
        attackerId,
        attackerName,
        defenderId,
        defenderName,
        territoryId,
        timestamp: new Date(),
      });

      console.log(`Battle: ${attackerName} vs ${defenderName} for territory ${territoryId}`);
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      // Remove from userSocketMap
      if (socket.userId) {
        userSocketMap.delete(socket.userId);
        // Leave user room
        socket.leave(`user:${socket.userId}`);
      }
      
      if (isRedisAvailable()) {
        await redisClient.hDel(PRESENCE_KEY, socket.id);
        const allUsersRaw = await redisClient.hGetAll(PRESENCE_KEY);
        const onlineUsers = Object.values(allUsersRaw).map(u => JSON.parse(u));
        io.emit('users-online', onlineUsers);
        console.log(`User disconnected: ${socket.id}. Total online: ${onlineUsers.length}`);
      } else {
        memoryPresence.delete(socket.id);
        io.emit('users-online', Array.from(memoryPresence.values()));
        console.log(`User disconnected: ${socket.id}. Total online: ${memoryPresence.size}`);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};
