@echo off
echo ====================================
echo   ZoneRush - Starting Servers
echo ====================================
echo.

:: Check if node_modules exists
if not exist "server\node_modules" (
    echo [1/3] Installing server dependencies...
    cd server
    call npm install --legacy-peer-deps
    cd ..
    echo.
) else (
    echo [1/3] Server dependencies already installed ✓
    echo.
)

if not exist "client\node_modules" (
    echo [2/3] Installing client dependencies...
    cd client
    call npm install --legacy-peer-deps
    cd ..
    echo.
) else (
    echo [2/3] Client dependencies already installed ✓
    echo.
)

echo [3/3] Starting servers...
echo.
echo ====================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ====================================
echo.
echo Press Ctrl+C to stop servers
echo.

:: Start backend server
start "ZoneRush Backend" cmd /k "cd server && npm run dev"

:: Wait 2 seconds for backend to start
timeout /t 2 /nobreak >nul

:: Start frontend server
start "ZoneRush Frontend" cmd /k "cd client && npm run dev"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Open browser
echo Opening browser...
start http://localhost:5173

echo.
echo ✅ Servers started successfully!
echo.
pause
