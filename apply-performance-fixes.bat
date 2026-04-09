@echo off
echo ========================================
echo Applying Performance Optimizations and Bug Fixes
echo ========================================
echo.

set PGPASSWORD=8810

echo Running database migration...
psql -U postgres -d zonerush -f "database\migration_performance_and_fixes.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
    echo.
    echo Changes applied:
    echo   - Added 7 performance indexes
    echo   - Fixed race condition in plan activation
    echo   - Created training plan progress view
    echo   - Added leaderboard refresh function
) else (
    echo.
    echo ========================================
    echo Migration failed! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
