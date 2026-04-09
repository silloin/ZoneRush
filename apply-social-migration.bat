@echo off
echo ============================================
echo Applying Social Features Database Migration
echo ============================================
echo.

set PGPASSWORD=your_password_here
set PGUSER=postgres
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=zonerush

echo Running migration...
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -f "%~dp0database\migration_add_social_features.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Migration completed successfully!
    echo ============================================
) else (
    echo.
    echo ============================================
    echo ERROR: Migration failed!
    echo ============================================
)

pause
