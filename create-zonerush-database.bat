@echo off
echo ============================================
echo CREATING DATABASE "ZONERUSH"
echo ============================================
echo.
echo This will create the zonerush database in PostgreSQL
echo.
echo Press Ctrl+C to cancel or wait 5 seconds to continue...
timeout /t 5 /nobreak >nul

cd /d "%~dp0"
set PGPASSWORD=8810

echo.
echo Connecting to PostgreSQL and creating database...
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE zonerush;"

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo DATABASE CREATED SUCCESSFULLY!
    echo ============================================
    echo.
    echo Now running initial setup migrations...
    echo.
    
    REM Run the main schema setup
    psql -U postgres -h localhost -p 5432 -d zonerush -f "database\complete_schema.sql"
    
    if %errorlevel% equ 0 (
        echo.
        echo ============================================
        echo SCHEMA INSTALLED SUCCESSFULLY!
        echo ============================================
        echo.
        echo Your database is ready to use!
        echo Now run: .\fix-territories-count.bat
    ) else (
        echo.
        echo ============================================
        echo WARNING: Schema installation had issues
        echo ============================================
        echo.
        echo The database was created, but schema setup may need manual attention.
        echo Check the error messages above.
    )
) else (
    echo.
    echo ============================================
    echo ERROR: Database creation failed!
    echo ============================================
    echo.
    echo Possible causes:
    echo 1. PostgreSQL service is not running
    echo 2. Database already exists
    echo 3. Wrong password or credentials
    echo.
    echo To check if database exists, run:
    echo psql -U postgres -h localhost -p 5432 -l
)

echo.
pause
