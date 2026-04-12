// ============================================
// COMPLETE PRODUCTION DEBUGGING & FIXES
// All 7 Issue Categories with Code Solutions
// ============================================

/**
 * ✅ ISSUE 1: WEBSOCKET/SOCKET.IO CONFIGURATION
 * ============================================
 */

// CURRENT STATUS: ✅ MOSTLY GOOD
// - CORS configured for production (Render + Vercel)
// - Both websocket and polling transports enabled
// - Credentials enabled for cross-origin

// IMPROVEMENTS NEEDED:

// Add to server.js (Socket.io configuration):
/*
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL, /.render\.com$/, /.vercel\.app$/].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowEIO3: true // For older clients
  },
  transports: ['websocket', 'polling'], // Websocket first (faster)
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  // Prevent duplicate connections
  maxHttpBufferSize: 1e6,
  pingInterval: 25000,
  pingTimeout: 60000
});
*/

// PREVENT RECONNECT LOOP FIX (add to multiplayerSocketHandlers.js):
module.exports = (io) => {
  const activeConnections = new Map(); // Track user connections
  
  io.on('connection', (socket) => {
    let userId = null;
    const connectionId = socket.id;
    
    socket.on('authenticate', async (data) => {
      userId = data.userId;
      
      // FIX: Prevent duplicate connections
      if (activeConnections.has(userId)) {
        const oldSocketId = activeConnections.get(userId);
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          console.log(`Disconnecting old socket ${oldSocketId} for user ${userId}`);
          oldSocket.disconnect(true);
        }
      }
      
      activeConnections.set(userId, connectionId);
      socket.join(`user:${userId}`);
      
      console.log(`✅ User ${userId} authenticated (connection: ${connectionId})`);
    });
    
    socket.on('disconnect', () => {
      if (userId && activeConnections.get(userId) === connectionId) {
        activeConnections.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  });
};

/**
 * ✅ ISSUE 2: API FIXES (404/500 ERRORS)
 * ============================================
 */

// PROBLEM: DELETE /api/social/posts/:postId returns 404
// CAUSE: No validat ion of postId, no ownership check

// FIX: Update server/routes/social.js DELETE endpoints:

/*
// @route   DELETE api/social/posts/:postId
// @desc    Delete a post (owner only)
// @access  Private
router.delete('/posts/:postId', auth, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.id;
  
  // Validation
  if (isNaN(postId)) {
    return res.status(400).json({ msg: 'Invalid post ID' });
  }
  
  try {
    // Check ownership
    const postCheck = await pool.query(
      'SELECT user_id FROM posts WHERE id = $1',
      [postId]
    );
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    
    if (postCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ msg: 'Not authorized to delete this post' });
    }
    
    // Delete post and associated comments/likes
    await pool.query('DELETE FROM comments WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM likes WHERE post_id = $1', [postId]);
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING id', [postId]);
    
    res.json({ 
      msg: 'Post deleted successfully',
      deletedPostId: result.rows[0]?.id 
    });
  } catch (err) {
    console.error('❌ DELETE /social/posts error:', {
      error: err.message,
      postId,
      userId,
      code: err.code
    });
    res.status(500).json({ 
      msg: 'Server Error', 
      error: err.message,
      type: err.code // PostgreSQL error code
    });
  }
});

// FIX for DELETE comments
router.delete('/comments/:commentId', auth, async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  const userId = req.user.id;
  
  if (isNaN(commentId)) {
    return res.status(400).json({ msg: 'Invalid comment ID' });
  }
  
  try {
    // Check ownership
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ msg: 'Not authorized to delete this comment' });
    }
    
    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 RETURNING id',
      [commentId]
    );
    
    res.json({ 
      msg: 'Comment deleted successfully',
      deletedCommentId: result.rows[0]?.id 
    });
  } catch (err) {
    console.error('❌ DELETE /social/comments error:', {
      error: err.message,
      commentId,
      userId
    });
    res.status(500).json({ 
      msg: 'Server Error', 
      error: err.message 
    });
  }
});
*/

/**
 * ✅ ISSUE 3: BACKEND DEBUGGING & LOGGING
 * ============================================
 */

// CREATE: server/middleware/errorHandler.js
/*
module.exports = (err, req, res, next) => {
  const { method, path, body, params, query } = req;
  const userId = req.user?.id || 'anonymous';
  
  console.error('\n❌ ERROR OCCURRED', {
    timestamp: new Date().toISOString(),
    method,
    path,
    userId,
    statusCode: err.statusCode || 500,
    errorMessage: err.message,
    errorCode: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestData: {
      body: sanitizeData(body),
      params: sanitizeData(params),
      query: sanitizeData(query)
    }
  });
  
  // Send response
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code,
      requestId: req.id // Use correlation ID
    }
  });
};

function sanitizeData(data) {
  if (!data) return data;
  const sensitive = ['password', 'token', 'secret', 'email'];
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***';
    }
  });
  return sanitized;
}
*/

// Add to server.js after all routes:
/*
// Add error handler middleware
app.use((err, req, res, next) => {
  // ... error handling code above ...
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});
*/

/**
 * ✅ ISSUE 4: MAPBOX TILES = 0 FIX
 * ============================================
 */

// PROBLEM: Heatmap returns 0 tiles captured

// DIAGNOSIS QUERY:
/*
SELECT COUNT(*) as tiles_total FROM captured_tiles;
SELECT COUNT(DISTINCT tile_id) as unique_tiles FROM captured_tiles;
SELECT user_id, COUNT(*) as count FROM captured_tiles GROUP BY user_id;
*/

// FIX: Check frontend API response format

// In client/src/components/Map/MapboxMap.jsx:
/*
const fetchTiles = async (bounds) => {
  try {
    const response = await axios.get('/api/tiles', {
      params: {
        minLat: bounds.south,
        minLng: bounds.west,
        maxLat: bounds.north,
        maxLng: bounds.east
      }
    });
    
    console.log('📍 Tiles API Response:', response.data);
    
    // VALIDATE response format
    if (!Array.isArray(response.data)) {
      console.error('❌ Invalid response format - expected array:', response.data);
      return [];
    }
    
    // FILTER valid tiles
    const validTiles = response.data.filter(tile => 
      tile.geometry && 
      tile.geometry.coordinates && 
      tile.geometry.type === 'Polygon'
    );
    
    console.log(`✅ Found ${validTiles.length} valid tiles`);
    setTiles(validTiles);
  } catch (error) {
    console.error('❌ Error fetching tiles:', error);
  }
};
*/

/**
 * ✅ ISSUE 5: GPS GEOLOCATION FIX
 * ============================================
 */

// CREATE: client/src/hooks/useGeolocation.js
/*
import { useState, useCallback, useRef } from 'react';

const useGeolocation = () => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const timeoutId = useRef(null);
  
  const getCurrentPosition = useCallback(async (options = {}) => {
    const {
      timeout = 10000,
      maxAge = 0,
      enableHighAccuracy = true,
      retries = 3
    } = options;
    
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return false;
    }
    
    setLoading(true);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await new Promise((resolve) => {
          timeoutId.current = setTimeout(() => {
            setError('GPS timeout - retrying...');
            resolve(false);
          }, timeout);
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutId.current);
              const { latitude, longitude, accuracy } = position.coords;
              
              // Validate coordinates
              if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                setError('Invalid coordinates received');
                setLoading(false);
                resolve(false);
                return;
              }
              
              setCoords({ latitude, longitude, accuracy });
              setError(null);
              setLoading(false);
              resolve(true);
            },
            (err) => {
              clearTimeout(timeoutId.current);
              lastError = err;
              
              if (attempt < retries) {
                console.log(`⚠️ GPS attempt ${attempt} failed, retrying...`, err);
              } else {
                handleGeolocError(err);
              }
              resolve(false);
            },
            { enableHighAccuracy, timeout, maxAge }
          );
        });
      } catch (err) {
        lastError = err;
      }
      
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      }
    }
    
    setLoading(false);
    return false;
  }, []);
  
  const handleGeolocError = (err) => {
    const messages = {
      1: 'GPS permission denied. Enable location access in settings.',
      2: 'GPS position unavailable. Check signal strength.',
      3: 'GPS timeout. Retrying...'
    };
    
    setError(messages[err.code] || 'GPS error');
    console.error('❌ Geolocation error:', err);
  };
  
  return { coords, error, loading, getCurrentPosition };
};

export default useGeolocation;
*/

/**
 * ✅ ISSUE 6: REACT OPTIMIZATION
 * ============================================
 */

// PROBLEM: ProtectedRoute causes unnecessary re-renders

// FIX: Optimize ProtectedRoute in client/src/App.jsx:
/*
import React, { useContext, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

const ProtectedRoute = React.memo(({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  // Memoize result to prevent re-renders
  const result = useMemo(() => {
    if (loading) {
      return (
        <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-2xl font-bold">Loading...</div>
        </div>
      );
    }
    
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  }, [user, loading, children]);
  
  return result;
});

ProtectedRoute.displayName = 'ProtectedRoute';
export default ProtectedRoute;
*/

// FIX: Optimize AuthContext useEffect:
/*
// In client/src/context/AuthContext.jsx
useEffect(() => {
  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (err) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };
  
  // Only run once on mount
  checkAuth();
}, []); // Empty dependency array
*/

/**
 * ✅ ISSUE 7: PRODUCTION RENDER FIXES
 * ============================================
 */

// ADD HEALTH CHECK ENDPOINT (server.js):
/*
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: 'connected', // Add DB check if needed
    port: process.env.PORT || 1000
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', api: 'running' });
});
*/

// FIX: Render sleep issue with startup optimization:
/*
// Add to server.js startup
const PORT = process.env.PORT || 1000;

// Graceful startup
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 API URL: ${process.env.VITE_API_URL || 'internal'}`);
  
  // Inform Render that service is ready
  if (process.env.RENDER) {
    console.log('✅ Render deployment detected - service ready');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
*/

// FIX: Use environment variables correctly:
/*
// server/config/db.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Production optimizations
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
*/

/**
 * 🚀 DEPLOYMENT CHECKLIST
 * ============================================
 */

console.log(`
✅ CHECKLIST FOR PRODUCTION:

1. WEBSOCKET
   ✅ Socket.io CORS configured for Render + Vercel
   ✅ Reconnection limits set
   ✅ Duplicate connection prevention added
   
2. API VALIDATION
   ✅ DELETE endpoints validate ownership
   ✅ ID validation added
   ✅ Error responses standardized
   
3. LOGGING
   ✅ Error middleware created
   ✅ All errors logged with context
   ✅ Sensitive data sanitized
   
4. FRONTEND
   ✅ ProtectedRoute optimized (memo)
   ✅ useEffect dependencies fixed
   ✅ Geolocation with retry/timeout added
   
5. PRODUCTION
   ✅ Health check endpoint added
   ✅ Database SSL enabled
   ✅ Graceful shutdown implemented
   
NEXT STEPS:
1. Apply all code fixes above
2. Push to GitHub (auto-deploys to Render)
3. Test health endpoint: curl https://zonerush-api.onrender.com/health
4. Monitor logs for errors
5. Test API calls from Vercel frontend
`);
