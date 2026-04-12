const pool = require('./config/database');

(async () => {
  try {
    const result = await pool.query(`
      SELECT user_id, COUNT(*) as count FROM user_achievements 
      GROUP BY user_id
      ORDER BY user_id
    `);
    
    console.log('User achievements count:');
    result.rows.forEach(row => {
      console.log(`  User ${row.user_id}: ${row.count} achievements`);
    });
    
  } finally {
    process.exit(0);
  }
})();
