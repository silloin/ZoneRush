/**
 * Test script to verify production security validation works with DATABASE_URL
 */

// Test 1: With DATABASE_URL (production scenario)
console.log('='.repeat(60));
console.log('TEST 1: Production with DATABASE_URL');
console.log('='.repeat(60));

process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://postgres:strongpassword123@db.example.supabase.co:5432/postgres';
process.env.JWT_SECRET = 'a'.repeat(64); // 64 character secret
process.env.FRONTEND_URL = 'https://example.com';
process.env.EMAIL_SERVICE = 'resend';
process.env.RESEND_API_KEY = 're_test123456';

// Clear individual DB vars
delete process.env.DB_HOST;
delete process.env.DB_PASSWORD;

const securityConfig1 = require('./config/securityConfig');
const result1 = securityConfig1.validateProductionConfig();
console.log(`\n✅ Result: ${result1 ? 'PASSED' : 'FAILED'}\n`);

// Clear the module cache for next test
delete require.cache[require.resolve('./config/securityConfig')];

// Test 2: With weak password in DATABASE_URL (should fail)
console.log('='.repeat(60));
console.log('TEST 2: Production with WEAK password in DATABASE_URL');
console.log('='.repeat(60));

process.env.DATABASE_URL = 'postgresql://postgres:8810@db.example.supabase.co:5432/postgres';

const securityConfig2 = require('./config/securityConfig');
const result2 = securityConfig2.validateProductionConfig();
console.log(`\n✅ Result: ${result2 ? 'PASSED' : 'FAILED (Expected)'}\n`);

// Clear the module cache for next test
delete require.cache[require.resolve('./config/securityConfig')];

// Test 3: With individual DB variables (local development scenario)
console.log('='.repeat(60));
console.log('TEST 3: Development with individual DB variables');
console.log('='.repeat(60));

process.env.NODE_ENV = 'development';
delete process.env.DATABASE_URL;
process.env.DB_HOST = 'localhost';
process.env.DB_PASSWORD = 'securepassword';

const securityConfig3 = require('./config/securityConfig');
const result3 = securityConfig3.validateProductionConfig();
console.log(`\n✅ Result: ${result3 ? 'PASSED (Development mode)' : 'FAILED'}\n`);

console.log('='.repeat(60));
console.log('All tests completed!');
console.log('='.repeat(60));
