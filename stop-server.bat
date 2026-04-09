@echo off
echo ========================================
echo Stop Backend Server (Port 5000)
echo ========================================
echo.

echo Finding process using port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Found process ID: %%a
    echo Killing process...
    taskkill /PID %%a /F
)

echo.
echo ✅ Port 5000 is now free!
echo.
pause
