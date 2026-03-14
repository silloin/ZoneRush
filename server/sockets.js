module.exports = function (io) {
  // Map to track connected users and their locations
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // When a user joins/authenticates
    socket.on('user-join', (data) => {
      const { userId, username, location } = data;
      connectedUsers.set(socket.id, {
        userId,
        username,
        location,
        socketId: socket.id,
      });

      // Broadcast updated user list to all clients
      io.emit('users-online', Array.from(connectedUsers.values()));
      console.log(`${username} joined. Total online: ${connectedUsers.size}`);
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
    socket.on('location-update', (data) => {
      const { userId, latitude, longitude, accuracy } = data;

      // Update user's location in map
      const user = connectedUsers.get(socket.id);
      if (user) {
        user.location = { lat: latitude, lng: longitude, accuracy };
      }

      // Broadcast location update to all clients
      socket.broadcast.emit('location-updated', {
        userId,
        location: { lat: latitude, lng: longitude, accuracy },
        timestamp: new Date(),
      });
    });

    // Handle zone ranking updates
    socket.on('zone-ranking-update', (data) => {
      const { zoneId, rankings } = data;

      io.emit('zone-rankings-updated', {
        zoneId,
        rankings,
        timestamp: new Date(),
      });

      console.log(`Zone ${zoneId} rankings updated`);
    });

    // Handle chat/messages
    socket.on('send-message', (data) => {
      const { userId, username, message, channel } = data;

      io.emit('message-received', {
        userId,
        username,
        message,
        channel: channel || 'global',
        timestamp: new Date(),
      });

      console.log(`[${channel}] ${username}: ${message}`);
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

    // Handle leaderboard requests
    socket.on('request-leaderboard', (data) => {
      const { type } = data; // 'global', 'city', 'friends'

      // Emit current leaderboard data
      socket.emit('leaderboard-update', {
        type,
        users: Array.from(connectedUsers.values()).sort(
          (a, b) => b.score - a.score
        ),
        timestamp: new Date(),
      });
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);
        io.emit('users-online', Array.from(connectedUsers.values()));
        console.log(`${user.username} disconnected. Remaining: ${connectedUsers.size}`);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

