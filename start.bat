@echo off
echo Starting RunTerra Application...
echo.

echo [1/3] Checking PostgreSQL connection...
psql -U postgres -d runterra -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to PostgreSQL database 'runterra'
    echo Please ensure PostgreSQL is running and database exists
    echo Run: psql -U postgres -c "CREATE DATABASE runterra;"
    pause
    exit /b 1
)
echo PostgreSQL connected successfully!

echo Checking PostGIS extension...
psql -U postgres -d runterra -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_topology;" >nul 2>&1
echo PostGIS enabled!
echo.

echo [2/3] Starting Backend Server (Port 5000)...
start "RunTerra Backend" cmd /k "cd server && npm run dev"
timeout /t 3 >nul

echo [3/3] Starting Frontend (Port 5173)...
start "RunTerra Frontend" cmd /k "cd client && npm run dev"

echo.
echo ========================================
echo RunTerra is starting!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to stop all servers...
pause >nul

taskkill /FI "WindowTitle eq RunTerra Backend*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq RunTerra Frontend*" /T /F >nul 2>&1
echo Servers stopped.
