@echo off
echo ========================================
echo Applying AI Training Plans Migration
echo ========================================
echo.

set PGPASSWORD=8810

echo Running database migration...
psql -U postgres -d zonerush -f "database\migration_add_ai_training_plans.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Migration failed! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
