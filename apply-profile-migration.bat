@echo off
echo Applying Profile Features Migration...
echo.
psql -U postgres -d runterra -f "database\migration_add_profile_features.sql"
echo.
if errorlevel 1 (
    echo ERROR: Migration failed!
    pause
    exit /b 1
)
echo ✅ Migration completed successfully!
pause
