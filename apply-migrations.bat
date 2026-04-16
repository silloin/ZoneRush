@echo off
echo ========================================
echo Applying Database Migrations
echo ========================================
echo.

REM Set the database connection
set /p DB_HOST="Enter database host (default: localhost): " || set DB_HOST=localhost
set /p DB_PORT="Enter database port (default: 5432): " || set DB_PORT=5432
set /p DB_NAME="Enter database name (default: zonerush): " || set DB_NAME=zonerush
set /p DB_USER="Enter database user (default: postgres): " || set DB_USER=postgres

echo.
echo Applying migrations to database: %DB_NAME%
echo.

echo [1/4] Applying AI Training Plans Migration...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "database\migration_add_ai_training_plans.sql"
echo.

echo [2/4] Applying Production Fixes Migration...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "database\migration_production_fixes.sql"
echo.

echo [3/4] Applying Performance and Fixes Migration...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "database\migration_performance_and_fixes.sql"
echo.

echo [4/4] Checking for events and emergency_contacts tables...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('events', 'emergency_contacts', 'training_plans') ORDER BY table_name;"
echo.

echo ========================================
echo Migration Complete!
echo ========================================
echo.
pause
