@echo off
echo ========================================
echo Adding profile_photo_url column to users table
echo ========================================
echo.

cd /d "%~dp0.."
cd server

echo Running database migration...
node -e "const pool = require('./config/db'); const fs = require('fs'); const path = require('path'); const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'migration_add_profile_photo_url.sql'), 'utf8'); pool.query(sql).then(res => { console.log('Migration completed successfully!'); console.log('Columns:', res[res.length - 1].rows); pool.end(); process.exit(0); }).catch(err => { console.error('Migration failed:', err.message); pool.end(); process.exit(1); });"

echo.
echo ========================================
echo Migration complete!
echo ========================================
pause
