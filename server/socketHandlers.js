const tileService = require('./services/tileService');
const achievementService = require('./services/achievementService');

module.exports = (io) => {
  // Store active runners
  const activeRunners = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    let userId = null;
    let currentRunId = null;

    // User authentication
    socket.on('authenticate', (data) => {
      userId = data.userId;
      socket.join(`user:${userId}`);
      console.log(`User ${userId} authenticated`);
    });

    // Start tracking
    socket.on('start-tracking', (data) => {
      if (!userId) return;
      
      currentRunId = data.runId;
      activeRunners.set(userId, {
        socketId: socket.id,
        userId,
        runId: currentRunId,
        lastPosition: null,
        startedAt: new Date()
      });
      
      // Notify others that a new runner is active
      socket.broadcast.emit('runner-started', {
        userId,
        runId: currentRunId
      });
      
      console.log(`User ${userId} started tracking run ${currentRunId}`);
    });

    // Location update
    socket.on('location-update', async (data) => {
      if (!userId) return;
      
      const { lat, lng, speed, heading, accuracy, timestamp } = data;
      
      // Update active runner position
      if (activeRunners.has(userId)) {
        const runner = activeRunners.get(userId);
        runner.lastPosition = { lat, lng, speed, heading, timestamp };
        activeRunners.set(userId, runner);
        
        // Broadcast to others in the area (simplified - you can add geofencing)
        socket.broadcast.emit('runner-position-update', {
          userId,
          position: { lat, lng, speed, heading },
          timestamp
        });
      }
      
      // Try to capture tile
      if (currentRunId) {
        try {
          const result = await tileService.captureTile(userId, lat, lng, currentRunId);
          
          if (result.isNew) {
            // Notify user of new tile capture
            socket.emit('tile-captured', {
              tile: result.tile,
              totalTiles: await getTotalTilesCount(userId)
            });
            
            // Broadcast to all users
            io.emit('tile-captured-global', {
              userId,
              tile: result.tile
            });
            
            // Check for achievements
            const achievements = await achievementService.checkAchievements(userId);
            if (achievements.length > 0) {
              socket.emit('achievements-unlocked', achievements);
            }
          }
        } catch (error) {
          console.error('Error capturing tile:', error);
        }
      }
    });

    // Stop tracking
    socket.on('stop-tracking', (data) => {
      if (!userId) return;
      
      activeRunners.delete(userId);
      
      socket.broadcast.emit('runner-stopped', {
        userId,
        runId: currentRunId
      });
      
      console.log(`User ${userId} stopped tracking`);
      currentRunId = null;
    });

    // Get active runners in area
    socket.on('get-active-runners', (data) => {
      const { bounds } = data; // { minLat, minLng, maxLat, maxLng }
      
      const runnersInArea = Array.from(activeRunners.values())
        .filter(runner => {
          if (!runner.lastPosition) return false;
          const { lat, lng } = runner.lastPosition;
          return lat >= bounds.minLat && lat <= bounds.maxLat &&
                 lng >= bounds.minLng && lng <= bounds.maxLng;
        })
        .map(runner => ({
          userId: runner.userId,
          position: runner.lastPosition
        }));
      
      socket.emit('active-runners', runnersInArea);
    });

    // Join run room (for spectating)
    socket.on('join-run-room', (data) => {
      const { runId } = data;
      socket.join(`run:${runId}`);
      console.log(`Socket ${socket.id} joined run room ${runId}`);
    });

    // Leave run room
    socket.on('leave-run-room', (data) => {
      const { runId } = data;
      socket.leave(`run:${runId}`);
      console.log(`Socket ${socket.id} left run room ${runId}`);
    });

    // Route replay events
    socket.on('start-replay', (data) => {
      const { runId, routePoints } = data;
      socket.join(`replay:${runId}`);
      
      // Emit route points progressively
      let index = 0;
      const interval = setInterval(() => {
        if (index >= routePoints.length) {
          clearInterval(interval);
          socket.emit('replay-complete', { runId });
          return;
        }
        
        socket.emit('replay-point', {
          runId,
          point: routePoints[index],
          index,
          total: routePoints.length
        });
        
        index++;
      }, 100); // Emit point every 100ms
      
      // Store interval ID to clear on disconnect
      socket.replayInterval = interval;
    });

    // Stop replay
    socket.on('stop-replay', () => {
      if (socket.replayInterval) {
        clearInterval(socket.replayInterval);
        socket.replayInterval = null;
      }
    });

    // Challenge progress update
    socket.on('challenge-progress', async (data) => {
      if (!userId) return;
      
      const { challengeId, progress } = data;
      
      socket.emit('challenge-updated', {
        challengeId,
        progress
      });
    });

    // Segment detection
    socket.on('segment-entered', (data) => {
      const { segmentId, timestamp } = data;
      console.log(`User ${userId} entered segment ${segmentId}`);
      
      socket.emit('segment-tracking-started', {
        segmentId,
        startTime: timestamp
      });
    });

    socket.on('segment-completed', async (data) => {
      const { segmentId, elapsedTime } = data;
      
      socket.emit('segment-completed-notification', {
        segmentId,
        elapsedTime
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      if (userId) {
        activeRunners.delete(userId);
        socket.broadcast.emit('runner-disconnected', { userId });
      }
      
      if (socket.replayInterval) {
        clearInterval(socket.replayInterval);
      }
    });
  });

  // Helper function
  async function getTotalTilesCount(userId) {
    const stats = await tileService.getTileStats(userId);
    return stats.total_tiles || 0;
  }
};
