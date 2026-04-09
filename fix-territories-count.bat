@echo off
echo ============================================
echo FIXING TERRITORIES_CAPTURED COUNT
echo ============================================
echo.
echo This script will:
echo 1. Ensure territories_captured column exists
echo 2. Initialize count from existing territories
echo 3. Create performance indexes
echo.
echo Press Ctrl+C to cancel or wait 5 seconds to continue...
timeout /t 5 /nobreak >nul

echo.
echo Running migration...
cd /d "%~dp0"
set PGPASSWORD=8810
psql -U postgres -h localhost -p 5432 -d zonerush -f "database\migration_fix_territories_count.sql"

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo MIGRATION COMPLETED SUCCESSFULLY!
    echo ============================================
    echo.
    echo Your territories count should now be correct.
    echo Restart your server and refresh your browser.
) else (
    echo.
    echo ============================================
    echo ERROR: Migration failed!
    echo ============================================
    echo.
    echo Please check:
    echo 1. PostgreSQL is running
    echo 2. Database name is 'zonerush'
    echo 3. You have proper database credentials
)

echo.
pause
