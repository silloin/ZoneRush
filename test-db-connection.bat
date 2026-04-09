@echo off
echo ============================================
echo TESTING DATABASE CONNECTION
echo ============================================
echo.

cd /d "%~dp0"
set PGPASSWORD=8810

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
    echo 2. Database name is 'runterra'
    echo 3. Password is correct (8810)
    echo.
)

pause
