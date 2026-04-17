require('dotenv').config({ path: './server/.env' });
const pool = require('./server/config/db');

async function fixNotifications() {
  try {
    await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content TEXT;');
    await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;');
    console.log('Successfully fixed notifications schema');
    process.exit(0);
  } catch (err) {
    console.error('Failed to fix notifications:', err);
    process.exit(1);
  }
}

fixNotifications();
