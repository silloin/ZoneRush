// ============================================
// PRODUCTION DEBUGGING FIXES - COMPLETE GUIDE
// ZoneRush Backend Issues & Solutions
// ============================================

/**
 * ISSUE #1: Database Schema Errors (42703)
 * ============================================
 * 
 * ERROR: column "is_active" does not exist in "training_plans"
 * ERROR: column "content" does not exist in "notifications"
 * 
 * ROOT CAUSE:
 * - Migration files exist but were never executed on Supabase
 * - Production database is out of sync with code
 * 
 * SOLUTION:
 * 1. Run migration_production_fixes.sql on Supabase SQL Editor
 * 2. Or manually run these commands:
 */

// ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
// ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';

/**
 * ISSUE #2: generateWorkouts is not a function
 * ============================================
 * 
 * ERROR: TypeError: generateWorkouts is not a function
 * 
 * ROOT CAUSE:
 * - trainingPlans.js defined generateWorkouts() but didn't export it
 * - aiCoachService.js tried to import it: const { generateWorkouts } = require(...)
 * - This caused undefined function error on AI plan generation fallback
 * 
 * SOLUTION:
 * - Modified trainingPlans.js line 250 to export both router AND function:
 *   module.exports = router;
 *   module.exports.generateWorkouts = generateWorkouts;
 * 
 * - aiCoachService.js already imports it correctly (no changes needed)
 */

/**
 * ISSUE #3: Schema Migration Strategy (CRITICAL FOR PRODUCTION)
 * ============================================
 * 
 * PROPER WORKFLOW:
 * 
 * 1. DEVELOPMENT:
 *    - Write migration file in database/migration_*.sql
 *    - Test locally
 *    - Commit to GitHub
 * 
 * 2. PRODUCTION (Render):
 *    - Option A: SSH into Render, connect to Supabase, run migration
 *    - Option B: Manually run in Supabase SQL Editor (recommended for safety)
 *    - Option C: Add automated migration runner to startup
 * 
 * 3. ERROR HANDLING:
 *    - Code should gracefully handle missing columns
 *    - Use try-catch for schema-dependent queries
 *    - Fallback to simpler queries if advanced columns don't exist
 */

/**
 * ISSUE #4: Email Service Timeout
 * ============================================
 * 
 * ERROR: Email send timeout after 5 seconds
 * CAUSE: Render's network can't reach Gmail SMTP (firewall/protocol)
 * 
 * SOLUTIONS (in order of priority):
 * 
 * A. RECOMMENDED: Use async fire-and-forget (ALREADY IMPLEMENTED)
 *    - Email sending uses setImmediate() (non-blocking)
 *    - SOS alerts respond immediately regardless of email status
 *    - File: server/controllers/emergencyController.js (updated)
 * 
 * B. Use email queue (Bull/BullMQ):
 *    Add to package.json:
 *    npm install bull redis
 * 
 * C. Switch to SendGrid/Mailgun:
 *    More reliable than Gmail SMTP from server
 */

/**
 * ISSUE #5: Socket Duplicate Authentication Logs
 * ============================================
 * 
 * PROBLEM:
 * "User 3 authenticated for multiplayer"
 * "User 3 authenticated for multiplayer" (duplicate)
 * 
 * CAUSE:
 * - User connecting with multiple socket connections
 * - Each socket fires separate 'authenticate' event
 * - No duplicate connection detection
 * 
 * FIX: Add connection deduplication in multiplayerSocketHandlers.js
 */

// CODE FIX FOR SOCKET DUPLICATE:
/*
socket.on('authenticate', async (data) => {
  userId = data.userId;
  socket.join(`user:${userId}`);
  
  // FIX: Disconnect previous sockets for this user
  if (isRedisAvailable()) {
    const oldSockets = await redisClient.hGet('user_sockets', userId.toString());
    if (oldSockets) {
      const oldSocketIds = JSON.parse(oldSockets);
      oldSocketIds.forEach(sid => {
        const oldSocket = io.sockets.sockets.get(sid);
        if (oldSocket) oldSocket.disconnect();
      });
    }
    // Store current socket ID
    await redisClient.hSet('user_sockets', userId.toString(), JSON.stringify([socket.id]));
  }
  
  // ... rest of authentication code
  console.log(`User ${userId} authenticated (connection normalized)`);
});
*/

