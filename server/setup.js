#!/usr/bin/env node

/**
 * Automated Setup Script for ZoneRush Fitness Platform
 * This script will:
 * 1. Check dependencies
 * 2. Install missing packages
 * 3. Setup database
 * 4. Run migrations
 * 5. Verify installation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`Error executing: ${command}`, 'error');
    throw error;
  }
}

async function checkNodeVersion() {
  log('\n📋 Checking Node.js version...', 'info');
  const version = process.version;
  const major = parseInt(version.split('.')[0].substring(1));
  
  if (major < 16) {
    log(`❌ Node.js ${version} detected. Version 16+ required.`, 'error');
    process.exit(1);
  }
  
  log(`✅ Node.js ${version} detected`, 'success');
}

async function checkPostgreSQL() {
  log('\n📋 Checking PostgreSQL...', 'info');
  try {
    exec('psql --version', { stdio: 'pipe' });
    log('✅ PostgreSQL is installed', 'success');
    return true;
  } catch (error) {
    log('❌ PostgreSQL not found. Please install PostgreSQL first.', 'error');
    return false;
  }
}

async function installDependencies() {
  log('\n📦 Installing server dependencies...', 'info');
  
  const serverDir = path.join(__dirname);
  process.chdir(serverDir);
  
  // Check if ngeohash is installed
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.dependencies.ngeohash) {
    log('Installing ngeohash...', 'info');
    exec('npm install ngeohash');
  }
  
  log('✅ Server dependencies installed', 'success');
  
  // Install client dependencies
  log('\n📦 Installing client dependencies...', 'info');
  const clientDir = path.join(__dirname, '..', 'client');
  
  if (fs.existsSync(clientDir)) {
    process.chdir(clientDir);
    
    const clientPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!clientPackageJson.dependencies.recharts) {
      log('Installing recharts...', 'info');
      exec('npm install recharts');
    }
    
    log('✅ Client dependencies installed', 'success');
  }
  
  process.chdir(serverDir);
}

async function setupDatabase() {
  log('\n🗄️  Setting up database...', 'info');
  
  const dbName = await question('Enter database name (default: runterra): ') || 'runterra';
  const dbUser = await question('Enter database user (default: postgres): ') || 'postgres';
  const dbPassword = await question('Enter database password: ');
  const dbHost = await question('Enter database host (default: localhost): ') || 'localhost';
  const dbPort = await question('Enter database port (default: 5432): ') || '5432';
  
  // Create .env file
  const envContent = `
DB_USER=${dbUser}
DB_HOST=${dbHost}
DB_DATABASE=${dbName}
DB_PASSWORD=${dbPassword}
DB_PORT=${dbPort}
JWT_SECRET=${generateRandomString(64)}
PORT=5000
NODE_ENV=development
`;
  
  fs.writeFileSync('.env', envContent.trim());
  log('✅ .env file created', 'success');
  
  // Test connection
  log('\n🔌 Testing database connection...', 'info');
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: dbUser,
      host: dbHost,
      database: dbName,
      password: dbPassword,
      port: dbPort,
    });
    
    await pool.query('SELECT NOW()');
    await pool.end();
    log('✅ Database connection successful', 'success');
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'error');
    return false;
  }
}

async function runMigrations() {
  log('\n🔄 Running database migrations...', 'info');
  
  const migrationFile = path.join(__dirname, '..', 'database', 'migration_add_features.sql');
  
  if (!fs.existsSync(migrationFile)) {
    log('❌ Migration file not found', 'error');
    return false;
  }
  
  try {
    const { Pool } = require('pg');
    require('dotenv').config();
    
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await pool.query(sql);
    await pool.end();
    
    log('✅ Migrations completed successfully', 'success');
    return true;
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'error');
    return false;
  }
}

async function verifyInstallation() {
  log('\n✅ Verifying installation...', 'info');
  
  const checks = [
    { name: 'Server files', check: () => fs.existsSync('server.js') },
    { name: 'Config files', check: () => fs.existsSync('config/db.js') },
    { name: 'Services', check: () => fs.existsSync('services/tileService.js') },
    { name: 'Routes', check: () => fs.existsSync('routes/runs.js') },
    { name: 'Socket handlers', check: () => fs.existsSync('multiplayerSocketHandlers.js') },
    { name: '.env file', check: () => fs.existsSync('.env') }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (check.check()) {
      log(`  ✅ ${check.name}`, 'success');
    } else {
      log(`  ❌ ${check.name}`, 'error');
      allPassed = false;
    }
  }
  
  return allPassed;
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏃 ZoneRush Fitness Platform - Setup Script 🏃         ║
║                                                           ║
║   This will set up your complete fitness platform with:  ║
║   • Tile capture gamification                            ║
║   • AI running coach                                      ║
║   • Real-time multiplayer                                 ║
║   • Advanced analytics                                    ║
║   • And much more!                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  try {
    // Step 1: Check Node version
    await checkNodeVersion();
    
    // Step 2: Check PostgreSQL
    const hasPostgres = await checkPostgreSQL();
    if (!hasPostgres) {
      log('\n⚠️  Please install PostgreSQL and run this script again.', 'warning');
      process.exit(1);
    }
    
    // Step 3: Install dependencies
    await installDependencies();
    
    // Step 4: Setup database
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      log('\n⚠️  Database setup failed. Please check your credentials.', 'warning');
      process.exit(1);
    }
    
    // Step 5: Run migrations
    const migrationSuccess = await runMigrations();
    if (!migrationSuccess) {
      log('\n⚠️  Migrations failed. You may need to run them manually.', 'warning');
    }
    
    // Step 6: Verify installation
    const verified = await verifyInstallation();
    
    if (verified) {
      log('\n🎉 Setup completed successfully!', 'success');
      log('\n📝 Next steps:', 'info');
      log('  1. Start the server: npm start', 'info');
      log('  2. Start the client: cd ../client && npm run dev', 'info');
      log('  3. Open http://localhost:3000 in your browser', 'info');
      log('\n📚 Documentation:', 'info');
      log('  • COMPLETE_ARCHITECTURE.md - Full implementation guide', 'info');
      log('  • IMPLEMENTATION_GUIDE.md - API documentation', 'info');
      log('  • QUICK_START.md - Testing guide', 'info');
    } else {
      log('\n⚠️  Some checks failed. Please review the errors above.', 'warning');
    }
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
main();
