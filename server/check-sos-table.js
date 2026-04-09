const pool = require('./config/db');

async function checkSOSAlertsTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sos_alerts' 
      ORDER BY ordinal_position
    `);
    
    console.log('sos_alerts table columns:');
    console.log('='.repeat(50));
    result.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} ${col.data_type}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkSOSAlertsTable();
