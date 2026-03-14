#!/usr/bin/env node

/**
 * Verification Script - Check if all fixes are applied
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, fix) {
  const result = condition();
  checks.push({ name, passed: result, fix });
  if (result) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.log(`❌ ${name}`);
    if (fix) console.log(`   Fix: ${fix}`);
  }
  return result;
}

console.log('\n🔍 Verifying ZoneRush Installation...\n');

// Server Files
console.log('📁 Server Files:');
check('server.js exists', () => fs.existsSync('server.js'));
check('config/db.js exists', () => fs.existsSync('config/db.js'));
check('config/database.js exists', () => fs.existsSync('config/database.js'), 
  'Created automatically - should exist');

// Routes
console.log('\n📡 API Routes:');
check('routes/runs.js exists', () => fs.existsSync('routes/runs.js'));
check('routes/tiles.js exists', () => fs.existsSync('routes/tiles.js'));
check('routes/segments.js exists', () => fs.existsSync('routes/segments.js'));
check('routes/achievements.js exists', () => fs.existsSync('routes/achievements.js'));
check('routes/challenges.js exists', () => fs.existsSync('routes/challenges.js'));
check('routes/leaderboard.js exists', () => fs.existsSync('routes/leaderboard.js'));
check('routes/aiCoach.js exists', () => fs.existsSync('routes/aiCoach.js'),
  'Run fix-all.bat or create manually');
check('routes/heatmap.js exists', () => fs.existsSync('routes/heatmap.js'),
  'Run fix-all.bat or create manually');

// Services
console.log('\n⚙️  Services:');
check('services/tileService.js exists', () => fs.existsSync('services/tileService.js'));
check('services/segmentService.js exists', () => fs.existsSync('services/segmentService.js'));
check('services/achievementService.js exists', () => fs.existsSync('services/achievementService.js'));
check('services/statsService.js exists', () => fs.existsSync('services/statsService.js'));
check('services/challengeService.js exists', () => fs.existsSync('services/challengeService.js'));
check('services/aiCoachService.js exists', () => fs.existsSync('services/aiCoachService.js'));
check('services/heatmapService.js exists', () => fs.existsSync('services/heatmapService.js'));

// Socket Handlers
console.log('\n🔌 Socket.io:');
check('multiplayerSocketHandlers.js exists', () => fs.existsSync('multiplayerSocketHandlers.js'));
check('socketHandlers.js exists', () => fs.existsSync('socketHandlers.js'));

// Database Files
console.log('\n🗄️  Database:');
check('../database/complete_schema.sql exists', () => 
  fs.existsSync(path.join(__dirname, '..', 'database', 'complete_schema.sql')));
check('../database/migration_add_features.sql exists', () => 
  fs.existsSync(path.join(__dirname, '..', 'database', 'migration_add_features.sql')),
  'Run fix-all.bat or create manually');

// Configuration
console.log('\n⚙️  Configuration:');
check('.env file exists', () => fs.existsSync('.env'),
  'Create .env file with database credentials');

// Package.json
console.log('\n📦 Dependencies:');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check('ngeohash installed', () => pkg.dependencies && pkg.dependencies.ngeohash,
    'Run: npm install ngeohash');
  check('express installed', () => pkg.dependencies && pkg.dependencies.express);
  check('socket.io installed', () => pkg.dependencies && pkg.dependencies['socket.io']);
  check('pg installed', () => pkg.dependencies && pkg.dependencies.pg);
}

// Server.js content check
console.log('\n🔧 Server Configuration:');
if (fs.existsSync('server.js')) {
  const serverContent = fs.readFileSync('server.js', 'utf8');
  check('AI Coach route registered', () => serverContent.includes("require('./routes/aiCoach')"),
    'Add: app.use(\'/api/ai-coach\', require(\'./routes/aiCoach\'));');
  check('Heatmap route registered', () => serverContent.includes("require('./routes/heatmap')"),
    'Add: app.use(\'/api/heatmap\', require(\'./routes/heatmap\'));');
  check('Multiplayer sockets configured', () => serverContent.includes('multiplayerSocketHandlers'),
    'Update socket handlers to use multiplayerSocketHandlers');
}

// Documentation
console.log('\n📚 Documentation:');
check('../FIX_GUIDE.md exists', () => 
  fs.existsSync(path.join(__dirname, '..', 'FIX_GUIDE.md')));
check('../PROJECT_FIXED.md exists', () => 
  fs.existsSync(path.join(__dirname, '..', 'PROJECT_FIXED.md')));
check('../COMPLETE_ARCHITECTURE.md exists', () => 
  fs.existsSync(path.join(__dirname, '..', 'COMPLETE_ARCHITECTURE.md')));

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 All checks passed! Your project is ready to go!');
  console.log('\n📝 Next steps:');
  console.log('  1. Run database migration: psql -U postgres -d runterra -f ../database/migration_add_features.sql');
  console.log('  2. Start server: npm start');
  console.log('  3. Start client: cd ../client && npm run dev');
  console.log('  4. Open http://localhost:3000\n');
} else {
  console.log('⚠️  Some checks failed. Please review the fixes above.');
  console.log('\n🔧 Quick fix:');
  console.log('  Run: fix-all.bat (Windows) or follow FIX_GUIDE.md\n');
}

console.log('📖 Documentation:');
console.log('  • PROJECT_FIXED.md - Complete fix summary');
console.log('  • FIX_GUIDE.md - Detailed troubleshooting');
console.log('  • COMPLETE_ARCHITECTURE.md - Full documentation\n');
