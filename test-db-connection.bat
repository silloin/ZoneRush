@echo off
echo ============================================
echo TESTING DATABASE CONNECTION
echo ============================================
echo.

cd /d "%~dp0"

REM Load database credentials from .env file
if exist "scripts\.env" (
    for /f "tokens=1,2 delims==" %%a in (scripts\.env) do (
        set %%a=%%b
    )
    echo ✅ Loaded credentials from scripts\.env
) else if exist ".env" (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        set %%a=%%b
    )
    echo ✅ Loaded credentials from .env
) else (
    echo ⚠️  No .env file found. Set DB_PASSWORD environment variable.
    echo    Or create scripts\.env with database credentials.
)

REM Use DB_PASSWORD from environment or .env file
if not defined DB_PASSWORD (
    echo ❌ ERROR: DB_PASSWORD not set!
    echo    Please create scripts\.env or set DB_PASSWORD environment variable.
    pause
    exit /b 1
)

set PGPASSWORD=%DB_PASSWORD%

echo Connecting to database "zonerush"...
psql -U postgres -h localhost -p 5432 -d zonerush -c "SELECT current_database(), current_user, now();"

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo DATABASE CONNECTION SUCCESSFUL!
    echo ============================================
    echo.
) else (
    echo.
    echo ============================================
    echo ERROR: Cannot connect to database!
    echo ============================================
    echo.
    echo Please check:
    echo 1. PostgreSQL service is running
    echo 2. Database name is 'zonerush'
    echo 3. DB_PASSWORD is set correctly in scripts\.env
    echo.
)

pause
