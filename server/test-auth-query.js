const pool = require('./config/db');

async function testAuthEndpoint() {
  try {
    console.log('Testing auth endpoint query...\n');
    
    // Try the exact query from auth.js (without role)
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.xp, 
        u.level, 
        u.streak,
        COALESCE(u.total_xp, 0) as "totalDistance",
        COALESCE(u.territories_captured, 0) as "totalTiles",
        COALESCE(u.total_territory_area, 0) as "weeklyMileage"
      FROM users u
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [1]);
    
    console.log('✅ Query executed successfully!');
    console.log('\nUser data:');
    console.log(result.rows[0]);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing query:', err.message);
    console.error('SQL State:', err.code);
    console.error('Detail:', err.detail);
    process.exit(1);
  }
}

testAuthEndpoint();
