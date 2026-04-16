/**
 * Database Verification Script
 * Checks if all required tables and columns exist for the backend to work properly
 * 
 * Usage:
 * node verify-database.js
 */

const pool = require('./config/db');

// Define all required tables and their critical columns
const requiredTables = {
  // Core tables
  users: [
    'id', 'username', 'email', 'password_hash', 'profile_picture',
    'bio', 'level', 'total_xp', 'fitness_level', 'created_at',
    'updated_at', 'last_active', 'account_locked', 'lockout_until',
    'last_failed_login'
  ],
  
  runs: [
    'id', 'user_id', 'title', 'description', 'distance', 'duration',
    'pace', 'avg_speed', 'max_speed', 'calories', 'elevation_gain',
    'elevation_loss', 'avg_heart_rate', 'max_heart_rate', 'route_geometry',
    'start_location', 'end_location', 'weather_condition', 'temperature',
    'started_at', 'completed_at', 'is_public', 'kudos_count', 'created_at'
  ],
  
  route_points: [
    'id', 'run_id', 'location', 'altitude', 'speed', 'heading',
    'accuracy', 'heart_rate', 'cadence', 'recorded_at', 'sequence_order'
  ],
  
  // Tile system
  tiles: [
    'id', 'geohash', 'h3_index', 'geometry', 'center_point',
    'tile_type', 'zoom_level', 'created_at'
  ],
  
  user_tiles: [
    'id', 'user_id', 'tile_id', 'captured_at'
  ],
  
  // Social features
  friendships: [
    'id', 'user_id', 'friend_id', 'status', 'created_at'
  ],
  
  messages: [
    'id', 'sender_id', 'receiver_id', 'content', 'is_read', 'created_at'
  ],
  
  conversations: [
    'id', 'participant_1', 'participant_2', 'last_message',
    'last_message_at', 'created_at'
  ],
  
  comments: [
    'id', 'user_id', 'run_id', 'content', 'created_at'
  ],
  
  kudos: [
    'id', 'user_id', 'run_id', 'created_at'
  ],
  
  // Security tables (recently added)
  login_attempts: [
    'id', 'user_id', 'ip_address', 'attempted_at'
  ],
  
  token_blacklist: [
    'id', 'token_jti', 'expires_at', 'created_at'
  ],
  
  password_history: [
    'id', 'user_id', 'password_hash', 'created_at'
  ],
  
  security_events: [
    'id', 'user_id', 'event_type', 'ip_address', 'user_agent',
    'details', 'created_at'
  ],
  
  password_resets: [
    'id', 'user_id', 'token', 'expires_at', 'used', 'created_at'
  ],
  
  email_verifications: [
    'id', 'user_id', 'token', 'expires_at', 'verified', 'created_at'
  ],
  
  // Emergency features
  emergency_contacts: [
    'id', 'user_id', 'name', 'phone', 'email', 'relationship', 'created_at'
  ],
  
  sos_alerts: [
    'id', 'user_id', 'latitude', 'longitude', 'status',
    'resolved_at', 'created_at'
  ],
  
  // AI Coach
  ai_training_plans: [
    'id', 'user_id', 'plan_name', 'description', 'duration_weeks',
    'difficulty_level', 'created_at'
  ],
  
  // Events
  events: [
    'id', 'title', 'description', 'location', 'start_date',
    'end_date', 'organizer_id', 'created_at'
  ],
  
  // Achievements
  achievements: [
    'id', 'name', 'description', 'icon', 'xp_reward', 'criteria', 'created_at'
  ],
  
  user_achievements: [
    'id', 'user_id', 'achievement_id', 'unlocked_at'
  ],
  
  // Heatmap
  heatmap_data: [
    'id', 'user_id', 'location', 'recorded_at', 'created_at'
  ]
};

async function verifyDatabase() {
  console.log('🔍 Database Verification Tool\n');
  console.log('═'.repeat(70));
  
  let totalTables = 0;
  let missingTables = [];
  let missingColumns = [];
  let warnings = [];
  
  try {
    // Check each required table
    for (const [tableName, requiredCols] of Object.entries(requiredTables)) {
      totalTables++;
      
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (!tableCheck.rows[0].exists) {
        missingTables.push(tableName);
        console.log(`❌ ${tableName} - MISSING`);
        continue;
      }
      
      // Table exists, check columns
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      const existingColumns = columnCheck.rows.map(row => row.column_name);
      const missingCols = requiredCols.filter(col => !existingColumns.includes(col));
      
      if (missingCols.length === 0) {
        console.log(`✅ ${tableName} - OK (${existingColumns.length} columns)`);
      } else {
        console.log(`⚠️  ${tableName} - Missing columns: ${missingCols.join(', ')}`);
        missingColumns.push({ table: tableName, columns: missingCols });
      }
    }
    
    // Check PostGIS extension
    console.log('\n' + '─'.repeat(70));
    console.log('\n📍 Checking PostGIS Extension:');
    const postgisCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_extension WHERE extname = 'postgis'
      )
    `);
    
    if (postgisCheck.rows[0].exists) {
      console.log('✅ PostGIS extension installed');
    } else {
      console.log('❌ PostGIS extension MISSING (required for geospatial features)');
      warnings.push('PostGIS extension is not installed');
    }
    
    // Check total user count
    console.log('\n' + '─'.repeat(70));
    console.log('\n📊 Database Statistics:');
    
    try {
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`👥 Total users: ${userCount.rows[0].count}`);
    } catch (err) {
      console.log(`👥 Total users: Error - ${err.message}`);
    }
    
    try {
      const runCount = await pool.query('SELECT COUNT(*) FROM runs');
      console.log(`🏃 Total runs: ${runCount.rows[0].count}`);
    } catch (err) {
      console.log(`🏃 Total runs: Table not found`);
    }
    
    try {
      const tileCount = await pool.query('SELECT COUNT(*) FROM user_tiles');
      console.log(`🗺️  Total tiles captured: ${tileCount.rows[0].count}`);
    } catch (err) {
      console.log(`🗺️  Total tiles: Table not found`);
    }
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📋 VERIFICATION SUMMARY:\n');
    
    const tablesOk = totalTables - missingTables.length;
    const columnsOk = missingColumns.length === 0;
    
    console.log(`Total tables checked: ${totalTables}`);
    console.log(`Tables OK: ${tablesOk}`);
    console.log(`Tables missing: ${missingTables.length}`);
    console.log(`Column issues: ${missingColumns.length}`);
    console.log(`Warnings: ${warnings.length}`);
    
    if (missingTables.length === 0 && columnsOk) {
      console.log('\n✅ DATABASE IS FULLY CONFIGURED!');
      console.log('   All required tables and columns are present.\n');
    } else {
      console.log('\n⚠️  DATABASE NEEDS ATTENTION:\n');
      
      if (missingTables.length > 0) {
        console.log('❌ Missing tables:');
        missingTables.forEach(table => console.log(`   • ${table}`));
        console.log('');
      }
      
      if (missingColumns.length > 0) {
        console.log('⚠️  Missing columns:');
        missingColumns.forEach(({ table, columns }) => {
          console.log(`   • ${table}: ${columns.join(', ')}`);
        });
        console.log('');
      }
      
      if (warnings.length > 0) {
        console.log('⚠️  Warnings:');
        warnings.forEach(warning => console.log(`   • ${warning}`));
        console.log('');
      }
      
      console.log('💡 Solution: Run the migration scripts to fix these issues:');
      console.log('   node migrate-security-tables.js\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
verifyDatabase();
