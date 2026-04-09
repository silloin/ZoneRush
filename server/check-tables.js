const pool = require('./config/db');

async function checkTables() {
  try {
    console.log('Checking sos_alerts and emergency_contacts tables...\n');
    
    const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('sos_alerts', 'emergency_contacts') 
      ORDER BY table_name, ordinal_position
    `);
    
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n${currentTable}:`);
        console.log('='.repeat(50));
      }
      console.log(`  ${row.column_name.padEnd(25)} ${row.data_type}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTables();
