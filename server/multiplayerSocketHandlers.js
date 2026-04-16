const raceService = require('./services/raceService');
const ghostService = require('./services/ghostService');
const { redisClient, isRedisAvailable } = require('./middleware/rateLimiter');
const tileService = require('./services/tileService');
const achievementService = require('./services/achievementService');
const heatmapService = require('./services/heatmapService');
const ngeohash = require('ngeohash');
const { calculateDistance } = require('./utils/geoUtils');

module.exports = (io, notificationService) => {
  // Store active runners in Redis if available, otherwise in-memory Map
  const RUNNER_PRESENCE_KEY = 'active_runners';
  // Store ALL online users (authenticated, whether running or not)
  const ONLINE_USERS_KEY = 'online_users';
  // Store geographic zones (geohash -> Set of socketIds)
  const geographicZones = new Map();
  // In-memory fallback for active runners
  const memoryRunners = new Map();
  // In-memory fallback for online users
  const memoryOnlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected to multiplayer:', socket.id);
    
    let userId = null;
    let currentRunId = null;
    let currentZone = null;

    // ============================================
    // AUTHENTICATION
    // ============================================
    
    socket.on('authenticate', async (data) => {
      userId = data.userId;
      
      // Validate userId is present
      if (!userId) {
        console.error('authenticate event received without userId');
        socket.emit('auth-error', { message: 'userId is required' });
        return;
      }
      
      socket.join(`user:${userId}`);
      
      // Register with notification service for real-time notifications
      if (notificationService) {
        notificationService.registerUserSocket(userId, socket);
      }
      
      // Track this user as online
      const userData = {
        userId,
        username: data.username || `User ${userId}`,
        socketId: socket.id,
        authenticatedAt: new Date()
      };
      
      if (isRedisAvailable()) {
        await redisClient.hSet(ONLINE_USERS_KEY, userId.toString(), JSON.stringify(userData));
      } else {
        memoryOnlineUsers.set(userId.toString(), userData);
      }
      
      console.log(`User ${userId} (${userData.username}) authenticated for multiplayer`);
      console.log(`Total online users: ${isRedisAvailable() ? await redisClient.hLen(ONLINE_USERS_KEY) : memoryOnlineUsers.size}`);
      
      // If user has a position, add them to geographic zone immediately
      if (data.initialPosition && data.initialPosition.lat && data.initialPosition.lng) {
        const zone = updateGeographicZone(socket, data.initialPosition.lat, data.initialPosition.lng);
        console.log(`User ${userId} added to zone ${zone} on authentication`);
        
        // Also store initial position in online users data for quick lookup
        userData.initialPosition = data.initialPosition;
        if (isRedisAvailable()) {
          await redisClient.hSet(ONLINE_USERS_KEY, userId.toString(), JSON.stringify(userData));
        } else {
          memoryOnlineUsers.set(userId.toString(), userData);
        }
      } else {
        console.log(`User ${userId} authenticated without initial position`);
      }
      
      // Notify others that a new user is online
      socket.broadcast.emit('user-connected', {
        userId,
        username: userData.username
      });
      
      // Restore runner state if active
      if (isRedisAvailable()) {
        const rawRunner = await redisClient.hGet(RUNNER_PRESENCE_KEY, userId.toString());
        if (rawRunner) {
          socket.emit('active-run-restored', JSON.parse(rawRunner));
        }
      } else {
        const runner = memoryRunners.get(userId.toString());
        if (runner) {
          socket.emit('active-run-restored', runner);
        }
      }
    });

    // ============================================
    // MULTIPLAYER RACES
    // ============================================

    socket.on('create-race', async (data) => {
      if (!userId) return;
      const { distanceKm } = data;
      const race = await raceService.createRace(userId, distanceKm);
      socket.join(`race:${race.id}`);
      socket.emit('race-created', race);
    });

    socket.on('join-race', async (data) => {
      if (!userId) return;
      const { raceId, username } = data;
      try {
        const race = await raceService.joinRace(raceId, userId, username);
        socket.join(`race:${raceId}`);
        io.to(`race:${raceId}`).emit('participant-joined', { userId, username });
        socket.emit('race-joined', race);
      } catch (err) {
        socket.emit('race-error', { message: err.message });
      }
    });

    socket.on('start-race', async (data) => {
      if (!userId) return;
      const { raceId } = data;
      try {
        const race = await raceService.startRace(raceId, userId);
        io.to(`race:${raceId}`).emit('race-started', race);
      } catch (err) {
        socket.emit('race-error', { message: err.message });
      }
    });

    socket.on('race-progress', async (data) => {
      if (!userId) return;
      const { raceId, distanceKm } = data;
      const participant = await raceService.updateProgress(raceId, userId, distanceKm);
      if (participant) {
        io.to(`race:${raceId}`).emit('participant-progress', participant);
        if (participant.finished) {
          io.to(`race:${raceId}`).emit('participant-finished', participant);
        }
      }
    });

    // ============================================
    // GHOST RUNNER MODE
    // ============================================

    socket.on('start-ghost-replay', async (data) => {
      if (!userId) return;
      const { ghostRunId } = data;
      try {
        const points = await ghostService.prepareGhost(ghostRunId);
        socket.emit('ghost-ready', { runId: ghostRunId, pointCount: points.length });
        
        // Start replaying ghost positions every 1 second
        let startTimeOffset = 0;
        const interval = setInterval(() => {
          const position = ghostService.getGhostPositionAtTime(points, startTimeOffset);
          if (!position || startTimeOffset > (new Date(points[points.length - 1].recorded_at).getTime() - new Date(points[0].recorded_at).getTime())) {
            clearInterval(interval);
            socket.emit('ghost-finished', { runId: ghostRunId });
            return;
          }
          
          socket.emit('ghost-position-update', {
            runId: ghostRunId,
            position
          });
          
          startTimeOffset += 1000;
        }, 1000);
        
        socket.on('stop-ghost-replay', () => {
          clearInterval(interval);
        });
        
        socket.on('disconnect', () => {
          clearInterval(interval);
        });
      } catch (err) {
        socket.emit('ghost-error', { message: err.message });
      }
    });

    // ============================================
    // RUN TRACKING
    // ============================================
    
    socket.on('start-tracking', async (data) => {
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
      
      await redisClient.hSet(RUNNER_PRESENCE_KEY, userId.toString(), JSON.stringify(runnerData));
      
      // Notify nearby runners (including adjacent zones)
      if (data.initialPosition) {
        updateGeographicZone(socket, data.initialPosition.lat, data.initialPosition.lng);
        
        // Broadcast to current zone and adjacent zones
        const zonesToNotify = [currentZone, ...getAdjacentZones(currentZone)];
        for (const zone of zonesToNotify) {
          if (geographicZones.has(zone)) {
            for (const targetSocketId of geographicZones.get(zone)) {
              if (targetSocketId !== socket.id) {
                io.to(targetSocketId).emit('runner-started', {
                  userId,
                  username: data.username,
                  profilePicture: data.profilePicture,
                  position: data.initialPosition
                });
              }
            }
          }
        }
      }
      
      console.log(`User ${userId} started tracking run ${currentRunId}`);
    });

    // ============================================
    // LOCATION UPDATES
    // ============================================
    
    socket.on('location-update', async (data) => {
      if (!userId || !currentRunId) {
        console.log(`[location-update] Ignored - userId: ${userId}, currentRunId: ${currentRunId}`);
        return;
      }
      
      const { lat, lng, speed, heading, accuracy, timestamp, distance, pace } = data;
      
      console.log(`[location-update] User ${userId} at [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
      
      // Update runner data in Redis
      let runner = null;
      const rawRunner = await redisClient.hGet(RUNNER_PRESENCE_KEY, userId.toString());
      if (rawRunner) {
        runner = JSON.parse(rawRunner);
        runner.lastPosition = { lat, lng, speed, heading, timestamp };
        runner.distance = distance || 0;
        runner.pace = pace || 0;
        await redisClient.hSet(RUNNER_PRESENCE_KEY, userId.toString(), JSON.stringify(runner));
        console.log(`[location-update] Updated runner data in Redis`);
      } else {
        console.warn(`[location-update] WARNING: No runner data found for user ${userId}`);
      }
      
      // Update geographic zone
      const newZone = updateGeographicZone(socket, lat, lng);
      console.log(`[location-update] User ${userId} in zone ${newZone}`);
      
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
        
        // AI Safety Feature: Smart Safety Check System
        // Detect abnormal stop (speed < 0.1 for more than 5 minutes)
        if (speed < 0.1) {
          if (!runner.stopTime) {
            runner.stopTime = Date.now();
          } else if (Date.now() - runner.stopTime > 300000) { // 5 minutes (300,000 ms)
            if (!runner.safetyCheckTriggered) {
              runner.safetyCheckTriggered = true;
              socket.emit('ai-safety-check', {
                message: "Are you safe? We detected an abnormal stop.",
                timeout: 30000 // 30 seconds to respond
              });
            }
          }
        } else {
          runner.stopTime = null;
          runner.safetyCheckTriggered = false;
        }

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
          
          // Broadcast territory update if a new territory is formed or expanded
          io.emit('territory-updated', {
            userId,
            username: runner?.username,
            tile: result.tile,
            type: 'tile_capture'
          });

          // Send notification to previous tile owner if tile was captured
          if (result.previousOwner && notificationService) {
            await notificationService.createTileCapturedNotification(
              result.previousOwner.userId,
              userId,
              runner?.username || 'Unknown',
              result.tile?.geohash
            );
          }

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

    socket.on('ai-safety-response', async (data) => {
      if (!userId) return;
      
      let runner = null;
      if (isRedisAvailable()) {
        const rawRunner = await redisClient.hGet(RUNNER_PRESENCE_KEY, userId.toString());
        if (rawRunner) runner = JSON.parse(rawRunner);
      } else {
        runner = memoryRunners.get(userId.toString());
      }

      if (runner) {
        if (data.isSafe) {
          runner.stopTime = null;
          runner.safetyCheckTriggered = false;
          
          if (isRedisAvailable()) {
            await redisClient.hSet(RUNNER_PRESENCE_KEY, userId.toString(), JSON.stringify(runner));
          } else {
            memoryRunners.set(userId.toString(), runner);
          }
          console.log(`User ${userId} responded as safe.`);
        } else {
          // Send SOS if user says they are not safe or fails to respond
          io.to(`user:${userId}`).emit('sos-trigger', {
            reason: 'User responded as not safe'
          });
        }
      }
    });

    // ============================================
    // STOP TRACKING
    // ============================================
    
    socket.on('stop-tracking', async (data) => {
      if (!userId) return;
      
      if (isRedisAvailable()) {
        await redisClient.hDel(RUNNER_PRESENCE_KEY, userId.toString());
      } else {
        memoryRunners.delete(userId.toString());
      }
      
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
    
    // Get ALL online users (for the online count)
    socket.on('get-online-users', async () => {
      let onlineUsers = [];
      
      if (isRedisAvailable()) {
        const rawUsers = await redisClient.hGetAll(ONLINE_USERS_KEY);
        onlineUsers = Object.values(rawUsers).map(u => JSON.parse(u));
      } else {
        onlineUsers = Array.from(memoryOnlineUsers.values());
      }
      
      // Return only userId and username (exclude sensitive data)
      const safeUsers = onlineUsers.map(u => ({
        userId: u.userId,
        username: u.username
      }));
      
      console.log(`[get-online-users] Returning ${safeUsers.length} online users`);
      socket.emit('online-users-list', safeUsers);
    });
    
    socket.on('get-nearby-runners', async (data) => {
      const { lat, lng, radius = 5000 } = data;
      
      const nearbyRunners = [];
      const userZone = ngeohash.encode(lat, lng, 6); // ~1.2km precision
      
      // Get ALL online users (not just active runners)
      let allOnlineUsers = [];
      if (isRedisAvailable()) {
        const rawUsers = await redisClient.hGetAll(ONLINE_USERS_KEY);
        allOnlineUsers = Object.values(rawUsers).map(u => JSON.parse(u));
      } else {
        allOnlineUsers = Array.from(memoryOnlineUsers.values());
      }

      console.log(`[get-nearby-runners] Total online users: ${allOnlineUsers.length}`);
      console.log(`[get-nearby-runners] User zone: ${userZone}`);

      // Also get active runners for position data
      let activeRunners = [];
      if (isRedisAvailable()) {
        const rawRunners = await redisClient.hGetAll(RUNNER_PRESENCE_KEY);
        activeRunners = Object.values(rawRunners).map(r => JSON.parse(r));
      } else {
        activeRunners = Array.from(memoryRunners.values());
      }
      
      console.log(`[get-nearby-runners] Active runners with positions: ${activeRunners.length}`);

      // Get users in same zone and adjacent zones
      const zonesToCheck = [userZone, ...getAdjacentZones(userZone)];
      console.log(`[get-nearby-runners] Checking zones: ${zonesToCheck.join(', ')}`);
      
      for (const zone of zonesToCheck) {
        if (geographicZones.has(zone)) {
          const zoneSockets = geographicZones.get(zone);
          console.log(`[get-nearby-runners] Zone ${zone} has ${zoneSockets.size} sockets`);
          
          for (const socketId of zoneSockets) {
            // Find this user in online users list
            const onlineUser = allOnlineUsers.find(u => u.socketId === socketId);
            
            if (onlineUser && onlineUser.userId !== userId) {
              // Find their position from active runners first
              const runner = activeRunners.find(r => r.userId === onlineUser.userId);
              
              if (runner && runner.lastPosition) {
                // User is actively tracking - use their live position
                const distance = calculateDistance(
                  lat, lng,
                  runner.lastPosition.lat, runner.lastPosition.lng
                );
                
                console.log(`[get-nearby-runners] Runner ${onlineUser.username} (${onlineUser.userId}) at distance ${distance.toFixed(0)}m (active)`);
                
                if (distance <= radius) {
                  nearbyRunners.push({
                    userId: onlineUser.userId,
                    username: onlineUser.username,
                    profilePicture: runner.profilePicture,
                    position: runner.lastPosition,
                    distance: runner.distance,
                    pace: runner.pace
                  });
                }
              } else if (onlineUser.initialPosition) {
                // User is online but not actively tracking - use initial position
                const distance = calculateDistance(
                  lat, lng,
                  onlineUser.initialPosition.lat, onlineUser.initialPosition.lng
                );
                
                console.log(`[get-nearby-runners] User ${onlineUser.username} (${onlineUser.userId}) at distance ${distance.toFixed(0)}m (initial position)`);
                
                if (distance <= radius) {
                  nearbyRunners.push({
                    userId: onlineUser.userId,
                    username: onlineUser.username,
                    profilePicture: onlineUser.profilePicture,
                    position: onlineUser.initialPosition,
                    distance: 0,
                    pace: 0,
                    isIdle: true // Mark as not actively running
                  });
                }
              } else {
                // User is online but hasn't sent position yet
                console.log(`[get-nearby-runners] User ${onlineUser.username} (${onlineUser.userId}) online but no position yet`);
              }
            }
          }
        }
      }
      
      console.log(`[get-nearby-runners] Found ${nearbyRunners.length} nearby runners with positions`);
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

    socket.on('send-cheer', async (data) => {
      const { targetUserId, message } = data;
      
      // Send real-time cheer to runner
      let targetRunner = null;
      if (isRedisAvailable()) {
        const rawRunner = await redisClient.hGet(RUNNER_PRESENCE_KEY, targetUserId.toString());
        if (rawRunner) targetRunner = JSON.parse(rawRunner);
      } else {
        targetRunner = memoryRunners.get(targetUserId.toString());
      }
      
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
    
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      if (userId) {
        // Unregister from notification service
        if (notificationService) {
          notificationService.unregisterUserSocket(userId);
        }
        
        // Remove from online users
        if (isRedisAvailable()) {
          await redisClient.hDel(ONLINE_USERS_KEY, userId.toString());
        } else {
          memoryOnlineUsers.delete(userId.toString());
        }
        
        // Remove from active runners
        if (isRedisAvailable()) {
          await redisClient.hDel(RUNNER_PRESENCE_KEY, userId.toString());
        } else {
          memoryRunners.delete(userId.toString());
        }
        
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
        
        // Notify all users that this user disconnected
        socket.broadcast.emit('user-disconnected', {
          userId
        });
        
        console.log(`User ${userId} disconnected. Total online: ${isRedisAvailable() ? await redisClient.hLen(ONLINE_USERS_KEY) : memoryOnlineUsers.size}`);
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
      if (!zone) return;
      
      // Broadcast to the main zone and adjacent zones for better coverage
      const zonesToBroadcast = [zone, ...getAdjacentZones(zone)];
      
      for (const targetZone of zonesToBroadcast) {
        if (geographicZones.has(targetZone)) {
          for (const socketId of geographicZones.get(targetZone)) {
            if (socketId !== excludeSocketId) {
              io.to(socketId).emit(event, data);
            }
          }
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
  setInterval(async () => {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes
    
    let allRunnersEntries = [];
    if (isRedisAvailable()) {
      const rawRunners = await redisClient.hGetAll(RUNNER_PRESENCE_KEY);
      allRunnersEntries = Object.entries(rawRunners).map(([uid, r]) => [uid, JSON.parse(r)]);
    } else {
      allRunnersEntries = Array.from(memoryRunners.entries());
    }

    for (const [uid, runner] of allRunnersEntries) {
      if (now - new Date(runner.startedAt).getTime() > timeout) {
        if (!runner.lastPosition || 
            now - new Date(runner.lastPosition.timestamp).getTime() > timeout) {
          console.log(`Removing inactive runner: ${uid}`);
          if (isRedisAvailable()) {
            await redisClient.hDel(RUNNER_PRESENCE_KEY, uid);
          } else {
            memoryRunners.delete(uid);
          }
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
  io.getActiveRunnersCount = async () => {
    if (isRedisAvailable()) {
      return await redisClient.hLen(RUNNER_PRESENCE_KEY);
    }
    return memoryRunners.size;
  };
  io.getGeographicZonesCount = () => geographicZones.size;
};
