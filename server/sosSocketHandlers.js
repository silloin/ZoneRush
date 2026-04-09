const pool = require('./config/db');

module.exports = (io) => {
  // Store active SOS tracking sessions
  const activeSOSTracking = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    let userId = null;

    // User authentication
    socket.on('authenticate', (data) => {
      userId = data.userId;
      socket.join(`user:${userId}`);
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      
      // Send confirmation
      socket.emit('authenticated', { userId });
    });

    // Start SOS live tracking
    socket.on('start-sos-tracking', async (data) => {
      if (!userId) {
        socket.emit('sos-error', { message: 'User not authenticated' });
        return;
      }

      const { sosId, latitude, longitude } = data;
      
      // Store active SOS session
      activeSOSTracking.set(userId, {
        socketId: socket.id,
        userId,
        sosId,
        lastPosition: { latitude, longitude },
        startedAt: new Date(),
        viewers: new Set() // Emergency contacts viewing this location
      });

      // Notify emergency contacts that tracking started
      socket.to(`emergency-contacts:${userId}`).emit('sos-tracking-started', {
        userId,
        sosId,
        startedAt: new Date()
      });

      console.log(`User ${userId} started SOS live tracking for session ${sosId}`);
      
      socket.emit('sos-tracking-confirmed', {
        message: 'Live tracking activated. Your location is being shared.',
        sosId
      });
    });

    // Update SOS location (continuous updates)
    socket.on('sos-location-update', async (data) => {
      if (!userId || !activeSOSTracking.has(userId)) return;

      const { latitude, longitude, accuracy, speed, heading } = data;
      const sosSession = activeSOSTracking.get(userId);

      // Update position
      sosSession.lastPosition = { latitude, longitude, accuracy, speed, heading };

      // Broadcast to all emergency contacts watching this user
      io.to(`emergency-contacts:${userId}`).emit('sos-live-update', {
        userId,
        sosId: sosSession.sosId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        timestamp: new Date().toISOString()
      });

      // Optional: Log high-frequency updates to database (throttled)
      // You might want to save every 10-30 seconds, not every update
    });

    // Emergency contact joins tracking room to watch
    socket.on('join-emergency-tracking', (data) => {
      const { targetUserId } = data;
      
      if (!userId) return;

      // Add to the tracking room for this user
      socket.join(`emergency-contacts:${targetUserId}`);
      
      // Mark as viewer
      if (activeSOSTracking.has(targetUserId)) {
        activeSOSTracking.get(targetUserId).viewers.add(socket.id);
      }

      console.log(`Contact ${userId} joined tracking for user ${targetUserId}`);

      // Send current position immediately
      const session = activeSOSTracking.get(targetUserId);
      if (session && session.lastPosition) {
        socket.emit('sos-live-update', {
          userId: targetUserId,
          sosId: session.sosId,
          ...session.lastPosition,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Stop SOS tracking
    socket.on('stop-sos-tracking', () => {
      if (!userId || !activeSOSTracking.has(userId)) return;

      const session = activeSOSTracking.get(userId);
      
      // Notify all viewers that tracking stopped
      io.to(`emergency-contacts:${userId}`).emit('sos-tracking-stopped', {
        userId,
        sosId: session.sosId,
        stoppedAt: new Date(),
        finalPosition: session.lastPosition
      });

      // Clean up
      activeSOSTracking.delete(userId);
      
      console.log(`User ${userId} stopped SOS tracking`);

      socket.emit('sos-tracking-stopped', {
        message: 'Live tracking stopped. You are safe now.'
      });
    });

    // Emergency contact requests location history
    socket.on('get-sos-history', async (data) => {
      const { targetUserId, limit = 50 } = data;
      
      try {
        const result = await pool.query(
          `SELECT * FROM sos_alerts 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2`,
          [targetUserId, limit]
        );

        socket.emit('sos-history', {
          userId: targetUserId,
          alerts: result.rows
        });
      } catch (err) {
        console.error('Error fetching SOS history:', err.message);
        socket.emit('sos-error', { message: 'Failed to fetch history' });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);

      if (userId) {
        // Remove from active SOS tracking
        if (activeSOSTracking.has(userId)) {
          const session = activeSOSTracking.get(userId);
          
          // Notify viewers
          io.to(`emergency-contacts:${userId}`).emit('sos-user-disconnected', {
            userId,
            sosId: session.sosId,
            lastPosition: session.lastPosition,
            timestamp: new Date()
          });

          activeSOSTracking.delete(userId);
        }

        // Leave all rooms
        socket.leave(`user:${userId}`);
      }

      // Remove from any viewer lists
      activeSOSTracking.forEach((session, uid) => {
        session.viewers.delete(socket.id);
      });
    });

    // Error handling
    socket.on('error', (err) => {
      console.error(`Socket error for user ${userId}:`, err.message);
    });
  });

  // Cleanup inactive sessions periodically
  setInterval(() => {
    const now = new Date();
    activeSOSTracking.forEach((session, userId) => {
      // If no updates in 5 minutes, consider it inactive
      const lastUpdate = session.lastPosition?.timestamp;
      if (lastUpdate && (now - new Date(lastUpdate)) > 5 * 60 * 1000) {
        console.log(`Cleaning up inactive SOS session for user ${userId}`);
        activeSOSTracking.delete(userId);
      }
    });
  }, 60 * 1000); // Check every minute

  return {
    getActiveSOSTracking: () => activeSOSTracking,
    broadcastToEmergencyContacts: (userId, event, data) => {
      io.to(`emergency-contacts:${userId}`).emit(event, data);
    }
  };
};