/**
 * ISSUE #6: Heatmap Returns 0 Points
 * ============================================
 * 
 * PROBLEM: "Found 0 heatmap points"
 * 
 * CAUSES:
 * 1. route_heatmap table doesn't exist
 * 2. No route_points data being collected
 * 3. Lat/lng coordinates stored in wrong format
 * 4. PostGIS not enabled on Supabase
 * 
 * DEBUG:
 * SELECT COUNT(*) FROM route_heatmap;
 * SELECT COUNT(*) FROM route_points;
 * SELECT * FROM route_heatmap LIMIT 5;
 * 
 * FIXES:
 * 1. Run migration_production_fixes.sql (creates route_heatmap)
 * 2. Verify PostGIS enabled: SELECT PostGIS_version();
 * 3. Check if route_points are being inserted during runs
 * 4. Verify lat/lng are valid numbers (-90 to 90, -180 to 180)
 */

/**
 * ISSUE #7: Retry Logic Improvement
 * ============================================
 * 
 * CURRENT: Retries even when database schema is wrong
 * BETTER: Classify errors and retry only recoverable ones
 */

// IMPROVED RETRY WITH ERROR CLASSIFICATION:
/*
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry schema errors - they won't be fixed by retrying
      if (error.message.includes('does not exist') || 
          error.code === '42703') {
        console.error('Schema error detected - aborting retries:', error.message);
        throw error; // Fail fast instead of retrying
      }
      
      // Network/timeout errors can be retried
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      throw error;
    }
  }
}
*/

/**
 * DEPLOYMENT CHECKLIST FOR RENDER
 * ============================================
 */

// 1. HEALTH CHECK ENDPOINT (add to server.js)
/*
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    port: process.env.PORT || 1000
  });
});
*/

// 2. DATABASE MIGRATIONS ON STARTUP
/*
async function runMigrationsOnStartup() {
  try {
    const migrationFiles = [
      'migration_add_ai_training_plans.sql',
      'migration_production_fixes.sql'
    ];
    
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, '../database', file), 'utf8');
      await pool.query(sql);
      console.log(`✅ Migration ${file} completed`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    // Decide: Exit or continue?
    // For now, log and continue (manual migration backup)
  }
}
*/

// 3. PORT CONFIGURATION
/*
const PORT = process.env.PORT || 1000;
if (PORT !== 1000 && !process.env.PORT) {
  console.warn('⚠️  Using port 1000 as primary. Set PORT env var for custom port.');
}
*/

// 4. PRODUCTION ENV SETUP (Render)
/*
Environment Variables needed:
- DATABASE_URL: postgresql://user:pass@host/db
- PORT: 1000 (or your preferred port)
- NODE_ENV: production
- JWT_SECRET: your-secret-key
- EMAIL_USER: gmail address (optional - email is fire-and-forget now)
- EMAIL_PASSWORD: gmail app password (optional)
*/

/**
 * DEPLOYMENT STEPS
 * ============================================
 */

console.log(`
1. IMMEDIATE (Next 5 minutes):
   ✅ Run migration_production_fixes.sql on Supabase
   ✅ Changes already pushed to GitHub (auto-deploys to Render)
   
2. VERIFY (After Render redeploys):
   ✅ Check Render dashboard for new deployment
   ✅ Try API call: curl https://zonerush-api.onrender.com/health
   ✅ Test training plan generation
   ✅ Check SOS alert sending (should be fast now)
   
3. MONITORING:
   ✅ Watch for column errors in logs (should be gone)
   ✅ Monitor heatmap queries (should return points)
   ✅ Verify socket connections stabilize (no duplicate auth logs)
   
4. LONG-TERM:
   ✅ Implement automated migration runner
   ✅ Set up database monitoring
   ✅ Create runbook for future schema changes
`);
