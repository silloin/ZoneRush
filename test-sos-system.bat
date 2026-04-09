@echo off
echo ========================================
echo SOS Emergency System - Quick Test
echo ========================================
echo.

echo [1/4] Checking if backend is running...
curl -s http://localhost:5000/api >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend not running on port 5000
    echo Please start backend with: cd server ^&^& npm run dev
    pause
    exit /b 1
) else (
    echo ✅ Backend is running
)
echo.

echo [2/4] Checking database tables...
psql -U postgres -d runterra -c "SELECT COUNT(*) FROM emergency_contacts;" >nul 2>&1
if errorlevel 1 (
    echo ❌ Database tables missing
    echo Run migration first: .\apply-sos-migration.bat
    pause
    exit /b 1
) else (
    echo ✅ Database tables exist
)
echo.

echo [3/4] Checking required files...
if exist "server\controllers\emergencyController.js" (
    echo ✅ Backend controller exists
) else (
    echo ❌ Missing emergencyController.js
    pause
    exit /b 1
)

if exist "client\src\components\SOSButton.jsx" (
    echo ✅ Frontend SOS button exists
) else (
    echo ❌ Missing SOSButton.jsx
    pause
    exit /b 1
)
echo.

echo [4/4] Testing API endpoint...
curl -s http://localhost:5000/api/emergency/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Health endpoint not available (optional)
) else (
    echo ✅ Health endpoint responding
)
echo.

echo ========================================
echo ✅ All checks passed!
echo ========================================
echo.
echo Your SOS Emergency System is ready!
echo.
echo Next steps:
echo 1. Open http://localhost:5173/profile
echo 2. Add an emergency contact
echo 3. Click the red SOS button
echo 4. Send a test alert!
echo.
pause
