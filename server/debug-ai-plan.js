/**
 * Debug AI Plan Generation
 * Checks configuration and tests the AI service
 */

require('dotenv').config();
const pool = require('./config/db');

console.log('🔍 Debugging AI Plan Generation Issue\n');
console.log('=' .repeat(60));

// 1. Check Environment Variables
console.log('\n1. Environment Variables:');
console.log('   GROQ_API_KEY:', process.env.GROQ_API_KEY ? `SET (starts with ${process.env.GROQ_API_KEY.substring(0, 8)}...)` : '❌ NOT SET');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'Using individual DB params');

if (!process.env.GROQ_API_KEY) {
  console.log('\n❌ CRITICAL: GROQ_API_KEY is missing!');
  console.log('\n📝 Add this to server/.env:');
  console.log('   GROQ_API_KEY=<your-groq-api-key>');
  console.log('\n⚠️  Make sure:');
  console.log('   - No spaces around = sign');
  console.log('   - No quotes around the key');
  console.log('   - File is named .env (not .env.txt)');
  process.exit(1);
}

// 2. Test Groq SDK Import
console.log('\n2. Testing Groq SDK...');
try {
  const Groq = require('groq-sdk');
  console.log('   ✅ Groq SDK imported successfully');
  
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });
  console.log('   ✅ Groq client initialized');
} catch (error) {
  console.log('   ❌ Error initializing Groq:', error.message);
  process.exit(1);
}

// 3. Check Database Connection
console.log('\n3. Testing Database Connection...');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('   ❌ Database connection failed:', err.message);
    console.log('   💡 Check your database credentials in .env');
    process.exit(1);
  } else {
    console.log('   ✅ Database connected');
    
    // 4. Check training_plans table
    console.log('\n4. Checking training_plans table...');
    pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'training_plans'
      ORDER BY ordinal_position
    `, (err, res) => {
      if (err) {
        console.log('   ❌ Error checking table:', err.message);
      } else {
        console.log('   ✅ Table exists with columns:');
        res.rows.forEach(row => {
          console.log(`      - ${row.column_name} (${row.data_type})`);
        });
        
        // Check for required columns
        const hasMetadata = res.rows.some(r => r.column_name === 'metadata');
        const hasIsActive = res.rows.some(r => r.column_name === 'is_active');
        
        if (!hasMetadata || !hasIsActive) {
          console.log('\n   ⚠️  Missing columns! Run fix-500-errors.js');
        }
      }
      
      // 5. Test AI Service Import
      console.log('\n5. Testing AI Coach Service...');
      try {
        const aiCoachService = require('./services/aiCoachService');
        console.log('   ✅ AI Coach Service loaded');
        
        console.log('\n6. Testing generateAITrainingPlan method...');
        if (typeof aiCoachService.generateAITrainingPlan === 'function') {
          console.log('   ✅ Method exists');
          
          console.log('\n✨ Configuration looks good!');
          console.log('\n📋 Next steps:');
          console.log('   1. Restart your server');
          console.log('   2. Try generating an AI plan again');
          console.log('   3. If it still fails, check server logs for Groq API errors');
          console.log('\n💡 Common issues:');
          console.log('   - Groq API rate limit (5 requests/hour)');
          console.log('   - Invalid API key');
          console.log('   - Network connectivity issues');
        } else {
          console.log('   ❌ Method not found!');
        }
      } catch (error) {
        console.log('   ❌ Error loading service:', error.message);
        console.log('\n💡 The service might be throwing an error on initialization.');
        console.log('   Check that GROQ_API_KEY is correctly set in .env');
      } finally {
        pool.end();
        process.exit(0);
      }
    });
  }
});
