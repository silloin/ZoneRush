@echo off
echo ========================================
echo ZoneRush - Automated Fix Script
echo ========================================
echo.

echo [1/5] Installing server dependencies...
cd server
call npm install ngeohash
if %errorlevel% neq 0 (
    echo ERROR: Failed to install server dependencies
    pause
    exit /b 1
)
echo ✓ Server dependencies installed
echo.

echo [2/5] Installing client dependencies...
cd ..\client
call npm install recharts
if %errorlevel% neq 0 (
    echo ERROR: Failed to install client dependencies
    pause
    exit /b 1
)
echo ✓ Client dependencies installed
echo.

echo [3/5] Checking database connection...
cd ..\server
node -e "const pool = require('./config/db'); pool.query('SELECT NOW()').then(() => { console.log('✓ Database connected'); pool.end(); }).catch(err => { console.error('✗ Database connection failed:', err.message); process.exit(1); });"
if %errorlevel% neq 0 (
    echo ERROR: Database connection failed
    echo Please check your .env file and database credentials
    pause
    exit /b 1
)
echo.

echo [4/5] Running database migrations...
echo Please enter your database password when prompted
psql -U postgres -d runterra -f ..\database\migration_add_features.sql
if %errorlevel% neq 0 (
    echo WARNING: Migration may have failed
    echo You can run it manually: psql -U postgres -d runterra -f database\migration_add_features.sql
)
echo.

echo [5/5] Verifying installation...
if exist "config\database.js" (
    echo ✓ Config files OK
) else (
    echo ✗ Missing config files
)

if exist "routes\aiCoach.js" (
    echo ✓ AI Coach routes OK
) else (
    echo ✗ Missing AI Coach routes
)

if exist "routes\heatmap.js" (
    echo ✓ Heatmap routes OK
) else (
    echo ✗ Missing Heatmap routes
)

if exist "multiplayerSocketHandlers.js" (
    echo ✓ Socket handlers OK
) else (
    echo ✗ Missing socket handlers
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start server: cd server ^&^& npm start
echo 2. Start client: cd client ^&^& npm run dev
echo 3. Open http://localhost:3000
echo.
echo Documentation:
echo - FIX_GUIDE.md - Troubleshooting guide
echo - COMPLETE_ARCHITECTURE.md - Full documentation
echo.
pause
