const tileService = require('./services/tileService');
const achievementService = require('./services/achievementService');
const heatmapService = require('./services/heatmapService');
const ngeohash = require('ngeohash');
const { calculateDistance } = require('./utils/geoUtils');

module.exports = (io) => {
  // Store active runners with their locations
  const activeRunners = new Map();
  // Store geographic zones (geohash -> Set of socketIds)
  const geographicZones = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    let userId = null;
    let currentRunId = null;
    let currentZone = null;

    // ============================================
    // AUTHENTICATION
    // ============================================
    
    socket.on('authenticate', (data) => {
      userId = data.userId;
      socket.join(`user:${userId}`);
      
      // Send user their active run if any
      if (activeRunners.has(userId)) {
        const runnerData = activeRunners.get(userId);
        socket.emit('active-run-restored', runnerData);
      }
      
      console.log(`User ${userId} authenticated`);
    });

    // ============================================
    // RUN TRACKING
    // ============================================
    
    socket.on('start-tracking', (data) => {
      if (!userId) return;
      
      currentRunId = data.runId;
      const runnerData = {
        socketId: socket.id,
        userId,
        username: data.username,
        profilePicture: data.profilePicture,
        runId: currentRunId,
        lastPosition: null,
        startedAt: new Date(),
        distance: 0,
        pace: 0
      };
      
      activeRunners.set(userId, runnerData);
      
      // Notify nearby runners
      if (data.initialPosition) {
        updateGeographicZone(socket, data.initialPosition.lat, data.initialPosition.lng);
        broadcastToZone(currentZone, 'runner-started', {
          userId,
          username: data.username,
          profilePicture: data.profilePicture,
          position: data.initialPosition
        }, socket.id);
      }
      
      console.log(`User ${userId} started tracking run ${currentRunId}`);
    });

    // ============================================
    // LOCATION UPDATES
    // ============================================
    
    socket.on('location-update', async (data) => {
      if (!userId || !currentRunId) return;
      
      const { lat, lng, speed, heading, accuracy, timestamp, distance, pace } = data;
      
      // Update runner data
      const runner = activeRunners.get(userId);
      if (runner) {
        runner.lastPosition = { lat, lng, speed, heading, timestamp };
        runner.distance = distance || 0;
        runner.pace = pace || 0;
        activeRunners.set(userId, runner);
      }
      
      // Update geographic zone
      const newZone = updateGeographicZone(socket, lat, lng);
      
      // Broadcast position to nearby runners
      broadcastToZone(newZone, 'runner-position-update', {
        userId,
        position: { lat, lng, speed, heading },
        distance,
        pace,
        timestamp
      }, socket.id);
      
      // Try to capture tile
      try {
        const result = await tileService.captureTile(userId, lat, lng, currentRunId);
        
        if (result.isNew) {
          // Notify user
          socket.emit('tile-captured', {
            tile: result.tile,
            totalTiles: await getTotalTilesCount(userId)
          });
          
          // Broadcast to nearby runners
          broadcastToZone(newZone, 'tile-captured-nearby', {
            userId,
            username: runner?.username,
            tile: result.tile
          }, socket.id);
          
          // Check for achievements
          const achievements = await achievementService.checkAchievements(userId);
          if (achievements.length > 0) {
            socket.emit('achievements-unlocked', achievements);
            
            // Broadcast achievement to followers
            io.to(`user:${userId}`).emit('achievement-notification', {
              userId,
              achievements
            });
          }
        }
      } catch (error) {
        console.error('Error capturing tile:', error);
      }
    });

    // ============================================
    // STOP TRACKING
    // ============================================
    
    socket.on('stop-tracking', async (data) => {
      if (!userId) return;
      
      const runner = activeRunners.get(userId);
      activeRunners.delete(userId);
      
      // Remove from geographic zone
      if (currentZone && geographicZones.has(currentZone)) {
        geographicZones.get(currentZone).delete(socket.id);
      }
      
      // Broadcast to nearby runners
      if (currentZone) {
        broadcastToZone(currentZone, 'runner-stopped', {
          userId,
          runId: currentRunId,
          finalStats: data.finalStats
        }, socket.id);
      }
      
      // Process run for heatmap
      if (currentRunId) {
        try {
          await heatmapService.processRunForHeatmap(currentRunId);
        } catch (error) {
          console.error('Error processing heatmap:', error);
        }
      }
      
      console.log(`User ${userId} stopped tracking`);
      currentRunId = null;
      currentZone = null;
    });

    // ============================================
    // MULTIPLAYER MAP
    // ============================================
    
    socket.on('get-nearby-runners', (data) => {
      const { lat, lng, radius = 5000 } = data;
      
      const nearbyRunners = [];
      const userZone = ngeohash.encode(lat, lng, 6); // ~1.2km precision
      
      // Get runners in same zone and adjacent zones
      const zonesToCheck = [userZone, ...getAdjacentZones(userZone)];
      
      for (const zone of zonesToCheck) {
        if (geographicZones.has(zone)) {
          for (const socketId of geographicZones.get(zone)) {
            const runner = Array.from(activeRunners.values())
              .find(r => r.socketId === socketId);
            
            if (runner && runner.userId !== userId && runner.lastPosition) {
              const distance = calculateDistance(
                lat, lng,
                runner.lastPosition.lat, runner.lastPosition.lng
              );
              
              if (distance <= radius) {
                nearbyRunners.push({
                  userId: runner.userId,
                  username: runner.username,
                  profilePicture: runner.profilePicture,
                  position: runner.lastPosition,
                  distance: runner.distance,
                  pace: runner.pace
                });
              }
            }
          }
        }
      }
      
      socket.emit('nearby-runners', nearbyRunners);
    });

    // ============================================
    // ROUTE REPLAY
    // ============================================
    
    socket.on('start-replay', (data) => {
      const { runId, speed = 1 } = data;
      socket.join(`replay:${runId}`);
      
      // Emit replay started event
      socket.emit('replay-started', { runId, speed });
    });

    socket.on('replay-position-update', (data) => {
      const { runId, position, progress } = data;
      
      // Broadcast to others watching this replay
      socket.to(`replay:${runId}`).emit('replay-position', {
        runId,
        position,
        progress
      });
    });

    socket.on('stop-replay', (data) => {
      const { runId } = data;
      socket.leave(`replay:${runId}`);
      socket.emit('replay-stopped', { runId });
    });

    // ============================================
    // SEGMENT TRACKING
    // ============================================
    
    socket.on('segment-entered', (data) => {
      const { segmentId, timestamp } = data;
      console.log(`User ${userId} entered segment ${segmentId}`);
      
      socket.emit('segment-tracking-started', {
        segmentId,
        startTime: timestamp
      });
      
      // Notify nearby runners
      if (currentZone) {
        broadcastToZone(currentZone, 'runner-entered-segment', {
          userId,
          segmentId
        }, socket.id);
      }
    });

    socket.on('segment-completed', async (data) => {
      const { segmentId, elapsedTime, startTime, endTime } = data;
      
      socket.emit('segment-completed-notification', {
        segmentId,
        elapsedTime
      });
      
      // Notify nearby runners
      if (currentZone) {
        broadcastToZone(currentZone, 'runner-completed-segment', {
          userId,
          segmentId,
          elapsedTime
        }, socket.id);
      }
    });

    // ============================================
    // SOCIAL FEATURES
    // ============================================
    
    socket.on('send-kudos', (data) => {
      const { runId, targetUserId } = data;
      
      // Notify the runner who received kudos
      io.to(`user:${targetUserId}`).emit('kudos-received', {
        fromUserId: userId,
        runId
      });
    });

    socket.on('send-cheer', (data) => {
      const { targetUserId, message } = data;
      
      // Send real-time cheer to runner
      const targetRunner = Array.from(activeRunners.values())
        .find(r => r.userId === targetUserId);
      
      if (targetRunner) {
        io.to(targetRunner.socketId).emit('cheer-received', {
          fromUserId: userId,
          message
        });
      }
    });

    // ============================================
    // CHALLENGES
    // ============================================
    
    socket.on('challenge-progress-update', (data) => {
      const { challengeId, progress, isCompleted } = data;
      
      if (isCompleted) {
        // Notify followers
        socket.broadcast.emit('challenge-completed-notification', {
          userId,
          challengeId
        });
      }
    });

    // ============================================
    // DISCONNECT
    // ============================================
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      if (userId) {
        // Remove from active runners
        activeRunners.delete(userId);
        
        // Remove from geographic zone
        if (currentZone && geographicZones.has(currentZone)) {
          geographicZones.get(currentZone).delete(socket.id);
        }
        
        // Notify nearby runners
        if (currentZone) {
          broadcastToZone(currentZone, 'runner-disconnected', {
            userId
          }, socket.id);
        }
      }
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function updateGeographicZone(socket, lat, lng) {
      const newZone = ngeohash.encode(lat, lng, 6); // ~1.2km precision
      
      // Remove from old zone
      if (currentZone && currentZone !== newZone) {
        if (geographicZones.has(currentZone)) {
          geographicZones.get(currentZone).delete(socket.id);
        }
        socket.leave(`zone:${currentZone}`);
      }
      
      // Add to new zone
      if (!geographicZones.has(newZone)) {
        geographicZones.set(newZone, new Set());
      }
      geographicZones.get(newZone).add(socket.id);
      socket.join(`zone:${newZone}`);
      
      currentZone = newZone;
      return newZone;
    }
    
    function broadcastToZone(zone, event, data, excludeSocketId = null) {
      if (!zone || !geographicZones.has(zone)) return;
      
      for (const socketId of geographicZones.get(zone)) {
        if (socketId !== excludeSocketId) {
          io.to(socketId).emit(event, data);
        }
      }
    }
    
    function getAdjacentZones(geohash) {
      try {
        const neighbors = ngeohash.neighbors(geohash);
        return Object.values(neighbors);
      } catch (error) {
        return [];
      }
    }
    
  });

  // ============================================
  // PERIODIC TASKS
  // ============================================
  
  // Clean up inactive runners every 5 minutes
  setInterval(() => {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes
    
    for (const [userId, runner] of activeRunners.entries()) {
      if (now - new Date(runner.startedAt).getTime() > timeout) {
        if (!runner.lastPosition || 
            now - new Date(runner.lastPosition.timestamp).getTime() > timeout) {
          console.log(`Removing inactive runner: ${userId}`);
          activeRunners.delete(userId);
        }
      }
    }
  }, 5 * 60 * 1000);

  // Helper function
  async function getTotalTilesCount(userId) {
    const stats = await tileService.getTileStats(userId);
    return stats.total_tiles || 0;
  }

  // Expose active runners count for monitoring
  io.getActiveRunnersCount = () => activeRunners.size;
  io.getGeographicZonesCount = () => geographicZones.size;
};
